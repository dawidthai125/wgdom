# NG-09-04 — Inspector Data Sync Layer · Bundle Closeout

> **Status:** **NG-09-04 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.83** · implement **`143f6d0`** · release **`c1d1caf`** · https://www.wgdom.fun  
> **Verify:** `curl -s https://www.wgdom.fun/version.json` → **2.63.83** @ **`c1d1caf`** · `2026-07-09T21:07:25Z`  
> **Parent:** NG-09 Inspector Workspace Modernization · slice **4/5**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Wydzielenie warstwy sync/data z `InspectorPanel.tsx` do hooka `useInspectorDataSync` |
| **Deliverable** | Hook sync/state · panel jako orchestrator UI + overlays + mutation handlers |
| **Complexity** | **M** — 1 plik NEW + 1 MOD |
| **Rollback** | `git revert` release + implement commits |

---

## 2. Zakres zamknięty (allowlist)

| Plik | Akcja | Status |
|------|-------|--------|
| `src/app/inspector/useInspectorDataSync.ts` | NEW (~604 LOC) | **CLOSED** |
| `src/app/InspectorPanel.tsx` | MOD — orchestrator UI (~774 LOC) | **CLOSED** |

**Nietknięte:** `InspectorJobWorkspace` · `InspectorViewRouter` · `InspectorShell` · `cloud-sync.ts` kernel · Protected Core.

**Frozen hook API (AC12):** data state, sync status, `updateJob`, `commitOperationalNotes`, op-notes setters, `refreshFromCloud`, `pullRefresh`, `handleCloudSyncClick`, `cloudStatus`, `cloudSyncTitle` — bez eksportu mutable refs.

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | Sync block (`refreshFromCloud`, persist, storage listeners, op-notes commit) w hooku | **PASS** |
| D2 | Panel zachowuje navigation, overlays, mutation handlers | **PASS** |
| D3 | L1/L2 routers bez zmian | **PASS** |
| D4 | `InspectorPanel` mniejszy niż po NG-09-03 (1362→~774 LOC) | **PASS** |
| D5 | `smoke-test-inspector-20.2a.mjs` | **PASS** 22/22 |
| D6 | `smoke-test-inspector-job-assignment.mjs` | **PASS** 12/12 |
| D7 | Manual QA M1–M7 (Playwright 7/7) | **PASS** |
| D8 | `npm run build` | **PASS** |
| D9 | CHANGELOG **2.63.83** · verify curl | **PASS** · **2.63.83** @ **`c1d1caf`** |
| D10 | #CORE-013 / #CORE-014 | **PASS** |

**Maintenance debt:** `smoke-test-inspector-scroll-20.1d1.mjs` — grep L1/L2 w router/workspace (osobny task).

---

## 4. Commits

| Commit | Opis |
|--------|------|
| **`143f6d0`** | feat(inspector): NG-09-04 Data Sync Layer — useInspectorDataSync extraction |
| **`c1d1caf`** | release: NG-09-04 Inspector Data Sync Layer v2.63.83 |

---

## 5. Następny krok programu NG-09

| Bundle | Status |
|--------|--------|
| NG-09-01 Workspace Frame | **CLOSED** · 2.63.80 |
| NG-09-02 View Router L1 | **CLOSED** · 2.63.81 |
| NG-09-03 Job Workspace L2 | **CLOSED** · 2.63.82 |
| **NG-09-04** Sync / Data Layer | **CLOSED** · 2.63.83 |
| **NG-09-05** Program Closeout & Polish | **CLOSED** · 2.63.84 |
