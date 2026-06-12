/** Nawigacja modułu Przetargi 3.0 — wspólny klucz localStorage z TendersProvider. */
export const TENDERS_TAB_STORAGE_KEY = "kw-tenders-active-tab-v1";

export function saveTendersActiveTab(tab: "list" | "strategy" | "map" | "profile" | "settings"): void {
  try {
    localStorage.setItem(TENDERS_TAB_STORAGE_KEY, tab);
  } catch { /* ignore */ }
}

/** Przed przejściem view=tenders — otwórz zakładkę Strategia. */
export function openTendersAtStrategyTab(): void {
  saveTendersActiveTab("strategy");
}
