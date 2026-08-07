/**
 * WIRE-CHIEF-UI-DOSSIER-01 — public API (presentational only).
 */

export {
  CHIEF_DOSSIER_SURFACE_SUBTITLE_PL,
  CHIEF_DOSSIER_SURFACE_TITLE_PL,
  labelCaseStatusPl,
  labelSessionErrorPl,
  labelSessionStatusPl,
  labelTaskIdPl,
  labelTaskStatusPl,
  labelTraceRolePl,
} from "./labels";
export type {
  ChiefDossierColorToken,
  ChiefDossierIconKey,
  ChiefDossierUiPhase,
  ChiefDossierViewModel,
  ChiefTaskRowView,
  ChiefTraceContractView,
  ChiefTraceRole,
  ChiefTraceSlotView,
} from "./types";
export { buildChiefDossierViewModel } from "./view-model";
