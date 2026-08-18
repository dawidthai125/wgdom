# IK AUTONOMY-08 P1 — Settings Unification  
## IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-IMPLEMENTATION-CLOSEOUT` |
| **Status** | **IMPLEMENTATION = PASS** · **OWNER VERIFY = NOT DONE** |
| **Date** | 2026-08-17 |
| **UI** | **2.66.94** (changelog; not deployed) |
| **Production tip** | still **2.66.93** / **`b98e68e5`** until Owner commit+push |
| **DF** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md) |
| **ARCH REVIEW** | PASS WITH CONDITIONS · blockers **0** · IC-1 / IC-2 honoured |
| **Slice** | **08-P1 only** — Super Admin ⚙ UI organization |

```text
IMPLEMENTATION     = PASS
OWNER VERIFY       = NOT DONE
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE
PRODUCTION VERIFY  = NOT DONE
EPIC               = AUTONOMY-08 — P1
NEXT               = OWNER VERIFY
```

NEW ENGINE = NO · NEW FLAG = NO · NEW ORCHESTRATOR = NO · KV MIGRATION = NO.

---

## 1. Implementation result

Super Admin ⚙ Moduły: **jedyny biznesowy switch IK** = `ikEntryEnabled` (checkbox ON/OFF).

P3–P8 + Research przeniesione do **TECHNICAL / ADVANCED / EMERGENCY** (domyślnie zwinięte). Te same widgety, ten sam `appSettings` binding, te same `data-*`, te same `saveAppSettings` na zmianie wartości.

AUTO_INGEST **nie wraca**. D zostaje w primary (HARD STOP). Runtime A05–A08 / P0 **bez zmian**.

Copy IK (SSOT):

> Steruje działaniem Inteligentnego Kosztorysanta w przetargach.

---

## 2. Files changed (this implementation)

| File | Role |
|------|------|
| `src/app/AdminSettingsModal.tsx` | IK copy · accordion Technical · `hidden={!ikTechnicalOpen}` (IC-2) |
| `src/app/changelog-data.ts` | **2.66.94** |
| `CHANGELOG.md` | mirror 2.66.94 |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **IC-1** T24 copy assertion only |
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | **new** source smoke (54) |

**Nie ruszane:** `app-settings.ts` · `ik-entry-flag.ts` · `IkEntryHost.tsx` · `TenderDetailPage.tsx` · `admin-auth.ts` · `AdminTopbar.tsx` · silniki P5–P8 · ingest.

Prior docs (untracked, this epic, not code): AUDIT · PLAN · DF · ARCH REVIEW · ten closeout.

`git diff --stat` (implementation tracked files): **4 files, +51 / −3** (+ nowy harness untracked).

---

## 3. UI structure (after)

```text
Moduły
  Przetargi
  Rysunki WM
  Szkice pracownika
  Expert AI · Przebieg i Decydent     ← D HARD STOP
  Inteligentny Kosztorysant           ← ikEntryEnabled  data-ik-entry-toggle
  ▶ TECHNICAL / ADVANCED / EMERGENCY  ← collapsed · local state only
      intro (diagnostic / emergency)
      P3 Identity Coverage
      P4 Chief Wiring
      P5 Labor E2E + Labor Research
      P6 Material E2E + Material Research
      P7 F5/Bid
      P8 Risk/Decision
Developer / NG11                      ← UNCHANGED (osobna karta; nadal unmountuje własne dzieci)
```

Jedna instancja każdego controlu. Expand **nie** woła `saveAppSettings`.

---

## 4. IC-1

`scripts/test-ik-autonomy-08-p0-documents-boq.mjs` T24:

| Before | After |
|--------|--------|
| `/od dokumentów i przygotowania BOQ/` | `/Steruje działaniem Inteligentnego Kosztorysanta w przetargach/` |

Zachowane: T24 no AUTO_INGEST · T24 no `IK · AUTO_INGEST` · T25 `data-ik-entry-toggle` · cały kontrakt P2 (`isIkP2DocumentsBoqActive` := Entry).

