# DESIGN FREEZE — EXPERT-AI-PRODUCTION-ENABLEMENT-01

> **STATUS:** **EPIC CLOSED** · **PRODUCTION VERIFIED** · **Q12 FIX VERIFIED**  
> **ID:** EXPERT-AI-PRODUCTION-ENABLEMENT-01-DESIGN-FREEZE  
> **EPIC:** EXPERT-AI-PRODUCTION-ENABLEMENT-01  
> **TRYB:** CLOSED · tip [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Data:** 2026-08-09  
> **Język:** polski  
> **Feature tip:** UI **2.66.22** / **`4ba06032`** (`4ba0603`) · prior **`29a48fb3`**  
> **CLOSEOUT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-CLOSEOUT.md)  
> **Q12 PV:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-PRODUCTION-VERIFY.md)  
> **AUDIT:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md) (**COMPLETE**)  
> **PLAN:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md) (**COMPLETE**)  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Priors CLOSED:** DECISION-PERSIST-01 · WIRE-EXPERTS-UI-01 · DECISION-WORKSPACE-01 · VALIDATION-EXPERT-01 · WIRE-CHIEF-* · CHIEF-ORCHESTRATOR-P0 · EXPERTS-P0

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — DESIGN FREEZE

LOCKED:
  Master gate     = AppSettings.expertAiDecydentEnabled
  Storage REUSE   = kw-app-settings (Super Admin ⚙ Moduły)
  Legacy LS       = kw-chief-orchestrator-session
                    kw-decision-workspace
  Precedence      = "0" > "1" > AppSettings > false
  Default         = expertAiDecydentEnabled = false
  Coupling        = Decision effective ⇒ Session effective
  Readiness       = REUSE (OfferBoq lines ∧ pricingReady*)
  Fail-soft       = not_ready · pricing_not_ready · no_dossier
  Persist         = local-first P0 · Cloud OUT
  ZERO            = nowy system flag · nowy LS master
  Stack BC        = NO TOUCH

REUSE FIRST · ZERO DUPLICATE · 8 LOCK

STATUS: EPIC CLOSED · PRODUCTION VERIFIED · Q12 FIX VERIFIED (4ba06032)
════════════════════════════════════════════════════════
```

---

## 0. Proces

```text
[DONE]  AUDIT          → EXPERT-AI-PRODUCTION-ENABLEMENT-01-AUDIT.md
[DONE]  PLAN           → EXPERT-AI-PRODUCTION-ENABLEMENT-01-PLAN.md
[DONE]  DESIGN FREEZE  → TEN DOKUMENT (LOCKED)
[NEXT]  Owner GO IMPLEMENT → S0–S8 → TEST → Owner QA Q1–Q12 → OV → COMMIT allowlist → PUSH → PV → CLOSEOUT
```

**Zmiana po FREEZE:** tylko Owner GO + nowy AUDIT/DF amend. Agent **nie** rozszerza scope w IMPLEMENT.

---

## 1. Cel EPIC (LOCKED)

| | |
|--|--|
| **IN** | Bezpieczny **production enablement** już wdrożonego Expert AI stacku — bez ręcznego localStorage |
| **OUT** | Nowe Expert/Chief/Validation BC · nowy system flag · Cloud Persist · zmiany domenowe · auto-rerun |
| **Sukces** | AC1–AC16 · Q1–Q12 · 8 LOCK · diff ⊆ allowlist · harness PASS |

**Stack (NO TOUCH BC — tylko enablement wire):**

```text
OfferBoq → Experts → Chief → Session → Dossier → Expert Workspace
         → Validation → Decision Workspace → Decision Persist
```

---

## 2. PAYROLL SAFETY GATE (przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: TAK*  (*odczyt/write AppSettings LS + odczyt legacy flag keys;
                        Decision Persist store = NO TOUCH poza istniejącym Host)
G3 Cloud/KV:     TAK*  (*tylko AppSettings merge REUSE — NIE Persist cloud)
G4 Edge:         NIE
G5 OfferBoq:     NIE write
G6 Bid:          NIE
G7 Sync/merge:   TAK*  (*wyłącznie merge AppSettings — wzorzec wmRysunkiEnabled)
G8 FEATURE:      TAK (enablement)
G9 Owner GO:     wymagany przed IMPLEMENT
```

**Werdykt Gate:** **PASS** przy scoped AppSettings + zero Persist cloud + zero Expert BC.

