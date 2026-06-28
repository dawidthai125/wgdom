# FOUNDATION FREEZE v1.0

**EPIC:** WGDOM Biblioteka Robót i Cennik v3.0  
**Zakres:** Sprint P1.1–P1.12 (fundament)  
**Status:** **FROZEN** — zmiany tylko na polecenie (hotfix P1.x lub P2+)  
**Data zamrożenia:** 2026-06-28  
**Release:** **v2.62.80** · commit po housekeeping P1  
**Baseline prod (niezależny):** v2.62.80 · legacy `kw-wgdom-cost-catalog` nadal aktywny w UI

---

## 1. Cel zamrożenia

Fundament P1 dostarcza **pure lib** w `src/lib/work-catalog/` bez UI, bez cutover i bez podpięcia `CloudLoader` / `App.tsx`. P2 może importować wyłącznie z `@/lib/work-catalog` (barrel `index.ts`).

**Zakaz w P2 bez briefu:** refaktor P1.1–P1.11, zmiana schematu v3, zmiana strategii merge LWW (D5).

---

## 2. Model domenowy (P1.1)

### Schemat

| Stała | Wartość |
|-------|---------|
| `WORK_CATALOG_SCHEMA_VERSION` | `3` |
| `WORK_BUNDLE_SCHEMA_VERSION` | `3` |

### Encje

| Typ | Opis |
|-----|------|
| `CatalogWork` | Pojedyncza robota: `id`, `tradeId`, `name`, `unit`, `keywords`, `active`, `companyPricePln`, `costSplit`, `source`, `updatedAt`, `freshnessStatus` (derived) |
| `WorkCatalogStore` | `schemaVersion`, `updatedAt`, `works[]`, `regionSlices` (mapa region → slice) |
| `WorkCatalogRegionSlice` | `regionId`, `workIds[]`, `overrides` (opcjonalne) |
| `WorkBundle` | Zestaw kroków (`WorkBundleStep`) powiązany z robotą |
| `WorkBundleStore` | `schemaVersion`, `updatedAt`, `bundles[]` |
| `TradeId` | 16 branż (`TRADE_IDS` + `TRADE_LABELS_PL`) |
| `WorkFreshnessStatus` | `ok` \| `stale` \| `missing` |
| `WorkCostSplit` | `materialPln`, `laborPln`, `equipmentPln` |

### Seed manifest (P1.3)

- Plik SSOT: `docs/work-catalog/SEED-MANIFEST-v1.0.yaml`
- **116** robót · manifest version **1.0**
- Bez cen w manifeście — ceny tylko w store po migracji / edycji

---

## 3. Freshness i helpers (P1.2)

| Moduł | Rola |
|-------|------|
| `freshness.ts` | `deriveFreshnessStatus` — próg **90 dni**, `missing` gdy brak ceny |
| `catalog-work-utils.ts` | Listy/filtry po regionie, branży, `active`, indeks po `id` |

Pure functions — `nowMs` przekazywany z zewnątrz (testowalność).

---

## 4. Cost split (P1.4)

| Stała / API | Rola |
|-------------|------|
| `WORK_CATALOG_REFERENCE_HOURLY_PLN` | `85` PLN/h (referencja legacy) |
| `mergeCompanyPriceFromLegacyRate` | Round-trip legacy rate → `companyPricePln` + `costSplit` |

**Nie eksportowane** z public API (internal): `deriveCostSplitFromLegacyRate`, `verifyLegacyRateRoundTrip`, `roundWorkCatalogPln`.

---

## 5. Migracja legacy → v3 (P1.5)

| Wejście | Wyjście |
|---------|---------|
| `WgdomCostCatalogStore` (`kw-wgdom-cost-catalog`) | `WorkCatalogStore` (`kw-wgdom-work-catalog`) |

| API | Opis |
|-----|------|
| `migrateLegacyCostCatalogStoreToWorkCatalog` | Główna ścieżka migracji |
| `LEGACY_CATEGORY_TO_TRADE` | Mapa kategorii legacy → `TradeId` |
| `mapLegacyCategoryToTradeId` | Pojedyncza kategoria |
| `isLegacyCostCatalogStore` / `isWorkCatalogStoreV3` | Type guards |

**Decyzja D5:** merge store LWW po `updatedAt` (ISO string, lexicographic).

---

## 6. Adapter silnika (P1.6)

Most read-only do istniejącego `WgdomCostCatalog` (przetargi / kalkulator P3):

| API | Opis |
|-----|------|
| `buildLegacyCostCatalogFromWorkStore` | `WorkCatalogStore` → `WgdomCostCatalog` |
| `resolveRegionSlice` | Slice dla regionu |
| `mergeKeywords` | Dedup słów kluczowych |
| `listTradeIdsForLegacyCategory` | Odwrotna mapa dla UI legacy |

Golden fingerprint kategorii round-trip: `485bf80ca49a5748`.

---

## 7. Stores — persist lokalny (P1.7, P1.8)

| Klucz localStorage / KV | Moduł | Merge |
|-------------------------|-------|-------|
| `kw-wgdom-work-catalog` | `work-catalog-store.ts` | `mergeWorkCatalogStore` |
| `kw-wgdom-work-bundles` | `work-bundle-store.ts` | `mergeWorkBundleStore` |

| API | Opis |
|-----|------|
| `normalize*Store` | Sanityzacja + domyślne pola |
| `load*StoreLocal` / `save*StoreLocal` | localStorage |
| `defaultWorkCatalogStoreForPersist` / `defaultWorkBundleStore` | Puste store z timestampem |

Golden fingerprint persist store: `10fe398353bd31fb`.

---

## 8. Cloud integration (P1.11)

