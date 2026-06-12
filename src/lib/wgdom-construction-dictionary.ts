/**
 * P2-G.1F — WGDOM Construction Dictionary.
 * Słownictwo branżowe (synonimy, odmiany) dla klasyfikatora ATH — bez cen, bez katalogu kosztów.
 * Źródła: KB.pl, słowniki budowlane, poradniki remontowe, UNKNOWN z przetargów TBS/WM.
 */

import type { WgdomCostCategoryId } from "@/lib/wgdom-cost-catalog";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";

type DictCategory = Exclude<WgdomCostCategoryId, "UNKNOWN">;

/** Słowa kluczowe per kategoria — zapisane po foldPolishText (porównanie substring). */
export const WGDOM_CONSTRUCTION_DICTIONARY: Record<DictCategory, readonly string[]> = {
  MALOWANIE: [
    "lamperia", "lamperie", "lamperii", "lamperie scienne", "malarskie", "malarska", "malarski",
    "powloka", "powloki", "powloka malarska", "emulsyjna", "emulsyjne", "emulsyjny",
    "lateksowa", "lateksowe", "lateksowy", "akrylowa", "akrylowe", "akrylowy",
    "silikonowa farba", "natryskowa", "natryskowe", "malowanie natryskowe",
    "farba scienna", "farba emulsyjna", "farba lateksowa", "farba akrylowa",
    "grunt silikonowy", "grunt gleboki", "podklad pod farbe", "podklad malarski",
    "wiazka malarska", "tynk dekoracyjny", "struktura tynkowa", "barwnik",
    "lakierobejc", "bejcowanie scian", "renowacja powloki", "odswiezenie malowania",
    "malowanie scian", "malowanie sufitow", "malowanie drzwi", "malowanie grzebieni",
    "tapetowanie scian", "tapeta scienna", "tapeta winylowa", "tapeta flizelinowa",
    "szablony malarskie", "maskowanie powierzchni", "zabezpieczenie folia malarska",
    "impregnacja scian", "impregnacja drewna malarska", "barwienie drewna",
    "malowanie radiatorow", "malowanie parapetow", "malowanie listew",
    "powloka ochronna", "powloka antykorozyjna", "emalia olejna", "emalia alkidowa",
    "farba do metalu", "farba podlogowa epoksydowa", "malowanie posadzki",
  ],
  GK: [
    "szlichty", "szlicht", "szlichta cementowa",
    "gladz gipsowa", "gladz startowa", "gladz finish", "gladz wykonczeniowa",
    "masa szpachlowa", "masa gipsowa", "szpachlowanie", "szpachlowanie scian",
    "regips", "plyta g-k", "plyta gk", "plyta kartonowa", "plyta kartonowo gipsowa",
    "profil cd", "profil scienny", "profil sufitowy", "katownik scienny", "katownik aluminiowy",
    "sufit podwieszany", "zabudowa gk", "sciana dzialowa gk", "sciana dzialowa",
    "rygiel scienny", "wzmocnienie naroznikow", "tasmy spoinowe", "siatka szklana",
    "tynk gipsowy", "tynk wapienny", "tynk cementowo wapienny", "wyrównanie scian",
    "wyrownanie scian", "wyrownanie sciany", "obrobka naroznikow", "listwa scienna gk",
    "wypelnienie szczelin", "szpachlowka", "gips szlifierski", "gips budowlany",
    "montaz profili cd", "montaz plyty gk", "obudowa rur gk", "obudowa instalacji gk",
    "sufit kasetonowy", "sufit armstrong", "wklad sufitowy", "panele sufitowe",
    "zabudowa komina gk", "zabudowa wnęki", "zabudowa wnęki gk", "wzmocnienie otworu gk",
    "naprawa tynku", "uzupelnienie tynku", "skuwanie tynku lekki", "grunto scian gk",
  ],
  GLAZURA: [
    "fugowanie", "fuga", "fugi", "spoina", "spoiny", "klinkier", "gres", "gres porcelanowy",
    "mozaika", "mozaika szklana", "obklad scienny", "obklad podlogowy", "obklad ceramiczny",
    "plytki scienne", "plytki podlogowe", "plytka scienna", "plytka podlogowa",
    "glazura scienna", "cokol ceramiczny", "cokol kafelkowy", "hydroizolacja pod plytki",
    "hydroizolacja pod płytki", "klej do plytek", "zaprawa fugowa", "zaprawa klejowa",
    "ukladanie plytek", "ukladanie glazury", "ukladanie kafelkow", "ukladanie gresu",
    "ciecie plytek", "wiercenie w plytkach", "profil schodowy", "profil narożny",
    "listwa schodowa", "cokol schodowy", "opaska schodowa", "schody klinkierowe",
    "obklad schodow", "obklad komina", "obklad sciany mokrej", "kabina plytki",
    "brodzik plytkowany", "parawan prysznicowy plytki", "silikon sanitarny",
    "uszczelnienie spoin", "impregnacja plytek", "czyszczenie fug", "renowacja fug",
    "montaz listwy plytkowej", "wyciecie otworu w plytce", "zabezpieczenie hydroizolacja",
    "membrana uszczelniajaca", "taśma uszczelniajaca", "taśma w kącie", "narożnik uszczelniajacy",
  ],
  PODLOGI: [
    "cokolik", "cokoliki", "cokolikow", "cokol podlogowy", "cokol podlogowy pcv",
    "szlichta", "szlichta podlogowa",
    "przypodlogowy", "przypodlogowa", "przypodlogowe", "listwa podlogowa",
    "listwy podlogowe", "listwa przypodlogowa", "listwa maskujaca podlogowa",
    "licowanie", "licowanie podlogi", "licowanie posadzki", "posadzka cementowa",
    "posadzka anhydrytowa", "posadzka z ytong", "wylewka samopoziomujaca",
    "wylewka podlogowa", "wylewka cementowa", "wylewka anhydrytowa", "jastrych cementowy",
    "jastrych anhydrytowy", "jastrych podlogowy", "parkietowanie", "parkiet klejony",
    "parkiet warstwowy", "deska podlogowa", "deska klejona", "panel podlogowy",
    "panele podlogowe", "panele laminowane", "wykladzina", "wykladzina pcv",
    "wykladzina dywanowa", "wykladzina z włókna", "opaska podlogowa", "prog podlogowy",
    "listwa progowa", "listwa wykończeniowa podlogowa", "cokol winylowy", "cokol mdf",
    "montaz cokolika", "montaz listwy przypodlogowej", "szlifowanie posadzki",
    "cyklinowanie parkietu", "lakierowanie parkietu", "olejowanie parkietu",
    "renowacja posadzki", "naprawa posadzki", "uzupelnienie posadzki", "posadzka terrazzo",
    "posadzka epoksydowa", "posadzka przemyslowa", "posadzka betonowa polerowana",
    "izolacja podlogowa", "folia paroizolacyjna pod posadzke", "styropian pod posadzke",
  ],
  ELEKTRYKA: [
    "puszka instalacyjna", "puszki instalacyjne", "puszka podtynkowa", "puszka natynkowa",
    "rozeta", "rozety", "gniazdo wtyczkowe", "gniazdo podwojne", "gniazdo pojedyncze",
    "wlacznik jednobiegunowy", "wlacznik schodowy", "wlacznik krzyzowy", "czujnik ruchu",
    "czujnik zmierzchu", "instalacja oswietleniowa", "lampa sufitowa", "lampa scienna",
    "oprawa led", "oprawa awaryjna", "oswietlenie awaryjne", "oswietlenie ewakuacyjne",
    "wiazka kablowa", "przewod elektryczny", "przewod ydy", "przewod ydyp", "przewod n2xh",
    "kanal kablowy", "korytko kablowe", "listwa elektroinstalacyjna", "listwa zasilajaca",
    "tablica rozdzielcza", "rozdzielnica", "rozdzielnica mieszkaniowa", "zlacznik kablowy",
    "lacznik kablowy", "szybkozlacz", "bezpiecznik", "wyłacznik nadpradowy", "wylacznik roznicowopradowy",
    "uziemienie", "szyna uziemiajaca", "pomiar rezystancji", "pomiar instalacji elektrycznej",
    "montaz gniazda", "montaz wlacznika", "montaz oprawy", "przewod instalacyjny",
    "przewod linka", "przewod h07", "przewod ppoż", "kabel zasilajacy", "kabel zasilajacy yky",
    "instalacja odgromowa", "odprowadzenie piorunowe", "ogniwo kontrolne",
  ],
  HYDRAULIKA: [
    "syfon", "syfony", "syfon umywalkowy", "syfon wannowy", "syfon prysznicowy",
    "bateria umywalkowa", "bateria wannowa", "bateria prysznicowa", "bateria bidetowa",
    "odpowietrzenie", "odpowietrzenie instalacji", "kolano kanalizacyjne", "kolano 90",
    "zlaczki hydrauliczne", "zlaczka mosięzna", "wodomierz", "wodomierz zimnej wody",
    "zawor kulowy", "zawor odcinajacy", "zawor czerpalny", "pion kanalizacyjny",
    "pion wodociagowy", "rura pex", "rura miedziana", "rura stalowa", "rura pvc",
    "mieszacz", "mieszacz termostatyczny", "deska ustępowa", "deska ustepowa", "miska ustępowa",
    "miska ustepowa", "miska wiszaca", "brodzik", "brodzik akrylowy", "kabina prysznicowa",
    "parawan prysznicowy", "odplyw liniowy", "odplyw punktowy", "syfon podlogowy",
    "instalacja wodna", "instalacja kanalizacyjna", "instalacja c.o.", "instalacja co",
    "grzejnik plytowy", "grzejnik konwektorowy", "grzejnik lazienkowy", "zawor termostatyczny",
    "odpowietrznik automatyczny", "filtr wody", "reduktor cisnienia", "zbiornik wyrównawczy",
    "pompa ciepla instalacja", "uzupelnienie instalacji wod-kan", "próba szczelnosci",
    "próba cisnieniowa", "przeplywomierz", "zawor antyzalaniowy",
  ],
  ROZBIORKI: [
    "skuwanie tynku", "skuwanie plytek", "skuwanie posadzki", "skuwanie glazury",
    "skuwanie farby", "skuwanie tapety", "rozbiorka sciany", "rozbiorka scianki",
    "rozbiorka sciany dzialowej", "rozbiorka posadzki", "rozbiorka stropu",
    "wynos gruzu", "transport gruzu", "utylizacja gruzu", "kontener na gruz",
    "wykuwanie otworow", "wykuwanie bruzd", "ciecie betonu", "frezowanie posadzki",
    "rozciecie posadzki", "demontaz instalacji", "demontaz armatury", "demontaz grzejnika",
    "demontaz wanien", "demontaz umywalki", "demontaz drzwi starych", "demontaz okien starych",
    "demontaz podlogi", "demontaz scianek", "demontaz obudowy", "demontaz sufitu",
    "rozbiórka sciany", "rozbiórka posadzki", "rozbiórka instalacji", "usuwanie silikonu",
    "usuwanie fug", "usuwanie kleju", "usuwanie warstw", "sciąganie posadzki",
    "sciąganie parkietu", "sciąganie plytek", "sciąganie tynku", "rozciecie sciany",
    "wiercenie otworu rozbiórkowe", "piłowanie otworu", "rozbiórka zabudowy",
  ],
  STOLARKA: [
    "oscieznica", "oscieznic", "oscieznica stalowa", "oscieznica drewniana",
    "oscieznica regulowana", "oscieznica zewnetrzna", "oscieznica wewnetrzna",
    "parapet", "parapety", "parapetowanie", "parapetu", "parapet wewnetrzny",
    "parapet zewnetrzny", "parapet drewniany", "parapet marmurowy", "parapet konglomerat",
    "skrzydlo drzwiowe", "skrzydla drzwiowe", "skrzydlo drzwi", "odbojnica", "odbojnice", "odbojnicy",
    "odbojka", "odbojka scienna", "odbojka narożna", "odbojka narozna", "prog drzwiowy", "progi drzwiowe",
    "obrobka okienna", "obrobka drzwiowa", "obrobka ościeżnicy", "listwa maskujaca",
    "listwa maskujaca drzwi", "klamka", "klamki", "okucia drzwiowe", "zamki drzwiowe",
    "zawias", "zawiasy", "roleta", "rolety", "zaluzia", "zaluzje", "zaluzja plisowana",
    "montaz oscieznic", "montaz ościeżnic", "wymiana oscieznic", "wymiana ościeżnic",
    "wymiana skrzydla", "wymiana drzwi", "wymiana okien", "wymiana parapetu",
    "framuga", "framuga drzwiowa", "oscieżnica", "oscieżnice", "uszczelka drzwiowa",
    "uszczelka okienna", "silikon okienny", "pianka montazowa okno", "pianka montazowa drzwi",
    "montaz okuc", "regulacja okien", "regulacja drzwi", "szpachlowanie oscieznicy",
    "listwa przypokojowa", "listwa ościeżnicowa", "maskownica ościeżnicy",
    "okno pcv", "okno drewniane", "drzwi wewnetrzne", "drzwi zewnetrzne", "drzwi antywlamaniowe",
    "drzwi techniczne", "drzwi rewizyjne", "kontaktownik drzwiowy", "samozamykacz",
  ],
};

