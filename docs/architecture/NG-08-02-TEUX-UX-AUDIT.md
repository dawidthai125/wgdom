# NG-08-02 — Tender Workspace Progress · UX AUDIT

> **Status:** **AUDIT (CODE) ACCEPTED** · **PLAN APPROVED** · **DESIGN FREEZE v1.0** · **IMPLEMENT BLOCKED**  
> **Data audytu:** 2026-07-08  
> **Bundle ID:** **NG-08-02** (slice 2/5 parent **NG-08**)  
> **Class:** **FEATURE UI** · **WF-01** presentation only  
> **Baseline prod:** UI **2.63.73** · commit **`84b1491`** · **PRODUCTION VERIFIED**  
> **Poprzedni slice:** **NG-08-01 CLOSED** (`84b1491`)  
> **Parent:** [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) · [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md) § NG-08-02  
> **Out of scope:** Intelligence hub · Documents redesign · Cost cohesion · Pipeline · Sync · Payroll · Parser · Edge

```text
CEL:     Jedna widoczna hierarchia postępu workflow na wszystkich tabach workspace —
         „jesteś tutaj”, ukończone / zablokowane kroki, ciągłość między tabami.

ZASADA:  Reuse istniejącego workflow state (strip, V2 progress, blockers, trust).
         Zero nowego SSOT / KV / algorytmów.

WORKFLOW: AUDIT (CODE) ✅ ACCEPTED
         → PLAN ✅ (NG-08-02-TEUX-PLAN.md)
         → DESIGN FREEZE ✅ (NG-08-02-TEUX-DESIGN-FREEZE.md)
         → ARCH REVIEW ⏸ PENDING
         → OWNER GO ⛔ BLOCKED
         → IMPLEMENT ⛔ BLOCKED
```

---

## 0. Werdykt audytu

| Pole | Wartość |
|------|---------|
| **AUDIT (CODE)** | **ACCEPTED** |
| **AUDIT (VISUAL)** | **PENDING** — owner SS-P2-01…06 (§5) |
| **Priorytety** | **3× P0** · **6× P1** · **4× P2** |
| **NG-08-01 regresja** | CTA na wszystkich tabach **PASS**; Process Strip nadal **tylko Przetarg** — **GAP P0** |
| **IMPLEMENT** | **BLOCKED** |

### 0.1 P0 North Star (slice)

> Użytkownik na **każdym** tabie widzi **ten sam** workflow i wie **gdzie jest** — bez powrotu na Przetarg.

---

## 1. Zakres audytu

### 1.1 Focus areas

| ID | Focus | SSOT (read-only) |
|----|-------|------------------|
| **F-01** | Workflow visibility | `TenderWorkflowProcessStrip`, `TenderStatusRibbon` |
| **F-02** | Current step („you are here”) | `workflowProcessStripStageToV4Navigate` (inverse map UI-only) |
| **F-03** | Completed steps | `buildWorkflowProcessStripStages`, `computeWorkspaceV2AutoProgress` |
| **F-04** | Blocked steps | `intelligenceCtx.overlay.allBlocks`, `WorkflowHubBlockersSection` |
| **F-05** | Continuity across tabs | `TenderDetailPage` command slot, `activeTab`, `decyzjaWorkspace` |
| **F-06** | Secondary progress surfaces | `TenderAnalysisStatusStrip`, `KosztorysProcessStatusBar`, `TenderWorkspaceV2Panel` |

### 1.2 Out of scope (frozen)

| Obszar | Powód |
|--------|--------|
| `deriveKosztorysProcessPhase` / E0–E12 logika | DESIGN FREEZE § NG-08-02 |
| `buildTenderIntelligenceContext()` semantyka | NG-08-03 |
| Pipeline bootstrap / parser | #CORE-013 |
| Nowe pola tender / KV | Zero new SSOT |
| Pełny redesign dokumentów / kosztów | NG-08-04 / NG-08-05 |

---

## 2. Mapa postępu (as-is po NG-08-01)

