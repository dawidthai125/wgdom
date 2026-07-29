# WORK-CATALOG-P3.3 — PLAN

> **ID:** WORK-CATALOG-P3.3-PLAN  
> **MODE:** **PLAN ONLY** · **DOCS ONLY** · **bez IMPLEMENT / commit / push / DESIGN FREEZE**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **AUDIT:** [`WORK-CATALOG-P3.3-AUDIT.md`](WORK-CATALOG-P3.3-AUDIT.md) · **PASS** · **RECOMMENDED AS NEXT** · **P1**  
> **Baseline tip:** UI **2.65.78** · AI-COST-02-B **CLOSED** · SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Etykieta:** Market Pricing UX · **nie** mylić z historycznym P3.3A–D (benchmark robocizny CLOSED)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (WORK-CATALOG-P3.3 Phase 1):
  Domknąć operacyjny UX Biblioteki Robót nad P3.1–P3.2:
  widzieć rynek · zasilać marketQuotes (CSV→preview→commit)
  · widzieć pokrycie rynku — BEZ nowego silnika / NG-05 / Payroll.

Sukces ≠ Bid == ~1,6M.
Sukces = katalog jest używalnym SSOT cen rynkowych dla wyceny.
════════════════════════════════════════════════════════
```

---

## 0. Wejście i workflow

| Pole | Stan |
|------|------|
| AUDIT | **PASS** · RECOMMENDED AS NEXT · P1 |
| P3.1 / P3.2 | **CLOSED** (silnik + apply/rollback/commit lib) |
| UI partial | **S1–S3** w kodzie (Engine API + porównanie w wierszu) |
| CSV Preview panel | **Istnieje** · **NIE zamontowany** w `WorkCatalogView` · **brak** wire `commitMarketQuotesImport` |
| Konsument AI-COST | COST-02-A / GAP-A **CLOSED** — odczyt `marketQuotes` |
| STABILIZATION | **ACTIVE** — IMPLEMENT tylko po DF + Arch Review + Owner GO |

```text
[DONE]  AUDIT
[NOW]   PLAN            → TEN DOKUMENT
[NEXT]  DESIGN FREEZE   → D-A…D-D + allowlista + AC
[NEXT]  Architecture Review + Boundary #CORE-014
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
```

---

## 1. Architektura rozwiązania (REUSE FIRST)

### 1.1 Warstwy (bez nowego silnika)

```text
┌─────────────────────────────────────────────────────────┐
│  UI Biblioteka Robót (Phase 1 residual)                 │
│  · WorkCatalogMarketComparison (S1–S3 — JUŻ)            │
│  · Entry + CsvImportPreview (MOUNT)                     │
│  · Commit / Rollback CTA (WIRE P3.2)                    │
│  · Market coverage strip (NEW thin · REUSE engine)      │
└───────────────────────┬─────────────────────────────────┘
                        │ tylko Public API / lib exports
┌───────────────────────▼─────────────────────────────────┐
│  App adapters (pure)                                    │
│  · work-catalog-market-engine.ts (S1)                   │
│  · work-catalog-csv-import-preview.ts (P3.2B VM)        │
│  · work-catalog-market-comparison.ts (P2.5 progi SSOT)  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│  Lib SSOT (`@/lib/work-catalog`)                        │
│  · computeMarketAverageForWork · adapters · preview CSV │
│  · applyMarketQuotesFromPreview                         │
│  · capture/restore snapshot · commitMarketQuotesImport  │
│  · store / sync / catalog-write-router                  │
└───────────────────────┬─────────────────────────────────┘
                        │ odczyt (bez zmian Phase 1)
┌───────────────────────▼─────────────────────────────────┐
│  Konsumenci wyceny (OUT kodu P3.3 — weryfikacja regresji)│
│  · createControlledMarketPriceProvider (COST-02-A)      │
│  · GAP-A catalog overlay (flaga as-is)                  │
│  · OfferBoq explain / Bid Proposal                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Zasady architektoniczne Phase 1

| Zasada | Reguła PLAN |
|--------|-------------|
| **SSOT cen rynkowych** | `CatalogWork.marketQuotes` w Work Catalog store (schema v4) |
| **SSOT porównania firma↔rynek** | `buildMarketComparison` (P2.5) — UI **nie** definiuje progów |
| **SSOT średniej rynkowej** | `computeMarketAverageForWork` (P3.1) przez `buildEngineMarketComparisonForWork` |
| **SSOT zapisu importu** | wyłącznie `commitMarketQuotesImport` (P3.2-S3) |
| **Zakaz** | druga średnia w UI · scraping · MPI · edycja Bid / S1–S7 · Payroll write-path |