---

## 3. Master gate (LOCKED)

| | LOCKED |
|--|--------|
| **Pole** | **`expertAiDecydentEnabled: boolean`** |
| **Default** | **`false`** |
| **Persist** | REUSE **`kw-app-settings`** via `loadAppSettingsLocal` / `saveAppSettings` / `mergeAppSettings` |
| **Merge** | wzorzec **`wmRysunkiEnabled`**: remote explicit true/false wygrywa; else local |
| **UI** | Super Admin **⚙** → sekcja **Moduły** — **jeden** toggle (brak nowego panelu) |
| **Copy PL (LOCKED)** | **„Expert AI · Przebieg i Decydent”** |
| **Hint PL (LOCKED)** | „Domyślnie wyłączone. Po włączeniu: orkiestracja Expertów, Dossier, Decision Workspace i lokalny zapis decyzji w Przetargach. Kill-switch: localStorage klucz = 0.” |
| **Nowy LS master key** | **ZAKAZ** |
| **Nowy system flag** | **ZAKAZ** |

---

## 4. Legacy overrides (LOCKED)

| Klucz LS | Rola |
|----------|------|
| **`kw-chief-orchestrator-session`** | kill-switch / OV force Session |
| **`kw-decision-workspace`** | kill-switch / OV force Decision |

| Wartość | Semantyka |
|---------|-----------|
| **`"0"`** | **FORCE OFF** · kill-switch · **zawsze wygrywa** nad AppSettings ON |
| **`"1"`** | **FORCE ON** · controlled Owner Verification / smoke · wygrywa nad AppSettings OFF |
| brak / inne | ignoruj → AppSettings → false |

**AppSettings** = **jedyne normalne** źródło production enablement.

---

## 5. Effective enablement — funkcje (LOCKED)

Publiczne nazwy **bez zmian** (REUSE):

- `isChiefOrchestratorSessionEnabled()`
- `isDecisionWorkspaceEnabled()`

### 5.1 Pseudo-kontrakt (MUST w IMPLEMENT)

```text
function resolveLegacyTriState(lsKey):
  raw = localStorage.getItem(lsKey)
  if raw === "0" return FORCE_OFF
  if raw === "1" return FORCE_ON
  return UNSET

function isChiefOrchestratorSessionEnabled():
  tri = resolveLegacyTriState("kw-chief-orchestrator-session")
  if tri === FORCE_OFF return false
  if tri === FORCE_ON  return true
  return loadAppSettingsLocal().expertAiDecydentEnabled === true

function isDecisionWorkspaceEnabled():
  // Coupling: Decision ⇒ Session
  if !isChiefOrchestratorSessionEnabled() return false
  tri = resolveLegacyTriState("kw-decision-workspace")
  if tri === FORCE_OFF return false
  if tri === FORCE_ON  return true
  return loadAppSettingsLocal().expertAiDecydentEnabled === true
```

### 5.2 Precedence (LOCKED)

```text
LS "0"  >  LS "1"  >  AppSettings.expertAiDecydentEnabled  >  false
```

### 5.3 Test overrides (LOCKED)

Istniejące `force*ForTests` pozostają — **nadpisują** cały resolver (harness only).

---

## 6. Coupling (LOCKED)

```text
AppSettings ON (effective)
  → Chief Session
  → Dossier UI
  → Expert Workspace          (gate = Session — bez nowej flagi)
  → Decision Workspace        (gate = Decision ∧ Session)
  → Decision Persist          (gate = Decision Host — bez zmian API)
```

| Reguła | |
|--------|--|
| Decision effective ⇒ Session effective | **MUST** |
| Decision Workspace aktywny bez Session | **ZAKAZ** |
| Expert Workspace osobna flaga | **ZAKAZ** |

---

## 7. Readiness (LOCKED — NO CHANGE)

Warunek startu Chief (już w Session engine + hook) — **NIE zmieniać**:

```text
readyForChiefInput
  ⇔ OfferBoq != null ∧ OfferBoq.lines.length > 0
    ∧ pricing catalog available ∧ company available

pricingReady
  ⇔ pricingReadyPartial === true ∨ pricingReadyFinal === true

runChief allowed ⇔ readyForChiefInput ∧ pricingReady
```

Jeżeli niespełnione → **NIE** `runChief` · error `not_ready_for_chief_input` / `pricing_not_ready`.

