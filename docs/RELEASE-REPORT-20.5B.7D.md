# Release Report — v2.50.60 Cross-tab Update Banner Sync (20.5B.7D)

**Data:** 2026-06-10  
**Wersja UI:** **2.50.60**  
**Commit:** **`b653782`** — `feat(app): cross-tab update banner sync via localStorage (20.5B.7D)`  
**Deploy:** **`5000129417`** — **SUCCESS**  
**Status:** **RELEASED · STABLE**

---

## Summary

Version Awareness — synchronizacja bannera aktualizacji między otwartymi kartami tej samej domeny (localStorage + `storage` event). Zachowane: polling 5 min, focus, visibilitychange, manual reload, session dismiss.

**Bez zmian:** sync, KV, Edge, auth, auto-reload (20.5B.7C poza zakresem).

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/lib/app-version-check.ts` | Cross-tab key, persist, seed, cleanup, `storage` listener |
| `src/app/changelog-data.ts` | Wpis 2.50.60 |
| `docs/ARCHITECTURE.md` | § 13.1 — 20.5B.7D |
| `scripts/smoke-test-app-version-check-20.5b7.mjs` | T11–T14 |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **14/14 PASS** |
| Prod `/version.json` wgdom.fun + wgdom.online | **2.50.60 PASS** |
| Prod smoke `smoke-prod-bundle-2.50.60.mjs` | **9/9 required PASS** (obie domeny) |

---

## Cross-tab manual smoke

| Test | Wynik |
|------|-------|
| **A** storage event (2 karty) | **Do potwierdzenia w przeglądarce** — w karcie A wystarczy `localStorage.setItem("wg-update-server-version", "9.99.99")`; karta B dostaje natywny `storage` event |
| **B** prawdziwy deploy flow | **PASS po deploy** — wersja 2.50.60 na prod |

---

## Regresja 20.5B.7

| Mechanizm | Status |
|-----------|--------|
| Polling 5 min | **PASS** (kod zachowany) |
| visibilitychange | **PASS** |
| focus | **PASS** |
| Dismiss (sessionStorage) | **PASS** |
| Manual reload | **PASS** |

---

## Poprzedni baseline

v2.50.59 · `123db88` · deploy `5000047410` (SMS P0 hotfix)
