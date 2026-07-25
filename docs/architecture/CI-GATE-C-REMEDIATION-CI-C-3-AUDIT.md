# CI GATE C REMEDIATION — CI-C-3 AUDIT · RCA · PLAN

> **Status:** **AUDIT + RCA + PLAN COMPLETE** · **DF FROZEN** → [`CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md) · czekaj Owner GO → IMPLEMENT  
> **Data:** 2026-07-25  
> **Wejście:** CI-C-1 CLOSED (`da42fed`) · CI-C-1b CLOSED (`075719a` / tip docs `ab8cb4b`) · Gate C tip blocker = **E2E-HAPPY-PATH**  
> **Evidence tip CI:** [TEST-INFRA Gates #30135140963](https://github.com/dawidthai125/wgdom/actions/runs/30135140963) · artefakt `e2e-report`  
> **Zakaz (do Owner GO IMPLEMENT):** commit / push / zmiany poza DF · `src/**` / Payroll / Theme / Cloud Sync / Tenders / UI / workflow / orchestrator

```text
══════════════════════════════════════
CI-C-3 — E2E-HAPPY-PATH (jedyny tip blocker Gate C)
63 PASS / 1 FAIL na Gate C po CI-C-1b
Faza INSPECTOR: openInspectorJob timeout 20s
══════════════════════════════════════
```

---

## 0. Executive summary

| | Werdykt |
|--|---------|
| **Objaw** | `E2E-HAPPY-PATH` FAIL · worker + admin **PASS** · inspector **FAIL** |
| **Miejsce** | `e2e/helpers/jobs.ts:82` ← `openInspectorJob` ← `e2e/worker-admin-inspector-happy-path.spec.ts:83` |
| **Komunikat** | `TimeoutError: locator.click` 20s — `getByRole('button', { name: /E2E Testowa 20\.5Z\.1/i })` |
| **Root cause** | Seed E2E **bez** `assignedInspectorId` · po **INSPECTOR-JOB-ASSIGN-001** panel filtruje `jobsVisible` strict: `assignedInspectorId === session.id` → lista pusta |
| **Klasa** | **test bug** (harness / seed stale vs produkt) |
| **Nie jest** | production bug · workflow bug · environment bug · false positive |
| **Wpływ prod** | **ZERO** (CI harness; filtr na prod działa zgodnie z DF) |
| **Minimalna naprawa** | Dodać `assignedInspectorId: "szymon"` do joba w `e2e/fixtures/e2e-seed.ts` (+ opcjonalna asercja pustej listy) |
| **DF** | **FROZEN** → [`CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md) · IMPLEMENT po Owner GO |

---

## 1. AUDIT — stan Gate C (tip)

| Element | Status | Uwaga |
|---------|--------|-------|
| Manifest | PASS | |
| Gate B | PASS | |
| Preview #010 | PASS | CI-C-1 |
| GUARD-FAIL-LOUD (re-run w Gate C) | PASS | CI-C-1b env parity |
| E2E-VERSION-AWARENESS | PASS | |
| E2E-PAYROLL-GUARD-S1 | PASS | (w pakiecie 63 PASS) |
| **E2E-HAPPY-PATH** | **FAIL** | **CI-C-3** |

**Uwaga latent (poza tip Gate C):** `jobs-mobile-layout.spec.ts` (CI-C-2 / „Powrót do listy” vs MV-2 „Lista”) — orchestrator uruchamia `playwright test <manifest.path>`, a manifest wskazuje **tylko** `worker-admin-inspector-happy-path.spec.ts`. Legacy `test:e2e:happy` project `testMatch` obejmuje oba pliki — **nie** blokuje tip Gate C po CI-C-1b.

---

## 2. AUDIT — dokładne miejsce awarii

### 2.1 Scenariusz (serial, jeden test)

Plik: `e2e/worker-admin-inspector-happy-path.spec.ts`

| Faza | Kroki | Wynik tip |
|------|-------|-----------|
| Seed | `blockCloudSync` · `addInitScript(applyE2eSeedInBrowser)` · `evaluate(seed)` | OK |
| WORKER | login → `openWorkerJob` → `submitWorkerDocumentation` → snapshot `kw-jobs` | PASS |
| ADMIN | reinject snapshot → seed+reinject → login → Files Hub / Dokumentacja | PASS |
| **INSPECTOR** | reinject → seed+reinject → `loginInspector` → **`openInspectorJob`** | **FAIL** |

### 2.2 Call site

```text
spec.ts:83  await openInspectorJob(page);
helpers/jobs.ts:79–82
  click button "Roboty" (exact)
  click getByRole('button', { name: /E2E Testowa 20\.5Z\.1/i })  ← TIMEOUT 20_000
```

`loginInspector` (`e2e/helpers/auth.ts:49–54`) **PASS** — button `"Roboty"` widoczny (90s). Awaria **po** wejściu do zakładki Roboty, przy kliknięciu karty adresu.

### 2.3 Komunikat / typ

```text
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /E2E Testowa 20\.5Z\.1/i }).first()
```

- **Typ:** timeout na `locator.click` (element **nie istnieje** w DOM / a11y tree)  
- **Nie:** assertion `expect(...)` fail, network error, build error, preview down  
- **Retry CI:** ten sam stack 3× (`jobs.ts:82`)

### 2.4 Selektory

| Krok | Selektor | Status |
|------|----------|--------|
| Login insp. | `button` Inspektor · password · „Wejdź do panelu” · `button` „Roboty” | PASS |
| Lista | `button` name `/E2E Testowa 20\.5Z\.1/i` | **FAIL — 0 matches** |
| (gdyby karta była) | `InspectorJobCard` = `<button>` z tekstem `address` + opcjonalnie ` m.{flat}` | zgodne z regexem |

**Wniosek selektorów:** helper jest poprawny względem UI karty; **brak karty**, nie zły regex.

### 2.5 Seed danych

`e2e/fixtures/e2e-seed.ts` — obiekt `job` (~L137–158):

| Pole | Wartość seed |
|------|----------------|
| `id` | `e2e-z1-job-001` |
| `address` | `E2E Testowa 20.5Z.1` |
| `status` | `in_progress` |
| `workerReports` | `[]` (później wypełnione przez worker; snapshot reinject) |
| **`assignedInspectorId`** | **BRAK** |

Hasło inspektora: hash dla loginu **`Szymon`** → konto builtin **`id: "szymon"`** (`admin-auth.ts`).  
`kw-admin-passwords`: `{ dawid, szymon }` — login OK.

`reinjectKwJobs` przywraca snapshot z fazy WORKER — snapshot **dziedziczy** brak `assignedInspectorId` (worker go nie ustawia).

### 2.6 Dowód UI z artefaktu CI (`e2e-report` · error context)

Page snapshot w momencie timeoutu (Szymon Szóstak · zakładka Roboty **active**):

```text
heading "Roboty WM"
"Aktywne remonty · 0 adresów"
button "Aktywne" | "Zdane" | "Wszystkie"
"Brak robót w tym filtrze"
"Zmień filtr na „Wszystkie” lub użyj wyszukiwarki"
```

Brak jakiegokolwiek buttona z adresem E2E. Overlay „Pierwszy raz tutaj?” widoczny, ale **nie** maskuje kart — lista jest pusta.

---

## 3. RCA

### 3.1 Łańcuch przyczynowy

```text
INSPECTOR-JOB-ASSIGN-001 (v2.63.13 / prod)
  → filterJobsForInspector(jobs, inspectorId)
  → jobs.filter(j => j.assignedInspectorId === id)   // fail-closed
  → InspectorPanel jobsVisible

E2E seed (20.5Z.1 era)
  → job bez assignedInspectorId
  → jobsVisible = []
  → UI: "0 adresów" / "Brak robót w tym filtrze"
  → openInspectorJob timeout
```

Kod produktu (`src/lib/inspector-job-assignment.ts`):

```ts
export function filterJobsForInspector(..., inspectorUserId: string): T[] {
  const id = inspectorUserId.trim();
  if (!id) return [];
  return jobs.filter((j) => j.assignedInspectorId === id);
}
```

Migracja legacy `assignedInspectorId = "szymon"` (`MIGRATION_LEGACY_INSPECTOR_ID`) dotyczy skryptów migracji KV — **nie** auto-patchuje localStorage seedu E2E w runtime.

### 3.2 Dlaczego worker + admin przechodzą?

| Rola | Widoczność listy | Wymaga `assignedInspectorId`? |
|------|------------------|-------------------------------|
| Worker | własne / directory binding | NIE (ten filtr) |
| Admin | pełna lista Roboty | NIE |
| Inspector | tylko `jobsVisible` | **TAK** |

Dlatego regresja ujawnia się **wyłącznie** w trzeciej fazie tego samego testu.

### 3.3 Hipotezy odrzucone

| Hipoteza | Werdykt | Powód |
|----------|---------|-------|
| Zły selektor / flat `m.7` w accessible name | **ODRZUCONA** | Brak karty w snapshot; gdyby była, regex i tak matchuje prefiks adresu |
| Race: seed nadpisuje reports przed open | **ODRZUCONA jako tip** | Spec robi `reinject` **po** `evaluate(seed)`; admin widzi reports — LS ma job |
| Cloud sync wyczyścił jobs | **ODRZUCONA** | `blockCloudSync` 503; banner „Zsynchronizowano” ≠ batch-get success z danymi |
| Environment / VITE / preview | **ODRZUCONA** | Preview + Version + Guard PASS; UI insp. pełny shell |
| Production bug (filtr za ostry) | **ODRZUCONA** | Zachowanie zgodne z DF INSPECTOR-JOB-ASSIGN-001 #003 |
| False positive flaky | **ODRZUCONA** | Repro CI + lokalne; snapshot deterministyczny „0 adresów” |
| CI-C-2 mobile „Powrót do listy” | **POZA ZAKRESEM tip** | Nie w path Gate C dla `E2E-HAPPY-PATH` |

### 3.4 Root cause (jedna linia)

**E2E fixture nie został zaktualizowany po wprowadzeniu obowiązkowego `assignedInspectorId` dla widoczności panelu inspektora — seed tworzy „niewidzialną” robotę dla Szymona.**

---

## 4. Klasyfikacja

| Klasa | Czy? |
|-------|------|
| **production bug** | NIE |
| **test bug** | **TAK** (primary) — seed / harness |
| **workflow bug** | NIE (YAML / orchestrator OK po CI-C-1/1b) |
| **environment bug** | NIE |
| **false positive** | NIE |

**Secondary label (opcjonalnie w DF):** *seed drift* względem kontraktu produktowego INSPECTOR-JOB-ASSIGN-001.

---

## 5. Wpływ na produkcję

| Obszar | Ocena |
|--------|--------|
| Runtime wgdom.fun | **Brak** — fail tylko CI preview + LS seed |
| Dane KV / sync | **Brak** |
| Reguła widoczności insp. | **Bez zmian** — prod już wymaga przypisania |
| Ryzyko „naprawy” przez luz filtra w `src/` | **Wysokie / zakazane** — łamie multi-inspector ACL |

**User-facing:** brak nowego incydentu. Gate C red = brak zielonego CI release gate C, nie awaria aplikacji.

---

## 6. PLAN — minimalna poprawka (po Owner GO → DF → IMPLEMENT)

### 6.1 Zakres dozwolony (propozycja DF)

| Plik | Zmiana |
|------|--------|
| **`e2e/fixtures/e2e-seed.ts`** | W obiekcie `job` dodać `assignedInspectorId: "szymon"` (stała zgodna z `admin-auth` + `MIGRATION_LEGACY_INSPECTOR_ID`) |
| Opcjonalnie `e2e/helpers/jobs.ts` | Po kliknięciu Roboty: `expect(page.getByText(/0 adresów/)).toHaveCount(0)` lub `getByRole('button', { name: title })` visible — fail-fast diagnostyczny |
| **`src/**`** | **ZAKAZ** |
| Workflow / orchestrator / manifest | **ZAKAZ** (nie potrzeba) |
| CI-C-2 `jobs-mobile-layout` | **Poza CI-C-3** — osobny ticket / Owner GO |

### 6.2 Kroki IMPLEMENT (kolejność)

1. Owner GO + DESIGN FREEZE CI-C-3 (freeze powyższego zakresu).  
2. Patch seed (`assignedInspectorId: "szymon"`).  
3. Lokalnie: preview + `npx playwright test e2e/worker-admin-inspector-happy-path.spec.ts --project=e2e-happy-path`.  
4. `npm run test:infra -- --suite gate-c-e2e-preview` (lub pełne `--gate C --scope all` jeśli Owner wymaga).  
5. Commit **tylko** E2E (+ docs closeout) · push · verify Gate C PASS.

### 6.3 Kryteria ACCEPT

- Gate C: E2E-HAPPY-PATH **PASS** (wraz z Version + Guard).  
- Snapshot insp.: **≥1 adres**, karta E2E klikalna, marker dokumentacji widoczny.  
- Zero diffów `src/**`, Payroll, Theme, Cloud Sync, Tenders.

### 6.4 Anti-patterns (nie robić)

- Rozluźniać `filterJobsForInspector` dla pustego `assignedInspectorId`.  
- Auto-migrować wszystkie joby do Szymona w runtime app.  
- Omijać fazę inspector w specie / `test.skip`.  
- Mieszać CI-C-2 (copy „Lista”) w ten sam commit bez osobnego DF.

---

## 7. Ryzyko

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Patch seed niewystarczający (inne pola ACL) | Niski | Dowód UI „0 adresów” + strict equality — jedno pole naprawia |
| Snapshot worker bez pola mimo seed | Niski | Seed startowy + reinject dziedziczy pole jeśli jest od początku |
| Flaky overlay instrukcji | Niski | Nie blokuje listy; opcjonalnie dismiss „Zamknij” w helperze |
| Zakaz zmiany produktu | — | DF tylko E2E |

**Ryzyko residualne Gate C po CI-C-3:** CI-C-2 latent w legacy happy workflow — **nie** w tip orchestrator path.

---

## 8. Gotowość do DESIGN FREEZE

| Kryterium | Status |
|-----------|--------|
| AUDIT kompletny (miejsce, log, snapshot, seed) | **PASS** |
| RCA z jedną root cause | **PASS** |
| Klasyfikacja | **PASS** (`test bug`) |
| Plan minimalny + anti-patterns | **PASS** |
| Ocena wpływu prod | **PASS** (ZERO) |
| Brak zmian w kodzie w tym etapie | **PASS** |
| Owner GO | **PENDING** |
| DESIGN FREEZE dokument | **FROZEN** → [`CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-3-DESIGN-FREEZE.md) |

**Rekomendacja:** **Owner GO → IMPLEMENT** Wariant A wg DF — wyłącznie `assignedInspectorId: "szymon"` w `e2e/fixtures/e2e-seed.ts`.

---

## 9. Raport końcowy (DoD)

1. **Dokładne miejsce awarii:** faza INSPECTOR · `openInspectorJob` · `e2e/helpers/jobs.ts:82` · timeout 20s na button adresu E2E.  
2. **RCA:** seed bez `assignedInspectorId` vs fail-closed `filterJobsForInspector` → pusta lista („0 adresów”).  
3. **Klasyfikacja:** **test bug** (seed drift).  
4. **Wpływ na produkcję:** **ZERO**.  
5. **Minimalna poprawka:** `assignedInspectorId: "szymon"` w E2E seed (bez `src/**`).  
6. **Ryzyko:** niskie; zakaz luzowania filtra produktu.  
7. **Gotowość DF:** **TAK** — po Owner GO; IMPLEMENT dopiero po DF.

---

## 10. Referencje

| Artefakt | Link / ścieżka |
|----------|----------------|
| CI run tip | https://github.com/dawidthai125/wgdom/actions/runs/30135140963 |
| Error context | artefakt `e2e-report` → `data/*.md` (snapshot „0 adresów”) |
| Produkt DF | `docs/INSPECTOR-JOB-ASSIGN-001-DESIGN-FREEZE.md` #003 |
| Filtr | `src/lib/inspector-job-assignment.ts` · `filterJobsForInspector` |
| Seed | `e2e/fixtures/e2e-seed.ts` |
| Spec | `e2e/worker-admin-inspector-happy-path.spec.ts` |
| Poprzednie Gate C | `CI-GATE-C-REMEDIATION-CI-C-1-CLOSEOUT.md` · `CI-C-1b-CLOSEOUT.md` |
