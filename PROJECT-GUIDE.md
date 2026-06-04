# W&G DOM — PROJECT GUIDE

> Odpowiada na pytanie: **„Jak działa ten projekt?”**  
> Pełna treść techniczna (~700 linii) → **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**  
> **Nie zgaduj architektury** — czytaj ARCHITECTURE przed większymi zmianami.

**Produkcja:** https://wgdom.fun · **Stack:** React/Vite · Supabase Edge · Vercel · PWA · Capacitor

---

## Mapa dokumentu (ARCHITECTURE.md)

| Sekcja | Temat |
|--------|--------|
| § 1 | Szybki start, komendy |
| § 2–3 | Stack, architektura wysokiego poziomu |
| § 4–9 | Bootstrap, auth, panele (admin / inspektor / pracownik) |
| § 10 | Model danych (`Job`, `WeekEmployee`, klucze LS) |
| § 11 | **Sync i merge** (`cloud-sync.ts`) — **KRYTYCZNE** |
| § 12 | Supabase backend, endpointy, **§ 12.1.1 przetargi**, **§ 12.1.3 COMMAND CENTER + pulpit 7G** |
| — | **[`docs/tender-center-7g-executive.md`](docs/tender-center-7g-executive.md)** — executive summary na pulpicie (AI) |
| § 13–14 | Vercel, PWA, mobile |
| § 15–16 | Struktura katalogów, mapa `src/lib/` |
| § 17 | Jak bezpiecznie rozbudować |
| § 18 | Testy (`test:mobile`, `audit:mobile`) |
| § 19 | Czego nie commitować |
| § 22 | Historia kluczowych wersji |

---

## Handoff sesji 2026-06-04 (agent AI)

Po hasłach **„kontynuuj WGDOM”** / nowa sesja — najpierw [`docs/SESSION-HANDOFF-2026-06.md`](docs/SESSION-HANDOFF-2026-06.md), potem [`CURRENT-TASK.md`](CURRENT-TASK.md).

| Temat | Dokument |
|-------|----------|
| Stan prod Faza 8–9 + UX `622bbbb` | `SESSION-HANDOFF-2026-06.md` |
| Roboty 2.0 (rekomendacja MIN) | `docs/jobs-2.0-product-audit.md` |
| Martwy kod (7 plików legacy CC) | `docs/dead-code-audit-2026-06.md` |
| Uprawnienia Przetargów | `docs/permissions-roles-audit-2026-06.md` |

**Prod HEAD:** `622bbbb` · **UI:** 2.45.31 · **Nie implementować** 9.0.2 / Roboty 2.0 bez polecenia.

---

## Known Issues — przeczytaj przed większą zmianą

### Sync (§ 11.3–11.5) — najczęstsze regresje

1. **Nigdy** nie trzymaj trwałych danych tylko w React state — zawsze LS + chmura.
2. Partial push musi iść przez `prepareKeysForCloudPush` — inaczej nadpiszesz edycje z innej karty.
3. Inspektor + admin w jednej karcie — storage events; między urządzeniami — merge po timestamp.
4. Usuwanie roboty → `addDeletedJobId` + `pushJobsAfterDelete`.
5. **Stale localStorage** może przywrócić usunięte klucze KV (admin passwords, martwe URL w jobs) — fix P11/P15 w `CloudLoader`; po incydencie **hard refresh**. → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)
6. **Payroll Guard** — nie omijaj `wouldBlockPayrollShrink` przy push listy płac.
7. **`kw-admin-passwords`** — osobny merge (`mergeAdminPasswordOverrides`), nie ogólny `mergeDataKey`.

### Stabilność czerwiec 2026 (prod `main` @ `92d574e`)

| Temat | Commit | Test |
|-------|--------|------|
| Payroll Guard | `db1d05a` | symulacja w `INCIDENTS-2026-06.md` |
| Bootstrap payroll P11 | `c9db032` | `scripts/test-p11-bootstrap-payroll.mjs` |
| Admin passwords P15 | `92d574e` | `scripts/test-p15-admin-password-merge.mjs` |

Operacje KV (Szymon/Paweł override, martwe URL) — tylko read-then-set ze snapshotem; szczegóły w INCIDENTS.

### Monolit UI

- Główny plik: `src/app/App.tsx` (bardzo duży) — szukaj widoków po nazwie, nie czytaj od zera.
- Nowe duże panele → `src/app/*.tsx` (wzór: `TendersView`, `InspectorPanel`).

### Deploy

- **Frontend:** push `main` → Vercel (automatycznie).
- **Edge Function:** zmiany w `supabase/functions/**` → GitHub Action (`deploy-supabase.yml`).
- Po zmianie cache PWA → podbij wersję w `public/sw.js`.

### Przetargi (stan v2.45.12)

- Mapa: kafelki **OpenStreetMap** + markery (`TendersMapPanel.tsx`, `tenders-map-coords.ts`).
- **Nie używać** `staticmap.openstreetmap.de` — domena niedostępna.
- Słownik scoringu: wbudowany w `tenders-bzp-keywords.ts` + opcjonalne własne w chmurze (`kw-tenders-custom-keywords`).

### Mobile

- Playwright ≠ prawdziwy Safari — krytyczne scroll/touch sprawdź na iPhone.
- Inputy ≥16px, touch target ≥44px.

Pełna lista pułapek → **ARCHITECTURE.md § 11.3, § 17**.

---

## Kluczowe pliki

| Obszar | Pliki |
|--------|--------|
| Sync | `src/lib/cloud-sync.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/index.tsx` |
| Auth admin | `src/lib/admin-auth.ts` |
| Przetargi | `src/lib/tenders-bzp.ts`, `src/app/TendersView.tsx` |
| Deploy docs | `DEPLOY.md`, `SUPABASE-DEPLOY.md` |

---

## Powiązane dokumenty

| Plik | Rola |
|------|------|
| [`AGENTS.md`](AGENTS.md) | **Jak pracować** nad projektem (workflow agenta) |
| [`CHANGELOG.md`](CHANGELOG.md) | **Co zrobiono** — skrót ostatnich wersji |
| [`CURRENT-TASK.md`](CURRENT-TASK.md) | **Gdzie skończyliśmy** — wznowienie sesji |
| [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md) | **Incydenty sync/payroll/admin** — czerwiec 2026 |
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