**Session `engine.ts`:** **NO TOUCH** w tym EPIC (enablement wyłącznie w flag resolvers + thin page/Host wire).

---

## 8. Fail-soft (LOCKED)

| Stan | Zachowanie |
|------|------------|
| `not_ready` / `not_ready_for_chief_input` | Dossier phase `not_ready` · istniejący copy |
| `pricing_not_ready` | Dossier phase `not_ready` · istniejący copy |
| `no_dossier` | **bez** pełnego Actions / Findings / Recommendation shell |
| blocked / error / process_running | istniejące phases Decision VM |

**Zakaz:** pusty Actions shell · sztuczny progress · auto-rerun · zmiany domenowe · crash.

### 8.1 Decision Host mount (LOCKED)

| Warunek | Host |
|---------|------|
| Session effective **OFF** | **nie przekazywać** session / **nie montować** Decision Host |
| Session ON ∧ Decision OFF | Host nie renderuje surface (`hidden`) |
| Session ON ∧ Decision ON ∧ tab ≠ `przetarg` | null (jak dziś) |
| Session ON ∧ Decision ON ∧ tab `przetarg` | Host ON |

### 8.2 Decision surface visibility (LOCKED)

Render pełnego shell (Actions/Findings/Recommendation) **tylko** gdy `uiPhase` ∈:

```text
process_running | process_blocked | ready_for_decision | decision_recorded | error
```

Gdy `uiPhase === "no_dossier"` **lub** `hidden`: **brak** Actions shell (Host return null **lub** wyłącznie opcjonalny one-liner status — **preferowane: return null**).

---

## 9. Persist (LOCKED)

| | |
|--|--|
| P0 | **local-first** `kw-decision-persist-v1` — **NO TOUCH** API/store |
| Cloud sync | **OUT** |
| Wire Persist | wyłącznie istniejący `DecisionWorkspaceHost` |

---

## 10. Admin UI (LOCKED)

| | |
|--|--|
| Panel | **REUSE** `AdminSettingsModal` · sekcja **Moduły** |
| Nowy panel | **ZAKAZ** |
| Rola | Super Admin only (jak pozostałe toggle Moduły) |
| Persist | `saveAppSettings(next)` |

---

## 11. Rollout policy (LOCKED)

| Etap | Policy |
|------|--------|
| **P0 tip po IMPLEMENT** | `expertAiDecydentEnabled` default **`false`** · code DEFAULT legacy **false** |
| **Production enable** | Super Admin ustawia AppSettings **true** (org-wide via AppSettings sync) |
| **Emergency OFF** | AppSettings false **lub** LS `"0"` |
| **OV / smoke** | LS `"1"` (controlled) |
| **P1 default ON w kodzie** | **OUT** tego EPIC — osobny Owner GO |

---

## 12. Owner Verification override (LOCKED)

| Override | Użycie |
|----------|--------|
| LS `"1"` | Owner QA / smoke gdy AppSettings jeszcze OFF |
| LS `"0"` | kill natychmiastowy niezależnie od AppSettings |
| Po QA | usunąć LS override · polegać na AppSettings |

---

## 13. 8 LOCK (LOCKED)

| # | LOCK | DF |
|---|------|-----|
| 1 | Expert BC | **NO TOUCH** |
| 2 | Chief BC | **NO TOUCH** |
| 3 | Validation BC | **NO TOUCH** |
| 4 | Session engine (`engine.ts`) | **NO TOUCH** — enablement tylko `flag.ts` + thin page wire |
| 5 | Wire Adapters | **NO TOUCH** |
| 6 | Technology Foundation | **NO TOUCH** |
| 7 | OfferBoq | **NO TOUCH** (write) |
| 8 | Bid / TRE-01 | **NO TOUCH** |

**Session hook / Host / view-model Decision:** dozwolony **wyłącznie** thin enablement visibility/mount — zero domain calc.

---

## 14. REUSE FIRST · ZERO DUPLICATE (LOCKED)

### 14.1 REUSE

| Artefakt | |
|----------|--|
| AppSettings + merge + Admin Moduły | jak `wmRysunkiEnabled` |
| `isChiefOrchestratorSessionEnabled` / `isDecisionWorkspaceEnabled` | rozszerzenie resolvera |
| Readiness Session engine | bez zmian |
| Decision Persist Host | bez zmian API |
| Expert Workspace gate = Session | bez nowej flagi |

