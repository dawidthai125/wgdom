# IK AUTONOMY-05 — Explicit AUTO / OFF / ON Settings PLAN

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-05-EXPLICIT-AUTO-OFF-ON-PLAN` |
| **Status** | **PLAN READY** · **NO IMPLEMENT** · **NO DF** · **NO MIGRATION** · **NO COMMIT** |
| **Date** | 2026-08-17 |
| **Mode** | PLAN / ARCHITECTURE ONLY |
| **OD-1** | [`IK-AUTONOMY-04-OD1-SETTINGS-SEMANTICS-AUDIT.md`](./IK-AUTONOMY-04-OD1-SETTINGS-SEMANTICS-AUDIT.md) · A UNSAFE · **B SAFE** · E fallback |
| **Policy** | [`IK-AUTONOMY-03-AUTONOMY-POLICY.md`](./IK-AUTONOMY-03-AUTONOMY-POLICY.md) |
| **Production** | **2.66.89** / **`d62eb2a`** |

```text
IK AUTONOMY-05 PLAN = READY
OPTION B            = SAFE
Migration           = SAFE  (read-normalize + same-release writers)
KV persistence      = SAFE  IF load/merge/save/UI w jednym releasie
                        FIRST BREAK TODAY: loadAppSettingsLocal === true
Admin UI            = READY (kontrakt · nie kod)
P5 AUTO             = READY (plan)
P6 AUTO             = READY (plan)
Kill-switch         = READY (plan · stored "OFF")
New engine / flag   = NO
Default flip        = NOT DONE
Code / KV write     = ZERO
OD-2                = PENDING OWNER  (YES → DF · NO → E)
```

---

## 1. Context

P5/P6 binding w `IkEntryHost` **EXISTS**. MODE A jest read-only. First break = boolean opt-in OFF.

OD-1: missing=AUTO (**A**) jest **UNSAFE** (coerce + materializacja). **B** (jawny enum na **tych samych** kluczach) jest **SAFE** jako kontrakt. **C/D** OUT. **E** = manual fallback.

Ten PLAN projektuje B. **Nie** zmienia typu, defaultów, KV, UI.

---

## 2. OD-1 Result

| | |
|--|--|
| A missing=AUTO | **UNSAFE** · round-trip niszczy missing |
| **B AUTO\|OFF\|ON** | **SAFE** · ten PLAN |
| C nowa flaga | **OUT** |
| D global autonomy | **UNSAFE/OUT** |
| E manual | fallback jeśli OD-2 **NO** |

---

## 3. Current Boolean Contract

```text
ikLaborE2eEnabled / ikMaterialE2eEnabled : boolean
default false
load:  parsed === true          → missing → false
merge: remote true|false else local===true
save:  JSON.stringify(full AppSettings)
active: ikEntry && labor===true
research: AND laborResearch===true AND executeResearch===true
UI: checkbox → boolean → full blob persist
```

Miejsca **zakładające boolean** (muszą się zmienić przy B):

| Warstwa | Plik | Założenie |
|---------|------|-----------|
| type + default | `app-settings.ts` | `boolean` / `false` |
| load | `loadAppSettingsLocal` | `=== true` |
| merge | `mergeIkLaborE2eEnabled` / `mergeIkMaterialE2eEnabled` | true/false only |
| save | `saveAppSettings` / `saveAppSettingsLocal` / `persistKey` | stringify as-is |
| hydrate | `syncAppSettingsFromCloud` · `CloudLoader.tsx` | merge → LS full object |
| flag | `isIkLaborE2eEnabled` · `isIkP5LaborE2eActive` | `=== true` |
| research input | `IkP5LaborExecuteResearchInput.ikLaborE2eEnabled: boolean` | `=== true` |
| host | `IkEntryHost` `p5LaborOn` | via helper |
| UI | `AdminSettingsModal` `checked === true` / `e.target.checked` | 2 stany |
| writers | WM Rysunki · `maybePromoteWmRysunki01FromLs` · wszystkie ⚙ | `{...appSettings, field}` |
| tests | `test-ik-migration-01-p5…p9` | default/merge false |

`IkEntryHost` **nie** czyta raw boolean poza helperami.

**Pierwszy breaking point dziś (AUTO nie przeżyje):** `loadAppSettingsLocal` linia `ikLaborE2eEnabled: parsed.ikLaborE2eEnabled === true` — string `"AUTO"` / `"OFF"` / `"ON"` → **false**.

---

## 4. Proposed AUTO / OFF / ON Contract

Te same klucze: `ikLaborE2eEnabled`, `ikMaterialE2eEnabled`.

| Wartość | Semantyka | MODE A | Kill |
|---------|-----------|--------|------|
| **AUTO** | polityka: IK ON ∧ BOQ READY → run | tak | nie |
| **OFF** | Owner explicit HOLD | nie | **tak** · trwałe |
| **ON** | Owner explicit RUN (legacy enable) | tak (gdy IK ON ∧ READY) | nie |

```text
MODE A RUN  = ikEntryEnabled
            ∧ masterBoq.readyForExperts
            ∧ mode ∈ { AUTO, ON }
            ∧ executeResearch = false

