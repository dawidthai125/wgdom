# AI QUICK START — WGDOM (1 strona)

> **Dla:** nowego ChatGPT / Cursor Agent **bez historii**  
> **Data:** 2026-08-08 · **STATUS:** **ACTIVE**  
> **★★ Cold-start (najpierw):** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ Pełny SSOT:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)

---

### CO TO JEST WGDOM?

Aplikacja operacyjna **W&G DOM** (React/Vite) — roboty, lista płac, WM Druk, **Przetargi**.  
Prod: https://www.wgdom.fun · tip: **2.66.22** / **`ebae3d2e`** · **PRODUCTION VERIFIED**.

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
**KEEP / MIGRATE** — **REMOVE** dopiero po audit + S8 + Owner GO.

### CO JEST ZAMKNIĘTE?

**S0** orphan · **S1** module · **S2** Dual Outcome · **S3** Align Pricing · **S4** Hub UX · **S5** Tab Decyzja→DW · Experts/Chief/Session/Dossier/EW/Validation/DW/Persist (P0).  
ACTIVE EPIC = **NONE**.

### CO JEST NEXT?

**TENDER-MODERNIZATION-01 / S6** — Persist / store bridge.  
**WAITING FOR OWNER GO** → start **AUDIT**.

### CZEGO NIE WOLNO DOTYKAĆ?

8 LOCK: Expert · Chief · Session · Validation · Adapters · TF · OfferBoq · Bid domain.  
OST-03 / XFA / `git add -A` / `vercel deploy` / auto-start S6+ / S3-D / Bid retirement / global ON Przetargi / cloud Persist bez GO.
WIP: **`src/app/hooks/useTenderOfferRun.ts`** — local M, nie S5.

### Od czego zacząć?

1. [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
2. [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md)  
3. [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · DF  
4. [`AI_ENTRY.md`](AI_ENTRY.md) · Gate — **przed** kodem  
5. Owner GO przed każdym IMPLEMENT  

**Zakaz:** IMPLEMENT z samego `CURRENT-TASK.md`.
