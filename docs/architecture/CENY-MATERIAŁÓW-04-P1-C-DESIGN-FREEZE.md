# CENY-MATERIAŁÓW-04 P1-C — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE  
> **Etykieta:** P1-C — WC + Quotes · **ELEWACJE / OCIEPLENIA**  
> **STATUS:** **DESIGN FREEZE · FROZEN** · OPS **ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P1-C PLAN **PASS** ([`CENY-MATERIAŁÓW-04-P1-C-PLAN.md`](CENY-MATERIAŁÓW-04-P1-C-PLAN.md) · [`PLAN-COMPLETE`](CENY-MATERIAŁÓW-04-P1-C-PLAN-COMPLETE.md)) · P0 **CLOSED** · P1-A **CLOSED** (2.65.81) · P1-B **CLOSED** (2.65.82 · `dca25c96`)  
> **Parent DF:** [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md) (D-P1-A…F dziedziczone)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1-C):
  Zamrozić listę robót elewacyjnych/ociepleń + kontrakt
  name/desc/keywords + Quotes P3.3 → controlled_market —
  BEZ AI-COST / scoringu.
  Lekcje P1-A + P1-B: zero generycznych tokenów w name/desc;
  keywords = wyłącznie pełne frazy; uwaga na „elewacj*”.

OPS / IMPLEMENT zakazany do:
  Architecture Review PASS + Owner GO OPS P1-C.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1–G9 = ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS P1-C: TAK — po Arch Review PASS
```

Naruszenie Gate / edycja `cloud-sync.ts` / nowi providerzy / zmiana scoringu → **STOP** · amend DF.

---

## 1. Cel (zamrożony)

| | |
|--|--|
| **Bucket** | `ELEWACJE_OCIEPLENIA` |
| **Baseline unmatched** | ~**234 k PLN** · 12 linii · 4 przetargi (CM-03) |
| **Cel** | Nowe `p1c-*` + product Quotes → match → **`controlled_market`** |
| **Forma** | OPS + dane · **0 LOC** silnika |
| **Sukces** | Hard KPI §7 + Coverage §8 + Soft §9 + false matches **0** (OV) |

**Zakres materiałowy (FROZEN):** ETICS / EPS · warstwa zbrojona · tynki elewacyjne · farby elewacyjne (+ REC: zbrojenie siatką tynkarską · wełna MW · listwa/cokół).

---

## 2. Pipeline (zamrożony)

```text
CSV cennik Quotes
        │
        ▼
previewMarketCsvImport          (P3.2 — REUSE)
        │
        ▼
commitMarketQuotesImport        (P3.3 — JEDYNY zapis Quotes)
        │
        ▼
kw-wgdom-work-catalog           (nowe p1c-* + marketQuotes)
        │
        ▼
computeMarketAverageForWork     (AS-IS)
        │
        ▼
