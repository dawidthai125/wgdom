# CENY-MATERIAŁÓW-04 P1-B — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE  
> **Etykieta:** P1-B — WC + Quotes · **OGRODZENIA**  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **AMEND 2026-07-30** (§5.3 token safety) · OPS **ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P1-B PLAN **PASS** ([`CENY-MATERIAŁÓW-04-P1-B-PLAN.md`](CENY-MATERIAŁÓW-04-P1-B-PLAN.md) · [`PLAN-COMPLETE`](CENY-MATERIAŁÓW-04-P1-B-PLAN-COMPLETE.md)) · P1-A **CLOSED · PV** · tip **2.65.81** / **`dc0daea0`**  
> **Parent DF:** [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md) (D-P1-A…F dziedziczone)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1-B):
  Zamrozić listę robót ogrodzeniowych + kontrakt name/desc/keywords
  + Quotes P3.3 → controlled_market — BEZ AI-COST / scoringu.
  Lekcje P1-A: zero generycznych tokenów w namePl/descriptionPl.

OPS / IMPLEMENT zakazany do:
  Architecture Review PASS + Owner GO OPS P1-B.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1–G9 = ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS P1-B: TAK — po Arch Review PASS
```

Naruszenie Gate / edycja `cloud-sync.ts` / nowi providerzy / zmiana scoringu → **STOP** · amend DF.

---

## 1. Cel (zamrożony)

| | |
|--|--|
| **Bucket** | `OGRODZENIA_SIATKI` |
| **Baseline unmatched** | ~**258 k PLN** · 15 linii · 5 przetargów (CM-03) |
| **Cel** | Nowe `p1b-*` + product Quotes → match → **`controlled_market`** |
| **Forma** | OPS + dane · **0 LOC** silnika |
| **Sukces** | Hard KPI §7 + Coverage §8 + false matches **0** (OV) |

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
kw-wgdom-work-catalog           (nowe p1b-* + marketQuotes)
        │
        ▼
computeMarketAverageForWork     (AS-IS)
        │
        ▼
controlled_market → OfferBoq    (CM-01 mapping AS-IS · bez zmian)
```

**Zakaz:** scrapery · ręczne `marketQuotes` poza P3.3 · nadpisanie `companyPricePln` z rynku.

---

