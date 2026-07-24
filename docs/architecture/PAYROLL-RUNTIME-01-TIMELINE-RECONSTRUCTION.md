# PAYROLL-RUNTIME-01 — TIMELINE RECONSTRUCTION

> **ID:** PAYROLL-RUNTIME-01  
> **STATUS:** **CLOSED** · AUDIT COMPLETE · **P0** · inputs to DF-01 · **EPIC CLOSED** ([CLOSE-01](./PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md))  
> **Owner GO:** AUDIT ONLY  
> **Data:** 2026-07-24  
> **Wejście:** FORENSICS-01 · REGRESSION-01 · INCIDENT-01/02  
> **Poza zakresem (historyczne):** implementacja · commit · push  

```text
════════════════════════════════════════════════════════
PAYROLL-RUNTIME-01 — VERDICT

Cloud write ~11:29 CEST wymagał mutacji React roster
+ domain push (W1) lub bezpośredni pwrPush (W2)
lub Worker safe-push (W10 — słabo pasuje do days).

100% reprodukcja historyczna: NIE (brak logów UI @09:29Z).
Reprodukcja klasowa: TAK (W1 / W2 na tipie 2.65.40).

Najłatwiejsza: W1 (checkbox active).
Najlepiej pasuje do 24.07: W1 (same UUID) ≈ W2 (new UUID + exact defaultDays).
════════════════════════════════════════════════════════
```

---

## 0. Kotwice czasu (INCIDENT-01)

| Czas | Zdarzenie |
|------|-----------|
| ~07:30 CEST | Piotrek: poprawne godziny (UI/local) |
| ~03:56 CEST | Deploy feature **2.65.40** (`23d7723`) — **nie** zmienia W1/W2/W10 |
| **~11:29 CEST** | `dataUpdatedAt=2026-07-24T09:29:17.795Z` · Cloud: Piotrek (+ Tomek) `active:false` · `07:00–16:00` |
| później | godziny wróciły (= **drugi** write z `active:true` / godzinami) |

**Debounce W1:** `PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS = 1000` → Cloud write ≈ **1 s po ostatniej mutacji** w serii edycji.

---

## 1. Runtime Timeline (wspólny funnel)

### W1 — field edit (godziny / `active`)

```text
Operator
  → Lista Płac → klik wiersz (Piotrek)
  → WeekEmployeeDetail → PayrollDayEditor
  → Checkbox „active” OFF (× dzień)  LUB  zmiana from/to
  → onPatchDay / updateWeekEmployeeDay
  → setWeekEmployees (+ dataUpdatedAt=now)
  → commitLivePayrollRosterEdit
  → schedulePayrollDomainPush (debounce 1s)
  → persistPayrollRoster
  → pwrPush({ skipPayrollGuard: true })
  → pushWeekEmployeesToCloud
  → batch-set + replaceWeekEmployeesKeys
  → Cloud KV SSOT
```

**Nie jest to klasyczny „Reducer/Store”** — React state w `App` + LS + domain push.

### W2 — add / re-add z kartoteki

```text
Operator
  → Lista Płac → Usuń (confirm)  [opcjonalnie]
  → Dodaj pracownika / Dodaj zaznaczonych / „Dodaj aktywnych…”
     ALBO  „Odśwież skład” (= replace all)
  → addFromDirectory / replaceWeekWithAllActive
  → weekEmployeeFromDir → days: defaultDays()  // active:false, 07:00–16:00
  → setWeekEmployees
  → pwrPush (natychmiast, BEZ debounce domain schedule)
  → batch-set
  → Cloud
```

### W10 — Worker panel

```text
Worker
  → WorkerPhotoView → paragon / usuń koszt
  → syncWeekEmployees (tylko extraCosts)
  → localStorage kw-week-employees
  → pushKeysToCloudSafe(["kw-week-employees"], …)
  → batch-set (merge-safe; typowo BEZ replaceWeekEmployeesKeys admin)
```

**W10 nie edytuje `day.active` / godzin dnia.** Sam nie wytwarza fingerprintu `defaultDay` na days.

---

## 2. User Action Matrix

