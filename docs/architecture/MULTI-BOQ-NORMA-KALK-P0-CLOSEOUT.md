# MULTI-BOQ-NORMA-KALK P0 — CLOSEOUT

> **Epic ID:** MULTI-BOQ-NORMA-KALK P0
> **Status:** **CLOSED** · **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Feature / live tip:** `dec73351edc0a9814ac92b745a10c6f35aaa2b9e` (`dec73351` / `dec7335`)
> **UI:** **2.66.43**
> **Deployment:** GitHub Production **`5892250601`** · **success**
> **PV:** [`MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md`](./MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **Continuity wyceny:** [`../AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)
> **Depends:** [`MULTI-BOQ-01-CLOSEOUT.md`](./MULTI-BOQ-01-CLOSEOUT.md) · [`INGEST-01-CLOSEOUT.md`](./INGEST-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
MULTI-BOQ-NORMA-KALK P0 = CLOSED
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / dec73351 · deploy 5892250601 success
Norma PRO „kalk. własna” → pricingBasis on parent KNR
DF-16 table-code suffix ≠ quantity · parent quantity=""
NO silent loss REAL KNR (LP32)
merge.ts / OfferBoq v5 / F5 / PackageGate UNCHANGED
F5 / REAL SOURCE / Final Bid = NOT CLAIMED GREEN
════════════════════════════════════════════════════════
```

---

## 1. Problem

Norma PRO marker **`kalk. własna`** was incorrectly emitted as a **standalone BOQ row**, producing **false CONFLICT_HOLD** under Multi-BOQ (same LP + same branch + different `contentHash`) on real Wrocławskie Mieszkania multi-dwelling tenders.

**Secondary regression (Owner Verify FAIL → fix):** DF-16 initially rejected table-code suffix `"02"` from `"0103-02"` and **silently dropped** REAL KNR **LP32** (reject token coupled to reject parent).

---

## 2. RCA (approved)

Quantity-token rejection was coupled to parent-row rejection: `extractUnitAndQuantity() = null` → `parsePdfPrzedmiarLine() = null` → real KNR disappeared.

---

## 3. Resolution

| Fix | Behavior |
|-----|----------|
| Kalk fold | `kalk. własna` folded into parent KNR |
| Provenance | optional `AthPreviewRow.pricingBasis = "kalk_wlasna"` (+ raw / sourceIndex) |
| Quantity after kalk | valid following quantity may resolve parent (DF-16-G) |
| Table-code suffix | `0103-02` → `02` / `0419-04` → `04` **never** quantity (DF-16-A) |
| Unresolved qty | parent retained with **`quantity: ""`** (string; not null) (DF-16-D/H) |
| Orphan kalk | warning `ORPHAN_KALK_BASIS` · **no** synthetic LP (DF-16-F) |
| Merge | contract **unchanged** |

**OUT of P0:** D02 residual **LP22** conflict · F5 unlock · REAL SOURCE · PackageGate ALLOW · Final Bid · invent PLN.

---

## 4. Design Freeze — DF-16 (final)

| ID | Rule |
|----|------|
| **DF-16-A** | Reject table-code suffix fragments (`\d{3,4}-\d{2}` → XX) as quantities |
| **DF-16-B** | Rejecting such a token MUST NOT drop the parent |
| **DF-16-C** | Only valid quantity tokens from correct layout context may become quantity |
| **DF-16-D** | Unresolved quantity → `quantity = ""` |
| **DF-16-E** | Never invent quantity |
| **DF-16-F** | Never create synthetic LP |
| **DF-16-G** | `kalk. własna` + valid following quantity may resolve parent |
| **DF-16-H** | No kalk / no valid quantity → retain incomplete REAL COST row |

**DF-11:** NO SILENT LOSS of real KNR / real cost parents in verified P0 scope.

---

## 5. Release pin

| Pole | Wartość |
|------|---------|
| Commit | **`dec73351edc0a9814ac92b745a10c6f35aaa2b9e`** |
| Short | **`dec73351`** / version.json **`dec7335`** |
| Message | `fix(tenders): preserve norma kalk basis and incomplete knr rows` |
| UI | **2.66.43** |
| Deployment ID | **5892250601** |
| State | **success** |
| HTTP `/` | **200** |
| Committed files | **5** (allowlist) · `PayrollView` **OUT** |

### Committed files

1. `src/lib/pdf-przedmiar-heuristic.ts`
2. `src/lib/ath-parser.ts`
3. `scripts/test-pdf-przedmiar-heuristic.mjs`
4. `scripts/test-tp182-pdf-wm-recovery.mjs`
5. `scripts/test-multi-boq-norma-kalk-p0.mjs`

---

## 6. Architecture touch (parser only)

| Area | Change |
|------|--------|
| `pdf-przedmiar-heuristic.ts` | fold kalk basis · DF-16 suffix reject · empty qty parent · orphan ban |
| `ath-parser.ts` | optional `pricingBasis?` / `pricingBasisRaw?` / `pricingBasisSourceIndex?` on `AthPreviewRow` |
| OfferBoq schema | **v5 UNCHANGED** (no new required fields) |
| `merge.ts` / `line-id.ts` / `eligibility.ts` | **UNCHANGED** |
| F5 / PackageGate / Cloud / DATA_KEYS / Payroll | **UNCHANGED** |

---

## 7. Real WM tender (production evidence)

| Pole | Wartość |
|------|---------|
| Buyer | Wrocławskie Mieszkania Sp. z o.o. |
| Ref | **WM/TP/239/2026/G** |
| OCDS | `ocds-148610-191b0d4e-b413-42a0-ae9c-32c9425d998b` |
| BZP | **2026/BZP 00377489** |
| Dwellings | D01 Reja 8/27 · D02 Sępa-Szarzyńskiego 80/1 · D03 Siemieńskiego 11/5 · D04 Wyszyńskiego 121/9 |

### Functional (parser / Multi-BOQ)

| Check | Result |
|-------|--------|
| LP32 | KNR AT-26 · Zabezpieczenie okien folią · m2 · **`quantity=""`** · ≠ `"02"` |
| LP53 | **1** row · `10.00 szt` |
| LP56 | `20.00 mb` · `pricingBasis=kalk_wlasna` |
| LP92 | `2.00 kpl` · `kalk_wlasna` · ≠ `"04"` |
| D01 | 147 rows · 0 false kalk conflicts · **ready** |
| D02 | 155 rows · 0 false kalk · **conflict ONLY LP22** (OUT OF P0) |
| D03 | 151 rows · 0 false kalk · **ready** |
| D04 | 159 rows · 0 false kalk · **ready** |

---

## 8. Product status (explicit)

| Layer | Status |
|-------|--------|
| Parser / Norma kalk semantics | **CLOSED · GREEN** |
| Multi-BOQ merge contract | **UNCHANGED · GREEN** |
| **F5** | **NOT VERIFIED GREEN** |
| **REAL SOURCE** | **UNAVAILABLE / NOT VERIFIED** |
| **PackageGate** | **NOT verified as ALLOWED for costing** |
| **Final Bid** | **NOT AVAILABLE / NOT VERIFIED** |
| Invented PLN | **FORBIDDEN** |

This P0 closes **parser / Multi-BOQ Norma semantics**, not the entire Tender Pricing product.

---

## 9. Regression record

### PRE-COMMIT REGRESSION (Owner Verify / local harness @ feature SHA)

| Suite | Result |
|-------|--------|
| `test-multi-boq-norma-kalk-p0.mjs` | **42/0** |
| `test-pdf-przedmiar-heuristic.mjs` | **85/0** |
| `test-tp182-pdf-wm-recovery.mjs` | **8/0** |
| `test-tp201a-pdf-description-fidelity.mjs` | **25/0** |
| `test-multi-boq-01.mjs` | **50/0** |
| `test-ingest-01.mjs` | **17/0** |

**Not** claimed as CI production runs.

### FRESH PRODUCTION VERIFY

See [`MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md`](./MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md): `version.json` + deploy success + live `app-core` DF-16/kalk markers + SHA-matched WM functional probe.

---

## 10. Hard locks

| Lock | Result |
|------|--------|
| `OFFER_BOQ_SCHEMA_VERSION` | **5** |
| `merge.ts` / `line-id.ts` / `eligibility.ts` / OfferBoq | **UNCHANGED** |
| F5 / PackageGate / Cloud / DATA_KEYS / Payroll | **UNCHANGED** |
| quantity type | **string** · `""` allowed · **not** `null` |
| invent pricing / synthetic LP / silent real KNR loss (P0 scope) | **NO** |

---

## 11. NEXT (SSOT preserved)

Project continuity NEXT remains: **LIVE REAL TENDER RETEST — POŁCZYN-ZDRÓJ** (FULL BIP / live F5–Bid **NOT VERIFIED**).
**NIE** auto REAL SOURCE / Cloud Sync OI / invent next technical epic.
