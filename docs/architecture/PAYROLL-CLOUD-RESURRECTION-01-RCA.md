# PAYROLL-CLOUD-RESURRECTION-01 — RCA

> **Incident:** PAYROLL-CLOUD-RESURRECTION-01  
> **Status:** AUDIT + RCA · **NIE implementować** bez Owner GO  
> **Data:** 2026-07-20  
> **Wejście:** PAYROLL-DATA-RECOVERY-01 (sukces) → Cloud KV znowu 14/587 + archive 20–25 klon  
> **Powiązane:** [`PAYROLL-DATA-RECOVERY-01-DATA-SOURCE-TRACE.md`](./PAYROLL-DATA-RECOVERY-01-DATA-SOURCE-TRACE.md) · [`PAYROLL-DATA-RECOVERY-01-ARCHIVE-FORENSICS.md`](./PAYROLL-DATA-RECOVERY-01-ARCHIVE-FORENSICS.md)

---

## 1. Objaw

| Po recovery (T0) | Później (T1) |
|------------------|--------------|
| live roster = **0** | live = **14 / 587 h** |
| archive 20–25 **usunięte** | archive 20–25 = **100% kopia** 13–18 |
| UI = KV (puste) | UI = KV (klon) |

Owner: recovery **nie** cofnięte ręcznie w UI.  
Źródło: **nowy zapis do Cloud KV**.

---

## 2. Werdykt (jednoznacznie)

```text
KTO PRZYWRÓCIŁ:

A) Inny klient / sesja ze STARYM LocalStorage (pre-recovery)
   + automatyczny CloudLoader bootstrap push

Mechanizm wspomagający:
B) merge (mergeWeekEmployeesForWeekRange + mergeArchive)
C) background/bootstrap sync (void pushKeysToCloud po bootstrap)
D) Edge — AKCEPTUJE forceReplace / mergeArchiveUnion (nie wymyśla danych sam)

NIE:
E) autonomiczny cron Edge bez payloadu klienta
NIE: Owner kliknął „cofnij recovery” w UI
```

**Primary class: A**  
**Mechanism class: A → B → C → (D accepts write)**

---

## 3. Root cause (łańcuch przyczynowy)

### RC-1 (PRIMARY) — Stale-client bootstrap re-seed

Po udanym recovery Cloud był pusty (`live=[]`, bez 20–25).  
Inna **aktywna sesja** (druga karta, telefon, laptop, ten sam profil z LS sprzed clear) nadal miała w LocalStorage:

- `kw-week-employees` = 14 / 587  
- `kw-archive` zawierające snapshot 20–25 (`id=b7acb87d-…`, `savedAt=21:39:05Z`)

Przy starcie / odświeżeniu **CloudLoader**:

1. `batch-get` → cloud empty (lub bez 20–25)  
2. `mergeAllDataKeys` + `applyBootstrapPayrollMerge` / `mergeWeekEmployeesForWeekRange`  
3. **Wynik merge = bogaty local**  
4. `bootstrapMergedShouldPush` = true (`cloudEmpty && hasRealData` **lub** `richnessIncreased`)  
5. `pushKeysToCloud(..., { replaceWeekEmployeesKeys: ["kw-week-employees"] })`  
6. Cloud znowu = 14; archive 20–25 wraca z local merge

### RC-2 — `mergeWeekEmployeesForWeekRange` preferuje niepustą stronę

```text
localMatch && cloudMatch
  && !hasArchivedWeek
  && (localEmpty XOR cloudEmpty)
  → return localEmpty ? cloud : local   // pick NON-empty
```

Po recovery: cloud empty, local 14, brak archive 20–25 → **pick local**.  
To chroni przed „pustą chmurą kasującą godziny”, ale **niszczy intencjonalny clear** recovery.

Gdy local archive już ma 20–25: `hasArchivedWeek=true` → `mergeWeekEmployees(local, cloud)` = UNION → i tak **14**.

### RC-3 — `mergeArchive` zachowuje tygodnie tylko-lokalne

Local ma 20–25, cloud nie → wynik merge **zawiera** local snapshot (ten sam `id`/`savedAt`) → push archiwum przywraca klon 1:1.

### RC-4 — Bootstrap `replaceWeekEmployeesKeys` omija Edge shrink guard

Push z bootstrapem wymusza `forceReplaceWeekEmployees` → Edge **nie** blokuje 0→14 jako „suspicious shrink reverse”; zapisuje payload klienta.

### RC-5 — Edge `mergeArchiveUnion` (wtórne)

Jeśli klient wypchnie archiwum **bez** 20–25, a Edge uzna shrink → union z `prev` może przywrócić bogatszy 20–25.  
W tym incydencie dowód `id`+`savedAt` zgodny też z **bezpośrednim re-pushem local snapshotu** (RC-3) — Edge sam nie startował bez klienta.

---

## 4. Odpowiedzi na pytania Ownera

| Pytanie | Odpowiedź |
|---------|-----------|
| Kto przywrócił archive 20–25 i live? | **Klient ze starym LS** (sesja ≠ sesja recovery), przez **CloudLoader bootstrap push** |
| A inny klient? | **TAK — PRIMARY** |
| B merge? | **TAK — mechanizm wyboru/scalania danych** |
| C background sync? | **TAK — pojazd zapisu** (bootstrap auto-push, niekoniecznie „Zapisz tydzień”) |
| D Edge? | **Wspólnik** (przyjmuje forceReplace / ewentualnie union) — **nie generator** |
| E inny? | Nie stwierdzono autonomicznego restore cron |

---

## 5. Dlaczego to nie „UI cofnęło recovery”

- Recovery i FINAL VERIFICATION potwierdziły KV=0.  
- Przywrócony archive 20–25 ma **identyczne** `id` + `savedAt` sprzed recovery → obiekt ze starego LS/merge, nie nowa edycja Ownera.  
- Okno: recovery **22:07:39Z** → trace znowu 14 już **22:15:18Z** (~8 min) — typowe dla **drugiej sesji / reload**, nie ręcznej edycji godzin.

---

## 6. Pliki dowodowe (kod)

| Element | Plik |
|---------|------|
| Bootstrap push + `replaceWeekEmployeesKeys` | `CloudLoader.tsx` ~306–330 |
| `bootstrapMergedShouldPush` | `cloud-sync.ts` ~2479–2494 |
| pick non-empty side | `mergeWeekEmployeesForWeekRange` ~1877–1896 |
| archive keep local-only weeks | `mergeArchive` ~1644–1654 |
| Edge forceReplace / archive union | `make-server-0afb8820/index.tsx` batch-set |

---

## 7. Status

```text
RCA COMPLETE
IMPLEMENT: BLOCKED (czekaj Owner GO)
```
