# WGDOM-SIDEBAR-REGRESSION-02 — RELEASE REPORT

> **Status:** **PRODUCTION VERIFIED**  
> **Date:** 2026-07-26  
> **Feature commit:** `da24e5a`  
> **Prior tip:** `d856dc8` (docs) / shell `5888a76`  
> **UI version.json:** `2.65.46` (thin fix — tip = SHA)

---

## Summary

Shipped fix for Sidebar horizontal scrollbar caused by `NavItemWithHint` tooltips (`opacity`/`visibility` + `left:calc(100%)` + `w-max` inflating `.admin-sidebar-scroll` scrollWidth).

**File:** `src/app/app-ui.tsx` only (`NavItemWithHint`).

---

## Pipeline

| Step | Result |
|------|--------|
| Commit | **`da24e5aea3f0e6df49e57edbce9bc30bc63e2fc5`** · `fix(shell): stop Sidebar horizontal scroll from NavItemWithHint tooltips` |
| Staged scope | **1 file** — `src/app/app-ui.tsx` (no other WT) |
| Push | **`origin/main`** `d856dc8..da24e5a` · **OK** |
| Deploy | Vercel **success** |
| Live tip | `https://www.wgdom.fun/version.json` → `"commit":"da24e5a"` · `"version":"2.65.46"` · `2026-07-26T14:54:25.536Z` |

---

## Production Verification

| Check | Result |
|-------|--------|
| Brak poziomego scrollbara (idle) | **PASS** |
| Tooltip na hover (`display:block`, widoczny) | **PASS** |
| Tooltip na focus klawiaturą (`focus-within`) | **PASS** |
| `.admin-sidebar-scroll` idle: `clientWidth == scrollWidth` | **PASS** (239 == 239, delta 0) |
| `.admin-sidebar-scroll` hover: equal | **PASS** (239 == 239) |
| `.admin-sidebar-scroll` focus: equal | **PASS** (239 == 239) |
| Brak `calc(100%` / `w-max` na tipie | **PASS** |
| Tip nie wystaje poza scrollport (hover/focus) | **PASS** (`tipPastScroll ≈ -12`) |

**Before (prod pre-fix):** scrollWidth **473** / clientWidth **239** (delta **234**).  
**After (`da24e5a`):** delta **0** we wszystkich trzech stanach.

---

## Related docs

- RCA: [`WGDOM-SIDEBAR-REGRESSION-02-RCA.md`](./WGDOM-SIDEBAR-REGRESSION-02-RCA.md)
- Implement: [`WGDOM-SIDEBAR-REGRESSION-02-IMPLEMENT-REPORT.md`](./WGDOM-SIDEBAR-REGRESSION-02-IMPLEMENT-REPORT.md)

---

## Rollback

```text
git revert da24e5a && git push origin main
```

UI-only · bezpieczny rollback.
