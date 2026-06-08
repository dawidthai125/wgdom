# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-08  
**Wersja UI (prod):** **2.49.80** — Sprint 20.5A.4 Billing Notes Workflow  
**Prod `origin/main` HEAD:** **`9990921`** · https://www.wgdom.fun  
**Status Sprint 20.5A.4:** **CLOSED** (deploy prod; manual smoke urządzenia — do potwierdzenia przez właściciela)

---

## Sprint 20.5A.3A — Inspektor × Do rozliczenia read-only (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.49.70** |
| **Commit** | **`4fec9cc`** — `feat(inspector): read-only billing review on job detail (20.5A.3A)` |
| **Production** | https://www.wgdom.fun |
| **Deploy** | Vercel — **2.49.70** w bundle prod (poll T+2 min) |

### Zakres

| Element | Opis |
|---------|------|
| **InspectorPanel** | Read-only sync `kw-recoverable-charges` + tombstones (bez push billing) |
| **JobRecoverableChargesPanel** | `variant="inspector"` — KPI, kwoty, historia settlementów |
| **InspectorJobCard** | Badge 💰 + tooltip PLN przy `unsettledCount > 0` |
| **Smoke** | `smoke-test-inspector-billing-20.5a3a.mjs` (T1–T8) + `smoke-prod-bundle-20.5a3a.mjs` |

### Post-deploy (automatyczny)

| Suite | Wynik |
|-------|-------|
| build lokalny | **PASS** |
| smoke 20.5a3a | **28/28 PASS** |
| smoke inspector 20.2a | **PASS** |
| smoke 20.5a1 / 20.5a2 | **PASS** |
| prod bundle 2.49.70 | **PASS** (markery UI po deploy) |
| GitHub Mobile smoke tests | **FAIL** (workflow — wzorzec sprzed 20.5A; nie blokuje Vercel frontend) |

### Manual smoke prod (A–J)

| Urządzenie | Status |
|------------|--------|
| iPhone Safari | **Do potwierdzenia** (właściciel) |
| Android Chrome | **Do potwierdzenia** (właściciel) |
| Desktop Chrome | **Do potwierdzenia** (właściciel) |

---

## Sprint 20.5A.4 — Uwagi inspektora do pozycji billing (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.49.80** |
| **Commit** | **`9990921`** — `feat(inspector): add billing notes workflow for recoverable charges (20.5A.4)` |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Deploy** | Vercel `3oqGD9dUuNPHCZhtGVax2cXwbUsH` — **SUCCESS** |

| Element | Opis |
|---------|------|
| **Model** | `JobNote.recoverableChargeId` + `context: billing`; `inspector_billing_note` |
| **Inspektor** | „Zgłoś uwagę” na karcie pozycji; push tylko `kw-jobs` |
| **Admin** | Wątek + odpowiedź w `JobRecoverableChargesPanel`; Pulpit prefiks „Do rozliczenia” |
| **WM** | `wmJobNotes()` — separacja od billing |
| **Smoke** | `smoke-test-inspector-billing-notes-20.5a4.mjs` **28/28 PASS** |

### Post-deploy (automatyczny)

| Suite | Wynik |
|-------|-------|
| build lokalny | **PASS** |
| smoke 20.5a4 | **28/28 PASS** |
| smoke 20.5a3a | **28/28 PASS** |
| smoke inspector 20.2a | **ALL PASS** |
| prod bundle 2.49.80 (obie domeny) | **PASS** (markery UI; nazwy helperów zminifikowane w bundle) |
| GitHub Mobile smoke tests | **FAIL** (workflow — wzorzec sprzed 20.5A; nie blokuje Vercel frontend) |

### Manual smoke prod (billing notes A–D)

| Urządzenie | Status |
|------------|--------|
| iPhone Safari | **Do potwierdzenia** (właściciel) |
| Android Chrome | **Do potwierdzenia** (właściciel) |
| Desktop Chrome | **Do potwierdzenia** (właściciel) |

**Następny backlog:** 20.5A.5+ (zdjęcia do uwag / zgłoszenie pozycji przez inspektora) lub 20.3B MIN / Roboty 2.0 MID — tylko na polecenie.

---

## Seria billing + Roboty (CLOSED)

| Sprint | Wersja | Commit | Status |
|--------|--------|--------|--------|
| **20.5A.4** Billing Notes Workflow | **2.49.80** | **`9990921`** | **CLOSED** |
| **20.5A.3A** Inspector Billing Review | **2.49.70** | **`4fec9cc`** | **CLOSED** |
| 20.5A.2 Create from job | 2.49.10 | `571b90b` | CLOSED |
| 20.5A.1 Jobs read-only | 2.49.00 | `637f12c` | CLOSED |

---

## Seria payroll 20.1A–20.1D (CLOSED)

| Sprint | Wersja | Opis | Status |
|--------|--------|------|--------|
| 20.1D closed semantics | 2.49.60 | Blockers + Nd 20:00 = operacyjny | CLOSED |
| 20.1C.2 dashboard alerts | 2.49.40 | `listPayrollRolloverBlockers` | CLOSED |
| 20.1C.1 sync integrity | 2.49.30 | F5 / KV po rolloverze | CLOSED |
| 20.1C rollover | 2.49.20 | Kasa sobotnia blokuje advance | CLOSED |
| 20.1B saved ≠ closed | 2.45.39 | Defer po „Zapisz tydzień” | CLOSED |
| 20.1A carry forward | 2.45.38 | Odroczenie wypłaty ⏭ | CLOSED |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md
3. docs/ARCHITECTURE.md § Do rozliczenia (20.5A.4 billing notes + 20.5A.3A read-only)
4. AGENTS.md
```
