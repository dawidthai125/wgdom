# WORK-CATALOG-P3.3 — ARCHITECTURE REVIEW

> **ID:** WORK-CATALOG-P3.3-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **DF:** [`WORK-CATALOG-P3.3-DESIGN-FREEZE.md`](WORK-CATALOG-P3.3-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`WORK-CATALOG-P3.3-PLAN.md`](WORK-CATALOG-P3.3-PLAN.md) · COMPLETE **PASS**  
> **AUDIT:** [`WORK-CATALOG-P3.3-AUDIT.md`](WORK-CATALOG-P3.3-AUDIT.md) · **PASS**  
> **Foundation:** [`../work-catalog/FOUNDATION-FREEZE-v1.0.md`](../work-catalog/FOUNDATION-FREEZE-v1.0.md)  
> **Tip bazowy:** UI **2.65.78** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF WORK-CATALOG-P3.3 Phase 1
        z SSOT · Foundation · zasady projektu · AS-IS REUSE
WERDYKT: PASS (uwagi nieblokujące → IMPLEMENT constraints)
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| AUDIT | **PASS** · RECOMMENDED AS NEXT · P1 |
| PLAN | **PASS** · READY FOR DF |
| DESIGN FREEZE | **PASS** · FROZEN · READY FOR AR |
| Kod / diff IMPLEMENT | **brak** (review docs + AS-IS grepowanie REUSE) |
| Owner GO IMPLEMENTATION | **oczekuje** na ten raport |

**Metoda:** DF vs Foundation/SSOT · weryfikacja eksportów P3.1/P3.2/Engine/VM/panel · izolacja flagi · allowlista/bloklista · rollback · D-C OUT.

---

## 1. Zgodność DESIGN FREEZE z SSOT

| SSOT / kontrakt | DF | Werdykt |
|-----------------|-----|---------|
| Tip tylko w `09` | Baseline link · brak bump w DF | **PASS** |
| Work Catalog schema v4 · `marketQuotes` | SSOT zapisu importu · Foundation v4 | **PASS** |
| Foundation Freeze P1 (zakaz thaw schemy / LWW D5) | Bloklista rewrite store/schema · tylko UX + wywołanie commit | **PASS** |
| P3.1 Market Average CLOSED | R1 · zakaz zmiany formuły | **PASS** |
| P3.2 Import Persistence CLOSED | R3–R5 · wywołanie `commitMarketQuotesImport` · zakaz edycji lib | **PASS** |
| P2.5 progi `buildMarketComparison` | B2 · R7 · ZERO rewrite progów | **PASS** |
| COST-02-A controlled market | R11 ZERO DIFF · konsumenci RO | **PASS** |
| GAP-A CLOSED | R12 as-is · OUT re-open | **PASS** |
| AI-COST-01 Freeze / 02-B CLOSED | OUT core · ZERO DIFF OfferBoq/Bid | **PASS** |
| NG-05 MPI BLOCKED | OUT twarde · Anti AC-X-MPI | **PASS** |
| Nazwa vs P3.3A–D | Etykieta Market Pricing UX w DF | **PASS** |

**Wniosek §1:** DF **nie koliduje** z tip SSOT · Foundation · P3.1/P3.2 · Freeze AI-COST · MPI.

---

## 2. Zasady projektowe

| Zasada | Ocena | Dowód |
|--------|-------|--------|
| **SSOT FIRST** | **PASS** | `marketQuotes` · Engine · jedyny commit orchestration |
| **REUSE FIRST** | **PASS** | R1–R14 · mount orphan panel · wire istniejącego commit |
| **ZERO DUPLICATE LOGIC** | **PASS** | Zakaz lokalnej średniej · apply tylko wewnątrz commit · coverage z Engine |
| **MOBILE FIRST** | **PASS** | S6 · AC-S6.1 · 44px |
| **Payroll Safety Gate** | **PASS** | §0 ALL-NIE FEATURE · G2 = tylko LS flagi |
| **#CORE-013** | **PASS** | FEATURE allowlista · brak CORE w IN |

---

## 3. Potwierdzenie REUSE — wyłącznie istniejące komponenty

Weryfikacja AS-IS w tip **2.65.78** (grep / read):

