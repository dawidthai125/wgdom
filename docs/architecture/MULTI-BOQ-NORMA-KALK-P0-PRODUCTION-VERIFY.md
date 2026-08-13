# MULTI-BOQ-NORMA-KALK P0 — PRODUCTION VERIFY

> **STATUS:** **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Epic:** MULTI-BOQ-NORMA-KALK P0
> **Closeout:** [`MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md`](./MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md)
> **Feature / live:** `dec73351edc0a9814ac92b745a10c6f35aaa2b9e`

```text
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / dec73351 · deploy 5892250601 success
DF-16 + kalk fold live · LP32 survives quantity=""
F5 / REAL SOURCE / PackageGate / Final Bid NOT CLAIMED GREEN
EPIC content CLOSED · docs commit may follow Owner GO
```

---

## 1. Production identity

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| HTTP `/` | **200** |
| UI | **2.66.43** |
| `version.json` commit | **`dec7335`** (≡ **`dec73351…`**) |
| `version.json` timestamp | `2026-08-13T16:48:32.782Z` |
| Feature SHA | **`dec73351edc0a9814ac92b745a10c6f35aaa2b9e`** |
| HEAD / origin/main @ PV | **`dec73351…`** |
| Deployment ID | **5892250601** |
| Deployment state | **success** |
| Vercel status | **success** |

**HARD:** Production commit == **`dec73351`** · **PASS**.

---

## 2. Live bundle evidence

Chunk: `assets/app-core-BOikAkT_.js` (prod @ tip).

| Marker / capability | Wynik |
|---------------------|--------|
| DF-16-A `A0` / `\d{3,4}-${r}` table-code suffix reject | **PRESENT** |
| DF-16-B/D `return{unit:r,quantity:"",…}` (parent keep) | **PRESENT** |
| `pricingBasis:"kalk_wlasna"` · `pricingBasisRaw` · `pricingBasisSourceIndex` | **PRESENT** |
| `ORPHAN_KALK_BASIS` | **PRESENT** |
| later qty after `\d{3,4}-\d{2}` path | **PRESENT** |

Function names may be minified — string/marker evidence + tip SHA = sufficient for code presence.

---

## 3. Real WM tender (functional)

| Pole | Wartość |
|------|---------|
| Buyer | Wrocławskie Mieszkania Sp. z o.o. |
| Ref | **WM/TP/239/2026/G** |
| OCDS | `ocds-148610-191b0d4e-b413-42a0-ae9c-32c9425d998b` |
| BZP | **2026/BZP 00377489** |
| Dwellings | D01 Reja 8/27 · D02 Sępa-Szarzyńskiego 80/1 · D03 Siemieńskiego 11/5 · D04 Wyszyńskiego 121/9 |

### Critical rows (D01)

| LP | Evidence |
|----|----------|
| **32** | KNR AT-26 · Zabezpieczenie okien folią · m2 · **`quantity=""`** · ≠ `"02"` · row **present** |
| **53** | **exactly 1** · `10.00 szt` |
| **56** | `20.00 mb` · `pricingBasis=kalk_wlasna` · Rurociągi… |
| **92** | `2.00 kpl` · `kalk_wlasna` · ≠ `"04"` |
| **146** | incomplete REAL · `quantity=""` retained (valid) |

### Dwellings

| Dwelling | rows | false kalk conflicts | merge |
|----------|------|----------------------|-------|
| D01 | 147 | **0** | **ready** |
| D02 | 155 | **0** | **conflict** — **ONLY LP22** (OUT OF P0) |
| D03 | 151 | **0** | **ready** |
| D04 | 159 | **0** | **ready** |

**NO silent loss:** LP32 recovered; incomplete REAL (`quantity=""`) retained; ≠ invent PLN / ≠ treat `""` as zero price.

---

## 4. Merge safety

| Check | Result |
|-------|--------|
| `merge.ts` in release | **UNCHANGED** |
| same LP + same branch + different contentHash → CONFLICT | **PASS** (harness T10) |
| identical contentHash → KEEP ONE | **PASS** (T11) |
| different branch → KEEP BOTH | **PASS** (T12) |
| OfferBoq schema | **v5** |

---

## 5. F5 / REAL SOURCE / PackageGate / Bid

| Layer | PV claim |
|-------|----------|
| F5 | **NOT VERIFIED GREEN** |
| REAL SOURCE | **UNAVAILABLE / NOT VERIFIED** |
| PackageGate | **NOT verified as ALLOWED** |
| Final Bid | **NOT AVAILABLE / NOT VERIFIED** |
| Invented PLN | **NONE** |

Parser / Multi-BOQ Norma P0 ≠ costing product unlock.

---

## 6. Evidence classes (do not conflate)

| Class | Content | Result |
|-------|---------|--------|
| **FRESH PRODUCTION** | `version.json` · HTTP 200 · deploy **5892250601** success · live `app-core` markers | **PASS** |
| **FRESH functional probe** | SHA-matched code (`dec73351`) + real WM PDF fixtures · D01–D04 / LP32… | **PASS** |
| **PRE-COMMIT REGRESSION** | NORMA-KALK **42/0** · heuristic **85/0** · TP182 **8/0** · TP201A **25/0** · MULTI-BOQ-01 **50/0** · INGEST-01 **17/0** | **PASS** (local/Owner Verify — **not** CI prod runs) |

---

## 7. Hard locks

| Lock | Result |
|------|--------|
| `OFFER_BOQ_SCHEMA_VERSION = 5` | **PASS** |
| quantity string / `""` / not null | **PASS** |
| merge / line-id / eligibility / OfferBoq | **PASS** (unchanged) |
| F5 / PackageGate / Cloud / DATA_KEYS / Payroll | **PASS** (unchanged; PayrollView OUT) |
| invent pricing / synthetic LP | **PASS** (none) |

---

## 8. Git safety @ PV

READ-ONLY verify · no code/test/docs mutations during PV · `PayrollView.tsx` OUT / pre-existing dirty · not in release.

---

## 9. Verdict

**OWNER VERIFY: PASS**
**MULTI-BOQ-NORMA-KALK P0: PRODUCTION VERIFIED / GREEN**
**EPIC (content): CLOSED** · docs commit/push = Owner GO follow-up
**Costing / F5 / Final Bid: NOT CLAIMED GREEN**
