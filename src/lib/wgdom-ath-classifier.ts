/**
 * P2-G.1A — klasyfikacja pozycji ATH → kategoria WGDOM Cost Catalog.
 */

import type { WgdomCostCategoryId } from "@/lib/wgdom-cost-catalog";
import {
  defaultWgdomCostCatalog,
  getCatalogClassificationRules,
  normalizeWgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import { matchConstructionDictionary } from "@/lib/wgdom-construction-dictionary";
import { matchWgdomPhraseRules } from "@/lib/wgdom-phrase-rules";
import {
  ensureUserClassificationDictionaryCacheHydrated,
  matchUserClassificationDictionary,
} from "@/lib/wgdom-user-classification-dictionary";

/** Normalizacja PL znaków — wzorzec jak company-experience-discovery.ts fold(). */
export function foldPolishText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z");
}

function keywordMatches(haystack: string, keyword: string): boolean {
  const k = foldPolishText(keyword.trim());
  if (!k) return false;
  if (k.includes(".*")) {
    try {
      return new RegExp(k, "i").test(haystack);
    } catch {
      return haystack.includes(k.replace(/\.\*/g, ""));
    }
  }
  return haystack.includes(k);
}

/** Unit boost — wskazówka kategorii z j.m. (np. rbh nie determinuje kategorii sam). */
function unitCategoryHint(unit: string | undefined): WgdomCostCategoryId | null {
  const norm = normalizeWgdomCostUnit(unit);
  if (norm === "rbh") return null;
  return null;
}

/**
 * Klasyfikacja bez słownika branżowego P2-G.1F — do pomiaru coverageDelta.
 */
export function classifyAthLineCategoryWithoutDictionary(
  description: string,
  unit?: string,
): WgdomCostCategoryId {
  return classifyAthLineCategoryInternal(description, unit, false);
}

/**
 * Klasyfikuje opis pozycji ATH do kategorii WGDOM.
 * Kolejność: katalog seed → user dict → phrase rules → słownik branżowy → STOLARKA.
 */
export function classifyAthLineCategory(
  description: string,
  unit?: string,
): WgdomCostCategoryId {
  return classifyAthLineCategoryInternal(description, unit, true);
}

function classifyAthLineCategoryInternal(
  description: string,
  unit: string | undefined,
  useDictionary: boolean,
): WgdomCostCategoryId {
  ensureUserClassificationDictionaryCacheHydrated();
  const hay = foldPolishText(description || "");
  if (!hay.trim()) return "UNKNOWN";

  const unitHint = unitCategoryHint(unit);
  const rules = getCatalogClassificationRules(defaultWgdomCostCatalog());

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (keywordMatches(hay, kw)) {
        return rule.id;
      }
    }
  }

  const userMatch = matchUserClassificationDictionary(hay);
  if (userMatch) return userMatch;

  const phraseMatch = matchWgdomPhraseRules(hay);
  if (phraseMatch) return phraseMatch;

  if (useDictionary) {
    const dictMatch = matchConstructionDictionary(hay);
    if (dictMatch) return dictMatch;
  }

  const u = foldPolishText(unit || "");
  if (/drzwi|okno|osciezn/.test(hay) || (u === "szt" && /montaz/.test(hay))) {
    return "STOLARKA";
  }

  if (unitHint) return unitHint;

  return "UNKNOWN";
}
