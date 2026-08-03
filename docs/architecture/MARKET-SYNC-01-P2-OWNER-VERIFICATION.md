# MARKET-SYNC-01 P2 — Owner Verification

> **ID:** MARKET-SYNC-01-P2-OWNER-VERIFICATION  
> **Slice:** MARKET-SYNC-01 P2 · Historia · Δ% · Coverage · Templates  
> **STATUS:** **READY FOR OWNER** · IMPLEMENT done · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **DF:** [`MARKET-SYNC-01-P2-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P2-DESIGN-FREEZE.md)  
> **Tip baseline:** UI **2.65.95** / **`869b4c5`**

---

## 0. Gate

```text
PAYROLL SAFETY GATE — MARKET-SYNC-01 P2
G1–G9: ALL-NIE (FEATURE staging/history/flag only)
Diff ⊆ allowlist DF §11
```

---

## 1. Owner Verification Checklist

| # | Check | Pass |
|---|-------|------|
| **OV-1** | P2 OFF → brak timeline/coverage/templates · P0/P1 OK | ☐ |
| **OV-2** | P2 ON · Accept → wpis `priceHistory[]` | ☐ |
| **OV-3** | Cap 24 egzekwowany | ☐ |
| **OV-4** | Dup Accept tej samej quoteId → brak duplikatu | ☐ |
| **OV-5** | Δ% ≥10% → alert UI · Publish nie blokowany samym alertem | ☐ |
| **OV-6** | Coverage RO widoczne | ☐ |
| **OV-7** | Templates stub OBI/Bricoman/PSB · brak full sync | ☐ |
| **OV-8** | Average/controlled_market bez history input | ☐ |
| **OV-9** | Publish = nadal KS + `commitMarketQuotesImport` only | ☐ |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE | ☐ |

**Ops:**

```js
localStorage.setItem('kw-market-sync-01-p2', '1')
// Rollback L1
localStorage.setItem('kw-market-sync-01-p2', '0')
```

---

## 2. Automated evidence (agent)

| Check | Wynik |
|-------|-------|
| Smoke `scripts/test-market-sync-01-p2.mjs` | **PASS** · 25 checks |
| Regresja `scripts/test-market-sync-01-p0.mjs` | **PASS** · 26 |
| Regresja `scripts/test-market-sync-01-p1.mjs` | **PASS** |
| `npm run build` | **PASS** |

---

## 3. Next

Po PASS OV → Owner **GO COMMIT** / **GO PUSH** / PV / CLOSE.