## 3. Decyzje zamrożone (D-P1-B-*)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P1-B-1** | Cap | **3–12** aktywnych `p1b-*` · rekomendacja OPS **7** (MIN+REC; OPC tylko po triage) |
| **D-P1-B-2** | Prefiks ID | `p1b-*` · regiony seed: **wrocław + dolnyśląsk** (jak P1-A) |
| **D-P1-B-3** | Lista robót | §4 — **FROZEN** (7 pozycji core; #8 opc. do cap 12) |
| **D-P1-B-4** | Token safety | §5 — zakaz generyków w name/desc · keywords = pełne frazy |
| **D-P1-B-5** | Quotes | **100%** product · `price` = `companyPricePln` · origin `wgdom` (preferowany) / kb_pl / sekocenbud / interbud |
| **D-P1-B-6** | Bucket triage | **Zakaz** seedu siatki cięto-ciągnionej / Rabitz / warstwy zbrojonej jako ogrodzenie |
| **D-P1-B-7** | Fokus OV | `08ded5cb` · `08dec13d` · próbka 18 |
| **D-P1-B-8** | False gate | known/new false = **0** przed READY FOR COMMIT |
| **D-P1-B-9** | OUT silnika | AI-COST · scoring · providerzy · Bid · Cloud Sync CORE |
| **D-P1-B-10** | P1-A | **nie ruszać** `p1a-*` przy OPS/rollback L1–L2 P1-B |

Zmiana D-P1-B-* = **amend DF** + Owner GO.

**Dziedziczone (bez zmian):** D-P1-A (kolejność A→B→C) · D-P1-C/D (Quotes 100% · P3.3) · D-P1-F (Owner triage).

---

## 4. Lista robót P1-B (FROZEN)

### 4.1 Core (rekomendacja OPS = **7**)

| # | ID **FROZEN** | Unit | Klasa |
|---|---------------|------|-------|
| 1 | `p1b-ogrodzenie-siatka-mb` | mb | siatka / panel ogrodzeniowy |
| 2 | `p1b-panel-ogrodzeniowy-mb` | mb | panele ogrodzeniowe |
| 3 | `p1b-slupek-ogrodzeniowy-szt` | szt | słupki |
| 4 | `p1b-brama-ogrodzeniowa-szt` | szt | bramy |
| 5 | `p1b-furtka-ogrodzeniowa-szt` | szt | furtki |
| 6 | `p1b-zdjecie-ogrodzenia-mb` | mb | demontaż ogrodzenia liniowego |
| 7 | `p1b-ogrodzenie-systemowe-mb` | mb | ogrodzenie systemowe z przęseł (stałe) |

**Min CLOSE:** pozycje **#1 + #3 + (#4 lub #5)** obowiązkowe (≥3).  
**Target OPS:** wszystkie **7** core.

### 4.2 Opcjonalne (do cap 12 · tylko po Owner triage złotych opisów)

| # | ID | Unit | Warunek |
|---|-----|------|---------|
| 8 | `p1b-fundament-slupka-szt` | szt | stopy/fundamenty pod słupki wyraźne w BOQ |
| 9 | `p1b-ogrodzenie-przenosne-mb` | mb | ogrodzenia systemowe przenośne / dzierżawa — **bez** tokenu `ustawienie` w name/desc |

**OUT listy (FROZEN):** gabiony „wszystko” · siatka tynkarska / cięto-ciągniona · Rabitz · barierki bez kontekstu ogrodzenia · pełna ślusarka.

---

## 5. Kontrakt namePl / descriptionPl / keywords (FROZEN)

### 5.1 Zasady ogólne (lekcje P1-A)

| Reguła | **FROZEN** |
|--------|------------|
| Keywords | **wyłącznie pełne frazy** (substring match) — nigdy samotne generyki |
| namePl | konkret + kwalifikator **ogrodzeni*** · **bez** czasowników generycznych |
| descriptionPl | lustrzane bezpieczne brzmienie · te same zakazy co namePl |
| Scan OPS | lista §5.2 → **0** trafień w name/desc przed OV |
| Wieloznaczność | zakaz nazw typu „Siatka”, „Brama”, „Montaż”, „Ustawienie …” |

### 5.2 Tokeny zakazane w namePl / descriptionPl (gołe)

Po `foldPolishText` + `split(/\s+/)` **żaden** token name (len≥4) / desc (len≥5) **nie może** należeć do listy (dokładne dopasowanie tokenu):

| Token | Powód |
|-------|--------|
| `rozebranie` | obce rozebrania (rynny, barierki, ścianki) |
| `ustawienie` | kolizja P1-A/`08dec13d` |
| `montaz` / `montaż` | rynny / rury / obce montaże |
| `wykonanie` | elewacje |
| `ulozenie` / `ułożenie` | obce ułożenia |
| `dzierzawa` / `dzierżawa` | zbyt szerokie; tylko we **frazach** keywords jeśli potrzeba |
| `siatka` / `siatki` | **siatka cięto-ciągniona / tynkarska** |
| `brama` / `furtka` | drzwi / bramy niespecyficzne |
| `panel` / `panele` | panele ścienne / elewacyjne |

**Dozwolone:** złożone formy jako **jeden** token (np. `ogrodzeniowa`, `panelowego`, `przybramowe`) — nie są pozycjami listy powyżej.  
**Zakazane:** samodzielne słowa z listy, nawet obok „ogrodzeni*” w sąsiednim tokenie (scoring nie łączy tokenów).

### 5.3 Zamrożone teksty (core #1–#7) — **AMEND 2026-07-30**

> **Amend AR FAIL:** poprzednie §5.3 zawierało gołe `siatka`/`panele`/`brama`/`furtka` w name/desc. Poniższe teksty są **zgodne z §5.2**.  
> OPS **musi** użyć poniższych (lub równoważnych **bez** naruszenia §5.1–5.2). `companyPricePln` = Owner cennik w OPS (nie DF).  
> Keywords = pełne frazy (bez zmian intencji match).

#### 1. `p1b-ogrodzenie-siatka-mb`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Ogrodzenie liniowe w ramach na słupkach` |
| descriptionPl | `Ogrodzenie liniowe w ramach lub na słupkach — odcinek parcelowy` |
| keywords | `siatka ogrodzeniowa` · `ogrodzenie z siatki` · `siatka w ramach z kształtowników` · `ogrodzenie kortów z siatki` |

#### 2. `p1b-panel-ogrodzeniowy-mb`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Odcinek ogrodzenia panelowego` |
| descriptionPl | `Odcinek ogrodzenia panelowego stalowego` |
| keywords | `panele ogrodzeniowe` · `panel ogrodzeniowy` · `ogrodzenie z paneli` · `panele ogrodzeniowe 3d` |

#### 3. `p1b-slupek-ogrodzeniowy-szt`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Słupek ogrodzeniowy stalowy` |
| descriptionPl | `Słupek ogrodzeniowy stalowy pod ogrodzenie liniowe` |
| keywords | `słupek ogrodzeniowy` · `slupek ogrodzeniowy` · `słupki ogrodzeniowe` · `słupki przybramowe` |

#### 4. `p1b-brama-ogrodzeniowa-szt`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Skrzydło wjazdowe w ciągu ogrodzenia` |
| descriptionPl | `Skrzydło wjazdowe w ciągu ogrodzenia parcelowego` |
| keywords | `brama ogrodzeniowa` · `bramy ogrodzeniowe` · `brama z siatki` · `bramy z siatki w ramach` |

#### 5. `p1b-furtka-ogrodzeniowa-szt`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Przejście piesze w ciągu ogrodzenia` |
| descriptionPl | `Przejście piesze w ciągu ogrodzenia parcelowego` |
| keywords | `furtka ogrodzeniowa` · `furtki ogrodzeniowe` · `furtka w ogrodzeniu` |

#### 6. `p1b-zdjecie-ogrodzenia-mb`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Zdjęcie ogrodzenia liniowego (mb)` |
| descriptionPl | `Zdjęcie ogrodzenia liniowego parcelowego` |
| keywords | `rozebranie ogrodzenia` · `rozebranie ogrodzeń systemowych` · `rozebranie ogrodzenia systemowego` · `demontaż ogrodzenia` |

#### 7. `p1b-ogrodzenie-systemowe-mb`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Ogrodzenie systemowe z przęseł — odcinek stały` |
| descriptionPl | `Ogrodzenie systemowe z przęseł przenośnych lub stałych — odcinek liniowy` |
| keywords | `ogrodzenia systemowe` · `ogrodzenie systemowe z przęseł` · `przęseł przenośnych` · `ogrodzenie systemowe` |

> **Uwaga #7:** w descriptionPl dozwolone „przęseł” / „przenośnych” — **zakaz** samotnego `ustawienie` / `dzierżawa` w name/desc. Fraza `ustawienie i dzierżawa` tylko w **keywords** jeśli triage potwierdzi linie `08dec13d`.

**Keywords opc. (tylko jeśli triage potwierdzi):**  
`ogrodzenia systemowe z przęseł przenośnych - ustawienie` · `ustawienie i dzierżawa na czas prowadzenia robót` — jako **pełne frazy**, nigdy tokeny w name/desc.

### 5.4 Weryfikacja amend (scan §5.2 na name+desc core)

| ID | name/desc tokens ∩ lista §5.2 |
|----|-------------------------------|
| #1–#7 | **∅ (zero)** |

---

## 6. Quotes (FROZEN)

| Reguła | **FROZEN** |
|--------|------------|
| Pokrycie | **100%** aktywnych `p1b-*` przed CLOSE |
| Pipeline | CSV → preview (≥80% matched) → **`commitMarketQuotesImport`** |
| Origin | product exclusively |
| Cena | `marketQuotes.*.price` = `companyPricePln` |
| Slice | ten sam OPS co works |
| `legacy_seed` | **nie** liczy się do H2 |

---

## 7. Hard KPI (FROZEN — gate CLOSE)

| ID | Target **FROZEN** |
|----|-------------------|
| **H1** | ≥ **3** · ≤ **12** aktywne `p1b-*` |
| **H2** | Product Quotes **100%** na nowych |
| **H3** | Known false = **0** · new false = **0** |
| **H4** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia HE→CM) = **0** vs tip po P1-A |
| **H5** | Unmatched PLN `OGRODZENIA_SIATKI`: spadek ≥ **25%** vs ~258 k na powtórce 18 |
| **H6** | Scan tokenów §5.2 w name/desc = **0** |

