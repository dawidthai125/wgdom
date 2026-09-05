/**
 * IK-MIGRATION-01 P3 — Classification Gate orchestration over Master BOQ.
 *
 * REUSE: classifyEstimatorPricingPlane (A1 Owner seed / mat.* / UNKNOWN).
 * Input: Master BOQ READY lines (with dwellingId + provenance).
 * ZERO research · ZERO pricing · ZERO Accept · ZERO F5/Bid · ZERO invent from namePl.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { DwellingLineProvenance } from "@/lib/multi-boq/types";
import { classifyEstimatorPricingPlane } from "./classification-gate";
import type {
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import {
  runIkDocumentExpert,
  type IkDocumentExpertReport,
  type IkMasterBoqLineRef,
} from "./ik-document-expert";
import {
  filterAdmittedMasterBoqLines,
  resolveIkExpertAdmission,
} from "./ik-expert-admission";

/** Taxonomy alias: COMPOUND ≡ BOTH (gate HOLD — no research). UNKNOWN ≡ UNRESOLVED. */
export type IkClassificationHandoff =
  | "LABOR_READY_FOR_EXPERT"
  | "MATERIAL_READY_FOR_EXPERT"
  | "BOTH_HOLD"
  | "UNRESOLVED";

export type IkIdentityStatus =
  | "HAS_WORK_ID"
  | "HAS_MATERIAL_KEY"
  | "WORK_ID_NO_OWNER_SEED"
  | "MISSING_IDENTITY";

export type IkClassifiedMasterLine = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  unit: string;
  branch: string | null;
  sourceDocumentId: string | null;
  sourceLineKey: string | null;
  sourcePosition: string;
  lineProvenance: DwellingLineProvenance | null;
  catalogWorkId: string | null;
  materialKey: string | null;
  plane: EstimatorPricingPlane;
  classify: EstimatorClassifyResult;
  handoff: IkClassificationHandoff;
  identityStatus: IkIdentityStatus;
};

export type IkClassificationCounts = {
  LABOR: number;
  MATERIAL: number;
  COMPOUND: number;
  UNKNOWN: number;
};

export type IkClassificationReport = {
  tenderId: string;
  status: "ready" | "blocked" | "partial";
  inputLineCount: number;
  outputLineCount: number;
  counts: IkClassificationCounts;
  reconciliation: {
    ok: boolean;
    unexplainedLoss: number;
    unexplainedDuplication: number;
    reasons: string[];
  };
  dwellingPreservation: boolean;
  branchPreservation: boolean;
  provenancePreservation: boolean;
  quantityUnitPreservation: boolean;
  researchExecuted: false;
  pricingExecuted: false;
  autoAcceptExecuted: false;
  lines: IkClassifiedMasterLine[];
  reasons: string[];
};

function handoffFromPlane(plane: EstimatorPricingPlane): IkClassificationHandoff {
  switch (plane) {
    case "LABOR":
      return "LABOR_READY_FOR_EXPERT";
    case "MATERIAL":
      return "MATERIAL_READY_FOR_EXPERT";
    case "COMPOUND":
      return "BOTH_HOLD";
    case "UNKNOWN":
    default:
      return "UNRESOLVED";
  }
}

function identityStatusOf(
  classify: EstimatorClassifyResult,
  catalogWorkId: string | null,
  materialKey: string | null,
): IkIdentityStatus {
  if (classify.classifiedBy === "material_key" || (materialKey && materialKey.startsWith("mat."))) {
    return "HAS_MATERIAL_KEY";
  }
  if (catalogWorkId || classify.workId) {
    if (classify.reasonCode === "OWNER_SEED") return "HAS_WORK_ID";
    if (classify.reasonCode === "NO_SAFE_CLASS") return "WORK_ID_NO_OWNER_SEED";
    return "HAS_WORK_ID";
  }
  return "MISSING_IDENTITY";
}

function classifyOneLine(opts: {
  tenderId: string;
  ref: IkMasterBoqLineRef;
}): IkClassifiedMasterLine {
  const { tenderId, ref } = opts;
  const line = ref.line;
  const prov = ref.provenance;
  const catalogWorkId = line.catalogWorkId?.trim() || null;
  const materialKey = null; // Master BOQ compose does not carry mat.* — no invent
  const classify = classifyEstimatorPricingPlane({
    workId: catalogWorkId,
    materialKey,
    namePl: line.description,
    unit: line.unit,
    lineKindHint: line.workCategory,
  });
  const branch =
    (prov?.branchHint && prov.branchHint !== "unknown" ? prov.branchHint : null)
    ?? (line.workCategory && String(line.workCategory).trim()
      ? String(line.workCategory).trim()
      : null);

  return {
    tenderId,
    dwellingId: ref.dwellingId,
    lineId: line.lineId,
    lp: line.lp,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    branch,
    sourceDocumentId: prov?.sourceDocumentId ?? null,
    sourceLineKey: prov?.sourceLineKey ?? null,
    sourcePosition: line.lp || prov?.sourceLineKey || line.lineId,
    lineProvenance: prov,
    catalogWorkId,
    materialKey,
    plane: classify.plane,
    classify,
    handoff: handoffFromPlane(classify.plane),
    identityStatus: identityStatusOf(classify, catalogWorkId, materialKey),
  };
}

function emptyCounts(): IkClassificationCounts {
  return { LABOR: 0, MATERIAL: 0, COMPOUND: 0, UNKNOWN: 0 };
}

