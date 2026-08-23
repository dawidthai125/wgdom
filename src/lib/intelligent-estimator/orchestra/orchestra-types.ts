/**
 * W1 Orchestra — types (extraction from IkEntryHost; no semantic change).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { ChiefSessionOutput } from "@/lib/chief-session";
import type { IkNg02IngestBridgeResult } from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import type { IkIdentityCoverageReport } from "@/lib/intelligent-estimator/ik-identity-coverage";
import type { IkP7PositionCostBidReport } from "@/lib/intelligent-estimator/ik-p7-position-cost-bid";
import type { IkP8RiskDecisionReport } from "@/lib/intelligent-estimator/ik-p8-risk-decision";
import type { IkCompositeBothHoldReport } from "@/lib/intelligent-estimator/ik-composite-both-hold";
import type { IkDocumentExpertReport } from "@/lib/intelligent-estimator/ik-document-expert";
import type { IkKnrExpertReport } from "@/lib/intelligent-estimator/ik-knr-expert";
import type { IkClassificationReport } from "@/lib/intelligent-estimator/ik-classification";
import type { IkIdentityContext } from "./ik-identity-phase";
import type { IkIdentityPersistOutcome } from "./ik-identity-persist-glue";
import type {
  KnrKnowledgeEnvelope,
  KnrHostApplicationResult,
} from "@/lib/intelligent-estimator/knr-knowledge";
import type { HistoricalExecutedIndex } from "@/lib/intelligent-estimator/historical-executed";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { IkIdentityCoverageOpsView } from "./ik-identity-coverage-ops";
import type { IkOwnerActionQueueReport } from "./ik-owner-action-queue";
import type { IkPackageBlockerReport } from "./ik-package-blocker-report";

export type IkOrchestraPipelineIngest = {
  dossierBuilding?: boolean;
  dossierEnriching?: boolean;
  heavyDone?: boolean;
} | null;

export type IkOrchestraFlags = {
  p2DocumentsBoqOn: boolean;
  identityCoverageOn: boolean;
  p5LaborOn: boolean;
  p5ResearchOn: boolean;
  p6MaterialOn: boolean;
  p6ResearchOn: boolean;
  p7F5On: boolean;
  p8RiskOn: boolean;
};

export type IkKnrKnowledgeDiag = {
  status: "skipped" | "busy" | "idle" | "ready";
  hits: number;
  misses: number;
  staleHits: number;
  pendingVerify: number;
  researchExecuted: number;
  http: number;
};

export type IkKnrAppDiag = {
  status: "busy" | "idle" | "skipped" | "ready";
  priced: number;
  partial: number;
  hold: number;
  skipped: number;
  reject: number;
};

/** Sync pipeline inputs (mirror Host useMemo deps). */
export type IkOrchestraSyncInput = {
  item: TenderPipelineItem;
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  ingest: IkNg02IngestBridgeResult | null;
  historicalIndex: HistoricalExecutedIndex | null;
  knrKnowledge: KnrKnowledgeEnvelope | null;
  knowledgeBusy: boolean;
  flags: IkOrchestraFlags;
  chiefSession: ChiefSessionOutput | null;
};

/** Sync pipeline outputs (Document → P8 minus async labor/material). */
export type IkOrchestraSyncSnapshot = {
  report: IkDocumentExpertReport;
  knr: IkKnrExpertReport;
  knrKnowledgeDiag: IkKnrKnowledgeDiag;
  knrApplicationResults: KnrHostApplicationResult[];
  knrAppDiag: IkKnrAppDiag;
  knrMapped: ReturnType<
    typeof import("@/lib/intelligent-estimator/ik-knr-owner-mapping").applyOwnerKnrMapping
  >;
  /** W2 — PHASE 3 identity pipeline output (pure; persist in useEffect). */
  identityContext: IkIdentityContext | null;
  postIdentityExpert: IkDocumentExpertReport;
  /** Last gated persist outcome (updated from useEffect, not sync useMemo). */
  identityPersistOutcome: IkIdentityPersistOutcome | null;
  classification: IkClassificationReport;
  identityCoverage: IkIdentityCoverageReport | null;
  composite: IkCompositeBothHoldReport | null;
  positionCostBid: IkP7PositionCostBidReport | null;
  riskDecision: IkP8RiskDecisionReport | null;
};

export type IkOrchestraHostInput = {
  item: TenderPipelineItem;
  onUpdate?: (patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void;
  pipelineIngest?: IkOrchestraPipelineIngest;
  athPreviewEnabled?: boolean;
  chiefSession?: ChiefSessionOutput | null;
  historicalIndex?: HistoricalExecutedIndex | null;
  /** W5-3 — TendersProvider invalidation token (optional · default 0). */
  pricingCatalogRevision?: number;
};

/** Full runtime snapshot returned to IkEntryHost adapter. */
export type IkOrchestraSnapshot = IkOrchestraSyncSnapshot & {
  effectiveItem: TenderPipelineItem;
  pkg: TenderPackage | null;
  ingest: IkNg02IngestBridgeResult | null;
  bridgeBusy: boolean;
  labor: IkLaborExpertReport | null;
  material: IkMaterialExpertReport | null;
  flags: IkOrchestraFlags;
  /** W4-2 — per-line package gate blockers (read-only). */
  packageBlockers: IkPackageBlockerReport | null;
  /** W4-1 — aggregated Owner action queue (read-only). */
  ownerActionQueue: IkOwnerActionQueueReport | null;
  /** W4-3 — coverage ops view (niezmierzone %). */
  identityCoverageOps: IkIdentityCoverageOpsView | null;
  /** W4-4 — re-run F5 materialization after Owner Input save (idempotent). */
  refreshF5AfterOwnerInput: () => void;
};
