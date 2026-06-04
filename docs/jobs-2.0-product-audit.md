# Roboty 2.0 — audyt produktowy (2026-06)

> Po Fazie 8, ETAP 8.5 MIN/FULL, Fazie 9.0 i 9.0.1. **Tylko audyt** — bez implementacji.  
> Indeks sesji: [`SESSION-HANDOFF-2026-06.md`](SESSION-HANDOFF-2026-06.md)

---

## A. Stan obecny

### Co działa (fazy 8–9)

| Obszar | Gdzie w UI | Uwaga |
|--------|------------|--------|
| Kontrakt BZP | Baner w **szczegółach** robota (`linkedTenderId`) | Kwota, daty, „Otwórz przetarg”, „Rozpocznij realizację” |
| Planowa ekipa | Ten sam baner | Lider + checkboxy, „Zapisz ekipę”, badge „Ekipa: N” na liście |
| Pracownik | `WorkerPhotoView` | „Twoje kontrakty” + status/termin (9.0.1) |
| Lista robót | `JobListCard` | Adres, status, pasek dokumentów, brak zlecenia/kosztorysu |
| Szczegóły | `JobDetailSectionNav` — 6 zakładek | Przegląd, Pliki, Dokumenty, Pracownicy, Zdjęcia, Raporty |
| WM | `JobWmPanel`, `plannedHandoverDate` | Alerty WM na **Pulpicie**, nie na liście Roboty |

### Odpowiedzi na pytania czytelności

| Pytanie | Ocena |
|---------|--------|
| Lista czytelna? | Częściowo — dobra baza, słabe skanowanie pilności |
| Najważniejsze od razu? | Nie — brak BZP/ekipa/terminów na liście |
| Najważniejsze roboty? | Nie — grupowanie po miesiącu `startDate` |
| Opóźnione? | Częściowo — WM overdue na Pulpicie |
| Do odbioru? | Tak — filtr + badge |
| Bez ekipy? | Nie — brak sygnału „0” |
| Kontrakty BZP? | Tylko po wejściu w detail |

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

## D. Wariant MIN (1–2 sesje)

- Pasek KPI nad listą (w toku, odbiór, bez ekipy, BZP, WM po terminie).
- Rozszerzone `JobListCard` (badge BZP, Ekipa 0/N, daty).
- Sort pilności w grupie miesiąca + chipy filtrów.

**Pliki:** `JobsView.tsx`, `JobListCard.tsx` (+ ewent. helper w `job-wm.ts` lub `app-domain.ts`).

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
