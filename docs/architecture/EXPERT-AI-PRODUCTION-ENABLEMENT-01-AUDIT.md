# EXPERT-AI-PRODUCTION-ENABLEMENT-01 — AUDIT

> **STATUS:** **AUDIT COMPLETE** · PLAN → [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md) · DF → [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE.md) (**COMPLETE** · **READY FOR IMPLEMENT**) · **bez IMPLEMENT**  
> **ID:** EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT  
> **TRYB:** AUDIT only (bez kodu · bez commit · bez push)  
> **Baseline tip:** UI **2.66.22** / commit **`adde246a`** (`adde246ab3d6cb4130b308b960c790814ea62e79`)  
> **Data:** 2026-08-08  
> **Cold-start tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md)  
> **Zakres pytania:** co brakuje, by użytkownik korzystał z pipeline  
> OfferBoq → Experts → Chief → Validation → Expert Workspace → Decision Workspace → Decision Persist  
> **bez** ręcznego `localStorage` feature flags.

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — AUDIT

Werdykt skrót:
  Pipeline BC + wire = SHIPPED (tip adde246a)
  Production UX = WYŁĄCZONY (2× LS flag default OFF)
  Brak AdminSettings / Super Admin toggle
  Brak dodatkowego WIRE BC — potrzebny ENABLEMENT EPIC
  Default ON = możliwe, ale NIE „sam flip” bez PLAN/DF
  Dual flag = główna luka operacyjna

STATUS: AUDIT COMPLETE · READY FOR PLAN
════════════════════════════════════════════════════════
```

---

## 0. Cel i granice

| | |
|--|--|
| **CEL** | Zmapować braki enablementu (flagi · bramki · UX · residual wire) |
| **IN** | Flagi Session/Decision · auto-start Session · readiness RO · Persist · powierzchnie UI |
| **OUT** | IMPLEMENT · flip default w kodzie · cloud Persist · nowe Expert/Chief BC |

---

## 1. CO JUŻ JEST DOSTĘPNE (tip `adde246a`)

| Warstwa | Stan | Uwagi |
|---------|------|--------|
| **OfferBoq → Experts → Chief** | **SHIPPED** (lib) | EE→ME→PE→Cost→Offer · Chief Orchestrator · REUSE public API |
| **Wire Adapters RO** | **SHIPPED** | `assembleChiefWireRuntimeRo` · OfferBoq/Catalog/Company/Strategy |
| **Chief Session engine + hook** | **SHIPPED** | `useChiefOrchestratorSession` · auto-start gdy `enabled` |
| **UI Dossier RO** | **SHIPPED** | `#chief-dossier-surface` · Trace / Timeline / Offer |
| **Expert Workspace RO** | **SHIPPED** | Slot A pod Trace · **brak osobnej flagi** · gate = Session |
| **Validation Expert** | **SHIPPED** | pure-lib · cache w Decision Workspace |
| **Decision Workspace UI** | **SHIPPED** | Actions · Dual Outcome · sibling POD Dossier |
| **Decision Persist** | **SHIPPED** | `kw-decision-persist-v1` append-only · Host wire · REUSE Decision flag |
| **Mount path** | **SHIPPED** | `TenderDetailPage` → Panel → PrzetargWorkspace → Hub |
| **Fail-soft RO** | **SHIPPED** | `not_ready_for_chief_input` · `pricing_not_ready` · UI phase `not_ready` / `no_dossier` |

**Wniosek:** produkt techniczny jest na prod; **dostęp użytkownika = OFF**.

---

## 2. CO JEST WYŁĄCZONE

### 2.1 Feature flags (SSOT kod)

| Klucz LS | Default | `'1'` | `'0'` | UI Admin |
|----------|---------|-------|-------|----------|
| **`kw-chief-orchestrator-session`** | **`false`** | ON | FORCE OFF | **BRAK** |
| **`kw-decision-workspace`** | **`false`** | ON | FORCE OFF | **BRAK** |

Źródła: `src/lib/chief-session/flag.ts` · `src/lib/decision-workspace-ui/flag.ts`.

### 2.2 Skutek przy obu OFF (tip parity)

| Powierzchnia | Widoczność użytkownika |
|--------------|------------------------|
| Chief Dossier | **brak** (`chiefDossierVm == null`) |
| Expert Workspace | **brak** (zależny od Session) |
| Decision Workspace | **brak** (Host → `uiPhase=hidden`) |
| Decision Persist | **brak zapisu** (Host nie renderuje / flag OFF) |
| Session `runChief` | **nie startuje** |

### 2.3 Ręczny krok dziś (OV / smoke)

