# EQUIPMENT-01 — CLOSEOUT (CONTRACT-ONLY)

> **Epic ID:** EQUIPMENT-01
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Zakres zamknięty:** **CONTRACT / GAP MODEL ONLY**
> **Data:** 2026-08-12
> **Baseline (docs HEAD pre-feature):** `40d2b499`
> **Feature / live tip:** `8e4f3943f9506fa0c1befd787c0b29c1f8f55ebd` (`8e4f394`)
> **UI:** **2.66.43** (bez bump changelog w tym epiku)
> **PV:** [`EQUIPMENT-01-PRODUCTION-VERIFY.md`](./EQUIPMENT-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
EQUIPMENT-01 = CLOSED
CONTRACT-ONLY / GAP MODEL = CLOSED
EQUIPMENT PRICING = NOT IMPLEMENTED
REAL SOURCE / LEGAL ENABLEMENT = FOLLOW-UP / NOT STARTED
════════════════════════════════════════════════════════
```

---

## 1. Co jest CLOSED

| Item | Status |
|------|--------|
| EQUIPMENT-01 | **CLOSED** |
| Contract-only (D-EQ-01…12) | **CLOSED** |
| Production | **VERIFIED · GREEN** |
| Equipment = osobny GAP (`EQUIPMENT_GAP` / `EQUIPMENT_OUT_OF_SCOPE`) | **YES** |
| Equipment → F5 cutover **FAIL** (`equipmentGapCount`) | **YES** |
| REAL SOURCE | **NONE** (brak) |
| Cena / default rate | **NONE** |
| UNRESOLVED ≠ 0 PLN | **YES** (null rate / null total; nie 0 jako „brak”) |
| Forbidden Bid fallbacks (ath/catalog/companyPrice/heuristics/PI31/Expert seed) | **NOT used as Bid auto pricing** |
| Transport / Auxiliary pricing | **OUT** (nie w tym epiku) |
| C-MODE-1a | **pozostaje CLOSED** |
| F0–F6 | **pozostają CLOSED** |
| Payroll | **GREEN** · 16/16 harness · `PayrollView.tsx` **nie** w release |
| schemaVersion bump / migracje / HTTP-API / Cloud Sync / WM-RYSUNKI | **ZERO** |

---

## 2. Co NIE jest CLOSED

```text
EQUIPMENT PRICING = NOT IMPLEMENTED.
REAL SOURCE / LEGAL ENABLEMENT = FOLLOW-UP / NOT STARTED.
UnresolvedEquipmentPriceProvider = contract przygotowany;
  NIE jest używany jako źródło ceny produkcyjnej (tree-shake OK;
  Bid path = GAP, nie wycena).
TRANSPORT-01 = NIE START (tylko Owner GO).
```

**Nie** oznaczaj Equipment pricing jako CLOSED.

---

## 3. Feature commit (dokładnie 6 plików)

| Plik | Rola |
|------|------|
| `src/lib/tender-position-cost/equipment-contract.ts` | D-EQ-03 + Unresolved provider (pure) |
| `src/lib/tender-position-cost/boq-shadow-adapter.ts` | Equipment ≠ Transport/Auxiliary |
| `src/lib/tender-position-cost/bid-position-cost-cutover.ts` | `equipmentGapCount` + gate FAIL |
| `src/lib/tender-position-cost/index.ts` | re-exporty |
| `scripts/test-wm-tender-equipment-01.mjs` | harness T1–T18 |
| `scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs` | asercja TX EQ |

**Exclude:** `PayrollView.tsx` · Payroll WIP · cloud-sync · WM-RYSUNKI · App · Edge · docs WIP poza tym closeoutem.

---

## 4. Regression (release gate)

| Suite | Wynik |
|-------|--------|
| EQUIPMENT-01 | 36 PASS |
| F0/P0 | 46 PASS |
| F1 | 36 PASS |
| F2 | 62 PASS |
| F3 | 41 PASS |
| F4 | 36 PASS |
| F5 | 37 PASS |
| F6 | 21 PASS |
| C-MODE contract | 44 PASS |
| C-MODE fallback removal | 34 PASS |
| Payroll 16/16 | PASS |
| Browser Payroll smoke | **NOT RUN** (nie wymagany close contract) |

---

## 5. Locked domains (nie reopen)

F0–F6 · F6 ATH · C-MODE-1a · Cloud Sync · Payroll · WM-RYSUNKI — **bez** zmian w tym close.

---

## 6. NEXT (tylko Owner GO)

1. **TRANSPORT** domain contract/gap — AUDIT first · **NIE** auto-start.
2. **Auxiliary** — OUT do osobnego GO.
3. **Equipment REAL SOURCE / LEGAL ENABLEMENT** — FOLLOW-UP · **NIE** auto-start.
4. **Equipment pricing** — dopiero po REAL SOURCE · **NIE** invent ceny.

**ACTIVE EPIC = NONE** · tryb **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**.