### Rejestracja w `cloud-sync.ts`

- `DATA_KEYS`: oba klucze work-catalog
- `BOOTSTRAP_DEFERRED_KEYS`: deferred bootstrap faza 2
- `mergeDataKey`: delegacja do `mergeWorkCatalogStore` / `mergeWorkBundleStore`
- `coerceValueForCloudKey` / `sanitizeValueForCloud`: normalize przed `batch-set`

### Hooki (`work-catalog-sync.ts`)

| Funkcja | Zachowanie |
|---------|------------|
| `loadWorkCatalogStore` / `loadWorkBundleStore` | fetch cloud → merge local → zapis local |
| `saveWorkCatalogStore` / `saveWorkBundleStore` | local + `persistKey` |
| `mergeWorkCatalogFromSources` / `mergeWorkBundleFromSources` | LWW dla `mergeDataKey` |

**Nie podpięte w P1:** `CloudLoader.tsx`, `App.tsx`, UI odczyt/zapis — to zakres P2 cutover.

**ARCH-001:** `work-catalog-sync` importuje `cloud-sync` — **nie** importować `work-catalog-sync` z modułów w drzewie `cloud-sync` merge (obecnie OK: cloud-sync importuje tylko store, nie sync).

---

## 9. Backward compatibility (P1.10)

Read-only warstwa współistnienia legacy + v3:

| API | Opis |
|-----|------|
| `resolveCatalogVersion` | `legacy` \| `work` \| `unknown` |
| `resolveCatalogForEngine` | Zawsze `WgdomCostCatalog` (migracja w locie lub adapter) |
| `resolveCatalogForUI` | Metadane wersji dla P2 UI |
| `isLegacyCatalog` / `isWorkCatalog` | Type guards |

Brak zapisu, brak migracji w compat — tylko rozwiązywanie wejścia.

---

## 10. Compatibility matrix

| Warstwa | Legacy v1 | Work catalog v3 |
|---------|-----------|-----------------|
| KV klucz | `kw-wgdom-cost-catalog` | `kw-wgdom-work-catalog`, `kw-wgdom-work-bundles` |
| UI prod | **Aktywny** (Baza cen P3) | **Niepodpięty** |
| Engine przetargów | `WgdomCostCatalog` | Via `resolveCatalogForEngine` / adapter |
| Cloud merge | `wgdom-cost-catalog-store` | P1.11 zarejestrowane, bez bootstrap wire |
| Seed | N/A | YAML 116 robót |

---

## 11. Public API (P1.12)

**Jedyny punkt wejścia P2+:** `@/lib/work-catalog` → `index.ts`

### Eksportowane obszary

1. Typy + `TradeId` (P1.1)
2. Freshness + catalog helpers (P1.2)
3. Seed manifest parse/validate (P1.3)
4. Cost split — stała referencyjna + `mergeCompanyPriceFromLegacyRate` (P1.4)
5. Migracja (P1.5)
6. Engine adapter (P1.6)
7. Catalog store persist (P1.7)
8. Bundle store persist (P1.8)
9. Compat layer (P1.10)
10. Cloud hooks (P1.11)

### Świadomie **nie** w public API

- `countLegacyCatalogRates`, `verifyLegacyRateRoundTrip`
- `deriveCostSplitFromLegacyRate`, `splitCompanyPrice`, `roundWorkCatalogPln`
- `SeedManifestIssueCode` (szczegóły walidacji — tylko `SeedManifestValidationResult`)

Weryfikacja: `npx vite-node scripts/test-work-catalog-public-api.mjs`

---

## 12. Testy regresji (bramka P1)

| Sprint | Skrypt |
|--------|--------|
| P1.1 | `test-work-catalog-types.mjs` |
| P1.2 | `test-work-catalog-freshness.mjs` |
| P1.3 | `test-work-catalog-seed-manifest.mjs` + `validate-seed-manifest.mjs` |
| P1.4 | `test-work-catalog-cost-split.mjs` |
| P1.5 | `test-work-catalog-migration.mjs` |
| P1.6 | `test-work-catalog-engine-adapter.mjs` |
| P1.7 | `test-work-catalog-store.mjs` |
| P1.8 | `test-work-bundle-store.mjs` |
| P1.9 | `test-work-catalog-golden.mjs` |
| P1.10 | `test-work-catalog-compat.mjs` |
| P1.11 | `test-work-catalog-cloud-sync.mjs` |
| P1.12 | `test-work-catalog-public-api.mjs` |

---

## 13. Pliki zamrożone

```
src/lib/work-catalog/
  index.ts                      ← public API barrel (P1.12)
  types.ts, trades.ts           P1.1
  freshness.ts, catalog-work-utils.ts   P1.2
  seed-manifest.ts              P1.3
  cost-split.ts                 P1.4
  work-catalog-migrate.ts       P1.5
  work-catalog-engine-adapter.ts P1.6
  work-catalog-store.ts         P1.7
  work-bundle-store.ts          P1.8
  work-catalog-compat.ts        P1.10
  work-catalog-sync.ts          P1.11

docs/work-catalog/SEED-MANIFEST-v1.0.yaml

src/lib/cloud-sync.ts           ← rejestracja KV (P1.11, fragment)
```

---

## 14. Następny krok (P2 — poza FREEZE)

1. UI Biblioteka Robót + podpięcie `loadWorkCatalogStore` w `App.tsx` / `CloudLoader`
2. Cutover / dual-read z `resolveCatalogForUI`
3. CHANGELOG + HelpView + ARCHITECTURE § nowa sekcja

**Nie rozpoczynać P2 bez akceptacji tego dokumentu i raportu `audit/P1-WORK-CATALOG-COMPLETION-REPORT.md`.**
