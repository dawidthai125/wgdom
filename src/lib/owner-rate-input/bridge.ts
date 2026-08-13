/**
 * OWNER-INPUT Bid — common ensure/dedupe bridge (GO-1 Equipment; Transport-ready domain param).
 * REUSE createOwnerRateQuestion / listOwnerInputsForTender — ZERO second Q system.
 */

import { createOwnerRateQuestion } from "./api";
import { listOwnerInputsForTender } from "./api";
import type {
  CreateOwnerRateQuestionFailureReason,
  OwnerRateAskedByRole,
  OwnerRateDomain,
  OwnerRateEquipmentPayload,
  OwnerRateInputListItem,
  OwnerRateNoiseGate,
  OwnerRateLogisticsSignalKind,
  OwnerRateQuestionView,
  OwnerRateAnswerView,
  OwnerRateTransportPayload,
} from "./types";

export type FindOwnerInputForLineArgs = {
  tenderId: string;
  domain: OwnerRateDomain;
  lineRef: string;
};

/**
 * Current non-cancelled question for tender+domain+lineRef (open or answered).
 * Prefer answered/open over cancelled. If multiple, prefer answered then newest askedAt.
 */
export function findOwnerInputForLine(
  args: FindOwnerInputForLineArgs,
): OwnerRateInputListItem | null {
  const tenderId = String(args.tenderId ?? "").trim();
  const lineRef = String(args.lineRef ?? "").trim();
  if (!tenderId || !lineRef) return null;
  if (args.domain !== "equipment" && args.domain !== "transport") return null;

  const list = listOwnerInputsForTender({ tenderId, domain: args.domain }).filter(
    (item) =>
      item.question.status !== "cancelled" &&
      String(item.question.lineRef ?? "").trim() === lineRef,
  );
  if (!list.length) return null;

  list.sort((a, b) => {
    const rank = (s: string) => (s === "answered" ? 2 : s === "open" ? 1 : 0);
    const dr = rank(b.question.status) - rank(a.question.status);
    if (dr !== 0) return dr;
    return String(b.question.askedAt).localeCompare(String(a.question.askedAt));
  });
  return list[0] ?? null;
}

export type EnsureOwnerRateQuestionForGapInput = {
  tenderId: string;
  domain: OwnerRateDomain;
  lineRef: string;
  evidenceSummaryPl: string;
  askedByRole: OwnerRateAskedByRole;
  equipment?: OwnerRateEquipmentPayload;
  transport?: OwnerRateTransportPayload;
  promptPl?: string;
  askedAt?: string;
  noise?: OwnerRateNoiseGate;
  signalKind?: OwnerRateLogisticsSignalKind;
};

export type EnsureOwnerRateQuestionForGapResult =
  | {
      ok: true;
      created: boolean;
      question: OwnerRateQuestionView;
      currentAnswer: OwnerRateAnswerView | null;
    }
  | { ok: false; reason: CreateOwnerRateQuestionFailureReason | "MISSING_LINE_REF" };

/**
 * Dedupe key: tenderId + domain + lineRef.
 * Existing open/answered → REUSE (created=false). Else createOwnerRateQuestion.
 */
export function ensureOwnerRateQuestionForGap(
  input: EnsureOwnerRateQuestionForGapInput,
): EnsureOwnerRateQuestionForGapResult {
  const tenderId = String(input.tenderId ?? "").trim();
  const lineRef = String(input.lineRef ?? "").trim();
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!lineRef) return { ok: false, reason: "MISSING_LINE_REF" };

  const existing = findOwnerInputForLine({
    tenderId,
    domain: input.domain,
    lineRef,
  });
  if (existing) {
    return {
      ok: true,
      created: false,
      question: existing.question,
      currentAnswer: existing.currentAnswer,
    };
  }

  const created = createOwnerRateQuestion({
    tenderId,
    domain: input.domain,
    evidenceSummaryPl: input.evidenceSummaryPl,
    askedByRole: input.askedByRole,
    lineRef,
    equipment: input.equipment,
    transport: input.transport,
    promptPl: input.promptPl,
    askedAt: input.askedAt,
    noise: input.noise,
    signalKind: input.signalKind,
  });
  if (!created.ok) return created;

  return {
    ok: true,
    created: true,
    question: created.question,
    currentAnswer: null,
  };
}
