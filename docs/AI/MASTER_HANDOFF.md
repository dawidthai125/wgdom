# WGDOM — MASTER HANDOFF

> **STATUS:** **ACTIVE** · **thin pointer**  
> **★★ Cold-start:** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ SSOT cold-start:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)  
> **Tip numeryczny:** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Data sync:** 2026-08-08 · tip prod **2.66.22** / **`85f4db14`** · [`PROJECT-DOCS-SYNC-DESIGN-FREEZE`](../architecture/PROJECT-DOCS-SYNC-DESIGN-FREEZE.md)

```text
NOWA SESJA → docs/AI/WGDOM-COLD-START-HANDOFF.md
          → docs/AI/MASTER-AI-HANDOFF.md
Nie czytaj historii czatu. Nie zgaduj tipu.
Tip prod = 2.66.22 / 85f4db14 (weryfikuj w 09 + version.json)
Feature tip TENDER-MODERNIZATION-01 / S4 = 85f4db14
Prior TM-01 S3 Align Pricing = ec8a5044 (historyczny tip)
Prior TM-01 S2 Dual Outcome = 1888d05f (historyczny tip)
Prior TENDER-MODULE-ENABLEMENT-01 (S1) = eed3ba0e (historyczny tip)
Prior TENDER-MODERNIZATION-01 / S0 = 5beb082a (historyczny tip)
Prior DECISION-PERSIST-01 = adde246a (historyczny tip)
Prior WIRE-EXPERTS-UI-01 = 4ae26fe7 (historyczny tip)
Prior DECISION-WORKSPACE-01 = baa4b403 (historyczny tip)
Prior VALIDATION-EXPERT-01 = 5fa2746d
Prior WIRE-CHIEF-UI-DOSSIER-01 = ce0b70c0
Prior WIRE-CHIEF-SESSION-01 = 5b9fd741
Prior WIRE-CHIEF-RO-ADAPTERS-01 = 0c310355
Prior CHIEF-ORCHESTRATOR-P0 = 06cc7a6b
Prior EXPERTS-P0 = 58872663
Baseline = Experts P0 + Chief + Wire Adapters RO + Session + UI Dossier + Validation Expert + Decision Workspace + Expert Workspace UI + Decision Persist + Module Enablement + Dual Outcome (S2) + Align Pricing (S3) + Hub UX (S4) complete
S0 = CLOSED · S1 = CLOSED · S2 = CLOSED · S3 = CLOSED · S4 = CLOSED
WAITING FOR NEXT OWNER GO
NEXT = TENDER-MODERNIZATION-01 / S5 · tylko Owner GO → AUDIT
TM-01 MASTER = docs/architecture/TENDER-MODERNIZATION-01-MASTER.md
DO NOT: WM-DRUK-OST-03 / XFA / cache filled PDF / global ON tendersTabForStaffEnabled / S3-D / S8 Bid retirement
WIP: src/app/hooks/useTenderOfferRun.ts = LOCAL M · nie S4
```

---

## Gdzie zaczynać

```text
0. docs/AI/WGDOM-COLD-START-HANDOFF.md  ← ★★ cold-start
1. docs/AI/MASTER-AI-HANDOFF.md         ← ★★ główny SSOT
2. docs/AI/AI_QUICK_START.md
3. docs/AI/AI_ENTRY.md
4. docs/AI/09_PRODUCTION_BASELINE.md
5. docs/architecture/TENDER-MODERNIZATION-01-MASTER.md
6. docs/AI/PAYROLL_SAFETY_GATE.md
```

**DEPRECATED:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

**Zakaz:** IMPLEMENT na podstawie samego `CURRENT-TASK.md`.

---

## Snapshot (nie dubluj szczegółów)

