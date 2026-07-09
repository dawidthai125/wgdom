/**
 * NG-08-05 — Cost workspace scroll UI prefs (session LS only · WF-05h).
 * UI-only · brak pipeline / sync / chmury.
 */

export const TENDER_COST_SCROLL_KEY_PREFIX = "wg-tender-scroll-";

export type TenderCostScrollTab = "kosztorys" | "ceny";

export function tenderCostScrollKey(tenderId: string, tab: TenderCostScrollTab): string {
  return `${TENDER_COST_SCROLL_KEY_PREFIX}${tenderId}-${tab}`;
}

export function loadTenderTabScrollTop(
  tenderId: string | undefined,
  tab: TenderCostScrollTab,
): number | null {
  if (!tenderId?.trim()) return null;
  try {
    const raw = localStorage.getItem(tenderCostScrollKey(tenderId, tab));
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "number" || !Number.isFinite(parsed)) return null;
    return Math.max(0, parsed);
  } catch {
    return null;
  }
}

export function saveTenderTabScrollTop(
  tenderId: string | undefined,
  tab: TenderCostScrollTab,
  scrollTop: number,
): void {
  if (!tenderId?.trim()) return;
  try {
    localStorage.setItem(
      tenderCostScrollKey(tenderId, tab),
      JSON.stringify(Math.max(0, scrollTop)),
    );
  } catch {
    /* quota / private mode */
  }
}
