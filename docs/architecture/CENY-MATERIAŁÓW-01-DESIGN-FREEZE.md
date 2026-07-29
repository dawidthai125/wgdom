# CENY-MATERIAŁÓW-01 — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-01-DESIGN-FREEZE  
> **Etykieta:** Ceny Materiałów Phase 1 — uplift WC / marketQuotes → OfferBoq  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **IMPLEMENT ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-29  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE · Gate G1–G9 **ALL-NIE\*** (\*G2 = wyłącznie nowy klucz flagi FEATURE)  
> **Priorytet:** **P1**  
> **Wejście:** AUDIT **PASS** ([`CENY-MATERIAŁÓW-01-AUDIT.md`](CENY-MATERIAŁÓW-01-AUDIT.md)) · PLAN **PASS** ([`CENY-MATERIAŁÓW-01-PLAN.md`](CENY-MATERIAŁÓW-01-PLAN.md) · [`CENY-MATERIAŁÓW-01-PLAN-COMPLETE.md`](CENY-MATERIAŁÓW-01-PLAN-COMPLETE.md))  
> **Baseline tip:** UI **2.65.79** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależności CLOSED:** WORK-CATALOG-P3.3 · AI-COST-02-B · COST-02-A · GAP-A · AI-COST-01 **FROZEN** · [`TENDER-CASE-AUDIT-01`](TENDER-CASE-AUDIT-01.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-01 Phase 1):
  Zwiększyć skuteczność wejścia materiałów OfferBoq do
  controlled_market + work_catalog (companyPrice / marketQuotes)
  PRZED spadkiem do category_rate / heuristic_estimate
  — BEZ zmiany kolejności providerów
  — BEZ nowych tabel / SKU / Supabase Q / Cloud CORE
  — BEZ GAP-B / Kp / marży / Bid calculator / 1,6M

IMPLEMENT zakazany do: Architecture Review PASS + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*jedyny wyjątek FEATURE: nowy klucz flagi
                        kw-ceny-materialow-01 — bez kasowania/migracji LP)
G3 Cloud Sync:   NIE   (zakaz edycji cloud-sync.ts · brak nowych kluczy KV)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE (Payroll) · OfferBoq providers = REUSE, nie nowe
G8 Shell:        NIE
G9 Routing:      NIE  (bez nowych tras — UI w Bibliotece / OfferBoq istniejącym)

Wynik: ALL-NIE · FEATURE
Owner GO CORE: NIE
Owner GO IMPLEMENT (slice): TAK — po Arch Review PASS
```

Jeżeli IMPLEMENT naruszy Payroll / edytuje `cloud-sync.ts` / Storage CORE / doda tabele KV → **STOP** · nowy DF.

---

## 1. Cel architektoniczny (zamrożony)

Zamrozić **cienkie wzmocnienie wejścia** do już istniejącego łańcucha cen materiałów OfferBoq:

1. **Więcej** linii z poprawnym `catalogWorkId` (mapowanie → WC).  
2. **Więcej** hitów `controlled_market` (Quotes + average + costSplit).  
3. **Więcej** hitów `work_catalog` (`companyPricePln` → costSplit materiał).  
4. **Mniej** spadków do `category_rate` / `heuristic_estimate` (mierzalne KPI).  
5. **Instrumentacja** share originów + thin UX braków (REUSE P3.3).

**Sukces EPIC ≠** Bid == ~1,6M.  
**Sukces EPIC =** flaga ON → KPI K1–K6 · flaga OFF → parity tip (origin share jak baseline).

---

## 2. Decyzje produktowe zamrożone (D-A…D-F)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-A** | Kolejność providerów AI-COST | **ZAKAZ ZMIANY** — knowledge → controlled_market → work_catalog (companyPrice) → category_rate → heuristic_estimate (+ company_model labor-only · external_future martwy) |
| **D-B** | Mechanizm Phase 1 | **Uplift wejścia** (mapping + dane Quotes/companyPrice + memo build) — **nie** nowy provider · **nie** nowy łańcuch |
| **D-C** | Fundament danych | **Work Catalog** `marketQuotes` + `companyPricePln` + `costSplit` · zasilanie Quotes = **P3.3** (REUSE) |
| **D-D** | Feature flag | **TAK** · klucz **`kw-ceny-materialow-01`** · default **OFF** · scope: mapping uplift + memo + metryki + thin UX braków |
| **D-E** | Supabase / tabele | **ZERO** nowych tabel · **ZERO** nowych kluczy KV · **ZERO** nowych zapytań Edge |
| **D-F** | KPI | Zamrożone K1–K6 (§9) — sukces = origin share, **nie** kwota oferty |

Zmiana D-A…D-F = **amend DF** + Owner GO.

---

## 3. Łańcuch decyzji (zamrożony — BEZ reorder)

```text
company_knowledge
        ↓
