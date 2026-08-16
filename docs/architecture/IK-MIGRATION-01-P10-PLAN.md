# IK-MIGRATION-01 — P10 PLAN  
## NG-10 DECOMMISSION → IK FIRST-SCREEN

> **ID:** `IK-MIGRATION-01-P10-PLAN`  
> **Date:** 2026-08-16  
> **Mode:** **PLAN ONLY** · AUDIT → PLAN  
> **CODE = 0 · PATCH = 0 · COMMIT = 0 · PUSH = 0 · DEPLOY = 0**  
> **DESIGN FREEZE = NOT CREATED · OWNER GO = NOT ASSUMED**  
> **Authority:** [`IK-MIGRATION-01-FINAL-HANDOFF.md`](./IK-MIGRATION-01-FINAL-HANDOFF.md) > older docs  
> **Prior audit:** [`IK-MIGRATION-01-POST-P9-NG10-AUDIT.md`](./IK-MIGRATION-01-POST-P9-NG10-AUDIT.md)

```text
P10 = NOT STARTED · NOT APPROVED
P5.33 = DO NOT CREATE
NG-10 = DO NOT DELETE IN THIS SESSION
```

---

## 1. EXECUTIVE VERDICT

| Pole | Werdykt |
|------|---------|
| **Cel P10** | Usunąć NG-10 jako legacy first-screen; deterministyczny first-screen = **IK (`IkEntryHost`)** |
| **Wykonalność (architektura)** | **GO-CANDIDATE** — IK stack P0–P9 EXISTS+WIRED; IK libs **nie** importują NG-10 |
| **Blokady przed IMPLEMENT** | Owner GO wymagany · TRE-01 early-return sprzężony z `ng10_gate` · decyzja default `ikEntryEnabled` · rewrite Gate A tests · DF P10 **jeszcze nie istnieje** |
| **Nowe silniki** | **FORBIDDEN** — zero TRUE GAP na Documents/BOQ/Classification/Labor/Material/F5/Bid/Risk/Chief/DW |
| **IK ≠ D** | **POTWIERDZONE** — `ikEntryEnabled` ≠ `expertAiDecydentEnabled` |
| **Następny krok** | ChatGPT / Owner REVIEW tego PLANU → (opcjonalnie) Design Freeze P10 → Owner GO IMPLEMENT |

```text
P10 IMPLEMENTATION = NOT AUTHORIZED BY THIS DOCUMENT
```

---

## 2. CURRENT BASELINE

| Pole | Wartość | Evidence |
|------|---------|----------|
| UI | **2.66.86** | FINAL HANDOFF · tip `09` |
| Impl | **`80c7c26b`** | FINAL HANDOFF · P9 CLOSEOUT |
| Live (FINAL HANDOFF / tip) | **`80c7c26`** | FINAL HANDOFF §1 |
| Live one-shot (POST-P9 audit) | **`bc185cc`** @ 2.66.86 | prior audit — docs tip; feature ancestor `80c7c26b` |
| IK-MIGRATION-01 | **COMPLETE THROUGH P9** | FINAL HANDOFF |
| P0–P9 | **LOCKED** | FINAL HANDOFF |
| CatalogWork | **471** | FINAL HANDOFF · P5.26 |
| P5.33 | **DO NOT CREATE** | FINAL HANDOFF |
| P10 | **NOT STARTED** | FINAL HANDOFF |
| `ikEntryEnabled` default | **`false`** | `src/lib/app-settings.ts` L153 · comment L63–65 |
| First-screen OFF | `ng10_gate` | `resolveIkDetailFirstScreen` L339–343 `ik-entry-flag.ts` |

---

## 3. NG-10 RUNTIME MAP

### 3.1 First-screen selection (A)

| Step | Evidence |
|------|----------|
| Flag read | `TenderDetailPage.tsx` L235–236: `ikEntryOn = isIkEntryEnabled()` · `ikFirstScreen = resolveIkDetailFirstScreen(ikEntryOn)` |
| Resolver | `ik-entry-flag.ts` L339–343: `true → "ik_entry"` · else `"ng10_gate"` |
| IK path | L838–839: `if (ikFirstScreen === "ik_entry") return detailWorkspace` (**bez** Gate) |
| NG-10 path | L842–854: `return <TenderAutonomousGate …>{detailWorkspace}</TenderAutonomousGate>` |
| IkEntryHost mount | L749–760: tylko gdy `ikEntryOn && activeTab === "przetarg"` |

