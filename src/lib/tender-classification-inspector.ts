/**
 * P2-G.1E — Classification Inspector: podsumowanie klasyfikacji ATH, UNKNOWN, hinty katalogu.
 * Tylko analiza / UX — bez zmian w kalkulatorze wyceny.
 */

import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import {
  defaultWgdomCostCatalog,
  getCatalogClassificationRules,
  normalizeWgdomCostUnit,
  type WgdomCostCategoryId,
} from "@/lib/wgdom-cost-catalog";
import { classifyAthLineCategory, classifyAthLineCategoryWithoutDictionary, foldPolishText } from "@/lib/wgdom-ath-classifier";
import { getConstructionDictionaryRules } from "@/lib/wgdom-construction-dictionary";

export const CLASSIFICATION_CATEGORY_ORDER: WgdomCostCategoryId[] = [
  "MALOWANIE",
  "GK",
  "GLAZURA",
  "PODLOGI",
  "ELEKTRYKA",
  "HYDRAULIKA",
  "ROZBIORKI",
  "STOLARKA",
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
  word: string;
  count: number;
}

const STOP_WORDS = new Set([
  "oraz", "przy", "bez", "nad", "pod", "przez", "dla", "jak", "tylko", "lub",
  "or", "na", "do", "ze", "za", "po", "od", "ku", "u", "w", "z", "i", "o", "a",
  "robot", "roboty", "wykon", "wykonanie", "montaz", "demontaz", "material",
  "materialy", "prace", "prac", "budowl", "wewnetrz", "zewnetrz", "lacznie",
]);

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

function tokenizeDescription(desc: string): string[] {
  return foldPolishText(desc)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

function buildKnownKeywordTokens(): Set<string> {
  const rules = getCatalogClassificationRules(defaultWgdomCostCatalog());
  const dictRules = getConstructionDictionaryRules();
  const set = new Set<string>();
  for (const rule of [...rules, ...dictRules]) {
    for (const kw of rule.keywords) {
      const folded = foldPolishText(kw);
      set.add(folded);
      for (const part of folded.split(/[^a-z0-9]+/)) {
        if (part.length >= 3) set.add(part);
      }
    }
  }
  return set;
}

function isKnownToken(token: string, known: Set<string>): boolean {
  if (known.has(token)) return true;
  for (const k of known) {
    if (k.length >= 4 && (token.includes(k) || k.includes(token))) return true;
  }
  return false;
}

/** Top słowa z opisów UNKNOWN — sugestie rozbudowy katalogu / klasyfikatora. */
export function buildCatalogTuningHints(
  unknownRows: UnknownClassificationRow[],
  limit = 8,
): CatalogTuningHint[] {
  const known = buildKnownKeywordTokens();
  const counts = new Map<string, number>();

  for (const row of unknownRows) {
    for (const token of tokenizeDescription(row.description)) {
      if (isKnownToken(token, known)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "pl"))
    .slice(0, limit);
}
