# TEST-HARNESS-01 H3 — ARCHITECTURE REVIEW

> **Status:** ARCHITECTURE REVIEW · AUDIT ONLY  
> **Data:** 2026-07-19  
> **Wejście:** [`TEST-HARNESS-01-H3-RCA.md`](TEST-HARNESS-01-H3-RCA.md) · [`TEST-HARNESS-01-H3-PLAN.md`](TEST-HARNESS-01-H3-PLAN.md) · [`TEST-HARNESS-01-H3-DESIGN-FREEZE.md`](TEST-HARNESS-01-H3-DESIGN-FREEZE.md)  
> **Fundament:** H0 + H1 + H2 **RELEASED** · [`TEST-HARNESS-01-DESIGN-FREEZE.md`](TEST-HARNESS-01-DESIGN-FREEZE.md) § H3-A  
> **Protected Core SSOT:** [`CORE-PROTECTED-ARCHITECTURE.md`](CORE-PROTECTED-ARCHITECTURE.md) · payroll guide docs

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy DF H3 jest spójny z parent H3-A? | **TAK** — open + KPI · bez „Zapisz tydzień” |
| Czy DF jest spójny z H0/H1/H2? | **TAK** — ten sam runner/guard/cleanup; **adaptacja** = zero write (brak seedu) |
| Pure read vs always-create? | **APPROVE pure read** — always-create week = ryzyko Core |
| Czy pokrywa Owner MVP pipeline? | **TAK** — open→roster→KPI→totals→RO→cleanup |
| Protected Core? | **NIE** przy D-H3-12 / #H3-008–009 — Path A / test-infra only |
| Czy produkt Payroll wymaga zmian? | **NIE** — H3 = obserwacja E2E RO |
| Czy wolno IMPLEMENT? | **NIE** — **BLOCK** do Owner GO |
| Residual risk | pusty tydzień · filtr production drift · pokusa „dodać save” · import cloud-sync |

```text
REVIEW:  APPROVE DESIGN
         BLOCK IMPLEMENT
```

---

## 2. Architektura docelowa

```text
CLI --scenario h3-payroll --allow-prod
        │
        ▼
┌───────────────────┐
│ H0 runner + H3-A  │
│ mutate-guard      │  ← reject any payroll write
│ CleanupTracker    │  ← finally no-op OK
└─────────┬─────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
 Edge KV      Playwright
 batch-get    Lista Płac
 (RO only)    open week · assert
    │            │
    └─────┬──────┘
          ▼
   H3-001 stable assert
   RO gate writes=0
          │
          ▼
   finally → cleanup (mutatedIds:[])
```

**Contrasted with H1/H2:** brak merge-append seed · brak UI upload/delete · brak `batch-set`.

---

## 3. Checklist zgodności

| Kryterium | Status |
|-----------|--------|
| Parent DF H3-A | **PASS** |
| #PSB-012 no save active week | **PASS** (silniej: zero save) |
| PSB-001 finally | **PASS** (no-op model) |
| Zero Protected Core | **PASS** |
| Reuse only H0–H2 patterns | **PASS** |
| Deterministic assertions H3-001 | **PASS** (zamrożone) |
| Cleanup po RO | **PASS** (no-op ≠ pominięcie finally) |
| H3-B/C nie w MVP | **PASS** |
| Gate B/C | **PASS** (wyłączone) |

---

## 4. Ryzyka zaakceptowane (residual)

| Ryzyko | Poziom | Uwaga |
|--------|--------|-------|
| Empty operational week | MED | `PSB_H3_ALLOW_EMPTY` |
| UI vs KV filter mismatch | LOW–MED | mirror `filterProductionWeekEmployees` |
| Agent scope creep → save | HIGH bez DF | #H3-002 / #H3-014 |
| Login flake | MED | precondition code 2 |
| Fałszywe poczucie „testuje merge payroll” | MED | H3-A **nie** testuje merge/PWRB — tylko shell+metrics RO |

---

## 5. Co Architecture Review **odrzuca**

| Propozycja | Werdykt |
|------------|---------|
| Seed sandbox week w `kw-week-employees` | **REJECT** MVP |
| „Zapisz tydzień” dla „pełniejszego E2E” | **REJECT** (H3-B wymagany) |
| Import `finalizePayrollBundleMerge` / cloud-sync | **REJECT** |
| TI harness L5 prod jobi jako zamiennik H3 | **REJECT** (#PSB-≠-TI) |
| Skip cleanup finally bo „nic nie mutowaliśmy” | **REJECT** — PSB-001 zawsze |

---

## 6. Warunki startu IMPLEMENT (Owner GO)

IMPLEMENT wolno rozpocząć **tylko** gdy Owner jawnie powie GO na **H3 IMPLEMENT** (lub równoważne), oraz:

1. Ten Review = **APPROVE DESIGN** (poniżej)  
2. DF H3 bez otwartych konfliktów z parent  
3. Zakres = **H3-A only**  
4. Brak równoległego „dorabiania” H3-B w tym samym bundlu  

Do tego momentu: **BLOCK IMPLEMENT** · brak kodu · brak commit · brak push.

---

## 7. Podpis review

| Pole | Wartość |
|------|---------|
| Reviewer | Architecture Review (agent) |
| Data | 2026-07-19 |
| Design | **APPROVE DESIGN** |
| Implement | **BLOCK IMPLEMENT** |
| Następny krok Ownera | Jawne **Owner GO — H3 IMPLEMENT** (lub STOP) |

```text
========================================
ARCHITECTURE REVIEW — TEST-HARNESS-01 H3
========================================
APPROVE DESIGN
BLOCK IMPLEMENT
========================================
Czekaj na Owner GO.
========================================
```

---

**Koniec ARCHITECTURE REVIEW H3**
