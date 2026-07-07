# NG-06-TEUX — TEUX-7d Copy integrity · AUDIT READINESS

> **Status:** **TEUX-7d CLOSED** · **PRODUCTION VERIFIED**  
> **Raport:** [`NG-06-TEUX-TEUX7D-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7D-AUDIT-REPORT.md)  
> **Closeout:** [`NG-06-TEUX-TEUX7D-CLOSEOUT.md`](./NG-06-TEUX-TEUX7D-CLOSEOUT.md)  
> **Baseline prod:** UI **2.63.63** · implement **`129f22d`** · **PRODUCTION VERIFIED**  
> **Data:** 2026-07-07  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7d · test `LIB-TENDER-COPY-TEUX7D`

```text
WERDYKT:            CLOSED · PRODUCTION VERIFIED
ZALEŻNOŚĆ:          TEUX-7c CLOSED · TOKEN FREEZE ACTIVE
GAP G-03:           CLOSED (lista/workflow)
NASTĘPNY:           TEUX-7e READY FOR AUDIT
```

---

## 1. Cel slice (DF)

| Pole | Wartość |
|------|---------|
| **Zakres** | „AI” → „Rekomendacja” (lub SSOT copy); HelpView FAQ; grep user-facing strings w module Przetargów |
| **AC** | Brak „AI” w UI listy/workflow user-facing (poza marką COMMAND CENTER AI jeśli explicite OUT) |
| **Test plan** | `scripts/test-tender-copy-teux7d.mjs` → `LIB-TENDER-COPY-TEUX7D` |
| **Ryzyko** | **S** (niskie) · copy-only |

---

## 2. Poza zakresem

- Accessibility (TEUX-7c **CLOSED**)
- `tenders/strategy/**` pełny sweep → **TEUX-7e**
- Pipeline / sync / payroll / Edge / App.tsx CORE
- `tender-ux-tokens.ts` — **TOKEN FREEZE** (import only)

---

## 3. Znane lokalizacje (as-is @ 2.63.62)

| Obszar | Plik / komponent | Notatka |
|--------|------------------|---------|
| Lista | `TendersView` banner insight | `aiInsightClass` · copy „AI” |
| Przetarg hub | `TenderPrzetargWorkspace` | „Brak skróconych informacji z dokumentów.” |
| HelpView | FAQ Przetargi | „Komunikaty AI (Lista)” |
| Visual inventory | G-03 | [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md) |

Pełny grep w **AUDIT** — nie zgadywać zakresu przed raportem.

---

## 4. Workflow

```text
AUDIT TEUX-7d → PLAN → (DESIGN FREEZE jeśli delta) → ARCH REVIEW → Owner GO → IMPLEMENT
```

**Następny krok:** **TEUX-7e** — [`NG-06-TEUX-TEUX7E-AUDIT-READINESS.md`](./NG-06-TEUX-TEUX7E-AUDIT-READINESS.md) · `AUDIT TEUX-7e` (tryb **AUDIT ONLY**).
