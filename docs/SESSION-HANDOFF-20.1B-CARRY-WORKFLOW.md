# Sprint 20.1B Closure — Carry Forward Workflow (saved ≠ closed)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Release

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.45.39** |
| **Commit funkcjonalny** | **`74e65d9`** — `fix(payroll): allow carry forward on saved active week (20.1B)` |
| **Pełny hash** | `74e65d98ccae7a8f792ee69e17e7e841311dc0ac` |
| **Production** | https://www.wgdom.fun |
| **Vercel deploy** | **PASS** @ `74e65d9` |
| **Edge deploy** | nie wymagany (tylko frontend) |
| **Docs closure (ta sesja)** | **`d89dc9c`** — `docs: close sprint 20.1B session context for AI agents` |

### Łańcuch commitów (payroll carry)

| Commit | Opis |
|--------|------|
| `778f616` | Sprint 20.0A — nieobecności |
| `f24fafe` | Sprint 20.1A — odroczenie wypłaty (MODEL A) |
| `696145a` | docs: close sprint 20.1A |
| **`74e65d9`** | **Sprint 20.1B — saved ≠ closed** |

---

## Sesja AI 2026-06-06 — pełny kontekst czatu

> Dla agentów wznawiających pracę — co robiliśmy od audytu do deployu.

### Etap 1 — Visibility Audit (20.1A, tylko analiza)

Po wdrożeniu 20.1A (`f24fafe`) zgłoszono problem biznesowy **Kamila**:

1. Właściciel klika **„Zapisz tydzień”**.
2. Rollover **nie nastąpił** — nadal bieżący tydzień Pn–So.
3. Kamil Elektryk (35h, 1050 PLN) — właściciel chce ⏭ przenieść wypłatę.
4. Przycisk ⏭ **niewidoczny**.

**RCA w kodzie 20.1A:**

* `isArchivedWeek = savedWeeks.some(...)` — zapis do archiwum = traktowany jak zamknięcie.
* `canDeferPayroll(..., isArchivedWeek)` → `archived_week` → defer zablokowany.
* Przycisk ⏭ renderowany **tylko** w `WeekEmployeeDetail.tsx` (panel po kliknięciu wiersza), **nie** w tabeli listy płac.

**Werdykt audytu:** scenariusz Kamila = **B) ukryty** — zgodnie z kodem 20.1A, **niezgodnie** z workflow biznesowym (zapis = backup, nie koniec edycji).

### Etap 2 — Implementacja Sprint 20.1B

**Cel:** rozdzielić **saved** (backup w `savedWeeks`) od **closed** (tydzień historyczny po rolloverze / nawigacja wstecz).

**Kluczowe zmiany kodu:**

| Plik | Zmiana |
|------|--------|
| `payroll-cycle.ts` | `isPayrollWeekSaved()`, `isPayrollWeekClosed()` |
| `payroll-carry-forward.ts` | `canDeferPayroll` → blokada `closed_week` zamiast `archived_week` |
| `payroll-leave-overlay.ts` | biweekly overlay ze snapshotu tylko gdy closed; re-export saved/closed |
| `PayrollView.tsx` | `isSavedWeek` / `isClosedWeek`; live vs snapshot; banery |
| `WeekEmployeeDetail.tsx` | prop `isClosedWeek` |
| `App.tsx` | `refreshSavedActiveWeekSnapshot()` po defer / settled / edycji |
| `GuideView.tsx` | instrukcja saved vs closed |
| `changelog-data.ts` | **2.45.39** |

**Nowe skrypty testowe:**

* `scripts/smoke-test-payroll-carry-forward-20.1b.mjs` — scenariusze A–F
* `scripts/pre-commit-verify-20.1b.mjs` — TEST 1–9 (Kamil)

### Etap 3 — Weryfikacja pre-commit

| Suite | Wynik |
|-------|-------|
| TEST 1–9 (`pre-commit-verify-20.1b.mjs`) | PASS |
| Regresja 20.0A (`smoke-test-employee-leaves-20.0a.mjs`) | PASS |
| Regresja 20.1A (`smoke-test-payroll-carry-forward-20.1a.mjs`, `post-smoke-20.1a.mjs`) | PASS |
| `npm run build` | PASS |

### Etap 4 — Commit, push, deploy verify

* Commit **`74e65d9`** — 16 plików (kod + docs + skrypty smoke)
* Push `696145a..74e65d9` → `origin/main`
* **Vercel:** deployment success @ `74e65d9`
* **Prod bundle:** `panel-guide` zawiera **2.45.39** + tekst „kopia zapasowa”
* **PayrollView chunk:** `isClosedWeek` obecny w prod lazy chunk
* **GitHub Mobile smoke:** FAIL (pre-existing, jak przy 20.1A — nie blokuje Vercel)
* **Supabase GHA:** nie uruchomiony (brak zmian w `supabase/functions/**`)

