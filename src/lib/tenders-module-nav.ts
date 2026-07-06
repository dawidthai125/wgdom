import type { TendersTabId } from "@/lib/tenders-module-labels";

/** Nawigacja modułu Przetargi 3.0 — wspólny klucz localStorage z TendersProvider. */
export const TENDERS_TAB_STORAGE_KEY = "kw-tenders-active-tab-v1";

const TENDERS_TAB_IDS: TendersTabId[] = [
  "list",
  "strategy",
  "map",
  "profile",
  "workcatalog",
  "pricebase",
  "settings",
];

export function isTendersTabId(raw: string | null | undefined): raw is TendersTabId {
  return raw != null && (TENDERS_TAB_IDS as string[]).includes(raw);
}

export function saveTendersActiveTab(tab: TendersTabId): void {
  try {
    localStorage.setItem(TENDERS_TAB_STORAGE_KEY, tab);
  } catch { /* ignore */ }
}

/** Przed przejściem view=tenders — otwórz zakładkę Strategia. */
export function openTendersAtStrategyTab(): void {
  saveTendersActiveTab("strategy");
}

/** Legacy view=workcatalog → Przetargi → Biblioteka Robót (bez flicker — zapis przed setView). */
export function openTendersAtWorkCatalogTab(): void {
  saveTendersActiveTab("workcatalog");
}

export function sanitizeTendersActiveTab(
  tab: TendersTabId,
  canViewWorkCatalog: boolean,
): TendersTabId {
  if (tab === "workcatalog" && !canViewWorkCatalog) return "list";
  return tab;
}
