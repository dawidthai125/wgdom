# Supabase — wdrożenie backendu (krok po kroku)

Backend W&G DOM to **jedna Edge Function** na Supabase. Frontend (Vercel) tylko do niej woła — bez deployu Supabase email z roboty **nie zadziała**.

**Twój projekt:** `kchwyjlnkdlymwvsnfiu`  
**Nazwa funkcji:** `make-server-0afb8820`  
**Pliki w repozytorium:** `supabase/functions/server/index.tsx` + `kv_store.tsx`

---

## Spis treści

1. [Wejście do Supabase](#1-wejście-do-supabase)
2. [Sprawdzenie Edge Function](#2-sprawdzenie-edge-function)
3. [Wdrożenie kodu (Dashboard)](#3-wdrożenie-kodu-dashboard)
4. [Sekret RESEND_API_KEY (email)](#4-sekret-resend_api_key-email)
5. [Test czy działa](#5-test-czy-działa)
6. [Opcja: deploy przez CLI](#6-opcja-deploy-przez-cli)
7. [Rozwiązywanie problemów](#7-rozwiązywanie-problemów)

---

## 1. Wejście do Supabase

1. Otwórz [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Zaloguj się na konto, na którym masz projekt W&G DOM
3. Kliknij projekt **`kchwyjlnkdlymwvsnfiu`** (lub ten, którego ID masz w Vercel jako `VITE_SUPABASE_PROJECT_ID`)

---

## 2. Sprawdzenie Edge Function

1. W lewym menu: **Edge Functions**
2. Powinna być funkcja **`make-server-0afb8820`**
   - **Jeśli jest** → przejdź do kroku 3 (aktualizacja kodu)
   - **Jeśli nie ma** → utwórz nową funkcję o tej nazwie (Deploy a new function → możesz wkleić kod z repozytorium)

---

## 3. Wdrożenie kodu (Dashboard)

Funkcja składa się z **dwóch plików**. Oba muszą być na serwerze.

### 3a. Plik główny `index.tsx`

1. **Edge Functions** → kliknij **`make-server-0afb8820`**
2. Otwórz edytor kodu (zakładka **Code** / **Edit**)
3. **Usuń całą starą zawartość** pliku głównego
4. Skopiuj **cały** plik z komputera:
   ```
   supabase/functions/server/index.tsx
   ```
   (z repozytorium GitHub po pushu albo lokalnie z folderu WGDOM1)
5. Wklej do edytora Supabase

### 3b. Plik pomocniczy `kv_store.tsx`

1. W tym samym edytorze funkcji dodaj **drugi plik** (przycisk **Add file** / **+** obok listy plików)
2. Nazwa pliku: **`kv_store.tsx`**
3. Skopiuj zawartość z:
   ```
   supabase/functions/server/kv_store.tsx
   ```
4. Wklej i zapisz

### 3c. Deploy

1. Kliknij **Deploy** (lub **Save and deploy**)
2. Poczekaj, aż status będzie **Active** / zielony (zwykle 30–60 s)
3. Po deployu funkcja ma m.in. nowy endpoint:
   ```
   POST .../send-job-email
   ```
   (oprócz starych: `batch-get`, `batch-set`, `storage-upload`, `send-backup-email`)

---

## 4. Sekret RESEND_API_KEY (email)

Bez tego klucza wysyłka emaili zwróci błąd *„RESEND_API_KEY not set”*.

### 4a. Klucz z Resend (jeśli jeszcze nie masz)

1. Wejdź na [https://resend.com](https://resend.com) → załóż konto / zaloguj
2. **API Keys** → **Create API Key**
3. Skopiuj klucz (zaczyna się od `re_...`) — **pokazuje się tylko raz**

### 4b. Wklejenie sekretu w Supabase

1. Supabase Dashboard → **Edge Functions**
2. Zakładka **Secrets** (czasem: **Manage secrets**)
3. **Add new secret** — wymagany:
   - **Name:** `RESEND_API_KEY`
   - **Value:** wklej klucz `re_...`
4. *(Opcjonalnie — domyślne wartości w kodzie już OK po weryfikacji wgdom.fun)*:

| Sekret | Domyślnie w kodzie | Po co |
|--------|-------------------|--------|
| `BACKUP_EMAIL` | `dawid.thai@int.pl` | Auto-backup w poniedziałek |
| `RESEND_FROM` | `W&G DOM <biuro@wgdom.fun>` | Nadawca maili |
| `REPLY_TO_EMAILS` | `biuro@wgdom.pl,dawid.thai@int.pl` | Gdzie trafia „Odpowiedz” |

5. Zapisz i **Deploy** funkcji (krok 3c)

> **Nie dodawaj** `RESEND_API_KEY` do Vercel — to sekret tylko dla serwera Supabase.

### 4c. Po zmianie sekretów

- Jeśli Supabase prosi o **redeploy** funkcji — zrób Deploy jeszcze raz (krok 3c)

---

## 5. Test czy działa

### Test A — health check (⚠️ nie w zwykłej przeglądarce)

Supabase **wymaga nagłówka autoryzacji** przy każdym wywołaniu funkcji.  
Jeśli wkleisz URL health w pasek adresu, dostaniesz:

```json
{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}
```

**To normalne** — nie znaczy, że funkcja jest zła.

#### Jak prawidłowo przetestować

1. Supabase Dashboard → **Project Settings** → **API**
2. Skopiuj klucz **`anon` `public`** (długi JWT zaczynający się od `eyJ...`)
3. W **PowerShell** (Windows) uruchom — wklej swój klucz zamiast `TWOJ_ANON_KEY`:

```powershell
$anon = "TWOJ_ANON_KEY"
Invoke-RestMethod -Uri "https://kchwyjlnkdlymwvsnfiu.supabase.co/functions/v1/make-server-0afb8820/health" -Headers @{ Authorization = "Bearer $anon"; apikey = $anon }
```

Oczekiwany wynik:

```
status
------
ok
```

**Alternatywa:** w aplikacji [wgdom.vercel.app](https://wgdom.vercel.app) sprawdź ikonę chmurki u góry — jeśli synchronizacja działa (szara/zielona chmurka), backend jest OK i health w przeglądarce możesz pominąć.

### Test B — email z aplikacji

1. Wejdź na [https://wgdom.vercel.app](https://wgdom.vercel.app) (po deployu Vercel z v2.4)
2. **Kontakty** → dodaj kontakt z **prawdziwym emailem** (możesz swój)
3. **Roboty** → wybierz robotę ze zdjęciami lub raportem
4. **Email** → wybierz odbiorcę, zaznacz pozycje → **Wyślij**
5. Sprawdź skrzynkę (i folder **Spam**)

### Test C — logi błędów

Jeśli coś nie działa:

1. Supabase → **Edge Functions** → **`make-server-0afb8820`**
2. Zakładka **Logs** / **Invocations**
3. Szukaj czerwonych wpisów przy kliknięciu „Wyślij” w aplikacji

---

## 6. Opcja: deploy przez CLI

Tylko jeśli masz zainstalowane [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# W folderze projektu WGDOM1
npm i -g supabase

# Logowanie (otworzy przeglądarkę)
supabase login

# Połączenie z projektem
supabase link --project-ref kchwyjlnkdlymwvsnfiu

# Sekret (jednorazowo)
supabase secrets set RESEND_API_KEY=re_twoj_klucz

# Deploy funkcji (ścieżka zależy od struktury — w tym projekcie pliki są w server/)
supabase functions deploy make-server-0afb8820 --project-ref kchwyjlnkdlymwvsnfiu
```

> Jeśli CLI zgłasza brak `config.toml`, bezpieczniej użyj **kroku 3 (Dashboard)** — wklejenie dwóch plików ręcznie.

---

## 7. Rozwiązywanie problemów

| Objaw | Co zrobić |
|--------|-----------|
| `UNAUTHORIZED_NO_AUTH_HEADER` | Otworzyłeś URL funkcji w przeglądarce bez klucza — użyj testu A (PowerShell) albo testuj z aplikacji |
| `RESEND_API_KEY not set` | Dodaj sekret w kroku 4, redeploy funkcji |
| `404` na `/send-job-email` | Stary kod na Supabase — powtórz krok 3 (wklej nowy `index.tsx`) |
| Email nie dochodzi | Sprawdź spam; na Resend free domain `onboarding@resend.dev` może trafiać do spamu |
| Resend: „only send testing emails to your own email” | Zweryfikuj domenę `wgdom.fun` w Resend (już zrobione) i wdróż nowy `index.tsx` |
| Backup nie przychodzi w poniedziałek | Wdróż nowy `index.tsx`; backup idzie na `dawid.thai@int.pl` |
| Klient odpisuje, nic nie przychodzi | Resend **nie odbiera** poczty na `biuro@wgdom.fun` — używamy Reply-To (patrz sekcja 8) |
| Resend: „validation error” | Adres odbiorcy musi być poprawny (`name@domena.pl`) |
| `Brak treści do wysłania` | W modalu zaznacz co najmniej jedno zdjęcie lub element raportu |
| Czerwona chmurka w app | Internet / Supabase — sprawdź health (test A) |
| Zdjęcia w mailu puste | Bucket `make-0afb8820-photos` musi być publiczny (ustawiane automatycznie przez funkcję) |

---

## Co wdrożyć po każdej aktualizacji backendu?

| Zmiana w kodzie | Gdzie deploy |
|-----------------|--------------|
| Tylko `src/` (React, UI) | **Git push** → Vercel sam zbuduje |
| `supabase/functions/server/*` | **Supabase** (ten dokument, krok 3) |
| Nowy sekret (np. nowy klucz Resend) | Supabase → Secrets (krok 4) |

---

## Szybka checklista v2.4 (email z roboty)

- [ ] Edge Function `make-server-0afb8820` — wdrożony nowy `index.tsx` + `kv_store.tsx`
- [ ] Sekret `RESEND_API_KEY` ustawiony
- [ ] Health przetestowany przez PowerShell **albo** synchronizacja w app działa
- [ ] Vercel ma v2.4 (frontend z zakładką Kontakty i przyciskiem Email)
- [ ] Test wysyłki z aplikacji — mail dotarł

---

## 8. Odpowiedzi na maile (Reply-To vs skrzynka biuro@wgdom.fun)

**Resend służy tylko do WYSYŁANIA.** Adres `biuro@wgdom.fun` **nie ma skrzynki pocztowej** — jak ktoś napisze bezpośrednio na ten adres, mail **nie dotrze** (chyba że skonfigurujesz przekierowanie DNS).

### Co robi aplikacja (już w kodzie)

Każdy mail wysyłany z aplikacji ma:

| Pole | Wartość |
|------|---------|
| **Od (From)** | `biuro@wgdom.fun` — profesjonalny nadawca |
| **Odpowiedz (Reply-To)** | `biuro@wgdom.pl` + `dawid.thai@int.pl` |

Gdy klient w Gmailu/Outlooku klika **„Odpowiedz”**, odpowiedź idzie na **Reply-To** (`.pl` i `@int.pl`), **nie** na `@wgdom.fun`.

> Większość programów pocztowych bierze **pierwszy** adres Reply-To (`biuro@wgdom.pl`). Ustaw przekierowanie/kopię z `@wgdom.pl` → `@int.pl` u swojego hostingu poczty `.pl`, żeby oba były na bieżąco.

### Jeśli ktoś napisze BEZPOŚREDNIO na biuro@wgdom.fun

To wymaga **przekierowania poczty** na domenie `wgdom.fun` (poza aplikacją), np.:

1. **[Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)** (darmowe) — jeśli DNS `wgdom.fun` jest w Cloudflare  
   → reguła: `biuro@wgdom.fun` → forward na `biuro@wgdom.pl` i `dawid.thai@int.pl`
2. **[ImprovMX](https://improvmx.com)** — darmowy forward przez rekordy MX na `wgdom.fun`
3. **Panel rejestratora domeny** — często ma „przekierowanie email” / alias

Vercel **nie obsługuje** skrzynek pocztowych — tylko hosting aplikacji.
