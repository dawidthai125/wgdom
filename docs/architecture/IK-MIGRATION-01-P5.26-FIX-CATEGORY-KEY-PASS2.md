# IK-MIGRATION-01 — P5.26-FIX CATEGORY_KEY / PASS2 RESEARCH PIPELINE

> **Date:** 2026-08-15  
> **Status:** **PASS** — tests · build · validation pilot  
> **RCA:** [`IK-MIGRATION-01-P5.26-F-SOURCE-PARSER-RCA.md`](./IK-MIGRATION-01-P5.26-F-SOURCE-PARSER-RCA.md)  
> **Artifacts:** `.tmp/p526-fix-category-pass2-results.json` · `.tmp/p526-fix-category-pass2-FULL.md` · `.tmp/p526-fix-validation-pilot.json`  
> **HTTP (fix dev):** 0 · **Pilot HTTP:** 2 (≤4) · **Accept/Write/Create/Commit/Push:** **0**  
> **P5.26-F research:** **NOT resumed** (BATCH-02 blocked)

---

## A. RCA reference

BATCH-01: 42× PASS1-only · PASS2=0 · categoryKey=null · PARSE_EMPTY conflated as SOURCE_NO_MATCH.

PRIMARY: **CATEGORY_KEY** · SECONDARY: identity · query soft · empty-class conflation.

---

## B. Root cause (confirmed in code)

1. P5.26-F continuous runner bypassed SSOT `listWorkRatePass2CategoryKeysForWork` / research PASS2 loop.  
2. `resolveWorkRateWorkFamily`: generic `demontaz` → demolition **before** plumbing (G013).  
3. Masonry family preferred `masonry_plaster` with **empty** allowlist → silent PASS1-only.  
4. Empty offers labeled SOURCE_NO_MATCH.  
5. ATH `msc.` unmapped / blocked soft compare.

---

## C. Exact fix

| Area | Change |
|------|--------|
| Family order | plumbing / electrical **before** generic demontaż; zamurowanie przebić/otwór → masonry; bruzdy still grooves |
| Masonry PASS2 | prefs `masonry_plaster` → fallback allowlisted **`plaster`** (no new URL) |
| SSOT plan | `planWorkRateCategoryRoute` + `classifyWorkRateLookupEmpty` |
| Soft | `softWorkRateFamilyText` (NFD) for family regex |
| Unit | `msc`/`msc.` → known `msc` (ATH miesiąc); `msc↔szt` compatible for research compare only |
| Semantics | `CATEGORY_KEY_MISSING` / `PARSER_EMPTY` / `SOURCE_UNAVAILABLE` ≠ blind `SOURCE_NO_MATCH` |

**Nie** hardcodowano G087. **Nie** zmieniono BASE/SELL/margin/CatalogWork/F5/Accept/KV.

---

## D. Files changed

- `src/lib/work-catalog/work-rate-discovery-allowlist.ts`  
- `src/lib/work-catalog/index.ts` (exports)  
- `src/lib/intelligent-estimator/internal-first-text.ts`  
- `scripts/test-ik-migration-01-p526-fix-category-pass2.mjs` (new)  
- docs + `.tmp` artifacts  

---

## E–H. categoryKey / PASS1–PASS2 BEFORE → AFTER

| | BEFORE | AFTER |
|--|--------|-------|
| G087 KB | categoryKey null · PASS1 Wrocław | family **masonry** · key **plaster** · **PASS2** gładź URL |
| G090 CR | categoryKey null · PASS1 / sccot | family **plumbing** · key **plumbing** · **PASS2** instalacje W-K-G |
| G013 | demolition (raw diakrytyki) | **plumbing** via soft |
| sccot plumbing | silent PASS1 | **CATEGORY_KEY_MISSING** (no invent URL) |

---

## I. Unit normalization

| Source | Meaning | Mapping |
|--------|---------|---------|
| ATH `msc.` | miesiąc | → `msc` (not invent → szt) |
| Research compare | piece offers on plumbing pages | `unitsCompatibleInternalFirst(msc,szt)=true` |

---

## J. Query builder

Family routing uses soft NFD text so `Demontaż` matches `demontaz` patterns. No wide fuzzy.

---

## K. PARSE_EMPTY semantics

| Class | When |
|-------|------|
| CATEGORY_KEY_MISSING | family known, allowlist intersection empty |
| FAMILY_UNKNOWN | cannot infer family |
| PARSER_EMPTY | HTTP OK + intended path + 0 identity offers |
| SOURCE_UNAVAILABLE | lookup fail |
| SOURCE_NO_MATCH | reserved — not used for blind PARSE_EMPTY |

---

## L. Tests

| Suite | Result |
|-------|--------|
| `test-ik-migration-01-p526-fix-category-pass2.mjs` | **30/30** |
| `test-work-rate-pass2-allowlist-wave-1.mjs` | **74/74** |
| `test-work-rate-real-world-validation-03.mjs` | **16/16** |
| `test-ik-migration-01-p525-fix-domain-gate.mjs` | **40/40** |
| `test-ik-migration-01-p526e-matcher-safety.mjs` | **21/21** |

---

## M. Build

`npm run build` → **PASS**

---

## N. Pilot (READ-ONLY)

| | |
|--|--|
| Groups | G087, G090 |
| HTTP | **2** (≤4) · concurrency **1** |
| G087 | categoryKey=`plaster` · PASS2_CATEGORY · HTTP 200 · **PARSER_EMPTY** · offers 0 |
| G090 | categoryKey=`plumbing` · PASS2_CATEGORY · HTTP 200 · **PARSER_EMPTY** · offers 0 · unit `msc` OK |
| Accept/Write | **0** |

Pipeline fixed; live pages still yield 0 identity offers → **PARSER_EMPTY** (honest), not SOURCE_NO_MATCH.

---

## O. Remaining risks

1. Masonry→`plaster` PASS2 is allowlist fallback — may still miss zamurowanie rows (identity/page scope).  
2. No dedicated `masonry_plaster` URL yet (Owner-curated allowlist).  
3. `msc↔szt` research compatibility is narrow; do not promote to CatalogWork unit without GO.  
4. P5.26-F continuous runner still needs wiring to `planWorkRateCategoryRoute` before any research resume.  
5. Pilot offers=0 → resume research only after Owner GO (identity/synonym or allowlist).

---

## Status

| Gate | |
|------|--|
| P5.26-FIX | **PASS** |
| P5.26-F BATCH-02 / full research | **NOT started** — await Owner |
| COMMIT / PUSH | **0** |
