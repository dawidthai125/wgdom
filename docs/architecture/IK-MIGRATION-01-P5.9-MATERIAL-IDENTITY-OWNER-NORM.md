# IK-MIGRATION-01 P5.9 — Material Identity Owner Norm + Product Map

**Status:** **PARTIAL** (honest blockers classified · **0 invent** · **0** TechnologyPack registered)  
**Date:** 2026-08-15  
**Tip UI:** 2.66.73  
**Baseline:** P5.8 audit `30edfee4`  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37` · Master BOQ **430**  
**Allowlist:** [`IK-MIGRATION-01-P5.9-ALLOWLIST.md`](./IK-MIGRATION-01-P5.9-ALLOWLIST.md)

---

## Objective

Resolve identity blockers **without** Material Expert / Price Memory / research.

Owner GO allowed registration **only if** existing SSOT evidence provides:

- Group 1: `materialKey` + `qtyFactor` → TechnologyPack  
- Group 2: Work → existing `mat.*` / `cw.product.*` (unambiguous)

---

## Evidence investigation (NO INVENTION)

### Group 1 — Zaprawianie (4)

| Question | Answer |
|----------|--------|
| What material? | **UNKNOWN** in SSOT (mortar implied by COMPOUND, no `mat.*`) |
| Unit / qtyFactor? | Catalog unit `mb` · **no** Owner qtyFactor |
| Existing TechnologyPack? | **NO** — `listWave1RegisteredMaterialsPacks()=[]` |
| Source? | `WAVE1_MATERIALS_REQUIRED_PENDING` + TECHNOLOGY-RECIPE DF: Owner norm catalog **absent** |
| Can register without invent? | **NO** |

→ Outcome: **PENDING_OWNER_NORM** · missing **`materialKey` + `qtyFactor`**

### Group 2 — Zawór / odpowietrznik (2)

| Question | Answer |
|----------|--------|
| Work Identity | `cc-p0c-w1-zawor-odpowietrzajacy` (MATERIAL plane) |
| `resolveDemandProductIdentityExact` | **null** |
| Existing `mat.*` / `cw.product.*` | **NONE** in Product Mapper |
| Ambiguous candidates | **NONE** (empty set ≠ OWNER_REVIEW pick) |
| Invent product? | **FORBIDDEN** |

→ Outcome: **PRODUCT_IDENTITY_GAP**

Montaż + produkt: existing model remains Work Identity (plane MATERIAL) + separate Product Mapper identity — **no new compound model invented**.

---

## Implementation (controlled)

| Artifact | Role |
|----------|------|
| `wave1-materials-required.ts` | Explicit `missing: [materialKey, qtyFactor]` · packs stay `[]` |
| `ik-material-identity-p59.ts` | Classifier → A/B/C/D outcomes · focus specs · **no pricing** |
| EC facts | `MATERIAL_IDENTITY_GAP` · `OWNER_MATERIAL_MAPPING_REQUIRED` · (trusted path reuses `MATERIAL_IDENTITY_RESOLVED`) |
| Tests | `scripts/test-ik-migration-01-p59-material-identity.mjs` (A–Q) |

**NOT done:** TechnologyPack register · Product Mapper invent · Price Memory · research · Accept.

---

## Focus lines (6/6)

| lineId | dwelling | branch | workId | outcome |
|--------|----------|--------|--------|---------|
| `obl_95b8d9fa` | kotlarska | sanitary | zawor | PRODUCT_IDENTITY_GAP |
| `obl_f676979e` | ptasia | sanitary | zawor | PRODUCT_IDENTITY_GAP |
| `obl_26853c8f` | ptasia | electrical | zaprawianie | PENDING_OWNER_NORM |
| `obl_c37c8c1f` | ptasia | electrical | zaprawianie | PENDING_OWNER_NORM |
| `obl_9829c554` | zernicka | electrical | zaprawianie | PENDING_OWNER_NORM |
| `obl_4e8f0754` | zernicka | electrical | zaprawianie | PENDING_OWNER_NORM |

Qty / unit / dwelling / branch / provenance: **preserved** (no mutation).

---

## Coverage

| Metric | N |
|--------|---|
| FOCUS INPUT | 6 |
| TECHNOLOGY PACK BEFORE / AFTER | **0 / 0** |
| MATERIAL IDENTITY BEFORE / AFTER | **0 / 0** |
| ZAPRAWIANIE RESOLVED | **0/4** |
| ZAWÓR RESOLVED | **0/2** |
| PENDING_OWNER_NORM | **4** |
| PRODUCT_IDENTITY_GAP | **2** |
| OWNER_REVIEW_REQUIRED | **0** |
| INVENTED KEYS / FACTORS / PRODUCTS | **0** |

---

## Gates

| Gate | Result |
|------|--------|
| A | **PASS** — `ikEntryEnabled=false` → NG-10 |
| B | **PASS** — 6/6 honest outcomes |
| C | **PASS** — no invent · packs 0 · integrity |

---

## NEXT

Owner must supply:

1. Zaprawianie: approved **materialKey + qtyFactor** (source document) → then register Wave1 TechnologyPack  
2. Zawór: approve/create **existing** `mat.*`/`cw.product.*` mapping (or split Montaż labor vs product line)

Then: **P5 REAL Material** on every new trusted material identity.

**STOP** — no pricing in P5.9.