```text
TenderDetailPage — activeTab ∈ {przetarg, dokumenty, kosztorys, ceny, decyzja}
│
├── Command Layer (wszystkie taby)
│     ├── Tab bar + breadcrumb (NG-08-01) ✅
│     ├── KPI compact (tab ≠ przetarg) ✅
│     └── workspaceCommandSlot
│           ├── activeTab === przetarg ONLY:
│           │     └── TenderStatusRibbon
│           │           ├── Trust collapsible (desktop)
│           │           └── TenderWorkflowProcessStrip variant=ribbon  ← STRIP SSOT
│           └── TenderWorkflowPrimaryAction (wszystkie taby) ✅ NG-08-01
│
├── tab=przetarg → TenderPrzetargWorkspace → TenderWorkflowHubPanel
│     └── <details> Szczegóły postępu (open iff blockersCount > 0)
│           ├── TenderAnalysisStatusStrip (commandLayerActive)
│           ├── TenderWorkspaceV2Panel hubDensity
│           ├── WorkflowHubBlockersSection
│           └── TenderWorkspaceV2ChecklistCompact
│
├── tab=kosztorys → TenderKosztorysWorkspace
│     └── KosztorysProcessStatusBar (osobna narracja E0–E12)
│
└── tab ∈ {dokumenty, ceny, decyzja} → embed panels
      └── brak dedykowanego progress chrome
```

**Kluczowy wniosek:** Process Strip = **jedyny** kanoniczny 5-etapowy workflow UI, ale **widoczny tylko na tab Przetarg** w Command Layer.

---

## 3. Findings

### 3.1 Workflow visibility (F-01)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-01 | Process Strip w Command Layer **tylko** gdy `activeTab === "przetarg"` (`TenderStatusRibbon` warunkowo). Tab Dokumenty/Kosztorys/Ceny/Decyzja: **brak** strip w chrome. | **P0** | `TenderDetailPage.tsx` L176–184 |
| PRG2-02 | Legacy hub (`commandLayerActive=false`) nadal renderuje pełny strip w treści — **nie dotyczy prod V4**. | — | `TenderWorkflowHubPanel.tsx` L69–88 |
| PRG2-03 | Kosztorys ma **osobny** `KosztorysProcessStatusBar` — druga narracja postępu na tab kosztorys. | P1 | `TenderKosztorysWorkspace.tsx` |
| PRG2-04 | AC-02-01 (DESIGN FREEZE): strip widoczny lub 1 klik — na 4/5 tabów obecnie **>1 klik** (zmiana tabu na Przetarg). | **P0** | macierz §4 |

### 3.2 Current step — „you are here” (F-02)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-05 | Strip stage buttons stylują **done/partial/missing** + trust overlay — **brak** highlight etapu = aktywny tab V4. | **P0** | `buildProcessStripStagePresentation` — brak `activeStageId` |
| PRG2-06 | Mapowanie tab → stage istnieje tylko **navigation outbound** (`workflowProcessStripStageToV4Navigate`), nie **inbound** dla UI. | P1 | `tender-workflow-process-strip.ts` L79–96 |
| PRG2-07 | Decyzja `?ws=qualification|offer` — strip „Oferta” nie synchronizuje wizualnie z sub-tabem (tylko nawigacja po klik). | P1 | brak `decyzjaWorkspace` w strip props |
| PRG2-08 | Tab `przetarg` nie ma odpowiadającego stage w strip (5 etapów zaczyna od Dokumenty) — „hub” nie jest oznaczony jako „jesteś tutaj”. | P2 | `WORKFLOW_PROCESS_STRIP_ORDER` |

**Propozycja audytu (UI-only, bez SSOT):** `resolveActiveProcessStripStageId(activeTab, decyzjaWorkspace)` w `tender-command-layer-ux.ts` lub `tender-workflow-process-strip.ts` (prezentacja).

### 3.3 Completed / partial steps (F-03)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-09 | **PASS** — `buildWorkflowProcessStripStages` reuse `computeWorkspaceV2AutoProgress` + `prepStatus` + analysis rows. | — | `tender-workflow-process-strip.ts` |
| PRG2-10 | V2 pillar row (`TenderWorkspaceV2Panel`) pokazuje done/partial/missing — **ukryte** w accordion domyślnie zamkniętym gdy `blockersCount === 0`. | P1 | `TenderWorkflowHubPanel` L64–65, L107–111 |
| PRG2-11 | `computeWorkspaceV2AutoProgress().percent` używane w CTA — **PASS** jako skrót postępu (NG-08-01). | — | `TenderWorkflowPrimaryAction` |

