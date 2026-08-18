# IK AUTONOMY-08 P1 — Settings Unification  
## ARCHITECTURE REVIEW

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-ARCH-REVIEW` |
| **Status** | **ARCH REVIEW = PASS WITH CONDITIONS** |
| **Date** | 2026-08-17 |
| **Mode** | ARCH REVIEW ONLY · **ZERO CODE** · **ZERO UI PATCH** · **ZERO SETTINGS WRITE** · **ZERO RESEARCH HTTP** · **ZERO BUSINESS WRITE** · **ZERO TEST RUNTIME** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY** |
| **Production** | **2.66.93** / **`b98e68e5`** · docs **`43ef9f64`** |
| **Design Freeze** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md) |
| **PLAN** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md) |
| **AUDIT** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md) |

```text
ARCH REVIEW                = PASS WITH CONDITIONS
ARCHITECTURE BLOCKERS      = 0
DESIGN FREEZE              = CONSISTENT WITH SOURCE
RUNTIME                    = NO CHANGE REQUIRED
APPSETTINGS / KV           = NO SCHEMA CHANGE
Implementation             = NOT AUTHORIZED
Code / UI / Settings       = ZERO
Commit / Push / Deploy     = NOT DONE
EPIC                       = AUTONOMY-08 — P1
```

Nie implementowano. Nie poprawiano kodu. Nie poprawiano DF. Nie ruszano produkcji.

---

## 1. Architecture blockers

**BLOCKERS = 0.**

Brak sprzeczności, która uniemożliwia UI-only P1 przy zachowaniu A05–A08 i 08-P0.

Znalezione ryzyka to **CONDITION** implementacji (harness copy, accordion mount), nie wady modelu.

---

## 2. DF consistency (vs SOURCE)

| DF claim | SOURCE | Match |
|----------|--------|-------|
| ⚙ tylko Super Admin | `AdminTopbar.tsx`: gear iff `adminIsSuperAdmin` | **YES** |
| Inventory Moduły 1–13 | `AdminSettingsModal.tsx` kolejność Przetargi → WM → Szkice → D → IK → P3…P8 | **YES** |
| AUTO_INGEST UI absent | brak `data-ik-auto-ingest-toggle` / `AUTO_INGEST` w modalu | **YES** |
| `ikEntryEnabled` checkbox `data-ik-entry-toggle` | lines ~424–442 | **YES** |
| P5–P8 select AUTO/ON/OFF + confirm OFF | existing `normalizeIkE2eMode` + `window.confirm` | **YES** |
| `data-ik-*` listed in DF §1 | all present | **YES** |
| P2 gate = Entry only | `isIkP2DocumentsBoqActive()` := `isIkEntryEnabled() === true` | **YES** |
| leftover ingest not P2 gate | comment + helper; host uses `isIkP2DocumentsBoqActive()` | **YES** |
| D osobno | `expertAiDecydentEnabled` + `data-expert-ai-decydent-toggle` przed IK | **YES** |
| Roles: no staff ⚙ | `adminIsSuperAdmin`; `adminCanViewTendersTab` Super Admin bypass | **YES** |
| File scope = modal + changelog (+ new smoke) | no helper change required | **YES** |

Niezgodność **planowana** (nie blocker): DF §5.1 **zastępuje** copy 08-P0 *„od dokumentów i przygotowania BOQ”*. SOURCE nadal ma ten string. To jest **cel P1**, nie błąd DF. Wymaga CONDITION **IC-1**.

Napięcie DF §6: „REUSE wzorca NG11” vs „zakaz `{open && (` unmount”. SOURCE NG11 (`ng11PipelinePerfOpen &&`) **odmontowuje** dzieci. DF już rozstrzyga: reuse **chrome** (button + ChevronDown + `aria-expanded`), **nie** gałęzi unmount. **IC-2**.

---

## 3. Runtime safety

P1 **nie wymaga** zmiany:

| Surface | Evidence | P1 |
|---------|----------|-----|
| Mount host | `TenderDetailPage`: `ikEntryOn && activeTab === "przetarg"` | **KEEP** |
| P2 ingest | `IkEntryHost` `p2DocumentsBoqOn = isIkP2DocumentsBoqActive()` | **KEEP** |
| P5–P8 | helpers Entry ∧ AUTO\|ON | **KEEP** |
| Research | `=== true` MODE B | **KEEP** |
| P3 | extra AND `ikIdentityCoverageEnabled` | **KEEP** (hide ≠ fold) |
| P4 | extra AND `ikChiefWiringEnabled` | **KEEP** (nie fold) |
| D | Dual Outcome / `expertAiDecydentEnabled` | **KEEP** |
| Engines / orchestrator | poza `AdminSettingsModal` | **KEEP** |

Pozycja DOM kontrolek **nie** jest czytana przez runtime. Konsumenci biorą `loadAppSettingsLocal()` / helpery.

Ukrycie P3 przy live KV `true` **zostawia diagnostykę włączoną** — DF §10 to przewiduje. To nie jest zmiana runtime.

---

## 4. Settings safety

| Item | Verdict |
|------|---------|
| Nowa flaga | **NOT REQUIRED** · `ikEntryEnabled` wystarcza |
| Klucze / typy / defaulty | **NO CHANGE** |
| B-POLICY / `normalizeIkE2eMode` | missing → AUTO |
| OFF wins `mergeIkE2eMode` | SOURCE unchanged; P1 must not touch |
| Research vs enum | never derived from enum |
| `ikAutoIngestEnabled` leftover | **KEEP field** · **no UI restore** |
| KV migration | **NOT REQUIRED** · **FORBIDDEN** |
| Accordion state | local React only · **must not** enter AppSettings |

`saveAppSettings` tylko na istniejącym `onChange` kontrolek — jak dziś. Expand accordion = **zero write**.

---

## 5. Role / access safety

| Role | ⚙ today | DF P1 |
|------|---------|-------|
| Super Admin | YES | YES + Technical collapsed |
| Administrator | NO | NO · **no new panel** |
| Moderator | NO | NO |

`adminCanViewTendersTab`: Super Admin always; staff only if `tendersTabForStaffEnabled`. DF **nie** wymaga zmiany `admin-auth.ts` / `AdminTopbar.tsx` / `App.tsx`.

**Finding F4 (non-blocking):** `AdminSettingsModal` sam nie filtruje roli na sekcji Moduły; dostęp jest na przycisku ⚙. Pre-existing. P1 **nie** musi tego zmieniać.

---

## 6. Reuse First

| Reuse | Status |
|-------|--------|
| `AdminSettingsModal` karta Moduły | **YES** — brak nowej karty / ekranu / dashboardu |
| Checkbox IK / D / Przetargi / WM | **YES** |
| P3–P8 existing widgets + `data-*` + confirm | **YES** — move, not rewrite |
| `ChevronDown` już w modalu | **YES** |
| `ikEntryEnabled` | **YES** — jedyny biznesowy switch |
| `saveAppSettings` / merge | **YES** |
| `adminIsSuperAdmin` | **YES** |

**Nie** nowy settings engine, Feature Flags, orchestrator, helper, enum parser.

---

## 7. Migration safety

| Risk | Level | Note |
|------|-------|------|
| KV migrate / delete leftover ingest | **N/A** — forbidden |
| Mixed old/new bundle | **SAFE** — ten sam schemat kluczy |
| Hide P3 while live `true` | **SAFE** — diagnostyka zostaje; no write |
| Hide P5–P8 while enum AUTO | **SAFE** — etapy nadal biegną gdy IK ON |
| Accordion persist | **UNSAFE if stored** — DF forbids |

---

## 8. Rollback

| Path | Viable? |
|------|---------|
| Revert commit UI P1 | **YES** · KV nienaruszone |
| IK OFF | **YES** · `ikEntryEnabled` primary checkbox |
| Stage OFF | **YES** · Technical select `"OFF"` + existing confirm · OFF wins |
| Research off | **YES** · MODE B checkbox |
| P3/P4 | **YES** · Technical checkboxes |
| Rollback 08-P0 / A05–A07 razem z P1 | **MUST NOT** |

---

## 9. C1–C10

| ID | Question | Answer |
|----|----------|--------|
| **C1** | `ikEntryEnabled` jedyny biznesowy IK switch bez nowej flagi? | **TAK.** Host mount + P2 + (przy AUTO/ON) P5–P8 już od Entry. |
| **C2** | Przeniesienie P3–P8 + Research do collapsible Technical = UI-only? | **TAK**, o ile zero zmian helperów/silników i te same `onChange`. |
| **C3** | Wszystkie runtime consumers zachowane? | **TAK.** Czytają settings/helpers, nie kolejność UI. |
| **C4** | AppSettings + KV bez migracji bezpieczne? | **TAK.** Leftover ingest / live P3/D/Entry **leave**. |
| **C5** | `data-*` bez zmian? | **TAK.** Harnessy grepują **source**. DOM: **IC-2** (mounted when collapsed). |
| **C6** | Mixed-client bez zmian? | **TAK.** Brak nowego schematu / dual-write. |
| **C7** | Rollback możliwy? | **TAK.** §8. |
| **C8** | P1 bez new engine / flag / orchestrator / schema / KV migration? | **TAK.** |
| **C9** | D poprawnie oddzielony od IK? | **TAK.** Zostaje primary · inny klucz · DF nie rusza Dual Outcome. |
| **C10** | AUTO_INGEST całkowicie poza UI? | **TAK.** Już absent. DF zakazuje przywrócenia. P2 nie czyta leftover. |

---

## 10. Findings

| ID | Severity | Finding |
|----|----------|---------|
| **F1** | CONDITION | `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` **T24** grepuje `/od dokumentów i przygotowania BOQ/`. DF **musi** ten string zastąpić. Bez aktualizacji T24 harness 08-P0 padnie. **Nie** zostawiać starego copy „dla testu”. |
| **F2** | CONDITION | NG11 używa `{open && (` → unmount. P1 **nie** wolno skopiować tej gałęzi dla P3–P8. Chrome NG11 **TAK**; dzieci **zawsze w drzewie** (`hidden` / CSS). |
| **F3** | INFO | Live P3 `true` po hide UI nadal diagnostyka ON. Zamierzone. Nie pisać KV. |
| **F4** | INFO | Modal nie ma wewnętrznego ACL na Moduły. Pre-existing. Poza P1. |
| **F5** | CONDITION | Nowy smoke P1: **nie** wymaga czystego całego worktree. Assert: diff P1 **nie** rusza `ik-entry-flag.ts` / `IkEntryHost.tsx` / `app-settings.ts`. Unrelated WIP zostaje unstaged. |
| **F6** | INFO | Prefix `Emergency / diagnostic.` na helper copy P5–P8 jest opcjonalny. A05 T21 wymaga zachowania: `IK automatycznie wykonuje read-only MODE A`, `MODE A wymuszony`, `IK nie uruchamia tego eksperta`. A06/A07: confirm strings. |
| **F7** | INFO | Istniejący `maybePromoteWmRysunki01FromLs` przy mount ⚙ może pisać settings (WM). P1 **nie** dodaje analogicznego efektu dla IK. |

**Nie znaleziono** potrzeby nowego silnika, flagi, orchestratora, migracji KV, panelu Admina.

---

## 11. Required implementation conditions

Obowiązkowe przy **późniejszym** IMPLEMENT GO (nie teraz):

| ID | Condition |
|----|-----------|
| **IC-1** | Zmienić **tylko** asercję T24 copy w `test-ik-autonomy-08-p0-documents-boq.mjs` na nowy SSOT: `Steruje działaniem Inteligentnego Kosztorysanta w przetargach.` Zachować T24 `no AUTO_INGEST` i T25 `data-ik-entry-toggle`. Inne A05–A07 / P1–P8 harnessy: **zero edycji**, jeśli `data-*` + confirm/option strings zostają. |
| **IC-2** | Accordion: default collapsed · local `useState(false)` · **nie** persist. Dzieci P3–P8 **mounted when collapsed**. Nie kopiować `{ng11PipelinePerfOpen && (` dla tej sekcji. |
| **IC-3** | Diff runtime = **empty**: `ik-entry-flag.ts`, `IkEntryHost.tsx`, `app-settings.ts` (klucze/merge), `TenderDetailPage.tsx`, `admin-auth.ts`, `AdminTopbar.tsx`, silniki P5–P8, ingest. |
| **IC-4** | `data-ik-*` z DF §1 wiersze 5–13 **nie rename**. `data-ik-entry-toggle` **powyżej** markera Technical w pliku. P3–P8 **poniżej** markera. D **powyżej** Technical. |
| **IC-5** | AUTO_INGEST **nie wraca**. |
| **IC-6** | D copy/widget **UNCHANGED**. D **nie** w Technical. |
| **IC-7** | Expand/collapse **nie** woła `saveAppSettings`. |
| **IC-8** | Nowy smoke `test-ik-autonomy-08-p1-settings-unification.mjs` (DF §14). Potem A05–A07 + 08-P0 (po IC-1) PASS. `npm run build` przed commitem UI. |
| **IC-9** | Changelog bump **tylko** gdy UI ship. **Nie** `git add -A`. Unrelated WIP unstaged. |
| **IC-10** | Brak nowego klucza AppSettings. Brak KV write w sesji implement (poza ewentualnym ręcznym kliknięciem SA — nie część smoke). |

---

## 12. Final verdict

```text
ARCH REVIEW            = PASS WITH CONDITIONS
ARCHITECTURE BLOCKERS  = 0
DF CONSISTENCY         = PASS (copy 08-P0 → P1 is intentional; IC-1)
RUNTIME SAFETY         = PASS · no helper/engine change required
SETTINGS SAFETY        = PASS · no schema / no migration
ROLE SAFETY            = PASS · no auth model change
REUSE FIRST            = PASS
MIGRATION SAFETY       = PASS
ROLLBACK               = PASS
C1–C10                 = ALL YES
```

Regression (kod nienaruszony przez P1 UI-only):

| Lock | Arch Review |
|------|-------------|
| A05 | **UNCHANGED** jeśli IC-2/IC-4/IC-6 |
| A06 | **UNCHANGED** |
| A07 | **UNCHANGED** |
| A08-P0 runtime | **UNCHANGED** (`isIkP2DocumentsBoqActive` := Entry) |
| A08-P0 T24 copy | **must retarget** (IC-1) · kontrakt P2 **nie** |
| P1 invoice CLOSED | **no touch** |
| P2 KEEP GAP | **no touch** |
| Composite CLOSED | **no touch** |
| CatalogWork 471 | **no catalog write** |
| D HARD STOP | **primary, unchanged** |

---

## 13. Implementation authorization status

```text
IMPLEMENTATION         = NOT AUTHORIZED
OWNER IMPLEMENT GO     = REQUIRED (not granted by this review)
ARCH REVIEW PASS       ≠ IMPLEMENT
CODE                   = ZERO
UI CODE                = ZERO
SETTINGS WRITE         = ZERO
BUSINESS WRITE         = ZERO
RESEARCH               = ZERO
COMMIT                 = NOT DONE
PUSH                   = NOT DONE
DEPLOY                 = NOT DONE
```

**NEXT** = Owner Review / Implementation GO.

Bez Owner GO na kod: **STOP**.

---

## Status

```text
ARCH REVIEW                = PASS WITH CONDITIONS
ARCHITECTURE BLOCKERS      = 0
DESIGN FREEZE              = READY (unchanged this turn)
IMPLEMENTATION             = NOT AUTHORIZED
P0                         = COMPLETE / CLOSED
P1                         = ARCH REVIEW COMPLETE
EPIC                       = AUTONOMY-08 — P1
```
