/**
 * NG-06-TEUX-7b — Command Layer UI prefs + prezentacja CTA disabled reason.
 * UI-only · brak logiki pipeline / intelligence next-action.
 */

import type { WorkflowPrimaryActionView } from "@/lib/tender-workflow-primary-action";

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
