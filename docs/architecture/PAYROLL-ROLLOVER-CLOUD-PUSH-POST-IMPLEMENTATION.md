# PAYROLL-ROLLOVER-CLOUD-PUSH — POST-IMPLEMENTATION DOCUMENTATION

> **ID:** PAYROLL-ROLLOVER-CLOUD-PUSH  
> **STATUS:** **IMPLEMENTATION VERIFIED** · **COMMIT: NONE**  
> **Data:** 2026-08-19  
> **ARCH REVIEW:** PASS WITH GAPS · **Owner GO:** IMPLEMENT (documentation stage only)  
> **Production baseline (pre-commit):** UI **2.66.103** · commit **`eca036992a3187c88ce2d288f0be14617302550b`**  
> **Relacja do P1:** **PAYROLL-P0-WEEK-ROLLOVER-01 (P1) = CLOSED / UNTOUCHED** — ten epic **nie** jest P1 regression  
> **SSOT architektury guard:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) §5B

```text
════════════════════════════════════════════════════════
PAYROLL-ROLLOVER-CLOUD-PUSH
POST-IMPLEMENTATION DOCUMENTATION

IMPLEMENTATION: VERIFIED
TESTS: PASS WITH KNOWN OUT-OF-SCOPE GAPS
P1: CLOSED / UNTOUCHED
O1/CAS: UNCHANGED
D3: UNCHANGED
BOOTSTRAP: UNCHANGED
COMMIT: NONE
PUSH: NONE
DEPLOY: NONE
PRODUCTION WRITE: NONE

NEXT GATE: FINAL COMMIT PREP
════════════════════════════════════════════════════════
```

---

## 1. Root cause (design gap — nie P1 regression)

| Fakt | Opis |
|------|------|
| **Same-week clear** | `isIntentionalPayrollWeekClear` oczekuje archiwum **tego samego** tygodnia co batch `weekFrom/weekTo` + pusty outgoing roster. |
| **Cross-week rollover** | Local P1 rollover (`autoArchiveAndAdvance`) archiwizuje **W1**, ustawia batch na **W2** z `kw-week-employees = []`. |
| **Mismatch** | Archive W1 ≠ target W2 → step [2] guard **FAIL** → `wouldBlockPayrollShrink(rich W1 cloud, [])` **BLOCK** przed HTTP. |
| **Skutek prod** | Local rollover **PASS**; cloud push **FAIL** (guard throw); błąd wcześniej połykany w `.catch(() => {})`. |
| **Klasyfikacja** | Osobny **DESIGN GAP** po zamkniętym P1 — **nie** cofać / nie reinterpretować P1 semantics. |

---

## 2. Nowy mechanizm — Option B (frozen design)

### 2.1 Flaga internal

| Pole | Typ | Semantyka |
|------|-----|-----------|
| `payrollWeekRolloverPush` | `?: true` | **Internal / rollover-only** — ustawiane **wyłącznie** przez `pushPayrollWeekAfterRollover`. |

**Nie dodano** do:

- `PushWeekEmployeesOptions`
- `CloudLoader`
- innych callerów `pushKeysToCloud`

### 2.2 Jedyny setter

```text
pushPayrollWeekAfterRollover()
  → pushKeysToCloud(..., { payrollWeekCas, expectedRevision, clientAppVersion, payrollWeekRolloverPush: true })
```

Plik: `src/lib/cloud-sync.ts` — `pushPayrollWeekAfterRollover`.

---

## 3. Predicate — `isPayrollRolloverWeekClear`

**Lokalizacja:** `src/lib/cloud-sync.ts` (internal function).

**Ważne:** predicate **nie** sprawdza flagi. Flaga jest warstwą guard:

```text
payrollWeekRolloverPush === true && isPayrollRolloverWeekClear(...)
```

### Warunki (wszystkie wymagane)

