# WM-DOKUMENTACJA-SZKICE-02 — Publication Workflow CLOSEOUT

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT  
> **Production Version:** **2.66.16**  
> **Feature Commit:** **`377e279f`** (`377e279f5ab600dae7ef36ea31620c7d847926b8`) · tip short **`377e279`**  
> **Data:** 2026-08-05  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Baza:** WM-DOKUMENTACJA-SZKICE-01 P0 + P2a CLOSED

```text
════════════════════════════════════════════════════════
WM-DOKUMENTACJA-SZKICE-02 — CLOSED

2.66.16 / 377e279f
Publication Workflow — bez Accept
placement { documentation, reception }
resolved · Promote-copy 1:1
sourceSketchId ↔ receptionDrawingId
A2 NO TOUCH · Payroll/Cloud/Engine NO TOUCH

NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Cel

Usunąć martwy etap **Accept**. Administrator podejmuje decyzję biznesową: Do poprawy · Usuń · Dokumentacja · Odbiory · Dokumentacja+Odbiory. Lokalizacja = trwały **`placement`**.

---

## 2. Zakres

| Element | Treść |
|---------|--------|
| **IN** | Usunięcie Accept · `placement` · `resolved` · `applyJobSketchPlacement` · promote-copy · undelete · softDelete linked Reception · Dashboard OUT · Docs filtr documentation |
| **OUT** | A2 body · nowy KV/Engine/Renderer · Payroll · Cloud CORE · PDF/ZIP rewrite · sync geometrii · 1:N · Comments · Soft Lock |
| **Test** | `scripts/test-wm-dokumentacja-szkice-02-publication.mjs` (49) · regresja P0/P2a/Worker P0 |
| **Feature commit** | `377e279f5ab600dae7ef36ea31620c7d847926b8` |

---

## 3. Model

- **`placement`:** `{ documentation: boolean, reception: boolean }` — invariant: docs∨reception ∨ softDeleted  
- **`resolved`:** terminal review (legacy `accepted`/`final_source` → normalize → `resolved`)  
- **Promote:** COPY ONLY · `domain=reception` · `status=final` · 1:1 `receptionDrawingId` / `sourceSketchId`  
- **reception=false:** soft-delete Reception · **reception=true:** undelete tej samej kopii  

---

## 4. Production

| Pole | Wartość |
|------|---------|
| **UI** | **2.66.16** |
| **Feature Commit** | **`377e279f`** |
| **PV** | **PRODUCTION VERIFIED** · `version.json` `2.66.16` / `377e279` |
| **A2** | **NO TOUCH** |
| **Flag** | `wmWorkerSketchEnabled` default **OFF** |

---

## 5. NEXT

**WAITING FOR NEXT OWNER GO.**

---

*Publication CLOSEOUT · WM-DOKUMENTACJA-SZKICE-02 · 2026-08-05*
