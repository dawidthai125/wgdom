# WM-ODBIORY-RYSUNKI-FINAL-UNDO-01 — CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** WM-ODBIORY-RYSUNKI-FINAL-UNDO-01-CLOSEOUT  
> **Production Version:** **2.66.17**  
> **Feature / Deploy Commit:** **`e871fed6`** (`e871fed698aa4cb3c46e02eaa289a4a594866c20`) · tip short **`e871fed`**  
> **Data:** 2026-08-05  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
WM-ODBIORY-RYSUNKI-FINAL-UNDO-01 — CLOSED

2.66.17 / e871fed6
DrawingStatus draft ↔ final
unsetDrawingFinal · UI toggle Finalny ↔ Roboczy
soft-delete: Final → Roboczy → Usuń (Model A)
ACL wiring adminSession (bez zmiany polityki)
audit drawing_finalized / drawing_unfinalized
ZIP live count · A2 NO TOUCH · Publication NO TOUCH

NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Zakres zmian

| Element | Treść |
|---------|--------|
| **IN** | `unsetDrawingFinal()` · UI toggle Finalny↔Roboczy · soft-delete copy bez „demote” · `adminSession` ACL wiring · audit 2 akcje · testy P0 · changelog 2.66.17 · GuideView |
| **OUT** | Publication rewrite · placement · workflowStatus · Schematy · Pomiary · Payroll · Cloud Sync · Edge · A2 · editor lock Final · force-delete Final dla non-SA |
| **Test** | `scripts/test-wm-odbior-rysunki-final-undo-01.mjs` (34) · regresja `test-wm-rysunki-01-p1.mjs` · `test-wm-druk-audit.mjs` |
| **Commit** | `e871fed698aa4cb3c46e02eaa289a4a594866c20` |

---

## 2. Wpływ

- Usunięty dead-end: przypadkowe Final nie blokuje już usuwania (ścieżka: Roboczy → Usuń).
- ZIP Odbiory / checkbox „Dołącz rysunki” — live `countFinalDrawingsForJob` po demote.
- Reception po Promote: demote zmienia **tylko** `DrawingStatus`; placement / workflowStatus / revisionMeta bez zmian.
- Historyczne ZIP: immutable.

---

## 3. Boundary

| Warstwa | Status |
|---------|--------|
| Cloud Sync / Payroll / Edge | **NO TOUCH** |
| Publication Workflow API | **NO TOUCH** |
| A2 (`isDrawingVisibleInRysunkiTab`) | **NO TOUCH** |
| Schematy / Pomiary | **NO TOUCH** |
| Osie `workflowStatus` / `placement` / `revisionMeta.demote` | **rozdzielone** od `DrawingStatus` |

---

## 4. Lessons Learned

1. Komunikat „najpierw demote” bez API demote = fałszywy UX — nazwy muszą mieć implementację.
2. Hardcode `role: "admin"` w UI unieważnia ścieżkę SA w lib — ACL wiring musi używać sesji.
3. `DrawingStatus` ≠ Publication `revisionMeta.action: "demote"` — nie mieszać semantyki.
4. Symetryczny model draft↔final (jak Schematy) usuwa dead-end bez zmiany ZIP eligibility (live filter).

---

## 5. Known Residuals (**NIE część tego EPIC**)

| Residual | Uwaga |
|----------|--------|
| TEST-INFRA Gates FAIL (legacy) | Residual CI Open · **poza zakresem** FINAL-UNDO-01 |
| E2E Happy Path FAIL (legacy) | Residual CI Open · workflow LEGACY · **poza zakresem** |
| Mobile Smoke — w toku podczas PV | Snapshot czasu PV · **poza zakresem** EPIC |

Tip deploy **PRODUCTION VERIFIED** niezależnie od residual CI (jak wcześniejsze tipy WM).

---

## 6. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.17** |
| **Commit** | **`e871fed6`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.17` / `e871fed` |
| **GitHub** | https://github.com/dawidthai125/wgdom/commit/e871fed698aa4cb3c46e02eaa289a4a594866c20 |

---

## 7. NEXT

**WAITING FOR NEXT OWNER GO.**

---

*CLOSEOUT · WM-ODBIORY-RYSUNKI-FINAL-UNDO-01 · 2026-08-05*
