# PAYROLL-DESIGN-AMENDMENT-01 — ARCH REVIEW ERRATA ACK

> **ID:** PAYROLL-DESIGN-AMENDMENT-01  
> **STATUS:** **CLOSED** · ERRATA ACK COMPLETE · **DELIVERED** · **P0**  
> **Data:** 2026-07-24  
> **Owner GO:** ACK ERRATA ONLY · **EPIC CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **Wejście:** [`PAYROLL-ARCH-REVIEW-01.md`](./PAYROLL-ARCH-REVIEW-01.md) · [`PAYROLL-DESIGN-FREEZE-01.md`](./PAYROLL-DESIGN-FREEZE-01.md)  
> **Poza zakresem (historyczne):** implementacja · commit · push · zmiana zestawu IN D1–D6 — **delivered via IMPLEMENT/RELEASE**  

```text
════════════════════════════════════════════════════════
PAYROLL-DESIGN-AMENDMENT-01

DF D1–D6: UNCHANGED (IN set retained)
Errata C1–C6: ACCEPTED (implementacyjnie wiążące)
SSOT / Domain Push / W1·W2 / Cloud Sync merge: UNCHANGED

Final DF = DESIGN-FREEZE-01 + this amendment
Next: **NONE** · EPIC **CLOSED** · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md)
════════════════════════════════════════════════════════
```

---

## 1. Accepted Amendments

| ID | Errata | Status | Binding text |
|----|--------|--------|--------------|
| **C1** | Flaga **`intentionalHoursClear`** | **ACK** | **Zakaz** używania / mylenia z `isIntentionalPayrollWeekClear` (pusty roster po archiwum tygodnia) |
| **C2** | D2 = **Domain Gate + UI Dialog** | **ACK** | Nie sam dialog; policy blokuje push bez ACK |
| **C3** | Recovery Banner = helper **`-prev`** | **ACK** | REUSE `payrollMetrics` (+ richer-than pattern); **≠** `shouldShowPayrollRestoreBanner` (archiwum) |
| **C4** | **Primary = D2**; D3 wtórny | **ACK** | Sam shrink guard (&gt;50%) nie chroni partial wipe klasy INCIDENT-01 |
| **C5** | `weekEmployeeFromDir` **PURE** | **ACK** | Soft Restore = **overlay** przed Domain Push (PWRB / addFromDirectory) |
| **C6** | Telemetry **100% passive** | **ACK** | Zero wpływu na write pipeline / guard / roster |

**Retained from ARCH (scope, not renumbered):**  
Rollover / clear-all / istniejący empty-week archive clear → **poza** D2 hours gate (osobny intent / istniejący `isIntentionalPayrollWeekClear`). Oznaczone jako **IC-7** w §3.

---

## 2. Final Design Freeze (post-errata)

> D1–D6 **IN** bez zmian zakresu. Poniżej — **semantyka implementacyjna finalna**.

### D1 — Telemetry write-path (**C6**)

| | **FINAL** |
|--|--|
| Emit | Ring / session forensic na domain flush / `pwrPush` / `pwrRemove` |
| Passive | **100%** — brak early-return, brak mutacji, brak ustawiania guard flags |
| Console | Opt-in only · **zakaz** `*_DIAG_AUTO_ENABLE = true` |
| Field | loguje m.in. `intentionalHoursClear` (nazwa C1), nie steruje nią |

### D2 — Confirmation (**C2** · **C4 primary**)

| | **FINAL** |
|--|--|
| Domain Gate | Predykat D14 + block `schedulePayrollDomainPush` / `pwrPush` bez ACK |
| UI Dialog | Jedyna prezentacja; Cancel = brak Cloud write |
| Primary | **Tak** — główna ochrona przed partial hours wipe |

### D3 — `skipPayrollGuard` ↔ **`intentionalHoursClear`** (**C1** · **C4 secondary**)

| | **FINAL** |
|--|--|
| Flag name | **`intentionalHoursClear: true`** ∈ `PushWeekEmployeesOptions` |
| `skipPayrollGuard: true` | **Tylko** gdy `intentionalHoursClear === true` (po D2 OK) |
| Secondary | Defense-in-depth vs roster-level shrink; **nie** zastępuje D2 |
| ≠ | `isIntentionalPayrollWeekClear` — **nie używać** tej nazwy/ścieżki do hours-collapse |