```text
localStorage.setItem('kw-chief-orchestrator-session','1')
localStorage.setItem('kw-decision-workspace','1')
// reload → otwórz przetarg → tab Przetarg
```

Brak przełącznika w ⚙ Super Admin (`AppSettings`) — w przeciwieństwie do `wmRysunkiEnabled` / Worker Sketch.

---

## 3. CO MUSI BYĆ WŁĄCZONE (żeby użytkownik „korzystał”)

| # | Wymaganie | Poziom |
|---|-----------|--------|
| **E1** | **`kw-chief-orchestrator-session` = ON** | MUST — Session + Dossier + Expert Workspace |
| **E2** | **`kw-decision-workspace` = ON** | MUST — Decision UI + Persist (REUSE tej flagi) |
| **E3** | Tender z **OfferBoq** (`lines.length > 0`) | MUST runtime — inaczej `not_ready_for_chief_input` |
| **E4** | **`pricingReadyPartial` ∨ `pricingReadyFinal`** | MUST runtime — inaczej `pricing_not_ready` |
| **E5** | Catalog + Company RO dostępne | MUST — `readyForChiefInput` (company zwykle zawsze; BOQ+lines = klucz) |
| **E6** | Tab **Przetarg** | MUST UX — Decision Host tylko tam |
| **E7** | `tenderId` = `item.id` + `caseId` + `dossier.finishedAt` + Validation snapshot | MUST Persist — po udanym przebiegu |

**NIE trzeba** osobnych flag Expert Workspace / Validation / Persist / Adapters / Chief lib.

---

## 4. CZY MOŻNA BEZPIECZNIE USTAWIĆ DEFAULT ON?

### 4.1 Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| **Czy „tylko flip `DEFAULT = true`” jest bezpieczne?** | **NIE jako jedyny krok** |
| **Czy enablement jest możliwy?** | **TAK** — po PLAN/DF z mitigacjami |

### 4.2 Ryzyka przy nagłym default ON (obu flag)

| Ryzyko | Opis |
|--------|------|
| **R1 Dual flag** | Session ON + Decision OFF = Dossier/Experts bez Decydenta; odwrotnie = Decision na idle Session (`no_dossier`) |
| **R2 Auto-start CPU** | Session auto-start na każdym otwarciu przetargu gdy BOQ+pricing ready |
| **R3 Szum UX** | Dużo przetargów bez OfferBoq → surface `not_ready` dla wszystkich adminów |
| **R4 Persist local-only** | Decyzje w LS — użytkownik może myśleć, że to cloud SSOT (`≠ kw-tender-decisions`) |
| **R5 Brak Admin kill-switch** | Bez AppSettings nie ma Super Admin OFF bez DevTools |
| **R6 Tip parity history** | Oba epiki **celowo** default OFF — flip = świadoma zmiana kontraktu produktowego |

### 4.3 Co byłoby „bezpieczniejszym” default ON

1. **Jeden master gate** (rekomendacja PLAN) *lub* atomowy flip obu DEFAULT + dokumentacja.  
2. **FORCE OFF `'0'`** zachować.  
3. **Super Admin AppSettings** (wzorzec WM Rysunki) — opcjonalnie w tym samym EPIC.  
4. **Owner QA** na 1–2 realnych przetargach z OfferBoq + pricing ready.  
5. Copy UX: „zapis lokalny” już jest w Persist toast — wzmocnić Dual Outcome vs TRE-01.  
6. Opcja: default ON tylko Session najpierw (P0), Decision w P1 — **albo** razem (pełny Decydent).

---

## 5. CZY BRAKUJE JESZCZE WIRE?

| Obszar | Brak WIRE BC? | Komentarz |
|--------|---------------|-----------|
| OfferBoq → Adapters → Session → Chief | **NIE** | COMPLETE |
| Dossier UI + Expert Workspace Slot A | **NIE** | COMPLETE · Session flag only |
| Validation → Decision VM | **NIE** | COMPLETE |
| Decision → Persist Host | **NIE** | COMPLETE (`tenderId` z Hub) |
| **Production enablement** | **TAK (ops/UX)** | Flagi OFF · brak Admin toggle · dual gate |
| Cloud Persist / Audit Hub | residual P1 | **nie** blokuje enablement P0 UI |
| Mostek → `kw-tender-decisions` | OUT Dual Outcome | **nie** wymagany do enablement |

**Wniosek:** nie potrzeba nowego Expert/Chief/Validation/Session **WIRE BC**.  
Potrzebny jest **ENABLEMENT / ROLLOUT EPIC** (flagi · opcjonalnie AppSettings · QA · docs).