### 1.3 Stan już shipped vs residual (mapa slice)

| Slice | Zawartość | Stan w tip **2.65.78** |
|-------|-----------|-------------------------|
| **S1** | Public API Engine (`work-catalog-market-engine.ts`) | **SHIPPED** |
| **S2** | Status band z Engine w UI | **SHIPPED** (`WorkCatalogMarketComparison`) |
| **S3** | Sources + confidence + origin hint | **SHIPPED** |
| **S4** | Entry point import CSV + **Commit/Rollback** UI → P3.2 | **MISSING** (panel orphan) |
| **S5** | Market coverage (ile robót ma engine quotes vs legacy/seed) | **MISSING** (Completeness = tylko `companyPricePln`) |
| **S6** | Mobile polish residual (import flow · feedback commit) | **PARTIAL** (porównanie ma 44px; brak flow importu) |
| **S7** | Opt-in „rynek → cena firmy” | **DECISION D-C** — rekomendacja PLAN: **OUT Phase 1** |

**Phase 1 IMPLEMENT = S4 + S5 + S6** (+ ratyfikacja S1–S3 w DF jako baseline, bez rewrite).

---

## 2. Zakres funkcjonalny Phase 1

### F1 — Porównanie rynek (baseline, bez rewrite)

- Użytkownik w wierszu roboty widzi: cena firmy · cena rynek · status · źródła · confidence.  
- Dane **wyłącznie** z `buildEngineMarketComparisonForWork`.  
- DF ratyfikuje D-A/D-B; brak zmiany progów P2.5.

### F2 — Import rynkowy end-to-end (główny gap)

1. Entry w Bibliotece Robót (np. akcja „Import cen rynkowych CSV”).  
2. Montaż `WorkCatalogCsvImportPreviewPanel` (lub cienki wrapper).  
3. Preview = istniejący `previewMarketCsvImport` + VM P3.2B.  
4. CTA **Zastosuj** → `commitMarketQuotesImport` (load → snapshot → apply → save router → report).  
5. CTA **Cofnij ostatni import** (lokalny rollback snapshot P3.2) — w tym samym flow lub bezpośrednio po sukcesie.  
6. Komunikaty: matched / low_confidence / unmatched / blocked (`catalogWriteMode`).

### F3 — Pokrycie rynku (coverage)

- Thin panel / strip: % robót (aktywny region) z **engine market** (`marketQuotes` produktywne) vs legacy_seed/avg/none.  
- REUSE Engine API per work (lub lekki agregator pure w app layer — **bez** nowej formuły średniej).  
- **Nie** zastępuje Completeness P2.6 (cena firmy) — **obok**.

### F4 — Mobile First

- Entry import + Commit/Rollback: `min-h-[44px]`, czytelne podsumowanie preview na wąskim viewport.  
- Brak regresji listy / wiersza porównania.

---

## 3. Dokładny zakres REUSE

| ID | Artefakt | Użycie w Phase 1 |
|----|----------|------------------|
| R1 | `computeMarketAverageForWork` + adapters | Odchylenie / źródła (przez S1) |
| R2 | `previewMarketCsvImport` | Preview CSV |
| R3 | `applyMarketQuotesFromPreview` | Wewnątrz commit (nie wołać z UI osobno) |
| R4 | `captureMarketQuotesSnapshot` / `restore…` | Rollback lokalny |
| R5 | `commitMarketQuotesImport` | **Jedyny** zapis importu z UI |
| R6 | `catalog-write-router` / `saveWorkCatalogRouted` | Już w commit |
| R7 | `buildMarketComparison` | Progi 🟢🟡🔴 |
| R8 | `buildEngineMarketComparisonForWork` | UI porównania + coverage |
| R9 | `WorkCatalogMarketComparison` | Bez przepisywania logiki |
| R10 | `WorkCatalogCsvImportPreviewPanel` | Mount + rozszerzenie o Commit CTA |
| R11 | `createControlledMarketPriceProvider` | **Tylko regresja** — zero zmian kodu Phase 1 |
| R12 | GAP-A flag / path | **As-is** — zero re-open |

---

## 4. Zakres IN

