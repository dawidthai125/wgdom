# CENY-MATERIAŁÓW-04 P1 — PLAN

> **ID:** CENY-MATERIAŁÓW-04-P1-PLAN  
> **Etykieta:** Work Catalog + Quotes — top-3 gap groups (chodniki → ogrodzenia → elewacje)  
> **STATUS:** PLAN ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P0 OPS **PASS** ([`CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE.md`](CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE.md)) · EPIC DF [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) · AUDIT [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md)  
> **Baseline tip:** UI **2.65.80** · CM avg ON po P0: **controlled_market 65.7%** · **HE 34.3%** · regresje **0**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1):
  Rozszerzyć Work Catalog + marketQuotes w 3 grupach AUDIT
  (chodniki → ogrodzenia → elewacje), aby obniżyć HE ~34%
  przez nowe match → controlled_market — BEZ zmian AI-COST.
════════════════════════════════════════════════════════
```

---

## 0. Kontekst startowy (P0 PASS)

| Metryka | Przed P0 | Po P0 |
|---------|----------|-------|
| Product Quotes @ 34 | 0% | **100%** |
| `controlled_market` (avg 18, ON) | 0% | **65.7%** |
| `work_catalog` (avg 18, ON) | ~65.7% | **0%** (przesunięcie → CM) |
| `heuristic_estimate` (avg 18, ON) | ~34.3% | **~34.3%** |
| Regresje direct | — | **0** |

**Wniosek:** P0 usunął blokadę NO_RECORDS. Pozostały HE ≈34% to głównie **linie bez `catalogWorkId`** (unmatched) + szum INNE — nie brak Quotes na istniejących 34.

**Cel P1:** dodać roboty + Quotes w top-3 bucketach unmatched (~**803 k PLN** łącznie), żeby część HE / unmatched przeszła na **controlled_market** (po match + Quotes) — **bez** zmian silnika.

---

## 1. Zasady (wiązane z EPIC DF)

| Zasada | Wartość |
|--------|---------|
| Kolejność grup | **P1-A → P1-B → P1-C** (sztywna) |
| Cap robót | **3–12** nowych aktywnych / grupę (D-E) |
| Quotes | **100%** product Quotes na nowych przed CLOSE grupy (D-F) |
| Zasilanie Quotes | CSV → preview → **`commitMarketQuotesImport`** wyłącznie (D-A) |
| Mapping | REUSE CM-01 uplift AS-IS · **zakaz** re-open scoringu |
| Forma | Preferencja **OPS + dane** (Biblioteka Robót custom works) · 0 LOC silnika |
| P0 | P1 CLOSE wymaga P0 PASS — **spełnione** |

---

## 2. OUT (twarde — cały P1)

| OUT |
|-----|
| Zmiany **AI-COST** / pricing-engine / mapping CM-01 |
| Nowi **providerzy** / reorder |
| Zmiany **heurystyk** |
| **Bid Calculator** |
| Edycja **Cloud Sync CORE** (`cloud-sync.ts`) / nowe DATA_KEYS |
| **Scrapery** / live API cen |
| **GAP-B** · **marża** · **Kp** · softcode 1,6M |
| Pełny katalog branżowy „wszystko naraz” |
| Automatyczny seed z INNE |
| Nadpisanie `companyPricePln` z rynku (D-C) |

---

## 3. Baseline unmatched (AUDIT CM-03 · próba 18)

| Grupa P1 | Gap ID | Linie | PLN unmatched | # przetargów | Target K-P1-1 (łącznie) |
|----------|--------|------:|--------------:|-------------:|-------------------------|
| **P1-A** Chodniki / nawierzchnie | `DROGI_CHODNIKI_NAWIERZCHNIE` | 30 | **~311 k** | 3 | |
| **P1-B** Ogrodzenia | `OGRODZENIA_SIATKI` | 15 | **~258 k** | 5 | |
| **P1-C** Elewacje / ocieplenia | `ELEWACJE_OCIEPLENIA` | 12 | **~234 k** | 4 | |
| **Σ top-3** | — | 57 | **~803 k** | — | **≤ ~400 k** (≤50% baseline) |

Źródło: `.tmp/ceny-materialow-03-audit.json` · [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md).

**Uwaga jakości bucketów (nieblokująca):** regex AUDIT może mieszać izolacje bitumiczne / siatki tynkarskie z „chodnikami” / „ogrodzeniami”. DF/OPS: **Owner review złotych opisów** przed keywords — preferować prawdziwe nawierzchnie / ogrodzenia parcelowe / ETICS, nie fałszywe trafienia.

**Sprawy pomiarowe (CM-02bis):** m.in. `08decd0e` (nawierzchnie), `08ded5cb` (ogrodzenia), `08dee3f6` (elewacje — już duży upside CM-02).

---

## 4. Wzorzec OPS per grupa (powtarzalny)

```text
1. Backup JSON kw-wgdom-work-catalog
2. Utwórz 3–12 CatalogWork (custom) w Bibliotece:
     id · tradeId · name · unit · keywords[] · companyPricePln · active=true
