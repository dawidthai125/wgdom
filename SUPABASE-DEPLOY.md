# Supabase — wdrożenie backendu (krok po kroku)

Backend W&G DOM to **jedna Edge Function** na Supabase. Frontend (Vercel) tylko do niej woła — bez deployu Supabase **nie zadziałają** m.in.:

- email z roboty,
- wgrywanie zdjęć,
- **link podglądu dla klienta** (v2.5).

**Twój projekt:** `bdpygdvfgbggermvqtys`  
**Nazwa funkcji:** `make-server-0afb8820`  
**Pliki w repozytorium:** `supabase/functions/make-server-0afb8820/index.tsx` + `kv_store.tsx`

---

## Spis treści

1. [Wejście do Supabase](#1-wejście-do-supabase)
2. [Sprawdzenie Edge Function](#2-sprawdzenie-edge-function)
3. [Auto-deploy GitHub Actions (zalecane)](#3-auto-deploy-github-actions-zalecane)
4. [Wdrożenie ręczne (Dashboard)](#4-wdrożenie-ręczne-dashboard)
5. [Sekret RESEND_API_KEY (email)](#5-sekret-resend_api_key-email)
6. [Test czy działa](#6-test-czy-działa)
7. [Opcja: deploy przez CLI lokalnie](#7-opcja-deploy-przez-cli-lokalnie)
8. [Rozwiązywanie problemów](#8-rozwiązywanie-problemów)
9. [Odpowiedzi na maile (Reply-To)](#9-odpowiedzi-na-maile-reply-to-vs-skrzynka-birowgdomfun)

---

## 1. Wejście do Supabase

1. Otwórz [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Zaloguj się na konto, na którym masz projekt W&G DOM
3. Kliknij projekt **`bdpygdvfgbggermvqtys`** (lub ten, którego ID masz w Vercel jako `VITE_SUPABASE_PROJECT_ID`)

---

## 2. Sprawdzenie Edge Function

1. W lewym menu: **Edge Functions**
2. Powinna być funkcja **`make-server-0afb8820`**
   - **Jeśli jest** → przejdź do kroku 3 (aktualizacja kodu)
   - **Jeśli nie ma** → utwórz nową funkcję o tej nazwie (Deploy a new function → możesz wkleić kod z repozytorium)

---

## 3. Auto-deploy GitHub Actions (zalecane)

Po jednorazowej konfiguracji **nie musisz** wklejać kodu w Dashboard — deploy leci sam po `git push` na `main`, gdy zmieni się coś w `supabase/functions/`.

### 3a. Jednorazowo: token w GitHub

1. Wejdź na [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token** (np. nazwa: `GitHub Actions`)
2. Skopiuj token (`sbp_...`) — pokazuje się **tylko raz**
3. GitHub → repo **wgdom** → **Settings** → **Secrets and variables** → **Actions**
4. Zakładka **Secrets** (nie Variables!) → **New repository secret**
5. Nazwa **dokładnie:** `SUPABASE_ACCESS_TOKEN` (wielkość liter ma znaczenie)
6. Wklej token → **Add secret**

> **Variables ≠ Secrets.** Workflow czyta `Secrets`. Jeśli wkleiłeś token tylko w Variables — skopiuj go też do **Secrets** albo uruchom workflow po aktualizacji (obsługuje oba).

### 3a2. Włącz Actions (jeśli zakładka Actions jest pusta)

1. GitHub → repo **wgdom** → **Settings** → **Actions** → **General**
2. **Allow all actions and reusable workflows**
3. Zapisz

### 3a3. Ręczne uruchomienie (gdy dodałeś token po pushu)

1. GitHub → **Actions** → **Deploy Supabase Edge Functions**
2. **Run workflow** → branch **main** → **Run workflow**
3. Po dodaniu sekretu możesz też **Re-run failed jobs** przy czerwonym runie

### 3b. Jak to działa

- Workflow: `.github/workflows/deploy-supabase.yml`
- Trigger: push na `main` + zmiana w `supabase/functions/**` lub `supabase/config.toml`
- Ręczny deploy: GitHub → **Actions** → **Deploy Supabase Edge Functions** → **Run workflow**

### 3c. Sprawdzenie po pushu

1. GitHub → **Actions** — zielony check przy ostatnim runie
2. Supabase → **Edge Functions** → `make-server-0afb8820` — data deployu świeża
3. Test `/health` (sekcja 6)

> **Vercel** robi front automatycznie. **GitHub Actions** robi Supabase. Ty tylko `git push`.

---

## 4. Wdrożenie ręczne (Dashboard)

Użyj tylko gdy GitHub Actions nie działa albo nie masz jeszcze sekretu `SUPABASE_ACCESS_TOKEN`.

Funkcja składa się z **dwóch plików**. Oba muszą być na serwerze.

### 4a. Plik główny `index.tsx`

1. **Edge Functions** → kliknij **`make-server-0afb8820`**
2. Otwórz edytor kodu (zakładka **Code** / **Edit**)
3. **Usuń całą starą zawartość** pliku głównego
4. Skopiuj **cały** plik z komputera:
   ```
   supabase/functions/make-server-0afb8820/index.tsx
   ```
   (z GitHub po pushu albo lokalnie z folderu WGDOM1 — commit `1dd9247` lub nowszy dla v2.5)
5. Wklej do edytora Supabase

### 4b. Plik pomocniczy `kv_store.tsx`

1. W tym samym edytorze funkcji dodaj **drugi plik** (przycisk **Add file** / **+** obok listy plików)
2. Nazwa pliku: **`kv_store.tsx`**
3. Skopiuj zawartość z:
   ```
   supabase/functions/make-server-0afb8820/kv_store.tsx
   ```
4. Wklej i zapisz

### 4c. Deploy

1. Kliknij **Deploy** (lub **Save and deploy**)
2. Poczekaj, aż status będzie **Active** / zielony (zwykle 30–60 s)
3. Po deployu funkcja obsługuje m.in.:

| Metoda | Endpoint | Do czego (wersja) |
|--------|----------|-------------------|
| GET | `/health` | Test serwera |
| POST | `/batch-get`, `/batch-set`, `/batch-del` | Synchronizacja danych |
| POST | `/storage-upload` | Zdjęcia z telefonu |
| POST | `/send-backup-email` | Auto-backup w poniedziałek |
| POST | `/send-job-email` | Email z roboty (v2.4) |
| POST | `/send-payroll-email` | Email listy płac — PDF/Word + HTML (v2.7) |
| POST | `/send-job-files-email` | Email z plikami inspektora (v2.14) |
| POST | `/send-sms-bulk` | SMS pilne do pracowników (v2.19) |
| GET | `/payroll-backup-status` | Kopie listy płac / archiwum (v2.7.1) |
| POST | `/restore-payroll-backup` | Przywróć listę płac z kopii chmurowej (v2.7.1) |
| GET | `/data-backup-status` | Status kopii wszystkich kluczy + dzienny backup (v2.7.2) |
| POST | `/restore-data-backup` | Przywróć wszystkie dane z kopii chmurowej (v2.7.2) |
| **GET** | **`/client-share?token=...`** | **Link podglądu dla klienta (v2.5)** |

| **GET** | **`/jobs-backup-status`** | **Ile robót w kopii prev/prev2 (v2.5.1)** |
| **POST** | **`/restore-jobs-backup`** | **Przywróć roboty z kopii chmurowej (v2.5.1)** |

> **v2.5.1 — ochrona robót:** przy każdym zapisie `kw-jobs` serwer robi kopię (`prev`, `prev2`, dzienna). Gdy zapis wygląda podejrzanie (np. z 6 robót zostaje 1), **scala** zamiast nadpisywać.

> **v2.7.2 — pełna ochrona:** to samo dla listy płac, archiwum, pracowników (`kw-directory`) i kontaktów. Przy każdym `batch-set` zapisywany jest też dzienny pełny backup `kw-full-day-YYYY-MM-DD`. Klient przed zapisem scala dane lokalne z chmurowymi.

---

## 5. Sekret RESEND_API_KEY (email)

Bez tego klucza wysyłka emaili zwróci błąd *„RESEND_API_KEY not set”*.

### 5a. Klucz z Resend (jeśli jeszcze nie masz)

1. Wejdź na [https://resend.com](https://resend.com) → załóż konto / zaloguj
2. **API Keys** → **Create API Key**
3. Skopiuj klucz (zaczyna się od `re_...`) — **pokazuje się tylko raz**

### 5b. Wklejenie sekretu w Supabase

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

5. Zapisz i **Deploy** funkcji (krok 4c)

> **Nie dodawaj** `RESEND_API_KEY` do Vercel — to sekret tylko dla serwera Supabase.

### 5d. Sekrety SMS (v2.19 — ogłoszenia pilne)

Do wysyłki SMS z **Pulpitu** / **Pracownicy** → „SMS pilne” potrzebujesz **jednego** dostawcy:

#### Opcja A — SMSAPI.pl (zalecane w Polsce)

1. Konto na [smsapi.pl](https://www.smsapi.pl) → **API** → token OAuth
2. Supabase → Edge Functions → **Secrets**:
   - `SMSAPI_TOKEN` — token Bearer
   - *(opcjonalnie)* `SMSAPI_FROM` — nadawca (np. nazwa firmy, jeśli masz w panelu)
   - *(opcjonalnie)* `SMS_PREFIX` — prefiks każdej wiadomości, np. `W&G:`

#### Opcja B — Twilio

| Sekret | Opis |
|--------|------|
| `TWILIO_ACCOUNT_SID` | SID konta |
| `TWILIO_AUTH_TOKEN` | Token auth |
| `TWILIO_FROM_NUMBER` | Numer nadawcy E.164, np. `+48123456789` |
| `SMS_PREFIX` | *(opcj.)* prefiks treści |

Po dodaniu sekretów zrób **Deploy** funkcji (GitHub Actions lub Dashboard).

### 5c. Po zmianie sekretów

- Jeśli Supabase prosi o **redeploy** funkcji — zrób Deploy jeszcze raz (krok 4c) albo push na `main` (GitHub Actions)

---

## 6. Test czy działa

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
Invoke-RestMethod -Uri "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/health" -Headers @{ Authorization = "Bearer $anon"; apikey = $anon }
```

Oczekiwany wynik:

```
status
------
ok
```

**Alternatywa:** w aplikacji [wgdom.fun](https://wgdom.fun) sprawdź ikonę chmurki u góry — jeśli synchronizacja działa (szara/zielona chmurka), backend jest OK i health w przeglądarce możesz pominąć.

---

### Test B — email z aplikacji

1. Wejdź na [https://wgdom.fun](https://wgdom.fun) (lub wgdom.vercel.app)
2. **Kontakty** → dodaj kontakt z **prawdziwym emailem**
3. **Roboty** → wybierz robotę ze zdjęciami lub raportem
4. **Email** → wybierz odbiorcę, zaznacz pozycje → **Wyślij**
5. Sprawdź skrzynkę (i folder **Spam**)

---

### Test C — link podglądu dla klienta (v2.5)

**W aplikacji (admin):**

1. **Roboty** → wybierz robotę
2. Sekcja **„Podgląd dla klienta”** → **Utwórz link podglądu** → **Kopiuj**
3. Link wygląda np. tak:
   ```
   https://wgdom.fun/?podglad=abc123def456...
   ```
4. Otwórz link w **trybie incognito** albo wyślij komuś — **bez logowania**
5. Powinieneś zobaczyć adres, zaakceptowane zdjęcia i raporty (bez kosztów, notatek wewnętrznych)

**Co klient NIE zobaczy:**

- zdjęć oczekujących na akceptację (`pending`),
- odrzuconych zdjęć,
- kosztów pracy i materiałów,
- notatek admina.

**Test techniczny (PowerShell)** — zamień `TOKEN` i `TWOJ_ANON_KEY`:

```powershell
$anon = "TWOJ_ANON_KEY"
$token = "TOKEN_Z_LINKU"
Invoke-RestMethod -Uri "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820/client-share?token=$token" -Headers @{ Authorization = "Bearer $anon" }
```

Oczekiwany wynik: `ok : True` oraz obiekt `job` z adresem i tablicą `photos`.

Jeśli `Link nieaktywny` — w aplikacji włącz link ponownie albo sprawdź, czy synchronizacja zapisała `clientShare` w chmurze (chmurka zielona).

---

### Test D — logi błędów

Jeśli coś nie działa:

1. Supabase → **Edge Functions** → **`make-server-0afb8820`**
2. Zakładka **Logs** / **Invocations**
3. Szukaj czerwonych wpisów przy wysyłce emaila, wgrywaniu zdjęć lub otwarciu linku klienta

---

## 7. Opcja: deploy przez CLI lokalnie

Tylko jeśli masz zainstalowane [Supabase CLI](https://supabase.com/docs/guides/cli).

```powershell
# W folderze projektu WGDOM1
npm i -g supabase

# Logowanie (otworzy przeglądarkę)
supabase login

# Połączenie z projektem
supabase link --project-ref bdpygdvfgbggermvqtys

# Sekret (jednorazowo)
supabase secrets set RESEND_API_KEY=re_twoj_klucz

# Deploy funkcji
supabase functions deploy make-server-0afb8820 --project-ref bdpygdvfgbggermvqtys
```

> Jeśli CLI zgłasza brak `config.toml`, bezpieczniej użyj **kroku 3 (Dashboard)** — wklejenie dwóch plików ręcznie.

---

## 8. Rozwiązywanie problemów

| Objaw | Co zrobić |
|--------|-----------|
| `UNAUTHORIZED_NO_AUTH_HEADER` | Otworzyłeś URL funkcji w przeglądarce bez klucza — użyj testu A (PowerShell) albo testuj z aplikacji |
| `RESEND_API_KEY not set` | Dodaj sekret w kroku 4, redeploy funkcji |
| `404` na `/send-job-email` | Stary kod na Supabase — powtórz krok 3 (wklej nowy `index.tsx`) |
| `404` na `/client-share` | Brak v2.5 na Supabase — wklej nowy `index.tsx` z commitem `1dd9247+` i Deploy |
| Link klienta: „Link nieaktywny” | W Roboty → włącz link; upewnij się, że chmurka zsynchronizowała dane (`clientShare.enabled = true`) |
| Link klienta: pusty ekran / błąd | Otwórz link z **wgdom.fun** (Vercel v2.5); stary frontend nie ma widoku `?podglad=` |
| Link klienta: brak zdjęć | Klient widzi tylko **zaakceptowane** zdjęcia — w Roboty kliknij ✓ przy zdjęciach |
| Email nie dochodzi | Sprawdź spam; domena `wgdom.fun` musi być zweryfikowana w Resend |
| Backup nie przychodzi w poniedziałek | Wdróż nowy `index.tsx`; backup idzie na `dawid.thai@int.pl` |
| Klient odpisuje, nic nie przychodzi | Resend **nie odbiera** poczty na `biuro@wgdom.fun` — Reply-To (sekcja 8) |
| `Brak treści do wysłania` | W modalu email zaznacz co najmniej jedno zdjęcie lub element raportu |
| Czerwona chmurka w app | Internet / Supabase — sprawdź health (test A) |
| Zdjęcia w mailu puste | Bucket `make-0afb8820-photos` musi być publiczny (ustawiane automatycznie przez funkcję) |
| Kolejka offline nie wysyła | To frontend (IndexedDB) — nie Supabase; wróć sieć i kliknij „Wyślij teraz” w trybie pracownika |

---

## Co wdrożyć po każdej aktualizacji?

| Zmiana w kodzie | Gdzie deploy |
|-----------------|--------------|
| Tylko `src/`, `public/` (React, PWA, UI) | **Git push** → Vercel sam zbuduje |
| `supabase/functions/make-server-0afb8820/*` | **Supabase** (ten dokument, krok 3) |
| Nowy sekret (np. nowy klucz Resend) | Supabase → Secrets (krok 4) |

---

## Szybka checklista v2.5

- [ ] Edge Function `make-server-0afb8820` — wdrożony **nowy** `index.tsx` (z endpointem `GET /client-share`) + `kv_store.tsx`
- [ ] Sekret `RESEND_API_KEY` ustawiony (jeśli używasz emaili)
- [ ] Health przetestowany (test A) **albo** synchronizacja w app działa
- [ ] Vercel ma **v2.5** (commit `1dd9247` lub nowszy — PWA, link klienta, kolejka offline)
- [ ] Test linku klienta (test C) — podgląd w incognito działa
- [ ] Test email z roboty (test B) — opcjonalnie, jeśli wysyłasz maile

---

## Szybka checklista v2.4 (email z roboty)

- [ ] Edge Function — wdrożony `index.tsx` z `send-job-email`
- [ ] Sekret `RESEND_API_KEY` ustawiony
- [ ] Vercel ma v2.4+ (Kontakty + przycisk Email)
- [ ] Test wysyłki — mail dotarł

---

## 9. Odpowiedzi na maile (Reply-To vs skrzynka biuro@wgdom.fun)

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
