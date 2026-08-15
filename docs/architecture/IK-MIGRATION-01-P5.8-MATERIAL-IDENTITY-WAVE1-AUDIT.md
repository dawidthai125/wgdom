# IK-MIGRATION-01 P5.8 — Material Identity Coverage (Wave1 Owner Norm)

**Status:** AUDIT COMPLETE · **NO IMPLEMENTATION**  
**Date:** 2026-08-15  
**Baseline:** P5-REAL PARTIAL (`b4633f9e`) · tip UI 2.66.72  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37` · Master BOQ **430**  
**Mode:** AUDIT → RCA → PLAN · Owner GO required before any code

---

## 1. What is Wave1? (this P5.8 sense)

**Wave1 here ≠ IE Labor IR Wave1.**

It is **OUR-RATE-BOM-COVERAGE-01 Wave 1 — MATERIALS_REQUIRED**:

| Concept | SSOT file |
|---------|-----------|
| MATERIALS_REQUIRED work IDs | `src/lib/tender-position-cost/labor-only-classification.ts` → `OWNER_MATERIALS_REQUIRED_WORK_IDS` |
| PENDING_OWNER_NORM rows | `src/lib/tender-position-cost/wave1-materials-required.ts` → `WAVE1_MATERIALS_REQUIRED_PENDING` |
| Plane COMPOUND (Owner) | `src/lib/intelligent-estimator/owner-classification-map.ts` + closeout `INTELLIGENT-ESTIMATOR-LABOR-MATERIAL-FLOW-OWNER-DECISION-CLOSEOUT.md` |
| Alias bind (Work Identity) | `src/lib/catalog-coverage/alias-pack-wave1.ts` (`cc-p0c-w1-*`) |
| Product / mat.* identity | `src/lib/pricing-expert/material-market-map.ts` → `resolveDemandProductIdentityExact` |
| BOM / TechnologyPack | `src/lib/tender-position-cost/bom-technology-adapter.ts` · `listWave1RegisteredMaterialsPacks()` → **[]** |

Registered Wave1 material packs today: **0** (`listWave1RegisteredMaterialsPacks(): never[]`).

---

## 2. PENDING_OWNER_NORM — meaning (code path)

```text
Owner MATERIALS_REQUIRED workId
  → isWave1MaterialsRequiredPending(workId) === true
  → reason: brak Owner-approved normy (qtyFactor + materialKey)
  → NO TechnologyPack registered
  → BOM GAP if Position Cost asked for materials
  → Material Expert: resolveDemandProductIdentityExact → null
  → researchEligible false (no materialIdentity)
  → P5-REAL coverage: NO_MATERIAL_COMPONENT