### 14.2 ZERO DUPLICATE

| Zakaz | |
|-------|--|
| Trzeci LS master key | |
| Drugi panel ustawień | |
| Drugi readiness checker | |
| Duplikat AppSettings boolean pod inną nazwą | |
| Cloud Persist w P0 | |

---

## 15. Acceptance Criteria AC1–AC16 (LOCKED)

| AC | Kryterium |
|----|-----------|
| **AC1** | Master gate = `AppSettings.expertAiDecydentEnabled` · Super Admin Moduły |
| **AC2** | ZERO nowego systemu flag · ZERO nowego LS master |
| **AC3** | Precedence: `"0"` > `"1"` > AppSettings > false |
| **AC4** | Decision effective ⇒ Session effective |
| **AC5** | Default `expertAiDecydentEnabled = false` |
| **AC6** | LS `"0"` = FORCE OFF (kill-switch) |
| **AC7** | Readiness REUSE: OfferBoq lines ∧ (partial∨final) |
| **AC8** | Brak `runChief` gdy readiness niespełnione |
| **AC9** | Fail-soft: `not_ready` · `pricing_not_ready` · `no_dossier` (bez pustego Actions shell) |
| **AC10** | Decision Host nie aktywny przy Session OFF |
| **AC11** | Persist local-first · Cloud OUT |
| **AC12** | ZERO diff Expert/Chief/Validation/Adapters/TF/OfferBoq/Bid BC · Session engine NO TOUCH |
| **AC13** | LS `"1"` = OV force ON (controlled) |
| **AC14** | AppSettings persist/merge REUSE `kw-app-settings` |
| **AC15** | Harness enablement PASS + regresja Session/DW/Persist/EW/Validation |
| **AC16** | Owner QA Q1–Q12 PASS · diff ⊆ allowlist §18 |

---

## 16. Owner QA matrix Q1–Q12 (LOCKED)

| ID | Scenariusz | Oczekiwanie |
|----|------------|-------------|
| **Q1** | Happy path: AppSettings ON · OfferBoq lines · pricing ready · tab Przetarg | Session→Dossier→EW→Validation→Decision→Persist · hydrate OK |
| **Q2** | Pricing **partial** only | start dozwolony (partial∨final) · brak fałszywego `pricing_not_ready` |
| **Q3** | Pricing **final** (z/bez partial) | start dozwolony · happy path możliwy |
| **Q4** | **not_ready** (brak OfferBoq lines) | **bez** `runChief` · phase/error not_ready |
| **Q5** | **pricing_not_ready** (brak partial i final) | **bez** `runChief` · pricing_not_ready |
| **Q6** | **no_dossier** (Session ON, brak dossier) | **brak** pustego Actions shell |
| **Q7** | AppSettings **OFF** (bez LS override) | Session+Decision OFF · surfaces brak |
| **Q8** | AppSettings **ON** | Session+Decision ON (gdy brak LS `"0"`) |
| **Q9** | LS **`"0"`** (Session i/lub Decision) przy AppSettings ON | FORCE OFF wskazanej powierzchni; Session `"0"` ⇒ Decision też OFF |
| **Q10** | LS **`"1"`** przy AppSettings OFF | FORCE ON (OV) zgodne z coupling |
| **Q11** | Decision bez Session (próba: Decision `"1"` + Session `"0"` / AppSettings OFF+Decision `"1"`) | Decision **OFF** (coupling) |
| **Q12** | Refresh / Decision Persist hydration | latest record · `decision_recorded` · fingerprint mismatch → null |

> **Q12 FIX note (2026-08-09):** Case identity is content-stable across reloads; wall-clock assembly time is not an identity source. See [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md) · [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-IMPLEMENT.md).

---

## 17. Slices S0–S8 (LOCKED)

| Slice | Treść | Done when |
|-------|-------|-----------|
| **S0** | `AppSettings.expertAiDecydentEnabled` + default false + merge | typ/load/save |
| **S1** | Resolver Session `flag.ts` (precedence) | AC3/AC6/AC13 Session |
| **S2** | Resolver Decision `flag.ts` + coupling | AC4/AC11 Decision |
| **S3** | AdminSettingsModal toggle Moduły | AC1/AC14 |
| **S4** | Thin wire: Decision Host tylko gdy Session ON | AC10 |
| **S5** | Thin visibility: brak Actions shell przy `no_dossier`/`hidden` | AC9/Q6 |
| **S6** | Harness `scripts/test-expert-ai-production-enablement-01.mjs` | AC15 partial |
| **S7** | Regresja: Persist · DW · Session · EW · Validation · Adapters smoke | PASS |
| **S8** | Owner QA Q1–Q12 · IMPLEMENT report · allowlist verify | READY FOR OV |

