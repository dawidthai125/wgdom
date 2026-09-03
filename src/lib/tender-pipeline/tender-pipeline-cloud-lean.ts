/**
 * OD-OCR-25 — lean cloud pipeline body + `_cloudLean` additive marker.
 * Local/cold stays FULL; cloud strip only on push when flag enabled.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";

/** Frozen OD-OCR-24/25 — additive per-item marker (ignored by legacy clients). */
export type CloudLeanOmittedField =
  | "noticeHtml"
  | "kosztorys.rows"
  | "artifact.snapshot"
  | "changeMonitor.events"
  | "qaMonitor.events";

export interface TenderPipelineCloudLeanMarker {
  v: 1;
  omitted: CloudLeanOmittedField[];
}

export const CLOUD_LEAN_OMITTED_FIELDS: readonly CloudLeanOmittedField[] = [
  "noticeHtml",
  "kosztorys.rows",
  "artifact.snapshot",
  "changeMonitor.events",
  "qaMonitor.events",
] as const;

export function isCloudLeanItem(item: TenderPipelineItem): boolean {
  const m = item._cloudLean;
  return m?.v === 1 && Array.isArray(m.omitted) && m.omitted.length > 0;
}

export function isCloudLeanFieldOmitted(
  item: Pick<TenderPipelineItem, "_cloudLean"> | null | undefined,
  field: CloudLeanOmittedField,
): boolean {
  const omitted = item?._cloudLean?.omitted;
  return item?._cloudLean?.v === 1 && Array.isArray(omitted) && omitted.includes(field);
}

/** Strip heavy fields for cloud KV only — returns new array, does not mutate input. */
export function stripTenderPipelineForCloud(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return items.map((item) => {
    const omitted: CloudLeanOmittedField[] = [...CLOUD_LEAN_OMITTED_FIELDS];
    const next: TenderPipelineItem = { ...item };

    if (next.noticeHtml) {
      delete next.noticeHtml;
    }

    if (next.changeMonitor) {
      next.changeMonitor = {
        ...next.changeMonitor,
        events: [],
      };
    }
    if (next.qaMonitor) {
      next.qaMonitor = {
        ...next.qaMonitor,
        events: [],
      };
    }

    if (next.tenderDossier && typeof next.tenderDossier === "object") {
      const dossier = { ...next.tenderDossier };
      if (dossier.kosztorys && typeof dossier.kosztorys === "object") {
        const k = { ...dossier.kosztorys };
        const rows = Array.isArray(k.rows) ? k.rows : [];
        k.rows = [];
        (k as { _rowsOmitted?: boolean })._rowsOmitted = rows.length > 0;
        dossier.kosztorys = k;
      }
      if (dossier.scanSummary && typeof dossier.scanSummary === "object") {
        dossier.scanSummary = stripScanSummaryArtifacts(dossier.scanSummary);
      }
      next.tenderDossier = dossier;
    }

    next._cloudLean = { v: 1, omitted };
    return next;
  });
}

function stripScanSummaryArtifacts(summary: TenderDossierScanSummary): TenderDossierScanSummary {
  const stripArts = (arts: CostBranchArtifact[] | undefined): CostBranchArtifact[] | undefined => {
    if (!Array.isArray(arts)) return arts;
    return arts.map((a) => {
      const { snapshot: _s, ...meta } = a;
      return meta as CostBranchArtifact;
    });
  };
  return {
    ...summary,
    branchWinnerArtifacts: stripArts(summary.branchWinnerArtifacts),
    costBranchArtifacts: stripArts(summary.costBranchArtifacts),
  };
}

export function estimatePipelineJsonBytes(items: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(items)).length;
  } catch {
    return JSON.stringify(items).length * 2;
  }
}
