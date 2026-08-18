# IK ROLE ACTIVATION  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-ROLE-ACTIVATION-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH REQUIRED FIXES** |
| **Date** | 2026-08-18 |
| **Mode** | ARCH REVIEW ONLY · **READ-ONLY** · **ZERO CODE** · **ZERO SETTINGS** · **ZERO UI** · **ZERO BUILD-AS-IMPLEMENT** · **ZERO TEST MUTATION** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Design Freeze** | [`IK-ROLE-ACTIVATION-DESIGN-FREEZE.md`](./IK-ROLE-ACTIVATION-DESIGN-FREEZE.md) |
| **PLAN** | [`IK-ROLE-ACTIVATION-PLAN.md`](./IK-ROLE-ACTIVATION-PLAN.md) |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Prior** | **A08-P2 COMPLETE / CLOSED** · UI **2.66.95** · feature **`1f5d871c`** |

```text
ARCH REVIEW                = PASS WITH REQUIRED FIXES
ARCHITECTURE BLOCKERS      = 0
SSOT CONFLICT              = NONE (A08-P1 „jedyny switch” = process stamp superseded by OD-RA-11)
REQUIRED FIXES             = IC-RA-COMPANION · IC-RA-P1-T10 · IC-RA-ADAPTER-IMPORT
Implementation             = NOT AUTHORIZED
A08-P2                     = CLOSED / UNCHANGED
EPIC                       = AUTONOMY-08 — NOT CLOSED
```

Nie implementowano. Nie edytowano runtime/settings/UI/testów. Nie ruszano WIP.

Nie projektowano alternatywnej architektury. Zamrożony design (helper w `admin-auth` + adapter `isIkEntryEnabled` + dwa klucze AppSettings) **jest zgodny**. Required fixes **doprecyzowują companiony i kierunek importu** — bez zmiany OD-RA-1…11.

---

## 1. Files inspected

| File | Reviewed |
|------|----------|
| DF · PLAN · MASTER SSOT §8–9 | YES |
| `src/lib/admin-auth.ts` — `AdminRole`, `adminCanView*`, `loadAdminSessionFromStorage`, imports | YES |
| `src/lib/app-settings.ts` — `ikEntryEnabled`, merge, parse, `saveAppSettings`, `APP_SETTINGS_KEY` | YES |
| `src/lib/intelligent-estimator/ik-entry-flag.ts` — `isIkEntryEnabled`, P2–P8 helpers, `forceIkEntryEnabledForTests` | YES |
| `src/lib/intelligent-estimator/index.ts` | YES |
| `src/app/AdminSettingsModal.tsx` — IK checkbox, Technical P5/P6 | YES |
| `src/app/TenderDetailPage.tsx` — `isIkEntryEnabled` mount | YES |
| `src/app/intelligent-estimator/IkEntryHost.tsx` — no role logic | YES |
| `src/app/App.tsx` · `AdminTopbar.tsx` — ⚙ Super Admin only | YES |
| `src/lib/cloud-sync.ts` / `security-audit-log.ts` — no import of admin-auth / app-settings / IK | YES |
| A08-P0 / P1 / P2 / migration P0–P1 harnesses · `data-ik-entry-toggle` | YES |
| `.tmp/autonomy-08-p0-production-verify.mjs` | YES (local leftover · **not** IMPLEMENT scope) |

---

## 2. Architecture verdict

**Zgodny.** Slice to **warstwa dostępu** na istniejącym ACL + istniejącym entry boolean. Nie jest nowym silnikiem, orchestratorem ani drugim IK gate.

```text
adminCanUseIntelligentEstimator(role, settings)     // CZY
        ↓
isIkEntryEnabled()  (force → session → helper)      // jedyny adapter
        ↓
istniejące P2–P8 / executeResearch / TenderDetailPage
```

P5/P6 `AUTO\|OFF\|ON` pozostają **JAK**. A08-P2 pozostaje **MISS-only Research**. Role **nie** wchodzą do ekspertów.

---

## 3. SSOT verdict

