# CI GATE C REMEDIATION — CI-C-3 DESIGN FREEZE (E2E-HAPPY-PATH seed)

> **Status:** **CLOSED** (IMPLEMENT + VERIFY local + CI PASS) · closeout: [`CI-GATE-C-REMEDIATION-CI-C-3-CLOSEOUT.md`](./CI-GATE-C-REMEDIATION-CI-C-3-CLOSEOUT.md)  

> **Data:** 2026-07-25  
> **Wejście:** [`CI-GATE-C-REMEDIATION-CI-C-3-AUDIT.md`](./CI-GATE-C-REMEDIATION-CI-C-3-AUDIT.md)  
> **Commit:** `c681f88` · CI [#30137417279](https://github.com/dawidthai125/wgdom/actions/runs/30137417279) **success**  
> **Wariant A FROZEN · IMPLEMENTED · VERIFIED**

```text
══════════════════════════════════════
CI-C-3 DESIGN FREEZE
WARIANT: A — seed assignedInspectorId (FROZEN)
SCOPE:   e2e/fixtures/e2e-seed.ts ONLY
OUT:     src/** · Payroll · Theme · Cloud Sync · Tenders · UI
         · workflow · orchestrator · filterJobsForInspector
         · e2e helpers/spec (opcjonalna asercja = OUT tego DF)
         · CI-C-2 jobs-mobile-layout
══════════════════════════════════════
```

---

## 0. Decyzje zamrożone (executive)

| ID | Decyzja | Wartość FROZEN |
|----|---------|----------------|
| **D1** | Strategia | **Wariant A** — uzupełnić seed joba o `assignedInspectorId` |
| **D2** | Plik | **tylko** `e2e/fixtures/e2e-seed.ts` |
| **D3** | Obiekt | `job` w `applyE2eSeedInBrowser` (adres `args.jobAddress` / `E2E Testowa 20.5Z.1`) |
| **D4** | Pole | **`assignedInspectorId: "szymon"`** (string literal) |
| **D5** | Wartość ID | **`"szymon"`** — zgodne z builtin `admin-auth` (`id: "szymon"`, login `Szymon`) oraz `MIGRATION_LEGACY_INSPECTOR_ID` |
| **D6** | Filtr produktowy | **BEZ ZMIAN** — `filterJobsForInspector` / `InspectorPanel` / ACL **nietknięte** |
| **D7** | Luzowanie logiki app | **ZAKAZANE** — brak wyjątków dla pustego `assignedInspectorId` |
| **D8** | Spec / helpers | **OUT** tego DF — bez zmian `worker-admin-inspector-happy-path.spec.ts`, `e2e/helpers/jobs.ts`, `auth.ts` |
| **D9** | Opcjonalna asercja „0 adresów” | **OUT** CI-C-3 DF (może być osobny micro-DF jeśli Owner chce) |
| **D10** | CI-C-2 (`jobs-mobile-layout` / „Lista”) | **OUT** — poza tip Gate C path / osobny etap |
| **D11** | Workflow / orchestrator / manifest | **OUT** |
| **D12** | Klasyfikacja | **test bug** (seed drift) — potwierdzona; nie production bug |

---

## 1. Zamrożony zakres zmian (spec IMPLEMENT)

### 1.1 Docelowa zmiana w seedzie (FROZEN)

Plik: `e2e/fixtures/e2e-seed.ts`  
Funkcja: `applyE2eSeedInBrowser`  
Obiekt: `const job = { … }`

**DODAĆ jedną właściwość** (kolejność pól dowolna, preferencja: obok `status` / przed `keysHandedOver`):

```ts
  const job = {
    id: args.jobId,
    address: args.jobAddress,
    flatNumber: args.jobFlat,
    client: "E2E Client Z1",
    startDate: args.weekFrom,
    endDate: "",
    status: "in_progress",
    assignedInspectorId: "szymon", // CI-C-3 — INSPECTOR-JOB-ASSIGN-001 visibility
    keysHandedOver: false,
    // … pozostałe pola BEZ ZMIAN …
  };
```

### 1.2 Kontrakt produktowy (bez zmian — potwierdzenie)

| Warstwa | Zachowanie FROZEN (produkt) |
|---------|------------------------------|
| `filterJobsForInspector` | `j.assignedInspectorId === inspectorUserId` (strict) |
| Sesja E2E insp. | login `Szymon` → `session.id === "szymon"` |
| Po patchu seed | `jobsVisible` zawiera job E2E → karta button z adresem → `openInspectorJob` PASS |

### 1.3 Diff oczekiwany

- **+1** linia w `e2e/fixtures/e2e-seed.ts` (+ opcjonalny komentarz 1 linii).
- **0** linii w `src/**`, `.github/workflows/**`, `scripts/test-infra-orchestrator.mjs`, `test-infra/test-manifest.json`, pozostałych `e2e/**`.

### 1.4 Dlaczego reinject wystarczy

Spec: `evaluate(seed)` → `reinjectKwJobs(snapshot)` przy admin/inspector.  
Snapshot z fazy WORKER powstaje z joba, który **już** ma `assignedInspectorId` po poprawionym seedzie (worker nie usuwa pola) → reinject zachowuje pole + `workerReports`.

---

## 2. Potwierdzenie poprawki seed

| Kryterium | FROZEN |
|-----------|--------|
| Job seedowy | Ten sam `e2e-z1-job-001` / `E2E Testowa 20.5Z.1` |
| Brakujące pole dziś | `assignedInspectorId` **nieobecne** (AUDIT) |
| Poprawka | **`assignedInspectorId: "szymon"`** |
| Cel | Spełnić `assignedInspectorId === session.id` dla Szymona |
| Alternatywy odrzucone | Luzowanie filtra · migracja runtime · skip fazy inspector · zmiana selektorów |

---

## 3. Ocena ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Literówka ID (`Szymon` vs `szymon`) | Niski | FROZEN literal `"szymon"` = `admin-auth` account `id` |
| Snapshot bez pola mimo seed | Niski | Seed przed workerem ustawia pole; reinject dziedziczy |
| Overlay „Pierwszy raz tutaj?” | Niski | AUDIT: lista pusta niezależnie; karta pojawi się w a11y tree |
| Regresja worker/admin | Brak | Pole dodatkowe; admin/worker nie filtrują po nim w tym scenariuszu |
| Flaky timeout po fix | Niski | Verify: Gate C E2E-HAPPY-PATH + lokalny playwright |
| Zmiana zachowania prod | **ZERO** | Brak `src/**` |
| Luzowanie ACL insp. | **ZERO** — zakazane w DF | |

**Ryzyko produktowe:** **ZERO**.  
**Ryzyko CI residualne:** CI-C-2 latent w legacy `test:e2e:happy` — **poza DoD CI-C-3**.

---

## 4. Lista elementów OUT (explicit)

| Element | Status |
|---------|--------|
| `src/**` (w tym `inspector-job-assignment.ts`, `InspectorPanel.tsx`) | **OUT** |
| Payroll | **OUT** |
| Theme | **OUT** |
| Cloud Sync / merge / KV | **OUT** |
| Tenders | **OUT** |
| UI produktowe | **OUT** |
| `.github/workflows/**` | **OUT** |
| `scripts/test-infra-orchestrator.mjs` | **OUT** |
| `test-infra/test-manifest.json` | **OUT** |
| `playwright.config.ts` | **OUT** |
| `e2e/helpers/**`, `e2e/worker-admin-inspector-happy-path.spec.ts` | **OUT** (tego DF) |
| `e2e/jobs-mobile-layout.spec.ts` (CI-C-2) | **OUT** |
| Soft-skip / `test.skip` fazy inspector | **OUT** |
| Auto-assign wszystkich jobów bez ID w runtime | **OUT** |
| Zmiana `filterJobsForInspector` (fail-open) | **OUT** |

**Potwierdzenie braku wpływu:** poprawka dotyczy wyłącznie localStorage seedu w teście preview CI — **zero** wpływu na runtime wgdom.fun.

---

## 5. Verify plan (po Owner GO → IMPLEMENT)

| # | Kryterium PASS |
|---|----------------|
| V1 | Diff = wyłącznie `e2e/fixtures/e2e-seed.ts` (+ docs closeout opcjonalnie w osobnym / tym samym commicie docs) |
| V2 | Lokalnie: `npx playwright test e2e/worker-admin-inspector-happy-path.spec.ts --project=e2e-happy-path` → **PASS** (wymaga preview `:4173`) |
| V3 | Gate C: `E2E-HAPPY-PATH` **PASS** · Version · Guard nadal PASS |
| V4 | Brak diffów `src/**` |
| V5 | (opcjonalnie) w failure snapshot: **nie** „0 adresów” dla joba E2E |

**DoD tip Gate C po CI-C-3:** Gate C job zielony względem dotychczasowego tip blockera `E2E-HAPPY-PATH`.

---

## 6. Gotowość do IMPLEMENT

| Kryterium | Status |
|-----------|--------|
| AUDIT + RCA | COMPLETE |
| DESIGN FREEZE | **FROZEN** (ten dokument) |
| Zakres = fixture E2E only | **TAK** |
| Filtr prod bez zmian | **TAK** |
| Owner GO IMPLEMENT | **PENDING** |
| Commit / push | **ZAKAZ** do GO |
| Kod w tym etapie | **BEZ ZMIAN** |

**Rekomendacja:** po **Owner GO** → IMPLEMENT Wariant A dokładnie wg § 1.1 → verify V1–V4 → commit → push → CI Gate C.

---

## 7. Raport końcowy (DoD DF)

1. **Zamrożony zakres:** wyłącznie `e2e/fixtures/e2e-seed.ts` · `assignedInspectorId: "szymon"` na jobie seedowym.  
2. **Potwierdzenie poprawki seed:** Align z `filterJobsForInspector` + sesja `szymon` · bez luzowania app.  
3. **Ryzyko:** produktowe **ZERO** · CI niskie.  
4. **OUT:** `src/**`, Payroll, Theme, Cloud Sync, Tenders, UI, workflow, orchestrator, helpers/spec, CI-C-2.  
5. **Gotowość IMPLEMENT:** **TAK** — po kolejnym Owner GO.

---

## 8. Referencje

| Artefakt | Ścieżka / link |
|----------|----------------|
| AUDIT CI-C-3 | [`CI-GATE-C-REMEDIATION-CI-C-3-AUDIT.md`](./CI-GATE-C-REMEDIATION-CI-C-3-AUDIT.md) |
| Produkt DF assign | `docs/INSPECTOR-JOB-ASSIGN-001-DESIGN-FREEZE.md` #003 |
| Filtr | `src/lib/inspector-job-assignment.ts` (READ ONLY — OUT) |
| Seed | `e2e/fixtures/e2e-seed.ts` |
| CI evidence | https://github.com/dawidthai125/wgdom/actions/runs/30135140963 |
