# P2 MVP — FINAL SUMMARY

**EPIC:** WGDOM Biblioteka Robót i Cennik v3.0  
**Milestone:** P2 MVP COMPLETE  
**Status:** **REVIEW + FREEZE** (2026-06-28)  
**Release UI:** **v2.62.82 → v2.62.87** (6 sprintów)  
**Foundation:** P1 FROZEN — [`FOUNDATION-FREEZE-v1.0.md`](FOUNDATION-FREEZE-v1.0.md)  
**Freeze P2:** [`P2-FREEZE-v1.0.md`](P2-FREEZE-v1.0.md)

---

## FILES

### UI (`src/app/work-catalog/`)

| Plik | Sprint | Rola |
|------|--------|------|
| `WorkCatalogView.tsx` | P2.1 + integracja P2.4–P2.6 | Główny widok admin |
| `WorkCatalogWorkRow.tsx` | P2.1 | Karta roboty |
| `work-catalog-list.ts` | P2.1 | Filtry, sort, liczniki |
| `WorkCatalogCompanyPriceField.tsx` | P2.2 | Pole ceny firmy |
| `work-catalog-price.ts` | P2.2 | Walidacja + patch `companyPricePln` |
| `WorkCatalogActiveToggle.tsx` | P2.3 | Przełącznik aktywności |
| `work-catalog-active.ts` | P2.3 | Patch `active` |
| `WorkCatalogBulkEditBar.tsx` | P2.4 | Panel akcji bulk |
| `WorkCatalogBulkPreviewModal.tsx` | P2.4 | Podgląd stara→nowa cena |
| `work-catalog-bulk-price.ts` | P2.4 | Operacje +%, −%, +zł, −zł, set |
| `WorkCatalogMarketComparison.tsx` | P2.5 | Blok firma vs rynek |
| `work-catalog-market-comparison.ts` | P2.5 | Progi ±10% / 11–25% / >25% |
| `WorkCatalogCompletenessPanel.tsx` | P2.6 | Uzupełniono % + branże |
| `work-catalog-completeness.ts` | P2.6 | Logika kompletności |

### Hook + routing

| Plik | Rola |
|------|------|
| `src/app/hooks/useWorkCatalog.ts` | Stan store, odczyt regionu, zapis cena/aktywność/bulk |
| `src/app/admin/AdminViewRouter.tsx` | Lazy route `workcatalog` |
| `src/app/admin/admin-nav.ts` | Menu + badge aktywnych robót |
| `src/app/App.tsx` | Etykiety widoku `workcatalog` |

### Dokumentacja + changelog

| Plik | Rola |
|------|------|
| `src/app/changelog-data.ts` | Wpisy 2.62.82–2.62.87 |
| `CHANGELOG.md` | Skrót dla programistów |
| `src/app/GuideView.tsx` | FAQ Biblioteka Robót P2.1–P2.6 |
| `docs/ARCHITECTURE.md` | § 12.1.22 |

### Testy P2 (`scripts/`)

| Skrypt | Sprint | Asercje |
|--------|--------|---------|
| `smoke-test-work-catalog-ui-p2.1.mjs` | P2.1 | 9 |
| `smoke-test-work-catalog-price-p2.2.mjs` | P2.2 | 17 |
| `test-work-catalog-price-persist-p2.2.mjs` | P2.2 | 6 |
| `smoke-test-work-catalog-active-p2.3.mjs` | P2.3 | 8 |
| `test-work-catalog-active-persist-p2.3.mjs` | P2.3 | 7 |
| `smoke-test-work-catalog-bulk-price-p2.4.mjs` | P2.4 | 14 |
| `test-work-catalog-bulk-price-persist-p2.4.mjs` | P2.4 | 6 |
| `smoke-test-work-catalog-market-p2.5.mjs` | P2.5 | 14 |
| `smoke-test-work-catalog-completeness-p2.6.mjs` | P2.6 | 15 |

**P1 (bez zmian w P2):** `src/lib/work-catalog/*` — golden + testy P1.1–P1.12.

---

## UI MODULES

| Moduł | Wersja | Opis użytkownika |
|-------|--------|------------------|
| **Lista** | 2.62.82 | Wyszukiwarka, filtr branży, aktywne/nieaktywne, licznik |
| **Cena firmy** | 2.62.83 | Jedna robota = jedna cena (zł/jednostkę), Enter/blur zapis |
| **Aktywność** | 2.62.84 | Checkbox Aktywna/Nieaktywna; domyślnie lista = aktywne |
| **Bulk edit** | 2.62.85 | Edytuj wiele → +%, −%, +zł, −zł, ustaw cenę → podgląd → potwierdź |
| **Rynek** | 2.62.86 | Twoja cena vs cena rynkowa + status 🟢🟡🔴 (read-only) |
| **Kompletność** | 2.62.87 | Uzupełniono X% + panel Branże; klik filtruje listę |

**Chunk prod:** `WorkCatalogView` lazy (~25 kB gzip ~7.3 kB).

---

