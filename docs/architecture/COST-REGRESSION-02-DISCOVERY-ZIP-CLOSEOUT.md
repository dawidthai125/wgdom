# COST-REGRESSION-02 — DISCOVERY-ZIP CLOSEOUT

> **ID:** COST-REGRESSION-02-DISCOVERY-ZIP-CLOSEOUT  
> **EPIC:** COST-REGRESSION-02 · **VARIANT D — Discovery + UX**  
> **STATUS:** **CLOSED (code)** · **DEPLOY PROPAGATING** (prod tip 2.65.72)  
> **Data:** 2026-07-28  
> **UI:** **2.65.72** · feature **`c5c95ed`**

---

## 1. Cel vs wynik

| Cel DF | Wynik |
|--------|-------|
| Top-level ZIP/7Z = `archive_candidate` | **DONE** |
| Discovery ≠ „Brak przedmiaru…” gdy ZIP | **DONE** |
| HeavyDone ∧ archive ∧ !kosztorys → `parse_failed` ZIP-aware | **DONE** |
| CTA Ponów (reuse heavy) | **DONE** |
| Zero Bid / COST-PIPELINE / Variant C | **DONE** (allowlist) |

**Sukces 02 ≠ zawsze PLN** — sukces = prawdziwy discovery + copy + CTA.

---

## 2. Timeline

| Etap | Artefakt / commit |
|------|-------------------|
| AUDIT | `COST-REGRESSION-02-DISCOVERY-ZIP-AUDIT.md` |
| DESIGN FREEZE | `COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md` |
| Owner GO IMPLEMENT | APPROVED |
| IMPLEMENT | **`c5c95ed`** |
| VERIFY FAST | DEPLOY PROPAGATING (`COST-REGRESSION-02-DISCOVERY-ZIP-PRODUCTION-VERIFY.md`) |

---

## 3. Deliverables

| Plik | Rola |
|------|------|
| `src/lib/cost-regression-f2.ts` | archive_candidate · priority · ZIP copy |
| `tender-offer-run.ts` + Outcome / sticky / empty | presentation + `data-cost-regression-archive` |
| `scripts/test-cost-regression-02-discovery-zip.mjs` | AC-02 |
| IMPL / RELEASE / PV | docs architecture |

---

## 4. AC

AC-02-1…AC-02-10 — **PASS** (test + build).  
Prod live tip **2.65.72** — **pending Vercel** (DEPLOY PROPAGATING).

---

## 5. Zakazy utrzymane

- Bid / `computeTenderBidProposal` — **nietknięte**
- COST-PIPELINE / `useTenderPricingAuto` resolve — **nietknięte**
- AI Cost / OfferBoq engines — **nietknięte**
- `tender-document-resolver` / Edge ZIP — **nietknięte**
- Payroll / Cloud Sync — **nietknięte**
- Epic B / Variant C — **nietknięte**

---

## 6. Następne (opcjonalne)

- Po propagacji: jedno odczytanie `version.json` → oznacz PV **PRODUCTION VERIFIED**
- Heurystyka nazw ZIP (false positive) — **osobny GO** (nie w tym DF)
- Epic B / recovery PDF — tylko na polecenie

---

## 7. STOP

```text
COST-REGRESSION-02 DISCOVERY-ZIP — CLOSED (code) · RELEASE GO · DEPLOY PROPAGATING
UI 2.65.72 · commit c5c95ed
```
