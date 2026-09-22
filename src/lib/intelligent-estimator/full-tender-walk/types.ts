/**
 * IK Full-Tender Orchestrator — audit / coordination types.
 * NOT a business SSOT (rates · BOM · finance). Execution ledger only.
 */

export const IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION = 1 as const;
export const IK_FULL_TENDER_WALK_LEDGER_KEY = "kw-ik-full-tender-walk-ledger" as const;
export const IK_FULL_TENDER_WALK_KIND = "ik_full_tender_walk_ledger" as const;

/** Line walk projection — maps onto existing expert signals. */
export type IkFullWalkLineStatus =
  | "NOT_STARTED"
  | "IDENTITY_PENDING"
  | "IDENTITY_HOLD"
  | "CLASSIFICATION_PENDING"
  | "CATALOG_PENDING"
  | "KNOWLEDGE_PENDING"
  | "RESEARCH_PENDING"
  | "RESEARCH_COMPLETE"
  | "EVIDENCE_PENDING"
  | "PRICING_PENDING"
  | "TECHNOLOGY_PENDING"
  | "MATERIAL_PENDING"
  | "EQUIPMENT_PENDING"
  | "TRANSPORT_PENDING"
  | "POSITION_COST_PENDING"
  | "POSITION_COMPLETE"
  | "OWNER_EXCEPTION"
  | "DATA_BLOCK"
  | "CONFLICT";

export type IkFullWalkStage =
  | "document"
  | "identity"
  | "classification"
  | "catalog"
  | "knowledge"
  | "research"
  | "evidence"
  | "our_rate"
  | "technology"
  | "bom"
  | "material"
  | "equipment"
  | "transport"
  | "position_cost"
  | "risk"
  | "finance"
  | "ready";

export type IkResearchWalkOutcome =
  | "RESEARCH_NOT_REQUIRED"
  | "RESEARCH_REQUIRED"
  | "RESEARCH_EXECUTED"
  | "RESEARCH_FAILED"
  | "RESEARCH_BLOCKED_BY_IDENTITY";

export type IkTenderWalkStatus =
  | "TENDER_ANALYSIS_PENDING"
  | "TENDER_ANALYSIS_RUNNING"
  | "TENDER_PARTIAL"
  | "TENDER_BLOCKED"
  | "TENDER_FINANCE_PENDING"
  | "TENDER_FINANCE_FAILED"
  | "READY_TO_BID";

export type IkFullWalkLineLedgerEntry = {
  tenderId: string;
  lineId: string;
  lp?: string | null;
  stage: IkFullWalkStage;
  status: IkFullWalkLineStatus;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  inputFingerprint: string | null;
  outputFingerprint: string | null;
  evidenceRefs: string[];
  blocker: string | null;
  nextAction: string | null;
  researchOutcome: IkResearchWalkOutcome | null;
  descriptionSnippet?: string | null;
};

export type IkFullWalkTenderLedger = {
  tenderId: string;
  walkId: string;
  startedAt: string;
  updatedAt: string;
  tenderStatus: IkTenderWalkStatus;
  lines: IkFullWalkLineLedgerEntry[];
  /** Counts for UI / KPI */
  counts: {
    total: number;
    visited: number;
    complete: number;
    hold: number;
    researchBlocked: number;
    dataBlock: number;
    ownerException: number;
    conflict: number;
  };
};

export type IkFullWalkLedgerStore = {
  schemaVersion: typeof IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION;
  kind: typeof IK_FULL_TENDER_WALK_KIND;
  updatedAt: string;
  byTenderId: Record<string, IkFullWalkTenderLedger>;
};

export type IkG3UiSourceLabel =
  | "OWNER_OVERRIDE"
  | "HISTORICAL_OWNER_DECISION"
  | "IK_CALCULATED"
  | "ABSENT";

export type IkReadinessProjection = {
  readyToBid: boolean;
  tenderStatus: IkTenderWalkStatus;
  summaryPl: string;
  g3SourceLabel: IkG3UiSourceLabel;
  g3NotePl: string | null;
  partial: boolean;
  financeFailed: boolean;
  linesVisited: number;
  linesTotal: number;
};
