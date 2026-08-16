# IK-MIGRATION-01 — P5.32 BATCH-01 RESEARCH

> **Date:** 2026-08-15 (RESEARCH RESUME after P5.32-FIX)  
> **Status:** VALIDATION **PASS**  
> **Batch:** `P532-BATCH-01` · groups **7** · lines **11** · families **2**  
> **Artifacts:** `.tmp/p532-batch-01-results.json` · `.tmp/p532-batch-01-FULL.md`

---

## PRE-FLIGHT

| Metric | Value |
|---|---:|
| GROUPS | 7 (137, 188, 063, 064, 120, 128, 121) |
| LINES | 11 |
| FAMILIES | 2 (`joinery_finish`, `flooring`) |
| MAX POSSIBLE HTTP | 14 |
| HARD BUDGET | 40 |
| PASS | **true** |

---

## METRICS

| Metric | Value |
|---|---:|
| INTERNAL EXACT | 0 |
| INTERNAL SEMANTIC | 0 |
| HTTP AVOIDED | 0 |
| EXTERNAL HTTP | **6** |
| CANDIDATES | **0** |
| LOW_SAMPLE | 0 |
| RESEARCH_GAP | **7** |
| PARSER_EMPTY (HTTP 200) | **6** (G137,188,063,120,128,121) |
| CATEGORY_KEY_MISSING (fallback after streak) | **1** (G064 — preferred CR streak-blocked) |
| unknown_category_key | **0** |
| 403 / 429 / 503 / TIMEOUT | 0 / 0 / 0 / 0 |
| INVENTED | 0 |
| AUTO_ACCEPT | 0 |
| WRITES | 0 |

HTTP by source: `cennikremontow_pl` **3** · `kb_pl` **3**.

---

## NOTES

- Pass2 routes resolved; upstream HTML fetched (e.g. CR ~223 KB, status **200**).
- Offers not matched to group names → **PARSER_EMPTY** (market/parser GAP, not route mismatch).
- After 3× empty on CR, G064 skipped preferred source → fallback hosts without `joinery_finish` PASS2 → `CATEGORY_KEY_MISSING` (no invent).

| GROUP | KEY | HTTP | FINAL | DETAIL |
|---|---|---:|---|---|
| 137 | joinery_finish | 1 | RESEARCH_GAP | PARSER_EMPTY @ CR 200 |
| 188 | joinery_finish | 1 | RESEARCH_GAP | PARSER_EMPTY @ CR 200 |
| 063 | joinery_finish | 1 | RESEARCH_GAP | PARSER_EMPTY @ CR 200 |
| 064 | joinery_finish | 0 | RESEARCH_GAP | streak → CKM fallback |
| 120 | flooring | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
| 128 | flooring | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
| 121 | flooring | 1 | RESEARCH_GAP | PARSER_EMPTY @ KB 200 |
