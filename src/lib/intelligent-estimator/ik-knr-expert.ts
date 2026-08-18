/**
 * IK-KNR-EXPERT Slice B — catalog evidence adapter + report.
 *
 * Path (READ ONLY):
 *   IkDocumentExpert.masterBoq.readyForExperts === true
 *   → masterBoqLines
 *   → line.catalogBasis ?? provenance.catalogBasis
 *   → completeness (family + tableCode)
 *   → IkKnrExpertReport
 *
 * ZERO Product Mapper · ZERO A1 classification gate · ZERO Research.
 * ZERO write catalogWorkId / knrHint / Master BOQ.
 * ZERO Owner mapping (Slice D) · ZERO Sala (Slice C).
 *
 * CANDIDATE = complete catalog evidence, not a CatalogWork identity.
 */

import type { CatalogBasis, CatalogBasisFamily } from "@/lib/tenders-bzp-swz";
import type { IkDocumentExpertReport, IkMasterBoqLineRef } from "./ik-document-expert";

export type IkKnrExpertStatus = "NOT_STARTED" | "ANALYZING" | "COMPLETED" | "BLOCKED";

export type IkKnrLineStatus = "NONE" | "RECOGNIZED" | "CANDIDATE" | "HOLD" | "CONFLICT";

export type IkKnrExpertLineResult = {
  lineId: string;
  dwellingId: string;
  lp: string | number | null;
  catalogBasis: CatalogBasis | null;
  lineStatus: IkKnrLineStatus;
  proposedWorkId: null;
  holdReason?: string;
};

export type IkKnrExpertCounts = {
  withBasis: number;
  withoutBasis: number;
  recognized: number;
  candidate: number;
  hold: number;
  conflict: number;
  none: number;
  resolved: 0;
};

export type IkKnrExpertReport = {
  tenderId: string;
  status: IkKnrExpertStatus;
  inputLineCount: number;
  outputLineCount: number;
  counts: IkKnrExpertCounts;
  catalogWorkIdWritten: 0;
  knrHintMutated: false;
  classifyCalled: false;
  mapperCalled: false;
  researchExecuted: false;
  lines: IkKnrExpertLineResult[];
  examplesHold: IkKnrExpertLineResult[];
  reasons: string[];
};

const RECOGNIZED_FAMILIES = new Set<CatalogBasisFamily>([
  "KNR",
  "KNR-W",
  "KNNR",
  "NNRNKB",
]);

const EMPTY_COUNTS: IkKnrExpertCounts = {
  withBasis: 0,
  withoutBasis: 0,
  recognized: 0,
  candidate: 0,
  hold: 0,
  conflict: 0,
  none: 0,
  resolved: 0,
};

function copyCatalogBasis(basis: CatalogBasis | null | undefined): CatalogBasis | null {
  if (!basis) return null;
  return {
    family: basis.family,
    catalogId: basis.catalogId,
    tableCode: basis.tableCode,
    rawCode: basis.rawCode,
    display: basis.display,
    normalizedKey: basis.normalizedKey,
  };
}

/** Slice A evidence only — never description / knrHint. */
function readCatalogBasis(ref: IkMasterBoqLineRef): CatalogBasis | null {
  return copyCatalogBasis(ref.line.catalogBasis ?? ref.provenance?.catalogBasis ?? null);
}

function isCompleteEvidence(basis: CatalogBasis): boolean {
  const family = basis.family;
  const tableCode = String(basis.tableCode ?? "").trim();
  return Boolean(family && RECOGNIZED_FAMILIES.has(family) && tableCode);
}

function classifyEvidence(basis: CatalogBasis | null): {
  lineStatus: Exclude<IkKnrLineStatus, "RECOGNIZED" | "CONFLICT">;
  holdReason?: string;
} {
  if (!basis) return { lineStatus: "NONE" };
  if (isCompleteEvidence(basis)) return { lineStatus: "CANDIDATE" };
  const tableCode = String(basis.tableCode ?? "").trim();
  return {
    lineStatus: "HOLD",
    holdReason: tableCode ? "INCOMPLETE_FAMILY" : "INCOMPLETE_TABLE_CODE",
  };
}

function blockedReport(tenderId: string, reason: string): IkKnrExpertReport {
  return {
    tenderId,
    status: "BLOCKED",
    inputLineCount: 0,
    outputLineCount: 0,
    counts: { ...EMPTY_COUNTS },
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    lines: [],
    examplesHold: [],
    reasons: [reason],
  };
}

/**
 * Pure sync adapter. Does not mutate documentExpert / Master BOQ lines.
 * ANALYZING is never returned in Slice B v1 (no real async).
 */
export function runIkKnrExpert(input: {
  tenderId: string;
  documentExpert: IkDocumentExpertReport | null;
}): IkKnrExpertReport {
  const tenderId = String(input.tenderId ?? "").trim();
  const expert = input.documentExpert;

  if (!expert) {
    return blockedReport(tenderId, "DOCUMENT_EXPERT_MISSING");
  }
  if (expert.masterBoq.readyForExperts !== true) {
    return blockedReport(tenderId || expert.tenderId || "", "MASTER_BOQ_NOT_READY");
  }

  const refs = expert.masterBoqLines ?? [];
  const reasons: string[] = [];
  if (expert.masterBoq.lineCount !== refs.length) {
    reasons.push(
      `MASTER_LINES_COUNT_MISMATCH lineCount=${expert.masterBoq.lineCount} refs=${refs.length}`,
    );
  }

  const lines: IkKnrExpertLineResult[] = [];
  const counts: IkKnrExpertCounts = { ...EMPTY_COUNTS };

  for (const ref of refs) {
    const basis = readCatalogBasis(ref);
    const classified = classifyEvidence(basis);
    const row: IkKnrExpertLineResult = {
      lineId: ref.line.lineId,
      dwellingId: ref.dwellingId,
      lp: ref.line.lp ?? null,
      catalogBasis: basis,
      lineStatus: classified.lineStatus,
      proposedWorkId: null,
      ...(classified.holdReason ? { holdReason: classified.holdReason } : {}),
    };
    lines.push(row);

    if (basis) {
      counts.withBasis += 1;
      counts.recognized += 1;
    } else {
      counts.withoutBasis += 1;
      counts.none += 1;
    }
    if (row.lineStatus === "CANDIDATE") counts.candidate += 1;
    if (row.lineStatus === "HOLD") counts.hold += 1;
  }

  // B v1: no Owner table → conflict never detected; resolved never written.
  counts.conflict = 0;
  counts.resolved = 0;

  return {
    tenderId: tenderId || expert.tenderId || "",
    status: "COMPLETED",
    inputLineCount: refs.length,
    outputLineCount: lines.length,
    counts,
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    lines,
    examplesHold: lines.filter((l) => l.lineStatus === "HOLD").slice(0, 3),
    reasons,
  };
}
