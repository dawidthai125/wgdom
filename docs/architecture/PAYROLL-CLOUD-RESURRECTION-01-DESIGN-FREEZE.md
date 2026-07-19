# PAYROLL-CLOUD-RESURRECTION-01 — DESIGN FREEZE

> **Status:** DESIGN FREEZE v1 · **IMPLEMENT DONE** (lokalnie 2.65.35) · Owner Verification PENDING  
> **Data:** 2026-07-20  
> **RCA:** [`PAYROLL-CLOUD-RESURRECTION-01-RCA.md`](./PAYROLL-CLOUD-RESURRECTION-01-RCA.md) · **PLAN:** [`…-PLAN.md`](./PAYROLL-CLOUD-RESURRECTION-01-PLAN.md) · **IMPLEMENT:** [`…-IMPLEMENTATION-REPORT.md`](./PAYROLL-CLOUD-RESURRECTION-01-IMPLEMENTATION-REPORT.md)

---

## D-01 — Problem zamrożony

Intencjonalny pusty Cloud (recovery) jest **przegrywany** przez bogaty LocalStorage innej sesji poprzez CloudLoader bootstrap merge + push (`replaceWeekEmployeesKeys`).

---

## D-02 — In scope

| ID | Decyzja |
|----|---------|
| D-02a | Naprawa ścieżki **bootstrap merge/push** (klient) |
| D-02b | Opcjonalnie tombstone archive week (klient + Edge parity) |
| D-02c | Testy jednostkowe resurrection + regresja 03/04 / ROLL-001 |

## D-03 — Out of scope

| ID | Zakaz |
|----|-------|
| D-03a | Przepisanie całego cloud-sync / PWRB |
| D-03b | Wyłączenie Payroll Guard globalnie |
| D-03c | Auto-restore z `kw-*-prev` bez Owner |
| D-03d | Zmiana modelu wypłat / biweekly kalkulatora |

---

## D-04 — Reguły merge (propozycja zamrożona)

1. **Cloud intentional empty** (current week keys + `weekEmployees=[]` + brak / tombstone current archive) **wygrywa** nad local rich przy bootstrap.  
2. Local-only archive week **tombstoned** nie wraca przez `mergeArchive`.  
3. Bootstrap **nie** ustawia `replaceWeekEmployeesKeys` gdy outbound richness ≫ cloud **i** cloud jest świadomie pusty (recovery fence) — szczegóły w IMPLEMENT po ACK.  
4. REGRESSION-03/04 anti-wipe na mount-race **musi** pozostać PASS (align path).

---

## D-05 — Recovery playbook (operacyjny, część DF)

Po każdym payroll KV clear: **fence sesji** (zamknij inne klienty / wyczyść LS) zanim ktokolwiek otworzy app.

---

## D-06 — Acceptance zamrożone

Jak PLAN §5 A1–A4.

---

## D-07 — Werdykt DF

```text
DESIGN FREEZE: ACKNOWLEDGED (Owner GO IMPLEMENT)
IMPLEMENT: COMPLETE (local · 2.65.35) — see IMPLEMENTATION REPORT
OWNER VERIFICATION: PENDING
NO PUSH until Owner GO release
```
