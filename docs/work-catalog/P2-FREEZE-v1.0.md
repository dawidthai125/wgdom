# P2 FREEZE v1.0

**EPIC:** WGDOM Biblioteka Robót i Cennik v3.0  
**Zakres:** Sprint P2.1–P2.6 (UI MVP)  
**Status:** **FROZEN** — zmiany tylko na polecenie (hotfix P2.x lub P3+)  
**Data zamrożenia:** 2026-06-28  
**Release:** **v2.62.82 → v2.62.87**  
**Foundation:** P1 FROZEN — [`FOUNDATION-FREEZE-v1.0.md`](FOUNDATION-FREEZE-v1.0.md)  
**Podsumowanie:** [`P2-MVP-FINAL-SUMMARY.md`](P2-MVP-FINAL-SUMMARY.md)

---

## 1. Cel zamrożenia

P2 dostarcza **pierwszy produkcyjny ekran** Biblioteki Robót dla właściciela: lista, edycja ceny, aktywność, bulk, podgląd rynku, kompletność katalogu.

**Zakaz bez briefu:** nowe funkcje P2.7+, refaktor P2.1–P2.6, zmiany w `src/lib/work-catalog/` (P1), integracja Przetargów, CloudLoader bootstrap, AI, historia zmian.

---

## 2. Zamrożone moduły UI

### P2.1 — Lista (`v2.62.82`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| Widok główny | `WorkCatalogView.tsx` | Scroll w liście, nagłówek sticky |
| Wiersz | `WorkCatalogWorkRow.tsx` | Nazwa, branża, jednostka |
| Filtry | `work-catalog-list.ts` | search, tradeId, active |
| Hook | `useWorkCatalog.ts` | Odczyt regionu, `tradesOrder` |
| Routing | `admin-nav.ts`, `AdminViewRouter.tsx` | `workcatalog` lazy |

**Domyślny filtr aktywności:** `active: "active"` (ustawiony w P2.3 — nie cofać).

---

### P2.2 — Cena firmy (`v2.62.83`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| Pole UI | `WorkCatalogCompanyPriceField.tsx` | ≥0, max 2 miejsca po przecinku |
| Logika | `work-catalog-price.ts` | `patchWorkCompanyPriceInStore` |
| Zapis | `useWorkCatalog.updateCompanyPrice` | local + `saveWorkCatalogStore` |

**SSOT:** `companyPricePln` — jedna robota = jedna cena.

---

### P2.3 — Aktywność (`v2.62.84`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| Toggle | `WorkCatalogActiveToggle.tsx` | Aktywna / Nieaktywna |
| Logika | `work-catalog-active.ts` | `patchWorkActiveInStore` |
| Zapis | `useWorkCatalog.updateWorkActive` | local + cloud |

---

### P2.4 — Bulk edit (`v2.62.85`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| Tryb | `WorkCatalogView` + `WorkCatalogBulkEditBar.tsx` | Edytuj wiele / Zakończ |
| Podgląd | `WorkCatalogBulkPreviewModal.tsx` | stara → nowa cena |
| Operacje | `work-catalog-bulk-price.ts` | +%, −%, +zł, −zł, ustaw cenę |
| Zapis | `updateBulkCompanyPrices` | jeden `saveWorkCatalogStore` |

**Bez:** historii zmian, undo poza anulowaniem modala.

---

### P2.5 — Rynek (`v2.62.86`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| UI | `WorkCatalogMarketComparison.tsx` | Cena firmy · cena rynkowa · status |
| Logika | `work-catalog-market-comparison.ts` | `marketAvgPln` read-only |

| Progi | Emoji |
|-------|-------|
| ≤10% odchylenia | 🟢 |
| 11–25% | 🟡 |
| >25% | 🔴 |
| Brak `marketAvgPln` | — |

**Bez:** aktualizacji rynku, bootstrap rynku, KNR/materiałów.

---

### P2.6 — Kompletność (`v2.62.87`)

| Element | Pliki | Zachowanie |
|---------|-------|------------|
| Panel | `WorkCatalogCompletenessPanel.tsx` | Uzupełniono % + Branże |
| Logika | `work-catalog-completeness.ts` | `companyPricePln > 0` |

| Progi kompletności | Emoji |
|--------------------|-------|
| 100% | 🟢 |
| 50–99% | 🟡 |
| <50% | 🔴 |

