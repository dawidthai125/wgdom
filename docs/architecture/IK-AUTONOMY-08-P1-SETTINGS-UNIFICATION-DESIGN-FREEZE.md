# IK AUTONOMY-08 P1 — Settings Unification  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = READY FOR ARCH REVIEW** |
| **Date** | 2026-08-17 |
| **Mode** | DESIGN FREEZE ONLY · **ZERO CODE** · **ZERO UI PATCH** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.93** / **`b98e68e5`** · docs **`43ef9f64`** |
| **AUDIT** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md) |
| **PLAN** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md) |
| **Owner Review** | **PASS** |
| **Slice** | **08-P1 only** — Super Admin ⚙ UI organization · **not** runtime IK |

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture Review        = NOT DONE
Architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Implementation             = NOT AUTHORIZED
Code / UI / Settings       = ZERO
Commit / Push / Deploy     = NOT DONE
EPIC                       = AUTONOMY-08 — P1
```

If PLAN narrative and SOURCE disagree, **SOURCE wins**. This freeze records SOURCE + Owner-locked UI contract.

**08-P1 ≠ full AUTONOMY-08.** Research-on-miss, Accept, Reject, Recalculate, Price Commit, Final Bid, Identity Gap UX, P4 fold-into-IK, D/Chief — **not this DF**.

---

## 0. Purpose

Uporządkować Super Admin ⚙ tak, aby **jedyny biznesowy switch IK** był widoczny od razu, a dźwignie P3–P8 nie wyglądały na osobne produkty.

REUSE: `AdminSettingsModal`, istniejące kontrolki, `ikEntryEnabled`, `saveAppSettings`, `adminIsSuperAdmin`.

**Nie** nowy settings engine, nowa flaga, nowy orchestrator, nowy ekran, nowy panel dla roli `admin`.

---

## 1. Exact current controls inventory (SOURCE · `AdminSettingsModal` · sekcja Moduły)

Kolejność **dziś** (po 08-P0). ⚙ wyłącznie Super Admin (`AdminTopbar` + `adminIsSuperAdmin`).

| # | UI title (SOURCE) | `data-*` | Widget | Key | Class |
|---|-------------------|----------|--------|-----|-------|
| 1 | Przetargi | — | checkbox | `tendersTabForStaffEnabled` | business (staff module) |
| 2 | Rysunki WM | — | checkbox | `wmRysunkiEnabled` | **out of P1** |
| 3 | Szkice pracownika | — | checkbox | `wmWorkerSketchEnabled` | **out of P1** |
| 4 | Expert AI · Przebieg i Decydent | `data-expert-ai-decydent-toggle` | checkbox | `expertAiDecydentEnabled` | **D HARD STOP** · not IK stage |
| 5 | Inteligentny Kosztorysant | `data-ik-entry-toggle` | checkbox | `ikEntryEnabled` | **business IK master** |
| — | ~~AUTO_INGEST~~ | ~~`data-ik-auto-ingest-toggle`~~ | **ABSENT** (08-P0) | `ikAutoIngestEnabled` leftover | **legacy · no UI** |
| 6 | IK · IDENTITY_COVERAGE (P3) | `data-ik-identity-coverage-toggle` | checkbox | `ikIdentityCoverageEnabled` | diagnostic |
| 7 | IK · CHIEF WIRING (P4) | `data-ik-chief-wiring-toggle` | checkbox | `ikChiefWiringEnabled` | technical scoped Chief ≠ D |
| 8 | IK · LABOR E2E (P5 · MODE A) | `data-ik-labor-e2e-toggle` / `data-ik-labor-e2e-mode` | select AUTO/ON/OFF + confirm OFF | `ikLaborE2eEnabled` | internal stage + emergency |
| 9 | IK · LABOR RESEARCH (P5 · MODE B) | `data-ik-labor-research-toggle` | checkbox | `ikLaborResearchEnabled` | Research capability |
| 10 | IK · MATERIAL E2E (P6 · MODE A) | `data-ik-material-e2e-toggle` / `data-ik-material-e2e-mode` | select + confirm OFF | `ikMaterialE2eEnabled` | internal stage + emergency |
| 11 | IK · MATERIAL RESEARCH (P6 · MODE B) | `data-ik-material-research-toggle` | checkbox | `ikMaterialResearchEnabled` | Research capability |
| 12 | IK · F5 / BID (P7 · READ-ONLY) | `data-ik-f5-e2e-toggle` / `data-ik-f5-e2e-mode` | select + confirm OFF | `ikF5E2eEnabled` | internal stage + emergency |
| 13 | IK · RISK / DECISION (P8 · READ-ONLY PREPARE) | `data-ik-risk-decision-e2e-toggle` / `data-ik-risk-decision-e2e-mode` | select + confirm OFF | `ikRiskDecisionE2eEnabled` | internal stage + emergency |

Poza kartą Moduły (ten sam modal, **nie ruszać w P1**): Instrukcja/Zmiany, Developer / NG11 accordion, BZP, Catalog write, pozostałe Super Admin.

---

## 2. Exact controls moving to Technical section

Przenieść **z primary Moduły** do accordion **TECHNICAL / ADVANCED / EMERGENCY** (te same widgety, te same `data-*`, te same `onChange` / `saveAppSettings` / `window.confirm`):

| Control | Key | Role in Technical |
|---------|-----|-------------------|
| P3 Identity Coverage | `ikIdentityCoverageEnabled` | diagnostyka / rollback |
| P4 Chief Wiring | `ikChiefWiringEnabled` | technical scoped · **not** folded into IK ON |
| P5 Labor E2E select | `ikLaborE2eEnabled` | emergency AUTO/ON/OFF |
| P5 Labor Research | `ikLaborResearchEnabled` | MODE B leftover · **semantics unchanged** |
| P6 Material E2E select | `ikMaterialE2eEnabled` | emergency AUTO/ON/OFF |
| P6 Material Research | `ikMaterialResearchEnabled` | MODE B leftover · **semantics unchanged** |
| P7 F5/Bid select | `ikF5E2eEnabled` | emergency AUTO/ON/OFF |
| P8 Risk/Decision select | `ikRiskDecisionE2eEnabled` | emergency AUTO/ON/OFF |

**Kolejność wewnątrz Technical:** P3 → P4 → P5 MODE A → P5 Research → P6 MODE A → P6 Research → P7 → P8 (jak dziś).

---

## 3. Exact controls remaining in primary section

Pozostają **widoczne bez rozwijania** (ta sama karta Moduły):

| Control | Key | Note |
|---------|-----|------|
| Przetargi | `tendersTabForStaffEnabled` | biznesowy switch modułu staff |
| Rysunki WM | `wmRysunkiEnabled` | poza IK · **no copy/layout change required** |
| Szkice pracownika | `wmWorkerSketchEnabled` | poza IK · **no change required** |
| Expert AI · Przebieg i Decydent | `expertAiDecydentEnabled` | **D** · HARD STOP · **copy/widget UNCHANGED** |
| Inteligentny Kosztorysant | `ikEntryEnabled` | **jedyny biznesowy IK ON/OFF** · copy per §5 |

**Nie wraca:** AUTO_INGEST checkbox.

---

## 4. Exact UI hierarchy

Jeden istniejący kontener Moduły (`AdminSettingsModal` · karta `bg-sky-500/5`). **Nie** nowa karta, **nie** nowy ekran, **nie** dashboard.

```text
AdminSettingsModal
  … (ACL / inne sekcje UNCHANGED)
  Moduły                          ← existing card
    Przetargi                     ← primary
    Rysunki WM                    ← primary
    Szkice pracownika             ← primary
    Expert AI · Przebieg i Decydent   ← primary · D
    Inteligentny Kosztorysant     ← primary · IK ON/OFF
    ▶ TECHNICAL / ADVANCED / EMERGENCY   ← collapsed by default
        P3 Identity Coverage
        P4 Chief Wiring
        P5 Labor E2E + Labor Research
        P6 Material E2E + Material Research
        P7 F5/Bid
        P8 Risk/Decision
  Developer / NG11                ← UNCHANGED (osobna karta amber)
