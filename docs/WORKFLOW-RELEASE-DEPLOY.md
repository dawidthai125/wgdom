# W&G DOM — oficjalny workflow release / deploy

> **Źródło prawdy** dla agentów AI, programistów i raportów końcowych sesji.  
> **Hasło agenta:** „kontynuuj WGDOM” · **Powiązane:** [`AGENTS.md`](../AGENTS.md) · [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md) § 13

**Ostatnia aktualizacja:** 2026-06-11

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

## 3. VERIFY DEPLOY (wyłącznie te 3 kroki)

Po `git push origin main` uznaj deploy za poprawny, gdy:

1. **`git push` SUCCESS** — branch `main` zaktualizowany na GitHub
2. **`version.json` pokazuje oczekiwaną wersję** — https://www.wgdom.fun/version.json (przy release z bumpiem CHANGELOG)
3. **Aplikacja otwiera się poprawnie** — szybki smoke manualny lub znany test modułu

**Jeśli `version.json` pokazuje nową wersję → deployment uznajemy za poprawny.**

### Nie wykonuj (zakazane w raportach i agentach)

- GitHub Deployments API polling
- Vercel API polling
- `gh api .../commits/{sha}/status` w pętli „wait for SUCCESS”
- pętle `sleep` czekające na Vercel bot
- raportowanie „Vercel deployment ID” jako warunek GO (informacyjnie OK, nie blokuje werdyktu)

---

## 4. Oficjalne workflow WGDOM

Wybierz wariant według zakresu zmiany.

### A. Minor changes (docs, copy, hotfix import, refactor bez UI)

```text
build
→ commit
→ push
→ verify version.json
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
→ verify version.json
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
→ verify version.json
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
| **`version.json`** | oczekiwana wersja vs prod |
| **Deploy** | OK gdy push OK + version.json zgodny (lub docs-only bez bumpu) + app OK |

**Nie wymagane w raporcie:** status Vercel API, deployment ID, czas oczekiwania na bot.

---

## 6. Proces feature (przed IMPLEMENT)

Niezależnie od wariantu A/B/C, nowa funkcja przechodzi:

```text
AUDIT → RCA → PLAN → IMPLEMENT → (workflow A/B/C)
```

Szczegóły: [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) § „Proces pracy”.

---

## 7. Szybka mapa dokumentów

| Dokument | Rola |
|----------|------|
| **Ten plik** | ★ Workflow release/deploy A/B/C + VERIFY |
| [`AGENTS.md`](../AGENTS.md) | Start agenta + kolejność CHANGELOG/ARCHITECTURE |
| [`DEPLOY.md`](../DEPLOY.md) | Jednorazowa konfiguracja GitHub + Vercel |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 13 | Vercel, PWA, version awareness |
| [`guidelines/ROZWOJ.md`](../guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
