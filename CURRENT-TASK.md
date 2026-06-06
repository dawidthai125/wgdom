# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI (prod):** **2.45.38** — Sprint 20.1A odroczenie wypłaty  
**Prod `origin/main` HEAD:** **`f24fafe`** · https://www.wgdom.fun  
**Status Sprint 20.1A:** **CLOSED**

---

## Sprint 20.1A — Odroczenie wypłaty (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.45.38** |
| **Commit** | **`f24fafe`** — `feat(payroll): add deferred payroll payment (20.1A)` |
| **Production** | https://www.wgdom.fun |
| **Edge deploy** | **nie wymagany** |
| **Vercel deploy** | auto po pushu `main` — **PASS** |

### Podsumowanie wdrożenia

Sprint wprowadza **Deferred Payroll Payment** — jednorazowe przeniesienie wypłaty na następny tydzień płacowy (tygodniówka), z zamrożoną kwotą w momencie kliknięcia (MODEL A).

| Element | Opis | Status |
|---------|------|--------|
| **⏭ Przenieś na następny tydzień** | UI w `PayrollView` + `WeekEmployeeDetail`; MODEL A — freeze kwoty | ✓ prod |
| **`payrollCarryForward`** | Pole na `WeekEmployee` w `kw-week-employees` | ✓ prod |
| **Tydzień docelowy** | `displayNet = baseNet + carryForwardIn` (tylko jeden tydzień) | ✓ prod |
| **Archive freeze** | `carryForwardOut/In` w `EmployeeSnapshot`; PDF/DOCX ze snapshotu | ✓ prod |
| **Biweekly V1** | Zablokowane — tylko tygodniówka | ✓ prod |
| **Sync merge** | `pickPayrollCarryForward` w `mergeWeekEmployeeRecord` | ✓ prod |
| **Double-click guard** | Drugie ⏭ → `already_deferred` | ✓ prod |

**Pliki core:** `payroll-carry-forward.ts`, `payroll-carry-snapshot.ts`, `PayrollView.tsx`, `WeekEmployeeDetail.tsx`, `app-domain.ts`, `payroll-export.ts`, `ArchiveView.tsx`, `cloud-sync.ts`

**Testy (PASS):** `scripts/post-smoke-20.1a.mjs`, `scripts/smoke-test-payroll-carry-forward-20.1a.mjs`, `scripts/smoke-test-employee-leaves-20.0a.mjs`, `npm run build`

**Handoff:** [`docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md`](docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md)

**Następny sprint:** TBD

---

### Deferred Payroll Payment (20.1A)

| Aspekt | Opis |
|--------|------|
| **Funkcja** | Jednorazowe przeniesienie wypłaty na następny tydzień (⏭) |
| **MODEL A** | Kwota zamrożona w momencie kliknięcia — nie przelicza się po zmianie godzin/stawki |
| **Weekly only** | Tylko tygodniówka; wypłata co 2 tygodnie — **zablokowana** w V1 |
| **Archive snapshot freeze** | `carryForwardOut` / `carryForwardIn` zamrożone w `EmployeeSnapshot` przy „Zapisz tydzień” |
| **PDF/DOCX** | W1: PRZENIESIONO; W2: suma z adnotacją przeniesienia — ze snapshotu archiwum |

---

## Sprint 20.0A — Nieobecności pracowników (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.45.37** |
| **Commit** | **`778f616`** — `feat(payroll): add employee leave management (20.0A)` |
| **Production** | https://www.wgdom.fun |

**Handoff:** [`docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md`](docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md)

---

## Performance 2.x — **CLOSED** (baza przed 20.0A: `35614f0`)

Seria zamknięta. Nie wracać bez regresji produkcyjnej.

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md (Sprint 20.1A CLOSED)
3. docs/ARCHITECTURE.md § 10.1 (payrollCarryForward + nieobecności)
4. src/lib/payroll-carry-forward.ts + payroll-carry-snapshot.ts
5. docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md (20.0A CLOSED)
```
