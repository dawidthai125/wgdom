# NG-06-TEUX — TEUX-7e Strategia + Pulpit · AUDIT READINESS

> **Status:** **READY FOR AUDIT** · **IMPLEMENT BLOCKED** (wymaga Owner GO)  
> **Baseline prod:** UI **2.63.63** · commit implement **`129f22d`** · **TEUX-7d CLOSED** · **PRODUCTION VERIFIED**  
> **Data:** 2026-07-07  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) § TEUX-7e · test plan `LIB-TENDER-STRATEGY-TEUX7E`

```text
WERDYKT GOTOWOŚCI:  READY FOR AUDIT (nie IMPLEMENT)
ZALEŻNOŚĆ:          TEUX-7d CLOSED · TOKEN FREEZE ACTIVE
GAP TARGET:          G-12 · Strategia/Pulpit KPI · „Wnioski AI” copy (defer z TEUX-7d)
```

---

## 1. Cel slice (DF)

| Pole | Wartość |
|------|---------|
| **Zakres** | Pulpit ≤3 KPI; Strategia spacing; tokeny na `StrategyKpiStrip` / `TendersShortcutPanel`; copy „Wnioski AI” → SSOT PL |
| **AC** | Pełne KPI tylko w Strategii; brak user-facing „AI” w Strategii/Pulpicie (wg DF) |
| **Test plan** | `scripts/test-tender-strategy-teux7e.mjs` → `LIB-TENDER-STRATEGY-TEUX7E` (do utworzenia przy AUDIT) |
| **Ryzyko** | **M** (6–15 plików) · `tenders/strategy/**` |

---

## 2. OUT OF SCOPE (bez Owner GO)

| Obszar | Powód |
|--------|--------|
| Pipeline / bootstrap | CORE |
| Cloud sync / CloudLoader / Edge | CORE |
| `tender-ux-tokens.ts` edycja | TOKEN FREEZE |
| Hosted deprecation pełne | **TEUX-7f** |
| Lista/workflow copy | **TEUX-7d CLOSED** |

---

## 3. Workflow

```text
AUDIT TEUX-7e → PLAN → ARCH REVIEW → Owner GO → IMPLEMENT
```

**Następny krok:** polecenie `AUDIT TEUX-7e` (tryb **AUDIT ONLY**).