| Contract | DF | Match |
|----------|----|-------|
| IK = orchestrator, nie drugi engine | access only | **YES** |
| SEARCH BEFORE CREATE | REUSE `adminCanView*` + `kw-app-settings` | **YES** |
| Classification / COMPOUND HOLD / Evidence ≠ OUR RATE | NOT TOUCHED | **YES** |
| No new research engine / Research switch | OD-RA-5 | **YES** |
| D HARD STOP | NOT TOUCHED | **YES** |
| MASTER §8 „A08-P1: `ikEntryEnabled` jedyny biznesowy switch” | OD-RA-11 **supersedes** | **process stamp** — nie konflikt runtime; stamp docs przy closeout, nie teraz |
| A08-P2 CLOSED · nie start A08-P3 | DF slice ≠ P3 | **YES** |

---

## 4. Role matrix

| ROLE | SETTING | EXPECTED | DF | SOURCE dziś |
|------|---------|----------|----|-------------|
| `super_admin` | dowolne / `ikEntryEnabled=false` | **TRUE** | OD-RA-1 | dziś global KV — **GAP vs target** (to ten slice) |
| `admin` | false / missing | **FALSE** | OD-RA-2 | brak roli — ten sam global |
| `admin` | `ikEntryForAdminEnabled=true` | **TRUE** | OD-RA-2 | klucz nie istnieje jeszcze |
| `moderator` | false / missing | **FALSE** | OD-RA-3 | j.w. |
| `moderator` | `ikEntryForModeratorEnabled=true` | **TRUE** | OD-RA-3 | niezależna flaga — **nie** `tendersTabForStaffEnabled` |
| `inspector` | dowolne | **FALSE** | OD-RA-4 | helper `return false` |
| worker | dowolne | **FALSE** | brak `AdminSession` | adapter step 2 |
| no session | dowolne | **FALSE** | adapter step 2 | `loadAdminSessionFromStorage` → `null` |

**Krytyczny przypadek:** `super_admin` + `ikEntryEnabled=false` → **TRUE**. Helper **nie** czyta leftover klucza. Adapter **nie** AND-uje KV. SOURCE dziś: `isIkEntryEnabled()` czyta **tylko** KV — to właśnie ma zmienić IMPLEMENT, nie Arch.

Brak wspólnej flagi staff. Admin ≠ Moderator.

---

## 5. Authorization flow

```text
⚙ Super Admin only (AdminTopbar + App.tsx open guard)
  → saveAppSettings (istniejący persistKey kw-app-settings)
  → merge remote wins

Runtime:
  forceIkEntryEnabledForTests?
    yes → harness boolean
    no  → session?
           none → false
           role → adminCanUseIntelligentEstimator
```

UI checkboxy **nie** są SSOT access. Helper jest SSOT. Adapter jest jedynym mostem do pipeline.

`AdminSettingsModal` nie duplikuje macierzy ról — tylko zapisuje dwa booleany. **KEEP.**

---

## 6. `isIkEntryEnabled` adapter verdict

**PASS (target).**

Dziś (SOURCE): `loadAppSettingsLocal().ikEntryEnabled === true` — global, bez roli.

Target DF §5: force FIRST · session · helper. Downstream helpers **już** wołają `isIkEntryEnabled()`:

- `isIkP2DocumentsBoqActive`
- P3 / P4
- P5/P6 E2E + `executeResearch`
- P7 / P8

`TenderDetailPage` jedyny mount `IkEntryHost` przez ten sam boolean. **Nie** przenosić roli do strony.

`resolveIkP5LaborExecuteResearch({ ikEntryEnabled })` — nazwa parametru to **ACCESS bit**, nie odczyt KV. A08-P2 fixture `ikEntryEnabled: true` = permission input. **Nie** przepisywać na leftover key.

---

## 7. `ikEntryEnabled` leftover verdict

**PASS.**

Jedyne odczyty `.ikEntryEnabled` w `src/`:

| Miejsce | Po IMPLEMENT |
|---------|----------------|
| `isIkEntryEnabled()` body | **przestać** czytać KV |
| `AdminSettingsModal` checkbox | **usunąć** |
| `app-settings` merge/parse/default | **zostawić** leftover |

Brak duplikatu w host/ekspertach/P7/P8.

FORBIDDEN potwierdzone: `ikEntryEnabled && superAdmin` · `ikEntryEnabled && helper` · recykling jako flaga Admin · wspólny staff switch · delete w ciemno.

---

## 8. AppSettings verdict

**PASS.**

- KV `kw-app-settings` — bez nowej tabeli / ACL store
- Dwa klucze, default **false**, parse `=== true`, merge jak `instructionsForAdminEnabled`
- Brak migracji — missing → false
- `tendersTabForStaffEnabled` **osobno** (Admin+Moderator shared) — **nie** reuse dla IK
- P5/P6 mode keys **UNCHANGED**
- `saveAppSettings` REUSE

