# NG-06-TEUX — TEUX-7d Copy integrity · AUDIT READINESS

> **Status:** **CLOSED** · **IMPLEMENT COMPLETE** (`129f22d`)  
> **Raport:** [`NG-06-TEUX-TEUX7D-AUDIT-REPORT.md`](./NG-06-TEUX-TEUX7D-AUDIT-REPORT.md)  
> **Closeout:** [`NG-06-TEUX-TEUX7D-CLOSEOUT.md`](./NG-06-TEUX-TEUX7D-CLOSEOUT.md)  
> **Baseline prod:** UI **2.63.63** · commit **`129f22d`** · **TEUX-7d CLOSED** · **RELEASE GO**  
> **Data:** 2026-07-07  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7d · test `LIB-TENDER-COPY-TEUX7D`

```text
WERDYKT GOTOWOŚCI:  READY FOR AUDIT (nie IMPLEMENT)
ZALEŻNOŚĆ:          TEUX-7c CLOSED · TOKEN FREEZE ACTIVE
GAP TARGET:          G-03 (user-facing „AI” copy)
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

**Następny krok:** polecenie `AUDIT TEUX-7d` (tryb **AUDIT ONLY**).
