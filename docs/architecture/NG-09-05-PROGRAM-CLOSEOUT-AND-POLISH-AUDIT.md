# NG-09-05 — Program Closeout & Polish · AUDIT

> **Status:** **READ ONLY** · **IMPLEMENT BLOCKED**  
> **Data:** 2026-07-09  
> **Program:** NG-09 — Inspector Workspace Modernization · slice **5/5** (plan)  
> **Wejście:** NG-09-04 **CLOSED** (2.63.83) · compositional architecture proven (5 slices planned, 4 CLOSED)

---

## 1. Executive Summary

**NG-09-05** (planowany) to **ostatni slice** programu NG-09: wydzielenie **overlays / modal layer** z `InspectorPanel.tsx`, cleanup duplikatów pomocniczych (np. `recoverableStatsByJobId`), oraz polish orchestratora po pełnej dekomponycji Frame → L1 → L2 → Sync.

**Audit verdict:** **PROGRAM HEALTHY — NG-09-05 NOT READY FOR OWNER GO** (wymaga Slice AUDIT freeze + allowlist przed GO). **Nie rozpoczynać implementacji** bez explicit Owner GO.

---

## 2. Stan programu po NG-09-04

| Metryka | Wartość |
|---------|---------|
| `InspectorPanel.tsx` | **~774 LOC** (orchestrator UI + overlays + handlers) |
| `useInspectorDataSync.ts` | **~604 LOC** (sync/state) — **NG-09-04 CLOSED** |
| `InspectorJobWorkspace.tsx` | **~721 LOC** (L2 UI) — **NG-09-03 CLOSED** |
| `InspectorViewRouter.tsx` | **~224 LOC** (L1) — **NG-09-02 CLOSED** |
| `InspectorShell` + CommandLayer + Sidebar | stabilne — **NG-09-01 CLOSED** |
| Overlays w panelu | **~120+ LOC** — **target NG-09-05** |

**Architektura compositional (post NG-09-04):**

```
InspectorPanel (orchestrator UI)
├── useInspectorDataSync (NG-09-04 CLOSED)
├── InspectorShell
│   ├── InspectorCommandLayer
│   ├── InspectorSidebar (L1)
│   └── workspace:
│       ├── selectedJob ? InspectorJobWorkspace (L2) ← NG-09-03 CLOSED
│       └── : InspectorViewRouter (L1) ← NG-09-02 CLOSED
└── overlays + FAB + Toaster (NG-09-05 target)
```

---

## 3. NG-09-05 — proponowany zakres (draft)

| Element | W NG-09-05 | Poza NG-09-05 |
|---------|------------|---------------|
| Lightbox overlay (`lightbox` state + render) | **TAK** | |
| `JobFilePreviewModal` (`previewItem`) | **TAK** | |
| Operational notes full-screen overlay | **TAK** (move/extract) | sync commit logic |
| `InspectorQuickPhotoFab` (L1 only) | **TAK** (move/extract) | upload handlers |
| Admin notes pending banner (CommandLayer slot) | **Opcjonalnie** — polish only | |
| `recoverableStatsByJobId` dedup panel/router | **TAK** (shared helper lub props) | |
| `Toaster` placement / shell integration | **Opcjonalnie** — polish | |
| Sync / cloud / `updateJob` semantics | | **NG-09-04 CLOSED** |
| L1/L2 workspace UI | | **NG-09-02/03 CLOSED** |
| `cloud-sync.ts` kernel | | **Protected Core OFF** |

---

## 4. Inventory overlays (baseline NG-09-04)

| Overlay / modal | Lokalizacja | Stan | Uwagi |
|-----------------|-------------|------|-------|
| Photo lightbox | `InspectorPanel.tsx` L766–774 | inline JSX | `setLightbox` z `InspectorJobWorkspace` callback |
| File preview modal | `InspectorPanel.tsx` L776–782 | `JobFilePreviewModal` | `previewItem` state w panelu |
| Quick photo FAB | `InspectorPanel.tsx` L784–790 | `InspectorQuickPhotoFab` | tylko gdy `!selectedJob` |
| Operational notes | `InspectorPanel.tsx` L800–824 | full-screen `OperationalNotesView` | `commitOperationalNotes` z hooka |
| Toast host | `InspectorPanel.tsx` L792–798 | `Toaster` (sonner) | globalny dla panelu |
| Admin notes banner | CommandLayer slot w panelu | inline | badge pending admin notes |

**Cel slice:** cienki panel — overlays w dedykowanym komponencie (np. `InspectorOverlays` / `InspectorModalLayer`) z props/callbacks z panelu i hooka.

---

## 5. Duplicate logic — `recoverableStatsByJobId`

Identyczny wzorzec `useMemo` + `getRecoverableChargeJobStats` w:

| Plik | Linie (approx) | Kontekst |
|------|----------------|----------|
| `InspectorPanel.tsx` | ~294–303 | badge L2 job sections (`jobSectionBadges`) |
| `InspectorViewRouter.tsx` | ~57–66 | KPI na kartach L1 (`InspectorJobCard`) |

**Ryzyko:** drift przy zmianie reguł recoverable charges — dwa miejsca do aktualizacji.