| UI akcja | Label w UI | Funkcja | Factory `defaultDay`? | Write Cloud | Pasuje do 2 osób 0h / 12 OK? |
|----------|------------|---------|----------------------|-------------|------------------------------|
| Toggle dnia | Checkbox w detail | **W1** `updateWeekEmployeeDay` | Nie (zachowuje from/to; często już 07–16) | domain push 1s | **TAK** (edycja 1–2 osób) |
| Zmiana godzin | time inputs | **W1** | Nie | domain push | TAK (0h tylko jeśli inactive lub from=to) |
| Usuń osobę | „Usuń” + confirm | `removeWeekEmployee` | — | `pwrRemove` | Usuwa rekord — **nie** ten fingerprint |
| Dodaj z pickera | „Dodaj zaznaczonych” | **W2** `addFromDirectory` | **TAK** `weekEmployeeFromDir` | `pwrPush` od razu | **TAK** jeśli remove+re-add Piotra/Tomka |
| Dodaj wszystkich brakujących | przycisk UserPlus | **W2** | **TAK** | `pwrPush` | Tylko nowi — **nie** resetuje istniejących |
| **Odśwież skład** | „Odśwież skład (N)” + confirm | **W2-all** `replaceWeekWithAllActive` | **TAK** dla **wszystkich** | `pwrPush` | **NIE** — wyzerowałby 14/14 |
| Wyczyść skład | clear all + confirm | `clearAllWeekEmployees` | — | `persistPayrollRoster([])` | **NIE** — roster `[]` |
| Kopiuj z ost. tygodnia | `copyFromLastWeek` | **W2** add | **TAK** dla **nowych** | `pwrPush` | Nie resetuje już obecnych |
| Sync stawek z kartoteki | sync rates | **W1-like** rates only | **NIE** days | domain push | **NIE** (0h) |
| Symulacja wypłaty | checkbox symulacji | UI only | Nie | **brak** | Nie |
| Worker paragon | panel pracownika | **W10** | Nie days | `pushKeysToCloudSafe` | **NIE** generuje inactive days |
| F5 / focus / autosync | — | pull / RS | — | **bez** payroll set (S1-1) | Samo **nie** |

### Czy kończy się `weekEmployeeFromDir` → `defaultDay` → `pwrPush`?

| Akcja | Tak? |
|-------|------|
| Odśwież skład | **TAK** (cały skład) |
| Usuń + dodaj ponownie | **TAK** (ta osoba) |
| Dodaj z pickera / dodaj aktywnych brakujących | **TAK** (tylko nowi) |
| Kopiuj z ostatniego tygodnia | **TAK** (tylko brakujący z poprzedniego) |
| Toggle active / edycja godzin | **NIE** (W1; może wyglądać jak defaultDay jeśli times=07–16) |
| Sync katalogu stawek | **NIE** |
| Zmiana tygodnia / rollover | pusty `[]` / archive — **nie** ten wzorzec partial |

---

## 3. Reproduction Matrix (W1 / W2 / W10)

### W1 — Day active OFF

| Pytanie | Odpowiedź |
|---------|-----------|
| Minimalne kliknięcia | Lista Płac → Piotrek → **6×** checkbox OFF (Pn–So) [+ ewentualnie Tomek] |
| Dane wejściowe | Live week otwarty; emp w `weekEmployees`; nie closed week |
| 2 urządzenia? | **Nie** do zapisu; 2. urządzenie tylko do **obserwacji** po pull |
| Refresh / autosync / bootstrap / merge? | **Nie wymagane** do wipe; służą do **rozpropagowania** 0h |
| Generuje `active=false`? | **TAK** |
| Generuje `defaultDay()` factory? | **Nie** wywołuje factory; **wygląd** Cloud może być identyczny (times zostają) |
| Generuje 0h? | **TAK** (`hoursWorked` liczy tylko `active`) |
| Bez świadomego działania? | **Częściowo:** 1 przypadkowy klik możliwy; **6 dni × 2 osoby** ≈ świadome / dłuższa sesja |
| Debounce | Ostatni toggle + **~1 s** → `batch-set` |

### W2 — Remove + re-add

| Pytanie | Odpowiedź |
|---------|-----------|
| Minimalne kliknięcia | Usuń (confirm) → Dodaj pracownika → zaznacz → Dodaj |
| Dane wejściowe | Osoba w kartotece `active`; `directoryId` wolny po remove |
| 2 urządzenia / refresh / bootstrap? | **Nie** |
| Exact `defaultDay()`? | **TAK** — `weekEmployeeFromDir` → `defaultDays()` |
| 0h / active=false? | **TAK** natychmiast |
| Side effect | **Nowy `id` (UUID)** — dyskryminator vs W1 |
| Bez świadomości? | **NIE** — confirm + picker |
| „Odśwież skład” | Też W2-factory, ale **wszyscy** → **wykluczone** przez evidence 12/14 |

### W10 — Worker

| Pytanie | Odpowiedź |
|---------|-----------|
| Minimalne kliknięcia | Paragon / usuń koszt |
| Zmienia days? | **NIE** |
| Może wypchnąć już zepsuty local roster? | Teoretycznie, jeśli local był już 0h — **nie generuje** defaultDay |
| Pasuje do 24.07? | **SŁABO** jako generator fingerprintu |

---

## 4. Runtime Timeline — scenariusz 24.07 (hipotetyczny, zgodny z faktami)

```text
~07:30  Admin/telefon: Piotrek 45h widoczne (Cloud jeszcze bogaty LUB local ahead)
   │
   │  … kilka godzin bez udokumentowanego write …
   │
~11:28  Operator na Admin LP (najpewniej 1 urządzenie):
        A) W1: odznacza dni Piotra (± Tomka)
           LUB
        B) W2: usuwa i dodaje Piotra (± Tomka) → defaultDays
   │
~11:29  dataUpdatedAt stamp · pwrPush / domain push · batch-set
        Cloud SSOT = inactive + 07:00–16:00
        *-prev rotacja tym samym stanem
   │
        Telefon / 2. ekran: jeszcze stale local → potem pull → 0h
   │
później  Operator (lub inny write) przywraca active/godziny → 2. push
```

