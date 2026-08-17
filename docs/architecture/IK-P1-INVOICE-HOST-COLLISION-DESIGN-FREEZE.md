# IK P1 — Invoice Host Collision · DESIGN FREEZE

| Field | Value |
|-------|-------|
| **Status** | **DESIGN FREEZE** · READY FOR ARCH REVIEW |
| **Date** | 2026-08-17 |
| **Baseline tip** | Production **2.66.87** · commit **`7a32bb34`** |
| **CatalogWork** | **471** (must remain unchanged) |
| **P10** | COMPLETE / CLOSED |
| **P1 RCA** | ACCEPTED |
| **P1 PLAN** | ACCEPTED |
| **Scope** | G1 BOQ Product Mapper exclusion + G2 DIY Research hard-forbid `mat.inv.*` |
| **Mode** | Design Freeze only — **NO IMPLEMENT** in this document |

**Conflict check (DF ↔ RCA ↔ Owner ↔ code contracts):** **NONE.**  
Seed already states *„nie research sklepowy”*; helpers `isInvoicePurchaseCatalogWorkId` / `isInvoicePurchaseMaterialKey` already exist; Owner Q1–Q3 lock the same boundaries as RCA/PLAN.

---

## 1. Context

Real WM tender PACZKA V (`08decd21-9cc2-012f-5fad-9500015f70fa`, BOQ 178) proved:

