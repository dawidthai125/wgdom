/**
 * GO38 — IdentityCandidate persistence store.
 *
 * EPHEMERAL: in-memory (DISCOVERED / IDENTITY_CANDIDATE)
 * DURABLE: localStorage key kw-identity-candidates (OWNER_REVIEW+)
 *
 * NEVER writes CatalogWork · NEVER mints canonical workId · NEVER OUR RATE.
 */

import {
  candidateIdFromFingerprint,
  computeIdentityCandidateFingerprint,
} from "@/lib/work-catalog/identity-candidate-fingerprint";
import {
  GO38_P2_PERSISTENCE_POLICY,
  IDENTITY_CANDIDATE_SCHEMA_VERSION,
  IDENTITY_CANDIDATE_STORAGE_KEY,
  isDurableStatus,
  isEphemeralStatus,
  type CreateIdentityCandidateInput,
  type IdentityCandidateAuditEntry,
  type IdentityCandidateDurableStore,
  type IdentityCandidateRecord,
} from "@/lib/work-catalog/identity-candidate-types";

/** Session ephemeral map — not durable decision history. */
const ephemeralById = new Map<string, IdentityCandidateRecord>();

/**
 * In-memory durable mirror — used when localStorage is unavailable (Node/vite-node tests)
 * and as write-through cache when LS is present.
 */
let durableMemory: IdentityCandidateDurableStore | null = null;

let auditSeq = 0;

function audit(
  action: IdentityCandidateAuditEntry["action"],
  detail: string,
  actor: string,
  nowIso: string,
): IdentityCandidateAuditEntry {
  auditSeq += 1;
  return {
    id: `ica:${nowIso}:${auditSeq}`,
    at: nowIso,
    action,
    detail,
    actor,
  };
}

function deepFreezeEvidence<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function emptyIdentityCandidateDurableStore(nowIso = new Date().toISOString()): IdentityCandidateDurableStore {
  return {
    schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
    updatedAt: nowIso,
    candidates: [],
  };
}

export function normalizeIdentityCandidateDurableStore(raw: unknown): IdentityCandidateDurableStore {
  if (!raw || typeof raw !== "object") return emptyIdentityCandidateDurableStore();
  const r = raw as Partial<IdentityCandidateDurableStore>;
  const candidates = Array.isArray(r.candidates)
    ? r.candidates.filter(
        (c): c is IdentityCandidateRecord =>
          !!c &&
          typeof c === "object" &&
          typeof (c as IdentityCandidateRecord).candidateId === "string" &&
          typeof (c as IdentityCandidateRecord).fingerprint === "string" &&
          isDurableStatus((c as IdentityCandidateRecord).status),
      )
    : [];
  return {
    schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
    candidates,
  };
}

export function loadIdentityCandidateDurableStore(): IdentityCandidateDurableStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(IDENTITY_CANDIDATE_STORAGE_KEY);
      if (raw) {
        const fromLs = normalizeIdentityCandidateDurableStore(JSON.parse(raw));
        durableMemory = fromLs;
        return fromLs;
      }
    }
  } catch {
    /* fall through to memory */
  }
  return durableMemory
    ? normalizeIdentityCandidateDurableStore(durableMemory)
    : emptyIdentityCandidateDurableStore();
}

export function saveIdentityCandidateDurableStore(store: IdentityCandidateDurableStore): void {
  const next = normalizeIdentityCandidateDurableStore(store);
  const cur = loadIdentityCandidateDurableStore();
  if (next.candidates.length === 0 && cur.candidates.length > 0) {
    throw new Error("identity-candidate: refusing empty durable write over non-empty store");
  }
  durableMemory = next;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(IDENTITY_CANDIDATE_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* memory-only durable still valid for session / tests */
  }
}