### 3.2 Early returns / parallel paths

| Path | Condition | Evidence | NG-10? |
|------|-----------|----------|--------|
| TRE-01 Outcome (ready) | `ikFirstScreen === "ng10_gate" && showTre01Outcome && tre01Recommendation` | L645–667 | **Sprzężone z ng10_gate** (nie jest Gate UI, ale early-return tylko przy OFF IK) |
| TRE-01 loading | `ng10_gate && showTre01Outcome && !tre01Recommendation` | L670–681 | j.w. |
| TRE recovery CTA | `showTre01RecoveryCta` wewnątrz workspace | L763–774 · `data-s7-tre-recovery-cta` | **NIE NG-10** (S7 KEEP) |
| Gate Run/Outcome overlay | Gate internal phases | `TenderAutonomousGate.tsx` L116–118, L282–365 | **TAK NG-10** |
| Workspace unlock | `sessionWorkspaceUnlockedRef` / `gatePhase === "workspace"` | Gate L300–302 | **TAK NG-10** |

### 3.3 NG-10 components / libs (B) — evidence only

| Symbol | Plik | Rola |
|--------|------|------|
| `TenderAutonomousGate` | `src/app/tenders/autonomous/TenderAutonomousGate.tsx` L74 | Mount / block / Run / Outcome |
| `TenderAutonomousRunScreen` | `…/TenderAutonomousRunScreen.tsx` | S1 theater UI |
| `TenderAutonomousOutcomeScreen` | `…/TenderAutonomousOutcomeScreen.tsx` | S2 GO/HOLD/NO-GO UI |
| `TenderAutonomousRunFaq` | `…/TenderAutonomousRunFaq.tsx` | FAQ Run |
| `deriveAutonomousRunPhase` | `src/lib/tender-autonomous-run-phase.ts` | Fazy prezentacyjne |
| `deriveAutonomousRunTimelineView` | `src/lib/tender-autonomous-run-timeline.ts` | 12-step timeline |
| `deriveAutonomousStatusMessage` | `src/lib/tender-autonomous-run-status.ts` | Status copy |
| transition helpers | `src/lib/tender-autonomous-run-transition.ts` | Hold / bridge / timeout UX |
| `deriveAutonomousGateExitReady` | `src/lib/tender-autonomous-run-gate-exit.ts` | Exit HF-02 |
| fingerprint / LS | `src/lib/tender-autonomous-run-fingerprint.ts` | `autonomousRunStorageKey` L28 · `deriveAutonomousRunRequired` L101 |
| outcome copy | `src/lib/tender-autonomous-run-outcome.ts` | Positives/watchouts |
| agents / LS prefix | `src/lib/tender-autonomous-run-ux.ts` L7–46 | `AUTONOMOUS_AI_AGENT_*` · `kw-tender-autonomous-run-v1:` |

**Hooks:** brak osobnego `useAutonomous*` poza logiką w Gate (`useState`/`useMemo`/`useEffect` lokalne) — evidence: Gate.tsx imports L1–37.

**AppSettings NG-10 flag:** **NOT FOUND** — NG-10 nie ma własnej AppSettings; sterowanie = brak `ikEntryEnabled` (default OFF → Gate).

**Query params NG-10:** **NOT VERIFIED** (grep `autonomous` w route/query DetailPage — brak dowodu w tym AUDIT).

**localStorage:** `kw-tender-autonomous-run-v1:{tenderId}` — Gate L49–71 · prefix `AUTONOMOUS_RUN_LS_KEY_PREFIX` (`tender-autonomous-run-ux.ts` L46).

**Agents:** prezentacyjne ID `dokumentacja|kosztorys|wycena|ryzyko|strategia` — `AUTONOMOUS_AI_AGENT_LABELS` (`tender-autonomous-run-ux.ts` L17–23) — **nie** runtime Expert AI.

