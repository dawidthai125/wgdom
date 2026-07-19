# TEST-HARNESS-01 H3 — PLAN

> **Program:** TEST-HARNESS-01 · Slice **H3** · Payroll Production Sandbox (**H3-A**)  
> **Status:** PLAN · AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Wejście:** [`TEST-HARNESS-01-H3-RCA.md`](TEST-HARNESS-01-H3-RCA.md)  
> **DF:** [`TEST-HARNESS-01-H3-DESIGN-FREEZE.md`](TEST-HARNESS-01-H3-DESIGN-FREEZE.md)  
> **Parent:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H3-A

---

## 1. Cel PLANU

Zdefiniować implementację (po Owner GO) scenariusza `h3-payroll`:

```text
open payroll week
  → verify roster
  → verify KPI
  → verify totals
  → read-only validation
  → cleanup (no-op PSB-001)
```

**Poza zakresem PLANU:** commit, push, kod, H3-B/C save, zmiany Protected Core.

---

## 2. Model izolacji (decyzja planistyczna)

| Opcja | Werdykt |
|-------|---------|
| Always-create `psb-*` week / seed `kw-week-employees` | **REJECT** MVP — wymaga zapisu Core |
| Allowlist existing + save (`PSB_PAYROLL_WEEK_ID`) | **H3-B** — osobny GO |
| Save na preview + RO na prod | **H3-C** — osobny GO |
| **Pure read** current operational week | **ACCEPT** = **H3-A MVP** |

Nie tworzymy encji sandbox w Payroll. Allowlist `PSB_PAYROLL_WEEK_ID` **nie** jest wymagane w H3-A (opcjonalny filtr tygodnia w env = tylko **odczyt** wskazanego zakresu dat, bez zapisu).

---

## 3. Flow docelowy (po IMPLEMENT)

```text
CLI: npm run test:prod-sandbox -- --scenario h3-payroll --allow-prod
        │
        ▼
  H0 runner + preflight PSB_* / BASE_URL
        │
        ▼
  Playwright: login admin → settle (anti-wipe wzorzec H1/H2 — bez seedu)
        │
        ▼
  Navigate: Lista Płac (view payroll)
        │
        ▼
  Open week: „Bieżący tydzień” lub assert już otwartego zakresu
        │
        ▼
  KV read-only: batch-get
    kw-weekFrom, kw-weekTo, kw-week-employees
    (+ opcjonalnie kw-directory, kw-archive — bez write)
        │
        ▼
  Assert roster (count / visibility)
  Assert KPI (payrollMetrics vs UI)
  Assert totals (hours / footer) — H3-001
        │
        ▼
  Read-only validation gate:
    · zero batch-set payroll keys
    · zero klików zapisu / settled / mutate
        │
        ▼
  finally → CleanupTracker.run()  (mutatedIds: [] → PASS)
```

---

## 4. Pliki (propozycja — po Owner GO)

| Plik | Rola |
|------|------|
| `test-infra/prod-sandbox/scenarios/h3-payroll.mjs` | Scenariusz H3-A |
| `test-infra/prod-sandbox/payroll-helpers.mjs` | RO helpers: parse week, `payrollMetrics` **duplikat lekkiej logiki w harness** lub import **read-only pure fn** z istniejącego lib **tylko jeśli** nie ciągnie cloud-sync side effects — prefer **inline SSOT mirror** jak H1-001 (bez importu Protected Core) |
| `scripts/test-prod-sandbox-h3.mjs` | Thin wrapper → runner |
| `test-infra/prod-sandbox/runner.mjs` | Rejestracja `h3-payroll` |
| `test-infra/test-manifest.json` | Suite `prod-sandbox-h3` (manual / Owner; **nie** gate B/C) |
| `test-infra/prod-sandbox/README.md` | Dokumentacja CLI H3 |

**Zakaz:** edycji `cloud-sync.ts`, `payroll-week-*.ts`, Edge, `PayrollView.tsx` / `App.tsx` CORE, merge PWRB.

---

## 5. Kroki asercji (Acceptance)

