# CENY-MATERIAŁÓW-04 P1-C — PLAN

> **ID:** CENY-MATERIAŁÓW-04-P1-C-PLAN  
> **Etykieta:** Work Catalog + Quotes — **ELEWACJE / OCIEPLENIA** (grupa 3/3)  
> **STATUS:** PLAN ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P0 **CLOSED** · P1-A **CLOSED** (UI **2.65.81**) · P1-B **CLOSED** (UI **2.65.82** · feature **`dca25c96`**)  
> **Parent:** [`CENY-MATERIAŁÓW-04-P1-PLAN.md`](CENY-MATERIAŁÓW-04-P1-PLAN.md) · DF [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md) §4.3 · AR APPROVED  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1-C):
  Rozszerzyć Work Catalog + marketQuotes dla ELEWACJI/OCIEPLEŃ,
  aby unmatched/HE z bucketa ELEWACJE_OCIEPLENIA przeszły
  na controlled_market — BEZ zmian AI-COST / scoringu.
  Reuse lekcji P1-A + P1-B: zero generycznych tokenów w name/desc;
  keywords = wyłącznie pełne frazy.
════════════════════════════════════════════════════════
```

---

## 0. Punkt startowy (P0 · P1-A · P1-B CLOSED)

| Pole | Wartość |
|------|---------|
| P0 | **CLOSED** |
| P1-A | **CLOSED** · UI **2.65.81** · 10× `p1a-*` · Quotes 10/10 |
| P1-B | **CLOSED** · UI **2.65.82** · feature **`dca25c96`** · 7× `p1b-*` · Quotes 7/7 |
| CM / HE avg 18 (ON) po P1-B | **73.0% / 27.0%** |
| Unmatched OGRODZENIA | **0** (−100% vs audit ~258 k) |
| False matches P1-A/P1-B | known **0** · new **0** |
| Tip SSOT | [`09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |

**Wniosek:** kolejność sztywna D-P1-A → P1-B → **P1-C** jest odblokowana. Ostatnia grupa P1 (top-3 ADD WORKS z CM-03).

---

## 1. Identyfikacja bucketa (aktualne dane)

### 1.1 Ranking CM-03 (AUDIT) — ADD WORKS

| # | Gap ID | Unmatched PLN | Linie | Przetargi | Status po P1-A/B |
|---|--------|--------------:|------:|----------:|------------------|
| 2 | `DROGI_CHODNIKI_NAWIERZCHNIE` | ~311 k | 30 | 3 | **P1-A CLOSED** (unmatched ↓ ~73%) |
| 3 | `OGRODZENIA_SIATKI` | ~258 k | 15 | 5 | **P1-B CLOSED** (unmatched **0**) |
| 4 | **`ELEWACJE_OCIEPLENIA`** | **~234 k** | **12** | **4** | **← P1-C TARGET** |
| 5 | `ROZBIORKI_WYBURZENIA` | ~80 k | 38 | 14 | P2 (po P1) |
| — | `INNE` | ~1,72 M | 436 | 16 | triage · nie ślepy seed |

**Źródło:** `.tmp/ceny-materialow-03-audit.json` · [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) §4 · parent DF §4.3.

### 1.2 Wybór P1-C

| | |
|--|--|
| **Bucket** | **`ELEWACJE_OCIEPLENIA`** |
| **Label** | Elewacje / ocieplenia / styropian |
| **Baseline unmatched** | **~233 993 PLN ≈ 234 k** · **12** linii · **4** przetargi |
| **Fokus** | m.in. **`08dee3f6`** (remont/ocieplenie elewacji — DF §4.3) |
| **Próbki CM-03** | styropian EPS · warstwa zbrojona z siatką · (szum: okablowanie w warstwie docieplenia) |

---

## 2. Uzasadnienie wyboru

### 2.1 Biznes

