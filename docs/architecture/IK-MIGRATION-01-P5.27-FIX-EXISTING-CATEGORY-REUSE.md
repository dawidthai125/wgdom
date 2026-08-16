# IK-MIGRATION-01 — P5.27-FIX EXISTING CATEGORY KEY REUSE

> **Date:** 2026-08-15  
> **Status:** **PASS / COMPLETE**  
> **Mode:** IMPLEMENT safe existing reuse · TEST · BUILD · READ-ONLY coverage  
> **HTTP = 0 · Research = 0 · Accept = 0 · Writes = 0 · Create = 0 · new categoryKey = 0 · new URL = 0**  
> **COMMIT = 0 · PUSH = 0**  
> **Artifacts:** `.tmp/p527-fix-existing-reuse.json` · `.tmp/p527-fix-existing-reuse-FULL.md`  
> **Tests:** `scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs`

---

## Executive BEFORE → AFTER

| Metric (CKM-97) | BEFORE | AFTER |
|-----------------|-------:|------:|
| PASS2_READY (ungated / legacy family) | 25 | **22** SAFE |
| plaster key (incl. false YDYp/wtynk) | **12** | **5** SAFE |
| plumbing key | 8 | **8** SAFE |
| electrical key | 3 | **7** SAFE (existing CR key) |
| CATEGORY_KEY_MISSING | 12 | 14 |
| FAMILY_UNKNOWN | 60 | 59 |
| REJECTED_REUSE | 0 | **2** (pomiary G047/G048) |
| **Still no SAFE reuse** | — | **75** (= 97−22) |
| SAFE_EXISTING_REUSE | 0 | **22** |
| newMappings / newUrls | — | **0 / 0** |

**Nie zmniejszaliśmy GAP „na siłę”.** Usunęliśmy fałszywy plaster (YDYp / wtynk / podtynk / nieotynkowane); pomiary `unit=pomiar` → REJECTED (OUT OF RESEARCH).

---

## Reuse results (Owner targets)

### plumbing @ CennikRemontow — SAFE_EXISTING_REUSE

| | |
|--|--:|
| Groups | **8** |
| Lines | **29** |
| Groups | G013, G014, G057, G090, G104, G183, G012, G094 |

PASS2 URL (unchanged):  
`https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik`

PACKAGE `msc` podejścia — **SAFE** (family plumbing, scope matches CR host).

### plaster @ KB — SAFE_EXISTING_REUSE

| | |
|--|--:|
| Groups | **5** |
| Lines | **10** |
| Groups | G042, G043, G074, G023, G087 |

PASS2 URL (unchanged): KB gładź/szpachlowanie allowlist.

Masonry→`plaster` fallback (P5.26-FIX) retained for zamurowanie LABOR.

### electrical @ CR — SAFE (existing key, no new URL)

| | |
|--|--:|
| Groups | **7** |
| Lines | **13** |
| Groups | G031, G122–124, G172, G033, G028 |

Includes former false-plaster: YDYp w tynku, wtynkowe, podtynkowe, tablica.

### Rejected reuse

| Groups | Reason |
|--------|--------|
| G047, G048 | `OUT_OF_RESEARCH_MEASUREMENT` (unit `pomiar`) |

### Rejected unsafe plaster (corrected, not bound)

| Case | Action |
|------|--------|
| YDYp / przewód w tynku | → `electrical` (not plaster) |
| wtynkowe / podtynkowe | → `electrical` |
| nieotynkowane ścianki | → `demolition` → **CKM** (`repairs` **not** invented) |

**repairs / flooring:** **NOT implemented** · remain CATEGORY_KEY_MISSING.

---

## What changed (code)

| File | Change |
|------|--------|
| `work-rate-discovery-allowlist.ts` | Family: electrical/wtynk/YDYp/podtynk **before** plaster; plaster excludes `wtynk\|podtynk\|nieotynkow`; `rozebranie nieotynkowan*` → demolition |
| same | `evaluateExistingCategoryReuseGate` · `planSafeExistingCategoryReuse` · domain gate MATERIAL↛labor keys · PACKAGE scope |
| `work-catalog/index.ts` | exports |
| `scripts/test-ik-migration-01-p527-fix-existing-category-reuse.mjs` | new |

**Zero** new allowlist rows · **zero** new categoryKey · **zero** new adapters.

---

## Tests

| Suite | Result |
|-------|--------|
| P5.27-FIX existing reuse | **39/39** |
| P5.26-FIX category/PASS2 | **30/30** |
| P5.26-E matcher safety | **21/21** |
| P5.25 domain gate | **40/40** |
| PASS2 wave-1 | **74/74** |
| RW-03 | **16/16** |
| `npm run build` | **PASS** |

Domain: PACKAGE↛MATERIAL/LABOR · LABOR↛PACKAGE · MATERIAL↛PACKAGE — unchanged.  
Semantic: głowica≠grzejnik · emulsja≠wapno/olej · wykucie≠zaprawianie — regressions PASS.

---

## Coverage audit (READ-ONLY · HTTP=0)

### CKM-97

| | BEFORE | AFTER |
|--|-------:|------:|
| Safe plumbing | (8 ungated) | **8 / 29 lines** |
| Safe plaster | (12 incl. FP) | **5 / 10 lines** |
| Safe electrical | 3 | **7 / 13 lines** |
| Rejected (pomiary) | — | **2** |
| Residual without SAFE | — | **75** |

### Master BOQ 430

| | |
|--|--:|
| Audited unknown (P5.20 domains) | **386** |
| Trusted outside extract | **44** |
| BEFORE PASS2_READY (legacy family) | **155** |
| AFTER SAFE_EXISTING_REUSE | **145** |
| AFTER CKM + FAMILY_UNKNOWN | **232** |
| HTTP avoided potential | **145** *(route ready — **no HTTP executed**)* |

Spadek READY 155→145 = usunięcie fałszywego plaster + reject pomiarów — **pożądane**.

---

## Unit / domain flags

| Topic | Status |
|-------|--------|
| `msc` | ATH miesiąc · `msc↔szt` research compare only (SSOT) |
| m / mb | existing `mapInternalFirstUnit` · no new global invent |
| m² / m2 | existing |
| MATERIAL + labor category | **REJECTED_REUSE** |
| podtynk → plaster | **blocked** (family electrical) |
| Out of research (gruz/pomiary/wapno/olej) | **unchanged** |

---

## Success criteria

| Criterion | |
|-----------|--|
| Safe plumbing reused | **PASS** (8/8) |
| Safe plaster reused | **PASS** (5 safe; FP not bound) |
| Zero new categoryKey / URL | **PASS** |
| Zero PACKAGE→MATERIAL / domain regression | **PASS** |
| Unit safety | **PASS** |
| Build | **PASS** |
| repairs not implemented | **PASS** |

---

## STOP

**P5.27-FIX = COMPLETE**

- NIE research  
- NIE P5.28  
- NIE `repairs`  
- NIE commit / push  

Czekaj na **Owner review**.

**ABSOLUTE STOP.**
