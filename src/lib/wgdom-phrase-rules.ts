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
  // —— GLADZIE_TYNKI — wykończenie ścian (narożniki, gładzie) ——
  { pattern: "narozniki z katownika aluminiow", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "montaz naroznikow z katownika", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "wzmocnienie naroznikow katownikiem", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "narozniki aluminiowe", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "narozniki tynkarskie", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "listwy tynkarskie", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "listwa tynkarska", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "montaz listwy tynkarskiej", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "obrobka naroznikow", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "wzmocnienie naroznikow", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "szlifowanie gladzi", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "szpachlowanie scian", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "szpachlowanie sufitow", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "gladzie gipsowe", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "gladz gipsowa", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "tynk wapienny", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "tynk gipsowy", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "tynk maszynowy", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "tynk reczny", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "tynkowanie scian", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "wykonanie tynku", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "gladzenie scian", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "wykonanie gladzi", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "izolacja termiczna", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "izolacja sciany", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "izolacja scian", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "welna mineralna", category: "GLADZIE_TYNKI", match: "contains" },
  { pattern: "styropian sciany", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "ocieplenie sciany", category: "GLADZIE_TYNKI", match: "prefix" },
  { pattern: "ocieplenie scian", category: "GLADZIE_TYNKI", match: "prefix" },

  // —— GK — zabudowa sucha ——
  { pattern: "montaz profili cd", category: "GK", match: "contains" },
  { pattern: "zabudowa sciany gk", category: "GK", match: "prefix" },
  { pattern: "zabudowa gk", category: "GK", match: "contains" },
  { pattern: "sufit podwieszany", category: "GK", match: "contains" },
  { pattern: "montaz plyty gk", category: "GK", match: "prefix" },
  { pattern: "regips sciany", category: "GK", match: "contains" },

  // —— Hydraulika / wod-kan (INSTALACJE_WODKAN → HYDRAULIKA) ——
  { pattern: "montaz brodzikow natryskowych", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana brodzikow natryskowych", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "montaz kabiny prysznicowej", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana kabiny prysznicowej", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana podejscia doplywowego do zaworu czerpalnego", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana podejscia doplywowego", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana podejscia pvc", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "rurociagi pp ciepla i zimna woda", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "rurociagi z rur polipropylenowych", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "izolacja thermaflex", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana ustepu kompakt", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana ustepu z miska porcelanowa", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana ustepu z miska", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana zlewozmywaka", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "wymiana baterii", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "montaz baterii", category: "HYDRAULIKA", match: "prefix" },
  { pattern: "instalacja wod-kan", category: "HYDRAULIKA", match: "contains" },
  { pattern: "montaz umywalki", category: "HYDRAULIKA", match: "contains" },
  { pattern: "montaz miski ustepowej", category: "HYDRAULIKA", match: "prefix" },

  // —— Instalacje gazowe ——
  { pattern: "przylacze elastyczne metalowe", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "przylacze elastyczne", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "rurociagi gazowe miedziane", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "rurociagi w instalacjach gazowych", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "wymiana zaworu gazowego", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "przylacze do kuchenki gazowej", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "podejscie do gazomierza", category: "INSTALACJE_GAZ", match: "prefix" },
  { pattern: "instalacja gazowa", category: "INSTALACJE_GAZ", match: "contains" },
  { pattern: "instalacje gazowe", category: "INSTALACJE_GAZ", match: "contains" },

  // —— Instalacje centralnego ogrzewania ——
  { pattern: "wymiana zaworu grzejnikowego", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "wymiana zaworu przelotowego", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "montaz glowicy termostatycznej", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "montaz zaworow termostatycznych", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "spuszczenie wody z ukladu c.o.", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "spuszczenie wody z ukladu co", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "montaz grzejnika drabinkowego", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "grzejniki konwektorowe", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "grzejnik konwektorowy", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "wymiana grzejnika", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "montaz grzejnika", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "odpowietrzenie instalacji c.o.", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "odpowietrzenie instalacji co", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "regulacja instalacji centralnego ogrzewania", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "regulacja instalacji c.o.", category: "INSTALACJE_CO", match: "prefix" },
  { pattern: "instalacja c.o.", category: "INSTALACJE_CO", match: "contains" },
  { pattern: "centralne ogrzewanie", category: "INSTALACJE_CO", match: "contains" },

  // —— WYPOSAZENIE pomocnicze + AGD ——
  { pattern: "wymiana kuchni gazowej", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "montaz kuchni gazowej", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "przykrecanie tabliczek opisow", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "montaz tabliczek opisow", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "tabliczki opisowe", category: "WYPOSAZENIE", match: "contains" },
  { pattern: "etykiety pomieszczen", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "etykieta pomieszczenia", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "oznaczenie pomieszczen", category: "WYPOSAZENIE", match: "prefix" },
  { pattern: "oznaczenia pomieszczen", category: "WYPOSAZENIE", match: "prefix" },

  // —— Elektryka ——
  { pattern: "demontaz opraw", category: "ELEKTRYKA", match: "contains" },
  { pattern: "demontaz plafonier", category: "ELEKTRYKA", match: "contains" },
  { pattern: "montaz plafonier", category: "ELEKTRYKA", match: "contains" },
  { pattern: "montaz opraw", category: "ELEKTRYKA", match: "contains" },
  { pattern: "wymiana opraw", category: "ELEKTRYKA", match: "contains" },
  { pattern: "oprawy oswietleniowe", category: "ELEKTRYKA", match: "contains" },
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
  { pattern: "ukladanie kostki brukowej", category: "PODLOGI", match: "prefix" },
  { pattern: "ukladanie kostki", category: "PODLOGI", match: "prefix" },
  { pattern: "nawierzchnia brukowa", category: "PODLOGI", match: "contains" },
  { pattern: "podklad pod kostke", category: "PODLOGI", match: "prefix" },
  { pattern: "roboty brukarskie", category: "PODLOGI", match: "contains" },
  { pattern: "ukladanie paneli podlogowych", category: "PODLOGI", match: "prefix" },
  { pattern: "montaz cokolika", category: "PODLOGI", match: "contains" },
  { pattern: "wylewka samopoziomujaca", category: "PODLOGI", match: "contains" },
  { pattern: "licowanie posadzki", category: "PODLOGI", match: "contains" },

  // —— Roboty ogólnobudowlane ——
  { pattern: "roboty przygotowawcze", category: "ROBOTY_OGOLNOBUDOWLANE", match: "contains" },
  { pattern: "przygotowanie stanowiska roboczego", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "zagospodarowanie terenu", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "zagospodarowanie dzialki", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "nasadzenia drzew", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "nasadzenia krzewow", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "wykonanie trawnika", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "pokrycie dachowe", category: "ROBOTY_OGOLNOBUDOWLANE", match: "contains" },
  { pattern: "wymiana pokrycia dachowego", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "remont pokrycia dachowego", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "blachodachowka", category: "ROBOTY_OGOLNOBUDOWLANE", match: "contains" },
  { pattern: "papa termozgrzewalna", category: "ROBOTY_OGOLNOBUDOWLANE", match: "contains" },
  { pattern: "przebicie otworow w scianach", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "przebicie otworow", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "zamurowanie przebic", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },
  { pattern: "zamurowanie otworow", category: "ROBOTY_OGOLNOBUDOWLANE", match: "prefix" },

  // —— Rozbiórki ——
  { pattern: "demontaz drzwi", category: "ROZBIORKI", match: "contains" },
  { pattern: "demontaz okien", category: "ROZBIORKI", match: "contains" },
  { pattern: "demontaz okna", category: "ROZBIORKI", match: "contains" },
  { pattern: "demontaz instalacji elektrycznej", category: "ROZBIORKI", match: "prefix" },
  { pattern: "demontaz instalacji", category: "ROZBIORKI", match: "contains" },
  { pattern: "sciagniecie tapety", category: "ROZBIORKI", match: "contains" },
  { pattern: "wykucie fug", category: "ROZBIORKI", match: "contains" },
  { pattern: "rozborka zabudowy", category: "ROZBIORKI", match: "contains" },
  { pattern: "zerwanie cokolika", category: "ROZBIORKI", match: "contains" },
  { pattern: "uzupelnienie cokolikow", category: "GLAZURA", match: "prefix" },
  { pattern: "demontaz posadzki", category: "ROZBIORKI", match: "contains" },
  { pattern: "skuwanie plytek", category: "ROZBIORKI", match: "contains" },
  { pattern: "skuwanie tynku", category: "ROZBIORKI", match: "contains" },
  { pattern: "rozbiorka sciany dzialowej", category: "ROZBIORKI", match: "prefix" },

  // —— Stolarka ——
  { pattern: "osadzenie okna", category: "STOLARKA", match: "contains" },
  { pattern: "osadzenie okien", category: "STOLARKA", match: "contains" },
  { pattern: "montaz framugi", category: "STOLARKA", match: "contains" },
  { pattern: "montaz framug", category: "STOLARKA", match: "contains" },
  { pattern: "montaz oscieznic", category: "STOLARKA", match: "contains" },
  { pattern: "wymiana drzwi", category: "STOLARKA", match: "contains" },
  { pattern: "wymiana okien", category: "STOLARKA", match: "contains" },
  { pattern: "montaz parapetu", category: "STOLARKA", match: "contains" },

  // —— P3-FIX-B — ATH z audytu live (bezpieczne, wysoka pewność) ——
  { pattern: "montaz listew przysciennych", category: "PODLOGI", match: "prefix" },
  { pattern: "uzupelnienie listew przysciennych", category: "PODLOGI", match: "prefix" },
  { pattern: "listew przysciennych", category: "PODLOGI", match: "contains" },
  { pattern: "odgrzybianie scian", category: "MALOWANIE", match: "prefix" },
  { pattern: "zalozenie na nowym miejscu klam", category: "STOLARKA", match: "prefix" },
  { pattern: "wymiana na nowym miejscu zamk", category: "STOLARKA", match: "prefix" },
  { pattern: "nawietrzak", category: "WENTYLACJA", match: "contains" },
  { pattern: "rozebranie scianki", category: "ROZBIORKI", match: "prefix" },
  { pattern: "numeru porzadkowego lokalu", category: "WYPOSAZENIE", match: "contains" },
  { pattern: "roboty branzy budowlanej", category: "ROBOTY_OGOLNOBUDOWLANE", match: "contains" },
];

export const WGDOM_PHRASE_RULES_VERSION = "3.3";