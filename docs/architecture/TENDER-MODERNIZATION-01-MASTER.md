# TENDER-MODERNIZATION-01 — MASTER (S0–S8)

> **STATUS:** **ACTIVE EPIC ROADMAP** · tip slice **S7 CLOSED** · EPIC as whole **NOT CLOSED**  
> **ID:** TENDER-MODERNIZATION-01-MASTER  
> **Production tip:** **2.66.22** / **`617f0cb5`** · **PRODUCTION VERIFIED**  
> **TRYB:** **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**  
> **NEXT:** **S8 hard REMOVE / Bid retirement** — tylko Owner GO → AUDIT  
> **DF SSOT:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md)  
> **Cold-start:** [`../AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md) · [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md)  
> **Data:** 2026-08-08

```text
GOAL: jeden spójny inteligentny kosztorysant / Expert AI w module PRZETARGI
Order LOCKED: S0→S1→S2→S3→S4→S5→S6→S7→S8
S0–S7 = CLOSED · S8 = OPEN (Owner GO)
NO parallel engines · NO big-bang remove · REUSE FIRST
```

---

## Project goal (LOCKED)

Docelowy przepływ:

```text
OfferBoq
  → Execution Expert
  → Material Expert
  → Pricing Expert
  → Cost Expert
  → Offer Expert
  → Chief
  → Session
  → Dossier
  → Expert Workspace
  → Validation
  → Recommendation
  → Decision Workspace
  → Decision Persist
```

**Nie:** kolejne niezależne analizy · równoległe silniki PLN · mieszanie legacy jako PRIMARY bez Dual Outcome policy.

**Legacy:** KEEP → PARITY → MIGRATION → DEPRECATION → CONSUMER AUDIT → REMOVE (tylko S8 + Owner GO).

---

## Slice map

| Slice | Nazwa | Status | Tip / hist. commit |
|-------|-------|--------|--------------------|
| **S0** | Orphan cleanup | **CLOSED** | `5beb082a` |
| **S1** | Module Enablement | **CLOSED** | `eed3ba0e` |
| **S2** | Dual Outcome | **CLOSED** | `1888d05f` |
| **S3** | Align Pricing | **CLOSED** | **`ec8a5044`** (hist.) |
| **S4** | Hub UX | **CLOSED** | `85f4db14` |
| **S5** | Tab Decyzja → DW | **CLOSED** | **`ebae3d2e`** |
| **S6** | Decision Persist / store bridge | **CLOSED** | **`cb91027d`** (hist.) |
| **S7** | TRE-01 deprecation | **CLOSED** | **`617f0cb5`** (tip) |
| **S8** | Hard REMOVE / Bid retirement | **OPEN** · **NEXT** | — |

---

## S0 — Orphan cleanup

| | |
|--|--|
| **STATUS** | **CLOSED** · PV PASS |
| **CEL** | Usunąć martwe orphan UI / context bez konsumentów |
| **CO ZROBIONO** | Delete `TenderOwnerView` · `TenderOverviewShortcuts` · `CommandCenterContext` · S0b harness migration (5) · re-grep consumers |
| **CO NIE ZROBIONO** | Expert/Chief/Session/Validation/DW/Persist/Bid/OfferBoq/TRE BC |
| **DEPENDENCIES** | Re-grep only |
| **LOCKS** | 8 LOCK · no Expert BC |
| **ROLLBACK** | restore deleted files from tip commit |
| **NEXT** | superseded by S1 |
| **SSOT** | [`S0-CLOSEOUT`](TENDER-MODERNIZATION-01-S0-CLOSEOUT.md) · [`S0-PV`](TENDER-MODERNIZATION-01-S0-PRODUCTION-VERIFY.md) |

---

## S1 — Module Enablement

| | |
|--|--|
| **STATUS** | **CLOSED** · PV PASS · = **TENDER-MODULE-ENABLEMENT-01** |
| **CEL** | Gate Staff do Przetargi = Expert-effective (bez nowej flagi Expert AI) |
| **CO ZROBIONO** | AppSettings REUSE `tendersTabForStaffEnabled` · default **OFF** · Super Admin always · Admin/Moderator controlled · ⚙ Moduły → Przetargi · route guard · harness 29 |
| **CO NIE ZROBIONO** | `expertAiDecydentEnabled` · EXPERT-AI-PRODUCTION-ENABLEMENT-01 IMPLEMENT · global ON |
| **DEPENDENCIES** | — |
| **LOCKS** | NO NEW Expert flag · Expert-effective = `adminCanViewTendersTab` |
| **ROLLBACK** | revert Module Enablement tip |
| **NEXT** | superseded by S2 |
| **SSOT** | [`MODULE-CLOSEOUT`](TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) · [`MODULE-PV`](TENDER-MODULE-ENABLEMENT-01-PRODUCTION-VERIFY.md) |

---

## S2 — Dual Outcome

| | |
|--|--|
| **STATUS** | **CLOSED** · PV PASS |
| **CEL** | Decision Workspace = PRIMARY decyzja człowieka gdy Expert ON; legacy demote |
| **CO ZROBIONO** | Expert-effective = Module · DW PRIMARY · legacy HIDE/DEMOTE · **NO** Approve→GO mapping · stores untouched · harness 45 |
| **CO NIE ZROBIONO** | S5 tab mount · S6 bridge · S7 TRE deprecate · S8 REMOVE · store schema |
| **DEPENDENCIES** | S1 CLOSED |
| **LOCKS** | Dual Outcome · no two primary decision button sets · no Approve→GO |
| **ROLLBACK** | revert S2 tip |
| **NEXT** | superseded by S3 |
| **SSOT** | [`S2-CLOSEOUT`](TENDER-MODERNIZATION-01-S2-CLOSEOUT.md) · [`S2-PV`](TENDER-MODERNIZATION-01-S2-PRODUCTION-VERIFY.md) |

---

## S3 — Align Pricing

| | |
|--|--|
| **STATUS** | **CLOSED** · **PRODUCTION VERIFIED** · tip |
| **CEL** | ONE PRIMARY PLN · Offer Expert primary gdy Expert ON |
| **CO ZROBIONO** | `resolveAuthoritativeOfferPln` · Hub/DW/TRE presentation · parity harness · TRE Bid-fallback FIXED · Offer null ⇒ **NO PRIMARY** |
| **CO NIE ZROBIONO** | **S3-D** Bid deprecate · S8 Bid retirement · Bid/Offer/OfferBoq formulas · third PLN |
| **DEPENDENCIES** | S1 (parity tip) · S2 recommended |
| **LOCKS** | NO third PLN · Bid KEEP · OfferBoq.directPln = COST |
| **Parity tip** | MATCH **1** · EXPECTED_DELTA **12** · UNEXPECTED_DELTA **0** · NOT COVERED **0** |
| **ROLLBACK** | primary PLN = Bid; harness warn-only |
| **NEXT** | superseded by S4 |
| **SSOT** | [`S3-CLOSEOUT`](TENDER-MODERNIZATION-01-S3-CLOSEOUT.md) · [`S3-PV`](TENDER-MODERNIZATION-01-S3-PRODUCTION-VERIFY.md) · [`TENDER-PRICING-SSOT`](TENDER-PRICING-SSOT.md) |

---

## S4 — Hub UX (**CLOSED**)

| | |
|--|--|
| **STATUS** | **CLOSED** · **PRODUCTION VERIFIED** · tip |
| **CEL** | Hub hierarchy: **ANALIZA → EKSPERCI → WALIDACJA → REKOMENDACJA → DECYZJA** |
| **CO ZROBIONO** | Intelligence → recovery · CL „Hub przetargu” · Chief Trace→EW→Offer · DW steps · single primary PLN Hub headline · harness 37 |
| **CO NIE ZROBIONO** | S5 tab · TRE delete · Strategy rewrite · Bid retire |
| **DEPENDENCIES** | S2 + S3 CLOSED |
| **LOCKS** | thin Hub UI only · S3 authority NO TOUCH · NO NEW FLAG |
| **ROLLBACK** | revert `85f4db14` |
| **NEXT** | **S5 Tab Decyzja → DW** |
| **AC** | AC-S4-1…4 PASS |
| **SSOT** | [`S4-CLOSEOUT`](TENDER-MODERNIZATION-01-S4-CLOSEOUT.md) · [`S4-PV`](TENDER-MODERNIZATION-01-S4-PRODUCTION-VERIFY.md) · [`S4-DF`](TENDER-MODERNIZATION-01-S4-DESIGN-FREEZE.md) |

---

## S5 — Tab Decyzja → DW

| | |
|--|--|
| **STATUS** | **CLOSED** · **PRODUCTION VERIFIED** |
| **CEL** | Tab Decyzja = Decision Workspace gdy Expert ON · parity DecisionView |
| **CO ZROBIONO** | mount DW overview · Hub DW KEEP · CTA home decyzja · fallback DecisionView |
| **CO NIE ZROBIONO** | hard delete DecisionView · (store bridge = S6 CLOSED) |
| **DEPENDENCIES** | S4 |
| **LOCKS** | no hard delete DecisionView |
| **ROLLBACK** | revert `ebae3d2e` |
| **NEXT** | superseded by S6 |
| **AC** | AC-S5-1…4 PASS |
| **SSOT** | [`S5-CLOSEOUT`](TENDER-MODERNIZATION-01-S5-CLOSEOUT.md) · [`S5-PV`](TENDER-MODERNIZATION-01-S5-PRODUCTION-VERIFY.md) · [`S5-DF`](TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md) |

---

## S6 — Decision Persist / store bridge

| | |
|--|--|
| **STATUS** | **CLOSED** · **PRODUCTION VERIFIED** |
| **CEL** | Persist = primary write · bridge → `kw-tender-decisions` projection dla Strategy |
| **CO ZROBIONO** | `mapPersistActionToLegacyOwnerDecision` · Host Persist-first → `setOwnerDecision` · scoringBundle REUSE · harness 28 |
| **CO NIE ZROBIONO** | Strategy rewrite · cloud Persist · third store · REMOVE legacy · DecisionView delete |
| **DEPENDENCIES** | S5 |
| **LOCKS** | ZERO third store · NO cloud in TM-01 · mapping approve→GO / reject→NO-GO / needs_review→HOLD · Persist API NO TOUCH |
| **ROLLBACK** | revert `cb91027d` |
| **NEXT** | superseded by S7 |
| **AC** | AC-S6-1…8 PASS |
| **SSOT** | [`S6-CLOSEOUT`](TENDER-MODERNIZATION-01-S6-CLOSEOUT.md) · [`S6-PV`](TENDER-MODERNIZATION-01-S6-PRODUCTION-VERIFY.md) · [`S6-DF`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md) |

---

## S7 — TRE-01 deprecation

| | |
|--|--|
| **STATUS** | **CLOSED** · **PRODUCTION VERIFIED** · tip **`617f0cb5`** |
| **CO ZROBIONO** | `TRE_01_SLICE_A_DEFAULT=false` · Expert ON Hub-first hard gate · DetailPage recovery CTA · Expert OFF LS=`1` R0 · Offer Run enabled wiring · harness S7 |
| **CO NIE ZROBIONO** | hard delete Offer/Bid/Outcome engines (**OUT → S8**) · HubPanel CTA (**OUT**) · `useTenderOfferRun.ts` body |
| **DEPENDENCIES** | S1–S6 AC PASS |
| **LOCKS** | no hard delete engines · HubPanel CTA ZERO · hook file NO TOUCH |
| **ROLLBACK** | revert `617f0cb5` |
| **NEXT** | **S8 hard REMOVE / Bid retirement** |
| **AC** | AC-S7-1…10 PASS |
| **SSOT** | [`S7-CLOSEOUT`](TENDER-MODERNIZATION-01-S7-CLOSEOUT.md) · [`S7-PV`](TENDER-MODERNIZATION-01-S7-PRODUCTION-VERIFY.md) · [`S7-DF`](TENDER-MODERNIZATION-01-S7-DESIGN-FREEZE.md) |

---

## S8 — Hard REMOVE / Bid retirement

| | |
|--|--|
| **STATUS** | **OPEN** · **NEXT** · WAITING FOR OWNER GO → AUDIT |
| **CEL** | Mikro-REMOVE po L8 gates · opcjonalnie Bid retire (tylko po S3-D + GO) |
| **CO ZROBIONO** | — |
| **CO NIE ZROBIONO** | Intelligence UI · DecisionView · legacy store · obsolete flags · Bid retire |
| **DEPENDENCIES** | S7 + **L8 per item** + osobny Owner GO |
| **LOCKS** | zero live consumers · allowlist-only · never force-push |
| **ROLLBACK** | revert mikro-commit |
| **NEXT** | EPIC TM-01 CLOSE (gdy Owner) |

---

## 8 LOCK (BC / domain)

| # | LOCK | Reguła |
|---|------|--------|
| 1 | Expert BC | NO TOUCH bez jawnego scope |
| 2 | Chief | NO TOUCH |
| 3 | Session | NO TOUCH |
| 4 | Validation | NO TOUCH |
| 5 | Adapters | NO TOUCH |
| 6 | Technology / TF | NO TOUCH |
| 7 | OfferBoq / Bid domain calc | NO TOUCH · NO DELETE w S0–S7 |
| 8 | Domain calculation | NO TOUCH |

Pełna lista DF: [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) §1 / §10.

---

## Related future (poza TM-01 order, Owner GO)

| Temat | Status |
|-------|--------|
| Cloud Decision Persist | OUT P0 · residual Persist |
| Audit Hub (decision) | OUT P0 |
| Strategy API integration | KEEP Strategy · migrate later |
| S3-D / ALIGN-BID-RETIRE | OUT of S3 · przed S8 Bid |
| EXPERT-AI-PRODUCTION-ENABLEMENT-01 | **NIE** dependency · NO NEW FLAG |

---

## How to continue (new session)

```text
1. WGDOM-COLD-START-HANDOFF + MASTER-AI-HANDOFF + 09 tip
2. TEN MASTER + TM-01 DESIGN-FREEZE
3. Owner GO S4 → AUDIT only (no PLAN/DF/IMPLEMENT without GO)
4. Nie startuj S5–S8 · S3-D · Bid retirement bez GO
```
