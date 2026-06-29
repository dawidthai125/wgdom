# W&G DOM — oficjalny workflow release / deploy

> **Źródło prawdy** dla programistów i raportów końcowych sesji.  
> **Hasło sesji:** „kontynuuj WGDOM” · **Powiązane:** [`AGENTS.md`](../AGENTS.md) · [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) § 13

**Ostatnia aktualizacja:** 2026-06-22 · **VERIFY DEPLOY FAST** · **§ 6 Deploy blockers (P0)**

---

## 1. Frontend deploy (Vercel)

| Element | Wartość |
|---------|---------|
| **Integracja** | GitHub → **Vercel Git Integration** |
| **Trigger** | `git push origin main` |
| **Build** | Vercel uruchamia `npm run build` → `dist/` |
| **Domeny prod** | https://www.wgdom.fun · https://www.wgdom.online |

### Zakazane (nie wykonuj)

- `vercel deploy`
- `vercel --prod`
- ręczny deploy z CLI Vercel zamiast pusha na `main`

Deploy frontendu **zawsze** przez push na `main`. Vercel buduje automatycznie.

### Backend (Supabase) — osobno

Push na `main` **tylko gdy** zmieni się `supabase/functions/**` → GitHub Action `deploy-supabase.yml`.  
Szczegóły: [`SUPABASE-DEPLOY.md`](../SUPABASE-DEPLOY.md) · ARCHITECTURE § 12.2.

---

## 2. Wersja UI i `version.json`

**Źródło prawdy:** `CHANGELOG[0].version` w [`src/app/changelog-data.ts`](../src/app/changelog-data.ts).

Przy buildzie Vite generuje `dist/version.json` → `{ "version": "2.50.x" }`.

**Widoczna zmiana dla użytkownika** → nowy wpis CHANGELOG (+0.1 patch) **przed** commitem release.

**Tylko docs / hotfix bez bumpu** → `version.json` na prod może pozostać na poprzedniej wersji; deploy i tak jest poprawny, jeśli push przeszedł i aplikacja działa.

Sprawdzenie prod:

```bash
curl -s https://www.wgdom.fun/version.json
```

---

## 3. VERIFY DEPLOY FAST

Po `git push origin main` wykonawca wykonuje **dokładnie jedno** sprawdzenie prod i **kończy raport**. Bez oczekiwania na Vercel.

### 3.1 Algorytm (obowiązkowy)

```bash
curl -s https://www.wgdom.fun/version.json
```

**Jednorazowo** — zaraz po push. Następnie:

| Wynik `version.json` | **Deploy** | **PRODUCTION VERIFIED** | Dalsze działanie |
|----------------------|------------|---------------------------|-------------------------|
| Oczekiwana wersja (przy bumpie CHANGELOG) | **PASS** | **TAK** | Zakończ raport |
| Poprzednia wersja (Vercel jeszcze nie zbudował) | **DEPLOY PROPAGATING** | **NIE** | Zakończ raport — status oczekiwany po propagacji Vercel |
| Push nie przeszedł | **FAIL** | **NIE** | Zakończ raport z błędem push |

**Docs-only / brak bumpu CHANGELOG:** `version.json` może pozostać na poprzedniej wersji — przy push SUCCESS uznaj **Deploy: PASS**, **PRODUCTION VERIFIED: NIE DOTYCZY** (brak nowej wersji UI).

**Opcjonalnie (nie blokuje werdyktu):** szybki manualny smoke aplikacji na prod — tylko gdy release tego wymaga; **nie** w pętli z `version.json`.

### 3.2 Pojęcia werdyktu (rozdziel obowiązkowo w raporcie)

| Pojęcie | Warunki | Blokuje RELEASE GO? |
|---------|---------|---------------------|
| **RELEASE GO** | build PASS · smoke PASS (jeśli B/C) · commit PASS · push PASS | — |
| **PRODUCTION VERIFIED** | Jedno `curl` → `version.json` = oczekiwana wersja (przy bumpie) | Nie — to osobny wymiar |
| **DEPLOY PROPAGATING** | push OK, ale `version.json` jeszcze stare | Nie — RELEASE GO możliwe; prod potwierdzi się po propagacji Vercel (~1–3 min) |

**RELEASE GO** nie wymaga czekania na nową wersję na prod. **PRODUCTION VERIFIED** wymaga zgodności `version.json` w **tym jednym** sprawdzeniu.

### 3.3 Zakazane (w raportach i u programistów)

- **Retry loops** na `version.json` (drugi/trzeci `curl` po push)
- **`sleep`**, `wait 30s` / `wait 60s`, oczekiwanie na propagację w tej samej sesji
- **Polling** `version.json` w pętli
- GitHub Deployments API polling
- Vercel API polling
- `gh api .../commits/{sha}/status` w pętli „wait for SUCCESS”
- Oczekiwanie na status SUCCESS deploymentu jako warunek zakończenia raportu
- Raportowanie „Vercel deployment ID” jako warunek GO (informacyjnie OK, nie blokuje werdyktu)

> **Uwaga:** Polling `/version.json` co 5 min w aplikacji (`useAppVersionCheck`) to **UX w przeglądarce** — nie dotyczy verify po push.

---

## 4. Oficjalne workflow WGDOM

