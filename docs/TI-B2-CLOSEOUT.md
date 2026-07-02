# TI-B2 — HARNESS_SANDBOX_JOB_IDS Configuration · CLOSEOUT

> **Status:** **CLOSED** · **Data closeout:** 2026-07-02
> **Prod baseline:** **v2.63.27** · commit **`803c0bc`**
> **STABILIZATION WINDOW:** ACTIVE
> **Design freeze:** TI-B2 DESIGN FREEZE v2 (config-only, decyzja Architekta)
> **Powiązane:** [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) · [`TI-B4-CLOSEOUT.md`](TI-B4-CLOSEOUT.md) · [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md)

---

## 1. Zakres (config-only)

| Element | Opis | Zakres |
|---------|------|--------|
| **SSOT konfiguracji** | `HARNESS_SANDBOX_JOB_IDS` externalizowane do zmiennej środowiskowej | IN |
| **Parser CSV + trim** | `split(",")` → `trim()` → `filter(len>0)` | IN |
| **Fail-loud** | pusty default → guard `NO_SANDBOX_JOBS` (`seed-ssot.ts`) zachowany *(SUPERSEDED w TI-B2.1 → `UNSAFE_TARGET`, patrz §6)* | IN |
| **Brak realnych ID w repo** | default pusty, uzupełnienie operacyjne przez env (decyzja Architekta) | IN |
| jobStrategy · merge-not-replace · storage-apply · prod write safety · runtime | — | **OUT → TI-B2.1** |

**Nowe pole KV:** brak · **Zmiana modelu danych:** brak · **Zmiana sync/merge:** brak · **Zmiana logiki harness:** brak

---

## 2. Wykonane elementy

### Zmiana (1 plik)

`e2e/fixtures/payroll-harness-seed.ts` — `HARNESS_SANDBOX_JOB_IDS` z hardcoded `[]` na parser env:

```typescript
const rawSandboxJobIds =
  typeof process !== "undefined" ? (process.env.HARNESS_SANDBOX_JOB_IDS ?? "") : "";
export const HARNESS_SANDBOX_JOB_IDS: string[] = rawSandboxJobIds
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
```

### TEST (zakres zmiany, bez Playwright e2e)

| # | Wejście | Oczekiwane | Wynik |
|---|---------|-----------|-------|
| 1 | `""` | `NO_SANDBOX_JOBS` | ✅ `HarnessPreconditionError:NO_SANDBOX_JOBS` |
| 2 | `"id1,id2"` | 2 elementy | ✅ `["id1","id2"]`, guard NO_THROW |
| 3 | `"id1, id2 , id3"` | `["id1","id2","id3"]` | ✅ trim OK |

### IMPLEMENT AUDIT

`process.env` = obowiązujący mechanizm konfiguracji `e2e/` (zgodny z `playwright.config.ts`), brak alternatywnego standardu → **PASS**.

### Release

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.27** (bez bumpa — zmiana test-infra) |
| **Commit** | **`803c0bc`** |
| **Message** | `chore(test-infra): externalize HARNESS_SANDBOX_JOB_IDS configuration` |
| **Diff** | `e2e/fixtures/payroll-harness-seed.ts` · +14 / −1 |
| **VERIFY** | prod HTTP 200 · `version.json` commit `803c0bc` · brak wpływu na bundle aplikacji |

---

## 3. Wpływ na AD-10 (STABILIZATION WINDOW)

- Zmiana wyłącznie w warstwie `e2e/` (test-infra), poza bundlerem aplikacji → **zero wpływu na runtime produkcji**.
- Precondition prod harness pozostaje fail-loud (blokada do konfiguracji ops) → bezpieczeństwo zachowane.
- **Okno stabilizacji:** CONTINUES.

---

## 4. Backlog post-TI-B2

| ID | Element | Status |
|----|---------|--------|
| **TI-B1** | Ekstrakcja `removeWeekEmployee()` do lib | OPEN |
| **TI-B2** | `HARNESS_SANDBOX_JOB_IDS` konfiguracja SSOT (config-only) | **CLOSED** |
| **TI-B2.1** | Payroll Harness Production Safety — Synthetic + Merge, Preview First (sandbox strategy **ODRZUCONA**) | **CLOSED** · `2efe8b5` (patrz §6) |
| **TI-B3** | CI GitHub Actions — gate B/C z orchestratora | OPEN |
| **TI-B4** | Smoke agregat NG-01–04 | CLOSED |

---

## 5. Werdykt

**TI-B2 CLOSED** — `HARNESS_SANDBOX_JOB_IDS` externalizowane do konfiguracji env (SSOT), fail-loud zachowany, brak realnych ID prod w repo, zero wpływu na aplikację. Bezpieczeństwo harness domknięte w osobnym bundle **TI-B2.1** (patrz §6) zgodnie z zasadą One Bundle = One Goal.

**Następny krok (opcjonalny):** TI-B1 · TI-B3 — tylko na polecenie OWNER.

---

## 6. TI-B2.1 — Payroll Harness Production Safety · CLOSED

> **Status:** **CLOSED** · **Data:** 2026-07-02 · **Commit:** **`2efe8b5`** · **Prod runtime:** bez zmian (2.63.27 · test-harness only)
> **Design freeze:** decyzja Architekta — Synthetic + Merge, Preview First (sandbox strategy odrzucona). SSOT zasad: [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md) §A (v2.2, #017/#018/L5 SUPERSEDED).

### 6.1 Decyzje architekta (zrealizowane)

1. **Strategia:** Synthetic + Merge, **Preview First**. Sandbox strategy **ODRZUCONA**; `HARNESS_SANDBOX_JOB_IDS` = mechanizm historyczny/compat (nierozwijany, nieużywany przez seed).
2. **Merge-not-replace:** seed **nigdy** full replace — union tablic po `id` (`kw-jobs/directory/week-employees/archive`), shallow-merge `kw-admin-passwords`, klucze skalarne (`kw-weekFrom/To`) tylko gdy brak.
3. **Własny inwariant seeda** (niezależny od `blockCloudSync`): allowlist loopback → fail-loud `HARNESS_UNSAFE_ENV` poza `127.0.0.1/localhost/::1`.
4. **Fail-loud:** `buildPayrollHarnessSeed` rzuca `HarnessPreconditionError("UNSAFE_TARGET")` dla każdego `target != preview` (zastąpiło `NO_SANDBOX_JOBS`).
5. **Usunięcie martwej konfiguracji:** opcje `jobStrategy`, `mergeOnly`, `pushCloud` + martwe `seedPayrollAssignmentScenario`, `applyPayrollHarnessStorage`.

### 6.2 Pliki (4, test-harness only)

`e2e/fixtures/payroll-harness-seed.ts` · `e2e/helpers/test-harness/core/seed-ssot.ts` · `e2e/helpers/test-harness/core/storage-apply.ts` · `e2e/helpers/test-harness/core/cleanup.ts`

### 6.3 TEST

- Jednostkowe (vite-node) **16/16 PASS** — fail-loud targetów, allowlist loopback, merge zachowuje dane spoza harnessu, skalary nienadpisywane, re-apply idempotentny, prod/cloud/LAN hosty blokowane.
- Compile `playwright test --list` PASS · orchestrator `--validate` `MANIFEST OK v1.1.0` (test-infra nietknięte).

### 6.4 Werdykt

**TI-B2.1 CLOSED** — harness bezpieczny by-design (Preview First + merge-not-replace + własny inwariant), zero wpływu na runtime/CI. One Bundle = One Goal.
