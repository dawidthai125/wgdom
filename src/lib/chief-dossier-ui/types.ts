/**
 * WIRE-CHIEF-UI-DOSSIER-01 — presentational ViewModel types.
 * Zero domain logic · zero Expert/Chief/Session BC.
 */

import type {
  DecisionMakerSignalPayload,
  OfferPrimaryRecommendation,
  OfferScenario,
} from "@/lib/offer-expert";
import type { CostOfferHandoffPayload } from "@/lib/cost-expert";

export type ChiefDossierUiPhase =
  | "no_case"
  | "not_ready"
  | "checking"
  | "running"
  | "blocked"
  | "ready"
  | "cancelled"
  | "error"
  | "finished_other";

export type ChiefDossierIconKey =
  | "idle"
  | "search"
  | "loader"
  | "ban"
  | "check"
  | "x"
  | "alert"
  | "flag"
  | "hammer"
  | "package"
  | "trending"
  | "calculator"
  | "badge"
  | "loop"
  | "taskPending"
  | "taskRunning"
  | "taskDone"
  | "taskFailed"
  | "taskSkipped";

/** Semantic color token keys — mapped to Tailwind in React. */
export type ChiefDossierColorToken =
  | "muted"
  | "primary"
  | "warning"
  | "destructive"
  | "success"
  | "info";

export type ChiefTraceRole =
  | "execution"
  | "materials"
  | "pricing"
  | "cost"
  | "offer";

export interface ChiefTraceContractView {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: string;
  pewnoscLabelPl: string;
  blokery: ReadonlyArray<{ code: string; messagePl: string }>;
  zgodnosc: string;
  zgodnoscLabelPl: string;
  zgodnoscOpisPl: string;
}

export interface ChiefTraceSlotView {
  role: ChiefTraceRole;
  roleLabelPl: string;
  iconKey: ChiefDossierIconKey;
  contract: ChiefTraceContractView | null;
  emptyLabelPl: string;
  /** DF: Offer open when ready + contract present. */
  defaultOpen: boolean;
}

export interface ChiefTaskRowView {
  id: string;
  labelPl: string;
  status: string;
  statusLabelPl: string;
  statusColor: ChiefDossierColorToken;
  statusIconKey: ChiefDossierIconKey;
  failReasonPl: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ChiefDossierViewModel {
  uiPhase: ChiefDossierUiPhase;
  titlePl: string;
  subtitlePl: string;
  caseId: string | null;
  caseIdShort: string | null;
  sessionStatus: string;
  sessionStatusLabelPl: string;
  caseStatus: string | null;
  caseStatusLabelPl: string | null;
  statusIconKey: ChiefDossierIconKey;
  statusColor: ChiefDossierColorToken;
  emptyMessagePl: string | null;
  showTimeline: boolean;
  showTraces: boolean;
  showOffer: boolean;
  showBlockers: boolean;
  showLoopReturn: boolean;
  taskRows: ChiefTaskRowView[];
  traceSlots: ChiefTraceSlotView[];
  blockersPl: string[];
  loopCount: number;
  returnToMaterialExpert: boolean;
  requiresReanalysis: boolean;
  orchestrationNotesPl: string[];
  /** 1:1 Offer Expert — passthrough. */
  primaryRecommendation: OfferPrimaryRecommendation | null;
  scenarios: OfferScenario[];
  decisionMakerPayload: DecisionMakerSignalPayload | null;
  offerHandoffPayload: CostOfferHandoffPayload | null;
}
