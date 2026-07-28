# COST-REGRESSION-01 EPIC A — CLOSEOUT

> **ID:** COST-REGRESSION-01-EPIC-A-CLOSEOUT  
> **EPIC:** COST-REGRESSION-01 · **CHILD A — F2 Brak kosztorysu**  
> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED**  
> **Data:** 2026-07-28  
> **UI:** **2.65.71** · feature **`0a96744`** · tip **`05b5aac`**

---

## 1. Cel vs wynik

| Cel DF | Wynik |
|--------|-------|
| Klasyfikacja F2 vs F1 | **DONE** — `src/lib/cost-regression-f2.ts` |
| Discovery + macierz copy | **DONE** |
| CTA Dokumenty / Ponów (reuse heavy) | **DONE** |
| Zero Bid / COST-PIPELINE / Epic B | **DONE** (diff allowlist) |
| Prod tip 2.65.71 | **VERIFIED** |

**Sukces A ≠ zawsze PLN** — sukces = F2 wyjaśnione + ścieżka do snapshotu gdy dane istnieją.

---

## 2. Timeline

| Etap | Artefakt / commit |
|------|-------------------|
| AUDIT / TRACE / PLAN | docs COST-REGRESSION-01-* |
| DESIGN FREEZE | `COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md` |
| IMPLEMENT | **`0a96744`** |
| VERIFY FAST (propagating) | **`05b5aac`** |
| VERIFY FINAL | ten closeout + PV FINAL |

---

## 3. Deliverables

| Plik | Rola |
|------|------|
| `src/lib/cost-regression-f2.ts` | classifier · discovery · copy · re-parse guard |
| `tender-offer-run.ts` / recommendation result | presentation F2 |
| Outcome / Detail / Kosztorysy / sticky | CTA UI |
| `scripts/test-cost-regression-01-epic-a.mjs` | AC |
| PV FINAL | `COST-REGRESSION-01-EPIC-A-PRODUCTION-VERIFY.md` |

---

## 4. AC (zamknięcie)

AC-A1…AC-A11 — **PASS** (test + prod bundle probe + git scope).  
Szczegóły: PV FINAL §3–5.

---

## 5. Zakazy utrzymane

- `computeTenderBidProposal` / F1–F4 kalkulatora — **nietknięte**
- `useTenderPricingAuto` resolve / flaga COST-PIPELINE — **nietknięte**
- AI Cost / OfferBoq engines — **nietknięte**
- Payroll / Cloud Sync merge — **nietknięte**
- **EPIC B** — **nie rozpoczęty**

---

## 6. Następne (opcjonalne — tylko Owner GO)

| Item | Status |
|------|--------|
| COST-REGRESSION-01 **EPIC B** (F1 pusty snapshot / PDF Case) | **OOS A** · wymaga osobnego DF + GO |
| A-V3 batch audit załączników | OOS · osobny GO |
| Owner smoke UI na żywym WM F2 | zalecany po CLOSED (manual) |

---

## 7. Rollback

Revert `0a96744` (bundle A) — copy wraca do „Brak rekomendowanej ceny”; dane po udanym re-parse zostają.

---

## 8. STOP

```text
COST-REGRESSION-01 EPIC A — CLOSED
PRODUCTION VERIFIED · UI 2.65.71 · 0a96744 / tip 05b5aac

Bez dalszej implementacji Epic A.
Epic B — tylko na nowe Owner GO + DF.
```
