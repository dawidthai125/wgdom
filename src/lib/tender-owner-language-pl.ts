/**
 * P5-005A / P5-005B / V3.1 Intelligence — Owner Language (copy + nawigacja zakładek).
 */

/** P5-005B / V3.1 — nazwy modułu w pasku zakładek. */
export const TENDER_OWNER_TAB_LABELS = {
  overview: "Intelligence",
  documents: "Dokumenty",
  qualification: "Kwalifikacja",
  valuation: "Wycena",
  offer: "Oferta",
} as const;

/**
 * @deprecated V3.1 — zastąpione przez `ctx.nextAction` (Sekcja 6). Pozostawione dla testów migracyjnych.
 */
export const TENDER_OWNER_NEXT_STEP_CTA: Record<"documents" | "valuation" | "qualification", string> = {
  documents: "Dokumenty",
  valuation: "Ile zarobimy?",
  qualification: "Czy możemy wystartować?",
};

/** V3.1 — sekcje Intelligence Dashboard. */
export const TENDER_INTELLIGENCE_SECTION_COPY = {
  verdict: "Werdykt",
  about: "O czym jest ten przetarg",
  economy: "Ekonomia",
  blockers: "Blokery i ryzyko",
  nextAction: "Co robić teraz",
  details: "Szczegóły",
  confidenceLabel: "Pewność rekomendacji",
  monitoringSignals: (count: number) =>
    count === 1 ? "1 nowy sygnał w dokumentacji" : `${count} nowych sygnałów w dokumentacji`,
} as const;

/** Owner View — sekcje Przeglądu (legacy + reuse). */
export const TENDER_OWNER_VIEW_COPY = {
  decisionSection: "Decyzja",
  financeSection: "Ile zarobimy?",
  financeEmpty: "Nie policzono jeszcze zysku.",
  financeCta: "Policz zysk",
  revenueLabel: "Przychód",
  costLabel: "Koszt",
  marginLabel: "Marża",
  riskSection: "Termin i ryzyko",
  riskFitLabel: "Szansa na wygraną",
  riskValueLabel: "Wartość zamówienia",
  positionsSection: "Plik z pozycjami",
  prepStatusKosztorysLabel: "Kosztorys",
  prepStatusPricingLabel: "Wycena",
  nextStepsSection: "Co dalej",
  moreSection: "Więcej szczegółów",
} as const;

/** Nagłówki zakładek workspace (sekcje wewnątrz tabów). */
export const TENDER_OWNER_WORKSPACE_SECTION_COPY = {
  valuation: "Ile zarobimy?",
  qualification: "Czy możemy wystartować?",
  offer: "Złożona oferta",
  offerResult: "Oferta i wynik",
  offerCompleteness: "Czy oferta jest kompletna?",
  analysisProgress: "Postęp wczytywania",
  checklistOffer: "Checklist oferty",
  valuationProcessing: "Wczytuję dokumenty do kalkulacji…",
} as const;

/** Karta ofertowa / Więcej — akcje operatora. */
export const TENDER_OWNER_OPERATOR_COPY = {
  bidPrepPanelTitle: "Checklist oferty",
  bidPrepReadyLine: (ready: number, total: number) =>
    `${ready}/${total} elementów gotowych`,
  analyzeDocuments: "Uruchom ponownie analizę",
  analyzingDocuments: "Analiza w toku…",
  exportSummaryPdf: "Pobierz podsumowanie PDF",
  detailChecklistSummary: (total: number, ready: number) =>
    `Szczegółowa checklista (${total} elementów) — ${ready}/${total} gotowych`,
  summaryReadyPrefix: "Checklist oferty:",
} as const;

/** Kafelki checklisty (Więcej). */
export const TENDER_OWNER_TILE_LABELS = {
  deadline: "Termin ofert",
  value: "Wartość zamówienia",
  wadium: "Wadium",
  kosztorys: "Plik z pozycjami",
  criteria: "Jak oceniają oferty",
  ourBid: "Nasza oferta",
} as const;

/** Kalkulator (zakładka Ile zarobimy?). */
export const TENDER_OWNER_VALUATION_COPY = {
  panelTitle: "Ile zarobimy?",
  costPrice: "Koszt własny",
  margin: "Marża",
  offerPrice: "Nasza cena",
  pricingAlerts: "Uwagi do kalkulacji",
  howPriceBuilt: "Skąd wzięła się cena?",
  unknownPositions: "Pozycje bez kategorii",
} as const;

/** Hinty checklisty — bez skrótów SWZ/STWIOR. */
export const TENDER_OWNER_HINT_COPY = {
  criteriaAfterAnalyze: "Pojawi się po automatycznej analizie lub „Uruchom ponownie analizę”",
  analyzeDocumentsTitle: "Wymusza ponowną analizę PDF i załączników — wadium, kryteria, wartość",
} as const;
