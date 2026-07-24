# PAYROLL-FORENSICS-01 — DOMAIN WRITE PATH AUDIT

> **ID:** PAYROLL-FORENSICS-01  
> **STATUS:** AUDIT COMPLETE · **P0**  
> **Owner GO:** AUDIT ONLY  
> **Data:** 2026-07-24  
> **Wejście:** [`PAYROLL-INCIDENT-01-AUDIT.md`](./PAYROLL-INCIDENT-01-AUDIT.md) · [`PAYROLL-INCIDENT-02-CORS-EDGE-AUDIT.md`](./PAYROLL-INCIDENT-02-CORS-EDGE-AUDIT.md)  
> **Poza zakresem:** implementacja · commit · push · zmiany kodu  
> **Evidence Cloud (01):** Piotrek `active:false` + `07:00–16:00` (= `defaultDay`) · `dataUpdatedAt=2026-07-24T09:29:17.795Z` · Tomek też 0h · 12/14 z godzinami

```text
══════════════════════════════════════
PAYROLL-FORENSICS-01 DOMAIN WRITE PATHS

SSOT hours write → Cloud:
  schedulePayrollDomainPush / pwrPush / pushWeekEmployeesToCloud
  → batch-set + replaceWeekEmployeesKeys
  (RS runCloudSync NIE pushuje payroll)

defaultDay factory: weekEmployeeFromDir / stripWeekEmployeeHours
Dominant H for 01: UI field edit OR remove+re-add OR Worker path
══════════════════════════════════════
```

---

## 0. Architektura zapisu (SSOT)

**Nie istnieją** osobne: `PayrollStore` / `PayrollRepository` / `TimeEntries`.  
Live godziny = React `weekEmployees` + LS `kw-week-employees` + Cloud KV.

```text
                    ┌─────────────────────┐
                    │  UI Lista Płac /    │
                    │  WorkerPhotoView    │
                    └─────────┬───────────┘
                              │ mutate WeekEmployee[]
                              ▼
              commitLivePayrollRosterEdit / pwrPush / persistPayrollRoster
                              │
                              ▼
              schedulePayrollDomainPush (debounce 1s) ──┐
                              │                         │
                              ▼                         ▼
                    persistPayrollRoster ←── bindPayrollDomainPushHandler
                              │
                              ▼
                         pwrPush(...)
                              │
                              ▼
                 pushWeekEmployeesToCloud (normalize + LS)
                              │
                              ▼
            pushKeysToCloud([kw-week-employees, deleted], …,
                 { replaceWeekEmployeesKeys, skipPayrollGuard? })
                              │
                              ▼
                         Edge batch-set
```

**RS `runCloudSync` / `pushMergedDataBundleToCloud`:** payroll keys **WYKLUCZONE** (S1-1).  
Pull/merge może **zmienić React/LS**, ale **sam z siebie nie** robi domain `batch-set` rosteru (chyba że osobna ścieżka bootstrap push / Worker `pushKeysToCloudSafe`).

---

## 1. Wszystkie write paths → Cloud (`batch-set` roster)

