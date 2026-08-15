# IK-MIGRATION-01 P5.11 — Zaprawianie COMPOUND → LABOR

**Status:** **COMPLETE**  
**Date:** 2026-08-15  
**Tip UI:** 2.66.74  
**Owner GO:** APPROVED (P5.10-RCA)  
**Baseline:** `85fc1991`  
**Tender:** `08def45d-ead6-5db8-962b-120001d33d37`

---

## Change (scoped)

| SSOT | Before | After |
|------|--------|-------|
| `ESTIMATOR_OWNER_CLASSIFICATION_MAP["cc-p0c-w1-zaprawianie-bruzd"]` | COMPOUND | **LABOR** |
| Counts | LABOR 29 · COMPOUND 6 | LABOR **30** · COMPOUND **5** |
| `OWNER_MATERIALS_REQUIRED_WORK_IDS` | folia + zaprawianie | **folia only** |
| `WAVE1_MATERIALS_REQUIRED_PENDING` | folia + zaprawianie | **folia only** |

Folia (`cc-p0c-w1-zabezpieczenie-folia`) unchanged.

---

## Four lines (integrity)

| lineId | dwelling | LP | qty | unit | plane AFTER | P4 rateStatus |
|--------|----------|----|-----|------|-------------|---------------|
| `obl_26853c8f` | ptasia | 7 | 14.5 | m | LABOR | CANDIDATE_OWNER_ACCEPT_REQUIRED |
| `obl_c37c8c1f` | ptasia | 20 | 69.44 | m | LABOR | CANDIDATE_OWNER_ACCEPT_REQUIRED |
| `obl_9829c554` | zernicka | 7 | 8.5 | m | LABOR | CANDIDATE_OWNER_ACCEPT_REQUIRED |
| `obl_4e8f0754` | zernicka | 20 | 114.24 | m | LABOR | CANDIDATE_OWNER_ACCEPT_REQUIRED |

Master BOQ **430** · qty/unit/dwelling/branch/Work Identity preserved.

---

## P4-REAL AFTER (live 2026-08-15)

**BEFORE (P5.10):** plane COMPOUND · bucket BOTH · rateStatus **NONE** · HIT 0 · research 0  

**AFTER:**

| Metric | Zaprawianie ×4 |
|--------|----------------|
| LABOR IDENTITY | **4** |
| CURRENT OUR RATE HIT | **0** |
| CURRENT OUR RATE MISS → research | **4** (dedupe key `cc-p0c-w1-zaprawianie-bruzd\|mb`) |
| LABOR RESEARCH calls (key) | **1** |
| EVIDENCE / CANDIDATES | **4** lines · candidate **20 PLN/mb** (KB mid 15–25) |
| OWNER ACCEPT / ACCEPTED | **0** (ZERO auto) |
| MATERIAL INPUT | **0** |

**15–45 PLN/mb** = Owner **LABOR EVIDENCE ONLY** · not forced OUR RATE · candidate 20 is within band but **Accept REQUIRED**.

Trusted Work plane shift on tender: LABOR **38→42** · COMPOUND **4→0** among previous zaprawianie · MATERIAL still **2** (zawór).

---

## P5

Material Expert: zaprawianie → **LABOR_SKIPPED** · no NO_MATERIAL_COMPONENT · no mat.* invent.

---

## Gates

| Gate | Result |
|------|--------|
| A | **PASS** — ikEntryEnabled OFF → NG-10 |
| B | **PASS** — 4/4 LABOR · P5 material input 0 |
| C | **PASS** — no invent · qty/provenance |

NG-10 **RETAINED** · ATH writer **GAP**

---

## NEXT

Review 4 LABOR candidates (Owner Accept optional) · zawór product map still OPEN · no Material research for zaprawianie.
