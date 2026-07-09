# NG-09-03 — Inspector Job Workspace (L2) · Bundle Closeout

> **Status:** **NG-09-03 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.82** · implement **`66859e9`** · release **`8b7124b`** · https://www.wgdom.fun  
> **Verify:** `curl -s https://www.wgdom.fun/version.json` → **2.63.82** @ **`8b7124b`** · `2026-07-09T20:04:15Z`  
> **Parent:** NG-09 Inspector Workspace Modernization · slice **3/5**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Wydzielenie Job Workspace L2 — `InspectorJobWorkspace` dla 6 sekcji job detail |
| **Deliverable** | Job workspace UI · panel jako orchestrator (sync/state/overlays) |
| **Complexity** | **M** — 1 plik NEW + 1 MOD |
| **Rollback** | `git revert` release + implement commits |

---

## 2. Zakres zamknięty (allowlist)

| Plik | Akcja | Status |
|------|-------|--------|
| `src/app/inspector/InspectorJobWorkspace.tsx` | NEW | **CLOSED** |
| `src/app/InspectorPanel.tsx` | MOD — orchestrator | **CLOSED** |

**Nietknięte:** `InspectorViewRouter` · `InspectorShell` · `cloud-sync.ts` · sync handlers · Protected Core.

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | 6 sekcji L2 przez `InspectorJobWorkspace` | **PASS** |
| D2 | Panel orchestrator — `refreshFromCloud` / `persistJobs` / `updateJob` w panelu | **PASS** |
| D3 | L1 `InspectorViewRouter` bez zmian | **PASS** |
| D4 | `InspectorPanel` mniejszy niż po NG-09-02 (1821→~1362 LOC) | **PASS** |
| D5 | `smoke-test-inspector-20.2a.mjs` | **PASS** 22/22 |
| D6 | `smoke-test-inspector-job-assignment.mjs` | **PASS** 12/12 |
| D7 | Manual QA L2 (Playwright 14/14) | **PASS** |
| D8 | `npm run build` | **PASS** |
| D9 | CHANGELOG **2.63.82** · verify curl | **PASS** · **2.63.82** @ **`8b7124b`** |
| D10 | #CORE-013 / #CORE-014 | **PASS** |

**Maintenance debt:** `smoke-test-inspector-scroll-20.1d1.mjs` — grep L1/L2 w router/workspace (osobny task).

---

## 4. Commits

| Commit | Opis |
|--------|------|
| **`66859e9`** | feat(inspector): NG-09-03 Job Workspace L2 |
| **`8b7124b`** | release: NG-09-03 Inspector Job Workspace v2.63.82 |

---

## 5. Następny krok programu NG-09

| Bundle | Status |
|--------|--------|
| NG-09-01 Workspace Frame | **CLOSED** · 2.63.80 |
| NG-09-02 View Router L1 | **CLOSED** · 2.63.81 |
| **NG-09-03** Job Workspace L2 | **CLOSED** · 2.63.82 |
| **NG-09-04** Sync / Data Layer | **BLOCKED** — [`NG-09-04-PROGRAM-HEALTH-REVIEW.md`](NG-09-04-PROGRAM-HEALTH-REVIEW.md) |
| NG-09-05 Polish | **BLOCKED** |
