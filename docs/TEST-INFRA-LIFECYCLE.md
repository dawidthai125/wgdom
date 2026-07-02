# TEST-INFRA-001 — Lifecycle uruchamiania testów

> **SSOT manifest:** [`test-infra/test-manifest.json`](../test-infra/test-manifest.json)  
> **Orchestrator:** `npm run test:infra -- --suite <id>` · `npm run test:infra -- --gate <A|B|C>`  
> **Design freeze:** [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md)

---

## Fazy lifecycle

| Faza | Kto | Akcja |
|------|-----|-------|
| **F1 Edit** | Dev | Zmiana w `src/` |
| **F2 Scope** | Dev | Określenie scope: `payroll` · `platform` · `all` |
| **F3 Local gate** | Dev | `npm run build` + orchestrator (tier B/C) |
| **F4 Commit** | Dev | Aktualizacja manifestu jeśli zmieniono release gate |
| **F5 CI** | GitHub Actions | build + E2E preview (path filter) |
| **F6 Release report** | Wykonawca | WORKFLOW § 7 — BUILD / TEST / GIT / RELEASE |
| **F7 Verify prod** | Wykonawca | jedno `curl version.json` (poza scope TEST-INFRA MVP) |
| **F8 Post-release** | Ops | testy opcjonalne (prod mobile, bundle smoke) |

---

## Komendy orchestratora (MVP)

```bash
# Pojedynczy suite z manifestu
npm run test:infra -- --suite lib-payroll-core

# Release gate tier
npm run test:infra -- --gate B --scope payroll
npm run test:infra -- --gate C --scope all

# Kontynuacja po pierwszym FAIL
npm run test:infra -- --suite lib-payroll-core --continue

# Prod E2E (domyślnie blokada)
npm run test:infra -- --suite gate-c-e2e-preview --allow-prod
```

---

## Mapowanie tier → suite

| Tier | Build | Suite |
|------|-------|-------|
| **A** | TAK | — |
| **B** | TAK | `gate-b-relevant` (filtrowane `--scope`) |
| **C** | TAK | `gate-b-relevant` + `gate-c-e2e-preview` |

---

## Klasy testów — kolejność

Orchestrator uruchamia w kolejności: **lib → smoke → e2e → audit** (audit **wyłącznie** z `--include-audit`).

---

## Środowiska

| Env | Użycie |
|-----|--------|
| **node** | lib · smoke · audit statyczny |
| **preview :4173** | E2E gate C — wymaga `npm run build && npm run preview` przed E2E |
| **prod** | tylko `--allow-prod` (poza MVP gate) |

---

## Obowiązkowe vs opcjonalne

| Obowiązkowe (tier C) | Opcjonalne |
|----------------------|------------|
| `gate-c-e2e-preview` (happy + version + payroll S1) | `SMOKE-PAYROLL-CARRY-20.1B` |
| `lib-payroll-core` przy scope payroll tier B/C | `AUDIT-IMPORT-CYCLES` |
| `AUDIT-MOBILE-STATIC` przy `--include-audit` + scope platform | prod mobile E2E |

---

*TEST-INFRA-001 lifecycle · MVP · 2026-07-01*