| ID | Ścieżka | Entry | Auto? | `active=false` / 0h / `defaultDay` | Skip guard? |
|----|---------|-------|-------|-------------------------------------|-------------|
| **W1** | Field edit (dzień/stawka/koszty/…) | `updateWeekEmployee*` → `commitLivePayrollRosterEdit` → `schedulePayrollDomainPush` | **NIE** (UI) | **TAK** jeśli UI ustawi `active:false` lub wyczyści godziny | `skipPayrollGuard: true` w `persistPayrollRoster` |
| **W2** | Add from directory | `addFromDirectory` → `weekEmployeeFromDir` → `pwrPush` | **NIE** | **TAK** — nowy emp = **`defaultDays()`** (wszystkie inactive) | true |
| **W3** | Remove employee | `removeWeekEmployee` → `pwrRemove` | **NIE** | Usuwa osobę (nie ten wzorzec 0h+rekord) | — |
| **W4** | Clear all roster | `clearAllWeekEmployees` → `persistPayrollRoster([])` | **NIE** | Cały `[]` — **nie** pasuje do 01 (14 osób) | true |
| **W5** | Replace all from directory | `replaceWeekWithAllActive` → `weekEmployeeFromDir` × N → `pwrPush` | **NIE** | **TAK** — **wszyscy** na `defaultDays()` | true |
| **W6** | Restore from cloud backup | `restoreCloudPayrollBackup` → merge → `pwrPush` | **NIE** (Owner) | Możliwe jeśli prev slot już 0h | true |
| **W7** | Restore week from archive UI | `restoreWeekFromArchive` → set + ? | **NIE** | Zależnie od snap | — |
| **W8** | Rollover / goToCurrent | `autoArchiveAndAdvance` → `pushPayrollWeekAfterRollover([], …)` | **Częściowo auto** (timer Nd/Pn) | Live → **`[]`** + nowy tydzień pusty — **nie** pasuje do 01 | true |
| **W9** | Bootstrap push | `CloudLoader` → `pushKeysToCloud` + `replaceWeekEmployeesKeys` | **TAK** (start) | Jeśli merged już stripped/empty/fence | bez skipPayrollGuard domyślnie (guard może blokować shrink) |
| **W10** | Worker panel sync | `WorkerPhotoView.syncWeekEmployees` → `pushKeysToCloudSafe(["kw-week-employees"])` | **NIE** (worker UI) | **TAK** jeśli worker zapisze inactive days | Safe path (merge), **może bez** `replaceWeekEmployeesKeys` |
| **W11** | Import / file restore paths w App | import JSON → set + push | **NIE** | Zależnie od pliku | — |
| **W12** | Sync rates from directory | `syncWeekRatesFromDirectory` → `commitLivePayrollRosterEdit` | **NIE** | Zwykle **nie** zmienia days (tylko rate) | via W1 |

**Ile ścieżek zapisu Payroll → Cloud?**  
**~12 klas** (W1–W12); **dominujący mechanizm produkcyjny godzin** = **W1** (debounced domain push).

---

## 2. Diagram call chain (główne)

### 2.1 W1 — edycja pól (najczęstsza dla godzin)

```text
WeekEmployeeDetail / PayrollView (toggle day.active / times)
  → updateWeekEmployeeDay / updateWeekEmployee
  → runPayrollWeekEmployeeFieldEdit
  → setWeekEmployees(+ dataUpdatedAt=now)
  → commitLivePayrollRosterEdit
  → schedulePayrollDomainPush (1s)
  → persistPayrollRoster
  → pwrPush({ skipPayrollGuard: true })
  → pushWeekEmployeesToCloud
  → batch-set (replaceWeekEmployeesKeys)
```

**Warunek:** użytkownik (lub zautomatyzowany UI event) zmienia days.  
**Może `active=false`:** TAK (toggle).  
**Może 0h:** TAK.  
**Używa `defaultDay()`:** UI często merguje `{...defaultDay(), ...d}` przy normalizacji wyświetlania (`WeekEmployeeDetail`).

### 2.2 W2 / W5 — factory `defaultDays()`

```text
weekEmployeeFromDir(dir)
  → days: defaultDays()   // EVERY day = { active:false, from:"07:00", to:"16:00" }
  → addFromDirectory / replaceWeekWithAllActive
  → pwrPush
  → batch-set
```

**Dokładny fingerprint INCIDENT-01** (inactive + 07:00–16:00).  
**W5** wyzerowałby **cały** skład → słabo vs 12 osób z godzinami.  
**W2** (remove+re-add Piotra / Tomka) → **silne** vs evidence.

### 2.3 W8 — nowy tydzień z pustym rosterem

```text
tryPayrollWeekCycle / goToCurrent
  → autoArchiveAndAdvance
  → archive old snapshot
  → setWeekEmployees([])
  → pushPayrollWeekAfterRollover(employees: [])
  → batch-set empty + week keys
```

**Nie** tworzy `defaultDay` per employee w live — tworzy **pustą listę**.  
Kolejne **Add all** (W5) dopiero wypełnia `defaultDays()`.

### 2.4 W9 — bootstrap

