# WGDOM-SHELL-RELEASE-01 — RELEASE REPORT

> **Status:** **PRODUCTION VERIFIED**  
> **Date:** 2026-07-26  
> **Feature commit:** `5888a76`  
> **Prior tip:** `cf76d28` (Roboty UI-01D)  
> **UI version.json:** `2.65.46` (bez bump changelog — thin visual; tip = SHA)

---

## Summary

Thin App Shell release closes the gap from **WGDOM-SHELL-CONSISTENCY-01**: Dashboard (UI-01B), Sidebar (UI-01C), and Topbar (GDS S2) were local-only; production still showed legacy shell chrome while Roboty already used Wg*.

Ship = **exactly 3 files**. No Roboty / Payroll / Kadry / Cloud / Login / Theme / other WIP.

---

## Files shipped

| File | Slice |
|------|--------|
| `src/app/DashboardView.tsx` | UI-01B |
| `src/app/admin/AdminSidebar.tsx` | UI-01C |
| `src/app/admin/AdminTopbar.tsx` | GDS S2 |

---

## Release pipeline

| Step | Result |
|------|--------|
| Stage scope | **3 files only** (WIP stashed via `--keep-index`) |
| Build | **PASS** |
| Commit | `5888a76` — `feat(shell): ship App Shell polish — Dashboard, Sidebar, Topbar` |
| Push | `origin/main` `cf76d28..5888a76` |
| Deploy | Vercel **success** |
| Live tip | `https://www.wgdom.fun/version.json` → `"commit":"5888a76"` · `"version":"2.65.46"` · `2026-07-26T14:21:10.798Z` |

---

## Production verification

| Check | Result |
|-------|--------|
| `version.json.commit` = `5888a76` | **PASS** |
| Vercel commit status | **success** |
| Bundle: Sidebar sections `Praca` / `Operacje` | **PASS** (prod `index-*.js`) |
| Bundle: `Zarządzanie Pracą` (sidebar subtitle) | **PASS** |
| Bundle: Dashboard layout `max-w-6xl mx-auto px-4 sm:px-8 py-8` | **PASS** |
| Tip source: `WgKpi` in Dashboard @ `5888a76` | **PASS** (10 hits; `cf76d28` = 0) |
| Tip source: `WG_GLASS_TOOLBAR` / `WgButton` in Topbar | **PASS** |
| Tip source: `NAV_SECTIONS` UI-01C | **PASS** |
| Payroll / Cloud / API / routing | **untouched** |

**Owner visual (recommended):** hard-refresh Pulpit — KPI cards = WgKpi language; Sidebar = section labels + active rail; Topbar = glass utility cluster.

---

## Rollback

```text
git revert 5888a76 && git push origin main
# or redeploy Vercel @ cf76d28
```

UI-only · no data migration.

---

## OUT (explicit — still local WIP)

Roboty body · Payroll · Kadry · Contacts/Directory empty adopters · Login · ThemeToggle · Cloud/Edge · GDS close docs (untracked) · UI-01A DF docs

---

## Tip SSOT

Updated: [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) → deploy tip **`5888a76`**.

Prepare: [`WGDOM-SHELL-RELEASE-01-PREPARE.md`](./WGDOM-SHELL-RELEASE-01-PREPARE.md)
