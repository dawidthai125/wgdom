# SESSION HANDOFF — NG-09 Inspector Workspace Modernization EPIC CLOSE

> **Status:** **EPIC CLOSED** · **prod 2.63.84** · release **`29f7842`** · docs **`1f1167a`** · 2026-07-10  
> **SSOT baseline:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) · [`CURRENT-TASK.md`](../CURRENT-TASK.md)  
> **Closeout report:** [`architecture/NG-09-EPIC-CLOSE-REPORT.md`](architecture/NG-09-EPIC-CLOSE-REPORT.md)

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Epic** | NG-09 Inspector Workspace Modernization |
| **Status** | **COMPLETE · CLOSED** |
| **Prod version** | **2.63.84** |
| **Prod commit (release)** | **`29f7842`** |
| **Verify deploy** | **PASS** (`curl version.json` → **2.63.84**) |
| **Slices** | **5/5 CLOSED** |
| **Outstanding production bugs** | **NONE** (epic scope) |

---

## 2. Architektura końcowa (dla agenta)

Panel inspektora (`InspectorPanel`) = **orchestrator**. Pięć compositional seams:

| # | Seam | Plik |
|---|------|------|
| 1 | Workspace Frame | `InspectorShell` · `InspectorCommandLayer` · `InspectorSidebar` |
| 2 | L1 View Router | `InspectorViewRouter` |
| 3 | L2 Job Workspace | `InspectorJobWorkspace` |
| 4 | Data Sync | `useInspectorDataSync` |
| 5 | Overlay Layer | `InspectorOverlays` |

**Stan overlay** (`lightbox`, `previewItem`, `operationalNotesOpen`) — **tylko w panelu**. `InspectorOverlays` = presentational.

**Z-index (frozen):** op-notes z-40 · preview z-70 · lightbox z-100.

**Stats dedup:** `buildRecoverableStatsByJobId` w `@/lib/recoverable-charges` — pure function; consumers używają `useMemo`.

---

## 3. Releasy w epic

| Wersja | Slice | Commit (release) |
|--------|-------|------------------|
| **2.63.80** | NG-09-01 Frame | `566fa0d` |
| **2.63.81** | NG-09-02 L1 Router | `472304d` |
| **2.63.82** | NG-09-03 L2 Workspace | `8b7124b` |
| **2.63.83** | NG-09-04 Data Sync | `c1d1caf` |
| **2.63.84** | NG-09-05 Overlays | `29f7842` |

Implement NG-09-05: **`c5aa953`** · allowlist A1–A4.

---

## 4. Testy (obowiązkowe przy zmianach w inspektorze)

```bash
npm run build
npx vite-node scripts/smoke-test-inspector-20.2a.mjs          # 22/22
npx vite-node scripts/smoke-test-inspector-job-assignment.mjs # 12/12
npm run test:infra -- --gate B --scope payroll                # 16/16
```

Manual QA harness (uncommitted): `e2e/ng-09-05-manual-qa.spec.ts` — M1–M9 **9/9 PASS**.

---

## 5. Maintenance debt (nie blokuje epic close)

| Item | Uwaga |
|------|-------|
| `smoke-test-inspector-scroll-20.1d1.mjs` | grep L1/L2 w router/workspace |
| billing a3a T6 | grep `mergeRecoverableCharges` w panelu (logika w hooku od NG-09-04) |
| billing a6 T14 | modal w `InspectorJobWorkspace`, smoke oczekuje panelu |
| `InspectorPanel` LOC ~777 | waiver zaakceptowany — handler extraction defer |

---

## 6. Następny krok

**STABILIZATION WINDOW ACTIVE** — brak nowych programów/bundli bez **Owner GO** + **AUDIT** (#CORE-013).

Hasło wznowienia: **„kontynuuj WGDOM”**.
