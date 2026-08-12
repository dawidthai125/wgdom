# TRANSPORT-01 MODEL-1A — CLOSEOUT (CONTRACT-ONLY)

> **Epic ID:** TRANSPORT-01 · **Slice:** **MODEL-1A**
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Zakres zamknięty:** **CONTRACT ONLY** (bez shadow / F5 / identity binder)
> **Data:** 2026-08-12
> **Baseline (docs HEAD pre-feature close):** `39db00b0`
> **Feature / live tip:** `a41854c35d9b6ec06f6100f246480d482a75dd39` (`a41854c`)
> **UI:** **2.66.43** (bez bump changelog w tym epiku)
> **PV:** [`TRANSPORT-01-PRODUCTION-VERIFY.md`](./TRANSPORT-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
TRANSPORT-01 MODEL-1A = CLOSED
CONTRACT-ONLY = CLOSED
TRANSPORT PRICING = NOT IMPLEMENTED
MODEL-1B = NOT STARTED / FOLLOW-UP
REAL SOURCE / LEGAL = UNKNOWN / MISSING
════════════════════════════════════════════════════════
```

---

## 1. Co jest CLOSED

| Item | Status |
|------|--------|
| TRANSPORT-01 **MODEL-1A** | **CLOSED** |
| Contract-only (D-TR-01…16) | **CLOSED** |
| Production | **VERIFIED · GREEN** |
| `identityKind: "transport_line"` | **YES** |
| `transportKind` open `string \| null` (nie closed enum) | **YES** |
| `sourceClass` / `offerBoqSignal` (signal ≠ identity) | **YES** |
| `createUnresolvedTransportPriceProvider` | **YES** (seam; **nie** cena prod) |
| UNRESOLVED → null rate/total/provenance/confidence | **YES** |
| UNRESOLVED ≠ 0 PLN / ≠ 85 PLN | **YES** |
| Forbidden Bid auto (ath/catalog/companyPrice/Expert/HTTP) | **NOT used** |
| `OfferBoqLineKind.Transport` | **NOT added** |
| Auto-binder (description / noiseKind / CI / UTYL) | **NONE** |
| `TRANSPORT_GAP` / `transportGapCount` / F5–shadow | **NOT in MODEL-1A** |
| C-MODE-1a / F0–F6 / EQUIPMENT-01 | **pozostają CLOSED · LOCKED** |
| Payroll | **GREEN** · 16/16 · `PayrollView.tsx` **nie** w release |
| schemaVersion bump / migracje / Cloud Sync / WM-RYSUNKI | **ZERO** |

---

## 2. Co NIE jest CLOSED

```text
MODEL-1B = NOT STARTED / FOLLOW-UP
  (TRANSPORT_GAP · transportGapCount · shadow/F5 identity binder)
TRANSPORT PRICING = NOT IMPLEMENTED
REAL SOURCE = UNKNOWN / MISSING
LEGAL = UNKNOWN / MISSING
UnresolvedTransportPriceProvider = contract seam only
  (tree-shake OK w entry bundle — brak UI call-site)
85 PLN = LEGACY TECHNICAL ONLY · FORBIDDEN jako nowy Bid source
```

**Nie** oznaczaj Transport Bid / pricing / REAL SOURCE jako CLOSED.

---

## 3. Feature commit (dokładnie 3 pliki)

| Plik | Rola |
|------|------|
| `src/lib/tender-position-cost/transport-contract.ts` | Contract + Unresolved provider (pure) |
| `src/lib/tender-position-cost/index.ts` | re-exporty only |
| `scripts/test-wm-tender-transport-01.mjs` | harness MODEL-1A |

**Delta** `39db00b0..a41854c3` = **exact 3 files**.

**Exclude:** `PayrollView.tsx` · Payroll WIP · shadow · cutover · OfferBoq schema · noise-filter · pricing-engine · Equipment · Cloud Sync · WM · App · Edge.

---

## 4. Domain locks (Noise / taxonomy)

| Reguła | Stan |
|--------|------|
| Noise ≠ Bid Transport (D-TR-01) | **LOCKED** |
| `isNoise` + `noiseKind=transport` → **NOISE_SKIP** | **KEEP** (shadow unchanged) |
| orphan `noiseKind=transport` → **AUXILIARY_GAP** ≠ `transport_line` | **KEEP** |
| TRANSPORT_UTYLIZACJA ≠ logistics Bid | **LOCKED** (`sourceClass=utylizacja` → INVALID) |
| Transport ≠ Equipment ≠ Auxiliary | **LOCKED** |
| EQUIPMENT-01 | **CLOSED** (bez zmian semantycznych w MODEL-1A) |

---

## 5. Regression (release / PV gate)

| Suite | Wynik |
|-------|--------|
| TRANSPORT-01 | **75 PASS / 0 FAIL** |
| F0/P0 | 46 PASS |
| F1 | 36 PASS |
| F2 | 62 PASS |
| F3 | 41 PASS |
| F4 | 36 PASS |
| F5 | 37 PASS |
| F6 | 21 PASS |
| C-MODE contract | 44 PASS |
| C-MODE fallback removal | 34 PASS |
| EQUIPMENT-01 | 36 PASS |
| Payroll 16/16 | PASS |

---

## 6. Locked domains (nie reopen)

F0–F6 · F6 ATH · C-MODE-1a · EQUIPMENT-01 · Cloud Sync · Payroll · WM-RYSUNKI — **bez** zmian w tym close.

---

## 7. NEXT (tylko Owner GO)

1. **MODEL-1B** (identity binder → optional `TRANSPORT_GAP` / `transportGapCount`) — **NOT STARTED** · **NIE** auto.
2. **Transport REAL SOURCE / LEGAL** — UNKNOWN / MISSING · **NIE** invent ceny · **NIE** auto.
3. **Auxiliary** domain — OUT do osobnego GO.
4. **Equipment REAL SOURCE / pricing** — FOLLOW-UP EQUIPMENT-01 · **NIE** auto.

**ACTIVE EPIC = NONE** · tryb **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**.
