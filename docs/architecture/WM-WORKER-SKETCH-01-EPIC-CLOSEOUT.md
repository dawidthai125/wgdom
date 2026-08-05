# WM-WORKER-SKETCH-01 — EPIC CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** WM-WORKER-SKETCH-01-EPIC-CLOSEOUT  
> **Tip UI:** **2.66.13** · tip commit **`4f99a279`** (`4f99a27967edaeed10316d133dc0121ba44548a0`) · tip short **`4f99a27`**  
> **Data:** 2026-08-05  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
WM-WORKER-SKETCH-01 — FULLY CLOSED

P0  2.66.12 / 3c9d6f90  — schema · sync · submit · flag OFF
P1  2.66.13 / 4f99a279  — Mobile Draw UX · drag-release · snap

KV:     kw-wm-technical-drawings (REUSE — Single Store)
Engine: WmPrintDrawingEditor (REUSE — ZERO nowy silnik)
NEXT:   WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Cel EPIC-u

Umożliwić pracownikowi tworzenie szkiców technicznych z panelu Worker → Dokumentacja → **Szkice**, z tym samym Drawing Engine i magazynem co Odbiory WM → Rysunki, bez duplikacji silnika / sync / formatu.

---

## 2. P0 — Fundament (CLOSED · 2.66.12 / `3c9d6f90`)

| Element | Treść |
|---------|--------|
| **IN** | Additive schema (`origin`, `workflowStatus`, `revisionNumber`, …) · soft-delete · Worker cloud sync drawings · Docs→Szkice UI · create/submit · L0 expectedRevision · flaga `wmWorkerSketchEnabled` default **OFF** · A2 filter (Rysunki bez worker non-final) · audit P0 |
| **OUT** | Soft Lock UI · comments · Accept/Promote · Inspector editor · Soft Lock |
| **Test** | `scripts/test-wm-worker-sketch-01-p0.mjs` (25) |
| **Commit** | `3c9d6f902870533a34123ae83244db51b824cf80` |

---

## 3. P1 — Mobile Draw UX (CLOSED · 2.66.13 / `4f99a279`)

| Element | Treść |
|---------|--------|
| **IN** | Jeden model gestów wall+arrow: press→drag→release→`finishLine` · Mobile Chrome (≥44, bez PDF/Print/Zoom) · Worker tools: ściana, drzwi P/W, okno, wentylacja, rozdzielnia, piec, tekst, select · Snap Endpoint→Angle→Grid (jeden toggle) |
| **OUT** | Vertex continuous chain A→B→C (P3B.1 stoi) · schema/sync/payroll · `wallGestureMode` / if role · nowy silnik |
| **Test** | `scripts/test-wm-worker-sketch-01-p1.mjs` (39) · regresja P3B.1 / P0 rysunki |
| **Commit** | `4f99a27967edaeed10316d133dc0121ba44548a0` |

---

## 4. Final Architecture

| Warstwa | Decyzja |
|---------|---------|
| **Store** | Single Store `kw-wm-technical-drawings` |
| **Editor** | `WmPrintDrawingEditor` + `WorkerJobSketchesSection` |
| **Gesture** | Jeden kontrakt PointerEvent (Worker + Admin) |
| **Chrome** | Mobile FS ≠ Desktop layout — **nie** drugi SM rysowania |
| **Flag** | `wmWorkerSketchEnabled` (AppSettings) default OFF |
| **Workflow** | `worker_draft` → `submitted` (+ dalsze statusy w modelu; Accept/Promote backlog) |

---

## 5. Production Versions · Commity

| Slice | UI | Commit | Tip short |
|-------|-----|--------|-----------|
| P0 | **2.66.12** | `3c9d6f90` | `3c9d6f9` |
| P1 (tip) | **2.66.13** | `4f99a279` | `4f99a27` |

Live: `https://www.wgdom.fun/version.json` → **2.66.13** / **4f99a27**.

---

## 6. Lessons Learned

1. **REUSE FIRST** — wynajęcie Admin editora na Worker bez nowego silnika działa; UX mobile wymaga osobnego slice gestu/chrome.  
2. **Two-click ≠ telefon** — Ghost bez commit na `pointerup` = fałszywy błąd prod; jeden SM drag-release naprawia Admin i Worker.  
3. **Chrome ≠ Engine** — Mobile Chrome bez PDF/zoom; gest wspólny.  
4. **Docs lag** — tip na CDN ≠ SSOT docs; CLOSE wymaga Owner GO DOCS.  
5. **CI residual** — Gate B tenders / legacy E2E / mobile-auth FAIL pre-existing; payroll Gate B PASS.

---

## 7. Final Status

| Pole | Wartość |
|------|---------|
| **EPIC** | **CLOSED** |
| **P0** | **CLOSED** · **PRODUCTION VERIFIED** |
| **P1** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Tip** | **2.66.13** / **`4f99a279`** |
| **NEXT** | **WAITING FOR NEXT OWNER GO** |
| **Zakaz auto** | Soft Lock · Accept/Promote · Inspector sketch · vertex chain bez nowego DF |

**ACTIVE IMPLEMENT / RELEASE / FEATURE dla tego EPIC-u:** **NONE**.