```text
CloudLoader fetch batch-get
  → mergeAllDataKeys → finalizePayrollBundleMerge (± fence)
  → optional pushKeysToCloud(replaceWeekEmployeesKeys)
```

**Auto:** TAK.  
**Może wypchnąć 0h:** tylko jeśli **merged** już ma stripped/empty/fence wynik.  
**Nie generuje** sam z siebie `defaultDay` per wybranych 2 osób przy bogatym local 45h (chyba że strip całego rosteru przy mismatch week — wtedy **wszyscy** stripped).

### 2.5 Strip path (merge → potem ktoś pushuje)

```text
mergeWeekEmployeesForWeekRange
  → if both sides "match" week but !hasArchivedWeek
  → stripWeekEmployeeHoursList(roster)  // defaultPayrollDays()
```

To jest **merge (odczyt)**, nie write. Write następuje dopiero gdy wynik trafi do **W9 bootstrap push** lub późniejszy **W1** z tym stanem w React.

---

## 3. Które generują `active=false` / 0h / `defaultDay`?

| Generator | Gdzie | Typ |
|-----------|-------|-----|
| `defaultDay()` / `defaultDays()` | `app-domain.ts` | Factory nowego emp / UI normalize |
| `defaultPayrollDay(s)()` | `cloud-sync.ts` | Duplikat factory dla strip (ZERO DUPLICATE concern, nie osobna semantyka) |
| `stripWeekEmployeeHours` | merge sanitize | Cały emp → inactive defaults |
| UI toggle `day.active` | W1 | Świadome / przypadkowe odznaczenie |
| `weekEmployeeFromDir` | W2/W5 | **Zawsze** start od inactive defaults |
| Fence / `[]` rollover | W8/W9 | Pusty roster, nie defaultDay rows |

---

## 4. Które działają automatycznie (bez kliknięcia)?

| Path | Auto? | Trigger |
|------|-------|---------|
| W1 domain push | **Nie** (wymaga mutacji React) | Po UI edit |
| W8 rollover | **Tak** (timer / Nd≥20 / go) | Kalendarz — **piątek ~11:29 nie typowy** |
| W9 bootstrap push | **Tak** | F5 / cold start |
| Pull `applyAdminDataBundle` | Auto odczyt | **Bez** domain push |
| `runCloudSync` RS | Auto | **Bez** payroll set |

**Wniosek:** sam autosync/focus **nie** wypycha godzin. Auto write Cloud = głównie **bootstrap push** lub **rollover**.  
Incydent 01 (2 osoby, defaultDay rows, midday) **najlepiej** tłumaczy **W1 lub W2**, nie W8.

---

## 5. Ranking vs PAYROLL-INCIDENT-01

| Rank | Hipoteza write path | P | Dlaczego |
|------|---------------------|---|----------|
| **1** | **W1** — UI odznaczyło dni / wyczyściło aktywność Piotra (+ Tomka), `dataUpdatedAt=09:29Z`, domain push | **HIGH** | Pasuje stamp, 2 osoby, reszta OK, wzorzec inactive+times |
| **2** | **W2** — remove + re-add z kartoteki (`weekEmployeeFromDir` = exact defaultDay) | **HIGH** | Identyczny fingerprint Cloud; wymaga akcji operatora |
| **3** | **W10** Worker panel zapisał days inactive | **MED** | Osobny push path; mniej typowy dla admin LP |
| **4** | **W9** bootstrap push po strip/fence | **LOW–MED** | Strip zwykle **cały** roster; fence → `[]`; tip midday deploy docs nie tłumaczy |
| **5** | **W5** replace all | **LOW** | Wyzerowałby wszystkich |
| **6** | **W8** rollover empty | **VERY LOW** | Live count 14 ≠ `[]` |
| **7** | CORS / backup-status | **NONE** | INCIDENT-02 |

### Dominująca hipoteza

**TAK — jedna klasa:**  
**Domain push (`pwrPush` / `schedulePayrollDomainPush`) wypchnął live roster, w którym Piotrek (i Tomek) mieli days = `defaultDay` / `active:false`.**

Nie rozstrzygnięte bez logów UI: **ręczne odznaczenie (W1)** vs **re-add z directory (W2)**.

