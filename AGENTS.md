# W&G DOM — instrukcja dla agentów AI i programistów

> **Zanim cokolwiek zmienisz lub przeanalizujesz — przeczytaj ten plik i dokument poniżej.**

## 1. Obowiązkowy punkt startu

**[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — pełny przewodnik systemu:

- panele (admin, inspektor, pracownik), routing, auth  
- sync i merge (`cloud-sync.ts`, `DATA_KEYS`, pułapki)  
- Supabase Edge Function + endpointy  
- Vercel, PWA, Capacitor, mobile  
- jak bezpiecznie dodawać funkcje bez psucia syncu  
- testy, deploy, czego nie commitować  

**Nie analizuj `App.tsx` plik po pliku od zera** — najpierw ARCHITECTURE.md.

## 2. Przy każdej zmianie w kodzie

1. Implementacja (+ chmura, jeśli dane trwałe)  
2. `CHANGELOG` w `src/app/App.tsx` (nowy wpis na górze)  
3. Instrukcja użytkownika (`HelpView`, hinty) — jeśli widoczne w UI  
4. **Aktualizacja [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — sekcja dotycząca zmiany + data na górze  
5. Podsumowanie po **polsku**  

Szczegóły: [`.cursor/rules/wgdom-development.mdc`](.cursor/rules/wgdom-development.mdc) · skrót: [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md)

## 3. Szybkie fakty

| | |
|---|---|
| Produkcja | https://wgdom.fun |
| Repo | https://github.com/dawidthai125/wgdom · branch `main` |
| Wersja UI | `CHANGELOG[0].version` w `App.tsx` |
| Frontend deploy | push `main` → Vercel |
| Backend deploy | push `supabase/functions/**` → GitHub Action |
| Sync | `src/lib/cloud-sync.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/index.tsx` |
| Monolit UI | `src/app/App.tsx` (+ wydzielone panele w `src/app/`) |

## 3a. Moduł przetargów (skrót)

Szczegóły: **ARCHITECTURE.md § 12.1.1**. Kluczowe pliki (stan **v2.45.10**):

- `src/lib/tenders-bzp.ts` — pipeline, typy, API klienta, `patchOurEstimatePln`  
- `src/lib/tenders-actions.ts` — chipy akcji, auto-wynik BZP, alerty pulpitu, .ics  
- `src/lib/tenders-bzp-analyze-local.ts` — analiza SWZ pdf.js (klient)  
- `src/lib/tenders-wadium.ts` — wadium + blokada vs limit profilu  
- `src/lib/tenders-map-coords.ts` + `TendersMapPanel.tsx` — mapa SVG Wrocław (nie staticmap OSM)  
- `src/app/TenderBidPrepPanel.tsx` — karta ofertowa  
- `src/lib/tender-external-docs.ts` — BIP / linki z ogłoszenia (v2.44)  
- `src/app/TenderDetailPanel.tsx` — auto-analiza przy expand  
- Edge: `GET /tenders-bzp-*`, `GET /tenders-bzp-award-result`, `POST /tenders-external-discover`

## 3b. Galeria admin (skrót)

Szczegóły: **ARCHITECTURE.md § 12.1.2**.

- `JobPhotosGalleryView` w `App.tsx` — zakładka **Zdjęcia**  
- `src/lib/photo-download.ts` — `downloadJobGalleryZip` (foldery przed / w-realizacji / po-odbior)  
- `src/lib/photo-zip.ts` — JSZip helper

## 4. Komendy

```bash
npm run dev          # localhost:5173
npm run build
npm run test:mobile  # Playwright → wgdom.fun
npm run audit:mobile # statyczny audyt mobile
```

## 5. Nie commitować

`_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`, `icons/`, `music/` (chyba że celowo).

## 6. Hasło sesji (Cursor)

Użytkownik może napisać **„kontynuuj WGDOM”** — wtedy czytaj też [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc).