### 3.4 Blocked steps (F-04)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-12 | `WorkflowHubBlockersSection` — lista `intelligenceCtx.overlay.allBlocks` — **tylko** w accordion „Szczegóły postępu”. | P1 | `TenderWorkflowHubPanel.tsx` L139 |
| PRG2-13 | Gdy `blockersCount > 0` accordion `open` — **PASS** AC-02-03 częściowo; gdy blockers = 0, blockers i V2 **niewidoczne** bez expand. | P1 | `progressDefaultOpen` |
| PRG2-14 | Trust overlay na strip stage (blocked/trust) — **PASS** prezentacja; niewidoczne poza Przetargiem. | P1 | `trustStageOverlayLevel` |

### 3.5 Continuity across tabs (F-05)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-15 | NG-08-01: CTA workflow na wszystkich tabach daje **ciągłość akcji** — **PASS**. | — | `workspaceCommandSlot` |
| PRG2-16 | NG-08-01: brak strip na innych tabach = **regresja continuity** względem celu „jeden workspace” (użytkownik traci mapę procesu). | **P0** | porównanie z P0 North Star NG-08 |
| PRG2-17 | Strip klik → nawigacja tab **PASS** (1 klik między etapami). | — | `ProcessStripStageButton` |
| PRG2-18 | `TenderAnalysisStatusStrip` tylko w accordion na Przetargu — duplikuje kroki strip (notice/documents/kosztorys/pricing). | P1 | `TenderWorkflowHubPanel` L119–128 |

### 3.6 Visual hierarchy — competing narratives (F-06)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG2-19 | **Trzy** powierzchnie postępu na Przetargu: Trust ribbon + Process Strip (chrome) + Analysis strip (accordion). | P1 | `TenderStatusRibbon`, hub accordion |
| PRG2-20 | AC-02-04: brak jawnej hierarchii primary (strip) vs secondary (analysis/trust). | P1 | DESIGN FREEZE AC-02-04 |
| PRG2-21 | `TenderAnalysisStatusStrip` — `text-[9px]` labels (legacy). | P2 | `TenderAnalysisStatusStrip.tsx` |
| PRG2-22 | Kosztorys E0–E12 bar vs strip stage „Kosztorys” — brak wizualnego mostu (copy/link). | P1 | ARCHITECTURE REVIEW §3.2 (historyczne) |

---

## 4. Macierz widoczności postępu (as-is)

| Tab V4 | Process Strip (chrome) | V2 pillars | Blockers | Analysis strip | Kosztorys phase bar |
|--------|------------------------|------------|----------|----------------|---------------------|
| **przetarg** | ✅ ribbon | accordion | accordion | accordion | — |
| **dokumenty** | ❌ | ❌ | ❌ | ❌ | — |
| **kosztorys** | ❌ | ❌ | ❌ | ❌ | ✅ content |
| **ceny** | ❌ | ❌ | ❌ | ❌ | — |
| **decyzja** | ❌ | ❌ | ❌ | ❌ | — |

**Kroki do strip z innego tabu (min. interakcje):** 1 (zmiana na Przetarg) — spełnia „1 klik” ale **nie** spełnia ciągłości workspace (użytkownik opuszcza kontekst tabu).

---

## 5. Visual audit gate (propozycja SS-P2)

| ID | Scenariusz | Viewport | Stan | Status |
|----|------------|----------|------|--------|
| SS-P2-01 | Przetarg — strip + CTA w Command Layer | 390px / 1280px | filled, mixed stages | ☐ owner |
| SS-P2-02 | Dokumenty — brak strip (baseline gap) | 1280px | docs complete | ☐ owner |
| SS-P2-03 | Kosztorys — phase bar vs brak strip | 390px | ATH parsed | ☐ owner |
| SS-P2-04 | Decyzja › Kwalifikacja — brak „you are here” | 390px | qualification ws | ☐ owner |
| SS-P2-05 | Blockers > 0 — accordion open vs closed | 1280px | blocked tender | ☐ owner |
| SS-P2-06 | Round-trip: Dokumenty → Kosztorys → Ceny — utrata mapy procesu | 390px | trace | ☐ owner |

**Gate:** PLAN / DESIGN FREEZE delta po **AUDIT VISUAL** (opcjonalnie owner sign-off na SS-P2).

---

## 6. Mapowanie AC (DESIGN FREEZE) → findings

