# WGDOM — MASTER AI HANDOFF

> **ID:** MASTER-AI-HANDOFF  
> **STATUS:** **ACTIVE** · **★★ GŁÓWNY SSOT cold-start** (ChatGPT · Cursor)  
> **MODE:** DOCUMENTATION ONLY  
> **Data:** 2026-08-25 (docs sync IK-KNR KL-6 PRODUCTION VERIFIED) · prior 2026-08-25 (Phase 2D) · prior 2026-08-24 (F5 MARGIN)  
> **★★ Cold-start 1. plik:** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ IK Master (NO REBUILD):** [`../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](../architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) · [`../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](../architecture/INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)  
> **★★ IK-KNR KL-6 (2026-08-25):** deploy tip **`85a1ad7`** · **PRODUCTION_VERIFIED_CLOSED** · UI **`ce192b1e`** · desktop sidebar hotfix **`85a1ad7`** — szczegóły w [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) §1 · continuity [`../AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md)  
> **★★ IK-KNR Phase 2D (2026-08-25):** **FROZEN ANCESTOR** **`77385b0c`** · L3 PDF pilot (1 source · 1 key) · **≠ aktualny deploy tip** — szczegóły w [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) §1  
> **★★ IK sesja 2026-08-24:** [`../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md`](../architecture/IK-MASTER-CONTINUITY-HANDOFF-2026-08-24.md) — F5 MARGIN **CLOSED GREEN** · A08-P0/P1/P2 **CLOSED** · AUTONOMY-08 epic **NOT CLOSED**  
> **Tip numeryczny:** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Tender Bid / Position Cost continuity:** [`10_TENDER_PRICING_CONTINUITY.md`](10_TENDER_PRICING_CONTINUITY.md) · [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md)  
> **Proces:** [`AI_ENTRY.md`](AI_ENTRY.md) · Gate [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md)  
> **Alias / skrót:** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) → **ten plik**  
> **TM-01 MASTER:** [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md)  
> **Docs sync:** [`PROJECT-DOCS-SYNC-DESIGN-FREEZE.md`](../architecture/PROJECT-DOCS-SYNC-DESIGN-FREEZE.md)  
> **Uwaga tip:** bloki historyczne poniżej mogą mieć stare numery — **aktualny tip tylko w 09**

```text
Nie czytaj historii czatu. Nie zgaduj tipu. Nie buduj Przetargów od nowa.
START = WGDOM-COLD-START-HANDOFF → IK MASTER-SSOT → IK-MASTER-CONTINUITY-HANDOFF-2026-08-24 → TEN plik → 09 + version.json
Tip = wyłącznie 09 + version.json (nie snapshot 2.66.59 poniżej)
ACTIVE IMPLEMENT = NONE bez Owner GO · IK-KNR KL-6 CLOSED @ 85a1ad7 (PRODUCTION VERIFIED) · IK-KNR Phase 2D FROZEN ANCESTOR @ 77385b0c · Phase 2E NOT STARTED · F5 MARGIN CLOSED GREEN · A08-P2 CLOSED · AUTONOMY-08 epic NOT CLOSED · NIE A08-P3
```

---

## Executive Summary

W&G DOM jest w trybie **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO**. Tip `main` (SSOT [`09`](09_PRODUCTION_BASELINE.md) + `version.json`): **UI 2.66.115** / deploy **`85a1ad7`** · **IK-KNR KL-6 Owner VERIFY UI CLOSED / PRODUCTION VERIFIED** (UI **`ce192b1e`** · sidebar hotfix **`85a1ad7`**) · **IK-KNR Phase 2D** frozen ancestor **`77385b0c`** · prior **IK A01 F5 MARGIN** (`82f3520e` · ancestor) · prior **IK Observability Phases 1–4 CLOSED** (`c1b3ad7d`) · prior **IK-KNR-WC P3 + P3.1 CLOSED / PRODUCTION VERIFIED** · **AUTONOMY-08 epic NOT CLOSED** · **≠** cały IK globalnie E2E PRODUCTION VERIFIED · prior **INTELIGENTNY-KOSZTORYSANT-UX CLOSED** · **EXPERT-AI-P0-DUAL-ENABLEMENT CLOSED** (`1902daa7`) · **EXPERT-AI-PRODUCTION-ENABLEMENT-01 CLOSED** · **Q12 KEEP** · **TENDER-MODERNIZATION-01 EPIC CLOSED** · … · slice-level **PRODUCTION VERIFIED** where documented in 09. Baseline: **KL-6** + **F5 MARGIN** + **IK-KNR-WC Identity Bridge P3/P3.1** + Experts P0 + Chief + … + P0 Dual-Enablement + Inteligentny Kosztorysant UX complete · Hub-first default · Expert ON never auto Outcome · Persist-first → GO/NO-GO/HOLD · Decyzja overview DW PRIMARY @ runtime D ON · DecisionView recovery · Hub DW KEEP · Offer primary when **runtime D ON** · NO PRIMARY when Offer null · Bid legacy when **runtime D OFF** · D default **OFF** · staff Przetargi module gate · S0 orphan cleanup.

Ostatnie zamknięte (slice-level): **IK-KNR KL-6 Owner VERIFY UI** (`85a1ad7` hotfix · UI `ce192b1e`) · **IK-KNR Phase 2D L3 PDF pilot** (`77385b0c` · FROZEN ancestor) · **IK A01 F5 MARGIN** (`82f3520e`) · **IK Observability Phases 1–4** (`c1b3ad7d`) · **TENDER-MODERNIZATION-01 EPIC (S0–S9)** · **S9 C0** · **S8 HOLD** · **S7–S0** · **DECISION-PERSIST-01** · **WIRE-EXPERTS-UI-01** · **DECISION-WORKSPACE-01** · **VALIDATION-EXPERT-01** · **WIRE-CHIEF-UI-DOSSIER-01** · **WIRE-CHIEF-SESSION-01** · **WIRE-CHIEF-RO-ADAPTERS-01** · **CHIEF-ORCHESTRATOR-P0** · **EXPERTS-P0** (EE→ME→PE→Cost→Offer) · **NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01** (B0) · **NG-TENDERS-KNOWLEDGE-FOUNDATION-01** (TS-A0+A1) · **NG-TENDERS-COST-KNOWLEDGE-01** · **NG-TENDERS-WORKSPACE-01** · **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** · **WM-DOKUMENTACJA-SZKICE-02** · **-01 P2a/P0** · **WM-WORKER-SKETCH-01** · **APPEARANCE-01** · **AUTO-GENERATE-01** · **MAPPING-MIGRATION-01** · **OST-01** · AcroForm OST **PASS** · **WIM-P1a** · WM-RYSUNKI CORE · AI/MS/SMART/GLOBAL-UX fale CLOSED.  
**OST-03 / XFA / cache filled = zakaz.**  
**NEXT rekomendacja:** **UTRZYMANIE** — residual **C1–C6** / new epic — **tylko Owner GO → AUDIT** · **NIE** invent S10.  
Backlog bez Owner GO = **zakaz IMPLEMENT**.

Protected Core **GREEN**. Stabilization Window **ACTIVE**. Lista Płac = priorytet #1.

---

## Current Production Baseline

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Branch** | `main` |
| **UI version** | **2.66.115** |
| **Commit** | **`85a1ad7`** · live deploy tip · **IK-KNR KL-6 CLOSED / PRODUCTION VERIFIED** (UI **`ce192b1e`** · sidebar hotfix **`85a1ad7`**) · Phase 2D frozen ancestor **`77385b0c`** · prior **IK A01 F5 MARGIN** **`82f3520e`** · prior Observability Ph 4 **`c1b3ad7d`** · prior IK-KNR-WC P3.1 **`5984330a`** |
| **Feature tip** | **`85a1ad7`** — **IK-KNR KL-6** Owner VERIFY UI (route `knrverify` · orchestrator authority · prod smoke PASS) · Phase 2D **`77385b0c`** FROZEN ancestor · Phase 2E **NOT STARTED** · prior **`82f3520e`** F5 MARGIN · prior Observability **`c1b3ad7d`** · prior IK-KNR-WC P3 **`5984330a`** · … · EXPERTS-P0 **`58872663`** |
| **Status** | **PRODUCTION VERIFIED** (slice-level per 09) · **≠** cały IK globalnie E2E PV · tip SSOT = [`09`](09_PRODUCTION_BASELINE.md) · **WAITING FOR NEXT OWNER GO** |
| **ACTIVE EPIC** | **NONE** |
| **ACTIVE IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **SSOT tip** | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| **Tryb** | **UTRZYMANIE** |
| **STABILIZATION WINDOW** | **ACTIVE** |
| **Protected Core** | **GREEN** |
| **Deploy FE** | `git push origin main` → Vercel (**zakaz** `vercel deploy`) |

---

## Current Architecture State

| Domenа | Stan |
|--------|------|
| **App** | React/Vite · monolit UI `src/app/` · Przetargi = TendersModule |
| **Sync** | `cloud-sync.ts` · Edge `make-server-0afb8820` — **nie** ruszaj CORE bez Owner GO |
| **Payroll** | SSOT Hours-wipe / carry — Gate G1–G9 przed IMPLEMENT |
| **AI-COST-01** | **EPIC COMPLETE · FROZEN · FIELD READY** — Bid Proposal = jedyny generator oferty |
| **AI-COST-02** | COST-02-A · 02-B · **I3 FULLY CLOSED** · dalsze slice = backlog |
| **Doc detection** | `src/lib/doc-detection/` · Doc.D1/D2/D3 · bez rename KV `dossier.kosztorys` |
| **Foundation Lib P0** | COMPLETE (FND-01…05) · **FND-06 BLOCKED** · app **nie** podłączona |
| **Workflow Przetargi** | Workspace v2 · Hub · Process Strip · CTA — [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) · [`NG-TENDERS-WORKSPACE-01-CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **Cost Knowledge** | CK-01 A0+A1 CLOSED · Foundation TS-A0+A1 (Decision/C1/Health) — [`cost-knowledge/`](../../src/lib/cost-knowledge/) · [`FOUNDATION-CLOSEOUT`](../architecture/NG-TENDERS-KNOWLEDGE-FOUNDATION-01-CLOSEOUT.md) · [`CK-01-CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |
| **Technology Foundation** | B0 CLOSED — Pack/Capability/Plan/BOM pure-lib — [`technology-foundation/`](../../src/lib/technology-foundation/) · [`TF-CLOSEOUT`](../architecture/NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01-CLOSEOUT.md) |
| **Experts P0** | EE→ME→PE→Cost→Offer CLOSED — [`execution-expert/`](../../src/lib/execution-expert/) … [`offer-expert/`](../../src/lib/offer-expert/) · [`EXPERTS-P0-CLOSEOUT`](../architecture/EXPERTS-P0-CLOSEOUT.md) |
| **Chief Orchestrator P0** | Case→Task · gates · LOOP · dossier — [`chief-orchestrator/`](../../src/lib/chief-orchestrator/) · [`CHIEF-CLOSEOUT`](../architecture/CHIEF-ORCHESTRATOR-P0-CLOSEOUT.md) |
| **Wire Chief RO Adapters** | OfferBoq/Catalog/Company/Strategy RO — [`chief-wire-adapters/`](../../src/lib/chief-wire-adapters/) · [`ADAPTERS-CLOSEOUT`](../architecture/WIRE-CHIEF-RO-ADAPTERS-01-CLOSEOUT.md) |
| **Wire Chief Session** | engine + hook · flag OFF — [`chief-session/`](../../src/lib/chief-session/) · [`SESSION-CLOSEOUT`](../architecture/WIRE-CHIEF-SESSION-01-CLOSEOUT.md) |
| **Wire Chief UI Dossier** | READ ONLY surface · ViewModel — [`chief-dossier-ui/`](../../src/lib/chief-dossier-ui/) · [`chief-dossier/`](../../src/app/chief-dossier/) · [`UI-DOSSIER-CLOSEOUT`](../architecture/WIRE-CHIEF-UI-DOSSIER-01-CLOSEOUT.md) |
| **Validation Expert P0** | QA dossier · Finding · verdict — [`validation-expert/`](../../src/lib/validation-expert/) · [`VAL-CLOSEOUT`](../architecture/VALIDATION-EXPERT-01-CLOSEOUT.md) |
| **Decision Workspace** | Recommendation/Findings/Actions · Dual Outcome · **S2:** PRIMARY when Expert-effective — [`decision-workspace-ui/`](../../src/lib/decision-workspace-ui/) · [`decision-workspace/`](../../src/app/decision-workspace/) · [`DW-CLOSEOUT`](../architecture/DECISION-WORKSPACE-01-CLOSEOUT.md) · [`S2-CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md) |
| **Decision Persist** | append-only LS · Host wire — [`decision-persist/`](../../src/lib/decision-persist/) · [`DP-CLOSEOUT`](../architecture/DECISION-PERSIST-01-CLOSEOUT.md) |
| **Expert Workspace UI** | Details RO `dossier.experts.*` · Slot A — [`expert-workspace-ui/`](../../src/lib/expert-workspace-ui/) · [`expert-workspace/`](../../src/app/expert-workspace/) · [`EW-CLOSEOUT`](../architecture/WIRE-EXPERTS-UI-01-CLOSEOUT.md) |
| **Pricing SSOT (S3)** | Offer primary / NO PRIMARY / Bid legacy — [`TENDER-PRICING-SSOT`](../architecture/TENDER-PRICING-SSOT.md) · helper `tender-offer-pln-authority.ts` |
| **TM-01 roadmap** | **EPIC CLOSED** · S0–S9 CLOSED · S8 HOLD · S9 C0 · residual C1–C6 Owner GO — [`TM-01-MASTER`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · [`S9-CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md) · [`TM-01-DF`](../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) |
| **Legacy map** | KEEP→…→REMOVE — [`TENDER-LEGACY-DEPRECATION-MAP`](../architecture/TENDER-LEGACY-DEPRECATION-MAP.md) |
| **Decision architecture** | DW · Persist · legacy store — [`DECISION-ARCHITECTURE`](../architecture/DECISION-ARCHITECTURE.md) |
| **Expert AI architecture** | pełny pipeline — [`EXPERT-AI-ARCHITECTURE`](../architecture/EXPERT-AI-ARCHITECTURE.md) |

Szczegóły living: [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [`PROJECT-GUIDE.md`](../../PROJECT-GUIDE.md) · [`AGENTS.md`](../../AGENTS.md) (proces, nie tip).

---

## Project goal — inteligentny kosztorysant

**Główny cel Przetargów tipu:** jeden spójny Expert AI / kosztorysant — nie równoległe silniki.

```text
OfferBoq → EE → ME → PE → Cost → Offer
  → Chief → Session → Dossier → Expert Workspace
  → Validation → Recommendation → Decision Workspace → Decision Persist
```

Expert Workspace = 5 paneli RO: **EE · ME · PE · Cost · Offer** z `dossier.experts.*`.

---

## Pricing semantics (tip S3)

| Pole | Rola |
|------|------|
| `OfferBoq.directPln` | **COST** |
| `Offer.offerPricePln` | **PRIMARY** gdy Expert ON |
| `Bid.recommendedBidPln` | **LEGACY** · PRIMARY gdy Expert OFF |
| Expert ON + Offer null | **NO PRIMARY** (nigdy Bid fallback) |

Parity: MATCH **1** · EXPECTED_DELTA **12** · UNEXPECTED_DELTA **0** · NOT COVERED **0**.  
**NO THIRD PLN.** S3-D / Bid retirement = **OUT**.

---

## Tender Modernization backlog (TM-01)

| Slice | Status | Commit / note |
|-------|--------|---------------|
| S0 orphan | **CLOSED** | `5beb082a` |
| S1 module | **CLOSED** | `eed3ba0e` · `tendersTabForStaffEnabled` |
| S2 Dual Outcome | **CLOSED** | `1888d05f` · DW PRIMARY · no Approve→GO |
| S3 Align Pricing | **CLOSED** | `ec8a5044` |
| S4 Hub UX | **CLOSED** | `85f4db14` |
| **S5 Tab Decyzja→DW** | **CLOSED** | **`ebae3d2e`** |
| **S6 Persist bridge** | **CLOSED** | **`cb91027d`** hist. |
| **S7 TRE Hub-first** | **CLOSED** | **`617f0cb5`** feature tip |
| **S8 HOLD REMOVE** | **CLOSED** | **`9231cc6b`** docs tip · ZERO code |
| **S9 EPIC CLOSE (C0)** | **CLOSED** | **`df6c104a`** docs · ZERO code · residual C1–C6 deferred |

Osobno (Owner GO): Cloud Persist · Audit Hub · Strategy API · C1–C6 REMOVE/MIGRATE.

---

## 8 LOCK

Expert · Chief · Session · Validation · Adapters · Technology/TF · OfferBoq · Bid domain — **NO TOUCH** bez jawnego scope.

---

## Closed Work

> Pełne listy historyczne → closeouty w `docs/architecture/*`. Tu tylko **aktualnie istotne** tipy.

| Nazwa | Wersja | Commit | Status | PV |
|-------|--------|--------|--------|-----|
| **EXPERT-AI-P0-DUAL-ENABLEMENT** | **2.66.22** tip | **`1902daa7`** | **P0 CLOSED** · M=ACCESS · D=RUNTIME · F1 Bid PRIMARY · no third flag/store/engine · useTenderOfferRun OUT · bid WIP OUT | **YES** · [`CLOSEOUT`](../architecture/EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md) · [`PV`](../architecture/EXPERT-AI-P0-DUAL-ENABLEMENT-PRODUCTION-VERIFY.md) |
| **EXPERT-AI-PRODUCTION-ENABLEMENT-01 / Q12** | **2.66.22** tip | **`4ba06032`** | **EPIC CLOSED** · master gate `expertAiDecydentEnabled` · Q12 `stableCaseStamp` Case identity · Persist UNCHANGED · content invalidation **NOT TESTED** · S2 44/45 PRE-EXISTING OUT | **YES** · [`CLOSEOUT`](../architecture/EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md) · [`Q12 PV`](../architecture/EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S8** | **2.66.22** tip | **`9231cc6b`** | **S8 CLOSED HOLD** · ZERO functional code · NO hard REMOVE · surfaces KEEP · 4 symbols KEEP · feature tip remains **`617f0cb5`** · EPIC residual ≠ auto-CLOSED | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S8-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S8-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S7** | **2.66.22** tip | **`617f0cb5`** | **S7 CLOSED** · Hub-first DEFAULT=false · Expert ON never auto Outcome · DetailPage recovery CTA · Expert OFF LS=1 R0 · HubPanel CTA ZERO · Outcome/OfferRun/Bid/OfferBoq/S6 KEEP · tip deploy supersedowany przez S8 docs | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S7-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S7-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S6** | **2.66.22** tip hist. | **`cb91027d`** | **S6 CLOSED** · Persist-first → map → `setOwnerDecision` · approve→GO · reject→NO-GO · needs_review→HOLD · scoringBundle REUSE · ZERO mirror on Persist FAIL · tip supersedowany przez S7 | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S6-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S6-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S5** | **2.66.22** tip | **`ebae3d2e`** | **S5 CLOSED** · Tab Decyzja overview → DW Host PRIMARY @ Expert ON · DecisionView recovery · Expert OFF legacy PRIMARY · Hub DW KEEP · CTA home decyzja · store ZERO TOUCH · Persist REUSE · EPIC TM-01 **nie** CLOSED (hist.; tip supersedowany przez S6) | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S5-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S5-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S4** | **2.66.22** tip hist. | **`85f4db14`** | **S4 CLOSED** · Hub UX · ANALIZA→…→DECYZJA · Intelligence recovery · CL Hub przetargu · primary PLN Hub · tip deploy supersedowany przez TM-01 S5 | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S4-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S4-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S3** | **2.66.22** tip hist. | **`ec8a5044`** | **S3 CLOSED** · Align Pricing · Offer primary @ Expert ON · NO PRIMARY @ Offer null · Bid legacy @ Expert OFF · TRE fallback FIXED · parity 1/12/0 · no third PLN · S3-D/S8 OUT · 8 LOCK · tip deploy supersedowany | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S3-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S3-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S2** | **2.66.22** tip hist. | **`1888d05f`** | **S2 CLOSED** · Dual Outcome · Expert-effective = Module · DW PRIMARY · legacy HIDE/DEMOTE · **NO** Approve→GO · stores untouched · S5–S8 OUT · 8 LOCK · tip deploy supersedowany przez TM-01 S3 | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S2-PRODUCTION-VERIFY.md) |
| **TENDER-MODULE-ENABLEMENT-01** | **2.66.22** tip hist. | **`eed3ba0e`** | **EPIC CLOSED** (S1) · AppSettings REUSE `tendersTabForStaffEnabled` · default OFF · Super Admin bypass · Admin/Moderator gate · Moduły → Przetargi · route guard · 8 LOCK · tip deploy supersedowany przez TM-01 S3 | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODULE-ENABLEMENT-01-PRODUCTION-VERIFY.md) |
| **TENDER-MODERNIZATION-01 / S0** | **2.66.22** tip hist. | **`5beb082a`** | **S0 CLOSED** · orphan cleanup · S0b harness 5 · delete OwnerView/OverviewShortcuts/CC Context · 8 LOCK · tip deploy supersedowany · EPIC TM-01 **nie** CLOSED | **YES** · [`CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S0-CLOSEOUT.md) · [`PV`](../architecture/TENDER-MODERNIZATION-01-S0-PRODUCTION-VERIFY.md) |
| **DECISION-PERSIST-01** | **2.66.22** tip hist. | **`adde246a`** | **EPIC CLOSED** · append-only `kw-decision-persist-v1` · record/hydrate/list · Host wire · flag REUSE · validationSnapshot 3 pola · tip deploy supersedowany przez TM-01 S0 | **YES** · [`CLOSEOUT`](../architecture/DECISION-PERSIST-01-CLOSEOUT.md) · [`PV`](../architecture/DECISION-PERSIST-01-PRODUCTION-VERIFY.md) |
| **WIRE-EXPERTS-UI-01** | **2.66.22** tip hist. | **`4ae26fe7`** | **EPIC CLOSED** · Expert Workspace RO · Slot A pod Trace · Session flag only · VM passthrough `dossier.experts.*` · EE→ME→PE→Cost→Offer · tip deploy supersedowany przez Decision Persist | **YES** · [`CLOSEOUT`](../architecture/WIRE-EXPERTS-UI-01-CLOSEOUT.md) · [`PV`](../architecture/WIRE-EXPERTS-UI-01-PRODUCTION-VERIFY.md) |
| **DECISION-WORKSPACE-01** | **2.66.22** tip hist. | **`baa4b403`** | **EPIC CLOSED** · Decision Workspace UI · VM-only · Validation cache ≤1× · Actions Approve/Reject/Needs Review/Return · Dual Outcome · flag OFF · tip deploy supersedowany przez Decision Persist | **YES** · [`CLOSEOUT`](../architecture/DECISION-WORKSPACE-01-CLOSEOUT.md) · [`PV`](../architecture/DECISION-WORKSPACE-01-PRODUCTION-VERIFY.md) |
| **VALIDATION-EXPERT-01** | **2.66.22** tip hist. | **`5fa2746d`** | **EPIC CLOSED** · pure-lib QA · Finding Hard/Soft · C1–C8 · Q1–Q6 · verdict · Trace · Soft limit 3 · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/VALIDATION-EXPERT-01-CLOSEOUT.md) · [`PV`](../architecture/VALIDATION-EXPERT-01-PRODUCTION-VERIFY.md) |
| **WIRE-CHIEF-UI-DOSSIER-01** | **2.66.22** tip hist. | **`ce0b70c0`** | **EPIC CLOSED** · READ ONLY „Przebieg ekspertów” · sibling POD hub · thin VM · flag OFF ⇒ no DOM · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/WIRE-CHIEF-UI-DOSSIER-01-CLOSEOUT.md) · [`PV`](../architecture/WIRE-CHIEF-UI-DOSSIER-01-PRODUCTION-VERIFY.md) |
| **WIRE-CHIEF-SESSION-01** | **2.66.22** tip hist. | **`5b9fd741`** | **EPIC CLOSED** · Session engine + hook · flag OFF · dossier in-memory · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/WIRE-CHIEF-SESSION-01-CLOSEOUT.md) · [`PV`](../architecture/WIRE-CHIEF-SESSION-01-PRODUCTION-VERIFY.md) |
| **WIRE-CHIEF-RO-ADAPTERS-01** | **2.66.22** tip hist. | **`0c310355`** | **EPIC CLOSED** · pure-lib adapters RO · assembleChiefWireRuntimeRo · bez Chief.run · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/WIRE-CHIEF-RO-ADAPTERS-01-CLOSEOUT.md) · [`PV`](../architecture/WIRE-CHIEF-RO-ADAPTERS-01-PRODUCTION-VERIFY.md) |
| **CHIEF-ORCHESTRATOR-P0** | **2.66.22** tip hist. | **`06cc7a6b`** | **EPIC CLOSED** · orchestration only · REUSE Experts · dossier Decydent · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/CHIEF-ORCHESTRATOR-P0-CLOSEOUT.md) · [`PV`](../architecture/CHIEF-ORCHESTRATOR-P0-PRODUCTION-VERIFY.md) |
| **EXPERTS-P0** | **2.66.22** tip hist. | **`58872663`** | **EPIC CLOSED** · Execution→Materials→Pricing→Cost→Offer · Trace · sygnał Decydent · tip deploy supersedowany przez Expert Workspace UI | **YES** · [`CLOSEOUT`](../architecture/EXPERTS-P0-CLOSEOUT.md) · [`PV`](../architecture/EXPERTS-P0-PRODUCTION-VERIFY.md) |
| **NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01** | **2.66.20** tip hist. | **`d9bb4c57`** | **EPIC CLOSED** · Phase B0 pure-lib · Pack/Plan/BOM · COND-TF-1…10 · tip deploy supersedowany przez EXPERTS-P0 | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01-CLOSEOUT.md) |
| **NG-TENDERS-KNOWLEDGE-FOUNDATION-01** | **2.66.20** tip | **`8202d990`** | **EPIC CLOSED** · TS-A0 Decision/C1/Health · TS-A1 Library/Match FEATURE-DATA · COND-1…6 | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-KNOWLEDGE-FOUNDATION-01-CLOSEOUT.md) |
| **NG-TENDERS-COST-KNOWLEDGE-01** | **2.66.20** tip | feature **`9c0901d6`** · docs **`f2b0fa1e`** | **EPIC CLOSED** · A0 KPI Harness RO · A1 Library Fill + Quotes REUSE | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |
| **NG-TENDERS-WORKSPACE-01** | **2.66.19** | **`182dd9af`** | **EPIC CLOSED** · Workspace v2 · Przegląd start · 4 tabs · AC-RETURN · Firma Hub · hide module nav | **YES** · [`CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** | **2.66.17** | **`e871fed6`** | **EPIC CLOSED** · draft↔final · unsetDrawingFinal · Model A delete · ACL session · audit | **YES** · [`CLOSEOUT`](../architecture/WM-ODBIORY-RYSUNKI-FINAL-UNDO-01-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-02** | **2.66.16** | **`377e279f`** | **EPIC CLOSED** · Publication Workflow · `placement` · `resolved` · Promote-copy 1:1 · A2 NO TOUCH | **YES** · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01 P2a** | **2.66.15** | **`e9598c99`** | **P2a CLOSED** · Dashboard Szkice Techniczne (job-centric) · HIGH→NORMAL · Jobs→Dokumentacja→drawingId · A2 NO TOUCH | **YES** · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01 P0** | **2.66.14** | **`0afeb82d`** | **P0 CLOSED** · Dokumentacja→Szkice Techniczne · Needs Changes · Resubmit · (Accept superseded by -02) · A2 NO TOUCH | **YES** · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **2.66.13** · P0 **2.66.12** | P1 **`4f99a279`** · P0 **`3c9d6f90`** | **EPIC CLOSED** · P0+P1 CLOSED · Worker Docs→Szkice · drag-release · snap · flag OFF | **YES** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-DRUK-OST-APPEARANCE-01** | 2.66.11 | `4d33361e` | **CLOSED** · OST `/AP` adresu | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-APPEARANCE-01-CLOSEOUT.md) |
| **WM-DRUK-OST-AUTO-GENERATE-01** | 2.66.10 | `82dc1017` | **CLOSED** · S2 Hard Ensure OST w ZIP | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-AUTO-GENERATE-01-CLOSEOUT.md) |
| **WM-DRUK-OST-MAPPING-MIGRATION-01** | 2.66.09 | `56069cce` | **CLOSED** · migrate OST pdfFieldMapping | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-MAPPING-MIGRATION-01-CLOSEOUT.md) |
| **WM-DRUK-OST-01** | 2.66.08 | `949333ed` | **CLOSED** · OST pdf_form · thin guard · upload-only | **YES** · [`CLOSEOUT`](../architecture/WM-DRUK-OST-01-CLOSEOUT.md) |
| **WORKER-INSPECTOR-MOBILE-01 WIM-P1a** | 2.66.07 | `3df0d24a` | **CLOSED** · Capture & Privacy Worker | **YES** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P1a-CLOSEOUT.md) |
| **WORKER-INSPECTOR-MOBILE-01 WIM-P0** | 2.66.06 | `1f04f559` | **CLOSED** · viewport SSOT Worker+Inspector | **YES** · [`CLOSEOUT`](../architecture/WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01 MOBILE-P1** | 2.66.05 | `59f09c1c` | **CLOSED** · hit · 44px · modal · create | **YES** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P1-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01 MOBILE-P0** | 2.66.04 | `13ca099b` | **CLOSED** · portal FS · gesty | **YES** · [`CLOSEOUT`](../architecture/WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3B.1** | 2.66.03 | `77f18b78` | **CLOSED** · continuous UX fix | **YES** · STOP po wall · tool sticky · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B1-CONTINUOUS-DRAWING-UX-FIX-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3B** | 2.66.02 | `abe57f9a` | **CLOSED** · interactive Ghost | **YES** · Ghost · continuous (SUPERSEDED by P3B.1) · ESC · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3B-INTERACTIVE-DRAWING-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3A** | 2.66.01 | `20e5c5a3` | **CLOSED** · polish po CORE | **YES** · UX W/P/W/R · gap · wymiar · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3A-UX-POLISH-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P3** | 2.66.00 | `8d4abcc9` | **CLOSED** · **EPIC CORE COMPLETE** | **YES** · ZIP Rysunki · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P3-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P2** | 2.65.99 | `4e84f994` | **CLOSED** | **YES** · PDF export · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P2-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P1B** | 2.65.98 | `ad69bcb5` | **CLOSED** | **YES** · AppSettings rollout · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1B-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P1** | 2.65.97 | `0b37787d` | **CLOSED** | **YES** · toolset · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P1-CLOSEOUT.md) |
| **WM-RYSUNKI-01 P0** | 2.65.96 | `028e4819` | **CLOSED** | **YES** · flaga OFF · [`CLOSEOUT`](../architecture/WM-RYSUNKI-01-P0-CLOSEOUT.md) |
| **MARKET-SYNC-01 P3-A** | 2.65.95 | `7325c773` | **CLOSED** | mock spine · flaga OFF · Legal OPEN · nie tip UI |
| **AI-COST-02 I3** | 2.65.95 | feature `869b4c52` · docs `99969f33` | **FULLY CLOSED** | **YES** · flaga OFF · UI ⇒ 02-B ON |
| **MARKET-SYNC-01 P2** | 2.65.95 | `18830c11` / tip `18830c1` | **FULLY CLOSED** | **YES** · flaga OFF |
| **SMART-PRICING-01 P2** | 2.65.95 | `99c6337` | **CLOSED** | **YES** · flaga OFF · P2⇒P1 |
| **SMART-PRICING-01 P1** | 2.65.95 | `d8b080e` | **CLOSED** | **YES** · flaga OFF |
| **GLOBAL-UX-02** | 2.65.95 | `3385d9f` | **FULLY CLOSED** | **YES** · S9 DEFERRED |
| **AI-DOC-DETECTION** | 2.65.95 | `023ac686` | **FULLY CLOSED** | **YES** |
| Scope Gap MVP | 2.65.93 | `4234617b` | FULLY CLOSED | YES* |
| Confidence MVP | 2.65.92 | `00a5d873` | FULLY CLOSED | YES* |
| CATALOG-COVERAGE-01 (P0a–P0e) | 2.65.87–91 | tip P0e `b69aeaae` | **FULLY CLOSED** | YES · coverage 78.1% |
| SMART-PRICING-01 P0 | 2.65.86 | `9ca4a4e5` | CLOSED | YES |
| MARKET-SYNC-01 P1 / P0 | 2.65.85 / 84 | `5326cf8c` / `273fb3e0` | CLOSED | YES |
| CENY-MATERIAŁÓW-04 P2 / P1 | — / 2.65.81–83 | P1-C `992023cc` | COMPLETE | YES |
| WORK-CATALOG-P3.3 | 2.65.79 | `e10a1511` | CLOSED | YES |
| AI-COST-02-B | 2.65.78 | `9dc113e7` | CLOSED | YES |
| AI-COST-PARSER-01 P0-RETRY | 2.65.77 | `e88d689f` | CLOSED | YES |
| COST-BID-GAP-01 / GAP-A | 2.65.77 | `a061bbd` | CLOSED | YES |
| COST-MULTI (seria) | 2.65.74–76 | — | SERIES CLOSED | YES |
| AI-COST-01 | — | — | EPIC COMPLETE · FROZEN | FIELD READY |
| TRE-02 / TRE-01 | 2.65.64 / 63 | — | CLOSED | YES |
| UI Foundation · Dashboard Body · GDS | — | — | COMPLETE | — |
| Payroll Hours-wipe | 2.65.43 | `ea1b0a6` | CLOSED | — |

\*Scope/Confidence: residual CI TEUX6/jobs-mobile **UNRELATED/Open** (Owner accepted przy CLOSE).

**AI-DOC-DETECTION (skrót):** Doc.D1 Przedmiar · Doc.D2 Dokumenty wspierające · Doc.D3 Kosztorys ofertowy · aliasy BOQ / Bill of Quantities / ślepy · UX brak przedmiaru / OCR / brak odczytu / brak kosztorysu ofertowego · [`CLOSE`](../architecture/AI-DOC-DETECTION-CLOSE-01.md).

---

## Active Work

| Warstwa | Stan |
|---------|------|
| **Production** | Tip = **EXPERT-AI-P0-DUAL-ENABLEMENT CLOSED** · **2.66.22** / **`1902daa7`** · **PRODUCTION VERIFIED** · baseline Experts+Chief+Adapters+Session+UI Dossier+Validation+Decision Workspace+Expert Workspace UI+Decision Persist+Module Enablement+Dual Outcome+Align Pricing+Hub UX+Tab Decyzja→DW+Persist bridge+TRE Hub-first+S8 HOLD+S9 CLOSE+Enablement+Q12+P0 Dual-Enablement · M=ACCESS · D=RUNTIME · Bid PRIMARY @ D OFF · Offer/NO PRIMARY @ D ON · Hub-first · Persist-first · staff Przetargi module gate · **UTRZYMANIE** · **WAITING FOR NEXT OWNER GO** |
| **ACTIVE EPIC / IMPLEMENT / RELEASE / COMMIT** | **NONE** |
| **NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01** | **EPIC CLOSED** · Phase B0 · [`CLOSEOUT`](../architecture/NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01-CLOSEOUT.md) |
| **NG-TENDERS-COST-KNOWLEDGE-01** | **EPIC CLOSED** · A0+A1 · [`CLOSEOUT`](../architecture/NG-TENDERS-COST-KNOWLEDGE-01-CLOSEOUT.md) |
| **NG-TENDERS-WORKSPACE-01** | **EPIC CLOSED** · Workspace Architecture v2 · [`CLOSEOUT`](../architecture/NG-TENDERS-WORKSPACE-01-CLOSEOUT.md) |
| **WM-ODBIORY-RYSUNKI-FINAL-UNDO-01** | **EPIC CLOSED** · Final undo · [`CLOSEOUT`](../architecture/WM-ODBIORY-RYSUNKI-FINAL-UNDO-01-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-02** | **EPIC CLOSED** · Publication Workflow · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01** | **P0 CLOSED** · **P2a CLOSED** · tip hist. · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **EPIC CLOSED** · **P0 CLOSED** · **P1 CLOSED** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-DRUK-OST** | **01 + MIGRATION + AUTO-GENERATE S2 + APPEARANCE CLOSED** · AcroForm PASS · **OST-03 DO NOT IMPLEMENT** |
| **WORKER-INSPECTOR-MOBILE-01** | **WIM-P0+P1a CLOSED** · **WIM-P1b WAITING** — tylko Owner GO → AUDIT |
| **WM-RYSUNKI-MOBILE-01** | **MOBILE-P0+P1 CLOSED** · **MOBILE-P2 WAITING** |
| **WM-RYSUNKI-01** | **CORE COMPLETE** · **P4 BACKLOG** |
| **Pierwszy krok po Owner GO** | zawsze **AUDIT** → PLAN → DF → AR → GO → IMPLEMENT |

Kandydaci: [`NEXT-EPIC-CANDIDATES.md`](../architecture/NEXT-EPIC-CANDIDATES.md).

---

## WIP (local only)

> **Nie** jest tipem produkcji. **Nie** commit/push bez jawnego Owner GO.

| Item | Stan | Uwagi |
|------|------|-------|
| **`src/app/hooks/useTenderOfferRun.ts`** | **LOCAL WIP / M** | **NIE** część S8 tip · **nie** stage bez osobnego Owner GO · tip `9231cc6b` go **nie** zawiera |
| **Bid Time-Load Guard MVP** | WIP lokalny · OV **PASS – READY FOR GO COMMIT** | Flaga `kw-bid-time-load-guard` default OFF · **nie** tip prod (tip = **2.66.22** / **`9231cc6b`** TM-01 S8 HOLD) |
| Inne WT (storage, theme, supabase, `.tmp-*`) | szum / obce WIP | **nie** `git add -A` · **nie** mieszać z docs sync |

---

## Feature Flags

| Flaga LS | Default | Status feature | Prod / local |
|----------|---------|----------------|--------------|
| `kw-wm-rysunki-01` | **OFF** (LS fallback) | P0+P1+P1B+P2+P3+P3A+P3B+P3B.1 **CLOSED** · CORE COMPLETE · SSOT = `AppSettings.wmRysunkiEnabled` default OFF | **prod** (OFF) |
| `wmWorkerSketchEnabled` (AppSettings) | **OFF** | **WM-WORKER-SKETCH-01 CLOSED** + **DOKUMENTACJA-SZKICE-01/-02 CLOSED** · Worker/Admin/Inspector Szkice + Dashboard + Publication | **prod** (OFF) |
| `kw-market-sync-01-p3` | **OFF** | P3-A **CLOSED** · shipped mock | **prod** (OFF) · Legal Gate **OPEN** |
| `kw-market-sync-01-p2` | **OFF** | FULLY CLOSED · shipped | **prod** (OFF) |
| `kw-ai-cost-02-i3-competitiveness` | **OFF** | FULLY CLOSED · shipped | **prod** (OFF) · UI ⇒ 02-B ON |
| `kw-smart-pricing-01-p2` | **OFF** | CLOSED · shipped | **prod** (OFF) · P2⇒P1 |
| `kw-smart-pricing-01-p1` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-confidence-mvp` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-scope-gap-mvp` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-chief-orchestrator-session` | **OFF** | WIRE-CHIEF-SESSION-01 CLOSED · shipped | **prod** (OFF) |
| `kw-decision-workspace` | **OFF** | DECISION-WORKSPACE-01 CLOSED · shipped · REUSE gate DECISION-PERSIST-01 | **prod** (OFF) |
| `kw-decision-persist-v1` | (store) | DECISION-PERSIST-01 CLOSED · append-only LS | **prod** (local-first) |
| `kw-bid-time-load-guard` | **OFF** | WIP · nie tip | **local only** |
| `kw-ai-cost-02-b-explain-queue` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-wc-p33-market-pricing-ux` | **OFF** | CLOSED · shipped | **prod** (OFF) |
| `kw-ceny-materialow-01` | **OFF** | CLOSED · shipped | **prod** (OFF) |

Włączenie: `localStorage` = `'1'`. Tip parity gdy OFF.

---

## Residual Issues

| ID / temat | Status |
|------------|--------|
| **OST PDF fill round-trip** | **KNOWN LIMIT** — LiveCycle/XFA/Encrypt · pdf-lib unsupported · fix = **ACROFORM-01** (nowy PDF) · **nie** OST-03 |
| **CI TEST-INFRA TEUX7E** (NG-TENDERS residual) | **Open** — Gate B `LIB-TENDER-STRATEGY-TEUX7E` · **NOT PART OF** TECHNOLOGY-FIRST B0 · pre-existed |
| **CI Mobile Smoke / Legacy Happy Path** (Jobs · Dokumentacja) | **Open** — **NOT PART OF** TECHNOLOGY-FIRST B0 · pre-existed |
| **GHA check-runs na tip B0** | **KNOWN RESIDUAL** — 0 runs · Vercel success · **NOT PART OF THIS EPIC** |
| CI E2E / TEST-INFRA / Mobile (residual Doc Detection) | **Open** — nie diagnozowano w Doc Detection CLOSE |
| TEUX6 / jobs-mobile (AI v2 Confidence/Scope) | **UNRELATED / Open** (Owner accepted) |
| FND-06 Observability | **BLOCKED** — brak Implementation Spec |
| NG-05 | **BLOCKED** (legal) |
| Persist race COST-MULTI | MONITOR (closeout) |
| MS P3 Legal Gate | **OPEN** — blocks P3-B live · P3-A mock shipped |

---

## Known Decisions

1. Tip wersji **tylko** w `09` (+ live `version.json`) — nie hardcoduj w rules / Continuity.  
2. Thin Slice: jeden concern · allowlist · DF · izolowany commit · PV · CLOSE.  
3. `dossier.kosztorys` = pole techniczne — **bez rename** (Doc Detection).  
4. Bid Proposal = jedyny generator oferty (AI-COST FROZEN).  
5. Catalog pipeline mapowania **FROZEN** · Fuzzy **OFF** · DATA FIRST.  
6. Commit/push **tylko** na polecenie Ownera · **nie** `git add -A`.  
7. Stabilization Window: **nie** auto-start EPIC.  
8. Stan po fali CLOSE: **WAITING FOR NEXT OWNER GO**.  
9. MS P3-B: Owner GO → AUDIT → DF → … · Legal PASS wymagany dla live.  
10. **OST:** nie patchować LiveCycle/XFA przez pdf-lib · **ACROFORM-01** = nowy formularz · **OST-03 DO NOT IMPLEMENT**.

---

## Current Constraints

- **NO** IMPLEMENT bez Entry + Gate G1–G9 (+ Owner GO gdy FEATURE/CORE).  
- **NO** mieszanie FEATURE + CORE w jednym release.  
- **NO** `vercel deploy` / force-push `main`.  
- **NO** podłączania app do `wgdom-foundation` bez osobnego EPIC.  
- **NO** przebudowy AI-COST-01 / merge payroll bez nowego DF + GO.  
- **NO** WM-DRUK-OST-03 / XFA parser / obejść pdf-lib.  
- Working tree często brudny — stage **jawny** allowlist.

---

## Owner GO · procedura AUDIT → CLOSEOUT

```text
1. Owner GO (jawny) — bez GO = ZERO IMPLEMENT
2. AUDIT (read-only) → PLAN → DESIGN FREEZE
3. Owner GO IMPLEMENT (allowlist)
4. IMPLEMENT → OWNER VERIFY
5. Owner GO COMMIT → PUSH (nie git add -A)
6. PRODUCTION VERIFY (version.json FAST)
7. POST RELEASE / CLOSEOUT + SSOT tip sync
```

**Stabilization:** nie auto-start EPIC. Thin Slice · jeden concern · izolowany commit.

---

## Next Recommended Task

**WAITING FOR NEXT OWNER GO** — ACTIVE EPIC = **NONE** · brak auto-NEXT.

**Rekomendacja #1:** **UTRZYMANIE** — residual **C1–C6** / new epic — **tylko Owner GO** → **AUDIT** ([`TM-01 MASTER`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · [`S9 CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md) · [`COLD-START`](WGDOM-COLD-START-HANDOFF.md)). **NIE** invent S10.

Inne (wymagają **Owner GO** → **AUDIT**): C1 micro symbols · C2–C6 REMOVE/MIGRATE · S3-D · Bid retirement · hard REMOVE after L8 · Cloud Decision Persist / Audit Hub · Wire Pack→CI/UI · WIM-P1b · MOBILE-P2 · P4 Rysunki · MS P3-B · SMART P3 · CM-04 P3 · Wave 2 · GAP-B / TP200B · Bid Time-Load Guard izolowany COMMIT · `useTenderOfferRun` WIP · S2 DetailPage raw Session call (pre-existing 44/45).


**Zakaz:** auto-start **OST-03** · XFA · cache filled · WIM-P1b · MOBILE-P2 · invent S10 · Expert AI enablement bez GO · global ON `tendersTabForStaffEnabled`.

---

## Ready-To-Start Checklist

```text
[ ] WGDOM-COLD-START-HANDOFF
[ ] Przeczytaj TEN plik (MASTER-AI-HANDOFF)
[ ] Sprawdź tip: 09_PRODUCTION_BASELINE + curl version.json  (= 2.66.22 / 1902daa* gdy CDN OK; closeout tip supersedes)
[ ] TM-01-MASTER + S9-CLOSEOUT (EPIC CLOSED · residual C1–C6 tylko Owner GO)
[ ] AI_ENTRY → proces
[ ] PAYROLL_SAFETY_GATE G1–G9 (przed IMPLEMENT)
[ ] Owner GO gdy wymagane
[ ] Nie czytaj historii czatu / nie zgaduj tipu
[ ] Nie startuj IMPLEMENT z samego CURRENT-TASK
```

---

## AI Startup Instructions

```text
0. docs/AI/WGDOM-COLD-START-HANDOFF.md  ← cold-start praktyczny
1. docs/AI/MASTER-AI-HANDOFF.md     ← JESTEŚ TUTAJ (stan świata)
2. docs/AI/09_PRODUCTION_BASELINE.md + https://www.wgdom.fun/version.json
3. docs/architecture/TENDER-MODERNIZATION-01-MASTER.md + DESIGN-FREEZE
4. docs/AI/AI_ENTRY.md              ← proces AUDIT→…→CLOSE
5. docs/AI/PAYROLL_SAFETY_GATE.md   ← przed kodem
6. Tematycznie:
   · Doc Detection → AI-DOC-DETECTION-CLOSE-01
   · AI v2         → AI-V2-P0-BASELINE-UPDATE-01
   · Catalog       → CATALOG-COVERAGE-01-EPIC-CLOSEOUT
   · Worker/Inspector mobile → WORKER-INSPECTOR-MOBILE-01-WIM-P1a-CLOSEOUT (tip) + WIM-P0-CLOSEOUT
   · Dokumentacja Szkice → WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT (tip) + P2a/P0 CLOSEOUT (hist.)
   · Worker Sketch → WM-WORKER-SKETCH-01-EPIC-CLOSEOUT (P0+P1 CLOSED · tip hist. 2.66.13)
   · WM Rysunki   → WM-RYSUNKI-MOBILE-01-P0-CLOSEOUT (MOBILE-P0 CLOSED) + WM-RYSUNKI-01-P3B1-… (desktop CORE · P4 backlog)
   · Bid Guard WIP → AI-V2-P0.1-* (tylko local)
   · MS P3        → MARKET-SYNC-01-P3-AUDIT / DF / OV (P3-A CLOSED)
   · NEXT backlog  → NEXT-EPIC-CANDIDATES · TM-01-MASTER · EXPERT-AI-ARCHITECTURE
7. AGENTS.md / ARCHITECTURE.md / PROJECT-GUIDE.md — po Entry, nie zamiast
8. IMPLEMENT tylko po Gate PASS + Owner GO
9. Commit/push tylko na jawne polecenie Ownera
```

**DEPRECATED entry (nie startuj):** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

**Skrót 1-stronicowy:** [`AI_QUICK_START.md`](AI_QUICK_START.md) · cold-start [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md).

---

## AI v2 — stan (skrót)

| Slice | Stan |
|-------|------|
| Confidence | **FULLY CLOSED** · prod · flaga OFF |
| Scope Gap | **FULLY CLOSED** · prod · flaga OFF |
| Document Detection | **FULLY CLOSED** · UI 2.65.95 · feature `023ac686` |
| Bid Time-Load Guard | **WIP local** · OV PASS · nie tip |
| SMART | P0–P2 **CLOSED** · **P3 backlog** |
| GLOBAL-UX-02 | **FULLY CLOSED** · feature **`3385d9f`** · S9 DEFERRED |
| MS (Market Sync) | P0–P2 **FULLY CLOSED** (P2 tip **`18830c1`**) · **P3-A CLOSED** (`7325c773`) · P3 EPIC **WAITING** (P3-B · Legal OPEN) |
| **WM-DOKUMENTACJA-SZKICE-02** | **EPIC CLOSED** · tip **`377e279f`** / **2.66.16** · [`PUBLICATION-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-02-PUBLICATION-CLOSEOUT.md) |
| **WM-DOKUMENTACJA-SZKICE-01** | **P0+P2a CLOSED** · tip hist. **`e9598c99`** / **2.66.15** · [`P2a-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P2a-CLOSEOUT.md) · [`P0-CLOSEOUT`](../architecture/WM-DOKUMENTACJA-SZKICE-01-P0-CLOSEOUT.md) |
| **WM-WORKER-SKETCH-01** | **EPIC CLOSED** · tip hist. **`4f99a279`** / **2.66.13** · P0 **`3c9d6f90`** / **2.66.12** · [`EPIC-CLOSEOUT`](../architecture/WM-WORKER-SKETCH-01-EPIC-CLOSEOUT.md) |
| **WM-RYSUNKI-MOBILE-01** | **MOBILE-P0+P1 CLOSED** · tip historyczny **`59f09c1c`** / **2.66.05** · **MOBILE-P2 WAITING** |
| **WORKER-INSPECTOR-MOBILE-01** | **WIM-P0+P1a CLOSED** · tip historyczny **`3df0d24a`** / **2.66.07** · **WIM-P1b WAITING** |
| **WM-RYSUNKI-01** | **P0+P1+P1B+P2+P3+P3A+P3B+P3B.1 CLOSED** · **EPIC CORE COMPLETE** · tip historyczny **`77f18b78`** / **2.66.03** · continuous UX fix · Ghost · UX polish · ZIP Rysunki · AppSettings OFF · **P4 BACKLOG** |
| AI-COST-02 | 02-A · 02-B · **I3 FULLY CLOSED** · dalsze backlog |
| CM (Ceny materiałów) | 01 + 04 P1/P2 **CLOSED** · **P3 AUDIT backlog** |
