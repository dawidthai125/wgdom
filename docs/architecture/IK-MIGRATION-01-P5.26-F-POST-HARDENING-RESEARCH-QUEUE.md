# IK-MIGRATION-01 — P5.26-F POST-HARDENING COVERAGE + RESEARCH QUEUE

> **TRYB:** AUDIT ONLY · READ-ONLY  
> **Date:** 2026-08-15  
> **Status:** COMPLETE — kolejka gotowa · research **NIE** uruchomiony  
> **Artifacts:** `.tmp/p526-f-research-queue.json` · `.tmp/p526-f-research-queue-FULL.md`  
> **HTTP = 0 · RESEARCH = 0 · ACCEPT = 0 · WRITE = 0 · CODE = 0 · COMMIT = 0 · PUSH = 0**

Źródła (frozen): P5.26-E coverage · p523 groups · p518 Master BOQ extract · Owner locks.

---

## A. 430 reconciliation

| Bucket | Count |
|--------|------:|
| TOTAL Master BOQ | **430** |
| Trusted Work | 44 |
| Unknown | 386 |
| **CURRENT EXACT** | **35** |
| INTERNAL EXACT | 0 |
| **INTERNAL SEMANTIC SAFE** | **24** |
| **INTERNAL SEMANTIC REVIEW** | **81** |
| **NO_INTERNAL_MATCH** | **280** |
| FALSE POSITIVE REJECT | **1** |
| Trusted non-CURRENT (44−35) | 9 |
| **Sum check** | **430 OK** |

---

## B. BEFORE / AFTER P5.26-E

| Metric | P5.26-D AFTER | P5.26-E AFTER (baseline F) |
|--------|-------------:|---------------------------:|
| CURRENT EXACT | 35 | **35** |
| INTERNAL SAFE | 24 | **24** |
| INTERNAL REVIEW | 41 | **81** |
| NO_INTERNAL_MATCH | 317 | **280** |
| FP probe (głowica) | FAIL | **PASS** (E) |

Hardening usunął unsafe spillover; SAFE bez agresji.

---

## C–D. 280 NO_INTERNAL_MATCH — classification

| Code | Meaning | Groups | Lines |
|------|---------|-------:|------:|
| **A** | OBVIOUS LABOR RESEARCH | **65** | **122** |
| **B** | OBVIOUS PACKAGE RESEARCH | **52** | **104** |
| **C** | OBVIOUS MATERIAL RESEARCH | **11** | **16** |
| **D** | POSSIBLE INTERNAL REVIEW (locked queue still in residual) | 2 | 3 |
| **E** | POSSIBLE NEW CATALOGWORK (flag only — **CREATE = 0**) | 70 flags | — |
| **F** | CORRUPT/PARSE | 12 | **33** |
| **G** | NON_COST | 2 | **2** |
| **H** | AMBIGUOUS | 0 | 0 |
| **Σ lines** | | | **280** |

### Research-ready (A/B/C, unlocked)

| Domain | Groups | Lines |
|--------|-------:|------:|
| LABOR | **65** | **122** |
| PACKAGE | **52** | **104** |
| MATERIAL | **11** | **16** |

---

## E. Semantic families

| | |
|---|---:|
| Total families (all residual) | **106** |
| Research families (A/B/C) | **90** |
| P0 families | **44** |

**Nie łączono** malowanie emulsja / wapienne / olejne / stolarka / elewacja.  
**Nie łączono** głowica z grzejnikiem.  
Wykucie / zaprawianie osobno.

Przykłady P0 (największe):

| Family | Groups | Lines |
|--------|--------|------:|
| LABOR demontaż (mb) | 013/014/031/055/057 | 12 |
| PACKAGE wymiana podejścia | 090/104/183 | 12 |
| LABOR pomiary | 038/041/047/048 | 8 |
| PACKAGE/LABOR tynkowanie | 122–124/172 · 042/043/074/075 | 7+6 |
| LABOR zamurowanie | 023/087 | 5 |
| PACKAGE malowanie-wapienne | 040/078/082 | 4 |
| PACKAGE wymiana ustępu | 099 | 4 |

Pełna lista: `.tmp/p526-f-research-queue.json` → `semanticFamilies`.

---

## F–H. Proposed batches + source routing + priority

**Batch size:** 5–10 families (tu **8**) · **concurrency ≤ 2** · **max 2 sources / family** first pass · INTERNAL-FIRST · dedupe · unhealthy skip · circuit breaker · **executeNow = false**.

| Batch | Band | Families | Groups | Lines | Est. HTTP (first pass) |
|-------|------|---------:|-------:|------:|-----------------------:|
| BATCH-01 … 06 | **P0** | 44 | 70 | 137 | ~78 |
| BATCH-07 … 12 | **P1** | 46 | 58 | 105 | ~82 |
| **TOTAL planned** | | **90** | | | **~160** |

**LABOR / PACKAGE primary:** KB.pl · CennikRemontow · Murator · e-kosztorysowanie  
**Forbidden for LABOR/PACKAGE:** Leroy · Castorama · OBI  

**MATERIAL primary:** sklepy / hurtownie (DIY OK).

---

## I. Expected HTTP budget (plan only — **not run**)

| | |
|---|---:|
| SEMANTIC FAMILIES (research) | **90** |
| PLANNED BATCHES | **12** |
| ESTIMATED RESEARCH CALLS | **~80** (≈85% families need external after INTERNAL-FIRST) |
| ESTIMATED EXTERNAL HTTP | **~160** (×2 sources first pass) |
| **Executed this phase** | **0** |

**280 linii ≠ 280 calls** → **90 rodzin → ~80 calls / ~160 HTTP** (plan).

QUALITY > MINIMUM HTTP — brak merge różnych zakresów tylko dla redukcji.

---

## J. Dedupe keys

`familyKey = researchDomain|unit|semanticStem`  
(np. `LABOR_MATERIAL_PACKAGE|m2|malowanie-wapienne`).

---

## K. Safety gates / Owner locks (untouched)

- P5.26-E `hostObjectSafetyGate` · P5.25 domain gate  
- Bound: G015/024/081 · 035/036/067 · 092/107 · 153/154  
- Locked review/reject: G112 · 126 · 141 · 143 · 144 · 076 · 134 · 135 · 177 · 111 · 149 · 150  
- Semantyka Owner (PACKAGE vs MATERIAL, emulsja≠wapno, głowica≠grzejnik, wykucie≠zaprawianie) — **zachowana**

---

## FINAL NUMBERS

```
TOTAL = 430
CURRENT EXACT = 35
INTERNAL SAFE = 24
INTERNAL REVIEW = 81
NO_INTERNAL_MATCH = 280
FALSE POSITIVE = 1

RESEARCH READY LABOR = 65 groups / 122 lines
RESEARCH READY PACKAGE = 52 groups / 104 lines
RESEARCH READY MATERIAL = 11 groups / 16 lines

SEMANTIC FAMILIES = 106 (90 research)
PLANNED BATCHES = 12
ESTIMATED RESEARCH CALLS ≈ 80
ESTIMATED EXTERNAL HTTP ≈ 160

HTTP = 0 | RESEARCH = 0 | ACCEPT = 0 | WRITE = 0 | CODE = 0 | COMMIT = 0 | PUSH = 0
```

---

## ABSOLUTE STOP

Kolejka gotowa. **Nie** uruchamiaj BATCH-01 bez Owner GO.  
**Nie** Accept · **Nie** CREATE · **Nie** HTTP research.
