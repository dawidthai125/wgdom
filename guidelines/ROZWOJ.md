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
| `kw-tenders-pipeline` | Przetargi BZP — pipeline, dossier, fit, wyniki BZP, historia szacunku (sync w `DATA_KEYS` od v2.45) |
| `kw-tenders-company-profile` | Profil firmy pod przetargi (schema **v6**, koszty, referencje) |
| `kw-tenders-custom-keywords` | Słowa kluczowe uczone / edytowane w UI |
| `kw-tenders-deleted-ids` | ID usuniętych z pipeline (nie wracają z BZP) |
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

**Galeria admin (v2.45.10):** zakładka Zdjęcia → rozwinięcie roboty → ZIP całej galerii lub ZIP kategorii. Logika: `photo-download.ts`, `photo-zip.ts`. Patrz **ARCHITECTURE.md § 12.1.2**.

Po zmianie `supabase/functions/make-server-0afb8820/index.tsx` → deploy Supabase (GitHub Action lub CLI).

## Przetargi BZP (v2.37+, rozbudowa v2.45.7–2.45.10)

Moduł w `src/lib/tenders-bzp*.ts`, `tenders-actions.ts`, `tenders-wadium.ts`, `tender-*.ts`. UI: `TendersView`, `TenderBidPrepPanel`, `TendersMapPanel` (SVG, zwijana).  
Pełny opis flow, endpointów i pól pipeline → **`docs/ARCHITECTURE.md` § 12.1.1**.

Nowe endpointy przetargowe (np. `GET /tenders-bzp-award-result`, `POST /tenders-external-discover`) wymagają deploy Supabase.

**Mapa przetargów:** nie używać `staticmap.openstreetmap.de` (niedostępny) — tylko SVG w `TendersMapPanel`.

## Uruchomienie lokalne

```bash
npm i
npm run dev
npm run build
npm run test:mobile
npm run audit:mobile
```

## Deploy

**★ Oficjalny workflow:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](../docs/WORKFLOW-RELEASE-DEPLOY.md)

- **Frontend:** `git push origin main` → Vercel Git Integration (auto). **Nie** `vercel deploy` / `vercel --prod`.
- **Backend:** push `supabase/functions/**` → workflow `deploy-supabase.yml`.
- **VERIFY DEPLOY:** push OK + `version.json` prod + app OK — bez pollingu GitHub/Vercel.
- **PWA:** po release z bumpiem CHANGELOG → `npm run build` generuje `dist/sw.js` (`wgdom-shell-{APP_VERSION}`). **Nie** edytuj `public/sw.js`.