---

## 18. Allowlist (LOCKED)

### 18.1 Thin touch

| Plik | Limit |
|------|-------|
| `src/lib/app-settings.ts` | pole + default + merge helpers |
| `src/app/AdminSettingsModal.tsx` | jeden toggle w Moduły |
| `src/lib/chief-session/flag.ts` | resolver AppSettings + precedence |
| `src/lib/decision-workspace-ui/flag.ts` | resolver + coupling Session |
| `src/app/TenderDetailPage.tsx` | warunek `chiefSessionForDecision` tylko gdy Session ON |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` **i/lub** `src/lib/decision-workspace-ui/view-model.ts` | wyłącznie visibility `no_dossier`/hidden — zero domain |
| `scripts/test-expert-ai-production-enablement-01.mjs` | nowy harness |

### 18.2 Docs (Owner / osobny commit docs)

`docs/architecture/EXPERT-AI-PRODUCTION-ENABLEMENT-01-*` · tip SSOT po CLOSEOUT

### 18.3 NO TOUCH

| Path |
|------|
| `src/lib/*-expert/**` |
| `src/lib/chief-orchestrator/**` |
| `src/lib/chief-session/engine.ts` · session poza `flag.ts` |
| `src/lib/validation-expert/**` |
| `src/lib/chief-wire-adapters/**` |
| `src/lib/technology-foundation/**` |
| `src/lib/decision-persist/**` (API/store) |
| OfferBoq / Bid write · TRE libs |
| Nowy panel Admin · nowy LS master |

---

## 19. Test matrix (LOCKED)

| Suite | Cel |
|-------|-----|
| `test-expert-ai-production-enablement-01.mjs` | precedence · coupling · defaults · AppSettings mock |
| `test-wire-chief-session-01.mjs` | regresja Session |
| `test-decision-workspace-01.mjs` | regresja DW |
| `test-decision-persist-01.mjs` | regresja Persist |
| `test-expert-workspace-01.mjs` | regresja EW |
| `test-validation-expert-01.mjs` | regresja Validation |
| `test-wire-chief-ro-adapters-01.mjs` | regresja Adapters (NO TOUCH proof) |

---

## 20. Anti-patterns (FAIL IMPLEMENT)

1. Nowy LS `kw-expert-ai-*` master.  
2. Drugi system flag / drugi panel ustawień.  
3. Flip code DEFAULT true bez AppSettings.  
4. Decision ON przy Session OFF.  
5. Zmiana `engine.ts` readiness / LOOP.  
6. Cloud Persist / Audit Hub.  
7. Pusty Actions shell przy `no_dossier`.  
8. Auto-rerun / domain calc w enablement.  
9. Touch Expert/Chief/Validation/Adapters/TF/OfferBoq/Bid.  
10. Omijanie precedence `"0"`.

---

## 21. Residual OUT P0

| Temat | |
|-------|--|
| Code/tip default ON | P1 + Owner GO |
| Cloud Decision Persist | P1 |
| Audit Hub adapter | P1 |
| Mostek `kw-tender-decisions` | osobny DF Dual Outcome |

---

## 22. Verdict

```text
════════════════════════════════════════════════════════
EXPERT-AI-PRODUCTION-ENABLEMENT-01 — DESIGN FREEZE COMPLETE

AppSettings.expertAiDecydentEnabled (default false)
Precedence: "0" > "1" > AppSettings > false
Coupling: Decision ⇒ Session
Readiness REUSE · Fail-soft REUSE · Persist local-first
Session engine NO TOUCH · Stack BC NO TOUCH
AC1–AC16 · Q1–Q12 · S0–S8 · allowlist LOCKED

READY FOR IMPLEMENT
════════════════════════════════════════════════════════
```

**Następny krok:** Owner GO → **IMPLEMENT** (S0→S8) — bez wychodzenia poza allowlist i LOCK.

Bez kodu · bez commit · bez push.
