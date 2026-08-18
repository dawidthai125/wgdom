# IK AUTONOMY-08 P1 — Settings Unification · AUDIT

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT` |
| **Status** | **AUDIT COMPLETE** · **NO DESIGN FREEZE** · **NO IMPLEMENT** |
| **Date** | 2026-08-17 |
| **Mode** | AUDIT ONLY · REUSE FIRST · **ZERO CODE** · **ZERO SETTINGS WRITE** · **ZERO UI** · **ZERO COMMIT** |
| **Prior slice** | **08-P0 = COMPLETE / CLOSED** · PRODUCTION VERIFIED |
| **Production** | **2.66.93** / **`b98e68e5`** · docs **`43ef9f64`** |
| **P0 contract** | VERIFIED · P2 RUNTIME **NOT OBSERVABLE** (`ikEntryEnabled=false` · no settings write) |
| **PLAN (prior)** | [`IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md`](./IK-AUTONOMY-08-UNIFIED-TENDER-WORKFLOW-PLAN.md) § 6–8 |

```text
P0                     = COMPLETE / CLOSED
P1                     = AUDIT ONLY
AUDIT                  = COMPLETE
CODE / SETTINGS / UI   = ZERO
COMMIT / PUSH / DEPLOY = NOT DONE
08-P1 IMPLEMENT        = NOT AUTHORIZED
EPIC                   = AUTONOMY-08 — P1 AUDIT
```

**Cel P1 (Owner):** zwykły Admin widzi **Przetargi / IK = WŁĄCZONE | WYŁĄCZONE**. P3–P8, Research, leftover AUTO_INGEST **nie** są funkcjami biznesowymi. To etapy jednego workflow IK + kill-switche awaryjne.

---

## 1. Current Settings Inventory

Źródło: `AppSettings` / `kw-app-settings` · `src/lib/app-settings.ts`.  
**Nowa flaga nie istnieje i nie jest proponowana w tym audycie.**

| Key | Type | Code default | Live KV (P0 PV, READ) | Merge |
|-----|------|--------------|------------------------|-------|
| `tendersTabForStaffEnabled` | boolean | `false` | (not dumped; staff Przetargi) | remote explicit |
| `expertAiDecydentEnabled` **(D)** | boolean | `false` | **`true` PRE-EXISTING** | remote explicit |
| `ikEntryEnabled` | boolean | **`true`** (P10) | **`false`** | remote explicit |
| `ikAutoIngestEnabled` | boolean | `false` | **`true` leftover** | remote explicit · **not P2 gate** |
| `ikIdentityCoverageEnabled` | boolean | `false` | **`true` PRE-EXISTING** | remote explicit |
| `ikChiefWiringEnabled` | boolean | `false` | (P0 dump omitted; default OFF) | remote explicit |
| `ikLaborE2eEnabled` | `"AUTO"\|"OFF"\|"ON"` | `"AUTO"` | (B-POLICY; A05) | OFF wins |
| `ikLaborResearchEnabled` | boolean | `false` | **`false`** | remote explicit · Research `=== true` |
| `ikMaterialE2eEnabled` | `"AUTO"\|"OFF"\|"ON"` | `"AUTO"` | (B-POLICY; A05) | OFF wins |
| `ikMaterialResearchEnabled` | boolean | `false` | **`false`** | remote explicit · Research `=== true` |
| `ikF5E2eEnabled` | `"AUTO"\|"OFF"\|"ON"` | `"AUTO"` | **`"AUTO"`** | OFF wins |
| `ikRiskDecisionE2eEnabled` | `"AUTO"\|"OFF"\|"ON"` | `"AUTO"` | **`"AUTO"`** | OFF wins |

Poza zakresem IK (ten sam modal ⚙, nie P1): `workCatalogForAdminEnabled`, `instructionsForAdminEnabled`, `changesForAdminEnabled`, `wmRysunkiEnabled`, `wmWorkerSketchEnabled`, `catalogWriteMode`, BZP scan, NG11 pipeline perf.

B-POLICY (A05–A07, LOCKED): stored `true`→ON · `false`/missing/malformed→AUTO · merge **OFF wins**. Research **nigdy** z raw enum.

---

## 2. Current Admin UI Inventory

**Kto widzi ⚙:** wyłącznie `adminIsSuperAdmin` (`AdminTopbar.tsx`). Rola Administrator / Moderator **nie** otwiera `AdminSettingsModal`.

Sekcja **Moduły** (`AdminSettingsModal.tsx`) — kolejność:

| UI | `data-*` | Control | Label |
|----|----------|---------|-------|
| Przetargi (staff) | — | checkbox | `tendersTabForStaffEnabled` |
| Rysunki WM | — | checkbox | (nie IK) |
| Szkice pracownika | — | checkbox | (nie IK) |
| Expert AI · Przebieg i Decydent | `data-expert-ai-decydent-toggle` | checkbox | **D** |
| Inteligentny Kosztorysant | `data-ik-entry-toggle` | checkbox | **IK Entry** · copy Documents→BOQ (08-P0) |
| ~~AUTO_INGEST~~ | ~~`data-ik-auto-ingest-toggle`~~ | **USUNIĘTY 08-P0** | leftover key remains |
| IDENTITY_COVERAGE (P3) | `data-ik-identity-coverage-toggle` | checkbox | |
| CHIEF WIRING (P4) | `data-ik-chief-wiring-toggle` | checkbox | |
| LABOR E2E (P5 MODE A) | `data-ik-labor-e2e-toggle` / `-mode` | select AUTO/ON/OFF | confirm on OFF |
| LABOR RESEARCH (P5 MODE B) | `data-ik-labor-research-toggle` | checkbox | |
| MATERIAL E2E (P6 MODE A) | `data-ik-material-e2e-toggle` / `-mode` | select | confirm on OFF |
| MATERIAL RESEARCH (P6 MODE B) | `data-ik-material-research-toggle` | checkbox | |
| F5 E2E (P7) | `data-ik-f5-e2e-toggle` / `-mode` | select | confirm on OFF |
| RISK/DECISION (P8) | `data-ik-risk-decision-e2e-toggle` / `-mode` | select | confirm on OFF |

**Fakt:** „milion przełączników” jest dziś w **Super Admin ⚙**, nie w UI zwykłego Administratora. Zwykły Admin **nie ma** własnego przełącznika IK — dziedziczy `kw-app-settings`.

Harnessy A05–A07 / P1-entry / P3 szukają `data-ik-*`. Ukrycie bez zachowania atrybutów = regresja testów (PLAN § 6).

---

## 3. Runtime Consumers

| Setting / helper | Consumer | Effect when IK Entry ON |
|------------------|----------|-------------------------|
| `isIkEntryEnabled()` | `TenderDetailPage` | mount `IkEntryHost` gdy `activeTab === "przetarg"` |
| `isIkP2DocumentsBoqActive()` | `IkEntryHost` `useEffect` | Documents→BOQ · **= Entry only** (08-P0) |
| `isIkIdentityCoverageEnabled()` | `IkEntryHost` `useMemo` | P3 diagnostic coverage · **extra AND** |
| `isIkP4ChiefWiringPreferenceActive()` / `isIkP4ChiefSessionEligible()` | `TenderDetailPage` | Chief T1–T6 **OR** D path · **extra AND** + `pricingReady` |
| `isIkP5LaborE2eActive()` | `IkEntryHost` | Labor MODE A · Entry ∧ AUTO\|ON |
| `isIkP5LaborExecuteResearchActive()` | `IkEntryHost` | `executeResearch: p5ResearchOn === true` |
| `isIkP6MaterialE2eActive()` | `IkEntryHost` | Material MODE A |
| `isIkP6MaterialExecuteResearchActive()` | `IkEntryHost` | Material MODE B HTTP |
| `isIkP7F5E2eActive()` | `IkEntryHost` `useMemo` | P7 READ-ONLY bid calc |
| `isIkP8RiskDecisionE2eActive()` | `IkEntryHost` `useMemo` | P8 READ-ONLY risk/DW prepare |
| Composite | `IkEntryHost` | P5 ∧ P6 · **no extra flag** |
| `isIkAutoIngestEnabled()` | **not** host (08-P0) | leftover reader; tree-shaken from live TendersModule |
| D `expertAiDecydentEnabled` | Dual Outcome / Chief stack | **osobny hard-stop** · IK ≠ D |

Compile sentinels `IK_ENTRY_SHELL_* = false` **nie** są AND-owane z helperami P2 (08-P0).

---

## 4. Classification

| Setting | Class |
|---------|--------|
| `tendersTabForStaffEnabled` | **Business control** — dostęp staff do modułu Przetargi (Super Admin always bypass) |
| `ikEntryEnabled` | **Business master** + **host kill-switch** — jedyny właściwy IK ON/OFF |
| `ikAutoIngestEnabled` | **Legacy leftover** — nie steruje P2 |
| `ikIdentityCoverageEnabled` | **Capability / diagnostic** — nie Owner Gate tożsamości |
| `ikChiefWiringEnabled` | **Technical / scoped Chief-under-IK** — ≠ D |
| `ikLaborE2eEnabled` / `ikMaterialE2eEnabled` | **Internal stage + emergency OFF** (A05) |
| `ikLaborResearchEnabled` / `ikMaterialResearchEnabled` | **Research MODE B capability** — nie decyzja biznesowa Accept |
| `ikF5E2eEnabled` / `ikRiskDecisionE2eEnabled` | **Internal stage + emergency OFF** (A06/A07) |
| `expertAiDecydentEnabled` | **Hard-stop D** — **out of P1 semantics** |
| Accept / Price Commit / Final Bid | **Owner Gates** — **brak** toggle w AppSettings |
| Identity GAP (zawór / KEEP GAP) | **Owner Gate (produkt)** — dziś silnik GAP, **nie** osobny setting |

---

## 5. Redundant / Legacy Settings

| Item | Verdict |
|------|---------|
| `ikAutoIngestEnabled` | **Redundant as UI** (already removed). **Keep key** (no KV migration). |
| P5/P6/P7/P8 jako „funkcje biznesowe” | **Redundant w UI** po A05–A07 + 08-P0 — to etapy IK, nie produkty |
| Osobny checkbox P2 | **Gone** |
| `isIkAutoIngestEnabled()` as gate | **Gone** (08-P0) |
| Nowa flaga `ikUnified` / `ikMasterAutonomous` | **MUST NOT create** |

P3 i P4 **nie** są leftover w runtime — nadal **extra AND**. Ukrycie UI **bez** zmiany helpera **nie** włączy P3/P4 automatycznie przy IK ON (P3 live KV już `true`; P4 default `false`).

---

## 6. Technical Kill-Switches

Zachować w KV / kodzie, **nie** eksponować w codziennym UI:

| Kill | How |
|------|-----|
| Cały IK | `ikEntryEnabled=false` → brak hosta → P2–P8 nie startują |
| P5/P6/P7/P8 stage | enum `"OFF"` (OFF wins merge · confirm już w UI) |
| Research HTTP | boolean **not** `=== true` |
| D | `expertAiDecydentEnabled` + legacy LS `"0"` (TM-01) · **nie ruszać w P1** |
| Compile sentinels | `IK_ENTRY_SHELL_*` |

Rollback bez UI: Super Admin ⚙ **sekcja zaawansowana** (propozycja) albo bezpośredni zapis KV przez istniejący `saveAppSettings` — **bez** nowego systemu ustawień.

---

## 7. Business Controls

Docelowo **widoczne** (Owner):

```text
PRZETARGI    [ WŁĄCZONE | WYŁĄCZONE ]   = tendersTabForStaffEnabled
             (Super Admin i tak wchodzi)

