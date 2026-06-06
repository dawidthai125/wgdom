# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI (lokalnie):** **2.45.38** — Sprint 20.1A odroczenie wypłaty  
**Prod `origin/main` HEAD:** **`778f616`** (v2.45.37) · https://www.wgdom.fun  
**Status Sprint 20.1A:** **READY FOR COMMIT** (lokalnie, bez push)

---

## Sprint 20.1A — Odroczenie wypłaty (**READY FOR COMMIT**)

| Pole | Wartość |
|------|---------|
| **Release (plan)** | **v2.45.38** |
| **Commit** | *nie wykonany* — oczekuje na polecenie użytkownika |
| **Edge deploy** | **nie wymagany** |
| **Vercel deploy** | po pushu `main` (auto) |

### Podsumowanie implementacji

Sprint wprowadza **Deferred Payroll Payment** — jednorazowe przeniesienie wypłaty na następny tydzień płacowy (tygodniówka), z zamrożoną kwotą w momencie kliknięcia.

| Element | Opis | Status |
|---------|------|--------|
| **⏭ Przenieś na następny tydzień** | UI w `PayrollView` + `WeekEmployeeDetail`; MODEL A — freeze kwoty | ✓ lokalnie |
| **`payrollCarryForward`** | Pole na `WeekEmployee` w istniejącym `kw-week-employees` | ✓ lokalnie |
| **Tydzień docelowy** | `displayNet = baseNet + carryForwardIn` (tylko jeden tydzień) | ✓ lokalnie |
| **Archive freeze** | `carryForwardOut/In` w `EmployeeSnapshot`; PDF/DOCX ze snapshotu | ✓ lokalnie |
| **Biweekly V1** | Zablokowane — tylko tygodniówka | ✓ lokalnie |
| **Sync merge** | `pickPayrollCarryForward` w `mergeWeekEmployeeRecord` | ✓ lokalnie |
| **Double-click guard** | Drugie ⏭ → `already_deferred` | ✓ lokalnie |

**Pliki core:** `payroll-carry-forward.ts`, `PayrollView.tsx`, `WeekEmployeeDetail.tsx`, `app-domain.ts`, `payroll-export.ts`, `ArchiveView.tsx`, `cloud-sync.ts` (merge carry)

**Testy (PASS):** `scripts/post-smoke-20.1a.mjs`, `scripts/smoke-test-payroll-carry-forward-20.1a.mjs`, `scripts/smoke-test-employee-leaves-20.0a.mjs` (regresja), `npm run build`

**Docs:** `CHANGELOG.md`, `docs/ARCHITECTURE.md` § 10.1, `GuideView` (Lista Płac), `changelog-data.ts` 2.45.38

**Następny krok:** commit + push na polecenie użytkownika

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
2. docs/ARCHITECTURE.md § 10.1 (payrollCarryForward + nieobecności)
3. src/lib/payroll-carry-forward.ts
4. docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md (20.0A CLOSED)
```
