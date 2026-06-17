/**
 * P3-AUDIT-001-FIX-B — regresja klasyfikacji, user dict bootstrap, filtr katalogu, benchmarky.
 * npx vite-node scripts/test-p3-fix-b-classification.mjs
 */
import {
  classifyAthLineCategory,
} from "../src/lib/wgdom-ath-classifier.ts";
import {
  addUserClassificationEntry,
  ensureUserClassificationDictionaryCacheHydrated,
  getUserClassificationDictionaryCache,
  refreshUserClassificationDictionaryCacheFromLocalStorage,
  restoreDefaultUserClassificationDictionaryStore,
  setUserClassificationDictionaryCache,
  WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY,
} from "../src/lib/wgdom-user-classification-dictionary.ts";
import { WGDOM_PHRASE_RULES_VERSION } from "../src/lib/wgdom-phrase-rules.ts";
import { isLikelyCatalogQuantityRow } from "../src/lib/tender-catalog-quantity-filter.ts";
import { buildCatalogQuantitiesFromPreview } from "../src/lib/tenders-bzp-brief.ts";
import { compareLaborRateToBenchmark } from "../src/lib/labor-benchmark.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};
const assertEq = (name, a, b) => assert(name, a === b);

console.log("P3-AUDIT-001-FIX-B — classification regression\n");

// —— User dictionary bootstrap cache (przed klasyfikacją) ——
{
  const lsBackup = globalThis.localStorage;
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };

  try {
    setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
    const learned = addUserClassificationEntry(
      restoreDefaultUserClassificationDictionaryStore(),
      "montaz specjalnej pozycji testowej fixb",
      "ELEKTRYKA",
    );
    mem.set(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, JSON.stringify(learned));
    setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
    assertEq("cache cleared before hydrate", getUserClassificationDictionaryCache().entries.length, 0);

    refreshUserClassificationDictionaryCacheFromLocalStorage();
    assert(
      "refreshUserClassificationDictionaryCacheFromLocalStorage loads LS",
      getUserClassificationDictionaryCache().entries.some((e) => e.phrase.includes("specjalnej pozycji")),
    );
    ensureUserClassificationDictionaryCacheHydrated();
    assertEq(
      "classifier uses hydrated user dict without Wycena mount",
      classifyAthLineCategory("montaz specjalnej pozycji testowej fixb", "szt"),
      "ELEKTRYKA",
    );
  } finally {
    globalThis.localStorage = lsBackup;
    setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());
  }
}

// —— Phrase rules (P3-FIX-B ATH) ——
assertEq("phrase rules version 3.3", WGDOM_PHRASE_RULES_VERSION, "3.3");
assertEq(
  "listwy przyścienne → PODLOGI",
  classifyAthLineCategory("Montaż listew przyściennych", "mb"),
  "PODLOGI",
);
assertEq(
  "odgrzybianie → MALOWANIE",
  classifyAthLineCategory("Dwukrotne odgrzybianie ścian ceglanych o powierzchni do 2 m2", "m2"),
  "MALOWANIE",
);
assertEq(
  "klamki → STOLARKA",
  classifyAthLineCategory("Założenie na nowym miejscu klamek z szyldami", "szt"),
  "STOLARKA",
);
assertEq(
  "zamek Yale → STOLARKA",
  classifyAthLineCategory("Wymiana  na nowym miejscu  zamka typu 'Yale' oraz wkładki", "szt"),
  "STOLARKA",
);
assertEq(
  "nawietrzaki → WENTYLACJA",
  classifyAthLineCategory("Założenie na nowym miejscu nawietrzaków okiennych.", "szt"),
  "WENTYLACJA",
);
assertEq(
  "rozebranie ścianki → ROZBIORKI",
  classifyAthLineCategory(
    "Rozebranie ścianki z cegieł o grubości 1/4 ceg. na zaprawie cementowo-wapiennej",
    "m2",
  ),
  "ROZBIORKI",
);
assertEq(
  "numer lokalu → WYPOSAZENIE",
  classifyAthLineCategory("Założenie numeru porządkowego lokalu", "szt"),
  "WYPOSAZENIE",
);
assertEq(
  "roboty branży budowlanej → ROBOTY_OGOLNOBUDOWLANE",
  classifyAthLineCategory(
    "Roboty branży budowlanej - roboty podstawowe /zgodnie z kosztorysem ofertowym/",
    "kpl",
  ),
  "ROBOTY_OGOLNOBUDOWLANE",
);

// —— Regresja: celowo UNKNOWN ——
assertEq(
  "generic kpl still UNKNOWN",
  classifyAthLineCategory("Roboty ogólne budowlane", "kpl"),
  "UNKNOWN",
);

// —— Filtr formularza XLSX ——
assert("form clause filtered", !isLikelyCatalogQuantityRow("W odpowiedzi na ogłoszenie o zamówieniu, składam ofertę"));
assert("gwarancja filtered", !isLikelyCatalogQuantityRow("okres gwarancji 60 miesięcy"));
assert("ref number filtered", !isLikelyCatalogQuantityRow("WM/TP/113/2026/G"));
assert("real ATH row kept", isLikelyCatalogQuantityRow("Montaż listew przyściennych"));
assert("roboty przygotowawcze kept", isLikelyCatalogQuantityRow("Roboty przygotowawcze"));

const preview = {
  ok: true,
  rows: [
    { lp: "1", description: "Oferujemy realizację zamówienia za następującą cenę:", unit: "", quantity: "0" },
    { lp: "2", description: "Montaż listew przyściennych", unit: "mb", quantity: "13.37" },
  ],
  warnings: [],
};
const catalog = buildCatalogQuantitiesFromPreview(preview);
assertEq("buildCatalogQuantitiesFromPreview drops form noise", catalog.length, 1);
assertEq("keeps ATH row", catalog[0].description, "Montaż listew przyściennych");

// —— Benchmark regresja UNKNOWN ——
const bench = compareLaborRateToBenchmark(50, "UNKNOWN", "m2");
assertEq("UNKNOWN benchmark unavailable", bench.status, "unavailable");
assertEq("UNKNOWN no benchmark range", bench.range, null);

console.log("\nP3-FIX-B classification: ALL PASS");
