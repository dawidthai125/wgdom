# W&G DOM — handoff sesji 2026-06 (dla agentów AI)

> **Cel:** jeden plik z kontekstem audytów, stanem prod i rekomendacjami — bez czytania całej historii czatu.  
> **Hasło w Cursorze:** „kontynuuj WGDOM” → też [`.cursor/rules/wgdom-stan-projektu.mdc`](../.cursor/rules/wgdom-stan-projektu.mdc) i [`CURRENT-TASK.md`](../CURRENT-TASK.md).

**Data handoff:** 2026-06-04  
**Prod `main` (HEAD):** `99e08c2` — fix czarny ekran Roboty (`normalizePhone9`)  
**Wersja UI:** **2.45.33** (2.1A) w [`changelog-data.ts`](../src/app/changelog-data.ts)

> **Incydent Roboty / 2.1B MIN / pełny kontekst sesji RCA:** [`SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md`](SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md) — **nowy agent zaczyna tam.**

---

## 1. Co jest na produkcji (łańcuch faz)

```text
FAZA 8 (8.0–8.4) CLOSED  → Tender → Job → Executive CTA
ETAP 8.5 MIN CLOSED      → startJobExecution, „Rozpocznij realizację”
ETAP 8.5 FULL CLOSED     → executionLeadDirectoryId, executionAssigneeDirectoryIds
FAZA 9.0 CLOSED          → WorkerPhotoView „Twoje kontrakty”
FAZA 9.0.1 CLOSED        → status + termin na kartach pracownika
UX FIX (bez bump UI)     → neutralny nagłówek morning briefing (622bbbb)
```

| Commit | Temat |
|--------|--------|
| `88c25f8` | Faza 8.4 — daty SWZ → job draft |
| `83b193e` | 8.5 FULL — planowa ekipa |
| `3c575c7` | 9.0 — Twoje kontrakty (pracownik) |
| `a57a576` | 9.0.1 — status/termin na kartach |
| `622bbbb` | UX — greeting bez „Dzień dobry Iwona” |

**Nie rozpoczęte bez polecenia:** FAZA 9.0.2, 9.1, Execution Board, Owner Language Cleanup, ETAP 5B (usuwanie legacy CC UI).

---

## 2. Dokumenty z tej sesji (audyty — tylko odczyt)

| Dokument | Zawartość |
|----------|-----------|
| **[`jobs-2.0-product-audit.md`](jobs-2.0-product-audit.md)** | Audyt produktowy zakładki **Roboty** — TOP 10 UX, warianty MIN/MID/FULL, ROI |
| **[`dead-code-audit-2026-06.md`](dead-code-audit-2026-06.md)** | Martwe pliki, skrypty, npm, plan cleanup |
| **[`permissions-roles-audit-2026-06.md`](permissions-roles-audit-2026-06.md)** | Regresja uprawnień Przetargów — PASS |
| [`tender-center-pro-legacy-components.md`](tender-center-pro-legacy-components.md) | 5 komponentów CC ETAP 5A do ewentualnego usunięcia |
| [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) | Sync / payroll / admin (wcześniejsze) |

---

## 3. UX FIX — raport poranny (zrobione, prod)

| | |
|---|---|
| **Plik** | `src/lib/tender-center-morning-briefing.ts` → `buildGreeting()` |
| **Stary tekst** | `Dzień dobry Iwona.` (pierwsze imię z `profile.ownerName`) |
| **Nowy tekst** | `Dzienny raport operacyjny W&G` |
| **UI** | `MorningBriefingCard.tsx` — linia pod nagłówkiem „Codzienny raport właściciela” |
| **Test** | `scripts/test-tender-center-morning-briefing.mjs` |
| **Commit** | `622bbbb` |

**Nie zmieniano:** logika CC, KPI, scoring, AI.  
**Pozostałe teksty „właściciel” (tylko raport, bez zmian):** nagłówek sekcji „Codzienny raport właściciela”, `ownerInsight` („Twojego stylu”), glossary — patrz Owner Language Cleanup (osobna faza).

---

## 4. Uprawnienia Przetargów — werdykt PASS

Źródło: [`permissions-roles-audit-2026-06.md`](permissions-roles-audit-2026-06.md)

- **Super Admin** — zawsze `canViewTendersNav`
- **Admin / Moderator** — gdy `kw-app-settings` → `tendersTabForStaffEnabled === true`
- **Pulpit executive, Tender Center, KPI** — ten sam warunek + `CommandCenterProvider enabled={canViewTendersNav}`
- **Uwaga:** w Robotach przycisk „Otwórz przetarg” bez `canViewTendersNav` na prop — klik cofa na Pulpit (pre-existing)

