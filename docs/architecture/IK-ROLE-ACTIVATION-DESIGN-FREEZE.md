# IK ROLE ACTIVATION  
## DESIGN FREEZE

| Field | Value |
|-------|-------|
| **ID** | `IK-ROLE-ACTIVATION-DESIGN-FREEZE` |
| **Status** | **DESIGN FREEZE = READY FOR ARCH REVIEW** |
| **Date** | 2026-08-18 |
| **Mode** | DESIGN FREEZE ONLY · **ZERO CODE** · **ZERO PATCH** · **ZERO IMPLEMENT** · **ZERO SETTINGS WRITE** · **ZERO UI CHANGE** · **ZERO BUILD** · **ZERO RUNTIME TESTS** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **PLAN** | [`IK-ROLE-ACTIVATION-PLAN.md`](./IK-ROLE-ACTIVATION-PLAN.md) · **OWNER ACCEPTED** (this GO) |
| **Contract SSOT** | [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) |
| **Prior** | **A08-P2 COMPLETE / CLOSED** · UI **2.66.95** · feature **`1f5d871c`** |
| **Tip** | [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) |
| **Slice** | **Access layer only** — not engine · not A08-P3 · not epic close |

```text
DESIGN FREEZE              = READY FOR ARCH REVIEW
Architecture Review        = NOT DONE
Implementation             = NOT AUTHORIZED
Code / Settings / UI       = ZERO
Build / runtime tests      = NOT RUN
Commit / Push / Deploy     = NOT DONE
A08-P2                     = CLOSED / UNCHANGED
EPIC                       = AUTONOMY-08 — NOT CLOSED
```

If PLAN narrative and SOURCE disagree, **SOURCE wins** for current files. This freeze records **target** contract for the next IMPLEMENT (not authorized yet).

```text
WARSTWA DOSTĘPU ≠ SILNIK IK.
CZY użytkownik może korzystać z IK.
JAK pipeline działa = A08-P2 UNCHANGED.
IK ACCESS = isIkEntryEnabled() AFTER adapter change.
```

---

## 1. Purpose

Zamrozić role-based access do Inteligentnego Kosztorysanta jako **jedyną** warstwę „CZY”.

REUSE: `admin-auth.ts` `adminCanView*` · `kw-app-settings` · `isIkEntryEnabled()` jako **adapter** · `forceIkEntryEnabledForTests` · istniejący `saveAppSettings` / cloud merge.

**Nie** nowy ACL · **nie** nowy Research switch · **nie** nowy globalny IK gate · **nie** logika roli w host/ekspertach/P2–P8.

---

## 2. Owner Decisions (HARD FREEZE)

| # | Decision | Frozen meaning |
|---|---------|----------------|
| **OD-RA-1** | Super Admin **ALWAYS ON** | Helper `super_admin → true`. Brak checkboxa self-toggle. Legacy `ikEntryEnabled=false` **nie** blokuje |
| **OD-RA-2** | Admin default **OFF** | Tylko `ikEntryForAdminEnabled === true` |
| **OD-RA-3** | Moderator default **OFF** | Tylko `ikEntryForModeratorEnabled === true` · **niezależnie** od Admin |
| **OD-RA-4** | Inspector / Worker / no session | **OFF** |
| **OD-RA-5** | **NO EXTRA SWITCHES** | Zero `ikAutoResearch` / `ikResearchOnMiss` / `ikEnabledForSuperAdmin` / drugi globalny `ikEnabled` / Research checkbox |
| **OD-RA-6** | P5/P6 `AUTO\|OFF\|ON` | **UNCHANGED** — JAK, nie CZY |
| **OD-RA-7** | `tendersTabForStaffEnabled` | **UNCHANGED** · osobne uprawnienie |
| **OD-RA-8** | Single runtime entry | Downstream P2–P8 nadal tylko `isIkEntryEnabled()` |
| **OD-RA-9** | A08-P2 | **CLOSED / UNCHANGED** |
| **OD-RA-10** | Leftover `ikEntryEnabled` | Zostaje w AppSettings · **nie** runtime AND · **nie** jedyny gate Admin/Moderator · **nie** delete w tym slice |
| **OD-RA-11** | OD-P1-1 superseded | „Jedyny biznesowy switch = `ikEntryEnabled`” **nie** obowiązuje dla access. Biznesowy access = helper + dwa klucze roli. Silnik nadal czyta `isIkEntryEnabled()` |