| Krok | PASS |
|------|------|
| Open Lista Płac | widok Payroll widoczny (heading / tab Sumy / inputs week) |
| Open / resolve week | zakres `weekFrom`–`weekTo` zgodny z KV **lub** UI po „Bieżący tydzień” |
| Roster | liczba wierszy pracowników w UI (po filtrach production) **zgodna** z oczekiwanym zbiorem z `batch-get` (stable rule H3-001) **lub** ≥ 0 z deterministycznym reportem count |
| KPI | `activeDays` / `totalHours` z mirror `payrollMetrics` = wartości w report + UI nie przeczy (bounded) |
| Totals | footer / suma godzin (lub eksportowalne pole UI) nie przeczy KPI godzin |
| RO validation | report: `writes: 0`, `payrollMutations: 0` |
| Cleanup | PSB-001 PASS · `cleanup.mutatedIds.length === 0` |

**FAIL (scenario code 3):** brak widoku / mismatch stable assert / wykryty write attempt.

**FAIL (cleanup code 4):** tracker wyjątek (nie powinno przy no-op).

---

## 6. H3-001 Stable Assertions (PLAN — szczegóły w DF)

| Preferowane | Unikać |
|-------------|--------|
| Count roster (filtered) | Exact PLN net string zależny od waluty UI |
| `totalHours` z tej samej funkcji mirror co report | Floating timestamp „ostatni sync” |
| Obecność zakresu dat ISO | Kliknięcie „Zapisz tydzień” jako „verify save” |
| WARNING przy UNKNOWN / empty roster (konfigurowalne) | Hard FAIL na pusty tydzień produkcyjny bez `PSB_H3_ALLOW_EMPTY=1` |

---

## 7. Wzorce reuse (H0 / H1 / H2)

| Wzorzec | H3-A |
|---------|------|
| `makePsbId` / `isPsbId` | **Nieużywane** do create (brak seedu); dopuszczalne w report `runId` |
| Allowlist | Mutate-guard **blokuje** wszelkie payroll writes; H3-A nie woła allow write |
| Mutate guard | Przed **każdym** potencjalnym write — H3-A **nie** woła write API |
| PSB-001 | `finally` zawsze |
| Login → settle | **TAK** (bez seed / bez LS hydrate payroll — **zakaz** nadpisywania `kw-week-*` w LS) |
| Hybrid KV + Playwright | **TAK** — KV tylko `batch-get` |
| Anti-wipe seed | **N/A** (brak seedu) |
| H2 Sync Stability Window | **N/A** (brak delete/upload) |
| H0.x Persist Ledger | **NIE w H3** |

---

## 8. Env / CLI (propozycja)

| Env / flag | Rola |
|------------|------|
| `--allow-prod` | Wymagane gdy `BASE_URL` = prod (jak H1/H2) |
| `--dry-run` | Skip browser writes (i tak zero) · może skip login lub soft-skip UI |
| `PSB_H3_ALLOW_EMPTY` | Default fail-loud przy roster 0; `1` = PASS z WARNING |
| `PSB_PAYROLL_WEEK_ID` | **Nie** do save w H3-A; opcjonalnie ID zakresu do **odczytu** (jeśli DF potwierdzi) — inaczej tylko „Bieżący tydzień” |

Exit codes: dziedziczone H0 — **0** PASS · **2** precondition · **3** scenario · **4** cleanup.

---

## 9. Test / verify (po IMPLEMENT — nie teraz)

1. `npm run build` (regresja app — H3 nie zmienia app)  
2. `npm run test:prod-sandbox -- --scenario h3-payroll --dry-run`  
3. Owner: `--allow-prod` na prod · PASS  
4. Raport w `.tmp/prod-sandbox-out/` (gitignored)

---

## 10. Etapy IMPLEMENT (kolejność po Owner GO)

| # | Etap |
|---|------|
| 1 | DF ACK + `payroll-helpers` RO + scenario skeleton |
| 2 | Open week + roster assert |
| 3 | KPI + totals H3-001 |
| 4 | RO gate + cleanup no-op + runner/manifest/README |
| 5 | Local dry-run + Owner prod PASS + IMPLEMENTATION REPORT |

**Nie** łączyć z H3-B/C · **nie** startować H0.x · **nie** gate B/C.

---

## 11. Ryzyka (planistyczne)

| Ryzyko | Mitygacja |
|--------|-----------|
| Pusty tydzień prod | `PSB_H3_ALLOW_EMPTY` / WARNING policy |
| Flaki UI / login | reuse settle H1/H2 · fail-loud precondition |
| Agent doda „Zapisz tydzień” | DF #H3-002 hard ban + review checklist |
| Import `cloud-sync` do harness | #H3-010 — mirror fn w helpers, zero side-effect import |
| Filtr production ukrywa wiersze | assert na tym samym filtrze co UI (`filterProductionWeekEmployees` mirror) |

---

**Koniec PLAN H3**
