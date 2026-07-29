# CENY-MATERIAŁÓW-01 — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-01-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-29  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-01-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-01-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`CENY-MATERIAŁÓW-01-PLAN.md`](CENY-MATERIAŁÓW-01-PLAN.md) · COMPLETE **PASS**  
> **AUDIT:** [`CENY-MATERIAŁÓW-01-AUDIT.md`](CENY-MATERIAŁÓW-01-AUDIT.md) · **PASS**  
> **Tip bazowy:** UI **2.65.79** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-01 Phase 1
        z SSOT · zasady projektu · AS-IS łańcuch OfferBoq
WERDYKT: PASS (uwagi nieblokujące → IMPLEMENT constraints)
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| AUDIT | **PASS** · READY FOR PLAN |
| PLAN | **PASS** · READY FOR DF |
| DESIGN FREEZE | **PASS** · FROZEN · READY FOR AR |
| Kod / diff IMPLEMENT | **brak** (review docs + AS-IS weryfikacja łańcucha) |
| Owner GO IMPLEMENTATION | **oczekuje** na ten raport |

**Metoda:** DF vs tip SSOT · grep/read łańcucha providerów · REUSE P3.3/COST-02-A · flaga · KPI · OUT · rollback · #CORE-014.

---

## 1. Zgodność DESIGN FREEZE z SSOT

| SSOT / kontrakt | DF | Werdykt |
|-----------------|-----|---------|
| Tip tylko w `09` | Baseline **2.65.79** · brak bump tipu w DF | **PASS** |
| OfferBoq provider chain (AS-IS) | D-A zakaz reorder · knowledge → controlled_market → work_catalog → category → heuristic | **PASS** (potwierdzone w kodzie) |
| `createControlledMarketPriceProvider` (COST-02-A) | REUSE as-is · ZERO semantyki silnika | **PASS** |
| Work Catalog `marketQuotes` / `companyPricePln` / `costSplit` | D-C fundament | **PASS** |
| P3.3 Market Pricing UX CLOSED | CM-2 REUSE import/coverage · osobna flaga P3.3 | **PASS** |
| AI-COST-01 Freeze | OUT rewrite S1–S7 · Bid calc OUT | **PASS** |
| GAP-B NOT RECOMMENDED | O1 OUT | **PASS** |
| Anti-AC 1,6M / Kp / marża | O2 · AC-X-* | **PASS** |

### 1.1 AS-IS łańcuch (weryfikacja kodu tip)

```text
leadingProviders (explainability):
  1. createCompanyKnowledgePriceProvider
  2. createControlledMarketPriceProvider
+ buildDefaultPriceProviders:
  3. createWorkCatalogPriceProvider      ← companyPrice / costSplit
  4. createCategoryRatePriceProvider
  5. createCompanyModelPriceProvider     ← labor only
  6. createHeuristicPriceProvider
  7. createExternalFuturePriceProvider   ← always null
```

**Zgodność z DF §3:** **PASS** — DF poprawnie opisuje material path; `company_model` pozostaje w default chain wyłącznie dla labor (AS-IS).

**Wniosek §1:** DF **nie koliduje** z SSOT tip · OfferBoq · WC · P3.3 · Freeze AI-COST.

---

## 2. Zasady projektowe

| Zasada | Ocena | Dowód |
|--------|-------|--------|
| **SSOT FIRST** | **PASS** | Quotes / companyPrice w WC · jedna średnia `computeMarketAverageForWork` |
| **REUSE FIRST** | **PASS** | controlled_market · work_catalog provider · costSplit · P3.3 · mapping |
| **ZERO DUPLICATE LOGIC** | **PASS** | Zakaz nowego providera · zakaz drugiej średniej · zakaz SKU ledger |
| **MOBILE FIRST** | **PASS** | Thin UX braków · bez nowego dashboardu · REUSE Biblioteki |
| **Payroll Safety Gate** | **PASS** | §0 ALL-NIE FEATURE · G2 = tylko LS flagi |
| **#CORE-013 / #CORE-014** | **PASS** | FEATURE · brak CORE (`cloud-sync` bloklista) |

---

## 3. Phase 1 = uplift wejścia (nie reorder)

