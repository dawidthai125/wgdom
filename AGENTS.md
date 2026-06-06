# W&G DOM — instrukcja dla agentów AI i programistów

> **Zanim cokolwiek zmienisz — przeczytaj pliki poniżej w tej kolejności.**

---

## START HERE

```text
1. AGENTS.md              ← ten plik (JAK pracować)
2. docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md  ← ★ Sprint 20.1A CLOSED (odroczenie wypłaty, `f24fafe`)
3. docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md  ← Performance 2.x CLOSED (wyniki końcowe)
4. docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md  ← Performance 1.x CLOSED, a6cdb4a
5. CURRENT-TASK.md        ← skrót: co na prod / co dalej
6. docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md  ← Sprint 20.0A CLOSED (nieobecności, `778f616`)
7. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← incydent Roboty, RCA
8. docs/SESSION-HANDOFF-2026-06.md  ← audyty, Faza 8–9, Roboty 2.0
9. PROJECT-GUIDE.md       ← JAK działa projekt (+ Known Issues)
10. docs/ARCHITECTURE.md   ← pełna architektura (gdy coś niejasne)
11. docs/INCIDENTS-2026-06.md  ← incydenty sync/payroll/admin + Roboty §11
12. docs/tender-center-7g-executive.md  ← pulpit × COMMAND CENTER (ETAP 7G)
13. docs/jobs-2.0-product-audit.md    ← rekomendacja rozwoju zakładki Roboty
14. CHANGELOG.md          ← CO już zrobiono (skrót)
15. changelog-data.ts → CHANGELOG[]  ← źródło prawdy wersji + UI zakładka „Zmiany”
```

### WAŻNE

- **Nie zgaduj architektury** — sprawdź `PROJECT-GUIDE.md` i `docs/ARCHITECTURE.md`.
- **Nie zmieniaj syncu / merge** bez przeczytania ARCHITECTURE § 11.
- **Przed większą zmianą** przeczytaj **Known Issues** w `PROJECT-GUIDE.md`.
- **Na końcu sesji** zaktualizuj `CURRENT-TASK.md` (skończone / w trakcie / następne).
- Hasło użytkownika: **„kontynuuj WGDOM”** → czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 1. Rola każdego pliku

| Plik | Pytanie, na które odpowiada |
|------|-----------------------------|
| **AGENTS.md** | Jak pracować nad projektem? (zasady, workflow, zakazy) |
| **PROJECT-GUIDE.md** | Jak działa projekt? (architektura, API, pułapki) |
| **docs/ARCHITECTURE.md** | Pełny techniczny przewodnik (living document) |
| **CHANGELOG.md** | Co zostało zrobione? (skrót dla AI) |
| **CURRENT-TASK.md** | Gdzie skończyliśmy? (wznowienie po nowym koncie / miesiącu) |
| **docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md** | Performance 2.x **CLOSED** (`35614f0`) — startup 1119 KB, seria 2.2C→2.4A |
| **docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md** | Sprint 20.1A **CLOSED** (`f24fafe`) — odroczenie wypłaty, MODEL A, archive freeze |
| **docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md** | Sprint 20.0A **CLOSED** (`778f616`) — nieobecności, overlay payroll, tombstones |
| **docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md** | Performance 1.x CLOSED — CloudLoader CORE/DEFERRED, pomiary, tag `v2.45.34-perf-1.3a` |
| **docs/SESSION-HANDOFF-2026-06.md** | Handoff sesji: audyty, commity, Roboty 2.0, UX greeting |
| **docs/jobs-2.0-product-audit.md** | Audyt produktowy Roboty (MIN/MID/FULL) |
| **docs/dead-code-audit-2026-06.md** | Martwy kod — repo-wide |
| **docs/permissions-roles-audit-2026-06.md** | Uprawnienia Przetargów — PASS |
| **docs/INCIDENTS-2026-06.md** | Incydenty stabilności — payroll, admin passwords, media (czerwiec 2026) |
| **`changelog-data.ts` → CHANGELOG** | Źródło prawdy wersji + UI użytkownika (zakładka Zmiany, lazy `GuideView`) |

**Nie analizuj `App.tsx` plik po pliku od zera** — najpierw PROJECT-GUIDE + ARCHITECTURE.

---

## 2. Przy każdej zmianie w kodzie

1. Implementacja (+ chmura, jeśli dane trwałe)
2. `CHANGELOG` w `src/app/changelog-data.ts` (nowy wpis na górze)
3. **`CHANGELOG.md`** — dopisz ostatnią wersję (skrót)
4. Instrukcja użytkownika (`HelpView`, hinty) — jeśli widoczne w UI
5. **`docs/ARCHITECTURE.md`** — sekcja dotycząca zmiany + data na górze
6. **`CURRENT-TASK.md`** — na końcu większej sesji
7. Podsumowanie po **polsku**

Szczegóły: [`.cursor/rules/wgdom-development.mdc`](.cursor/rules/wgdom-development.mdc) · skrót: [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md)

---

## 3. Szybkie fakty