### Etap 5 — Docs-only (ta sesja, follow-up)

Commit docs-only: hash deploy, pełny kontekst czatu, aktualizacja `.cursor/rules/wgdom-stan-projektu.mdc`.

### Manualny test na prod (zalecany)

Zaloguj admin → Lista płac → **Zapisz tydzień** (bez rolloveru) → kliknij wiersz Kamila → ⏭ **powinien być widoczny**.

---

## Problem biznesowy (Kamil)

Scenariusz produkcyjny:

1. Właściciel klika **„Zapisz tydzień”** (backup).
2. Rollover **nie nastąpił** — nadal bieżący tydzień Pn–So.
3. Pracownik **Kamil Elektryk** (35h, 1050 PLN) prosi o przeniesienie wypłaty.
4. W 20.1A przycisk ⏭ był **ukryty** — `isArchivedWeek` traktował zapis jak zamknięcie tygodnia.

To nie odpowiadało workflow: zapis = kopia zapasowa, nie koniec edycji wypłat.

---

## Rozwiązanie: saved vs closed

| Pojęcie | Definicja | Defer ⏭ | Źródło listy / PDF |
|---------|-----------|---------|---------------------|
| **saved** | wpis w `savedWeeks` | ✅ (gdy operacyjny) | **live** `weekEmployees` |
| **closed** | `weekFrom/weekTo ≠ getPayrollWeekRange()` | ❌ `closed_week` | **snapshot** archiwum |

**Kluczowe funkcje:**

* `isPayrollWeekSaved()` — `payroll-cycle.ts`
* `isPayrollWeekClosed()` — `payroll-cycle.ts`
* `canDeferPayroll(..., isClosedWeek)` — `closed_week` zamiast `archived_week`
* `refreshSavedActiveWeekSnapshot()` — `App.tsx`

---

## Architektura

```
Aktywny tydzień payroll (saved lub nie)
  → weekEmployees live
  → employeeLeaves live
  → defer ⏭ OK
  → PDF/DOCX z live
  → jeśli saved → snapshot odświeżany przy zmianach

Tydzień historyczny (po rollover / nawigacja wstecz)
  → payrollEmployees ze snapshot
  → archivedSnapshot w calc
  → defer ⏭ blocked (closed_week)
  → PDF/DOCX ze snapshot (immutable)
```

**Urlopy 20.0A:** bez zmian — retro-urlop na tygodniach w `savedWeeks` nadal zablokowany (`archived_week` w walidacji leaves).

---

## Pliki zmienione

| Plik | Rola |
|------|------|
| `payroll-cycle.ts` | `isPayrollWeekSaved`, `isPayrollWeekClosed` |
| `payroll-carry-forward.ts` | `closed_week` w `canDeferPayroll` |
| `payroll-leave-overlay.ts` | biweekly overlay: snapshot tylko gdy closed |
| `PayrollView.tsx` | `isSavedWeek` / `isClosedWeek`, banery, live vs snapshot |
| `WeekEmployeeDetail.tsx` | prop `isClosedWeek` |
| `App.tsx` | `refreshSavedActiveWeekSnapshot` |
| `GuideView.tsx` | instrukcja saved vs closed |

---

## Testy

### Scenariusze 20.1B (A–F) — `smoke-test-payroll-carry-forward-20.1b.mjs`

| ID | Scenariusz | Wynik |
|----|------------|-------|
| A | active → save → defer | PASS |
| B | save → refresh → defer | PASS |
| C | save → defer → PDF | PASS |
| D | save → defer → rollover → carry in | PASS |
| E | historyczny → defer blocked | PASS |
| F | regresja urlopów 20.0A | PASS |

### Pre-commit (TEST 1–9) — `pre-commit-verify-20.1b.mjs`

Kamil 35h/1050, PDF, DOCX, snapshot refresh, rollover, closed week — **PASS**

### Regresje

| Suite | Wynik |
|-------|-------|
| `smoke-test-employee-leaves-20.0a.mjs` | PASS |
| `smoke-test-payroll-carry-forward-20.1a.mjs` | PASS |
| `post-smoke-20.1a.mjs` | PASS |
| `npm run build` | PASS |

---

## Ryzyka

| Ryzyko | Priorytet |
|--------|-----------|
| Granica rollover Nd ≥20:00 — manualny check w niedzielę | Niski |
| Brak E2E Playwright na prod dla Kamila — smoke programowy PASS | Niski |
| Edycja live przy widoku tygodnia historycznego — edge case sprzed 20.1B | Niski |

---

## Status

**CLOSED**

---

## Następny sprint

TBD
