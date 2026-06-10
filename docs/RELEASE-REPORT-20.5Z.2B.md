# Release Report — 20.5Z.2B E2E Version Awareness

**Data:** 2026-06-10  
**Wersja UI:** **2.50.62** (bez zmian — test-only release)  
**Commit:** **`8906485`** — `test(e2e): E2E Version Awareness VA-001 to VA-004 20.5Z.2B`  
**Docs:** **`ca5fabb`** — `docs(release): 20.5Z.2B E2E Version Awareness baseline`  
**CI:** **`#27260457990`** — **SUCCESS** (~65 s)  
**Status:** **RELEASED · STABLE · GO**

---

## Summary

Drugi gate E2E w serii Platform Stabilization — pełne pokrycie Version Awareness: detekcja wersji, dismiss, reload+cleanup, cross-tab sync. **Bez zmian** `src/**`, sync, KV, Edge, SW.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `e2e/helpers/version-awareness.ts` | Mock `/version.json`, phased mock, storage reset, asserty |
| `e2e/version-awareness.spec.ts` | VA-001…VA-004 |
| `playwright.config.ts` | Project `e2e-version-awareness` |
| `package.json` | `test:e2e:version` |
| `.github/workflows/e2e-happy-path.yml` | Step E2E Version Awareness po happy-path |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| CI `e2e-happy-path` `#27260457990` | **SUCCESS** |
| `test:e2e:happy` | **1 passed** (4.1 s) |
| `test:e2e:version` VA-001…VA-004 | **4 passed** (2.7 s) |
| `npm run build` | **PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **14/14 PASS** |
| `smoke-test-files-hub-20.5a12.mjs` | **PASS** |
| `smoke-test-worker-report-pdf-20.5a12c.mjs` | **15/15 PASS** |

---

## Scenariusze E2E

| ID | Opis | Wynik |
|----|------|-------|
| VA-001 | Detekcja — mock `9.99.99` → banner | **PASS** |
| VA-002 | Dismiss „Później” → sessionStorage | **PASS** |
| VA-003 | Reload + fazowy mock → cleanup LS | **PASS** |
| VA-004 | Cross-tab — 2 karty, storage event | **PASS** |

---

## Handoff

Pełny kontekst serii 20.5Z: [`SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md`](SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md)