| ID | Element |
|----|---------|
| I1 | Ratyfikacja S1–S3 jako baseline (DF) — bez rewrite silnika |
| I2 | Montaż entry + `WorkCatalogCsvImportPreviewPanel` w Bibliotece Robót |
| I3 | Wire **Commit** → `commitMarketQuotesImport` + UX wyniku / błędów routera |
| I4 | Wire **Rollback** lokalnego snapshotu po imporcie (REUSE P3.2) |
| I5 | Market coverage strip/panel (engine vs legacy/none) dla aktywnego regionu |
| I6 | Feature flag dla **nowego** write/coverage UX (patrz §7) |
| I7 | Testy: S4 commit UI path (lib już ma) + regresja S1–S3 + P3.2 |
| I8 | Mobile AC dla import/commit |
| I9 | DOM markers PV (`data-wc-p33-*`) dla coverage / commit / flag |
| I10 | Docs: DF → PV → CLOSEOUT (po GO) |

---

## 5. Zakres OUT

| ID | Element | Powód |
|----|---------|--------|
| O1 | NG-05 MPI / scraping / nowe feedy legal | BLOCKED · osobny program |
| O2 | Nowe adapters źródeł poza istniejącymi | Scope creep |
| O3 | Zmiana `computeMarketAverageForWork` / formuły średniej | P3.1 CLOSED |
| O4 | Zmiana progów `buildMarketComparison` | P2.5 SSOT |
| O5 | Parsery ZIP/ATH · Discovery · Heavy | Poza EPIC |
| O6 | Bid calculator · `computeTenderBidProposal` | Freeze / SSOT oferty |
| O7 | AI-COST-01 S1–S7 thaw · 02-B rewrite | CLOSED / Freeze |
| O8 | GAP-A re-open · GAP-B costModel | Osobne DF |
| O9 | Hardcode / target 1,6M | Zakaz |
| O10 | Payroll · `cloud-sync.ts` CORE · Edge payroll | Safety Gate |
| O11 | Jobs / Harmonogram / Raporty export | Poza Phase 1 |
| O12 | **S7 apply market → `companyPricePln`** | Rekomendacja **OUT Phase 1** (D-C) — osobny thin slice |
| O13 | Cloud rollback importu | P3.2: rollback tylko lokalny |
| O14 | Zmiana `catalogWriteMode` defaults | Ops poza EPIC |

---

## 6. Punkty integracji

### 6.1 Work Catalog (Primary — WRITE + UX)

| Punkt | Plik / API | Zmiana Phase 1 |
|-------|------------|----------------|
| Lista / wiersz | `WorkCatalogView` · `WorkCatalogWorkRow` | Entry import; coverage; **bez** zmiany S1–S3 logiki |
| Porównanie | `WorkCatalogMarketComparison` | Regresja only |
| Engine | `work-catalog-market-engine.ts` | Regresja; ewentualny helper coverage |
| CSV UI | `WorkCatalogCsvImportPreviewPanel` | **Mount + Commit/Rollback** |
| Persist | `commitMarketQuotesImport` | Wywołanie z UI |
| Completeness P2.6 | `WorkCatalogCompletenessPanel` | **Nie mieszać** — coverage osobno |

### 6.2 AI-COST (konsument RO — bez zmian kodu)

| Punkt | Plik / API | Zmiana Phase 1 |
|-------|------------|----------------|
| Controlled market | `tender-offer-boq-controlled-price-source.ts` | **Brak** — po imporcie automatycznie więcej hitów |
| OfferBoq build | `tender-offer-boq-explainability.ts` / `tender-offer-boq.ts` | **Brak** |
| Weryfikacja | Smoke / PV: po commit quotes → benchmark origin na fixture z mapowaniem | **Test only** |

### 6.3 Przetargi (konsument pośredni)

| Punkt | Rola | Zmiana Phase 1 |
|-------|------|----------------|
| Pipeline item / Bid Proposal | Czyta OfferBoq / catalog path | **Brak** zmian kodu |
| GAP-A overlay | Opcjonalny market na catalog rates | **As-is** (flaga Ownera) |
| Outcome / TRE | Nie dotykać | **OUT** |

### 6.4 Kosztorysy (OfferBoq UI)

| Punkt | Rola | Zmiana Phase 1 |
|-------|------|----------------|
| `OfferBoqCostIntelligencePanel` | Pokazuje controlled_market / 02-B explain | **Brak** zmian; regresja wizualna opcjonalna |
| Sticky / Wave UX | Nie dotykać | **OUT** |

```text
Integracja = ZAPIS w katalogu → ODCZYT u konsumentów.
P3.3 NIE wstrzykuje cen do Bid w UI przetargu.
```

---

