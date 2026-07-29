# CENY-MATERIAŁÓW-01 — AUDIT COMPLETE

> **ID:** CENY-MATERIAŁÓW-01-AUDIT  
> **TRYB:** AUDIT ONLY · **BEZ IMPLEMENT / COMMIT / PUSH**  
> **Data:** 2026-07-29  
> **Tip prod:** UI **2.65.79**  
> **Baseline:** AI-COST-02-B **CLOSED** · WORK-CATALOG-P3.3 **CLOSED** · [`TENDER-CASE-AUDIT-01`](TENDER-CASE-AUDIT-01.md) **COMPLETE**  
> **Evidence fixture:** `08dee335` · `.tmp/ceny-materialow-01-origin-stats.json`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-01 AUDIT COMPLETE
Decyzja: READY FOR PLAN
════════════════════════════════════════════════════════
```

---

## 1. Executive Summary

System cen materiałów w AI-COST/OfferBoq to **łańcuch providerów** (first-hit), nie osobny katalog SKU. Na case Kamieńskiego (**196** linii / **578** komponentów):

| Metryka (materiały) | Wartość |
|---------------------|---------|
| Komponenty `material` | **139** |
| **`category_rate`** | **107** (≈**77%** szt.) · **~71%** PLN materiałów |
| **`heuristic_estimate`** | **32** (≈**23%** szt.) · **~29%** PLN materiałów |
| `controlled_market` / `work_catalog` / `company_knowledge` | **0** na tym fixture |

**Wniosek biznesowy:** niedoszacowania z TENDER-CASE-AUDIT-01 (stolarka ~35 PLN/m², brak market) to skutek **spadania na category_rate + heuristic**, przy **pustym** torze `marketQuotes` → `controlled_market` dla tych linii.

**Moduł „Ceny Materiałów” jest uzasadniony** jako **cienka warstwa FEATURE** nad istniejącym Work Catalog (`marketQuotes` + mapowanie + P3.3 import), **bez** nowego CORE Cloud/Payroll i **bez** projektowania nowych tabel w tym AUDIT.

| Decyzja | **READY FOR PLAN** |
|---------|-------------------|
| Miejsce | FEATURE wyceny · konsument OfferBoq S4 · fundament danych = **Biblioteka Robót** |
| Nie | Drugi katalog SKU w Supabase · scrapowanie · rewrite Bid calculator · GAP-B marża |

---

## 2. Obecny flow cen (mapa)

### 2.1 Pipeline OfferBoq (AI-COST)

```text
Kosztorys snapshot
  → buildOfferBoqFromSnapshot
  → mapOfferBoqDocument          (→ catalogWorkId, categoryId)
  → applyOfferBoqCostIntelligence (dekompozycja M/R/…)
  → applyOfferBoqPricing / priceOfferBoqLine
       provider chain (first hit):
         1. company_knowledge     (LS lokalne)
         2. controlled_market     (WC marketQuotes → split → materialPlnPerUnit)
         3. work_catalog          (companyPricePln → costSplit)
         4. category_rate         (seed WgdomCostCatalog)
         5. company_model         (tylko LABOR — nie materiał)
         6. heuristic_estimate    (tabela j.m. — zawsze „coś”)
         7. external_future       (zawsze null)
         → unknown (rzadko po heurystyce)
  → agregaty materialsPln → Bid (mode offer_boq_ai)
