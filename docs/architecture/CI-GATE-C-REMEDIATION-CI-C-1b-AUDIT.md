# CI GATE C REMEDIATION — CI-C-1b AUDIT · RCA · PLAN

> **Status:** **AUDIT + RCA + PLAN COMPLETE** · **DF FROZEN** → [`CI-GATE-C-REMEDIATION-CI-C-1b-DESIGN-FREEZE.md`](./CI-GATE-C-REMEDIATION-CI-C-1b-DESIGN-FREEZE.md) · czekaj Owner GO → IMPLEMENT  
> **Data:** 2026-07-25  
> **Wejście:** [`CI-GATE-C-REMEDIATION-CI-C-1-CLOSEOUT.md`](./CI-GATE-C-REMEDIATION-CI-C-1-CLOSEOUT.md) · CI-2 [`CI-GATE-B-REMEDIATION-CI-2-GUARD-FAIL-LOUD-RCA.md`](./CI-GATE-B-REMEDIATION-CI-2-GUARD-FAIL-LOUD-RCA.md)  
> **Evidence tip:** `da42fed` · CI run [#30133507218](https://github.com/dawidthai125/wgdom/actions/runs/30133507218) · Gate C job `89613166142`  
> **Zakaz:** IMPLEMENT / commit / push / `src/**` / Payroll / Theme / Cloud Sync / Tenders / UI / E2E specs

```text
══════════════════════════════════════
CI-C-1b — ENV PARITY Gate B → Gate C
Preview #010 = PASS (CI-C-1 CLOSED)
Blocker: LIB-PAYROLL-GUARD-FAIL-LOUD na jobie gate-c
══════════════════════════════════════
```

---

## 0. Executive summary

| | Werdykt |
|--|---------|
| **Objaw** | Po `Preview ready` Gate C fail-fast na `LIB-PAYROLL-GUARD-FAIL-LOUD` |
| **Root cause** | Job `gate-c` **nie ma** `env:` `VITE_SUPABASE_*` ustawionych w CI-2 na `gate-b` |
| **Miejsce** | `.github/workflows/test-infra-gates.yml` · job `gate-c` · `env:` (tylko `PW_BASE_URL`) |
| **Klasa** | **workflow / env bug** (CI YAML) |
| **Poza YAML?** | **NIE** — brak potrzeby zmian `src/**`, orchestratora, ani testów |
| **Minimalna naprawa** | Skopiować te same dummy `VITE_SUPABASE_*` z `gate-b` do `gate-c` (zachować `PW_BASE_URL`) |
| **Wpływ prod** | **ZERO** |

**Uwaga nazewnictwa:** w kodzie / CI-2 **nie** ma `VITE_SUPABASE_URL`. Wymagane są:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`

---

## 1. AUDIT — porównanie Gate B vs Gate C

### 1.1 Workflow (SSOT plik)

`.github/workflows/test-infra-gates.yml`

| Element | Gate B (`gate-b`) | Gate C (`gate-c`) |
|---------|-------------------|-------------------|
| `needs` | `manifest-validate` | `gate-b` |
| Orchestrator | `npm run test:infra -- --gate B --scope ${{ matrix.scope }}` | `npm run test:infra -- --gate C --scope all` |
| `PW_BASE_URL` | — | `http://127.0.0.1:4173` |
| `VITE_SUPABASE_PROJECT_ID` | **`ci-gate-b-mock`** (CI-2) | **BRAK** |
| `VITE_SUPABASE_ANON_KEY` | **`ci-gate-b-mock-anon`** (CI-2) | **BRAK** |
| Playwright | — | install chromium |
| Komentarz CI-2 | Tak (Vite / `import.meta.env`) | Brak |

### 1.2 Dlaczego Gate C w ogóle uruchamia GUARD-FAIL-LOUD?

Manifest `releaseGates.C`:

```json
"C": {
  "suites": ["gate-b-relevant", "gate-c-e2e-preview"],
  "implicitBuild": true,
  "scopeRequired": false
}
```

Komenda CI: `--gate C --scope all` → `resolveTestsForScope(..., "all")` = **wszystkie** testy z `gate-b-relevant` **ponownie**, potem E2E.

Kolejność: lib → smoke → e2e. Preview startuje **przed** lib (po CI-C-1), potem lib payroll … → **FAIL-LOUD** → fail-fast → **E2E NOT REACHED** na CI.

### 1.3 Dowód z logu CI (`da42fed`)

```text
Preview ready at http://127.0.0.1:4173
…
>>> RUN LIB-PAYROLL-GUARD-FAIL-LOUD
[W&G DOM] Brak VITE_SUPABASE_PROJECT_ID lub VITE_SUPABASE_ANON_KEY …
CI-2: Gate B / shell must set VITE_SUPABASE_PROJECT_ID + VITE_SUPABASE_ANON_KEY
      before vite-node starts (import.meta.env)…
FAIL  LIB-PAYROLL-GUARD-FAIL-LOUD
BLOCKING …: 1
##[error] Process completed with exit code 1
```

Brak linii `>>> RUN E2E-*` w tym jobie.

### 1.4 Lokalna kontrola (CI-C-1)

`npm run test:infra -- --suite gate-c-e2e-preview` **nie** uruchamia `gate-b-relevant` → GUARD-FAIL-LOUD nie blokuje; E2E startują.  
Rozjazd CI vs lokalny suite-only = **ten sam brak env na Gate C job**, ujawniony tylko gdy Gate C powtarza Gate B lib.

---

## 2. RCA

### 2.1 Mechanizm (tożsamy z CI-2)

1. `vite-node` wczytuje `VITE_*` do `import.meta.env` **tylko** z env procesu **przy starcie**.
2. `process.env.VITE_* ??= …` **wewnątrz** `test-payroll-guard-push-fail-loud-p0.mjs` **nie** zasila `import.meta.env`.
3. `isSupabaseConfigured()` → `false` → early throw ≠ `PAYROLL_GUARD_BLOCKED_MESSAGE` → FAIL / fail-loud harness.

CI-2 naprawił to **wyłącznie** na jobie `gate-b`. Job `gate-c` powstał wcześniej / równolegle i **nie dostał tej samej łatki** — latent do momentu, gdy Gate B stał się green i Gate C zaczął realnie biegać (po CI-5 + CI-C-1).

### 2.2 Miejsce utraty zgodności (dokładnie)

| Warstwa | Status |
|---------|--------|
| Gate B job `env:` | **MA** `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_ANON_KEY` |
| Gate C job `env:` | **NIE MA** tych kluczy (tylko `PW_BASE_URL`) |
| Orchestrator | NIE czyści / NIE nadpisuje VITE_* — **nie** jest root cause |
| Manifest Gate C ⊆ Gate B lib | Zamierzone — wymaga **tego samego** env co Gate B gdy lib jest re-run |
| `src/**` / Payroll core | **NIE** podejrzane |

**Punkt rozbieżności:** brak kopiowania bloku CI-2 `env` z `gate-b` do `gate-c` w YAML.

### 2.3 Klasyfikacja

| Pytanie | Odpowiedź |
|---------|-----------|
| Production bug? | **NIE** |
| Test bug? | **NIE** (test poprawnie wymaga env przed vite-node) |
| Env / workflow bug? | **TAK** |
| Orchestrator bug? | **NIE** (dla CI-C-1b) |
| False positive? | **NIE** |

### 2.4 Wpływ na produkcję

**ZERO** — dummy mock keys tylko na GitHub Actions runner; nie trafiają do Vercel / runtime użytkowników.

---

## 3. PLAN — minimalna poprawka

### 3.1 Rekomendowany wariant (A) — env parity YAML

W `.github/workflows/test-infra-gates.yml` job `gate-c`:

```yaml
env:
  PW_BASE_URL: http://127.0.0.1:4173
  # CI-C-1b / CI-2 parity: Gate C re-runs gate-b-relevant (scope=all)
  VITE_SUPABASE_PROJECT_ID: ci-gate-b-mock
  VITE_SUPABASE_ANON_KEY: ci-gate-b-mock-anon
```

Opcjonalnie: ten sam komentarz CI-2 (Vite / `import.meta.env`) przy `gate-c`.

| Kryterium | Ocena |
|-----------|--------|
| Minimalność | **1 plik · 2 linie env** (+ komentarz) |
| Zgodność z CI-2 | Pełna (te same wartości dummy) |
| Ryzyko | **Niskie** |
| OUT `src/**` | Tak |

### 3.2 Warianty ODRZUCONE / OUT CI-C-1b

| Wariant | Opis | Werdykt |
|---------|------|---------|
| **B** | Usunąć `gate-b-relevant` z Gate C suites | OUT — zmiana kontraktu release gate; osobny DF |
| **C** | Ustawiać VITE_* w orchestratorze | OUT — dubluje CI-2; YAML jest właściwym miejscem job env |
| **D** | Zmiana `supabase.ts` / cloud-sync | OUT — prod; zakazane |
| **E** | Soft-skip GUARD-FAIL-LOUD gdy brak env | OUT — ukrywa regresję; CI-2 świadomie fail-loud |

### 3.3 Zakres IN / OUT (do DF)

| IN | OUT |
|----|-----|
| `.github/workflows/test-infra-gates.yml` (`gate-c.env`) | `src/**` |
| docs closeout CI-C-1b | Payroll / Theme / Cloud Sync / Tenders / UI |
| | `e2e/**` · orchestrator (chyba że Owner rozszerzy) |
| | zmiana listy suites Gate C |

### 3.4 Verify (po Owner GO → IMPLEMENT)

| Krok | PASS |
|------|------|
| 1 | Gate C log: `Preview ready` |
| 2 | `LIB-PAYROLL-GUARD-FAIL-LOUD` **PASS** (lub przynajmniej nie FAIL na missing VITE) |
| 3 | Pojawia się `>>> RUN E2E-HAPPY-PATH` (E2E **start**) |
| 4 | Gate B payroll/tenders bez regresji |
| 5 | Brak diff `src/**` |

**DoD CI-C-1b (wąski):** env parity → lib Gate C nie fail-fast na missing VITE → E2E mogą wystartować.  
Latent E2E FAIL (CI-C-2/3) **poza** DoD CI-C-1b.

### 3.5 Ryzyko

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Literówka w nazwie env | Niski | Copy-paste 1:1 z `gate-b` |
| Inne liby wymagają dodatkowych VITE_* | Niski | CI-2 wystarczyło dla całego Gate B payroll |
| Ujawnienie CI-C-2/3 po odblokowaniu | Oczekiwane | Osobne ticketów EPIC |

---

## 4. Gotowość

| Etap | Status |
|------|--------|
| AUDIT | **COMPLETE** |
| RCA | **COMPLETE** |
| PLAN | **COMPLETE** (Wariant A) |
| DESIGN FREEZE | **PENDING Owner GO** |
| IMPLEMENT | **BLOCKED** |

---

## 5. Raport Owner (1:1)

1. **Gate B vs C:** B ma `VITE_SUPABASE_PROJECT_ID` + `VITE_SUPABASE_ANON_KEY`; C tylko `PW_BASE_URL`. **Brak** `VITE_SUPABASE_URL` w projekcie.
2. **Rozbieżność:** job `gate-c` `env:` w `test-infra-gates.yml`.
3. **Dlaczego boli:** Gate C re-run `gate-b-relevant` (`scope=all`) przed E2E.
4. **Klasa:** wyłącznie **workflow/CI** — bez `src/**`.
5. **Minimalna naprawa:** te same dummy VITE_* na `gate-c` (Wariant A).
6. **Ryzyko:** niskie · zero prod.
7. **Następny krok:** Owner GO → **DESIGN FREEZE CI-C-1b**.
