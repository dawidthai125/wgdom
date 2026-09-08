/**
 * C2 ingest → canonical kosztorysForBid handoff.
 *
 * Loss repaired: applyIngestArtifactsToPipelineItem writes FULL artifacts into
 * costBranchArtifacts, but resolveCostCandidateSources / MULTI-01 cannot classify
 * Intra-PDF derived names (`Przedmiar.pdf#p…:branch` → type none). Legacy ONE is
 * often ok+0 rows → OfferBoq null.
 *
 * REUSE: admitC2ComposeArtifacts + mergeDwellingArtifactLines (no second resolver).
 * P stays lineage-only when complete derived set is present.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type {
  TenderCatalogQuantityLine,
  TenderCostLine,
  TenderKosztorysSnapshot,
} from "@/lib/tenders-bzp-brief";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";
import type { CostBranchArtifact } from "@/lib/cost-multi-02-types";
import {
  admitC2ComposeArtifacts,
  loadC2LineageFromIngest,
} from "@/lib/multi-boq/c2-parent-admission";
import {
  mergeDwellingArtifactLines,
  snapshotHasUsableLines,
} from "@/lib/multi-boq/merge";
import type {
  DwellingCostArtifactRef,
  DwellingCostSnapshotLine,
} from "@/lib/multi-boq/types";

export function hasUsableKosztorysBidLines(
  snapshot: TenderKosztorysSnapshot | null | undefined,
): boolean {
  if (!snapshot?.ok) return false;
  if ((snapshot.catalogQuantities?.length ?? 0) > 0) return true;
  if ((snapshot.rows?.length ?? 0) > 0) return true;
  return false;
}

function poolFromCostBranchArtifacts(
  arts: CostBranchArtifact[],
): DwellingCostArtifactRef[] {
  return arts.map((a, i) => {
    const filename = String(a.filename ?? "").trim();
    const documentId = String(a.documentId ?? "").trim() || filename;
    return {
      documentId,
      artifactId: `art:${i}:${documentId || filename}`,
      filename,
      branchHint: a.branch ?? inferBranchHint(filename),
      snapshot: a.snapshot,
    };
  });
}

function admittedLinesToKosztorysSnapshot(
  lines: DwellingCostSnapshotLine[],
  warnings: string[],
): TenderKosztorysSnapshot {
  const rows: TenderCostLine[] = lines.map((l) => ({
    lp: l.lp,
    description: l.description,
    unit: l.unit,
    quantity: l.quantityRaw || (Number.isFinite(l.quantity) ? String(l.quantity) : ""),
    total: l.athTotalPln != null ? String(l.athTotalPln) : "",
  }));
  const catalogQuantities: TenderCatalogQuantityLine[] = lines.map((l) => ({
    lp: l.lp,
    description: l.description,
    unit: l.unit,
    quantity: l.quantityRaw || (Number.isFinite(l.quantity) ? String(l.quantity) : ""),
  }));
  return {
    ok: true,
    sourceFilename: "C2_ADMITTED:compose",
    rowCount: rows.length,
    rows,
    catalogQuantities,
    przedmiar: [],
    categories: [],
    warnings: ["C2_ADMITTED_COMPOSE", ...warnings].slice(0, 40),
    parsedAt: new Date().toISOString(),
  };
}

export type C2AdmittedBidHandoff = {
  snapshot: TenderKosztorysSnapshot;
  excludedParentIds: string[];
  admittedDocumentIds: string[];
  warnings: string[];
  admittedLineCount: number;
};

/**
 * When MULTI-02 leaves empty/unusable bid input, try C2-admitted compose from
 * bridged FULL artifacts + ingest lineage. Returns null when C2 gate not met.
 */
export function tryResolveC2AdmittedKosztorysForBid(
  item: TenderPipelineItem,
  arts: CostBranchArtifact[],
): C2AdmittedBidHandoff | null {
  const tid = String(item.id ?? "").trim();
  if (!tid || arts.length < 2) return null;

  let lineage = loadC2LineageFromIngest(tid);
  if (lineage.documents.length === 0 && item.tenderId) {
    const alt = String(item.tenderId).trim();
    if (alt && alt !== tid) lineage = loadC2LineageFromIngest(alt);
  }
  if (lineage.documents.length === 0) return null;

  const pool = poolFromCostBranchArtifacts(arts);
  const mappedDocumentIds = pool.map((a) => a.documentId).filter(Boolean);
  if (mappedDocumentIds.length < 2) return null;

  const admission = admitC2ComposeArtifacts({
    artifacts: pool,
    mappedDocumentIds,
    lineage,
  });

  // Gate: complete derived set must have excluded physical parent(s).
  if (admission.excludedParentIds.length === 0) return null;

  const usable = admission.admitted.filter((a) => snapshotHasUsableLines(a.snapshot));
  if (usable.length < 2) return null;

  const merged = mergeDwellingArtifactLines(usable);
  if (merged.completeness !== "ready" || merged.lines.length === 0) return null;

  const warnings = [...admission.warnings, ...merged.warnings];
  const snapshot = admittedLinesToKosztorysSnapshot(merged.lines, warnings);

  return {
    snapshot,
    excludedParentIds: admission.excludedParentIds,
    admittedDocumentIds: [...new Set(usable.map((u) => u.documentId))],
    warnings,
    admittedLineCount: merged.lines.length,
  };
}
