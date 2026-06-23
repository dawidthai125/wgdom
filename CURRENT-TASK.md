# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-23 · **Work Entry Delete Persistence RELEASED** · prod **2.62.34**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.62.34** · commit **(po push)** |
| **Poprzedni prod** | **2.62.33** (`59307da`) · Formal XLSX UI Guard |
| **Work Entry Delete** | **CLOSED** (2.62.34) · tombstone + merge + JobsView + Pulpit |
| **TP190 Parser v3** | **CLOSED** |
| **PDF WM Recovery** | **CLOSED** |
| **TP200B** | **PLANNED** |

## Co zrobiono (sesja 2026-06-23)

| Temat | Skrót |
|-------|-------|
| **2.62.34** | `deletedWorkEntryTombstones` — usunięty wpis pracy nie wraca po sync |
| **SSOT delete** | `removeWorkEntryFromJobs` · `removeWorkEntriesMatchingFromJobs` |
| **Ścieżki** | Lista Płac · Roboty → Pracownicy · Pulpit consistency fix |
| **Test** | `test-payroll-work-entry-merge-fidelity.mjs` T1–T9b (29 PASS) |

## Następne (tylko na polecenie)

- TP200B kosztorys fidelity
- Backlog P3 notatki export