HOLD        = mode === OFF  ∨  !ikEntry  ∨  !READY

Research    = MODE A RUN ∧ ik*ResearchEnabled === true ∧ executeResearch === true
              NIE wynika z AUTO
```

ON vs AUTO: oba odpalają MODE A. ON = świadomy opt-in (stare `true`). AUTO = polityka bez ręcznego P5. OFF zawsze wygrywa.

---

## 5. Type Design

| Opcja | Ocena |
|-------|--------|
| **`"AUTO" \| "OFF" \| "ON"`** | **REKOMENDOWANE** · JSON-stable · czytelne w KV · najmniejszy delta vs boolean |
| numeric 0/1/2 | kruche · myli z boolean |
| nested `{ p5: { mode } }` | **nowy kształt** ≈ nowa flaga · OUT |

Nazwa pola `*Enabled` zostaje (**nie** nowa flaga). Dokumentacja: to **mode**, nie bool.

Normalizer (plan, nie kod):

```text
normalizeP5P6Mode(raw):
  "AUTO"|"OFF"|"ON" → as-is
  true  → ON
  false → LEGACY_FALSE  → mapowanie §7 (Owner)
  missing/undefined/null → AUTO
  other → OFF  (fail-closed)
```

Research flags **zostają** `boolean` + `=== true`.

---

## 6. Backward Compatibility

| OLD | NEW (rekomendacja planu) | Semantics | Owner config |
|-----|--------------------------|-----------|--------------|
| **missing** | **AUTO** | nigdy nie ustawione | brak decyzji P5/P6 |
| **true** | **ON** | explicit enable | **zachowane** |
| **false** | **AUTO** (*) | legacy default / side-effect save / możliwe odznaczenie ⚙ | **nie da się** odróżnić kill |

(\*) **Nie** `false → OFF` jako default planu: zmaterializowane `false` jest prawie u każdego po sync/⚙ — wtedy AUTO **nigdy** nie wstanie (powtórka A).

**Ryzyko (*):** Owner, który po teście odznaczył checkbox („Po teście: wyłącz”), traci HOLD → AUTO. To **świadomy trade-off** OD-2b.

**OD-2b (przy YES):**

| Wariant | false → | Prod MODE A | Kill historyczny |
|---------|---------|-------------|------------------|
| **B-POLICY** (rekomendacja celu AUTO) | AUTO | TAK bez ⚙ | może zginąć |
| **B-CONSERVATIVE** | OFF | NIE (jak dziś) | zachowany niejednoznacznie | **nie spełnia** objective AUTO |

Plan przyjmuje **B-POLICY** jako jedyne mapowanie zgodne z celem AUTONOMY-05. Owner może wybrać B-CONSERVATIVE = de facto E.

Po pierwszym zapisie nowym kodem: w KV tylko `"AUTO"|"OFF"|"ON"` — dalsze `false` tylko ze **starego** bundle (T19).

---

## 7. Migration (design only — NOT executed)

**Bez KV write w tej turze.** Migracja = **read-time normalize** + **write-time enum** w tym samym releasie.

| Krok | |
|------|--|
| 1 | Normalizer na load + merge |
| 2 | `defaultAppSettings()` → `"AUTO"` (to **jest** zmiana defaultu — tylko po DF+GO, nie teraz) |
| 3 | save zapisuje string enum, nie bool |
| 4 | UI zapisuje wyłącznie AUTO/OFF/ON |
| 5 | **Brak** osobnego skryptu batch-set KV (prefer read-normalize) |
| 6 | Opcjonalnie później: rewrite blob przy następnym `saveAppSettings` (side-effect, nie dedicated migration job) |

`true` → ON przy pierwszym load — **nie utracone**.  
`missing` → AUTO.  
`false` → AUTO (B-POLICY) albo OFF (B-CONSERVATIVE).

Rollback §18: stary `=== true` traktuje stringi jako false → HOLD (bezpieczniejsze niż przypadkowe Research).

---

## 8. Local Storage

Key `kw-app-settings`. `JSON.stringify({ ikLaborE2eEnabled: "AUTO" })` **zachowuje** `"AUTO"`.

Dziś: load niszczy string. **Po kontrakcie B:** load zwraca `"AUTO"` bez coerce.

`JSON.stringify` **nie** zamienia `"AUTO"` w `false`.

---

## 9. Cloud / KV

```text
LS JSON
  → persistKey / pushKeysToCloud
  → kw-app-settings
  → fetchKeysFromCloud
  → mergeAppSettings(remote, local)
  → CloudLoader safeSetLocalStorageJson
  → loadAppSettingsLocal
  → isIkP5LaborE2eActive
  → IkEntryHost
