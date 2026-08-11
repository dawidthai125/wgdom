/**
 * MARKET-MATERIAL-RESEARCH-01 — Hard Single-Flight research job lease (Edge).
 * Atomic claim semantics: INSERT-first (PK) + conditional UPDATE if lease expired.
 * ZERO price fields · ZERO external HTTP · Edge-side KV only (no DATA_KEYS amend).
 */

export const RESEARCH_JOB_KV_PREFIX = "kw-price-research-job:" as const;

export const RESEARCH_JOB_LEASE_STATUS_ACTIVE = "ACTIVE" as const;
export const RESEARCH_JOB_LEASE_STATUS_RELEASED = "RELEASED" as const;

/** Bounds — prevent abuse; not provider rate limits. */
export const RESEARCH_JOB_LEASE_MS_MIN = 1_000;
export const RESEARCH_JOB_LEASE_MS_MAX = 3_600_000; // 1h

export type ResearchJobLeaseStatus =
  | typeof RESEARCH_JOB_LEASE_STATUS_ACTIVE
  | typeof RESEARCH_JOB_LEASE_STATUS_RELEASED;

export interface ResearchJobLeaseRecord {
  researchJobId: string;
  claimantId: string;
  status: ResearchJobLeaseStatus;
  claimedAt: string;
  leaseUntil: string;
}

export interface ResearchJobClaimRequest {
  researchJobId: string;
  claimantId: string;
  leaseMs: number;
}

export interface ResearchJobClaimResult {
  acquired: boolean;
  job: ResearchJobLeaseRecord | null;
  reason?:
    | "acquired_new"
    | "acquired_reclaim_expired"
    | "acquired_same_claimant"
    | "held_by_other"
    | "validation_error";
  error?: string;
}

export type ResearchJobClaimValidationError =
  | "missing_researchJobId"
  | "missing_claimantId"
  | "invalid_leaseMs"
  | "invalid_researchJobId"
  | "invalid_claimantId";

/** Atomic store contract — implementations MUST serialize per key like PG row lock. */
export interface AtomicResearchJobStore {
  tryInsert(key: string, value: ResearchJobLeaseRecord): Promise<{ ok: boolean }>;
  tryUpdateIfExpired(
    key: string,
    value: ResearchJobLeaseRecord,
    nowIso: string,
  ): Promise<{ ok: boolean }>;
  get(key: string): Promise<ResearchJobLeaseRecord | null>;
  /** Optional release helper — delete key (preferred). */
  delete?(key: string): Promise<void>;
}

export function researchJobKvKey(researchJobId: string): string {
  return `${RESEARCH_JOB_KV_PREFIX}${researchJobId}`;
}

export function validateResearchJobClaimRequest(
  body: unknown,
): { ok: true; value: ResearchJobClaimRequest } | { ok: false; error: ResearchJobClaimValidationError; message: string } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: "missing_researchJobId", message: "Body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const researchJobId = typeof b.researchJobId === "string" ? b.researchJobId.trim() : "";
  const claimantId = typeof b.claimantId === "string" ? b.claimantId.trim() : "";
  const leaseMs = typeof b.leaseMs === "number" ? b.leaseMs : Number(b.leaseMs);

  if (!researchJobId) {
    return { ok: false, error: "missing_researchJobId", message: "researchJobId is required." };
  }
  if (researchJobId.length > 256 || !/^[\w.:|@/-]+$/.test(researchJobId)) {
    return {
      ok: false,
      error: "invalid_researchJobId",
      message: "researchJobId has invalid format.",
    };
  }
  if (!claimantId) {
    return { ok: false, error: "missing_claimantId", message: "claimantId is required." };
  }
  if (claimantId.length > 128) {
    return { ok: false, error: "invalid_claimantId", message: "claimantId too long." };
  }
  if (!Number.isFinite(leaseMs) || leaseMs < RESEARCH_JOB_LEASE_MS_MIN || leaseMs > RESEARCH_JOB_LEASE_MS_MAX) {
    return {
      ok: false,
      error: "invalid_leaseMs",
      message: `leaseMs must be ${RESEARCH_JOB_LEASE_MS_MIN}..${RESEARCH_JOB_LEASE_MS_MAX}.`,
    };
  }
  return { ok: true, value: { researchJobId, claimantId, leaseMs } };
}

export function isLeaseExpired(job: ResearchJobLeaseRecord, nowMs: number): boolean {
  if (job.status === RESEARCH_JOB_LEASE_STATUS_RELEASED) return true;
  const until = Date.parse(job.leaseUntil);
  if (!Number.isFinite(until)) return true;
  return until <= nowMs;
}

/** Assert lease record never carries price fields (safety). */
export function leaseRecordHasPriceMutation(job: unknown): boolean {
  if (job == null || typeof job !== "object") return false;
  const o = job as Record<string, unknown>;
  const forbidden = [
    "price",
    "pricePln",
    "unitPricePln",
    "marketPricePln",
    "purchaseUnitPln",
    "marketQuotes",
    "acceptedPrice",
  ];
  return forbidden.some((k) => k in o);
}

