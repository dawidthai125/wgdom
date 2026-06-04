# W&G DOM — instrukcja dla agentów AI i programistów

> **Zanim cokolwiek zmienisz — przeczytaj pliki poniżej w tej kolejności.**

---

## START HERE

```text
1. AGENTS.md              ← ten plik (JAK pracować)
2. docs/SESSION-HANDOFF-ROBOTY-INCIDENT-2026-06.md  ← ★ incydent Roboty, 99e08c2, 2.1B MIN (nowy agent)
3. CURRENT-TASK.md        ← skrót: co na prod / co dalej
4. docs/SESSION-HANDOFF-2026-06.md  ← audyty, Faza 8–9, Roboty 2.0
5. PROJECT-GUIDE.md       ← JAK działa projekt (+ Known Issues)
6. docs/ARCHITECTURE.md   ← pełna architektura (gdy coś niejasne)
7. docs/INCIDENTS-2026-06.md  ← incydenty sync/payroll/admin + Roboty §11
8. docs/tender-center-7g-executive.md  ← pulpit × COMMAND CENTER (ETAP 7G)
9. docs/jobs-2.0-product-audit.md    ← rekomendacja rozwoju zakładki Roboty
10. CHANGELOG.md          ← CO już zrobiono (skrót)
11. changelog-data.ts → CHANGELOG[]  ← źródło prawdy wersji + UI zakładka „Zmiany”
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
| Wersja UI | `CHANGELOG[0].version` w `changelog-data.ts` (**2.45.33**) |
| Prod `main` | commit **`99e08c2`** · fix `normalizePhone9` + Roboty 2.1A/2.0 na prod |
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
