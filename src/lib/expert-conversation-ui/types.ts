/**
 * Inteligentny Kosztorysant UX — presentational conversation types.
 * Thin only · ZERO domain / Expert / Chief / Persist BC.
 */

import type { ChiefDossierIconKey } from "@/lib/chief-dossier-ui";

export type ExpertConversationStepKind =
  | "chief_start"
  | "execution"
  | "materials"
  | "pricing"
  | "cost"
  | "offer"
  | "chief_final"
  | "documents"
  | "swz"
  | "cost_docs"
  | "przedmiary"
  | "ingest"
  | "extraction"
  | "validation"
  | "boq_status"
  | "classification"
  | "labor"
  | "material";

export type ExpertConversationStepStatus =
  | "pending"
  | "active"
  | "done"
  | "blocked"
  | "skipped"
  | "hold"
  | "partial"
  | "gap";

export type ExpertConversationSourceRefKind =
  | "document"
  | "extraction"
  | "boq_ready"
  | "hold"
  | "classification"
  | "identity"
  | "labor_lookup"
  | "labor_research"
  | "material_lookup"
  | "material_research"
  | "evidence"
  | "candidate";

export interface ExpertConversationSourceRef {
  kind: ExpertConversationSourceRefKind;
  tenderId: string;
  documentId?: string;
  artifact: Record<string, unknown>;
}

export interface ExpertConversationStepView {
  id: ExpertConversationStepKind;
  actorLabelPl: string;
  status: ExpertConversationStepStatus;
  statusLabelPl: string;
  /** Primary line — from Trace `co` or Chief status (never invented). */
  messagePl: string;
  /** Optional secondary — Trace `dlaczego` / failReason (may be empty). */
  detailPl: string | null;
  /** Runtime event id when the step is a pipeline fact (IK entry). */
  event?: string;
  /** Offer PRIMARY PLN display when available (existing field only). */
  offerPricePln: number | null;
  offerPriceDisplayPl: string | null;
  iconKey: ChiefDossierIconKey;
  /** Presentation pacing weight (chars of message). */
  messageWeight: number;
  /** Real runtime source — required for IK document facts. */
  sourceRef?: ExpertConversationSourceRef | null;
}

export interface ExpertConversationViewModel {
  /** False ⇒ Surface returns null (Session/Dossier not in Hub). */
  visible: boolean;
  titlePl: string;
  subtitlePl: string;
  uiPhase: string;
  caseIdShort: string | null;
  steps: ExpertConversationStepView[];
  /** True when Validation/DW may be the next human focus. */
  readyForDecision: boolean;
  /** True when any step is blocked/failed. */
  hasBlocked: boolean;
}
