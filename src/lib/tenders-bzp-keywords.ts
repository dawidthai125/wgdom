/** Słowa kluczowe scoringu przetargów — synchronizuj z supabase/functions/.../index.tsx (BZP_*). */

/** Czynność: remont, modernizacja, wykończenie… */
export const TENDER_ACTION_KEYWORDS = [
  "remont",
  "moderniz",
  "termomoderniz",
  "wykończ",
  "wykończen",
  "przebudow",
  "renowac",
  "adaptacj",
  "rehabilit",
  "odśwież",
  "termo",
  "konserwac",
  "napraw",
  "odnow",
] as const;

/** Zakres: mieszkania, biura, budynki, uczelnie, pomieszczenia… */
export const TENDER_SCOPE_KEYWORDS = [
  "mieszkan",
  "lokalu",
  "lokal ",
  "lokali",
  "lokale",
  "biur",
  "biurow",
  "biurowc",
  "pomieszcze",
  "pomieszczen",
  "budynk",
  "klatk",
  "elewac",
  "dach",
  "toalet",
  "sanitar",
  "łazienk",
  "lazienk",
  "kuchni",
  "wind",
  "dźwig",
  "dzwig",
  "piętr",
  "pietr",
  "uniwersytet",
  "uczelni",
  "szpital",
  "szkoł",
  "przedszk",
  "kamienic",
  "bibliotek",
  "muzeum",
  "urząd",
  "urzedu",
  "pensjonat",
  "hotel",
  "osiedl",
  "centrum handlow",
  "magazyn",
  "sala ",
  "sal ",
  "korytarz",
  "garaż",
  "garaz",
  "piwnic",
  "strych",
  "stolark",
  "okien",
  "okno",
  "drzwi",
  "posadzk",
  "sufit",
  "tynk",
  "malow",
  "instalac",
  "grzewcz",
  "wentylac",
  "klimatyzac",
  "pustostan",
  "internat",
  "akademik",
  "obiekt budowl",
  "nieruchomo",
  "fabryk",
  "hali produkcy",
  "administracyj",
  "domu studenck",
  "dom studenck",
  "izolac",
  "monta",
] as const;

/** Wykluczenia: drogi, sieci, nowa zabudowa, infrastruktura liniowa. */
export const TENDER_EXCLUDE_KEYWORDS = [
  "drogi wojewódzk",
  "nawierzchni jezdni",
  "chodników drogow",
  "przebudowa drogi",
  "remont drogi",
  "remont dróg",
  "remont nawierzchni",
  "rozbudowa skrzyżowania",
  "budowa drogi",
  "budowa dróg",
  "nawierzchni bitum",
  "utwardzenie placu drogowego",
  "kanalizacji deszczowej",
  "wodociąg",
  "gazociąg",
  "most ",
  "wiadukt",
  "prom ",
  "linii kolejow",
  "budowa budynk",
  "budowa obiektu",
  "budowa nowego",
  "budowa hali magazyn",
  "budowa budynku",
  "wykonanie obiektu budowl",
  "roboty budowlane polegające na budowie",
  "roboty ziemne",
  "wycinka drzew",
  "boisko sportowe",
] as const;

/** Luźniejsze hinty dla kluczowych zamawiających Wrocławia (gdy brak słowa „remont” w tytule). */
export const TENDER_PRIORITY_BUILDING_HINTS = [
  ...TENDER_ACTION_KEYWORDS,
  ...TENDER_SCOPE_KEYWORDS,
] as readonly string[];

const RENOVATION_SIGNALS = [
  "remont", "moderniz", "przebudow", "termomoderniz", "adaptacj", "rozbudow", "renowac", "wykończ", "wykończen",
];

/** „Budowa” bez sygnału remontu/modernizacji = nowa zabudowa — odrzucamy. */
export function isNewConstructionTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (!t.includes("budowa")) return false;
  return !RENOVATION_SIGNALS.some((s) => t.includes(s));
}

export function matchTenderKeywords(title: string): {
  actionKeywords: string[];
  scopeKeywords: string[];
  allKeywords: string[];
} {
  const t = title.toLowerCase();
  const actionKeywords = TENDER_ACTION_KEYWORDS.filter((kw) => t.includes(kw));
  const scopeKeywords = TENDER_SCOPE_KEYWORDS.filter((kw) => t.includes(kw));
  return { actionKeywords, scopeKeywords, allKeywords: [...actionKeywords, ...scopeKeywords] };
}

export function isExcludedTenderTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (TENDER_EXCLUDE_KEYWORDS.some((ex) => t.includes(ex))) return true;
  return isNewConstructionTitle(t);
}
