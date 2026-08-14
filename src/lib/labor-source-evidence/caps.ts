/**
 * WR-SOURCE-EVIDENCE-DB-01 — hard caps (explicit report · no silent wipe).
 */

import {
  LABOR_SOURCE_EVIDENCE_CAP_GLOBAL,
  LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH,
  LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE,
  LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  type LaborSourceEvidenceCapReport,
  type LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence/types";

export function buildLaborSourceEvidenceCapReport(input: {
  existing: LaborSourceEvidenceObservation[];
  incomingBatch: LaborSourceEvidenceObservation[];
  /** After union-by-dedupe projected size (optional; if omitted uses existing+incoming naive). */
  projected?: LaborSourceEvidenceObservation[];
}): LaborSourceEvidenceCapReport {
  const projected = input.projected ?? [...input.existing, ...input.incomingBatch];
  const perWork: Record<string, number> = {};
  const perSource: Record<string, number> = {};
  for (const o of projected) {
    const w = o.workId || "__unmatched__";
    perWork[w] = (perWork[w] || 0) + 1;
    perSource[o.sourceId] = (perSource[o.sourceId] || 0) + 1;
  }
  const overPerWork = Object.entries(perWork)
    .filter(([, n]) => n > LABOR_SOURCE_EVIDENCE_CAP_PER_WORK)
    .map(([k]) => k);
  const overPerSource = Object.entries(perSource)
    .filter(([, n]) => n > LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE)
    .map(([k]) => k);
  const overGlobal = projected.length > LABOR_SOURCE_EVIDENCE_CAP_GLOBAL;
  const overBatch = input.incomingBatch.length > LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH;
  const msgs: string[] = [];
  if (overGlobal) msgs.push(`GLOBAL cap ${LABOR_SOURCE_EVIDENCE_CAP_GLOBAL} (now ${projected.length})`);
  if (overBatch) {
    msgs.push(
      `PER_BATCH cap ${LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH} (incoming ${input.incomingBatch.length})`,
    );
  }
  if (overPerWork.length) {
    msgs.push(`PER_WORK cap ${LABOR_SOURCE_EVIDENCE_CAP_PER_WORK}: ${overPerWork.join(",")}`);
  }
  if (overPerSource.length) {
    msgs.push(
      `PER_SOURCE cap ${LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE}: ${overPerSource.join(",")}`,
    );
  }
  return {
    global: projected.length,
    perWork,
    perSource,
    batchIncoming: input.incomingBatch.length,
    overGlobal,
    overPerWork,
    overPerSource,
    overBatch,
    messagePl: msgs.length ? `Evidence cap exceeded: ${msgs.join("; ")}` : null,
  };
}

export function isLaborSourceEvidenceCapExceeded(report: LaborSourceEvidenceCapReport): boolean {
  return (
    report.overGlobal ||
    report.overBatch ||
    report.overPerWork.length > 0 ||
    report.overPerSource.length > 0
  );
}
