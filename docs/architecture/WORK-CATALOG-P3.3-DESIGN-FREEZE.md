# WORK-CATALOG-P3.3 — DESIGN FREEZE

> **ID:** WORK-CATALOG-P3.3-DESIGN-FREEZE  
> **Etykieta:** Market Pricing UX · **nie** = historyczne P3.3A–D (benchmark robocizny CLOSED)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **IMPLEMENT ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-29  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE · Gate G1–G9 **ALL-NIE\*** (\*G2 = wyłącznie nowy klucz flagi FEATURE)  
> **Priorytet:** **P1**  
> **Wejście:** AUDIT **PASS** ([`WORK-CATALOG-P3.3-AUDIT.md`](WORK-CATALOG-P3.3-AUDIT.md)) · PLAN **PASS** ([`WORK-CATALOG-P3.3-PLAN.md`](WORK-CATALOG-P3.3-PLAN.md) · [`WORK-CATALOG-P3.3-PLAN-COMPLETE.md`](WORK-CATALOG-P3.3-PLAN-COMPLETE.md))  
> **Baseline tip:** UI **2.65.78** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależności CLOSED:** Work Catalog P3.1 · P3.2 · COST-02-A · GAP-A · AI-COST-02-B · AI-COST-01 **FROZEN**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (WORK-CATALOG-P3.3 Phase 1):
  Domknąć operacyjny UX Biblioteki Robót nad P3.1–P3.2:
  S4 mount CSV + commit/rollback · S5 market coverage · S6 mobile
  — BEZ MPI / parserów / Bid / AI-COST core / Payroll / Cloud CORE
  — BEZ „rynek → cena firmy” (D-C) · BEZ rewrite P3.1/P3.2

IMPLEMENT zakazany do: Architecture Review PASS + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*jedyny wyjątek FEATURE: nowy klucz flagi
                        kw-wc-p33-market-pricing-ux — bez kasowania/migracji LP)
