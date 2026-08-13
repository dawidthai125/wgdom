# OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 / GO-1 — CLOSEOUT

> **Epic ID:** OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01
> **Slice:** **GO-1** — Equipment Owner Input E2E
> **Status (slice):** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Epic global:** **NOT CLOSED** (GO-2 / Transport MODEL-1B remains)
> **Data:** 2026-08-13
> **Feature / live tip:** `83d2ccb5cb074507ec1d11e470216dd644e789d7` (`83d2ccb` / `83d2ccb5`)
> **UI:** **2.66.43**
> **Prior docs tip:** `9d3c27bd` (OWNER-INPUT-01 close)
> **PV:** [`OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md`](./OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
GO-1 Equipment Owner Input E2E = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / 83d2ccb5
Transport MODEL-1B = NOT STARTED
EPIC OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 = NOT FULLY CLOSED
════════════════════════════════════════════════════════
```

---

## 1. Co jest CLOSED (GO-1 only)

| Item | Status |
|------|--------|
| GO-1 Equipment Owner Input → Bid | **CLOSED** |
| Bridge `ensureOwnerRateQuestionForGap` + dedupe | **YES** |
| `OwnerInputEquipmentProvider` | **YES** |
| Shadow `EQUIPMENT_GAP` / `EQUIPMENT_RESOLVED` | **YES** |
| F5 `equipmentGapCount` + `equipmentPln` sum | **YES** |
| Hub `OwnerRateInputCard` + refresh via `onPriceResearchAccepted` | **YES** |
| provenance `owner_input` | **YES** |
| OI-01 store REUSE (`kw-owner-rate-input-v1`) | **YES** · no new KV/Cloud Sync |
| EQUIPMENT-01 contract | **KEEP** |
| TRANSPORT-01 MODEL-1A | **KEEP · CLOSED** |
| C-MODE / F0–F6 / Payroll | **LOCKED · GREEN** |

---

## 2. Co NIE jest CLOSED

```text
OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 (pełny epic) ≠ CLOSED
GO-2 Transport Owner Input E2E = NOT STARTED
Transport MODEL-1B = NOT STARTED
TRANSPORT_GAP / transportGapCount / transport-bid-identity = ABSENT
OfferBoqLineKind.Transport = ABSENT
REAL SOURCE / Sekocenbud / vendor API = OUT
Cloud Sync for Owner Input = FORBIDDEN until osobny Owner GO
```

**Nie** oznaczaj całego epiku ani Transport Bid jako CLOSED przez GO-1.

---

## 3. Functional contract (PIN)

### Brak Owner Input

```text
lineKind === Equipment
→ EQUIPMENT_GAP
→ ensureOwnerRateQuestion (dedupe tenderId+domain+lineRef)
→ equipmentGapCount++
→ F5 FAIL
```

### Valid Owner Input

```text
Owner answer (tender_only)
→ OwnerInputEquipmentProvider → RESOLVED
→ unitRatePln = Owner rate
→ totalPln = quantity × rate
→ equipmentGapCount = 0 (dla resolved line)
→ equipmentPln += total
→ directPln includes equipment
→ F5 may PASS (gdy L/M/AUX też complete)
```

### Invalid / unit mismatch

```text
→ INVALID
→ rate null · total null
→ GAP remains
→ F5 FAIL
→ NEVER false 0 PLN PASS
```

---

## 4. Owner Input

| Reguła | Stan |
|--------|------|
| LS key | `kw-owner-rate-input-v1` |
| `sourceClass` | `owner_input` |
| `scope` | `tender_only` |
| tenderId | REQUIRED |
| lineRef | = OfferBoq `lineId` |
| Storage | **localStorage only** |
| Revision | append-only · current only · `supersedesAnswerId` |
| Isolation | `tenderId + domain + lineRef` · **no** cross-tender |

**Continuity note:** Equipment pricing now has an Owner Input E2E path. The system may ask Owner for a **tender-specific** Equipment rate when none exists. Owner answer is **not** a global price — it is tender-scoped and revisioned. Missing answer remains **GAP**. Transport is **not** yet on this path.

---

## 5. Forbidden fallbacks

```text
0 as missing-price success · 85 · 45 · ATH · catalog · companyPricePln
· PI31 · Expert · heuristics · REAL SOURCE
= FORBIDDEN for Equipment resolution in GO-1
ONLY source = Owner Input
```

---

## 6. Transport boundary

| Item | Status |
|------|--------|
| TRANSPORT-01 MODEL-1A | **CLOSED** |
| MODEL-1B | **CLOSED** · see [`MODEL-1B-CLOSEOUT`](./OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md) |
| `TRANSPORT_GAP` / `transportGapCount` | **PRESENT** (MODEL-1B · explicit mark only) |
| Transport provider / shadow / F5 wiring | **PRESENT** (Owner Input only) |
| `OfferBoqLineKind.Transport` | **ABSENT** |
| `transportPln` resolution | **Owner Input SUM** (MODEL-1B) |

---

## 7. Feature commit (dokładnie 11 plików)

| Plik | Rola |
|------|------|
| `src/lib/owner-rate-input/bridge.ts` | ensure/dedupe |
| `src/lib/owner-rate-input/units.ts` | unit aliases |
| `src/lib/owner-rate-input/index.ts` | exports |
| `src/lib/tender-position-cost/owner-input-equipment-provider.ts` | provider |
| `src/lib/tender-position-cost/boq-shadow-adapter.ts` | Equipment OI resolve |
| `src/lib/tender-position-cost/bid-position-cost-cutover.ts` | F5 + equipmentPln |
| `src/lib/tender-position-cost/index.ts` | re-export |
| `src/app/OwnerRateInputCard.tsx` | Hub card |
| `src/app/TenderWorkflowHubPanel.tsx` | wire + refresh |
| `scripts/test-owner-input-bid-equipment-01.mjs` | harness 62 |
| `scripts/test-wm-tender-transport-01.mjs` | harness content-lock only |

**Feature SHA:** `83d2ccb5cb074507ec1d11e470216dd644e789d7`
**Exclude:** `PayrollView.tsx` · Cloud Sync · Edge · OfferBoq schema · REAL SOURCE

---

## 8. Regression

| Suite | Wynik |
|-------|--------|
| GO-1 Equipment | **62 PASS / 0 FAIL** |
| OWNER-INPUT-01 | **115 PASS / 0 FAIL** |
| EQUIPMENT-01 | 36 PASS |
| TRANSPORT-01 | 75 PASS |
| F0…F6 | 46 / 36 / 62 / 41 / 36 / 37 / 21 |
| C-MODE contract / fallback | 44 / 34 |
| Payroll B4 | **13/13 PASS** |
| Payroll battery (16 scripts) | **16/16 PASS** |

> B4 tip = **13 PASS**. „16/16” = **16 skryptów** battery — nie mylić z B4.

**PayrollView.tsx:** pre-existing Owner WIP · **NOT** in `83d2ccb5`.

---

## 9. Residual / NEXT (tylko Owner GO)

1. **MODEL-1B** — **CLOSED** · tip `f9324eb6` · [`MODEL-1B-CLOSEOUT`](./OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md)
2. **REAL SOURCE** — OUT until osobny epic
3. **Cloud Sync OI** — FORBIDDEN until Owner GO

**NIE** auto-start REAL SOURCE / Cloud Sync OI.

---

## 10. Verdict

**GO-1 CLOSED · PRODUCTION VERIFIED · GREEN**
**MODEL-1B CLOSED · PRODUCTION VERIFIED · GREEN** (supersedes Transport residual of GO-1)
**Epic OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 — NOT fully closed** (REAL SOURCE residual)