**Interakcja:** klik branży → `filters.tradeId`; ponowny klik → `all`.

**Zakres liczenia:** wszystkie roboty aktywnego regionu (nie tylko po filtrze listy).

---

## 3. Kontrakt store (P2)

| Operacja | API app | API lib (P1) |
|----------|---------|--------------|
| Odczyt mount | `loadWorkCatalogStoreLocal` | `work-catalog-store.ts` |
| Zapis po edycji | `saveWorkCatalogStore` | `work-catalog-sync.ts` |
| Klucz KV | `kw-wgdom-work-catalog` | `cloud-sync.ts` DATA_KEYS |

P2 **nie** dodaje nowych kluczy KV.

---

## 4. Testy zamrożone (regresja P2)

Uruchamiać przed każdym hotfixem P2.x:

```bash
npm run build
npx vite-node scripts/test-work-catalog-golden.mjs
npx vite-node scripts/smoke-test-work-catalog-ui-p2.1.mjs
npx vite-node scripts/smoke-test-work-catalog-price-p2.2.mjs
npx vite-node scripts/test-work-catalog-price-persist-p2.2.mjs
npx vite-node scripts/smoke-test-work-catalog-active-p2.3.mjs
npx vite-node scripts/test-work-catalog-active-persist-p2.3.mjs
npx vite-node scripts/smoke-test-work-catalog-bulk-price-p2.4.mjs
npx vite-node scripts/test-work-catalog-bulk-price-persist-p2.4.mjs
npx vite-node scripts/smoke-test-work-catalog-market-p2.5.mjs
npx vite-node scripts/smoke-test-work-catalog-completeness-p2.6.mjs
```

Oczekiwany wynik: **build PASS**, **golden 1419 PASS**, **P2 96 PASS**.

---

## 5. Commit bundle (propozycja — nie wykonano)

```
feat(work-catalog): complete P2 MVP

Biblioteka Robót v3.0 UI P2.1–P2.6: lista i filtry, edycja ceny
firmy, aktywność, grupowa edycja cen, porównanie z rynkiem
(read-only) i panel kompletności katalogu.

Release v2.62.82–2.62.87. P1 foundation remains frozen.
```

### Pliki do `git add` (bundle P2)

```
src/app/work-catalog/
src/app/hooks/useWorkCatalog.ts
src/app/admin/AdminViewRouter.tsx
src/app/admin/admin-nav.ts
src/app/App.tsx
src/app/changelog-data.ts
src/app/GuideView.tsx
CHANGELOG.md
docs/ARCHITECTURE.md
docs/work-catalog/P2-MVP-FINAL-SUMMARY.md
docs/work-catalog/P2-FREEZE-v1.0.md
scripts/smoke-test-work-catalog-ui-p2.1.mjs
scripts/smoke-test-work-catalog-price-p2.2.mjs
scripts/test-work-catalog-price-persist-p2.2.mjs
scripts/smoke-test-work-catalog-active-p2.3.mjs
scripts/test-work-catalog-active-persist-p2.3.mjs
scripts/smoke-test-work-catalog-bulk-price-p2.4.mjs
scripts/test-work-catalog-bulk-price-persist-p2.4.mjs
scripts/smoke-test-work-catalog-market-p2.5.mjs
scripts/smoke-test-work-catalog-completeness-p2.6.mjs
```

**Nie włączać** do tego commita: plików `audit/`, `.cursor/`, niepowiązanych zmian w `App.tsx` poza etykietami workcatalog (review diff przed commitem).

---

## 6. Backlog (OPEN — poza freeze)

| ID | Temat | Uwagi |
|----|-------|-------|
| **P2.7** | Pakiety robót UI | **CLOSED** (2.63.38) |
| **P2.8** | Pakiety UX MIN | **CLOSED** (2.63.39) |
| **P2.9** | Pakiety filtry i badge | **CLOSED** (2.63.40) |
| **P2.10** | Roboty ulubione (filtr + gwiazdka) | **CLOSED** (2.63.41 · #6D) |
| — | Deferred bootstrap on mount | race hooków — #6E |
| — | Cutover Przetargi → v3 (#5C) | wymaga briefu produktowego · **OPEN** |
| — | Historia cen / audyt | nowy KV lub Audit Hub |
| — | Aktualizacja rynku (P3 UI) | osobny pipeline |

**Nie rozpoczynać bez wyraźnego polecenia właściciela repo.**
