# WM-DRUK-OST-AUTO-GENERATE-01 — CLOSEOUT

> **ID:** WM-DRUK-OST-AUTO-GENERATE-01-CLOSEOUT  
> **EPIC:** WM-DRUK-OST-AUTO-GENERATE-01  
> **STATUS:** **CLOSED** · tip **2.66.10** / **`82dc1017`** · live CDN **DEPLOY PROPAGATING** (PV FAST)  
> **Data:** 2026-08-05  
> **Tip:** UI **2.66.10** / commit **`82dc1017`** (full `82dc10178b6334d4dcd2674759b408ef7e2a5867`)  
> **PV:** [`WM-DRUK-OST-AUTO-GENERATE-01-PRODUCTION-VERIFY.md`](./WM-DRUK-OST-AUTO-GENERATE-01-PRODUCTION-VERIFY.md)  
> **OV:** Owner Verification **PASS**  
> **AUDIT / DF:** PASS · **FROZEN S2**

```text
════════════════════════════════════════════════════════
WM-DRUK-OST-AUTO-GENERATE-01 = CLOSED

S2 Hard Ensure:
  ACTIVE OST (name OST ∧ pdf_form ∧ enabled ∧ files>0)
  → zawsze w buildWmPrintFilesForJob pool
  → generateFromTemplateBytes → generatePdfFormFromTemplate
  → PDF w RAM → Odbiory/ w ZIP
  → bez Storage / cache / filled persist

UI: checkbox OST locked · „zawsze w ZIP”
Fingerprint publish: parity z force-include

NO TOUCH:
  · pdf-lib silnik
  · generatePdfFormFromTemplate body
  · ZI / mapping SSOT / Cloud merge

NEXT: WAITING FOR NEXT OWNER GO
════════════════════════════════════════════════════════
```

---

## 1. Co zamknięto

| Element | Wartość |
|---------|---------|
| Wariant | **S2 Hard Ensure** |
| Helper | `isActiveWmPrintOstTemplate` · `mergeActiveOstIntoWmPrintTemplatePool` |
| ZIP | `buildWmPrintFilesForJob` force-include |
| Publish | fingerprint digest parity |
| UX | locked checkbox · GuideView |
| Test | `scripts/test-wm-druk-ost-auto-generate-01.mjs` (18) |

---

## 2. Commits

| | |
|--|--|
| Feature | **`82dc1017`** — `feat(wm-druk): OST Hard Ensure always in delivery ZIP (2.66.10)` |
| Branch | `main == origin/main` |

---

## 3. Changed files (feature commit)

- `src/lib/wm-print/templates.ts`
- `src/lib/wm-print/generate-zip.ts`
- `src/lib/wm-print/template-selection.ts`
- `src/lib/delivery-package-publications/publication.ts`
- `src/app/WmPrintView.tsx`
- `src/app/GuideView.tsx`
- `src/app/changelog-data.ts`
- `CHANGELOG.md`
- `scripts/test-wm-druk-ost-auto-generate-01.mjs`
- `docs/architecture/WM-DRUK-OST-AUTO-GENERATE-01-AUDIT.md`
- `docs/architecture/WM-DRUK-OST-AUTO-GENERATE-01-DESIGN-FREEZE.md`

---

## 4. NEXT

**WAITING FOR NEXT OWNER GO** · brak aktywnego IMPLEMENT.

---

*CLOSEOUT · WM-DRUK-OST-AUTO-GENERATE-01 · 2026-08-05*
