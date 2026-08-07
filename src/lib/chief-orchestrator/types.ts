/**
 * Chief Orchestrator P0 — typy (Case / Task / dossier).
 * Zero logiki domenowej — tylko orkiestracja.
 */

import type { CostExpertAnalysisResult, CompanyCostRo } from "@/lib/cost-expert";
import type {
  ExecutionExpertAnalysisResult,
  ExecutionExpertBusinessProfile,
} from "@/lib/execution-expert";
import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type {
  OfferExpertAnalysisResult,
  OfferStrategyParamsRo,
} from "@/lib/offer-expert";
import type {
  AnalyzeMarketPricingOptions,
  PricingExpertAnalysisResult,
} from "@/lib/pricing-expert";
import type { OfferBoqDocument } from "@/lib/tender-offer-boq";

export type ChiefCaseStatus =
  | "idle"
  | "running"
  | "waiting_return"
  | "blocked"
  | "ready_for_decydent";

export type ChiefTaskStatus = "pending" | "running" | "done" | "failed" | "skipped";

export type ChiefTaskId =
  | "T1_execution"
  | "T2_materials"
  | "T3_pricing"
  | "T2_materials_return"
  | "T3_pricing_return"
  | "T4_cost"
  | "T5_offer"
  | "T6_assemble_dossier";

export interface ChiefTaskRecord {
  id: ChiefTaskId;
  status: ChiefTaskStatus;
  startedAt: string | null;
  finishedAt: string | null;
  failReasonPl: string | null;
}

export interface ChiefOrchestratorInput {
  caseId: string;
  offerBoq: OfferBoqDocument | Pick<OfferBoqDocument, "lines" | "tenderId">;
  executionProfile?: ExecutionExpertBusinessProfile;
  pricing: AnalyzeMarketPricingOptions;
  company: CompanyCostRo;
  offerStrategy?: OfferStrategyParamsRo;
  /** DF: max pełnych iteracji RETURN PE→ME (P0 = 1). */
  maxReturnLoops?: number;
  nowIso?: string;
}

export interface ChiefExpertSnapshots {
  execution: ExecutionExpertAnalysisResult | null;
  materials: MaterialExpertAnalysisResult | null;
  pricing: PricingExpertAnalysisResult | null;
  cost: CostExpertAnalysisResult | null;
  offer: OfferExpertAnalysisResult | null;
}

export interface ChiefDecydentDossier {
  caseId: string;
  status: ChiefCaseStatus;
  createdAt: string;
  finishedAt: string;
  loopCount: number;
  tasks: ChiefTaskRecord[];
  traces: {
    execution: ExecutionExpertAnalysisResult["contract"] | null;
    materials: MaterialExpertAnalysisResult["contract"] | null;
    pricing: PricingExpertAnalysisResult["contract"] | null;
    cost: CostExpertAnalysisResult["contract"] | null;
    offer: OfferExpertAnalysisResult["contract"] | null;
  };
  experts: ChiefExpertSnapshots;
  offerHandoffPayload: CostExpertAnalysisResult["offerHandoffPayload"];
  decisionMakerPayload: OfferExpertAnalysisResult["decisionMakerPayload"];
  primaryRecommendation: OfferExpertAnalysisResult["primaryRecommendation"];
  scenarios: NonNullable<OfferExpertAnalysisResult["scenarios"]>;
  orchestrationNotesPl: string[];
  handoffBlockersPl: string[];
  returnFlags: {
    returnToMaterialExpert: boolean;
    requiresReanalysis: boolean;
  };
}

export interface ChiefOrchestratorResult {
  caseId: string;
  status: ChiefCaseStatus;
  tasks: ChiefTaskRecord[];
  loopCount: number;
  experts: ChiefExpertSnapshots;
  dossier: ChiefDecydentDossier;
}
