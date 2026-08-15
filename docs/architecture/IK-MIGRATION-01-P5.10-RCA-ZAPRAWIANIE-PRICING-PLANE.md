# IK-MIGRATION-01 P5.10-RCA — Zaprawianie bruzd · Correct Pricing Plane

**Status:** AUDIT COMPLETE · **NO IMPLEMENTATION**  
**Date:** 2026-08-15  
**Baseline:** P5.9 `8d6e7e92` · P4-REAL live dump  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`  
**CODE CHANGED:** **NO**

---

## Owner domain correction (input)

> „Zaprawianie (szpachlowanie i tynkowanie) bruzd po instalacjach”  
> = **ROBOTA / USŁUGA / ROBOCIZNA**  
> **15–45 PLN/mb** = **LABOR/SERVICE PRICE EVIDENCE**  
> ≠ materialKey · ≠ qtyFactor · ≠ Material Price Memory

---

## 1. Four real lines (ZZK · measured)

| lineId | dwelling | LP | qty | unit (source) | catalog unit | Work Identity | branch | plane (now) |
|--------|----------|----|-----|---------------|--------------|---------------|--------|-------------|
| `obl_26853c8f` | ptasia | 7 | 14.5 | m | mb | `cc-p0c-w1-zaprawianie-bruzd` | electrical | **COMPOUND** |
| `obl_c37c8c1f` | ptasia | 20 | 69.44 | m | mb | same | electrical | **COMPOUND** |
| `obl_9829c554` | zernicka | 7 | 8.5 | m | mb | same | electrical | **COMPOUND** |
| `obl_4e8f0754` | zernicka | 20 | 114.24 | m | mb | same | electrical | **COMPOUND** |

Catalog name: *Zaprawianie / zamurowanie bruzd*  
Alias Pack Wave1 binds BOQ “zaprawianie bruzd…” → this workId (Negation Guard preserved).

---

## 2. Classification RCA (why COMPOUND → material opportunity)

### Causal chain (existing contracts — REUSE)

```text
Alias Pack → workId cc-p0c-w1-zaprawianie-bruzd
  → ESTIMATOR_OWNER_CLASSIFICATION_MAP[workId] = COMPOUND
     (Owner Decision Closeout: “Zaprawianie + materiał zaprawy; MATERIALS_REQUIRED”)
  → classifyEstimatorPricingPlane → OWNER_SEED · COMPOUND · HOLD
     allowLaborCatalogLookup = false
     allowLaborResearch = false
     allowMaterialCatalogLookup = false
     allowMaterialResearch = false
  → P4 Labor Expert: bucket BOTH · lookup/research ONLY if bucket===LABOR
     → rateStatus = NONE (4/4) · LABOR CURRENT HIT = 0 · LABOR RESEARCH = 0
  → P5 Material Expert / P5-REAL focus: plane COMPOUND counted as material input
     → no mat.* / no TechnologyPack
     → NO_MATERIAL_COMPONENT · Wave1 PENDING_OWNER_NORM
  → P5.9: PENDING_OWNER_NORM (asked for materialKey+qtyFactor) ← WRONG ask vs domain truth
