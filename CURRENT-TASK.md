# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** (czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`).

**Ostatnia aktualizacja:** 2026-06-03  
**Wersja UI:** **2.45.29** (`src/app/changelog-data.ts`)  
**Faza 8:** **CLOSED** · **ETAP 8.5 MIN:** CLOSED · **ETAP 8.5 FULL (B lite):** CLOSED (lokalnie, bez commitu)  
**Faza 9:** NOT STARTED

---

## FAZA 8 — CLOSED (Tender → Job → Execution Ready → Executive)

Łańcuch produktowy na prod (`main` @ `88c25f8`):

```text
Tender → Win → Create Job → Execution Ready → Executive Dashboard → Open Job
```

| Etap | Commit | Wersja UI | Zakres |
|------|--------|-----------|--------|
| **8.0** | `d1b888e` | 2.45.22 | `executeCreateJobFromTender`, `TenderJobLinkButtons`, CC + Classic |
| **8.0A** | `5368016` | 2.45.23 | Jeden `useTendersPipeline` w Providerze; Classic × CC bez F5 |
| **8.1** | `dd41581` | 2.45.24 | `resolveInvoiceAmountFromTender`, `resolveJobDraftDatesFromTender` (umowa + dni SWZ) |
| **8.2** | `8b6e822` | 2.45.25 | `plannedHandoverDate`, baner „Realizacja kontraktu”, sync dokumentów po attach |
| **8.3** | `9bac507` | 2.45.26 | Pulpit: KPI „Wygrane bez roboty”, Utwórz/Otwórz robotę (executive) |
| **8.4** | `88c25f8` | 2.45.27 | Fallback dat z `implementationDeadlineRaw` / `contractPeriod` |

**Dokumentacja:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.4 · [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md)

**Test parserów 8.4 (lokalnie):** `node scripts/test-tender-job-draft-dates-8.4.mjs`

**Smoke prod (do ręcznego domknięcia w stabilizacji):** wygrana bez roboty → Utwórz robotę → KPI N−1 → baner 8.2 → daty 8.4 — patrz checklist w audycie prod (2026-06-03).

---

## ETAP 8.5 — planowa ekipa (FULL)

| Etap | Status | Zakres |
|------|--------|--------|
| **8.5 MIN** | CLOSED (`1c7e164`) | `startJobExecution`, baner „Rozpocznij realizację” |
| **8.5 FULL** | CLOSED (kod lokalny) | `executionLeadDirectoryId`, `executionAssigneeDirectoryIds`, baner + badge |

**Test:** `npx vite-node scripts/test-job-execution-team-8.5-full.mjs`

**Smoke prod:** wygrana → robota → start realizacji → lider + 3 osoby → odśwież → badge „Ekipa: 3”.

---

## Okres stabilizacji (propozycje — **nie** Faza 9 bez polecenia)

1. **Smoke manualny** Fazy 8 na wgdom.fun (konto z wygranymi bez `linkedJobId`)
2. **Deprecate `tenderDashStats`** — UI pulpitu nie czyta; ewentualny jeden load pipeline
3. **E2E Playwright** — flow Create Job (Classic / Executive)
4. Gałąź **`audit-before-cleanup`** @ `7eaf7ee` — media filter (nie prod); cherry-pick po decyzji
5. Optymalizacja 7G (bundle pulpit, lazy executive) — opcjonalnie

---

## Wcześniejsze (referencja)

### ETAP 7G — Pulpit × COMMAND CENTER AI (`7d49be2`)

Executive panel, wspólny snapshot, docs: [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md). Rozszerzone w **8.3** (Win CTA + KPI).

### Stabilność sync — czerwiec 2026

| Commit | Temat |
|--------|--------|
| `db1d05a` | Payroll Guard |
| `c9db032` | P11 bootstrap payroll merge |
| `92d574e` | P15 admin-passwords merge |

→ [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

### Gałąź nieprod

- **`audit-before-cleanup`** @ `7eaf7ee` — snapshoty KV, UI media — **nie** `main`
- **`dist-audit/`** — lokalny build; w `.gitignore`

---

## Szybki start dla nowego agenta

```text
1. AGENTS.md
2. PROJECT-GUIDE.md
3. docs/ARCHITECTURE.md  → § 11 (sync), § 12.1.3 (CC), § 12.1.4 (Faza 8)
4. docs/tender-center-7g-executive.md
5. docs/INCIDENTS-2026-06.md
6. CURRENT-TASK.md (ten plik)
7. CHANGELOG.md + changelog-data.ts
```
