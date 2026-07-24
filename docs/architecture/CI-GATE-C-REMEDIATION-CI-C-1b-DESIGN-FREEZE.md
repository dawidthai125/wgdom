# CI GATE C REMEDIATION — CI-C-1b DESIGN FREEZE (env parity Gate C)

> **Status:** **CLOSED** (IMPLEMENT + VERIFY — env parity PASS) · closeout: [`CI-GATE-C-REMEDIATION-CI-C-1b-CLOSEOUT.md`](./CI-GATE-C-REMEDIATION-CI-C-1b-CLOSEOUT.md)  

> **Data:** 2026-07-25  
> **Wejście:** [`CI-GATE-C-REMEDIATION-CI-C-1b-AUDIT.md`](./CI-GATE-C-REMEDIATION-CI-C-1b-AUDIT.md)  
> **Evidence tip:** `da42fed` · CI [#30133507218](https://github.com/dawidthai125/wgdom/actions/runs/30133507218)  
> **Wariant A FROZEN · IMPLEMENTED**

```text
══════════════════════════════════════
CI-C-1b DESIGN FREEZE
WARIANT: A — env parity Gate B → Gate C (FROZEN)
SCOPE:   .github/workflows/test-infra-gates.yml (gate-c.env ONLY)
OUT:     src/** · Payroll · Theme · Cloud Sync · Tenders · UI
         · orchestrator · e2e/** · suite list Gate C
══════════════════════════════════════
```

---

## 0. Decyzje zamrożone (executive)

| ID | Decyzja | Wartość FROZEN |
|----|---------|----------------|
| **D1** | Strategia | **Wariant A** — skopiować dummy `VITE_SUPABASE_*` z `gate-b` do `gate-c` |
| **D2** | Plik | **tylko** `.github/workflows/test-infra-gates.yml` |
| **D3** | Job | **tylko** `gate-c` · blok `env:` |
| **D4** | `VITE_SUPABASE_PROJECT_ID` | **`ci-gate-b-mock`** (identycznie Gate B / CI-2) |
| **D5** | `VITE_SUPABASE_ANON_KEY` | **`ci-gate-b-mock-anon`** (identycznie Gate B / CI-2) |
| **D6** | `PW_BASE_URL` | **BEZ ZMIAN** — `http://127.0.0.1:4173` |
| **D7** | `VITE_SUPABASE_URL` | **NIE DODAWAĆ** — nieużywane przez `isSupabaseConfigured()` |
| **D8** | Wartości | Dummy non-prod (jak CI-2) — **nie** sekrety Vercel / prod |
| **D9** | Orchestrator / manifest suites | **OUT** — Gate C nadal `--gate C --scope all` |
| **D10** | Soft-skip GUARD-FAIL-LOUD | **OUT** |
| **D11** | Usunięcie `gate-b-relevant` z Gate C | **OUT** CI-C-1b (osobny DF jeśli kiedykolwiek) |
| **D12** | CI-C-2 / CI-C-3 (E2E) | **POZA DoD** — mogą się ujawnić po odblokowaniu fail-fast |

---

## 1. Zamrożony zakres zmian (spec IMPLEMENT)

### 1.1 Docelowy blok `gate-c.env` (FROZEN)

```yaml
  gate-c:
    name: Gate C (E2E preview)
    # …
    env:
      PW_BASE_URL: http://127.0.0.1:4173
      # CI-C-1b / CI-2 parity: Gate C re-runs gate-b-relevant (scope=all);
      # Vite reads VITE_* into import.meta.env at vite-node boot.
      VITE_SUPABASE_PROJECT_ID: ci-gate-b-mock
      VITE_SUPABASE_ANON_KEY: ci-gate-b-mock-anon
```

### 1.2 Env parity (potwierdzenie)

| Zmienna | Gate B (CI-2, odniesienie) | Gate C TO-BE (FROZEN) |
|---------|----------------------------|------------------------|
| `VITE_SUPABASE_PROJECT_ID` | `ci-gate-b-mock` | **`ci-gate-b-mock`** |
| `VITE_SUPABASE_ANON_KEY` | `ci-gate-b-mock-anon` | **`ci-gate-b-mock-anon`** |
| `PW_BASE_URL` | — | `http://127.0.0.1:4173` (bez zmian) |

`isSupabaseConfigured()` (`src/config/supabase.ts`) = `Boolean(projectId && anonKey)` z **wyłącznie** tych dwóch `VITE_*`.

### 1.3 Diff oczekiwany

- **+2** linie env (+ opcjonalny komentarz 1–2 linii).
- **0** linii w `src/**`, `scripts/test-infra-orchestrator.mjs`, `e2e/**`, `test-infra/test-manifest.json`.

---

## 2. Potwierdzenie braku wpływu (OUT)

| Obszar | Wpływ CI-C-1b |
|--------|----------------|
| `src/**` | **BRAK** |
| Payroll core / Domain Push / D1–D5 | **BRAK** |
| Theme | **BRAK** |
| Cloud Sync merge / KV | **BRAK** |
| Tenders | **BRAK** |
| UI | **BRAK** |
| `scripts/test-infra-orchestrator.mjs` | **BRAK** (#010 bez zmian) |
| Testy E2E / selektory | **BRAK** |
| Gate B job | **BRAK** (już ma env) |
| Runtime wgdom.fun / Vercel env | **BRAK** (tylko GHA runner) |

---

## 3. Ocena ryzyka

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Literówka nazwy env | Niski | Copy-paste 1:1 z `gate-b` |
| Inny brakujący VITE_* | Niski | Gate B payroll green z tą samą parą |
| Ujawnienie CI-C-2 / CI-C-3 | **Oczekiwane** | Poza DoD CI-C-1b — osobne etapy EPIC |
| Wyciek sekretów | Brak | Dummy stringi `ci-gate-b-mock*` |
| Regresja Preview #010 | Brak | `PW_BASE_URL` nietknięty |

**Ryzyko produktowe:** **ZERO**.

---

## 4. Lista elementów OUT (explicit)

- `src/**` (w tym `src/config/supabase.ts`, `cloud-sync.ts`)
- Payroll / Theme / Cloud Sync / Tenders / UI
- `scripts/test-infra-orchestrator.mjs`
- `e2e/**`, `playwright.config.ts`
- Zmiana `releaseGates.C.suites` / usunięcie re-run `gate-b-relevant`
- Soft-fail / skip `LIB-PAYROLL-GUARD-FAIL-LOUD`
- Dodawanie `VITE_SUPABASE_URL` lub innych VITE_*
- CI-C-2 (mobile „Lista”) · CI-C-3 (happy-path inspector) — **widoczne po CI-C-1b, nie w scope**

---

## 5. Verify plan (po Owner GO → IMPLEMENT)

| # | Kryterium PASS |
|---|----------------|
| 1 | Gate C: `Preview ready at http://127.0.0.1:4173` |
| 2 | `LIB-PAYROLL-GUARD-FAIL-LOUD` **nie** FAIL na missing VITE / `isSupabaseConfigured` |
| 3 | Log zawiera `>>> RUN E2E-HAPPY-PATH` (E2E **start**) |
| 4 | Gate B payroll + tenders bez regresji |
| 5 | `git diff` implementacji = wyłącznie workflow YAML (+ docs) |

**DoD CI-C-1b:** env parity · fail-fast GUARD-FAIL-LOUD usunięty · E2E mogą wystartować.  
**Nie** wymagać PASS `E2E-HAPPY-PATH` / pełnego Gate C green.

---

## 6. Gotowość

| Etap | Status |
|------|--------|
| AUDIT + RCA + PLAN | COMPLETE |
| DESIGN FREEZE CI-C-1b | **FROZEN** (ten dokument) |
| Owner GO → IMPLEMENT | **PENDING** |
| IMPLEMENT / commit / push | **BLOCKED** |

---

## 7. Raport DF (1:1)

1. **Zakres:** tylko `gate-c.env` w `test-infra-gates.yml` — 2× VITE_* + komentarz; `PW_BASE_URL` bez zmian.
2. **Env parity:** wartości **identyczne** z Gate B CI-2.
3. **Ryzyko:** niskie · zero prod · CI-C-2/3 poza DoD.
4. **OUT:** cała aplikacja, orchestrator, E2E, zmiana suites.
5. **Gotowość do IMPLEMENT:** **TAK** — po Owner GO.