```

**Not** a Price Memory miss. **Not** a research failure. Identity/BOM norm is missing.

Pending rows (exact SSOT):

| workId | unit | reasonPl |
|--------|------|----------|
| `cc-p0c-w1-zabezpieczenie-folia` | m2 | Brak normy zużycia folii (m2 → materialKey) |
| `cc-p0c-w1-zaprawianie-bruzd` | mb | Brak normy zaprawy (mb → materialKey) |

**Focus note:** only **zaprawianie** appears in ZZK focus. Folia is Wave1 pending but **not** in the 6 focus lines.

---

## 3. Two blockers (do not collapse)

| Group | Lines | Plane | Wave1 PENDING? | Why NO_MATERIAL_COMPONENT |
|-------|-------|-------|----------------|---------------------------|
| **A — Odpowietrznik** | 2 | MATERIAL | **false** | Work Identity OK (`cc-p0c-w1-zawor-odpowietrzajacy`) but **no** `mat.*` / `cw.product.*` / exact alias → `resolveDemandProductIdentityExact` = **null** |
| **B — Zaprawianie** | 4 | COMPOUND | **true** | MATERIALS_REQUIRED + PENDING_OWNER_NORM + **0** TechnologyPacks + no mat.* |

Pricing-plane MATERIAL ≠ Product Mapper material identity.

---

## 4. Focus lines (6/6)

| lineId | dwelling | branch | unit | qty | workId | plane | PENDING | packs | materialIdentity | next |
|--------|----------|--------|------|-----|--------|-------|---------|-------|------------------|------|
| `obl_95b8d9fa` | kotlarska | sanitary | szt. | 3 | zawor-odpowietrzajacy | MATERIAL | no | [] | null | Owner product map |
| `obl_f676979e` | ptasia | sanitary | szt. | 2 | zawor-odpowietrzajacy | MATERIAL | no | [] | null | Owner product map |
| `obl_26853c8f` | ptasia | electrical | m | 14.5 | zaprawianie-bruzd | COMPOUND | **yes** | [] | null | Owner norm (key+factor) |
| `obl_c37c8c1f` | ptasia | electrical | m | 69.44 | zaprawianie-bruzd | COMPOUND | **yes** | [] | null | Owner norm |
| `obl_9829c554` | zernicka | electrical | m | 8.5 | zaprawianie-bruzd | COMPOUND | **yes** | [] | null | Owner norm |
| `obl_4e8f0754` | zernicka | electrical | m | 114.24 | zaprawianie-bruzd | COMPOUND | **yes** | [] | null | Owner norm |

Description A: *Montaż odpowietrzników automatycznych… DN 20 mm*  
Description B: *Zaprawianie bruzd o szer. do 100 mm*  
(BOQ unit `m` vs catalog unit `mb` — separate unit topic; **not** inventing conversion here.)

Exact identity probe (audit): both workIds → `resolveDemandProductIdentityExact` = **null**.

---

## 5. PENDING_OWNER_NORM outcomes (A–E)

| Outcome | Applies? | Evidence |
|---------|----------|----------|
| **A** Approve existing mapping | **NO** | No existing mat.* / pack for these workIds |
| **B** Choose among existing mappings | **NO** | Empty candidate set in Product Mapper for these texts/workIds |
| **C** Identity exists, needs normalize | **PARTIAL (zawór only)** | Plane MATERIAL + Alias Work Identity exist; Product Mapper identity missing |
| **D** No material identity | **YES (all 6)** | `materialIdentity: null` |
| **E** New catalog / TechnologyPack required | **YES after Owner GO** | Wave1 packs = []; no `mat.odpowietrznik` / zaprawa mortar key in market map |

---

## 6. Owner Decision table (NO IMPLEMENT)

| SOURCE | CURRENT STATE | AVAILABLE IDENTITY | REQUIRED DECISION | EXPECTED RESULT |
|--------|---------------|--------------------|-------------------|-----------------|
| 2× zawór lines + work `cc-p0c-w1-zawor-odpowietrzajacy` | MATERIAL plane · Work Identity OK · mat.* null | none | Owner: (1) approve **product** `cw.product.*`/`mat.*` for odpowietrznik DN20, **or** (2) split BOQ “Montaż…” → LABOR + separate product line, **or** (3) HOLD | trusted `materialIdentity` → then Price Memory/research |
| 4× zaprawianie + work `cc-p0c-w1-zaprawianie-bruzd` | COMPOUND · PENDING_OWNER_NORM · packs [] | none | Owner: provide **materialKey** + **qtyFactor** (mb/m BOQ → mortar) for TechnologyPack; **or** HOLD | pack registered → BOM + materialIdentity path |
| Folia Wave1 (not in focus) | PENDING_OWNER_NORM | none | Same pattern as zaprawianie (out of ZZK focus) | — |

**Forbidden until GO:** Castorama/LM/OBI pick · description→SKU · Work→arbitrary mat.

---

## 7. Incidental full-BOQ (proof Material Expert works)

`executeResearch: false` audit dump — **6** identities, all **invoice hosts** `cw.inv.*` ↔ `mat.inv.*`:

| lineId | dwelling | materialKey | priceStatus | PLN |
|--------|----------|-------------|-------------|-----|
| `obl_1f4b027b` | nasturcjowa | `mat.inv.8816113ext` | PRICE_MEMORY_HIT | 23.08 |
| `obl_f85b75b8` | common_wentylacja | `mat.inv.50` | MISS path (no research in audit) | — |
| `obl_c44b7bd9` | ptasia | `mat.inv.h0000d11vz4` | HIT | 0.75 |
| `obl_77f21283` | ptasia | `mat.inv.h0000d11vz4` | HIT | 0.75 |
| `obl_1960fbbe` | zernicka | `mat.inv.h0000d11vz4` | HIT | 0.75 |
| `obl_7e8160bc` | zernicka | `mat.inv.h0000d11vz4` | HIT | 0.75 |

Prior P5-REAL with research: MISS on `mat.inv.50` → 1 research call · 0 candidates (honest GAP).

**TRUSTED MATERIAL = 6** on this tender = these invoice identities — **not** the P4 focus 6.

---

## 8. Exact blocker

```text
Focus 6 cannot enter Price Memory / Phase2 because
resolveDemandProductIdentityExact returns null.

Zaprawianie (4): Owner Wave1 norm (materialKey + qtyFactor) missing.
Zawór (2): Owner product mapping Work/Alias → mat.* missing
           (plane MATERIAL alone is insufficient).

Material Expert path itself is PROVEN by incidental mat.inv.*.
Do NOT rebuild Material Expert.
```

## 9. Reuse path (after Owner GO)

1. Owner GO on table §6  
2. Thin registration: TechnologyPack and/or Owner-approved `mat.*` ↔ product work (SEARCH BEFORE CREATE)  
3. Re-run **P5-REAL** (Price Memory → research only on MISS)  
4. Still ZERO invent / ZERO auto-Accept  

**NEW CODE NOW:** **NO**  
**NEW CODE AFTER OWNER GO:** likely **YES** (thin allowlist / pack register only — not Material Expert V2)

---

## 10. Gates

| Gate | Result |
|------|--------|
| A | **PASS** — `ikEntryEnabled=false` → `ng10_gate` |
| B | **PASS** — real tender focus 6 + Wave1 SSOT + incidental 6 measured |

NG-10 **RETAINED** · ATH writer **GAP** · Pricing **NO** · Research **NO** · Auto-Accept **NO**

---

## Coverage report

| Metric | N |
|--------|---|
| MASTER BOQ | 430 |
| TRUSTED WORK | 44 |
| TRUSTED MATERIAL (tender) | 6 (all `mat.inv.*`, incidental) |
| FOCUS MATERIAL INPUT | 6 |
| FOCUS MATERIAL IDENTITY | 0 |
| PENDING_OWNER_NORM (focus) | 4 |
| NO_MATERIAL_COMPONENT | 6 |
| MATERIAL IDENTITY GAP (focus) | 6 |
| Existing Product Mapper mappings for focus | 0 |
| Owner decisions required | **2 groups** (zawór product map · zaprawianie norm) |

**FINAL:** P5.8 MATERIAL IDENTITY AUDIT = **COMPLETE**

**NEXT:** Owner Decision on Wave1 material normalization / odpowietrznik product map → then P5-REAL again.
