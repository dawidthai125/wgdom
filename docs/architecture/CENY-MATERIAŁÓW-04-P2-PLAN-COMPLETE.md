# CENY-MATERIAŁÓW-04 P2 — PLAN COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P2-PLAN-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** PLAN ONLY · DOCS ONLY  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P2-PLAN.md`](CENY-MATERIAŁÓW-04-P2-PLAN.md)  
> **Wejście:** P1 **COMPLETE** · P2 AUDIT **READY FOR PLAN** · EPIC DF §4.3 / §7.3  
> **Commit / push / IMPLEMENT / zmiany kodu:** **NIE**

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P2 PLAN COMPLETE
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

## 2. Zakres P2 (skrót)

| Slice | Fokus | Baseline (CM-03) | Cap | Quotes |
|-------|-------|------------------|-----|--------|
| **P2-A** | Rozbiórki / demontaże | 38 linii · ~80 k · 14/18 spraw | 3–12 (`p2a-*`) | 100% product · P3.3 |
| **P2-B** | Depth ELEKTRYKA / GK / HYDRAULIKA | ~36 k + 16 k + 12 k | 3–12 (`p2b-*`) · hard ≥1 trade | 100% product · P3.3 |

**KPI hard:** K-P2-1 (linie ROZBIORKI ≤50% baseline) · K-P2-2 (depth ROZBIORKI + ≥1 instalacja) · K-P2-3 (regresje 0).  
**Soft:** CM ≥ 73.2% · HE ≤ 26.8% · dokumentacja K-P1-1.

**OUT:** AI-COST · scoring · providerzy · Bid · Cloud Sync CORE · scraper · GAP-B · INNE seed · residual DROGI/ELEW jako główny cel.

**Pierwszy krok mierzalny:** readonly gap probe (`.tmp/ceny-materialow-04-p2-gap-probe.json`) — bez mutacji.

---

## 3. Zasady

| | |
|--|--|
| SSOT FIRST | WC · tip w `09` · baseline z probe |
| REUSE FIRST | `commitMarketQuotesImport` · P3.3 · controlled_market AS-IS |
| ZERO DUPLICATE LOGIC | Brak drugiego toru Quotes / scoringu |
| Lekcje P1 | Dane najpierw · pełne frazy · zero generics |

---

## 4. Następny krok

```text
DESIGN FREEZE P2 (D-P2-A…I + finalna lista robót + baseline residual)
  → Architecture Review P2
  → Owner GO
  → OPS P2-A → P2-B
```

**Zakaz:** IMPLEMENT · commit · push · zmiany kodu bez DF + AR + Owner GO.

---

**PLAN STATUS:** **COMPLETE** · **READY FOR DESIGN FREEZE**
