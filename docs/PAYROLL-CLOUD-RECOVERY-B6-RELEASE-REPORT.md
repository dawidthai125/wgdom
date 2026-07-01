# PAYROLL-CLOUD-RECOVERY — Etap 2 B6 · RELEASE REPORT

> **Target:** v2.63.23 · **Baseline:** v2.63.22 (`187afb8`)  
> **Data:** 2026-07-01 · **Status:** IMPLEMENT COMPLETE · **Edge deploy:** PENDING (CLI token) · **Vercel:** PENDING (push)

---

## Summary

B6 aligns Edge `kw-week-employees` list merge with client P0 SSOT: union by `weekEmployeeMergeKey` (`directoryId` first). UUID-based expansion guard (`mergeWeekEmployeesKeepPrevRoster`) removed; expansion path now uses the same union kernel as shrink.

---

## Changes

| File | Change |
|------|--------|
| `src/lib/payroll-week-employee-merge.ts` | **NEW** — SSOT merge key + list union kernel |
| `src/lib/cloud-sync.ts` | Import shared kernel; `mergeWeekEmployees` delegates (behavior unchanged) |
| `supabase/functions/make-server-0afb8820/index.tsx` | Edge union + expansion via shared module; removed `KeepPrevRoster` / UUID keys |
| `scripts/test-payroll-edge-parity-b6.mjs` | **NEW** — C1–C6 |
| `CHANGELOG.md`, `src/app/changelog-data.ts`, `docs/ARCHITECTURE.md` §11.2 | Release notes |

**Preserved (no changes):** B3 Guard, B4 `finalizePayrollBundleMerge`, B5 UI, payroll-cycle, rollover. No new KV / Principles.

---

## Test results

| Suite | Result |
|-------|--------|
| `test-payroll-edge-parity-b6.mjs` | **10 PASS** |
| `test-payroll-roster-guard-phase2.mjs` (B3) | **15 PASS** |
| `test-payroll-bootstrap-runtime-parity-b4.mjs` (B4) | **13 PASS** |
| `test-payroll-closed-week-ui-rca2.mjs` (B5) | **17 PASS** |
| `test-payroll-add-from-directory-merge-p0.mjs` (P0) | **16 PASS** |
| `npm run build` | **PASS** → `dist/version.json` = **2.63.23** |

---

## Deploy checklist

### 1. Supabase Edge (required)

```powershell
supabase login   # if not already
npx supabase functions deploy make-server-0afb8820 --project-ref bdpygdvfgbggermvqtys
```

**Note:** `index.tsx` imports `../../../src/lib/payroll-week-employee-merge.ts` — Supabase CLI bundles this file on deploy from repo root.

**Verify:**

```powershell
$anon = "<VITE_SUPABASE_ANON_KEY>"
Invoke-RestMethod -Uri "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/health" -Headers @{ Authorization = "Bearer $anon"; apikey = $anon }
```

**Smoke (manual):** Worker add person → `pushKeysToCloudSafe` → admin pull sees new `directoryId`.

### 2. Vercel frontend (required)

Shared module + changelog in `src/` — deploy frontend for **2.63.23** `version.json`.

```text
git push → Vercel auto-deploy (or manual promote)
```

**Verify:** `https://www.wgdom.fun/version.json` → `"version": "2.63.23"`

---

## Rollback

1. Redeploy Edge from tag/commit `v2.63.22` / `187afb8`
2. Revert Vercel to **2.63.22** if frontend was deployed
3. KV unchanged — client pull still heals local view via `mergeWeekEmployees`

---

## Werdykt

| Gate | Status |
|------|--------|
| IMPLEMENT | **COMPLETE** |
| BUILD | **PASS** |
| TEST | **PASS** |
| Edge deploy | **BLOCKED** — `SUPABASE_ACCESS_TOKEN` not set in this environment |
| Vercel deploy | **PENDING** — commit + push by repo owner |
| PRODUCTION VERIFIED | **PENDING** |

---

*SSOT: [`PAYROLL-CLOUD-RECOVERY-B6-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-B6-DESIGN-FREEZE.md)*
