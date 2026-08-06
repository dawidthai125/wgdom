import type { NavigateFunction } from "react-router";
import { TENDERS_LIST_PATH } from "@/lib/tender-detail-routes-v4";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import {
  clearTendersReturnContext,
  consumeTendersReturnContext,
  defaultTendersReturnTab,
  saveTendersActiveTab,
  saveTendersReturnContext,
} from "@/lib/tenders-module-nav";
import {
  openTenderDetailV4,
  type OpenTenderDetailV4Options,
} from "@/lib/tender-detail-nav";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";

/** Kolejność zakładek modułu w sheet (IA v2 — max 4). */
export const TENDER_MODULE_NAV_SHEET_TAB_ORDER: readonly TendersTabId[] = [
  "review",
  "queue",
  "map",
  "company",
] as const;

export function filterTenderModuleNavTabs(
  _canViewWorkCatalog: boolean,
): TendersTabId[] {
  void _canViewWorkCatalog;
  return [...TENDER_MODULE_NAV_SHEET_TAB_ORDER];
}

/**
 * Przejście z detalu V4 do innej zakładki modułu bez „Powrót”.
 * Czyści return context — świadomy wybór domu.
 */
export function navigateToTendersModuleTab(
  navigate: NavigateFunction,
  setActiveTab: (tab: TendersTabId) => void,
  tab: TendersTabId,
): void {
  clearTendersReturnContext();
  navigate(TENDERS_LIST_PATH);
  saveTendersActiveTab(tab);
  setActiveTab(tab);
}

/** Wejście w detal z poziomu modułu — zapisuje AC-RETURN. */
export function openTenderDetailFromModule(
  navigate: NavigateFunction,
  tenderId: string,
  moduleTab: TendersTabId,
  detailTab?: TenderDetailV4TabId,
  opts?: OpenTenderDetailV4Options,
): void {
  saveTendersReturnContext(moduleTab);
  openTenderDetailV4(navigate, tenderId, detailTab, opts);
}

/**
 * Powrót z Tender Workspace → przywraca kontekst (AC-RETURN).
 * Brak kontekstu → Kolejka.
 */
export function leaveTenderDetailToModule(
  navigate: NavigateFunction,
  setActiveTab: (tab: TendersTabId) => void,
): void {
  const restored = consumeTendersReturnContext() ?? defaultTendersReturnTab();
  saveTendersActiveTab(restored);
  setActiveTab(restored);
  navigate(TENDERS_LIST_PATH);
}
