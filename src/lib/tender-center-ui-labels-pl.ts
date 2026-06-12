/**
 * W&G DOM Przetargi — etykiety UI po polsku (Sprint 20.3B+ FULL).
 * Presentation only — enumy GO/HOLD/NO-GO pozostają w modelu danych.
 */

export { DECISION_LABEL_PL } from "@/lib/tender-center-decision";
export type { TenderDecision } from "@/lib/tender-center-decision";
export { ACTION_PRIORITY_LABEL_PL, ACTION_CATEGORY_LABEL_PL } from "@/lib/tender-center-action-center";
export { HEALTH_LABEL_PL } from "@/lib/tender-center-health";
export { CONTRACT_SCALE_LABEL_PL } from "@/lib/tender-center-impact";

export const METRIC_LABEL_PL = {
  healthIndex: "Indeks kondycji",
  opportunityScore: "Wynik okazji",
  strategicScore: "Wynik strategiczny",
  impactScore: "Wynik wpływu",
  financialCapacity: "Zdolność finansowa",
  financialCapacityScore: "Wynik zdolności finansowej",
  forecast90: "Prognoza 90 dni",
  growthMode: "Tryb rozwoju",
} as const;

export const OPPORTUNITY_LABEL_PL = {
  short: "Okazja",
  score: "Wynik okazji",
} as const;

export const STRATEGIC_LABEL_PL = {
  short: "Strategiczny",
  score: "Wynik strategiczny",
} as const;

export const IMPACT_LABEL_PL = {
  score: "Wynik wpływu",
  healthImpact: "Wpływ na kondycję",
  forecastImpact: "Wpływ na prognozę",
  cashFlowImpact: "Wpływ na przepływy",
  teamImpact: "Wpływ na zespół",
  contractScale: "Skala kontraktu",
} as const;

export const FINANCIAL_LABEL_PL = {
  capacity: "Zdolność finansowa",
  capacityScore: "Wynik zdolności finansowej",
} as const;

export const BASELINE_LABEL_PL = {
  baseline: "Stan bazowy",
  baselineToday: "Stan bazowy (dziś)",
  percentGo: "50% startów",
  scenarioC: "Scenariusz C · 50% startów",
  vsBaseline: "względem stanu bazowego",
} as const;

export const PIPELINE_LABEL_PL = {
  pipeline: "lejek przetargów",
  refreshFromBzp: "Odśwież lejek przetargów z BZP",
  inPipeline: "w lejku",
  noActiveInPipeline: "Brak aktywnych przetargów — odśwież lejek przetargów z BZP.",
  noCandidatesInPipeline: "Brak kandydatów do startu w lejku — odśwież przetargi lub oznacz decyzje.",
  ownerDecisionsKv: "lejek przetargów — zapis w kw-tender-decisions",
} as const;

export const SECTION_LABEL_PL = {
  insight: "Wniosek",
  authorLine: "Zaprojektowany i opracowany przez",
  aiInsights: "Wnioski AI",
  explainability: "Wyjaśnienia scoringu",
  glossary: "Słownik pojęć przetargowych",
  howToUse: "Jak korzystać z modułu Przetargi",
  about: "O module Przetargi",
  morningBriefing: "Poranny raport",
  pipelineOffers: "Lejek ofert",
  headroom: "Rezerwa",
  topReasons: "Najczęstsze powody",
  autoSync: "Automatyczna synchronizacja…",
  system: "System",
  remainingAnalyses: "Pozostałe analizy",
} as const;

/** Nagłówki słownika — treść opisowa już po polsku. */
export const GLOSSARY_TERM_PL = {
  healthIndex: "Indeks kondycji",
  opportunityScore: "Wynik okazji",
  strategicScore: "Wynik strategiczny",
  impactScore: "Wynik wpływu",
  financialCapacity: "Zdolność finansowa",
  forecast90: "Prognoza 90 dni",
  growthMode: "Tryb rozwoju",
  decisions: "Startuj / Analizuj / Odpuszczaj",
  actionCenter: "Centrum działań",
  morningBriefing: "Poranny raport właściciela",
  aiInsights: "Wnioski AI",
  ownerProfile: "Profil właściciela",
  learningEngine: "Silnik uczenia decyzji",
} as const;
