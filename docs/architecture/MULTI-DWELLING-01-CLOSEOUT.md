# MULTI-DWELLING-01 — CLOSEOUT

> **Epic ID:** MULTI-DWELLING-01
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Feature / live tip:** `0f1a52f48f86d54c166e577dcfc04081b0156f3c` (`0f1a52f` / `0f1a52f4`)
> **UI:** **2.66.43**
> **Prior tip:** MODEL-1B `f9324eb6` · docs tip hist. `7a37b822` (pre-feature)
> **PV:** [`MULTI-DWELLING-01-PRODUCTION-VERIFY.md`](./MULTI-DWELLING-01-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
MULTI-DWELLING-01 = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / 0f1a52f4
PackageGate + document mapping HARD
OI / GO-1 / MODEL-1B / COST-MULTI = GREEN
NO Cloud Sync · NO schema bump · NO second Bid engine
════════════════════════════════════════════════════════
```

---

## 1. Cel

Opt-in **paczka mieszkań** (1 przetarg → N dwellings → N przedmiary → aggregate → 1 Bid):

```text
Tender
→ Package (mode=multi | legacy_single)
→ N × DwellingCostUnit
→ N × OfferBoq
→ N × costing (shadow · OI Equipment/Transport · F5_D)
→ PackageGate (outer AND)
→ PackageDirect = SUM(DwellingDirect)
→ computeTenderBidProposal
```

**Bez** drugiego Bid engine · **bez** bumpa OfferBoq schema · **bez** Cloud Sync / DATA_KEYS · **bez** zmian C-MODE / F0–F6 line semantics · **bez** Payroll.

---

## 2. Baseline przed implementacją

| | |
|--|--|
| Production UI | **2.66.43** |
| Feature baseline (pre MULTI) | **`7a37b822`** |
| MODEL-1B / GO-1 / OWNER-INPUT-01 | **CLOSED · GREEN** |
| COST-MULTI | **CLOSED** (branch layer ≠ dwelling) |

---

## 3. Capability (PIN)

| Warstwa | Rola |
|---------|------|
| Package | `expectedDwellingCount` Owner-only · `mode` opt-in |
| Dwelling | `dwellingId` · `sourceDocumentIds` · `offerBoq` · `f5Gate` · subtotals |
| Document map | `documentToDwelling[documentId] = dwellingId` (Owner SSOT) |
| PackageGate | outer completeness gate (mapping + BOQ + F5_D + count) |
| Aggregation | `aggregatePackageDirect` → REUSE `computeTenderBidProposal` |
| Store v1 | LS `kw-multi-dwelling-package-v1` · **local only** |

UI: `MultiDwellingPackagePanel` · Hub wire `TenderWorkflowHubPanel`.

---

## 4. Identity SSOT

| Entity | Key |
|--------|-----|
| Tender | `tenderId` |
| Dwelling | `dwellingId` |
| Line (multi) | `tenderId + dwellingId + lineId` (`buildOfferBoqLineIdWithDwelling`) |
| Owner Input | `tenderId + dwellingId + domain + lineRef` |
| Transport mark | `tenderId + dwellingId + lineId` |

**NOT SSOT:** filename · description · LP · upload order · AI suggestion.

Legacy lineId (`buildOfferBoqLineId` w `tender-offer-boq.ts`) — **bez zmian**.

---

## 5. Document mapping HARD GATE (`mode === "multi"`)

```text
∀ dwelling:
  mappedSourceDocumentIds >= 1
  AND ∀ doc ∈ sourceDocumentIds:
        documentToDwelling[doc] === dwellingId
```

| Przypadek | Wynik |
|-----------|--------|
| Brak mappingu | **PACKAGE BLOCKED** (`DOCUMENT_MAPPING_MISSING` / …) |
| Attach BOQ bez mappingu | **REJECT** `DOCUMENT_MAPPING_REQUIRED` |
| BOQ + F5 PASS + brak mappingu | **PACKAGE BLOCKED** (NIGDY ALLOWED · NIGDY 0 PLN) |
| filename / AI / LP / order | **nie** tworzy SSOT dwellingId |

`mode === "legacy_single"`: **bez** obowiązku multi document mapping.

---

## 6. PackageGate

**PASS** tylko gdy:

```text
expectedDwellingCount > 0
AND uniqueDwellingCount == expectedDwellingCount
AND każdy expected dwelling istnieje
AND (multi) poprawne document mapping
AND każdy dwelling ma OfferBoq
AND każdy dwelling F5_D.pass
AND brak duplicate dwellingId
AND brak required empty dwelling
```

Inaczej: **PACKAGE BLOCKED**.

| Scenariusz | Wynik |
|------------|--------|
| incomplete (np. 19/20 / expected≠unique) | **BLOCKED** |
| full + mapping (20/20 / N/N) | **ALLOWED** |
| GAP w jednym dwelling | **BLOCKED** |
| missing / empty required | **BLOCKED** · **≠ 0 PLN** |

---

## 7. Costing architecture

```text
Per dwelling:
  OfferBoq → shadow → OI Equipment/Transport → F5_D

Package:
  SUM(DwellingDirect) → computeTenderBidProposal
```

- **Nie** drugi Bid engine.
- **COST-MULTI** = BRANCH layer **wewnątrz** dwelling (opcjonalnie) · **nie** dwelling identity (`CostPackage` / `BranchPackage` / `lotKey` ≠ dwelling).

---

## 8. Backward compatibility

| | |
|--|--|
| Default mode | `legacy_single` |
| Existing tender | **bez** migracji |
| Legacy lineId | **unchanged** |
| OI bez `dwellingId` | → `DEFAULT_DWELLING_ID` (`"default"`) |
| Transport mark bez `dwellingId` | → `DEFAULT_DWELLING_ID` |
| OfferBoq schema | **v5** · **NO bump** · **NO** `OfferBoqLineKind.Transport` |

---

## 9. Safety boundaries

```text
NO Cloud persistence v1
NO DATA_KEYS / cloud-sync / CloudLoader
NO Supabase / Edge
NO Payroll changes
NO C-MODE / F0–F6 semantic redesign
NO new Bid engine
NO OfferBoq schema redesign
NO OfferBoqLineKind.Transport
NO auto dwelling from filename/AI
```

---

## 10. Release hygiene

| | |
|--|--|
| Feature commit | **`0f1a52f48f86d54c166e577dcfc04081b0156f3c`** |
| Range | `7a37b822` → `0f1a52f4` |
| Files | **20** (allowlista MULTI-DWELLING-01) |
| `PayrollView.tsx` | **0 lines** · lokalny WIP **OUT** |
| Harness | `scripts/test-multi-dwelling-01.mjs` · **72/0** |

---

## 11. Regression (PIN @ tip)

| Suite | Result |
|-------|--------|
| MULTI-DWELLING-01 | **72/0** |
| OWNER-INPUT-01 | **115/0** |
| GO-1 | **62/0** |
| MODEL-1B | **64/0** |
| Transport-01 | **75/0** |
| Equipment-01 | **36/0** |
| C-MODE | **44/0 + 34/0** |
| F0–F6 | **46 / 36 / 62 / 41 / 36 / 37 / 21** |
| Payroll B4 | **13/13** |
| Payroll battery | **16/16 scripts** |
| COST-MULTI | **PASS** |

> B4 = **13/13**. Battery = **16/16 scripts**. Nie mieszać.

---

## 12. Key files

| Path | Rola |
|------|------|
| `src/lib/multi-dwelling/*` | package · gate · store · orchestration · line-id |
| `src/app/MultiDwellingPackagePanel.tsx` | UI |
| `src/app/TenderWorkflowHubPanel.tsx` | Hub wire |
| `src/lib/owner-rate-input/*` | additive `dwellingId` |
| `src/lib/tender-position-cost/*` | dwelling scope pass-through |
| `scripts/test-multi-dwelling-01.mjs` | harness T1–T24 |

---

## 13. Residual / NEXT

| | |
|--|--|
| Cloud Sync multi-dwelling / OI | **FORBIDDEN** bez Owner GO → AUDIT |
| REAL SOURCE Equipment/Transport | **NOT STARTED** · tylko Owner GO |
| Epic docs commit | awaiting Owner GO COMMIT+PUSH (ten closeout) |

**ACTIVE EPIC IMPLEMENT:** **NONE** po zamknięciu treści · residual pricing = REAL SOURCE / Cloud OI **nie auto**.

---

## 14. Verdict

**MULTI-DWELLING-01 = CLOSED**
**PRODUCTION VERIFIED · GREEN**
**tip 2.66.43 / `0f1a52f4`**