controlled_market → OfferBoq    (CM-01 mapping AS-IS · bez zmian)
```

**Zakaz:** scrapery · ręczne `marketQuotes` poza P3.3 · nadpisanie `companyPricePln` z rynku.

---

## 3. Decyzje zamrożone (D-P1-C-*)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P1-C-1** | Cap | **3–12** aktywnych `p1c-*` · rekomendacja OPS **7** (MIN+REC; OPC tylko po triage) · target PLAN **6–8** |
| **D-P1-C-2** | Prefiks ID | `p1c-*` · regiony seed: **wrocław + dolnyśląsk** (jak A/B) |
| **D-P1-C-3** | Lista robót | §4 — **FROZEN** (7 pozycji core; #8–#9 opc. do cap 12) |
| **D-P1-C-4** | Token safety | §5 — zakaz generyków w name/desc · keywords = pełne frazy |
| **D-P1-C-5** | Quotes | **100%** product · `price` = `companyPricePln` · origin `wgdom` (preferowany) / kb_pl / sekocenbud / interbud |
| **D-P1-C-6** | Bucket triage | **IN** ETICS/EPS · warstwa zbrojona · tynk/farba elew. · Rabitz/cięto-ciągniona (kontekst tynk) · **OUT** okablowanie „na elewacji” · stolarka EI · malowanie wewnętrzne · ogrodzenia · chodniki |
| **D-P1-C-7** | Fokus OV | `08dee3f6` · `08dee335` · próbka 18 |
| **D-P1-C-8** | False gate | known/new false = **0** przed READY FOR COMMIT |
| **D-P1-C-9** | OUT silnika | AI-COST · scoring · providerzy · Bid · Cloud Sync CORE |
| **D-P1-C-10** | P1-A / P1-B | **nie ruszać** `p1a-*` / `p1b-*` przy OPS/rollback L1–L2 P1-C |

Zmiana D-P1-C-* = **amend DF** + Owner GO.

**Dziedziczone (bez zmian):** D-P1-A (kolejność A→B→C) · D-P1-C/D parent (Quotes 100% · P3.3) · D-P1-F (Owner triage).

---

## 4. Lista robót P1-C (FROZEN)

### 4.1 Core (rekomendacja OPS = **7** · w target 6–8)

| # | ID **FROZEN** | Unit | Klasa |
|---|---------------|------|-------|
| 1 | `p1c-ocieplenie-etics-eps-m2` | m2 | ETICS / EPS |
| 2 | `p1c-warstwa-zbrojona-etics-m2` | m2 | warstwa zbrojona |
| 3 | `p1c-tynk-elewacyjny-m2` | m2 | tynki elewacyjne |
| 4 | `p1c-farba-elewacyjna-m2` | m2 | farby elewacyjne |
| 5 | `p1c-zbrojenie-tynku-elewacyjnego-m2` | m2 | siatka zbrojąca / cięto-ciągniona (transfer OUT P1-B) |
| 6 | `p1c-welna-mw-etics-m2` | m2 | wełna mineralna MW-ETICS |
| 7 | `p1c-listwa-startowa-cokol-mb` | mb | listwa startowa / cokół |

**Min CLOSE:** pozycje **#1 + #2 + (#3 lub #4)** obowiązkowe (≥3).  
**Target OPS:** wszystkie **7** core.

### 4.2 Opcjonalne (do cap 12 · tylko po Owner triage złotych opisów)

| # | ID | Unit | Warunek |
|---|-----|------|---------|
| 8 | `p1c-przygotowanie-podloza-elewacja-m2` | m2 | przygotowanie podłoża pod ocieplenie — **bez** gołego `docieplenie`/`elewacji` w name/desc |
| 9 | `p1c-ocieplenie-strop-od-spodu-m2` | m2 | ocieplenie stropu od spodu wyraźne w BOQ |

**OUT listy (FROZEN):** pełny katalog fasadowy · stolarka EI · okablowanie / instalacje „na elewacji” · malowanie tynków wewnętrznych · ogrodzenia parcelowe · chodniki/kostka/obrzeża · gabiony.

---

## 5. Kontrakt namePl / descriptionPl / keywords (FROZEN)

### 5.1 Zasady ogólne (lekcje P1-A + P1-B)

| Reguła | **FROZEN** |
|--------|------------|
| Keywords | **wyłącznie pełne frazy** (substring match) — nigdy samotne generyki |
| namePl | konkret + kwalifikator **ETICS / elewacyjny / EPS / MW** · **bez** czasowników generycznych |
| descriptionPl | lustrzane bezpieczne brzmienie · te same zakazy co namePl |
| Scan OPS | lista §5.2 → **0** trafień w name/desc przed OV |
| Wieloznaczność | zakaz nazw typu „Siatka”, „Wykonanie…”, „Ułożenie…”, „System…”, „Docieplenie…” |

Scoring OfferBoq: tokeny `namePl` (len≥4) i `descriptionPl` (len≥5) przez `hay.includes(token)` — **goły token = false match**.

### 5.2 Tokeny zakazane w namePl / descriptionPl (gołe)

Po `foldPolishText` + `split(/\s+/)` **żaden** token name (len≥4) / desc (len≥5) **nie może** należeć do listy (dokładne dopasowanie tokenu):

| Token | Powód |
|-------|--------|
| `rozebranie` | obce rozebrania |
| `ustawienie` | kolizja P1-A/`08dec13d` |
| `montaz` / `montaż` | obce montaże |
| `wykonanie` | **krytyczne P1-C** — BOQ „Wykonanie warstwy…” |
| `ulozenie` / `ułożenie` | obce ułożenia (także poza ETICS) |
| `dzierzawa` / `dzierżawa` | zbyt szerokie |
| `siatka` / `siatki` | kolizja ogrodzenie ↔ tynkarska; tylko we **frazach** keywords |
| `system` / `systemowe` / `systemowy` | P1-B: „materiały systemowe”; tu tylko fraza `system ETICS` w keywords |
| `stalowy` / `stalowych` | belki/wanny (P1-B) |
| `brama` / `furtka` / `panel` / `panele` | P1-B / fasady niespecyficzne |
| `elewacji` | szum „okablowania na elewacji” — używać `elewacyjny`/`elewacyjna` |
| `ocieplenia` / `docieplenie` / `docieplenia` | „warstwie docieplenia” zawiera `ocieplenia` / `docieplenia` — szum instalacyjny |
| `ogrodzenie` / `ogrodzenia` / `ogrodzeniowy` | chronić P1-B |
| `chodnik` / `kostka` / `obrzeze` / `obrzeża` | chronić P1-A |

**Dozwolone:** złożone formy jako **jeden** token (np. `elewacyjny`, `elewacyjna`, `zbrojona`, `cienkowarstwowy`, `mineralną`) — nie są pozycjami listy powyżej.  
**Zakazane:** samodzielne słowa z listy, nawet obok kwalifikatora w sąsiednim tokenie.

### 5.3 Zamrożone teksty (core #1–#7)

> OPS **musi** użyć poniższych (lub równoważnych **bez** naruszenia §5.1–5.2). `companyPricePln` = Owner cennik w OPS (nie DF).  
> Keywords = pełne frazy. Teksty poniżej **wstępnie zgodne z §5.2** (scan obowiązkowy w OPS).

#### 1. `p1c-ocieplenie-etics-eps-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Ocieplenie ścian płytami EPS (ETICS)` |
| descriptionPl | `Ocieplenie ścian zewnętrznych płytami EPS w układzie ETICS` |
| keywords | `płyty ze styropianu EPS` · `ułożenie płyt ze styropianu` · `ocieplenie ścian płytami EPS` · `styropian EPS` · `system ETICS` · `płyty styropianowe mocowanych na ścian` |

#### 2. `p1c-warstwa-zbrojona-etics-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Warstwa zbrojona ETICS na płytach izolacyjnych` |
| descriptionPl | `Warstwa zbrojona ETICS na podłożu z płyt izolacyjnych` |
| keywords | `warstwa zbrojona z siatką` · `warstwa zbrojona z siatką na podłożu z płyt styropianowych` · `warstwa zbrojona ETICS` · `zbrojenie siatką na styropianie` |

#### 3. `p1c-tynk-elewacyjny-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Tynk elewacyjny cienkowarstwowy` |
| descriptionPl | `Tynk elewacyjny cienkowarstwowy na warstwie zbrojonej` |
| keywords | `tynk elewacyjny` · `tynk cienkowarstwowy elewacyjny` · `tynk silikonowy elewacyjny` · `tynk silikatowy elewacyjny` |

#### 4. `p1c-farba-elewacyjna-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Farba elewacyjna na tynku zewnętrznym` |
| descriptionPl | `Farba elewacyjna na tynku zewnętrznym — warstwa wierzchnia` |
| keywords | `farba elewacyjna` · `malowanie elewacji farbą` · `farba silikonowa elewacyjna` · `farba elewacyjna na tynku` |

> **Uwaga #4:** fraza keywords `malowanie elewacji farbą` — **nie** mylić z malowaniem tynków **wewnętrznych** (false gate OV).

#### 5. `p1c-zbrojenie-tynku-elewacyjnego-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Zbrojenie powierzchniowe tynku elewacyjnego` |
| descriptionPl | `Zbrojenie powierzchniowe tynku elewacyjnego włóknem szklanym` |
| keywords | `siatka zbrojąca elewacyjna` · `siatka cięto-ciągniona` · `wypełnienie oczek siatki cięto-ciągnionej` · `osiatkowanie tynku` · `siatka zbrojąca` |

> **Transfer P1-B:** linie Rabitz / cięto-ciągniona / wypełnienie oczek → **tu**, nie `p1b-*`.

#### 6. `p1c-welna-mw-etics-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Ocieplenie ścian wełną mineralną MW` |
| descriptionPl | `Ocieplenie ścian zewnętrznych wełną mineralną MW w układzie ETICS` |
| keywords | `wełna mineralna` · `płyty z wełny mineralnej` · `ocieplenie wełną mineralną` · `MW-ETICS` · `wełna mineralna elewacyjna` |

#### 7. `p1c-listwa-startowa-cokol-mb`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Listwa startowa cokołowa ETICS` |
| descriptionPl | `Listwa startowa cokołowa w układzie ETICS` |
| keywords | `listwa startowa` · `listwa startowa ocieplenia` · `cokół ocieplenia` · `listwa cokołowa ETICS` |

