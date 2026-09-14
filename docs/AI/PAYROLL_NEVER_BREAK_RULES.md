# PAYROLL NEVER BREAK RULES

> **Jedna krótka checklista.**  
> **★★ CRITICAL PROTECTED:** [`PAYROLL_CRITICAL_PROTECTED_MODULE.md`](PAYROLL_CRITICAL_PROTECTED_MODULE.md) · SSOT [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) §2–3 · Guard Rails [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md)

```text
□ NIGDY nie modyfikuj Payroll sync „przy okazji” FEATURE (Protected Core)
□ NIGDY nie omijaj Domain Push / PWRB nowym write-path godzin lub składu
□ NIGDY skipPayrollGuard:true bez intentionalHoursClear === true
□ NIGDY nie myl intentionalHoursClear z isIntentionalPayrollWeekClear
□ NIGDY side-effectów w weekEmployeeFromDir (musi być PURE)
□ NIGDY mutacji składu tygodnia poza PWRB
□ NIGDY nie usuwaj / nie obchodź payroll-bootstrap-resurrection-fence (GO6.1)
□ NIGDY nie cofaj classifyPayrollWeekTransition (ALIGN ≠ wipe; ROLLOVER = archive+clear)
□ NIGDY nie wrzucaj kw-week-employees z powrotem do RS runCloudSync push
□ NIGDY nie zmieniaj finalizePayrollBundleMerge / mergeWeekEmployees* bez DF + Owner GO
□ NIGDY nie łącz D4 -prev banner z archive Restore Banner
□ NIGDY direct fetch/batch-set z UI Payroll
□ NIGDY mixed commit FEATURE + cloud-sync / payroll CORE / Edge
□ NIGDY „temporary HACK” w CORE bez ticketu
□ NIGDY nie kasuj kw-week-* / payroll keys „przy okazji” czyszczenia LS
□ NIGDY nie traktuj QuotaExceeded / CORS jako „brak danych LP”
□ NIGDY nie zaczynaj nowego Payroll EPIC w Stabilization bez Owner GO
□ NIGDY nie traktuj Freshness Gate jako jedynej ochrony (Freshness ≠ canonical payload)
□ NIGDY nie pomijaj `rebuildPayrollOutgoingAfterFreshness` / nie wracaj do ślepego closed-over arg
□ NIGDY nie osłabiaj `extraCosts` baseline (`before ≡ cloud`) ani P0/P2/CAS
□ NIGDY nowy `skipCloudFreshnessGate: true` poza CloudLoader post-merge / internal reentry
□ NIGDY nie oznaczaj Payroll GREEN przy FAIL regression gate bez Owner review
□ NIGDY równoległych payroll CAS writers / inline enqueue przy depth>0 (GO9.2 FROZEN)
□ NIGDY wyłączania CAS / ręcznego bump revision / forceReplace jako bypass
□ NIGDY usuwania GO4 (HTTP 200 ≠ settlement ACK)
□ NIGDY zmiany GO8.1 settlement-retain bez Owner GO
□ NIGDY czyszczenia payrollSettlement przy unsettle (GO10 — meta = historia)
□ NIGDY pozwalania staremu LS/snapshotowi nadpisać canonical Cloud (anti-rollback)
□ NIGDY reopen Phase 3 pwrRemove CAS/rebase / pushRosterWithRebase bez RCA+Owner GO
□ NIGDY optimistic membership drop przed Cloud ACK (P1 Remove Failure CLOSED)
□ NIGDY osłabiania extraCosts DELETE tombstone (`deletedAt` wins over stale live)
□ NIGDY wymyślania CarryForward clearedAt / CLEAR bez realnego UI UNDEFER + Owner GO
□ NIGDY zmiany Payroll sync/CAS/settlement „przy okazji” IK lub FEATURE
```

**Gdy wątpliwość → STOP → AUDIT / Owner.**

**Protected module + GO6.1–GO10 + Final Hardened (2.66.220):** [`PAYROLL_CRITICAL_PROTECTED_MODULE.md`](PAYROLL_CRITICAL_PROTECTED_MODULE.md)  
**Closeout 2.66.126:** [`../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md`](../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md)
