# W&G DOM

System zarządzania robotami, listą płac i inspekcją WM — **https://www.wgdom.fun**

React + Vite · Supabase · Vercel · PWA · Capacitor (Android/iOS)

---

## Dla programistów

**Zacznij tutaj (obowiązkowo):**

| Dokument | Opis |
|----------|------|
| **[`AGENTS.md`](AGENTS.md)** | **START HERE** — jak pracować (workflow deweloperski) |
| **[`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)** | **★ Release/deploy A/B/C** + VERIFY (oficjalny) |
| **[`PROJECT-GUIDE.md`](PROJECT-GUIDE.md)** | Jak działa projekt + Known Issues |
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Pełna architektura, sync, API, deploy |
| **[`CHANGELOG.md`](CHANGELOG.md)** | Skrót ostatnich wersji (źródło prawdy: `src/app/changelog-data.ts`) |
| **[`CURRENT-TASK.md`](CURRENT-TASK.md)** | Wznowienie sesji — co skończone / co dalej |
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
| [`docs/OPTIMIZATION.md`](docs/OPTIMIZATION.md) | Audyt wydajności Web + Mobile |
| [`docs/MOBILE-NATIVE.md`](docs/MOBILE-NATIVE.md) | Capacitor, APK, PWA |

Przy każdej zmianie aktualizuj **CHANGELOG** (`changelog-data.ts` + `CHANGELOG.md`) i — gdy dotyczy architektury — **`docs/ARCHITECTURE.md`**. Na końcu sesji — **`CURRENT-TASK.md`**.

---

## Uruchomienie

```bash
npm install
npm run dev      # http://127.0.0.1:5173
```

Zmienne: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY` (`.env` lokalnie, Vercel na produkcji).

```bash
npm run build
npm run test:mobile
```

---

## Deploy

- **Frontend:** `git push origin main` → Vercel Git Integration — szczegóły: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)
- **Supabase Edge Function:** zmiany w `supabase/functions/` → GitHub Actions  
- **PWA:** nowy wpis w `changelog-data.ts` (wersja UI) → `npm run build` generuje `dist/sw.js` z cache `wgdom-shell-{APP_VERSION}`
