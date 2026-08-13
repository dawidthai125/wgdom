/**
 * MULTI-BOQ-01 — dwelling-scoped cost compose (OfferBoq schema v5 UNCHANGED).
 * Provenance lives here / side-map — not on OfferBoqLine required fields.
 */

import type { BranchCode } from "@/lib/cost-multi-01-types";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";

export type DwellingCostCompleteness = "ready" | "hold" | "empty" | "conflict";

export type DwellingCostBranchHint = BranchCode | "unknown";

/** Owner-mapped document set for one dwelling (filename ≠ dwelling identity). */
export type DwellingDocumentSet = {
  tenderId: string;
  dwellingId: string;
  documentIds: string[];
  costArtifactIds: string[];
  branchHints: DwellingCostBranchHint[];
  provenance: {
    mappedAt?: string;
    documentToArtifact: Record<string, string>;
  };
};

/** Pool entry: stable documentId (Owner maps this) → parsed kosztorys artifact. */
export type DwellingCostArtifactRef = {
  documentId: string;
  artifactId: string;
  filename: string;
  branchHint: DwellingCostBranchHint;
  snapshot: TenderKosztorysSnapshot;
};

export type DwellingCostSnapshotLine = {
  sourceDocumentId: string;
  sourceArtifactId: string;
  /** Extra sources when KEEP ONE (identical content). */
  sourceDocumentIds: string[];
  sourceArtifactIds: string[];
  sourceLineKey: string;
  indexInSourceDoc: number;
  lp: string;
  description: string;
  unit: string;
  quantityRaw: string;
  quantity: number;
  branchHint: DwellingCostBranchHint;
  contentHash: string;
  athUnitPricePln: number | null;
  athTotalPln: number | null;
};

export type DwellingCostSnapshot = {
  tenderId: string;
  dwellingId: string;
  sourceDocumentIds: string[];
  sourceArtifactIds: string[];
  lines: DwellingCostSnapshotLine[];
  completeness: DwellingCostCompleteness;
  warnings: string[];
};

/** Side-map keyed by OfferBoq lineId — DF-MB-11 (no OfferBoq schema bump). */
export type DwellingLineProvenance = {
  lineId: string;
  sourceDocumentId: string;
  sourceDocumentIds: string[];
  sourceArtifactId: string;
  sourceArtifactIds: string[];
  branchHint: DwellingCostBranchHint;
  sourceLineKey: string;
  contentHash: string;
};

export type ComposeDwellingOfferBoqResult = {
  ok: true;
  document: import("@/lib/tender-offer-boq").OfferBoqDocument;
  lineProvenance: Record<string, DwellingLineProvenance>;
  snapshot: DwellingCostSnapshot;
} | {
  ok: false;
  reason: string;
  snapshot: DwellingCostSnapshot;
};
