/**
 * KL-7-P2C — Discovery job lease (SHAPE from research-job-lease · NOT MMR domain).
 * Namespace: kw-knr-discovery-job:
 * Identity: evidenceKeyV1 + sourceId
 * ZERO prices · ZERO outbound HTTP.
 */

import {
  KNR_DISCOVERY_JOB_LEASE_MS_MAX,
  KNR_DISCOVERY_JOB_LEASE_MS_MIN,
} from "./knr-discovery-orch-types";

export const KNR_DISCOVERY_JOB_KV_PREFIX = "kw-knr-discovery-job:" as const;

export const KNR_DISCOVERY_JOB_LEASE_STATUS_ACTIVE = "ACTIVE" as const;
export const KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED = "RELEASED" as const;

export type KnrDiscoveryJobLeaseStatus =
  | typeof KNR_DISCOVERY_JOB_LEASE_STATUS_ACTIVE
  | typeof KNR_DISCOVERY_JOB_LEASE_STATUS_RELEASED;

export type KnrDiscoveryJobLeaseRecord = {
  discoveryJobId: string;
  evidenceKeyV1: string;
  sourceId: string;
  claimantId: string;
  status: KnrDiscoveryJobLeaseStatus;
  claimedAt: string;
  leaseUntil: string;
};

export type KnrDiscoveryJobClaimRequest = {
  evidenceKeyV1: string;
  sourceId: string;
  claimantId: string;
  leaseMs: number;
};

export type KnrDiscoveryJobClaimResult = {
  acquired: boolean;
  job: KnrDiscoveryJobLeaseRecord | null;
  reason?:
    | "acquired_new"
    | "acquired_reclaim_expired"
    | "acquired_same_claimant"
    | "held_by_other"
    | "validation_error";
  error?: string;
};

export type AtomicKnrDiscoveryJobStore = {
  tryInsert(key: string, value: KnrDiscoveryJobLeaseRecord): Promise<{ ok: boolean }>;
  tryUpdateIfExpired(
    key: string,
    value: KnrDiscoveryJobLeaseRecord,
    nowIso: string,
  ): Promise<{ ok: boolean }>;
  get(key: string): Promise<KnrDiscoveryJobLeaseRecord | null>;
  delete?(key: string): Promise<void>;
};

/** Deterministic lease identity — OD-P2C-3. */
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
  const leaseMs = typeof b.leaseMs === "number" ? b.leaseMs : Number(b.leaseMs);

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

/** Reject authority/pricing fields on lease records. */
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

/**
 * Hard SF claim — INSERT-first · reclaim expired · same claimant renew · held_by_other.
 */
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

/** In-memory atomic store — OFF-mode / unit tests (mutex ≈ row lock). */
export function createMemoryAtomicKnrDiscoveryJobStore(): AtomicKnrDiscoveryJobStore & {
  dump(): Map<string, KnrDiscoveryJobLeaseRecord>;
  forceSet(key: string, value: KnrDiscoveryJobLeaseRecord): void;
} {
  const map = new Map<string, KnrDiscoveryJobLeaseRecord>();
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
        if (!isKnrDiscoveryJobLeaseExpired(cur, nowMs)) return { ok: false };
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

export const KNR_DISCOVERY_JOB_LEASE_P2C_IMPLEMENTED = true as const;
