# PAYROLL-P0-WEEK-ROLLOVER-01 — RCA

> **Incident:** PAYROLL-P0-WEEK-ROLLOVER-01  
> **Status:** AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Objaw Owner:** tydzień UI `2026-07-20`–`2026-07-25`, ale roster/godziny z poprzedniego tygodnia; wypłaty **2-tygodniowe** nie przesunięte  
> **PLAN / DF / Review:** [`PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md`](PAYROLL-P0-WEEK-ROLLOVER-01-PLAN.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md`](PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md) · [`PAYROLL-P0-WEEK-ROLLOVER-01-ARCHITECTURE-REVIEW.md`](PAYROLL-P0-WEEK-ROLLOVER-01-ARCHITECTURE-REVIEW.md)  
> **Korelacja tooling:** H3-A prod smoke (ten sam wieczór) — UI `2026-07-20` ≠ KV `2026-07-13` · roster 14 · hours 587

---

## 1. Objaw

| Element | Stan zgłoszony |
|---------|----------------|
| Etykieta tygodnia (UI) | **nowy** zakres `2026-07-20` → `2026-07-25` |
| Pracownicy / godziny | **stary** tydzień (operacyjny przed rolloverem, typowo `2026-07-13`–`2026-07-18`) |
| Cykl 2-tygodniowy | wypłaty **nie** przesunięte / nie rozliczone względem nowego tygodnia |

Okno czasowe audytu: **niedziela ≥ 20:00** lokalnie — dokładnie moment `isPayrollWeekRolloverTime()` → `getPayrollWeekRange()` skacze na Pn–So nadchodzącego tygodnia.

---

## 2. Odpowiedzi na pytania Ownera (fakt z kodu)

### 2.1 Jaki tydzień uważa aplikacja za aktywny?

| Warstwa | SSOT | Wynik w symptomie |
|---------|------|-------------------|
| Kalendarz płacowy | `getPayrollWeekRange()` (`payroll-cycle.ts`) | Po Nd ≥20:00 → **`2026-07-20`–`2026-07-25`** |
| Stan React / UI | `weekFrom`/`weekTo` w `App.tsx` (`useLocalStorage`) | Po **align** = kalendarz bieżący (nowe daty) |
| „Closed” UI | `isPayrollWeekClosedForUi` | Po align → **nie** closed (klucze = current) → wygląda jak normalny edytowalny tydzień |

### 2.2 Jakie week keys z KV?

| Klucz | Rola |
|-------|------|
| `kw-weekFrom` / `kw-weekTo` | Etykieta tygodnia operacyjnego |
| `kw-week-employees` | Żywy roster |
| `kw-archive` | Snapshoty po poprawnym rolloverze |
| Tombstones | `kw-week-employees-deleted-ids`, `kw-archive-deleted-ids` |

**Korelacja H3-A (batch-get prod):** KV nadal **`2026-07-13`–`2026-07-18`** + roster 14 — chmura **nie** dostała pusha nowych kluczy w ścieżce align.

### 2.3 Jakie week keys używa UI?

- `App.tsx`: `useLocalStorage("kw-weekFrom"|"kw-weekTo")` → props do `PayrollView`.
- `PayrollView` **nie** czyta KV samodzielnie — tylko props.
- `setWeekFrom`/`setWeekTo` w ścieżce align zapisują **LS** przez hook; **bez** `pushPayrollWeekAfterRollover`.

### 2.4 Czy PWRB przełączył bundle tygodnia?

**NIE.** `payroll-week-roster-bundle.ts` jest facadą mutacji rosteru/tombstones dla **przekazanego** `weekFrom`/`weekTo`. Nie zawiera logiki „przełącz tydzień kalendarzowy”. Przełączanie = `App.tsx` (`tryPayrollWeekCycle` / `autoArchiveAndAdvance`).

### 2.5 Czy LocalStorage zawiera poprzedni tydzień?

**Częściowo / mieszanka:**

| Klucz LS | Po buggy align |
|----------|----------------|
| `kw-weekFrom` / `kw-weekTo` | **Nowe** daty (setState → LS) |
| `kw-week-employees` | **Stary** roster (nie wyczyszczony) |
| `kw-archive` | Stary tydzień **może nie** mieć świeżego snapshotu z tej ścieżki |

### 2.6 Czy Cloud Sync zwraca poprzedni tydzień?

**Tak (prawdopodobnie nadal):** ścieżka align **nie** woła `pushPayrollWeekAfterRollover` → KV zostaje na poprzednim `weekFrom`/`weekTo` + starym rosterze. Bootstrap/`finalizePayrollBundleMerge` może później utrwalić stary tydzień z chmury (`pickWeekRange` local↔cloud, **bez** kalendarza) — inny mechanizm; symptom Ownera = **nowe UI + stary roster** = lokalny align.

### 2.7 Czy rollover pracowników 2-tygodniowych wykonał się poprawnie?

**NIE.** To **skutek**, nie osobny root cause:

- `isBiweeklyPayoutWeek(weekTo, anchor)` / `calcBiweeklyRowDisplay` zależą od **etykiety** `weekTo` i od `findWeekEmployeeInArchive`.
- Brak `autoArchiveAndAdvance` → brak snapshotu starego tygodnia w `kw-archive` → `prevWeekNet` może spaść do 0 przy kolejnej prawdziwej wypłacie.
- Godziny w `emp.days` fizycznie zostają ze starego tygodnia pod nową etykietą → „wypłaty 2-tyg. nie przesunięte”.

---

## 3. Root cause

| ID | Przyczyna |
|----|-----------|
| **RC-1 (PRIMARY)** | `resolvePayrollOperationalWeekKeys` + użycie w `tryPayrollWeekCycle` / mount-effect: przy `liveRosterCount > 0` i calendar-behind → **tylko** `setWeekFrom`/`setWeekTo` + **`return`** — **bez** `autoArchiveAndAdvance` |
| **RC-2** | Heurystyka REGRESSION-04 (`live_roster_stale_week_keys`) **nie rozróżnia** (A) mount-race (stara etykieta, roster już „bieżący”) vs (B) prawdziwy Nd≥20:00 rollover (roster należy do poprzedniego tygodnia) |
| **RC-3** | Po align: `goToCurrent` = no-op (`weekFrom === c.from`); `trySundayArchiveOnly` nie łapie (etykiety już przesunięte) → brak ręcznego/auto domknięcia |
| **RC-4** | Brak push 4 kluczy po align → rozjazd LS↔KV (potwierdzony H3-A) |
| **RC-5** | Biweekly = konsument mislabelowanego stanu (RC-1), nie niezależny bug `payroll-carry-forward` |

### Mechanizm (skrót)

```text
Nd ≥ 20:00
  → getPayrollWeekRange() = 2026-07-20…25
  → weekEmployees.length > 0  AND  weekFrom/To calendar-behind
  → resolvePayrollOperationalWeekKeys → didAlign=true
  → setWeekFrom/To(new)   ← UI pokazuje nowy tydzień
  → return                ← POMINIĘTE:
       autoArchiveAndAdvance (snapshot → archive, clear roster, push)
  → UI: nowe daty + stary roster/godziny
  → biweekly: zły weekTo + brak archiwum poprzedniego tygodnia
```

**Kod:**

- `src/lib/payroll-cycle.ts` — `resolvePayrollOperationalWeekKeys` (~L103–125)
- `src/app/App.tsx` — `tryPayrollWeekCycle` (~L2113–2134) · mount align (~L2191–2210)
- Poprawna ścieżka (omijana): `autoArchiveAndAdvance` (~L2031–2068) · `pushPayrollWeekAfterRollover`

---

## 4. Co NIE jest root cause

| Hipoteza | Werdykt |
|----------|---------|
| PWRB „nie przełączył bundle” | **Odrzucone** jako PRIMARY — PWRB nie steruje datami tygodnia |
| Payroll Guard shrink | **Odrzucone** — nie dotyczy etykiet; rollover push i tak `skipPayrollGuard` |
| Osobny bug biweekly defer (`canDeferPayroll`) | **Odrzucone** jako PRIMARY — biweekly i tak nie używa defer ⏭ |
| `PayrollView` czyta inną SSOT niż App | **Odrzucone** — tylko props |

---

## 5. Impact

| Obszar | Impact |
|--------|--------|
| Operacje LP | Fałszywy „bieżący tydzień” z godzinami poprzedniego |
| Archiwum | Stary tydzień może **nie** trafić do `kw-archive` |
| Cloud / multi-device | LS nowe klucze, KV stare — drift kart/urządzeń |
| Biweekly | Pominięta / zła wypłata 2-tyg.; ryzyko `prevWeekNet=0` |
| Manual recovery | „Bieżący tydzień” przestaje domykać stary tydzień |

---

## 6. Wnioski → PLAN / DF

1. Naprawa musi **rozróżnić** mount-race align vs prawdziwy calendar rollover.  
2. Prawdziwy rollover **musi** iść przez `autoArchiveAndAdvance` (archive + clear + push).  
3. Biweekly weryfikować jako regresję konsumencką (archiwum + `weekTo`).  
4. **BLOCK IMPLEMENT** do Owner GO.

---

**Koniec RCA**
