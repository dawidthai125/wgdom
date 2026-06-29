# SESSION HANDOFF — Production Unblock (2026-06-22)

> **Status:** **CLOSED** · **PRODUCTION VERIFIED**  
> **Prod po unblock:** **2.62.31** · commit **`d79f7c1`** · https://www.wgdom.fun/version.json  
> **Poprzedni zamrożony prod:** **2.62.25** · commit **`43ebc3f`** (od ~07:37 UTC 2026-06-22)

---

## 1. Co się stało (RCA)

Od commita **`c869be7`** (TP190C-2E, 2.62.26) **wszystkie deploye Vercel na `main` padały**. Produkcja pozostała na **`43ebc3f` (2.62.25)** mimo kolejnych pushy (TP201E-B, TP202A, mkdir fix).

**Objaw użytkownika:** banner „nowa wersja dostępna” lub brak propagacji feature'ów — **przyczyna: BUILD FAILED na Vercel**, nie cache PWA.

### Blocker #1 — `ENOENT dist/version.json`

| | |
|---|---|
| **Błąd Vercel** | `[wgdom-version-json] ENOENT: dist/version.json` w `closeBundle()` |
| **Przyczyna** | Plugin Vite zapisuje `dist/version.json` bez `mkdirSync` — na czystym buildzie Vercel katalog `dist/` może nie istnieć w momencie zapisu |
| **Fix** | `mkdirSync(path.dirname(outPath), { recursive: true })` w `vite.config.ts` (`versionJsonPlugin`, `serviceWorkerPlugin`) + `scripts/generate-service-worker.mjs` |
| **Commit** | **`8a2f6d8`** — `Fix Vercel deploy blocker` |

### Blocker #2 — brakujący tracked plik

| | |
|---|---|
| **Błąd Vercel** | `[vite:load-fallback] Could not load …/tender-cost-content-detection (imported by tender-cost-discovery.ts): ENOENT` |
| **Przyczyna** | Commit **`c869be7`** dodał importy w `tender-cost-discovery.ts` i `tenders-bzp-doc-parse.ts`, ale **nie zacommitował** nowego modułu `src/lib/tender-cost-content-detection.ts` |
| **Dlaczego lokalnie PASS** | Plik istniał na dysku jako **untracked** (`??` w `git status`) |
| **Fix** | `git add` + commit modułu + test regresji |
| **Commit** | **`d79f7c1`** — `Fix production deployment blockers` |

---

## 2. Commity odblokowujące (kolejność)

```text
8a2f6d8  Fix Vercel deploy blocker
         vite.config.ts · scripts/generate-service-worker.mjs

d79f7c1  Fix production deployment blockers
         src/lib/tender-cost-content-detection.ts
         scripts/test-tender-cost-content-detection.mjs
```

**Weryfikacja po push `d79f7c1`:**

- GitHub commit status `Vercel`: **success**
- `curl https://www.wgdom.fun/version.json` → `2.62.31` / `d79f7c1`

---

## 3. Moduł `tender-cost-content-detection.ts`

**P1 Smart Cost Document Detection** — klasyfikacja kosztorysu/przedmiaru po **treści** pliku (XLSX bytes), sygnał dodatkowy obok ATH i reguł nazwy pliku.

| Importujący (tracked) | Użycie |
|----------------------|--------|
| `src/lib/tender-cost-discovery.ts` | `scoreCostDocumentFromXlsxBytes`, typy wyniku |
| `src/lib/tenders-bzp-doc-parse.ts` | `isOfferFormXlsxBytes`, scoring treści |

**Test:** `npx vite-node scripts/test-tender-cost-content-detection.mjs` — **19 PASS**

**Nie usuwać / nie refaktorować bez polecenia** — discovery kosztorysu w pipeline BZP.

---

## 4. Build pipeline (Vite) — mapa dla programistów

```text
npm run build
  → vite build (2752+ modułów)
  → plugin wgdom-version-json (closeBundle)
       scripts/build-version-json.mjs ← CHANGELOG[0].version (changelog-data.ts)
       zapis: dist/version.json  (+ commit SHA, timestamp)
  → plugin wgdom-service-worker
       scripts/generate-service-worker.mjs → dist/sw.js
  → output: dist/ → Vercel static hosting
```

