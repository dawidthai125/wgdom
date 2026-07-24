# PAYROLL-IMPLEMENT-03 D4+D5 — IMPLEMENTATION REPORT

> **ID:** PAYROLL-IMPLEMENT-03 / D4+D5  
> **STATUS:** IMPLEMENT COMPLETE · Owner Verification **PASS** · RELEASE-03 in progress  
> **Data:** 2026-07-24  
> **Wersja (changelog):** **2.65.43**  
> **Baseline prod:** 2.65.42 / `f3b8c03` (tip docs `8fa0851`)  
> **DF:** [`PAYROLL-DESIGN-FREEZE-01.md`](./PAYROLL-DESIGN-FREEZE-01.md) + [`PAYROLL-DESIGN-AMENDMENT-01.md`](./PAYROLL-DESIGN-AMENDMENT-01.md)  
> **Zakaz:** zmiany D1–D3 · rozszerzenie poza D4/D5

```text
D4 Recovery Banner (-prev only ≠ archive)
D5 Soft Restore overlay · weekEmployeeFromDir PURE
CTA restore → Domain Push (D6)
```

---

## 1. Files Changed

```text
src/lib/payroll-prev-recovery.ts              NEW — shouldShowPayrollPrevRecoveryBanner, applyPrevRecoveryToLiveRoster
src/lib/payroll-soft-restore.ts               NEW — session snapshot + applyPayrollSoftRestoreOverlay
src/app/App.tsx                               fetch -prev · restore CTA · soft restore on add/remove
src/app/PayrollView.tsx                       D4 banner UI · „Dodaj puste” checkbox
src/app/admin/AdminViewRouter.tsx             props wiring
src/app/changelog-data.ts                     2.65.43
CHANGELOG.md
scripts/test-payroll-prev-recovery-soft-restore-d4-d5.mjs  NEW
docs/architecture/PAYROLL-IMPLEMENT-03-D4-D5-IMPLEMENTATION-REPORT.md
```

**NIE zmieniono:** `weekEmployeeFromDir` body · D1/D2/D3 modules · Cloud Sync merge · Resurrection Fence · Domain Push architecture

---

## 2. Architecture Impact

| Warstwa | Wpływ |
|---------|-------|
| **D4** | Nowy helper `-prev` only; REUSE `payrollMetrics` + richer-than; **≠** `shouldShowPayrollRestoreBanner` |
| **D4 CTA** | `applyPrevRecoveryToLiveRoster` → `pwrPush` (Domain Push) |
| **D5** | Overlay po `weekEmployeeFromDir` w `addFromDirectory`; session on `removeWeekEmployee` |
| **D5 preferEmpty** | Checkbox „Dodaj puste” → skip overlay (AC-D5-2) |
| **W1 / W2 entry** | Semantyka bez zmian (ochrona + overlay, nie nowy funnel) |
| **SSOT / merge / fence** | Bez zmian |
| **D1–D3** | Bez zmian logiki |

**Kill-switches (default ON):**

| Key | `=0` |
|-----|------|
| `wg-payroll-recovery-banner-prev` | ukrywa D4 banner |
| `wg-payroll-soft-restore` | wyłącza Soft Restore overlay |

---

## 3. Tests

| Test | Wynik |
|------|-------|
| `test-payroll-prev-recovery-soft-restore-d4-d5.mjs` | **29 PASS / 0 FAIL** |
| D4 banner ON/OFF / overlap / kill-switch | **PASS** |
| D4 restore keeps UUID + richer hours | **PASS** |
| D5 session + -prev overlay | **PASS** |
| D5 preferEmpty | **PASS** |
| Factory PURE | **PASS** |
| `test-payroll-hours-collapse-gate-d2-d3.mjs` | **35 PASS** |
| `test-payroll-write-path-telemetry-d1.mjs` | **19 PASS** |
| `test-payroll-add-from-directory-merge-p0.mjs` (W2) | **16 PASS** |
| `test-payroll-restore-banner-false-positive.mjs` (archive RB) | **14 PASS** |
| `npm run build` | **PASS** |

---

## 4. Regression

| Scenariusz | Wynik |
|------------|-------|
| W1 / D2 domain gate | **PASS** (35) |
| W2 add-from-directory | **PASS** (16) |
| D1 telemetry | **PASS** (19) |
| Archive restore banner (≠ D4) | **PASS** (14) |
| No SSOT / merge change | **PASS** |

---

## 5. Owner Verification

```text
1. Tip 2.65.43 after commit+push (HOLD do OV PASS)
2. D4: gdy live≪-prev (overlap directoryId) → baner „Przywróć z -prev”
   → CTA → Domain Push; copy ≠ „Przywróć z archiwum”
3. D5: remove pracownika z godzinami → re-add → godziny wracają domyślnie
4. D5: checkbox „Dodaj puste” → 0h (defaultDay)
5. D1–D3 zachowanie bez regresji (confirm / intentionalHoursClear / telemetry)
6. Brak nowych archiwów / brak zmian Resurrection Fence
```

**Owner Readiness:** IMPLEMENT D4+D5 DONE · **commit dopiero po Owner Verification PASS**

---

## 6. Definition of Done

| Kryterium | Status |
|-----------|--------|
| typecheck / build | **PASS** (build) |
| Recovery Banner | **PASS** |
| Soft Restore | **PASS** |
| Regression W1 | **PASS** |
| Regression W2 | **PASS** |
| No SSOT regression | **PASS** |
| No D1–D3 logic change | **PASS** |
| Commit | **HOLD** — czekamy na OV PASS |