| Argument | Treść |
|----------|--------|
| **Kolejność zamrożona** | D-P1-A: A → B → **C** — jedyna pozostała grupa top-3 Phase 2 |
| **Skala PLN** | ~**234 k** unmatched — 3. największy bucket ADD WORKS w próbie 18 |
| **Koncentracja** | 12 linii / 4 przetargi — wysoki PLN/sprawę (jak A/B); catch realistyczny przy 6–8 robotach |
| **Dowód CM-02** | AUDIT: lepsze mapowanie elewacji już dawało **+~159 k** uplift — potwierdza ROI WC+Quotes |
| **Domknięcie P1** | Po C adresowane ~**803 k** (A+B+C) — warunek pod Hard **K-P1-1** (≤50% baseline unmatched w bucketach P1) |
| **Transfer z P1-B** | Siatka cięto-ciągniona / Rabitz / warstwa zbrojona — **OUT P1-B → IN P1-C** (D-P1-F) |

### 2.2 Wpływ na KPI (szacunek)

| KPI | Efekt oczekiwany |
|-----|------------------|
| Unmatched `ELEWACJE_OCIEPLENIA` | ↓ **≥25%** vs ~234 k (Hard H5) · realistycznie **50–80%** catch |
| CM avg 18 | ↑ vs **73.0%** (Soft: brak regresji · orient. dalszy wzrost) |
| HE avg 18 | ↓ vs **27.0%** |
| C1 (`p1c-*`) | **> 0** wymagane przy CLOSE |
| Global P1 | Domknięcie trzeciej grupy → gotowość do P1 CLOSE (K-P1-1…3) po osobnym gate |

**Alternatywa odrzucona teraz:** `ROZBIORKI` (~80 k, 38 linii) — niższy ticket PLN, wyższa frekwencja → **P2**, nie P1-C (zgodnie z CM-03 §5.2 i D-P1-A).

---

## 3. Cel P1-C

| | |
|--|--|
| **Cel** | Zwiększyć pokrycie Work Catalog dla grupy **ELEWACJE / OCIEPLENIA** |
| **Gap ID** | `ELEWACJE_OCIEPLENIA` |
| **Mechanizm** | nowe `CatalogWork` + product Quotes → match → **`controlled_market`** |
| **Forma** | OPS + dane (custom works) · **0 LOC** silnika |
| **Pipeline** | CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC → CM |

---

## 4. Założenia (wiązane · OUT twarde)

| Założenie | Wartość |
|-----------|---------|
| Quotes pipeline | **pełny REUSE P3.3** |
| Import | wyłącznie CSV → preview → **`commitMarketQuotesImport`** |
| Mapping | REUSE CM-01 AS-IS · **zakaz** re-open scoringu |
| Cap robót | **3–12** (D-P1-B dziedziczone) |
| Quotes na nowych | **100%** product przed CLOSE |
| P1-A / P1-B | **nienaruszone** (rollback L1–L2 nie rusza `p1a-*` / `p1b-*`) |

| OUT |
|-----|
| Zmiany **AI-COST** |
| Zmiany **scoring** / mapping engine |
| Nowi **providerzy** / reorder |
| Zmiany **heurystyk** |
| **Bid Calculator** |
| **Cloud Sync CORE** (`cloud-sync.ts`) |
| Scrapery / live API |
| Nadpisanie `companyPricePln` z rynku |
| Pełny katalog fasadowy „wszystko” · stolarka EI masowa |
| Seed malowań **wewnętrznych** jako elewacja |

---

## 5. Jakość bucketa (D-P1-F · krytyczne)

Bucket miesza prawdziwe ETICS/warstwy zbrojone z **szumem** (okablowanie „w warstwie docieplenia”, przygotowanie podłoża bez materiału izolacyjnego).

| Klasa linii | Akcja P1-C |
|-------------|------------|
| Ocieplenie styropian / EPS / XPS · ETICS | **IN** |
| Warstwa zbrojona z siatką (elewacyjna) · siatka cięto-ciągniona / Rabitz / wypełnienie oczek zaprawą (kontekst tynk/stropy) | **IN** (to, co P1-B świadomie OUT) |
| Tynk / farba **elewacyjna** · silikat/silikon elew. | **IN** |
| Wełna mineralna MW / MW-ETICS · listwy startowe / cokół · ocieplenie od spodu stropów | **IN opc.** (cap) |
| Uporządkowanie okablowania „w warstwie docieplenia” | **OUT** / nie seed — szum instalacyjny |
| Malowanie tynków **wewnętrznych** | **OUT** (legacy tynki / inny bucket) |
| Stolarka / drzwi EI / pełna ślusarka fasadowa | **OUT** |
| Ogrodzenie parcelowe / panele ogrodzeniowe | **OUT** → P1-B (już CLOSED) |
| Chodniki / kostka / obrzeża | **OUT** → P1-A |

