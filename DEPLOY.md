# W&G DOM — wdrożenie (GitHub + Vercel)

## 1. GitHub

```bash
git init
git add .
git commit -m "Initial commit — W&G DOM"
git branch -M main
git remote add origin https://github.com/TWOJ_USER/wgdom.git
git push -u origin main
```

Repozytorium utwórz na [github.com/new](https://github.com/new) (np. nazwa `wgdom`, **bez** README — już masz kod lokalnie).

## 2. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import repozytorium z GitHub
3. Framework: **Vite** (wykryje automatycznie)
4. **Environment Variables** (Production + Preview + Development):

| Nazwa | Wartość |
|-------|---------|
| `VITE_SUPABASE_PROJECT_ID` | `kchwyjlnkdlymwvsnfiu` |
| `VITE_SUPABASE_ANON_KEY` | klucz anon z Supabase → Settings → API |
| `VITE_SUPABASE_FUNCTION_SLUG` | `make-server-0afb8820` |

5. **Deploy**

Po każdym `git push` na `main` Vercel zbuduje nową wersję (jak teraz localhost, tylko publicznie).

## 3. Supabase (backend — auto-deploy przez GitHub)

Frontend na Vercel **tylko** woła API. Edge Function zostaje na Supabase:

- Kod: `supabase/functions/make-server-0afb8820/`
- **Auto-deploy:** po pushu na `main` (GitHub Actions) — jednorazowo dodaj sekret `SUPABASE_ACCESS_TOKEN` w GitHub → Settings → Secrets
- Ręcznie (gdy trzeba): Supabase Dashboard → Edge Functions → `make-server-0afb8820`
- Sekrety (Dashboard → Edge Functions → Secrets):
  - `RESEND_API_KEY` — backup email i wysyłka materiałów z robót (opcjonalnie)
  - `SUPABASE_SERVICE_ROLE_KEY` — zwykle ustawiane automatycznie

**Nie wrzucaj** `SERVICE_ROLE_KEY`, `RESEND_API_KEY` ani `SUPABASE_ACCESS_TOKEN` do Vercel — to sekrety serwera / CI.

Szczegółowa instrukcja: **[SUPABASE-DEPLOY.md](./SUPABASE-DEPLOY.md)** (sekcja 3 — GitHub Actions).

## 4. Lokalnie

```bash
cp .env.example .env   # uzupełnij wartości
npm i
npm run dev
```

## 5. Domena własna (opcjonalnie)

Vercel → Project → Settings → Domains → dodaj np. `app.twoja-firma.pl`.
