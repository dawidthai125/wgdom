/**
 * P2.1 — pure filtrowanie listy robót (warstwa UI, bez legacy).
 */

import type { CatalogWork, TradeId } from "@/lib/work-catalog";
import { tradeLabelPl } from "@/lib/work-catalog";

export type WorkCatalogActiveFilter = "all" | "active" | "inactive";

export interface WorkCatalogListFilters {
  search: string;
  tradeId: TradeId | "all";
  active: WorkCatalogActiveFilter;
}

/** P2.3: domyślnie tylko aktywne; chip „Nieaktywne” / „Wszystkie” jak w P2.1. */
export const DEFAULT_WORK_CATALOG_LIST_FILTERS: WorkCatalogListFilters = {
  search: "",
  tradeId: "all",
  active: "active",
};

export interface WorkCatalogListCounts {
  total: number;
  filtered: number;
  active: number;
  inactive: number;
}

const UNIT_LABELS_PL: Record<string, string> = {
  m2: "m²",
  mb: "mb",
  szt: "szt.",
  rbh: "rbh",
  m3: "m³",
  kpl: "kpl.",
};

export function workCatalogUnitLabelPl(unit: string): string {
  return UNIT_LABELS_PL[unit] ?? unit;
}

function normalizeSearchToken(value: string): string {
  return value.trim().toLocaleLowerCase("pl-PL");
}

function workMatchesSearch(work: CatalogWork, query: string): boolean {
  if (!query) return true;
  const haystack = [
    work.namePl,
    work.id,
    tradeLabelPl(work.tradeId),
    ...work.keywords,
  ]
    .join(" ")
    .toLocaleLowerCase("pl-PL");
  return haystack.includes(query);
}

export function filterWorkCatalogList(
  works: CatalogWork[],
  filters: WorkCatalogListFilters,
): CatalogWork[] {
  const query = normalizeSearchToken(filters.search);
  const filtered = works.filter((work) => {
    if (filters.tradeId !== "all" && work.tradeId !== filters.tradeId) return false;
    if (filters.active === "active" && !work.active) return false;
    if (filters.active === "inactive" && work.active) return false;
    return workMatchesSearch(work, query);
  });

  return [...filtered].sort((a, b) => {
    const tradeCmp = tradeLabelPl(a.tradeId).localeCompare(tradeLabelPl(b.tradeId), "pl");
    if (tradeCmp !== 0) return tradeCmp;
    return a.namePl.localeCompare(b.namePl, "pl");
  });
}

export function countWorkCatalogList(works: CatalogWork[]): WorkCatalogListCounts {
  const active = works.filter((w) => w.active).length;
  return {
    total: works.length,
    filtered: works.length,
    active,
    inactive: works.length - active,
  };
}

export function countFilteredWorkCatalogList(
  allWorks: CatalogWork[],
  filteredWorks: CatalogWork[],
): WorkCatalogListCounts {
  const base = countWorkCatalogList(allWorks);
  return {
    ...base,
    filtered: filteredWorks.length,
  };
}
