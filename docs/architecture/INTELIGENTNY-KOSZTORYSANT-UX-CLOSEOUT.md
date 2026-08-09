# INTELIGENTNY-KOSZTORYSANT-UX — CLOSEOUT

> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED**  
> **ID:** INTELIGENTNY-KOSZTORYSANT-UX-CLOSEOUT  
> **Production Version:** **2.66.22**  
> **Feature / Deploy Commit:** **`ae426ad6`** (`ae426ad6e5595d4867fc03d2778fbc9ffea0eddd`) · tip short **`ae426ad`**  
> **Prior P0 Dual-Enablement:** **`1902daa7`** · **CLOSED**  
> **Data:** 2026-08-09  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PV:** [`INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY.md`](INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY.md)

```text
════════════════════════════════════════════════════════
INTELIGENTNY-KOSZTORYSANT-UX CLOSED

Branding + Expert Conversation presentation layer

PRODUCTION VERIFIED · tip ae426ad6 / 2.66.22

NO new flag/store/engine/PLN · Persist/Q12 KEEP · D default OFF
════════════════════════════════════════════════════════
```

---

## 1. Cel

Dokończyć **produkcyjną warstwę prezentacji** „Inteligentnego Kosztorysanta” w module Przetargi:

1. branding **Inteligentny Kosztorysant**,
2. author credit **w pełni stworzony przez Dawida Thai Thanh**,
3. wizualizacja przebiegu ekspertów jako **conversation UI** nad istniejącym Trace/Dossier.

**Nie** tworzono nowego silnika AI / Expert / Chief / Persist / PLN.

---

## 2. Zakres CLOSED

| IN | OUT |
|----|-----|
| Hub branding (`InteligentnyKosztorysantBrand`) | nowa flaga AppSettings |
| Author credit (SSOT labels) | nowy store / KV |
| Thin VM `buildExpertConversationViewModel` | nowy Expert/Chief engine |
| `ExpertConversationSurface` + step cards | nowy PLN / pricing source |
| Presentation timing · Skip · Continue | Cloud Persist |
| Wire w `TenderWorkflowHubPanel` | hard REPLACE Trace / EW / DW |
| UX harness `test-inteligentny-kosztorysant-ux.mjs` | S10 / cleanup / invent epic |

---

## 3. Architektura (presentation-only)

```text
REAL ENGINE (KEEP)
  → ChiefSessionOutput / Dossier / Trace / taskRows
  → ChiefDossierViewModel (KEEP)
  → buildExpertConversationViewModel (THIN)
  → ExpertConversationSurface (UI)
```

**SSOT danych:** `dossier.traces.*` · `taskRows` · `orchestrationNotesPl` · `ChiefSessionOutput` · `dossier.experts.*`  
**Zero** fikcyjnych komunikatów / fake LLM.

**Dual enablement KEEP:**  
M = `isTenderExpertEffective` (ACCESS) · D = `expertAiDecydentEnabled` (RUNTIME, default **OFF**).

---

## 4. Branding + author

| Element | Wartość | Verify |
|---------|---------|--------|
| Tytuł | Inteligentny Kosztorysant | Production PASS |
| Credit | w pełni stworzony przez Dawida Thai Thanh | Production PASS |
| Miejsce | Hub przetargu (`TenderWorkflowHubPanel`) — **nie** lista globalna | PASS |
| Theme | natywny WGDOM · dark/light · responsive | PASS |

---

## 5. Expert Conversation

Kolejność VM (zawsze 7 kroków):

```text
chief_start → execution → materials → pricing → cost → offer → chief_final
```

Production (real WM tender) zaobserwowano:

```text
Chief → EE → ME → PE → Cost → Offer
```

z **rzeczywistymi** komunikatami Trace (ETICS / materiały / market risk / Real Cost blockers).

| Stan runtime | Znaczenie |
|--------------|-----------|
| Cost **BLOCKED** | valid — brak Real Cost / składowe |
| Offer **SKIPPED** | valid — downstream po blokadzie Cost |

---

## 6. Trace / Dossier / DW — KEEP

| Surface | Status |
|---------|--------|
| Trace „Przebieg ekspertów” (`ChiefDossierSurface`) | **KEEP** |
| Expert Workspace | **KEEP** |
| Decision Workspace | **KEEP** |
| Conversation | presentation **nad** Trace — nie zastępuje |

---

## 7. Timing

Presentation-only (engine bez sleep):

- NORMAL clamp ≤ ~4 s całość  
- Skip = `revealAll` only (bez re-run pipeline)  
- Continue = `revealAll` + scroll do DW  

`prefers-reduced-motion` → natychmiastowy full reveal.

---

## 8. Testy

| Suite | Wynik |
|-------|-------|
| `scripts/test-inteligentny-kosztorysant-ux.mjs` | **47 PASS** |
| Persist contract (prior) `test-decision-persist-01.mjs` | **14 PASS** (KEEP / OUT OF SCOPE mutacji prod) |

---

## 9. Production verification (skrót)

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| UI / commit | **2.66.22** / **`ae426ad6`** |
| Tender | `08deec8a-1574-3f3b-ebd1-650001689893` |
| Typ | pustostany / lokale gminne · ZZK |
| ATH | TAK |
| OfferBoq | TAK · 70 `catalogQuantities` |
| pricingReady | TRUE · estimate **264400** PLN |
| Desktop / Mobile | PASS |
| Console errors | **0** |
| D final | **OFF** · restore PASS |

Pełny raport: [`INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY.md`](INTELIGENTNY-KOSZTORYSANT-UX-PRODUCTION-VERIFY.md).

---

## 10. Non-blocking observations (NIE FAIL)

| Item | Werdykt | Uwaga |
|------|---------|--------|
| **CHIEF_FINAL** | **BY DESIGN / VERIFIED** | VM ma 7 kroków; `chief_final` = ostatni w animacji; PV sondował do `offer` |
| **SKIP** | contract PASS · prod click NOT VERIFIED | nie blocker |
| **CONTINUE** | contract PASS · prod click NOT VERIFIED | nie blocker |
| **PERSIST** | prod mutation NOT VERIFIED | prior DECISION-PERSIST-01 / Q12 / P0 **CLOSED** · KEEP · OUT OF SCOPE UX |

---

## 11. Protected WIP — UNTOUCHED

- `src/app/hooks/useTenderOfferRun.ts`  
- `src/lib/bid-time-load-guard/**`  
- `src/lib/tenders-bid-calculator.ts`  
- `src/lib/tender-offer-boq-bid-adapter.ts`  
- Login · Payroll · CHANGELOG · `.tmp*` · unrelated WIP  

---

## 12. Architectural invariants

- NO third flag · NO new store · NO new engine · NO third PLN  
- Persist / Q12 **KEEP**  
- D default **OFF**  
- Trace / EW / DW **KEEP**  
- presentation ≠ engine delay  

---

## 13. Final status

| | |
|--|--|
| **Epic** | **INTELIGENTNY-KOSZTORYSANT-UX = CLOSED** |
| **Code tip** | **`ae426ad6`** |
| **UI** | **2.66.22** |
| **P0 Dual-Enablement** | **`1902daa7` CLOSED** |
| **TM-01** | **S0–S9 CLOSED** |
| **ACTIVE EPIC** | **NONE** |
| **TRYB** | **UTRZYMANIE / MAINTENANCE** |
| **NEXT** | **WAITING FOR NEXT OWNER GO** · **NIE** invent S10 |
