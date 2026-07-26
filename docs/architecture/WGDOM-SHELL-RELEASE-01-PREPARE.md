# WGDOM-SHELL-RELEASE-01 — PREPARE RELEASE

> **Status:** OWNER GO · thin App Shell visual release  
> **Date:** 2026-07-26  
> **IN only:** Dashboard · Sidebar · Topbar consumers of existing Wg* on tip `cf76d28`

---

## 1. Release Scope

| | |
|--|--|
| **Epic** | WGDOM-SHELL-RELEASE-01 |
| **Goal** | Wypchnąć zaległy polish App Shell, żeby produkcja ≈ localhost (UI-01B / UI-01C / GDS S2) |
| **Type** | Visual / presentation only |
| **IN** | `DashboardView.tsx`, `AdminSidebar.tsx`, `AdminTopbar.tsx` |
| **OUT** | Roboty, Payroll, Kadry, Przetargi, API, Cloud, Providers, Routing, Theme, Login, Detail Body, wszelkie inne WIP |
| **Deps already on tip** | `src/app/ui/*`, `src/lib/wg-ui-tokens.ts` (`cf76d28`) |
| **Version bump** | Brak osobnego bump changelog w tym commitcie (thin) — tip = nowy SHA; UI label pozostaje ścieżką docs post-deploy |

### PAYROLL SAFETY GATE

| Warstwa | ALL-NIE? |
|---------|----------|
| Persist / write / sync / week / hours / rate / snapshot | **NIE** (nietknięte) |
| Dashboard display KPI (WgKpi wrap) | Presentation only — **nie** zmienia semantyki kwot |

---

## 2. Lista plików (commit body)

1. `src/app/DashboardView.tsx` — UI-01B  
2. `src/app/admin/AdminSidebar.tsx` — UI-01C  
3. `src/app/admin/AdminTopbar.tsx` — GDS S2  

**Zakaz:** żaden inny plik z working tree.

---

## 3. Ryzyka

| ID | Ryzyko | Mitigacja |
|----|--------|-----------|
| R1 | Topbar + ThemeToggle className — WT ThemeToggle nie wchodzi | API HEAD: `{ className? }` — kompatybilne |
| R2 | Sidebar horizontal scroll / truncate | Już naprawione w 01C (`min-w-0`) — smoke desktop |
| R3 | Dashboard KPI layout regress (3+2 wrap) | Smoke Pulpit desktop + mobile width |
| R4 | Przypadkowe dołączenie WIP | Explicit `git add` 3 paths only + verify staged |
| R5 | Tip SSOT docs zostaje za tipem do osobnego docs commit | Post-deploy baseline update |

---

## 4. Smoke Checklist (pre-push lokalnie)

- [ ] `git diff --cached --name-only` = dokładnie 3 pliki  
- [ ] Build PASS  
- [ ] Typecheck PASS (lub tylko znany TS5101)  
- [ ] Pulpit: WgKpi (brak JetBrains Mono wall na KPI)  
- [ ] Sidebar: sekcje + active rail  
- [ ] Topbar: glass utility cluster + WgButton icons  

---

## 5. Production Verification Plan

1. `curl -s https://www.wgdom.fun/version.json` → nowy `commit` ≠ `cf76d28`  
2. Hard refresh Pulpit — KPI = WgKpi language  
3. Desktop Sidebar — section labels + active tint/rail  
4. Topbar — glass cluster, search/settings/logout, theme toggle działa  
5. Nawigacja Pulpit → Roboty → Lista płac (smoke, bez edycji payroll)  
6. Mobile: topbar + dashboard scroll OK  

---

## 6. Rollback Plan

1. `git revert <SHELL_SHA>` na `main` + push (preferowane)  
   **lub** redeploy poprzedniego deploymentu Vercel `@ cf76d28`  
2. Verify `version.json.commit` wraca do `cf76d28`  
3. Brak migracji danych — rollback UI-only safe  
