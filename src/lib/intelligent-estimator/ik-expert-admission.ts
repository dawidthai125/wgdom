/**
 * IK-LINE-TOLERANT-EXPERT-ADMISSION-01 — derived Expert Admission.
 *
 * DOCUMENT TRUTH ≠ EXPERT ADMISSION
 * readyForExperts stays Document READY lock (status === "ready").
 * expertChainMayProceed gates Orchestra on ADMITTED lines only.
 *
 * ZERO invent · ZERO new KV · DERIVED EACH RUN · ONE OfferBoq · lineId canonical.
 */

import type { OfferBoqLine } from "@/lib/tender-offer-boq";

/** Mirror Document Expert status — avoid circular import with ik-document-expert. */
export type IkAdmissionDocumentStatus =
  | "ready"
  | "partial"
  | "hold"
  | "gap"
  | "pending";

export type IkExpertAdmissionState = "ADMITTED" | "UNRESOLVED" | "SKIPPED";

export type IkExpertAdmissionReasonCode =
  | "MISSING_QUANTITY"
  | "MISSING_UNIT"
  | "MISSING_DESCRIPTION"
  | "MISSING_LINE_ID"
  | "NOISE_SKIPPED";

export type IkExpertAdmissionLine = {
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  quantityRaw: string;
  unit: string;
  admission: IkExpertAdmissionState;
  reasons: IkExpertAdmissionReasonCode[];
};

export type IkExpertAdmissionSummary = {
  documentStatus: IkAdmissionDocumentStatus;
  readyForExperts: boolean;
  admittedLineIds: string[];
  unresolvedLineIds: string[];
  skippedLineIds: string[];
  admittedCount: number;
  unresolvedCount: number;
  skippedCount: number;
  /** GLOBAL integrity block — Document hold/gap/pending. */
  globalIntegrityBlocker: boolean;
  expertChainMayProceed: boolean;
  lines: IkExpertAdmissionLine[];
};

const EMPTY_DESC = "(bez opisu)";

/** Structural ADMITTED predicate (Design Freeze §4). */
export function isOfferBoqLineStructurallyAdmitted(line: OfferBoqLine): boolean {
  const lineId = String(line.lineId ?? "").trim();
  if (!lineId) return false;
  if (line.isNoise === true) return false;
  const desc = String(line.description ?? "").trim();
  if (!desc || desc === EMPTY_DESC) return false;
  const unit = String(line.unit ?? "").trim();
  if (!unit) return false;
  const qty = line.quantity;
  if (!(typeof qty === "number" && Number.isFinite(qty) && qty > 0)) return false;
  return true;
}

export function classifyOfferBoqLineAdmission(line: OfferBoqLine): IkExpertAdmissionLine {
  const lineId = String(line.lineId ?? "").trim();
  const lp = String(line.lp ?? "").trim();
  const description = String(line.description ?? "");
  const unit = String(line.unit ?? "");
  const quantity = typeof line.quantity === "number" ? line.quantity : Number.NaN;
  const quantityRaw = String(line.quantityRaw ?? "");

  if (line.isNoise === true) {
    return {
      lineId: lineId || `noise:${lp || "unknown"}`,
      lp,
      description,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      quantityRaw,
      unit,
      admission: "SKIPPED",
      reasons: ["NOISE_SKIPPED"],
    };
  }

  const reasons: IkExpertAdmissionReasonCode[] = [];
  if (!lineId) reasons.push("MISSING_LINE_ID");
  const descTrim = description.trim();
  if (!descTrim || descTrim === EMPTY_DESC) reasons.push("MISSING_DESCRIPTION");
  if (!unit.trim()) reasons.push("MISSING_UNIT");
  if (!(typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0)) {
    reasons.push("MISSING_QUANTITY");
  }

  if (reasons.length === 0) {
    return {
      lineId,
      lp,
      description,
      quantity,
      quantityRaw,
      unit,
      admission: "ADMITTED",
      reasons: [],
    };
  }

  return {
    lineId: lineId || `unresolved:${lp || "unknown"}`,
    lp,
    description,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    quantityRaw,
    unit,
    admission: "UNRESOLVED",
    reasons,
  };
}

/**
 * Global integrity blocker = Document cannot safely open Expert Chain at all.
 * REUSE existing Document status machine: hold | gap | pending.
 */
export function isIkDocumentGlobalIntegrityBlocker(
  documentStatus: IkAdmissionDocumentStatus,
): boolean {
  return (
    documentStatus === "hold"
    || documentStatus === "gap"
    || documentStatus === "pending"
  );
}

