# W&G DOM — rejestr incydentów (SSOT)

> **Produkcja:** https://www.wgdom.fun · **Supabase KV:** `bdpygdvfgbggermvqtys`  
> **Archiwum miesięczne:** [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md)

---

## P0 — Payroll Cross-Device Sync (2026-07-10) · **FULLY CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **FULLY CLOSED** · **Observation Complete** (2026-07-11) |
| **Objaw** | Edycja godzin/stawek/premii na telefonie nie widoczna na drugim komputerze (to samo konto); ponowny wpis na drugim urządzeniu nie synchronizował się z powrotem |
| **Root cause** | **SYNC-ARCH-01 S1-1** (`7ad4e06`, v2.63.28) usunął Payroll z RS Push; **S2 Domain Push** dla mutacji pól `kw-week-employees` nie został ukończony — edycje zapisywały się tylko do `localStorage` |
| **Resolution** | **SYNC-ARCH-01 S2** — `schedulePayrollDomainPush` → `persistPayrollRoster` → `pwrPush(skipPayrollGuard)` → `pushWeekEmployeesToCloud(replaceWeekEmployeesKeys)` dla wszystkich live mutacji rosteru |
| **Fix commit** | **`e819124`** |
| **Docs closeout** | **`2525dd6`** · prod UI **v2.63.85** |
| **Production verification** | **2026-07-10** (smoke PASS) |
| **Observation window** | 2026-07-10 09:28 → **2026-07-11 09:28** (UTC+2) · **24h PASS** |
| **Smoke** | **PASS** (godziny · stawka · premia/potrącenie) |
| **Cross-device** | **PASS** |
| **Integrity** | **PASS** |
| **SSOT design** | [`architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md`](architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md) |
| **Test regresji** | S2 **18/18** · S1 RS-no-payroll **22/22** · Payroll Guard **4/4** |

### T+24h Final Review (2026-07-11)

| Kryterium | Wynik |
|-----------|-------|
| Zgłoszenia: rollback godzin | **Brak** |
| Zgłoszenia: rollback stawek | **Brak** |
| Zgłoszenia: utrata premii | **Brak** |
| Zgłoszenia: utrata potrąceń | **Brak** |
| Zgłoszenia: cross-device mismatch | **Brak** |
| Cloud roster count | **15** (T0=15 → T+24h=15) |
| Tombstones | **6** (stabilne) |
| Duplikaty `directoryId` | **0** |
| Anomalie LWW / `dataUpdatedAt` | **Brak** |
| Nowe incydenty prod | **Brak** |
| Regression pack | **PASS** (44/44 łącznie) |

### Raport architektoniczny — zamknięcie

**Problem:** Po S1-1 Payroll wypadł z RS Push bez równoległego Domain Push dla mutacji pól. RS push nadal obsługiwał roster add/remove; edycje pól (`updateWeekEmployeeDay`, stawki, `extraCosts`, settled, carry-forward) kończyły się wyłącznie w `localStorage`.

**Rozwiązanie (S2):** Facade `payroll-domain-sync.ts` z debounce 1s (`schedulePayrollDomainPush`). Handler w `App.tsx` (`commitLivePayrollRosterEdit`) podłączony do wszystkich live mutacji `kw-week-employees`. Push przez istniejący PWRB (`pwrPush` + `replaceWeekEmployeesKeys` + `skipPayrollGuard`).

**Architektura zachowana:**
- Payroll **nie** przywrócony do RS Push (S1-1 intact).
- Cloud Sync runtime, Edge, parsery — **bez zmian**.
- Roster add/remove — natychmiastowy `pwrPush` (bez zmian vs pre-S2).
- LWW + tombstones — mechanizmy istniejące; brak regresji w oknie obserwacji.

**Dowód operacyjny (okno 24h):** Po deployzie `e819124` chmura przyjęła 14/15 rekordów z `dataUpdatedAt` ≥ deploy; burst edycji operacyjnych 08:01–08:03 UTC bez utraty danych. T+24h: roster i tombstones stabilne, brak duplikacji.

**Lessons learned:**
- Każda mutacja Payroll musi kończyć się **Domain Push** (`kw-week-employees`). → **#CORE-015**
- **Contract Test cross-device** jest obowiązkowy przed zamknięciem incydentu sync. → **#CORE-016**
- **Nie przywracać** Payroll do RS Push — domain push jest ścieżką docelową (SYNC-ARCH-01).
- S1 bez S2 = regresja P0 — kolejność slice'ów jest krytyczna.

### Timeline

```text
2026-07-04  S1-1 (7ad4e06) — Payroll wyłączony z RS push
2026-07-10  S2 (e819124)   — Domain push mutacji pól · deploy prod
2026-07-10  Production smoke PASS · INCIDENT CLOSED
2026-07-10  Observation window OPEN (24h)
2026-07-11  Observation Complete · FULLY CLOSED
```

---

## P0 — Supabase `exceed_egress_quota` (2026-06-29) · **CLOSED**

Szczegóły: [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) §0.