---

## 4. NG-10 CONSUMERS

| Consumer | Symbol | Plik | Runtime path | Po IK takeover? |
|----------|--------|------|--------------|-----------------|
| DetailPage | `TenderAutonomousGate` | `TenderDetailPage.tsx` L10, L842–854 | first-screen OFF | **REMOVE mount** |
| DetailPage | TRE early-return | L645–681 | `ng10_gate` ∧ TRE Outcome | **MIGRATE** (odkleić od `ng10_gate`) |
| Gate | RunScreen / Outcome | Gate L334–365 | Gate phases | **REMOVE** z NG-10 |
| Gate | pipelineRuntime / intelligenceCtx | Gate props L74–90 | REUSE D KEEP | **KEEP** (nie NG-10) |
| IK libs | — | `src/lib/intelligent-estimator/*` | — | **Brak importów** (grep 0) |
| Hub / Chief / DW / Validation / Bid / BOQ | — | poza autonomous/ | własne ścieżki | **KEEP** — nie consumer NG-10 UI |
| Tests NG-10 | LIB-NG10-01 etc. | `scripts/test-tender-autonomous-run-*.mjs` · manifest `LIB-NG10-01` | CI | **REMOVE/archiwum** po P10 |
| Tests IK Gate A | `resolveIkDetailFirstScreen(false)==="ng10_gate"` | wiele `test-ik-migration-01-p*.mjs` | regresja OFF | **MIGRATE asserts** |
| Guide copy | `ng10-autonomous-agent` | `GuideView.tsx` L443 | docs UI | **MIGRATE docs** (tombstone) |
| App openTender | `openTenderById` | `App.tsx` L2641 | nawigacja | **KEEP** — nie Gate |

---

## 5. IK DEPENDENCY CHECK

### REUSE FIRST — istniejące implementacje (bez nowych silników)

| Domain | ISTNIEJE? | GDZIE? | KTO UŻYWA? | KONTRAKT | IK JUŻ UŻYWA? | NG-10 POTRZEBNY? |
|--------|-----------|--------|------------|----------|---------------|------------------|
| Documents / Ingest | TAK | `ik-document-expert.ts` · `ik-ng02-ingest-bridge.ts` · NG-02 pipeline | IkEntryHost / pipeline | P2/P2.5 DF | TAK (flag) | NIE |
| BOQ | TAK | OfferBoq v5 · multi-boq · Document Expert Master BOQ | Kosztorys / IK | BOQ Discovery contract | TAK | NIE |
| Classification | TAK | `classification-gate.ts` `classifyEstimatorPricingPlane` | Labor/Material/Identity | A1 planes | TAK | NIE |
| Identity | TAK | `ik-identity-coverage.ts` · work-rate identity | IkEntryHost P3 | identity coverage flag | TAK | NIE |
| Labor | TAK | `ik-labor-expert.ts` → `lookupWorkRate` · `runIkLaborGapResearch` | IkEntryHost P5 · Hub panel | P5 DF · Accept gate | TAK | NIE |
| Material | TAK | `ik-material-expert.ts` · DIY client | IkEntryHost P6 | P6 DF | TAK | NIE |
| Price Memory | TAK | `price-intelligence/our-price-catalog.ts` (+ PM store) | Material / Firma UI | MATERIAL plane | TAK | NIE |
| Position Cost / F5 | TAK | `tender-position-cost/*` · `ik-p7-position-cost-bid.ts` | Bid cutover / P7 | F5 rebuild DF | TAK | NIE |
| Bid | TAK | `tenders-bid-calculator.ts` `computeTenderBidProposal` | P7 / Offer UI | Bid proposal | TAK | NIE |
| SUM / PackageGate | TAK | multi-dwelling PackageGate · `aggregatePackageDirect` | P7 | MULTI-DWELLING | TAK | NIE |
| Risk | TAK | `ik-p8-risk-decision.ts` · intelligence overlay | IkEntryHost P8 | P8 DF | TAK | NIE (theater ≠ truth) |
| Validation | TAK | `validation-expert` `analyzeValidationFromDossier` | P8 · DW cache | Validation EPIC | TAK | NIE |
| Chief | TAK | `chief-orchestrator/run.ts` `runChiefOrchestrator` | `useChiefOrchestratorSession` | Session / P4 | TAK (D∨P4) | NIE |
| Decision Workspace | TAK | `decision-workspace-ui` | Detail / P8 | DW-01 · TM-01 S5 | TAK | NIE |
| Expert Conversation | TAK | `ExpertConversationSurface` | Hub + IkEntryHost | presentation VM | TAK | NIE |
| PDF | TAK | `tender-bid-package-pdf.ts` | DetailPanel | REUSE | NIE przez NG-10 | NIE |
| ATH parse/preview | TAK | `ath-parser` · preview flag | Kosztorys | AD-IK-M10 no writer | TAK (preview) | NIE |

