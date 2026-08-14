/**
 * MULTI-BOQ-01 — resolveDwellingCostSnapshotForPricing (multi only).
 * legacy resolveKosztorysSnapshotForPricing UNCHANGED.
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildArtifactPoolFromItem,
  findArtifactForDocumentId,
} from "@/lib/multi-boq/artifact-pool";
import { buildDwellingDocumentSet } from "@/lib/multi-boq/document-set";
import {
  isCostEligibleFilename,
  isNonCostHelperFilename,
} from "@/lib/multi-boq/eligibility";
import { mergeDwellingArtifactLines, snapshotHasUsableLines } from "@/lib/multi-boq/merge";
import type {
  DwellingCostArtifactRef,
  DwellingCostSnapshot,
  DwellingDocumentSet,
} from "@/lib/multi-boq/types";

function emptySnap(
  tenderId: string,
  dwellingId: string,
  completeness: DwellingCostSnapshot["completeness"],
  warnings: string[],
): DwellingCostSnapshot {
  return {
    tenderId,
    dwellingId,
    sourceDocumentIds: [],
    sourceArtifactIds: [],
    lines: [],
    completeness,
    warnings,
  };
}

/**
 * Canonical dwelling snapshot from Owner-mapped cost artifacts.
 * Missing artifact → HOLD (never 0 PLN invent).
 */
export function resolveDwellingCostSnapshotForPricing(opts: {
  tenderId: string;
  dwellingId: string;
  item?: TenderPipelineItem | null;
  artifacts?: DwellingCostArtifactRef[];
  package?: TenderPackage | null;
}): DwellingCostSnapshot {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid || !String(opts.dwellingId ?? "").trim()) {
    return emptySnap(tid || "unknown", dwellingId || "unknown", "hold", [
      "MISSING_TENDER_OR_DWELLING",
    ]);
  }

  const pkg = opts.package ?? getTenderPackage(tid);
  const docSet: DwellingDocumentSet | null = buildDwellingDocumentSet({
    tenderId: tid,
    dwellingId,
    package: pkg,
  });

  if (!docSet) {
    return emptySnap(tid, dwellingId, "hold", ["DWELLING_DOCUMENT_SET_UNAVAILABLE"]);
  }

  if (docSet.documentIds.length === 0) {
    return emptySnap(tid, dwellingId, "empty", ["NO_MAPPED_DOCUMENTS"]);
  }

  const pool =
    opts.artifacts && opts.artifacts.length > 0
      ? opts.artifacts
      : buildArtifactPoolFromItem(opts.item);

  const selected: DwellingCostArtifactRef[] = [];
  const warnings: string[] = [];
  const documentToArtifact: Record<string, string> = {};

  for (const documentId of docSet.documentIds) {
    const art = findArtifactForDocumentId(documentId, pool);
    if (!art) {
      warnings.push(`MISSING_ARTIFACT:${documentId}`);
      return emptySnap(tid, dwellingId, "hold", warnings);
    }

    if (isNonCostHelperFilename(art.filename)) {
      warnings.push(`EXCLUDE_NON_COST:${documentId}`);
      continue;
    }

    // Owner-mapped + has usable snapshot → cost eligible even if weak filename class.
    // Empty parse (0 lines) on a mapped cost file: EXCLUDE + continue — do not HOLD
    // the whole dwelling (other branch artifacts may still compose). No invented lines.
    if (!snapshotHasUsableLines(art.snapshot)) {
      if (!isCostEligibleFilename(art.filename)) {
        warnings.push(`EXCLUDE_NO_COST_LINES:${documentId}`);
        continue;
      }
      warnings.push(`EXCLUDE_EMPTY_PARSE:${documentId}`);
      continue;
    }

    selected.push(art);
    documentToArtifact[documentId] = art.artifactId;
  }

  if (selected.length === 0) {
    return {
      tenderId: tid,
      dwellingId,
      sourceDocumentIds: [],
      sourceArtifactIds: [],
      lines: [],
      completeness: "empty",
      warnings: [...warnings, "NO_COST_ARTIFACTS_AFTER_FILTER"],
    };
  }

  const merged = mergeDwellingArtifactLines(selected);
  const allWarnings = [...warnings, ...merged.warnings];

  if (merged.completeness === "conflict") {
    return {
      tenderId: tid,
      dwellingId,
      sourceDocumentIds: selected.map((s) => s.documentId),
      sourceArtifactIds: selected.map((s) => s.artifactId),
      lines: merged.lines,
      completeness: "conflict",
      warnings: allWarnings,
    };
  }

  if (merged.completeness === "empty" || merged.lines.length === 0) {
    return {
      tenderId: tid,
      dwellingId,
      sourceDocumentIds: selected.map((s) => s.documentId),
      sourceArtifactIds: selected.map((s) => s.artifactId),
      lines: [],
      completeness: "empty",
      warnings: allWarnings,
    };
  }

  void documentToArtifact;

  return {
    tenderId: tid,
    dwellingId,
    sourceDocumentIds: [...new Set(selected.map((s) => s.documentId))],
    sourceArtifactIds: [...new Set(selected.map((s) => s.artifactId))],
    lines: merged.lines,
    completeness: "ready",
    warnings: allWarnings,
  };
}