---

## 9. UI / access-control verdict

**PASS.**

⚙: `adminIsSuperAdmin` w `AdminTopbar` + guard otwarcia w `App.tsx`. To **istniejący** write gate wszystkich AppSettings (w tym Instructions). Ten slice **nie** wymaga drugiego write ACL.

Target UI: dwa checkboxy, default OFF, brak Super Admin self-toggle, brak Research switch, Technical P5/P6 KEEP.

Ukrycie UI **niewystarczające** — DF to honoruje przez adapter. Nawet gdyby `IkEntryHost` został zamontowany ręcznie, P2–P8 i `executeResearch` i tak czytają `isIkEntryEnabled()`.

---

## 10. `forceIkEntryEnabledForTests` verdict

**PASS — KEEP.**

A08-P2 T1/T2 i A05–A07 ustawiają force **przed** asercją permission. Adapter step 1 zachowuje te harnessy **bez** sesji.

`force(null)` → ścieżka produkcyjna (brak sesji w Node → `false`). Cleanup na końcu harnessy już robią. **Nie** usuwać API.

---

## 11. A08-P0 / P1 companion verdict

**REQUIRED przy IMPLEMENT** (test-only · kontrakt access się zmienia · silnik nie).

SOURCE grep `data-ik-entry-toggle`:

| File | Co pęknie | Zakres |
|------|-----------|--------|
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | T02, T05 write `ikEntryEnabled`, T07 unique attr, **T10 `gitDiffEmpty(admin-auth/app-settings)`** | **IN** |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | T25 UI scan | **IN** · runtime T01 (`force`) **KEEP** |
| `scripts/test-ik-migration-01-p1-entry.mjs` | C/F toggle present | **IN** |
| `scripts/test-ik-migration-01-p0-implementation.mjs` | F toggle present | **IN** |
| `.tmp/autonomy-08-p0-production-verify.mjs` | PV4 scan | **OUT** — lokalny leftover, nie repo IMPLEMENT |

Nowe oczekiwanie: `data-ik-entry-for-admin-toggle` + `data-ik-entry-for-moderator-toggle`; brak checkboxa KV.

A08-P1 T09 `isIkP2DocumentsBoqActive := isIkEntryEnabled()` **zostaje** — to jest adapter, nie leftover KV.

---

## 12. A08-P2 regression verdict

**PASS — no engine change.**

NOT TOUCHED by DF scope: Labor/Material experts, `researchEligible` / F1, classification-gate, HIT skip, `mat.inv.*`, IC-SEQ-1/2, `executeResearch` conjunct (Entry ACCESS ∧ E2E boolean), leftover `ik*ResearchEnabled`, P7, P8, Accept, OUR RATE, Final Bid, D, Chief.

Po IMPLEMENT Super Admin: ACCESS true + P5/P6 default AUTO → Research **tylko** true MISS. To nie nowy Research switch.

A08-P2 harness permission cases używają **force** — zachowane.

---

## 13. Security verdict

**PASS (target).**

| Aktor | Runtime | Write ⚙ |
|-------|---------|---------|
| Super Admin | helper true | jedyny |
| Admin flag OFF | false | nie |
| Admin flag ON | true | nie |
| Moderator analogicznie | | |
| Inspector | false nawet przy flags true | nie |
| Worker / no session | false | nie |

Local tampering nowych kluczy = **istniejący** model Instructions (cloud remote false wins). **Nie** nowy ACL. Inspector i Super Admin **nie** zależą od tych kluczy.

---

## 14. Dependency / cycle verdict

**PASS — cykl nie istnieje w SOURCE; DF import jednokierunkowy.**

Dziś:

```text
admin-auth      → cloud-sync, security-audit-log
app-settings    → cloud-sync
ik-entry-flag   → app-settings
ik-p9-owner-verify → admin-auth   (nie importowany przez ik-entry-flag)
cloud-sync      ↛ admin-auth / app-settings / intelligent-estimator
```

Target:

```text
ik-entry-flag → admin-auth   (helper + loadAdminSessionFromStorage)
ik-entry-flag → app-settings (loadAppSettingsLocal — flags Admin/Moderator)
admin-auth    ↛ ik-entry-flag
admin-auth    ↛ app-settings   (helper bierze Pick settings, nie import typu AppSettings)
```

