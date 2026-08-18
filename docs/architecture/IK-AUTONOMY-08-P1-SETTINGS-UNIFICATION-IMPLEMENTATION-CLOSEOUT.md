# IK AUTONOMY-08 P1 — Settings Unification  
## IMPLEMENTATION CLOSEOUT

| Field | Value |
|-------|-------|
| **ID** | `IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-IMPLEMENTATION-CLOSEOUT` |
| **Status** | **PRODUCTION VERIFIED** · **DOCUMENTATION CLOSEOUT READY** · **AUTONOMY-08 epic NOT CLOSED** |
| **Date** | 2026-08-18 |
| **UI** | **2.66.94** |
| **Production** | **2.66.94** / live **`e0373fa`** · impl **`e0373fac`** (`e0373fac558d9ea609343a7ecb8544d99cfe9252`) |
| **Deploy** | Vercel Git Integration · ID **`Cj1o11MdCxjzjpufFRmAevkDgYmS`** · origin/main |
| **AUDIT** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-AUDIT.md) · **PASS** |
| **PLAN** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PLAN.md) · **PASS** |
| **DF** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-DESIGN-FREEZE.md) · **PASS** |
| **ARCH REVIEW** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-ARCH-REVIEW.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-ARCH-REVIEW.md) · **PASS WITH CONDITIONS** · blockers **0** · IC-1 / IC-2 honoured |
| **OWNER VERIFY** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-OWNER-VERIFY.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-OWNER-VERIFY.md) · **PASS WITH FINDINGS** (0 BLOCKING) |
| **PV** | [`IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PRODUCTION-VERIFY.md`](./IK-AUTONOMY-08-P1-SETTINGS-UNIFICATION-PRODUCTION-VERIFY.md) · **PASS WITH FINDINGS** |
| **Slice** | **08-P1 only** — Super Admin ⚙ UI organization |
| **A08-P0** | **COMPLETE / CLOSED** |
| **A08-P1** | **PRODUCTION VERIFIED** · **DOCUMENTATION CLOSEOUT READY** |
| **A08-P2** | **NOT STARTED** |
| **EPIC CLOSE** | **NOT CLOSED** — do **not** mark AUTONOMY-08 COMPLETE/CLOSED |

```text
AUDIT                  = PASS
OWNER REVIEW           = PASS
PLAN                   = PASS
DESIGN FREEZE          = PASS
ARCH REVIEW            = PASS WITH CONDITIONS
IMPLEMENTATION         = PASS
OWNER VERIFY           = PASS WITH FINDINGS
COMMIT                 = PASS · e0373fac
PUSH                   = PASS
DEPLOY                 = PASS
PRODUCTION VERIFY      = PASS WITH FINDINGS
DOCUMENTATION          = READY FOR OWNER APPROVAL
PRODUCTION             = 2.66.94 / e0373fac
DEPLOYMENT             = Cj1o11MdCxjzjpufFRmAevkDgYmS
A08-P0                 = COMPLETE / CLOSED
A08-P1                 = PRODUCTION VERIFIED · DOCUMENTATION CLOSEOUT READY
A08-P2                 = NOT STARTED
EPIC                   = AUTONOMY-08 — NOT CLOSED
```

NEW ENGINE = NO · NEW FLAG = NO · NEW ORCHESTRATOR = NO · KV MIGRATION = NO · APPSETTINGS MIGRATION = NO.

---

## 1. Implementation result

Super Admin ⚙ Moduły: **jedyny biznesowy switch IK** = `ikEntryEnabled` (checkbox ON/OFF).

**IK ON** = autonomiczny workflow IK (runtime A08-P0 unchanged: Documents→BOQ when `ikEntryEnabled === true`).

P3–P8 + Research przeniesione do **TECHNICAL / ADVANCED / EMERGENCY** (domyślnie zwinięte). Te same widgety, ten sam `appSettings` binding, te same control `data-*`, te same `saveAppSettings` na zmianie wartości.

Kontrolki Technical **pozostają w DOM** przez `hidden={!ikTechnicalOpen}` (IC-2). Nie są unmountowane.

AUTO_INGEST **nie wraca** do UI. D zostaje w primary (HARD STOP). Runtime A05–A08 / P0 **bez zmian kontraktowych**.

Zwykły Administrator **nie** otrzymuje nowego panelu. Super Admin zachowuje dostęp do technical controls (⚙ + `adminIsSuperAdmin`).

Copy IK (SSOT):

> Steruje działaniem Inteligentnego Kosztorysanta w przetargach.

---

## 2. Files changed (implementation commit)

Commit **`e0373fac`** `feat(ik): unify autonomy settings` — 11 files.

| File | Role |
|------|------|
| `src/app/AdminSettingsModal.tsx` | IK copy · accordion Technical · `hidden={!ikTechnicalOpen}` (IC-2) |
| `src/app/changelog-data.ts` | **2.66.94** |
| `CHANGELOG.md` | mirror 2.66.94 |
| `scripts/test-ik-autonomy-08-p0-documents-boq.mjs` | **IC-1** T24 copy assertion only |
| `scripts/test-ik-autonomy-08-p1-settings-unification.mjs` | source smoke (54) |
| P1 AUDIT / PLAN / DF / ARCH REVIEW / OWNER VERIFY / this closeout | docs (this documentation closeout adds PV + tip 09) |

**Nie ruszane:** `app-settings.ts` · `ik-entry-flag.ts` · `IkEntryHost.tsx` · `TenderDetailPage.tsx` · `admin-auth.ts` · `AdminTopbar.tsx` · silniki P5–P8 · ingest.

---

