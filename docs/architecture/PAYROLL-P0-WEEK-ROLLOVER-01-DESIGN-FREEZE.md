# PAYROLL-P0-WEEK-ROLLOVER-01 — DESIGN FREEZE

> **Incident:** PAYROLL-P0-WEEK-ROLLOVER-01  
> **Status:** DESIGN FREEZE · **NIE implementować** bez jawnego Owner GO  
> **Data:** 2026-07-19  
> **RCA / PLAN / Review:** [`PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md`](PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-ARCHITECTURE-REVIEW.md`](PAYROLL-P0-WEEK-ROLLOVER-01-ARCHITECTURE-REVIEW.md)

---

## 0. Cel zamrożony

Naprawić niespójność: **etykieta tygodnia = kalendarz bieżący**, a **żywy roster = dane poprzedniego tygodnia**, oraz wtórny regres biweekly — bez regresji ochrony REGRESSION-03/04 (fałszywy wipe na mount).

---

## 1. Decyzje (D-01 … D-14)

| ID | Decyzja | Wartość |
|----|---------|---------|
| **D-01** | Root cause | Align-only (`resolvePayrollOperationalWeekKeys` + early return w `tryPayrollWeekCycle`) przy prawdziwym calendar rollover |
| **D-02** | Strategia | **Opcja A** — rozróżnij **align-only** vs **full rollover** |
| **D-03** | Full rollover path | **Wyłącznie** `autoArchiveAndAdvance` (snapshot → `kw-archive`, `weekEmployees=[]`, set keys, `pushPayrollWeekAfterRollover`) |
| **D-04** | Align-only path | Dozwolony **tylko** gdy dowód mount-race (patrz D-06) — **bez** clear roster |
| **D-05** | Kalendarz SSOT | `getPayrollWeekRange()` / `isPayrollWeekRolloverTime` / `PAYROLL_WEEK_ROLLOVER_HOUR=20` — bez zmiany semantyki Nd≥20:00 |
| **D-06** | Kryterium full rollover (min.) | `calendarBehind` **AND** `liveRosterCount>0` **AND** (**rollover time lub Pn+ behind**) **AND** stored week **nie** jest już poprawnie zarchiwizowany jako domknięty cykl **OR** brak dowodu że live roster należy do **current** week — szczegóły implementacyjne w testach; **zakaz** „zawsze align gdy roster>0” |
| **D-07** | Blockers | `hasPayrollRolloverBlockers` nadal blokuje full rollover (20.1C) — bez zmiany semantyki |
| **D-08** | Push po full rollover | **Wymagany** — 4 klucze: weekFrom, weekTo, week-employees, archive |
| **D-09** | PWRB | **Bez** zmiany API facady; nie dodawać logiki dat do PWRB |
| **D-10** | cloud-sync merge B4 | **Nie ruszać** bez osobnego Owner GO; fix w `payroll-cycle` + `App.tsx` |
| **D-11** | Biweekly | Brak osobnej ścieżki defer; PASS = archiwum poprzedniego tygodnia + pusty/nowy roster na current |
| **D-12** | UI recovery | Po fixie: `goToCurrent` musi znów móc archiwizować gdy stored ≠ current; nie polegać wyłącznie na align |
| **D-13** | Testy | Nowe P0-WEEK-ROLLOVER-01 + regresja `p0-regression-03` i `04` **PASS** |
| **D-14** | Scope | **Jeden** bundle hotfix; bez H3-B, H0.x, Edge, changelog UI tylko jeśli Owner każe widoczny wpis |

---

## 2. Principles (#R01 … #R10)

| # | Principle |
|---|-----------|
| **#R01** | Nigdy nie zmieniaj `weekFrom`/`weekTo` na current **z niepustym rosterem poprzedniego tygodnia** bez archiwizacji |
| **#R02** | Full rollover = archive + clear + push (atomicznie w sensie produktu) |
| **#R03** | Align-only tylko przy udowodnionym mount-race — nie przy Nd≥20:00 real rollover |
| **#R04** | Zachowaj REGRESSION-03/04 (bez fałszywego wipe przed pull) |
| **#R05** | Blockers sobotniej kasy nadal gate’ują advance |
| **#R06** | Zero zmian PWRB kontraktu / Edge / B4 merge bez osobnego GO |
| **#R07** | Biweekly weryfikowany jako regresja konsumencka archiwum |
| **#R08** | Fail-loud testy na clock (Nd 19:59 vs 20:00 / 20:01) |
| **#R09** | Multi-device: po rollover KV == LS etykiety + pusty live roster |
| **#R10** | Jedna sesja IMPLEMENT = ten incident only |

---

## 3. Acceptance Criteria (zamrożone)

| ID | Assert |
|----|--------|
| AC-1 | Real rollover → archive zawiera poprzedni zakres z rosterem |
| AC-2 | Po rollover live `weekEmployees.length === 0` (lub tylko nowo dodani po akcji usera) |
| AC-3 | `kw-weekFrom/To` (KV) = current po push |
| AC-4 | Mount-race fixture → roster **nie** wipe |
| AC-5 | Blockers → brak advance |
| AC-6 | Biweekly: poprzedni tydzień w archiwum; UI current nie pokazuje starych godzin jako bieżących |
| AC-7 | Regresja 03 + 04 PASS |

---

## 4. Out of scope

- H3-B/C payroll write harness  
- H0.x Persist Ledger  
- Zmiana godziny rolloveru (20:00) bez Owner  
- Redesign modelu biweekly / carry-forward MODEL A  
- Anti-leak Wariant B rewrite  

---

## 5. Zamrożenie

**DESIGN FREEZE obowiązuje.**  
IMPLEMENT zablokowany do Owner GO na **PAYROLL-P0-WEEK-ROLLOVER-01 IMPLEMENT**.

---

**Koniec DESIGN FREEZE**
