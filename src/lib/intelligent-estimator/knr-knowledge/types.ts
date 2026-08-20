/**
 * IK-KNR KNOWLEDGE LAYER — KL-0 contracts (types only).
 *
 * TARGET domain · NOT wired to IkEntryHost · ZERO HTTP · ZERO persist.
 * Identity v2 final fold: REQUIRES OD-KNR-SAMPLE-1 + OD-KNR-ID-1.
 *
 * KNR norm knowledge ≠ Work Catalog OUR RATE ≠ Price Memory ≠ catalogWorkId.
 */

/** KL-0 contract schema — bump on breaking contract changes only. */
export const KNR_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

export type KnrKnowledgeSchemaVersion = typeof KNR_KNOWLEDGE_SCHEMA_VERSION;

/** Source hierarchy (DESIGN FREEZE §12). L5 DEFAULT OFF · L6 NEVER authoritative. */
export const KNR_SOURCE_LEVELS = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
] as const;

export type KnrSourceLevel = (typeof KNR_SOURCE_LEVELS)[number];

export type KnrCatalogFamily =
  | "KNR"
  | "KNR-W"
  | "KNNR"
  | "KNNR-W"
  | "KSNR"
  | "KNP"
  | "NNRNKB"
  | "ZKNR"
  | "OTHER";

/** Norm component kind — normative KNR only (not PLN pricing). */
export type KnrNormComponentKind = "R" | "M" | "S";

export type KnrValidationState =
  | "PASS"
  | "INCOMPLETE"
  | "CONFLICT"
  | "REJECTED";

/**
 * Verification FSM (DESIGN FREEZE §8.4 + KL-0).
 * NORMATIVE / RESEARCHED / PENDING_VERIFY ≠ VERIFIED — no auto-promotion.
 */
export type KnrVerificationStatus =
  | "STRUCTURAL"
  | "NORMATIVE"
  | "RESEARCHED"
  | "PENDING_VERIFY"
  | "VERIFIED"
  | "INCOMPLETE"
  | "CONFLICTED"
  | "REJECTED"
  | "STALE"
  | "SUPERSEDED";

export type KnrLifecycleState = "ACTIVE" | "SUPERSEDED" | "REJECTED";

/** LOCAL-FIRST lookup outcomes (KL-0 contract · lookup impl = KL-2). */
export type KnrLookupStatus =
  | "LOCAL_HIT"
  | "LOCAL_MISS"
  | "STALE_HIT"
  | "CONFLICT"
  | "LEGAL_BLOCK"
  | "INCOMPLETE"
  | "RESEARCH_REQUIRED"
  | "RESEARCH_DISABLED"
  | "RESEARCH_NO_RESULT"
  | "RESEARCH_UNAVAILABLE"
  | "PENDING_VERIFY";

/** Statuses that count as production LOCAL HIT (DESIGN FREEZE §8.4). */
export const KNR_LOCAL_HIT_STATUSES: readonly KnrLookupStatus[] = [
  "LOCAL_HIT",
  "STALE_HIT",
] as const;

export function isKnrLocalHitStatus(status: KnrLookupStatus): boolean {
  return (KNR_LOCAL_HIT_STATUSES as readonly string[]).includes(status);
}

/** Only VERIFIED (+ policy STALE) may serve norm bundle without HTTP. */
export function isKnrVerifiedServeStatus(
  verificationStatus: KnrVerificationStatus,
): boolean {
  return verificationStatus === "VERIFIED" || verificationStatus === "STALE";
}

/** Research never auto-promotes to VERIFIED. */
export function canKnrAutoPromoteToVerified(
  _verificationStatus: KnrVerificationStatus,
): false {
  return false;
}
