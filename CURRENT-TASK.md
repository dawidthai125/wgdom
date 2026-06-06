# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-06  
**Wersja UI (prod):** **2.45.39** — Sprint 20.1B saved ≠ closed  
**Prod `origin/main` HEAD:** **`74e65d9`** · https://www.wgdom.fun  
**Status Sprint 20.1B:** **CLOSED**

---

## Sprint 20.1B — Carry workflow fix (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.45.39** |
| **Commit** | **`74e65d9`** — `fix(payroll): allow carry forward on saved active week (20.1B)` |
| **Production** | https://www.wgdom.fun |
| **Edge deploy** | **nie wymagany** |
| **Vercel deploy** | **PASS** @ `74e65d9` |

### Podsumowanie

Rozdzielono **saved** (backup w `savedWeeks`) od **closed** (tydzień historyczny po rolloverze). Defer ⏭ działa po „Zapisz tydzień”, dopóki tydzień jest operacyjny.

| Element | Opis |
|---------|------|
| **`isPayrollWeekSaved`** | wpis w archiwum — backup |
| **`isPayrollWeekClosed`** | `weekFrom/weekTo ≠ getPayrollWeekRange()` |
| **Aktywny tydzień** | live `weekEmployees`, defer ⏭, PDF/DOCX live |
| **Historyczny tydzień** | snapshot freeze, defer zablokowany (`closed_week`) |
| **Snapshot refresh** | `refreshSavedActiveWeekSnapshot()` po defer / settled / edycji |

**Handoff:** [`docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md)

**Testy:** `scripts/pre-commit-verify-20.1b.mjs`, `scripts/smoke-test-payroll-carry-forward-20.1b.mjs`, regresja 20.0A + 20.1A — PASS

**Następny sprint:** TBD

### Sesja AI 2026-06-06 (ten czat) — chronologia

1. **Audyt widoczności 20.1A** — po „Zapisz tydzień” ⏭ znikał (root: `isArchivedWeek` = zapisany = zarchiwizowany). Scenariusz Kamila 35h/1050 PLN → przycisk ukryty mimo braku rolloveru.
2. **Sprint 20.1B** — saved ≠ closed: `isPayrollWeekClosed`, defer do rolloveru, live payroll na operacyjnym, snapshot tylko historyczny, `refreshSavedActiveWeekSnapshot`.
3. **Testy** — A–F + TEST 1–9 + regresje 20.0A/20.1A + build — PASS.
4. **Deploy** — commit `74e65d9`, Vercel PASS, prod **2.45.39**.
5. **Docs follow-up** — commit **`d89dc9c`** (kontekst czatu dla AI, Cursor rules).

**Nie commitowane (poza sprintem):** skrypty RCA w `scripts/audit-*`, `find-map-sources`, `verify-jobs-mount-crash`, itd.

---

## Sprint 20.1A — Odroczenie wypłaty (**CLOSED**, `f24fafe`, v2.45.38)

**Handoff:** [`docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md`](docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md)

---

## Sprint 20.0A — Nieobecności (**CLOSED**, `778f616`, v2.45.37)

**Handoff:** [`docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md`](docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md)

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md (20.1B CLOSED)
3. docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md (20.1A)
4. docs/ARCHITECTURE.md § 10.1 (saved/closed + carry)
5. src/lib/payroll-cycle.ts (isPayrollWeekClosed)
```
