# IK AUTONOMY-05 — Explicit AUTO / OFF / ON · PRODUCTION VERIFY

> **ID:** `IK-AUTONOMY-05-PRODUCTION-VERIFY`  
> **Date:** 2026-08-17  
> **Closeout:** [`IK-AUTONOMY-05-IMPLEMENTATION-CLOSEOUT.md`](./IK-AUTONOMY-05-IMPLEMENTATION-CLOSEOUT.md)  
> **DF:** [`IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md`](./IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-DESIGN-FREEZE.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · READ-ONLY  
> **EPIC:** **NOT CLOSED**

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.90** |
| Impl commit | **`44e81d202af2c512717fe7be9ddec43468aca760`** (`44e81d20`) |
| Live `version.json` | **2.66.90** / **`44e81d2`** ⊂ **`44e81d20`** |
| Deploy | **PASS** — Vercel Git Integration · origin/main · ID **`F9t4hD4kKmXNeV6zVL49ywJmiHwP`** |
| Live chunks | `index-Ct56AGmy.js` · `app-core-9m607fnF.js` · `TendersModule-DHh-x328.js` |
| Verdict | **PRODUCTION VERIFIED** |

```text
DEPLOY = PASS
PV     = PASS
2.66.90 / 44e81d20
```

---

## PV checks (PASS)

| Check | Result |
|-------|--------|
| Live version **2.66.90** / commit **`44e81d20`** | **PASS** |
| P5 AUTO → MODE A | **PASS** |
| P6 AUTO → MODE A | **PASS** |
| P5 OFF → HOLD | **PASS** |
| P6 OFF → HOLD | **PASS** |
| P5/P6 ON → MODE A | **PASS** |
| Research safety (AUTO ≠ Research) | **PASS** |
| Accept boundary | **PASS** — OWNER |
| Price Commit boundary | **PASS** — OWNER |
| Final Bid boundary | **PASS** — OWNER |
| D | **false** (HARD STOP · live KV + default) |
| P1 | **unchanged / `mat.inv.*` blocked** |
| P2 | **KEEP GAP** |
| Composite | **unchanged / idle** |
| F5 XOR | **`feedsP7Bid = false`** |
| CatalogWork | **471** |
| no new flag | **PASS** |
| no default bypass / `\|\| true` | **PASS** |
| production source = `44e81d20` | **PASS** |

---

## Live settings / hydration

Live KV `kw-app-settings`: klucze P5/P6 **absent** (nie boolean `true`/`false`).  
Production hydration = `mergeAppSettings(remote, defaultAppSettings())`:

| Lever | Live |
|-------|------|
| IK Entry | **ON** (P10 default; missing remote) |
| P5 | **AUTO** |
| P6 | **AUTO** |
| P5 Research | **false** |
| P6 Research | **false** |
| P7 F5 | **false** |
| D | **false** |

Live helper: `e==="AUTO"\|\|e==="ON"`.  
Live defaults: `ikLaborE2eEnabled:"AUTO"` · `ikMaterialE2eEnabled:"AUTO"`.  
Admin UI: select AUTO / ON / OFF + AUTONOMY-05 copy.

---

## Live host (IkEntryHost — existing binding)

TendersModule minify:

```text
P5: executeResearch:c===!0  + enableInternalFirst:!0
P6: executeResearch:u===!0
data-ik-p5-labor-e2e / data-ik-p6-material-e2e
data-ik-p5-labor-research / data-ik-p6-material-research
```

IK ON + BOQ READY + P5=AUTO + P6=AUTO → istniejący `useEffect` uruchamia MODE A **automatycznie**. Użytkownik **nie** musi ręcznie odpalać Labor/Material Expert per linia.

`executeResearch:!0` w bundlu występuje w helperze lease **wewnątrz już włączonego MODE B**, nie jako default hosta.

---

## Research safety

**KRYTYCZNE:** AUTO P5/P6 ≠ AUTO Research.

| Gate | Evidence |
|------|----------|
| Host | `executeResearch:c===!0` / `u===!0` (research flag only) |
| Experts | `executeResearch===!0` (`=== true` only) |
| Resolver | three booleans `=== true` · raw `"AUTO"` **not** research |
| Live KV | Research P5/P6 **false** |

Research HTTP w tym PV = **0** (kontrakt statyczny + runtime; bez wywołania HTTP).

---

## Paczka VII (behavior test — not composition proof)

| Probe | Result |
|-------|--------|
| Tender | `08decd1d-542e-312b-5fad-9500015f7011` |
| Master BOQ | **READY / 159** |
| Live `COMPOUND` / `BOTH_HOLD` | **0** |
| Consumer | **Composite consumer = IDLE / CORRECT** |

**T04 HIT+HIT jest fixture evidence.**

**Nie** pisać i **nie** claimować: live tender composition verified.  
**Nie** sugerować, że Material + Labor zostały na tej paczce automatycznie złożone.

AUTONOMY-05 PV weryfikuje kontrakt AUTO\|OFF\|ON, nie ponownie Composite.

---

## Write audit (PV)

| Action | Count |
|--------|-------|
| Accept | **0** |
| Price Commit | **0** |
| CatalogWork write | **0** |
| PM write | **0** |
| PRICE_DEMAND write | **0** |
| Research HTTP | **0** |
| Edge research lease | **0** |
| Tender mutation | **0** |
| Settings write | **0** |
| Edge `batch-get` | **read-only** (settings + tenders + catalog) |

---

## Regression (local, zero code change)

| Suite | Result |
|-------|--------|
| AUTONOMY-05 T01–T25 | **76 PASS / 0 FAIL** |
| P1 | **PASS** |
| P2 / P5.9 | **PASS** (**76 / 0**) |
| Composite | **PASS** |
| P0 `computePositionCost` | **46 / 0** |
| P10 | **26 / 0** |

`computePositionCost` **nie** wchodzi w commit `44e81d20`.

---

## Status

```text
PRODUCTION VERIFY = PASS
PRODUCTION        = 2.66.90 / 44e81d20
IK AUTONOMY-05    = PRODUCTION VERIFIED
P1                = CLOSED
P2                = KEEP GAP
Composite         = CLOSED · IDLE / CORRECT na Paczce VII
CatalogWork       = 471
D                 = false
EPIC              = NOT CLOSED

T04 HIT+HIT = fixture only
Paczka VII  = IDLE (COMPOUND/BOTH_HOLD = 0)
NO live Material+Labor composition claim
```
