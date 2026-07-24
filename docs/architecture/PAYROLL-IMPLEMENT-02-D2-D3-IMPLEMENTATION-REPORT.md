# PAYROLL-IMPLEMENT-02 D2+D3 — IMPLEMENTATION REPORT

> **ID:** PAYROLL-IMPLEMENT-02 / D2+D3  
> **STATUS:** **CLOSED** · IMPLEMENT COMPLETE · OV PASS · RELEASE-02 VERIFIED  
> **Data:** 2026-07-24  
> **Wersja (changelog):** **2.65.42** · commit **`f3b8c03`**  
> **EPIC:** Hours-wipe protection · **CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **DF:** [`PAYROLL-DESIGN-FREEZE-01.md`](./PAYROLL-DESIGN-FREEZE-01.md) + [`PAYROLL-DESIGN-AMENDMENT-01.md`](./PAYROLL-DESIGN-AMENDMENT-01.md)  
> **Zakazane w tym etapie (historyczne):** D4 Recovery Banner · D5 Soft Restore — delivered in IMPLEMENT-03

```text
D2 Domain Gate + UI Confirm (PRIMARY)
D3 skipPayrollGuard ⇔ intentionalHoursClear (SECONDARY)
Cancel = no Cloud write · UI keeps before
IC-7 rollover / clear-all / replace-all outside D2 hours gate
```

---

## 1. Files Changed

```text
src/lib/payroll-hours-collapse-gate.ts     NEW — detectHoursCollapse, resolve/maySkip, assert gate
src/lib/payroll-domain-sync.ts             options + rosterBefore + sticky intentional
src/lib/payroll-week-roster-bundle.ts      resolve options; pwrPush D2 gate + rosterBefore
src/lib/cloud-sync.ts                      D3 maySkipPayrollShrinkGuard; rollover bez bare skip
src/app/App.tsx                            confirm + intentionalHoursClear wiring
src/app/changelog-data.ts                  2.65.42
CHANGELOG.md
scripts/test-payroll-hours-collapse-gate-d2-d3.mjs  NEW
docs/architecture/PAYROLL-IMPLEMENT-02-D2-D3-IMPLEMENTATION-REPORT.md
```

---

## 2. Architecture Impact

| Warstwa | Wpływ |
|---------|-------|
| **D2 Domain Gate** | `assertHoursCollapseAllowedOrThrow` w `pwrPush` gdy `rosterBefore` — UI confirm nie jest SSOT |
| **D2 UI** | `window.confirm` w `commitLivePayrollRosterEdit`; Cancel → return `before` (brak schedule) |
| **D3** | `maySkipPayrollShrinkGuard`: bare `skipPayrollGuard` **nie** omija guarda (guardStrict ON) |
| **Domain Push** | Nadal debounced `schedulePayrollDomainPush` → `pwrPush`; sticky intentional w oknie debounce |
| **IC-7** | Rollover: `isIntentionalPayrollWeekClear` (bez skip). Clear-all / replace-all: `intentionalHoursClear` po istniejącym UI confirm |
| **W1 / W2 entry** | Semantyka bez zmian; W2 CREATED bez prev hours → bez Confirm |
| **weekEmployeeFromDir** | **PURE** — bez zmian |
| **SSOT / Resurrection / Cloud Sync merge** | Bez zmian semantyki merge |
| **D1 Telemetry** | Bez zmian zachowania; loguje `intentionalHoursClear` / `skipPayrollGuard` po resolve |

**Kill-switches (default ON):**

| Key | `=0` |
|-----|------|
| `wg-payroll-hours-collapse-confirm` | bez dialogu; collapse i tak dostaje `intentionalHoursClear` (auto-ACK) |
| `wg-payroll-domain-push-guard-strict` | pozwala legacy bare `skipPayrollGuard` |

---

## 3. Tests

| Test | Wynik |
|------|-------|
| `test-payroll-hours-collapse-gate-d2-d3.mjs` | **PASS** (27+ W1/W2 asserts) |
| Cancel → brak write | **PASS** |
| Accept → flush write + intentional | **PASS** |
| `intentionalHoursClear=false` → gate/guard block | **PASS** |
| `intentionalHoursClear=true` → allow | **PASS** |
| Partial wipe 2/14 → D2 require | **PASS** |
| `test-payroll-add-from-directory-merge-p0.mjs` (W2) | **16 PASS** |
| `test-payroll-zero-hours-persistence-pr-pay-s3.mjs` | **14 PASS** |
| `test-payroll-write-path-telemetry-d1.mjs` | **19 PASS** |
| `test-payroll-guard-push-fail-loud-p0.mjs` | **4 PASS** |
| `npm run build` | **PASS** (exit 0) |
| `tsc --noEmit` | repo ma pre-existing errors poza zakresem; build Vite OK; naprawiono `pwrRemove` → `Promise<void>` |

---

## 4. Regression

| Scenariusz | Wynik |
|------------|-------|
| W1 deactivate-all same UUID → D2 findings | **PASS** |
| W2 `weekEmployeeFromDir` PURE + CREATED no D2 | **PASS** |
| D1 telemetry hooks | **PASS** |
| No SSOT / merge / resurrection change | **PASS** (out of scope files untouched) |

---

## 5. Owner Verification

```text
1. Tip 2.65.42 after commit+push (HOLD do OV PASS)
2. W1: odznacz wszystkie dni pracownika z ≥4h lub ≥2 activeDays
   → confirm dialog
   → Cancel: godziny wracają / brak Cloud write
   → OK: push z intentionalHoursClear; Cloud akceptuje
3. W2: dodaj z kartoteki (CREATED) → brak D2 confirm
4. DevTools (opcjonalnie): bare skipPayrollGuard bez intentional nie omija guarda
5. Clear-all / replace-all: istniejący confirm UI + intentionalHoursClear (IC-7)
6. Brak banera D4 / soft restore D5
```

**Owner Readiness:** IMPLEMENT D2+D3 DONE · **commit dopiero po Owner Verification PASS**

---

## 6. Definition of Done

| Kryterium | Status |
|-----------|--------|
| typecheck (build path / no new blockers w scope) | **PASS** (build) |
| build | **PASS** |
| Regression W1 | **PASS** |
| Regression W2 | **PASS** |
| Confirmation (cancel / accept) | **PASS** |
| Guard (false blocks / true allows) | **PASS** |
| No SSOT regression | **PASS** |
| No D4 / D5 | **PASS** |
| Commit | **HOLD** — czekamy na OV PASS |