Powrót godzin później ⇒ **kolejny W1** (lub restore) z `active:true` / godzinami — osobny write po 09:29Z.

---

## 6. Miejsca wymagające instrumentacji (bez implementacji — lista)

| # | Miejsce | Co logować |
|---|---------|------------|
| I1 | `schedulePayrollDomainPush` / `flushPayrollDomainPush` | roster fingerprint per emp (activeDays, hours, directoryId), caller stack |
| I2 | `persistPayrollRoster` / `pwrPush` | `skipPayrollGuard`, weekFrom/To, count, sample Piotrek days |
| I3 | `weekEmployeeFromDir` | emit gdy tworzy defaultDays |
| I4 | `updateWeekEmployeeDay` | empId, dayKey, nextDay.active, before/after hours |
| I5 | `addFromDirectory` / `replaceWeekWithAllActive` / `clearAllWeekEmployees` | jawny event |
| I6 | `CloudLoader` bootstrap push | gdy `replaceWeekEmployeesKeys` + emp payload summary |
| I7 | `WorkerPhotoView.syncWeekEmployees` | czy w ogóle hit w oknie incydentu |
| I8 | Edge `batch-set` payroll | requestId, forceReplace, emp count, richness (ops log) |

Istniejące (diag): `__WG_PAYROLL_*` traces, `payrollTraceEmit` — **włączyć na tip tylko po Owner GO**.

---

## 7. Minimalny plan diagnostyczny (bez implementacji)

1. **Potwierdzić** czy w oknie ~11:29 CEST ktoś otwierał LP / Worker / „dodaj z kartoteki” / „zastąp skład”.  
2. **HAR / payrollTrace** (jeśli dostępny) wokół `payroll.roster.ui.*` vs `payroll.roster.push`.  
3. Porównać `dataUpdatedAt` Tomka z Piotra (ten sam stamp? → jedna mutacja batch).  
4. Sprawdzić, czy po „powrocie godzin” jest nowszy `dataUpdatedAt` (drugi write).  
5. **Nie** instrumentować Edge CORS; fokus = **W1/W2 callers**.

---

## 8. Odpowiedzi Ownera

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Ile ścieżek zapisu? | **~12 klas (W1–W12)**; SSOT Cloud = domain `pwrPush` / bootstrap replace / Worker safe |
| 2 | Które → `active=false`? | **W1, W2, W5, strip→W9, W10** |
| 3 | Które → 0h? | Te same (+ W4/W8 jako pusty roster) |
| 4 | Które auto? | **W8, W9** (+ timer); **nie** W1 bez mutacji |
| 5 | Najbardziej prawdopodobna dla 01? | **W1 lub W2** → domain push @ 09:29Z |
| 6 | Jedna dominująca hipoteza? | **TAK:** domain write z `defaultDay`/inactive days dla 1–2 osób |

---

## 9. Owner Readiness

```text
OWNER READINESS: FORENSICS AUDIT COMPLETE

Next (Owner GO only):
  A) Confirm operator actions ~11:29 (edit days vs re-add)
  B) Enable read-only payroll write tracing on next recurrence
  C) Recovery design if hours regress again

Forbidden: implement · commit · push
```

---

## 10. Raport końcowy (Owner card)

### 1. Write paths
**W1–W12** — dominuje `commitLivePayrollRosterEdit` → `schedulePayrollDomainPush` → `pwrPush` → `batch-set`.

### 2. Call chain
Diagram §0 / §2.

### 3. Potencjalne RC
W1 toggle/clear · W2 re-add `weekEmployeeFromDir` · (słabiej) W10 / W9 strip.

### 4. Ranking
**W1 ≈ W2 HIGH** · W10 MED · W9 LOW–MED · W5/W8 LOW.

### 5. Instrumentacja
I1–I8 (§6) — focus domain push + `weekEmployeeFromDir` + day edits.

### 6. Plan diagnostyczny
§7 — bez kodu; operator timeline + trace.

### 7. Owner Readiness
**READY FOR OWNER DECISION (still AUDIT)** — bez implementacji.
