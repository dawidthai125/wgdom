# TEST-HARNESS-01 H3 — DESIGN FREEZE

> **Program:** TEST-HARNESS-01 · Slice **H3** · Payroll Production Sandbox  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO  
> **Data:** 2026-07-19  
> **Owner:** **H3-A** — open week + verify roster/KPI/totals · **read-only** · **bez** „Zapisz tydzień”  
> **Fundament H0:** markers · allowlist · mutate-guard · **PSB-001 Cleanup Guarantee**  
> **Wzorce H1/H2:** login→settle · hybrid KV(`batch-get`)+Playwright · reports · fail-loud · **bez** seedu payroll / anti-wipe write  
> **RCA / PLAN / Review:** [`TEST-HARNESS-01-H3-RCA.md`](TEST-HARNESS-01-H3-RCA.md) · [`TEST-HARNESS-01-H3-PLAN.md`](TEST-HARNESS-01-H3-PLAN.md) · [`TEST-HARNESS-01-H3-ARCHITECTURE-REVIEW.md`](TEST-HARNESS-01-H3-ARCHITECTURE-REVIEW.md)  
> **Parent DF:** [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H3 AC · **#PSB-012**

---

## 0. Dziedziczenie H0 / H1 / H2 (bez zmian)

| Zasada | H3-A |
|--------|------|
| D1 Marked entities | **N/A create** — brak tworzenia encji payroll |
| D5 Zero Protected Core | **TAK** |
| D6 Prefix `psb-*` | **TAK** dla przyszłych write slice; H3-A nie seeduje |
| D8 Mutate guard | **TAK** — każdy write API → reject; H3-A nie woła write |
| PSB-001 Cleanup Guarantee | **TAK** — `finally` · no-op PASS gdy `mutatedIds: []` |
| #PSB-≠-TI | **TAK** — nie mieszać z Payroll Preview / TI sandbox L5 |
| #PSB-003 `--allow-prod` | **WYMAGANE** gdy BASE_URL = prod |
| #PSB-004 Dry-run | **TAK** — zero side effects |
| #PSB-012 | **TAK** — brak save na aktywnym tygodniu (MVP: brak save w ogóle) |
| H1 anti-wipe seed | **NIE** — brak seedu `kw-week-*` |
| H0.x Persist Ledger | **NIE w H3** |

**Uwaga kolejności programu:** Owner override: H0→H1→H2→**H3** (ten slice).

---

## 1. Cel zamrożony

Automatyczny scenariusz `h3-payroll` na prod: otwarcie Listy Płac, weryfikacja tygodnia / rosteru / KPI / totals wyłącznie **odczytem** (UI + KV `batch-get`), bez jakiejkolwiek modyfikacji danych Payroll, z `finally` cleanup no-op (PSB-001).

---

## 2. Decyzje H3 (D-H3-01 … D-H3-18)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-H3-01** | Tryb MVP | **H3-A** only |
| **D-H3-02** | Write policy | **Zero** zapisów: brak `batch-set` na kluczach payroll; brak UI mutate |
| **D-H3-03** | Zakazane UI | „Zapisz tydzień” · toggle Rozliczony · Dodaj/Usuń pracownika · defer · rollover · restore banner write |
| **D-H3-04** | Seed model | **Brak** — pure read operational week |
| **D-H3-05** | Week resolve | Default: **Bieżący tydzień** (UI) · SSOT dat = `batch-get` `kw-weekFrom`/`kw-weekTo` |
| **D-H3-06** | Roster SSOT | `kw-week-employees` + mirror filtra production (jak UI) |
| **D-H3-07** | KPI SSOT | Mirror `payrollMetrics` → `{ activeDays, totalHours }` w harness helpers (**bez** side-effect import cloud-sync) |
| **D-H3-08** | Totals | Zgodność godzin (KPI ↔ UI footer / Sumy) — H3-001 |
| **D-H3-09** | Empty roster | Default **FAIL** precondition/scenario; Override: `PSB_H3_ALLOW_EMPTY=1` → PASS + WARNING |
| **D-H3-10** | Cleanup | No-op tracker · **PASS** gdy brak mutacji; **nie** tworzyć encji „dla cleanup” |
| **D-H3-11** | H3-B / H3-C | **OUT OF SCOPE** — osobny Owner GO + DF delta |
| **D-H3-12** | Core / Edge | **Zero** zmian kodu produkcyjnego |
| **D-H3-13** | CLI | `npm run test:prod-sandbox -- --scenario h3-payroll --allow-prod` |
| **D-H3-14** | CI | Manual / Owner only — **nie** gate B/C |
| **D-H3-15** | Timeout | Bounded waits navigation/settle → FAIL scenario, potem cleanup finally |
| **D-H3-16** | LS hydrate | **ZAKAZ** zapisu `kw-week-employees` / `kw-weekFrom` / `kw-weekTo` / `kw-archive` do localStorage z harness |
| **D-H3-17** | Allowlist | `PSB_PAYROLL_WEEK_ID` **nie** odblokowuje save w H3-A |
| **D-H3-18** | Reports | `.tmp/prod-sandbox-out/` gitignored · pola: week range, rosterCount, kpi, totals, `writes:0` |

---

## 3. Principles H3 (#H3-001 … #H3-014)

| # | Principle |
|---|-----------|
| **#H3-001** | **Stable Assertions** — assert count/hours/ISO dates; nie PLN stringi ani niestabilne timestamps |
| **#H3-002** | **Never save week on prod** w H3-A — twardy ban „Zapisz tydzień” |
| **#H3-003** | Never mutate payroll KV (`batch-set` payroll keys = hard FAIL jeśli wykryte) |
| **#H3-004** | Cleanup in `finally` (PASS and FAIL) — PSB-001 · no-op OK |
| **#H3-005** | KV SSOT for metrics = `batch-get`; UI = visibility + consistency check |
| **#H3-006** | Empty roster fail-loud unless `PSB_H3_ALLOW_EMPTY=1` |
| **#H3-007** | `--allow-prod` required on prod BASE_URL; dry-run forbids side effects |
| **#H3-008** | Zero Protected Core / PWRB / cloud-sync / Edge / PayrollView logic changes |
| **#H3-009** | No import of `cloud-sync.ts` into harness (mirror pure helpers only) |
| **#H3-010** | One scenario bundle = H3-A only (nie łączyć z H3-B save) |
| **#H3-011** | Reports gitignored |
| **#H3-012** | Fail-loud `PSB_*` / `H3_*` preconditions |
| **#H3-013** | Do not seed / replace / merge-append payroll weeks |
| **#H3-014** | H3-B/C require separate Owner GO — nie „dorobić save” w tym samym PR |

---

## 4. Acceptance Criteria (H3-A)

| Krok | Assert |
|------|--------|
| Open Lista Płac | widok Payroll widoczny |
| Week | zakres dat UI ↔ KV (`kw-weekFrom`/`kw-weekTo`) |
| Roster | count (filtered) w report · UI lista zgodna (bounded) |
| KPI | `activeDays`, `totalHours` wyliczone z KV mirror |
| Totals | godziny UI nie przeczą `totalHours` (H3-001) |
| RO validation | `writes === 0` · brak click path zapisu |
| Cleanup | PSB-001 PASS · `mutatedIds: []` |

---

## 5. Pipeline zamrożony

```text
login → settle
  → open Lista Płac
  → resolve / open week (read)
  → batch-get payroll keys (read)
  → verify roster
  → verify KPI
  → verify totals
  → RO gate
  → finally cleanup (no-op)
```

---

## 6. Out of scope (twarde)

- „Zapisz tydzień” / archive write / restore write  
- H3-B allowlist save · H3-C preview save  
- Seed `psb-*` w `kw-week-employees`  
- Mutacja `kw-directory` / leaves dla scenariusza  
- Edge / cloud-sync / PWRB / TI L5 prod seed  
- Gate B/C · H0.x Persist Ledger  
- Przydziały robót write · settled toggles  

---

## 7. Exit codes (dziedziczone)

| Code | Znaczenie |
|------|-----------|
| 0 | PASS |
| 2 | Precondition / `PSB_*` / empty bez allow |
| 3 | Scenario FAIL (assert / RO breach) |
| 4 | Cleanup FAIL |

---

## 8. Zamrożenie

**DESIGN FREEZE H3-A obowiązuje.**  
Zmiana trybu na H3-B/C lub dodanie zapisu = nowy AUDIT / Owner GO.  
**IMPLEMENT zablokowany** do jawnego Owner GO na H3 IMPLEMENT.

---

**Koniec DESIGN FREEZE H3**