| Pole | Wartość |
|------|---------|
| **Prod tip** | **2.66.22** / **`85f4db14`** — SSOT [`09`](09_PRODUCTION_BASELINE.md) · **PRODUCTION VERIFIED** |
| **Feature tip** | **`85f4db14`** — TM-01 S4 Hub UX CLOSED · prior S3 **`ec8a5044`** · S2 Dual Outcome **`1888d05f`** · Module Enablement (S1) **`eed3ba0e`** · TM-01 S0 **`5beb082a`** · Decision Persist **`adde246a`** · Expert Workspace UI **`4ae26fe7`** · Decision Workspace **`baa4b403`** · Validation **`5fa2746d`** · UI Dossier **`ce0b70c0`** · Session **`5b9fd741`** · Adapters **`0c310355`** · Chief **`06cc7a6b`** · EXPERTS-P0 **`58872663`** |
| **Ostatni CLOSE** | **TM-01 S3 CLOSED** · Offer primary @ Expert ON · NO PRIMARY @ Offer null · Bid legacy @ Expert OFF · baseline Experts+Chief+Adapters+Session+UI Dossier+Validation+Decision Workspace+Expert Workspace UI+Decision Persist+Module Enablement+Dual Outcome+Align Pricing complete |
| **Tryb** | **UTRZYMANIE** · STABILIZATION **ACTIVE** · **WAITING FOR NEXT OWNER GO** |
| **Active slice** | brak — ACTIVE EPIC = **NONE** |
| **NEXT** | **TENDER-MODERNIZATION-01 / S5** — tylko Owner GO → AUDIT · [`TM-01 MASTER`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · [`TM-01 DF`](../architecture/TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) · [`NEXT-EPIC-CANDIDATES`](../architecture/NEXT-EPIC-CANDIDATES.md) |

Pełny stan: **tylko** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · cold-start [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md).

---

## Tematyczne SSOT (linki)

| Temat | Plik |
|-------|------|
| Cold-start | [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md) |
| Tip produkcji | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| TM-01 MASTER S0–S8 | [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) |
| Expert AI architecture | [`../architecture/EXPERT-AI-ARCHITECTURE.md`](../architecture/EXPERT-AI-ARCHITECTURE.md) |
| Pricing SSOT | [`../architecture/TENDER-PRICING-SSOT.md`](../architecture/TENDER-PRICING-SSOT.md) |
| Decision architecture | [`../architecture/DECISION-ARCHITECTURE.md`](../architecture/DECISION-ARCHITECTURE.md) |
| Legacy / deprecation | [`../architecture/TENDER-LEGACY-DEPRECATION-MAP.md`](../architecture/TENDER-LEGACY-DEPRECATION-MAP.md) |
| TM-01 S3 Align Pricing | [`../architecture/TENDER-MODERNIZATION-01-S3-CLOSEOUT.md`](../architecture/TENDER-MODERNIZATION-01-S3-CLOSEOUT.md) |
| TM-01 S2 Dual Outcome | [`../architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md`](../architecture/TENDER-MODERNIZATION-01-S2-CLOSEOUT.md) |
| Module Enablement (S1) | [`../architecture/TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md`](../architecture/TENDER-MODULE-ENABLEMENT-01-CLOSEOUT.md) |
| TM-01 S0 | [`../architecture/TENDER-MODERNIZATION-01-S0-CLOSEOUT.md`](../architecture/TENDER-MODERNIZATION-01-S0-CLOSEOUT.md) |
| Decision Persist | [`../architecture/DECISION-PERSIST-01-CLOSEOUT.md`](../architecture/DECISION-PERSIST-01-CLOSEOUT.md) |
| Continuity | [`../AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md) |
| Handoff current | [`../PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) |
| CURRENT-TASK | [`../../CURRENT-TASK.md`](../../CURRENT-TASK.md) |
| Workflow Przetargi | [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) |
| Stabilization | [`../STABILIZATION-WINDOW-PLAN.md`](../STABILIZATION-WINDOW-PLAN.md) |
| Architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |

**Nie** kopiuj tipu poza [`09`](09_PRODUCTION_BASELINE.md).
