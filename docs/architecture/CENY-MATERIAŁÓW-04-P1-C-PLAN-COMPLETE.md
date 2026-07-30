# CENY-MATERIAŁÓW-04 P1-C — PLAN COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P1-C-PLAN-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** PLAN ONLY · DOCS ONLY  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P1-C-PLAN.md`](CENY-MATERIAŁÓW-04-P1-C-PLAN.md)  
> **Wejście:** P0 **CLOSED** · P1-A **CLOSED** (2.65.81) · P1-B **CLOSED** (2.65.82 · `dca25c96`)  
> **Commit / push / IMPLEMENT:** **NIE**

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1-C PLAN COMPLETE
Decyzja: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR DESIGN FREEZE** |
| **Nie** | PLAN REQUIRES CHANGES |

---

## 2. Identyfikacja bucketa

| Pole | Wartość |
|------|---------|
| **Wybór** | **`ELEWACJE_OCIEPLENIA`** (Elewacje / ocieplenia) |
| **Uzasadnienie** | D-P1-A kolejność A→B→**C** · 3. gap ADD WORKS CM-03 (~**234 k** PLN · 12 linii · 4 przetargi) · transfer OUT P1-B (siatka tynkarska/zbrojona) · ROI CM-02 (+~159 k) · domknięcie top-3 P1 (~803 k) |
| **Odrzucone teraz** | `ROZBIORKI` (~80 k) → P2 · `INNE` (~1,72 M) → triage |

---

## 3. Zakres P1-C (skrót)

| Pole | Wartość |
|------|---------|
| Grupa | **ELEWACJE / OCIEPLENIA** (`ELEWACJE_OCIEPLENIA`) |
| Baseline unmatched | **~234 k PLN** · 12 linii · 4 przetargi |
| Cap robót | **3–12** · rekomendacja **6–8** · prefiks `p1c-*` |
| Quotes | **100%** product · CSV → **`commitMarketQuotesImport`** |
| OUT silnika | AI-COST · scoring · providerzy · Bid · Cloud Sync CORE · P1-A · P1-B |
| Lekcje A+B | zero generycznych tokenów (`wykonanie`/`siatka`/`systemowe`/…) · keywords = pełne frazy |
| Fokus | `08dee3f6` · `08dee335` |
| **Hard** | ≥3 works · Quotes 100% · false 0 · regresje 0 · unmatched ELEWACJE ↓ ≥25% · token scan 0 · P1-A/B intact |
| **Soft** | HE ↓ vs 27.0% · CM ≥ 73.0% · fokus `08dee3f6` |
| **Coverage** | C1 (linie→`p1c-*`) · C2 (HE/unmatched w buckecie) |

**MIN robót:** ocieplenie EPS/ETICS (m2) · warstwa zbrojona z siatką (m2) · tynk/farba elewacyjna (m2).  
**REC:** siatka zbrojąca/cięto-ciągniona · wełna MW.  
**OUT grupy:** okablowanie „na elewacji” · stolarka EI · malowanie wewnętrzne · ogrodzenia/chodniki.

---

## 4. Następny krok

```text
DESIGN FREEZE P1-C (token safety + finalna lista)
  → (opc.) thin AR
  → Owner GO OPS P1-C
```

**Zakaz:** IMPLEMENT · commit · push bez DF + Owner GO.

---

**PLAN STATUS:** **COMPLETE** · **READY FOR DESIGN FREEZE**
