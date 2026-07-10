/**
 * NG-10 — copy PL, agenci AI i stałe UX (prezentacja only).
 * SSOT: docs/architecture/NG-10-DESIGN-FREEZE.md v1.0
 */

/** Agenci AI — rozszerzalna lista (multi-agent feed). */
export const AUTONOMOUS_AI_AGENT_ORDER = [
  "dokumentacja",
  "kosztorys",
  "wycena",
  "ryzyko",
  "strategia",
] as const;

export type AutonomousAiAgentId = (typeof AUTONOMOUS_AI_AGENT_ORDER)[number];

export const AUTONOMOUS_AI_AGENT_LABELS: Record<AutonomousAiAgentId, string> = {
  dokumentacja: "Agent dokumentacji",
  kosztorys: "Agent kosztorysu",
  wycena: "Agent wyceny",
  ryzyko: "Agent ryzyka",
  strategia: "Agent strategii",
};

/** Prezentacyjne fazy (mapowanie na feed — nie runtime pipeline). */
export const AUTONOMOUS_RUN_PHASE_ORDER = [
  "doc_fetch",
  "doc_found",
  "swz_found",
  "boq_detect",
  "doc_analyze",
  "scope_infer",
  "dossier_build",
  "labor_calc",
  "material_calc",
  "risk_assess",
  "profitability",
  "recommendation_prep",
  "complete",
] as const;

export type AutonomousRunPhaseId = (typeof AUTONOMOUS_RUN_PHASE_ORDER)[number];

export type AutonomousActivityKind = "live" | "achievement" | "status" | "thought";

export const AUTONOMOUS_RUN_LS_KEY_PREFIX = "kw-tender-autonomous-run-v1:";

export const AUTONOMOUS_RUN_MIN_DISPLAY_MS = 3000;

export const AUTONOMOUS_ETA_MIN_SECONDS = 8;
export const AUTONOMOUS_ETA_MAX_SECONDS = 120;

export const AUTONOMOUS_OUTCOME_POSITIVES_MAX = 4;
export const AUTONOMOUS_OUTCOME_WATCHOUTS_MAX = 5;

export const AUTONOMOUS_RECOMMENDATION_HERO: Record<"GO" | "HOLD" | "NO-GO", string> = {
  GO: "🟢 WARTO ZŁOŻYĆ OFERTĘ",
  HOLD: "🟡 WYMAGA DODATKOWEJ ANALIZY",
  "NO-GO": "🔴 NIE REKOMENDUJEMY SKŁADANIA OFERTY",
};

/** CTA Outcome Screen (S2) — biznesowy język zamiast „Workspace”. */
export const AUTONOMOUS_OUTCOME_CTA: Record<"GO" | "HOLD" | "NO-GO", string> = {
  GO: "Otwórz analizę przetargu",
  HOLD: "Przejdź do analizy",
  "NO-GO": "Przejdź do analizy",
};

/** Rotacja gdy faza trwa dłużej niż oczekiwano. */
export const AUTONOMOUS_FALLBACK_LIVE_MESSAGES = [
  "Nadal pracuję — to może chwilę potrwać.",
  "Sprawdzam kolejne załączniki.",
  "Doprecyzowuję wyniki analizy.",
] as const;

export const AUTONOMOUS_ETA_LABEL_PREFIX = "🕒 Szacowany czas:";

export function formatAutonomousEtaSeconds(seconds: number): string {
  const clamped = Math.max(
    AUTONOMOUS_ETA_MIN_SECONDS,
    Math.min(AUTONOMOUS_ETA_MAX_SECONDS, Math.round(seconds)),
  );
  const unit = clamped === 1 ? "sekundę" : clamped < 5 ? "sekundy" : "sekund";
  return `${AUTONOMOUS_ETA_LABEL_PREFIX} około ${clamped} ${unit}`;
}

export function formatAutonomousAchievement(message: string): string {
  return message.startsWith("✓") ? message : `✓ ${message}`;
}