---

## 3. Functional contract (LOCKED)

| Actor | IK ACCESS | Depends on |
|-------|-----------|------------|
| Super Admin | **ALWAYS TRUE** | Rola. Ignoruje `ikEntryEnabled` i oba nowe klucze |
| Admin | `ikEntryForAdminEnabled === true` | default **false** |
| Moderator | `ikEntryForModeratorEnabled === true` | default **false** |
| Inspector | **FALSE** | nawet gdy obie flagi `true` |
| Worker | **FALSE** | brak `AdminRole` / brak admin session |
| Brak sesji | **FALSE** | |

Po **TRUE**:

```text
Documents → BOQ → P5 → P6 → P7 → P8
IK ACCESS ∧ P5/P6 AUTO|ON ∧ true MISS ∧ safety
→ Research permission (A08-P2)
```

Po **FALSE**:

```text
IkEntryHost not mounted
isIkEntryEnabled() === false
P2–P8 OFF
executeResearch === false
```

---

## 4. Authorization SSOT (FROZEN)

**File:** `src/lib/admin-auth.ts`  
**Placement:** bezpośrednio po `adminCanViewChanges`.  
**Pattern:** identyczny z `adminCanViewWorkCatalog` / `adminCanViewInstructions`.

```ts
export function adminCanUseIntelligentEstimator(
  role: AdminRole,
  settings: {
    ikEntryForAdminEnabled?: boolean;
    ikEntryForModeratorEnabled?: boolean;
  },
): boolean {
  if (role === "super_admin") return true;
  if (role === "admin") return settings.ikEntryForAdminEnabled === true;
  if (role === "moderator") return settings.ikEntryForModeratorEnabled === true;
  return false;
}
```

**Forbidden in helper:**

- czytanie `ikEntryEnabled`
- czytanie `tendersTabForStaffEnabled`
- czytanie `ikLaborE2eEnabled` / Research leftover
- import `ik-entry-flag.ts` (cykl FORBIDDEN)
- `|| true` / `role !== "inspector"` jako skrót dla Admin+Moderator

Worker nie jest `AdminRole` — helper **nie** dostaje `"worker"`. Adapter sesji zwraca `false` przy braku `AdminSession`.

Export: **tylko** `admin-auth.ts` (nie `intelligent-estimator/index.ts`).

---

## 5. Entry adapter (FROZEN)

**File:** `src/lib/intelligent-estimator/ik-entry-flag.ts`  
**Function:** `isIkEntryEnabled()` — jedyny runtime entry gate.

```text
1. ikEntryForTests != null     → return that boolean
2. loadAdminSessionFromStorage() == null → false
3. return adminCanUseIntelligentEstimator(session.role, loadAppSettingsLocal())
```

`forceIkEntryEnabledForTests` **KEEP** — API i semantyka A05–A08.

**Forbidden:**

```text
isIkEntryEnabled() := loadAppSettingsLocal().ikEntryEnabled === true
isIkEntryEnabled() := helper ∧ ikEntryEnabled
role logic in TenderDetailPage / IkEntryHost / P5–P8 / experts
```

Downstream **UNCHANGED** w wywołaniach:

- `isIkP2DocumentsBoqActive()`
- `isIkP3IdentityCoverageActive()` / P4
- `isIkP5LaborE2eActive()` / `isIkP5LaborExecuteResearchActive()`
- `isIkP6MaterialE2eActive()` / `isIkP6MaterialExecuteResearchActive()`
- `isIkP7F5E2eActive()` / `isIkP8RiskDecisionE2eActive()`

`TenderDetailPage.tsx`: **no planned edit** — nadal `isIkEntryEnabled()`.