| Wymagany komponent | Lokalizacja AS-IS | Stan |
|--------------------|-------------------|------|
| **Engine** | `src/app/work-catalog/work-catalog-market-engine.ts` · `buildEngineMarketComparisonForWork` | **ISTNIEJE** · S1 shipped |
| **VM (CSV preview)** | `work-catalog-csv-import-preview.ts` + `previewMarketCsvImport` (lib) | **ISTNIEJE** |
| **P3.1** | `market-average-engine.ts` · adapters · eksport barrel | **ISTNIEJE** · CLOSED |
| **P3.2** | `apply-market-quotes.ts` · `rollback-market-quotes.ts` · **`commitMarketQuotesImport`** | **ISTNIEJE** · CLOSED |
| **WorkCatalogCsvImportPreviewPanel** | `WorkCatalogCsvImportPreviewPanel.tsx` | **ISTNIEJE** · **orphan** (brak mount w View) — potwierdza lukę S4 |
| **commitMarketQuotesImport** | eksport `@/lib/work-catalog` · orchestracja load→snapshot→apply→save | **ISTNIEJE** |

**Werdykt §3:** IMPLEMENT Phase 1 = **składanie UX** nad istniejącym stosem — **nie** greenfield silnika. Nowe dozwolone wyłącznie: flag helper · coverage aggregator RO · mount/wire UI · testy (zgodnie z allowlistą DF).

### IC-1 (nieblokujące) — zakaz bezpośredniego `apply*` z UI

**IMPLEMENT CONSTRAINT:** UI **MUST** wołać wyłącznie `commitMarketQuotesImport`.  
**MUST NOT** wołać `applyMarketQuotesFromPreview` z komponentów React (DF S4.7) — uniknięcie duplikacji orchestration / pominięcia snapshotu.

### IC-2 (nieblokujące) — zakaz edycji lib P3.2 / `cloud-sync.ts`

**MUST NOT** zmieniać semantyki `commit-market-quotes.ts` / apply / rollback.  
**MUST NOT** edytować `cloud-sync.ts`. Persist katalogu = **REUSE** ścieżki już używanej wewnątrz `deps.save` commit (G3 = NIE edycji CORE).

---

## 4. Feature Flag — izolacja przy OFF

| Check | Werdykt |
|-------|---------|
| Klucz `kw-wc-p33-market-pricing-ux` | **PASS** (DF D-D) |
| Default **OFF** | **PASS** |
| OFF ⇒ brak entry S4 / coverage S5 | **PASS** (AC-F0) |
| OFF **nie** chowa S1–S3 | **PASS** (D-D scope · Anti regresja tip) |
| UI-only — lib P3.1/P3.2 działa bez flagi | **PASS** |
| Wzorzec helpera | Jak `ai-cost-02-b-flag.ts` (pure LS) — **PASS** kierunkowo |
| Brak wpływu OFF na Bid / AI-COST / Payroll | **PASS** (brak wire w tych ścieżkach) |

### IC-3 (nieblokujące) — izolacja produkcji OFF

**IMPLEMENT CONSTRAINT:**

1. `isWcP33MarketPricingUxEnabled()` default **false** gdy brak klucza.  
2. Conditional render: entry · import panel · coverage **tylko** gdy ON.  
3. **MUST NOT** owijać `WorkCatalogMarketComparison` / Engine S1 flagą.  
4. Marker `data-wc-p33-flag` tylko gdy ON.

**Wniosek §4:** Przy OFF tip pozostaje **parity** względem dzisiejszego Biblioteki (S1–S3 live, bez nowych write CTA).

---

## 5. Brak wpływu na zabronione obszary

| Obszar | Mechanizm izolacji DF | Werdykt |
|--------|----------------------|---------|
| **MPI / NG-05** | OUT · Anti AC-X-MPI | **PASS** |
| **Parsery** | Bloklista · OUT | **PASS** |
| **Bid Calculator** | ZERO DIFF · OUT | **PASS** |
| **AI-COST core** | ZERO DIFF OfferBoq/S1–S7 · R11 RO only | **PASS** |
| **Payroll** | Gate ALL-NIE · bloklista | **PASS** |
| **Cloud CORE** | Zakaz edycji `cloud-sync.ts` · REUSE commit save | **PASS\*** |
| **Storage CORE** | Bloklista nowych storage managers | **PASS** |
| **Istniejące API lib** | Wywołanie publicznych eksportów · bez breaking change P3.1/P3.2 | **PASS** |

\*Uwaga (nieblokująca): commit **już dziś** może synchronicznie/asynchronicznie persystować katalog przez istniejący router — to **nie** jest nowy Cloud CORE EPIC; IMPLEMENT nie otwiera nowego write-path sync.

**Pośredni efekt danych (świadomy, OK):** po Commit ON → więcej `marketQuotes` → konsumenci COST-02-A/GAP-A mogą dostać więcej hitów **bez** zmiany ich kodu. To jest **cel biznesowy** katalogu, nie naruszenie izolacji API.

---

## 6. Rollback i ryzyko wdrożenia

