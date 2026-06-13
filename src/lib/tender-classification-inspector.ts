/**
 * P2-G.1E — Classification Inspector: podsumowanie klasyfikacji ATH, UNKNOWN, hinty katalogu.
 * Tylko analiza / UX — bez zmian w kalkulatorze wyceny.
 */

import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import {
  normalizeWgdomCostUnit,
  type WgdomCostCategoryId,
} from "@/lib/wgdom-cost-catalog";
import { classifyAthLineCategory, classifyAthLineCategoryWithoutDictionary } from "@/lib/wgdom-ath-classifier";
import { phraseFromAthDescription } from "@/lib/wgdom-user-classification-dictionary";

export const CLASSIFICATION_CATEGORY_ORDER: WgdomCostCategoryId[] = [
  "ROZBIORKI",
  "ROBOTY_OGOLNOBUDOWLANE",
  "TRANSPORT_UTYLIZACJA",
  "GK",
  "GLADZIE_TYNKI",
  "MALOWANIE",
  "GLAZURA",
  "PODLOGI",
  "ELEKTRYKA",
  "INSTALACJE_GAZ",
  "HYDRAULIKA",
  "WENTYLACJA",
  "STOLARKA",
  "WYPOSAZENIE",
  "UNKNOWN",
];

export interface ClassificationUnitDistribution {
  unit: string;
  count: number;
  quantity: number;
}

export interface ClassificationCategorySummary {
  id: WgdomCostCategoryId;
  count: number;
  quantity: number;
  unitDistribution: ClassificationUnitDistribution[];
}

export interface ClassificationCoverageDelta {
  classifiedPercentBefore: number;
  classifiedPercentAfter: number;
  coverageDelta: number;
  unknownRowsBefore: number;
  unknownRowsAfter: number;
}

export interface ClassificationSummary {
  totalRows: number;
  classifiedRows: number;
  unknownRows: number;
  classifiedPercent: number;
  unknownPercent: number;
  categories: ClassificationCategorySummary[];
  /** P2-G.1F — wzrost pokrycia dzięki słownikowi branżowemu */
  coverageDelta?: ClassificationCoverageDelta;
}