| AC | Baseline | Finding IDs | Werdykt |
|----|----------|-------------|---------|
| **AC-02-01** Strip ≤1 klik z każdego tabu | FAIL (4/5 tabów) | PRG2-01, PRG2-04 | **FAIL** |
| **AC-02-02** Aktywny stage = aktywny tab | FAIL | PRG2-05, PRG2-07 | **FAIL** |
| **AC-02-03** V2/blockers nie w zamkniętym accordion gdy blockers | PARTIAL | PRG2-13 | **PARTIAL** |
| **AC-02-04** Jedna hierarchia trust vs analysis | FAIL | PRG2-19, PRG2-20 | **FAIL** |

---

## 7. Proposed PLAN — **SUPERSEDED**

**SSOT:** [`NG-08-02-TEUX-PLAN.md`](./NG-08-02-TEUX-PLAN.md) — **PLAN APPROVED**  
**Freeze:** [`NG-08-02-TEUX-DESIGN-FREEZE.md`](./NG-08-02-TEUX-DESIGN-FREEZE.md) — **v1.0**

Poniższy draft §7 zachowany historycznie; implementacja wyłącznie wg slice PLAN + FREEZE.

### NG-08-02 — jeden slice (parent PLAN zachowany)

| # | Zmiana (prezentacja) | Allowlist |
|---|----------------------|-----------|
| 1 | **Strip w Command Layer na wszystkich tabach** — compact `variant=ribbon` pod/b nad CTA; trust collapsible opcjonalnie tylko Przetarg | `TenderDetailPage.tsx`, `TenderDetailCommandLayer.tsx` |
| 2 | **`activeStageId` highlight** — props `activeTab` + `decyzjaWorkspace` → ring/label „Tu jesteś” | `TenderWorkflowProcessStrip.tsx`, `tender-command-layer-ux.ts` (helper) |
| 3 | **V2 compact progress** always-visible na Przetargu (pasek % lub pillary) poza accordion | `TenderWorkflowHubPanel.tsx`, `TenderWorkspaceV2Panel.tsx` |
| 4 | **Blockers chip** w chrome gdy `blockersCount > 0` (link do accordion) | `TenderWorkflowHubPanel.tsx`, hub sections |
| 5 | **Analysis strip** — secondary tylko w accordion; nie duplikować w chrome | `TenderWorkflowHubPanel.tsx` |
| 6 | **Kosztorys** — mini link „Proces oferty” / strip stage hint (bez merge phase engine) | `TenderKosztorysWorkspace.tsx` (minimal) |

**Nie w planie:** zmiana `buildWorkflowProcessStripStages` reguł · nowe KV · intelligence algorithms.

### Test gate (propozycja)

| Komenda | Cel |
|---------|-----|
| `npm run build` | build |
| `npm run test:infra -- --gate B --scope tenders` | regresja |
| `test-tender-workflow-process-strip.mjs` | strip SSOT |
| `test-tender-command-teux7b.mjs` | command layer |
| `test-p0-command-layer-height.mjs` | chrome budget |

---

## 8. Risk assessment

| Ryzyko | Klasa | Mitigacja |
|--------|-------|-----------|
| Mobile chrome overflow (strip + CTA + tab bar) | **P1** | ribbon compact już istnieje; SS-P2-01 |
| „You are here” false positive na tab przetarg | P2 | przetarg = brak stage highlight lub „Przegląd” |
| Duplikacja strip hub vs chrome | P1 | `commandLayerActive` — jeden mount |
| Kosztorys dual narrative | P1 | link only, nie scalanie phase bar |
| #CORE-013 mixed commit | **P0** | allowlist §7 |

---

## 9. Workflow status

```text
NG-08-01           ✅ CLOSED · 2.63.73 @ 84b1491
NG-08-02 AUDIT     ✅ CODE ACCEPTED
NG-08-02 PLAN      ✅ APPROVED
NG-08-02 FREEZE    ✅ v1.0 — PENDING ARCH REVIEW
ARCH REVIEW        ⏸ PENDING ← CURRENT
OWNER GO           ⛔ BLOCKED
IMPLEMENT          ⛔ BLOCKED
```

---

## 10. Następny krok

1. **ARCH REVIEW** — WF-02 + allowlist + `resolveActiveProcessStripStageId`  
2. **OWNER GO** — jawne „IMPLEMENT NG-08-02”  
3. **IMPLEMENT** — jeden commit · **2.63.74**

**Zero implementacji** do OWNER GO.

---

*SSOT audytu slice 02 · Parent: [`NG-08-TEUX-UX-AUDIT.md`](./NG-08-TEUX-UX-AUDIT.md) · Baseline: **2.63.73** @ **84b1491**.*