### Dependency boundary

```text
intelligent-estimator/*  ──imports──▶  tender-autonomous-*   = NONE (evidence: grep 0)
IkEntryHost             ──requires──▶  TenderAutonomousGate = NO (L838–839 bypass)
Default prod UX         ──requires──▶  Gate when ikEntryEnabled=false = YES
Pricing / F5 / Bid / P8 ──requires──▶  NG-10 libs = NO
```

| Finding | Class |
|---------|-------|
| Brak importów NG-10 w IK | **OK — nie BLOCKER** |
| Default first-screen = Gate | **P10 SCOPE** (nie blocker silników) |
| TRE Outcome early-return ∧ `ng10_gate` | **P10 BLOCKER / DEPENDENCY (UI)** — wymaga decyzji Owner przed hard DELETE |

**P10 BLOCKER / DEPENDENCY (UI):**

```text
symbol: early-return TRE-01 Outcome
plik: src/app/TenderDetailPage.tsx
linie: 645–681
warunek: ikFirstScreen === "ng10_gate" && showTre01Outcome
evidence: bez ng10_gate ta ścieżka Outcome-first (Expert OFF / S7) nie odpala early-return
status: NIE NAPRAWIONO W TYM PLANIE — wymaga MIGRATE w implementacji P10
```

---

## 6. DUPLICATION AUDIT

| Item | Werdykt | Evidence / reason |
|------|---------|-------------------|
| Chief | **1 SSOT** | `runChiefOrchestrator` — D path + P4 OR eligibility (`TenderDetailPage` L261–270) |
| F5 / Position Cost | **1 SSOT + P7 adapter** | `tender-position-cost/*` · `ik-p7-position-cost-bid.ts` |
| Bid | **1 calculator** | `computeTenderBidProposal` — Dual PLN authority = TM-01 S3 KEEP, nie trzeci Bid |
| Classification | **1 SSOT** | `classifyEstimatorPricingPlane` |
| Catalog / PM | **2 płaszczyzny celowe** | Work Catalog ≠ Price Memory |
| EC ViewModel Hub | **celowy** | `buildExpertConversationViewModel` ← Chief dossier · `TenderWorkflowHubPanel` |
| EC ViewModel IK | **celowy** | `buildIkEntryConversationViewModel` ← pipeline/IK facts · `IkEntryHost` |
| Hub vs IK VM | **NIE martwy duplikat** | różni consumerzy + różne źródła faktów; Surface wspólna |
| NG-10 Outcome vs DW | **LEGACY theater** | OutcomeScreen vs `buildDecisionWorkspaceViewModel` — decommission **B** |

**Usuwanie VM / adapterów w P10:** **OUT OF SCOPE** (ten PLAN nie proponuje delete Hub VM).

---

## 7. FLAG AUDIT

| Flag / key | Storage | Default | Steruje | IK ON? |
|------------|---------|---------|---------|--------|
| `ikEntryEnabled` | AppSettings `kw-app-settings` | **false** L153 | first-screen · IkEntryHost | **TAK (jedyne)** |
| `expertAiDecydentEnabled` | AppSettings | **false** L152 | Dual Outcome / D master | **NIE** |
| `kw-chief-orchestrator-session` | localStorage | unset | LS OV nad D (`chief-session/flag.ts` L13–45) | **NIE** (precedence LS > AppSettings D) |
| `isExpertAiRuntimeEffective()` | alias | — | = `isChiefOrchestratorSessionEnabled()` L74–76 `tender-expert-effective.ts` | **NIE = IK** |
| P2–P8 IK levers | AppSettings | all **false** L154–162 | podmoduły pod IK Entry | wymagają `ikEntryEnabled` |