IK           [ WŁĄCZONE | WYŁĄCZONE ]   = ikEntryEnabled
```

IK ON (po 08-P0 + A05–A07, **bez** zmiany silników) już pociąga:

- Documents→BOQ
- P5/P6 MODE A jeśli enum AUTO/ON (prod default AUTO)
- P7 bid calc jeśli AUTO/ON
- P8 prepare jeśli AUTO/ON
- Composite gdy P5∧P6

**Nie** pociąga samo z siebie (dziś):

- Research MODE B (checkbox `false`)
- P4 Chief-under-IK (preference default `false`; D path osobno)
- Accept / Price Commit / Final Bid (Owner Gates, nie settings)

---

## 8. Owner Gates

**Nie są ustawieniami ⚙.** Nie implementować w P1.

| Gate | Dziś | Owner intent |
|------|------|----------------|
| Research-on-miss | checkbox MODE B `=== true` | IK może Research przy PRICE MISS · **nie** samowolna decyzja biznesowa |
| Accept | `acceptWorkRateResearchCandidate` / `acceptMaterialResearchCandidate` — **nie** w `IkEntryHost` | Admin AKCEPTUJĘ / NIE / PRZELICZ |
| Price Commit | `commitMarketQuotesImport` — Catalog / Market Sync, **nie** IK host | część Owner Gate ceny |
| Final Bid | `recordDecision` w Decision Workspace · P8 tylko **prepare** | AKCEPTUJĘ / ODRZUCAM / PRZELICZ |
| Identity GAP | P2 KEEP GAP w klasyfikacji · P3 coverage = diagnostyka | jasny komunikat · propozycja + źródło · Accept albo zmiana ceny · **no silent substitute** |
| D / Chief | `expertAiDecydentEnabled` | **P1 nie zmienia semantyki D** |

P1 = **ukrycie dźwigni etapów**, nie budowa tych bramek.

---

## 9. Super Admin-only Controls

Już SA-only: cały modal ⚙.

Propozycja warstw (AUDIT, nie DF):

| Warstwa | Kto | Co |
|---------|-----|-----|
| **Codzienne Moduły** | Super Admin (dziś jedyny ⚙) | Przetargi + IK + (D osobno, nie ruszać) + WM nie-IK |
| **Zaawansowane / emergency** | Super Admin only | P3, P4, P5–P8 AUTO/OFF/ON, Research MODE B |
| **Zwykły Administrator** | dziś **brak ⚙** | Owner Decision: czy dostać **uproszczony** Przetargi/IK, czy nadal tylko Super Admin steruje tenant-wide KV |

Techniczne kill-switche **nie** w „normalnym” widoku Moduły.

---

## 10. Proposed Single IK Control

**REUSE `ikEntryEnabled`.** Nie nowy klucz.

```text
isIkP2DocumentsBoqActive     := ikEntryEnabled === true          // LOCKED 08-P0
isIkP5LaborE2eActive         := Entry ∧ mode ∈ {AUTO, ON}       // KEEP
isIkP7F5E2eActive            := Entry ∧ mode ∈ {AUTO, ON}       // KEEP
isIkP8RiskDecisionE2eActive  := Entry ∧ mode ∈ {AUTO, ON}       // KEEP
Research                     := Entry ∧ MODE A ∧ research === true  // KEEP until later slice
```

**Jeden switch bez zmiany silników: TAK** dla P2 + MODE A P5/P6 + P7 + P8, **o ile** enumy zostają AUTO (stan prod).

**NIE** wystarczy sam hide UI, żeby:

- włączyć Research-on-miss (wymaga późniejszego call-site / Owner GO),
- włączyć P4 Chief-under-IK (preference OFF),
- zbudować Accept / Final Bid UX,
- zmienić D.

---

## 11. Migration Risk

| Risk | Level | Note |
|------|-------|------|
| KV migration / delete leftover ingest | **FORBIDDEN** | 08-P0 leftover |
| Hide UI, leave keys | **LOW** | zamierzony 08-P1 |
| Hide + strip `data-ik-*` | **HIGH** | harness A05–A07 / P3 |
| Flip live `ikEntryEnabled` | **OUT** | nie w P1 |
| Treat hide as “Research AUTO” | **HIGH** | zmiana kontraktu MODE B |
| Fold P4 into IK ON | **MED** | helper change · Chief ≠ D |
| New settings store | **FORBIDDEN** | |

Live leftover `ikAutoIngestEnabled=true` **nie** aktywuje P2 (dowód P0). Ukrycie P3 przy live `ikIdentityCoverageEnabled=true` **zostawi diagnostykę włączoną** w runtime.

---

## 12. Backward Compatibility

- Load/merge/B-POLICY **UNCHANGED**.
- Enum `"AUTO"\|"OFF"\|"ON"` **UNCHANGED**.
- `saveAppSettings` nadal serializuje pełny obiekt (w tym leftover).
- Super Admin musi móc ustawić stage OFF bez nowego API.
- Staff Przetargi: `adminCanViewTendersTab` **UNCHANGED**.

---

## 13. Safety Invariants

P1 **nie może** naruszyć:

| Lock | Status |
|------|--------|
| D | **false** code default · live `true` PRE-EXISTING · **no flip** |
| P1 invoice | **CLOSED** · `mat.inv.*` |
| P2 identity | **KEEP GAP** |
| Composite | **CLOSED** |
| P7 / P8 engines | **UNCHANGED** |
| A05 / A06 / A07 | **CLOSED** |
| CatalogWork | **471** |
| 08-P0 P2 gate | Entry-only · leftover not a gate |
| no new engine / flag / orchestrator / bypass / `\|\| true` | |

---

## 14. Affected Files

**Gdy Owner GO na implementację hide-only (nie teraz):**

| File | Likely touch |
|------|----------------|
| `src/app/AdminSettingsModal.tsx` | ukryć / zwinąć P3–P8 · zachować `data-*` |
| Harnessy `scripts/test-ik-autonomy-05/06/07*.mjs` · P3 | tylko jeśli znikną `data-*` |
| `changelog-data.ts` | gdy UI widoczne |

**Nie ruszać w P1 (nawet po GO hide):** `app-settings.ts` (klucze), `ik-entry-flag.ts` (helpery), `IkEntryHost.tsx` (silniki), `ik-ng02-ingest-bridge.ts`, P5–P8 engines, D, KV schema.

---

## 15. Reuse Plan

1. **REUSE** `ikEntryEnabled` jako jedyny biznesowy IK switch.  
2. **REUSE** `tendersTabForStaffEnabled` jako Przetargi staff.  
3. **REUSE** `adminIsSuperAdmin` na ⚙ i na ewentualną sekcję zaawansowaną.  
4. **REUSE** `isIkE2eModeActive` / `normalizeIkE2eMode` / OFF wins — zero nowego parsera.  
5. **REUSE** istniejące Owner Gate APIs (`accept*`, `recordDecision`) — **nie** w tym slisie.  
6. **Nie** budować drugiego AppSettings / LS / Feature Flags service.

Ukrycie: `hidden` / accordion „Zaawansowane IK” wokół **istniejących** kontrolek.

---

## 16. What MUST NOT change

- Silniki P2 ingest / Document Expert / Labor / Material / P7 / P8 / Composite  
- Semantyka D / Chief Dual Outcome  
- Research `=== true` (dopóki Owner GO na Research-on-miss)  
- P2 KEEP GAP / P1 `mat.inv.*`  
- Merge B-POLICY  
- Live KV w tej turze  
- `git add -A` / unrelated WIP  

---

## 17. Open Owner Decisions

| ID | Question | Default if unspecified |
|----|----------|------------------------|
| **OD-P1-A** | Czy zwykły Administrator dostaje **nowy** uproszczony UI Przetargi/IK, skoro dziś nie ma ⚙? | **Nie** w pierwszym hide — tylko schować dźwignie w istniejącym Super Admin ⚙ |
| **OD-P1-B** | P3–P8: `display:none` w Modułach vs accordion „Zaawansowane” (SA)? | Accordion SA — zachowuje emergency OFF |
| **OD-P1-C** | Zachować `data-ik-*` na ukrytych kontrolkach? | **TAK** (harness) |
| **OD-P1-D** | P4 Chief-under-IK: zostaje OFF (internal) czy kiedyś część IK ON? | **Zostaje OFF** w P1 · nie foldować w Entry |
| **OD-P1-E** | Research-on-miss: poza P1? | **TAK** — osobny slice po hide UI |
| **OD-P1-F** | D checkbox zostaje w Modułach (osobny hard-stop)? | **TAK** — P1 nie rusza D |
| **OD-P1-G** | Live P3 `ikIdentityCoverageEnabled=true`: zostawić po hide? | **Zostawić** (no KV write) · diagnostyka nie jest Owner Gate |

---

## 18. Recommended Next Stage

**Następny po OWNER REVIEW:** Design Freeze **tylko hide/accordion UI** (08-P1 implement) — **jeśli** Owner zatwierdzi OD-P1-A/B/C.

Nie startować w DF:

- Research-on-miss  
- Accept / Recalculate / Price Commit / Final Bid UX  
- Identity Gap Owner Gate copy  
- P4 fold-into-IK  
- D / Chief  
- nowa flaga  

```text
RECOMMENDED NEXT = DESIGN FREEZE 08-P1 (UI hide / SA advanced)
                 ONLY AFTER OWNER REVIEW + GO
IMPLEMENT        = NOT NOW
```

---

## Status

```text
AUDIT                  = COMPLETE
CODE                   = ZERO
SETTINGS               = ZERO
BUSINESS WRITES        = ZERO
RESEARCH               = ZERO
COMMIT                 = NOT DONE
PUSH                   = NOT DONE
DEPLOY                 = NOT DONE
P1                     = AUDIT ONLY
P0                     = COMPLETE / CLOSED
08-P1 IMPLEMENT        = WAITING OWNER REVIEW
```