| Poziom | Ocena AR |
|--------|----------|
| L1 Flag OFF | **ADEKWATNY** — natychmiastowa izolacja S4–S5 |
| L2 Snapshot rollback | **ADEKWATNY** — AS-IS w P3.2 (`capture`/`restore` wewnątrz commit + UI Cofnij) |
| L3 Tip revert | **ADEKWATNY** — FEATURE allowlista |
| L4 Cloud un-commit | Świadomie OUT — **OK** |

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Zły import CSV | **Średnie** | Preview przed commit · L2 rollback · AC-S4.4/5 |
| Scope creep → company price (D-C) | **Niskie** jeśli IC-4 | OUT + Anti AC-X-COMPANY |
| Regresja S1–S3 | **Niskie** | IC-3 · AC-B1 |
| Payroll/Cloud przypadkiem | **Niskie** | Allowlista · Gate |
| Oczekiwanie Bid=1,6M | **Komunikacyjne** | Anti AC-X-BID |

**Ryzyko wdrożenia Phase 1:** **ŚREDNIE↓** (write katalogu) przy **niskim** blast radius dzięki default OFF + REUSE orchestration.

---

## 7. D-C (Rynek → cena firmy) — poza Phase 1

| Check | Stan |
|-------|------|
| DF D-C = **OUT Phase 1** | **POTWIERDZONE** |
| OUT lista zawiera S7 / companyPricePln | **POTWIERDZONE** |
| Anti AC-X-COMPANY | **POTWIERDZONE** |

### IC-4 (nieblokujące) — zakaz CTA „Ustaw jako cenę firmy”

**IMPLEMENT MUST NOT** dodać w Phase 1 przycisku / automatyzmu ustawiającego `companyPricePln` z rynku — nawet „tymczasowo”. To wymaga osobnego DF + GO.

---

## 8. Boundary #CORE-014 (FEATURE vs CORE)

| Pytanie | Odpowiedź AR |
|---------|----------------|
| Czy EPIC miesza FEATURE + CORE? | **NIE** — UI + flag + coverage RO |
| Czy wymaga Owner GO CORE? | **NIE** |
| Czy edycja Edge / cloud-sync / Payroll? | **NIE** (bloklista) |
| Czy nowa trasa / bootstrap? | **NIE** |

**Boundary:** **PASS · FEATURE**.

---

## 9. IMPLEMENT CONSTRAINTS (zbiorcze — nieblokujące)

| ID | Constraint |
|----|------------|
| **IC-1** | UI → tylko `commitMarketQuotesImport` (nie direct apply) |
| **IC-2** | ZERO DIFF lib P3.1/P3.2 orchestration · ZERO DIFF `cloud-sync.ts` |
| **IC-3** | Flaga OFF izoluje S4–S5; **nie** owija S1–S3 |
| **IC-4** | Brak UI „rynek → companyPricePln” (D-C) |
| **IC-5** | Coverage = agregacja `priceOrigin` z Engine — bez nowej średniej |
| **IC-6** | Allowlista jak DF §6; S1–S3 semantyka nietykalna |

---

## 10. Checklist końcowa

| # | Pytanie przeglądu | Wynik |
|---|-------------------|--------|
| 1 | DF zgodny z SSOT / Foundation | **PASS** |
| 2 | SSOT / REUSE / ZERO DUP / MOBILE | **PASS** |
| 3 | Tylko Engine · VM · P3.1 · P3.2 · Panel · commit | **PASS** (+ cienkie nowe UI/flag/coverage) |
| 4 | Flag OFF izoluje produkcję (S4–S5) | **PASS** |
| 5 | Brak wpływu MPI/parsery/Bid/AI-COST/Payroll/Cloud/Storage/API | **PASS** |
| 6 | Rollback + ryzyko akceptowalne | **PASS** |
| 7 | D-C OUT Phase 1 | **PASS** |

---

## 11. Decyzja

```text
════════════════════════════════════════════════════════
WORK-CATALOG-P3.3 ARCHITECTURE REVIEW COMPLETE

DECYZJA: APPROVED FOR OWNER GO

Werdykt: PASS
Uwagi: IC-1…IC-6 (nieblokujące) — wiążące przy IMPLEMENT
Następny krok: Owner GO IMPLEMENTATION
              → potem IMPLEMENT (nie wcześniej)
════════════════════════════════════════════════════════
```

**Nie:** ARCHITECTURE CHANGES REQUIRED — brak blokerów architektonicznych; DF wystarczająco precyzyjny.

---

**ARCHITECTURE REVIEW STATUS:** **COMPLETE · APPROVED FOR OWNER GO**  
**IMPLEMENT / commit / push:** **NIE WYKONANO** (zgodnie z briefem)
