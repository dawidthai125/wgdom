/**
 * Chief Orchestrator — public API (P0).
 */

export type {
  ChiefCaseStatus,
  ChiefDecydentDossier,
  ChiefExpertSnapshots,
  ChiefOrchestratorInput,
  ChiefOrchestratorResult,
  ChiefTaskId,
  ChiefTaskRecord,
  ChiefTaskStatus,
} from "./types";

export type { ChiefGateId, ChiefGateVerdict } from "./gates";

export {
  gateCost,
  gateExecution,
  gateMaterials,
  gateOffer,
  gatePricingNeedsReturn,
} from "./gates";

export { assembleDecydentDossier } from "./dossier";
export { runChiefOrchestrator } from "./run";
