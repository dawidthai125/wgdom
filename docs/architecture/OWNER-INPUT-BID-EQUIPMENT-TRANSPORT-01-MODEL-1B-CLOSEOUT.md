# OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 / MODEL-1B — CLOSEOUT

> **Epic ID:** OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01
> **Slice:** **MODEL-1B** — Transport Bid Candidate (explicit mark) → Owner Input → F5
> **Status (slice):** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Epic global:** **NOT CLOSED** (docs commit pending / residual REAL SOURCE · Cloud Sync OI)
> **Data:** 2026-08-13
> **Feature / live tip:** `f9324eb6305d0d359bd114b40a940cdb2722734b` (`f9324eb` / `f9324eb6`)
> **UI:** **2.66.43**
> **Prior tip:** GO-1 `83d2ccb5` · GO-1 docs `fe935ffb`
> **PV:** [`OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md`](./OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)

```text
════════════════════════════════════════════════════════
TRANSPORT MODEL-1B = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / f9324eb6
GO-1 Equipment = CLOSED · GREEN
TRANSPORT-01 MODEL-1A = CLOSED · GREEN
OWNER-INPUT-01 = CLOSED · GREEN
EPIC OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 = NOT FULLY CLOSED
════════════════════════════════════════════════════════
```

---

## 1. Cel MODEL-1B

Jawny Bid Transport candidate:

```text
tenderId + lineId
→ sourceClass = bid_candidate
→ identityKind = transport_line
→ Owner Input (domain=transport)
→ TRANSPORT_RESOLVED | TRANSPORT_GAP
→ transportPln → F5
```

**Bez** REAL SOURCE · **bez** auto-rozpoznawania transportu · **bez** fallbacków · **bez** zmiany OfferBoq schema · **bez** C-MODE / F0–F6 / Equipment / Payroll / Cloud Sync.

---

## 2. Baseline przed implementacją

| | |
|--|--|
| Production UI | **2.66.43** |
| Feature baseline | GO-1 **`83d2ccb5`** |
| GO-1 close docs | **`fe935ffb`** |
| MODEL-1A | CLOSED · CONTRACT ONLY |
| MODEL-1B | PLAN + DF + ARCH REVIEW = GREEN / READY |

---

## 3. Design decisions (PIN)

| ID | Decyzja |
|----|---------|
| D-T1B-01…16 | ACCEPTED (Design Freeze) |
| Mark model | **A1** — Owner/Admin jawnie oznacza linię |
| Identity | **tylko** mark `bid_candidate` + `transport_line` |
| Price | **tylko** Owner Input `owner_input` / `tender_only` |
| Store mark | osobny LS `kw-transport-bid-candidate-v1` ≠ OI store |
| Units | REUSE day/h/m3 aliases · **no** kurs/km/szt invent |

---

## 4. Identity model

Bid Transport istnieje **wyłącznie** gdy:

```text
tenderId + lineId ma jawny marker:
  sourceClass = "bid_candidate"
  identityKind = "transport_line"
```

**NIE** identity z: description · „transport” · „dostawa” · noiseKind · CI · 85 · ATH · catalog · companyPrice · Expert · heuristics.

Brak markera = **nie** jest Bid Transport.

---

## 5. Mark store

| | |
|--|--|
| Key | `kw-transport-bid-candidate-v1` |
| Scope | tenderId + lineId · **localStorage only** |
| API | `mark` / `unmark` / `is` / `list` |
| Isolation | Tender A **nie** widzi markerów Tender B |
| Lookup | **nigdy** global · **nigdy** lineId-only |
| Cloud | **FORBIDDEN** · nie w DATA_KEYS / cloud-sync |

Guards (gdy podane): NOISE_TRANSPORT · UTYLIZACJA_ONLY.

---

## 6. Owner Input reuse

| | |
|--|--|
| Store | **REUSE** `kw-owner-rate-input-v1` |
| domain | `transport` |
| sourceClass | `owner_input` |
| scope | `tender_only` |
| Lookup | `tenderId + domain + lineRef` (= lineId) |
| Bridge | REUSE `ensureOwnerRateQuestionForGap` · `submitOwnerRateAnswer` · `buildTransportPromptPl` |

**Nie** twórz `kw-owner-transport-input-v1` · **nie** drugiego systemu historii OI.

---

## 7. Provider

`owner-input-transport-provider.ts` · analog Equipment (nie kopiuj ślepo).

| Stan | unitRatePln | totalPln |
|------|-------------|----------|
| RESOLVED | rate | quantity × rate |
| UNRESOLVED | **null** | **null** |
| INVALID | **null** | **null** |

**NIGDY** UNRESOLVED/INVALID → 0 · **NIGDY** 85/45/PI31/ATH/catalog/companyPrice/Expert/heuristics/REAL SOURCE.

---

## 8. Shadow flow (kolejność ochronna)

```text
1. isNoise → NOISE_SKIP
2. Equipment → EQUIPMENT_* (GO-1 KEEP)
3. Transport Bid Candidate (mark) → TRANSPORT_GAP | TRANSPORT_RESOLVED
4. orphan noiseKind=transport → AUXILIARY_GAP (NIE Bid Transport)
5. L/M → istniejąca ścieżka
```

---

## 9. Noise / Utylizacja (HARD)

