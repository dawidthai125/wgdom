# PAYROLL-WEEK-ROSTER-INVARIANT-01 — DESIGN FREEZE

> **Incident:** PAYROLL 24.08.2026 (ALIGN residual → Cloud 24–29 + 621h)  
> **Status:** IMPLEMENT COMPLETE · **WAITING FOR OWNER VERIFICATION** (no commit/push/deploy)  
> **Baseline prod (pre-fix):** 2.66.113 @ `fcb0ee3` · tip bump lokalnie **2.66.115** (po Owner GO)  
> **Strategy:** OPTION F (Hybrid) — PHASE 6 PLAN  
> **Prior:** [`PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md`](PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md) (#R01–#R10) — **nie anulowane**; ten dokument **doprecyzowuje** ALIGN vs historical hours.

---

## 0. Cel zamrożony

Wyegzekwować:

> **current payroll week labels ⇒ live roster empty OR zero-hours seed OR proven current-week data**  
> — nigdy historyczne dodatnie godziny pod current labels, ani ich Cloud persistence.

Zachować ochronę **#R04** (ALIGN przy live **0h** + archived prev).

---

## 1. Invariant #I-WEEK-ROSTER

Jeżeli `weekFrom`/`weekTo` wskazują **current** payroll week, live `weekEmployees` musi być:

1. **puste**, **lub**
2. **zero-hours seed** (brak dodatnich godzin), **lub**
3. **jawnie proven current-week data** (legalne edycje / seed bez overlap historycznego archive z dodatnimi godzinami).

**Zakaz:** persistence historycznych dodatnich godzin pod current week labels (ALIGN → CloudLoader/`pwrPush` → KV).

---

## 2. Decyzje D-F1 … D-F5

| ID | Decyzja |
|----|---------|
| **D-F1** | ALIGN tylko gdy `storedArchived && digest≠archive && live total hours == 0` |
| **D-F2** | `storedArchived && digest≠ && hours > 0` → `kind:"rollover"` + reason `quarantine_historical_hours_under_stale_labels` → istniejący `autoArchiveAndAdvance` (bez nowego kind) |
| **D-F3** | Persistence fence: current keys + positive hours + historical archive overlap → **nie** persistuj residualu |
| **D-F4** | `intentionalHoursClear` w body `batch-set`; Edge CAS: skip `mergeWeekEmployeesUnion` → write `nextNorm` (tylko jawny intentional clear; **nie** „empty always wins”) |
| **D-F5** | Bez zmian: RS payroll exclude, `weekEmployeeFromDir`/`defaultDays`, B4 merge redesign, Tenders/WM/Audit, auto KV recovery/migration, usuwanie ALIGN |

---

## 3. Classifier (zamrożony)

```text
storedArchived && digest !== archive
  ├── hours == 0  → kind:"align"   (#R04 / R1)
  └── hours > 0   → kind:"rollover"
                    reason:"quarantine_historical_hours_under_stale_labels"
```

Godziny: istniejący SSOT (`dayTotalHours` / binding helper) — **zero duplicate** kalkulacji.

---

## 4. Acceptance Criteria

| ID | Assert |
|----|--------|
| AC-I1 | R04 R1: rich archive + live 0h → ALIGN, keep N, no clear |
| AC-I2 | T-INC: archive + live historical hours + digest≠ → rollover/quarantine → clear |
| AC-I3 | T-FENCE: historical residual under current → `mayPersist === false` |
| AC-I4 | D-F4: intentional clear + CAS → Cloud `[]` (no union resurrect) |
| AC-I5 | REGRESSION-03 + rollover-01 PASS |
| AC-I6 | Brak B4/RS/FromDir change; brak auto recovery polluted Cloud |

---

## 5. Out of scope

- Exact first Cloud writer forensics  
- Automatyczny recovery Cloud 24–29/621h (osobny Owner GO)  
- B4 redesign / RS / FromDir  
- Nowy `kind:"quarantine"`  
- Global „empty always wins”  

---

## 6. Implementacja (PHASE 6)

| Warstwa | Plik / zachowanie |
|---------|-------------------|
| Classifier D-F1/D-F2 | `payroll-cycle.ts` — hours==0 → ALIGN `align_zero_hours_bootstrap`; hours>0 → rollover `quarantine_historical_hours_under_stale_labels` |
| Binding / fence D-F3 | `payroll-week-roster-binding.ts` · `bootstrapPayrollPushAllowed` · `pushWeekEmployeesToCloud` |
| D-F4 | client `batch-set` body `intentionalHoursClear` · Edge skip-union · `pushPayrollWeekAfterRollover(empty)` |
| App.tsx | **0** zmian logiki |
| Testy | R04 (+R1c) · R03 · rollover-01 (+T-INC) · `test-payroll-week-roster-invariant-01.mjs` |

**COMMIT / PUSH / DEPLOY:** tylko po osobnym Owner Verification GO.

---

## 7. Zamrożenie

**DESIGN FREEZE + IMPLEMENT boundary zamknięte.**  
Kolejne zmiany tylko Owner GO (np. recovery polluted KV 24–29).

---

## 8. GO6 amendment — D-F3 false-positive (2026-08-29)

**Owner GO:** YES · IMPLEMENT ONLY (no commit/push/deploy until review).

### OLD (pre-GO6 D-F3)

`current week keys` + `hours > 0` + **≥1 archive identity overlap** → **BLOCK** persistence.

### NEW (GO6)

Archive **identity overlap alone ≠ BLOCK**.

| Signal | Decision |
|--------|----------|
| Outgoing identities ⊆ Cloud current roster | **ALLOW** (legal settle / hours / rate / extraCosts) |
| Exact historical **fingerprint** clone under current keys (empty Cloud or Cloud fp ≠ live) | **BLOCK** |
| Novel identity ∈ current-week tombstones (recreate) | **BLOCK** |
| Employee also present in many archive weeks, but exists in Cloud current | **ALLOW** |

Fence still protects residual/clone/reseed/tombstone-recreate. It must **not** block legal updates of employees who historically appear in `kw-archive`.

**No:** `settlementCloudAck` bypass · `forceReplace` · global fence OFF · per-employee allowlist.

### GO6.1 amend (priority + bootstrap tombs)

Control flow in `mayPersistPayrollRosterUnderWeekKeys`:

1. tombstone recreate → BLOCK
2. **O2** historical fingerprint clone (even when identity set === Cloud) → BLOCK when empty Cloud or `cloudFp ≠ liveFp`
3. **O1** outgoing ⊆ Cloud → ALLOW (`ok_cloud_membership_update`)
4. else → ALLOW (`ok_no_residual_clone`)

Bootstrap: `readPayrollWeekBindingContextFromLs` supplies `tombstonedMergeKeys` into `bootstrapMergedShouldPush` / `bootstrapPayrollPushAllowed`.

---

**Koniec DESIGN FREEZE / IMPLEMENT NOTE**
