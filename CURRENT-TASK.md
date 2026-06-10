# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-10  
**Current Version:** **2.50.62**  
**Current Baseline:** **STABLE · E2E READY · PWA HARDENED**  
**Prod `origin/main` (app):** **`381e4b0`** · https://www.wgdom.fun · v2.50.62  
**E2E `origin/main`:** **`caf344e`** — E2E-HAPPY-PATH-001 (20.5Z.1)  
**PWA `origin/main`:** **`46556a7`** — PWA + Version Awareness (20.5Z.2A)  
**Deploy prod:** **`5000728139`**

---

## Sprint 20.5A.12 — Files Hub (**COMPLETE**)

| Element | Status |
|---------|--------|
| 12A Files Hub UI | **COMPLETE** (2.50.58) |
| 12B liczniki SSOT | **COMPLETE** |
| 12B.1-min nagłówek | **COMPLETE** |
| **12B.1-full JobAllFilesView** | **COMPLETE** (2.50.62) |
| 12C Worker Report PDF | **COMPLETE** (2.50.61) |

---

## Sprint 20.5A.12B.1-full — JobAllFilesView Hub Alignment (**RELEASED**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.62** |
| **Commit** | **`381e4b0`** |
| **Zakres** | Kafle per adres — kontrakt + dokumentacja + załączniki (SSOT `files-hub-index.ts`) |
| **Model/sync** | **Bez zmian** — UI-only |

**Kluczowe pliki:** `files-hub-index.ts`, `JobAllFilesView.tsx`

**Raport:** [`docs/RELEASE-REPORT-20.5A.12B.1-full.md`](docs/RELEASE-REPORT-20.5A.12B.1-full.md)

**Smoke:** `smoke-test-files-hub-20.5a12.mjs` (T15–T22), `smoke-prod-bundle-2.50.62.mjs`

---

## Sprint 20.5Z.1 — E2E-HAPPY-PATH-001 (**COMPLETE**)

| Element | Status |
|---------|--------|
| Preview @ 4173 + LS seed | **COMPLETE** |
| Cloud sync isolation | **COMPLETE** |
| Worker → dokumentacja | **COMPLETE** |
| Admin → dokumentacja + Files Hub | **COMPLETE** |
| Inspector → dokumentacja | **COMPLETE** |
| GitHub Actions `e2e-happy-path` | **COMPLETE** (`#27258082838` SUCCESS) |

**Commit:** **`caf344e`** · **Smoke lokalny:** `npm run test:e2e:happy` PASS · **CI:** 1 passed

**Kluczowe pliki:** `e2e/fixtures/e2e-seed.ts`, `e2e/helpers/`, `e2e/worker-admin-inspector-happy-path.spec.ts`, `.github/workflows/e2e-happy-path.yml`

---

## Sprint 20.5Z.2A — PWA + Version Awareness Hardening (**COMPLETE**)

| Element | Status |
|---------|--------|
| Versioned Service Worker Cache | **COMPLETE** (`wgdom-shell-{APP_VERSION}`) |
| `version.json` network-only w SW | **COMPLETE** |
| Vercel `Cache-Control: no-store` | **COMPLETE** |
| PWA Smoke Coverage | **COMPLETE** (Z1–Z14) |

**Commit:** **`46556a7`** · **Deploy:** **`5000728139`** SUCCESS · **Prod SW:** `wgdom-shell-2.50.62`

**Kluczowe pliki:** `scripts/sw.template.js`, `scripts/generate-service-worker.mjs`, `vite.config.ts`, `vercel.json`, `scripts/smoke-test-pwa-version-20.5z2a.mjs`

---

## Następny etap

**20.5Z.2B — E2E Version Awareness**

---

## Szybki start dla agenta

1. [`AGENTS.md`](AGENTS.md)
2. Ten plik
3. [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)
4. [`docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md)
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.2