- **371 / 471** CatalogWork entries are invoice purchase hosts (`cw.inv.*`).
- **3 / 178** BOQ lines bound to `cw.inv.*` / `mat.inv.*` via Product Mapper.
- Synthetic DIY query `mat.inv.*` reached Real Market Research (#3B).
- Invoice host semantics = **HISTORICAL PURCHASE / Price Memory**, not BOQ identity / DIY market material.

P1 closes the collision **without** removing hosts, deactivating Zygmunt seed, or rewriting Classification / Identity / Research engines.

---

## 2. RCA (frozen summary)

| Role | Cause |
|------|--------|
| **PRIMARY** | Product Mapper scores **all** active CatalogWork, including invoice hosts → `cw.inv.*` can become BOQ primary. |
| **SECONDARY** | `cw.inv.*` → `mat.inv.*` + synthetic `labelPl` + `mat.*` research short-circuit + `researchEligible` allows UNKNOWN. |
| **BACKSTOP** | Accept/UI does not clearly expose invoice-purchase origin (**out of P1 closure**). |

**Chain (before):**

```text
BOQ → Product Mapper → cw.inv.* → mat.inv.* → synthetic labelPl
  → UNKNOWN / UNRESOLVED → researchEligible=true → mat.* short-circuit → DIY Research
```

---

## 3. Owner Decisions Q1–Q4

| ID | Question | OWNER DECISION |
|----|----------|----------------|
| **Q1** | May `cw.inv.*` be BOQ primary? | **NIE.** |
| **Q2** | Does `cw.inv.*` ↔ `mat.inv.*` remain PM / purchase identity? | **TAK.** |
| **Q3** | May `mat.inv.*` enter DIY market Research? | **NIE** — **HARD-FORBID**. |
| **Q4** | LP130 lexical overlap? | **POZA SCOPE P1** — no extra design. |

---

## 4. G1 — Frozen design (PRIMARY)

### 4.1 SSOT

| Item | Value |
|------|--------|
| **File** | `src/lib/tender-offer-boq-mapping.ts` |
| **Functions** | `mapOfferBoqLine` / `mapOfferBoqLineCore` |
| **Helper (REUSE)** | `isInvoicePurchaseCatalogWorkId(work.id)` from `src/lib/price-intelligence/invoice-purchase-host.ts` |

### 4.2 Behavior

**Before** `scoreWorkAgainstLine`:

```text
works (from ctx)
  → filter OUT isInvoicePurchaseCatalogWorkId(work.id)
  → scoring
  → primary / candidates
```

### 4.3 Atomicity

- **One** SSOT exclusion in the mapper path.
- **Do NOT** scatter filters across IK Material / Labor / Identity / Multi-BOQ / Explainability callers.
- Callers that use `mapOfferBoqLine` inherit exclusion automatically.

### 4.4 Invoice hosts remain

| Allowed | Forbidden (G1) |
|---------|----------------|
| `active: true` in CatalogWork | BOQ Product Mapper scoring participation |
| Price Memory / purchase identity | Becoming BOQ **primary** identity |
| Invoice purchase Accept path | |
| CatalogWork count **471** | Seed `active:false` / deletion / cleanup |

### 4.5 Explicitly NOT G1

- Global filter in `listActiveWorksForRegion`
- Zygmunt seed mutation
- CatalogWork deletion or count change
- Changing `resolveDemandProductIdentityExact` PM branch

---

## 5. G2 — Frozen design (SECONDARY)

### 5.1 Semantic contract

| Key | Means |
|-----|--------|
| `mat.inv.*` | HISTORICAL PURCHASE / INVOICE HOST |
| DIY market material | Non-invoice `mat.*` (legal market / BOM path) |

**Invariant:** `mat.inv.*` ≠ DIY market material.

### 5.2 Helper (REUSE ONLY)

`isInvoicePurchaseMaterialKey()` — **NO NEW HELPER.**

### 5.3 Dual enforcement (mandatory)

| Locus | File | Effect |
|-------|------|--------|
| `researchEligible(...)` | `src/lib/intelligent-estimator/ik-material-expert.ts` | No pending DIY research for `mat.inv.*` |
| `assertMaterialResearchAllowed(...)` | `src/lib/intelligent-estimator/classification-gate.ts` | Phase2 DIY Research **BLOCK** for `mat.inv.*` |

**Result:** zero pending Research **and** zero Phase2 DIY HTTP for `mat.inv.*`.

### 5.4 Must NOT change (G2)

- Global `mat.*` gate (legal non-invoice `mat.*` remains researchable)
- `resolveDemandProductIdentityExact` (Q2 — PM / purchase identity stays)
- Price Memory / invoice Accept path
- BOQ description as new Research query fallback (**out of P1**)

### 5.5 G2 does not replace G1

Primary fix stops **BOQ → invoice host**.  
Secondary stops **invoice material → DIY Research** if identity still appears.

---

## 6. SSOT boundaries

| Concern | SSOT |
|---------|------|
| BOQ line → CatalogWork primary | Product Mapper (`tender-offer-boq-mapping.ts`) |
| Invoice host detection (work id) | `isInvoicePurchaseCatalogWorkId` |
| Invoice material detection | `isInvoicePurchaseMaterialKey` |
| PM / purchase identity `cw.inv`↔`mat.inv` | `resolveDemandProductIdentityExact` (**unchanged**) |
| DIY Research allow/deny | `researchEligible` + `assertMaterialResearchAllowed` |
| Invoice host storage | Zygmunt seed / CatalogWork (**unchanged**) |

---

## 7. Data flow — before / after

### Before

```text
active CatalogWork (incl. invoice hosts)
  → BOQ scoring
  → cw.inv.* primary
  → mat.inv.* + synthetic labelPl
  → UNKNOWN
  → researchEligible=true
  → mat.* short-circuit
  → DIY Research
```

### After

```text
active CatalogWork (incl. invoice hosts — still in store)
  → mapper excludes invoice hosts from scoring pool
  → canonical / non-invoice candidates only
  → BOQ identity without cw.inv.* primary

Separately, if mat.inv.* ever appears:
  → researchEligible=false
  → assertMaterialResearchAllowed=false
  → NO DIY HTTP

PM path (unchanged):
  cw.inv.* ↔ mat.inv.* → Price Memory

Invoice purchase Accept (unchanged).
```

---

## 8. Acceptance criteria

| ID | Criterion |
|----|-----------|
| **A1** | `cw.inv.*` cannot become BOQ primary |
| **A2** | Canonical CatalogWork still binds |
| **A3** | Invoice Price Memory still works |
| **A4** | CatalogWork **= 471** |
| **A5** | `mat.inv.*` cannot execute DIY Research |
| **A6** | Normal (non-invoice) `mat.*` can still execute legal Research |
| **A7** | UNKNOWN global behavior unchanged |
| **A8** | D diff = 0 |
| **A9** | Labor / F5 / Chief engines unchanged (shared mapper exclusion is intentional for BOQ bind) |
| **A10** | Accept remains manual |
| **A11** | No invented prices |
| **A12** | No unit remapping |
| **A13** | No new engines |
| **A14** | Existing invoice helpers reused |

---

## 9. Test matrix (IMPLEMENT phase — not now)

| # | Proof |
|---|--------|
| 1 | Mapper unit tests |
| 2 | Invoice host exclusion from scoring / primary |
| 3 | Canonical mapping still PASS |
| 4 | PM invoice path PASS |
| 5 | `mat.inv.*` Research BLOCK |
| 6 | Legal non-invoice `mat.*` Research still legal |
| 7 | PACZKA V regression (below) |
| 8 | P0–P10 / IK regression smoke |
| 9 | CatalogWork = 471 |
| 10 | D diff = 0 |
| 11 | No business writes in harness proofs |
| 12 | No Accept |

### PACZKA V frozen cases

Tender: `08decd21-9cc2-012f-5fad-9500015f70fa` · 178 lines

| LP | Requirement |
|----|-------------|
| **LP6** | Must NOT remain BOQ primary on `cw.inv.50`; must NOT reach DIY Research as `mat.inv.50` |
| **LP130** | Must NOT remain BOQ primary on `cw.inv.h_tr_40` (Q4 lexical semantics **out of scope**) |
| **LP136** | Must NOT remain BOQ primary on `cw.inv.50`; must NOT reach DIY Research as `mat.inv.50` |
| **LP4** | Canonical labor path (`cc-w2-oczyszczenie-podloza`) must remain functional |

---

## 10. Non-goals (frozen)

Do **not** change in P1:

- CatalogWork count / Zygmunt seed / invoice host records  
- Price Memory rewrite  
- `resolveDemandProductIdentityExact` PM branch  
- Global `mat.*` gate  
- UNKNOWN semantics / Classification V2 / Identity V2 / Research V2  
- Labor engine / F5 / Chief / D / Accept flow  
- UI backstop (invoice chip) — optional later, **not** P1 closure  
- BOQ description as Research query fallback  
- Q4 special-case design for LP130  

---

## 11. Rollback

- Pure **git revert** of IMPLEMENT commit(s).  
- No data migration.  
- No KV migration.  
- No CatalogWork mutation.

---

## 12. Architecture invariants

```text
Invoice Purchase Host     ≠  BOQ Identity
Invoice Purchase Material ≠  DIY Market Material
Price Memory              ≠  Market Research
Research Evidence         ≠  OUR RATE
Research                  ≠  Accept
GAP                       ≠  0 PLN
UNKNOWN                   ≠  automatic market absence
```

---

## 13. Implementation sequence (after Owner IMPLEMENT GO)

1. Confirm this DF still matches tip / Owner decisions.  
2. IMPLEMENT G1 in `tender-offer-boq-mapping.ts` (single SSOT filter).  
3. IMPLEMENT G2 in `researchEligible` + `assertMaterialResearchAllowed`.  
4. Unit + PACZKA V MODE A regression (LP6 / 130 / 136 / 4).  
5. PM + legal `mat.*` + CatalogWork 471 + D=0 smoke.  
6. Changelog / tip bump per project release rules.  
7. Commit / push / verify — **only** after Owner IMPLEMENT GO.  
8. UI backstop — separate ticket (not required for P1 close).

**This document does not authorize IMPLEMENT.**

---

## Status

**P1 DESIGN FREEZE READY FOR ARCH REVIEW**

| Forbidden in DF phase | |
|-----------------------|--|
| Product code changes | YES forbidden |
| Tests implementation | YES forbidden |
| Commit / push / deploy | YES forbidden |

Next gate: **Owner / Arch GO → IMPLEMENT** (separate prompt).
