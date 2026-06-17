# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-16 · **PAYROLL-ASSIGNMENTS-P1 (2.59.49)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.49** · **PRODUCTION VERIFIED** |
| **Commit prod (PAYROLL-P1)** | **`94ad114`** — Przydziały robót z Listy Płac |
| **Poprzedni prod (EM)** | **`26251ff`** — v2.59.44 EM-P1R-HF001 |
| **Stream WM Druk** | **COMPLETE** — ZI Tauron 2026 STABLE |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R |
| **Lista Płac · Przydziały** | **P1 CLOSED** |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **★ Przydziały robót (P1)** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |
| **Pomiary Elektryczne (EM)** | [`docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) |
| **WM Druk / POST ZI** | [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md) |
| **Onboarding agenta** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 10.2 · § 12.1.8 WM · § 12.1.10 EM |

## Ukończone w sesji 2026-06-16

| Faza | Wersja | Commit | Handoff / raport |
|------|--------|--------|------------------|
| INSPECTOR-P1B Pakiet odbiorowy | 2.59.46 | `e6d7e8e` | `audit/INSPECTOR-P1B-*` |
| INSPECTOR-UX-002 Quick wins | 2.59.47 | `27a2ab5` | — |
| INSPECTOR-DESIGN-002 Alignment | 2.59.48 | `2081dc8` | `audit/INSPECTOR-DESIGN-002-*` |
| **PAYROLL-ASSIGNMENTS-P1** | **2.59.49** | **`94ad114`** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) · [`audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md`](audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md) |

## Smoke — Przydziały robót (P1)

```bash
npm run build
npx vite-node scripts/test-payroll-assignments-p1.mjs
npx vite-node scripts/test-dashboard-v3-counts.mjs
```

## Smoke regresji EM (bez zmian w P1)

```bash
npx vite-node scripts/test-electrical-measurements-p1.mjs
npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs
```

## Smoke regresji WM Druk (ZI)

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
```

## Następny krok (produkt)

**PAYROLL-ASSIGNMENTS-P1 CLOSED.** Przed kolejną funkcją: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog OPEN (ustalić z użytkownikiem):**

- **PAYROLL-ASSIGNMENTS-P2** — patrz §11 w [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) (badge w Sumach, kopiowanie tygodnia, activity log, …)
- Notatki operacyjne **P3 Export** (PDF/DOCX/Email)
- **P2-H.7** Edge magic bytes 7z
- Nowe funkcje Pomiary Elektryczne / WM Druk (poza SSOT)
- Audit Center / Security Log

## Szybka mapa — gdzie co edytować (Lista Płac)

| Co | Plik |
|----|------|
| Tryby Sumy / Szczegóły / Przydziały | `PayrollView.tsx` → `payrollListMode` |
| Panel godzin pracownika | `WeekEmployeeDetail.tsx` |
| Panel przydziałów do robót | `PayrollJobAssignmentsPanel.tsx` |
| Logika spójności + mutacje jobs | `src/lib/payroll-job-assignments.ts` |
| Algorytm spójności (SSOT) | `app-domain.ts` → `payrollJobConsistencyAlerts` |
| Edycja przydziałów (Roboty) | `JobsView.tsx` → sekcja Pracownicy |