### 5.4 Weryfikacja (scan §5.2 na name+desc core)

| ID | name/desc tokens ∩ lista §5.2 |
|----|-------------------------------|
| #1–#7 | **∅ (zero)** — wymagane przed OV; OPS skrypt jak P1-B |

---

## 6. Quotes (FROZEN)

| Reguła | **FROZEN** |
|--------|------------|
| Pokrycie | **100%** aktywnych `p1c-*` przed CLOSE |
| Pipeline | CSV → preview (≥80% matched) → **`commitMarketQuotesImport`** |
| Origin | product exclusively |
| Cena | `marketQuotes.*.price` = `companyPricePln` |
| Slice | ten sam OPS co works |
| `legacy_seed` | **nie** liczy się do H2 |

---

## 7. Hard KPI (FROZEN — gate CLOSE)

| ID | Target **FROZEN** |
|----|-------------------|
| **H1** | ≥ **3** · ≤ **12** aktywne `p1c-*` |
| **H2** | Product Quotes **100%** na nowych |
| **H3** | Known false = **0** · new false = **0** |
| **H4** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia HE→CM) = **0** vs tip po P1-B |
| **H5** | Unmatched PLN `ELEWACJE_OCIEPLENIA`: spadek ≥ **25%** vs ~234 k na powtórce 18 |
| **H6** | Scan tokenów §5.2 w name/desc = **0** |
| **H7** | P1-A **10** + P1-B **7** intact (Quotes zachowane) |