---

## 6. AppSettings (FROZEN)

KV: `kw-app-settings` · **no** new key namespace · **no** blob migration.

| Field | Default | Parse | Merge |
|-------|---------|-------|-------|
| `ikEntryForAdminEnabled` | `false` | `=== true` else false | remote true/false wins, else local |
| `ikEntryForModeratorEnabled` | `false` | j.w. | j.w. |

Wzorzec merge: `mergeInstructionsForAdminEnabled`.

`saveAppSettings` — istniejący flow (local + `persistKey`). **Nie** nowa funkcja zapisu.

Missing live KV fields → **false**. Safe bez migracji.

`ikLaborE2eEnabled` / `ikMaterialE2eEnabled` / P7 / P8 / leftover `ik*ResearchEnabled`: **UNCHANGED**.

---

## 7. Legacy `ikEntryEnabled` (FROZEN)

| Rule | Frozen |
|------|--------|
| Usunąć z typu / KV / merge / parse | **NO** (ten slice) |
| Runtime conjunct w helperze lub adapterze | **NO** |
| Super Admin AND `ikEntryEnabled` | **FORBIDDEN** |
| Jedyny gate Admin/Moderator | **NO** |
| Checkbox ⚙ zapisujący ten klucz | **REMOVE** (UI) |
| Dokumentacja | leftover / no-op — analog `ikAutoIngestEnabled` |
| Cleanup commit | **NOT THIS SLICE** |

Live `ikEntryEnabled=false` **musi** dać Super Admin IK **TRUE** po IMPLEMENT.

`defaultAppSettings().ikEntryEnabled` (dziś `true`) **nie** jest access gate.

---

## 8. UI (FROZEN)

**File:** `src/app/AdminSettingsModal.tsx`  
**Who:** tylko Super Admin (istniejący gear + modal). **Nie** nowy panel dla Admina.

**Location:** sekcja **Moduły**, **przed** `TECHNICAL / ADVANCED / EMERGENCY`.

**REMOVE:**

- checkbox `ikEntryEnabled`
- `data-ik-entry-toggle`
- copy „Steruje działaniem Inteligentnego Kosztorysanta w przetargach.”

**ADD (exact labels):**

```text
Inteligentny Kosztorysant

[ ] Dostęp dla Administratorów
[ ] Dostęp dla Moderatorów
```

Hint (LOCKED sense, wording may match Instrukcja style):

- Super Administrator zawsze korzysta z IK (brak własnego przełącznika).
- Domyślnie wyłączone. Po włączeniu — dana rola ma dostęp do IK w przetargach.
- Niezależne od przełącznika modułu Przetargi.

**data-\* (LOCKED):**

| Control | Attribute |
|---------|-----------|
| Admin | `data-ik-entry-for-admin-toggle` |
| Moderator | `data-ik-entry-for-moderator-toggle` |

Write: `saveAppSettings({ ...appSettings, ikEntryForAdminEnabled \| ikEntryForModeratorEnabled })`.

**FORBIDDEN UI:**

```text
[ ] Włącz Inteligentnego Kosztorysanta
[ ] Włącz IK dla Super Admina
[ ] Research / Auto Research / Research on Miss
nowe P5/P6 checkboxy
zmiana tendersTabForStaffEnabled
```

P5/P6 AUTO\|OFF\|ON w Technical: **KEEP**.

---

## 9. Security (FROZEN)

| Rule | Frozen |
|------|--------|
| CSS / conditional render only | **INSUFFICIENT** |
| Runtime | adapter + helper |
| Unauthorized ⚙ write | Admin/Moderator **nie** otwierają modalu (istniejący `adminIsSuperAdmin`) |
| Nowy ACL store / LS key / KV | **FORBIDDEN** |
| Local tampering nowych flag | ten sam model co Instructions: cloud `remote false` wins; **nie** daje Inspectorowi IK; **nie** wyłącza Super Admina |
| Inspector + flags true | helper `false` |
| Worker | no session → adapter `false` |
| Direct existing entry | nadal `isIkEntryEnabled()` |