| Check | Werdykt |
|-------|---------|
| Zakaz zmiany kolejności providerów (D-A) | **PASS** |
| Mechanizm = mapping + Quotes/companyPrice + memo build (D-B) | **PASS** |
| Wzmocnienie `controlled_market` | **PASS** (więcej `catalogWorkId` + Quotes) |
| Wzmocnienie `work_catalog` / companyPrice | **PASS** |
| Wzmocnienie wykorzystania `marketQuotes` | **PASS** (P3.3 + match) |
| Brak nowych providerów (O7) | **PASS** |
| Brak usuwania category/heuristic | **PASS** (O13) |

**Wniosek §3:** Cel Phase 1 jest **architektonicznie spójny** z AS-IS — naprawia empiryczny miss (AUDIT: market/WC = 0% na materiałach), nie przeprojektowuje łańcucha.

---

## 4. REUSE — potwierdzenie AS-IS

| Komponent | Lokalizacja | Stan |
|-----------|-------------|------|
| Work Catalog store | `src/lib/work-catalog/*` · key `kw-wgdom-work-catalog` | **ISTNIEJE** |
| `marketQuotes` | `CatalogWork.marketQuotes` | **ISTNIEJE** |
| `computeMarketAverageForWork` | lib work-catalog | **ISTNIEJE** |
| `createControlledMarketPriceProvider` | `tender-offer-boq-controlled-price-source.ts` | **ISTNIEJE** · wired leading |
| `createWorkCatalogPriceProvider` + `costSplit` | `tender-offer-boq-pricing-engine.ts` · `cost-split.ts` | **ISTNIEJE** |
| `mapOfferBoqDocument` | `tender-offer-boq-mapping.ts` | **ISTNIEJE** · punkt CM-1 |
| P3.3 flag / CSV / coverage | `wc-p33-flag` · panel · coverage | **ISTNIEJE** · CLOSED |
| Category / heuristic providers | pricing-engine | **ISTNIEJE** · fallback |

**Wniosek §4:** REUSE kompletny — brak orphan „trzeba zbudować silnik od zera”.

---

## 5. Zero tabel / providerów / Supabase Q / Cloud CORE

| Constraint DF | Werdykt AR |
|---------------|------------|
| 0 nowych tabel | **PASS** (D-E · O6) |
| 0 nowych providerów | **PASS** (D-B · O7) |
| 0 nowych zapytań Supabase / Edge | **PASS** (D-E · cache tylko w buildzie) |
| 0 nowych kluczy KV DATA_KEYS | **PASS** |
| Brak edycji `cloud-sync.ts` | **PASS** (O4 · Gate G3) |

**Uwaga nieblokująca:** CM-3 memo jest **in-process** per build — nie jest cache’em Cloud; AR **APPROVES** pod warunkiem braku I/O (IC-2).

---

## 6. Feature Flag

| Check | Werdykt |
|-------|---------|
| Klucz `kw-ceny-materialow-01` | **PASS** (D-D) |
| Default **OFF** | **PASS** |
| OFF ⇒ izolacja produkcji (parity tip) | **PASS** (AC-F0) — **wiązane IC-1** |
| Scope: mapping uplift · memo · metryki · thin UX | **PASS** |
| Semantyka controlled_market lib bez flagi | **PASS** (już live; flaga nie psuje COST-02-A) |
| Osobna flaga P3.3 | **PASS** — nie scalać kluczy |

### IC-1 (nieblokujące) — izolacja OFF

**IMPLEMENT MUST:** zmiany zachowania mapowania / memo / UX Phase 1 **wyłącznie** gdy `isCenyMaterialow01Enabled()` (lub równoważny helper) = true.  
**OFF** ⇒ ten sam share originów / te same match wyniki co tip przed FEATURE (w granicach determinizmu danych WC).

---

## 7. KPI

| KPI DF | Werdykt AR |
|--------|------------|
| ↑ `controlled_market` (K1) | **PASS** — zgodne z celem |
| ↑ `work_catalog` (K2) | **PASS** |
| ↓ `category_rate` (K3) | **PASS** |
| ↓ `heuristic_estimate` (K4) | **PASS** |
| ↑ `catalogWorkId` rate (K5) | **PASS** |
| K6 = 0 tabel/Q/providerów | **PASS** |
| Sukces ≠ Bid 1,6M | **PASS** (Anti-AC) |

### IC-3 (nieblokujące) — wyjątek PV K1/K2

