# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (prod):** **2.50.41** — Roboty Active Today badge  
**Prod `origin/main` HEAD:** **`8a5d142`** · https://www.wgdom.fun  
**Status:** **STABLE**

---

## Desktop Layout Fix 2.50.20 (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.20** |
| **Commit** | **`5a664c2`** — `fix(layout): eliminate desktop double scrollbars in admin views (2.50.20)` |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Deploy** | GitHub deployment **`4981097719`** — **SUCCESS** |
| **Handoff** | [`docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md`](docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md) |

### Zakres

| Element | Opis |
|---------|------|
| **Root cause** | md+ `overflow-y: auto` na `html/body` + wewnętrzny scroll widoków → podwójny scrollbar |
| **Fix** | `overflow: hidden` na dokumencie; scroll tylko w panelach widoków |
| **min-w-0** | `AdminViewRouter`, `DashboardView`, `MediaView` — brak poziomego scrolla okna |
| **Mobile** | Bez zmian (`<768px`) |
| **Pliki** | `index.html`, `mobile.css`, `AdminViewRouter`, `DashboardView`, `MediaView` |
| **Smoke** | `smoke-test-desktop-layout-2.50.20.mjs` (13/13), `e2e/desktop-layout.spec.ts` |

### Post-deploy (automatyczny)

| Suite | Wynik |
|-------|-------|
| build lokalny | **PASS** |
| smoke desktop-layout 2.50.20 | **13/13 PASS** |
| audit:mobile | **36✓** |
| Playwright prod | **39/39 PASS** (11 desktop + 28 mobile) |
| regression 20.5A.x / MID-B / mobile-fix | **PASS** |
| prod bundle 2.50.20 (obie domeny) | **PASS** |

### Manual smoke prod (desktop A–F)

| Obszar | Status |
|--------|--------|
| A. Pulpit — jeden scroll | **Auto PASS** (CSS + static); ręcznie opcjonalnie |
| B. Roboty Lista | **Auto PASS** |
| C. Roboty Kolejki / MID-B | **21/21 PASS** |
| D. Payroll — scroll w tabeli | **Auto PASS** |
| E. Media | **Auto PASS** |
| F. Billing 20.5A.3A/4 | **PASS** |

---

## Seria 2.50.x (CLOSED)

| Wersja | Commit | Skrót | Status |
|--------|--------|-------|--------|
| **2.50.20** Desktop Layout | **`5a664c2`** | Podwójny scrollbar admin — fix | **CLOSED** |
| CI Mobile P0 | `74a013d` | audit + Playwright CI zielone | CLOSED |
| **2.50.10** Mobile Fix Pack | `4427b7a` | Toolbar compact, touch 44px, kolejki | CLOSED |
| **2.50.00** Roboty MID-B | `860e8d9` | Lista/Kolejki, filtr lidera | CLOSED |

---

## Roboty 2.0 MID-B — kolejki operacyjne (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Release** | **v2.50.00** |
| **Commit** | **`860e8d9`** |
| **Smoke** | `smoke-test-jobs-2.0-midb.mjs` **21/21** |

Toggle Lista | Kolejki · 6 sekcji rozłącznych · filtr `executionLeadDirectoryId` · badge odbiorów.

---

## Sprint 20.5A — Billing + Inspektor (**CLOSED**)

| Sprint | Wersja | Commit | Skrót |
|--------|--------|--------|-------|
| 20.5A.4 | 2.49.80 | `9990921` | Uwagi inspektora per pozycja billing |
| 20.5A.3A | 2.49.70 | `4fec9cc` | Inspektor read-only billing review |
| 20.5A.2 | 2.49.10 | `571b90b` | Create from job |
| 20.5A.1 | 2.49.00 | `637f12c` | Badge 💰, KPI, deep link |

Handoff: [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md)

**Następny backlog:** 20.5A.5+ · 20.3B+ CC — tylko na polecenie.

---

## Seria payroll 20.1A–20.1D (CLOSED)

| Sprint | Wersja | Opis |
|--------|--------|------|
| 20.1D | 2.49.60 | `isPayrollWeekClosedForUi` + blockers |
| 20.1C.2 | 2.49.40 | Dashboard rollover blockers |
| 20.1B | 2.45.39 | saved ≠ closed |
| 20.1A | 2.45.38 | Odroczenie wypłaty ⏭ |

---

## Szybki start dla agenta

```text
1. CURRENT-TASK.md (ten plik)
2. docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md  ← ★ seria 2.50.x + desktop scroll
3. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md
4. docs/ARCHITECTURE.md § 6.2 (shell admin scroll)
5. AGENTS.md
```