## 7. Feature Flag

| Pole | Wartość PLAN (rekomendacja → DF) |
|------|----------------------------------|
| **Potrzebna?** | **TAK** — dla residual **S4–S5** (write + coverage), nie dla już live S1–S3 |
| **Klucz LS** | `kw-wc-p33-market-pricing-ux` |
| **Default** | **OFF** |
| **ON** | Pokazuje entry import+commit oraz coverage strip |
| **OFF** | Parity tip: porównanie S1–S3 bez zmian; brak nowych CTA commit/coverage |
| **Gate** | **UI-only** — lib P3.2 pozostaje dostępna dla testów/scriptów |
| **Payroll G2** | Jedyny wyjątek FEATURE: nowy klucz LS — bez migracji/kasowania LP |

**Uzasadnienie:** S1–S3 już na tipie bez flagi — chowanie ich byłoby regresją. Flaga chroni **nowy write-path UX** w Stabilization Window.

---

## 8. Acceptance Criteria

| ID | Kryterium | Dowód |
|----|-----------|--------|
| **AC1** | S1–S3: porównanie w wierszu nadal z Engine API (status/sources/confidence) | Regresja testów S1–S3 + PV |
| **AC2** | Flaga OFF: brak entry commit/coverage P3.3; brak regresji listy Biblioteki | PV OFF |
| **AC3** | Flaga ON: widoczny entry „Import cen rynkowych CSV” | PV ON · `data-wc-p33-import-entry` |
| **AC4** | Preview CSV działa (matched / unmatched / …) bez zapisu do momentu Commit | UI + istniejące preview tests |
| **AC5** | Commit wywołuje `commitMarketQuotesImport`; po sukcesie `marketQuotes` zaktualizowane w store | Test + PV |
| **AC6** | Rollback lokalny przywraca snapshot marketQuotes z przed commit | Test P3.2 + UI |
| **AC7** | Coverage strip pokazuje agregat engine vs legacy/none dla aktywnego regionu | PV · `data-wc-p33-coverage` |
| **AC8** | Mobile: CTA import/commit ≥ 44px; preview używalny na wąskim viewport | Manual / smoke |
| **AC9** | Zero zmian plików Payroll / `cloud-sync.ts` / Edge payroll w allowliście | Diff review |
| **AC10** | Zero zmian Bid calculator / AI-COST-01 core / GAP-A flag logic | Diff review |
| **AC11** | Po imporcie (ON): konsument COST-02-A może dostać więcej `controlled_market` na zmapowanych robotach (smoke RO) | Opcjonalny PV przecięcia — **nie** wymaga Bid==1,6M |
| **AC12** | `catalogWriteMode` legacy_only → commit blocked z jasnym komunikatem (REUSE routera) | Test |

**Poza AC:** wartość Bid vs Owner — **MONITOR only**.

---

## 9. Rollback Plan

| Warstwa | Akcja |
|---------|--------|
| **Feature** | `localStorage.removeItem('kw-wc-p33-market-pricing-ux')` lub `=0` → ukrycie S4–S5 UX |
| **Dane po złym imporcie** | UI Rollback → `restoreMarketQuotesSnapshot` (P3.2) — lokalnie |
| **Kod** | Revert tip / redeploy poprzedniego commit (Vercel z `main`) |
| **Konsumenci** | Brak migracji schemy; odczyt toleruje brak quotes |
| **Zakaz rollback** | Cloud „un-commit” globalny — **nie** w Phase 1 |

Default flag **OFF** = bezpieczny tip nawet gdy kod S4–S5 jest na `main`.

---

## 10. Ryzyka i mitigacje

| ID | Ryzyko | Mitigacja PLAN |
|----|--------|----------------|
| R1 | Scope → NG-05 / scraping | OUT O1–O2 · DF anti-goals |
| R2 | Duplikacja średniej/progów w UI | Tylko Engine + `buildMarketComparison` |
| R3 | Persist / sync kolizja | Wyłącznie `commitMarketQuotesImport` + router |
| R4 | Przypadkowa zmiana `companyPricePln` | S7 **OUT** Phase 1 (D-C) |
| R5 | Orphan panel / niepełny flow | S4 = mount + commit = **must** |
| R6 | Mylenie z P3.3A–D | ID `WORK-CATALOG-P3.3` + etykieta Market Pricing UX |
| R7 | Oczekiwanie Bid=1,6M | AC bez targetu kwotowego · komunikat sukcesu = coverage/operacyjność |
| R8 | `catalogWriteMode` blokuje zapis | AC12 + copy PL |
| R9 | Payroll / CORE przypadkiem | Allowlista FEATURE-only · Gate ALL-NIE |
| R10 | Flaga chowa S1–S3 | Flaga **tylko** S4–S5 |

