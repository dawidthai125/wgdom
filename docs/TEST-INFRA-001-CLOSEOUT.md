# TEST-INFRA-001 — Infrastruktura testowa · CLOSEOUT

> **Status:** **CLOSED** · **Data closeout:** 2026-07-02  
> **Prod baseline:** **v2.63.26** (`3d6dd90`) · **PRODUCTION VERIFIED**  
> **STABILIZATION WINDOW:** ACTIVE  
> **Design freeze:** [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md) v2.0  
> **Lifecycle:** [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md)

---

## 1. Zakres MVP

| Element | Opis | Gate |
|---------|------|------|
| **Manifest SSOT** | `test-infra/test-manifest.json` — 16 testów, 5 suite, klasy lib/smoke/e2e/audit | Obowiązkowy |
| **Orchestrator** | `scripts/test-infra-orchestrator.mjs` + `npm run test:infra` | Obowiązkowy |
| **Walidacja manifestu** | `scripts/test-infra-manifest-validate.mjs` + `npm run test:infra:validate` | Obowiązkowy |
| **Release gates A/B/C** | Mapowanie tier → suite z manifestu (`--gate`, `--scope`, `--include-audit`) | Obowiązkowy |
| **Payroll Harness L0–L5** | Seed SSOT + cleanup + scenariusz PAYROLL-GUARD-S1 (preview CI) | Obowiązkowy |
| **Dokumentacja lifecycle** | Kiedy uruchamiać który tier | Obowiązkowy |

**Nowe pole KV:** brak · **Zmiana modelu danych:** brak · **Zmiana sync/merge:** brak

---

## 2. Wykonane elementy

### Manifest + orchestrator

