# SESSION HANDOFF — Seria 20.5Z Platform Stabilization (2026-06-10)

> **Status:** **CLOSED** · **Prod baseline:** v**2.50.62** · app **`381e4b0`** · Jobs Cleanup **`640e3a9`** · E2E **`8906485`**

Handoff zbiorczy dla agentów AI: E2E happy path, PWA hardening, Jobs View cleanup, E2E Version Awareness. Seria **bez zmian sync/KV/Edge** (poza testami i build/infra).

**★ Baseline projektu:** [`PROJECT-HANDOFF.md`](PROJECT-HANDOFF.md) · **★ Bieżący stan:** [`CURRENT-TASK.md`](../CURRENT-TASK.md)

---

## ★ Baseline końcowy (2026-06-10)

```text
Version:           2.50.62
App feature:       381e4b0  (JobAllFilesView Hub 20.5A.12B.1-full)
Jobs Cleanup:      640e3a9  (20.5Z.4A)
PWA:               46556a7  (20.5Z.2A)
E2E Happy Path:    caf344e  (20.5Z.1)
E2E Version:       8906485  (20.5Z.2B)
Docs baseline:     ca5fabb  (release docs 20.5Z.2B)
Deploy prod:       5000967334
Status:            STABLE · E2E HARDENED · PWA HARDENED · JOBS CLEANUP
```

| Sprint | Typ | Commit | Deploy / CI | Raport |
|--------|-----|--------|-------------|--------|
| **20.5Z.1** E2E Happy Path | test | `caf344e` | CI `#27258082838` | — |
| **20.5Z.2A** PWA hardening | build/infra | `46556a7` | Vercel `#5000728139` | — |
| **20.5Z.4A** Jobs Cleanup | UI | `640e3a9` | Vercel `#5000967334` | — |
| **20.5Z.2B** E2E Version Awareness | test | `8906485` | CI `#27260457990` | [`RELEASE-REPORT-20.5Z.2B.md`](RELEASE-REPORT-20.5Z.2B.md) |

---

## 20.5Z.1 — E2E-HAPPY-PATH-001

**Cel:** Pierwszy gate E2E — worker → admin → inspector (dokumentacja robót).

| Element | Szczegóły |
|---------|-----------|
| **Środowisko** | `npm run build` → `npm run preview @4173` → `PW_BASE_URL=http://127.0.0.1:4173` |
| **Seed** | `e2e/fixtures/e2e-seed.ts` — LocalStorage, bez chmury |
| **Izolacja** | `blockCloudSync()` — route 503 na sync endpoints |
| **CI** | `.github/workflows/e2e-happy-path.yml` |

**Komendy:**
```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
```

**Kluczowe pliki:** `e2e/worker-admin-inspector-happy-path.spec.ts`, `e2e/helpers/auth.ts`, `e2e/helpers/jobs.ts`

---

## 20.5Z.2A — PWA + Version Awareness Hardening

**Cel:** Spójność PWA × Version Awareness — SW nie koliduje z `/version.json`.

| Element | Szczegóły |
|---------|-----------|
| **SW cache** | `wgdom-shell-{APP_VERSION}` — generowany przy buildzie |
| **version.json** | network-only w SW, bez fallback do `index.html` |
| **Vercel** | `Cache-Control: no-store` dla `/version.json` |
| **Smoke** | `smoke-test-pwa-version-20.5z2a.mjs` (Z1–Z14) |

**Kluczowe pliki:** `scripts/sw.template.js`, `scripts/generate-service-worker.mjs`, `vite.config.ts`, `vercel.json`

**Nie zmieniaj bez polecenia:** logika `app-version-check.ts`, auto-reload (poza zakresem).

---

## 20.5Z.4A — Jobs View Cleanup

**Cel:** Ukrycie filtrów KPI/kolejek „Bez ekipy” i „WM po terminie” w widoku Roboty.

| Obszar | Zmiana |
|--------|--------|
| **KPI** | Usunięto z `JobListPanelHeader.tsx` |
| **Legenda** | Usunięto z `JobListGuidePanel.tsx` |
| **Kolejki** | `HIDDEN_QUEUE_SECTION_IDS` w `JobQueueSections.tsx` |
| **Bez zmian** | `job-list-ops.ts`, logika `JobsView`, enumy |

**Widoczne filtry:** W toku, Do odbioru, BZP.

**Model/sync:** UI-only — **nie** ruszać `job-list-ops.ts` bez polecenia.

---

## 20.5Z.2B — E2E Version Awareness

**Cel:** Gate E2E dla mechanizmu aktualizacji (banner, dismiss, reload, cross-tab).

| Scenariusz | Co testuje |
|------------|------------|
| **VA-001** | Mock `/version.json` → banner „Dostępna nowa wersja WGDOM” |
| **VA-002** | Dismiss „Później” → `sessionStorage["wg-update-banner-dismiss"]` |
| **VA-003** | Fazowy mock `9.99.99` → reload → `2.50.62` → cleanup `wg-update-server-version` |
| **VA-004** | `context.newPage()` — cross-tab via natywny `storage` event |

**Mock strategy:** `page.route("**/version.json**")` — primary. **Nie** używać `dispatchEvent(StorageEvent)`.

**Pułapka:** `page.evaluate(localStorage)` **przed** `goto` rzuca SecurityError — użyć `installVersionAwarenessReset()` (`addInitScript`).

**Komendy:**
```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version
```

**Kluczowe pliki:** `e2e/version-awareness.spec.ts`, `e2e/helpers/version-awareness.ts`

**App flow (referencja, nie zmieniać w tej serii):** `src/lib/app-version-check.ts`, `src/app/AppUpdateBanner.tsx` — ARCHITECTURE § 13.1

---

## CI — E2E Stabilization Gate

Workflow: `.github/workflows/e2e-happy-path.yml`

Po push na `main` (ścieżki: `e2e/**`, `src/**`, `playwright.config.ts`, …):

1. `npm ci` → `npm run build` → preview `@4173`
2. `npm run test:e2e:happy` — 1 test serial
3. `npm run test:e2e:version` — 4 testy serial (VA-001…VA-004)

**Ostatni SUCCESS:** `#27260457990` (~65 s) — happy 4.1 s + version 2.7 s

---

## Smoke regresja (po każdej większej zmianie)

```bash
npm run build
npx vite-node scripts/smoke-test-app-version-check-20.5b7.mjs      # 14/14
npx vite-node scripts/smoke-test-files-hub-20.5a12.mjs
npx vite-node scripts/smoke-test-worker-report-pdf-20.5a12c.mjs      # 15/15
npx vite-node scripts/smoke-test-pwa-version-20.5z2a.mjs             # Z1–Z14
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version
```

---

## Dla agenta AI — co dalej

- **Następny sprint:** na polecenie użytkownika (brak otwartego backlogu w serii 20.5Z)
- **Nie commituj** lokalnych skryptów `scripts/smoke-prod-*`, `scripts/audit-*` — untracked, poza repo
- **Nie podbijaj wersji** bez release — baseline **2.50.62**
- **Testy E2E:** zawsze preview @4173, nigdy prod jako default w CI
- Hasło: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](../.cursor/rules/wgdom-stan-projektu.mdc)
