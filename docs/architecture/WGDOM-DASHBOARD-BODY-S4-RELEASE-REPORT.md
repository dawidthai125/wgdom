# WGDOM-DASHBOARD-BODY-S4 — RELEASE REPORT

> **Status:** **PRODUCTION VERIFIED**  
> **Date:** 2026-07-26  
> **Feature commit:** `bd0f239`  
> **Prior tip:** `9d801f4` (docs) / S3 feature `ca08c75`  
> **UI version.json:** `2.65.46` (thin UI — tip = SHA)

---

## Summary

Shipped Dashboard Body **S4**: widget **Przetargi — skrót** migrated to GDS (`WgCard` soft, GDS KPI tiles without `TEUX_*`, `WgButton` secondary CTA). No pipeline/scoring/API changes. No other working-tree WIP in this release.

---

## Pipeline

| Step | Result |
|------|--------|
| Commit | **`bd0f239d8cab2ae72ab5230c39fa0c1c40933bb8`** · `feat(dashboard): migrate Przetargi shortcut to GDS WgCard soft (BODY-S4)` |
| Staged scope | **3 files only** — `src/app/tenders/components/TendersShortcutPanel.tsx` · DF · IMPLEMENT REPORT |
| Thin confirm | **PASS** — zero `DashboardView` · Payroll · S1–S3 · other WT |
| Push | **`origin/main`** `9d801f4..bd0f239` · **OK** |
| Deploy | Vercel Git Integration · **success** |
| Live tip | `https://www.wgdom.fun/version.json` → `"commit":"bd0f239"` · `"version":"2.65.46"` · `2026-07-26T18:01:39.918Z` |

---

## Production Verification

| Check | Result |
|-------|--------|
| `version.json.commit` = `bd0f239` | **PASS** |
| Skrót = `WgCard` soft (`border-border/60` + soft shadow + `p-4`) | **PASS** |
| Title `text-sm font-semibold` · subtitle `text-xs` | **PASS** |
| 3 KPI tiles (`data-teux7e-kpi`) · semantyka counts zachowana | **PASS** |
| Brak residue `TEUX_KPI` / `TEUX_FONT` w DOM | **PASS** |
| CTA `WgButton` secondary (`bg-secondary`) · **0** Primary | **PASS** |
| Hero Primary = 1 | **PASS** |
| Build | **PASS** |
| `test:e2e:ui-guard` @ prod | **9/9 PASS** |
| Login smoke P0-A | **PASS 11/0** |

PV helper: `scripts/pv-dashboard-body-s4-przetargi.mjs` → **PV PASS**.

---

## Related docs

- DF: [`WGDOM-DASHBOARD-BODY-S4-DESIGN-FREEZE.md`](./WGDOM-DASHBOARD-BODY-S4-DESIGN-FREEZE.md)
- Implement: [`WGDOM-DASHBOARD-BODY-S4-IMPLEMENT-REPORT.md`](./WGDOM-DASHBOARD-BODY-S4-IMPLEMENT-REPORT.md)
- Prior: S1–S3 release reports · Tip SSOT: [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

---

## Rollback

```text
git revert bd0f239 && git push origin main
```

UI-only · bezpieczny rollback.

---

**WGDOM-DASHBOARD-BODY-S4**  
**Status: PRODUCTION VERIFIED · COMPLETE**
