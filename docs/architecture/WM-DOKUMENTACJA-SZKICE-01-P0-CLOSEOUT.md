# WM-DOKUMENTACJA-SZKICE-01 — P0 CLOSEOUT

> **STATUS:** **P0 CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT  
> **Tip UI:** **2.66.14** · feature commit **`0afeb82d`** (`0afeb82d88fa1b0bce27c27aefb5457ab17d7f3a`) · tip short **`0afeb82`**  
> **Data:** 2026-08-05  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
WM-DOKUMENTACJA-SZKICE-01 P0 — CLOSED

2.66.14 / 0afeb82d
Dokumentacja Robót → Szkice Techniczne (domain A)
Needs Changes · Worker Resubmit · Admin Accept
A2 NO TOUCH · No Promote · flag OFF default

KV:     kw-wm-technical-drawings (REUSE)
Engine: WmPrintDrawingEditor (REUSE)
NEXT:   WAITING FOR NEXT OWNER GO
        (P1 Promote / sourceSketchId — tylko Owner GO)
════════════════════════════════════════════════════════
```

---

## 1. Cel P0

Udostępnić **Admin/Inspektor** inbox szkiców w **Roboty → Dokumentacja → Szkice Techniczne** (domena `job_sketch`), z workflow review: Needs Changes / Resubmit / Accept (Admin only) — bez Promote do Odbiory→Rysunki i bez zmiany A2.

---

## 2. Zakres P0

| Element | Treść |
|---------|--------|
| **IN** | `domain=job_sketch` · panel `JobTechnicalSketchesPanel` (Admin/Inspector) · Worker resubmit po `needs_changes` · Accept Admin/SA only · badge Pending (`submitted`) · sort DF · ACL filtry · audit `sketch_*` · L0 revision |
| **OUT** | Promote · `sourceSketchId` · Dashboard · Comments · Soft Lock · Wall Dimensions · zmiana ciała A2 |
| **A2** | **NO TOUCH** — Worker `submitted`/`accepted` (`origin=worker`) pozostają poza Odbiory→Rysunki |
| **Test** | `scripts/test-wm-dokumentacja-szkice-01-p0.mjs` (29) · regresja Worker Sketch P0/P1 |
| **Commit** | `0afeb82d88fa1b0bce27c27aefb5457ab17d7f3a` |

---

## 3. Workflow (P0)

```text
worker_draft → submitted → needs_changes ⇄ resubmit → submitted → accepted
                                                      ↑
                                         Inspector: Needs Changes only
                                         Admin: Needs Changes + Accept
```

Promote → NEW reception drawing = **P1+** (nie w P0).

---

## 4. Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/app/JobTechnicalSketchesPanel.tsx` | Admin/Inspector Dokumentacja |
| `src/lib/wm-technical-drawings/job-sketch-list.ts` | filtr · sort · badge · ACL helpers |
| `src/lib/wm-technical-drawings/workflow.ts` | needs_changes · accept · resubmit |
| `src/app/WorkerJobSketchesSection.tsx` | Worker resubmit |
| `src/app/JobsView.tsx` · `InspectorJobWorkspace.tsx` | mount panelu |

---

## 5. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.14** |
| **Commit** | **`0afeb82d`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.14` / `0afeb82` |
| **Flag** | `wmWorkerSketchEnabled` default **OFF** |

---

## 6. Residual / NEXT

| Item | Status |
|------|--------|
| Admin/Inspector-origin `job_sketch` vs lista A2 | Residual (A2 NO TOUCH) — follow-up tylko Owner GO |
| **Promote** (P1) | **WAITING** — Owner GO → AUDIT |
| Epic FULL CLOSE | po Promote / decyzja Ownera · P0 tip CLOSED |

**NEXT:** **WAITING FOR NEXT OWNER GO**.

---

*P0 CLOSEOUT · WM-DOKUMENTACJA-SZKICE-01 · 2026-08-05*