| ID | Warunek |
|----|---------|
| A | `outgoing` roster pusty (`normalizeArrayValue(outgoing).length === 0`) |
| B | Batch `weekFrom` / `weekTo` = target W2 (`readWeekRangeFromBatchOrLocal`) |
| C–D | Archive zawiera snapshot poprzedniego tygodnia względem W2: `snap.weekFrom/weekTo === previousWeekRange(targetFrom)` |
| E | Snapshot **≠** target W2 (`snap` keys ≠ target keys) |
| F | `archiveWeekHasPayroll(snap)` — richness ≥ 8 (`weekEmployeesListRichness`) |
| G | `snap.backlog !== true` |

### Reuse SSOT

| Helper | Źródło |
|--------|--------|
| `previousWeekRange` | `src/lib/payroll-cycle.ts` (**import only** — plik **nie** modyfikowany) |
| `archiveWeekHasPayroll` | `cloud-sync.ts` |
| `readArchiveFromBatchOrLocal` | `cloud-sync.ts` |
| `readWeekRangeFromBatchOrLocal` | `cloud-sync.ts` |

---

## 4. Guard order — `applyPayrollGuardBeforePush`

Finalna kolejność (bez zmian poza step [3]):

| Step | Mechanizm | Status |
|------|-----------|--------|
| **[1]** | `maySkipPayrollShrinkGuard` — D3 / `intentionalHoursClear` | **BEZ ZMIAN** |
| **[2]** | `isIntentionalPayrollWeekClear` — same-week clear | **BEZ ZMIAN** |
| **[3]** | `payrollWeekRolloverPush && isPayrollRolloverWeekClear` — cross-week rollover | **NEW** |
| **[4]** | fetch cloud roster (`fetchKeysFromCloud` lub `cloudWeekEmployees`) | **BEZ ZMIAN** |
| **[5]** | `wouldBlockPayrollShrink` — shrink guard | **BEZ ZMIAN** |

### Reguły bezpieczeństwa

- **D3** pozostaje bez zmian — `skipPayrollGuard` nadal tylko via `intentionalHoursClear` (lub legacy kill-switch).
- **Sama flaga nie jest bypassem** — wymaga przejścia predicate.
- **Normalny shrink** nadal blokowany dla wszystkich pozostałych ścieżek.
- **Nie rozszerzono** `intentionalHoursClear`.

---

## 5. O1 / CAS — UNCHANGED

| Obszar | Status |
|--------|--------|
| `supabase/functions/**` | **ZERO diff** |
| `payrollWeekCas` contract | **UNCHANGED** |
| `expectedRevision` | **UNCHANGED** |
| `stale_revision` / `legacy_client_rejected` | **UNCHANGED** |
| `pwrPush` rebase/retry | **UNCHANGED** |
| `payrollWeekMeta` semantics | **UNCHANGED** |

Nowy branch guard **[3]** jedynie **ALLOW** legalnemu rolloverowi dotrzeć do istniejącego HTTP/CAS flow (`pushKeysToCloud` → `batch-set`).

Integration **I3/I4** potwierdza: `payrollWeekCas: true`, `expectedRevision` obecne w body.

---

## 6. P1 safety — CLOSED / UNTOUCHED

| Element | Status |
|---------|--------|
| `src/lib/payroll-cycle.ts` | **ZERO diff** |
| `classifyPayrollWeekTransition` | **ZERO diff** |
| `resolvePayrollOperationalWeekKeys` | **ZERO diff** |
| P1 bloki `App.tsx` (`tryPayrollWeekCycle`, align/rollover classifier) | **ZERO diff** |
| P1 test scripts | **ZERO diff** |
| `previousWeekRange` | read-only import w `cloud-sync.ts` |

**PAYROLL-P0-WEEK-ROLLOVER-01 (P1)** pozostaje **CLOSED / PRODUCTION VERIFIED**.

---

## 7. Bootstrap / anti-leak — UNCHANGED

| Element | Status |
|---------|--------|
| `finalizePayrollBundleMerge` | **ZERO diff** |
| `mergeWeekEmployeeRecord` | **ZERO diff** |
| DF-10 behavior | **nie przywrócony** |
| `applyBootstrapPayrollMerge` / anti-leak | **ZERO diff** |

Po successful W2 push:

- KV: `weekFrom/weekTo` = **W2**
- `kw-week-employees` = **`[]`**
- Archive **W1** pozostaje historycznym snapshotem
- Bootstrap **nie** kopiuje godzin W1 → W2 (integration I9/I10)

---

## 8. Biweekly

| Reguła | Implementacja |
|--------|----------------|
| `backlog === true` | **Wykluczone** z evidence rollover clear (warunek G) |
| Payout semantics | **Bez zmian** |
| Kopiowanie rosteru/godzin | Predicate **nie** kopiuje — tylko waliduje intent push |

---

## 9. UX — `App.tsx` (`autoArchiveAndAdvance`)

| Zachowanie | Status |
|------------|--------|
| Local rollover (archive + advance + clear) | **Nie cofany** |
| Cloud push failure | **Brak retry**, brak drugiego rollover |
| Guard-blocked failure | `toast.warning` id **`payroll-rollover-cloud-blocked`** |
| Detekcja | `isPayrollGuardBlockedError(e)` + `PAYROLL_GUARD_BLOCKED_MESSAGE` |
| Success toast lokalnego rollover | **Bez zmian** (poza diffem) |
| P1 rollover semantics | **Bez zmian** |

Dual toast (success local + warning cloud) — **zaakceptowany** przez ARCH REVIEW.

---

## 10. Test evidence

### Epic tests (NEW)

| Skrypt | Wynik |
|--------|-------|
| `scripts/test-payroll-rollover-week-clear-predicate.mjs` | **7/7 PASS** (A–G) |
| `scripts/test-payroll-rollover-cloud-push-integration.mjs` | **10/10 PASS** (I1–I10) |

### Regression anchors

| Skrypt | Wynik |
|--------|-------|
| `test-payroll-hours-collapse-gate-d2-d3.mjs` | **35/35 PASS** |
| `test-payroll-guard-push-fail-loud-p0.mjs` | **6/6 PASS** |
| `test-payroll-p0-week-rollover-01.mjs` | **22/22 PASS** |
| `test-payroll-display-p0-regression-03.mjs` | **14/14 PASS** |
| `test-payroll-display-p0-regression-04.mjs` | **19/19 PASS** |
| `test-payroll-refresh-team-race-p0.mjs` | **4/4 PASS** |
| `npm run build` | **PASS** |

### Known out-of-scope (nie regresja epica)

| Test | Klasyfikacja | Uwaga |
|------|--------------|-------|
| `test-payroll-bootstrap-runtime-parity-b4.mjs` B4-T1 (3 FAIL) | **PRE-EXISTING FIXTURE GAP** | Brak P11 backup fixture; pre-existing na baseline |
| `test-p11-bootstrap-payroll.mjs` | **STALE TEST CONTRACT** | Osobny status — nie naprawiać w tym epicu |
| `smoke-test-payroll-rollover-sync-20.1c1.mjs` | **STALE TEST CONTRACT** | Oczekuje pre-fix guard block; nie naprawiać w tym epicu |

---

## 11. File / scope record

**Wyłącznie** te pliki implementacji (uncommitted):

| Plik | Rola |
|------|------|
| `src/lib/cloud-sync.ts` | flaga, predicate, guard order, setter w `pushPayrollWeekAfterRollover` |
| `src/app/App.tsx` | warning toast w `autoArchiveAndAdvance` catch |
| `scripts/test-payroll-rollover-week-clear-predicate.mjs` | testy A–G |
| `scripts/test-payroll-rollover-cloud-push-integration.mjs` | testy I1–I10 |

**Nie dotyczy** innych plików WIP w working tree.

---

## 12. Pipeline / next gate

| Faza | Status |
|------|--------|
| AUDIT | **DONE** |
| ARCH REVIEW | **PASS WITH GAPS** |
| IMPLEMENT | **VERIFIED** |
| POST-IMPLEMENTATION DOCS | **THIS FILE** |
| **NEXT** | **FINAL COMMIT PREP** → COMMIT → PUSH → DEPLOY → PRODUCTION VERIFY |

---

**Koniec POST-IMPLEMENTATION DOCUMENTATION**
