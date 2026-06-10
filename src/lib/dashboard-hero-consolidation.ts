/**
 * Dashboard V2 — konsolidacja Hero DZIŚ vs Uwaga dziś (20.7C.2C).
 *
 * Hero DZIŚ = główne źródło priorytetów (TOP 5, buildHeroToday).
 * Uwaga dziś = rozszerzona lista szczegółów (toggle dokumentów, pełne listy).
 * Przetargi — skrót = liczniki + wejście do Command Center (bez listy akcji).
 * Action Center (CC) = pełna analiza przetargów; prezentacja slotów w UI.
 * Morning Briefing = narracja w Command Center, nie na Pulpicie.
 */

import type { HeroTodayResult } from "@/lib/dashboard-hero-today";
import { HERO_MERGE_WM_OVERDUE } from "@/lib/dashboard-hero-today";

/** Sekcje Uwaga dziś — identyfikatory do deduplikacji z Hero. */
export type UwagaDzisSectionId =
  | "wm-overdue"
  | "wm-this-week"
  | "handover-jobs"
  | "pending-reports"
  | "pending-photos"
  | "pending-receipts"
  | "payroll-unsaved"
  | "payroll-blockers"
  | "payroll-consistency"
  | "inspector-feed"
  | "inspector-notes";

const MERGE_KEY_TO_UWAGA: Record<string, UwagaDzisSectionId> = {
  [HERO_MERGE_WM_OVERDUE]: "wm-overdue",
  "wm-this-week": "wm-this-week",
  "handover-jobs": "handover-jobs",
  "pending-reports": "pending-reports",
  "pending-photos": "pending-photos",
  "pending-receipts": "pending-receipts",
  "payroll-unsaved-week": "payroll-unsaved",
  "payroll-saturday-blockers": "payroll-blockers",
  "payroll-consistency": "payroll-consistency",
  "inspector-feed": "inspector-feed",
  "inspector-notes": "inspector-notes",
};

/**
 * Sekcje Uwaga dziś już promowane w Hero — ukryj nagłówek/listę skrótu,
 * aby nie duplikować TOP 5. Braki dokumentów pozostają (inline toggle UX).
 */
export function getHeroCoveredUwagaSections(hero: HeroTodayResult): Set<UwagaDzisSectionId> {
  const covered = new Set<UwagaDzisSectionId>();
  for (const item of hero.items) {
    if (item.mergeKey && MERGE_KEY_TO_UWAGA[item.mergeKey]) {
      covered.add(MERGE_KEY_TO_UWAGA[item.mergeKey]);
    }
    if (item.sourceIds.includes("J01") || item.sourceIds.includes("T10")) {
      covered.add("wm-overdue");
    }
  }
  return covered;
}

export function isUwagaSectionCoveredByHero(
  sectionId: UwagaDzisSectionId,
  hero: HeroTodayResult,
): boolean {
  return getHeroCoveredUwagaSections(hero).has(sectionId);
}
