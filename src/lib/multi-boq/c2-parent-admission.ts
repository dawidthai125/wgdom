/**
 * C2 parent admission — physical parent is lineage/registry-only for cost compose
 * when a complete derived C2 set for that parent is present in the dwelling map.
 *
 * Completeness mirrors IntraPdfSegmentationResult accept
 * (`derived-cost-segment.ts`): ≥2 segments, each explicit branch ≠ unknown,
 * distinct branches. No fabricated branch for P. Merge identity unchanged.
 */

import type { BranchCode } from "@/lib/cost-multi-01-types";
import { getIngestState } from "@/lib/tender-ingest/registry";
import type { DwellingCostArtifactRef } from "@/lib/multi-boq/types";

export type C2LineageDocument = {
  documentId: string;
  source: string;
  parentDocumentId?: string;
};

export type C2LineageArtifact = {
  documentId: string;
  branch?: BranchCode | "unknown" | null;
  filename?: string;
};

export type C2LineageSnapshot = {
  documents: C2LineageDocument[];
  artifacts: C2LineageArtifact[];
};

/** Same accept thresholds as C2 connect (`HOLD_NEED_AT_LEAST_TWO_SEGMENTS` + branch rules). */
export function isCompleteC2DerivedSet(
  derived: ReadonlyArray<{ documentId: string; branch: BranchCode }>,
): boolean {
  if (derived.length < 2) return false;
  const branches: BranchCode[] = [];
  for (const d of derived) {
    const b = d.branch;
    if (!b || b === ("unknown" as BranchCode)) return false;
    branches.push(b);
  }
  if (new Set(branches).size < branches.length) return false;
  return true;
}

export function loadC2LineageFromIngest(tenderId: string): C2LineageSnapshot {
  const tid = String(tenderId ?? "").trim();
  if (!tid) return { documents: [], artifacts: [] };
  const state = getIngestState(tid);
  if (!state) return { documents: [], artifacts: [] };
  return {
    documents: (state.documents ?? []).map((d) => ({
      documentId: String(d.documentId ?? "").trim(),
      source: String(d.source ?? ""),
      parentDocumentId: d.parentDocumentId
        ? String(d.parentDocumentId).trim()
        : undefined,
    })),
    artifacts: (state.artifacts ?? []).map((a) => ({
      documentId: String(a.documentId ?? "").trim(),
      branch: a.branch,
      filename: a.filename,
    })),
  };
}

function resolveBranchForDerived(
  documentId: string,
  artMap: Map<string, C2LineageArtifact>,
): BranchCode | null {
  const art = artMap.get(documentId);
  const b = art?.branch;
  if (!b || b === "unknown") return null;
  return b;
}

/**
 * Derived children of physical parent P (source=derived_cost_segment).
 * Returns null when any child lacks explicit branch metadata (incomplete for admission).
 */
export function listC2DerivedChildrenForParent(
  lineage: C2LineageSnapshot,
  parentDocumentId: string,
): Array<{ documentId: string; branch: BranchCode }> | null {
  const parentId = String(parentDocumentId ?? "").trim();
  if (!parentId) return null;
  const artMap = new Map(
    lineage.artifacts
      .filter((a) => a.documentId)
      .map((a) => [a.documentId, a] as const),
  );
  const kids = lineage.documents.filter(
    (d) =>
      d.documentId
      && d.source === "derived_cost_segment"
      && String(d.parentDocumentId ?? "").trim() === parentId,
  );
  const out: Array<{ documentId: string; branch: BranchCode }> = [];
  for (const d of kids) {
    const branch = resolveBranchForDerived(d.documentId, artMap);
    if (!branch) return null;
    out.push({ documentId: d.documentId, branch });
  }
  return out;
}

function isPhysicalParentDoc(
  lineage: C2LineageSnapshot,
  documentId: string,
): boolean {
  const doc = lineage.documents.find((d) => d.documentId === documentId);
  if (!doc) return false;
  if (doc.source === "derived_cost_segment") return false;
  return true;
}

/**
 * Exclude physical parent P from compose documentIds when a complete C2 derived
 * set for P is fully present in the same mapped set.
 */
export function excludeC2ParentsFromComposeDocumentIds(opts: {
  documentIds: readonly string[];
  lineage: C2LineageSnapshot;
}): {
  admittedIds: string[];
  excludedParentIds: string[];
  warnings: string[];
} {
  const documentIds = opts.documentIds
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);
  const idSet = new Set(documentIds);
  const excludedParentIds: string[] = [];
  const warnings: string[] = [];

  for (const docId of documentIds) {
    if (!isPhysicalParentDoc(opts.lineage, docId)) continue;
    const derived = listC2DerivedChildrenForParent(opts.lineage, docId);
    if (!derived || !isCompleteC2DerivedSet(derived)) continue;
    if (!derived.every((d) => idSet.has(d.documentId))) continue;
    excludedParentIds.push(docId);
    warnings.push(`EXCLUDE_C2_PARENT_LINEAGE_ONLY:${docId}`);
  }

  const excluded = new Set(excludedParentIds);
  const admittedIds = documentIds.filter((id) => !excluded.has(id));
  return { admittedIds, excludedParentIds, warnings };
}

/** Filter artifact pool to the same admitted universe as compose documentIds. */
export function admitC2ComposeArtifacts(opts: {
  artifacts: readonly DwellingCostArtifactRef[];
  mappedDocumentIds: readonly string[];
  lineage: C2LineageSnapshot;
}): {
  admitted: DwellingCostArtifactRef[];
  excludedParentIds: string[];
  warnings: string[];
} {
  const { admittedIds, excludedParentIds, warnings } =
    excludeC2ParentsFromComposeDocumentIds({
      documentIds: opts.mappedDocumentIds,
      lineage: opts.lineage,
    });
  const admitSet = new Set(admittedIds);
  const mappedSet = new Set(
    opts.mappedDocumentIds.map((id) => String(id ?? "").trim()).filter(Boolean),
  );
  const admitted = opts.artifacts.filter((a) => {
    const id = String(a.documentId ?? "").trim();
    if (!id || !mappedSet.has(id)) return false;
    return admitSet.has(id);
  });
  return { admitted, excludedParentIds, warnings };
}