---

## 5. Dead code — skrót

Źródło: [`dead-code-audit-2026-06.md`](dead-code-audit-2026-06.md)

**Bezpieczne pliki do usunięcia (7):** 5× legacy CC (`CompanyHealthCard`, `GrowthModeSelector`, `OpportunityRadar`, `Forecast90Days`, `DecisionCenter`) + `ImpactPanel.tsx` + `TenderExternalDocsPanel.tsx`.

**Martwy kod w żywych plikach:** `tenderDashStats` w `App.tsx`, martwe importy Job* w `App.tsx`, `useCommandCenterExecutiveSnapshot()` bez wywołań, deprecated w `inspector-stats.ts` / `tenders-map-coords.ts`.

**Skrypty `scripts/`** — większość to narzędzia ops/QA, **nie** usuwać hurtowo.

---

## 6. Roboty 2.0 — rekomendacja produktowa (NIE zaimplementowane)

Źródło: [`jobs-2.0-product-audit.md`](jobs-2.0-product-audit.md)

**Problem:** Fazy 8–9 dodały dane (BZP, ekipa, pracownik), ale **lista Roboty** nadal grupuje po miesiącu `startDate`, nie po pilności.

**Najwyższy ROI (1–2 sesje) — Roboty 2.0 MIN:**

1. Pasek KPI nad listą: w toku / do odbioru / **bez ekipy** / **BZP** / **WM po terminie** (reuse `wmJobsWithOverduePlanned` z `job-wm.ts`).
2. `JobListCard`: badge **BZP**, **Ekipa: 0**, termin WM/koniec.
3. Sort pilności w grupie + chipy filtrów „Bez ekipy”, „Tylko BZP”.

**Kluczowe pliki:** `JobsView.tsx`, `JobListCard.tsx`, `job-list-status.ts`, `job-wm.ts`, `app-domain.ts` (pola ekipy).

---

## 7. Architektura Roboty (stan kodu)

| Warstwa | Pliki |
|---------|--------|
| Lista + detail | `src/app/JobsView.tsx` (~2300 linii monolit) |
| Karta listy | `src/app/JobListCard.tsx` |
| Statusy | `src/lib/job-list-status.ts`, `JobListStatus.tsx` |
| WM / odbiór | `src/lib/job-wm.ts`, `JobWmPanel.tsx` |
| Kontrakt BZP | baner w `JobsView` gdy `linkedTenderId`; `create-job-from-tender.ts` |
| Ekipa 8.5 | `assignExecutionTeam`, `startJobExecution` w `job-wm.ts` |
| Pracownik 9.x | `WorkerPhotoView.tsx`, `isWorkerOnExecutionTeam` w `app-domain.ts` |
| Pulpit alerty | `DashboardView` — braki docs, WM overdue (`wmJobsWithOverduePlanned`) |

**Model mentalny:**

```text
Pulpit     = kolejka „uwaga dziś”
Roboty     = pełna kartoteka (master–detail)
Pracownik  = plan ekipy (execution*) ≠ godziny (workEntries)
```

---

## 8. Kolejność pracy dla następnego agenta

1. Przeczytaj: [`AGENTS.md`](../AGENTS.md) → [`PROJECT-GUIDE.md`](../PROJECT-GUIDE.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md) § 11 + § 12.1.4.
2. [`CURRENT-TASK.md`](../CURRENT-TASK.md) — stan zadań.
3. Jeśli użytkownik chce **kod:** domyślnie **Roboty 2.0 MIN** (audyt gotowy); nie 9.0.2 bez polecenia.
4. Stabilizacja: smoke Fazy 8–9 na Vercel; opcjonalnie deprecate `tenderDashStats`.
5. Po każdej zmianie kodu: `changelog-data.ts`, `CHANGELOG.md`, HelpView, `ARCHITECTURE.md`, `CURRENT-TASK.md`.

---

## 9. Testy regresji (istniejące)

```bash
node scripts/test-tender-job-draft-dates-8.4.mjs
node scripts/test-job-execution-team-8.5-full.mjs
node scripts/test-worker-execution-team-9.0.mjs
node scripts/test-worker-contract-card-9.0.1.mjs
node scripts/test-tender-center-morning-briefing.mjs
npm run build
```

---

## 10. Zakazy (ustalone z użytkownikiem)

- Nie zmieniać logiki Command Center / KPI / scoring / AI bez polecenia.
- Nie rozpoczynać nowej fazy (9.0.2, 9.1, Execution Board) bez wyraźnego polecenia.
- Nie usuwać plików dead code bez osobnego PR i `npm run build`.
- Commit / push tylko na prośbę użytkownika.