```text
IK ≠ D  = POTWIERDZONE
P10 MUST NOT flip expertAiDecydentEnabled
P10 MAY change ikEntryEnabled default / resolveIkDetailFirstScreen semantics
  — tylko po Owner GO (patrz §14)
```

**Dlaczego P10 prawdopodobnie zmienia `ikEntryEnabled` / resolver:**

- Dziś OFF ⇒ Gate (`ik-entry-flag.ts` L342).  
- Target user: *NG-10 path = absent* · *IK = deterministyczny first-screen*.  
- Sam flip default bez usunięcia Gate zostawia latentny legacy path — **niespójne z acceptance**.  
- Rekomendowany kierunek PLANU: **hard remove Gate mount** + first-screen zawsze workspace z `IkEntryHost` (przy czym sub-flagi P2–P8 zostają OFF) — **wymaga Owner GO** (zmiana UX prod).

---

## 8. REMOVE / KEEP / MIGRATE / BLOCKED

### REMOVE (po Owner GO P10 IMPLEMENT)

| symbol | plik | consumer | status | powód | evidence |
|--------|------|----------|--------|-------|----------|
| `TenderAutonomousGate` | `…/TenderAutonomousGate.tsx` | DetailPage | REMOVE | first-screen theater | L842–854 DetailPage |
| `TenderAutonomousRunScreen` | `…/TenderAutonomousRunScreen.tsx` | Gate | REMOVE | S1 UI | Gate L334 |
| `TenderAutonomousRunFaq` | `…/TenderAutonomousRunFaq.tsx` | RunScreen | REMOVE | FAQ | RunScreen import |
| `TenderAutonomousOutcomeScreen` | `…/TenderAutonomousOutcomeScreen.tsx` | Gate | REMOVE | S2 theater | Gate L354 |
| `tender-autonomous-run-{phase,timeline,status,transition,gate-exit,fingerprint,ux,outcome}.ts` | `src/lib/` | Gate/tests | REMOVE | projekcja NG-10 | imports Gate L5–30 |
| `test-tender-autonomous-run-*.mjs` | `scripts/` | CI LIB-NG10 | REMOVE/archiwum | tylko NG-10 | manifest LIB-NG10-01 |
| `data-tender-autonomous-*` | UI attrs | PV | REMOVE | selektory theater | RunScreen/Gate/Outcome |
| LS writes NG-10 | Gate L62–71 | browser | STOP write · orphan OK | decommission map §7 | fingerprint prefix |

### KEEP

| symbol | plik | consumer | status | powód | evidence |
|--------|------|----------|--------|-------|----------|
| Pipeline / NG-02 | `useTenderPipelineRuntime` etc. | DetailPage | KEEP | D KEEP | decommission §6 · Gate props |
| Hub / V4 tabs | `TenderWorkflowHubPanel` … | DetailPage | KEEP | workspace | DetailPage children |
| OfferBoq / F5 / Bid | `tender-position-cost` · bid calc | P7 / UI | KEEP | pricing SSOT | REUSE map |
| Chief / EC Surface / DW / Validation | chief-* · expert-conversation · decision-workspace · validation-expert | Detail / P8 | KEEP | IK truth path | P4–P8 |
| TRE recovery CTA | DetailPage L763–774 | S7 | KEEP | nie Gate | `data-s7-tre-recovery-cta` |
| `IkEntryHost` + IK libs | `intelligent-estimator/*` | DetailPage | KEEP | target first-screen | L749–760 |
| `openTenderById` | App.tsx | nav | KEEP | nie NG-10 | L2641 |

### MIGRATE

