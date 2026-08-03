# AI-COST-02 I3 — Owner Verification

> **ID:** AI-COST-02-I3-OWNER-VERIFICATION  
> **Slice:** AI-COST-02-I3 · Competitiveness RO  
> **STATUS:** **READY FOR OWNER** · IMPLEMENT done · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **DF:** [`AI-COST-02-I3-DESIGN-FREEZE.md`](./AI-COST-02-I3-DESIGN-FREEZE.md)  
> **Tip baseline:** UI **2.65.95** / **`99c6337`** (przed release I3)

---

## 0. Gate (przed OV)

```text
PAYROLL SAFETY GATE — AI-COST-02 I3 (po IMPLEMENT)
G1–G9: ALL-NIE (FEATURE flag LS only)
Diff ⊆ allowlist DF §9
```

---

## 1. Owner Verification Checklist

| # | Check | Pass |
|---|-------|------|
| **OV-1** | I3 OFF → brak sekcji „Konkurencyjność (RO)” · tip parity | ☐ |
| **OV-2** | I3 ON · 02-B OFF → brak sekcji I3 | ☐ |
| **OV-3** | I3 ON · 02-B ON · są Quotes → summary + bandy linii | ☐ |
| **OV-4** | Brak Quotes → „Brak benchmarku” · **nie** „Powyżej rynku” | ☐ |
| **OV-5** | CK obecne → hint RO · band bez zmiany przez CK | ☐ |
| **OV-6** | 0 zapis OfferBoq / Bid / Quotes / CK po otwarciu I3 | ☐ |
| **OV-7** | Explain + Queue 02-B nadal działa (gdy 02-B ON) | ☐ |
| **OV-8** | Brak win% / target 1,6M / Save Quotes w UI I3 | ☐ |
| **OV-9** | Diff ⊆ allowlist · Gate ALL-NIE | ☐ |
| **OV-10** | Mobile: czytelne · fokus linii działa | ☐ |
| **OV-11** | Outlier (\|Δ\|>25%) oznaczony · pasmo ±10% zgodne z DF | ☐ |

**Ops flagi (localStorage):**

```js
// I3 ON
localStorage.setItem('kw-ai-cost-02-i3-competitiveness', '1')
// 02-B ON (wymagane dla UI I3)
localStorage.setItem('kw-ai-cost-02-b-explain-queue', '1')
// Rollback L1
localStorage.setItem('kw-ai-cost-02-i3-competitiveness', '0')
```

---

## 2. Automated evidence (agent)

| Check | Wynik |
|-------|-------|
| Smoke `scripts/test-ai-cost-02-i3-competitiveness.mjs` | **PASS** · 13 checks |
| Regresja `scripts/test-ai-cost-02-b-explain-queue.mjs` | **PASS** |
| `npm run build` | **PASS** |

---

## 3. Next

Po PASS OV → Owner **GO COMMIT** / **GO PUSH** / PV / CLOSE (osobne GO).
