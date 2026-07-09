/**
 * NG-06-TEUX-7b — Command Layer UI prefs + prezentacja CTA disabled reason.
 * UI-only · brak logiki pipeline / intelligence next-action.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { WorkflowPrimaryActionView } from "@/lib/tender-workflow-primary-action";
import {
  TENDER_DETAIL_V4_TAB_LABELS,
  type TenderDetailV4TabId,
} from "@/lib/tender-detail-routes-v4";

export const TENDERS_COMMAND_TRUST_RIBBON_COLLAPSED_KEY =
  "wg-tenders-command-trust-ribbon-collapsed-v1";

/** Domyślnie zwinięte — oszczędność wysokości chrome mobile (NG-03 ≤50vh). */
export function loadTrustRibbonCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(TENDERS_COMMAND_TRUST_RIBBON_COLLAPSED_KEY);
    if (raw === "0" || raw === "false") return false;
    if (raw === "1" || raw === "true") return true;
    return true;
  } catch {
    return true;
  }
}

export function saveTrustRibbonCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(TENDERS_COMMAND_TRUST_RIBBON_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* quota / private mode */
  }
}

/** Prezentacja only — etykieta kontekstu CTA per tab workspace (NG-08-01). */
export function buildWorkspacePrimaryActionContextLabel(tab: TenderDetailV4TabId): string {
  return `Następny krok · ${TENDER_DETAIL_V4_TAB_LABELS[tab]}`;
}

/** NG-08-02 — Process Strip „Tu jesteś” (prezentacja only). */
export function buildProcessStripYouAreHereLabel(stageLabel: string): string {
  return `Tu jesteś — ${stageLabel}`;
}

/** NG-08-03 — Intelligence hub shortcut w Command Layer (WF-03a). */
export function buildIntelligenceHubShortcutLabel(): string {
  return "Podsumowanie oferty";
}

/** NG-08-05 — sugerowany pierwszy tab kosztowy (WF-05 · RC-01). */
export function resolveSuggestedCostV4Tab(item: TenderPipelineItem): "kosztorys" | "ceny" {
  if (item.tenderDossier?.kosztorys?.ok === true) return "ceny";
  return "kosztorys";
}

/** NG-08-05 — etykieta skrótu cost workspace. */
export function buildCostWorkspaceShortcutLabel(tab: "kosztorys" | "ceny"): string {
  return tab === "ceny" ? "Wycena oferty" : TENDER_DETAIL_V4_TAB_LABELS.kosztorys;
}

/** Prezentacja only — pochodzi z istniejących pól view (bez zmiany reguł P0–P12). */
export function resolvePrimaryActionDisabledReason(
  view: Pick<WorkflowPrimaryActionView, "disabled" | "busy" | "description">,
): string | null {
  if (!view.disabled) return null;
  const desc = view.description?.trim();
  if (view.busy) {
    return desc || "Trwa przetwarzanie dokumentów — poczekaj na zakończenie analizy.";
  }
  return desc || "Akcja chwilowo niedostępna — wykonaj wskazane kroki procesu.";
}
