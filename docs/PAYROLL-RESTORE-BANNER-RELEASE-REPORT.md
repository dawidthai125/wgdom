# PAYROLL — Restore Banner False Positive (RB) · RELEASE REPORT

> **Version:** **v2.63.24** · **Commit:** *(pending — local IMPLEMENT complete)*  
> **Baseline:** v2.63.23 (`d670892`)  
> **Date:** 2026-07-01 · **Status:** **IMPLEMENT COMPLETE — pre-deploy**

---

## Summary

RB replaces the restore-banner trigger from structural `weekEmployeesListRichness` with `payrollMetrics` SSOT (`activeDays` / `totalHours`). The banner appears only when archive has more active days or more total hours (EPS 0.05 h) than live `kw-week-employees`. Richness remains in codebase for guards/diagnostics but no longer drives UI. Banner copy aligned to the new logic. Frontend-only — no Edge or KV changes.

---

## Release artifacts

| Item | Value |
|------|-------|
| **Bundle** | RB — Restore Banner False Positive |
| **Files (RB scope)** | 7 |
| **Deploy** | **Vercel only** (no `supabase/functions/**` changes) |
| **Production verify** | Pending push → `https://www.wgdom.fun/version.json` → `2.63.24` |

### Files changed (RB scope only)

| File | Change |
|------|--------|
| `src/lib/cloud-sync.ts` | `PAYROLL_RESTORE_BANNER_EPS_HOURS`, `archivePayrollRicherThanLive`, `shouldShowPayrollRestoreBanner` |
| `src/app/PayrollView.tsx` | Banner condition + copy (RB-3) |
| `scripts/test-payroll-restore-banner-false-positive.mjs` | **NEW** — T1–T6 |
| `CHANGELOG.md` | 2.63.24 entry |
| `src/app/changelog-data.ts` | 2.63.24 entry |
| `docs/ARCHITECTURE.md` | §11.2 restore banner line |
| `docs/PAYROLL-RESTORE-BANNER-RELEASE-REPORT.md` | **NEW** — this report |

---

## Implementation (design freeze compliance)

### RB-1 — Banner condition

```text
archivePayrollRicher =
  archiveM.activeDays > liveM.activeDays
  OR archiveM.totalHours > liveM.totalHours + 0.05

showRestoreBanner =
  !isClosedWeek
  AND onRestoreFromArchive
  AND archivedForWeek?.weekEmployees?.length > 0
  AND shouldShowPayrollRestoreBanner(weekEmployees, archivedWeekEmployees)
```

### RB-2 — SSOT helpers (`cloud-sync.ts`)

- `archivePayrollRicherThanLive` — pure comparison on `payrollMetrics`
- `shouldShowPayrollRestoreBanner` — empty/null archive guard + delegate

### RB-3 — Copy

| Element | Text |
|---------|------|
| Tytuł | „W archiwum jest więcej zapisanych godzin niż na bieżącej liście” |
| Opis | „Zapisany tydzień ma więcej dni roboczych lub łącznie więcej godzin (w tym Sob.pr.). Przywróć skład i godziny z archiwum, jeśli coś zniknęło po syncu lub edycji.” |
| CTA | „Przywróć z archiwum” (unchanged) |

### RB-4 — Richness

`weekEmployeesListRichness` **not** used in banner trigger. T4 proves E1 false-positive scenario: richness differs, metrics equal → banner OFF.

---

## Test gate (local, 2026-07-01)

| Suite | Result |
|-------|--------|
| `test-payroll-restore-banner-false-positive.mjs` | **14 PASS** (T1–T6) |
| B5 closed week UI (`test-payroll-closed-week-ui-rca2.mjs`) | **17 PASS** |
| B6 Edge parity (`test-payroll-edge-parity-b6.mjs`) | **10 PASS** |
| B3 Guard (`test-payroll-roster-guard-phase2.mjs`) | **15 PASS** |
| `npm run build` | **PASS** |

### RB test matrix

| ID | Scenario | Expected |
|----|----------|----------|
| T1 | Identical `payrollMetrics` | OFF |
| T2 | Archive +8 h | ON |
| T3 | Same hours, archive +1 `activeDays` | ON |
| T4 | Same metrics, richness diff (E1) | OFF |
| T5 | `!isClosedWeek` gate + helper wired in `PayrollView` | structural |
| T6 | `null` / `[]` archive | OFF |

---

## Preserved (unchanged)

B3 `CloudSyncMutationGuard` · B4 `finalizePayrollBundleMerge` · B5 closed week UI · B6 Edge parity · payroll-cycle · payroll-rollover · no new KV · no new Principles · `restoreWeekFromArchive` CTA handler.

---

## Deploy

### Edge

**Not required** — RB touches only client `PayrollView` + `cloud-sync.ts`.

### Frontend (Vercel)

Push RB-scoped commit to `main` → Vercel auto-deploy.

**Post-deploy verify:**

```text
GET https://www.wgdom.fun/version.json
→ version: 2.63.24
→ commit: <RB commit>
```

**Manual smoke (optional):** Open operational week with saved archive where live and archive LP totals match but archive has stale `active:true` / notes — banner should **not** appear.

---

## Rollback

1. Revert Vercel to **v2.63.23** / `d670892`
2. KV and Edge unchanged — no migration

---

## Werdykt

| Gate | Status |
|------|--------|
| AUDIT | **COMPLETE** |
| DESIGN FREEZE | **APPROVED** |
| IMPLEMENT | **COMPLETE** (local) |
| Test gate | **PASS** (RB + B3/B5/B6 regressions + build) |
| Vercel deploy | **PENDING** commit + push |
| PRODUCTION | **PENDING** `version.json` verify |

---

*SSOT: [`PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md`](PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md) · Audit: [`PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md`](PAYROLL-RESTORE-BANNER-FALSE-POSITIVE-AUDIT.md)*
