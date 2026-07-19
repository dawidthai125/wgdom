# PAYROLL-P0-WEEK-ROLLOVER-01 — ARCHITECTURE REVIEW

> **Status:** ARCHITECTURE REVIEW · AUDIT ONLY  
> **Data:** 2026-07-19  
> **Wejście:** [`PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md`](PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md`](PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md)

---

## 1. Werdykt

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy RCA jest spójna z kodem? | **TAK** — `resolvePayrollOperationalWeekKeys` + early return w `tryPayrollWeekCycle` |
| Czy korelacja H3-A (UI≠KV) wspiera RCA? | **TAK** — align bez push |
| Czy PWRB jest winny PRIMARY? | **NIE** |
| Czy biweekly to osobny root cause? | **NIE** — skutek braku archiwum/clear |
| Czy DF chroni REGRESSION-03/04? | **TAK** (Opcja A + AC-4/AC-7) |
| Czy wolno IMPLEMENT? | **NIE** — **BLOCK** do Owner GO |
| Residual risk | zła heurystyka D-06 · multi-tab · recovery danych już „pomieszanych” |

```text
REVIEW:  APPROVE DESIGN
         BLOCK IMPLEMENT
```

---

## 2. Architektura (stan obecny vs docelowy)

### Obecny (bug)

```text
tryPayrollWeekCycle / mount
        │
        ▼
resolvePayrollOperationalWeekKeys
  (roster>0 + calendarBehind → didAlign)
        │
        ▼
setWeekFrom/To(current) ──► UI nowe daty
        │
        return  ✗ pomija autoArchiveAndAdvance
        │
        ▼
weekEmployees = STARY roster
kw-archive = może bez snapshotu
KV = często STARE klucze (brak push)
biweekly = zły weekTo / brak prev archive
```

### Docelowy (DF)

```text
tryPayrollWeekCycle
        │
        ├─ mount-race? ──► align-only (keys) · roster bez zmian
        │
        └─ real rollover? ──► blockers?
                │                └─ TAK → stop
                └─ NIE → autoArchiveAndAdvance
                         archive + clear + push
```

---

## 3. Checklist zgodności

| Kryterium | Status |
|-----------|--------|
| Odpowiedzi na 7 pytań Ownera w RCA | **PASS** |
| Primary RC w Protected Core path (App + cycle) | **PASS** |
| Zero „napraw PWRB na siłę” | **PASS** |
| Zero wymuszania Edge | **PASS** |
| Biweekly jako regresja konsumencka | **PASS** |
| Test plan 03/04 + nowy P0 | **PASS** |
| Recovery tymczasowy opisany w PLAN | **PASS** |

---

## 4. Co Architecture Review odrzuca

| Propozycja | Werdykt |
|------------|---------|
| „Wyczyść roster w UI bez archiwum” | **REJECT** |
| „Tylko push weekFrom/To bez archive” | **REJECT** |
| Zmiana PWRB jako fix dat | **REJECT** |
| Wyłączenie REGRESSION-04 całkowicie bez zamiennika | **REJECT** |
| Naprawa tylko biweekly bez cycle/App | **REJECT** |

---

## 5. Warunki startu IMPLEMENT

1. Ten Review = **APPROVE DESIGN**  
2. Owner GO: **PAYROLL-P0-WEEK-ROLLOVER-01 IMPLEMENT**  
3. Zakres = DF D-01…D-14 only  
4. Regeneracja danych prod (jeśli już pomieszane) = osobna procedura Owner — nie ukrywać w silent wipe  

Do tego momentu: **BLOCK IMPLEMENT** · brak kodu · brak commit · brak push.

---

## 6. Podpis review

| Pole | Wartość |
|------|---------|
| Reviewer | Architecture Review (agent) |
| Data | 2026-07-19 |
| Design | **APPROVE DESIGN** |
| Implement | **BLOCK IMPLEMENT** |
| Następny krok | Owner GO IMPLEMENT lub STOP / recovery manual |

```text
========================================
ARCHITECTURE REVIEW
PAYROLL-P0-WEEK-ROLLOVER-01
========================================
APPROVE DESIGN
BLOCK IMPLEMENT
========================================
Czekaj na Owner GO.
========================================
```

---

**Koniec ARCHITECTURE REVIEW**
