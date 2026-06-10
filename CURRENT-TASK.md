# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-10  
**Current Version:** **2.50.60**  
**Current Baseline:** **RELEASED · STABLE**  
**Prod `origin/main` (app):** **`b653782`** · https://www.wgdom.fun · v2.50.60  
**Deploy prod:** **`5000129417`**

---

## Sprint 20.5B.7D — Cross-tab Update Banner Sync (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.60** |
| **Zakres** | Version Awareness — banner sync między kartami (localStorage + storage event) |
| **Model/sync** | **Bez zmian** — UI only |

**Kluczowe pliki:** `app-version-check.ts`, `AppUpdateBanner.tsx`, `app-version.ts`

**Klucz LS:** `wg-update-server-version`

**Raport:** [`docs/RELEASE-REPORT-20.5B.7D.md`](docs/RELEASE-REPORT-20.5B.7D.md)

**Smoke:** `smoke-test-app-version-check-20.5b7.mjs` (T1–T14), `smoke-prod-bundle-2.50.60.mjs`

---

## Sprint 20.5A.12 — Files Hub Consolidation (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.58** |
| **Commit** | **`211364b`** |

**Handoff:** [`docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md)

**Backlog:** 20.5A.12B.1-full · 20.5A.12C PDF export

---

## Szybki start dla agenta

1. [`AGENTS.md`](AGENTS.md)
2. Ten plik
3. [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 13.1 Version Awareness
5. [`docs/RELEASE-REPORT-20.5B.7D.md`](docs/RELEASE-REPORT-20.5B.7D.md)
