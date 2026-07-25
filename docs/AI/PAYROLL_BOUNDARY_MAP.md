# PAYROLL BOUNDARY MAP — FEATURE vs CORE

> **Cel:** zanim AI „tylko poprawi UI”, wie czy wchodzi w blast radius LP.  
> **Szczegóły deps:** [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) · **Checklist CORE:** [`../architecture/CORE-01A-CHANGE-CHECKLIST.md`](../architecture/CORE-01A-CHANGE-CHECKLIST.md)

---

## 1. Strefy

```text
┌─────────────────────────────────────────────────────────┐
│ FEATURE (wolniej przy ALL-NIE Gate)                     │
│  Tendery UI copy/CSS · Jobs lista UI · Help · Changelog │
│  Mobile chrome w zakresie briefu BEZ shared persist     │
└───────────────────────┬─────────────────────────────────┘
                        │ Shared = CORE
┌───────────────────────▼─────────────────────────────────┐
│ SHARED / CORE (Gate TAK → Payroll FULL)                 │
│  cloud-sync · CloudLoader · storage · App handlers LP   │
│  payroll-* lib · Edge merge · DATA_KEYS · providers     │
│  useLocalStorage global · shell lock wpływający na sync │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Co jest CORE Payroll (nie mieszaj z FEATURE)

| Obszar | Przykłady plików |
|--------|------------------|
| Sync / merge | `src/lib/cloud-sync.ts`, Edge `index.tsx` merge weekEmployees |
| Bootstrap | `CloudLoader.tsx`, `payroll-bootstrap-resurrection-fence.ts` |
| Write W1 | `payroll-week-roster-bundle.ts` (PWRB) |
| Write W2 | `payroll-domain-sync.ts`, Domain Gate, hours flags |
| Week cycle | `payroll-cycle.ts`, rollover, archive helpers |
| Merge helpers | `payroll-week-employee-merge.ts` |
| UI LP state | Handlery godzin/składu w `App.tsx`, `PayrollView` mutacje |
| Storage LP keys | `kw-week-*`, budget allowlist payroll |

---

## 3. Co może *wyglądać* na FEATURE, a jest Shared

| Zmiana | Dlaczego CORE-adjacent |
|--------|-------------------------|
| `useLocalStorage` / storage-budget | Może kasować / blokować `kw-week-*` |
| Persist mode / debounce global | Timing bootstrap vs push |
| Modal lock / remount App root | Race CloudLoader |
| Routing view remount | Re-hydrate LP |
| Mixed commit z `cloud-sync` | #CORE-013 violation |

---

## 4. Reguły granic

```text
□ FEATURE commit: zero plików z tabeli §2
□ CORE commit: zero „przy okazji” UI tenders/jobs poza briefem
□ Wątpliwość pliku → traktuj jako Shared → Safety Gate FULL
□ Owner GO wymagany na IMPLEMENT w strefie CORE
```

**Policy:** [`../WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) · `#CORE-013` / `#CORE-014`.