3. CSV product Quotes (preferowane: wgdom / kb_pl / sekocenbud / interbud)
     → previewMarketCsvImport (≥80% matched na nowych)
     → commitMarketQuotesImport
4. Cloud persist (batch-set / sync AS-IS) + verify Quotes 100% na nowych
5. Probe: powtórka 18 + fokus spraw grupy · OFF/ON · vs P0 baseline
6. Gate CLOSE grupy: K-P1-2 + regresje 0 · potem następna grupa
```

---

## 5. P1-A — Chodniki i nawierzchnie

### 5.1 Zakres nowych robót (propozycja PLAN · cap 3–12)

| # | Robota (robocza nazwa) | Unit | Keywords (szkic) | Uzasadnienie |
|---|------------------------|------|------------------|--------------|
| 1 | Kostka brukowa — ułożenie | m2 | kostka, brukowa, nawierzchnia, chodnik | Dominanta PLN w buckecie |
| 2 | Podbudowa / podsypka pod nawierzchnię | m2 | podbudowa, podsypka, kruszywo, zagęszczenie | Częste przed kostką |
| 3 | Krawężnik / obrzeże | mb | krawężnik, obrzeże, betonowe | Linie mb w próbach |
| 4 | *(opc.) Asfalt / bitum nawierzchniowy* | m2 | asfalt, bitum*, nawierzchnia | Tylko jeśli złote opisy to potwierdzą |
| 5–12 | *(opc. depth)* płyty chodnikowe, obrzeża parking, frezowanie | … | … | Do cap 12 · Owner GO |

**Min CLOSE:** ≥ **3** aktywne. **Max:** 12.  
**OUT grupy:** izolacje pionowe fundamentów (jeśli to fałszywy bucket) → triaż P3 / inna grupa, nie P1-A.

### 5.2 Zakres Quotes

| Reguła | Wartość |
|--------|---------|
| Origin | Product: `wgdom` (bootstrap z `companyPricePln`) i/lub `kb_pl` / `sekocenbud` jeśli Owner dostarczy CSV |
| Region | `wroclaw` (fallback Engine AS-IS) |
| Pokrycie | **100%** nowych robót P1-A przed CLOSE |
| Tor | wyłącznie `commitMarketQuotesImport` |

### 5.3 Źródło danych

| Wejście | Opis |
|--------|------|
| AUDIT samples | gap `DROGI_*` · tender `08decd0e`, `08dee3f6` |
| Cennik Owner | PLN/m², PLN/mb typowe WGDOM |
| Mapping | Istniejący `mapOfferBoq*` + CM-01 ON przy pomiarze |

### 5.4 Przewidywany wpływ origins

| Origin | Oczekiwanie po P1-A |
|--------|---------------------|
| **controlled_market** | ↑ na sprawach z nowym match + Quotes (głównie 08decd0e) |
| **heuristic_estimate** | ↓ lokalnie w buckecie chodniki (linie previously unmatched) |
| **work_catalog** | Krótko ↑ jeśli Quotes opóźnione — **zakaz** CLOSE bez Quotes |

### 5.5 Szacowany wpływ biznesowy

| | |
|--|--|
| Adresowalny unmatched | do **~311 k PLN** w próbie 18 |
| Realistyczny catch P1-A | **~40–70%** bucketu przy 3–6 dobrze dobranych keywords (~125–220 k) |
| Ryzyko | Fałszywy match kostka↔płyty · mitigacja: wąskie keywords + PV złotych opisów |

### 5.6 KPI P1-A (slice)

| KPI | Target |
|-----|--------|
| Nowe roboty aktywne | ≥ 3 · ≤ 12 |
| Product Quotes na nowych | **100%** |
| Unmatched PLN bucket DROGI (powtórka 18) | Spadek vs baseline **~311 k** (orientacyjnie ≥25% redukcji przed startem P1-B) |
| Regresje | **0** |

### 5.7 Rollback P1-A

| L | Akcja |
|---|--------|
| L1 | `active=false` na nowych robotach P1-A |
| L2 | Rollback Quotes P3.3 + usunięcie/dezaktywacja works |
| L3 | Restore backup katalogu sprzed P1-A |

---

## 6. P1-B — Ogrodzenia

### 6.1 Zakres nowych robót

| # | Robota (robocza) | Unit | Keywords (szkic) | Uzasadnienie |
|---|------------------|------|------------------|--------------|
| 1 | Ogrodzenie z siatki | mb | ogrodzenie, siatka ogrodzeniowa, panel | Bucket #3 · sprawa 08ded5cb |
| 2 | Słupek ogrodzeniowy | szt | słupek, ogrodzeniowy | Częste pozycje szt |
| 3 | Brama / furtka ogrodzeniowa | szt | brama, furtka, ogrodzeniowa | Wysoki ticket |
| 4 | *(opc.)* Fundament / stopy pod ogrodzenie | mb/szt | stopa, fundament ogrodzenia | Gdy próbki to potwierdzą |
| 5–12 | *(opc.)* panele 3D, kosze gabionowe | … | … | Cap 12 |

**OUT grupy:** siatka cięto-ciągniona tynkarska / Rabitz na elewacji → **P1-C** (warstwa zbrojona), nie ogrodzenie parcelowe.

### 6.2 Quotes

Jak §5.2 — **100%** nowych P1-B · ten sam tor P3.3 · w **tym samym** slice co works.

### 6.3 Źródło danych

AUDIT `OGRODZENIA_SIATKI` · tender **08ded5cb** (+ inne z 5 spraw) · cennik Owner · CM-01 AS-IS.

### 6.4 Przewidywany wpływ origins

| Origin | Oczekiwanie |
|--------|-------------|
| **controlled_market** | ↑ na 08ded5cb i sprawach z ogrodzeniami |
| **heuristic_estimate** | ↓ (CM-03: 100% HE na kluczowej sprawie ogrodzeń) |
| Global HE avg 18 | Umiarkowany spadek (bucket ~258 k / ~2,67 M unmatched total) |

### 6.5 Szacowany wpływ biznesowy

| | |
|--|--|
| Adresowalny | do **~258 k PLN** |
| Realistyczny catch | **~50–80%** przy 3–5 robotach (~130–200 k) — wysoki ROI / sprawę |
| Zależność | Start CLOSE P1-B po **P1-A PASS** (kolejność sztywna) |

### 6.6 KPI P1-B

| KPI | Target |
|-----|--------|
| ≥ 3 roboty · Quotes 100% | **TAK** |
| Unmatched PLN OGRODZENIA | Spadek vs **~258 k** (orient. ≥25%) |
| 08ded5cb | Poprawa HE share lub ↑ `catalogWorkIdPct` vs P0/CM-02 |
| Regresje | **0** |

### 6.7 Rollback

Jak §5.7 (scope = roboty P1-B).

---

## 7. P1-C — Elewacje i ocieplenia

### 7.1 Zakres nowych robót

| # | Robota (robocza) | Unit | Keywords (szkic) | Uzasadnienie |
|---|------------------|------|------------------|--------------|
| 1 | Ocieplenie ścian styropianem (ETICS) | m2 | ocieplenie, styropian, EPS, docieplenie, elewacja | Dominanta bucket #4 |
| 2 | Warstwa zbrojona z siatką na styropianie | m2 | warstwa zbrojona, siatka, klej, zatapianie | Próbki 08dee3f6 |
| 3 | Tynk elewacyjny / farba elewacyjna | m2 | tynk elewacyjny, silikonowy, malowanie elewacji | Wykończenie |
| 4 | *(opc.)* Wełna mineralna elewacja | m2 | wełna, MW, elewacja | Gdy w próbach |
| 5 | *(opc.)* Cokół / listwy startowe | mb | listwa startowa, cokół | Depth |
| 6–12 | *(opc.)* klejenie płyt od spodu stropów | m2 | ocieplanie od spodu, strop | CM-02 samples |

**Min 3 · max 12.** Sprawa fokus: **08dee3f6** (już +159 k przy samym mappingu CM-01 — P1-C dokłada brakujące works ETICS).

### 7.2 Quotes

100% product · P3.3 · ten sam slice.

### 7.3 Źródło danych

AUDIT `ELEWACJE_OCIEPLENIA` · 08dee3f6 / 08dee335 · cennik Owner ETICS.

### 7.4 Przewidywany wpływ origins

| Origin | Oczekiwanie |
|--------|-------------|
| **controlled_market** | ↑ na elewacjach (match + Quotes) |
| **heuristic_estimate** | ↓ na liniach ETICS previously unmatched |
| Global | Dopełnia K-P1-1 (łącznie top-3 ≤50% baseline) |

### 7.5 Szacowany wpływ biznesowy

| | |
|--|--|
| Adresowalny | do **~234 k PLN** unmatched + dalszy upside na sprawach już częściowo zmapowanych |
| Realistyczny catch | **~50–75%** bucketu (~115–175 k) przy 4–8 robotach |
| Synergia | CM-01 uplift już pomógł 08dee3f6 — P1-C utrwala coverage danych |

### 7.6 KPI P1-C + CLOSE całego P1

| KPI | Target |
|-----|--------|
| ≥ 3 roboty · Quotes 100% | **TAK** |
| **K-P1-1** unmatched PLN DROGI+OGRODZENIA+ELEWACJE | **≤ 50%** baseline (~803 k → **≤ ~400 k**) na powtórce 18 |
| **K-P1-2** | ≥ 3 / grupę · 100% Quotes · **wszystkie 3 grupy** |
| **K-P1-3** | Regresje **0** |
| HE avg 18 (soft) | Spadek vs P0 **34.3%** (orient. cel roboczy: HE ≤ **28–30%** — nie hard gate DF) |

### 7.7 Rollback

Jak §5.7 (scope P1-C) · L3 = restore sprzed całego P1 jeśli Owner wymaga.

---

## 8. KPI zbiorcze P1 (zamrożone w EPIC DF · potwierdzone PLAN)

| ID | Target | Pomiar |
|----|--------|--------|
| **K-P1-1** | Unmatched PLN top-3 ≤ **50%** baseline (~400 k) | Probe gap jak CM-03 na tych samych 18 |
| **K-P1-2** | ≥ **3** nowe / grupę · **100%** product Quotes | Inspect WC po każdej grupie |
| **K-P1-3** | Regresje direct krytyczne = **0** | CM-02bis OFF/ON vs P0 |

**Soft (nie DF-hard):** avg HE 18 ↓ vs 34.3%; avg CM 18 ≥ poziomu P0 (65.7%) lub wyżej.

---

## 9. Przewidywany wpływ zbiorczy (model PLAN)

| Efekt | Szacunek |
|-------|----------|
| Unmatched top-3 | ~803 k → **≤ ~400 k** (KPI) · optymistycznie ~250–350 k przy dobrym keywords |
| HE share avg 18 | **34.3% → ~28–32%** (soft; reszta = INNE + P2) |
| CM share avg 18 | Stabilnie **≥ 65%** lub lekki ↑ gdy nowe match dostaną Quotes |
| Direct PLN | Shift origin HE→CM na złapanych liniach; regresje **0** (ceny Owner-controlled) |

```text
P0:  HE ~34% = brak match (głównie)
P1:  HE ↓ przez nowe works+Quotes w top-3
P2:  HE ↓ częstość (rozbiórki / instalacje)
P3:  triaż INNE (~1,72 M) — nie auto-seed
```

---

## 10. Ryzyka

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Fałszywy match (zła robota) | Śr | Wąskie keywords · złote opisy · Owner review · cap 12 |
| Bucket AUDIT ≠ semantyka | Śr | Ręczna selekcja opisów; nie seedować śmieci z regex |
| Scope creep branżowy | Niski | Cap 3–12 · kolejność A→B→C · CLOSE per grupa |
| Works bez Quotes | Niski | Gate D-F |
| Regresja cen | Niski | K-P1-3 · rollback L1 |

---

## 11. Allowlista / bloklista (P1)

### Allowlista

| Obszar |
|--------|
| Biblioteka Robót — custom `CatalogWork` |
| CSV + `preview` + **`commitMarketQuotesImport`** |
| Docs `CENY-MATERIAŁÓW-04-P1-*` · backup `.tmp/` |
| Readonly probe walidacji (wzorzec CM-02/04-P0) |

### Bloklista

| Obszar |
|--------|
| `tender-offer-boq-pricing-engine.ts` · mapping CM-01 · Bid · `cloud-sync.ts` |
| Scrapery · nowe tabele · GAP-B / Kp / marża |
| Heurystyki · nowi providerzy |

---

## 12. Payroll Safety Gate

```text
G1–G9: ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS P1 (per grupa A/B/C): TAK — po DF P1 PASS + Arch Review (jeśli wymagany) + Owner GO
```

---

## 13. Decyzje do zamrożenia w DF P1 (D-P1-*)

| ID | Decyzja | Propozycja PLAN |
|----|---------|-----------------|
| **D-P1-A** | Kolejność | A chodniki → B ogrodzenia → C elewacje |
| **D-P1-B** | Cap | 3–12 robót / grupę |
| **D-P1-C** | Quotes | 100% product przed CLOSE grupy |
| **D-P1-D** | Soft HE | Cel roboczy HE ≤ 28–30% — **nie** hard KPI (hard = K-P1-1…3) |
| **D-P1-E** | Fałszywe buckety | Owner triage opisów; nie seedować tynkarskiej „siatki” jako ogrodzenia |
| **D-P1-F** | Forma | OPS-first · 0 LOC AI-COST |

Zmiana D-P1-* = amend DF P1.

---

## 14. Następne kroki procesu

```text
PLAN P1 COMPLETE
  → DESIGN FREEZE P1 (zamrożenie D-P1-* · listy robót szkic → final)
  → Architecture Review (jeśli Owner wymaga; EPIC AR już APPROVED — slice P1 może być lekki)
  → Owner GO OPS P1-A
  → P1-B → P1-C
  → P1 OPS COMPLETE / READY FOR P2
```

**Zakaz teraz:** IMPLEMENT · commit · push.

---

## 15. Checklist PLAN

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | P0 PASS jako wejście? | **TAK** |
| 2 | P1-A/B/C: works · Quotes · źródło · wpływ · biznes · KPI · rollback? | **TAK** |
| 3 | OUT twarde? | **TAK** |
| 4 | Zgodność z EPIC DF K-P1-1…3? | **TAK** |
| 5 | ZERO zmian AI-COST / providerów / heurystyk? | **TAK** |

---

**PLAN STATUS:** **COMPLETE** · **READY FOR DESIGN FREEZE**
