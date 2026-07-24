# CI GATE B REMEDIATION — CI-2 (LIB-PAYROLL-GUARD-FAIL-LOUD)

> **Status:** **CLOSED** (IMPLEMENT + verify + commit + push)  
> **Data:** 2026-07-24  
> **Baseline tip (pre):** UI **2.65.44** / `627d217` · CI-1 `ef27fbe`  
> **Zakaz (honorowane):** Payroll Core · Cloud Sync · Domain Push · D1–D5 · Theme · UI — **bez zmian**

---

## 1. AUDIT (summary)

| Fakt | Dowód |
|------|--------|
| Suite | `LIB-PAYROLL-GUARD-FAIL-LOUD` → `scripts/test-payroll-guard-push-fail-loud-p0.mjs` |
| CI tip THEME `627d217` | Gate B payroll: **PASS guard throws** · **FAIL guard message** · 3/4 |
| Identyczny fail na `ea1b0a6` / D1 tip | Pre-existing (PAYROLL-RELEASE-01) |
| Lokalnie z `.env` | **4 PASS / 0 FAIL** (przed CI-2) |
| CI log | `[W&G DOM] Brak VITE_SUPABASE_PROJECT_ID lub VITE_SUPABASE_ANON_KEY` **przed** asercjami |
| Repro bez `.env` | `vite-node --config .tmp/vite.ci2-noenv.config.ts` → **IDENTYCZNY** 3/1 FAIL |

**Nie** dotyczy Hours-wipe D1–D5, Domain Push, merge, ani shrink-guard logic w runtime prod.

---

## 2. RCA (CONFIRMED)

### 2.1 Ścieżka wykonania testu (oczekiwana)

```text
1. process.env.VITE_SUPABASE_* = mock-*   ← skrypt (NIE zasila import.meta.env)
2. mock globalThis.fetch (/batch-get|/batch-set)
3. dynamic import cloud-sync.ts
4. pushKeysToCloud(thin roster vs rich cloud)
5. applyPayrollGuardBeforePush → blocked=true
6. throw new Error(PAYROLL_GUARD_BLOCKED_MESSAGE)
7. assert errMsg === PAYROLL_GUARD_BLOCKED_MESSAGE
```

### 2.2 Ścieżka na CI (faktyczna, pre-fix)

```text
1. process.env.VITE_SUPABASE_* = mock-*   ← ustawione w skrypcie, ale…
2. import.meta.env.VITE_* = undefined     ← brak .env na runnerze
3. isSupabaseConfigured() === false
4. pushKeysToCloud → throw EARLY:
     "Brak konfiguracji Supabase (VITE_SUPABASE_*)"
5. assert("guard throws") PASS
6. assert("guard message") FAIL
7. fetch mock / batch-get — NIGDY nie uruchomione
```

### 2.3 Oczekiwana vs faktyczna `err.message`

| | Wartość |
|--|---------|
| **Oczekiwana** | `PAYROLL_GUARD_BLOCKED_MESSAGE` |
| **Faktyczna (CI / no-env)** | `"Brak konfiguracji Supabase (VITE_SUPABASE_*)"` |
| **Miejsce rozjazdu** | `pushKeysToCloud` early config check **przed** `applyPayrollGuardBeforePush` |

---

## 3. IMPLEMENT (DONE)

### Zmienione pliki (tylko CI/harness)

| Plik | Zmiana |
|------|--------|
| `.github/workflows/test-infra-gates.yml` | Job `gate-b` `env:` dummy `VITE_SUPABASE_PROJECT_ID=ci-gate-b-mock` · `VITE_SUPABASE_ANON_KEY=ci-gate-b-mock-anon` |
| `scripts/test-payroll-guard-push-fail-loud-p0.mjs` | Early fail-loud `isSupabaseConfigured()` · assert `batch-get` hit · clearer mismatch log |
| `docs/architecture/CI-GATE-B-REMEDIATION-CI-2-GUARD-FAIL-LOUD-RCA.md` | Ten dokument — CLOSEOUT |

### OUT (nie ruszane)

`src/lib/cloud-sync.ts` · `src/config/supabase.ts` · D1–D5 · Domain Push · Theme · UI · Payroll Core

---

## 4. VERIFY (lokalnie)

| Scenariusz | Wynik |
|------------|--------|
| `npx vite-node scripts/test-payroll-guard-push-fail-loud-p0.mjs` | **6 PASS / 0 FAIL** · `[PAYROLL-GUARD] blocked…` · `batch-get` |
| CI-sim: env dummy + `--config .tmp/vite.ci2-noenv.config.ts` | **6 PASS / 0 FAIL** |
| Negatyw: noenv bez VITE_* | exit 1 · `FAIL harness: isSupabaseConfigured() === false` |
| Gate B payroll (w trakcie run): `LIB-PAYROLL-GUARD-FAIL-LOUD` | **6 PASS / 0 FAIL** (guard executed) |

---

## 5. Klasyfikacja (zamknięta)

**test + env bug** — nie production · nie Payroll CORE.

---

## 6. CLOSE

CI-2 **CLOSED** po commit + push (hash w raporcie sesji).  
**CI-3** — nie startować bez Owner GO.