**OPS obowiązek:** Owner triage złotych opisów z **4** przetargów bucketa **przed** keywords. Preferować `08dee3f6` + linie styropian/warstwa zbrojona z CM-03.

---

## 6. Zakres robót do dodania

### 6.1 Docelowa liczba

| | Wartość |
|--|---------|
| **Min CLOSE** | **≥ 3** aktywne |
| **Max** | **12** |
| **Rekomendacja PLAN** | **6–8** (balans ROI / ryzyko false match — jak A/B) |
| Prefiks ID | **`p1c-*`** |

### 6.2 Propozycja listy (PLAN · do DF)

| # | ID roboczy | Nazwa (robocza · bez generyków) | Unit | Priorytet |
|---|------------|----------------------------------|------|-----------|
| 1 | `p1c-ocieplenie-etics-eps-m2` | Ocieplenie ścian płytami EPS (system ETICS) | m2 | **MIN** |
| 2 | `p1c-warstwa-zbrojona-etics-m2` | Warstwa zbrojona ETICS z siatką elewacyjną | m2 | **MIN** |
| 3 | `p1c-tynk-farba-elewacyjna-m2` | Tynk lub farba elewacyjna (warstwa wierzchnia) | m2 | **MIN** |
| 4 | `p1c-siatka-zbrojaca-elewacyjna-m2` | Siatka zbrojąca elewacyjna / cięto-ciągniona (warstwa) | m2 | **REC** (transfer z OUT P1-B) |
| 5 | `p1c-welna-mw-etics-m2` | Ocieplenie wełną mineralną (MW-ETICS) | m2 | **REC** |
| 6 | `p1c-listwa-startowa-cokol-mb` | Listwa startowa / cokół systemu ociepleń | mb | **OPC** |
| 7 | `p1c-przygotowanie-podloza-elewacja-m2` | Przygotowanie podłoża pod docieplenie elewacji | m2 | **OPC** · ostrożnie keywords |
| 8 | `p1c-ocieplenie-strop-od-spodu-m2` | Ocieplenie stropu od spodu (płyty) | m2 | **OPC** (cap) |

**OUT listy:** pełny katalog fasadowy · stolarka EI · okablowanie elewacyjne · malowanie wewnętrzne · ogrodzenia.

### 6.3 Kontrakt nazewnictwa (lekcje P1-A + P1-B → twarde w PLAN)

Scoring OfferBoq: tokeny `namePl` (len≥4) i `descriptionPl` (len≥5) przez `hay.includes`. **Zakaz** gołych generyków w name/desc.

| Zakazane w namePl / descriptionPl (gołe) | Powód (P1-A / P1-B) |
|------------------------------------------|---------------------|
| `rozebranie` / `ustawienie` / `montaz` / `montaż` | false na obce linie |
| `wykonanie` | łapało elewacje / warstwy — **szczególnie krytyczne w P1-C** (opisy BOQ zaczynają się od „Wykonanie…”) |
| `ulozenie` / `ułożenie` | obce ułożenia (także styropian poza kontekstem — trzymać w keywords jako pełną frazę) |
| gołe `siatka` / `siatki` | P1-B: tynkarska ↔ ogrodzenie; tu: **tylko** frazy (`siatka zbrojąca elewacyjna`, `warstwa zbrojona z siatką`) |
| gołe `systemowe` / `systemowy` | P1-B: „materiały systemowe” ≠ ogrodzenie; tu: frazy `system ETICS` / `system ociepleń` |
| gołe `stalowy` / `stalowych` | P1-B: belki/wanny |
| gołe `elewacji` bez kwalifikatora robót | ryzyko szumu (okablowanie „na elewacji”) — name = konkret materiału/warstwy |