### D4 — Recovery Banner (**C3**)

| | **FINAL** |
|--|--|
| Helper | Nowy np. `shouldShowPayrollPrevRecoveryBanner` |
| Input | live vs **`kw-week-employees-prev`** (overlapping `directoryId`) |
| REUSE | `payrollMetrics` / richer-than **pattern** |
| Zakaz | Reuse `shouldShowPayrollRestoreBanner` (archive) |
| Write | Restore CTA → **Domain Push** (D6) |

### D5 — Soft Restore (**C5**)

| | **FINAL** |
|--|--|
| `weekEmployeeFromDir` | **PURE** — nadal może zwracać `defaultDays()` |
| Overlay | Przed Domain Push: nałóż days ze snapshotu (session / tombstone / `-prev`) |
| Default UX | Przywróć godziny gdy snapshot dostępny |

### D6 — SSOT Domain Push

| | **FINAL** |
|--|--|
| Jedyna droga zapisu godzin | Domain Push / `pwrPush` |
| RS payroll set | **ZAKAZ** |
| W1/W2 | Entry points **RETAIN** (owinięte, nie zastąpione) |
| Cloud Sync merge core | **bez zmian** w tym EPIC |

### Post-errata architecture (FINAL)

```text
UI W1/W2 (semantics retained)
  → D2 Domain Gate + UI Dialog          [C2][C4 primary]
  → D5 Soft Restore overlay (W2 only)     [C5]
  → Domain Push (D6 SSOT)
       · skipPayrollGuard ⇔ intentionalHoursClear [C1][C3 secondary]
       · D1 telemetry emit only           [C6]
  → Cloud KV (+ -prev)
  → D4 Prev Recovery Banner (≠ archive) [C3]
```

### Integrity check (Owner „SPRAWDŹ”)

| Pytanie | Po erracie |
|---------|------------|
| SSOT bez zmian? | **TAK** |
| Domain Push jedyną drogą zapisu godzin? | **TAK** |
| W1/W2 semantyka entry bez wymiany? | **TAK** (ochrona + overlay, nie nowy funnel) |
| Cloud Sync merge / finalize bez redesignu? | **TAK** |

---

## 3. Implementation Constraints

| ID | Constraint |
|----|------------|
| **IC-1** | Nazwa flagi wyłącznie **`intentionalHoursClear`** |
| **IC-2** | D2 policy w domain; UI nie jest SSOT decyzji |
| **IC-3** | D4 helper oddzielny od archive restore banner |
| **IC-4** | D2 primary · D3 secondary — testy muszą pokryć partial wipe (2 emp), nie tylko &gt;50% roster |
| **IC-5** | Nie mutować ciała `weekEmployeeFromDir` dla Soft Restore |
| **IC-6** | D1 side-effect free (assert w testach) |
| **IC-7** | Rollover / clear-all / empty-week-after-archive → **poza** D2 hours gate |
| **IC-8** | Kolejność: **D1 → D2+D3 → D4 → D5** |
| **IC-9** | Zakaz: RS payroll set · zmiana resurrection fence · mixed CORE bez GO |
| **IC-10** | AC z DF-01 obowiązują z zamianą `intentionalClear` → **`intentionalHoursClear`** |

**AC rename (binding):**

| Stare (DF-01) | Final |
|---------------|-------|
| AC-D2-2 / AC-D3-* `intentionalClear` | **`intentionalHoursClear`** |
| AC-D4-1 archive confusion | Explicit: banner na **`-prev` only** |

---

## 4. Owner Readiness

```text
OWNER READINESS: ERRATA ACK COMPLETE · EPIC CLOSED

Accepted: C1–C6
Final Design Freeze: DF-01 + AMENDMENT-01
SSOT / Domain Push / W1·W2 / Cloud Sync: UNCHANGED

Next: NONE — EPIC CLOSED
  Closeout: PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md
```

---

## 5. Raport końcowy (Owner card)

1. **Accepted Amendments** — C1–C6 ACK · IC-7 retained  
2. **Final Design Freeze** — §2 (D1–D6 + errata)  
3. **Implementation Constraints** — IC-1…IC-10  
4. **Owner Readiness** — **CLOSED** · D1–D5 DELIVERED · EPIC CLOSE [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md)  

**BEZ IMPLEMENTACJI · BEZ COMMIT · BEZ PUSH**
