# AI QUICK START — WGDOM (1 strona)

> **Dla:** nowego ChatGPT / Cursor Agent **bez historii**  
> **Data:** 2026-08-14 · **STATUS:** **ACTIVE**  
> **★★ Cold-start (najpierw):** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ IK NO REBUILD:** [`../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) · [`../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)  
> **★★ Pełny SSOT projektu:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · tip [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)

---

### CO TO JEST WGDOM?

Aplikacja operacyjna **W&G DOM** (React/Vite) — roboty, lista płac, WM Druk, **Przetargi**, Inteligentny Kosztorysant.  
Prod: https://www.wgdom.fun · tip: **tylko 09 + version.json** (nie hardcoduj).

### HARD RULE

**Nie buduj od nowa** TendersModule / Work Catalog / Evidence / OUR RATE / Accept / F5 / PDF.  
**Search → Reuse.** Patrz Reuse Map.

### JAK DZIAŁA PRZETARG?

Istniejący moduł `TendersModule` (Workspace + Hub + Expert Conversation).  
IK = **orchestrator** nad pipeline — nie drugi moduł Przetargów.

### CO TO SĄ EXPERTS?

```text
OfferBoq → EE → ME → PE → Cost → Offer
  → Chief → Session → Dossier → Expert Workspace (5 paneli RO)
  → Validation → Decision Workspace → Decision Persist
```

Expert-effective = dostęp Staff do Przetargi (`tendersTabForStaffEnabled`) — **bez** osobnej flagi Expert AI.

### CO JEST PRIMARY?

| | PRIMARY |
|--|---------|
| Decyzja człowieka (Expert ON) | **Decision Workspace** |
| PLN (Expert ON + Offer) | **`Offer.offerPricePln`** |
| PLN (Expert ON + Offer null) | **NO PRIMARY** |
| PLN (Expert OFF) | **`Bid.recommendedBidPln`** |
| `OfferBoq.directPln` | **COST** (nie oferta) |

**NO THIRD PLN.**

### CO JEST LEGACY?

Bid Proposal · TRE-01 · TenderDecisionView · `kw-tender-decisions` · Intelligence Hub (nie SSOT decyzji).  
**KEEP / MIGRATE** — **REMOVE** dopiero po audit + absolute L8 + Owner GO (S8 = HOLD).

### CO JEST ZAMKNIĘTE?

**S0–S9** · **TM-01 EPIC CLOSED** · Experts/Chief/Session/Dossier/EW/Validation/DW/Persist (P0).  
ACTIVE EPIC = **NONE**.

### CO JEST NEXT?

**UTRZYMANIE** — residual **C1–C6** / new epic — tylko Owner GO → AUDIT.  
**NIE** invent S10.

### CZEGO NIE WOLNO DOTYKAĆ?

8 LOCK: Expert · Chief · Session · Validation · Adapters · TF · OfferBoq · Bid domain.  
OST-03 / XFA / `git add -A` / `vercel deploy` / invent S10 / S3-D / Bid retirement / hard REMOVE / global ON Przetargi / cloud Persist bez GO.
WIP: **`src/app/hooks/useTenderOfferRun.ts`** — local M, nie tip.

### Od czego zacząć?

1. [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
2. [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
3. [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · DF  
4. [`AI_ENTRY.md`](AI_ENTRY.md) · Gate — **przed** kodem  
5. Owner GO przed każdym IMPLEMENT  

**Zakaz:** IMPLEMENT z samego `CURRENT-TASK.md`.
