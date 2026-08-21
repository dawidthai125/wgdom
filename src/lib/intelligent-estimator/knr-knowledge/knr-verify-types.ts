/**
 * IK-KNR KL-0 — Owner VERIFY contract (no UI · no persist · no Accept impl).
 *
 * Flow target: research → normalize → validate → PENDING_VERIFY → Owner VERIFY → VERIFIED
 */

import type { KnrVerificationStatus } from "./types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";

export type KnrOwnerVerifyAction = "VERIFY" | "REJECT" | "REVOKE";

export type KnrOwnerVerifyInput = {
  entry: KnrCatalogEntry;
  action: KnrOwnerVerifyAction;
  actorId: string;
  nowIso: string;
  /** REVOKE / REJECT reason — optional audit. */
  reason?: string | null;
};

export type KnrOwnerVerifyResult =
  | {
      ok: true;
      previousStatus: KnrVerificationStatus;
      nextStatus: KnrVerificationStatus;
      entry: KnrCatalogEntry;
    }
  | {
      ok: false;
      reason:
        | "INVALID_TRANSITION"
        | "MISSING_EVIDENCE"
        | "VALIDATION_INCOMPLETE"
        | "ALREADY_VERIFIED"
        | "NOT_PENDING";
      messagePl: string;
    };

/** Allowed transitions — KL-0 pure contract (persist = KL-6+). */
const VERIFY_TRANSITIONS: Partial<
  Record<KnrVerificationStatus, Partial<Record<KnrOwnerVerifyAction, KnrVerificationStatus>>>
> = {
  NORMATIVE: { VERIFY: "PENDING_VERIFY", REJECT: "REJECTED" },
  RESEARCHED: { VERIFY: "PENDING_VERIFY", REJECT: "REJECTED" },
  PENDING_VERIFY: { VERIFY: "VERIFIED", REJECT: "REJECTED" },
  VERIFIED: { REVOKE: "SUPERSEDED" },
};

/**
 * Pure transition planner — does NOT persist.
 * VERIFY to VERIFIED requires validation PASS (caller supplies validated entry).
 */
export function planKnrOwnerVerifyTransition(
  input: KnrOwnerVerifyInput,
): KnrOwnerVerifyResult {
  const { entry, action, actorId, nowIso } = input;
  const previousStatus = entry.verificationStatus;
  const nextStatus = VERIFY_TRANSITIONS[previousStatus]?.[action];

  if (!nextStatus) {
    return {
      ok: false,
      reason: "INVALID_TRANSITION",
      messagePl: `Niedozwolone: ${previousStatus} + ${action}.`,
    };
  }

  if (action === "VERIFY" && nextStatus === "VERIFIED") {
    if (entry.validationState !== "PASS") {
      return {
        ok: false,
        reason: "VALIDATION_INCOMPLETE",
        messagePl: "Weryfikacja wymaga validationState=PASS.",
      };
    }
    if (!entry.provenance.rawEvidenceRef) {
      return {
        ok: false,
        reason: "MISSING_EVIDENCE",
        messagePl: "Weryfikacja wymaga rawEvidenceRef.",
      };
    }
  }

  const updated: KnrCatalogEntry = {
    ...entry,
    verificationStatus: nextStatus,
    updatedAt: nowIso,
    verifiedAt: nextStatus === "VERIFIED" ? nowIso : entry.verifiedAt,
    verifiedBy: nextStatus === "VERIFIED" ? actorId : entry.verifiedBy,
    lifecycleState: nextStatus === "REJECTED" ? "REJECTED" : entry.lifecycleState,
  };

  return {
    ok: true,
    previousStatus,
    nextStatus,
    entry: updated,
  };
}

/** Statuses that require explicit Owner VERIFY before LOCAL HIT. */
export const KNR_PRE_VERIFY_STATUSES: readonly KnrVerificationStatus[] = [
  "NORMATIVE",
  "RESEARCHED",
  "PENDING_VERIFY",
] as const;

export function requiresKnrOwnerVerify(
  status: KnrVerificationStatus,
): boolean {
  return (KNR_PRE_VERIFY_STATUSES as readonly string[]).includes(status);
}