| Dozwolone | Forma |
|-----------|--------|
| Keywords | **wyłącznie pełne frazy** (np. `"warstwa zbrojona z siatką"`, `"płyty ze styropianu EPS"`, `"siatka cięto-ciągniona"`, `"farba elewacyjna"`, `"docieplenie elewacji"`) |
| namePl | konkret + kwalifikator ETICS/elewacyjny · **bez** czasowników generycznych |
| descriptionPl | lustrzane bezpieczne brzmienie |

**Gate OPS:** skrypt scan ryzykownych tokenów (jak P1-A Patch #2 / P1-B OPS) → **0** trafień przed Owner Verification.

---

## 7. Product Quotes

| Reguła | Wartość |
|--------|---------|
| Pokrycie | **100%** nowych `p1c-*` |
| Origin | product: `wgdom` / `kb_pl` / `sekocenbud` / `interbud` |
| Cena | `price` = `companyPricePln` (kontrakt P0/P1) |
| Pipeline | CSV → preview (≥80% matched na nowych) → **`commitMarketQuotesImport`** |
| Slice | Quotes w **tym samym** OPS co works |
| Scrapery | **ZAKAZ** |

---

## 8. KPI

### 8.1 Hard (gate CLOSE P1-C)

| ID | Target |
|----|--------|
| **H1** | ≥ **3** · ≤ **12** aktywne `p1c-*` |
| **H2** | Product Quotes **100%** na nowych |
| **H3** | Known false = **0** · new false = **0** (OV) |
| **H4** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia HE→CM) = **0** vs tip po P1-B |
| **H5** | Unmatched PLN bucketa ELEWACJE: spadek vs **~234 k** (orient. **≥25%**) na powtórce 18 |
| **H6** | Token scan name/desc ∩ lista zakazana = **0** |
| **H7** | P1-A **10** + P1-B **7** intact (Quotes zachowane) |

### 8.2 Soft (nie hard gate)

| ID | Target |
|----|--------|
| **S1** | HE avg 18: spadek vs **27.0%** (P1-B tip) |
| **S2** | CM avg 18: ≥ **73.0%** (brak regresji CM) |
| **S3** | `08dee3f6`: ↑ `catalogWorkIdPct` i/lub ↓ HE share vs P1-B |

### 8.3 Coverage (obowiązkowy pomiar)

| ID | Metryka |
|----|---------|
| **K-P1-C1** | Linie BOQ z `catalogWorkId` ∈ `p1c-*` (suma 18) · **C1 > 0** przy CLOSE |
| **K-P1-C2** | Linie bucketa elewacji nadal HE lub unmatched |

---

## 9. Fokus pomiaru / false-match gate

| Tender | Rola |
|--------|------|
| **`08dee3f6`** | Główny fokus ocieplenia / warstwy zbrojonej (DF + CM-03) |
| **`08dee335`** | Styropian EPS + (uwaga) linie siatki cięto-ciągnionej → true P1-C, nie P1-B |
| Próbka **18** | Te same ID co CM-02 / P0 / P1-A / P1-B |

**Known false (must never map to p1c-*):**

| Wzorzec | Przykład |
|---------|----------|
| Ogrodzenie parcelowe / panele / bramy ogrodzeniowe | P1-B |
| Obrzeża / chodniki / kostka | P1-A |
| Malowanie tynków wewnętrznych | legacy / INNE |
| Okablowanie / instalacje „na elewacji” bez materiału ETICS | szum |
| Rynny / barierki / wanny / belki stalowe | OUT (lekcje A/B) |

---

## 10. Ryzyka mapowania i środki zapobiegawcze

| Ryzyko | Lekcja | Środek P1-C |
|--------|--------|-------------|
| Token `wykonanie` / `ułożenie` w name/desc | P1-A | Zakaz w name/desc · frazy tylko w keywords |
| Goła `siatka` | P1-B AR FAIL + OPS | name bez gołej siatki · keywords: `"warstwa zbrojona z siatką"`, `"siatka zbrojąca elewacyjna"`, `"siatka cięto-ciągniona"` |
| Gołe `systemowe` | P1-B false „materiały systemowe” | name bez `systemowe` · fraza `system ETICS` / `system ociepleń` w keywords |
| Szum „elewacji” (okablowanie) | CM-03 sample | Nie seedować; false gate OV |
| Kolizja z P1-B (siatka) | D-P1-F | Semantic rules OV: tynkarska/zbrojona → `p1c-*`; ogrodzeniowa → `p1b-*` |
| Kolizja z P1-A | D-P1-F | Zakaz keywordów chodnik/kostka/obrzeże |
| Regresja CM/HE | Soft S1/S2 | Baseline tip P1-B **73/27** · stop jeśli CM &lt; 72.5 bez uzasadnienia |
| Cap &gt;12 bez KPI | Parent AR | Max 12 · po wyczerpaniu bez H5 → IMPROVEMENTS / amend, nie ciche &gt;12 |

