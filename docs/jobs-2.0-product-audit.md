# Roboty 2.0 — audyt produktowy (2026-06)

> **Status runtime:** **SHIPPED** — Roboty 2.0 MIN od **v2.45.32** · MID-B kolejki od **2.50.x** · prod **2.63.35+**.  
> **Ten dokument:** audyt historyczny (czerwiec 2026) + **Product Decision History** · maintenance **Bundle #4A** (2026-07-05) — **docs only**, bez zmian UI.  
> Indeks sesji: [`SESSION-HANDOFF-2026-06.md`](SESSION-HANDOFF-2026-06.md) · architektura: [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.4

---

## Product Decision History

| Release | Commit / wersja | Decyzja |
|---------|-----------------|---------|
| **Roboty 2.0 MIN** | v2.45.32 | KPI, chipy, sort pilności — `job-list-ops.ts` + lista |
| **2.1A** | v2.45.33 | Prezentacja: 5 kafelków KPI w `JobListPanelHeader` |
| **2.50.41** | — | Karta: badge **„Aktywni dziś”** zamiast mylącego „Ekipa: N” (plan vs faktyczne godziny) |
| **20.5Z.4A Jobs Cleanup** | `640e3a9`, v2.50.62 | **UI-only:** ukryto KPI „Bez ekipy” i „WM po terminie” oraz kolejki `no_team` / `wm_overdue` |

**Widoczne KPI na prod (od 20.5Z.4A):** W toku · Do odbioru · BZP (**3 kafelki**).

**Logika lib bez zmian:** `computeJobListOpsKpi().noTeam`, `.wmOverdue`, chipy `no_team` / `wm_overdue`, `buildJobQueueSections()` — **bez UI** do aktywacji chipów ukrytych KPI.

**WM po terminie:** sygnał na **Pulpicie** (`wmJobsWithOverduePlanned` w `DashboardView`), nie w KPI Roboty.

**Bundle #4A (2026-07-05):** synchronizacja docs/HelpView/manifest — **nie cofa** decyzji 20.5Z.4A. Przywrócenie ukrytych KPI = osobny backlog (**Bundle #4B**, wymaga Owner GO).

---

## A. Stan obecny (prod 2.63.35 — zaktualizowano 2026-07-05)

### Co działa (fazy 8–9 + 2.0 MIN)

| Obszar | Gdzie w UI | Uwaga |
|--------|------------|--------|
| Kontrakt BZP | Baner w **szczegółach** + badge **BZP** na liście | `JobListCardV2` · baner: kwota, daty, start realizacji |
| Planowa ekipa | Baner BZP w detalu | Lider + checkboxy, „Zapisz ekipę” — **bez** badge planu na karcie (2.50.41) |
| Pracownik | `WorkerPhotoView` | „Twoje kontrakty” + status/termin (9.0.1) |
| Lista robót | `JobListCardV2` + KPI (3) + Lista/Kolejki | Sort pilności w grupie miesiąca · badge Aktywni dziś |
| Szczegóły | `JobDetailSectionNav` — 6 zakładek | Przegląd, Pliki, Dokumentacja, Pracownicy, Zdjęcia, … |
| WM | `JobWmPlannedBadge` + **Pulpit** | WM overdue — Pulpet; KPI WM ukryte od 20.5Z.4A |

### Odpowiedzi na pytania czytelności (historyczny audyt → stan prod)

| Pytanie | Ocena (2026-06) | Prod dziś (2.63.35) |
|---------|-----------------|---------------------|
| Lista czytelna? | Częściowo | **Lepsza** — KPI, sort pilności, karta V2 |
| Najważniejsze od razu? | Nie | **Częściowo** — BZP/termin/lider na karcie |
| Najważniejsze roboty? | Nie — tylko miesiąc | Sort pilności **w** grupie miesiąca |
| Opóźnione WM? | Pulpet | **Bez zmian** — Pulpet, nie KPI Roboty |
| Do odbioru? | Tak | **Tak** — filtr + kolejki |
| Bez ekipy (plan)? | Nie | **Lib TAK, UI KPI NIE** (20.5Z.4A) |
| Kontrakty BZP? | Tylko detail | **Badge BZP** na liście |

---

## B. TOP 10 problemów UX

1. Lista nie sortuje po pilności — tylko po miesiącu startu.
2. Kontrakt BZP niewidoczny na liście.
3. Brak sygnału „bez ekipy” (po 8.5 FULL).
4. Rozłączenie plan ekipy (`executionAssignee*`) vs `workEntries` (payroll).
5. Pulpit vs Roboty — dwie kolejki bez spójnego „attention score”.
6. Dwa „Gotowe do odbioru” (`docs_pending` vs `ready_handover`) bez rozróżnienia na karcie.
7. Plan ekipy głęboko w banerze BZP — łatwo przeoczyć.
8. Brak szybkich filtrów operacyjnych (BZP, bez ekipy, WM ↓).
9. Monolit szczegółów (~2300 linii `JobsView`) — wysoki koszt poznawczy.
10. Brak „Dashboard robót” jako domyślnego wejścia w zakładkę.

---

## C. Największe szanse

- Odniesienie danych 8.5/9.0 na **liście** (mały diff, duży efekt).
- Reuse `wmJobsWithOverduePlanned`, `countJobsByListFilter`, pola `linkedTenderId`, `executionAssigneeDirectoryIds`.
- Widok kierownika: filtr po `executionLeadDirectoryId` + istniejący filtr pracownika w liście.

---

## D. Wariant MIN (1–2 sesje) — **SHIPPED** (v2.45.32+)

- Pasek KPI nad listą — **3 widoczne** (W toku, Do odbioru, BZP) od 20.5Z.4A; lib liczy też noTeam/wmOverdue.
- `JobListCardV2` — badge BZP, Aktywni dziś, WM, daty kontraktu.
- Sort pilności w grupie miesiąca + chip BZP (KPI).

**Pliki:** `job-list-ops.ts`, `JobsView.tsx`, `JobListCardV2.tsx` · test: `test-job-list-ops-2.0-min.mjs` · manifest: `LIB-JOBS-LIST-OPS-20-MIN`.

---

## E. Wariant MID (mała faza)

- Wszystko z MIN.
- Toggle **Lista / Operacje** — sekcje kolejki (WM po terminie, BZP bez startu, bez ekipy, docs >7 dni).
- Sekcja „Plan ekipy” w Przeglądzie dla **wszystkich** aktywnych robót (nie tylko BZP).
- Rozróżnienie badge `docs_pending` vs `ready_handover`.
- Filtr „Moje jako lider” dla kierownika.

---

## F. Wariant FULL (docelowy)

- Domyślny **Dashboard robót** (KPI + kolejka + lista).
- Karta 2.0 (ikony BZP / ekipa / termin).
- Timeline realizacji (kontrakt → ekipa → work → odbiór).
- Zunifikowane ostrzeżenia z Pulpitem.
- Rozbicie `JobsView` na moduły.

---

## G. Rekomendacja ROI

**Roboty 2.0 MIN** — warstwa operacyjna listy bez refactoru detail.

Uzasadnienie: fazy 8–9 dostarczyły dane, ale pierwszy ekran Roboty pozostał „1.0 chronologia”. Adopcja 9.0 u pracownika nie wymaga kolejnej fazy backendowej w adminie — wymaga **czytelnej listy**.

---

## Persony (koncepcja ekranu)

### Dawid (Super Admin)

Kolejka pilna na górze + KPI + pełne stawki i link BZP w detail.

### Paweł (Moderator)

Jak Dawid bez PLN na kartach; akcent dokumenty/ekipa/status.

### Kierownik

Filtr „Moje roboty” (`executionLeadDirectoryId`); podział plan ekipy vs faktyczne godziny.

---

## Powiązanie z ARCHITECTURE

Pełny przepływ 8–9: [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.4.
