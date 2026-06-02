# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** (czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`).

**Ostatnia aktualizacja:** 2026-06-02  
**Wersja UI (App.tsx):** `2.45.14` (stabilność czerwca wdrożona jako commity infra, bez bump UI)  
**Prod (`main`):** https://www.wgdom.fun · commit **`92d574e`**  
**Gałąź robocza:** `audit-before-cleanup` @ **`7eaf7ee`** (snapshoty + UI media — **nie prod**)

---

## Co jest skończone (czerwiec 2026 — stabilność)

### Na produkcji (`main`)

| Commit | Temat |
|--------|--------|
| `db1d05a` | **Payroll Guard** — blokada push przy spadku payroll >50% |
| `c9db032` | **P11** — `applyBootstrapPayrollMerge` w CloudLoader (chmura 194 h vs stale LS 0 h) |
| `92d574e` | **P15** — fix merge `kw-admin-passwords` (chmura decyduje o kluczach override) |
| Deploy P15 | Vercel `dpl_FwTDN6MWGnVSZWvzhqD6qESYu4Rx` |

### Operacje KV (ręczne, poza git)

| Operacja | Efekt |
|----------|--------|
| P17 | Usunięto `szymon` z `kw-admin-passwords` (hash `15622045…`) |
| P18B | Usunięto `pawel` z `kw-admin-passwords` (błędny override) → login `watroba1991!` |
| P14 | Cleanup 74 martwych URL w `kw-jobs` (stary Supabase) — **może wymagać powtórzenia** |

### Audyty (read-only)

STABILITY-AUDIT 1.0, HEALTH-CHECK 1.0, P13B-VERIFY, P18A — raporty w historii sesji; szczegóły → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)

### Testy

```bash
npx vite-node scripts/test-p11-bootstrap-payroll.mjs
npx vite-node scripts/test-p15-admin-password-merge.mjs
node scripts/verify-login-dawid-pawel-szymon.mjs   # prod smoke login
node scripts/audit-dead-media-kv.mjs               # read-only KV media
```

---

## W trakcie / lokalnie (NIE na `main`)

- **Gałąź `audit-before-cleanup`** — commit `7eaf7ee`:
  - Snapshoty `before-*.json`, skrypty diag/smoke/audit
  - **UI Media Cleanup** — 21 plików `src/app/*`, `src/lib/*` (filtry render, bez zapisu KV)
  - `stripDeadMediaFromJob` w `media-filter.ts` — **dead code**, niepodłączone do sync
- **Niewdrożone:** merge UI media → `main`, ewentualny P14 re-run

---

## Następne (propozycje)

1. **UI Media Cleanup** — cherry-pick / PR z `audit-before-cleanup` (tylko `src/`, bez `stripDeadMedia*`)
2. **P14 re-check** — `audit-dead-media-kv.mjs`; jeśli martwe URL wróciły → cleanup KV (read-then-set, snapshot)
3. **P13B po każdym wejściu** — weryfikacja `kw-admin-passwords` (czy `szymon` nie wrócił ze starego LS przed P15)
4. **Docs** — przy kolejnych fixach sync aktualizuj `docs/ARCHITECTURE.md` § 11 i `INCIDENTS-2026-06.md`
5. **HelpView** — opcjonalnie: informacja o hard refresh po incydencie sync

---

## Znane otwarte uwagi

- **Stale localStorage** może nadpisać KV (payroll, admin passwords) — P11/P15 łagodzą bootstrap; hard refresh nadal zalecany po incydencie
- **Logout nie przeładowuje CloudLoader** — tylko pierwsze wejście na stronę
- **Martwe URL** — UI na prod pokazuje placeholder (`JobPhotoImg` + `isDeadStorageUrl`); pełny filtr list jest na gałęzi audit
- **Snapshoty KV** — nie commitować do `main` bez decyzji użytkownika

---

## Szybki start dla nowego agenta

```text
1. AGENTS.md
2. PROJECT-GUIDE.md  → Known Issues
3. docs/ARCHITECTURE.md  → § 11 (sync)
4. docs/INCIDENTS-2026-06.md   ← incydenty czerwiec 2026
5. CURRENT-TASK.md (ten plik)
6. CHANGELOG.md → App.tsx CHANGELOG (wersja UI)
```