```

| Etap | Dziś | Po B (wymagane) |
|------|------|-----------------|
| persist | pełny obiekt | enum string OK |
| merge | bool only | 3-way: OFF wygrywa; AUTO/ON; legacy bool §7 |
| CloudLoader | zapisuje wynik merge | musi zapisać **enum**, nie `===true` collapse |
| load | **BREAK** `=== true` | normalize |

**AUTO przetrwa cykl TYLKO** gdy load+merge+CloudLoader+save są w **jednym** deployu.

**OFF** analogicznie: merge `"OFF"` vs remote missing → **OFF stays** (explicit). Nie wolno `else local===true`.

---

## 10. Settings Writers

Wszystkie wołają `saveAppSettings(next)` z **pełnym** `AppSettings`:

| Writer | Trigger | Ryzyko dziś | Po B |
|--------|---------|-------------|------|
| `AdminSettingsModal` | każdy checkbox ⚙ | spread + **P5 `e.target.checked`** | P5/P6 **select** · inne pola spread **musi** kopiować enum |
| `WmPrintView` | WM Rysunki | `{...appSettings, wmRysunki}` | spread zachowa `"OFF"`/`"AUTO"` **jeśli** state nie jest bool |
| `maybePromoteWmRysunki01FromLs` | promote LS | `{...settings, wmRysunki:true}` | analog |
| `syncAppSettingsFromCloud` | hydrate | merge→LS | merge 3-way |
| `CloudLoader` | bootstrap | merge→LS | analog |
| `persistKey` | passthrough | — | OK dla stringów |

**CRITICAL:** po migracji AUTO **nie** może spaść do OFF przez ATH/WM.

Warunek: in-memory `appSettings.ikLaborE2eEnabled === "AUTO"` i spread **bez** `=== true` coerce. Pierwszy zły writer = stary `load` przed spread.

T19: stary PWA bundle ładuje `"OFF"` jako false, zapis ATH → `false` → nowy kod B-POLICY czyta AUTO → **kill zniszczony**. Mitygacja: Version Awareness / jeden bundle; merge: jeśli remote `"OFF"` nigdy nie nadpisuj boolean false→AUTO w tym samym kluczu gdy… boolean false z old client **nie da się** odróżnić. **Ryzyko residualne** przy mieszanych clientach. Prod = jedno Vercel + SW update.

---

## 11. Settings Readers

| Reader | Dziś | Po B |
|--------|------|------|
| `isIkLaborE2eEnabled()` | `=== true` | **przestarzałe imię** → `mode ∈ {AUTO,ON}` **lub** rozdzielić `isIkP5LaborE2eActive` |
| `isIkP5LaborE2eActive` | IK ∧ true | IK ∧ (AUTO\|ON) ∧ nie OFF |
| `resolveIkP5LaborExecuteResearch` | labor **boolean true** | labor mode RUN **AND** `ikLaborResearchEnabled===true` · **AUTO ≠ research** |
| `IkEntryHost` | `p5LaborOn` | bez zmiany jeśli helper |
| tests P5 | inactive when false | AUTO default → **testy defaultów do przepisania** |

Research input type: nie przekazywać raw enum jako `boolean`. Helper `isIkP5ModeARun(mode)` vs `isIkP5ResearchPermitted`.

---

## 12. Admin UI (kontrakt only)

**Nie implementować.**

P5 i P6: osobne **3-stanowe** sterowanie (radio / `<select>`), **nie** checkbox.

| Stan | Label (propozycja) | Opis |
|------|-------------------|------|
| AUTO | **IK Autonomous Read-Only** | MODE A gdy IK+BOQ READY · 0 HTTP · 0 Accept |
| OFF | Wyłączone (kill-switch) | HOLD · trwałe |
| ON | Włączone ręcznie | MODE A jak dziś opt-in |

- **Default display (nowy default):** AUTO  
- **Legacy true:** ON  
- **Legacy false (B-POLICY):** AUTO + hint „zmapowano z dawnego OFF” **nie** w UI per-user (brak dowodu) — tylko changelog ⚙  
- **Explicit OFF:** confirmation **TAK** (nieniszczące: „Labor Expert nie będzie się uruchamiał”)  
- **Explicit ON:** bez confirmation  
- AUTO → OFF: confirmation  
- Research: **osobne** istniejące checkboxy MODE B · copy: AUTO **nie** włącza Research  

---

## 13. P5 Semantics

```text
isIkP5LaborE2eActive:
  ikEntryEnabled === true
  AND mode !== "OFF"
  AND mode ∈ { "AUTO", "ON" }   // po normalize