---

## 8. Soft KPI (FROZEN — nie hard gate)

| ID | Target **FROZEN** |
|----|-------------------|
| **S1** | HE avg 18 ≤ **32.4%** (brak regresji vs P1-A); cel roboczy ~**30%** |
| **S2** | CM avg 18 ≥ **67.6%** |
| **S3** | `08ded5cb`: ↑ `catalogWorkIdPct` i/lub ↓ HE share vs P1-A tip |

---

## 9. Coverage KPI (FROZEN — obowiązkowy pomiar)

| ID | Metryka **FROZEN** |
|----|-------------------|
| **K-P1-C1** | Liczba linii OfferBoq (suma 18) z `catalogWorkId` ∈ `p1b-*` · **C1 > 0** wymagane przy CLOSE |
| **K-P1-C2** | Linie bucketa ogrodzeń nadal HE lub unmatched |

Evidence: `.tmp/ceny-materialow-04-p1b-*-validation.json`.

---

## 10. Fokus / false-match (FROZEN)

| Tender | Oczekiwanie |
|--------|-------------|
| `08ded5cb` | true matche bram/siatki/słupków kortowych |
| `08dec13d` | ogrodzenia systemowe → `p1b-*` (nie `p1a-*`) |
| Próbka 18 | te same ID co CM-02 / P0 / P1-A |

