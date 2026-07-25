# PAYROLL — Dependency Map (blast radius)

> **Cel:** pokazać przyszłemu AI, **co korzysta z Payroll**, **co od niego zależy**, i **co może go przypadkowo uszkodzić** przy pracy nad „innym” modulem.  
> **SSOT przepływu:** [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md)

```text
Reguła: jeśli plik jest Shared z Payroll CORE → traktuj jak zmianę Payroll
(AUDIT + Boundary Check + ewentualnie Gate B payroll).
```

---

## 1. Rdzeń Payroll (krytyczne)

| Warstwa | Komponenty | Uwagi |
|---------|------------|--------|
| UI | `PayrollView`, `WeekEmployeeDetail`, panele przydziałów | Wejście użytkownika |
| Domain | Handlery w `App.tsx`, `payroll-domain-sync` | Orkiestracja |
| W1 | `payroll-week-roster-bundle` (PWRB) | Skład tygodnia |
| W2 | `pushWeekEmployeesToCloud`, Domain Gate, flags | Zapis godzin |
| Merge | `cloud-sync` finalize/merge weekEmployees | Multi-device |
| Bootstrap | `CloudLoader` + resurrection fence | Cold start |
| Edge | `mergeWeekEmployeesUnion`, shrink guards | SSOT store |
| Cycle | `payroll-cycle`, rollover, archive | Week transition |
| Overlay | leaves, Soft Restore, carry-forward | Nie mylić z live hours SSOT |

---

## 2. Dane / cache (częsta pomyłka AI)

| Źródło | Rola vs Lista Płac |
|--------|-------------------|
| `kw-directory` | Kartoteka — **źródło tożsamości**; **nie** jest live godzinami |
| `kw-week-employees` | **Live roster + godziny** tygodnia (SSOT UI po merge) |
| `kw-week-employees-deleted-ids` | Tombstony składu — **para** z rosterem (PWRB) |
| `kw-week-employees-prev` | Snapshot D4 recovery — **≠** archive |
| `kw-weekFrom` / `kw-weekTo` | Zakres tygodnia |
| `kw-archive` | Zamknięte tygodnie — semantyka saved ≠ closed (20.1B) |
| `kw-employee-leaves` | Overlay nieobecności — nie zastępuje `emp.days` |
| LocalStorage mirror | Zawsze przez sync kontrakt — **nie** „wyczyść LS i będzie OK” |

**Week cycle:** ALIGN (ten sam tydzień kalendarzowy) **≠** ROLLOVER (archive + nowy tydzień). Myślenie „wyczyść roster przy każdej zmianie dat” = klasyczna regresja.

---

## 3. Co korzysta z Payroll / danych LP

| Konsument | Jak |
|-----------|-----|
| Pulpit (alerty rollover / sobota) | Odczyt blockerów / settled |
| Roboty ↔ Przydziały | `workEntries` vs godziny LP (spójność badge) — **osobne SSOT** |
| Worker „Wypłata” | Odczyt własnego tygodnia |
| Export PDF/Word LP | Snapshot godzin |
| Audit / restore banner | Predykaty archive vs `-prev` |
| Cloud backup / email | Klucze w `DATA_KEYS` |

---

## 4. Co zależy od kontraktów Payroll (nie wolno łamać „przy okazji”)

| Kontrakt | Zależni |
|----------|---------|
| Domain Push sole hours write | Każdy UI edytujący godziny |
| PWRB sole roster mutation | Add/remove employee w tygodniu |
| UNION merge + tombstones | Wszystkie urządzenia admin |
| Resurrection fence | Bootstrap na pustej chmurze |
| `#CORE-015` RS bez payroll | Auto-sync reszty domeny |

---

## 5. Moduły, które **najczęściej** przypadkowo psują Payroll

| Moduł / zmiana | Mechanizm uszkodzenia | Mitygacja |
|----------------|----------------------|-----------|
| **Tenders / heavy pipeline / persist** | Shared `cloud-sync` throttle, `DATA_KEYS`, batch-set storm, mixed commit | Boundary Check; nie ruszać payroll keys; Gate B payroll |
| **Jobs photos / assets merge** | Duże zmiany w `cloud-sync` merge helpers / bundle | Izoluj merge jobs; nie refaktoruj payroll „przy okazji” |
| **CloudLoader / bootstrap** | Kolejność apply bundle; pominięcie fence | Czytaj fence + B4 merge SSOT |
| **localStorage / storage budget / IDB** | Agresywne czyszczenie kluczy `kw-week-*` | Allowlist; nie kasuj payroll keys |
| **Theme / UI shell** | Rzadko — ryzyko mixed WT z CORE w branchu | Czysty commit scope |
| **Directory / Kadry** | Złe ID → zły add do tygodnia; nie wipe godzin samo w sobie | PWRB add path |
| **Leaves / carry** | Overlay źle zastosowany na closed week | Semantyka 20.0A/20.1B |
| **E2E seed / harness** | Seed bez parity pól; skip guardów w prod code | Tylko test harness; nie produkcyjny bypass |
| **Edge kv / batch-set „optymalizacja”** | Zmiana mset / merge union | CORE + DF + GO |
| **„Cleanup” martwego kodu** | Usunięcie „nieużywanego” guard / fence | Najpierw SSOT + grep call sites |

---

## 6. Mapa wpływu (skrót)

```text
                    ┌──────────────┐
   Tenders/Jobs ───►│ cloud-sync.ts │◄── CloudLoader
   Theme/UI shell   │  (SHARED)     │◄── Edge merge
                    └──────┬───────┘
                           │ finalize / push paths
                           ▼
                    ┌──────────────┐
                    │   PAYROLL    │  W1 PWRB · W2 Domain Push
                    │   CORE       │  fence · gate · -prev
                    └──────────────┘
                           │
              UI LP · Pulpit · Worker wypłata · Export
```

**Shared = czerwona strefa.** Zmiana Shared bez Payroll w nazwie taska ≠ bezpieczna.

---

## 7. Checklist Dependency (przed kodem w „innym” module)

```text
□ Czy diff zawiera cloud-sync / CloudLoader / Edge / App payroll handlers?
□ Czy DATA_KEYS / batch bundle obejmuje kw-week-employees*?
□ Czy commit miesza FEATURE tego modułu z CORE sync?
□ Czy Gate B --scope payroll powinien przejść przed merge?
□ Czy Owner wie, że to Shared?
```

Jeśli jakikolwiek checkbox TAK → Playbook Payroll + Guard Rails **obowiązkowe**.
