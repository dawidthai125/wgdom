/**
 * P5-005A / P5-005B — Owner Language (copy + nawigacja zakładek).
 */

/** P5-005B — nazwy modułu w pasku zakładek (nawigacja, muscle memory). */
export const TENDER_OWNER_TAB_LABELS = {
  overview: "Decyzja",
  documents: "Dokumenty",
  qualification: "Kwalifikacja",
  valuation: "Wycena",
  offer: "Oferta",
} as const;

/** P5-005B — CTA sekcji Co dalej (pytania biznesowe, nie w tab bar). */
export const TENDER_OWNER_NEXT_STEP_CTA: Record<"documents" | "valuation" | "qualification", string> = {
  documents: "Dokumenty",
  valuation: "Ile zarobimy?",
  qualification: "Czy możemy wystartować?",
};

/** Owner View — sekcje Przeglądu. */
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
  analyzeDocuments: "Przeanalizuj dokumenty",
  analyzingDocuments: "Przetwarzam dokumenty…",
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
  criteriaAfterAnalyze: "Pojawi się po „Przeanalizuj dokumenty”",
  analyzeDocumentsTitle: "PDF i załączniki — wadium, kryteria, wartość",
} as const;