controlled_market          ← WZMOCNIĆ hit (Quotes + catalogWorkId)
        ↓
work_catalog / companyPrice ← WZMOCNIĆ hit (companyPricePln + catalogWorkId)
        ↓
category_rate              ← fallback (bez usuwania)
        ↓
heuristic_estimate         ← last resort (bez usuwania)
```

**IMPLEMENT MUST NOT:**

- wstawiać nowego providera przed/między tymi krokami,  
- usuwać / wyłączać `category_rate` lub `heuristic_estimate`,  
- zmieniać formułę `computeTenderBidProposal` / stack Kp/marży.

---

## 4. Zakres funkcjonalny Phase 1 — IN (zamrożony)

### 4.1 Slices MVP (CM-0…CM-2)

| ID | Slice | Wymaganie FROZEN |
|----|-------|------------------|
| **CM-0** | Instrumentacja | Probe/test: histogram originów **materiałów** (PLN + count) · baseline fixture `08dee335` zapisany w teście |
| **CM-1** | Mapping uplift | Ulepszenie `mapOfferBoq*` → wyższy % linii z `catalogWorkId` (testy złotych opisów: stolarka / oddymianie / typowe ATH) — **bez** nowego silnika NLP |
| **CM-2** | Quotes path + thin UX | REUSE P3.3: widoczność braków Quotes dla prac z match · ops path import CSV · **nie** wymusza P3.3 flag ON globalnie (może link/CTA gdy P3.3 ON lub docs) |

### 4.2 CM-3 (opcjonalny w Phase 1 — tylko jeśli pomiar wymaga)

| ID | Wymaganie FROZEN |
|----|------------------|
| **CM-3** | Memo `computeMarketAverageForWork` **wyłącznie w obrębie jednego** `buildOfferBoqDocumentForPipelineItem` (klucz workId+region+computedAt) — **bez** I/O sieci |

### 4.3 REUSE obowiązkowy (FROZEN)

| Asset | Użycie |
|-------|--------|
| Work Catalog store | SSOT prac / Quotes / companyPrice |
| `marketQuotes` + `computeMarketAverageForWork` | SSOT rynku |
| `createControlledMarketPriceProvider` | Tor controlled_market |
| `createWorkCatalogPriceProvider` + `costSplit` | Tor companyPrice → materiał |
| P3.3 commit / coverage / flag | Zasilanie + KPI pokrycia |
| `category_rate` / `heuristic_estimate` | Fallback L4/L6 as-is |

### 4.4 Cache (FROZEN)

| Reguła | Wartość |
|--------|---------|
| Zakres | **Tylko** istniejący build OfferBoq |
| Nowe zapytania Supabase | **0** |
| Nowe klucze LS poza flagą | **0** (metryki = in-memory / test artifact) |

---

## 5. Zakres OUT (zamrożony)

| ID | OUT |
|----|-----|
| **O1** | GAP-B / costModel calibration |
| **O2** | Marża · Kp · floor · hardcode / target **1,6M** |
| **O3** | Edycja **Bid Calculator** (`tenders-bid-calculator.ts`) |
| **O4** | **Cloud Sync CORE** (`cloud-sync.ts`) · nowe klucze DATA_KEYS |
| **O5** | Scraper · zewnętrzne API cen · nowe źródła cen |
| **O6** | **SKU ledger** / nowe tabele materiałów |
| **O7** | Nowi **providerzy** w łańcuchu OfferBoq |
| **O8** | Zmiana **kolejności** providerów |
| **O9** | Parsery · Discovery · ZIP/ATH rewrite |
| **O10** | Payroll · Storage CORE · Edge payroll |
| **O11** | D-C „market → companyPricePln” (P3.3 OUT) |
| **O12** | Sync `company_knowledge` do chmury |
| **O13** | Usunięcie heuristic / category z łańcucha |

---

## 6. Allowlista / bloklista plików (kierunek FROZEN — AR doprecyzuje ścieżki)

### 6.1 Allowlista FEATURE (orientacyjna)

| Obszar | Przykłady |
|--------|-----------|
| Mapping | `tender-offer-boq-mapping.ts` (+ testy) |
| Wire / memo | `tender-offer-boq-explainability.ts` (thin) |
| Flag helper | nowy cienki `ceny-materialow-01-flag.ts` (wzorzec P3.3) |
| Metryki | `scripts/test-…` / probe origin stats |
| Thin UI | opcjonalnie Biblioteka / OfferBoq panel braków — REUSE P3.3 markers |
| Changelog | `changelog-data.ts` (po GO tip) |
| Docs | `CENY-MATERIAŁÓW-01-*` |

### 6.2 Bloklista

| Plik / obszar |
|---------------|
| `cloud-sync.ts` · Edge payroll · Storage managers |
| `tenders-bid-calculator.ts` (formuła) |
| `company-labor-cost.ts` defaults (Kp/profit) |
| Parsery / Discovery / COST-MULTI write |
| Nowe tabele / migracje Supabase |

---

## 7. Feature Flag (zamrożona)

| Pole | Wartość **FROZEN** |
|------|-------------------|
| **Klucz LS** | **`kw-ceny-materialow-01`** |
| **Default** | **OFF** |
| **ON** | Mapping uplift + memo (jeśli CM-3) + metryki ścieżki + thin UX braków |
| **OFF** | Parity tip — share originów jak przed FEATURE (brak regresji zachowania cen) |
| **Poza flagą** | Lib average / controlled_market **semantyka** (już live) · P3.3 osobna flaga |

Helper: pure LS (wzorzec `wc-p33-flag` / `ai-cost-02-b-flag`) — **nie** `useLocalStorage` payroll.

---

## 8. Integracja AI-COST (zamrożone granice)

| System | Write Phase 1? | Reguła |
|--------|----------------|--------|
| OfferBoq mapping / pricing wire | **TAK** (thin) | Tylko allowlista |
| controlled_market provider | **NIE** semantyka | REUSE as-is |
| Bid Calculator | **NIE** | OUT |
| AI-COST S1–S7 core | **NIE** | Freeze |
| Work Catalog Quotes | **NIE** nowy write-path | REUSE P3.3 commit |
| Cloud / Payroll | **NIE** | OUT |

---

## 9. Acceptance Criteria + KPI (zamrożone)

### 9.1 Baseline empiryczny (AUDIT · fixture `08dee335` · materiały)

| Origin | Udział PLN mat. |
|--------|-----------------|
| `category_rate` | **~71%** |
| `heuristic_estimate` | **~29%** |
| `controlled_market` | **0%** |
| `work_catalog` | **0%** |

### 9.2 KPI FROZEN (po flaga ON + przygotowaniu Quotes na pracach matchowanych)

| ID | KPI | Cel FROZEN |
|----|-----|------------|
| **K1** | ↑ `controlled_market` (% PLN mat.) | **≥ 15%** *lub* **> 0%** z raportem Owner jeśli Quotes coverage uniemożliwia 15% (musi być udokumentowane w PV) |
| **K2** | ↑ `work_catalog` (% PLN mat.) | **≥ 10%** *lub* **> 0%** z tym samym wyjątkiem PV |
| **K3** | ↓ `category_rate` (% PLN mat.) | **≤ 55%** gdy K1+K2 spełnione; inaczej kierunek spadku vs 71% + uzasadnienie |
| **K4** | ↓ `heuristic_estimate` (% PLN mat.) | **≤ 20%** gdy K1+K2 spełnione; inaczej kierunek spadku vs 29% |
| **K5** | ↑ % linii z `catalogWorkId` | Wzrost vs baseline pomiaru CM-0 |
| **K6** | Nowe tabele / Supabase Q / nowi providerzy | **= 0** |

### 9.3 AC funkcjonalne

| ID | Kryterium |
|----|-----------|
| **AC-F0** | Flaga default OFF · OFF = parity tip |
| **AC-M1** | Kolejność providerów **niezmieniona** (diff deny reorder) |
| **AC-M2** | Mapping uplift pokryty testami jednostkowymi |
| **AC-M3** | Probe origin stats dostępny lokalnie |
| **AC-M4** | Memo (jeśli CM-3) tylko w buildzie OfferBoq — bez sieci |
| **AC-X1** | Allowlista bez Bid calc / cloud-sync / Payroll |
| **AC-X2** | Regresja: category + heuristic nadal działają jako fallback |

### 9.4 Anti-AC

| ID | Nie jest kryterium pass/fail |
|----|------------------------------|
| **AC-X-BID** | Bid == ~1,6M |
| **AC-X-MARGIN** | Zmiana Kp / profit / floor |
| **AC-X-SKU** | Nowy katalog SKU |

---

## 10. Rollback Strategy (zamrożona)

| Poziom | Akcja | Skutek |
|--------|-------|--------|
| **L1 — Flag OFF** | `localStorage` remove / `=0` | Parity tip |
| **L2 — Tip revert** | Revert FEATURE commit | Usunięcie uplift |
| **L3 — Quotes** | Rollback importu P3.2/P3.3 | Przywrócenie marketQuotes |
| **L4** | Cloud global un-commit | **ZAKAZ** Phase 1 |

---

## 11. Ryzyka (zamrożona świadomość)

| ID | Ryzyko | Mitigacja DF |
|----|--------|--------------|
| R1 | Fałszywy match | Testy · confidence · PV |
| R2 | Brak Quotes → KPI nie rosną | CM-2 + prep P3.3 · wyjątek PV K1/K2 |
| R3 | Scope → tabele/Supabase | O1–O6 · AR |
| R4 | Regresja cen | Flag OFF · AC-F0 |
| R5 | Presja 1,6M | Anti-AC |

---

## 12. Zgodność z zasadami (DF)

| Zasada | Werdykt DF |
|--------|------------|
| **SSOT FIRST** | **PASS** — WC Quotes / companyPrice |
| **REUSE FIRST** | **PASS** — providers + P3.3 + costSplit |
| **ZERO DUPLICATE** | **PASS** — brak drugiej średniej / SKU |
| **MOBILE FIRST** | **PASS** — thin UX; bez nowego dashboardu |
| **Payroll Safety Gate** | **PASS** — ALL-NIE (+ flaga) |

---

## 13. Kryteria „READY FOR ARCHITECTURE REVIEW”

| Check | Stan |
|-------|------|
| D-A…D-F zamrożone | **TAK** |
| Łańcuch providerów bez reorder | **TAK** |
| IN CM-0…CM-2 (+ CM-3 conditional) | **TAK** |
| OUT twarde (GAP-B/Kp/1,6M/Bid/Cloud/SKU/scraper) | **TAK** |
| Flag `kw-ceny-materialow-01` default OFF | **TAK** |
| KPI K1–K6 | **TAK** |
| Cache tylko w build OfferBoq · 0 Supabase Q | **TAK** |
| Rollback L1–L3 | **TAK** |
| Gate ALL-NIE | **TAK** |
| Blokery do Arch Review | **BRAK** |

---

## 14. Następny krok procesu

```text
[DONE]  AUDIT · PLAN · DESIGN FREEZE (ten dokument)
[NEXT]  Architecture Review (#CORE-014 Boundary FEATURE)
[NEXT]  Owner GO IMPLEMENTATION
[THEN]  IMPLEMENT → TEST → COMMIT (GO) → PUSH → PV → CLOSEOUT
```

**Zakaz teraz:** IMPLEMENT · commit · push.

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**IMPLEMENT:** **BLOCKED** do Arch Review PASS + Owner GO
