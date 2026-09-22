/**
 * G3 presentation isolation — OWNER_OVERRIDE / HISTORICAL · never false IK_CALCULATED.
 * Presentation only · reuses IkG3FinalBidRecord fields.
 * Self-contained (does not mutate / depend on OD-FTO-5 ik-g3-final-bid formatter).
 */

import type { IkG3FinalBidRecord } from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { IkG3UiSourceLabel } from "./types";

export type ResolveIkG3UiSourceInput = {
  record: IkG3FinalBidRecord | null | undefined;
  /** Current Full Walk id — when record.approvedAt predates walk or case differs → HISTORICAL */
  currentWalkId?: string | null;
  /** ISO — if record.approvedAt is older than walk startedAt → HISTORICAL */
  currentWalkStartedAt?: string | null;
};

export function resolveIkG3UiSourceLabel(
  input: ResolveIkG3UiSourceInput,
): IkG3UiSourceLabel {
  const r = input.record;
  if (!r) return "ABSENT";
  if (r.source === "autonomous_g3" && r.ownerOverride !== true) {
    return "IK_CALCULATED";
  }
  const walkStarted = input.currentWalkStartedAt?.trim() || null;
  const approved = typeof r.approvedAt === "string" ? r.approvedAt : "";
  if (walkStarted && approved && approved < walkStarted) {
    return "HISTORICAL_OWNER_DECISION";
  }
  if (r.source === "owner_g3" || r.ownerOverride === true) {
    return "OWNER_OVERRIDE";
  }
  return "OWNER_OVERRIDE";
}

/** Extended G3 status — SOURCE = OWNER OVERRIDE · HISTORICAL when applicable. */
export function formatIkG3FinalBidStatusIsolatedPl(
  record: IkG3FinalBidRecord | null | undefined,
  opts?: {
    currentWalkId?: string | null;
    currentWalkStartedAt?: string | null;
  },
): string | null {
  if (!record) return null;
  const net = record.netPln.toLocaleString("pl-PL");
  const vat = record.vatPln.toLocaleString("pl-PL");
  const gross = record.grossPln.toLocaleString("pl-PL");
  const base = `G3 FINAL BID: PERSISTED · ${net} PLN netto · VAT ${vat} · ${gross} PLN brutto`;
  const label = resolveIkG3UiSourceLabel({
    record,
    currentWalkId: opts?.currentWalkId,
    currentWalkStartedAt: opts?.currentWalkStartedAt,
  });
  if (label === "IK_CALCULATED") {
    return `${base} · SOURCE = IK CALCULATED`;
  }
  if (label === "HISTORICAL_OWNER_DECISION") {
    return `${base} · SOURCE = OWNER OVERRIDE · HISTORICAL`;
  }
  if (label === "OWNER_OVERRIDE") {
    return `${base} · SOURCE = OWNER OVERRIDE`;
  }
  return base;
}
