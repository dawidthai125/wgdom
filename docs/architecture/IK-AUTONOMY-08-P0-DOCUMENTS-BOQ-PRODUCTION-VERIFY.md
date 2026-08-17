# IK AUTONOMY-08 P0 — Documents → BOQ Autonomous Activation  
## PRODUCTION VERIFY

> **ID:** `IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-PRODUCTION-VERIFY`  
> **Date:** 2026-08-17  
> **Closeout:** [`IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-08-P0-IMPLEMENTATION-CLOSEOUT.md) · evidence alias [`IK-AUTONOMY-08-P0-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P0-PRODUCTION-VERIFY.md)  
> **Owner Verify:** [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-OWNER-VERIFY.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-OWNER-VERIFY.md)  
> **DF:** [`IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P0-DOCUMENTS-BOQ-DESIGN-FREEZE.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · READ-ONLY · **ZERO SETTINGS WRITE**  
> **EPIC:** AUTONOMY-08 — P0 · **EPIC NOT CLOSED**

```text
PRODUCTION VERIFY          = PASS
P0 CONTRACT                = VERIFIED
REAL TENDER P2 RUNTIME     = NOT OBSERVABLE
Production                 = 2.66.93 / b98e68e5
Code after deploy          = ZERO
Settings writes            = 0
Business writes            = 0
Research                   = 0
Documentation              = READY FOR OWNER APPROVAL
COMMIT docs                = NOT DONE
PUSH docs                  = NOT DONE
```

---

## 1. Production Baseline

| Field | Value |
|-------|-------|
| Expected UI | **2.66.93** |
| Impl / live commit | **`b98e68e5713c49a2c290cff0269f808d4765a7ab`** (`b98e68e5` / live `b98e68e`) |
| Subject | `feat(ik): enable autonomous documents boq` |
| Source | **origin/main** @ `b98e68e5` |
| Environment | Production · https://www.wgdom.fun |
| Prior tip (A07) | 2.66.92 / `6165029` (docs) · feature `0f994437` |

OD-08-1 (LOCKED): IK ON ⇒ Documents→BOQ. Runtime gate = `isIkP2DocumentsBoqActive()` := `ikEntryEnabled === true`. Leftover `ikAutoIngestEnabled` is **not** a runtime gate.

---

## 2. Deployment

| Field | Value |
|-------|-------|
| Path | Vercel Git Integration · `git push origin main` |
| Deployment ID | **`2B6ddxCxfxx4FQNmQpzL7W3fnA2X`** |
| Dashboard | https://vercel.com/dawidthai125s-projects/wgdom/2B6ddxCxfxx4FQNmQpzL7W3fnA2X |
| Status | **success** |
| GitHub deployment | `5950924420` |
| Built at | `2026-08-17T20:36:35.967Z` (`version.json` timestamp) |
| Local WIP | **NOT DEPLOYED** |

---

## 3. Live Version Verification

`GET https://www.wgdom.fun/version.json` (one-shot):

```json
{ "version": "2.66.93", "commit": "b98e68e", "timestamp": "2026-08-17T20:36:35.967Z" }
```

| Check | Result |
|-------|--------|
| `version = 2.66.93` | **PASS** |
| `commit = b98e68e` ⊂ `b98e68e5` ⊂ `b98e68e5713c49a2c290cff0269f808d4765a7ab` | **PASS** |
| Other commit | **NO** → PV not blocked |

---

## 4. Live Bundle Verification

| Chunk | Hash |
|-------|------|
| index | `index-BClFFCUn.js` |
| app-core | `app-core-Bm8-4EDp.js` |
| TendersModule | `TendersModule-Bx9NwXU7.js` |

**Helper (TendersModule, not tree-shaken):**

```text
function An(){return tn().ikEntryEnabled===!0}   // isIkEntryEnabled
function bE(){return An()===!0}                  // isIkP2DocumentsBoqActive
```

`isIkP2DocumentsBoqActive` appears as a **string** in changelog (`app-core`). The runtime function is minified to `bE`.  
`isIkAutoIngestEnabled()` **absent** from TendersModule. Leftover **field** `ikAutoIngestEnabled:!1` remains in default AppSettings (`index`).

**Host binding (`IkEntryHost` = minified `Zne`):**

```text
const i=bE()===!0, ...
k.useEffect(()=>{
  if(!i){ y(null), h(!1); return }
  ...
  if(!rm(e) || ...) return          // needsIkNg02Ingest
  const _=await LD({ item, package, athPreviewEnabled, ensureDocuments })
  t(_.itemPatch,{persist:"local"})
  extractedLineCount>0 && t(_.itemPatch,{persist:"cloud"})
},[i,e,f,t,a,n,...])
"data-ik-p2-documents-boq": i?"1":"0"
```

`runIkNg02IngestBridge` is minified to `LD` (export name stripped). Persist local+cloud **UNCHANGED**. Same `useEffect` as P2.

**MUST NOT leftover as P2 gate:** **PASS** — host calls `bE()` (Entry-only). No `ikAutoIngestEnabled===!0` in TendersModule.

---

## 5. P2 Activation Contract

| Case | Evidence |
|------|----------|
| IK ON → helper true | SOURCE + harness T02 · live minify `bE = An()===!0` |
| IK OFF → helper false | live KV Entry `false` → `isIkP2DocumentsBoqActive() === false` |
| leftover `true` does **not** activate P2 | live KV `ikAutoIngestEnabled=true` **and** Entry `false` → P2 **false** |
| leftover `false` does **not** block P2 | harness T03 · helper ignores leftover |
| Host uses helper, not leftover reader | `i=bE()===!0` · `if(!i) return` |

**PRZED:** IK ON ∧ `ikAutoIngestEnabled === true` → Documents→BOQ.  
**PO:** IK ON → Documents→BOQ. Leftover key ignored at runtime.

---

## 6. Legacy `ikAutoIngestEnabled`

| Layer | Status |
|-------|--------|
| AppSettings field | **RETAINED** · default `false` (`ikAutoIngestEnabled:!1` in live index) |
| Load / merge | **UNCHANGED** (08-P0 comment only in SOURCE) |
| KV migration | **NOT DONE** (correct) |
| Live stored | **`true`** (PRE-EXISTING leftover preference) |
| Runtime gate | **NO** |
| Leftover function `isIkAutoIngestEnabled` | **tree-shaken** from TendersModule |
| Admin checkbox `data-ik-auto-ingest-toggle` | **ABSENT** |

Live leftover `true` is **not** a P0 failure. It proves the gate is Entry-only: leftover ON + Entry OFF ⇒ P2 OFF.

---

## 7. Admin UI

Live `app-core` + Admin modal:

| Check | Result |
|-------|--------|
| `data-ik-auto-ingest-toggle` | **ABSENT** |
| `data-ik-entry-toggle` | **PRESENT** — IK / Przetargi remains the business switch |
| Copy | „Po włączeniu Inteligentny Kosztorysant automatycznie rozpoczyna analizę przetargu **od dokumentów i przygotowania BOQ**.ˮ |
| P3–P8 / Research selects | **still visible** — **08-P1** · not this PV |

Leftover host attribute `data-ik-entry-auto-ingest` still mirrors `i` (same as `data-ik-p2-documents-boq`). **NON-BLOCKING** (Owner Verify F3). Not a second business switch.

---

## 8. Live IK State

READ `POST …/batch-get` keys: `kw-app-settings` · `kw-tenders-pipeline` · `kw-wgdom-work-catalog`. **No batch-set.**

| Lever | Live stored |
|-------|-------------|
| `ikEntryEnabled` | **`false`** |
| `ikAutoIngestEnabled` | **`true`** (leftover · not a gate) |
| P5 / P6 Research | **`false`** |
| P7 `ikF5E2eEnabled` | **`"AUTO"`** (A06 UNCHANGED) |
| P8 `ikRiskDecisionE2eEnabled` | **`"AUTO"`** (A07 UNCHANGED) |
| P3 `ikIdentityCoverageEnabled` | **`true`** PRE-EXISTING · not flipped this PV |
| D `expertAiDecydentEnabled` | **`true`** PRE-EXISTING (A07 F4) · **not** written by 08-P0 |

Runtime from live KV (in-memory hydrate, no save):

```text
liveP2 = false     // Entry false, leftover true ignored
liveP7 = false
liveP8 = false
liveP5R = false
liveP6R = false
```

**IK was not turned ON.** No settings write.

---

## 9. Runtime Observability

| Probe | Result |
|-------|--------|
| Live IK Entry | **OFF** |
| P2 host `useEffect` | would no-op (`if(!i) return`) if host mounted |
| Host mount | IK OFF → `IkEntryHost` **not** mounted (`ikEntryOn && activeTab === "przetarg"`) |
| Real Documents→BOQ activation | **NOT OBSERVABLE** |

This is **not** a PV failure. Contract is verified from live bundle + live KV (leftover true ≠ P2).

**Claim (exact):**

> Production P0 contract verified; real-tender P2 runtime execution was NOT OBSERVABLE because IK Entry was OFF and no settings change was performed.

---

## 10. Safety

| Lock | Result |
|------|--------|
| D code default | **`false`** (`expertAiDecydentEnabled:!1` in live defaults). Live KV D=`true` is **PRE-EXISTING**, not 08-P0. |
| P1 | **CLOSED** · `mat.inv.50` blocked · `isInvoicePurchaseMaterialKey` in bundle |
| P2 identity | **KEEP GAP** · zawór / odpowietrzający `PRODUCT_IDENTITY_GAP` |
| Composite | **CLOSED** · `feedsP7Bid:!1` |
| P7 | **UNCHANGED** · `AE()` still Entry ∧ F5 AUTO/ON · `runIkP7` path intact |
| P8 | **UNCHANGED** · `RE()` still Entry ∧ Risk AUTO/ON |
| A05 / A06 / A07 | **UNCHANGED** · harness nested PASS |
| CatalogWork | **471** |
| `\|\| true` on P2 helper | **NONE** · `bE(){return An()===!0}` |
| New engine / flag / orchestrator / bypass | **NONE** |
| Commit engine diff | `ik-ng02-ingest-bridge.ts` · `ik-document-expert.ts` · P7 · P8 · Composite = **empty** |

Research still `executeResearch===!0` on P5/P6 only (MODE B). 08-P0 does not set it.

---

## 11. Write Audit

| Action | Count |
|--------|-------|
| Settings writes | **0** |
| Research HTTP | **0** |
| Research lease | **0** |
| Accept | **0** |
| Price Commit | **0** |
| Final Bid | **0** |
| Tender mutation | **0** |
| PM write | **0** |
| CatalogWork write | **0** |
| Edge `batch-get` | **1** (read-only) |
| GET version / HTML / JS | allowed |

Forbidden `batch-set` / research / lease URLs: **0 attempts**.

---

## 12. Regression

`npx vite-node scripts/test-ik-autonomy-08-p0-documents-boq.mjs`

**61 PASS / 0 FAIL**

| Suite | Result |
|-------|--------|
| T01–T26 P0 contract | **PASS** |
| T11 A05 | **PASS** |
| T12 A06 | **PASS** |
| T13 A07 | **PASS** |
| T14 P1 invoice | **PASS** |
| T15 P2 identity p59 | **PASS** |
| T16 Composite | **PASS** |
| C1 P1-entry · C2 P25 · P2/P3 implementation | **PASS** |

Dedicated nested P6/P7 MMR (if any in child suites) = **PRE-EXISTING / OUT OF SCOPE** · not an 08-P0 regression. P0 harness reported all child suites PASS.

---

## 13. Paczka VII / Real Tender

| Probe | Result |
|-------|--------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` |
| Master BOQ (read Document Expert on fetched item) | **READY / 159** |
| CatalogWork | **471** |
| P2 live ingest this PV | **NOT RUN** · IK OFF · no settings write |

BOQ READY/159 is **pre-existing** pipeline state (read-only). It is **not** evidence that 08-P0 executed ingest on this PV.

---

## 14. Findings

| ID | Finding | Status |
|----|---------|--------|
| **F1** | Owner Verify noted live SHA `6165029` vs UI 2.66.92 | **CLOSED by this deploy** · now 2.66.93 / `b98e68e` |
| **F2** | P3–P8 still visible in Admin | **NON-BLOCKING** · **08-P1** |
| **F3** | Leftover DOM `data-ik-entry-auto-ingest` | **NON-BLOCKING** · bound to same `i` as P2 · not a business checkbox |
| **F4** | T02 third assert tautology | **NON-BLOCKING** · harness not rewritten this PV |
| **F5** | Live KV `expertAiDecydentEnabled=true` | **PRE-EXISTING** (A07 F4) · 08-P0 did not flip D |
| **F6** | Live leftover `ikAutoIngestEnabled=true` | **PRE-EXISTING stored key** · **not** a runtime gate · P2 still false |
| **F7** | Live `ikIdentityCoverageEnabled=true` | **PRE-EXISTING** · P3 not in 08-P0 scope · not flipped |

**Blocking findings = 0.**

---

## 15. Final Verdict

| Check | Result |
|-------|--------|
| Live version 2.66.93 / commit `b98e68e` | **PASS** |
| Bundle P2 helper = Entry only | **PASS** |
| Host `useEffect` gates on helper | **PASS** |
| Leftover ingest not a runtime gate | **PASS** (live leftover true + Entry false → P2 false) |
| Admin AUTO_INGEST removed | **PASS** |
| Safety locks | **PASS** |
| Write audit | **0** |
| Regression 61/0 | **PASS** |
| Real P2 runtime | **NOT OBSERVABLE** (IK OFF) |

```text
PRODUCTION VERIFY = PASS
Production        = 2.66.93 / b98e68e5
P0 CONTRACT       = VERIFIED
P2 RUNTIME        = NOT OBSERVABLE
Code after deploy = ZERO
Settings writes   = 0
Business writes   = 0
Research          = 0
Documentation     = READY FOR CLOSEOUT
EPIC              = AUTONOMY-08 — P0
```

**P0 CONTRACT VERIFIED** ≠ **P2 REAL-TENDER RUNTIME OBSERVED.**

> Production P0 contract is verified. Real P2 runtime execution was not observable because IK Entry was OFF and no settings change was performed during PV.

**Do not** describe NOT OBSERVABLE as failure.  
**Do not** flip live IK to manufacture runtime evidence.

NEXT: **OWNER GO → DOCUMENTATION COMMIT**. No further deploy. 08-P1 **NOT STARTED**.
