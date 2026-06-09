# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-09  
**Wersja UI (lokalnie):** **2.50.48** — Inspektor admin simplification 20.5B.2  
**Prod `origin/main`:** **`134431f`** · v2.50.46 · https://www.wgdom.fun  
**Status:** **IMPLEMENT lokalny 20.5B.2** · **bez commit / push / deploy**

---

## Sprint 20.5B.2 — Inspector Admin Simplification (**IMPLEMENT lokalny**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.48** |
| **Zakres** | Feed hub admin · deep linki Roboty · email plików · Portfolio WM → Pulpit · DELETE `InspectorAdminJobDetail` |

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `src/lib/inspector-feed-deeplink.ts` | Mapa typ feedu → sekcja Roboty |
| `src/app/InspectorAdminView.tsx` | Feed monitoringu (bez karty roboty) |
| `src/app/JobsView.tsx` | `initialJobSection` + `JobInspectorFilesPanel` w Pliki |
| `src/app/DashboardView.tsx` | `WmPortfolioView` na Pulpicie |
| `src/app/App.tsx` | `pendingJobSection` · `openJobInJobs` |

### Smoke / build (lokalnie)

| Test | Wynik |
|------|-------|
| `smoke-test-inspector-admin-simplification-20.5b2.mjs` | uruchomić |
| `npm run build` | **PASS** |

### Następne (po commit)

- Deploy Vercel po push `main`
- Weryfikacja prod: feed → Roboty, email plików, Portfolio na Pulpicie

---

## Sprint 20.5A.9 — Technical Drawing Workflow (**RELEASED lokalnie 2.50.47**)

Pełny opis w [`CHANGELOG.md`](CHANGELOG.md) · commit oczekuje na polecenie użytkownika.
