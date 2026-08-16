# IK-MIGRATION-01 — P5.32 BATCH-02 RESEARCH

> **Date:** 2026-08-15 (RESEARCH RESUME after P5.32-FIX)  
> **Status:** VALIDATION **PASS**  
> **Batch:** `P532-BATCH-02` · groups **6** · lines **7** · families **2**  
> **Artifacts:** `.tmp/p532-batch-02-results.json` · `.tmp/p532-batch-02-FULL.md`

---

## PRE-FLIGHT

| Metric | Value |
|---|---:|
| GROUPS | 6 (052, 083, 082, 084, 075, 078) |
| LINES | 7 |
| FAMILIES | 2 (`repairs_opening`, `repairs_wall`) |
| MAX POSSIBLE HTTP | 12 |
| HARD BUDGET | 40 |
| PASS | **true** |

---

## METRICS

| Metric | Value |
|---|---:|
| INTERNAL EXACT | 0 |
| INTERNAL SEMANTIC | 0 |
| HTTP AVOIDED | 0 |
| EXTERNAL HTTP | **3** |
| CANDIDATES | **0** |
| LOW_SAMPLE | 0 |
| RESEARCH_GAP | **6** |
| PARSER_EMPTY (HTTP 200) | **3** (G052,083,082) |
| CATEGORY_KEY_MISSING (fallback after streak) | **3** (G084,075,078) |
| unknown_category_key | **0** |
| 403 / 429 / 503 / TIMEOUT | 0 / 0 / 0 / 0 |
| INVENTED | 0 |
| AUTO_ACCEPT | 0 |
| WRITES | 0 |

HTTP by source: `kb_pl` **3**.

---

## NOTES

- `repairs_opening` / `repairs_wall` on KB: PASS2 fetch **200**, then **PARSER_EMPTY**.
- After 3× KB empty streak, G084/075/078 did not call KB; fallbacks (sccot/extradom) lack those PASS2 keys → `CATEGORY_KEY_MISSING`.
- Not `ROUTE_CONFIGURATION_REGRESSION` (preferred keys work on Edge).

| GROUP | KEY | HTTP | FINAL | DETAIL |
|---|---|---:|---|---|
| 052 | repairs_opening | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
| 083 | repairs_opening | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
| 082 | repairs_opening | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
| 084 | repairs_opening | 0 | RESEARCH_GAP | streak → CKM fallback |
| 075 | repairs_wall | 0 | RESEARCH_GAP | streak → CKM fallback |
| 078 | repairs_wall | 0 | RESEARCH_GAP | streak → CKM fallback |
