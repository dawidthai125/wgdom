# PAYROLL-CLOUD-RESURRECTION-01 — ARCHITECTURE REVIEW

> **Status:** REVIEW · AUDIT ONLY · **APPROVE DESIGN · BLOCK IMPLEMENT**  
> **Data:** 2026-07-20  
> **Wejście:** RCA · TIMELINE · WRITE TRACE · PLAN · DESIGN FREEZE

---

## 1. Streszczenie architekta

Resurrection nie jest regresją ROLL-001 ani „magicznym” Edge.  
To **znana klasa stale-client vs intentional empty cloud**: bootstrap **optymistycznie** traktuje bogatszy local jako prawdę i **wypycha** go z `forceReplace`, a `mergeArchive` **re-importuje** lokalne tygodnie usunięte tylko z chmury.

Recovery bez **fence sesji** jest niestabilne na multi-device.

---

## 2. Ocena łańcucha zapisu

| Element | Werdykt | Komentarz |
|---------|---------|-----------|
| Browser push | **WINNY (pojazd)** | HTTP batch-set z klienta |
| CloudLoader bootstrap | **WINNY (orchestrator)** | auto-push po merge |
| mergeWeekEmployeesForWeekRange | **WINNY (logika)** | pick non-empty / union |
| mergeArchive | **WINNY (logika)** | keep local-only weeks |
| background sync | **pojazd** | void push = background |
| Edge forceReplace | **enabler** | pozwala 0→14 |
| Edge mergeArchiveUnion | **enabler wtórny** | przy shrink |
| Edge autonomiczny | **NIE** | brak cron restore |
| ROLL-001 | **NIE** | nie generuje rosteru |
| Owner UI undo | **NIE** | brak; Δ~8 min typowe dla 2. sesji |

---

## 3. Klasyfikacja A–E (potwierdzenie)

| Opcja | Udział |
|-------|--------|
| **A inny klient** | **PRIMARY** |
| **B merge** | **TAK** (treść) |
| **C background/bootstrap sync** | **TAK** (wykonanie) |
| **D Edge** | **wspólnik**, nie autor payloadu |
| **E inny** | nie stwierdzono |

---

## 4. Ryzyka PLAN/DF

| Ryzyko | Mitygacja |
|--------|-----------|
| Złamanie anti-wipe REGRESSION-03 | testy 03/04 obowiązkowe; fence tylko przy cloud empty intentional |
| Edge tombstone archive brak parity | DF: klient+Edge razem albo tylko klient z deleted-ids egzekwowanym przed push |
| Multi-tab nadal | playbook sesji + opcjonalnie epoch |

---

## 5. Protected Core

| Obszar | Dotknięcie przy przyszłym IMPLEMENT |
|--------|-------------------------------------|
| `cloud-sync.ts` merge/bootstrap helpers | **TAK** (wąski) |
| `CloudLoader.tsx` push gate | **TAK** (wąski) |
| PWRB / `payroll-week-roster-bundle` | unikaj |
| Edge batch-set | tylko jeśli R2 tombstone |

---

## 6. Werdykt review

```text
APPROVE DESIGN (R1+R2 kierunek)
BLOCK IMPLEMENT — czekaj Owner GO na DF ACK

Nie naprawiać w tej sesji audytu.
```

---

## 7. Dokumenty pakietu

| Doc | Plik |
|-----|------|
| RCA | `PAYROLL-CLOUD-RESURRECTION-01-RCA.md` |
| TIMELINE | `PAYROLL-CLOUD-RESURRECTION-01-TIMELINE.md` |
| WRITE TRACE | `PAYROLL-CLOUD-RESURRECTION-01-WRITE-TRACE.md` |
| PLAN | `PAYROLL-CLOUD-RESURRECTION-01-PLAN.md` |
| DESIGN FREEZE | `PAYROLL-CLOUD-RESURRECTION-01-DESIGN-FREEZE.md` |
| ARCH REVIEW | ten plik |
