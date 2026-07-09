# NG-09-03 — Job Workspace Router · Bundle Readiness Review

> **Status:** **READINESS REVIEW** · **IMPLEMENT BLOCKED**  
> **Data:** 2026-07-09  
> **Program:** NG-09 — Inspector Workspace Modernization · slice **3/5** (plan)  
> **Wejście:** NG-09-01 **CLOSED** · NG-09-02 **CLOSED** · Design Freeze v1.0 (program)

---

## 1. Executive Summary

**NG-09-03** (planowany) to wydzielenie **Job Workspace** — routingu L2 (`selectedJob` + `jobSection`) z monolitu `InspectorPanel.tsx` do dedykowanego komponentu (np. `InspectorJobWorkspace` / `InspectorJobViewRouter`), analogicznie do NG-09-02 dla L1.

**Readiness verdict:** **READY FOR AUDIT** — preconditions spełnione po NG-09-02; **Owner GO wymagany** przed IMPLEMENT.

---

## 2. Stan po NG-09-02 (baseline)

| Metryka | Wartość |
|---------|---------|
| `InspectorPanel.tsx` | **~1821 LOC** |
| `InspectorViewRouter.tsx` | **~224 LOC** (L1) |
| Job detail inline w panelu | **~600+ LOC** (szacunek: header + 6 sekcji + upload/handover) |
| Sync / `refreshFromCloud` | **w panelu** (~400+ LOC) — **poza NG-09-03** (NG-09-04) |
| `InspectorShell` | stabilny — **bez zmian** w NG-09-03 |

---

## 3. Proponowany zakres NG-09-03 (z PLAN / Design Freeze)

| Element | W NG-09-03 | Poza NG-09-03 |
|---------|------------|---------------|
| Job detail chrome (back, adres, progress, handover bar) | **TAK** | |
| `InspectorJobSectionNav` + routing sekcji | **TAK** | |
| Sekcje: wm, files, docs, team, reports, photos | **TAK** (move/render) | |
| `selectedId`, `jobSection` state ownership | **decyzja freeze** — likely panel orchestrator | |
| Upload handlers, billing, delivery package | **props/callbacks** z panelu | mutacje sync |
| `refreshFromCloud`, `persistJobs`, cloud keys | | **NG-09-04** |
| L1 `InspectorViewRouter` | | **NG-09-02 CLOSED** |
| Protected Core | | **OFF** |

---

## 4. Preconditions checklist

| # | Precondition | Status |
|---|--------------|--------|
| P1 | NG-09-01 Frame on prod | **PASS** (2.63.80+) |
| P2 | NG-09-02 L1 router on prod | **PASS** (2.63.81 release) |
| P3 | L1/L2 nav separation frozen (DF-09 max 2 levels) | **PASS** |
| P4 | Job assignment SSOT (`filterJobsForInspector`) | **PASS** — unchanged |
| P5 | Smoke 20.2A dashboard/KPI | **PASS** |
| P6 | Scroll smoke maintenance (router file) | **OPEN** — nie blokuje AUDIT |

---

## 5. Proponowana allowlist (draft — do Design Freeze slice)

| Plik | Akcja |
|------|-------|
| `InspectorPanel.tsx` | MOD — orchestrator |
| `InspectorNavigation.tsx` | MOD (minimal — `getJobSections` SSOT) |
| **NEW** `InspectorJobWorkspace.tsx` lub `InspectorJobViewRouter.tsx` | NEW |
| Existing section panels (reuse, minimal diff) | `InspectorDocChecklist`, `JobInspectorFilesPanel`, `InspectorPhotoGallery`, `JobWmPanel`, … |

**OFF:** `cloud-sync.ts`, `App.tsx`, sync hooks extraction (NG-09-04).

---

## 6. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Regresja uploadów / handover | **High** | allowlist per section · smoke + manual QA job detail |
| Prop drilling explosion | Medium | typed workspace props bundle (pattern AdminViewRouter) |
| `selectedId` race z sync | Medium | state stays in panel until NG-09-04 |
| Scroll / pull-to-refresh job detail | Medium | preserve `jobScrollRef` + `jobPull` wiring |
| Mixed bundle sync + UI | **High** | #CORE-013 — **BLOCK** sync moves in NG-09-03 |

---

## 7. Test plan (draft)

| Test | Gate |
|------|------|
| `smoke-test-inspector-20.2a.mjs` | PASS |
| `smoke-test-inspector-job-assignment.mjs` | PASS |
| Manual: 6 sekcji job detail + back nav + L2 badges | Owner |
| Gate B payroll (no inspector diff in payroll) | PASS if allowlist respected |

---

## 8. Owner GO readiness

| Gate | Status |
|------|--------|
| Program Design Freeze (parent) | **PASS** (v1.0 chat/doc) |
| Slice AUDIT (Job Workspace) | **NOT STARTED** |
| Slice ARCH REVIEW | **NOT STARTED** |
| **Owner GO NG-09-03** | **NOT ISSUED** |

**Recommended next workflow step:**

```text
AUDIT (Job Workspace L2) → slice allowlist freeze → ARCH REVIEW → Owner GO → IMPLEMENT NG-09-03
```

**NG-09-03 IMPLEMENT:** **BLOCKED**
