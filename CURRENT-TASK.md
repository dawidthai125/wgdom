# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.46** — Media Library UX 20.5A.8  
**Prod `origin/main`:** **2.50.45** · (po deploy 20.5A.7) · https://www.wgdom.fun  
**Status lokalny:** **IMPLEMENT DONE** · **bez commit / push / deploy**  
**Handoff:** [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)

---

## Sprint 20.5A.8 — Media Library UX Scope A (**IMPLEMENT DONE, lokalnie**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.46** |
| **Commit** | *(brak — czeka na COMMIT GO)* |
| **Zakres** | Separacja Zdjęcia/Pliki + liczniki + ZIP (bez generic attachments → 20.5A.9) |

### Smoke / build

| Test | Wynik |
|------|-------|
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-inspector-billing-proposal-20.5a6.mjs` | **59/59 PASS** |
| `npm run build` | **PASS** |

### Kluczowe pliki

- `src/lib/media-separation.ts` — źródło prawdy obrazy vs dokumenty
- `src/lib/job-files-index.ts`, `job-files-browser.ts` — katalog Pliki (docs only)
- `src/lib/job-documents-pack.ts`, `photo-download.ts` — ZIP separation
- `src/app/MediaView.tsx`, `JobPhotosGalleryView.tsx` — liczniki + galeria rozszerzona
- `scripts/smoke-test-media-separation-20.5a8.mjs`

### Następny krok

Commit + push → Vercel deploy (po zatwierdzeniu użytkownika).  
**20.5A.9** — generic file attachments (poza scope A).

---

## Sprint 20.5A.7 — Role Visibility (**RELEASED prod 2.50.45**)

Zamknięty w poprzedniej sesji — patrz `CHANGELOG.md` · `role-visibility.ts`.

---

## Backlog (bez polecenia)

- **20.5A.9** — Generic File Attachments (Dodaj plik poza zlec/kosz)
- **20.5A.6** — już na prod (2.50.44)
- **20.3C** — legacy CC + GuideView