**Nie** tworzyć drugiego permission check w `IkEntryHost`.

---

## 10. A08-P2 compatibility (FROZEN)

**CLOSED.** Ten DF **nie** otwiera P2.

UNCHANGED:

- Research-on-Miss · true MISS · HIT = 0 HTTP
- F1 · COMPOUND/UNKNOWN/BOTH/UNRESOLVED HOLD
- `mat.inv.*` HARD-FORBID
- IC-SEQ-1 · IC-SEQ-2
- Research ≠ Accept
- leftover `ik*ResearchEnabled` not a conjunct
- legal / budget / cooldown / session-busy
- `executeResearch` = IK ACCESS ∧ P5/P6 AUTO\|ON (boolean E2E)

Po IMPLEMENT Super Admin na `/przetarg`: IK ON + default AUTO → Research tylko true MISS. To jest **dostęp**, nie nowy silnik.

---

## 11. Companion harness migration (FROZEN LIST · do not edit tests in this turn)

Przy **IMPLEMENT** (nie teraz) zaktualizować source-scan, które szukają starego globalnego toggle:

| File | Assertions to retarget |
|------|------------------------|
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | T02 `data-ik-entry-toggle` before Technical · T05 `ikEntryEnabled: e.target.checked` · T07 unique `data-ik-entry-toggle` · T10 `gitDiffEmpty(admin-auth/app-settings)` **nie** blokuje tego slice |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | T25 `data-ik-entry-toggle` |
| `scripts/test-ik-migration-01-p1-entry.mjs` | „Admin IK toggle present” |
| `scripts/test-ik-migration-01-p0-implementation.mjs` | „Admin IK toggle present” / „F Admin toggle present” |

Nowe oczekiwanie: dwa `data-ik-entry-for-*-toggle`; **brak** zapisu `ikEntryEnabled` z checkboxa.

**KEEP without rewrite of engines:** A05 · A06 · A07 · A08-P2 · A08-P0 **runtime T01** (`force` true/false) · migration P5/P6 (force).

**Nie uruchamiać** testów w tej turze.

---

## 12. Files IN / OUT

**IN (future IMPLEMENT only):**

1. `src/lib/admin-auth.ts`
2. `src/lib/app-settings.ts`
3. `src/lib/intelligent-estimator/ik-entry-flag.ts`
4. `src/app/AdminSettingsModal.tsx`
5. `scripts/test-ik-role-activation.mjs` (new)
6. Companion scans §11
7. Changelog / `09` — **po** IMPLEMENT/PV, nie w DF

**OUT (NOT TOUCHED):**

`ik-labor-expert.ts` · `ik-material-expert.ts` · `classification-gate.ts` · research engines · `ik-p7-position-cost-bid.ts` · `ik-p8-risk-decision.ts` · `IkEntryHost.tsx` · Accept · OUR RATE · Final Bid · D · Chief · Payroll · `cloud-sync.ts` · Composite · Hub · P5/P6 mode semantics · `tendersTabForStaffEnabled` semantics · unrelated WIP

`TenderDetailPage.tsx`: OUT unless adapter okazuje się niewystarczający (PLAN: nie planować).

---

## 13. Acceptance criteria (FROZEN)

### 13.1 Access matrix

1. Super Admin + `ikEntryEnabled=false` → IK **TRUE**
2. Super Admin bez żadnego nowego IK settingu → IK **TRUE**
3. Admin + `ikEntryForAdminEnabled=false` → **FALSE**
4. Admin + `true` → **TRUE**
5. Moderator + `false` → **FALSE**
6. Moderator + `true` → **TRUE**
7. Inspector → **FALSE** (flags ignored)
8. Worker → **FALSE**
9. Brak sesji → **FALSE**
10. Moderator flag **nie** włącza Admina i odwrotnie

### 13.2 Settings / cloud / legacy

11. Default obu nowych kluczy = **false**; missing KV = **false**; **no** migracja
12. Merge: remote `false` wins over local `true` (wzorzec Instructions)
13. Legacy `ikEntryEnabled` **nie** jest conjunct; Super Admin **nie** OFF przez ten klucz
14. Brak nowego KV / ACL store