Wybierz wariant według zakresu zmiany.

### A. Minor changes (docs, copy, hotfix import, refactor bez UI)

```text
build
→ commit
→ push
→ verify FAST (jedno curl version.json)
→ report
```

**Przykłady:** brakujący import, literówka w docs, zmiana komentarza, housekeeping dokumentacji.

**Komendy:**

```bash
npm run build
git add …
git commit -m "…"
git push origin main
curl -s https://www.wgdom.fun/version.json
```

---

### B. Functional UI changes (widoczna zmiana w aplikacji)

```text
build
→ relevant smoke
→ commit
→ push
→ verify FAST (jedno curl version.json)
→ report
```

**Przykłady:** Pulpit, Roboty, Lista płac panel, CC, nowy banner, zmiana layoutu.

**Smoke:** skrypt(y) vite-node / Playwright **dotyczące zmienionego modułu** (nie cała regresja, chyba że ryzyko szerokie).

**Przed commitem (WGDOM standard kodu):**

1. Implementacja (+ chmura jeśli dane trwałe)
2. `changelog-data.ts` + `CHANGELOG.md`
3. `HelpView` / hinty (jeśli widoczne)
4. `docs/ARCHITECTURE.md` (jeśli architektura / deploy / sync)

---

### C. Major releases (sprint zamknięty, platforma, E2E gate)

```text
build
→ smoke
→ E2E
→ commit
→ push
→ verify FAST (jedno curl version.json)
→ report
```

**Przykłady:** seria 20.5Z, Dashboard V2, zmiana sync/PWA, release z CI gate.

**E2E (lokalnie przed push lub po merge — wg sprintu):**

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version
```

**CI:** `.github/workflows/e2e-happy-path.yml` na GitHub Actions (informacyjnie; nie zastępuje lokalnego smoke przed push, gdy sprint tego wymaga).

---

## 5. Raport końcowy (szablon)

Po każdym release / hotfix / housekeeping podaj:

| Pole | Zawartość |
|------|-----------|
| **Workflow** | A / B / C |
| **Zmienione pliki** | lista |
| **Build** | PASS / FAIL |
| **Smoke / E2E** | wynik (jeśli dotyczy) |
| **Commit SHA** | krótki + pełny |
| **Push** | SUCCESS / FAIL |
| **RELEASE GO** | TAK / NIE (build + smoke + commit + push) |
| **Verify** (jedno curl) | PASS / **DEPLOY PROPAGATING** / FAIL |
| **`version.json`** | MATCH `2.50.x` / STALE `2.50.y` / N/A (docs-only bez bumpu) |
| **Deploy** | PASS / **DEPLOY PROPAGATING** / FAIL |
| **PRODUCTION VERIFIED** | TAK / NIE / NIE DOTYCZY |

**Nie wymagane w raporcie:** status Vercel API, deployment ID, czas oczekiwania na bot, drugi `curl` po push.

---

## 6. Deploy blockers (P0) — lekcje z 2026-06-22

**Handoff:** [`SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md)

Prod była zamrożona na **2.62.25** (`43ebc3f`) mimo pushy na `main` — **Vercel BUILD FAILED**, nie opóźnienie cache.

### 6.1 Checklist przed `git push`

```bash
npm run build
git status --porcelain src/          # brak ?? w nowych plikach importowanych z tracked kodu
git ls-files | findstr nowy-modul      # każdy import @/lib/* musi być tracked
```

| Objaw lokalny | Objaw Vercel | Fix |
|---------------|--------------|-----|
| Build PASS, plik `??` w status | `Could not load … ENOENT` | `git add` + commit brakującego pliku |
| Build PASS po `rm -rf dist` | `[wgdom-version-json] ENOENT dist/version.json` | `mkdirSync` przed zapisem w pluginie Vite |

### 6.2 Werdykt deploy — rozróżnij

| Sygnał | Znaczenie |
|--------|-----------|
| GitHub status `Vercel: success` | **Build Vercel PASS** |
| `version.json` = nowa wersja + commit | **PRODUCTION VERIFIED** |
| Push OK, `version.json` stare | **DEPLOY PROPAGATING** lub **BUILD FAILED** — sprawdź status Vercel |

**Incydent 2026-06-22:** przez wiele godzin `version.json` pokazywało 2.62.25 — przyczyna: kolejne commity **nie deployowały się** (build error), nie „wolny Vercel”.

---

## 7. Proces feature (przed IMPLEMENT)

Niezależnie od wariantu A/B/C, nowa funkcja przechodzi:

```text
AUDIT → RCA → PLAN → IMPLEMENT → (workflow A/B/C)
```

Szczegóły: [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) § „Proces pracy”.

---

## 8. Szybka mapa dokumentów

| Dokument | Rola |
|----------|------|
| **Ten plik** | ★ Workflow release/deploy A/B/C + VERIFY |
| [`SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md) | ★ P0 deploy blockers — untracked imports, mkdir dist |
| [`AGENTS.md`](../AGENTS.md) | Start sesji + kolejność CHANGELOG/ARCHITECTURE |
| [`DEPLOY.md`](../DEPLOY.md) | Jednorazowa konfiguracja GitHub + Vercel |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 13 | Vercel, PWA, version awareness |
| [`guidelines/ROZWOJ.md`](../guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