```text
isNoise === true (+ noiseKind transport)
→ NOISE_SKIP
→ ZERO Owner Question · ZERO TRANSPORT_GAP · ZERO transportPln · ZERO Bid Transport

TRANSPORT_UTYLIZACJA / utylizacja / disposal_only
→ NIE Bid Transport
→ ZERO logistics Owner Question
```

---

## 10. F5 / cutover

| Pole | Semantyka |
|------|-----------|
| `transportGapCount` | linie Bid Transport bez valid OI |
| `transportPln` | **SUM**(resolved transport totals) — nie hardcode |
| Brak Bid Transport | `transportPln = 0` = **BRAK DOMENY** ≠ „resolved 0” |
| Gate | equipmentGapCount===0 **AND** transportGapCount===0 **AND** L+M **AND** AUX |

`transportGapCount > 0` → **F5 FAIL**.

`directPln` = L + M + Equipment + Transport + Auxiliary (AUX KEEP C-AUX-1).

---

## 11. UI

| Surface | Zachowanie |
|---------|------------|
| `OwnerRateInputCard` | Equipment **+** Transport · Domain: Transport · `submitOwnerRateAnswer` · `onPriceResearchAccepted` |
| Hub | A1 **Oznacz / Usuń oznaczenie Bid Transport** (tenderId+lineId) |
| AI | **brak** nowego aktora / chatu |

---

## 12. Boundaries

| Boundary | Stan |
|----------|------|
| OfferBoqLineKind.Transport | **ABSENT** |
| OFFER_BOQ_SCHEMA_VERSION | **5** |
| Cloud Sync / DATA_KEYS / Edge / Supabase | **ZERO** dla markera i OI |
| C-MODE / F0–F6 | **LOCKED** |
| Equipment GO-1 | **KEEP · GREEN** |
| Payroll | **LOCKED** · `PayrollView.tsx` **OUT** |
| REAL SOURCE | **FORBIDDEN** w MODEL-1B |

---

## 13. Forbidden fallbacks

```text
0-as-success · 85 · 45 · PI31 · ATH · catalog · companyPrice
· Expert · heuristics · REAL SOURCE · description/noise/CI identity
= FORBIDDEN for Transport Bid in MODEL-1B
ONLY price source = Owner Input
```

---

## 14. Feature release scope (exact 10)

**Feature SHA:** `f9324eb6305d0d359bd114b40a940cdb2722734b`

| # | Plik |
|---|------|
| 1 | `src/lib/tender-position-cost/transport-bid-candidate.ts` |
| 2 | `src/lib/tender-position-cost/owner-input-transport-provider.ts` |
| 3 | `src/lib/tender-position-cost/boq-shadow-adapter.ts` |
| 4 | `src/lib/tender-position-cost/bid-position-cost-cutover.ts` |
| 5 | `src/lib/tender-position-cost/index.ts` |
| 6 | `src/app/OwnerRateInputCard.tsx` |
| 7 | `src/app/TenderWorkflowHubPanel.tsx` |
| 8 | `scripts/test-owner-input-bid-transport-01.mjs` |
| 9 | `scripts/test-wm-tender-transport-01.mjs` |
| 10 | `scripts/test-owner-input-bid-equipment-01.mjs` |

**Deviation #10:** equipment harness LOCK update (historyczne „absent TRANSPORT_*” → LOCK kompatybilny z MODEL-1B). **Harness-only** · **zatwierdzony** · **nie** wyłącza Equipment gate (`equipmentGapCount===0` zachowane).

**Exclude:** `PayrollView.tsx` · docs (osobny commit) · Cloud Sync · Edge · OfferBoq schema · REAL SOURCE.

---

## 15. Regression matrix (PIN)

| Suite | Wynik |
|-------|--------|
| MODEL-1B | **64 PASS / 0 FAIL** |
| GO-1 Equipment | **62 PASS / 0 FAIL** |
| OWNER-INPUT-01 | **115 PASS / 0 FAIL** |
| TRANSPORT-01 | **75 PASS** |
| EQUIPMENT-01 | **36 PASS** |
| C-MODE contract / fallback | **44 / 34** |
| F0…F6 | **46 / 36 / 62 / 41 / 36 / 37 / 21** |
| Payroll B4 | **13/13 PASS** |
| Payroll battery (16 scripts) | **16/16 PASS** |

> B4 tip = **13 PASS**. „16/16” = **16 skryptów** battery — nie mylić z B4.

---

## 16. Production verification

| Pole | Wartość |
|------|---------|
| UI | **2.66.43** |
| Production SHA | **`f9324eb6305d0d359bd114b40a940cdb2722734b`** |
| GH Deployment | **`5883644658`** · success |
| HTTP `/` | **200** |
| Verdict | **PRODUCTION VERIFIED · GREEN** |

Szczegóły: [`MODEL-1B-PRODUCTION-VERIFY`](./OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md).

---

## 17. Residual / NEXT (tylko Owner GO)

1. **Docs commit + push** — ten closeout (epic slice content already live)
2. **REAL SOURCE** — OUT until osobny epic / Owner GO
3. **Cloud Sync OI** — FORBIDDEN until Owner GO
4. Epic **OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01** — **NOT fully closed** until Owner declares (po docs commit: residual REAL SOURCE)

**NIE** auto-start REAL SOURCE / Cloud Sync OI / invent S10.

---

## 18. Verdict

**MODEL-1B CLOSED · PRODUCTION VERIFIED · GREEN**
**GO-1 Equipment · GREEN**
**Epic OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01 — NOT fully closed**