---

## 8. Soft KPI (FROZEN — nie hard gate)

| ID | Target **FROZEN** |
|----|-------------------|
| **S1** | HE avg 18 ≤ **27.0%** (brak regresji vs P1-B); cel roboczy dalszy spadek |
| **S2** | CM avg 18 ≥ **73.0%** |
| **S3** | `08dee3f6`: ↑ `catalogWorkIdPct` i/lub ↓ HE share vs P1-B tip |

---

## 9. Coverage KPI (FROZEN — obowiązkowy pomiar)

| ID | Metryka **FROZEN** |
|----|-------------------|
| **K-P1-C1** | Liczba linii OfferBoq (suma 18) z `catalogWorkId` ∈ `p1c-*` · **C1 > 0** wymagane przy CLOSE |
| **K-P1-C2** | Linie bucketa elewacji nadal HE lub unmatched |

Evidence: `.tmp/ceny-materialow-04-p1c-*-validation.json`.

---

## 10. Fokus / false-match (FROZEN)

| Tender | Oczekiwanie |
|--------|-------------|
| `08dee3f6` | true matche warstwy zbrojonej / ocieplenia / tynku elew. |
| `08dee335` | styropian EPS + siatka cięto-ciągniona → `p1c-*` (nie `p1b-*`) |
| Próbka 18 | te same ID co CM-02 / P0 / P1-A / P1-B |