---

## 6. RECOMMENDED NEXT EPIC

```text
EXPERT-AI-PRODUCTION-ENABLEMENT-01
  TRYB: PLAN → DESIGN FREEZE → Owner GO IMPLEMENT
  CEL: użytkownik (admin) widzi i używa pipeline bez DevTools LS
```

### Proponowany IN (PLAN do zamrożenia)

| Slice | Treść |
|-------|-------|
| **S0** | Decyzja produktowa: single master flag **vs** dual default ON |
| **S1** | Enablement mechanizm: DEFAULT ON **i/lub** AppSettings Super Admin |
| **S2** | Kill-switch `'0'` / AppSettings OFF · tip docs |
| **S3** | Owner QA matrix: BOQ ok · BOQ brak · pricing not ready · Persist refresh |
| **S4** | Help/Zmiany copy (opcjonalnie thin) — „lokalny zapis decyzji” |
| **S5** | PV + CLOSEOUT tip (bez bump UI jeśli tylko flag) |

### OUT (tego EPIC)

- Cloud sync Persist · Audit Hub adapter · merge TRE-01  
- Zmiany Expert/Chief/Validation/TF BC  
- Nowe analizy / OfferBoq write  

### Alternatywy (niżej priorytet bez GO)

- Wire Pack→CI/UI · SMART/MS · Cloud Decision Persist P1  

---

## 7. READY FOR PLAN / NO-GO

| | |
|--|--|
| **AUDIT** | **COMPLETE** |
| **IMPLEMENT teraz** | **NO-GO** |
| **PLAN (enablement)** | **READY FOR PLAN** |
| **Flip default bez DF** | **NO-GO** |
| **Nowy WIRE Expert/Chief** | **NO-GO** (niepotrzebny) |

```text
READY FOR PLAN — EXPERT-AI-PRODUCTION-ENABLEMENT-01
Następny krok Owner: GO PLAN (lub GO DESIGN FREEZE jeśli brief = tylko flip + AppSettings)
```

---

## Appendix A — Przepływ runtime (skrót)

```text
Otwórz przetarg (item)
  ├─ Session flag OFF? → brak Dossier/Experts; Decision Host mount ale hidden jeśli Decision OFF
  ├─ Session flag ON?
  │     assembleChiefWireRuntimeRo(item)
  │     readyForChiefInput? (OfferBoq lines + pricing + company)
  │     pricingReadyPartial|Final?
  │       NIE → status idle · error not_ready_* · UI „not_ready”
  │       TAK → runChiefOrchestrator → dossier in-memory
  │             → ChiefDossierSurface + ExpertWorkspace (Slot A)
  └─ Decision flag ON + tab Przetarg?
        Validation cache ≤1×
        Decision Workspace Actions
        recordDecision → kw-decision-persist-v1
        hydrate(tenderId, caseId, dossierFinishedAt)
```

## Appendix B — Evidence (ścieżki)

| Artefakt | Path |
|----------|------|
| Session flag | `src/lib/chief-session/flag.ts` |
| Decision flag | `src/lib/decision-workspace-ui/flag.ts` |
| Session hook | `src/app/hooks/useChiefOrchestratorSession.ts` |
| Page wire | `src/app/TenderDetailPage.tsx` |
| Hub mount | `src/app/TenderWorkflowHubPanel.tsx` |
| Adapters ready | `src/lib/chief-wire-adapters/assemble.ts` |
| Session start gates | `src/lib/chief-session/engine.ts` |
| Persist Host | `src/app/decision-workspace/DecisionWorkspaceHost.tsx` |
| Flag table SSOT | `docs/AI/MASTER-AI-HANDOFF.md` § Feature Flags |

---

## Appendix C — Odpowiedzi Owner (1:1)

1. **CO JUŻ JEST DOSTĘPNE** — pełny stack BC+UI+Persist na tipie; fail-soft RO.  
2. **CO JEST WYŁĄCZONE** — obie flagi default OFF; brak Admin UI; surfaces niewidoczne.  
3. **CO MUSI BYĆ WŁĄCZONE** — E1+E2 flags + OfferBoq + pricingReady + tab Przetarg.  
4. **DEFAULT ON bezpiecznie?** — nie jako sam flip; tak z PLAN/DF + kill-switch + QA.  
5. **Brak WIRE?** — nie BC; tak enablement/ops.  
6. **NEXT EPIC** — `EXPERT-AI-PRODUCTION-ENABLEMENT-01`.  
7. **READY FOR PLAN** / IMPLEMENT **NO-GO**.