---

## 11. Decyzje do DESIGN FREEZE (Owner)

| ID | Pytanie | Rekomendacja PLAN |
|----|---------|-------------------|
| **D-A** | Architektura Engine vs legacy `marketAvgPln` | **a2** (już w S1): nowy moduł obok; legacy = fallback — **ratyfikować** |
| **D-B** | Region startu hierarchii | **b1** (już w S1): `store.activeRegion` → `MarketRegionCode` — **ratyfikować** |
| **D-C** | Czy Phase 1: „Zastosuj rynek jako cenę firmy”? | **NIE** (OUT Phase 1) — osobny thin slice |
| **D-D** | Feature flag | **TAK** · default **OFF** · klucz `kw-wc-p33-market-pricing-ux` · scope **S4–S5 only** |

Zmiana D-A…D-D = amend PLAN lub decyzja w DF (bez IMPLEMENT wcześniej).

---

## 12. Allowlista (kierunek — zamrozi DF)

**Oczekiwane ścieżki (orientacyjnie):**

- `src/app/work-catalog/WorkCatalogView.tsx` (entry + coverage mount)
- `src/app/work-catalog/WorkCatalogCsvImportPreviewPanel.tsx` (Commit/Rollback)
- ewentualnie nowy cienki: `work-catalog-market-coverage.ts` / panel
- `src/lib/ai` / flag helper **nowy** (np. `wc-p33-flag.ts`) — **nie** Payroll hooks
- `src/app/changelog-data.ts` (bump UI przy release)
- `scripts/test-work-catalog-p33-*.mjs` (nowe)
- docs architecture P3.3*

**Zakaz allowlisty:** `PayrollView` · `cloud-sync.ts` · `useLocalStorage` payroll · Edge · `tender-offer-boq.ts` core · validation impactScore · parsery.

---

## 13. Payroll Safety Gate (przewidywany wynik DF)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*tylko nowy klucz flagi FEATURE)
G3 Cloud Sync:   NIE   (REUSE istniejącego persist katalogu w commit — bez edycji cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (bez nowych tras — panel w istniejącej Bibliotece)

Wynik: ALL-NIE · FEATURE
Owner GO CORE: NIE
```

Uwaga G3: commit katalogu może wołać istniejący sync Work Catalog — **bez** modyfikacji pliku `cloud-sync.ts`. DF musi to jawnie zapisać jako REUSE, nie CORE change.

---

## 14. Zgodność z zasadami projektu

| Zasada | Status PLAN |
|--------|-------------|
| **SSOT FIRST** | **PASS** — `marketQuotes` + Engine + commit orchestration |
| **REUSE FIRST** | **PASS** — P3.1/P3.2/S1–S3/CSV panel |
| **ZERO DUPLICATE LOGIC** | **PASS** — zakaz lokalnych średnich/progów |
| **MOBILE FIRST** | **PASS** — AC8 + F4 |
| **Payroll Safety Gate** | **PASS** — ALL-NIE FEATURE |

---

## 15. Kryteria „READY FOR DESIGN FREEZE”

| Check | Stan |
|-------|------|
| Cel One Bundle jasny | **TAK** |
| IN/OUT/REUSE rozdzielone | **TAK** |
| Residual vs shipped (S1–S3 vs S4–S6) | **TAK** |
| Integracje WC / AI-COST / Przetargi / Kosztorysy | **TAK** |
| Flag + Rollback | **TAK** |
| AC mierzalne bez Bid=1,6M | **TAK** |
| Decyzje D-A…D-D sformułowane | **TAK** (do zamrożenia w DF) |
| Blokery architektoniczne | **BRAK** |

---

## 16. Werdykt PLAN

```text
════════════════════════════════════════════════════════
WORK-CATALOG-P3.3 PLAN COMPLETE
Rekomendacja: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

**Uzasadnienie:** Architektura oparta w 100% o REUSE; jedyny materialny gap to **orphan CSV preview bez mount/commit** + **brak market coverage**; decyzje D-A/D-B już w kodzie do ratyfikacji; D-C/D-D mają jasną rekomendację PLAN.

**Następny dokument:** DESIGN FREEZE (osobno) — **nie** w tej rundzie.

**Zakaz teraz:** IMPLEMENT · commit · push.
