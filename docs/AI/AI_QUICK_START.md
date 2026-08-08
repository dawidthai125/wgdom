# AI QUICK START — WGDOM (1 strona)

> **Dla:** nowego ChatGPT / Cursor Agent **bez historii**  
> **Data:** 2026-08-08 · **STATUS:** **ACTIVE**  
> **★★ Cold-start (najpierw):** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ Pełny SSOT:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)

---

### CO TO JEST WGDOM?

Aplikacja operacyjna **W&G DOM** (React/Vite) — roboty, lista płac, WM Druk, **Przetargi**.  
Prod: https://www.wgdom.fun · tip: **2.66.22** / docs **`df6c104a`** · feature **`617f0cb5`** · **PRODUCTION VERIFIED** · **TM-01 EPIC CLOSED**.

### JAK DZIAŁA PRZETARG?

Moduł Przetargi (Workspace v2 + Hub). Główny cel: **jeden inteligentny kosztorysant / Expert AI** — nie kolejne niezależne analizy.

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
