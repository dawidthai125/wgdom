/**
 * WIRE-EXPERTS-UI-01 — Polish labels (presentational only).
 */

export const EXPERT_WORKSPACE_TITLE_PL = "Szczegóły ekspertów";
export const EXPERT_WORKSPACE_SUBTITLE_PL =
  "Snapshoty EE → ME → PE → Cost → Offer (tylko odczyt)";

export const EXPERT_PANEL_ORDER_LABELS_PL = {
  execution: "Wykonanie (EE)",
  materials: "Materiały (ME)",
  pricing: "Ceny rynku (PE)",
  cost: "Koszt realny (Cost)",
  offer: "Oferta (Offer)",
} as const;

export const EMPTY_EXPERT_RESULT_PL = "Brak wyniku";
export const TRACE_CAPTION_PL = "Skrót kontraktu: Trace powyżej";
export const OFFER_DECISION_NOTE_PL =
  "Decyzja biznesowa: Decision Workspace (poniżej)";
export const EMPTY_BOM_PL = "Brak BOM";
export const EMPTY_BOM_LINES_PL = "Brak pozycji";
export const EMPTY_PLAN_PL = "Brak planu";
export const EMPTY_BUNDLE_PL = "Brak bundle";

export function strOrDash(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length > 0 ? s : "—";
}
