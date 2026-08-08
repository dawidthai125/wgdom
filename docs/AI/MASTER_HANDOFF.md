# WGDOM — MASTER HANDOFF

> **STATUS:** **ACTIVE** · **thin pointer**  
> **★★ Cold-start:** [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md)  
> **★★ SSOT cold-start:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)  
> **Tip numeryczny:** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Data sync:** 2026-08-08 · tip prod **2.66.22** / docs **`df6c104a`** · feature **`617f0cb5`** · [`PROJECT-DOCS-SYNC-DESIGN-FREEZE`](../architecture/PROJECT-DOCS-SYNC-DESIGN-FREEZE.md)

```text
NOWA SESJA → docs/AI/WGDOM-COLD-START-HANDOFF.md
          → docs/AI/MASTER-AI-HANDOFF.md
Nie czytaj historii czatu. Nie zgaduj tipu.
Tip prod = 2.66.22 / df6c104a (weryfikuj w 09 + version.json; closeout tip supersedes)
Feature tip TENDER-MODERNIZATION-01 / S7 = 617f0cb5
Docs tip TENDER-MODERNIZATION-01 / S9 EPIC CLOSE = df6c104a
Prior docs tip TENDER-MODERNIZATION-01 / S8 HOLD = 9231cc6b
Prior TM-01 S6 Persist→legacy bridge = cb91027d
Prior TM-01 S4 Hub UX = 85f4db14 (historyczny tip)
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
Baseline = Experts P0 + Chief + Wire Adapters RO + Session + UI Dossier + Validation Expert + Decision Workspace + Expert Workspace UI + Decision Persist + Module Enablement + Dual Outcome (S2) + Align Pricing (S3) + Hub UX (S4) + Tab Decyzja→DW (S5) + S6 + S7 + S8 HOLD + S9 EPIC CLOSE complete
TM-01 = EPIC CLOSED · S0–S9 = CLOSED · S8 = HOLD · S9 = C0
WAITING FOR NEXT OWNER GO
NEXT = residual C1–C6 / new epic · tylko Owner GO → AUDIT · NIE invent S10
TM-01 MASTER = docs/architecture/TENDER-MODERNIZATION-01-MASTER.md
DO NOT: WM-DRUK-OST-03 / XFA / cache filled PDF / global ON tendersTabForStaffEnabled / S3-D / hard REMOVE / Bid retirement / invent S10
WIP: src/app/hooks/useTenderOfferRun.ts = LOCAL M · nie tip
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
| **Prod tip** | **2.66.22** / docs **`df6c104a`** · feature **`617f0cb5`** — SSOT [`09`](09_PRODUCTION_BASELINE.md) · **PRODUCTION VERIFIED** · **TM-01 EPIC CLOSED** |
| **Feature tip** | **`617f0cb5`** — TM-01 S7 TRE Hub-first CLOSED · S9 docs **`df6c104a`** · S8 HOLD **`9231cc6b`** · prior S6 **`cb91027d`** · S5 **`ebae3d2e`** · S4 **`85f4db14`** · S3 **`ec8a5044`** · S2 Dual Outcome **`1888d05f`** · Module Enablement (S1) **`eed3ba0e`** · TM-01 S0 **`5beb082a`** · Decision Persist **`adde246a`** · Expert Workspace UI **`4ae26fe7`** · Decision Workspace **`baa4b403`** · Validation **`5fa2746d`** · UI Dossier **`ce0b70c0`** · Session **`5b9fd741`** · Adapters **`0c310355`** · Chief **`06cc7a6b`** · EXPERTS-P0 **`58872663`** |
| **Ostatni CLOSE** | **TM-01 EPIC CLOSED (S9 C0)** · S8 HOLD · S7 Hub-first · baseline Experts+Chief+…+S9 complete |
| **Tryb** | **UTRZYMANIE** · STABILIZATION **ACTIVE** · **WAITING FOR NEXT OWNER GO** |
| **Active slice** | brak — ACTIVE EPIC = **NONE** |
| **NEXT** | residual **C1–C6** / new epic — tylko Owner GO → AUDIT · **NIE** invent S10 · [`TM-01 MASTER`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) · [`S9 CLOSEOUT`](../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md) · [`NEXT-EPIC-CANDIDATES`](../architecture/NEXT-EPIC-CANDIDATES.md) |

Pełny stan: **tylko** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md) · cold-start [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md).

---

## Tematyczne SSOT (linki)

| Temat | Plik |
|-------|------|
| Cold-start | [`WGDOM-COLD-START-HANDOFF.md`](WGDOM-COLD-START-HANDOFF.md) |
| Tip produkcji | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| TM-01 MASTER | [`../architecture/TENDER-MODERNIZATION-01-MASTER.md`](../architecture/TENDER-MODERNIZATION-01-MASTER.md) |
| S9 CLOSEOUT | [`../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md`](../architecture/TENDER-MODERNIZATION-01-S9-CLOSEOUT.md) |