P0 harness: **61 PASS / 0 FAIL**.

---

## 5. IC-2

| Rule | Implementation |
|------|----------------|
| Default | `useState(false)` — `ikTechnicalOpen` |
| Persist | **none** (nie AppSettings / KV / LS) |
| Chrome | button + `ChevronDown` + `aria-expanded` (reuse NG11 chrome, **not** unmount) |
| Children | **always mounted** · `hidden={!ikTechnicalOpen}` |
| Unmount pattern | **absent** — no `{ikTechnicalOpen && (` |
| Duplicates | each `data-ik-*` count **1** |

---

## 6. Runtime invariants

| Lock | Status |
|------|--------|
| `isIkP2DocumentsBoqActive()` := Entry | **UNCHANGED** |
| leftover `ikAutoIngestEnabled` | field kept · not a gate · **no UI** |
| P5/P6/P7/P8 helpers | **UNCHANGED** (git diff empty) |
| Research `=== true` | **UNCHANGED** |
| D / Chief | **UNCHANGED** · D primary |
| AUTO / OFF / ON · B-POLICY · OFF wins | **UNCHANGED** |
| P1 invoice CLOSED | **no touch** |
| P2 KEEP GAP | **no touch** |
| Composite CLOSED | **no touch** |
| CatalogWork 471 | **no catalog write** |

---

## 7. Regression

| Suite | Result |
|-------|--------|
| `test-ik-autonomy-08-p1-settings-unification.mjs` | **54 PASS / 0 FAIL** |
| `test-ik-autonomy-08-p0-documents-boq.mjs` | **61 PASS / 0 FAIL** (T24 new copy · nested A05–A07 + P1 invoice + identity + Composite + P1-entry + P2/P3 impl) |
| `test-ik-autonomy-05-explicit-auto-off-on.mjs` | **77 PASS / 0 FAIL** |
| `test-ik-autonomy-06-p7-autonomous-bid-calculation.mjs` | **95 PASS / 0 FAIL** |
| `test-ik-autonomy-07-p8-autonomous-risk-decision.mjs` | **117 PASS / 0 FAIL** |

---

## 8. Build

`npm run build` → **PASS** (`✓ built in 24.51s`).

Vite warnings (`material-sell-adapter.ts` duplicate key, chunk size, node:fs externalize) = **PRE-EXISTING / OUT OF SCOPE**. Nie naprawiane.

---

## 9. Write audit

| Class | Count |
|-------|-------|
| Business writes | **0** |
| Research HTTP | **0** |
| Settings / KV writes | **0** |
| Production settings | **not touched** |

Accordion toggle = local React state only.

---

## 10. Unrelated WIP

**NOT staged.** Worktree nadal zawiera wcześniejszy WIP (LoginScreen, PayrollView, Ceny Materiałów docs, `.cursor/rules`, `.tmp-*`, itd.).

**Nigdy** `git add -A`. Commit P1 (gdy Owner GO) = jawna lista plików z §2 + ten closeout + AUDIT/PLAN/DF/ARCH REVIEW.

---

## 11. Owner Verify readiness

Gotowe do Owner Verify na Super Admin ⚙:

1. Primary: Przetargi · WM · D · **IK ON/OFF** z nowym copy.  
2. Technical collapsed; po rozwinięciu P3–P8 + Research.  
3. AUTO_INGEST absent.  
4. IK OFF/ON nadal `ikEntryEnabled`.  
5. Wartości P3–P8 **nie** zresetowane (brak KV write).  
6. Zwykły Administrator nadal **bez** ⚙.

```text
OWNER VERIFY       = NOT DONE
COMMIT             = NOT DONE
PUSH               = NOT DONE
DEPLOY             = NOT DONE
PRODUCTION VERIFY  = NOT DONE
```

STOP. Czekaj na OWNER VERIFY.
