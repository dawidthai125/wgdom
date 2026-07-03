# AI-START-HERE — W&G DOM

> **Pierwszy dokument, który czyta nowy AI / agent / sesja ChatGPT.**
> Krótki. Resztę znajdziesz przez linki poniżej.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `fd56cf7` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** — brak nowych epiców bez polecenia |

---

## 1. Czym jest WGDOM

**W&G DOM** to produkcyjny system zarządzania dla firmy budowlano‑elektrycznej:

- **Roboty (Jobs)** — zlecenia, dokumentacja, pliki, zdjęcia, billing.
- **Lista Płac (Payroll)** — tygodniowe rozliczenia pracowników, rollover, carry‑forward, archiwum.
- **Przetargi (Tenders / COMMAND CENTER)** — pipeline BZP, kwalifikacja, kosztorys PRO (BOQ), automatyzacja.
- **WM Druk** — odbiory, pomiary elektryczne (EM), schematy jednokreskowe, generowanie PDF/DOCX.
- **Audit Hub** — centralny feed audytowy (Super Admin).

Produkcja: **https://www.wgdom.fun** · Repo: **github.com/dawidthai125/wgdom** (`main`)

**Stack:** React 18 + Vite 6 + TypeScript · Supabase (Edge Functions + KV) · Vercel · PWA · Capacitor (Android/iOS) · MUI + Radix + Tailwind 4.

---

## 2. Gdzie jest SSOT (Single Source of Truth)

| Obszar | SSOT |
|--------|------|
| **Synchronizacja / merge (klient)** | `src/lib/cloud-sync.ts` |
| **Backend / merge (Edge)** | `supabase/functions/make-server-0afb8820/index.tsx` |
| **UI monolit** | `src/app/App.tsx` (+ panele w `src/app/`) |
| **Wersja UI** | `src/app/changelog-data.ts` → `CHANGELOG[0].version` |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **Workflow deweloperski** | [`AGENTS.md`](AGENTS.md) |
| **Baseline prod (handoff)** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **Status sesji / backlog** | [`CURRENT-TASK.md`](CURRENT-TASK.md) |

> **Parytet klient↔Edge:** merge listy płac musi dawać identyczny wynik w `cloud-sync.ts` i w Edge `index.tsx`. To twardy wymóg (regresja B6). Nie zmieniaj jednej strony bez drugiej.

---

## 3. Aktualny status (skrót)

- **Prod v2.63.27** GREEN · HEAD `fd56cf7` zawiera zmiany po ostatnim bumpie UI (Version Banner Refresh, Work Catalog P3.1/P3.2, **PAYROLL P0 Incident S1–S3/S5 CLOSED**).
- **Payroll P0 Incident** (cross‑week, tombstones, zero‑hours, settled) — **CLOSED**.
- **STABILIZATION WINDOW ACTIVE** od 2026‑07‑01 — utrzymanie, bez nowych epiców.
- **NG‑05 MPI** (Market Pricing Intelligence) — DESIGN COMPLETE, **IMPLEMENT BLOCKED**.

Pełny obraz: [`PROJECT-STATUS.md`](PROJECT-STATUS.md) · [`ROADMAP.md`](ROADMAP.md)

---

## 4. Workflow (obowiązkowy)

```
AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → COMMIT → PUSH → VERIFY → CLOSE
```

Zasady naczelne:

- **One Bundle = One Goal** — jeden cel na bundle, commituj tylko pliki dotyczące celu.
- **SSOT FIRST / AUDIT FIRST** — najpierw zrozum źródło prawdy i przeprowadź audyt, dopiero potem kod.
- Podsumowania i komunikacja **po polsku**.

Szczegóły: [`CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md) · [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## 5. Czego NIE robić

- ❌ **Nie zaczynaj nowych epiców** — STABILIZATION WINDOW ACTIVE (wymaga polecenia właściciela).
- ❌ **Nie zmieniaj sync / merge** (`cloud-sync.ts`, Edge `index.tsx`) bez audytu i bez zachowania parytetu klient↔Edge — patrz `docs/ARCHITECTURE.md` § 11.
- ❌ **Nie zgaduj architektury** — sprawdź `PROJECT-GUIDE.md`, `ARCHITECTURE.md`, `AGENTS.md`.
- ❌ **Nie używaj `vercel deploy` / `vercel --prod`** — deploy przez `git push origin main` (Vercel Git Integration).
- ❌ **Nie implementuj NG‑05 MPI** — zablokowane do decyzji AD‑01 / owner command.
- ❌ **PowerShell:** brak `&&` i heredoców — komendy rozdzielaj `;`, commit message przez `git commit -F <plik>`.
- ❌ Nie commituj śmieci: `_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`.

Pełna lista długu i pułapek: [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md)

---

## 6. Od czego zacząć pracę

1. Przeczytaj **ten plik** → [`PROJECT-STATUS.md`](PROJECT-STATUS.md) (co jest teraz) → [`AI-HANDOFF.md`](AI-HANDOFF.md) (jak działa całość).
2. Jeśli jesteś agentem Cursor: [`CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md) (workflow, commity, testy).
3. Ustal cel z właścicielem (One Bundle = One Goal). W razie wątpliwości — **AUDIT FIRST**.
4. Sprawdź `CURRENT-TASK.md` i `docs/PROJECT-HANDOFF-CURRENT.md` — najświeższy baseline i backlog.
5. Dopiero potem implementuj.

---

## 7. Komplet dokumentacji AI‑handoff

| Dokument | Do czego |
|----------|----------|
| [`AI-START-HERE.md`](AI-START-HERE.md) | **Ten plik** — pierwszy kontakt |
| [`PROJECT-STATUS.md`](PROJECT-STATUS.md) | Aktualny stan produkcji, EPIC‑i, releasy |
| [`AI-HANDOFF.md`](AI-HANDOFF.md) | Pełny handoff: architektura, SSOT, zasady, moduły |
| [`CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md) | Sposób pracy agenta Cursor + WIP |
| [`ROADMAP.md`](ROADMAP.md) | Completed / In Progress / Planned / Backlog |
| [`CHANGELOG-SUMMARY.md`](CHANGELOG-SUMMARY.md) | Podsumowanie dużych zmian (MB, TI, Work Catalog, Payroll…) |
| [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md) | Dług techniczny High / Medium / Low |
