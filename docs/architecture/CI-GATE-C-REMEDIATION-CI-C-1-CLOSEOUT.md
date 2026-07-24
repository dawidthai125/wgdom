# CI GATE C REMEDIATION — CI-C-1 CLOSEOUT

> **Status:** **CLOSED**  
> **Data:** 2026-07-25  
> **DF:** [`CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md) · Wariant **A**  
> **Commit:** *(uzupełnij po push)*

## IMPLEMENT

| Plik | Zmiana |
|------|--------|
| `scripts/test-infra-orchestrator.mjs` | Preview non-detached · bez `unref` · stdio pipe · `npm run preview -- --host 127.0.0.1 --port 4173` · health-check `GET /` + `shell: false` · `child.kill("SIGTERM")` |

**OUT:** `src/**` · UI · Payroll · Theme · Cloud Sync · Tenders · e2e · workflow YAML · Playwright webServer

## VERIFY (lokalnie)

| Kryterium | Wynik |
|-----------|--------|
| Preview `#010` | **PASS** — `Preview ready at http://127.0.0.1:4173` (bez throw 90s) |
| E2E start | **PASS** — wszystkie 3 mandatory uruchomione |
| `E2E-HAPPY-PATH` | **FAIL** (latent CI-C-3 — inspector job click) |
| `E2E-VERSION-AWARENESS` | **PASS** (4/4) |
| `E2E-PAYROLL-GUARD-S1` | **PASS** |

Komenda: `npm run test:infra -- --suite gate-c-e2e-preview --skip-build --continue`

## Nowe / odsłonięte blokery (fail-fast)

| ID | Status | Notatka |
|----|--------|---------|
| **CI-C-2** | nadal OPEN | `jobs-mobile` „Powrót do listy” — w Gate C orchestrator woła tylko `worker-admin-inspector-happy-path.spec.ts` (nie cały project); latent w legacy |
| **CI-C-3** | **ODSŁONIĘTY** | Happy-path FAIL @ `openInspectorJob` — brak buttona `E2E Testowa 20.5Z.1` |
| **CI-C-4** | CLOSED lokalnie | Version awareness PASS |
| **CI-C-5** | CLOSED lokalnie | Payroll guard S1 PASS |

## Prod

Brak zmian w kodzie produkcyjnym (`src/**`).