IkEntryHost useEffect: UNCHANGED shape
  executeResearch: isIkP5LaborExecuteResearchActive() === true
                   // nadal 3× true na Research lever, NIE na AUTO
```

Engine `runIkMasterBoqLaborExpert` **UNCHANGED**. MISS = GAP / RESEARCH_SKIPPED.

---

## 14. P6 Semantics

Analog P5. PM CURRENT **read**. `researchEligible` / P1 / P2 **UNCHANGED**. Engine **UNCHANGED**.

Composite: existing `useMemo` gdy P5∧P6 active (AUTO\|ON obie) · CLOSED · `feedsP7Bid=false`.

---

## 15. Research Boundary

| | |
|--|--|
| AUTO | `executeResearch=false` |
| MODE B | istniejące `ikLaborResearchEnabled` / `ikMaterialResearchEnabled` **=== true** |
| Accept | OWNER |
| Pre-P1 #3B `mat.inv.*` | **NIE** precedens AUTO Research · P1 CLOSED |

**Zakaz:** `mode==="AUTO"` → `executeResearch=true`.

---

## 16. Safety Invariants

AUTO **nie** woła: Research HTTP · Accept · Price Commit · PRICE_DEMAND · CatalogWork write · PM write · Edge lease · tender mutation · D.

Dowód istniejący: host podaje `executeResearch: p5ResearchOn===true`; Research helper wymaga **osobnego** boolean; P2 ingest / D / Accept **inne** levery.

AUTO **woła tylko** P5/P6 MODE A (+ Composite follows P5∧P6) gdy IK ON ∧ READY.

KEEP: P1 · P2 KEEP GAP · Composite CLOSED · D false · CatalogWork 471 · GAP≠0 · Research≠Accept.

---

## 17. Blast Radius

| Symbol / miejsce | Klasa |
|------------------|-------|
| `AppSettings` + default/load/merge/save | **DIRECT** + **WRITER** + **READER** |
| `CloudLoader` · `syncAppSettingsFromCloud` | **WRITER** (hydrate) |
| `persistKey` | **WRITER** passthrough |
| `ik-entry-flag.ts` P5/P6 + research inputs | **DIRECT READER** |
| `IkEntryHost.tsx` | **READER** (helper) |
| `AdminSettingsModal.tsx` | **UI** + **WRITER** |
| `WmPrintView.tsx` · `wm-technical-drawings/flag.ts` | **WRITER** (spread) |
| `App.tsx` `appSettings` state | **READER** state |
| `intelligent-estimator/index.ts` | re-export |
| `scripts/test-ik-migration-01-p5…p9.mjs` | **TEST** |
| `changelog-data.ts` · docs architecture | **DOC ONLY** |
| labor/material/composite engines | **NIE** (non-goal) |

Blast: **settings + ⚙ UI + flag helpers + testy defaultów**. Nie costing engines.

---

## 18. Rollback

| | |
|--|--|
| Revert bundle | stary `=== true` → stringi HOLD · prod jak dziś OFF |
| KV zostaje `"AUTO"`/`"OFF"`/`"ON"` | stary kod czyta jako false · **HOLD** |
| Legacy `true` w KV | stary kod ON · OK |
| Research/D | nienaruszone |

Rollback **nie** odpala MODE A przypadkiem. ON jako `"ON"` na starym kodzie = HOLD (akceptowalne).

---

## 19. Test Matrix (future)

| ID | Case |
|----|------|
| T01 | AUTO + BOQ READY → P5 RUN · 0 HTTP |
| T02 | AUTO + BOQ READY → P6 RUN |
| T03 | OFF + READY → P5 HOLD |
| T04 | OFF + READY → P6 HOLD |
| T05 | ON + READY → P5 RUN |
| T06 | ON + READY → P6 RUN |
| T07 | AUTO + Research lever OFF → 0 HTTP; Research ON → CONDITIONAL |
| T08 | AUTO → Accept 0 |
| T09 | AUTO → Price Commit 0 |
| T10 | AUTO → business writes 0 (settings rewrite enum OK · nie Catalog/PM/demand) |
| T11 | AUTO → D false |
| T12 | AUTO survives reload (LS string) |
| T13 | AUTO survives cloud hydration (merge) |
| T14 | OFF survives reload |
| T15 | OFF survives cloud hydration (OFF wins) |
| T16 | legacy **false** → mapowanie OD-2b |
| T17 | legacy **true** → ON |
| T18 | legacy **missing** → AUTO |
| T19 | concurrent writer (ATH/WM spread) nie zamienia AUTO/OFF |
| T20 | rollback: old `=== true` + stored AUTO → HOLD |

Plus: IK OFF → no expert · BOQ not READY → no expert · mat.inv / P2 GAP · Composite XOR · CatalogWork 471.

---

## 20. Owner Decision

### OD-2

Czy Owner zatwierdza OPTION B:

```text
P5/P6 settings (istniejące klucze):
  "AUTO" | "OFF" | "ON"
```

**OD-2 = PENDING** (ten PLAN nie zatwierdza).

| | |
|--|--|
| **YES** | + OD-2b **B-POLICY** (`false`→AUTO) → **READY FOR DESIGN FREEZE** |
| **YES** + B-CONSERVATIVE (`false`→OFF) | DF możliwy, ale **P5/P6 AUTO na prod ≈ E** |
| **NO** | Option **E** · P5/P6 manual ⚙ |
| **BLOCKED** | STOP · nic nie wdrażać |

OD-2 **nie** obejmuje: Research default · D · P7/P4/P8 · nowej flagi · KV write teraz.

---

## 21. Design Freeze Readiness

**NIE w tej turze.** DF **po** OD-2 **YES**.

Freeze candidate: type string union · same keys · B-POLICY · load/merge/save/UI same release · Research `===true` · engines UNCHANGED · T01–T20.

---

## STOP BEFORE DESIGN FREEZE

```text
PLAN     = READY
IMPLEMENT= NO
DF       = NOT CREATED
CODE     = ZERO
KV       = ZERO
```
