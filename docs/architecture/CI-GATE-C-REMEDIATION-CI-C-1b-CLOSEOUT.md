# CI GATE C REMEDIATION — CI-C-1b CLOSEOUT

> **Status:** **CLOSED**  
> **Data:** 2026-07-25  
> **DF:** [`CI-GATE-C-REMEDIATION-CI-C-1b-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-1b-DESIGN-FREEZE.md) · Wariant **A**  
> **Commit:** `075719a`

## IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `.github/workflows/test-infra-gates.yml` | `gate-c.env`: +`VITE_SUPABASE_PROJECT_ID=ci-gate-b-mock` · +`VITE_SUPABASE_ANON_KEY=ci-gate-b-mock-anon` · `PW_BASE_URL` bez zmian |

**OUT:** `src/**` · orchestrator · E2E · suites · soft-skip

## VERIFY (lokalnie)

`VITE_SUPABASE_*=ci-gate-b-mock*` · `PW_BASE_URL=…4173` · `npm run test:infra -- --gate C --scope all --continue`

| Kryterium | Wynik |
|-----------|--------|
| Preview `#010` | PASS |
| `LIB-PAYROLL-GUARD-FAIL-LOUD` | **PASS** (env parity — nie blokuje) |
| E2E start | **PASS** — 3× mandatory uruchomione |
| `E2E-HAPPY-PATH` | FAIL (CI-C-3) |
| `E2E-PAYROLL-GUARD-S1` | PASS |
| `E2E-VERSION-AWARENESS` | PASS |
| Gate C totals | 63 PASS / 3 FAIL / 66 |

## VERIFY (CI — [#30135140963](https://github.com/dawidthai125/wgdom/actions/runs/30135140963) @ `075719a`)

| Job | Wynik |
|-----|--------|
| Manifest | PASS |
| Gate B payroll | PASS |
| Gate B tenders | PASS |
| Gate C | FAIL (tylko E2E — DoD CI-C-1b OK) |

| Kryterium Gate C | Wynik |
|------------------|--------|
| Preview `#010` | PASS |
| `LIB-PAYROLL-GUARD-FAIL-LOUD` | **PASS** |
| `>>> RUN E2E-HAPPY-PATH` | **TAK** (odsłonięty) |
| Fail-fast | `E2E-HAPPY-PATH` FAIL → stop (bez `--continue`) |
| Totals | **63 PASS / 1 FAIL / 64** · TEUX2 na tip **PASS** |

## Nowe / odsłonięte blokery (poza DoD CI-C-1b)

| ID | Status | Notatka |
|----|--------|---------|
| **CI-C-3** | **ODSŁONIĘTY na CI** | `E2E-HAPPY-PATH` — jedyny blocking FAIL tip |
| **CI-C-2** | OPEN | mobile „Lista” (legacy) |
| **CI-C-4 / CI-C-5** | PASS lokalnie; na CI nie doszły (fail-fast po happy) | Version + payroll-guard S1 |

## Prod

Brak zmian w kodzie produkcyjnym.
