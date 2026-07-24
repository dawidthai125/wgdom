# CI GATE C REMEDIATION — CI-C-1 CLOSEOUT

> **Status:** **CLOSED**  
> **Data:** 2026-07-25  
> **DF:** [`CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-1-DESIGN-FREEZE.md) · Wariant **A**  
> **Commit:** `da42fed`

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

## VERIFY (CI — run [#30133507218](https://github.com/dawidthai125/wgdom/actions/runs/30133507218) @ `da42fed`)

| Job | Wynik |
|-----|--------|
| Manifest | PASS |
| Gate B tenders | PASS |
| Gate B payroll | PASS |
| Gate C | **FAIL** po Preview |

| Kryterium Gate C | Wynik |
|------------------|--------|
| Preview `#010` | **PASS** — `Preview ready at http://127.0.0.1:4173` (~1 s) |
| Następny fail-fast | **`LIB-PAYROLL-GUARD-FAIL-LOUD`** — brak `VITE_SUPABASE_*` na jobie `gate-c` (Gate B ma env z CI-2; Gate C YAML tylko `PW_BASE_URL`) |
| E2E na CI | **NOT REACHED** (fail-fast lib w `gate C --scope all`) |

## Nowe / odsłonięte blokery (fail-fast)

| ID | Status | Notatka |
|----|--------|---------|
| **CI-C-1b** | **NOWY (odsłonięty na CI)** | Gate C job bez `VITE_SUPABASE_*` → GUARD-FAIL-LOUD blokuje przed E2E · **workflow env** · poza DF CI-C-1 (YAML był OUT) |
| **CI-C-2** | OPEN | `jobs-mobile` „Powrót do listy” — latent legacy |
| **CI-C-3** | **ODSŁONIĘTY lokalnie** | Happy-path FAIL @ `openInspectorJob` |
| **CI-C-4** | PASS lokalnie | Version awareness |
| **CI-C-5** | PASS lokalnie | Payroll guard S1 |

**CI-C-1 DoD (wąski):** Preview `#010` **CLOSED**. Pełne Gate C green = CI-C-1b + CI-C-2/3+.


## Prod

Brak zmian w kodzie produkcyjnym (`src/**`).
