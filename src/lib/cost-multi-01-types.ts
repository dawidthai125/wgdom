/**
 * COST-MULTI-01 — typy Cost Package / Branch Package (Design Freeze §4–§8).
 * Bid / Discovery / parsers — OOS.
 */

import type { TenderCostDocumentType } from "@/lib/tender-cost-discovery";

export const COST_MULTI_01_POLICY_VERSION = "cost-multi-01-v1" as const;

export type BranchCode =
  | "construction"
  | "electrical"
  | "sanitary"
  | "fire"
  | "hvac"
  | "finishes"
  | "other"
  | "unknown";

export type RelationType =
  | "same_branch"
  | "other_branch"
  | "variant"
  | "duplicate"
  | "revision"
  | "stage"
  | "option"
  | "unrelated_lot"
  | "unknown";

export type RelationHint =
  | "option"
  | "variant"
  | "stage"
  | "revision"
  | `branch:${BranchCode}`;

export type ClassificationConfidence = "high" | "medium" | "low";

export type MemberRole =
  | "included_base"
  | "excluded"
  | "held"
  | "legacy_winner"
  | "alternate";

export type ExclusionReasonCode =
  | "formal_offer"
  | "option_scope"
  | "variant_scope"
  | "stage_out_of_base"
  | "duplicate_of_winner"
  | "superseded_revision"
  | "unsupported_type"
  | "parse_failed"
  | "manual_exclude"
  | "lot_mismatch";

export type AggregatePolicy = "BEST_SINGLE" | "SUM_BRANCH_WINNERS" | "HOLD_MANUAL";

export type CostPackageStatus =
  | "empty"
  | "single"
  | "multi_ready"
  | "multi_hold"
  | "conflict";

export type BranchWinnerRule = "sole" | "tier_rows" | "revision_latest" | "manual" | "none";

export interface CostDocumentRef {
  id: string;
  filename: string;
  zipInnerPath?: string;
  costType: TenderCostDocumentType | "unknown";
  parseOk: boolean | null;
  rowCount: number | null;
  totalValuePln: number | null;
  branchHint: BranchCode;
  relationHints: RelationHint[];
  roleInPackage: MemberRole;
  lotKey?: string | null;
}

export interface CostExclusion {
  documentId: string;
  filename: string;
  reason: ExclusionReasonCode;
}

export interface BranchPackage {
  branch: BranchCode;
  members: CostDocumentRef[];
  winner: CostDocumentRef | null;
  winnerRule: BranchWinnerRule;
  status: "ok" | "ambiguous" | "empty";
}

export interface CostAggregate {
  policy: AggregatePolicy;
  included: CostDocumentRef[];
  excluded: CostExclusion[];
  metrics: {
    branchCount: number;
    totalRowCount: number | null;
    totalValuePln: number | null;
  };
  warnings: string[];
}

export interface IncompletenessSignal {
  legacyOneCoversAllBranches: boolean;
  selectedCount: number;
  detectedCostCount: number;
  missingBranchHints: string[];
  messageKey: string;
}

export interface CostPackage {
  tenderItemId: string;
  lotKey: string | null;
  status: CostPackageStatus;
  members: CostDocumentRef[];
  branches: BranchPackage[];
  exclusions: CostExclusion[];
  aggregate: CostAggregate | null;
  legacyOneWinner: CostDocumentRef | null;
  incompleteness: IncompletenessSignal;
  policyVersion: typeof COST_MULTI_01_POLICY_VERSION;
  builtAt: string;
}

export interface CostDocumentInput {
  filename: string;
  zipInnerPath?: string;
  documentIndex?: number;
  parseOk?: boolean | null;
  rowCount?: number | null;
  totalValuePln?: number | null;
  lotKey?: string | null;
}

export interface BuildCostPackageInput {
  tenderItemId: string;
  lotKey?: string | null;
  documents: CostDocumentInput[];
  legacyWinnerFilename?: string | null;
  builtAt?: string;
}