| Plik | Rola |
|------|------|
| `src/app/changelog-data.ts` | **SSOT wersji UI** — `CHANGELOG[0].version` |
| `vite.config.ts` | Pluginy build-time, `define __APP_VERSION__` |
| `src/lib/app-version-check.ts` | Polling `/version.json` co 5 min + focus |
| `src/app/AppUpdateBanner.tsx` | Banner „Odśwież teraz” |
| `vercel.json` | `Cache-Control: no-store` dla `/version.json` |

**Deploy frontend:** wyłącznie `git push origin main` → Vercel Git Integration. **Zakaz:** `vercel deploy` / `vercel --prod`.

---

## 5. Checklist przed push (obowiązkowy dla programistów)

Po dodaniu **nowego pliku** w `src/`:

```bash
git status                                    # czy plik jest ?? (untracked)?
git ls-files | findstr nazwa-pliku            # czy tracked?
npm run build                                 # lokalny PASS ≠ Vercel PASS
```

Po imporcie `@/lib/nowy-modul` w commited pliku:

```bash
git ls-files src/lib/nowy-modul.ts            # MUSI zwrócić ścieżkę
```

**Reguła:** jeśli `npm run build` PASS lokalnie, ale plik jest `??` — **Vercel zawsze FAIL**.

---

## 6. Architektura aplikacji (skrót — pełna mapa gdzie indziej)

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser PWA · React 18 · Vite · TypeScript                 │
├─────────────────────────────────────────────────────────────┤
│  src/app/App.tsx           shell admin + worker + login     │
│  src/app/AdminViewRouter   routing widoków admina           │
│  src/app/*View.tsx         panele (Jobs, Payroll, Tenders…) │
│  src/app/tenders/          moduł Przetargi 3.0              │
│  src/lib/*                 logika domenowa (sync, tenders)  │
├─────────────────────────────────────────────────────────────┤
│  LocalStorage  ←merge/push→  Supabase KV (cloud-sync.ts)    │
│  Storage upload  ←→  Edge Function make-server-0afb8820   │
└─────────────────────────────────────────────────────────────┘
```

**Pełna dokumentacja:**

| Dokument | Zawartość |
|----------|-----------|
| [`AGENT-ONBOARDING.md`](AGENT-ONBOARDING.md) | Mapa systemu, widoki, sync |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Living doc techniczny § 11 sync · § 12 przetargi · § 15 struktura |
| [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) | SSOT baseline prod, epiki CLOSED/OPEN |
| [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) | Release A/B/C, verify deploy |

---

## 7. Co robimy teraz (stan po unblock)

| Epic | Wersja | Status |
|------|--------|--------|
| **Production deploy pipeline** | 2.62.31 (`d79f7c1`) | **CLOSED** — Vercel BUILD PASS |
| **TP202A Analyze/Dossier** | 2.62.31 (`94d2e72`) | **CLOSED** — dotarł na prod po unblock |
| **TP190 Parser v3 + batch (TP190C-3C)** | 2.62.27–2.62.32 | **CLOSED** · 9/9 migrated 2026-06-22 |
| **TP200B kosztorys fidelity** | — | **PLANNED** |

---

## 8. Pułapki — nie powtarzać

1. **Import bez `git add` nowego pliku** — lokalny build OK, Vercel ENOENT.
2. **Zapis do `dist/` bez `mkdirSync`** — pierwszy zapis na czystym `dist/` pada.
3. **„DEPLOY PROPAGATING” gdy build FAILED** — zawsze sprawdź GitHub commit status `Vercel` lub log builda, nie tylko `version.json`.
4. **Commitowanie lokalnych WIP** — `audit/`, `scripts/_tmp-*`, zmiany poza scope release.

---

## 9. Komendy weryfikacji

```bash
npm run build
npx vite-node scripts/test-tender-cost-content-detection.mjs
curl -s https://www.wgdom.fun/version.json
gh api repos/dawidthai125/wgdom/commits/HEAD/status
```
