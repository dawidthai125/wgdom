# IK-MIGRATION-01 — P5.32-FIX EDGE CATEGORY ROUTE SYNC

> **Date:** 2026-08-15  
> **Status:** **COMPLETE**  
> **Owner GO:** TAK  
> **Research / Accept / CatalogWork / Commit / Push:** **0**  
> **Artifacts:** `.tmp/p532-fix-edge-route-sync.json` · `.tmp/p532-fix-edge-smoke.json`

---

## ROOT CAUSE

`ROUTE_CONFIGURATION_MISMATCH` — not a market GAP.

| Layer | Before |
|---|---|
| Local SSOT P5.31 | 9 keys · PASS2_READY |
| Edge `WORK_RATE_PASS2_CATEGORY_URLS` | **5** legacy keys only |
| Selective lookup | `unknown_category_key` · **0** upstream page fetches |

---

## SSOT

| Role | Path |
|---|---|
| **SSOT** | `src/lib/work-catalog/work-rate-discovery-allowlist.ts` → `WORK_RATE_PASS2_CATEGORY_ALLOWLIST` |
| Sync | `scripts/sync-work-rate-pass2-edge-from-ssot.mjs` (SSOT → Edge map) |
| Edge mirror | `supabase/functions/make-server-0afb8820/index.tsx` → `WORK_RATE_PASS2_CATEGORY_URLS` (generated block) |
| Parity test | `scripts/test-ik-migration-01-p532-fix-edge-category-route-parity.mjs` |

No second hand-maintained list. Edge map is generated from SSOT.

---

## BEFORE → AFTER

| | BEFORE | AFTER |
|---|---:|---:|
| Edge keys | **5** | **9** |
| P5.31 routes on Edge | 0 | **4** |
| Local ↔ Edge parity | FAIL | **PASS** |

### Legacy retained (5)

- `kb_pl::grooves`
- `kb_pl::plaster`
- `cennikremontow_pl::painting`
- `cennikremontow_pl::electrical`
- `cennikremontow_pl::plumbing`

### Synchronized P5.31 routes (4)

| categoryKey | source | URL (unchanged from P5.31) |
|---|---|---|
| `flooring` | kb_pl | …/cennik-ukladania-paneli-podlogowych-w-calej-polsce/ |
| `repairs_wall` | kb_pl | …/cennik-wyburzania-scian-dzialowych/ |
| `repairs_opening` | kb_pl | …/cennik-wykucia-otworow-w-scianie-i-stropie-sprawdzamy-ceny/ |
| `joinery_finish` | cennikremontow_pl | …/uslugi-stolarskie-cennik/ |

### Explicitly NOT added

`repairs` umbrella · `repairs_electrical` · `repairs_appliance` · finish/floor_trim/biocide MED · G187 · OWNER_REVIEW keys.

---

## DEPLOYMENT

| Field | Value |
|---|---|
| Function | `make-server-0afb8820` |
| Project | `bdpygdvfgbggermvqtys` |
| Method | `supabase functions deploy … --use-api` |
| Result | **Deployed** |
| Git push | **0** (CLI deploy only) |

---

## SMOKE

| Check | Result |
|---|---|
| Kind | resolve recognition · **no source page fetch** (§11) |
| 4× P5.31 keys `unknown_category_key` | **FALSE** |
| Edge `/health` | **200 ok** |
| Live `/work-rate-selective-lookup` | **SKIPPED** (endpoint fetches upstream after resolve) |
| Research / candidates / Accept | **0** |

---

## TESTS

| Suite | Result |
|---|---|
| P5.32-FIX EDGE ↔ LOCAL parity | **30/30** |
| P5.31 create/route | **35/35** |
| P5.27-FIX | **39/39** |
| P5.26-FIX PASS2 | **30/30** |
| PASS2 wave-1 | **PASS** (T0–T6 incl. P5.31 inventory) |
| Matcher E (p526e) | **21/21** |
| Domain gate (p525) | **40/40** |
| RW-03 | **16/16** |
| `npm run build` | **PASS** |
| `sync --check` | **PASS** |

---

## HARD SAFETY (unchanged)

PACKAGE ↛ MATERIAL · LABOR ↛ shops · flooring = installation · repairs_wall = wall demolition · repairs_opening = opening · joinery_finish = joinery scope.

---

## STOP

**P5.32-FIX COMPLETE.**

- **NIE** research · **NIE** BATCH-01 resume · **NIE** P5.33  
- **NIE** Accept · **NIE** CatalogWork  
- **NIE** commit · **NIE** push  

Czekaj na Owner GO: **P5.32 RESEARCH RESUME**.