/** Kolejność przeszukiwania — zgodna z katalogiem WGDOM. */
export const WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER: DictCategory[] = [
  ...WGDOM_COST_CATEGORY_IDS,
] as DictCategory[];

let _foldedCache: Record<DictCategory, string[]> | null = null;

function foldedTerms(): Record<DictCategory, string[]> {
  if (_foldedCache) return _foldedCache;
  const out = {} as Record<DictCategory, string[]>;
  for (const id of WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER) {
    out[id] = WGDOM_CONSTRUCTION_DICTIONARY[id]
      .map((t) => foldPolishText(t))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }
  _foldedCache = out;
  return out;
}

/** Liczba unikalnych terminów w słowniku (AC-2: 150+). */
export function countConstructionDictionaryTerms(): number {
  const seen = new Set<string>();
  for (const id of WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER) {
    for (const term of WGDOM_CONSTRUCTION_DICTIONARY[id]) {
      seen.add(foldPolishText(term));
    }
  }
  return seen.size;
}

export function getConstructionDictionaryRules(): { id: WgdomCostCategoryId; keywords: string[] }[] {
  return WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER.map((id) => ({
    id,
    keywords: [...WGDOM_CONSTRUCTION_DICTIONARY[id]],
  }));
}

/** Dopasowanie słownika na znormalizowanym opisie (foldPolishText). */
export function matchConstructionDictionary(foldedHaystack: string): WgdomCostCategoryId | null {
  if (!foldedHaystack.trim()) return null;
  const terms = foldedTerms();
  for (const id of WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER) {
    for (const kw of terms[id]) {
      if (foldedHaystack.includes(kw)) return id;
    }
  }
  return null;
}

/** Top terminy słownika per kategoria (do dokumentacji / testów). */
export function listConstructionDictionarySample(limitPerCategory = 5): Record<DictCategory, string[]> {
  const out = {} as Record<DictCategory, string[]>;
  for (const id of WGDOM_CONSTRUCTION_DICTIONARY_CATEGORY_ORDER) {
    out[id] = WGDOM_CONSTRUCTION_DICTIONARY[id].slice(0, limitPerCategory);
  }
  return out;
}

export const WGDOM_CONSTRUCTION_DICTIONARY_VERSION = "1F.0";
