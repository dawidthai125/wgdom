/**
 * P2 Construction Knowledge Engine — słownik branżowy (budowlanka).
 */

export const CONSTRUCTION_KEYWORDS = {
  wykończeniowe: [
    "malowanie",
    "malowanie ścian",
    "gładzie",
    "gladzie",
    "szpachlowanie",
    "tapetowanie",
    "sufity podwieszane",
    "sufit podwieszany",
    "płytki",
    "plytki",
    "gres",
    "glazura",
    "tynkowanie",
    "tynki",
    "posadzka",
    "wylewka",
    "listwy",
    "fugowanie",
    "roboty wykończeniowe",
    "roboty wykonczeniowe",
    "wykończeniowe",
    "wykonczeniowe",
    "panele ścienne",
    "panele scienne",
  ],
  sanitarne: [
    "kanalizacja",
    "kanalizacji",
    "wodociąg",
    "wodociag",
    "instalacja sanitarna",
    "instalacje sanitarne",
    "instalacja wod-kan",
    "cwu",
    "c.o.",
    " co ",
    "węzeł cieplny",
    "wezel cieplny",
    "studnia",
    "studzienka",
    "przyłącze",
    "przylacze",
    "rury pe",
    "rura pe",
    "hydrant",
    "deszczówka",
    "deszczowka",
    "separator",
    "przepompownia",
    "wod-kan",
    "sanitarn",
  ],
  elektryczne: [
    "instalacja elektryczna",
    "instalacje elektryczne",
    "rozdzielnia",
    "rozdzielnica",
    "okablowanie",
    "oświetlenie",
    "oswietlenie",
    "kabel",
    "przewód",
    "przewod",
    "gniazdo",
    "oprawa",
    "tablica rozdzielcza",
    "instalacja niskiego napięcia",
    "elektryczn",
  ],
  drogowe: [
    "kostka",
    "kostki",
    "nawierzchnia",
    "nawierzchni",
    "chodnik",
    "jezdnia",
    "jezdni",
    "asfalt",
    "bruk",
    "krawężnik",
    "kraweznik",
    "utwardzenie",
    "warstwa ścieralna",
    "warstwa scieralna",
    "odtworzenie nawierzchni",
    "roboty drogowe",
  ],
  dachowe: [
    "dach",
    "dachu",
    "dachów",
    "pokrycie dachowe",
    "pokrycia dachowe",
    "rynny",
    "rynna",
    "obróbki blacharskie",
    "obrobki blacharskie",
    "blachodachówka",
    "papa",
    "więźba",
    "wiezba",
    "izolacja dachu",
  ],
} as const;

export type ConstructionCategoryId = keyof typeof CONSTRUCTION_KEYWORDS;

export const CONSTRUCTION_CATEGORY_LABELS: Record<ConstructionCategoryId, string> = {
  wykończeniowe: "Roboty wykończeniowe",
  sanitarne: "Sanitarne",
  elektryczne: "Elektryczne",
  drogowe: "Drogowe",
  dachowe: "Dachowe",
};

export const CONSTRUCTION_CATEGORY_ORDER: ConstructionCategoryId[] = [
  "wykończeniowe",
  "sanitarne",
  "elektryczne",
  "drogowe",
  "dachowe",
];

/** Liczba unikalnych fraz kluczowych w słowniku. */
export function countConstructionKeywords(): number {
  const seen = new Set<string>();
  for (const id of CONSTRUCTION_CATEGORY_ORDER) {
    for (const kw of CONSTRUCTION_KEYWORDS[id]) {
      seen.add(kw.toLowerCase());
    }
  }
  return seen.size;
}

export function foldConstructionText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Dopasowanie słów kluczowych w tekście (zwraca trafione frazy). */
export function matchConstructionKeywordsInText(text: string): {
  categoryId: ConstructionCategoryId;
  keyword: string;
}[] {
  const hay = foldConstructionText(text);
  if (!hay || hay.length < 2) return [];

  const hits: { categoryId: ConstructionCategoryId; keyword: string }[] = [];
  for (const categoryId of CONSTRUCTION_CATEGORY_ORDER) {
    for (const keyword of CONSTRUCTION_KEYWORDS[categoryId]) {
      const foldedKw = foldConstructionText(keyword);
      if (!foldedKw) continue;
      if (hay.includes(foldedKw)) {
        hits.push({ categoryId, keyword });
      }
    }
  }
  return hits;
}