```

Accordion IK Technical **nie** jest częścią karty Developer / NG11.

---

## 5. Labels / copy (LOCKED)

### 5.1 Primary IK (business)

| Slot | Frozen text |
|------|-------------|
| Title | `Inteligentny Kosztorysant` (REUSE existing title) |
| Control | existing **checkbox** · checked = ON · unchecked = OFF · **no new widget** |
| Description (SSOT) | `Steruje działaniem Inteligentnego Kosztorysanta w przetargach.` |

Dozwolona **jedna** dodatkowa linia muted (opcjonalna, nie zamiast SSOT):

`Włączenie uruchamia autonomiczny przebieg analizy. Wyłączenie zatrzymuje automatyzację IK.`

**Zakaz** w primary:

- lista „włącz P5 / P6 / P7 / P8”,
- sugerowanie, że każdy etap trzeba włączyć ręcznie,
- przywracanie copy AUTO_INGEST.

08-P0 copy „od dokumentów i przygotowania BOQ” **zastąpić** powyższym SSOT (IK obejmuje już etapy A05–A08, nie tylko Documents→BOQ).

### 5.2 Technical accordion chrome

| Slot | Frozen text |
|------|-------------|
| Header | `TECHNICAL / ADVANCED / EMERGENCY` |
| Badge | `⚠ Technical / Emergency` |
| Intro (when expanded) | `Nie są codziennym workflow. Diagnostyka, rollback i awaryjne wyłączenie etapów. IK nie wymaga ręcznego włączania każdego etapu.` |

### 5.3 Technical control titles

**REUSE** existing titles (identyfikatory diagnostyczne, nie CTA biznesowe):

- `IK · IDENTITY_COVERAGE (P3)`
- `IK · CHIEF WIRING (P4)`
- `IK · LABOR E2E (P5 · MODE A)`
- `IK · LABOR RESEARCH (P5 · MODE B)`
- `IK · MATERIAL E2E (P6 · MODE A)`
- `IK · MATERIAL RESEARCH (P6 · MODE B)`
- `IK · F5 / BID (P7 · READ-ONLY)`
- `IK · RISK / DECISION (P8 · READ-ONLY PREPARE)`

Select **option values** `AUTO` / `ON` / `OFF` oraz istniejące `option` labels — **UNCHANGED** (A05–A07 harness grep).

Confirm strings na OFF — **UNCHANGED** (A06/A07 szukają m.in. `Bid calc pozostanie wyłączony`, `przygotowania P8`).

Helper copy P5–P8: **można** dopisać prefix `Emergency / diagnostic.` **Nie** wolno usuwać zdań, których szukają harnessy A05–A07. Arch Review weryfikuje grepy przed implementacją.

**Zakaz** nowych tytułów w stylu „Włącz Labor / Włącz Material”.

### 5.4 D / Przetargi / WM

Copy **UNCHANGED**.

---

## 6. Collapsed / expanded behavior

| Rule | Freeze |
|------|--------|
| Default | **collapsed** (`false`) przy każdym otwarciu modalu |
| Persist accordion | **NIE** — tylko local React state · **nie** AppSettings · **nie** KV · **nie** localStorage |
| Pattern | REUSE wzorca NG11: `button` + `ChevronDown` + `aria-expanded` |
| Children when collapsed | **MUST remain in source** (`data-ik-*` strings in `AdminSettingsModal.tsx`) |
| Children when collapsed (DOM) | **MUST stay mounted** — CSS hide / `hidden` / `details` closed. **Zakaz** `{open && (` unmount jak NG11, jeśli to usuwa `data-*` z live DOM. Prefer: zawsze w drzewie, `hidden={!open}` lub equivalent |
| Click header | toggle expand/collapse only · **no** settings write |

---

## 7. Role visibility

| Role | ⚙ | Primary Moduły | Technical accordion |
|------|---|----------------|---------------------|
| Super Admin | **YES** (`AdminTopbar`) | YES | YES (collapsed) |
| Administrator | **NO** | n/a | n/a |
| Moderator | **NO** | n/a | n/a |

P1 **nie** tworzy panelu staff. P1 **nie** zmienia `admin-auth.ts` / `adminCanViewTendersTab`.

Staff dziedziczy tenant `kw-app-settings` jak dziś.

---

## 8. Existing helper reuse (runtime UNCHANGED)

P1 **nie woła i nie edytuje** helperów. Po UI hide runtime zostaje:

| Helper | Contract |
|--------|----------|
| `isIkEntryEnabled()` | `ikEntryEnabled === true` |
| `isIkP2DocumentsBoqActive()` | `ikEntryEnabled === true` (08-P0 LOCKED) |
| `isIkP5LaborE2eActive()` / P6 / P7 / P8 | Entry ∧ mode ∈ {AUTO, ON} |
| Research execute | Entry ∧ MODE A ∧ `=== true` |
| `isIkIdentityCoverageEnabled()` | extra AND · **not** auto-on with IK |
| `isIkP4Chief*` | extra AND · **not** folded |
| `isIkAutoIngestEnabled()` | leftover reader · **not** P2 gate |
| D | `expertAiDecydentEnabled` · Dual Outcome · **untouched** |

`normalizeIkE2eMode` / `mergeIkE2eMode` / OFF wins / B-POLICY — **REUSE, no new parser**.

Compile sentinels `IK_ENTRY_SHELL_*` — **untouched**.

---

## 9. AppSettings behavior

| Item | Freeze |
|------|--------|
| Keys | **no add / no remove / no rename** |
| Types | boolean / `"AUTO"\|"OFF"\|"ON"` **UNCHANGED** |
| Defaults | **UNCHANGED** (`ikEntryEnabled: true` code default · live KV may be `false`) |
| load / parse / merge | **UNCHANGED** |
| B-POLICY | stored `true`→ON · `false`/missing/malformed→AUTO |
| OFF wins | **UNCHANGED** |
| Research | never derived from enum |
| `ikAutoIngestEnabled` | leftover field **kept** |
| Comments in `app-settings.ts` | **optional only** · not required for P1 |

**No new flag.**

---

## 10. KV behavior

| Item | Freeze |
|------|--------|
| Migration | **NONE** |
| `batch-set` / restore | **FORBIDDEN** in P1 |
| Live leftover `ikAutoIngestEnabled=true` | **leave** |
| Live P3 `ikIdentityCoverageEnabled=true` | **leave** (diagnostic stays on; hide ≠ write) |
| Live D `expertAiDecydentEnabled=true` | **leave** |
| Live `ikEntryEnabled=false` | **leave** — P1 does not flip IK |
| Accordion state | **not stored** |

Implement (later) może nadal wołać `saveAppSettings` **tylko** gdy Super Admin kliknie istniejącą kontrolkę — jak dziś. P1 **nie** dodaje auto-save przy otwarciu modalu / expand.

---

## 11. Mixed-client behavior

| Client | UI | Runtime / merge |
|--------|----|-----------------|
| Old bundle (pre-P1) | P3–P8 still in primary Moduły | same keys |
| New bundle (P1) | primary IK · Technical collapsed | same keys |
| Mixed Super Admin sessions | last `saveAppSettings` wins per existing merge | OFF wins on enums |
| Staff (no ⚙) | unchanged | inherit KV |

No schema conflict. No dual-write. No hydration flag.

---

## 12. Rollback

| Level | Action |
|-------|--------|
| UI layout | revert P1 commit · KV untouched |
| Whole IK | Super Admin: uncheck IK (`ikEntryEnabled=false`) |
| One stage P5–P8 | expand Technical · select `"OFF"` (existing confirm) |
| Research HTTP | uncheck MODE B |
| P3 / P4 | uncheck in Technical |
| 08-P0 / A05–A07 | **do not** roll back together with P1 |

No KV reverse migration.

---

## 13. Regression requirements

Must remain **PASS** after implement:

| Lock | Requirement |
|------|-------------|
| 08-P0 | `isIkP2DocumentsBoqActive()` := Entry only · no AUTO_INGEST toggle |
| A05 | P5/P6 `"AUTO"\|"OFF"\|"ON"` · B-POLICY · Research CONDITIONAL |
| A06 | P7 READ-ONLY · no Accept / Price Commit / Final Bid |
| A07 | P8 READ-ONLY prepare · D not flipped |
| D | HARD STOP · checkbox stays primary · copy unchanged |
| P1 invoice | CLOSED · `mat.inv.*` |
| P2 identity | KEEP GAP |
| Composite | CLOSED |
| CatalogWork | **471** · P1 writes **zero** catalog |
| `data-ik-*` listed in §1 rows 5–13 | still present in `AdminSettingsModal.tsx` |
| `data-ik-auto-ingest-toggle` | still **absent** |
| `data-ik-entry-toggle` | still **primary** (outside Technical) |

Harnesses grep **source**. Implement **must not** rename `data-*` or confirm strings those scripts match.

---

## 14. Test matrix (later implement · not this turn)

| Suite | Expect |
|-------|--------|
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **61 PASS / 0 FAIL** (T24 no AUTO_INGEST · T25 entry toggle) |
| `scripts/test-ik-autonomy-05-explicit-auto-off-on.mjs` | PASS · `data-ik-labor-e2e-mode` / `data-ik-material-e2e-mode` |
| `scripts/test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` | PASS · `data-ik-f5-e2e-mode` + confirm grep |
| `scripts/test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` | PASS · `data-ik-risk-decision-e2e-mode` + confirm grep |
| `scripts/test-ik-migration-01-p1-entry.mjs` | PASS · entry + identity toggles present · AUTO_INGEST absent |
| `scripts/test-ik-migration-01-p2-implementation.mjs` | PASS · AUTO_INGEST absent · identity toggle present |
| `scripts/test-ik-migration-01-p3-implementation.mjs` | PASS · identity toggle present |
| `scripts/test-ik-migration-01-p4-implementation.mjs` | PASS · `data-ik-chief-wiring-toggle` |
| `scripts/test-ik-migration-01-p5/p6/p7/p8-implementation.mjs` | PASS · existing `data-ik-*` |
| **New** `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | source asserts: Technical header string present · P3–P8 controls **after** Technical marker · `data-ik-entry-toggle` **before** Technical marker · D toggle **before** Technical · no `data-ik-auto-ingest-toggle` · no new AppSettings key · `ik-entry-flag.ts` / `IkEntryHost.tsx` **unchanged vs git** (or hash freeze) |
| Playwright E2E | **not required** if source smoke covers hierarchy |
| Settings / KV write audit | **0** in implement session unless Super Admin click (not part of smoke) |

`npm run build` — required before commit of UI (later).

---

## 15. Acceptance criteria

P1 implement **PASS** iff:

1. Super Admin ⚙ Moduły: primary IK checkbox + Owner copy §5.1.  
2. P3–P8 **not** in primary (above accordion).  
3. P3–P8 **inside** collapsed Technical / Advanced / Emergency.  
4. AUTO_INGEST **absent**.  
5. D stays primary, unchanged.  
6. No new AppSettings key / no KV migration / no settings write on deploy.  
7. Helpers / `IkEntryHost` / engines **byte-level unchanged** (diff empty except maybe comments — **prefer empty**).  
8. A05–A07 + 08-P0 + P1–P8 migration harnesses PASS.  
9. New P1 smoke PASS.  
10. Changelog bump only when UI ships.  
11. Unrelated WIP **not** staged.

---

## 16. Affected files

### 16.1 MUST touch (later implement)

| File | Change |
|------|--------|
| `src/app/AdminSettingsModal.tsx` | move P3–P8 into accordion · IK copy · local collapse state |
| `src/app/changelog-data.ts` | version entry when UI ships |
| `CHANGELOG.md` | short mirror |

### 16.2 MAY touch

| File | Change |
|------|--------|
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | **new** source smoke (REUSE harness style of 08-P0) |

### 16.3 MUST NOT touch

`src/lib/app-settings.ts` (keys/merge) · `src/lib/intelligent-estimator/ik-entry-flag.ts` · `src/app/intelligent-estimator/IkEntryHost.tsx` · `src/app/TenderDetailPage.tsx` · `src/lib/admin-auth.ts` · `src/app/admin/AdminTopbar.tsx` · P5/P6/P7/P8 engines · ingest bridge · D/Chief Dual Outcome · `supabase/functions/**` · KV scripts.

Harnesses A05–A07 / P1–P8: **edit only if** Arch Review finds a grep broken by copy — prefer **zero harness edits** by keeping `data-*` + confirm strings.

---

## 17. Explicit non-goals

P1 **does not**:

- create a new IK flag / second ON/OFF / Feature Flags service  
- change A05–A08 runtime  
- restore AUTO_INGEST UI  
- fold P4 into IK ON  
- change D / Chief  
- implement Research-on-miss / auto Research  
- implement Accept / Reject / Recalculate / Price Commit / Final Bid  
- implement Identity Gap Owner Gate UX  
- create staff settings panel  
- migrate or write KV  
- add `|| true` / bypass / new engine / new orchestrator  
- write CatalogWork / jobs / payroll  
- new cards, dashboards, routes, screens  

---

## 18. Owner Approval Gate

```text
THIS DOCUMENT     = DESIGN FREEZE
NEXT              = ARCHITECTURE REVIEW
IMPLEMENT         = FORBIDDEN until Arch Review PASS
                   AND Owner GO on implement

Owner GO on DF    ≠ Owner GO on code
Arch Review PASS  ≠ implement
```

Arch Review **must** confirm:

- no runtime helper change required  
- accordion does not drop `data-*`  
- no AppSettings/KV schema change  
- D remains primary HARD STOP  
- file scope §16 holds  

Po Arch Review: osobne **IMPLEMENT GO** od Ownera. Bez tego — STOP.

---

## Safety invariants (carry-forward)

```text
D              = HARD STOP
P1 invoice     = CLOSED
P2             = KEEP GAP
Composite      = CLOSED
A05            = UNCHANGED
A06            = UNCHANGED
A07            = UNCHANGED
P0             = COMPLETE / CLOSED
CatalogWork    = 471
ikEntryEnabled = ONLY business IK switch
```

---

## Status

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture Review        = NOT DONE
Architecture blockers      = UNKNOWN UNTIL ARCH REVIEW
Implementation             = NOT AUTHORIZED
CODE                       = ZERO
UI CODE                    = ZERO
SETTINGS WRITE             = ZERO
BUSINESS WRITE             = ZERO
RESEARCH                   = ZERO
COMMIT                     = NOT DONE
PUSH                       = NOT DONE
DEPLOY                     = NOT DONE
P0                         = COMPLETE / CLOSED
P1                         = DESIGN FREEZE ONLY
EPIC                       = AUTONOMY-08 — P1
```
