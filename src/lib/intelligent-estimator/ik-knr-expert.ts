/**
 * IK-KNR-EXPERT Slice B — catalog evidence adapter + report.
 *
 * Path (READ ONLY):
 *   IkDocumentExpert.masterBoq.readyForExperts === true
 *   → masterBoqLines
 *   → line.catalogBasis ?? provenance.catalogBasis
 *   → completeness (family + tableCode)
 *   → optional Historical Executed lookup (READ-ONLY evidence)
 *   → IkKnrExpertReport
 *
 * ZERO Product Mapper · ZERO A1 classification gate · ZERO Research.
 * ZERO write catalogWorkId / knrHint / Master BOQ.
 * ZERO Owner mapping (Slice D) · ZERO Sala (Slice C).
 * ZERO KL-6 / Catalog mutation from Historical.
 *
 * CANDIDATE = complete catalog evidence, not a CatalogWork identity.
 */

import type { CatalogBasis, CatalogBasisFamily } from "@/lib/tenders-bzp-swz";
import type { IkDocumentExpertReport, IkMasterBoqLineRef } from "./ik-document-expert";
import {
  filterAdmittedMasterBoqLines,
  resolveIkExpertAdmission,
} from "./ik-expert-admission";
import type { HistoricalExecutedIndex, HistoricalLookupResult } from "./historical-executed";
import {
  lookupHistoricalExecuted,
  summarizeHistoricalKinds,
} from "./historical-executed";

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
  /** Historical Executed WGDOM evidence — authority always false when present. */
  historical?: HistoricalLookupResult | null;
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
  historicalExactRms: number;
  historicalExact: number;
  historicalFamily: number;
  historicalConflict: number;
  historicalMiss: number;
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
  /** Historical layer never grants authority. */
  historicalAuthority: false;
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
  historicalExactRms: 0,
  historicalExact: 0,
  historicalFamily: 0,
  historicalConflict: 0,
  historicalMiss: 0,
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
    ...(basis.tableCodeSource != null
      ? { tableCodeSource: basis.tableCodeSource }
      : {}),
    ...(basis.tableCodeConfidence != null
      ? { tableCodeConfidence: basis.tableCodeConfidence }
      : {}),
    ...(basis.tableCodeResolutionHold != null
      ? { tableCodeResolutionHold: basis.tableCodeResolutionHold }
      : {}),
  };
}

/** Slice A/B evidence only — never description / knrHint. FT-10 secondary already on basis. */
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
  // FT-10 resolution holds stamped at ingest — Expert still description-blind.
  if (basis.tableCodeResolutionHold) {
    return { lineStatus: "HOLD", holdReason: basis.tableCodeResolutionHold };
  }
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
    historicalAuthority: false,
    lines: [],
    examplesHold: [],
    reasons: [reason],
  };
}

function applyHistoricalCounts(
  counts: IkKnrExpertCounts,
  hist: HistoricalLookupResult | null | undefined,
): void {
  if (!hist) {
    counts.historicalMiss += 1;
    return;
  }
  switch (hist.kind) {
    case "HISTORICAL_EXACT_RMS":
      counts.historicalExactRms += 1;
      break;
    case "HISTORICAL_EXACT":
      counts.historicalExact += 1;
      break;
    case "HISTORICAL_FAMILY":
      counts.historicalFamily += 1;
      break;
    case "HISTORICAL_CONFLICT":
      counts.historicalConflict += 1;
      break;
    default:
      counts.historicalMiss += 1;
  }
}

/**
 * Pure sync adapter. Does not mutate documentExpert / Master BOQ lines.
 * Historical lookup is optional — empty index ⇒ MISS (not an error).
 */
export function runIkKnrExpert(input: {
  tenderId: string;
  documentExpert: IkDocumentExpertReport | null;
  /** In-memory Historical Executed index — READ-ONLY. */
  historicalIndex?: HistoricalExecutedIndex | null;
}): IkKnrExpertReport {
  const tenderId = String(input.tenderId ?? "").trim();
  const expert = input.documentExpert;
  const historicalIndex = input.historicalIndex ?? null;

  if (!expert) {
    return blockedReport(tenderId, "DOCUMENT_EXPERT_MISSING");
  }
  if (!resolveIkExpertAdmission(expert).expertChainMayProceed) {
    return blockedReport(tenderId || expert.tenderId || "", "MASTER_BOQ_NOT_READY");
  }

  const admission = resolveIkExpertAdmission(expert);
  const refs = filterAdmittedMasterBoqLines(expert.masterBoqLines ?? [], admission);
  const reasons: string[] = [];
  if (expert.masterBoq.lineCount !== (expert.masterBoqLines ?? []).length) {
    reasons.push(
      `MASTER_LINES_COUNT_MISMATCH lineCount=${expert.masterBoq.lineCount} refs=${(expert.masterBoqLines ?? []).length}`,
    );
  }
  if (!historicalIndex || historicalIndex.occurrences.length === 0) {
    reasons.push("HISTORICAL_INDEX_EMPTY_OR_ABSENT");
  }

  const lines: IkKnrExpertLineResult[] = [];
  const counts: IkKnrExpertCounts = { ...EMPTY_COUNTS };
  const histResults: HistoricalLookupResult[] = [];

  for (const ref of refs) {
    const basis = readCatalogBasis(ref);
    const classified = classifyEvidence(basis);
    const description =
      typeof ref.line.description === "string" ? ref.line.description : null;

    const historical = lookupHistoricalExecuted(
      {
        lineId: ref.line.lineId,
        catalogBasis: basis,
        description,
        identityKeyV2: null,
      },
      historicalIndex,
    );
    histResults.push(historical);
    applyHistoricalCounts(counts, historical);

    const row: IkKnrExpertLineResult = {
      lineId: ref.line.lineId,
      dwellingId: ref.dwellingId,
      lp: ref.line.lp ?? null,
      catalogBasis: basis,
      lineStatus: classified.lineStatus,
      proposedWorkId: null,
      historical,
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

  // Basis conflict (Owner map) stays 0 in B v1; historical conflicts are separate counts.
  counts.conflict = 0;
  counts.resolved = 0;

  const kindSum = summarizeHistoricalKinds(histResults);
  if (kindSum.HISTORICAL_CONFLICT > 0) {
    reasons.push(`HISTORICAL_CONFLICT_LINES=${kindSum.HISTORICAL_CONFLICT}`);
  }

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
    historicalAuthority: false,
    lines,
    examplesHold: lines.filter((l) => l.lineStatus === "HOLD").slice(0, 3),
    reasons,
  };
}
