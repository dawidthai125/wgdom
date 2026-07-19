# PAYROLL-P0-WEEK-ROLLOVER-01 — PLAN

> **Incident:** PAYROLL-P0-WEEK-ROLLOVER-01  
> **Status:** PLAN · AUDIT ONLY · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-19  
> **Wejście:** [`PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md)  
> **DF:** [`PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md`](PAYROLL-P0-WEEK-ROLLOVER-01-DESIGN-FREEZE.md)

---

## 1. Cel PLANU

Zdefiniować bezpieczną naprawę (po Owner GO) tak, aby:

1. Po Nd ≥20:00 (lub gdy calendar-behind + roster należy do **poprzedniego** tygodnia) → pełny rollover: **archiwum → clear roster → nowe klucze → push**.  
2. Zachować ochronę REGRESSION-03/04 przed **fałszywym wipe** na mount (stara etykieta + roster już bieżący z pull).  
3. Przywrócić poprawne zachowanie biweekly (archiwum poprzedniego tygodnia + poprawny `weekTo`).

**Poza zakresem PLANU:** commit, push, kod, H3-B, H0.x, zmiany Edge poza koniecznym parity (domyślnie **zero Edge**).

---

## 2. Strategia naprawy (propozycja — zamrożona w DF)

### Opcja A (preferowana) — rozróżnij align vs rollover

Wprowadzić sygnał „czy żywy roster należy do **stored** week, czy jest już danymi **current** week”:

| Sygnał (kandydat) | Interpretacja |
|-------------------|---------------|
| Snapshot w `kw-archive` dla **current** już istnieje + live roster bogaty | prawdopodobnie mount-race → **align-only** OK |
| Calendar-behind + **brak** snapshotu stored week w archive + `isPayrollWeekRolloverTime` / Pn+ behind | **prawdziwy rollover** → `autoArchiveAndAdvance` |
| Calendar-behind + blockers (nierozliczona kasa sob.) | **nie** advance — zachować gate 20.1C |

Dokładne kryteria → DF (D-01…).

### Opcja B (alt) — nigdy nie align bez archive gdy calendar-behind

Zawsze `autoArchiveAndAdvance` gdy behind + roster>0 (po blockers check).  
Ryzyko: powrót REGRESSION-03 (wipe na mount przed pull) — wymaga silnego guardu bootstrap/handoff.

**PLAN rekomenduje A** z testami regresji 03/04 + nowy test P0-WEEK-ROLLOVER-01.

---

## 3. Kroki IMPLEMENT (po Owner GO)

| # | Etap |
|---|------|
| 1 | DF ACK · unit: rozróżnienie align vs rollover (`payroll-cycle.ts`) |
| 2 | `tryPayrollWeekCycle` + mount-effect: wołać `autoArchiveAndAdvance` gdy rollover, align-only gdy race |
| 3 | Po rollover: assert push 4 kluczy (`pushPayrollWeekAfterRollover`) |
| 4 | Biweekly smoke: archiwum poprzedniego tygodnia + `isBiweeklyPayoutWeek` na nowym `weekTo` |
| 5 | Regresja: `test-payroll-display-p0-regression-03/04` + nowy skrypt P0-WEEK-ROLLOVER-01 |
| 6 | Manual Owner: Nd≥20:00 lub clock mock — nowy tydzień pusty roster, stary w archiwum |

---

## 4. Pliki (oczekiwane przy IMPLEMENT)

| Plik | Zmiana |
|------|--------|
| `src/lib/payroll-cycle.ts` | Kryteria align vs rollover |
| `src/app/App.tsx` | `tryPayrollWeekCycle` / mount-effect |
| `scripts/test-payroll-*-p0-week-rollover-01.mjs` (lub równoważny) | Nowy test |
| Istniejące `test-payroll-display-p0-regression-03/04.mjs` | Muszą pozostać PASS |

**Zakaz domyślny:** `cloud-sync.ts` merge SSOT B4, Edge, PWRB API shape — tylko jeśli DF wymaga jawnie.

---

## 5. Acceptance (po IMPLEMENT)

| # | PASS |
|---|------|
| A1 | Nd≥20:00 + niepusty roster starego tygodnia → snapshot w `kw-archive` + `weekEmployees=[]` + `weekFrom/To=current` |
| A2 | Push KV: `kw-weekFrom/To`, `kw-week-employees=[]`, `kw-archive` z poprzednim tygodniem |
| A3 | Mount-race (stara etykieta, roster bieżący, archiwum current już jest) → **bez** wipe rosteru |
| A4 | Blockers 20.1C nadal blokują advance |
| A5 | Biweekly: poprzedni tydzień w archiwum; nowy tydzień nie pokazuje starych godzin jako „bieżących” |
| A6 | `goToCurrent` nadal archiwizuje gdy etykieta ≠ current |

---

## 6. Recovery Owner (tymczasowy, bez kodu)

Do czasu fixa (procedura operacyjna — **nie** część IMPLEMENT):

1. **Nie** polegać na samym „Bieżący tydzień” jeśli daty już = current.  
2. Ręcznie: zapisać/eksportować widoczny roster → w archiwum upewnić się, że stary zakres `07-13`–`07-18` ma snapshot → wyczyścić skład nowego tygodnia / dodać od zera.  
3. Sprawdzić KV vs LS (`batch-get` vs przeglądarka) — po H3-A drift jest prawdopodobny.  
4. Biweekly: zweryfikować ręcznie wypłaty za poprzedni okres przed czyszczeniem.

---

## 7. Ryzyka planistyczne

| Ryzyko | Mitygacja |
|--------|-----------|
| Powrót REGRESSION-03 wipe | Testy 03/04 obowiązkowe w gate |
| Podwójne archiwum | Idempotentny upsert snapshot po `weekFrom|weekTo` |
| Multi-tab LS/KV | Push po rollover + istniejący pull merge |
| Over-fix cloud-sync | Trzymać zmianę w cycle + App; sync tylko jeśli DF |

---

**Koniec PLAN**
