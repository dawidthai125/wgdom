/**
 * P3.3B — edycja benchmarku robocizny (PRO) + zakresy referencyjne.
 * Aktualizacja ręczna; bez API/crawlerów zewnętrznych.
 */

import type { WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export type LaborBenchmarkCategoryId =
  | "MALOWANIE"
  | "GK"
  | "GLADZIE_TYNKI"
  | "ROZBIORKI"
  | "ELEKTRYKA"
  | "HYDRAULIKA"
  | "CO"
  | "GAZ"
  | "OGOLNOBUDOWLANE"
  | "POSADZKI"
  | "STOLARKA"
  | "DACH"
  | "INNE";

export type LaborBenchmarkSourceType = "internal" | "market_estimate" | "calibration";

export interface LaborBenchmarkSource {
  label: string;
  type: LaborBenchmarkSourceType;
  accessedAt?: string;
}

export interface LaborBenchmarkRange {
  categoryId: LaborBenchmarkCategoryId;
  labelPl: string;
  unit: WgdomCostUnit;
  min: number;
  avg: number;
  max: number;
  sourceNote: string;
}

export interface LaborBenchmarkEdition {
  editionId: string;
  labelPl: string;
  effectiveFrom: string;
  region: WgdomCostRegion;
  methodologyNote: string;
  sources: LaborBenchmarkSource[];
  ranges: LaborBenchmarkRange[];
}

/** Aktywna edycja benchmarku — Wrocław Q2 2026. */
export const ACTIVE_LABOR_BENCHMARK_EDITION: LaborBenchmarkEdition = {
  editionId: "2026-Q2-wroclaw",
  labelPl: "WGDOM Benchmark 2026-Q2",
  effectiveFrom: "2026-04-01",
  region: "wroclaw",
  methodologyNote:
    "Kuracja ręczna na podstawie szacunków rynku remontowego (Dolny Śląsk), wewnętrznej bazy WGDOM "
    + "oraz kalibracji ofert W&G. Zakresy informacyjne — nie wpływają na kalkulator wyceny.",
  sources: [
    {
      label: "Szacunek rynku remontów mieszkań — Dolny Śląsk",
      type: "market_estimate",
      accessedAt: "2026-03-15",
    },
    {
      label: "Kalibracja ofert W&G 2024–2025",
      type: "calibration",
      accessedAt: "2026-03-01",
    },
    {
      label: "Baza wewnętrzna WGDOM",
      type: "internal",
      accessedAt: "2026-04-01",
    },
  ],
  ranges: [
    {
      categoryId: "MALOWANIE",
      labelPl: "Malowanie",
      unit: "m2",
      min: 18,
      avg: 22,
      max: 25,
      sourceNote: "Malowanie ścian/sufitów — remonty mieszkań Wrocław",
    },
    {
      categoryId: "GK",
      labelPl: "Zabudowa GK",
      unit: "m2",
      min: 80,
      avg: 90,
      max: 105,
      sourceNote: "Montaż płyt GK na ścianach",
    },
    {
      categoryId: "GLADZIE_TYNKI",
      labelPl: "Gładzie / tynki",
      unit: "m2",
      min: 22,
      avg: 28,
      max: 38,
      sourceNote: "Gładzie, szpachlowanie, tynki — wykończenie ścian m²",
    },
    {
      categoryId: "ROZBIORKI",
      labelPl: "Rozbiórki",
      unit: "m2",
      min: 12,
      avg: 18,
      max: 28,
      sourceNote: "Rozbiórki i demontaże — stawka za m²",
    },
    {
      categoryId: "ELEKTRYKA",
      labelPl: "Elektryka",
      unit: "szt",
      min: 45,
      avg: 62,
      max: 85,
      sourceNote: "Punkt instalacyjny (gniazdo/włącznik)",
    },
    {
      categoryId: "HYDRAULIKA",
      labelPl: "Hydraulika",
      unit: "szt",
      min: 80,
      avg: 110,
      max: 150,
      sourceNote: "Punkt wod-kan (bateria, ustęp)",
    },
    {
      categoryId: "CO",
      labelPl: "Centralne ogrzewanie",
      unit: "szt",
      min: 35,
      avg: 52,
      max: 70,
      sourceNote: "Punkt C.O. (zawór, grzejnik)",
    },
    {
      categoryId: "GAZ",
      labelPl: "Instalacje gazowe",
      unit: "szt",
      min: 120,
      avg: 165,
      max: 220,
      sourceNote: "Punkt gazowy",
    },
    {
      categoryId: "OGOLNOBUDOWLANE",
      labelPl: "Roboty ogólnobudowlane",
      unit: "szt",
      min: 25,
      avg: 38,
      max: 55,
      sourceNote: "Przebicia, zamurowania, drobne roboty szt.",
    },
    {
      categoryId: "POSADZKI",
      labelPl: "Posadzki / płytki",
      unit: "m2",
      min: 55,
      avg: 72,
      max: 95,
      sourceNote: "Układanie płytek / posadzki",
    },
    {
      categoryId: "STOLARKA",
      labelPl: "Stolarka",
      unit: "szt",
      min: 180,
      avg: 245,
      max: 350,
      sourceNote: "Montaż drzwi/okien",
    },
    {
      categoryId: "DACH",
      labelPl: "Dach",
      unit: "m2",
      min: 45,
      avg: 58,
      max: 80,
      sourceNote: "Roboty dekarskie (referencja)",
    },
    {
      categoryId: "INNE",
      labelPl: "Inne",
      unit: "rbh",
      min: 42,
      avg: 52,
      max: 65,
      sourceNote: "Stawka rbh ogólna (fallback)",
    },
  ],
};

/** Zakresy robocizny zł/j.m. — wyłącznie informacyjne. */
export const LABOR_BENCHMARK_RANGES: LaborBenchmarkRange[] = ACTIVE_LABOR_BENCHMARK_EDITION.ranges;

export function getActiveLaborBenchmarkEdition(
  region: WgdomCostRegion = "wroclaw",
): LaborBenchmarkEdition {
  if (region === ACTIVE_LABOR_BENCHMARK_EDITION.region) {
    return ACTIVE_LABOR_BENCHMARK_EDITION;
  }
  return {
    ...ACTIVE_LABOR_BENCHMARK_EDITION,
    editionId: `${ACTIVE_LABOR_BENCHMARK_EDITION.editionId}-${region}`,
    region,
    methodologyNote: `${ACTIVE_LABOR_BENCHMARK_EDITION.methodologyNote} Region: ${region}.`,
  };
}

export function formatLaborBenchmarkEditionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const LABOR_BENCHMARK_SOURCE_LABEL = ACTIVE_LABOR_BENCHMARK_EDITION.labelPl;