/**
 * Classify every Master BOQ line via existing Classification Gate (A1).
 * Requires Document Expert Master BOQ READY — otherwise blocked.
 */
export function runIkMasterBoqClassification(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
  expert?: IkDocumentExpertReport | null;
}): IkClassificationReport {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const expert =
    opts.expert
    ?? runIkDocumentExpert({ item, package: opts.package ?? null });

  const reasons: string[] = [];
  const researchExecuted = false as const;
  const pricingExecuted = false as const;
  const autoAcceptExecuted = false as const;

  if (!resolveIkExpertAdmission(expert).expertChainMayProceed) {
    return {
      tenderId,
      status: "blocked",
      inputLineCount: expert.masterBoq.lineCount,
      outputLineCount: 0,
      counts: emptyCounts(),
      reconciliation: {
        ok: false,
        unexplainedLoss: expert.masterBoq.lineCount,
        unexplainedDuplication: 0,
        reasons: ["MASTER_BOQ_NOT_READY — Classification Gate wymaga Expert Admission"],
      },
      dwellingPreservation: false,
      branchPreservation: false,
      provenancePreservation: false,
      quantityUnitPreservation: false,
      researchExecuted,
      pricingExecuted,
      autoAcceptExecuted,
      lines: [],
      reasons: ["MASTER_BOQ_NOT_READY", ...expert.reasons.slice(0, 4)],
    };
  }

  const admission = resolveIkExpertAdmission(expert);
  const inputRefs = filterAdmittedMasterBoqLines(expert.masterBoqLines, admission);
  const inputLineCount = inputRefs.length;
  if (expert.masterBoqLines.length !== expert.masterBoq.lineCount) {
    reasons.push(
      `MASTER_LINES_COUNT_MISMATCH report.lineCount=${expert.masterBoq.lineCount} masterBoqLines=${expert.masterBoqLines.length}`,
    );
  }

  const lines = inputRefs.map((ref) => classifyOneLine({ tenderId, ref }));
  const counts = emptyCounts();
  for (const row of lines) {
    counts[row.plane] += 1;
  }

  const outputLineCount = lines.length;
  const sumPlanes = counts.LABOR + counts.MATERIAL + counts.COMPOUND + counts.UNKNOWN;
  const seenIds = new Set<string>();
  let unexplainedDuplication = 0;
  for (const row of lines) {
    const key = `${row.dwellingId}|${row.lineId}`;
    if (seenIds.has(key)) unexplainedDuplication += 1;
    else seenIds.add(key);
  }

  const unexplainedLoss = Math.max(0, inputLineCount - outputLineCount);
  const excess = Math.max(0, outputLineCount - inputLineCount);
  const reconciliationOk =
    unexplainedLoss === 0
    && unexplainedDuplication === 0
    && excess === 0
    && sumPlanes === outputLineCount
    && outputLineCount === inputLineCount
    && inputRefs.length === inputLineCount;

  if (!reconciliationOk) {
    reasons.push(
      `RECONCILIATION_FAIL input=${inputLineCount} output=${outputLineCount} sumPlanes=${sumPlanes} loss=${unexplainedLoss} dup=${unexplainedDuplication}`,
    );
  }

  let dwellingPreservation = true;
  let branchPreservation = true;
  let provenancePreservation = true;
  let quantityUnitPreservation = true;

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i]!;
    const src = inputRefs[i]!;
    if (!row.dwellingId || row.dwellingId !== src.dwellingId) {
      dwellingPreservation = false;
    }
    const srcBranch =
      (src.provenance?.branchHint && src.provenance.branchHint !== "unknown"
        ? src.provenance.branchHint
        : null)
      ?? (src.line.workCategory ? String(src.line.workCategory) : null);
    if (srcBranch && row.branch !== srcBranch) {
      branchPreservation = false;
    }
    if (src.provenance) {
      if (
        !row.lineProvenance
        || row.sourceDocumentId !== src.provenance.sourceDocumentId
        || row.sourceLineKey !== src.provenance.sourceLineKey
      ) {
        provenancePreservation = false;
      }
    }
    if (
      row.description !== src.line.description
      || row.quantity !== src.line.quantity
      || row.unit !== src.line.unit
      || row.lp !== src.line.lp
    ) {
      quantityUnitPreservation = false;
    }
  }

  if (!dwellingPreservation) reasons.push("DWELLING_PRESERVATION_FAIL");
  if (!branchPreservation) reasons.push("BRANCH_PRESERVATION_FAIL");
  if (!provenancePreservation) reasons.push("PROVENANCE_PRESERVATION_FAIL");
  if (!quantityUnitPreservation) reasons.push("QUANTITY_UNIT_PRESERVATION_FAIL");

  const status: IkClassificationReport["status"] =
    reconciliationOk
    && dwellingPreservation
    && quantityUnitPreservation
      ? "ready"
      : "partial";

  return {
    tenderId,
    status,
    inputLineCount,
    outputLineCount,
    counts,
    reconciliation: {
      ok: reconciliationOk,
      unexplainedLoss,
      unexplainedDuplication: unexplainedDuplication + excess,
      reasons: reconciliationOk ? [] : reasons.filter((r) => r.startsWith("RECONCILIATION") || r.startsWith("MASTER_LINES")),
    },
    dwellingPreservation,
    branchPreservation,
    provenancePreservation,
    quantityUnitPreservation,
    researchExecuted,
    pricingExecuted,
    autoAcceptExecuted,
    lines,
    reasons,
  };
}
