/**
 * KL-7-P2C — Edge discovery job lease (SHAPE from research-job-lease · NOT MMR).
 * Namespace: kw-knr-discovery-job:
 * ZERO prices · ZERO outbound HTTP · Edge KV only.
 */

export const KNR_DISCOVERY_JOB_KV_PREFIX = "kw-knr-discovery-job:" as const;

export const KNR_DISCOVERY_JOB_LEASE_MS_MIN = 1_000;
export const KNR_DISCOVERY_JOB_LEASE_MS_MAX = 3_600_000;
export const KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT = 90_000;

export const KNR_DISCOVERY_JOB_LEASE_STATUS_ACTIVE = "ACTIVE" as const;
export const KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED = "RELEASED" as const;

export type KnrDiscoveryJobLeaseStatus =
  | typeof KNR_DISCOVERY_JOB_LEASE_STATUS_ACTIVE
  | typeof KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED;

export interface KnrDiscoveryJobLeaseRecord {
  discoveryJobId: string;
  evidenceKeyV1: string;
  sourceId: string;
  claimantId: string;
  status: KnrDiscoveryJobLeaseStatus;
  claimedAt: string;
  leaseUntil: string;
}

export interface KnrDiscoveryJobClaimRequest {
  evidenceKeyV1: string;
  sourceId: string;
  claimantId: string;
  leaseMs: number;
}

export interface KnrDiscoveryJobClaimResult {
  acquired: boolean;
  job: KnrDiscoveryJobLeaseRecord | null;
  reason?:
    | "acquired_new"
    | "acquired_reclaim_expired"
    | "acquired_same_claimant"
    | "held_by_other"
    | "validation_error";
  error?: string;
}

export interface AtomicKnrDiscoveryJobStore {
  tryInsert(key: string, value: KnrDiscoveryJobLeaseRecord): Promise<{ ok: boolean }>;
  tryUpdateIfExpired(
    key: string,
    value: KnrDiscoveryJobLeaseRecord,
    nowIso: string,
  ): Promise<{ ok: boolean }>;
  get(key: string): Promise<KnrDiscoveryJobLeaseRecord | null>;
  delete?(key: string): Promise<void>;
}

export function buildKnrDiscoveryJobId(evidenceKeyV1: string, sourceId: string): string {
  return `${String(evidenceKeyV1).trim()}|${String(sourceId).trim()}`;
}

export function knrDiscoveryJobKvKey(discoveryJobId: string): string {
  return `${KNR_DISCOVERY_JOB_KV_PREFIX}${discoveryJobId}`;
}

export function isKnrDiscoveryJobLeaseExpired(
  job: KnrDiscoveryJobLeaseRecord,
  nowMs: number,
): boolean {
  if (job.status === KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED) return true;
  const until = Date.parse(job.leaseUntil);
  if (!Number.isFinite(until)) return true;
  return until <= nowMs;
}

export function validateKnrDiscoveryJobClaimRequest(
  body: unknown,
):
  | { ok: true; value: KnrDiscoveryJobClaimRequest }
  | { ok: false; error: string; message: string } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: "invalid_body", message: "Body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  const evidenceKeyV1 = typeof b.evidenceKeyV1 === "string" ? b.evidenceKeyV1.trim() : "";
  const sourceId = typeof b.sourceId === "string" ? b.sourceId.trim() : "";
  const claimantId = typeof b.claimantId === "string" ? b.claimantId.trim() : "";
  const leaseMsRaw = b.leaseMs;
  const leaseMs =
    typeof leaseMsRaw === "number"
      ? leaseMsRaw
      : leaseMsRaw == null
        ? KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT
        : Number(leaseMsRaw);

  if (!evidenceKeyV1) {
    return { ok: false, error: "missing_evidenceKeyV1", message: "evidenceKeyV1 is required." };
  }
  if (!sourceId) {
    return { ok: false, error: "missing_sourceId", message: "sourceId is required." };
  }
  if (!claimantId || claimantId.length > 128) {
    return { ok: false, error: "invalid_claimantId", message: "claimantId invalid." };
  }
  if (
    !Number.isFinite(leaseMs)
    || leaseMs < KNR_DISCOVERY_JOB_LEASE_MS_MIN
    || leaseMs > KNR_DISCOVERY_JOB_LEASE_MS_MAX
  ) {
    return {
      ok: false,
      error: "invalid_leaseMs",
      message: `leaseMs must be ${KNR_DISCOVERY_JOB_LEASE_MS_MIN}..${KNR_DISCOVERY_JOB_LEASE_MS_MAX}.`,
    };
  }
  return { ok: true, value: { evidenceKeyV1, sourceId, claimantId, leaseMs } };
}

