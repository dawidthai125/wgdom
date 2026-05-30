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
| § 12 | Supabase backend, endpointy, **§ 12.1.1 przetargi** |
| § 13–14 | Vercel, PWA, mobile |
| § 15–16 | Struktura katalogów, mapa `src/lib/` |
| § 17 | Jak bezpiecznie rozbudować |
| § 18 | Testy (`test:mobile`, `audit:mobile`) |
| § 19 | Czego nie commitować |
| § 22 | Historia kluczowych wersji |

---

## Known Issues — przeczytaj przed większą zmianą

### Sync (§ 11.3) — najczęstsze regresje

1. **Nigdy** nie trzymaj trwałych danych tylko w React state — zawsze LS + chmura.
2. Partial push musi iść przez `prepareKeysForCloudPush` — inaczej nadpiszesz edycje z innej karty.
3. Inspektor + admin w jednej karcie — storage events; między urządzeniami — merge po timestamp.
4. Usuwanie roboty → `addDeletedJobId` + `pushJobsAfterDelete`.

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
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