- `test-infra/test-manifest.json` — SSOT indeksu testów (Principles #001–#013)
- `scripts/test-infra-orchestrator.mjs` — dispatch suite/gate, kolejność lib→smoke→e2e→audit
- `#008` failKind · `#009` exit ≠ 0 gdy `always` **oraz** wybrany (scope-selected) `conditional` blokują release (`optional` nigdy) · `#010` auto preview przed E2E
- Audit uruchamiany **wyłącznie** z `--include-audit`
- Prod E2E blokada bez `--allow-prod` (#018)

### Payroll Harness (Aneks A · Principles #014–#026)

| Warstwa | Plik | Rola |
|---------|------|------|
| L0 | `e2e/fixtures/payroll-harness-seed.ts` | Stałe harness + browser patch |
| L1 | `e2e/helpers/test-harness/core/seed-ssot.ts` | SSOT seed (`defaultJob`, `weekEmployeeFromDir`, `addWorkEntryForEmployee`) |
| Bridge | `e2e/helpers/test-harness/core/ssot-bridge.mjs` | vite-node bridge (Playwright ≠ import.meta.env) |
| Cleanup | `e2e/helpers/test-harness/core/cleanup-ssot.ts` | `removeWorkEntryFromJobs` — bez nowego KV |
| S1 | `e2e/helpers/test-harness/payroll/scenarios/guard-s1.ts` | Lista Płac → Przydziały robót |
| Spec | `e2e/payroll-guard-s1.spec.ts` | Projekt `e2e-payroll-guard` w `playwright.config.ts` |

### Komendy npm

```bash
npm run test:infra:validate
npm run test:infra -- --suite lib-payroll-core
npm run test:infra -- --gate B --scope payroll
npm run test:infra -- --gate C --scope all
npm run test:e2e:payroll-guard   # preview :4173
```

### Release

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.26** |
| **Commit** | **`3d6dd90`** |
| **Message** | `feat(test-infra): implement TEST-INFRA-001 MVP` |
| **Pliki** | 22 (manifest, orchestrator, harness, lifecycle doc, changelog) |

---

## 3. Czego MVP nie obejmuje

| Element | Uzasadnienie |
|---------|--------------|
| CI gate pełnego pakietu lib (~241 skryptów) | Wymaga czasu CI i stabilizacji manifestu |
| Prod nightly L5 live sync | Wymaga `HARNESS_SANDBOX_JOB_IDS` (#018) i ops gate |
| Smoke agregat NG-01–04 | Slot zarezerwowany w manifeście; plik poza MVP |
| E2E Przetargi workspace w default gate C | SMOKE-03 class · preview seed tender |
| E2E Audit Hub / BOQ UI | Brak krytycznej regresji bez nowych testów biznesowych |
| TI-B1 `removeWeekEmployee()` ekstrakcja do lib | Backlog techniczny OPEN |
| TI-B2 `HARNESS_SANDBOX_JOB_IDS` konfiguracja prod | Backlog techniczny OPEN · P0 przed prod harness |
| Coverage / Vitest / mutation | Zmiana stacku — poza freeze |
| Reuse harness Roboty / Kadry / Delegacje | Po domknięciu Payroll MVP |

---

## 4. Wpływ na przyszłe EPIC-y

| Epic / obszar | Wpływ TEST-INFRA-001 |
|---------------|----------------------|
| **Payroll / PAYROLL-CLOUD-RECOVERY** | Gate B/C może uruchamiać `lib-payroll-core` + PAYROLL-GUARD-S1 zamiast ad-hoc list |
| **NG-02 / NG-04 stabilizacja** | Manifest rezerwuje sloty suite; orchestrator gotowy na `--scope tenders` |
| **Mobile Recovery** | `AUDIT-MOBILE-STATIC` w manifeście; opcjonalny `--include-audit` |
| **Release workflow A/B/C** | Orchestrator mapuje tier → suite zgodnie z [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) |
| **STABILIZATION WINDOW** | Epic **CLOSED** — dalsze rozszerzenia (CI lib, prod nightly) tylko na polecenie |
| **MPI / NG-05** | Niezależne — TEST-INFRA nie blokuje ani nie włącza MPI-0 |

**Zasada:** nowe testy release → wpis w `test-manifest.json` + walidacja `test:infra:validate` — nie hardcoded listy w handoffach.

---

## 5. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | Manifest SSOT z walidacją struktury | **PASS** |
| 2 | Orchestrator `--suite` / `--gate` / `--scope` / `--include-audit` | **PASS** |
| 3 | Payroll Harness L0–L5 preview — PAYROLL-GUARD-S1 | **PASS** |
| 4 | `npm run build` | **PASS** |
| 5 | `npm run test:infra:validate` | **PASS** |
| 6 | `npm run test:infra -- --suite lib-payroll-core` (10/10) | **PASS** |
| 7 | `npm run test:e2e:payroll-guard` (preview) | **PASS** |
| 8 | Changelog **2.63.26** + lifecycle doc | **PASS** |
| 9 | Commit + push `main` | **PASS** (`3d6dd90`) |
| 10 | Prod `version.json` — jedno sprawdzenie | **PASS** (`2.63.26` / `3d6dd90`) |

---

## 6. Backlog post-MVP (OPEN)

| ID | Element | Priorytet |
|----|---------|-----------|
| **TI-B1** | Ekstrakcja `removeWeekEmployee()` do warstwy lib | Normal |
| **TI-B2** | `HARNESS_SANDBOX_JOB_IDS` przed pierwszym prod run | **P0** przed L5 prod |
| **TI-B3** | CI workflow GitHub Actions — gate B/C z orchestratora | Na polecenie |
| **TI-B4** | Smoke agregat NG-01–04 | **CLOSED** · [`TI-B4-CLOSEOUT.md`](TI-B4-CLOSEOUT.md) |

---

## 7. Werdykt

```text
TEST-INFRA-001 — CLOSED
BASELINE v2.63.26 · COMMIT 3d6dd90 · PRODUCTION VERIFIED
MVP: manifest + orchestrator + Payroll Harness S1 + lifecycle doc
Backlog: TI-B1 · TI-B2 · TI-B3 · CI lib suite · prod nightly — OPEN (na polecenie)
TI-B4 smoke agregat — CLOSED (2.63.27 · Z-04 PASS)
STABILIZATION WINDOW ACTIVE
```

---

*TEST-INFRA-001 epic closeout · 2026-07-02*
