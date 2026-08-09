# INTELIGENTNY-KOSZTORYSANT-UX — PRODUCTION VERIFY

> **STATUS:** **PV PASS** · **PRODUCTION VERIFIED**  
> **ID:** INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY  
> **Production Version:** **2.66.22**  
> **Commit:** **`ae426ad6`** (`ae426ad6e5595d4867fc03d2778fbc9ffea0eddd`) · tip short **`ae426ad`**  
> **Data PV:** 2026-08-09  
> **Closeout:** [`INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT.md`](INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT.md)  
> **Evidence dirs (local agent):** `wgdom-wm-scan-20260809-092140` · `wgdom-wm-full-pv-20260809-092323`

```text
PV PASS — ae426ad6 / 2.66.22
WM/ZZK pustostany tender · real Trace conversation
Cost BLOCKED / Offer SKIPPED = valid runtime
D restore OFF = PASS
```

---

## 1. Environment

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **version.json** | `"version":"2.66.22"`, `"commit":"ae426ad"` |
| **Expected tip** | **`ae426ad6*`** |
| **Branch** | `main` |
| **Access** | Super Admin (Dawid) |

---

## 2. Selected tender (real production)

| Pole | Wartość |
|------|---------|
| **Tender ID** | `08deec8a-1574-3f3b-ebd1-650001689893` |
| **Nazwa** | Roboty remontowe w gminnych lokalach mieszkalnych – pustostanach położonych we Wrocławiu. |
| **Typ** | Remont pustostanów / lokale gminne |
| **Organizator** | ZARZĄD ZASOBU KOMUNALNEGO |
| **Hub URL** | https://www.wgdom.fun/przetargi/08deec8a-1574-3f3b-ebd1-650001689893/przetarg |
| **ATH** | **TAK** · `Podwale 78 lok. 3 - budowlany zestawienie prac do wykonania ath .ath` |
| **OfferBoq** | **TAK** · `kosztorys.ok` · **70** `catalogQuantities` |
| **pricingReady** | **TRUE** (heurystyka + estimate) |
| **Estimate** | **264400** PLN (`ourEstimatePln`) |
| **Chief input** | ready heuristic **TRUE** (linie kosztorysu obecne) |

---

## 3. Dual enablement (D)

| Moment | `expertAiDecydentEnabled` |
|--------|---------------------------|
| **D before (search)** | **false** (OFF) |
| **D during full Expert PV** | ON (test Owner GO) · Expert Conversation + DW obecne |
| **D after** | **false** |
| **Restore** | **PASS** (potwierdzony; awaryjny restore też PASS) |

Default produkcyjny pozostaje **OFF**.

---

## 4. Expert sequence (observed)

Conversation DOM / Trace mapping (real runtime text):

| Etap | Status UI | Evidence (skrót) |
|------|-----------|------------------|
| Chief (`chief_start`) | blocked | blocker o braku cen rynkowych / kompletności |
| Execution Expert | done | ETICS — ocieplenie ścian; pack.etics… |
| Material Expert | done | 4 pozycje materiałowe; kompletny |
| Pricing Expert | done | Market Price 0/4; wysokie ryzyko cenowe: 4 |
| Cost Expert | **blocked** | brak Real Cost — **valid runtime** |
| Offer Expert | **skipped** | pominięte po blokadzie Cost — **valid** |
| `chief_final` | animacja / BY DESIGN | VM ma 7 kroków; PV sondował do `offer` |

**Order observed:**  
`chief_start > execution > materials > pricing > cost > offer`

---

## 5. UX surfaces

| Surface | Wynik |
|---------|--------|
| Branding „Inteligentny Kosztorysant” | **PASS** |
| Author „w pełni stworzony przez Dawida Thai Thanh” | **PASS** |
| Expert Conversation | **PASS** · real Trace `co`/`dlaczego` |
| Trace (`#chief-dossier-surface`) | **PASS** · KEEP |
| Expert Workspace | **PASS** · KEEP |
| Validation / Recommendation signals | **PASS** (UI presence) |
| Decision Workspace (`#decision-workspace-surface`) | **PASS** · KEEP |
| Lista globalna Przetargi — brak brand ads | **PASS** |
| Desktop | **PASS** |
| Mobile (390×844) | **PASS** · brand w DOM · brak horizontal overflow |
| Console errors | **0** |

---

## 6. Skip / Continue / Persist (scope)

| Item | Production | Contract |
|------|------------|----------|
| Skip animation | prod click **NOT VERIFIED** (terminal / reduced-motion) | harness + code **PASS** |
| Continue | prod click **NOT VERIFIED** | harness + code **PASS** (scroll to DW) |
| Persist `kw-decision-persist-v1` | **NOT VERIFIED** — **no write** on real WM tender | prior DECISION-PERSIST-01 / Q12 / P0 **CLOSED** · harness 14 PASS · **KEEP** |

Non-blocking — **nie** FAIL closeout.

---

## 7. Harness (post-deploy)

| Suite | Wynik |
|-------|-------|
| `npx vite-node scripts/test-inteligentny-kosztorysant-ux.mjs` | **47 PASS** |
| Bundle probe | strings w `TendersModule-*.js` |

---

## 8. Invariants confirmed

- NO third flag · NO new store · NO new engine · NO third PLN  
- Persist / Q12 **untouched** by this epic  
- Protected WIP **untouched**  
- Fake LLM chat **absent** — tylko real Trace  

---

## 9. Verdict

**PRODUCTION VERIFIED** for INTELIGENTNY-KOSZTORYSANT-UX presentation layer.

Cost BLOCKED / Offer SKIPPED = **valid runtime outcome**, not UX defect.