G3 Cloud Sync:   NIE   (*REUSE istniejącego persist katalogu wewnątrz
                        commitMarketQuotesImport — BEZ edycji cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (bez nowych tras — panel w istniejącej Bibliotece)

Wynik: ALL-NIE · FEATURE
Owner GO CORE: NIE
Owner GO IMPLEMENT (slice): TAK — po Arch Review PASS
```

Jeżeli IMPLEMENT naruszy Payroll / edytuje `cloud-sync.ts` / Storage CORE / Edge payroll → **STOP** · nowy DF.

---

## 1. Cel architektoniczny (zamrożony)

Zamrozić **cienkie domknięcie UX** Biblioteki Robót nad już istniejącym stosem market:

1. **S4** — użytkownik uruchamia import CSV rynkowych, widzi preview, **commituje** `marketQuotes` i może **cofnąć** lokalnie.  
2. **S5** — użytkownik widzi **pokrycie rynku** (engine vs legacy/none) dla aktywnego regionu.  
3. **S6** — flow import/commit jest **Mobile First** (touch ≥44px).

**Baseline S1–S3** (Engine API + porównanie w wierszu) = **SHIPPED** — ratyfikowane, **bez rewrite**.

**Sukces EPIC ≠** Bid == Owner ~1,6M.  
**Sukces EPIC =** flaga ON → S4–S6 zgodne z AC · flaga OFF → parity tip (S1–S3 bez regresji).

---

## 2. Decyzje produktowe zamrożone (D-A…D-D)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-A** | Architektura Engine vs legacy `marketAvgPln` | **a2** — moduł Engine obok; legacy = fallback/rollback ścieżka odczytu; `work-catalog-market-comparison.ts` progi **nie** przepisywane |
| **D-B** | Region startu hierarchii market | **b1** — `store.activeRegion` → `MarketRegionCode` (jak S1) |
| **D-C** | „Zastosuj rynek jako `companyPricePln`” | **OUT Phase 1** — osobny thin slice po PV |
| **D-D** | Feature flag | **TAK** · klucz **`kw-wc-p33-market-pricing-ux`** · default **OFF** · scope **tylko S4–S5 UX** (nie chowa S1–S3) |

Zmiana D-A…D-D = **amend DF** + Owner GO.

---

## 3. Zakres funkcjonalny Phase 1 — IN (zamrożony)

### 3.1 S4 — Import CSV end-to-end

| ID | Wymaganie FROZEN |
|----|------------------|
| **S4.1** | Entry w Bibliotece Robót (CTA) widoczny **tylko gdy flaga ON** |
| **S4.2** | **Mount** istniejącego `WorkCatalogCsvImportPreviewPanel` (lub cienki wrapper bez duplikacji preview) |
| **S4.3** | Preview = REUSE `previewMarketCsvImport` + VM `work-catalog-csv-import-preview` — **bez zapisu** do Commit |
| **S4.4** | CTA **Zastosuj / Commit** → **wyłącznie** `commitMarketQuotesImport` (P3.2-S3) |
| **S4.5** | CTA **Cofnij** → lokalny rollback snapshot REUSE P3.2 (`restoreMarketQuotesSnapshot` / API commit flow) |
| **S4.6** | UX wyniku: sukces · partial · blocked (`catalogWriteMode`) — jasny komunikat PL |
| **S4.7** | UI **nie** woła bezpośrednio `applyMarketQuotesFromPreview` poza orchestration commit |

### 3.2 S5 — Market Coverage

| ID | Wymaganie FROZEN |
|----|------------------|
| **S5.1** | Strip/panel pokrycia dla **aktywnego regionu**: udział robót z ceną z **engine** (`marketQuotes` / `priceOrigin === engine`) vs legacy_seed / legacy_avg / none |
| **S5.2** | Agregacja = pure helper app-layer oparty o **`buildEngineMarketComparisonForWork`** (lub równoważny odczyt Engine) — **bez** nowej formuły średniej |
| **S5.3** | **Nie** zastępuje / nie miesza z Completeness P2.6 (`companyPricePln`) — panel **obok** |
| **S5.4** | Widoczny **tylko gdy flaga ON** |

### 3.3 S6 — Mobile First

| ID | Wymaganie FROZEN |
|----|------------------|
| **S6.1** | Entry import · Commit · Rollback: `min-h-[44px]` · touch-manipulation |
| **S6.2** | Preview używalny na wąskim viewport (bez krytycznego horizontal overflow) |
| **S6.3** | Brak regresji listy Biblioteki / wiersza `WorkCatalogMarketComparison` (S1–S3) |

### 3.4 Baseline S1–S3 (ratyfikacja)

| ID | Wymaganie FROZEN |
|----|------------------|
| **B1** | Porównanie w wierszu pozostaje na Engine API — **ZERO rewrite** logiki S1–S3 |
| **B2** | Progi 🟢🟡🔴 = wyłącznie `buildMarketComparison` (P2.5) |

### 3.5 Cross-cutting IN

| ID | Wymaganie |
|----|-----------|
| **X1** | Feature flag §7 |
| **X2** | DOM markers PV: `data-wc-p33-flag`, `data-wc-p33-import-entry`, `data-wc-p33-commit`, `data-wc-p33-rollback`, `data-wc-p33-coverage` |
| **X3** | Testy unit/regresja S4 path + S1–S3 + P3.2 |
| **X4** | Changelog bump UI przy release IMPLEMENT (po GO) |

---

## 4. Zakres funkcjonalny OUT (zamrożony — twarde)

```text
✗ NG-05 MPI / scraping / nowe feedi legal-sensitive
✗ Nowe market source adapters poza istniejącymi P3.1
✗ Rewrite / zmiana formuły P3.1 computeMarketAverageForWork
✗ Rewrite P3.2 apply/rollback/commit lib (poza wywołaniem z UI)
✗ Zmiana progów buildMarketComparison (P2.5)
✗ Parsery ZIP / ATH / PDF · Discovery · Heavy pipeline
✗ Bid Calculator · computeTenderBidProposal
✗ AI-COST-01 S1–S7 thaw · AI-COST-02-B rewrite · OfferBoq core
✗ COST-BID-GAP-01 / GAP-A re-open · GAP-B costModel
✗ Hardcode / target Bid ~1,6M
✗ Payroll · cloud-sync.ts (edycja) · Edge payroll · Storage CORE
✗ Jobs / Harmonogram / Raporty export
✗ S7 / D-C: rynek → companyPricePln
✗ Cloud rollback importu (tylko lokalny snapshot P3.2)
✗ Nowe trasy routingu · zmiana catalogWriteMode defaults
✗ Chowanie S1–S3 za flagą (regresja tip)
```

---

## 5. Zakres techniczny (zamrożony)

### 5.1 Architektura (FROZEN)

```text
UI (flag ON)
  → WorkCatalogView entry + coverage
  → WorkCatalogCsvImportPreviewPanel (+ Commit/Rollback CTA)
       → previewMarketCsvImport (RO)
       → commitMarketQuotesImport (WRITE orchestration)
            → apply + snapshot + catalog-write-router (+ istniejący sync katalogu)
  → coverage helper → buildEngineMarketComparisonForWork

Konsumenci AI-COST / Bid / OfferBoq: ZERO DIFF kodu Phase 1
  (korzystają z marketQuotes po zapisie — regresja only)
```

### 5.2 Zasady techniczne

| Reguła | FROZEN |
|--------|--------|
| SSOT `marketQuotes` | Work Catalog store schema v4 |
| Jedyny zapis importu z UI | `commitMarketQuotesImport` |
| Zakaz drugiej średniej w UI | UI tylko Engine / VM |
| Boundary FEATURE | Allowlista §6 · Bloklista §6.2 |
| #CORE-013 | Bez mixed FEATURE+CORE w jednym commit |

---

## 6. Komponenty objęte zmianami (allowlista — FROZEN)

Orientacyjna allowlista (DF zamraża **zestaw**; dokładne nazwy plików mogą dostać +1 cienki helper w Arch Review bez wychodzenia poza IN):

| Ścieżka / obszar | Rola |
|-----------------|------|
| `src/app/work-catalog/WorkCatalogView.tsx` | Entry S4 · mount coverage S5 · gate flagą |
| `src/app/work-catalog/WorkCatalogCsvImportPreviewPanel.tsx` | Commit / Rollback CTA · wire P3.2 |
| `src/app/work-catalog/work-catalog-csv-import-preview.ts` | Tylko jeśli potrzeba cienkiego VM pod commit status — **bez** nowej logiki average |
| Nowy cienki: `work-catalog-market-coverage.ts` (+ opc. panel TSX) | S5 agregacja RO z Engine |
| Nowy: `src/lib/wc-p33-flag.ts` (lub równoważny pod `src/lib/work-catalog/`) | Flaga LS — **nie** Payroll hooks |
| `src/app/changelog-data.ts` | Bump UI przy release |
| `scripts/test-work-catalog-p33-*.mjs` (+ regresja istniejących S1–S3/P3.2) | AC |
| `docs/architecture/WORK-CATALOG-P3.3-*` | DF / IMPL / PV / CLOSEOUT |

**S1–S3 pliki** (`work-catalog-market-engine.ts`, `WorkCatalogMarketComparison.tsx`): **dotknięcie tylko jeśli** Arch Review wymaga markerów / importów — **zakaz** zmiany semantyki Engine.

---

## 6.2 Komponenty wyłączone ze zmian (bloklista — FROZEN)

| Obszar | Przykłady |
|--------|-----------|
| Market engine lib P3.1 | `market-average-engine.ts`, adapters `sekocenbud` / `kb-pl` / … |
| Persist lib P3.2 | `apply-market-quotes.ts`, `rollback-market-quotes.ts`, `commit-market-quotes.ts` (**wywołanie OK · edycja logiki NIE**) |
| Progi P2.5 | Semantyka `buildMarketComparison` |
| AI-COST / Bid | `tender-offer-boq*.ts` (poza ewentualnym zerem), `tenders-bid-calculator*`, controlled-price **ZERO DIFF** |
| GAP-A | `cost-bid-gap-01*` |
| Parsery / Heavy | dossier parse · zip · ath |
| Payroll / Cloud CORE | `PayrollView`, `cloud-sync.ts`, Edge `make-server-*` payroll paths |
| Storage CORE | nowe storage managers / budget rewrite |
| Completeness P2.6 semantyka | nie mieszać z coverage |
| Jobs / Harmonogram | — |

---

## 7. REUSE — punkty zamrożone

| ID | Artefakt | Użycie FROZEN |
|----|----------|---------------|
| **R1** | `computeMarketAverageForWork` + adapters P3.1 | Przez Engine S1 — bez rewrite |
| **R2** | `previewMarketCsvImport` | Preview CSV |
| **R3** | `applyMarketQuotesFromPreview` | Tylko wewnątrz commit orchestration |
| **R4** | Snapshot capture/restore P3.2 | Rollback lokalny |
| **R5** | **`commitMarketQuotesImport`** | **Jedyny** zapis importu z UI |
| **R6** | `catalog-write-router` / routed save | Wewnątrz commit |
| **R7** | `buildMarketComparison` | Progi porównania |
| **R8** | `buildEngineMarketComparisonForWork` | Porównanie + coverage |
| **R9** | `WorkCatalogMarketComparison` | Baseline UI — bez rewrite |
| **R10** | **`WorkCatalogCsvImportPreviewPanel`** | **Mount + Commit wire** |
| **R11** | `createControlledMarketPriceProvider` | Regresja only — ZERO DIFF |
| **R12** | GAP-A path / flaga | As-is — ZERO DIFF |
| **R13** | `WorkCatalogCompletenessPanel` | Bez zmian semantyki — coverage obok |
| **R14** | Istniejący sync katalogu w commit | REUSE — bez edycji `cloud-sync.ts` |

---

## 8. Feature Flag (zamrożona)

| Pole | Wartość **FROZEN** |
|------|-------------------|
| **Klucz LS** | **`kw-wc-p33-market-pricing-ux`** |
| **Default** | **OFF** |
| **ON (`1` / truthy)** | Entry import · panel CSV+Commit/Rollback · coverage strip |
| **OFF (brak / `0`)** | Parity tip: S1–S3 bez zmian; **brak** nowych CTA S4–S5 |
| **Zakres** | **UI-only gate** dla residual S4–S5 |
| **Poza zakresem flagi** | Lib P3.1/P3.2 · Engine S1 · porównanie S2/S3 już live |
| **DOM** | Kontener Biblioteki / root flow: `data-wc-p33-flag="1"` gdy ON |

Helper odczytu: cienki pure (wzorzec `ai-cost-02-b-flag`) — **nie** `useLocalStorage` payroll.

---

## 9. Acceptance Criteria (zamrożone)

| ID | Kryterium | Dowód |
|----|-----------|--------|
| **AC-B1** | S1–S3: porównanie w wierszu nadal z Engine (status/sources/confidence) | Regresja testów + PV |
| **AC-F0** | Flaga default OFF · OFF = brak entry/coverage P3.3 | Unit + PV OFF |
| **AC-S4.1** | Flaga ON → widoczny entry import (`data-wc-p33-import-entry`) | PV ON |
| **AC-S4.2** | Preview CSV bez zapisu do Commit | UI |
| **AC-S4.3** | Commit → `commitMarketQuotesImport`; `marketQuotes` zaktualizowane | Test + PV |
| **AC-S4.4** | Rollback lokalny przywraca snapshot | Test + UI |
| **AC-S4.5** | `catalogWriteMode` blocking → komunikat, bez cichego fail | Test |
| **AC-S5.1** | Coverage widoczne przy ON (`data-wc-p33-coverage`) · agregat engine vs legacy/none | PV |
| **AC-S5.2** | Coverage nie zmienia Completeness P2.6 | Diff / UI |
| **AC-S6.1** | CTA import/commit/rollback ≥ 44px | Manual / smoke |
| **AC-X1** | Allowlista bez Payroll / cloud-sync.ts / Bid / AI-COST core / parsers | Diff review |
| **AC-X2** | Zero Diff controlled-price / GAP-A logic | Diff review |
| **AC-X3** | Regresja testów P3.2 + S1–S3 zielona | CI/local |

### Anti-AC (świadomie NIE są AC)

| ID | Nie jest kryterium pass/fail |
|----|------------------------------|
| **AC-X-BID** | Bid == ~1,6M |
| **AC-X-COMPANY** | Automatyczne ustawienie `companyPricePln` z rynku |
| **AC-X-MPI** | Odblokowanie NG-05 |

---

## 10. Rollback Strategy (zamrożona)

| Poziom | Akcja | Skutek |
|--------|-------|--------|
| **L1 — Flag OFF** | `localStorage.removeItem('kw-wc-p33-market-pricing-ux')` lub `=0` | Ukrycie S4–S5; S1–S3 bez zmian |
| **L2 — Dane po złym imporcie** | UI Rollback → restore snapshot P3.2 | Lokalne przywrócenie `marketQuotes` |
| **L3 — Tip revert** | Revert FEATURE commit na `main` / poprzedni deploy | Usunięcie kodu S4–S5 |
| **L4 — Zakaz** | Cloud „global un-commit” importu | **NIE w Phase 1** |

Default **OFF** = tip bezpieczny nawet gdy kod S4–S5 jest na `main`.

---

## 11. Integracje (zamrożone granice)

| System | Write w P3.3? | Kod Phase 1 |
|--------|---------------|-------------|
| **Work Catalog** | **TAK** (marketQuotes via commit) | IN allowlista |
| **AI-COST** | NIE | ZERO DIFF · regresja RO |
| **Przetargi / Bid** | NIE | ZERO DIFF |
| **Kosztorysy / OfferBoq UI** | NIE | ZERO DIFF |
| **Payroll / Cloud CORE / Storage** | NIE | BLOKLISTA |

```text
Integracja = ZAPIS w katalogu → ODCZYT u konsumentów.
P3.3 nie wstrzykuje cen do Bid w UI przetargu.
```

---

## 12. Zgodność z zasadami projektu (DF)

| Zasada | Werdykt DF |
|--------|------------|
| **SSOT FIRST** | **PASS** — `marketQuotes` + Engine + `commitMarketQuotesImport` |
| **REUSE FIRST** | **PASS** — R1–R14 · mount orphan panel · wire P3.2 |
| **ZERO DUPLICATE LOGIC** | **PASS** — zakaz lokalnej średniej/progów · apply tylko przez commit |
| **MOBILE FIRST** | **PASS** — S6 + AC-S6.1 |
| **Payroll Safety Gate** | **PASS** — ALL-NIE FEATURE (§0) |

---

## 13. Kryteria „READY FOR ARCHITECTURE REVIEW”

| Check | Stan |
|-------|------|
| D-A…D-D zamrożone | **TAK** |
| IN S4–S6 + baseline S1–S3 | **TAK** |
| OUT twarde (MPI/parsery/Bid/AI-COST/Payroll/Cloud/D-C/rewrite) | **TAK** |
| Allowlista / bloklista | **TAK** |
| REUSE R1–R14 | **TAK** |
| Flag `kw-wc-p33-market-pricing-ux` default OFF | **TAK** |
| AC + Anti-AC + Rollback | **TAK** |
| Gate ALL-NIE | **TAK** |
| Blokery do Arch Review | **BRAK** |

---

## 14. Następny krok procesu

```text
[DONE]  AUDIT · PLAN · DESIGN FREEZE (ten dokument)
[NEXT]  Architecture Review (#CORE-014 Boundary)
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
```

**Zakaz teraz:** IMPLEMENT · commit · push.

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**IMPLEMENT:** **BLOCKED** do Arch Review PASS + Owner GO