DF dopuszcza „> 0% + raport” gdy Quotes coverage uniemożliwia 15%/10%.  
**IMPLEMENT/PV MUST:** wyjątek **tylko** z dowodem coverage (P3.3) — nie jako domyślne obniżenie poprzeczki bez pomiaru.

---

## 8. Zakres OUT

| OUT | Werdykt |
|-----|---------|
| GAP-B | **PASS** |
| Marża · Kp · target 1,6M | **PASS** |
| Bid Calculator | **PASS** |
| Cloud Sync CORE | **PASS** |
| SKU ledger | **PASS** |
| Scraper / zewnętrzne źródła | **PASS** |
| Nowi providerzy / reorder | **PASS** |

---

## 9. Rollback L1

| Poziom | Ocena AR |
|--------|----------|
| **L1 Flag OFF** | **ADEKWATNY** — natychmiastowa izolacja Phase 1 UI/mapping uplift |
| L2 tip revert | Adekwatny |
| L3 Quotes rollback P3.2/P3.3 | Adekwatny (dane) |
| L4 cloud un-commit | Świadomie OUT — **OK** |

**Wniosek §9:** L1 wystarcza jako pierwotny kill-switch produkcji.

---

## 10. Boundary #CORE-014

| Pytanie | Odpowiedź |
|---------|-----------|
| FEATURE + CORE? | **NIE** — mapping/UI/metryki + REUSE |
| Owner GO CORE? | **NIE** |
| Edycja Edge / cloud-sync / Payroll? | **NIE** |
| Nowa trasa / bootstrap? | **NIE** |

**Boundary:** **PASS · FEATURE**.

---

## 11. IMPLEMENT CONSTRAINTS (zbiorcze — nieblokujące)

| ID | Constraint |
|----|------------|
| **IC-1** | Flaga OFF izoluje mapping uplift / memo / thin UX Phase 1 |
| **IC-2** | CM-3 memo: zero I/O · tylko per `buildOfferBoqDocumentForPipelineItem` |
| **IC-3** | Wyjątek KPI K1/K2 tylko z dowodem Quotes coverage |
| **IC-4** | MUST NOT reorder / insert providers |
| **IC-5** | MUST NOT edit `tenders-bid-calculator.ts` / `cloud-sync.ts` / costModel defaults |
| **IC-6** | Allowlista jak DF §6 · CM-0…CM-2 MVP; CM-3 tylko jeśli pomiar wymaga |

---

## 12. Ryzyko wdrożenia

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Fałszywy match | Śr | Testy złote · PV |
| Brak Quotes → KPI flat | Śr | CM-2 + P3.3 prep · IC-3 |
| Scope creep SKU/Supabase | Niski przy DF | OUT · AR |
| Regresja cen | Niski przy flag OFF | L1 · AC-F0 |

**Ryzyko Phase 1:** **NISKIE–ŚREDNIE** (FEATURE, default OFF, REUSE).

---

## 13. Checklist końcowa

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | DF ↔ SSOT OfferBoq/WC/P3.3? | **PASS** |
| 2 | SSOT · REUSE · ZERO DUP · MOBILE · Gate? | **PASS** |
| 3 | Bez reorder · tylko uplift wejścia? | **PASS** |
| 4 | REUSE lista kompletna AS-IS? | **PASS** |
| 5 | 0 tabel / providerów / Supabase Q / Cloud CORE? | **PASS** |
| 6 | Flag OFF izoluje? | **PASS** (+ IC-1) |
| 7 | KPI zgodne? | **PASS** (+ IC-3) |
| 8 | OUT twarde? | **PASS** |
| 9 | Rollback L1 adekwatny? | **PASS** |
| 10 | Boundary FEATURE? | **PASS** |

---

## 14. Werdykt

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-01 ARCHITECTURE REVIEW COMPLETE
Werdykt: PASS
Decyzja: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **Decyzja** | **APPROVED FOR OWNER GO** |
| **Nie** | ARCHITECTURE CHANGES REQUIRED |
| **Uwagi** | IC-1…IC-6 nieblokujące — **wiążące przy IMPLEMENT** |

**Blokada IMPLEMENT:** do jawnego **Owner GO IMPLEMENTATION**.

---

**ARCHITECTURE REVIEW STATUS:** **PASS** · **APPROVED FOR OWNER GO**
