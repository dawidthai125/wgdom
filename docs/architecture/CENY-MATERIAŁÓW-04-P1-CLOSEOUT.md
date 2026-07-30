# CENY-MATERIAŁÓW-04 P1 — CLOSEOUT

> **ID:** CENY-MATERIAŁÓW-04-P1-CLOSEOUT  
> **Data:** 2026-07-30  
> **STATUS:** **P1 COMPLETE** · **PRODUCTION VERIFIED** · **READY FOR P2 AUDIT**  
> **Zakres:** P0 + P1-A + P1-B + P1-C (ADD WORKS / Quotes — FEATURE-DATA)  
> **Tip UI / feature:** SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `version.json`  
> **Parent EPIC:** [`CENY-MATERIAŁÓW-04-PLAN.md`](CENY-MATERIAŁÓW-04-PLAN.md) · P1 PLAN [`CENY-MATERIAŁÓW-04-P1-PLAN.md`](CENY-MATERIAŁÓW-04-P1-PLAN.md)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1 = COMPLETE
P0 · P1-A · P1-B · P1-C CLOSED · PV PASS
UI 2.65.83 · Feature tip P1-C 992023cc
NEXT = CENY-MATERIAŁÓW-04 P2 AUDIT (Owner GO)
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **P1** | **COMPLETE** (grupy P0 heal + P1-A/B/C shipped) |
| **Parent CM-04** | **NIE** zamknięty — otwarte **P2** (i dalsze) |
| **Następny krok** | **P2 AUDIT** — tylko po **Owner GO** · **bez** auto-start IMPLEMENT |

---

## 2. Co zamknięte (linki SSOT — bez duplikacji szczegółów)

| Slice | Status | UI / tip | Closeout |
|-------|--------|----------|----------|
| **P0** Quotes heal | **CLOSED** · OPS PASS | baseline 2.65.80 | [`P0-OPS`](CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE.md) |
| **P1-A** chodniki/nawierzchnie | **CLOSED** · PV | **2.65.81** · `dc0daea0` | [`P1-A-CLOSEOUT`](CENY-MATERIAŁÓW-04-P1-A-CLOSEOUT.md) |
| **P1-B** ogrodzenia | **CLOSED** · PV | **2.65.82** · `dca25c96` | [`P1-B-CLOSEOUT`](CENY-MATERIAŁÓW-04-P1-B-CLOSEOUT.md) |
| **P1-C** elewacje/ocieplenia | **CLOSED** · PV | **2.65.83** · **`992023cc`** | [`P1-C-CLOSEOUT`](CENY-MATERIAŁÓW-04-P1-C-CLOSEOUT.md) · [`RELEASE`](CENY-MATERIAŁÓW-04-P1-C-RELEASE-COMPLETE.md) |

---

## 3. Production (po P1-C)

| Pole | Wartość |
|------|---------|
| **UI** | **2.65.83** |
| **Feature commit (P1-C)** | **`992023cc`** |
| **Production Verify** | **PASS** · [`P1-C-PV`](CENY-MATERIAŁÓW-04-P1-C-PRODUCTION-VERIFY.md) |
| **Deploy tip** | [`09`](../AI/09_PRODUCTION_BASELINE.md) / `version.json` |

---

## 4. KPI końcowe P1 (próbka 18 · po P1-C)

| Metryka | Wartość |
|---------|---------|
| `controlled_market` | **73.2%** |
| `heuristic_estimate` | **26.8%** |
| P1-A roboty / Quotes | **10/10** |
| P1-B roboty / Quotes | **7/7** |
| P1-C roboty / Quotes | **7/7** |
| known false / new false | **0 / 0** |
| Unmatched ELEWACJE (po P1-C) | **40 125** PLN (−82.9% vs audit ~234 k) |
| Unmatched OGRODZENIA (po P1-B) | **0** |

Evidence OV: `.tmp/ceny-materialow-04-p1c-owner-verification.json` · slice PV/OV docs.

**K-P1-2 / K-P1-3** (PLAN): spełnione per-grupa (≥3 roboty · Quotes 100% · false/regresje 0).  
**K-P1-1** (unmatched top-3 ≤50% baseline ~803 k): formalny re-probe gap = **wejście do P2 AUDIT** — nie blokuje CLOSE grup P1-A/B/C.

---

## 5. Pipeline (jedyna ścieżka Quotes)

```text
CSV → previewMarketCsvImport → commitMarketQuotesImport
  → kw-wgdom-work-catalog (cloud)
  → OfferBoq match → controlled_market (gdy product Quotes)
```

REUSE P3.3 · **zakaz** ręcznego zapisu `marketQuotes` poza tym pipeline.

---

## 6. Lessons learned (kontrakt P1 — nie nowe zasady architektury)

1. **Unikać generycznych tokenów** w `namePl` / `descriptionPl` (scoring: `hay.includes(token)`).  
2. **Keywords = wyłącznie pełne frazy** — nie gołe słowa z listy zakazanej.  
3. **Najpierw poprawiać dane WC** (OPS patch name/keywords) — nie silnik.  
4. **Nie poprawiać AI / scoringu / providerów**, jeśli problem da się zamknąć Work Catalog + Quotes.

Szczegóły token safety: DF P1-A/B/C §5.2 (slice docs).

---

## 7. OUT (całe P1)

| Obszar | Status |
|--------|--------|
| AI-COST | **bez zmian kodu** |
| Scoring (`tender-offer-boq-mapping`) | **bez zmian** (ostatni tip CM-01) |
| Providerzy cen | **bez zmian** |
| Bid Calculator | **bez zmian** |
| Cloud Sync CORE | **bez zmian** |

---

## 8. NEXT

**CENY-MATERIAŁÓW-04 P2 = COMPLETE** — SSOT [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md).  

**Następny Parent slice:** **P3 (INNE) AUDIT** — Owner GO → AUDIT → PLAN → DF.  
Kandydaci równolegli: GAP-B / I3 / TP200B — [`NEXT-EPIC-CANDIDATES.md`](NEXT-EPIC-CANDIDATES.md).