```

### Variant check (A vs B)

| Variant | Meaning | Repo evidence |
|---------|---------|---------------|
| **A — Pure LABOR** | Service price /mb | Owner correction NOW · KB grooves labor 15–25 · control companyPrice **35** (legacy, ≠ OUR RATE) · Owner band **15–45 PLN/mb** |
| **B — COMPOUND with explicit material component** | LABOR + named mat.* / TechnologyPack | **NO** registered pack · `listWave1RegisteredMaterialsPacks()=[]` · no `mat.*` for zaprawa · MATERIALS_REQUIRED is **aspirational pending**, not a resolved component |

**Verdict:** Current code implements **aspirational COMPOUND** (MATERIALS_REQUIRED pending) **without** an explicit material component. That is **not** a safe B. Owner domain truth aligns with **A (LABOR)**.

**COMPOUND ≠ automatically wrong historically** — it was an Owner-approved seed. It **is** wrong **relative to the Owner correction in this RCA** and relative to Gate B (“COMPOUND only if material component is explicit”).

---

## 3. P4 / P5 measured (no new run required — P4-REAL dump)

| Metric | N |
|--------|---|
| LABOR IDENTITY (trusted Work) | **4/4** (`cc-p0c-w1-zaprawianie-bruzd`) |
| LABOR CURRENT HIT | **0** (plane COMPOUND → BOTH → lookup skipped) |
| LABOR MISS | **0** (not evaluated — status **NONE**) |
| LABOR RESEARCH | **0** |
| MATERIAL COMPONENT (explicit) | **0** |
| MATERIAL IDENTITY | **0** |
| MATERIAL RESEARCH | **0** |

If reclassified to **LABOR**, expected path (no invent):

```text
Work Identity → lookupWorkRate
  → CURRENT HIT  OR  MISS → runIkLaborGapResearch → Evidence → Candidate → Owner Accept
```

Existing labor research surface already includes grooves control (KB 15–25 → mid 20) — consistent with Owner **15–45** band as **labor** evidence, not material.

---

## 4. 15–45 PLN/mb

| Classification | Value |
|----------------|-------|
| **LABOR/SERVICE PRICE EVIDENCE** | YES |
| Material evidence | **NO** |
| Write Material Price Memory | **NO** |
| Invent materialKey / qtyFactor | **NO** |

---

## 5. Gates

| Gate | Result |
|------|--------|
| **A** | **PASS** — `ikEntryEnabled=false` → `ng10_gate` |
| **B** | **FAIL** vs Owner domain (expected **LABOR**; measured **COMPOUND** without explicit material component). Not MATERIAL-by-name invent. |

NG-10 **RETAINED**.

---

## 6. PLAN (STOP — Owner GO required before code)

1. **Owner GO IMPLEMENT** (explicit): reclassify `cc-p0c-w1-zaprawianie-bruzd`  
   - `ESTIMATOR_OWNER_CLASSIFICATION_MAP`: **COMPOUND → LABOR**  
   - Remove from `OWNER_MATERIALS_REQUIRED_WORK_IDS` + `WAVE1_MATERIALS_REQUIRED_PENDING`  
   - Do **not** invent TechnologyPack / mat.* for the BOQ line itself  
2. Re-run **P4-REAL** on these 4 lines (OUR RATE HIT/MISS/research as LABOR)  
3. Ensure **P5 / P5-REAL** does **not** treat them as material input (LABOR_SKIPPED)  
4. Optional: Owner Accept labor Candidate from existing grooves evidence / 15–45 band — **separate** Accept GO  
5. Folia (`cc-p0c-w1-zabezpieczenie-folia`) remains out of this RCA unless Owner revisits

**Do not implement** until Owner GO.

---

## FINAL

| Field | Value |
|-------|-------|
| ZAPRAWIANIE LINES | **4** |
| CURRENT PRICING PLANE | **COMPOUND** |
| EXPECTED DOMAIN PLANE | **LABOR** |
| CLASSIFICATION RCA | Owner seed COMPOUND + MATERIALS_REQUIRED (no pack) → Gate HOLD → P4 skips labor · P5 treats as material opportunity without component |
| LABOR IDENTITY | **4** |
| LABOR CURRENT HIT / MISS / RESEARCH | **0 / 0 / 0** (NONE) |
| MATERIAL COMPONENT / IDENTITY / RESEARCH | **0 / 0 / 0** |
| 15–45 PLN/MB | **LABOR EVIDENCE** |
| MATERIAL PRICE | **NO** |
| INVENTED MATERIAL | **0** |
| GATE A / B | **PASS / FAIL** |
| NG-10 | **RETAINED** |
| CODE CHANGED | **NO** |

**P5.10-RCA = COMPLETE**

**NEXT:** Owner GO on classification correction (COMPOUND→LABOR + drop MATERIALS_REQUIRED for this workId) only — then P4 re-run.
