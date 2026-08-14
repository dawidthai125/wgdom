# IK-MIGRATION-01 — NG-10 DECOMMISSION MAP

> **ID:** `IK-MIGRATION-01-NG10-DECOMMISSION-MAP`  
> **STATUS:** P0 FROZEN · **ZERO DELETE NOW**  
> **Parent:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **Data:** 2026-08-15

Klasyfikacja:

| Klasa | Znaczenie |
|-------|-----------|
| **A REMOVE** | Usunąć w **P10** (po P9 PASS + Owner GO REMOVE) |
| **B REPLACE** | Semantyka przechodzi do IK/DW; plik NG-10 znika w P10 |
| **C KEEP TEMPORARILY** | Żyje P1–P9 gdy `ikEntryEnabled=false` |
| **D KEEP — unrelated** | Nie jest NG-10; nie kasować z decommission |

---

## 1. Mount (jedyny)

| Symbol | Path | Klasa | Uwaga |
|--------|------|-------|-------|
| `TenderAutonomousGate` wrap | `src/app/TenderDetailPage.tsx` ~661–797 | **C → B** | jedyny consumer Gate; P1: wrap warunkowy |

---

## 2. UI NG-10

| Symbol | Path | Klasa |
|--------|------|-------|
| `TenderAutonomousGate` | `src/app/tenders/autonomous/TenderAutonomousGate.tsx` | **C → A** |
| `TenderAutonomousRunScreen` | `.../TenderAutonomousRunScreen.tsx` | **C → A** |
| `TenderAutonomousOutcomeScreen` | `.../TenderAutonomousOutcomeScreen.tsx` | **C → B/A** |
| `TenderAutonomousRunFaq` | `.../TenderAutonomousRunFaq.tsx` | **C → A** |

Atrybuty QA: `data-tender-autonomous-run`, `-outcome`, `-gate-active`, `-timeline-*`, `-feed`, `-agent` — **C → A** (PV selektory do aktualizacji w P9/P10).

---

## 3. Libs projekcji

| Plik | Eksporty kluczowe | Klasa |
|------|-------------------|-------|
| `src/lib/tender-autonomous-run-phase.ts` | `deriveAutonomousRunPhase`, ACTIVITY_SPECS, `liveMessage` „Oceniam opłacalność.” | **C → A** |
| `src/lib/tender-autonomous-run-timeline.ts` | `AUTONOMOUS_TIMELINE_STEP_LABELS` (12 kroków) | **C → A** |
| `src/lib/tender-autonomous-run-ux.ts` | `AUTONOMOUS_AI_AGENT_LABELS`, phase order, LS prefix, timeout 150s | **C → A** |
| `src/lib/tender-autonomous-run-status.ts` | dynamic status copy | **C → A** |
| `src/lib/tender-autonomous-run-transition.ts` | hold / bridge / timeout UX | **C → A** |
| `src/lib/tender-autonomous-run-gate-exit.ts` | frozen HF-02 exit | **C → A** |
| `src/lib/tender-autonomous-run-fingerprint.ts` | `kw-tender-autonomous-run-v1:` | **C → A** |
| `src/lib/tender-autonomous-run-outcome.ts` | positives / watchouts z `intelligenceCtx` | **C → B** |

**B (outcome):** semantyka GO/HOLD/NO-GO i watchouts → REUSE `tender-intelligence-context` + Validation + Decision Workspace — **nie** nowy scoring. Plik NG-10 znika w P10.

Zakaz P1–P9: nowe featury / nowe agenty / nowe kroki timeline NG-10.

---

## 4. Testy

| Skrypt | Klasa |
|--------|-------|
| `scripts/test-tender-autonomous-run-timeline.mjs` | **C → A** (P10) |
| `scripts/test-tender-autonomous-run-status.mjs` | **C → A** |
| `scripts/test-tender-autonomous-run-transition-timeout.mjs` | **C → A** |
| `scripts/test-tender-autonomous-run-gate-exit.mjs` | **C → A** |
| `scripts/test-tender-autonomous-run-phase.mjs` | **C → A** |

Do P10: **KEEP w CI/infra** (Gate A: nie zepsuć default path). Po P10: usunąć z manifestu / archiwum.

---

## 5. Docs (nie kod)

NG-10 closeout / ARCHITECTURE § autonomous / NG11 odwołania do Gate — **C**; po P10 tombstone. Nie kasować historii.

---

## 6. D — NIE jest NG-10 (NIE USUWAĆ)

| Obszar | Path / symbol |
|--------|----------------|
| Pipeline / discovery | `useTenderPipelineRuntime`, NG-02 bootstrap, `tender-document-discovery` |
| Ingest / ZIP / 7z | `tender-ingest`, `wgdom-7z-archive` |
| Kosztorys UI | `TenderKosztorysWorkspace` |
| Hub / V4 tabs | `TenderWorkflowHubPanel`, `TenderWorkspaceTabBar` |
| OfferBoq / F5 / Bid | `tender-offer-boq*`, `tender-position-cost/*`, `useTenderPricingAuto` |
| MULTI-DWELLING / MULTI-BOQ | `src/lib/multi-dwelling/*`, `src/lib/multi-boq/*` |
| Chief / EC | `chief-orchestrator`, `expert-conversation/*` |
| TRE-01 | `useTenderOfferRun`, `isTre01SliceAEnabled` |
| Dual Outcome / D | `tender-expert-effective`, Decision Workspace |
| Intelligence overlay | `tender-intelligence-context` |
| IK W2 labor panel | `IkLaborGapResearchPanel` |
| PDF / ATH parse | `tender-bid-package-pdf`, `ath-parser` |

TM-01 audyty mówią „Autonomous theater KEEP” — **superseded** przez ten freeze jako **C aż P10**, nie jako docelowy IK.

---

## 7. Zależności Gate (regresja)

Usunięcie Gate w P10 **nie** może zepsuć children DetailPage. P1 uczy warunek: Gate = optional wrapper. Gate A P10 = te same children renderują się bez wrappera.

LS `kw-tender-autonomous-run-v1:{tenderId}`: po P10 orphan OK (ignorowany).

---

## 8. STOP

**NIE USUWAĆ TERAZ.** Mapa jest SSOT decommission. Zmiana klasy A/B/C wymaga Owner GO + update tego pliku.