```

**SSOT pliki:**

| Rola | Ścieżka |
|------|---------|
| Origin kinds | `src/lib/tender-offer-boq.ts` |
| Łańcuch / category / heuristic / work_catalog | `src/lib/tender-offer-boq-pricing-engine.ts` |
| Market Quotes → OfferBoq | `src/lib/tender-offer-boq-controlled-price-source.ts` |
| Company knowledge | `src/lib/tender-offer-boq-company-knowledge.ts` |
| Mapowanie linii → praca | `src/lib/tender-offer-boq-mapping.ts` |
| Wire runtime | `src/lib/tender-offer-boq-explainability.ts` |
| Seed stawek kategorii | `src/lib/wgdom-cost-catalog.ts` |
| WC `marketQuotes` | `src/lib/work-catalog/*` · P3.3 commit/coverage UI |

### 2.2 Równoległa ścieżka Bid catalog (nie OfferBoq)

```text
resolveCatalogQuantities → classify → getCategoryRate (± GAP-A)
  → opcjonalnie lookupMarketMaterialPlnPerUnit (WC marketQuotes)
  → × qty × materialPriceIndexPct / overrides
```

Trzy semantyki Bid (`ath_priced` / `catalog` / `offer_boq_ai`) — materiał liczony inaczej; pełny łańcuch originów tylko w **OfferBoq**.

### 2.3 Skąd bierze się cena — kiedy które źródło

| Źródło | Kiedy używane | Dane |
|--------|---------------|------|
| **`company_knowledge`** | Hit po nazwie+kategorii+j.m. z wcześniejszej akceptacji | LS `kw-offer-boq-company-knowledge` (**tylko lokalnie**) |
| **`controlled_market` / marketQuote** | Jest `catalogWorkId` + `computeMarketAverageForWork` ≠ null | WC `marketQuotes` (cloud key `kw-wgdom-work-catalog`) → split M/R |
| **`work_catalog`** | Jest praca z `companyPricePln > 0` | Ten sam WC store |
| **`category_rate`** | Jest `categoryId` ≠ UNKNOWN + stawka seed dla j.m. | **Kod** `defaultWgdomCostCatalog()` — nie live WC |
| **`company_model`** | Tylko **robocizna** | Profil firmy / RBH |
| **`heuristic_estimate`** | Brak wyższego hita (materiał / transport / aux / sprzęt) | Stałe w kodzie (`heuristicMaterialUnitPln`: m²≈35–42, szt≈75–95, …) |
| **`unknown`** | Brak hita (po heurystyce materiału praktycznie nie) | — |
| **Overrides / ATH index** | Ścieżka catalog/ATH Bid | `kw-tender-price-overrides` · `materialPriceIndexPct` |

---

## 3. Analiza źródeł cen (fixture `08dee335`)

### 3.1 Wszystkie komponenty (n = 578)

| Origin | Liczba | Udział |
|--------|--------|--------|
| `heuristic_estimate` | **251** | **43,4%** |
| `category_rate` | **228** | **39,4%** |
| `company_model` | **99** | **17,1%** |
| `controlled_market` | **0** | 0% |
| `work_catalog` | **0** | 0% |
| `company_knowledge` | **0** | 0% |

### 3.2 Tylko komponenty materiałowe (n = 139)

| Origin | Liczba | % szt. | PLN (≈) | % wartości mat. |
|--------|--------|--------|---------|-----------------|
| **`category_rate`** | **107** | **77%** | **~189,8k** | **71,2%** |
| **`heuristic_estimate`** | **32** | **23%** | **~76,7k** | **28,8%** |
| Market / WC / knowledge | **0** | 0% | 0 | 0% |

**Interpretacja:** na tym przetargu materiały **nie** korzystają z Biblioteki / marketQuotes w OfferBoq — mapa `catalogWorkId` + coverage Quotes nie domyka łańcucha → spadek na **seed kategorii**, potem **heurystykę** (zgodne z TENDER-CASE: drzwi ~35 PLN/m²).

---

## 4. Analiza `heuristic_estimate`

| Aspekt | Stan |
|--------|------|
| **Gdzie** | `createHeuristicPriceProvider` · `heuristicMaterialUnitPln` w `tender-offer-boq-pricing-engine.ts` |
| **Materiał** | Tabela j.m. (m²/mb/m³/szt/kpl/kg) + bias CivilWorks |
| **Inne** | Transport **85**, pomocnicze, sprzęt — też heuristic |
| **Udział (fixture)** | **251/578** wszystkich komp.; **32/139** materiałów (**~29% PLN mat.**) |
| **Confidence** | Zwykle **low** · `requiresUserReview` |
| **Ryzyko** | Zawsze zwraca liczbę → maskuje `unknown`, zaniża specjalistykę |

---

## 5. Analiza `category_rate`

| Aspekt | Stan |
|--------|------|
| **Gdzie** | `createCategoryRatePriceProvider` + `getCategoryRate` |
| **Dane** | Seed **`wgdom-cost-catalog`** w kodzie (legacy); sync key `kw-wgdom-cost-catalog` **wyciszony** |
| **Udział (fixture)** | **107/139** mat. (**~71% PLN mat.**) — **główne** źródło materiałów OfferBoq |
| **Confidence** | **medium** |
| **Ryzyko** | Drift vs live Biblioteka Robót; UNKNOWN → brak category → heuristic; nie zna „klapa dymowa / drzwi EI” |

---

## 6. Work Catalog jako fundament „Ceny Materiałów”

| Pytanie | Ocena |
|---------|--------|
| Czy WC może być fundamentem? | **TAK** |
| Co już jest | `marketQuotes` per praca · average engine · CSV commit/rollback (P3.2) · coverage UI (P3.3, flag OFF) · konsument `controlled_market` (COST-02-A) · GAP-A overlay na catalog Bid |
| Czego **nie** ma | Osobny master **SKU materiałów** (kabel X, płytka Y) — Quotes to **cena pracy**, potem **costSplit** → udział materiału |
| REUSE FIRST | **Nie duplikować** Quotes w nowym store; rozszerzać **mapowanie + coverage + UX „ceny materiałów”** nad WC |
| Orphan / luka | `external_future` martwy · company_knowledge niesynchroniczny · line `materialSource` **zgniata** origin do wąskiego enumu |

**Rekomendacja fundamentu:** Phase 1 = **warstwa produktowa / mapująca** „Ceny Materiałów” = widok + reguły nad **istniejącym** `kw-wgdom-work-catalog.marketQuotes` (+ seed category jako fallback jawny), **nie** drugi ledger w Supabase.

---

## 7. Lokalny katalog materiałów — założenia (bez tabel)

| Założenie | Werdykt audytu |
|-----------|----------------|
| Bez duplikowania danych | **PASS** — SSOT Quotes = WC; category seed = fallback RO |
| Wykorzystanie `marketQuotes` | **PASS** — już w `controlled_market` |
| Mapowanie materiał → marketQuote | **Phase 1 fokus:** lepsze `catalogWorkId` / aliasy / typy specjalistyczne — nie nowe tabele |
| Cache | **PASS** — WC już w LS + cloud merge; OfferBoq build in-memory |
| Min. zapytań Supabase | **PASS** — brak nowych endpointów; REUSE `batch-get` / istniejący sync WC |

**Świadomie OUT Phase 1 (AUDIT):** projektowanie schematu SQL/KV „materials”, scraping, multi-supplier API.

---

## 8. Wpływ na systemy

| Obszar | Wpływ Phase 1 (kierunek) | Ryzyko |
|--------|--------------------------|--------|
| **Wydajność** | Niski — więcej hitów market w łańcuchu lokalnym | Śr. jeśli ciężkie re-average bez cache |
| **Wielkość bazy** | Niski przy REUSE WC | Wys. jeśli osobny SKU ledger |
| **Zapytania Supabase** | **0 nowych** przy REUSE sync WC | — |
| **Cloud Sync** | ZERO DIFF CORE — tylko istniejący klucz WC | Nie ruszać `cloud-sync.ts` |
| **AI-COST** | Więcej `controlled_market` / mniej heuristic — **bez** rewrite S1–S7 freeze | Mapowanie błędne → regresja Bid |
| **Work Catalog** | Rozszerzenie UX/mapowania; P3.3 import = zasilanie | Scope creep D-C companyPrice |
| **Payroll / Storage CORE** | **OUT** | — |

---

## 9. Architektura Phase 1 (kierunek — bez tabel)

```text
[UI] Ceny Materiałów (lub zakładka Biblioteki)
        │  RO + mapowanie + coverage (REUSE P3.3)
        ▼
[SSOT] Work Catalog store (marketQuotes · companyPrice · costSplit)
        │
        ├─► OfferBoq providers: controlled_market → work_catalog → …
        └─► Catalog Bid GAP-A overlay (już jest)

Fallback jawny: category_rate (seed) → heuristic (oznaczone „szacunek”)
Zakaz Phase 1: nowy Cloud CORE · scrap · drugi kalkulator · target PLN
```

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy moduł uzasadniony? | **TAK** — empiria fixture: 0% market na materiałach OfferBoq |
| Miejsce w architekturze | FEATURE wyceny · **nad** WC · **przed** / **w** łańcuchu S4 |
| Z czego korzystać | `marketQuotes` · engine średniej · P3.3 import/coverage · mapping OfferBoq · seed category jako L4 |

---

## 10. Ryzyka

| ID | Ryzyko | P | I | Mitigacja PLAN/DF |
|----|--------|---|---|-------------------|
| R1 | Nowy SKU ledger = duplikat WC | Wys | Wys | Zakaz tabel Phase 1 · REUSE Quotes |
| R2 | „Materiał” = work-level split myli Ownera | Wys | Śr | Copy UX: cena pracy → udział M |
| R3 | Lepsze mapowanie bez Quotes = nadal category/heuristic | Śr | Wys | P3.3 ON + import jako ops + coverage KPI |
| R4 | Company knowledge lokalne vs cloud | Śr | Śr | Nie synchro CORE w P1; dokumentować |
| R5 | Regresja Bid po zmianie kolejności providerów | Śr | Wys | Flaga · PV fixture 08dee335 · Anti-AC bez 1,6M |
| R6 | Scope → GAP-B / marża / Kp | Śr | Krytyczny | Hard OUT |
| R7 | Edycja `cloud-sync` / Payroll | Niski | Krytyczny | Bloklista |
| R8 | Heurystyka nadal maskuje dziury | Wys | Śr | Metryka % heuristic w Explain (REUSE 02-B) |

---

## 11. Analiza REUSE (skrót)

| Asset | REUSE |
|-------|--------|
| WC `marketQuotes` + average engine | **TAK — fundament** |
| P3.3 CSV commit / coverage / flag | **TAK — zasilanie + KPI** |
| `createControlledMarketPriceProvider` | **TAK — tor docelowy** |
| Seed `category_rate` | **TAK — fallback**, nie SSOT live |
| Heuristic | **TAK — ostatnia deska**, jawny label |
| Company knowledge | Ostrożnie (local-only) |
| Nowy store materiałów | **NIE Phase 1** |

---

## 12. Rekomendacja i decyzja

| Opcja | Ocena |
|-------|--------|
| Odrzucić EPIC | **NIE** — luka empiryczna (0% market mat. na case) |
| Odłożyć bez PLAN | **NIE** — blokuje jakość OfferBoq / specialty |
| Połączyć z GAP-B | **NIE** — GAP-B = costModel (NOT RECOMMENDED); tu = **wejście materiałów** |
| **PLAN Phase 1** | **TAK** — thin: fundament WC + mapowanie + metryki origin + UX cen |

```text
════════════════════════════════════════════════════════
DECYZJA: READY FOR PLAN

Uzasadnienie:
  TENDER-CASE pokazał systemowy under materiałów.
  Fixture: category_rate ~71% + heuristic ~29% PLN mat.;
  controlled_market = 0. Work Catalog + P3.3 już dają
  tor marketQuotes — brakuje warstwy produktowej
  „Ceny Materiałów” (mapowanie/coverage/ops), nie nowych tabel.
════════════════════════════════════════════════════════
```

**Następny krok procesu:** Owner GO → **PLAN** (IN/OUT · flag · AC · allowlista) → DF → Arch Review.  
**Zakaz teraz:** IMPLEMENT · commit · push · projekt tabel.

---

**AUDIT STATUS:** **COMPLETE**  
**IMPLEMENT / COMMIT / PUSH:** **NIE**
