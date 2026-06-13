/**
 * P3.3A — statyczne zakresy referencyjne robocizny (MVP, bez API/crawlerów).
 * Aktualizacja ręczna w kolejnych sprintach (P3.3B).
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export type LaborBenchmarkCategoryId =
  | "MALOWANIE"
  | "GK"
  | "ELEKTRYKA"
  | "HYDRAULIKA"
  | "CO"
  | "GAZ"
  | "OGOLNOBUDOWLANE"
  | "POSADZKI"
  | "STOLARKA"
  | "DACH"
  | "INNE";

export interface LaborBenchmarkRange {
  categoryId: LaborBenchmarkCategoryId;
  labelPl: string;
  unit: WgdomCostUnit;
  min: number;
  avg: number;
  max: number;
  /** Źródło referencyjne (dokumentacja wewnętrzna / szacunek rynku remontowego Dolny Śląsk 2026). */
  sourceNote: string;
}

/** Zakresy robocizny zł/j.m. — wyłącznie informacyjne, nie wpływają na kalkulator. */
export const LABOR_BENCHMARK_RANGES: LaborBenchmarkRange[] = [
  {
    categoryId: "MALOWANIE",
    labelPl: "Malowanie",
    unit: "m2",
    min: 18,
    avg: 22,
    max: 25,
    sourceNote: "MVP — malowanie ścian/sufitów, Wrocław remonty mieszkań",
  },
  {
    categoryId: "GK",
    labelPl: "Zabudowa GK",
    unit: "m2",
    min: 80,
    avg: 90,
    max: 105,
    sourceNote: "MVP — montaż płyt GK na ścianach",
  },
  {
    categoryId: "ELEKTRYKA",
    labelPl: "Elektryka",
    unit: "szt",
    min: 45,
    avg: 62,
    max: 85,
    sourceNote: "MVP — punkt instalacyjny (gniazdo/włącznik)",
  },
  {
    categoryId: "HYDRAULIKA",
    labelPl: "Hydraulika",
    unit: "szt",
    min: 80,
    avg: 110,
    max: 150,
    sourceNote: "MVP — punkt wod-kan (bateria, ustęp)",
  },
  {
    categoryId: "CO",
    labelPl: "Centralne ogrzewanie",
    unit: "szt",
    min: 35,
    avg: 52,
    max: 70,
    sourceNote: "MVP — punkt C.O. (zawór, grzejnik)",
  },
  {
    categoryId: "GAZ",
    labelPl: "Instalacje gazowe",
    unit: "szt",
    min: 120,
    avg: 165,
    max: 220,
    sourceNote: "MVP — punkt gazowy",
  },
  {
    categoryId: "OGOLNOBUDOWLANE",
    labelPl: "Roboty ogólnobudowlane",
    unit: "szt",
    min: 25,
    avg: 38,
    max: 55,
    sourceNote: "MVP — przebicia, zamurowania, drobne roboty szt.",
  },
  {
    categoryId: "POSADZKI",
    labelPl: "Posadzki / płytki",
    unit: "m2",
    min: 55,
    avg: 72,
    max: 95,
    sourceNote: "MVP — układanie płytek / posadzki",
  },
  {
    categoryId: "STOLARKA",
    labelPl: "Stolarka",
    unit: "szt",
    min: 180,
    avg: 245,
    max: 350,
    sourceNote: "MVP — montaż drzwi/okien",
  },
  {
    categoryId: "DACH",
    labelPl: "Dach",
    unit: "m2",
    min: 45,
    avg: 58,
    max: 80,
    sourceNote: "MVP — roboty dekarskie (referencja)",
  },
  {
    categoryId: "INNE",
    labelPl: "Inne",
    unit: "rbh",
    min: 42,
    avg: 52,
    max: 65,
    sourceNote: "MVP — stawka rbh ogólna (fallback)",
  },
];

export const LABOR_BENCHMARK_SOURCE_LABEL = "Benchmark WGDOM MVP (statyczny)";
