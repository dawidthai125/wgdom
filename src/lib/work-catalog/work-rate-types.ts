/**
 * WORK-CATALOG-REBUILD-01 P0 — model Nasz Katalog Robót (OUR RATE).
 * Semantyka: OUR RATE = zaakceptowana stawka robocizny (workId + unit).
 * companyPricePln ≠ źródło / fallback / seed.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

/** Identity OUR RATE — region NIE jest częścią identity. */
export type WorkRateIdentity = {
  workId: string;
  unit: WgdomCostUnit;
};

export function buildWorkRateIdentityKey(workId: string, unit: WgdomCostUnit): string {
  return `${workId.trim()}|${unit}`;
}

/** Hierarchia regionów obserwacji (metadata). */
export const WORK_RATE_REGION_SCOPES = ["WROCLAW", "DOLNY_SLASK", "POLSKA"] as const;
export type WorkRateRegionScope = (typeof WORK_RATE_REGION_SCOPES)[number];

export const WORK_RATE_REGION_SCOPE_LABELS_PL: Record<WorkRateRegionScope, string> = {
  WROCLAW: "Wrocław",
  DOLNY_SLASK: "Dolny Śląsk",
  POLSKA: "Polska",
};

export const WORK_RATE_REGION_FALLBACK_CHAIN: readonly WorkRateRegionScope[] = [
  "WROCLAW",
  "DOLNY_SLASK",
  "POLSKA",
] as const;

export type WorkRateSourceType = "OWNER" | "ACCEPT" | "CALCULATED" | "RESEARCH";

/** Rodzaj wpisu historii — SOURCE (kandydat rynkowy) vs OUR (zaakceptowana). */
export type WorkRateHistoryKind = "OUR" | "SOURCE";

export interface OurWorkRateHistoryEntry {
  workId: string;
  unit: WgdomCostUnit;
  ratePln: number;
  kind: WorkRateHistoryKind;
  sourceType: WorkRateSourceType;
  regionScope: WorkRateRegionScope;
  observedAt: string;
  changePln?: number;
}

/**
 * SSOT aktualnej stawki robocizny na CatalogWork (additive).
 * Brak pola / brak ourRatePln > 0 ⇒ BRAK STAWKI (C-EMPTY).
 */
export interface OurWorkRate {
  workId: string;
  unit: WgdomCostUnit;
  ourRatePln: number;
  sourceType: WorkRateSourceType;
  regionScope: WorkRateRegionScope;
  /** Data obserwacji / ustalenia stawki — SSOT freshness (≠ CatalogWork.updatedAt). */
  observedAt: string;
  updatedAt: string;
  /** Opcjonalna stawka rynkowa (kandydat) — P0 zwykle undefined (research BLOCKED). */
  sourceRatePln?: number;
  history: OurWorkRateHistoryEntry[];
}

/** Status logiczny freshness OUR RATE. */
export type WorkRateFreshnessStatus = "CURRENT" | "STALE" | "MISSING";

export const WORK_RATE_FRESHNESS_LABELS_PL: Record<WorkRateFreshnessStatus, string> = {
  CURRENT: "AKTUALNA",
  STALE: "PRZETERMINOWANA",
  MISSING: "BRAK STAWKI",
};

export const OUR_WORK_RATE_HISTORY_CAP = 24;
