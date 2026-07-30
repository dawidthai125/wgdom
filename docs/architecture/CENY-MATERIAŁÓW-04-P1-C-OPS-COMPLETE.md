# CENY-MATERIAŁÓW-04 P1-C — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-C-OPS-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS IMPLEMENTATION · Owner GO **APPROVED FOR OPS**  
> **Grupa:** **P1-C — ELEWACJE / OCIEPLENIA**  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE.md) · §5.3 + OPS patches tokenów (równoważne §5.1–5.2)  
> **Klasa:** FEATURE-DATA / OPS · **bez** zmian AI-COST / scoringu / providerów / Bid / Cloud Sync CORE / P1-A / P1-B  
> **Pipeline Quotes:** CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC  
> **Evidence:** `.tmp/ceny-materialow-04-p1c-ops-report.json` · `…-validation.json` · `…-quotes.csv` · `…-catalog-backup.json` · `…-catalog-committed.json`  
> **Git commit / push:** **NIE**

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-C OPS COMPLETE
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

Gate OPS: 7× `p1c-*` · Quotes **7/7** · P1-A **10** · P1-B **7** · token scan **0** · known/new false **0** · C1 **> 0** · CM/HE bez regresji vs P1-B · unmatched ELEWACJE ↓ **≥25%**.

---

## 2. Co dodano

| Metryka | Wartość |
|---------|---------|
| Nowe roboty P1-C | **7** (cap 3–12) |
| Product Quotes na nowych | **7/7 (100%)** |
| Import Quotes | wyłącznie CSV → `commitMarketQuotesImport` |
| P1-A / P1-B po OPS | **10** / **7** intact |
| Aktywne roboty WC (wrocław) | **58** |

### Lista robót P1-C (po OPS patch)

| ID | namePl (OPS) | Unit | Quote PLN |
|----|--------------|------|-----------|
| `p1c-ocieplenie-etics-eps-m2` | Płyty izolacyjne EPS w układzie ETICS | m2 | 95 |
| `p1c-warstwa-zbrojona-etics-m2` | Warstwa zbrojona ETICS na płytach izolacyjnych | m2 | 48 |
| `p1c-tynk-elewacyjny-m2` | Tynk elewacyjny cienkowarstwowy | m2 | 55 |
| `p1c-farba-elewacyjna-m2` | Farba elewacyjna na tynku zewnętrznym | m2 | 28 |
| `p1c-zbrojenie-tynku-elewacyjnego-m2` | Zbrojenie tynku elewacyjnego ETICS | m2 | 22 |
| `p1c-welna-mw-etics-m2` | MW-ETICS izolacja elewacyjna | m2 | 120 |
| `p1c-listwa-startowa-cokol-mb` | Szyna startowa cokołowa ETICS | mb | 35 |

**OUT (bez zmian):** AI-COST · scoring · providerzy · Bid · Cloud Sync CORE · P1-A · P1-B.

---

## 3. OPS patch (false matches → 0)

Pierwszy pass: Quotes/C1/H5 OK, ale new false (token scoring AS-IS). Korekta **tylko WC**:

| Robota | Usunięte / zmienione | False przed |
|--------|----------------------|-------------|
| EPS / wełna | `ocieplenie`, `ścian` | docieplenie ościeży · ścianki GK (`includes`) |
| zbrojenie tynku | `powierzchniowe`, `włóknem`, krótka `siatka zbrojąca` | okna / geowłókniny |
| listwa | `listwa` → `profil` → **`szyna`** | listwy schodowe · profile/gzymsy |
| wełna | gołe `wełna`/`mineralna`/`płyty` w name | ścianki GK |

True match zachowany przez **pełne frazy keywords**. Banned scan **0**.

---

## 4. Coverage ELEWACJE

| KPI | Baseline (audit CM-03) | Po P1-C | Wynik |
|-----|------------------------|---------|--------|
| **C1** linie → `p1c-*` | 0 | **5** | **PASS** |
| **C2** nadal HE/unmatched w bucket | — | **25** | raport |
| Unmatched linie ELEWACJE (probe) | 12 (audit) | **15*** | *szerszy ELEW_RE vs audit |
| Unmatched PLN ELEWACJE | **~233 993** | **40 125** | **−82.9%** (≥25% H5) |
| Soft HE avg 18 | **27.0%** (P1-B) | **26.8%** | ↓ · PASS |
| Soft CM avg 18 | **73.0%** (P1-B) | **73.2%** | ↑ · PASS |
| Known / new false | — | **0 / 0** | PASS |

\* Probe OPS używa szerszego regex bucketa niż surowy CM-03 (więcej linii „elew-like”); Hard H5 liczony vs **PLN audit** (−82.9%).

---

## 5. Walidacja 18 (przed / po)

| Share materiałów avg 18 (CM-01 ON) | Po P1-B | Po P1-C | Δ |
|------------------------------------|---------|---------|---|
| **controlled_market** | 73.0% | **73.2%** | **+0.2 pp** |
| **heuristic_estimate** | 27.0% | **26.8%** | **−0.2 pp** |

| Hard | Wynik |
|------|--------|
| H1 3–12 `p1c-*` | **PASS** (7) |
| H2 Quotes 100% | **PASS** |
| H3 false 0 | **PASS** |
| H4 brak nieuzasadnionych regresji | **PASS** |
| H5 unmatched ELEWACJE ↓ ≥25% | **PASS** (−82.9%) |
| H6 token scan | **PASS** (0) |
| H7 P1-A/B intact | **PASS** (10/7) |

---

## 6. Wpływ na 18 · focus

| Tender | CM | HE | p1c matches | ELEW unmatched PLN (probe) |
|--------|----|----|-------------|----------------------------|
| `08dee335` | 82.6% | 17.4% | **2** (EPS + siatka cięto-ciągniona) | 68 |
| `08dee3f6` | 74.0% | 26.0% | **3** (warstwa zbrojona ×2 · wełna ościeża) | ~32.8 k |

Pozostałe 16: bez new false; P1-A/P1-B mapowania nietknięte.

---

## 7. Evidence

| Plik | Rola |
|------|------|
| `.tmp/ceny-materialow-04-p1c-ops.mjs` | skrypt OPS |
| `.tmp/ceny-materialow-04-p1c-quotes.csv` | CSV Quotes |
| `.tmp/ceny-materialow-04-p1c-catalog-backup.json` | backup przed OPS |
| `.tmp/ceny-materialow-04-p1c-catalog-committed.json` | WC po commit Quotes |
| `.tmp/ceny-materialow-04-p1c-ops-report.json` | KPI + decyzja |
| `.tmp/ceny-materialow-04-p1c-validation.json` | walidacja 18 |

Cloud: `kw-wgdom-work-catalog` · P1-C **7/7** Quotes · P1-A **10** · P1-B **7**.

---

## 8. Następny krok

**Owner Verification** P1-C (false gate + focus `08dee3f6` / `08dee335`).

**Bez commit. Bez push.**
