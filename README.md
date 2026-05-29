# W&G DOM

System zarządzania robotami, listą płac i inspekcją WM — **https://wgdom.fun**

React + Vite · Supabase · Vercel · PWA · Capacitor (Android/iOS)

---

## Dla programisty / agenta AI

**Zacznij tutaj (obowiązkowo):**

| Dokument | Opis |
|----------|------|
| **[`AGENTS.md`](AGENTS.md)** | Punkt wejścia dla AI — co czytać na start |
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Pełna architektura, sync, API, deploy, pułapki |
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
| [`docs/MOBILE-NATIVE.md`](docs/MOBILE-NATIVE.md) | Capacitor, APK, PWA |

Przy każdej zmianie aktualizuj **CHANGELOG** (`App.tsx`) i — gdy dotyczy architektury — **`docs/ARCHITECTURE.md`**.

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

- **Frontend:** `git push origin main` → Vercel  
- **Supabase Edge Function:** zmiany w `supabase/functions/` → GitHub Actions  
- **PWA:** po deploy podbij `wgdom-shell-vN` w `public/sw.js`