**Must never map to p1c-*:**

| Wzorzec |
|---------|
| Ogrodzenie parcelowe / panele / bramy ogrodzeniowe (`p1b-*`) |
| Obrzeża / chodniki / kostka (`p1a-*`) |
| Malowanie tynków **wewnętrznych** |
| Okablowanie / instalacje „na elewacji” bez materiału ETICS |
| Rynny / barierki / belki stalowe / wanny |

---

## 11. Rollback (FROZEN)

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na wszystkich `p1c-*` |
| **L2** | Rollback Quotes P3.3 + dezaktywacja/usunięcie `p1c-*` |
| **L3** | Restore backup JSON katalogu sprzed slice P1-C |

Backup **obowiązkowy** przed OPS.  
**P1-A (`p1a-*`) i P1-B (`p1b-*`) nie dezaktywować** przy L1–L2 P1-C.

---

## 12. OUT (FROZEN — twarde)

| OUT |
|-----|
| Zmiany **AI-COST** / pricing-engine |
| Zmiany **scoring** / `tender-offer-boq-mapping.ts` |
| Nowi **providerzy** / reorder |
| Zmiany **heurystyk** |
| **Bid Calculator** |
| Edycja **Cloud Sync CORE** (`cloud-sync.ts`) / nowe DATA_KEYS |
| Scrapery / live API cen |
| Nadpisanie `companyPricePln` z rynku |
| Seed okablowania / stolarki EI / malowań wewnętrznych jako elewacja |
| Mutacja `p1a-*` / `p1b-*` |
| P2 / INNE triage w tym slice |
| Nowa feature flag |

---

## 13. Allowlista / bloklista plików (FROZEN)

### Allowlista OPS

| | |
|--|--|
| Dane | `kw-wgdom-work-catalog` (custom `p1c-*` + Quotes) |
| Tor | istniejące API P3.2/P3.3 (`preview` / `commitMarketQuotesImport`) |
| Docs / evidence | `docs/architecture/CENY-MATERIAŁÓW-04-P1-C-*` · `.tmp/ceny-materialow-04-p1c-*` |

### Bloklista

| | |
|--|--|
| `src/lib/tender-offer-boq-mapping.ts` | scoring |
| AI-COST / pricing-engine | |
| `cloud-sync.ts` | |
| Bid Calculator | |
| Provider registry / heurystyki | |

---

## 14. Feature flags (FROZEN)

| Flaga | Rola |
|-------|------|
| `kw-wc-p33-market-pricing-ux` | ON tylko sesja ops importu · tip default **OFF** |
| `kw-ceny-materialow-01` | Pomiar OFF/ON · tip default **OFF** |
| Nowa flaga P1-C | **NIE** |

---

## 15. Kryteria READY FOR ARCHITECTURE REVIEW

| # | Check |
|---|--------|
| 1 | Lista §4 core zamrożona (7 ID) |
| 2 | namePl / descriptionPl / keywords §5 zamrożone · zgodne z §5.2 |
| 3 | Pipeline = wyłącznie P3.3 |
| 4 | Hard / Soft / Coverage KPI zamrożone |
| 5 | Rollback L1–L3 + ochrona P1-A/P1-B |
| 6 | OUT silnika zamrożony |
| 7 | Token safety A+B włączony jako D-P1-C-4 (w tym `elewacji` / `ocieplenia` / `siatka` / `system`) |

---

## 16. Następny krok

```text
Architecture Review P1-C (thin)
  → Owner GO OPS P1-C
  → Owner Verification
  → READY FOR COMMIT (osobny GO)
```

**Zakaz:** IMPLEMENT · commit · push bez Arch Review + Owner GO.