export interface UnknownClassificationRow {
  lp: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface CatalogTuningHint {
  /** Pełna fraza robocza (do wyświetlenia). */
  phrase: string;
  count: number;
  /** Suma ilości z pozycji UNKNOWN (wpływ na wycenę). */
  impact: number;
}

function parseQuantity(qty: string | undefined | null): number {
  const s = String(qty ?? "").replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function compareLp(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b, "pl");
}

function emptyCategory(id: WgdomCostCategoryId): ClassificationCategorySummary {
  return { id, count: 0, quantity: 0, unitDistribution: [] };
}

function unitLabel(raw: string | undefined): string {
  return normalizeWgdomCostUnit(raw) ?? (raw?.trim() || "?");
}

/** Podsumowanie klasyfikacji pozycji ATH → kategorie WGDOM. */
export function buildClassificationSummary(
  rows: TenderCatalogQuantityLine[],
): ClassificationSummary {
  const buckets = new Map<WgdomCostCategoryId, ClassificationCategorySummary>();
  for (const id of CLASSIFICATION_CATEGORY_ORDER) {
    buckets.set(id, emptyCategory(id));
  }
  const unitMaps = new Map<WgdomCostCategoryId, Map<string, { count: number; quantity: number }>>();

  let classifiedRows = 0;
  let unknownRows = 0;

  for (const row of rows) {
    const qty = parseQuantity(row.quantity);
    if (qty <= 0) continue;

    const cat = classifyAthLineCategory(row.description, row.unit);
    const bucket = buckets.get(cat)!;
    bucket.count += 1;
    bucket.quantity += qty;

    if (cat === "UNKNOWN") unknownRows += 1;
    else classifiedRows += 1;

    const u = unitLabel(row.unit);
    if (!unitMaps.has(cat)) unitMaps.set(cat, new Map());
    const um = unitMaps.get(cat)!;
    const prev = um.get(u) ?? { count: 0, quantity: 0 };
    um.set(u, { count: prev.count + 1, quantity: prev.quantity + qty });
  }

  for (const [cat, um] of unitMaps) {
    buckets.get(cat)!.unitDistribution = [...um.entries()]
      .map(([unit, v]) => ({ unit, count: v.count, quantity: v.quantity }))
      .sort((a, b) => b.quantity - a.quantity || b.count - a.count);
  }

  const totalRows = classifiedRows + unknownRows;
  const classifiedPercent = totalRows > 0 ? (classifiedRows / totalRows) * 100 : 0;
  const unknownPercent = totalRows > 0 ? (unknownRows / totalRows) * 100 : 0;

  let classifiedBefore = 0;
  let unknownBefore = 0;
  for (const row of rows) {
    const qty = parseQuantity(row.quantity);
    if (qty <= 0) continue;
    const catBefore = classifyAthLineCategoryWithoutDictionary(row.description, row.unit);
    if (catBefore === "UNKNOWN") unknownBefore += 1;
    else classifiedBefore += 1;
  }
  const classifiedPercentBefore = totalRows > 0 ? (classifiedBefore / totalRows) * 100 : 0;
  const coverageDeltaValue = classifiedPercent - classifiedPercentBefore;

  return {
    totalRows,
    classifiedRows,
    unknownRows,
    classifiedPercent,
    unknownPercent,
    categories: CLASSIFICATION_CATEGORY_ORDER.map((id) => buckets.get(id)!),
    coverageDelta: coverageDeltaValue > 0.05 ? {
      classifiedPercentBefore,
      classifiedPercentAfter: classifiedPercent,
      coverageDelta: coverageDeltaValue,
      unknownRowsBefore: unknownBefore,
      unknownRowsAfter: unknownRows,
    } : undefined,
  };
}

/** Pozycje UNKNOWN — sort: największa ilość, potem LP. */
export function buildUnknownRows(
  rows: TenderCatalogQuantityLine[],
): UnknownClassificationRow[] {
  const unknown: UnknownClassificationRow[] = [];
  for (const row of rows) {
    if (classifyAthLineCategory(row.description, row.unit) !== "UNKNOWN") continue;
    unknown.push({
      lp: row.lp,
      description: row.description,
      unit: row.unit,
      quantity: parseQuantity(row.quantity),
    });
  }
  unknown.sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return compareLp(a.lp, b.lp);
  });
  return unknown;
}

function displayPhraseFromDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 88) return trimmed;
  const cut = trimmed.slice(0, 88);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Top nieznane frazy z opisów UNKNOWN — sort: wpływ (suma ilości × liczba wystąpień). */
export function buildUnknownPhraseHints(
  unknownRows: UnknownClassificationRow[],
  limit = 8,
): CatalogTuningHint[] {
  const buckets = new Map<string, { phrase: string; count: number; impact: number }>();

  for (const row of unknownRows) {
    const key = phraseFromAthDescription(row.description);
    if (!key || key.length < 6) continue;
    const prev = buckets.get(key);
    if (prev) {
      prev.count += 1;
      prev.impact += row.quantity;
    } else {
      buckets.set(key, {
        phrase: displayPhraseFromDescription(row.description),
        count: 1,
        impact: row.quantity,
      });
    }
  }

  return [...buckets.values()]
    .map(({ phrase, count, impact }) => ({
      phrase,
      count,
      impact: Math.round(impact * 100) / 100,
    }))
    .sort((a, b) => b.impact * b.count - a.impact * a.count || b.count - a.count || a.phrase.localeCompare(b.phrase, "pl"))
    .slice(0, limit);
}

/** @deprecated alias — P2-G.2D używa fraz zamiast tokenów. */
export function buildCatalogTuningHints(
  unknownRows: UnknownClassificationRow[],
  limit = 8,
): CatalogTuningHint[] {
  return buildUnknownPhraseHints(unknownRows, limit);
}