| | |
|---|---|
| Produkcja | https://wgdom.fun |
| Repo | https://github.com/dawidthai125/wgdom · branch `main` |
| Wersja UI | `CHANGELOG[0].version` w `changelog-data.ts` (**2.45.38** na prod) |
| Prod `main` (app) | commit **`f24fafe`** · release **v2.45.38** · Sprint 20.1A odroczenie wypłaty **CLOSED** |
| Performance 2.x (baza) | commit **`35614f0`** · tag `v2.45.38-perf-2.4a` · seria **CLOSED** |
| Frontend deploy | push `main` → Vercel |
| Backend deploy | push `supabase/functions/**` → GitHub Action |
| Sync | `src/lib/cloud-sync.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/index.tsx` |
| Monolit UI | `src/app/App.tsx` (+ panele w `src/app/`) |

---

## 3a. Moduł przetargów + COMMAND CENTER (skrót)

- **Pulpit executive (7G):** [`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md) — `CommandCenterExecutivePanel`, `useCommandCenterExecutiveSnapshot`, legacy `tenderDashStats`
- **Pełny CC:** `OwnerDashboard` + **ARCHITECTURE.md § 12.1.3**
- **Lista BZP / pipeline:** **ARCHITECTURE.md § 12.1.1**. Kluczowe pliki:

- `src/lib/tenders-bzp.ts` — pipeline, typy, API klienta, scoring
- `src/lib/tenders-actions.ts` — chipy akcji, auto-wynik BZP, alerty pulpitu, .ics
- `src/lib/tenders-bzp-analyze-local.ts` — analiza SWZ pdf.js (klient)
- `src/lib/tenders-wadium.ts` — wadium + blokada vs limit profilu
- `src/lib/tenders-map-coords.ts` + `TendersMapPanel.tsx` — **mapa OSM** Wrocław + markery
- `src/app/TenderKeywordsPanel.tsx` — własne słowa kluczowe (+ wbudowany słownik w kodzie)
- `src/app/TenderBidPrepPanel.tsx` — karta ofertowa
- Edge: `GET /tenders-bzp-*`, `GET /tenders-bzp-award-result`, `POST /tenders-external-discover`

---

## 3c. FAZA 8 — Tender → Job (CLOSED, nie rozpoczynaj 8.5 bez polecenia)

**Prod:** `88c25f8` · pełny opis: **ARCHITECTURE.md § 12.1.4**

| Etap | Skrót |
|------|--------|
| 8.0 | `executeCreateJobFromTender`, `TenderJobLinkButtons` |
| 8.0A | Jeden `useTendersPipeline` w Provider; Classic × CC |
| 8.1 | Kwota + daty z umowy / `implementationDays` |
| 8.2 | Baner kontraktu, `plannedHandoverDate`, attach → dokumenty |
| 8.3 | Executive KPI + Utwórz/Otwórz robotę |
| 8.4 | Fallback dat z SWZ (`resolveJobDraftDatesFromTender`) |

**Nie zmieniaj bez polecenia:** pipeline, Provider, `linkedJobId`, `TenderJobLinkButtons` (tylko reuse).

---

## 3b. Galeria admin (skrót)

Szczegóły: **ARCHITECTURE.md § 12.1.2**.

- `JobPhotosGalleryView` w `App.tsx` — zakładka **Zdjęcia**
- `src/lib/photo-download.ts` — `downloadJobGalleryZip`

---

## 3d. Nieobecności pracowników — Sprint 20.0A (**CLOSED**, prod `778f616`)

- **Handoff:** [`docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md`](docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md)
- **Architektura:** **ARCHITECTURE.md § 10.1** — `kw-employee-leaves`, `kw-employee-leaves-deleted-ids`, overlay, archive freeze
- **Pliki:** `employee-leaves.ts`, `payroll-leave-overlay.ts`, `EmployeeLeavesSection.tsx`, `PayrollView.tsx`, `payroll-export.ts`
- **Test smoke:** `npx vite-node scripts/smoke-test-employee-leaves-20.0a.mjs`

**Nie zmieniaj bez polecenia:** merge leaves + tombstones, overlay archiwum (snapshot-only), Edge walidacja leaves.

---

## 3e. Odroczenie wypłaty — Sprint 20.1A (**CLOSED**, prod `f24fafe`, release **v2.45.38**)

- **Handoff:** [`docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md`](docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md)
- **Architektura:** **ARCHITECTURE.md § 10.1** — `payrollCarryForward`, MODEL A (frozen amount), archive snapshot freeze
- **Kluczowe pliki:**
  - `src/lib/payroll-carry-forward.ts` — logika defer, `canDeferPayroll`, `calcWeekEmployeeForPayroll`
  - `src/lib/payroll-carry-snapshot.ts` — snapshot carry (bez cyklu importów z `app-domain`)
  - `src/app/PayrollView.tsx` — UI ⏭, totals, export
  - `src/app/WeekEmployeeDetail.tsx` — przycisk defer, banery carry
- **Test smoke:** `npx vite-node scripts/smoke-test-payroll-carry-forward-20.1a.mjs`, `scripts/post-smoke-20.1a.mjs`

**Biweekly carry forward nieobsługiwany w V1** — tylko tygodniówka; wypłata co 2 tygodnie → `biweekly_blocked`.

**Nie zmieniaj bez polecenia:** MODEL A freeze, merge `pickPayrollCarryForward`, archive snapshot-only export.

---

## 4. Komendy

```bash
npm run dev          # localhost:5173
npm run build
npm run test:mobile  # Playwright → wgdom.fun
npm run audit:mobile # statyczny audyt mobile
```

---

## 5. Nie commitować

`_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`, `icons/`, `music/` (chyba że celowo).
