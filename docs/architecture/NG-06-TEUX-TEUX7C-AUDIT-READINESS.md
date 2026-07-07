# NG-06-TEUX — TEUX-7c Accessibility · AUDIT READINESS

> **Status:** **READY FOR AUDIT** · **IMPLEMENT BLOCKED**  
> **Baseline prod:** UI **2.63.61** · commit **`d1e782b`** · **TEUX-7b CLOSED**  
> **Data:** 2026-07-07  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7c · test `LIB-TENDER-A11Y-TEUX7C`

```text
WERDYKT GOTOWOŚCI:  READY FOR AUDIT (nie IMPLEMENT)
ZALEŻNOŚĆ:          TEUX-7b CLOSED · TOKEN FREEZE ACTIVE
GAP TARGET:          G-11 (aria-pressed chipy)
```

---

## 1. Cel slice (DF)

| Pole | Wartość |
|------|---------|
| **Zakres** | `aria-pressed` na chipach · bulk checkbox fix · min 12px interactive · kontrast chipów |
| **AC** | Brak `text-[10px]` na `button` w tender UI |
| **Test plan** | `scripts/test-tender-a11y-teux7c.mjs` → `LIB-TENDER-A11Y-TEUX7C` |
| **Ryzyko** | **S** (niskie) · 1–5 plików `src/` |

---

## 2. Poza zakresem

- Command Layer (TEUX-7b **CLOSED**)
- Copy „AI” (TEUX-7d)
- Lista filtry (TEUX-7a)
- Pipeline / sync / payroll / `tender-ux-tokens.ts` thaw

---

## 3. Pliki kandydackie (AUDIT — nie commit)

| Obszar | Pliki do przeglądu |
|--------|-------------------|
| Chipy filtrów | `TenderUxChip.tsx`, `TenderListFiltersPanel.tsx` |
| Tab bar / sub-tab | `TenderDetailTabBar.tsx`, `TenderDecyzjaSubTabBar.tsx` |
| Process strip | `TenderWorkflowProcessStrip.tsx` |
| Bulk lista | `TendersView.tsx` (checkbox select) |

---

## 4. Workflow

```text
AUDIT TEUX-7c → PLAN → DESIGN FREEZE (jeśli delta) → ARCH REVIEW → Owner GO → IMPLEMENT
```

**Następny krok:** polecenie `AUDIT TEUX-7c` (tryb AUDIT ONLY).

---

*VERIFY TEUX-7b · readiness doc only · 2026-07-07*
