# CENY-MATERIAŁÓW-04 P2 — CLOSEOUT

> **ID:** CENY-MATERIAŁÓW-04-P2-CLOSEOUT  
> **Data:** 2026-07-30  
> **STATUS:** **P2 COMPLETE** · **CLOSED** · **Owner GO CLOSE**  
> **Zakres:** P2-A · P2-B · Residual ROZ amend (K-P2-1) — FEATURE-DATA Work Catalog + Quotes  
> **Tip UI:** bez bumpa UI (tylko `kw-wgdom-work-catalog`) · SSOT tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Parent EPIC:** [`CENY-MATERIAŁÓW-04-PLAN.md`](CENY-MATERIAŁÓW-04-PLAN.md) · P2 PLAN [`CENY-MATERIAŁÓW-04-P2-PLAN.md`](CENY-MATERIAŁÓW-04-P2-PLAN.md)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P2 = COMPLETE
P2-A · P2-B · Residual ROZ CLOSED
K-P2-1/2/3 PASS · residual ROZ 16 ≤ 18 · false 0
NEXT = CENY-MATERIAŁÓW-04 P3 (INNE) AUDIT — Owner GO
  (osobny cykl AUDIT → PLAN → DESIGN FREEZE)
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **P2** | **COMPLETE** · **CLOSED** (Owner zatwierdził zamknięcie) |
| **Parent CM-04** | **NIE** zamknięty — otwarte **P3 (INNE)** i dalsze |
| **Następny krok** | **P3 AUDIT** — tylko po **Owner GO** · **bez** auto-start IMPLEMENT |
| **Klasa** | FEATURE-DATA · cloud WC · **bez** zmian frontend / Edge / AI-COST / scoring / Bid / Cloud CORE / parser |

---

## 2. Co zamknięte (linki SSOT)

| Slice | Status | Closeout / evidence |
|-------|--------|---------------------|
| **P2 PLAN → DF → Thin AR** | **CLOSED** | [`P2-PLAN`](CENY-MATERIAŁÓW-04-P2-PLAN.md) · [`DF`](CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md) · [`Thin AR`](CENY-MATERIAŁÓW-04-P2-THIN-ARCHITECTURE-REVIEW-COMPLETE.md) |
| **P2-A** ROZBIÓRKI | **CLOSED** · OV PASS | [`A-OPS`](CENY-MATERIAŁÓW-04-P2-A-OPS-COMPLETE.md) · [`A-OV`](CENY-MATERIAŁÓW-04-P2-A-OWNER-VERIFICATION-COMPLETE.md) |
| **P2-B** ELEKTRYKA/GK/HYDRAULIKA | **CLOSED** · OV PASS | [`B-OPS`](CENY-MATERIAŁÓW-04-P2-B-OPS-COMPLETE.md) · [`B-OV`](CENY-MATERIAŁÓW-04-P2-B-OWNER-VERIFICATION-COMPLETE.md) |
| **Residual ROZ** (grupa A) | **CLOSED** · K-P2-1 PASS | [`TRIAGE`](CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-TRIAGE.md) · [`AMEND`](CENY-MATERIAŁÓW-04-P2-RESIDUAL-ROZ-AMEND-COMPLETE.md) |
| **Grupa B residual** | **Świadomie unmatched** (szum / misbucket) | nie mapować · nie P3 w tym close |

Evidence runtime: `.tmp/ceny-materialow-04-p2-residual-owner-verification.json` · `.tmp/ceny-materialow-04-p2-gap-probe.json`

---

## 3. KPI końcowe P2

| KPI | Wynik |
|-----|--------|
| **K-P2-1** residual ROZ ≤50% vs baseline 36 (≤18) | **PASS** — **16** linii · **705 PLN** |
| **K-P2-2** ≥1 `p2a-*` + ≥1 `p2b-*` + Quotes 100% NEW | **PASS** — P2-A **9** · P2-B **5** · Quotes NEW 100% |
| **K-P2-3** brak regresji P1 / CM | **PASS** — P1 **10/7/7** · CM avg **73.6%** · HE **26.4%** · false **0** |

| Metryka | Wartość |
|---------|---------|
| Residual ROZ przed P2-A | **36** |
| Po P2-A/B | **33** |
| Po residual amend | **16** |
| Floor grupy B (świadomy) | ~**14** |
| known false / new false (OV) | **0 / 0** |

---

## 4. Catalog — skrót shipped

| Warstwa | Zawartość |
|---------|-----------|
| EXTEND | E1–E3 · E4–E8 · residual EXTEND ścianki/obróbki/legacy |
| NEW `p2a-*` | **9** (6 P2-A + 3 residual: stropy · podłoże · rynna/spust) |
| NEW `p2b-*` | **5** (#6 grzejnik OPC skip) |
| Quotes | pipeline P3.3 · **100%** na NEW aktywnych |
| Cloud | `kw-wgdom-work-catalog` (batch-set) |

---

## 5. Pipeline Quotes (bez zmian toru)

```text
CSV → previewMarketCsvImport → commitMarketQuotesImport
  → kw-wgdom-work-catalog
  → OfferBoq match → controlled_market (gdy product Quotes)
```

REUSE P3.3 · **zakaz** ręcznego `marketQuotes` poza pipeline.

---

## 6. Lessons (kontrakt P2 — nie nowe zasady silnika)

1. **EXTEND FIRST** — pełne frazy; NEW tylko gdy osobna cena / izolacja false.  
2. **nameTok F2** — unikać krótkich tokenów w `namePl`/`descriptionPl` (`rury`, `warstw`, `nowymi`, `nośnej`, …).  
3. **Keywords = pełne frazy** — nie gołe stem’y.  
4. **Grupa B residual** — nie mapować fałszywie (B1 mocowanie „bez rozebrania”, tablice, opaska/ławy, sanit).  
5. **Nie** poprawiać AI / scoringu / Bid / Cloud CORE, jeśli da się zamknąć WC + Quotes.

---

## 7. OUT (całe P2)

| Obszar | Status |
|--------|--------|
| P3 INNE | **nie rozpoczęte** — osobny cykl |
| AI-COST | **bez zmian kodu** |
| Scoring / mapping silnik | **bez zmian** |
| Bid Calculator | **bez zmian** |
| Cloud Sync CORE | **bez zmian** |
| Parser / discovery | **bez zmian** |

---

## 8. NEXT

**CENY-MATERIAŁÓW-04 P3 — INNE — AUDIT** (Owner GO → AUDIT → PLAN → DESIGN FREEZE → …).  

**Nie** startować P3 IMPLEMENT bez AUDIT + DF + Owner GO.  
Alternatywy równoległe: GAP-B / I3 / TP200B — [`NEXT-EPIC-CANDIDATES.md`](NEXT-EPIC-CANDIDATES.md).
