# WGDOM-UI-FOUNDATION-01 — FOUNDATION REPORT

> **WGDOM UI FOUNDATION v1.0**  
> **Status:** **COMPLETE**  
> **Date:** 2026-07-26  
> **Deploy tip:** `2a99e54`  
> **UI version.json:** `2.65.46`

---

## Pipeline

| Step | Result |
|------|--------|
| Commit (A11Y Foundation) | **`780b41ec46900a232c35d50763b4d7accb6a78ee`** · `feat(a11y): A11Y-01 focus-visible ring for Roboty cards and detail tabs` |
| Commit (UI Regression Guard) | **`2a99e54a37f86646fd9137057d9efff7eaf80460`** · `test(ui): add e2e-ui-guard App Shell regression suite (T01–T08 + RG-09/10)` |
| Staged scope | **Thin only** — A11Y (3 src + 2 docs) + Guard (e2e + config + 2 docs). **No** Payroll / Login / Cloud / other WT |
| Push | **`origin/main`** `d9ee56c..2a99e54` · **OK** |
| Deploy | Vercel Git Integration · **success** |
| Live tip | `https://www.wgdom.fun/version.json` → `"commit":"2a99e54"` · `"version":"2.65.46"` · `2026-07-26T15:14:21.436Z` |

---

## Production Verification

| Check | Result |
|-------|--------|
| `version.json.commit` = `2a99e54` | **PASS** |
| `npm run test:e2e:ui-guard` @ `PW_BASE_URL=https://www.wgdom.fun` | **9/9 PASS** (26.6s) |
| T01–T04 · Sidebar scrollWidth / tooltip layout | **PASS** |
| T05 / RG-09 · Dashboard exactly one hero Primary CTA | **PASS** |
| T06–T07 · Roboty focus-visible / detail tabs a11y | **PASS** |
| T08 · Main panels no horizontal overflow | **PASS** |
| RG-10 · Sidebar after tooltip close | **PASS** |

---

## Zamknięte EPIC-y (Foundation v1.0)

| EPIC | Tip / evidence | Status |
|------|----------------|--------|
| **GDS** | Wg* primitives on tip via Roboty **`cf76d28`** · GDS-01 / MAINT **CLOSED** | **CLOSED** |
| **Dashboard** | SHELL-RELEASE-01 **`5888a76`** | **CLOSED** |
| **Sidebar** | **`5888a76`** + SIDEBAR-REGRESSION-02 **`da24e5a`** | **CLOSED** |
| **Topbar** | SHELL-RELEASE-01 **`5888a76`** | **CLOSED** |
| **Roboty Chrome** | UI-01D-A/B/C **`cf76d28`** | **CLOSED** |
| **A11Y Foundation** | A11Y-01 **`780b41e`** | **CLOSED** |
| **UI Regression Guard** | Guard suite **`2a99e54`** · prod **9/9** | **CLOSED** |

---

## Related docs

- A11Y DF / Implement: [`WGDOM-A11Y-01-DESIGN-FREEZE.md`](./WGDOM-A11Y-01-DESIGN-FREEZE.md) · [`WGDOM-A11Y-01-IMPLEMENT-REPORT.md`](./WGDOM-A11Y-01-IMPLEMENT-REPORT.md)
- Guard DF / Implement: [`WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md`](./WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md) · [`WGDOM-UI-REGRESSION-GUARD-01-IMPLEMENT-REPORT.md`](./WGDOM-UI-REGRESSION-GUARD-01-IMPLEMENT-REPORT.md)
- Shell / Sidebar: [`WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md`](./WGDOM-SHELL-RELEASE-01-RELEASE-REPORT.md) · [`WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md`](./WGDOM-SIDEBAR-REGRESSION-02-RELEASE-REPORT.md)
- Tip SSOT: [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

---

## Rollback

```text
# Revert Guard + A11Y (two commits), keep shell/sidebar tip
git revert 2a99e54 780b41e && git push origin main
```

UI / test-only · bezpieczny rollback względem Payroll / Sync.

---

**WGDOM UI FOUNDATION v1.0**  
**Status: COMPLETE**
