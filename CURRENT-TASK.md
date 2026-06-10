# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-10  
**Current Version:** **2.50.62**  
**Current Baseline:** **STABLE · E2E HARDENED · PWA HARDENED · JOBS CLEANUP**  
**Prod `origin/main` (app):** **`640e3a9`** · https://www.wgdom.fun · v2.50.62  
**E2E `origin/main`:** **`8906485`** — E2E Version Awareness (20.5Z.2B) + Happy Path (`caf344e`)  
**PWA `origin/main`:** **`46556a7`** — PWA + Version Awareness (20.5Z.2A)  
**Jobs Cleanup `origin/main`:** **`640e3a9`** — Jobs View Cleanup (20.5Z.4A)  
**Docs `origin/main`:** **`ca5fabb`** — release docs 20.5Z.2B  
**Deploy prod:** **`5000967334`**  
**CI E2E:** **`#27260457990`** SUCCESS (happy + version)

**★ Handoff serii 20.5Z:** [`docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md`](docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md)

---

## Seria 20.5Z — Platform Stabilization (**CLOSED**)

| Sprint | Commit | Typ | Status |
|--------|--------|-----|--------|
| **20.5Z.1** E2E Happy Path | `caf344e` | test | CI `#27258082838` |
| **20.5Z.2A** PWA hardening | `46556a7` | build | deploy `#5000728139` |
| **20.5Z.4A** Jobs Cleanup | `640e3a9` | UI | deploy `#5000967334` |
| **20.5Z.2B** E2E Version Awareness | `8906485` | test | CI `#27260457990` |

**E2E lokalnie:** `npm run build` → `preview @4173` → `test:e2e:happy` + `test:e2e:version`

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

## Sprint 20.5Z.4A — Jobs View Cleanup (**COMPLETE**)

| Element | Status |
|---------|--------|
| Ukrycie KPI „Bez ekipy” / „WM po terminie” | **COMPLETE** |
| Legenda — bez wpisów ukrytych filtrów | **COMPLETE** |
| Kolejki — `HIDDEN_QUEUE_SECTION_IDS` | **COMPLETE** |
| Pozostałe filtry (W toku, Do odbioru, BZP) | **VISIBLE** |

**Commit:** **`640e3a9`** · **Deploy:** **`5000967334`** SUCCESS · **Model/sync:** UI-only

**Kluczowe pliki:** `JobListPanelHeader.tsx`, `JobListGuidePanel.tsx`, `JobQueueSections.tsx`

**Smoke prod:** brak literałów `Bez ekipy` / `WM po terminie` w bundlu `JobsView-*.js`

---

## Sprint 20.5Z.2B — E2E Version Awareness (**COMPLETE**)

| Element | Status |
|---------|--------|
| VA-001 detekcja nowej wersji | **COMPLETE** |
| VA-002 dismiss (Później) | **COMPLETE** |
| VA-003 reload + cleanup | **COMPLETE** |
| VA-004 cross-tab sync | **COMPLETE** |
| CI `e2e-happy-path` (happy + version) | **COMPLETE** |

**Commit:** **`8906485`** · **CI:** `#27260457990` · **Test-only** — bez zmian `src/**`

**Kluczowe pliki:** `e2e/version-awareness.spec.ts`, `e2e/helpers/version-awareness.ts`, `playwright.config.ts`, `.github/workflows/e2e-happy-path.yml`

**Raport:** [`docs/RELEASE-REPORT-20.5Z.2B.md`](docs/RELEASE-REPORT-20.5Z.2B.md)

**Smoke:** `npm run test:e2e:version` (VA-001…VA-004) · `npm run test:e2e:happy`

**Pułapka E2E:** storage reset przez `addInitScript` (nie `evaluate` przed `goto`)

---

## Następny etap

**Platform Stabilization — kolejny sprint na polecenie**

---

## Szybki start dla agenta

1. [`AGENTS.md`](AGENTS.md)
2. Ten plik
3. [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)
4. [`docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md`](docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md) ← **★ ostatnia seria (E2E + PWA + Jobs)**
5. [`docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md)
6. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.2 + § 13.1