**Must never map to p1b-*:**

| Wzorzec |
|---------|
| Siatka cięto-ciągniona / wypełnienie oczek zaprawą |
| Warstwa zbrojona / ościeża / wełna elewacyjna |
| Obrzeża / chodniki / kostka (`p1a-*`) |
| Rynny / barierki bez kontekstu ogrodzenia |

---

## 11. Rollback (FROZEN)

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na wszystkich `p1b-*` |
| **L2** | Rollback Quotes P3.3 + dezaktywacja/usunięcie `p1b-*` |
| **L3** | Restore backup JSON katalogu sprzed slice P1-B |

Backup **obowiązkowy** przed OPS.  
**P1-A (`p1a-*`) nie dezaktywować** przy L1–L2 P1-B.

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
| Seed siatki tynkarskiej / Rabitz jako ogrodzenie |
| Nadpisanie `companyPricePln` z rynku |
| P1-C / P2 w tym slice |
| Nowa feature flag |

---

## 13. Allowlista / bloklista plików (FROZEN)

### Allowlista OPS

| | |
|--|--|
| Dane | `kw-wgdom-work-catalog` (custom `p1b-*` + Quotes) |
| Tor | istniejące API P3.2/P3.3 (`preview` / `commitMarketQuotesImport`) |
| Docs / evidence | `docs/architecture/CENY-MATERIAŁÓW-04-P1-B-*` · `.tmp/ceny-materialow-04-p1b-*` |

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
| Nowa flaga P1-B | **NIE** |

---

## 15. Kryteria READY FOR ARCHITECTURE REVIEW

| # | Check |
|---|--------|
| 1 | Lista §4 core zamrożona (7 ID) |
| 2 | namePl / descriptionPl / keywords §5 zamrożone |
| 3 | Pipeline = wyłącznie P3.3 |
| 4 | Hard / Soft / Coverage KPI zamrożone |
| 5 | Rollback L1–L3 + ochrona P1-A |
| 6 | OUT silnika zamrożony |
| 7 | Token safety z P1-A włączony jako D-P1-B-4 |

---

## 16. Następny krok

```text
Architecture Review P1-B (thin)
  → Owner GO OPS P1-B
  → Owner Verification
  → READY FOR COMMIT (osobny GO)
```

**Zakaz:** IMPLEMENT · commit · push bez Arch Review + Owner GO.
