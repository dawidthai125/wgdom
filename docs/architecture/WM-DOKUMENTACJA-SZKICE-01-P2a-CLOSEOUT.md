# WM-DOKUMENTACJA-SZKICE-01 — P2a CLOSEOUT

> **STATUS:** **P2a CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT  
> **Production Version:** **2.66.15**  
> **Feature Commit:** **`e9598c99`** (`e9598c99ed6670685ded9445a40b99e6445a8c51`) · tip short **`e9598c9`**  
> **Data:** 2026-08-05  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **P0:** [`WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md`](WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
WM-DOKUMENTACJA-SZKICE-01 P2a — CLOSED

2.66.15 / e9598c99
Dashboard Szkice Techniczne (job-centric)
Admin + Inspector · flaga OFF = sekcja ukryta
Deep-link: Jobs → Dokumentacja → drawingId
A2 NO TOUCH · Payroll / Cloud / Drawing Engine NO TOUCH

REUSE: countPendingJobSketches · workflowStatus · revisionMeta · ACL
NEXT:  WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Cel P2a

Dodać na **Pulpicie Admin / Inspektor** sekcję **Szkice Techniczne** (job-centric): karty robót z attention (`submitted` + `needs_changes`), sort HIGH→NORMAL, wiersze autor/rola/czas/status, Otwórz → Dokumentacja (nie Odbiory→Rysunki).

---

## 2. Zakres P2a

| Element | Treść |
|---------|--------|
| **IN** | `DashboardJobSketchesSection` · `buildJobSketchDashboardGroups` · Admin `DashboardView` · Inspector `InspectorDashboard` · `pendingDrawingId` → Jobs → `reports` · badge SSOT `countPendingJobSketches` (submitted + needs_changes + in_review) |
| **OUT** | INFO accepted feed (P2b) · Promote event (P2c / P1) · nowy KV · notification engine · Dashboard store |
| **Boundary** | **Dokumentacja Robót** ≠ **Odbiory WM → Rysunki** · **A2 NO TOUCH** |
| **Gate** | `wmWorkerSketchEnabled` default **OFF** → sekcja ukryta |
| **Test** | `scripts/test-wm-dokumentacja-szkice-dashboard-p2a.mjs` (**35 PASS**) |
| **Feature commit** | `e9598c99ed6670685ded9445a40b99e6445a8c51` |

---

## 3. Reuse (ZERO DUPLICATE)

| SSOT | Użycie |
|------|--------|
| `countPendingJobSketches` | Badge panelu + Dashboard pending total |
| `workflowStatus` | Attention filter (`isJobSketchAttentionStatus`) |
| `revisionMeta` | Autor · rola · relative time |
| ACL (`filterJobSketchesForDokumentacja`) | Admin/Inspector/Worker visibility |
| Nav | Existing `jobs` + `reports` + `drawingId` |

---

## 4. Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/wm-technical-drawings/job-sketch-dashboard.ts` | Groups · sort HIGH→NORMAL · deep-link contract |
| `src/lib/wm-technical-drawings/job-sketch-list.ts` | Attention SSOT (extended P2a) |
| `src/app/DashboardJobSketchesSection.tsx` | UI sekcji |
| `src/app/DashboardView.tsx` · `InspectorDashboard.tsx` | Mount + gate |
| `src/app/App.tsx` · `AdminViewRouter.tsx` · `JobsView.tsx` | `pendingDrawingId` |

---

## 5. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.15** |
| **Feature Commit** | **`e9598c99`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.15` / `e9598c9` |
| **Regression** | **PASS** (P2a smoke 35 · A2 hide worker sketches · deep-link never wm_print) |
| **Payroll** | **NO TOUCH** |
| **Cloud** | **NO TOUCH** |
| **Drawing Engine** | **NO TOUCH** |
| **A2** | **NO TOUCH** |

---

## 6. Residual / NEXT

| Item | Status |
|------|--------|
| **P2b** | richer workflow / INFO accepted — tylko Owner GO |
| **P2c / P1 Promote** | Promote + `sourceSketchId` — tylko Owner GO → AUDIT |
| Epic FULL CLOSE | po Promote / decyzja Ownera |

**NEXT:** **WAITING FOR NEXT OWNER GO**.

---

*P2a CLOSEOUT · WM-DOKUMENTACJA-SZKICE-01 · 2026-08-05*
