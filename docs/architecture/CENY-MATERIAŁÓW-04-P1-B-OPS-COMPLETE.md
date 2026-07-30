# CENY-MATERIAŁÓW-04 P1-B — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-B-OPS-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS IMPLEMENTATION · Owner GO **APPROVED FOR OPS**  
> **Grupa:** **P1-B — OGRODZENIA**  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE.md) · AMEND §5.3 + OPS patch tokenów (równoważne §5.1–5.2)  
> **Klasa:** FEATURE-DATA / OPS · **bez** zmian AI-COST / scoringu / providerów / Bid Calculator / Cloud Sync CORE / P1-A  
> **Pipeline Quotes:** CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC  
> **Evidence:** `.tmp/ceny-materialow-04-p1b-ops-report.json` · `…-validation.json` · `…-quotes.csv` · `…-catalog-backup.json` · `…-catalog-committed.json`  
> **Git commit / push:** **NIE**

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-B OPS COMPLETE
Decyzja: READY FOR OWNER VERIFICATION
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR OWNER VERIFICATION** |
| **Nie** | OPS REQUIRES IMPROVEMENTS |
| Git commit / push | **NIE** |

Gate OPS: 7× `p1b-*` · Quotes **7/7** · P1-A **10** intact · token scan **0** · known/new false **0** · C1 **> 0** · CM/HE bez regresji vs P1-A.

---

## 2. Co dodano

| Metryka | Wartość |
|---------|---------|
| Nowe roboty P1-B | **7** (cap 3–12) |
| Product Quotes na nowych | **7/7 (100%)** |
| Import Quotes | wyłącznie CSV → `commitMarketQuotesImport` |
| P1-A po OPS | **10** aktywnych · Quotes zachowane |
| Aktywne roboty WC (wrocław) | **51** |

### Lista robót P1-B (po OPS patch)

| ID | namePl (OPS) | Unit | Quote PLN |
|----|--------------|------|-----------|
| `p1b-ogrodzenie-siatka-mb` | Ogrodzenie liniowe w ramach parcelowych | mb | 85 |
| `p1b-panel-ogrodzeniowy-mb` | Odcinek ogrodzenia panelowego | mb | 120 |
| `p1b-slupek-ogrodzeniowy-szt` | Słupek ogrodzeniowy parcelowy | szt | 95 |
| `p1b-brama-ogrodzeniowa-szt` | Skrzydło wjazdowe w ciągu ogrodzenia | szt | 1800 |
| `p1b-furtka-ogrodzeniowa-szt` | Przejście piesze w ciągu ogrodzenia | szt | 650 |
| `p1b-zdjecie-ogrodzenia-mb` | Zdjęcie ogrodzenia liniowego (mb) | mb | 35 |
| `p1b-ogrodzenie-systemowe-mb` | Ogrodzenie z przęseł — odcinek stały | mb | 95 |

**OUT (bez zmian):** AI-COST · scoring · providerzy · Bid Calculator · Cloud Sync CORE · P1-A IDs.

---

## 3. OPS patch (false matches → 0)

Pierwszy pass OPS: Quotes/C1 OK, ale **5** new false matches (token scoring AS-IS). Korekta **tylko WC** (jak P1-A D-P1-F):

| Robota | Usunięty token | False przed |
|--------|----------------|-------------|
| `p1b-slupek-ogrodzeniowy-szt` | `stalowy` | belki/wanny **stalowe*** (`includes`) |
| `p1b-ogrodzenie-siatka-mb` | `słupkach` | barierki na **słupkach** drewnianych |
| `p1b-ogrodzenie-systemowe-mb` | gołe `systemowe` | materiały **systemowe** |
| `p1b-panel-ogrodzeniowy-mb` | `stalowego` (prophylactic) | — |

True match zachowany przez **pełne frazy keywords** (siatka/korty · ogrodzenia systemowe · przęsła).  
Teksty = równoważne DF §5.3 **bez** naruszenia §5.1–5.2 · banned scan **0**.

---

## 4. Coverage OGRODZENIA

| KPI | Baseline (audit CM-03) | Po P1-B | Wynik |
|-----|------------------------|---------|--------|
| **C1** linie → `p1b-*` | 0 | **5** | **PASS** |
| **C2** nadal HE/unmatched w bucket | — | **2** | raport |
| Unmatched linie OGRODZENIA | 15 | **0** | **PASS** |
| Unmatched PLN OGRODZENIA | **~258 250** | **0** | **−100%** (≥25% H5) |
| Soft HE avg 18 | **32.4%** (P1-A) | **27%** | ↓ · PASS |
| Soft CM avg 18 | **67.6%** (P1-A) | **73%** | ↑ · PASS |
| Known false | — | **0** | PASS |
| New false | — | **0** | PASS |

---

## 5. Walidacja 18 przetargów (przed / po)

| Share materiałów avg 18 (CM-01 ON) | Po P1-A | Po P1-B | Δ |
|------------------------------------|---------|---------|---|
| **controlled_market** | 67.6% | **73%** | **+5.4 pp** |
| **heuristic_estimate** | 32.4% | **27%** | **−5.4 pp** |

| Hard | Wynik |
|------|--------|
| H1 3–12 `p1b-*` | **PASS** (7) |
| H2 Quotes 100% | **PASS** |
| H3 false 0 | **PASS** |
| H4 brak nieuzasadnionych regresji | **PASS** |
| H5 unmatched OGRODZENIA ↓ ≥25% | **PASS** (−100%) |
| H6 token scan name/desc | **PASS** (0) |

---

## 6. Wpływ na 18 · focus

| Tender | CM | HE | p1b matches | OGROD unmatched |
|--------|----|----|-------------|-----------------|
| `08ded5cb` (siatka/korty) | **97.3%** | 2.7% | **3** → `p1b-ogrodzenie-siatka-mb` | 0 |
| `08dec13d` (systemowe) | 60.2% | 39.8% | **2** → `p1b-ogrodzenie-systemowe-mb` | 0 (C2=2 poza C1) |

Pozostałe 16: bez new false; P1-A mapowania nietknięte.

---

## 7. Evidence

| Plik | Rola |
|------|------|
| `.tmp/ceny-materialow-04-p1b-ops.mjs` | skrypt OPS |
| `.tmp/ceny-materialow-04-p1b-quotes.csv` | CSV Quotes |
| `.tmp/ceny-materialow-04-p1b-catalog-backup.json` | backup przed OPS |
| `.tmp/ceny-materialow-04-p1b-catalog-committed.json` | WC po commit Quotes |
| `.tmp/ceny-materialow-04-p1b-ops-report.json` | KPI + decyzja |
| `.tmp/ceny-materialow-04-p1b-validation.json` | walidacja 18 |

Cloud: `kw-wgdom-work-catalog` · wrocław+dolnyśląsk · P1-B **7/7** Quotes · P1-A **10**.

---

## 8. Następny krok

**Owner Verification** P1-B (D-P1-F false gate + focus `08ded5cb` / `08dec13d`).

**Bez commit. Bez push.**
