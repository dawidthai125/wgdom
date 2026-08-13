/**
 * COST-MULTI-02 — typy Aggregate Bid (Design Freeze §4.2).
 */

import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type {
  AggregatePolicy,
  BranchCode,
  CostPackageStatus,
} from "@/lib/cost-multi-01-types";

export type CostBidInputMode = "ONE" | "AGGREGATE" | "MANUAL_HOLD";

export interface CostBidInputDecision {
  mode: CostBidInputMode;
  packageStatus: CostPackageStatus | null;
  aggregatePolicy: AggregatePolicy | null;
  kosztorysForBid: TenderKosztorysSnapshot | null;
  legacyKosztorys: TenderKosztorysSnapshot | null;
  reasonCodes: string[];
  warnings: string[];
  sourceDocumentCount: number;
}

/** Artefakt addycyjny z heavy — pełny snapshot per sparsowany kosztorys. */
export interface CostBranchArtifact {
  filename: string;
  /** INGEST-01 — stable document identity (prefer over filename). */
  documentId?: string;
  branch?: BranchCode;
  snapshot: TenderKosztorysSnapshot;
}

export interface BranchWinnerSnapshot {
  documentId: string;
  filename: string;
  branch: BranchCode;
  snapshot: TenderKosztorysSnapshot;
}
