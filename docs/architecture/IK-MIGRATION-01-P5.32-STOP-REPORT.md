# IK-MIGRATION-01 — P5.32 STOP REPORT

> **Date:** 2026-08-15  
> **Kind:** Structural stop after queue exhaustion (market harvest blocked)  
> **Artifact:** `.tmp/p532-stop-report.json`  
> **Code fix mid-run:** **FORBIDDEN** (P5.32 §25)

---

## STOP

| Field | Value |
|---|---|
| STOP_BATCH | `P532-BATCH-01` (completed; no further batches in queue) |
| STOP_GROUP | all 13 queued groups (first observed: **137** / `joinery_finish`) |
| STOP_REASON | **`EDGE_ALLOWLIST_DESYNC` / enabled-route `unknown_category_key`** |
| HTTP_COUNT | **13** (Edge 400 · no upstream page fetch) |
| LAST_SOURCE | `kb_pl` (G078) · also `cennikremontow_pl` for joinery |
| LAST_STATUS | `unknown_category_key` / `SOURCE_UNAVAILABLE` |
| SAFE_RESUME_POINT | After Owner GO: mirror P5.31 keys into Edge `WORK_RATE_PASS2_CATEGORY_URLS` → deploy Supabase function → re-run P5.32 research (same queue) |

---

## WHY STOP (contract)

P5.32 §19: category key missing on a route that **should** exist must not be auto-fixed during research → **STOP** for the family / batch, no code fix.

Local routing = PASS2_READY (P5.31). Edge map ≠ local map → every lookup fails with `unknown_category_key`. That is not a market GAP; it is **enabled-route infrastructure desync**.

Runner classified rows as `RESEARCH_GAP` (GAP ≠ hard HTTP 429). This report records the **Owner-facing absolute stop** for market harvest and resume conditions.

---

## WHAT DID NOT HAPPEN

- Upstream KB / CennikRemontow HTML fetch for P5.31 URLs  
- Candidate prices / LOW_SAMPLE midpoints  
- Accept · BASE · SELL · commercialPricing · KV write  
- Matcher / parser / allowlist / CatalogWork changes  
- Commit · push  

---

## SAFE RESUME (Owner GO only)

1. Sync Edge `WORK_RATE_PASS2_CATEGORY_URLS` with local `WORK_RATE_PASS2_CATEGORY_ALLOWLIST` (4 P5.31 entries).  
2. Deploy `make-server-0afb8820`.  
3. Re-run continuous research from `.tmp/p532-research-queue.json` (BATCH-01 same 13 groups).  
4. **Do not** invent prices · **do not** auto-Accept · **do not** start P5.33 without Owner GO.

**ABSOLUTE STOP** until Owner GO on Edge mirror + research re-run.