### 13.3 UI / write path

15. Tylko Super Admin zmienia dwa checkboxy
16. Brak checkboxa Super Admin ON/OFF
17. Brak Research switch
18. Brak globalnego „Włącz Inteligentnego Kosztorysanta”
19. Unauthorized settings write: brak ⚙ dla nie-Super-Admin (istniejący gate); brak nowego write API

### 13.4 Runtime / engine

20. `forceIkEntryEnabledForTests` **KEEP**
21. P5/P6 AUTO\|OFF\|ON **KEEP**
22. IK Entry (`isIkEntryEnabled`) = jedyny biznesowy entry gate
23. P2–P8 **bez** własnej logiki roli
24. A08-P2 semantycznie **bez zmian**
25. Companion harnessy §11 zaktualizowane przy IMPLEMENT
26. `tendersTabForStaffEnabled` **UNCHANGED**

---

## 14. Test matrix (IMPLEMENT — not this turn)

New: `npx vite-node scripts/test-ik-role-activation.mjs`

| ID | Case | Expected |
|----|------|----------|
| T01 | helper `super_admin` defaults | `true` |
| T02 | helper `super_admin` + `ikEntryEnabled: false` + role flags false | `true` |
| T03 | helper `admin` default | `false` |
| T04 | helper `admin` + admin flag true | `true` |
| T05 | helper `admin` + only moderator flag true | `false` |
| T06–T08 | moderator analogicznie | OFF / ON / no cross-flag |
| T09 | `inspector` + both flags true | `false` |
| T10 | merge missing → false; remote false wins | pass |
| T11 | `force(true)` no session | `true` |
| T12 | `force(false)` | `false` |
| T13 | `force(null)` + no session | `false` |
| T14–T19 | UI source-scan §8 + §11 | pass |

A08-P2 / A05–A07: **run at IMPLEMENT**, not DF.

---

## 15. Risks (frozen awareness)

| Risk | Freeze response |
|------|-----------------|
| Super Admin live Research-on-Miss po deploy | Zamierzone OD-RA-1 · PV nie flipuje Admin/Moderator |
| A08-P1 T02/T05/T07 FAIL | Companion IN scope IMPLEMENT |
| `force(null)` w Node | no session → false; harnessy A05–A08 force-ują przed asercją |
| Import cycle | helper ↛ `ik-entry-flag` |
| AND leftover key | FORBIDDEN |
| `git add -A` | FORBIDDEN |

---

## 16. Rollback (future)

Revert slice files. Nowe klucze `false` w KV pozostają harmlessly. A08-P2 nietknięty. Po revert Super Admin znowu zależy od globalnego `ikEntryEnabled` (live false = wszyscy OFF).

---

## 17. Sequence after this DF

```text
NOW     = OWNER / ARCH REVIEW of this DF
NOT NOW = IMPLEMENT
THEN    = IMPLEMENT per §12 + companion §11
THEN    = build + harnesses (IMPLEMENT tura)
THEN    = commit jawnych plików na Owner GO
THEN    = PV without flipping Admin/Moderator flags
```

**ARCH REVIEW musi potwierdzić:** brak cyklu importów · leftover nie-AND · tenders ≠ IK · brak roli w host/ekspertach · companion list complete.

---

## STOP

```text
IK ROLE ACTIVATION DESIGN FREEZE = READY FOR ARCH REVIEW

Design Freeze:
READY

Implementation:
NOT AUTHORIZED

Runtime:
UNCHANGED

Settings:
UNCHANGED

Production:
UNCHANGED

A08-P2:
CLOSED / UNCHANGED

Research:
UNCHANGED

New switches:
NONE beyond Admin + Moderator access

Super Admin:
ALWAYS ON

Admin:
DEFAULT OFF / Super Admin controlled

Moderator:
DEFAULT OFF / Super Admin controlled

Inspector:
OFF

Worker:
OFF

STOP.
```