**Nie wymagane:** drugi device do *wytworzenia* wipe, F5, autosync, bootstrap, Cloud merge jako *przyczyna*.  
**Wymagane do multi-device symptomu:** późniejszy pull na drugim urządzeniu.

---

## 5. Ranking scenariuszy

| Rank | Scenariusz | P vs 24.07 | Łatwość repro | Dlaczego |
|------|------------|------------|---------------|----------|
| **1** | **W1** — odznaczenie dni (Piotrek ± Tomek) | **HIGH** | **Najwyższa** | Partial roster; ten sam emp `id`; times często 07–16; 1s debounce |
| **2** | **W2** — remove + re-add 1–2 osób | **HIGH** | Wysoka | Exact `defaultDay()`; require confirm; **nowy UUID** |
| **3** | W1 na dwóch osobach w jednej sesji (seria editów, jeden stamp) | **MED–HIGH** | Wysoka | Jeden `dataUpdatedAt` możliwy po ostatnim commit w batchu React… *uwaga:* każdy emp dostaje własny `dataUpdatedAt=now` przy swojej mutacji — porównać stamp Tomka |
| **4** | W10 jako generator | **LOW** | — | Nie rusza days |
| **5** | Odśwież skład / clear all / rollover | **VERY LOW** | — | Nie pasuje do 12/14 |

### Dyskryminator Owner (bez kodu)

| Jeśli… | To raczej… |
|--------|------------|
| `id` Piotra **ten sam** przed i po (jeśli jest snapshot ~07:30) | **W1** |
| `id` Piotra **zmieniony** po incydencie | **W2** |
| Stamp `dataUpdatedAt` Tomka **=** Piotra | Jedna sesja push / bliskie edycje |
| Stamp Tomka **inny** | Dwie osobne mutacje |

*(Obecny AUDIT ma UUID **po** wipe — bez morning UUID nie rozstrzygamy W1 vs W2 w 100%.)*

---

## 6. Najbardziej prawdopodobny Runtime RC

```text
RUNTIME RC (working):
  Jedno urządzenie Admin → Lista Płac → mutacja days Piotra (± Tomka)
  ścieżką W1 (checkbox active) LUB W2 (re-add → weekEmployeeFromDir)
  → pwrPush / domain push ~11:29 CEST
  → Cloud przyjął poprawny technicznie payload inactive/defaultDay.

NIE: nowy deploy, CORS, Edge bug, sam F5/autosync, „Odśwież skład” (all).
```

---

## 7. Odpowiedzi Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Najłatwiejsza do odtworzenia? | **W1** — detail → odznacz dni |
| 2 | Najbardziej pasuje do 24.07? | **W1 ≈ W2** (partial); rozstrzygnięcie UUID |
| 3 | 100% reprodukcja historyczna? | **NIE** (brak logów UI/Edge body @09:29Z). **TAK** reprodukcja **klasowa** na prod tip |
| 4 | Co zrobić bez zmiany kodu? | §8 poniżej |

---

## 8. Plan reprodukcji / weryfikacji Owner (bez implementacji)

### A. Klasowa reprodukcja (sandbox / nieprod lub świadomy test)

1. Tip **2.65.40**.  
2. Osoba testowa z godzinami `active:true`.  
3. **Test W1:** odznacz wszystkie dni → po ~1s sprawdź Cloud `batch-get` / UI innego urządzenia.  
4. **Test W2:** usuń + dodaj z kartoteki → potwierdź `defaultDays` + **nowy** `id`.  
5. **Kontrola negatywna:** F5 / focus sync **bez** edycji → roster **nie** powinien spaść do 0h.

### B. Hipoteza 24.07 (śledztwo, nie kod)

1. Kto był na LP ~11:25–11:35 CEST?  
2. Czy ktoś klikał **Usuń / Dodaj / Odśwież skład**?  
3. Porównać `dataUpdatedAt` Tomka vs Piotra (jeśli jeszcze w KV / `-prev` historii).  
4. Szukać lokalnego HAR / DevTools Network `batch-set` z tego okna (jeśli zachowany).  
5. **Nie** włączać diag na prod bez GO (REGRESSION: default OFF).

### C. Po „powrocie godzin”

Ustalić, czy był świadomy re-edit (W1 ON) — to potwierdza, że write path działa w obie strony.

---

## 9. Owner Readiness

```text
OWNER READINESS: RUNTIME AUDIT COMPLETE

Next (Owner GO only):
  A) Klasowa repro W1 vs W2 (sandbox)
  B) Operator timeline 11:25–11:35
  C) UUID / dual-stamp discriminator

Forbidden: implement · commit · push
```

---

## 10. Raport końcowy (Owner card)

1. **Runtime Timeline** — §1 / §4  
2. **User Action Matrix** — §2  
3. **Reproduction Matrix** — §3  
4. **Ranking** — W1 ≥ W2 ≫ W10; Odśwież skład wykluczony  
5. **Runtime RC** — Admin LP mutacja days → domain/`pwrPush` @ ~11:29  
6. **Plan** — §8 (bez kodu)  
7. **Owner Readiness** — COMPLETE · AUDIT ONLY  