/** Test helper — clears ephemeral + durable local key + memory. */
export function clearIdentityCandidateStoresForTests(): void {
  ephemeralById.clear();
  durableMemory = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(IDENTITY_CANDIDATE_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getEphemeralIdentityCandidate(candidateId: string): IdentityCandidateRecord | null {
  return ephemeralById.get(candidateId) ?? null;
}

export function listEphemeralIdentityCandidates(): IdentityCandidateRecord[] {
  return [...ephemeralById.values()];
}

export function findOpenCandidateByFingerprint(fingerprint: string): IdentityCandidateRecord | null {
  for (const c of ephemeralById.values()) {
    if (c.fingerprint === fingerprint && (c.status === "IDENTITY_CANDIDATE" || c.status === "DISCOVERED")) {
      return c;
    }
  }
  const durable = loadIdentityCandidateDurableStore();
  for (const c of durable.candidates) {
    if (c.fingerprint === fingerprint && c.status === "OWNER_REVIEW") {
      return c;
    }
  }
  return null;
}

export function findDurableById(candidateId: string): IdentityCandidateRecord | null {
  return loadIdentityCandidateDurableStore().candidates.find((c) => c.candidateId === candidateId) ?? null;
}

export function findAnyById(candidateId: string): IdentityCandidateRecord | null {
  return getEphemeralIdentityCandidate(candidateId) ?? findDurableById(candidateId);
}

export function listRejectedFingerprints(): Set<string> {
  const set = new Set<string>();
  for (const c of loadIdentityCandidateDurableStore().candidates) {
    if (c.status === "REJECTED") set.add(c.fingerprint);
  }
  return set;
}

function defaultConfidence(
  partial?: CreateIdentityCandidateInput["confidenceComponents"],
): IdentityCandidateRecord["confidenceComponents"] {
  return {
    scopeExact: false,
    technologyExact: false,
    unitExact: false,
    semanticDefinitionClear: false,
    authoritativeExternalMapping: false,
    noCompetingIdentity: false,
    noRejectedEquivalent: true,
    deterministicProvenance: true,
    narrative: "GO38 candidate — Owner Review required for canonical",
    ...partial,
  };
}

export type CreateIdentityCandidateResult =
  | { ok: true; candidate: IdentityCandidateRecord; reusedExisting: boolean }
  | { ok: false; code: string; message: string };

/**
 * Create IDENTITY_CANDIDATE in ephemeral memory.
 * Idempotent: same fingerprint → return existing open candidate.
 * Rejected fingerprint → fail-closed (no resurrect).
 */
export function createIdentityCandidate(input: CreateIdentityCandidateInput): CreateIdentityCandidateResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const actor = input.actor ?? "system";
  const evidence = deepFreezeEvidence(input.evidence);
  const fingerprint = computeIdentityCandidateFingerprint({
    parentContext: input.parentContext,
    intendedPlane: input.intendedPlane,
    unit: input.unit,
    technology: input.technology,
    scope: input.scope,
    knrEvidence: evidence.knrEvidence,
    negativeEvidence: evidence.negativeEvidence,
    semanticDefinition: evidence.semanticEvidence.map((s) => s.detail).join(";"),
  });

  if (listRejectedFingerprints().has(fingerprint)) {
    return {
      ok: false,
      code: "REJECTED_FINGERPRINT",
      message: "Cannot resurrect REJECTED fingerprint via create — material new evidence required",
    };
  }

  const existing = findOpenCandidateByFingerprint(fingerprint);
  if (existing) {
    return { ok: true, candidate: existing, reusedExisting: true };
  }

  const policy = input.proposedWorkIdPolicy ?? "B_GENERATE_ON_ACCEPT_ONLY";
  const proposedWorkId =
    policy === "REUSE_EXISTING_CANONICAL" && input.proposedWorkId
      ? String(input.proposedWorkId)
      : null;
  if (policy === "REUSE_EXISTING_CANONICAL" && !proposedWorkId) {
    return {
      ok: false,
      code: "REUSE_WITHOUT_WORK_ID",
      message: "REUSE_EXISTING_CANONICAL requires evidence-backed proposedWorkId",
    };
  }
  if (policy === "B_GENERATE_ON_ACCEPT_ONLY" && input.proposedWorkId) {
    return {
      ok: false,
      code: "FAKE_PROPOSED_WORK_ID",
      message: "Cannot set proposedWorkId under B_GENERATE_ON_ACCEPT_ONLY — mint only on Accept",
    };
  }

  const candidateId = candidateIdFromFingerprint(fingerprint);
  // Collision with durable non-open same id/fingerprint handled above; if durable SUPERSEDED/REJECTED same id rare
  const durableHit = findDurableById(candidateId);
  if (durableHit && durableHit.status === "REJECTED") {
    return {
      ok: false,
      code: "REJECTED_FINGERPRINT",
      message: "Rejected candidateId/fingerprint cannot be reopened",
    };
  }

  let supersedesCandidateId: string | null = input.supersedeCandidateId ?? null;

  const record: IdentityCandidateRecord = {
    candidateId,
    fingerprint,
    parentContext: { ...input.parentContext },
    proposedWorkId,
    proposedWorkIdPolicy: policy,
    label: input.label,
    description: input.description ?? "",
    unit: input.unit,
    technology: input.technology,
    scope: input.scope,
    family: input.family,
    slugHint: input.slugHint ?? null,
    classification: {
      intendedPlane: input.intendedPlane,
      ownerPlaneToday: input.ownerPlaneToday ?? null,
      note: input.classificationNote ?? "GO38 — Owner decision required",
    },
    originalEvidence: evidence,
    confidenceComponents: defaultConfidence(input.confidenceComponents),
    provenance: {
      createdBy: input.provenance?.createdBy ?? "AI_IDENTITY_RESEARCH",
      goChain: input.provenance?.goChain ?? ["GO35", "GO36", "GO37", "GO38"],
      inputs: input.provenance?.inputs ?? [],
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: null,
    status: "IDENTITY_CANDIDATE",
    persistence: "EPHEMERAL",
    ownerDecision: {
      kind: "PENDING",
      decidedAt: null,
      note: null,
      canonicalAcceptDeferredToGo39: false,
    },
    reviewEdits: null,
    rejectionHistory: [],
    supersedesCandidateId,
    supersededByCandidateId: null,
    acceptedCanonicalProvenance: null,
    auditLog: [audit("created", `fingerprint=${fingerprint}`, actor, nowIso)],
    mayWriteCatalogWork: false,
    mayAssignLaborWorkId: false,
    mayActivatePack: false,
    maySetOurRate: false,
  };

  ephemeralById.set(candidateId, record);

  if (supersedesCandidateId) {
    const r = applySupersession({
      oldCandidateId: supersedesCandidateId,
      newCandidateId: candidateId,
      actor,
      nowIso,
    });
    if (!r.ok) {
      // keep new ephemeral; supersession best-effort message in audit
      const cur = ephemeralById.get(candidateId)!;
      cur.auditLog = [
        ...cur.auditLog,
        audit("created", `supersession_failed:${r.code}`, actor, nowIso),
      ];
    }
  }

  return { ok: true, candidate: ephemeralById.get(candidateId)!, reusedExisting: false };
}

export type QueueOwnerReviewResult =
  | { ok: true; candidate: IdentityCandidateRecord }
  | { ok: false; code: string; message: string };

/**
 * Transition ephemeral IDENTITY_CANDIDATE → durable OWNER_REVIEW.
 * Idempotent if already OWNER_REVIEW.
 */
export function queueIdentityCandidateForOwnerReview(input: {
  candidateId: string;
  actor?: string;
  nowIso?: string;
}): QueueOwnerReviewResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const actor = input.actor ?? "system";

  const durableExisting = findDurableById(input.candidateId);
  if (durableExisting?.status === "OWNER_REVIEW") {
    return { ok: true, candidate: durableExisting };
  }
  if (durableExisting?.status === "REJECTED") {
    return { ok: false, code: "REJECTED", message: "Cannot queue REJECTED candidate" };
  }
  if (durableExisting?.status === "SUPERSEDED") {
    return { ok: false, code: "SUPERSEDED", message: "Cannot queue SUPERSEDED candidate" };
  }
  if (durableExisting?.status === "ACCEPTED_CANONICAL") {
    return { ok: false, code: "ALREADY_ACCEPTED", message: "Already ACCEPTED_CANONICAL (provenance)" };
  }

  const ephemeral = getEphemeralIdentityCandidate(input.candidateId);
  if (!ephemeral) {
    return { ok: false, code: "NOT_FOUND", message: "Ephemeral candidate not found" };
  }
  if (!isEphemeralStatus(ephemeral.status) && ephemeral.status !== "IDENTITY_CANDIDATE") {
    return { ok: false, code: "BAD_STATUS", message: `Cannot queue from ${ephemeral.status}` };
  }

  // One open OWNER_REVIEW per fingerprint
  const openFp = findOpenCandidateByFingerprint(ephemeral.fingerprint);
  if (openFp && openFp.candidateId !== ephemeral.candidateId && openFp.status === "OWNER_REVIEW") {
    return {
      ok: false,
      code: "FINGERPRINT_OPEN_EXISTS",
      message: "Another OWNER_REVIEW already open for fingerprint",
    };
  }

  const durableRow: IdentityCandidateRecord = {
    ...ephemeral,
    status: "OWNER_REVIEW",
    persistence: "DURABLE",
    updatedAt: nowIso,
    expiresAt: null,
    auditLog: [
      ...ephemeral.auditLog,
      audit("queued_owner_review", GO38_P2_PERSISTENCE_POLICY.globalRule, actor, nowIso),
      audit("persist_durable", IDENTITY_CANDIDATE_STORAGE_KEY, actor, nowIso),
    ],
  };

  const store = loadIdentityCandidateDurableStore();
  const without = store.candidates.filter((c) => c.candidateId !== durableRow.candidateId);
  saveIdentityCandidateDurableStore({
    schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
    updatedAt: nowIso,
    candidates: [...without, durableRow],
  });
  ephemeralById.delete(input.candidateId);

  const saved = findDurableById(input.candidateId);
  if (!saved) {
    return {
      ok: false,
      code: "PERSIST_FAILED",
      message: "Durable persist failed after OWNER_REVIEW transition",
    };
  }
  return { ok: true, candidate: saved };
}

export function applySupersession(input: {
  oldCandidateId: string;
  newCandidateId: string;
  actor?: string;
  nowIso?: string;
}): { ok: true } | { ok: false; code: string } {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const actor = input.actor ?? "system";
  const store = loadIdentityCandidateDurableStore();
  const oldIdx = store.candidates.findIndex((c) => c.candidateId === input.oldCandidateId);
  const oldEphemeral = getEphemeralIdentityCandidate(input.oldCandidateId);

  if (oldIdx < 0 && !oldEphemeral) return { ok: false, code: "OLD_NOT_FOUND" };

  if (oldEphemeral && isEphemeralStatus(oldEphemeral.status)) {
    // Promote old to SUPERSEDED durable for history
    const superseded: IdentityCandidateRecord = {
      ...oldEphemeral,
      status: "SUPERSEDED",
      persistence: "DURABLE",
      updatedAt: nowIso,
      supersededByCandidateId: input.newCandidateId,
      auditLog: [
        ...oldEphemeral.auditLog,
        audit("superseded", `by=${input.newCandidateId}`, actor, nowIso),
        audit("persist_durable", "supersession", actor, nowIso),
      ],
    };
    ephemeralById.delete(input.oldCandidateId);
    const without = store.candidates.filter((c) => c.candidateId !== superseded.candidateId);
    const newEph = ephemeralById.get(input.newCandidateId);
    if (newEph) {
      newEph.supersedesCandidateId = input.oldCandidateId;
      newEph.updatedAt = nowIso;
    }
    saveIdentityCandidateDurableStore({
      schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
      updatedAt: nowIso,
      candidates: [...without, superseded],
    });
    return { ok: true };
  }

  const old = store.candidates[oldIdx];
  if (old.status === "ACCEPTED_CANONICAL") {
    return { ok: false, code: "CANNOT_SUPERSEDE_ACCEPTED_CANONICAL" };
  }
  if (old.status === "REJECTED") {
    return { ok: false, code: "CANNOT_SUPERSEDE_REJECTED" };
  }

  const nextOld: IdentityCandidateRecord = {
    ...old,
    status: "SUPERSEDED",
    persistence: "DURABLE",
    updatedAt: nowIso,
    supersededByCandidateId: input.newCandidateId,
    // Do not mutate originalEvidence
    originalEvidence: old.originalEvidence,
    auditLog: [...old.auditLog, audit("superseded", `by=${input.newCandidateId}`, actor, nowIso)],
  };

  const candidates = store.candidates.map((c) =>
    c.candidateId === input.oldCandidateId ? nextOld : c,
  );
  const newEph = ephemeralById.get(input.newCandidateId);
  if (newEph) {
    newEph.supersedesCandidateId = input.oldCandidateId;
  }
  const newDur = candidates.find((c) => c.candidateId === input.newCandidateId);
  if (newDur) {
    const patched = {
      ...newDur,
      supersedesCandidateId: input.oldCandidateId,
      updatedAt: nowIso,
    };
    saveIdentityCandidateDurableStore({
      schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
      updatedAt: nowIso,
      candidates: candidates.map((c) => (c.candidateId === patched.candidateId ? patched : c)),
    });
  } else {
    saveIdentityCandidateDurableStore({
      schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
      updatedAt: nowIso,
      candidates,
    });
  }
  return { ok: true };
}

export function upsertDurableCandidate(record: IdentityCandidateRecord, nowIso: string): void {
  if (!isDurableStatus(record.status)) {
    throw new Error("upsertDurableCandidate requires durable status");
  }
  const store = loadIdentityCandidateDurableStore();
  const without = store.candidates.filter((c) => c.candidateId !== record.candidateId);
  saveIdentityCandidateDurableStore({
    schemaVersion: IDENTITY_CANDIDATE_SCHEMA_VERSION,
    updatedAt: nowIso,
    candidates: [...without, { ...record, persistence: "DURABLE", expiresAt: null }],
  });
}

export { IDENTITY_CANDIDATE_STORAGE_KEY, GO38_P2_PERSISTENCE_POLICY };
