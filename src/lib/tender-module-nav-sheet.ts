import type { NavigateFunction } from "react-router";
import { TENDERS_LIST_PATH } from "@/lib/tender-detail-routes-v4";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import { saveTendersActiveTab } from "@/lib/tenders-module-nav";

/** Kolejność zakładek modułu w sheet (TEUX-4 M4). */
export const TENDER_MODULE_NAV_SHEET_TAB_ORDER: readonly TendersTabId[] = [
  "list",
  "strategy",
  "map",
  "profile",
  "workcatalog",
  "pricebase",
  "settings",
] as const;

export function filterTenderModuleNavTabs(
  canViewWorkCatalog: boolean,
): TendersTabId[] {
  return TENDER_MODULE_NAV_SHEET_TAB_ORDER.filter(
    (id) => id !== "workcatalog" || canViewWorkCatalog,
  );
}

/**
 * Przejście z detalu V4 do innej zakładki modułu bez „Powrót do listy”.
 * Najpierw opuszcza URL detalu — TendersModule nie wymusza wtedy tab=list.
 */
export function navigateToTendersModuleTab(
  navigate: NavigateFunction,
  setActiveTab: (tab: TendersTabId) => void,
  tab: TendersTabId,
): void {
  navigate(TENDERS_LIST_PATH);
  saveTendersActiveTab(tab);
  setActiveTab(tab);
}