## STORE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│  WorkCatalogView                                            │
│    └── useWorkCatalog()                                     │
│          ├── loadWorkCatalogStoreLocal()  [mount]             │
│          ├── listWorksForRegion(store)                      │
│          ├── withFreshnessStatusAll(works)                  │
│          └── mutacje:                                       │
│                patchWorkCompanyPriceInStore  (P2.2)         │
│                patchWorkActiveInStore        (P2.3)         │
│                patchBulkCompanyPricesInStore (P2.4)         │
│                    ↓                                        │
│                setStore(next)  — bez reload listy            │
│                    ↓                                        │
│                saveWorkCatalogStore(next)  [P1.11]          │
│                    ├── saveWorkCatalogStoreLocal()          │
│                    └── persistKey(kw-wgdom-work-catalog)    │
└─────────────────────────────────────────────────────────────┘
```

| Klucz | Model | Merge |
|-------|-------|-------|
| `kw-wgdom-work-catalog` | `WorkCatalogStore` v4 (v3 normalize→v4) | LWW `updatedAt` (P1 D5) |
| `kw-wgdom-work-bundles` | `WorkBundleStore` v3 | LWW `updatedAt` (P1 D5) |

**Bootstrap chmury (prod od v2.62.84):** `CloudLoader` → `fetchAndMergeDeferredBootstrap()` merge obu kluczy KV do localStorage → `maybeExecuteWorkCatalogBootstrap()` (PB-3) → `WGDOM_DEFERRED_BOOTSTRAP_EVENT`. Hooki `useWorkCatalog` / `useWorkBundles` startują z LS i odświeżają się po evencie — **nie** wołają `loadWorkCatalogStore()` / `loadWorkBundleStore()` on mount.

---

## PRODUCT FEATURES

| Feature | SSOT pole | Zapis chmura |
|---------|-----------|--------------|
| Lista + filtry | `CatalogWork[]` w regionie | odczyt local |
| Cena firmy | `companyPricePln` | ✓ `saveWorkCatalogStore` |
| Aktywność | `active` | ✓ |
| Bulk ceny | `companyPricePln` × N | ✓ jeden batch |
| Rynek | `marketAvgPln` | **tylko odczyt** |
| Kompletność | derived `companyPricePln > 0` | brak nowego KV |

**Guardrails produktowe (spełnione):**

- Upraszcza pracę właściciela (jeden ekran, prosty język)
- Bez żargonu kosztorysowego (Branża, Cena firmy, Uzupełniono)
- Mobile first (min-h 44px, scroll w widoku)
- Jedna robota = jedna cena

**Poza P2 MVP (2.62.87):** Przetargi cutover, AI, historia zmian, aktualizacja rynku w UI.

**P2.7 (v2.63.38, Bundle #5B):** **CLOSED** — sub-nav **Roboty | Pakiety**, CRUD pakietów, persist `saveWorkBundleStore`.

---

## TESTS

| Suite | Wynik (2026-06-28 housekeeping) |
|-------|----------------------------------|
| `npm run build` | **PASS** |
| `test-work-catalog-golden.mjs` | **1419 PASS / 0 FAIL** |
| P2 smoke + persist (9 skryptów) | **96 PASS / 0 FAIL** |

Szczegóły P2:

| Skrypt | PASS |
|--------|------|
| smoke P2.1 | 9 |
| smoke P2.2 + persist | 23 |
| smoke P2.3 + persist | 15 |
| smoke P2.4 + persist | 20 |
| smoke P2.5 | 14 |
| smoke P2.6 | 15 |
| **Razem P2** | **96** |

---

## BUILD

```
npm run build — PASS (~49s)
WorkCatalogView-CBFmkU7e.js — 25.07 kB │ gzip 7.28 kB
```

Brak błędów TypeScript / linter na plikach P2.

---

## GUARDRAILS

| Reguła | Status |
|--------|--------|
| P1 foundation niezmieniony | ✓ |
| P2.1–P2.6 bez refaktoru wzajemnego | ✓ |
| Dane UI tylko `@/lib/work-catalog` | ✓ |
| Deferred bootstrap prod (PB-3 + oba KV) | ✓ (v2.62.84+) |
| P2.7 Pakiety robót UI | ✓ (v2.63.38, Bundle #5B) |
| P2.8 Pakiety UX MIN | ✓ (v2.63.39, Bundle #6B) |
| P2.9 Pakiety filtry i badge | ✓ (v2.63.40, Bundle #6C-A) |
| Brak integracji Przetargów | ✓ |
| Changelog + GuideView + ARCHITECTURE | ✓ |

---

## KNOWN LIMITATIONS

1. **Race deferred vs widok** — hooki startują z LS przed zakończeniem deferred bootstrap; po evencie reload. Krótkie okno pustego/starego stanu możliwe przy bardzo szybkim wejściu w widok (bez `load*Store()` on mount).
2. **Brak cutover** — Przetargi → Baza cen (`kw-wgdom-cost-catalog`) nadal legacy SSOT w module Przetargów (edycja UI).
3. **Rynek read-only** — `marketAvgPln` / `marketQuotes` tylko z danych store; brak aktualizacji rynku w UI prod (P3 backlog).
4. **Brak historii cen** — zmiany nadpisują `companyPricePln` + `updatedAt` bez audytu.
5. **LWW całego store** — równoległa edycja na dwóch urządzeniach: ostatni `updatedAt` wygrywa (D5, frozen).
6. **Kompletność** — liczy wszystkie roboty regionu (nie tylko aktywne); lista domyślnie filtruje aktywne.

---

## READY FOR RELEASE

| Kryterium | Status |
|-----------|--------|
| Build PASS | ✓ |
| Golden 1419 PASS | ✓ |
| P2 tests (suite smoke-work-catalog-p2-mvp) | ✓ **16** testIds (P2.1–P2.9) |
| Changelog 2.63.40 | ✓ |
| P2 FREEZE doc | ✓ |
| Prod P2 MVP | ✓ **2.63.37–40** |

**Werdykt:** **RELEASED** — Biblioteka Robót P2 MVP na prod (P2.1–P2.9). Ten dokument zachowuje historię pierwszego release (2.62.87).

**Następny slice (nie startować bez polecenia):** **P2.10** Roboty ulubione (#6D) · **#5C** cutover Przetargi / PB-WRITE · **P3** market UI.