/**
 * Hard SF claim algorithm (server-side).
 * 1) INSERT — first writer wins (PK)
 * 2) UPDATE IF expired — reclaim
 * 3) same claimant + active → idempotent acquired
 * 4) else rejected
 */
export async function claimResearchJobLease(
  store: AtomicResearchJobStore,
  req: ResearchJobClaimRequest,
  nowMs: number = Date.now(),
): Promise<ResearchJobClaimResult> {
  const key = researchJobKvKey(req.researchJobId);
  const nowIso = new Date(nowMs).toISOString();
  const leaseUntil = new Date(nowMs + req.leaseMs).toISOString();
  const next: ResearchJobLeaseRecord = {
    researchJobId: req.researchJobId,
    claimantId: req.claimantId,
    status: RESEARCH_JOB_LEASE_STATUS_ACTIVE,
    claimedAt: nowIso,
    leaseUntil,
  };

  const inserted = await store.tryInsert(key, next);
  if (inserted.ok) {
    return { acquired: true, job: next, reason: "acquired_new" };
  }

  const reclaimed = await store.tryUpdateIfExpired(key, next, nowIso);
  if (reclaimed.ok) {
    return { acquired: true, job: next, reason: "acquired_reclaim_expired" };
  }

  const current = await store.get(key);
  if (current && !isLeaseExpired(current, nowMs) && current.claimantId === req.claimantId) {
    return { acquired: true, job: current, reason: "acquired_same_claimant" };
  }

  return {
    acquired: false,
    job: current,
    reason: "held_by_other",
  };
}

export async function releaseResearchJobLease(
  store: AtomicResearchJobStore,
  opts: { researchJobId: string; claimantId: string; nowMs?: number },
): Promise<{ released: boolean; job: ResearchJobLeaseRecord | null; error?: string }> {
  const nowMs = opts.nowMs ?? Date.now();
  const key = researchJobKvKey(opts.researchJobId);
  const current = await store.get(key);
  if (!current) return { released: false, job: null, error: "not_found" };
  if (current.claimantId !== opts.claimantId) {
    return { released: false, job: current, error: "not_owner" };
  }
  if (!store.delete) {
    return { released: false, job: current, error: "release_unsupported" };
  }
  const released: ResearchJobLeaseRecord = {
    ...current,
    status: RESEARCH_JOB_LEASE_STATUS_RELEASED,
    leaseUntil: new Date(nowMs - 1).toISOString(),
  };
  await store.delete(key);
  return { released: true, job: released };
}

/** In-memory atomic store — mutex serializes ops (simulates PG row lock for tests). */
export function createMemoryAtomicResearchJobStore(): AtomicResearchJobStore & {
  /** Test inspection */
  dump(): Map<string, ResearchJobLeaseRecord>;
  forceSet(key: string, value: ResearchJobLeaseRecord): void;
} {
  const map = new Map<string, ResearchJobLeaseRecord>();
  let chain: Promise<unknown> = Promise.resolve();

  const withLock = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    const run = chain.then(() => fn());
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  return {
    dump: () => new Map(map),
    forceSet(key, value) {
      map.set(key, value);
    },
    async tryInsert(key, value) {
      return withLock(() => {
        if (map.has(key)) return { ok: false };
        map.set(key, value);
        return { ok: true };
      });
    },
    async tryUpdateIfExpired(key, value, nowIso) {
      return withLock(() => {
        const cur = map.get(key);
        if (!cur) return { ok: false };
        const nowMs = Date.parse(nowIso);
        if (!isLeaseExpired(cur, nowMs)) return { ok: false };
        map.set(key, value);
        return { ok: true };
      });
    },
    async get(key) {
      return withLock(() => map.get(key) ?? null);
    },
    async delete(key) {
      return withLock(() => {
        map.delete(key);
      });
    },
  };
}

/**
 * Supabase/PostgREST atomic store over kv_store_0afb8820.
 * INSERT = first claim (PK); UPDATE … WHERE leaseUntil < now = reclaim.
 * Uses service-role client from Edge — no schema migration.
 */
// deno-lint-ignore no-explicit-any
export function createSupabaseAtomicResearchJobStore(supabase: any): AtomicResearchJobStore {
  const table = "kv_store_0afb8820";
  return {
    async tryInsert(key, value) {
      const { error } = await supabase.from(table).insert({ key, value });
      if (!error) return { ok: true };
      const code = String(error.code || "");
      const msg = String(error.message || "").toLowerCase();
      if (code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
        return { ok: false };
      }
      throw new Error(error.message);
    },
    async tryUpdateIfExpired(key, value, nowIso) {
      const { data, error } = await supabase
        .from(table)
        .update({ value })
        .eq("key", key)
        .filter("value->>leaseUntil", "lt", nowIso)
        .select("value");
      if (error) throw new Error(error.message);
      return { ok: Array.isArray(data) && data.length > 0 };
    },
    async get(key) {
      const { data, error } = await supabase.from(table).select("value").eq("key", key).maybeSingle();
      if (error) throw new Error(error.message);
      const v = data?.value;
      if (!v || typeof v !== "object") return null;
      return v as ResearchJobLeaseRecord;
    },
    async delete(key) {
      const { error } = await supabase.from(table).delete().eq("key", key);
      if (error) throw new Error(error.message);
    },
  };
}