| symbol | plik | consumer | status | powód | evidence |
|--------|------|----------|--------|-------|----------|
| DetailPage Gate wrap | `TenderDetailPage.tsx` L838–854 | first-screen | MIGRATE→remove wrap | zawsze `detailWorkspace` | L838–854 |
| `resolveIkDetailFirstScreen` / type `ng10_gate` | `ik-entry-flag.ts` L9, L339–343 | tests + DetailPage | MIGRATE | usunąć gałąź ng10 lub deprecated | L342 |
| TRE early-return | DetailPage L645–681 | S7 Outcome-first | MIGRATE | odkleić od `ng10_gate` | L645 |
| IK Gate A asserts | `test-ik-migration-01-p*.mjs` | CI | MIGRATE | OFF≠ng10 po P10 | wiele asercji `ng10_gate` |
| Admin copy NG-10 | `AdminSettingsModal.tsx` ~L439 | Super Admin | MIGRATE copy | „zostaje przy NG-10” | changelog/settings |
| Guide NG-10 | `GuideView.tsx` L443 | Help | MIGRATE tombstone | docs UI | id `ng10-autonomous-agent` |
| Outcome semantics | `tender-autonomous-run-outcome.ts` | Gate | MIGRATE→DW/overlay | klasa B | decommission map §3 |
| test-manifest LIB-NG10-01 | `test-infra/test-manifest.json` | CI | MIGRATE remove suite | L1101+ | evidence grep |

### BLOCKED (do Owner / evidence)

| symbol | status | powód | evidence |
|--------|--------|-------|----------|
| Default `ikEntryEnabled=true` bez GO | BLOCKED | zmiana UX prod + Catalog/research levers nadal OFF, ale first-screen/EC ON | app-settings L153 |
| TRE Outcome-first po usunięciu `ng10_gate` | BLOCKED until MIGRATE design | early-return sprzężony | DetailPage L645 |
| Hard DELETE przed DF P10 | BLOCKED | DF not created · Owner GO not granted | this PLAN |
| F5-T2 suite PASS claim | BLOCKED as gate lie | PRE-EXISTING F5-A | FINAL HANDOFF §7 |
| ATH writer | BLOCKED forever in P10 | AD-IK-M10 | DESIGN-FREEZE AD-IK-M10 |
| Flip `expertAiDecydentEnabled` | BLOCKED | IK ≠ D | app-settings L61–66 · tender-expert-effective |

---

## 9. P10 IMPLEMENTATION PLAN

> **Tylko kolejność kandydacka — ZERO IMPLEMENT bez DF + Owner GO.**

### 9.1 Kolejność

1. **Owner / ChatGPT REVIEW** tego PLANU.  
2. **Design Freeze P10** (osobna sesja) — freeze: default flag · TRE migrate · remove list · Gate A/B.  
3. **Owner GO IMPLEMENT**.  
4. DetailPage: usuń import/mount Gate; first-screen = `detailWorkspace` + `IkEntryHost` gdy tab `przetarg` (decyzja DF: zawsze mount host vs `ikEntryEnabled`).  
5. MIGRATE TRE early-return (nie gubić S7).  
6. Usuń `src/app/tenders/autonomous/*` + `src/lib/tender-autonomous-run-*.ts`.  
7. Zaktualizuj `ik-entry-flag` (usuń `ng10_gate` lub dead branch).  
8. Admin/Guide/changelog copy.  
9. Testy: nowy P10 suite + rewrite Gate A historycznych asercji + drop LIB-NG10 z manifestu.  
10. Build · Gate A · Gate B · commit · push · ONE-SHOT PV · Owner Verify.  
11. CLOSEOUT + tip `09`.

### 9.2 Pliki potencjalnie zmieniane

