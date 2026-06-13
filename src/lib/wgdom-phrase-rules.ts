/**
 * P2-G.2D — WGDOM Phrase Rules (klasyfikacja fraz roboczych ATH).
 * Wzorce po foldPolishText(); bez stemmera; najdłuższa fraza pierwsza.
 */

import type { WgdomCostCategoryId } from "@/lib/wgdom-cost-catalog";

export type WgdomPhraseMatchMode = "contains" | "prefix";

export interface WgdomPhraseRule {
  /** Wzorzec po foldPolishText (małe litery, bez PL znaków). */
  pattern: string;
  category: WgdomCostCategoryId;
  match: WgdomPhraseMatchMode;
}

/** Reguły sortowane malejąco po długości pattern — budowane przy pierwszym dopasowaniu. */
let _sortedRules: WgdomPhraseRule[] | null = null;

function foldHay(s: string): string {
  return s
    .toLowerCase()
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

export function resetWgdomPhraseRulesCache(): void {
  _sortedRules = null;
}

function sortedPhraseRules(): WgdomPhraseRule[] {
  if (_sortedRules) return _sortedRules;
  _sortedRules = [...WGDOM_PHRASE_RULES].sort((a, b) => b.pattern.length - a.pattern.length);
  return _sortedRules;
}

/** Czy wzorzec pasuje do znormalizowanego opisu (hay już po foldPolishText). */
export function wgdomPhrasePatternMatches(
  hay: string,
  pattern: string,
  mode: WgdomPhraseMatchMode,
): boolean {
  if (!hay || !pattern) return false;
  if (mode === "contains") return hay.includes(pattern);
  const idx = hay.indexOf(pattern);
  if (idx === -1) return false;
  if (idx > 0 && /[a-z0-9]/.test(hay[idx - 1]!)) return false;
  return true;
}

/** Pierwsza pasująca reguła (najdłuższa fraza) — do testów i inspektora. */
export function findWgdomPhraseRule(hay: string): WgdomPhraseRule | null {
  const folded = /[ąćęłńóśźż]/i.test(hay) ? foldHay(hay) : hay;
  if (!folded.trim()) return null;
  for (const rule of sortedPhraseRules()) {
    if (wgdomPhrasePatternMatches(folded, rule.pattern, rule.match)) return rule;
  }
  return null;
}

/**
 * Dopasowanie reguły frazowej → kategoria (null gdy brak lub UNKNOWN).
 * Używane w pipeline klasyfikatora — reguły UNKNOWN nie blokują dalszych warstw.
 */
export function matchWgdomPhraseRules(hay: string): WgdomCostCategoryId | null {
  const rule = findWgdomPhraseRule(hay);
  if (!rule || rule.category === "UNKNOWN") return null;
  return rule.category;
}

export function countWgdomPhraseRules(): number {
  return WGDOM_PHRASE_RULES.length;
}

/**
 * Wysokiej wartości frazy robocze (~50 reguł MVP).
 * prefix — obsługa odmian PL (np. katownika aluminiowego ← katownik aluminiow).
 */
export const WGDOM_PHRASE_RULES: WgdomPhraseRule[] = [
  // —— GK / wykończenie ścian (narożniki, gładzie) ——
  { pattern: "narozniki z katownika aluminiow", category: "GK", match: "prefix" },
  { pattern: "montaz naroznikow z katownika", category: "GK", match: "prefix" },
  { pattern: "wzmocnienie naroznikow katownikiem", category: "GK", match: "prefix" },
  { pattern: "narozniki aluminiowe", category: "GK", match: "prefix" },
  { pattern: "narozniki tynkarskie", category: "GK", match: "prefix" },
  { pattern: "listwy tynkarskie", category: "GK", match: "contains" },
  { pattern: "listwa tynkarska", category: "GK", match: "contains" },
  { pattern: "montaz listwy tynkarskiej", category: "GK", match: "prefix" },
  { pattern: "obrobka naroznikow", category: "GK", match: "contains" },
  { pattern: "wzmocnienie naroznikow", category: "GK", match: "contains" },
  { pattern: "szlifowanie gladzi", category: "GK", match: "prefix" },
  { pattern: "szpachlowanie scian", category: "GK", match: "prefix" },
  { pattern: "szpachlowanie sufitow", category: "GK", match: "prefix" },
  { pattern: "gladzie gipsowe", category: "GK", match: "prefix" },
  { pattern: "gladz gipsowa", category: "GK", match: "prefix" },
  { pattern: "tynk wapienny", category: "GK", match: "contains" },
  { pattern: "tynk gipsowy", category: "GK", match: "contains" },
  { pattern: "montaz profili cd", category: "GK", match: "contains" },
  { pattern: "zabudowa sciany gk", category: "GK", match: "prefix" },
  { pattern: "zabudowa gk", category: "GK", match: "contains" },
  { pattern: "sufit podwieszany", category: "GK", match: "contains" },
  { pattern: "montaz plyty gk", category: "GK", match: "prefix" },
  { pattern: "regips sciany", category: "GK", match: "contains" },

  // —— Wyposażenie pomocnicze (UNKNOWN do P2-G.2C — detekcja frazy, bez kubełka) ——
  { pattern: "przykrecanie tabliczek opisow", category: "UNKNOWN", match: "prefix" },
  { pattern: "montaz tabliczek opisow", category: "UNKNOWN", match: "prefix" },
  { pattern: "tabliczki opisowe", category: "UNKNOWN", match: "contains" },
  { pattern: "oznaczenie pomieszczen", category: "UNKNOWN", match: "prefix" },
  { pattern: "oznaczenia pomieszczen", category: "UNKNOWN", match: "prefix" },

  // —— Elektryka ——
  { pattern: "pomiar skutecznosci zerowania", category: "ELEKTRYKA", match: "contains" },
  { pattern: "pierwszy pomiar skutecznosci", category: "ELEKTRYKA", match: "prefix" },
  { pattern: "pomiary elektryczne", category: "ELEKTRYKA", match: "contains" },
  { pattern: "protokol pomiarowy", category: "ELEKTRYKA", match: "contains" },
  { pattern: "odbior instalacji elektrycznej", category: "ELEKTRYKA", match: "prefix" },
  { pattern: "odbior instalacji", category: "ELEKTRYKA", match: "prefix" },

  // —— Wentylacja ——
  { pattern: "obsadzenie kratek wentylacyjnych", category: "WENTYLACJA", match: "contains" },
  { pattern: "montaz kratek wentylacyjnych", category: "WENTYLACJA", match: "prefix" },
  { pattern: "montaz kratki wentylacyjnej", category: "WENTYLACJA", match: "prefix" },
  { pattern: "kratki wentylacyjne", category: "WENTYLACJA", match: "contains" },
  { pattern: "kratka wentylacyjna", category: "WENTYLACJA", match: "contains" },

  // —— Transport / utylizacja ——
  { pattern: "zagospodarowanie odpadow", category: "TRANSPORT_UTYLIZACJA", match: "prefix" },
  { pattern: "wywiezienie gruzu", category: "TRANSPORT_UTYLIZACJA", match: "contains" },
  { pattern: "wywoz gruzu", category: "TRANSPORT_UTYLIZACJA", match: "contains" },
  { pattern: "transport gruzu", category: "TRANSPORT_UTYLIZACJA", match: "contains" },
  { pattern: "utylizacja gruzu", category: "TRANSPORT_UTYLIZACJA", match: "contains" },
  { pattern: "kontener na gruz", category: "TRANSPORT_UTYLIZACJA", match: "contains" },

  // —— Malowanie ——
  { pattern: "malowanie scian", category: "MALOWANIE", match: "contains" },
  { pattern: "malowanie sufitow", category: "MALOWANIE", match: "contains" },
  { pattern: "tapetowanie scian", category: "MALOWANIE", match: "contains" },
  { pattern: "gruntowanie scian", category: "MALOWANIE", match: "prefix" },

  // —— Glazura ——
  { pattern: "ukladanie plytek", category: "GLAZURA", match: "contains" },
  { pattern: "ukladanie glazury", category: "GLAZURA", match: "contains" },
  { pattern: "fugowanie plytek", category: "GLAZURA", match: "contains" },
  { pattern: "hydroizolacja pod plytki", category: "GLAZURA", match: "prefix" },

  // —— Podłogi ——
  { pattern: "ukladanie paneli podlogowych", category: "PODLOGI", match: "prefix" },
  { pattern: "montaz cokolika", category: "PODLOGI", match: "contains" },
  { pattern: "wylewka samopoziomujaca", category: "PODLOGI", match: "contains" },
  { pattern: "licowanie posadzki", category: "PODLOGI", match: "contains" },

  // —— Rozbiórki ——
  { pattern: "demontaz posadzki", category: "ROZBIORKI", match: "contains" },
  { pattern: "skuwanie plytek", category: "ROZBIORKI", match: "contains" },
  { pattern: "skuwanie tynku", category: "ROZBIORKI", match: "contains" },
  { pattern: "rozbiorka sciany dzialowej", category: "ROZBIORKI", match: "prefix" },

  // —— Stolarka ——
  { pattern: "montaz oscieznic", category: "STOLARKA", match: "contains" },
  { pattern: "wymiana drzwi", category: "STOLARKA", match: "contains" },
  { pattern: "wymiana okien", category: "STOLARKA", match: "contains" },
  { pattern: "montaz parapetu", category: "STOLARKA", match: "contains" },

  // —— Hydraulika ——
  { pattern: "montaz baterii", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "instalacja wod-kan", category: "HYDRAULIKA", match: "contains" },
  { pattern: "montaz umywalki", category: "HYDRAULIKA", match: "contains" },
  { pattern: "montaz miski ustepowej", category: "HYDRAULIKA", match: "prefix" },
];

export const WGDOM_PHRASE_RULES_VERSION = "2D.0";