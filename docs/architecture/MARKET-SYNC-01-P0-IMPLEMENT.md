# MARKET-SYNC-01 P0 — IMPLEMENT REPORT

> **ID:** MARKET-SYNC-01-P0-IMPLEMENT  
> **Data:** 2026-07-30  
> **EPIC:** MARKET-SYNC-01 · Slice **P0**  
> **Owner GO IMPLEMENT:** TAK  
> **DF / AR:** FROZEN · READY FOR OWNER GO  
> **Commit / push:** **NIE** (czekają na Owner)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P0 IMPLEMENT
Rekomendacja: READY FOR RELEASE P0
════════════════════════════════════════════════════════
```

---

## PAYROLL SAFETY GATE

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE klucz staging kw-market-sync-01-staging — bez LP)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (mount w istniejącej Bibliotece)
Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
```

---

## 1. Komponenty / modele / ekrany

### Modele (lib)

| Model | Plik |
|-------|------|
| `MarketProduct` | `src/lib/market-sync/types.ts` |
| `ProviderQuote` | `src/lib/market-sync/types.ts` |
| `SyncRun` | `src/lib/market-sync/types.ts` |
| `MarketSyncStagingStore` | `src/lib/market-sync/types.ts` |

### Komponenty lib

| Moduł | Rola |
|-------|------|
| `normalize.ts` | fold PL · EAN · unit · cena · provider |
| `import-csv.ts` | CSV → ProviderQuote (+ reject_row) |
| `match.ts` | EAN→SKU→Mfr+Name+Unit→Alias · fuzzy OFF |
| `preview.ts` | buckety Preview + diagnostyka |
| `staging-store.ts` | localStorage · JSON export/import |
| `pipeline.ts` | Import→Match→Preview · refresh |
| `index.ts` | public API |

### Ekrany UI

| Ekran | Opis |
|-------|------|
| `MarketSyncPreviewPanel` | Preview staging (Super Admin) |
| Entry | Biblioteka → **Market Sync Preview** (`WorkCatalogView`) |

### Fixtures / testy

| Artefakt |
|----------|
| `fixtures/market-sync-01/p0-sample-quotes.csv` |
| `fixtures/market-sync-01/p0-sample-products.json` |
| `scripts/test-market-sync-01-p0.mjs` |

---

## 2. BUILD STATUS

```text
npm run build
PASS
```

---

## 3. TEST STATUS

```text
npx vite-node scripts/test-market-sync-01-p0.mjs
25 PASS / 0 FAIL
```

Pokrycie: EAN · mfr+name+unit · unmatched · reject ceny · conflict · price_change · JSON roundtrip · alias · guard commit/publish.

---

## 4. OWNER VERIFICATION (P0)

| ID | Kryterium | Wynik |
|----|-----------|--------|
| OV-1 | Brak kodu wykonującego publish / Accept | **PASS** |
| OV-2 | `commitMarketQuotesImport` nie wywoływany / nie importowany w P0 | **PASS** (T07) |
| OV-3 | Product Quotes nietknięte (brak write `marketQuotes`) | **PASS** |
| OV-4 | `controlled_market` nietknięty | **PASS** |
| OV-5 | Preview tylko na staging local | **PASS** (`kw-market-sync-01-staging`) |
| OV-6 | Eksport/import JSON staging | **PASS** (T05 + UI) |
| OV-7 | AC-P0-1…10 | **PASS** (patrz §5) |
| OV-8 | Fuzzy auto-link = 0 | **PASS** |
| OV-9 | Brak zmian AI-COST / Cloud CORE / Bid / Payroll / Parser / Scoring | **PASS** |

---

## 5. Acceptance Criteria P0

| AC | Status |
|----|--------|
| AC-P0-1 Model MP + PQ | **PASS** |
| AC-P0-2 Import→Normalize→Match→Preview fixture | **PASS** |
| AC-P0-3 Preview buckety | **PASS** |
| AC-P0-4 Match priorytet · conflict · fuzzy 0 | **PASS** |
| AC-P0-5 Brak commit Quotes | **PASS** |
| AC-P0-6 Brak Accept / origins MARKET_ORIGIN_IDS | **PASS** |
| AC-P0-7 Local-only · brak `cloud-sync.ts` | **PASS** |
| AC-P0-8 Testy pure | **PASS** |
| AC-P0-9 UI Super Admin | **PASS** |
| AC-P0-10 OUT zachowane | **PASS** |

---

## 6. Wpływ na produkcję

| Obszar | Wpływ |
|--------|--------|
| Work Catalog KV | **brak** |
| Product Quotes / `marketQuotes` | **brak** |
| controlled_market | **brak** |
| Cloud Sync CORE | **brak** |
| AI-COST / Bid / Scoring / Parser / Payroll | **brak** |

Jedyny side-effect: nowy klucz **FEATURE** localStorage staging + wpis CHANGELOG 2.65.84 + entry UI.

---

## 7. VERSION

| | |
|--|--|
| Changelog | **2.65.84** |
| HEAD | (lokalny WIP — nie commitnięty) |
| origin/main | bez zmian z tego IMPLEMENT |

---

## 8. GIT READINESS

Pliki IMPLEMENT (do eventu. commit na polecenie Ownera):

- `src/lib/market-sync/**`
- `src/app/market-sync/MarketSyncPreviewPanel.tsx`
- `src/app/work-catalog/WorkCatalogView.tsx`
- `src/app/GuideView.tsx`
- `src/app/changelog-data.ts`
- `CHANGELOG.md`
- `fixtures/market-sync-01/**`
- `scripts/test-market-sync-01-p0.mjs`
- `docs/architecture/MARKET-SYNC-01-P0-IMPLEMENT.md` (ten plik)

**Staged / Committed:** NIE (Owner nie kazał commit).  
**RELEASE:** wymaga commit + push Owner GO.

---

## 9. RELEASE READINESS

| | |
|--|--|
| Build | PASS |
| Test | PASS |
| OV | PASS |
| Scope P0 STOP | PASS |
| Commit | **NOT DONE** |
| Push | **NOT DONE** |

**Werdykt pakietu kodu:** **READY FOR RELEASE P0** (po Owner GO commit/push).  
**Werdykt procesu:** IMPLEMENTATION COMPLETE pod względem kodu/testów; release czeka na commit.

---

## 10. Rekomendacja

### READY FOR RELEASE P0

Następny krok Ownera: commit (jawna lista plików) → push `main` → VERIFY FAST `version.json` = 2.65.84.

**Zakaz:** P1 · Accept · Publish — bez osobnego Owner GO.
