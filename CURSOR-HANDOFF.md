# CURSOR-HANDOFF — W&G DOM

> Dokument dla nowego agenta Cursor. Jak pracować, workflow, commity, testy, aktualne WIP.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `fd56cf7` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** |

---

## 1. Środowisko

| Pole | Wartość |
|------|---------|
| **OS** | Windows (win32) |
| **Shell** | **PowerShell** |
| **Repo** | `c:\Users\dawid\Downloads\WGDOM1` · branch `main` |
| **Node runner testów** | `vite-node` (`npx vite-node scripts/*.mjs`) |

### Pułapki PowerShell (ważne)

- ❌ Brak `&&` — łańcuchuj przez `;` (lub osobne wywołania).
- ❌ Brak bash‑owego heredoc — **commit message przez plik**: `git commit -F <plik>`.
- ✅ Ścieżki ze spacjami w cudzysłowach.

---

## 2. Sposób pracy (agent Cursor)

1. **Ustal jeden cel** — *One Bundle = One Goal*. Nie mieszaj zakresów.
2. **AUDIT FIRST** — przeczytaj SSOT (`cloud-sync.ts`, `ARCHITECTURE.md`, właściwy handoff), zrozum źródło problemu. Nie zgaduj.
3. **DESIGN FREEZE** (dla większych zmian) — zamroź założenia, wypisz zakres i wykluczenia.
4. **IMPLEMENT** — minimalna, celowana zmiana. Bez komentarzy narracyjnych w kodzie.
5. **BUILD** — `npm run build` (gdy dotyczy runtime).
6. **TEST** — Golden Regression + właściwy gate (patrz §5). Rejestruj nowe testy w manifeście.
7. **COMMIT** — tylko pliki dotyczące celu (patrz §4).
8. **PUSH** — `git push origin main`.
9. **VERIFY** — deploy FAST (jedno `curl version.json`), gate GREEN, build GREEN.
10. **CLOSE** — raport (AUDIT / IMPLEMENT / TEST / VERIFY / COMMIT / PUSH / STATUS) + aktualizacja `CURRENT-TASK.md` i `docs/PROJECT-HANDOFF-CURRENT.md`.

Komunikacja i podsumowania **po polsku**.

---

## 3. Zasady naczelne

- **One Bundle = One Goal** — jeden cel; jeśli pojawia się drugi, to osobny bundle.
- **SSOT FIRST** — zmiana idzie przez źródło prawdy; przy sync utrzymaj **parytet klient↔Edge**.
- **AUDIT FIRST** — bez audytu nie ruszaj merge/sync/Payroll.
- **Minimal diff** — nie refaktoryzuj przy okazji; nie rozszerzaj zakresu.
- **Nie zaczynaj nowych epiców** — STABILIZATION WINDOW ACTIVE.

---

## 4. Zasady commitów

- **Commituj tylko pliki celu.** Working tree bywa „brudne" (zmiany z innych prac) — użyj jawnego `git add <ścieżki>`, nie `git add -A`.
- **Format wiadomości:** `typ(zakres): ID — opis` (np. `fix(payroll): PR-PAY-S5 — Payroll Settled Status Persistence`).
- **Commit message przez plik** (PowerShell): zapisz treść do pliku i `git commit -F <plik>`; potem usuń plik.
- **Nie commituj** śmieci: `_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`, `icons/`, `music/`, plików z sekretami (`.env`).
- **Nie amend / nie force‑push** do `main` bez jawnego polecenia.
- **P0 przed push nowego pliku `src/`:** sprawdź `git status` — untracked plik importowany przez tracked kod = **Vercel ENOENT** (build fail).

---

## 5. Testy i gaty

| Cel | Komenda |
|-----|---------|
| Pojedynczy Golden test | `npx vite-node scripts/test-<nazwa>.mjs` |
| Gate B (regresja) — Payroll | `node scripts/test-infra-orchestrator.mjs --suite gate-b-relevant --scope payroll` |
| Gate B — Przetargi | `node scripts/test-infra-orchestrator.mjs --gate B --scope tenders` |
| Walidacja manifestu | `npm run test:infra:validate` |
| E2E mobile | `npm run test:mobile` |

- Nowe testy dodawaj do `test-infra/test-manifest.json` (`class`, `releaseTier`, `condition`, `owner`, `status: "active"`) i do właściwej `suite`.
- Wynik gate musi być **GREEN** przed push.

**Release A/B/C** (pełny opis: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)):

| Zakres | Ścieżka |
|--------|---------|
| **A — minor** (docs, hotfix import) | build → commit → push → verify FAST |
| **B — functional UI** | build → relevant smoke/gate → commit → push → verify FAST |
| **C — major release** | build → smoke → E2E → commit → push → verify FAST |

**VERIFY DEPLOY FAST:** po push **jedno** `curl -s https://www.wgdom.fun/version.json`. RELEASE GO = build+test+commit+push PASS (nie czekaj na propagację Vercel). Zakazane: retry/sleep/polling.

---

## 6. Build i deploy

- **Frontend:** `git push origin main` → Vercel Git Integration (auto). **Nigdy** `vercel deploy`.
- **Edge:** zmiany w `supabase/functions/**` → GitHub Actions.
- **Wersja UI:** nowy wpis na górze `src/app/changelog-data.ts` + `CHANGELOG.md`. Bump numeru tylko dla widocznych zmian UI (fixy lib/test‑infra mogą iść bez bumpu — patrz `PROJECT-STATUS.md` §1).

---

## 7. Aktualne WIP / kontekst

| Temat | Stan |
|-------|------|
| **Payroll P0 Incident** (S1–S3, S5) | **CLOSED** — `fd56cf7`, Gate B GREEN |
| **Work Catalog P3.3** — Market Pricing UX | **AUDIT DONE**, design freeze pending (decyzje D‑A…D‑D) |
| **STABILIZATION WINDOW** | **ACTIVE** — utrzymanie, raport tygodniowy |
| **Z‑05 Field Validation** (mobile) | **PENDING (Device Required)** |
| **NG‑05 MPI** | **IMPLEMENT BLOCKED** — nie implementować |
| **Backlog na polecenie** | TI‑B1, TI‑B3, Work Catalog P2 UI, G‑08, G‑02 |

Working tree może zawierać niezcommitowane zmiany z innych prac (tenders, mobile, `index.html`) — **nie** dołączaj ich do swojego bundla bez potwierdzenia.

---

## 8. Zanim zaczniesz — checklist

- [ ] Przeczytałem [`AI-START-HERE.md`](AI-START-HERE.md) i [`PROJECT-STATUS.md`](PROJECT-STATUS.md).
- [ ] Znam cel bundla (jeden!) i jego wykluczenia.
- [ ] Sprawdziłem SSOT dla obszaru (`cloud-sync.ts` / `ARCHITECTURE.md` / właściwy handoff).
- [ ] Wiem, który gate uruchomić i gdzie dodać test.
- [ ] Wiem, że nie zaczynam nowego epicu (STABILIZATION WINDOW).

Dalej: [`AGENTS.md`](AGENTS.md) (pełne zasady) · [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md) (pułapki).
