# NG-09-05 — Inspector Program Closeout & Polish · Bundle Closeout

> **Status:** **NG-09-05 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.84** · implement **`c5aa953`** · release **`29f7842`** · https://www.wgdom.fun  
> **Verify:** `curl -s https://www.wgdom.fun/version.json` → **2.63.84** @ **`29f7842`** · `2026-07-10T03:12:15Z`  
> **Parent:** NG-09 Inspector Workspace Modernization · slice **5/5** (final)

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Wydzielenie warstwy overlay z `InspectorPanel.tsx` do `InspectorOverlays`; dedup `buildRecoverableStatsByJobId` |
| **Deliverable** | Controlled overlay layer (lightbox, preview, FAB, Toaster, op-notes) · pure stats helper |
| **Complexity** | **S** — 1 NEW + 3 MOD |
| **Rollback** | `git revert` release + implement commits |

---

## 2. Zakres zamknięty (allowlist A1–A4)

| Plik | Akcja | Status |
|------|-------|--------|
| `src/app/inspector/InspectorOverlays.tsx` | NEW (~132 LOC) | **CLOSED** |
| `src/app/InspectorPanel.tsx` | MOD — wire overlays, remove inline JSX | **CLOSED** |
| `src/lib/recoverable-charges.ts` | MOD — `buildRecoverableStatsByJobId` | **CLOSED** |
| `src/app/inspector/InspectorViewRouter.tsx` | MOD — shared helper in `useMemo` | **CLOSED** |

**Forbidden zero diff:** `useInspectorDataSync.ts` · `InspectorJobWorkspace.tsx` · `cloud-sync.ts` — **verified**

**LOC waiver:** `InspectorPanel.tsx` ~777 LOC (Design Freeze waiver ~650) — **accepted**; epic closes 5 compositional seams.

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | `InspectorOverlays.tsx` — lightbox, preview, FAB, Toaster, op-notes | **PASS** |
| D2 | Panel bez inline overlay JSX (L766–824 baseline) | **PASS** |
| D3 | Z-index stack z-40 / z-70 / z-100 unchanged | **PASS** |
| D4 | `buildRecoverableStatsByJobId` pure (no React in lib) | **PASS** |
| D5 | `useInspectorDataSync` / `InspectorJobWorkspace` zero diff | **PASS** |
| D6 | `smoke-test-inspector-20.2a.mjs` | **PASS** 22/22 |
| D7 | `smoke-test-inspector-job-assignment.mjs` | **PASS** 12/12 |
| D8 | Gate B payroll | **PASS** 16/16 |
| D9 | Manual QA M1–M9 (Playwright) | **PASS** 9/9 |
| D10 | `npm run build` | **PASS** |
| D11 | CHANGELOG **2.63.84** · verify curl | **PASS** · **2.63.84** @ **`29f7842`** |
| D12 | #CORE-013 / #CORE-014 | **PASS** |
| D13 | 5/5 compositional seams (AC12) | **PASS** |

**Pre-existing waivers (unchanged):** `smoke-test-inspector-billing-20.5a3a.mjs` T6 · `smoke-test-inspector-billing-proposal-20.5a6.mjs` T14.

**Maintenance debt:** `smoke-test-inspector-scroll-20.1d1.mjs` — grep L1/L2 w router/workspace (osobny task).

---

## 4. Commits

| Commit | Opis |
|--------|------|
| **`c5aa953`** | feat(inspector): NG-09-05 Program Closeout — InspectorOverlays extraction |
| **`29f7842`** | release: NG-09-05 Inspector Program Closeout & Polish v2.63.84 |

---

## 5. Epic NG-09 — status końcowy

| Bundle | Status |
|--------|--------|
| NG-09-01 Workspace Frame | **CLOSED** · 2.63.80 |
| NG-09-02 View Router L1 | **CLOSED** · 2.63.81 |
| NG-09-03 Job Workspace L2 | **CLOSED** · 2.63.82 |
| NG-09-04 Sync / Data Layer | **CLOSED** · 2.63.83 |
| **NG-09-05** Program Closeout & Polish | **CLOSED** · 2.63.84 |

**Epic NG-09:** **COMPLETE** · SSOT: [`NG-09-EPIC-CLOSE-REPORT.md`](NG-09-EPIC-CLOSE-REPORT.md)

**Następny krok:** **STABILIZATION WINDOW** — brak nowych programów/bundli bez Owner GO.
