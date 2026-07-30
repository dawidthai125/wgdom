# CENY-MATERIAŁÓW-04 P1-B — PLAN

> **ID:** CENY-MATERIAŁÓW-04-P1-B-PLAN  
> **Etykieta:** Work Catalog + Quotes — **OGRODZENIA** (grupa 2/3)  
> **STATUS:** PLAN ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P1-A **CLOSED · PV** ([`CENY-MATERIAŁÓW-04-P1-A-RELEASE-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-A-RELEASE-COMPLETE.md)) · tip UI **2.65.81** · feature **`dc0daea0`**  
> **Parent:** [`CENY-MATERIAŁÓW-04-P1-PLAN.md`](CENY-MATERIAŁÓW-04-P1-PLAN.md) · DF [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md) · AR APPROVED  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1-B):
  Rozszerzyć Work Catalog + marketQuotes dla OGRODZEŃ,
  aby unmatched/HE z bucketa OGRODZENIA_SIATKI przeszły
  na controlled_market — BEZ zmian AI-COST / scoringu.
  Reuse lekcji P1-A: zero generycznych tokenów w name/desc.
════════════════════════════════════════════════════════
```

---

## 0. Punkt startowy (P1-A CLOSED)

| Pole | Wartość |
|------|---------|
| Status P1-A | **CLOSED** · **PRODUCTION VERIFIED** |
| UI tip | **2.65.81** |
| Feature commit | **`dc0daea04df9a361129db5a194337ff92c410587`** |
| WC po P1-A | 34 legacy + **10** `p1a-*` · Quotes **44/44** |
| CM / HE avg 18 (ON) | **67.6% / 32.4%** |
| Unmatched DROGI | **11** (−73% vs P0) |
| False matches P1-A | known **0** · new **0** |

**Wniosek:** P1-A zamknięty. Kolejność sztywna D-P1-A → **P1-B** jest odblokowana.

---

## 1. Cel P1-B

| | |
|--|--|
| **Cel** | Zwiększyć pokrycie Work Catalog dla grupy **OGRODZENIA** |
| **Gap ID** | `OGRODZENIA_SIATKI` (CM-03) |
| **Baseline unmatched** | **~258 k PLN** · **15** linii · **5** przetargów |
| **Mechanizm** | nowe `CatalogWork` + product Quotes → match → `controlled_market` |
| **Forma** | OPS + dane (custom works) · **0 LOC** silnika |

---

## 2. Założenia (wiązane · OUT twarde)

| Założenie | Wartość |
|-----------|---------|
| Quotes pipeline | **pełny REUSE P3.3** |
| Import | wyłącznie CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** |
| Mapping | REUSE CM-01 AS-IS · **zakaz** re-open scoringu |
| Cap robót | **3–12** (D-P1-B) |
| Quotes na nowych | **100%** product przed CLOSE |

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
| Seed fałszywych „siatka tynkarska / Rabitz” jako ogrodzenie |

---

## 3. Jakość bucketa (krytyczne — D-P1-F)

AUDIT `OGRODZENIA_SIATKI` **miesza** prawdziwe ogrodzenia z **siatką cięto-ciągnioną / osiatkowaniem stopek** (tynk / stropy) — próbki CM-03 m.in. z `08dee335`.

| Klasa linii | Akcja P1-B |
|-------------|------------|
| Ogrodzenie parcelowe / kortowe · panele · siatka ogrodzeniowa · słupki · bramy/furtki · rozebranie/ustawienie ogrodzeń systemowych | **IN** (seed) |
| Siatka cięto-ciągniona / Rabitz / warstwa zbrojona / ościeża | **OUT** → P1-C |
| Barierki ochronne (jeśli tylko „barierka” bez kontekstu ogrodzenia) | Owner triage — nie auto-seed |
| Tymczasowe ogrodzenia systemowe (ustawienie/dzierżawa) | **IN opc.** osobna robota lub keywords — **nie** mylić z obrzeżami (lekcja `08dec13d`) |

**OPS obowiązek:** Owner triage złotych opisów z 5 przetargów bucketa **przed** keywords. Preferować prawdziwe ogrodzenia (m.in. `08ded5cb`, `08dec13d`).

---

## 4. Zakres robót do dodania

### 4.1 Docelowa liczba

| | Wartość |
|--|---------|
| **Min CLOSE** | **≥ 3** aktywne |
| **Max** | **12** |
| **Rekomendacja PLAN** | **6–8** (balans ROI / ryzyko false match) |
| Prefiks ID | `p1b-*` |

### 4.2 Propozycja listy (PLAN · do DF)

| # | ID roboczy | Nazwa (robocza · bez generyków) | Unit | Priorytet |
|---|------------|----------------------------------|------|-----------|
| 1 | `p1b-ogrodzenie-siatka-mb` | Panel / siatka ogrodzeniowa — montaż liniowy | mb | **MIN** |
| 2 | `p1b-slupek-ogrodzeniowy-szt` | Słupek ogrodzeniowy stalowy | szt | **MIN** |
| 3 | `p1b-brama-furtka-szt` | Brama lub furtka ogrodzeniowa | szt | **MIN** |
| 4 | `p1b-rozebranie-ogrodzenia-mb` | Zdjęcie ogrodzenia liniowego (mb) | mb | **REC** |
| 5 | `p1b-ogrodzenie-systemowe-mb` | Ogrodzenie systemowe z przęseł (stałe) | mb | **REC** |
| 6 | `p1b-fundament-ogrodzenia-szt` | Stopa / fundament pod słupek ogrodzeniowy | szt | **OPC** |
| 7 | `p1b-panel-3d-mb` | Panele ogrodzeniowe 3D | mb | **OPC** (cap) |
| 8 | `p1b-ogrodzenie-tymczasowe-mb` | Ogrodzenie systemowe przenośne — dzierżawa/ustawienie | mb | **OPC** · ostrożnie keywords |

**OUT listy:** gabiony dekoracyjne „wszystko” · pełny katalog ślusarki · siatka tynkarska.

### 4.3 Kontrakt nazewnictwa (lekcje P1-A → twarde w PLAN)

Scoring OfferBoq punktuje tokeny `namePl` (len≥4) i `descriptionPl` (len≥5) przez `hay.includes`. **Nie wolno** zostawić gołych generyków w name/desc.

| Zakazane w namePl / descriptionPl (gołe) | Powód (P1-A) |
|------------------------------------------|--------------|
| `rozebranie` | łapie każde „Rozebranie …” (barierki, rynny, ścianki) |
| `ustawienie` | łapało ogrodzenia → obrzeża (`08dec13d`) |
| `montaz` / `montaż` | rynny / rury |
| `wykonanie` | elewacje / warstwa zbrojona |
| `ulozenie` / `ułożenie` | obce ułożenia |
| gołe `siatka` / `siatki` | **krytyczne** — trafia tynkarską siatkę cięto-ciągnioną |
| gołe `brama` / `furtka` bez „ogrodzeni*” | ryzyko drzwi / bram wjazdowych niespecyficznych |

| Dozwolone | Forma |
|-----------|--------|
| Keywords | **wyłącznie pełne frazy** (np. `"siatka ogrodzeniowa"`, `"rozebranie ogrodzenia systemowego"`, `"brama ogrodzeniowa z siatki"`) |
| namePl | konkret + kontekst ogrodzenia (panel/siatka **ogrodzeniowa**, słupek **ogrodzeniowy**) — bez czasowników generycznych |
| descriptionPl | lustrzane bezpieczne brzmienie (bez listy zakazanej) |

**Gate OPS:** skrypt scan ryzykownych tokenów (jak Patch #2) → **0** trafień przed Owner Verification.

---

## 5. Product Quotes

| Reguła | Wartość |
|--------|---------|
| Pokrycie | **100%** nowych `p1b-*` |
| Origin | product: `wgdom` / `kb_pl` / `sekocenbud` / `interbud` |
| Cena | `price` = `companyPricePln` (kontrakt P0/P1-A) |
| Pipeline | CSV → preview (≥80% matched na nowych) → **`commitMarketQuotesImport`** |
| Slice | Quotes w **tym samym** OPS co works |
| Scrapery | **ZAKAZ** |

---

## 6. KPI

### 6.1 Hard (gate CLOSE P1-B)

| ID | Target |
|----|--------|
| **H1** | ≥ **3** · ≤ **12** aktywne `p1b-*` |
| **H2** | Product Quotes **100%** na nowych |
| **H3** | Known false = **0** · new false = **0** (OV) |
| **H4** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia HE→CM) = **0** vs tip po P1-A |
| **H5** | Unmatched PLN bucketa OGRODZENIA: spadek vs **~258 k** (orient. **≥25%**) na powtórce 18 |

### 6.2 Soft (nie hard gate)

| ID | Target |
|----|--------|
| **S1** | HE avg 18: spadek vs **32.4%** (P1-A tip) — orient. w kierunku **~30%** |
| **S2** | CM avg 18: ≥ **67.6%** (brak regresji CM) |
| **S3** | `08ded5cb`: ↑ `catalogWorkIdPct` i/lub ↓ HE share vs P0/P1-A |

### 6.3 Coverage (obowiązkowy pomiar)

| ID | Metryka |
|----|---------|
| **K-P1-C1** | Linie BOQ z `catalogWorkId` ∈ `p1b-*` (suma 18) |
| **K-P1-C2** | Linie bucketa ogrodzeń nadal HE lub unmatched |

C1 **> 0** wymagane przy CLOSE. C2 raportowane (diagnoza).

---

## 7. Fokus pomiaru / false-match gate

| Tender | Rola |
|--------|------|
| **`08ded5cb`** | Główny fokus ogrodzeń kortowych / bram (CM-03) |
| **`08dec13d`** | Ogrodzenia systemowe ustawienie/rozebranie — **true** match P1-B, nie P1-A |
| Próbka **18** | Te same ID co CM-02 / P0 / P1-A |

**Known false (must never map to p1b-*):**

| Wzorzec | Przykład |
|---------|----------|
| Siatka cięto-ciągniona / wypełnienie oczek zaprawą | tynk / stropy |
| Warstwa zbrojona / ościeża / wełna | elewacja → P1-C |
| Obrzeża / chodniki / kostka | P1-A |
| Rynny / barierki bez kontekstu ogrodzenia | OUT |

---

## 8. Wpływ biznesowy (szacunek)

| | |
|--|--|
| Adresowalny unmatched | do **~258 k PLN** |
| Realistyczny catch (6–8 robót) | **~50–80%** → ~**130–200 k** |
| Global HE | umiarkowany spadek (bucket ~10% unmatched total) |
| Zależność | P1-A CLOSED — **spełnione** |

---

## 9. OPS wzorzec (bez IMPLEMENT w tym kroku)

```text
1. Backup kw-wgdom-work-catalog
2. Owner triage złotych opisów (5 przetargów) · odrzuć siatkę tynkarską
3. Utwórz 6–8 CatalogWork p1b-* (name/desc bezpieczne · keywords = frazy)
4. CSV product Quotes → preview → commitMarketQuotesImport
5. Cloud verify Quotes 100%
6. Scan tokenów ryzykownych = 0
7. Walidacja 18 + fokus 08ded5cb / 08dec13d · false gate
8. Owner Verification → READY FOR COMMIT (osobny GO)
```

### Rollback

| L | Akcja |
|---|--------|
| L1 | `active=false` na `p1b-*` |
| L2 | Rollback Quotes P3.3 + dezaktywacja works |
| L3 | Restore backup sprzed P1-B |

**P1-A nie ruszać** przy rollbacku L1–L2 P1-B.

---

## 10. Decyzje do DF (szkic D-P1-B-*)

| ID | Temat | Propozycja PLAN |
|----|-------|-----------------|
| D-P1-B-1 | Cap | 3–12 · rekomendacja OPS **6–8** |
| D-P1-B-2 | Prefiks | `p1b-*` |
| D-P1-B-3 | Token safety | lista zakazanych generyków w name/desc (P1-A lessons + `siatka`) |
| D-P1-B-4 | Bucket triage | zakaz seedu siatki tynkarskiej |
| D-P1-B-5 | Quotes | 100% · P3.3 only |
| D-P1-B-6 | Fokus | `08ded5cb` + `08dec13d` |
| D-P1-B-7 | OUT silnika | AI-COST / scoring / Bid / Cloud CORE |

---

## 11. Następny krok

```text
DESIGN FREEZE P1-B (D-P1-B-* + finalna lista robót + token safety)
  → Architecture Review (thin) jeśli wymagane procesem
  → Owner GO OPS P1-B
```

**Zakaz teraz:** IMPLEMENT · commit · push.

---

## 12. Evidencje wejściowe

| Źródło | Rola |
|--------|------|
| CM-03 AUDIT · gap `OGRODZENIA_SIATKI` | baseline ~258 k / 15 / 5 |
| P1 PLAN §6 · P1 DF §4.2 | parent scope |
| P1-A OV FINAL / Patch #1–#2 | lekcje tokenów |
| Tip **2.65.81** / **`dc0daea0`** | baseline KPI po P1-A |
