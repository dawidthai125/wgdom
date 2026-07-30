# CENY-MATERIAŁÓW-04 P2 — RESIDUAL ROZ AMEND COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-AMEND-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** FEATURE-DATA OPS + OWNER VERIFICATION (read-only re-probe)  
> **Owner GO:** CONTINUE P2 · domknięcie **wyłącznie K-P2-1** · grupa A only  
> **Triage:** [`CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-TRIAGE.md`](CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-TRIAGE.md)  
> **Evidence OPS:** `.tmp/ceny-materialow-04-p2-residual-ops-report.json`  
> **Evidence OV:** `.tmp/ceny-materialow-04-p2-residual-owner-verification.json`  
> **Evidence probe:** `.tmp/ceny-materialow-04-p2-gap-probe.json`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P2 RESIDUAL ROZ AMEND
K-P2-1: PASS (16 ≤ 18)
Rekomendacja: READY FOR P2 CLOSE
════════════════════════════════════════════════════════
```

---

## 1. Zakres (wykonany)

| | |
|--|--|
| Cel | Domknięcie **K-P2-1** (residual ROZ ≤18 vs baseline 36) |
| Wejście | Residual **33** po P2-A/B |
| Grupa A | EXTEND + 3× NEW + Quotes |
| Grupa B | **Świadomie poza mapowaniem** (floor ~14) |
| Zakaz | P3 INNE · AI-COST · scoring · Bid · Cloud CORE · parser · architektura |

---

## 2. Potwierdzenia przed NEW (obowiązkowe)

| NEW ID | Brak legacy dedykowanego | Brak kolizji p1a/p1b/p1c | Brak kolizji keywords | SSOT FIRST | REUSE FIRST | ZERO DUPLICATE |
|--------|--------------------------|-------------------------|----------------------|------------|-------------|----------------|
| `p2a-rozebranie-stropow-drewnianych-m2` | ✓ | ✓ | ✓ | Biblioteka Robót + Quotes | EXTEND nie wystarcza (osobna cena) | ✓ nowe ID |
| `p2a-zerwanie-podloza-m2` | ✓ | ✓ | ✓ | j.w. | j.w. | ✓ |
| `p2a-rozebranie-rynien-rur-spustowych-mb` | ✓ | ✓ | ✓ | j.w. | j.w. (≠ obróbki P1) | ✓ |

---

## 3. Wykonane EXTEND

| CatalogWork | +frazy | Cel triage |
|-------------|--------|------------|
| `p2a-rozebranie-scianek-dzialowych-m2` | **+9** | A1 warianty + A6 ścianki pełne |
| `p2a-rozebranie-obrobek-blacharskich-m2` | **+5** | A3 heal (≥2–4 hits przy UNKNOWN) |
| `legacy-rozbiorki-m2` | **+6** | A7 barierki deski · A8 pawlacze/wanna/piece |

---

## 4. Wykonane NEW

| ID | Cena PLN | jm | namePl (po F2 heal) |
|----|----------|----|---------------------|
| `p2a-rozebranie-stropow-drewnianych-m2` | 55 | m2 | Stropy drewniane — polepa i zasypki |
| `p2a-zerwanie-podloza-m2` | 42 | m2 | Usunięcie starej bazy pod kolejne pokrycie posadzkowe |
| `p2a-rozebranie-rynien-rur-spustowych-mb` | 38 | mb | Odwodnienie dachowe blaszane komplet do usunięcia |

**F2 (nameTok):** uniknięto tokenów `rury`/`rynny`/`podłoża`/`warstw`/`nowymi`/`nośnej` (false vs winidur / GK / naprawa podłoża).

---

## 5. Product Quotes

| | |
|--|--|
| Pipeline | `previewMarketCsvImport` → `commitMarketQuotesImport` |
| NEW Quotes | **3/3 (100%)** · `wgdom/wroclaw` = companyPricePln |
| Intact | P1 **10/7/7** · P2-A **9** · P2-B **5** |

---

## 6. Readonly re-probe

| Metryka | Przed (triage) | Po amend |
|---------|----------------|----------|
| Residual ROZ linie | **33** | **16** |
| Residual PLN | ~7,0 k | **705** |
| Baseline pre-P2-A | 36 | 36 |
| Target K-P2-1 | ≤18 | ≤18 |
| CM avg (18 spraw) | — | **73.6%** |
| HE avg | — | **26.4%** |
| Grupa B mapped na p2a | — | **0** |

Sample residual (świadomy floor B): opaska betonowa · tablice licznikowe · „Mocowanie… bez … rozebrania”.

---

## 7. Status K-P2-1

| | |
|--|--|
| **Werdykt** | **PASS** |
| Residual | **16 ≤ 18** |
| Pokrycie grupy A | ~20 linii w sample (OPS coveredCount) |
| False known/new (OV scope) | **0 / 0** |

---

## 8. Owner Verification checklist

| # | Check | Wynik |
|---|-------|--------|
| 1 | 3× NEW w cloud WC | **PASS** |
| 2 | Quotes 100% | **PASS** |
| 3 | EXTEND keywords obecne | **PASS** |
| 4 | P1 + P2 intact | **PASS** |
| 5 | Token scan banned = 0 | **PASS** |
| 6 | False matches = 0 | **PASS** |
| 7 | Grupa B unmapped | **PASS** |
| 8 | K-P2-1 | **PASS** |
| 9 | CM ≥ 73 | **PASS** (73.6) |

---

## 9. Rekomendacja

### **READY FOR P2 CLOSE** → **P2 COMPLETE (Owner CLOSE 2026-07-30)**

Formalne zamknięcie: [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md).  
NEXT Parent: **P3 (INNE) AUDIT**.

**Nie:** FURTHER ACTION REQUIRED.