**Propozycja NG-09-05:** shared helper `buildRecoverableStatsByJobId(jobs, charges)` w `@/lib/recoverable-charges` **lub** props z panelu do routera (panel już ma `recoverableCharges`).

**Poza scope jeśli:** zmiana wymaga dotknięcia `JobsView.tsx` (osobny maintenance — ten sam wzorzec L1279).

---

## 6. Preconditions checklist

| # | Precondition | Status |
|---|--------------|--------|
| P1 | NG-09-01…04 CLOSED on main | **PASS** |
| P2 | Sync seam proven (`useInspectorDataSync`) | **PASS** |
| P3 | L2 callback pattern proven (onLightbox, onPreview) | **PASS** |
| P4 | #CORE-013 — polish slice isolated from sync/kernel | **REQUIRED at Owner GO** |
| P5 | Protected Core OFF | **REQUIRED** |
| P6 | Slice AUDIT + allowlist freeze | **THIS DOCUMENT** — Owner GO pending |
| P7 | Program closeout criteria defined | **OPEN** — patrz §8 |

---

## 7. Proponowana allowlist (draft — nie zamrożona)

| Plik | Akcja |
|------|-------|
| **NEW** `src/app/inspector/InspectorOverlays.tsx` (lub similar) | NEW — lightbox, preview, op-notes shell, FAB |
| `src/app/InspectorPanel.tsx` | MOD — cienki orchestrator |
| **NEW** (optional) `src/lib/recoverable-charges-stats.ts` | NEW — dedup helper |
| `src/app/inspector/InspectorViewRouter.tsx` | MOD (optional) — consume shared stats |
| `useInspectorDataSync.ts` | **OFF** |
| `InspectorJobWorkspace.tsx` | **OFF** (props unchanged) |
| `cloud-sync.ts` | **OFF** |

---

## 8. Program closeout criteria (NG-09 epic)

Po NG-09-05 program NG-09 powinien spełnić:

| # | Kryterium | Stan (pre-05) |
|---|-----------|---------------|
| C1 | `InspectorPanel.tsx` ≤ ~500 LOC orchestrator (cel programu) | **PARTIAL** — 774 LOC (overlays + handlers pozostały) |
| C2 | Compositional seams: Shell / L1 / L2 / Sync / Overlays | **4/5** — overlays inline |
| C3 | Zero duplikatów recoverable stats panel/router | **FAIL** — duplikat aktywny |
| C4 | Smoke + assignment gates green | **PASS** (post NG-09-04) |
| C5 | Manual QA full inspector flow | **PASS** M1–M7 (NG-09-04 harness) |
| C6 | Protected Core untouched | **PASS** |
| C7 | Epic closeout doc `NG-09-EPIC-CLOSE-REPORT.md` | **NOT STARTED** — po NG-09-05 |

---

## 9. Risk register (NG-09-05)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Regresja overlay z-index / safe-area | Medium | manual mobile QA · reuse existing classes |
| Op-notes overlay unmount race | **High** | nie zmieniać `commitOperationalNotes` contract · props only |
| FAB visibility (`!selectedJob`) | Medium | smoke + manual L1 |
| Over-extraction (nowy context/provider) | Medium | follow NG-09-02/03/04 props pattern — **no new global state** |
| Mixed bundle polish + sync | **High** | #CORE-013 — **zero** hook diff |
| recoverable stats refactor scope creep | Low | allowlist strict · optional defer to maintenance |

---

## 10. Test gates (propozycja)

| Gate | Wymagany |
|------|----------|
| `npm run build` | **TAK** |
| `smoke-test-inspector-20.2a.mjs` | **TAK** |
| `smoke-test-inspector-job-assignment.mjs` | **TAK** |
| Gate B payroll 16/16 | **TAK** |
| Reuse / extend `ng-09-04-manual-qa.spec.ts` (M1–M7) | **TAK** |
| Manual: lightbox + preview + op-notes overlay + FAB | **TAK** |
| Scroll smoke maintenance | **Zalecany** (osobny debt) |

---

## 11. Maintenance debt (program)

| Item | Wpływ na NG-09-05 |
|------|-------------------|
| `smoke-test-inspector-scroll-20.1d1.mjs` grep L1/L2 | Niski — osobny task |
| `JobsView.tsx` recoverable stats duplicate | Poza allowlist — document only |
| E2E harness uncommitted (`e2e/ng-09-04-manual-qa.spec.ts`) | Commit opcjonalny przy NG-09-05 QA |

---

## 12. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Program NG-09 zdrowy? | **TAK** — 4/5 slices CLOSED · seams proven |
| NG-09-05 gotowy na Owner GO? | **NIE** — wymaga **allowlist freeze** + Owner GO |
| NG-09-05 IMPLEMENT? | **BLOCKED** |
| Epic NG-09 closeout? | **BLOCKED** — po NG-09-05 + epic report |

**Następny krok:** Owner GO → Design Freeze slice NG-09-05 → IMPLEMENT (allowlist strict) → BUILD → TEST → RELEASE → VERIFY → **NG-09 EPIC CLOSE**.
