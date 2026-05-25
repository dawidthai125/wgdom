# W&G DOM — jak rozwijać aplikację

## Chmura

Dane firmowe są w Supabase (funkcja `make-server-0afb8820`). Moduł: `src/lib/cloud-sync.ts`.

| Klucz | Zawartość |
|-------|-----------|
| `kw-directory` | Kartoteka pracowników |
| `kw-week-employees` | Lista płac — bieżący tydzień |
| `kw-archive` | Zapisane tygodnie |
| `kw-weekFrom` / `kw-weekTo` | Zakres dat tygodnia |
| `kw-jobs` | Roboty (w tym zdjęcia w metadanych) |
| `kw-admin-hash` | Hash hasła admina |

Synchronizacja automatyczna co ~2 s po zmianie (panel admina). Tryb pracownika przy zdjęciach zapisuje `kw-jobs` od razu.

## Lista zmian

Menu → **Zmiany** → tablica `CHANGELOG` w `App.tsx`. Nowa wersja = nowy blok na początku listy.

## Instrukcja

Menu → **Instrukcja** → funkcja `HelpView` w `App.tsx`. Każda nowa funkcja musi mieć opis po polsku.

## Zdjęcia pracowników (Supabase Storage)

Po zmianie `supabase/functions/server/index.tsx` trzeba **wdrożyć funkcję** na Supabase (Dashboard → Edge Functions → deploy, lub `supabase functions deploy`).

Wymagany bucket: `make-0afb8820-photos` (tworzy się automatycznie przy pierwszym uploadzie).

## Uruchomienie lokalne

```bash
npm i
npm run dev
```