---

## 11. Wpływ biznesowy (szacunek)

| | |
|--|--|
| Adresowalny unmatched | do **~234 k PLN** |
| Realistyczny catch (6–8 robót) | **~50–80%** → ~**117–187 k** |
| Global HE/CM | kontynuacja trendu po A/B (CM ↑ / HE ↓) |
| Domknięcie top-3 P1 | A+B+C ≈ **803 k** adresowalnego unmatched audit |
| Zależność | P1-A + P1-B CLOSED — **spełnione** |

---

## 12. OPS wzorzec (bez IMPLEMENT w tym kroku)

```text
1. Backup kw-wgdom-work-catalog
2. Owner triage złotych opisów (4 przetargi ELEWACJE) · odrzuć szum instalacyjny
3. Utwórz 6–8 CatalogWork p1c-* (name/desc bezpieczne · keywords = frazy)
4. CSV product Quotes → preview → commitMarketQuotesImport
5. Cloud verify Quotes 100% · P1-A 10 · P1-B 7 intact
6. Scan tokenów ryzykownych = 0
7. Walidacja 18 + fokus 08dee3f6 · false gate (incl. vs p1a/p1b)
8. Owner Verification → READY FOR COMMIT (osobny GO)
```

### Rollback

| L | Akcja |
|---|--------|
| L1 | `active=false` na `p1c-*` |
| L2 | Rollback Quotes P3.3 + dezaktywacja works |
| L3 | Restore backup sprzed P1-C |

**P1-A i P1-B nie ruszać** przy rollbacku L1–L2 P1-C.

---

## 13. Decyzje do DF (szkic D-P1-C-*)

| ID | Temat | Propozycja PLAN |
|----|-------|-----------------|
| D-P1-C-1 | Cap | 3–12 · rekomendacja OPS **6–8** |
| D-P1-C-2 | Prefiks | `p1c-*` |
| D-P1-C-3 | Token safety | lista zakazanych generyków (A+B + `wykonanie`/`siatka`/`systemowe`) |
| D-P1-C-4 | Bucket triage | IN warstwa zbrojona/Rabitz · OUT okablowanie/stolarka/wewnętrzne |
| D-P1-C-5 | Quotes | 100% · P3.3 only |
| D-P1-C-6 | Fokus | `08dee3f6` (+ `08dee335` styropian/siatka tynk.) |
| D-P1-C-7 | OUT silnika | AI-COST / scoring / Bid / Cloud CORE / P1-A / P1-B |

---

## 14. Następny krok

```text
DESIGN FREEZE P1-C (D-P1-C-* + finalna lista robót + token safety)
  → Architecture Review (thin) jeśli wymagane procesem
  → Owner GO OPS P1-C
```

Po CLOSE P1-C: osobny gate **P1 CLOSE** (K-P1-1…3) — poza tym PLAN.

**Zakaz teraz:** IMPLEMENT · commit · push.

---

## 15. Evidencje wejściowe

| Źródło | Rola |
|--------|------|
| CM-03 AUDIT · gap `ELEWACJE_OCIEPLENIA` | baseline ~234 k / 12 / 4 |
| P1 PLAN · P1 DF §4.3 | parent scope FROZEN |
| P1-A OV / Patch #1–#2 · P1-B OPS/OV | lekcje tokenów |
| P1-B RELEASE · tip **2.65.82** / **`dca25c96`** | baseline KPI po P1-B (CM 73 / HE 27) |
| P1-B DF OUT | siatka tynkarska / Rabitz → P1-C |
