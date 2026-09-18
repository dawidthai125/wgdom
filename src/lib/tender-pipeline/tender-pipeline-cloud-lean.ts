/**
 * OD-OCR-25 — lean cloud pipeline body + `_cloudLean` additive marker.
 * Local/cold stays FULL; cloud strip only on push when flag enabled.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import type { TenderDossierScanSummary } from "@/lib/tender-dossier-pipeline";
import {
  hasLsIndexMarker,
  PipelineIndexNotFullError,
} from "@/lib/tender-pipeline/tender-pipeline-representation";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

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

/**
 * Strip heavy fields for cloud KV only — returns new array, does not mutate input.
 *
 * Phase 11 (Owner Decision #2) — precondition: serializer Cloud NIGDY nie dostaje INDEX.
 * Zdjęcie `_lsIndex` byłoby ukrytą konwersją INDEX → LEAN (PIPELINE-NO-CONVERSION-01, DF §A.10),
 * a publikacja z markerem złamałaby CLOUD = LEAN — dlatego jedyną bezpieczną reakcją jest odmowa.
 */
export function stripTenderPipelineForCloud(items: TenderPipelineItem[]): TenderPipelineItem[] {
  if (hasLsIndexMarker(items)) {
    try {
      recordStorageWrite({
        key: "kw-tenders-pipeline",
        bytes: 0,
        writer: "tender-pipeline.cloud-lean",
        ok: false,
        tier: 3,
        note: "cloud_lean_rejected:index_not_full",
      });
    } catch {
      /* telemetry best-effort */
    }
    throw new PipelineIndexNotFullError("stripTenderPipelineForCloud");
  }
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
        // Marker LS-lean (`stripTenderPipelineForLocalStorage`) nie należy do cloud body — Phase 5 / test M.
        // NIE usuwamy `_lsIndex` (seam nigdy nie dostaje INDEX — DF §A.10 / §A.6.5).
        delete (k as { _coldRowsCount?: number })._coldRowsCount;
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
