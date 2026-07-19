# PAYROLL-CLOUD-RESURRECTION-01 — WRITE TRACE

> **AUDIT ONLY** · rekonstrukcja zapisu (brak pełnych logów Edge requestId w tym audycie)  
> Cel: dla zapisu przywracającego klon — kto / skąd / dlaczego

---

## Zapis #1 — pierwotny klon archive 20–25 (kontekst)

| Pole | Wartość |
|------|---------|
| timestamp | `2026-07-19T21:39:05.077Z` (`savedAt` snapshota) |
| target | `kw-archive` week 20–25 |
| payload | `weekEmployees` ≡ 13–18 (100%) |
| sourceFunction (inferred) | client archive upsert / „Zapisz tydzień” na zmislabelowanym live |
| source device/session | nieznane (pre-recovery) |
| payload hash (logical) | fingerprint roster = fingerprint 13–18 · KPI 587 |
| reason | buggy align → live=klon → zapis do archiwum pod nową etykietą |

---

## Zapis #2 — DATA RECOVERY clear (intencjonalny)

| Pole | Wartość |
|------|---------|
| timestamp | `2026-07-19T22:07:39.529Z` |
| target | `kw-week-employees=[]` · `kw-archive` bez 20–25 · keys 20–25 |
| sourceFunction | `.tmp/payroll-data-recovery-01.mjs` → Edge `batch-set` + `replaceWeekEmployeesKeys` |
| source device/session | agent recovery Playwright + Edge API (Owner GO) |
| payload hash | empty live · archive weeks 10→9 |
| reason | Owner GO DATA RECOVERY |
| verified | KV liveN=0 · no 20–25 · UI rows=0 |

---

## Zapis #3 — RESURRECTION (incydent)

| Pole | Wartość |
|------|---------|
| timestamp | **≤ `2026-07-19T22:15:18.374Z`** (pierwszy ponowny odczyt 14/587); okno start **> 22:07:39Z** |
| target | `kw-week-employees` (14/587) **oraz** `kw-archive` + snap 20–25 |
| sourceFunction (inferred) | **`CloudLoader` bootstrap → `pushKeysToCloud`** z `replaceWeekEmployeesKeys: ["kw-week-employees"]` (+ push `kw-archive` jeśli w `pushKeys`) |
| source device/session | **Inna sesja przeglądarki / urządzenie** z LS sprzed recovery (nie sesja recovery, która ustawiła LS=[]) |
| payload hash (logical) | live fingerprint ≡ 13–18; archive 20–25 **`id=b7acb87d-733d-4e4a-8042-9c5cf67c3462`** · **`savedAt=2026-07-19T21:39:05.077Z`** (obiekt sprzed clear) |
| reason | `bootstrapMergedShouldPush`: cloudEmpty+localRich **lub** richnessIncreased; merge wybrał local / zachował local-only archive week |

### Łańcuch wywołań (kod)

```text
CloudLoader (mount / reload)
  → batch-get CORE
  → mergeAllDataKeys (mergeArchive zachowuje local 20–25)
  → applyBootstrapPayrollMerge / mergeWeekEmployeesForWeekRange
       (pick local gdy cloud empty XOR hasArchivedWeek → union 14)
  → bootstrapMergedShouldPush(kw-week-employees) === true
  → bootstrapMergedShouldPush(kw-archive) === true (jeśli różnica)
  → void pushKeysToCloud(pushKeys…, {
        replaceWeekEmployeesKeys: ["kw-week-employees"]
     })
  → Edge batch-set
       forceReplaceWeekEmployees → zapisuje 14
       kw-archive → mset / ewentualnie mergeArchiveUnion
```

### Czego brak w trace (limit audytu)

| Brak | Skutek |
|------|--------|
| Edge access log / requestId dla 22:07–22:15 | nie ma twardego IP/User-Agent |
| `__WG_PAYROLL_WRITE_TRACE__` z sesji sprawcy | nie przechwycono |

Mimo to **payload identity** (ten sam archive `id`/`savedAt`) + **bootstrap write path** wystarczają do klasyfikacji A+B+C.

---

## Macierz źródeł vs zapis #3

| Źródło | Rola w zapisie #3 |
|--------|-------------------|
| Browser push (bootstrap) | **TAK — wykonawca HTTP** |
| Background sync (CloudLoader void push) | **TAK — pojazd** |
| Bootstrap merge | **TAK — składa payload** |
| CloudLoader | **TAK — orchestrator** |
| mergeArchive / mergeWeekEmployees* | **TAK — treść payloadu** |
| auto sync interval App payroll cycle | mało prawdopodobne jako generator 14 z pustego (nie tworzy rosteru) |
| Edge Functions | **receiver**; forceReplace / union |
| Inne aktywne sesje | **TAK — PRIMARY nośnik starego LS** |

---

## Status

```text
WRITE TRACE COMPLETE (reconstructed)
HARD DEVICE ID: UNKNOWN (no Edge access logs in scope)
LOGICAL SOURCE: stale-client CloudLoader bootstrap push
```