| Plik | Zmiana kandydacka |
|------|-------------------|
| `src/app/TenderDetailPage.tsx` | remove Gate wrap · TRE migrate · always IK host path |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` | first-screen type / resolver |
| `src/lib/app-settings.ts` | **opcjonalnie** default `ikEntryEnabled` (tylko DF) |
| `src/app/AdminSettingsModal.tsx` | copy / toggle semantics |
| `src/app/GuideView.tsx` | tombstone NG-10 |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | wpis P10 |
| `test-infra/test-manifest.json` | drop LIB-NG10 |
| `scripts/test-ik-migration-01-p*.mjs` | Gate A asserts |
| docs tip / FINAL / continuity | po PV |

### 9.3 Pliki NG-10 do usunięcia (kandydat)

- `src/app/tenders/autonomous/TenderAutonomousGate.tsx`  
- `…/TenderAutonomousRunScreen.tsx`  
- `…/TenderAutonomousOutcomeScreen.tsx`  
- `…/TenderAutonomousRunFaq.tsx`  
- `src/lib/tender-autonomous-run-phase.ts`  
- `src/lib/tender-autonomous-run-timeline.ts`  
- `src/lib/tender-autonomous-run-status.ts`  
- `src/lib/tender-autonomous-run-transition.ts`  
- `src/lib/tender-autonomous-run-gate-exit.ts`  
- `src/lib/tender-autonomous-run-fingerprint.ts`  
- `src/lib/tender-autonomous-run-ux.ts`  
- `src/lib/tender-autonomous-run-outcome.ts`  
- `scripts/test-tender-autonomous-run-*.mjs` (5)

### 9.4 Pliki pozostające

Wszystkie **KEEP** z §8 · cały `intelligent-estimator/*` · F5/Bid/Chief/DW/Validation · pipeline · Hub.

### 9.5 Migracje

- TRE-01 Outcome-first bez `ng10_gate`.  
- Gate A: „NG-10 absent” zamiast „OFF → ng10”.  
- Outcome theater → DW/overlay (już SSOT; tylko usunąć UI NG-10).  
- Orphan LS ignore.

### 9.6 Testy (nie pisać teraz — lista kontraktowa)

- Nowy `test-ik-migration-01-p10-*.mjs` (DF nazwie).  
- Regresja P0–P9 relevant (bez wymuszania research/Accept).  
- Bid / PackageGate / SUM smoke.  
- Drop / skip LIB-NG10-01.

### 9.7–9.12

Patrz §10–§14 poniżej (Gate A/B · Rollback · Owner · Close).

**Zakaz w IMPLEMENT:** nowe engines · flip D · CatalogWork mutation · P5.33 · ATH writer · auto-Accept · research ON bez osobnego GO.

---

## 10. TEST CONTRACT

### NG-10 path

```text
AFTER P10:
  TenderAutonomousGate mount = ABSENT
  resolve path ng10_gate = ABSENT (or unreachable dead code = FAIL)
  data-tender-autonomous-* in DetailPage first-screen = ABSENT
```

### IK first-screen

```text
TenderDetailPage
  → detailWorkspace (no Gate wrapper)
  → tab przetarg → IkEntryHost (+ EC)
deterministycznie (per DF: always or ikEntryEnabled default TRUE with no NG-10 fallback)
```

### IK engines — no regression

Documents · BOQ · Classification · Identity · Labor · Material · F5 · Bid · SUM · Risk · Validation · Chief · DW · EC — **smoke / existing suites PASS** (F5-T2 = report PRE-EXISTING, nie claim PASS).

### D

```text
expertAiDecydentEnabled  snapshot before/after P10  →  diff = 0
P10 code must not write this field
```

### CatalogWork

```text
471 · no unauthorized Accept/CREATE/BIND/WRITE in P10
```

### Pricing safety (unchanged)

```text
GAP ≠ 0 PLN
NO_MATCH ≠ market absence
PARSER_EMPTY ≠ no price
Evidence ≠ OUR RATE
Research ≠ automatic Accept
```

---

## 11. GATE A

| Check | PASS if |
|-------|---------|
| Bundle / source | brak importu `TenderAutonomousGate` w DetailPage |
| First-screen | `data-ik-first-screen` / host markers bez Gate wrap |
| Default UX | wejście `/przetarg` → IK host path (per DF) |
| TRE | Outcome/recovery nadal osiągalne **bez** NG-10 (per migrate) |
| D | `expertAiDecydentEnabled` nie zmienione przez P10 |
| NG-10 tests | usunięte z mandatory gate **lub** archiwum poza Gate A |

---

## 12. GATE B

| Check | PASS if |
|-------|---------|
| Build | `npm run build` PASS |
| P9 marker / Truth Gates wiring | retained |
| P7/P8 adapters | retained · flags default OFF OK |
| Payroll / cloud-sync | **UNTOUCHED** (no P10 touch) |
| Bid/PackageGate smoke | PASS |
| Manifest | LIB-NG10 nie blokuje Gate B tenders (removed/skipped) |
| F5-T2 | documented PRE-EXISTING · not claimed green |

---

## 13. ROLLBACK

```text
P10 regression detected
  ↓
git revert <P10 implement commit(s)>   # prefer pure revert
  ↓
git push origin main                   # Vercel auto
  ↓
ONE-SHOT version.json == pre-P10 tip   # VERIFY FAST
  ↓
CONFIRM: Gate mount restored OR ikEntry default restored (per revert content)
  ↓
STOP — no manual rewrite of deleted files if revert restores tree
```

**Uwaga:** jeśli P10 = wiele commitów, revert w odwrotnej kolejności **lub** revert merge — ustalić w DF.  
**Nie** ręczne „odtwarzanie z pamięci” plików autonomous.

---

## 14. OWNER GO REQUIREMENTS

Przed IMPLEMENT Owner musi jawnie zatwierdzić:

1. **P10 GO** (ten zakres decommission).  
2. **Default first-screen** = IK always / `ikEntryEnabled` default true / inne (DF).  
3. **TRE-01 migrate** strategy (Outcome-first bez `ng10_gate`).  
4. **Hard DELETE** listy §9.3 (nie soft-hide).  
5. **D lock** = no flip `expertAiDecydentEnabled`.  
6. **CatalogWork 471** = no mutation in P10.  
7. **Research/Accept** = remain 0 unless osobne GO.  
8. **Design Freeze P10** dokument przed kodem.

Bez punktów 1+2+3+8 → **IMPLEMENT FORBIDDEN**.

---

## 15. OPEN QUESTIONS

| # | Pytanie | Dlaczego ważne |
|---|---------|----------------|
| Q1 | Czy po P10 `ikEntryEnabled` zostaje jako master (default true), czy first-screen hard-coded IK a flaga tylko dla P2–P8? | Semantyka Admin toggle |
| Q2 | Jak dokładnie odtworzyć TRE Outcome-first (Expert OFF) bez `ng10_gate`? | BLOCKER UI L645 |
| Q3 | Czy Outcome NG-10 semantics wymagają jakiegokolwiek UI migrate, czy wystarczy Hub DW + overlay? | klasa B |
| Q4 | Czy Guide/Help NG-10 kasować czy tombstone? | docs UX |
| Q5 | Czy LIB-NG10 usuwać z manifestu w tym samym commicie co delete? | CI Gate B |
| Q6 | Czy Controlled ON P7/P8 jest wymagane w Owner Verify P10, czy tylko first-screen? | PV scope |
| Q7 | Tip live SHA drift (`80c7c26` vs późniejsze docs tips) — aktualizacja `09` tylko przy P10 PV? | tip hygiene |

**NOT VERIFIED w tym PLANIE:** query-param trigger NG-10; pełna lista CSS `ng10-*` poza Gate/RunScreen; runtime count CatalogWork 471 w żywym KV (dokumentowany lock only).

---

## 16. FINAL RECOMMENDATION

```text
RECOMMEND: PROCEED TO CHATGPT / OWNER REVIEW
THEN (only if GO): Design Freeze P10 → IMPLEMENT decommission
DO NOT invent engines
DO NOT flip D
DO NOT create P5.33
DO NOT implement from this PLAN alone
```

**Architektonicznie:** NG-10 jest izolowanym theater wrapperem; IK orchestration jest niezależna — decommission jest **seam DetailPage + delete autonomous tree + test migrate**, nie rebuild Przetargów.

**Ryzyko nr 1:** TRE-01 early-return sprzężony z `ng10_gate` — musi być w DF przed DELETE.

---

## STOP

```text
STOP.

ZERO CODE
ZERO PATCH
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
ZERO DESIGN FREEZE
ZERO OWNER GO ASSUMPTION
```

```text
P10 PLAN READY FOR CHATGPT / OWNER REVIEW.
NO IMPLEMENTATION PERFORMED.
```
