# PAYROLL AKORD — Payable SSOT (Phase 4B)

**Status:** Phase 4B — App piecework state + `displayNetPay` integration (no UI / PDF / archive freeze).

## Payable formula (V1)

```
AKORD displayNetPay =
  resolveAkordPayable(directoryId, pieceworkState)   // Σ remaining active allocations
  + approved extras
  + manualAdjustment
  − zaliczki (usually 0 for akord)
```

- Attendance / from–to do **not** affect amount.
- `PieceworkJob.status === closed` does **not** zero remaining.
- Leave zeros remaining (labor overlay), keeps extras/manual.

## Double-count guards

| Path | Behavior |
|------|----------|
| Carry-in | Live remaining excluded; `displayNetPay = carryIn + extras/manual` |
| Biweekly | Remaining injected **once** in `calcBiweeklyRowDisplay`; week nets stay extras-only for akord |
| Early payout | **HOLD** — not subtracted from AKORD biweekly display |

## SSOT entry

`calcWeekEmployeeForPayroll(..., { pieceworkState })` → `displayNetPay`  
→ settlement `resolveSettlementPayableAmount` · Lista Płac rows · cash split callbacks.

## App wiring

- React state: `kw-payroll-piecework` via `useLocalStorage`
- Deferred bootstrap hydrate + **no** blind deferred Cloud push (CAS-only writes, Phase 4A)

## Out of scope

UI CRUD · PDF · archive freeze · early payout AKORD · PWRB / week-employees CAS