export function buildIkExpertAdmissionSummary(input: {
  documentStatus: IkAdmissionDocumentStatus;
  readyForExperts: boolean;
  lines: readonly OfferBoqLine[];
}): IkExpertAdmissionSummary {
  const classified = input.lines.map(classifyOfferBoqLineAdmission);
  const admittedLineIds: string[] = [];
  const unresolvedLineIds: string[] = [];
  const skippedLineIds: string[] = [];

  for (const row of classified) {
    if (row.admission === "ADMITTED") admittedLineIds.push(row.lineId);
    else if (row.admission === "UNRESOLVED") unresolvedLineIds.push(row.lineId);
    else skippedLineIds.push(row.lineId);
  }

  const globalIntegrityBlocker = isIkDocumentGlobalIntegrityBlocker(input.documentStatus);
  const admittedCount = admittedLineIds.length;
  const expertChainMayProceed = admittedCount > 0 && !globalIntegrityBlocker;

  return {
    documentStatus: input.documentStatus,
    readyForExperts: input.readyForExperts === true,
    admittedLineIds,
    unresolvedLineIds,
    skippedLineIds,
    admittedCount,
    unresolvedCount: unresolvedLineIds.length,
    skippedCount: skippedLineIds.length,
    globalIntegrityBlocker,
    expertChainMayProceed,
    lines: classified,
  };
}

export function emptyIkExpertAdmissionSummary(
  documentStatus: IkAdmissionDocumentStatus = "pending",
  readyForExperts = false,
): IkExpertAdmissionSummary {
  return {
    documentStatus,
    readyForExperts,
    admittedLineIds: [],
    unresolvedLineIds: [],
    skippedLineIds: [],
    admittedCount: 0,
    unresolvedCount: 0,
    skippedCount: 0,
    globalIntegrityBlocker: isIkDocumentGlobalIntegrityBlocker(documentStatus),
    expertChainMayProceed: false,
    lines: [],
  };
}

/** lineId set for ADMITTED — O(1) membership. */
export function admittedLineIdSet(summary: IkExpertAdmissionSummary | null | undefined): Set<string> {
  return new Set(summary?.admittedLineIds ?? []);
}

export function filterAdmittedMasterBoqLines<T extends { line: OfferBoqLine }>(
  refs: readonly T[],
  summary: IkExpertAdmissionSummary | null | undefined,
): T[] {
  const allowed = admittedLineIdSet(summary);
  if (allowed.size === 0) return [];
  return refs.filter((r) => allowed.has(String(r.line.lineId ?? "").trim()));
}

/**
 * Resolve admission for gates.
 * Prefer Document Expert snapshot (stable structural ADMITTED set) when present —
 * Identity mapper may mark short descriptions as isNoise without changing Document admission.
 * Empty masterBoqLines[] is authoritative → recompute empty (test / blocked fixtures).
 */
export function resolveIkExpertAdmission(expert: {
  status: IkAdmissionDocumentStatus;
  masterBoq: { status: IkAdmissionDocumentStatus; readyForExperts: boolean };
  masterBoqLines?: readonly { line: OfferBoqLine }[] | null;
  offerBoq?: { lines?: OfferBoqLine[] } | null;
  expertAdmission?: IkExpertAdmissionSummary | null;
}): IkExpertAdmissionSummary {
  const documentStatus = expert.masterBoq.status ?? expert.status;
  const readyForExperts = expert.masterBoq.readyForExperts === true;
  const globalIntegrityBlocker = isIkDocumentGlobalIntegrityBlocker(documentStatus);

  if (Array.isArray(expert.masterBoqLines) && expert.masterBoqLines.length === 0) {
    return buildIkExpertAdmissionSummary({
      documentStatus,
      readyForExperts,
      lines: [],
    });
  }

  if (expert.expertAdmission) {
    const snap = expert.expertAdmission;
    return {
      ...snap,
      documentStatus,
      readyForExperts,
      globalIntegrityBlocker,
      expertChainMayProceed: snap.admittedCount > 0 && !globalIntegrityBlocker,
    };
  }

  const lines = Array.isArray(expert.masterBoqLines)
    ? expert.masterBoqLines.map((r) => r.line)
    : (expert.offerBoq?.lines ?? []);
  return buildIkExpertAdmissionSummary({
    documentStatus,
    readyForExperts,
    lines,
  });
}

export function expertChainMayProceedFromReport(expert: {
  status: IkAdmissionDocumentStatus;
  masterBoq: { status: IkAdmissionDocumentStatus; readyForExperts: boolean };
  masterBoqLines?: readonly { line: OfferBoqLine }[];
  offerBoq?: { lines?: OfferBoqLine[] } | null;
  expertAdmission?: IkExpertAdmissionSummary | null;
}): boolean {
  return resolveIkExpertAdmission(expert).expertChainMayProceed;
}
