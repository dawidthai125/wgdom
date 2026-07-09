# NG-09-04 — Sync / Data Layer · Program Health Review

> **Status:** **READ ONLY** · **IMPLEMENT BLOCKED**  
> **Data:** 2026-07-09  
> **Program:** NG-09 — Inspector Workspace Modernization · slice **4/5** (plan)  
> **Wejście:** NG-09-03 **CLOSED** (2.63.82) · Design Freeze v1.0 (program)

---

## 1. Executive Summary

**NG-09-04** (planowany) to wydzielenie warstwy **sync/data** z `InspectorPanel.tsx` — `refreshFromCloud`, `persistJobs`, storage listeners, operational notes commit — do hooka/komponentu orchestratora (np. `useInspectorDataSync`), **bez** zmiany kontraktu cloud keys ani assignment.

**Health verdict:** **PROGRAM HEALTHY — NG-09-04 NOT READY FOR OWNER GO** (wymaga slice AUDIT + allowlist freeze przed GO).

---

## 2. Stan programu po NG-09-03

| Metryka | Wartość |
|---------|---------|
| `InspectorPanel.tsx` | **~1362 LOC** (orchestrator) |
| `InspectorJobWorkspace.tsx` | **~721 LOC** (L2 UI) |
| `InspectorViewRouter.tsx` | **~224 LOC** (L1) |
| `InspectorShell` + CommandLayer + Sidebar | stabilne (NG-09-01) |
| Sync block w panelu | **~400+ LOC** — **target NG-09-04** |
| Overlays (lightbox, preview, modals) | w panelu — **NG-09-05** (plan) |

**Architektura compositional (post NG-09-03):**

```
InspectorPanel (orchestrator)
├── sync/state (NG-09-04 target)
├── InspectorShell
│   ├── InspectorCommandLayer
│   ├── InspectorSidebar (L1)
│   └── workspace:
│       ├── selectedJob ? InspectorJobWorkspace (L2) ← NG-09-03 CLOSED
│       └── : InspectorViewRouter (L1) ← NG-09-02 CLOSED
└── overlays (NG-09-05 target)
```

---

## 3. NG-09-04 — proponowany zakres (z Design Freeze programu)

| Element | W NG-09-04 | Poza NG-09-04 |
|---------|------------|---------------|
| `refreshFromCloud` extraction | **TAK** | |
| `persistJobs` / push orchestration | **TAK** | |
| Storage event listeners | **TAK** | |
| Operational notes cloud commit | **TAK** (lub współdzielony hook) | |
| `updateJob` semantics | **bez zmian** — panel lub hook, ten sam kontrakt | |
| `jobsAll` ownership | **panel lub hook** — DF-11 | |
| Cloud keys / merge logic | **reuse** `cloud-sync.ts` — **OFF** modyfikacji kernel | |
| L1/L2 routers | | **CLOSED slices** |
| UI polish / overlays cleanup | | **NG-09-05** |

---

## 4. Preconditions checklist

| # | Precondition | Status |
|---|--------------|--------|
| P1 | NG-09-01…03 CLOSED on main | **PASS** |
| P2 | L2 workspace seam proven (callbacks pattern) | **PASS** |
| P3 | #CORE-013 — sync slice isolated from UI | **REQUIRED at Owner GO** |
| P4 | Protected Core OFF (`cloud-sync.ts` kernel) | **REQUIRED** — hook only |
| P5 | Payroll gate B unaffected | **EXPECTED PASS** |
| P6 | Slice AUDIT + allowlist freeze | **NOT STARTED** |

---

## 5. Risk register (NG-09-04)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Regresja sync / stale apply | **Critical** | allowlist strict · brak zmian merge · smoke + manual multi-tab |
| Mixed bundle sync + L2 UI | **High** | #CORE-013 — **zero** job workspace diff |
| Operational notes race | **High** | reuse PLATFORM-SYNC-01A patterns · nie duplikować reconcile |
| Hook vs context API sprzeczność | Medium | follow existing `usePullToRefresh` / panel patterns |
| Assignment filter regression | **High** | `filterJobsForInspector` unchanged · smoke 12/12 |

---

## 6. Proponowana allowlist (draft — nie zamrożona)

| Plik | Akcja |
|------|-------|
| **NEW** `src/app/inspector/useInspectorDataSync.ts` (lub similar) | NEW |
| `src/app/InspectorPanel.tsx` | MOD — cienki orchestrator UI |
| `src/lib/cloud-sync.ts` | **OFF** |
| `InspectorJobWorkspace.tsx` | **OFF** |
| `InspectorViewRouter.tsx` | **OFF** |

---

## 7. Test gates (propozycja)

| Gate | Wymagany |
|------|----------|
| `npm run build` | **TAK** |
| `smoke-test-inspector-20.2a.mjs` | **TAK** |
| `smoke-test-inspector-job-assignment.mjs` | **TAK** |
| Gate B payroll 16/16 | **TAK** |
| Manual: sync pull/push w job detail + L1 | **TAK** |
| Manual: operational notes unread badge | **Zalecany** |

---

## 8. Maintenance debt (program)

| Item | Wpływ na NG-09-04 |
|------|-------------------|
| Scroll smoke grep L1/L2 | Niski — osobny maintenance |
| E2E `ng-09-03-manual-qa.spec.ts` | Reuse pattern dla sync QA |
| `recoverableStatsByJobId` duplikat panel/router | Niski — NG-09-05 cleanup |

---

## 9. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Program NG-09 zdrowy? | **TAK** — 3/5 slices CLOSED · compositional seams proven |
| NG-09-04 gotowy na Owner GO? | **NIE** — wymaga **Slice AUDIT** + allowlist freeze |
| NG-09-04 IMPLEMENT? | **BLOCKED** |
| NG-09-05 | **BLOCKED** |

**Następny krok:** **NG-09-04 Slice AUDIT** (read-only) → Readiness Review → Owner GO.