## 3. UI structure (verified)

```text
Moduły
  Przetargi
  Rysunki WM
  Szkice pracownika
  Expert AI · Przebieg i Decydent     ← D HARD STOP
  Inteligentny Kosztorysant           ← ikEntryEnabled  data-ik-entry-toggle
  ▶ TECHNICAL / ADVANCED / EMERGENCY  ← collapsed · local state only · hidden
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

## 4. Verified A08-P1 contract

| Lock | Status |
|------|--------|
| Jedyny biznesowy switch IK = `ikEntryEnabled` | **VERIFIED** |
| IK ON = autonomiczny workflow IK | **VERIFIED** (runtime = A08-P0 helper) |
| Primary UI: Przetargi / WM / D / IK | **VERIFIED** |
| IK copy SSOT | **VERIFIED** |
| P3–P8 + Research = TECHNICAL / ADVANCED / EMERGENCY | **VERIFIED** |
| Technical default collapsed | **VERIFIED** |
| Controls stay in DOM via `hidden` | **VERIFIED** |
| AUTO_INGEST not in basic UI | **VERIFIED** |
| Regular Admin: no new panel | **VERIFIED** |
| Super Admin: technical controls | **VERIFIED** |
| AppSettings: no migration | **VERIFIED** |
| KV: no migration | **VERIFIED** |
| Runtime A05–A08: no contract change | **VERIFIED** |
| P1 invoice CLOSED | **UNCHANGED** |
| P2 KEEP GAP | **KEEP GAP** |
| Composite CLOSED | **UNCHANGED** |

---

## 5. IC-1 / IC-2

`scripts/test-ik-autonomy-08-p0-documents-boq.mjs` T24:

| Before | After |
|--------|--------|
| `/od dokumentów i przygotowania BOQ/` | `/Steruje działaniem Inteligentnego Kosztorysanta w przetargach/` |

Zachowane: T24 no AUTO_INGEST · T25 `data-ik-entry-toggle` · cały kontrakt P2 (`isIkP2DocumentsBoqActive` := Entry).

IC-2: `useState(false)` · persist **none** · children **always mounted** · `hidden={!ikTechnicalOpen}` · no `{ikTechnicalOpen && (` · each control `data-ik-*` count **1**.

---

## 6. Runtime invariants (unchanged)

| Lock | Status |
|------|--------|
| `isIkP2DocumentsBoqActive()` := Entry | **UNCHANGED** |
| leftover `ikAutoIngestEnabled` | field kept · not a gate · **no UI checkbox** |
| P5/P6/P7/P8 helpers | **UNCHANGED** |
| Research `=== true` | **UNCHANGED** · no Research-on-miss in P1 |
| D / Chief | **UNCHANGED** · D primary HARD STOP |
| AUTO / OFF / ON · B-POLICY · OFF wins | **UNCHANGED** |
| Accept / Price Commit / Final Bid | **OWNER** · no P1 change |

---

## 7. Regression (implementation + PV)

| Suite | Result |
|-------|--------|
| `test-ik-autonomy-08-p1-settings-unification.mjs` | **54 PASS / 0 FAIL** |
| `test-ik-autonomy-08-p0-documents-boq.mjs` | **61 PASS / 0 FAIL** (T24 + nested A05–A07 + invoice + identity + Composite + P1-entry + P2/P3 impl) |
| A05 / A06 / A07 / A08-P0 | **PASS** |
| `npm run build` (PV) | **PASS** (`✓ built in 50.35s`) |

Vite warnings (`material-sell-adapter.ts` duplicate key) = **PRE-EXISTING / OUT OF SCOPE**. Nie naprawiane.

---

## 8. Write audit

| Class | Implementation | PV |
|-------|----------------|----|
| Business writes | **0** | **0** |
| Research HTTP | **0** | **0** |
| Settings / KV writes | **0** | **0** |

Accordion toggle = local React state only. PV did **not** flip IK, did **not** run a real tender.

---

## 9. Findings (NON-BLOCKING — not fixed)

| ID | Severity | Finding |
|----|----------|---------|
| **OV-F1** | NON-BLOCKING | Opcjonalna druga wyciszona linia IK z Design Freeze nie weszła; SSOT copy jest na live. |
| **OV-F2** | NON-BLOCKING | Extra chrome `data-ik-technical-*` nie jest drugim switchem IK. |
| **Leftover attr** | NON-BLOCKING | `data-ik-entry-auto-ingest` pozostaje jako mirror P2 z A08-P0 i **NIE** jest checkboxem AUTO_INGEST. |
| **Vite duplicate key** | PRE-EXISTING / OUT OF SCOPE | `material-sell-adapter.ts` |
| **CI Manifest validate** | OUT OF SCOPE | poza P1 PV |

**BLOCKER = 0.** Findings **nie** naprawiane w documentation closeout.

---

## 10. Unrelated WIP

**LOCAL / UNCOMMITTED / NOT DEPLOYED.** Nie ruszany.

**Nigdy** `git add -A`. Documentation commit (gdy Owner GO) = wyłącznie pliki docs tej tury.

---

## 11. Final state

```text
CODE THIS TURN         = ZERO
SETTINGS               = ZERO
BUSINESS WRITES        = ZERO
RESEARCH               = ZERO
COMMIT docs            = NOT DONE
PUSH docs              = NOT DONE
DEPLOY                 = ALREADY PASS
PV                     = ALREADY PASS
EPIC                   = NOT CLOSED
NEXT                   = OWNER GO → DOCUMENTATION COMMIT
```

STOP. Czekaj na OWNER GO → DOCUMENTATION COMMIT.
