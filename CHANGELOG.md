# W&G DOM — changelog (skrót dla agentów AI)

> **Źródło prawdy:** tablica `CHANGELOG` w [`src/app/changelog-data.ts`](src/app/changelog-data.ts).  
> UI (zakładka **Zmiany**) czyta stamtąd `CHANGELOG[0].version`.  
> **Przy każdej nowej wersji:** dodaj wpis na górze w `changelog-data.ts` **oraz** zaktualizuj ten plik (ostatnie 5–10 wersji).

**Aktualna wersja:** **2.45.30** (UI)

---

## 2.45.30 (2026-06-03) — FAZA 9.0: Twoje kontrakty (pracownik)

- `isWorkerOnExecutionTeam` + sekcje w `WorkerPhotoView` (plan ekipy → widoczność)
- Bez zmian grafiku, payroll, TC, Executive

## 2.45.29 (2026-06-03) — ETAP 8.5 FULL: planowa ekipa (B lite)

- Pola `executionLeadDirectoryId`, `executionAssigneeDirectoryIds` w `Job` (`kw-jobs`)
- Baner kontraktu: lider + multi-select, `assignExecutionTeam`, badge na liście
- Merge w `mergeJobsById`; bez payroll / grafiku / Edge

## 2.45.28 (2026-06-03) — ETAP 8.5 MIN: Start Execution

- **new** Baner przetargu w Robotach — „Rozpocznij realizację” (`startJobExecution` → `jobPhase` + `handoverStage` + `activityLog`)
- Bez nowych kluczy KV / pipeline

---

## 2.45.27 (2026-06-03) — ETAP 8.4: daty SWZ → Job

- **improve** `resolveJobDraftDatesFromTender` — fallback: `implementationDeadlineRaw`, potem `contractPeriod` (jednoznaczne wzorce)
- **fix** Bez nadpisywania dat z umowy (8.1); `plannedHandoverDate` nadal z `endDate` (8.2)
- **fix (Edge, bez bump UI)** PAYROLL SYNC FIX A — `settled` / `settledUpdatedAt` osobno od `dataWinner` w `mergeWeekEmployeeRecordByTimestamps`; union zawsze przez merge rekordu

---

## 2.45.26 (2026-06-03) — ETAP 8.3: Executive Win CTA + KPI

- **new** Pulpit — KPI „Wygrane bez roboty”, `TenderJobLinkButtons` na karcie okazji i w Action Center (won-realization)
- **improve** Ten sam flow Utwórz / Otwórz robotę co w COMMAND CENTER (bez nowych komponentów)

---

## 2.45.25 (2026-06-03) — ETAP 8.2: realizacja kontraktu po Create Job

- **improve** `plannedHandoverDate` z terminem realizacji; sync dokumentów po plikach z przetargu
- **improve** Baner kontraktu w Robotach (kwota, daty, BZP)

---

## 2.45.24 (2026-06-03) — ETAP 8.1: mapowanie roboty z wygranego

- **improve** `awardValuePln` → `invoiceAmount` (priorytet nad SWZ i naszym szacunkiem)
- **improve** `contractDate` → `startDate`, `implementationDays` → `endDate` (gdy oba źródła dostępne)

---

## 2.45.23 (2026-06-03) — ETAP 8.0A: jeden pipeline Classic × CC

- **fix** Jedna instancja `useTendersPipeline` — linkedJobId widoczny w CC i Classic bez F5
- **improve** R1: lekki reload z storage przy wejściu w Classic (bez BZP merge)

---

## 2.45.22 (2026-06-03) — ETAP 8.0: roboty z COMMAND CENTER

- **new** CC — „Utwórz robotę” / „Otwórz robotę” przy statusie wygrany (okazja, briefing, Action Center)
- **improve** `executeCreateJobFromTender` — wspólny handler Classic + CC

---

## 2.45.21 (2026-06-03) — COMMAND CENTER UX (ETAP 7G.1)

- **improve** „Co wymaga uwagi” — max 5, skrót, Pokaż wszystkie, Szczegóły
- **improve** Kolejność sekcji CC; kompaktowy briefing i Hero
- **fix** Zdolność finansowa w OwnerDashboard (`financialCapacityEnabled: true`)

---

## Docs — ETAP 7G executive dashboard (2026-06-03)

- **new** [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) — mapa plików, hook, legacy stats, ryzyka deploy
- **improve** `ARCHITECTURE.md` § 6.1, § 12.1.3 · `AGENTS.md` START HERE · `CURRENT-TASK.md` · `wgdom-stan-projektu.mdc`
- **Kod prod:** `7d49be2` — `feat(dashboard): integrate command center executive summary`

---

## Stabilność sync (main, bez bump UI — 2026-06-02)

Wdrożone commity infra (prod @ `92d574e`):

| Commit | Temat |
|--------|--------|
| `db1d05a` | Payroll Guard — `wouldBlockPayrollShrink` |
| `c9db032` | P11 — `applyBootstrapPayrollMerge` w CloudLoader |
| `92d574e` | P15 — fix merge `kw-admin-passwords` |

Szczegóły, procedury KV, UI media na gałęzi audit → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

---

## 2.45.15 (2026-05-25) — Optymalizacja Web + Mobile

- **improve** Lazy load: Przetargi, Inspektor admin, Pliki robot — szybszy start
- **improve** Główny JS −25% gzip, osobne chunki pdfjs/przetargi, preconnect Supabase
- **improve** docs/OPTIMIZATION.md

## 2.45.14 (2026-05-25) — Lista płac: niedziela 20:00

- **improve** Nd od 20:00 — auto-archiwum + nowy tydzień (gdy wszyscy rozliczeni)
- **fix** Alerty gdy tydzień zostaje w tyle po przejściu

## 2.45.13 (2026-05-25) — Docs AI: START HERE

- **new** `PROJECT-GUIDE.md`, `CHANGELOG.md`, `CURRENT-TASK.md` — struktura dla agentów
- **improve** AGENTS.md START HERE, Known Issues, reguły Cursor, ARCHITECTURE v2.45.12

## 2.45.12 (2026-05-25) — Przetargi: mapa OSM i słownik

- **fix** Mapa przetargów Wrocław — kafelki OpenStreetMap zamiast pustego SVG
- **improve** Słownik słów kluczowych — podgląd wbudowanych haseł, licznik wbudowanych/własnych

## 2.45.11 (2026-05-25) — Docs dla AI

- ARCHITECTURE.md § 12.1.1–12.1.2, AGENTS.md, ROZWOJ.md, wgdom-stan-projektu

## 2.45.10 (2026-05-25) — Galeria admin ZIP

- Pobieranie ZIP całej roboty / kategorii (przed / w trakcie / po)

## 2.45.9 (2026-05-25) — Mapa przetargów (SVG — zastąpione w 2.45.12)

- Tymczasowa mapa SVG po awarii staticmap OSM

## 2.45.8 (2026-05-25) — Przetargi: akcje i alerty

- Chipy „wymaga działania”, auto-wynik BZP, alerty pulpitu, .ics, porównanie cen

## 2.45.7 (2026-05-25) — Przetargi: SWZ, wadium, wyniki

- Analiza SWZ pdf.js, wadium + blokada, wyniki BZP, pakiet PDF, historia szacunku

## 2.45.0–2.45.6 — Zarządzanie sekcją przetargów

- Karta ofertowa, profil firmy v6, BIP discover, kalkulator oferty — szczegóły w App.tsx

---

Pełna historia (setki wpisów) → **`CHANGELOG` w `App.tsx`**.
