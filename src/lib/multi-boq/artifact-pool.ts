/**
 * MULTI-BOQ-01 — match Owner documentId → artifact (filename ≠ dwelling identity).
 */

import { readCostBranchArtifacts } from "@/lib/cost-multi-02";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { DwellingCostArtifactRef } from "@/lib/multi-boq/types";

function baseName(filename: string): string {
  return (filename.split(" → ").pop() ?? filename).trim();
}

/** Build artifact pool from existing heavy-parse side-channel (no new parser). */
export function buildArtifactPoolFromItem(
  item: TenderPipelineItem | null | undefined,
): DwellingCostArtifactRef[] {
  if (!item) return [];
  const arts = readCostBranchArtifacts(item);
  return arts.map((a, i) => {
    const filename = String(a.filename ?? "").trim();
    // INGEST-01 — prefer explicit documentId; filename fallback for legacy artifacts.
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

/**
 * Resolve artifact for Owner-mapped documentId.
 * Supports: exact documentId, filename, stableCostDocumentId "idx::path".
 */
export function findArtifactForDocumentId(
  documentId: string,
  pool: DwellingCostArtifactRef[],
): DwellingCostArtifactRef | null {
  const id = String(documentId ?? "").trim();
  if (!id || pool.length === 0) return null;

  const exact = pool.find((a) => a.documentId === id);
  if (exact) return exact;

  const byFn = pool.find((a) => {
    const fn = a.filename;
    const base = baseName(fn);
    return fn === id || base === id || fn.endsWith(id) || id.endsWith(fn) || id.endsWith(base);
  });
  if (byFn) return byFn;

  if (id.includes("::")) {
    const path = id.split("::").slice(1).join("::").trim();
    if (path) {
      const byPath = pool.find((a) => {
        const base = baseName(a.filename);
        return a.filename === path || base === path || a.filename.endsWith(path) || path.endsWith(base);
      });
      if (byPath) return byPath;
    }
  }

  return null;
}
