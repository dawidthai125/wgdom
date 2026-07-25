# PAYROLL NEVER BREAK RULES

> **Jedna krótka checklista.** Szczegóły: [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) · [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) §2–3

```text
□ NIGDY nie omijaj Domain Push / PWRB nowym write-path godzin lub składu
□ NIGDY skipPayrollGuard:true bez intentionalHoursClear === true
□ NIGDY nie myl intentionalHoursClear z isIntentionalPayrollWeekClear
□ NIGDY side-effectów w weekEmployeeFromDir (musi być PURE)
□ NIGDY mutacji składu tygodnia poza PWRB
□ NIGDY nie usuwaj / nie obchodź payroll-bootstrap-resurrection-fence
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
```

**Gdy wątpliwość → STOP → AUDIT / Owner.**
