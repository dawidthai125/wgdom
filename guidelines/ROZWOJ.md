# W&G DOM — jak rozwijać aplikację

> **Pełna architektura (dla AI / programisty):** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)  
> Przy każdej większej zmianie aktualizuj ten plik równolegle z CHANGELOG.

## Chmura

Dane firmowe są w Supabase (funkcja `make-server-0afb8820`). Moduł: `src/lib/cloud-sync.ts`.

| Klucz | Zawartość |
|-------|-----------|
| `kw-directory` | Kartoteka pracowników |
| `kw-week-employees` | Lista płac — bieżący tydzień |
| `kw-archive` | Zapisane tygodnie |
| `kw-weekFrom` / `kw-weekTo` | Zakres dat tygodnia |
| `kw-jobs` | Roboty (w tym zdjęcia w metadanych) |
| `kw-contacts` | Kontakty e-mail |
| `kw-admin-passwords` | Hash hasła per użytkownik |
| `kw-admin-users-config` | Role, custom users |

Synchronizacja automatyczna co ~2 s po zmianie (panel admina). Inspektor/worker: `pushKeysToCloudSafe` z merge localStorage.

## Lista zmian

Menu → **Zmiany** → tablica `CHANGELOG` w `App.tsx`. Nowa wersja = nowy blok na początku listy.

## Instrukcja

Menu → **Instrukcja** → funkcja `HelpView` w `App.tsx`. Każda nowa funkcja musi mieć opis po polsku.

## Dokument architektury

**`docs/ARCHITECTURE.md`** — opis paneli, syncu, Supabase, Vercel, PWA, testów, pułapek.  
Aktualizuj przy każdej zmianie architektury / syncu / API / mobile / deployu.

## Zdjęcia i pliki (Supabase Storage)

Bucket: `make-0afb8820-photos`. Endpointy: `storage-upload`, `storage-delete` w Edge Function.

Po zmianie `supabase/functions/make-server-0afb8820/index.tsx` → deploy Supabase (GitHub Action lub CLI).

## Uruchomienie lokalne

```bash
npm i
npm run dev
npm run build
npm run test:mobile
npm run audit:mobile
```

## Deploy

- **Frontend:** push `main` → Vercel auto-deploy. Env: `VITE_SUPABASE_*`.
- **Backend:** push `supabase/functions/**` → workflow deploy-supabase.
- **PWA:** po deploy podbij `wgdom-shell-vN` w `public/sw.js`.