**IC-RA-ADAPTER-IMPORT:** IMPLEMENT musi importować z `@/lib/admin-auth` **bezpośrednio**, nie z barrel `intelligent-estimator/index.ts`. Helper **nie** wchodzi do `index.ts` IK (DF już FORBID).

Brak cyklu `admin-auth ↔ app-settings ↔ intelligent-estimator`.

---

## 15. Implementation scope

Gdy Owner da IMPLEMENT GO (nie teraz):

1. `src/lib/admin-auth.ts` — helper
2. `src/lib/app-settings.ts` — 2 pola + parse + merge
3. `src/lib/intelligent-estimator/ik-entry-flag.ts` — adapter + komentarz leftover (nie AND)
4. `src/app/AdminSettingsModal.tsx` — 2 checkboxy
5. `scripts/test-ik-role-activation.mjs` — macierz
6. Companion §11 (w tym A08-P1 T10)
7. Changelog / `09` — po PV, nie w Arch

`TenderDetailPage.tsx` / `IkEntryHost.tsx`: **poza scope**, o ile adapter wystarczy (SOURCE: wystarczy).

---

## 16. Files NOT TOUCHED

`ik-labor-expert.ts` · `ik-material-expert.ts` · `classification-gate.ts` · research engines · `ik-p7-position-cost-bid.ts` · `ik-p8-risk-decision.ts` · `IkEntryHost.tsx` · Accept · OUR RATE · Final Bid · D · Chief · Payroll · `cloud-sync.ts` · Composite · Hub · P5/P6 mode semantics · `tendersTabForStaffEnabled` · unrelated WIP

---

## 17. Blockers

**0.**

Brak błędu architektury, który wymagałby zmiany OD-RA-* albo nowego silnika.

---

## 18. Required fixes

Nie blokują Arch. **Obowiązkowe przy IMPLEMENT.** Nie zmieniać kodu w tej turze.

| ID | Fix |
|----|-----|
| **IC-RA-COMPANION** | Retarget source-scan `data-ik-entry-toggle` w P1 T02/T05/T07, P0 T25, migration P0/P1 C/F. Nowe dwa `data-*`. Nie ruszać A08-P2 engine tests. |
| **IC-RA-P1-T10** | `gitDiffEmpty("src/lib/admin-auth.ts")` i `gitDiffEmpty("src/lib/app-settings.ts")` **nie** mogą pozostać zamrożone przeciwko temu slice. `AdminTopbar` / `TenderDetailPage` nadal empty. |
| **IC-RA-ADAPTER-IMPORT** | `ik-entry-flag.ts` → `@/lib/admin-auth` one-way. Helper nie importuje `app-settings` ani `ik-entry-flag`. Nie AND leftover KV. |

Docs stamp MASTER §8 „jedyny switch” = **closeout po PV**, nie blocker Arch.

---

## 19. Acceptance criteria (Arch)

IMPLEMENT może startować dopiero po Owner GO, gdy DF+te fixes:

1. Super Admin + leftover `ikEntryEnabled=false` → ACCESS true
2. Super Admin bez nowych kluczy → true
3. Admin/Moderator default false; niezależne ON
4. Inspector / worker / no session → false
5. Adapter jedyny; P2–P8 bez roli
6. `forceIkEntryEnabledForTests` KEEP
7. P5/P6 AUTO\|OFF\|ON KEEP
8. Brak Research / global IK / Super Admin checkbox
9. Companion + T10 zaktualizowane
10. A08-P2 semantycznie UNCHANGED
11. Brak cyklu importów
12. `kw-app-settings` only · no new ACL storage

---

## 20. Final verdict

Zamrożony design jest **architektonicznie poprawny**. Required fixes są **test/import discipline**, nie przebudową kontraktu.

```text
IK ROLE ACTIVATION ARCH REVIEW = PASS WITH REQUIRED FIXES

Architecture blockers      = 0
Required fixes             = IC-RA-COMPANION · IC-RA-P1-T10 · IC-RA-ADAPTER-IMPORT
Implementation             = NOT AUTHORIZED
Production                 = UNCHANGED
A08-P2                     = CLOSED / UNCHANGED
Research                   = UNCHANGED
New switches               = NONE beyond Admin + Moderator access
Super Admin                = ALWAYS ON
Admin / Moderator          = DEFAULT OFF / Super Admin controlled
Inspector / Worker         = OFF

STOP.
```