export function knrDiscoveryJobLeaseHasAuthoritySpoof(job: unknown): boolean {
  if (job == null || typeof job !== "object") return false;
  const o = job as Record<string, unknown>;
  return (
    "verificationStatus" in o
    || "ourRate" in o
    || "companyPrice" in o
    || "pricePln" in o
    || "priced" in o
  );
}

export async function claimKnrDiscoveryJobLease(
  store: AtomicKnrDiscoveryJobStore,
  req: KnrDiscoveryJobClaimRequest,
  nowMs: number = Date.now(),
): Promise<KnrDiscoveryJobClaimResult> {
  const discoveryJobId = buildKnrDiscoveryJobId(req.evidenceKeyV1, req.sourceId);
  const key = knrDiscoveryJobKvKey(discoveryJobId);
  const nowIso = new Date(nowMs).toISOString();
  const leaseUntil = new Date(nowMs + req.leaseMs).toISOString();
  const next: KnrDiscoveryJobLeaseRecord = {
    discoveryJobId,
    evidenceKeyV1: req.evidenceKeyV1,
    sourceId: req.sourceId,
    claimantId: req.claimantId,
    status: KNR_DISCOVERY_JOB_LEASE_STATUS_ACTIVE,
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
  if (
    current
    && !isKnrDiscoveryJobLeaseExpired(current, nowMs)
    && current.claimantId === req.claimantId
  ) {
    return { acquired: true, job: current, reason: "acquired_same_claimant" };
  }

  return {
    acquired: false,
    job: current,
    reason: "held_by_other",
  };
}

export async function releaseKnrDiscoveryJobLease(
  store: AtomicKnrDiscoveryJobStore,
  opts: {
    evidenceKeyV1: string;
    sourceId: string;
    claimantId: string;
    nowMs?: number;
  },
): Promise<{ released: boolean; job: KnrDiscoveryJobLeaseRecord | null; error?: string }> {
  const nowMs = opts.nowMs ?? Date.now();
  const discoveryJobId = buildKnrDiscoveryJobId(opts.evidenceKeyV1, opts.sourceId);
  const key = knrDiscoveryJobKvKey(discoveryJobId);
  const current = await store.get(key);
  if (!current) return { released: false, job: null, error: "not_found" };
  if (current.claimantId !== opts.claimantId) {
    return { released: false, job: current, error: "not_owner" };
  }
  if (!store.delete) {
    return { released: false, job: current, error: "release_unsupported" };
  }
  const released: KnrDiscoveryJobLeaseRecord = {
    ...current,
    status: KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED,
    leaseUntil: new Date(nowMs - 1).toISOString(),
  };
  await store.delete(key);
  return { released: true, job: released };
}

// deno-lint-ignore no-explicit-any
export function createSupabaseAtomicKnrDiscoveryJobStore(supabase: any): AtomicKnrDiscoveryJobStore {
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
      return v as KnrDiscoveryJobLeaseRecord;
    },
    async delete(key) {
      const { error } = await supabase.from(table).delete().eq("key", key);
      if (error) throw new Error(error.message);
    },
  };
}
