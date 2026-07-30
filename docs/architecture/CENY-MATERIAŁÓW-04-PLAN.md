# CENY-MATERIAŁÓW-04 — PLAN

> **ID:** CENY-MATERIAŁÓW-04-PLAN  
> **Etykieta:** Data Coverage Phase 2 — Quotes fill + WC expansion  
> **STATUS:** PLAN (historyczny) · Parent EPIC **ACTIVE** · **P0+P1+P2 COMPLETE** · **P3 OPEN** (AUDIT pending Owner GO)  
> **Data:** 2026-07-30 (sync closeout P2)  
> **P2 SSOT:** [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md)  
> **P1 SSOT:** [`CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md)  
> **MODE:** docs living · **bez** auto-start P3 IMPLEMENT  
> **Wejście:** [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) · **READY FOR PLAN**  
> **Zależności CLOSED:** CENY-MATERIAŁÓW-01 · WORK-CATALOG-P3.3 · COST-02-A  
> **Baseline tip:** UI **2.65.83** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
Parent CENY-MATERIAŁÓW-04:
  P0 · P1 · P2 = COMPLETE
  NEXT = P3 (INNE) AUDIT — Owner GO → AUDIT → PLAN → DF
  BEZ zmian AI-COST / providerów / Bid / Cloud CORE
════════════════════════════════════════════════════════
```

---

## 0. Założenia z AUDIT (wiązane)

| Ustalenie | Implikacja PLAN |
|-----------|-----------------|
| AI-COST i CM-01 działają poprawnie | **Zero** zmian silnika wyceny / mapping uplift |
| `controlled_market` = 0% bo **NO_RECORDS** | P0 = wyłącznie zasilenie Quotes |
| 34/34 robót: puste `marketQuotes` | P0 scope = te 34 ID |
| Pipeline P3.3 kompletny, niezasilony | **REUSE** CSV preview + `commitMarketQuotesImport` |
| Unmatched top: chodniki → ogrodzenia → elewacje | P1 kolejność sztywna z AUDIT |
| INNE ~1,72 M | P3 = triaż, nie ślepy seed |

---

## 1. Cel i non-goals

### 1.1 Cel

Zwiększyć pokrycie danych (`marketQuotes` + brakujące roboty WC), żeby **istniejący** łańcuch OfferBoq (`company_knowledge` → **`controlled_market`** → `work_catalog` → …) realnie korzystał z toru rynkowego.

### 1.2 Non-goals (OUT globalne całego EPIC-u 04)

| OUT | Powód |
|-----|-------|
| Nowi providerzy / zmiana kolejności | AS-IS COST-02-A |
| Nowe tabele / SKU ledger | AUDIT OUT |
| Zmiany AI-COST (mapping, pricing engine, heurystyki) | CM-01 CLOSED · nie re-open |
| Scrapery / zewnętrzne API cen | OUT |
| GAP-B · Kp · marża · Bid Calculator · Cloud Sync CORE | OUT |
| Target 1,6 M | OUT |
| Edycja `cloud-sync.ts` / Payroll | Gate |

---

## 2. Architektura docelowa (bez zmian kodu silnika)

```text
[Źródło cen: CSV / cennik ręczny Owner]
        │
        ▼
 P3.3 UI (flaga kw-wc-p33-market-pricing-ux = ON na czas ops)
   previewMarketCsvImport → commitMarketQuotesImport
        │
        ▼
 kw-wgdom-work-catalog.works[].marketQuotes   ← SSOT
        │
        ▼
 computeMarketAverageForWork  (AS-IS)
        │
        ▼
 controlled_market provider  (AS-IS)  →  OfferBoq materiały
```

**P0–P2** mogą być wykonane jako **ops + dane** (CSV + ewentualnie ręczne roboty w Bibliotece).  
**IMPLEMENT kodu** tylko jeśli DF wskaże cienką lukę UX/ops (np. szablon CSV, seed plik w repo) — **nie** w tym PLAN jako wymóg; preferencja: **0 LOC silnika**.

---

## 3. Etap P0 — Quotes dla istniejących 34

### 3.1 IN

| Element | Opis |
|---------|------|
| Scope robót | **Wyłącznie** 34 aktywne `legacy-*` z prod `kw-wgdom-work-catalog` |
| Dane | `marketQuotes` (product origins: preferowane `sekocenbud` / `kb_pl` / `wgdom` / `interbud`) |
| Region | Start: **`wroclaw`** z fallback hierarchii AS-IS Engine (`polska` OK jako minimum) |
| Narzędzie | P3.3: CSV → Analiza → **Commit** (`commitMarketQuotesImport`) |
| Flagi | `kw-wc-p33-market-pricing-ux=1` na czas importu; CM-01 opcjonalnie ON do pomiaru |
| Weryfikacja | Coverage panel S5 · powtórka probe CM-02bis (controlled_market > 0) |

### 3.2 OUT

| OUT |
|-----|
| Nowe roboty / nowe tradeId |
| Zmiana `companyPricePln` (D-C nadal OUT) |
| Nowi providerzy · AI-COST · Bid · Cloud CORE |
| `legacy_seed` jako jedyny „sukces” bez product Quotes (dozwolony tylko jako **tymczasowy** most, nie KPI P0) |

### 3.3 Źródło danych

| Preferencja | Opis |
|-------------|------|
| **1. Owner / ops CSV** | Cennik rynkowy (Sekocenbud / KB / własny arkusz) zmapowany na `external_id` ≈ work id lub alias z preview |
| **2. Szablon CSV P3.2** | Kolumny zgodne z istniejącym parserem preview (`origin, external_id, region, price, confidence`) |
| **3. Zakaz** | Scraper · live API · ręczne SQL do KV poza routerem katalogu |

### 3.4 Sposób zasilania marketQuotes

1. Włączyć P3.3 flag w sesji ops.  
2. Biblioteka Robót → Import CSV rynku.  
3. Preview: dopasowanie do 34 ID (cel: **≥ 80%** matched).  
4. Commit → `commitMarketQuotesImport`.  
5. Potwierdzić cloud/LS store: `worksWithProductQuotes ≥ 27/34` (80%).  
6. Rollback P3.3 dostępny lokalnie przy błędzie (AS-IS).

### 3.5 Wpływ na origins

| Origin | Oczekiwany efekt P0 |
|--------|---------------------|
| **controlled_market** | **Odblokowanie** — z 0% → >0% na sprawach z wysokim `catalogWorkId` (CM-02: często 50–80%+) |
| **work_catalog** | Może lekko spaść udziałem (materiały przechodzą wyżej do CM) — **OK** |
| **heuristic_estimate** | Spadek na liniach już zmapowanych, które dziś spadają do HE mimo workId (gdy average = null) |
| **category_rate** | Bez celowej zmiany |

### 3.6 KPI sukcesu P0

| KPI | Target |
|-----|--------|
| % z 34 z product Quotes (`price>0`) | **≥ 80%** |
| `computeMarketAverage` priceOk | **≥ 80%** z 34 |
| Powtórka 18 spraw (CM-02bis): śr. `controlled_market` mat. | **> 0%** · cel roboczy **≥ 10%** |
| Regresje direct OFF vs tip | **0** krytycznych (Δ% &lt; −5% bez uzasadnienia) |
| Czas / I/O | Bez nowych zapytań Supabase poza istniejącym persist katalogu |

### 3.7 Ryzyka P0

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| CSV nie mapuje `legacy-*` ID | Śr | Preview report · aliasy / external_id w szablonie |
| Ceny nieadekwatne regionowo | Śr | Region `wroclaw` + confidence · Owner review coverage |
| Commit bez cloud (write mode) | Niski | Respektować `catalogWriteMode` · PV coverage po sync |
| Flaga P3.3 zostaje ON w prod | Niski | Runbook: po ops wrócić OFF (default tip) |

### 3.8 Rollback P0

| Poziom | Akcja |
|--------|--------|
| L1 | P3.3 **Rollback** ostatniego importu (AS-IS) |
| L2 | Przywrócenie snapshotu katalogu sprzed commit (jeśli ops trzyma backup JSON) |
| L3 | Tip parity: puste Quotes = stan sprzed P0 (controlled_market znów 0 — akceptowalne) |

---

## 4. Etap P1 — Nowe grupy WC (kolejność AUDIT)

Kolejność **sztywna**:

1. **Chodniki i nawierzchnie** (~311 k unmatched)  
2. **Ogrodzenia** (~258 k)  
3. **Elewacje i ocieplenia** (~234 k)

### 4.1 IN (per grupa, powtarzalny wzorzec)

| Element | Opis |
|---------|------|
| Nowe `CatalogWork` | 3–12 robót / grupę (unit + keywords PL) — **custom/seed w Bibliotece**, nie nowa tabela |
| Keywords | Opisy z próbek CM-02/03 (np. kostka, podbudowa, siatka, styropian, docieplenie) |
| `companyPricePln` | Orientacyjna cena firmy (Owner) — tor WC |
| `marketQuotes` | **Obowiązkowo w tym samym slice** co nowe roboty (nie zostawiać NO_RECORDS) |
| Mapping | **REUSE** istniejący `mapOfferBoq*` + CM-01 uplift gdy flaga ON — **bez** zmian kodu scoringu |
| Pomiar | CM-02bis na podzbiorze spraw z bucketem (08decd0e, 08ded5cb, 08dee3f6, …) |

### 4.2 OUT

| OUT |
|-----|
| Zmiana CM-01 alias rules / scoring |
| MPI / KNR rewrite |
| Pełny katalog branżowy „wszystko naraz” |
| D-C: rynek → nadpisanie companyPrice |

### 4.3 Źródło danych

| Wejście | Opis |
|---------|------|
| AUDIT samples | `.tmp/ceny-materialow-03-audit.json` · CM-02 samples |
| Cennik Owner | Jednostki PLN/m², szt, mb typowe dla grupy |
| CSV Quotes | Jak P0 — po utworzeniu work ID |

### 4.4 Zasilanie Quotes

Po utworzeniu robót: **ten sam** flow P3.3 CSV commit (P0 tooling).  
Zasada: **Work bez Quotes = nie zamykaj slice P1 dla tej grupy.**

### 4.5 Wpływ origins

| Origin | Oczekiwanie P1 |
|--------|----------------|
| **controlled_market** | Wzrost na sprawach z nowymi match + Quotes |
| **work_catalog** | Wzrost na unmatched → matched (nawet przed CM) |
| **heuristic_estimate** | Spadek w bucketach #2–#4 (AUDIT) |

### 4.6 KPI sukcesu P1

| KPI | Target |
|-----|--------|
| Nowe roboty aktywne w 3 grupach | **≥ 3** / grupę (min. 9 łącznie) |
| % nowych z product Quotes | **100%** przed CLOSE grupy |
| Unmatched PLN w bucketach chodniki+ogrodzenia+elewacje | **≤ 50%** baseline (~800 k → ≤ ~400 k) na powtórce 18 |
| Sprawa 08dee3f6 / 08decd0e / 08ded5cb | Poprawa HE lub ↑ catalogWorkId vs CM-02 |
| Regresje | **0** |

### 4.7 Ryzyka P1

| Ryzyko | Mitigacja |
|--------|-----------|
| Fałszywy match (zły work) | Cienkie keywords · PV na złotych opisach · Owner review |
| Scope creep „pełna branża” | Cap 3–12 robót / grupę w DF |
| Quotes opóźnione względem works | Gate CLOSE: Quotes 100% na nowych |

### 4.8 Rollback P1

| Poziom | Akcja |
|--------|--------|
| L1 | Dezaktywacja nowych robót (`active=false`) |
| L2 | Rollback Quotes (P3.3) + usunięcie custom works (Owner) |
| L3 | Katalog tip sprzed P1 (backup JSON) |

---

## 5. Etap P2 — Depth (rozbiórki · instalacje)

### 5.1 IN

| Grupa | Uzasadnienie AUDIT |
|-------|-------------------|
| **Rozbiórki / demontaże** | 38 linii · ~80 k · **14/18** spraw (częstość) |
| **Instalacje** (elektryka depth · hydraulika/CO · GK) | Uzupełnienie ponad cienkie `legacy-*` (~36 k + 16 k + 12 k) |

Wzorzec jak P1: works + keywords + **Quotes w tym samym slice**.

### 5.2 OUT

| OUT |
|-----|
| Nowe branże poza listą (stolarka EI masowa = backlog osobny) |
| Zmiany Discovery/parser |
| CM-01 code |

### 5.3 Źródło / Quotes / wpływ

Jak P1 — źródło: próbki unmatched + cennik Owner · Quotes via P3.3 · oczekiwany ↓ HE / ↑ WC|CM na częstych sprawach remontowych.

### 5.4 KPI P2

| KPI | Target |
|-----|--------|
| Rozbiórki: unmatched linie w buckecie | **≤ 50%** baseline linii (38 → ≤ 19) na powtórce |
| ≥ 1 nowa robota depth / trade: ROZBIORKI, ELEKTRYKA, HYDRAULIKA, SCIANY_GK | **TAK** |
| Quotes na nowych | **100%** |
| Regresje | **0** |

### 5.5 Ryzyka / Rollback

Jak P1 (cap depth, dezaktywacja robót, rollback Quotes).

---

## 6. Etap P3 — Triaż INNE (~1,72 M PLN)

### 6.1 IN

| Element | Opis |
|---------|------|
| Eksport / lista | Top N unmatched opisów z bucketa INNE (18 spraw) — **docs/ops artifact** |
| Klasyfikacja ręczna | → istniejący gap P1/P2 · nowa mikro-grupa · **śmieć parsera** · odłożone |
| Output | Ranking „INNE → konkretna grupa” + decyzja: WC seed **lub** ticket COST-PARSER / Discovery |
| Opcjonalnie | 1–2 mikro-grupy o najwyższym PLN po triażu (tylko jeśli ≥ próg DF, np. ≥ 50 k i ≥ 5 linii) |

### 6.2 OUT

| OUT |
|-----|
| Ślepy seed 400+ linii INNE |
| Rewrite parserów w tym EPIC-u (tylko **ticket** outbound) |
| Traktowanie 1,72 M jako jednej roboty |

### 6.3 Źródło danych

Probe / lista z `.tmp/ceny-materialow-03-audit.json` + ewentualny nowy readonly export (bez mutacji KV).

### 6.4 Quotes

Tylko dla **nowych** grup powstałych z triażu — flow P3.3 jak P0.

### 6.5 Wpływ / KPI

| KPI | Target |
|-----|--------|
| % PLN INNE przypisane do nazwanej grupy lub „parser junk” | **≥ 70%** top-kwantyla opisów (nie całego szumu) |
| Parser junk wyodrębniony | Lista ID spraw (np. 08deb669) → backlog poza 04 |
| Nowe grupy z triażu | 0–2 · z Quotes |

### 6.6 Ryzyka / Rollback

| Ryzyko | Mitigacja |
|--------|-----------|
| Overfitting seed pod jeden przetarg | Wymóg: grupa w ≥ 2 sprawach lub ≥ 50 k |
| Mylenie junk z robotą | Dwóch reviewerów / Owner GO na mikro-grupę |

Rollback: brak mutacji jeśli P3 tylko docs; przy seed — jak P1 L1.

---

## 7. Kolejność wykonania i zależności

```text
P0 Quotes@34  ──▶  CM-02bis smoke (controlled_market > 0)
        │
        ▼
P1a Chodniki ──▶ P1b Ogrodzenia ──▶ P1c Elewacje
        │
        ▼
P2 Rozbiórki + instalacje depth
        │
        ▼
P3 INNE triage ──▶ (opcjonalnie mikro-grupy) / ticket parser
```

**Zasada:** nie startować P1 CLOSE bez **P0 PASS** (inaczej nowe roboty znów będą NO_RECORDS na CM).

---

## 8. Allowlista / bloklista (kierunek DF)

### 8.1 Allowlista (orientacyjna)

| Obszar | Przykłady |
|--------|-----------|
| Dane / ops | CSV Quotes · wpisy Biblioteki Robót (UI) |
| Docs | `CENY-MATERIAŁÓW-04-*` · runbook ops · szablon CSV (opcjonalnie `docs/` lub `.tmp` niecommit) |
| Testy pomiarowe | Probe readonly CM-02bis (jak `.tmp/ceny-materialow-02-*`) |
| Flagi | P3.3 ON tylko sesja ops |

### 8.2 Bloklista

| Plik / obszar |
|---------------|
| `tender-offer-boq-pricing-engine.ts` (kolejność) |
| `tenders-bid-calculator.ts` · `cloud-sync.ts` · `company-labor-cost` defaults |
| Nowe providery · scrapery · migracje Supabase |
| Heurystyki / CM-01 mapping (chyba że osobny EPIC po P3) |

---

## 9. Feature flags

| Flaga | Rola w 04 |
|-------|-----------|
| `kw-wc-p33-market-pricing-ux` | **Ops ON** podczas importu · default tip **OFF** |
| `kw-ceny-materialow-01` | Pomiar ON w CM-02bis · default tip **OFF** |
| Nowa flaga 04 | **NIE wymagana** (dane, nie FEATURE kodu) |

---

## 10. Plan weryfikacji (po każdym etapie)

| Check | Metoda |
|-------|--------|
| Quotes coverage | P3.3 S5 panel + probe `worksWithProductQuotes` |
| OfferBoq origins | Powtórka 18 spraw (skrypt CM-02) OFF/ON |
| Regresja | directPln Δ% · 0 regresji |
| Rollback drill | 1× rollback P3.3 na staging/ops |

---

## 11. Payroll / Gate (oczekiwany wynik DF)

```text
G1–G9: ALL-NIE  (ops danych katalogu · bez Payroll/Cloud CORE)
Klasa: FEATURE-DATA / OPS  (nie CORE)
Owner GO IMPLEMENT: dopiero po DF + AR (jeśli w ogóle będzie kod;
                    czysty ops P0 może być Owner GO OPS bez commit)
```

---

## 12. Otwarte decyzje do DESIGN FREEZE

| ID | Pytanie | Rekomendacja PLAN |
|----|---------|-------------------|
| **D-A** | Czy P0 wymaga product Quotes, czy `legacy_seed` wystarczy na start? | **Product wymagany do KPI**; legacy_seed tylko most &lt;20% |
| **D-B** | Min. liczba robót P1 / grupę | **3–12** (cap w DF) |
| **D-C** | Czy szablon CSV i lista 34 ID trafiają do repo? | Opcjonalnie `docs/ops/` — DF zdecyduje |
| **D-D** | P0 jako sam OPS bez commit? | **TAK preferowane**; commit tylko jeśli artefakty docs/szablon |
| **D-E** | Próg mikro-grupy z INNE | ≥ 50 k PLN **i** ≥ 5 linii **lub** ≥ 2 przetargi |

---

## 13. Checklist PLAN → DF

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | P0–P3 pokrywają RCA NO_RECORDS + ranking AUDIT? | **TAK** |
| 2 | Zero zmian AI-COST / providerów? | **TAK** |
| 3 | REUSE P3.3 commit path? | **TAK** |
| 4 | KPI / ryzyka / rollback per etap? | **TAK** |
| 5 | OUT twarde (GAP-B, Bid, scraper, Cloud CORE)? | **TAK** |
| 6 | Kolejność P1 zgodna z AUDIT? | **TAK** |
| 7 | Blokery do DF? | **NIE** (D-A…E do zamrożenia, nie blokują startu DF) |

---

## 14. Werdykt PLAN

| | |
|--|--|
| **Status** | PLAN **COMPLETE** (patrz COMPLETE card) |
| **Rekomendacja** | **READY FOR DESIGN FREEZE** |
| **Następny krok** | DF zamraża D-A…E · allowlistę ops · KPI P0/P1 · ewentualny Owner GO **OPS P0** równolegle do DF jeśli Owners chce szybkie Quotes |

**Zakaz teraz:** IMPLEMENT silnika · commit · push (chyba że osobny GO wyłącznie na docs PLAN — Owner nie prosił).
