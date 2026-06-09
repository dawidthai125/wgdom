# Release Report — v2.50.56 Version Awareness & Update Banner (20.5B.7)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.56**  
**Commit:** **`1be7a80`**  
**Deploy:** **`4995835869`** — **SUCCESS**  
**CI Mobile:** run **`27235143622`** — **SUCCESS**  
**Status:** **RELEASED**

---

## Summary

Rozwiązano problem użytkowników pracujących na starym bundle po deployu. Aplikacja porównuje wbudowane `APP_VERSION` z `/version.json` (polling 5 min + `visibilitychange` + `focus`) i pokazuje globalny banner z ręcznym odświeżeniem — **bez auto-reload**.

**Bez zmian:** sync, KV, Edge, auth, workerReports, model danych.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `src/lib/app-version.ts` | `APP_VERSION` w main bundle (vite define) |
| `src/lib/app-version-check.ts` | Fetch, polling, detekcja, hook |
| `src/app/AppUpdateBanner.tsx` | Globalny banner „Odśwież teraz” / „Później” |
| `src/main.tsx` | Mount `<AppUpdateBanner />` |
| `vite.config.ts` | Plugin `wgdom-version-json`, `__APP_VERSION__` |
| `scripts/read-changelog-version.mjs` | Parser `CHANGELOG[0].version` |
| `scripts/smoke-test-app-version-check-20.5b7.mjs` | Smoke T1–T10 |
| `scripts/smoke-prod-bundle-2.50.56.mjs` | Prod bundle smoke |
| `src/app/changelog-data.ts` | Wpis 2.50.56 |
| `src/app/GuideView.tsx` | FAQ o komunikacie aktualizacji |
| `docs/ARCHITECTURE.md` | § 13.1 Version Awareness |

---

## Walidacja (lokalna)

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-app-version-check-20.5b7.mjs` | **10/10 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-jobs-2.0-midb.mjs` | **21/21 PASS** |
| GitHub Actions `#27235143622` | **SUCCESS** |
| Vercel deploy `#4995835869` | **SUCCESS** |
| Prod bundle `smoke-prod-bundle-2.50.56.mjs` | **14/14 required PASS** (wgdom.fun + wgdom.online) |

**Supabase / KV / Edge:** brak zmian

---

## Commit Report

| Pole | Wartość |
|------|---------|
| **SHA** | `1be7a80` |
| **Message** | `feat(app): version awareness and update banner (20.5B.7)` |
| **Body** | Generate version.json at build; poll server version and show global refresh banner without auto-reload. |

---

## Deploy Report

| Pole | Wartość |
|------|---------|
| **Deployment ID** | `4995835869` |
| **Status** | **SUCCESS** |
| **URL** | https://www.wgdom.fun |
| **Vercel** | https://vercel.com/dawidthai125s-projects/wgdom/346nJLXg2ALLA1DWibcD9WXmB1sG |
| **CI Mobile** | run `27235143622` — **SUCCESS** |

---

## Post-Deploy Smoke (prod)

| Checklist | Wynik |
|-----------|-------|
| `/version.json` → `{ "version": "2.50.56" }` | **PASS** |
| `2.50.56` w bundle | **PASS** |
| Banner copy „Dostępna nowa wersja WGDOM” | **PASS** |
| „Odśwież teraz” + `location.reload` | **PASS** |
| „Później” + `wg-update-banner-dismiss` | **PASS** |
| `visibilitychange` + `focus` listeners | **PASS** |
| Brak auto-reload („Aktualizacja za…”) | **PASS** |
| Regresja Dokumentacja robót / JobsView / InspectorPanel | **PASS** |
| Banner ukryty przy aktualnej wersji | **PASS** (oczekiwane) |

---

## RCA — jak działa wykrywanie

```text
Deploy → dist/version.json = 2.50.56
         bundle __APP_VERSION__ = 2.50.56

Stara karta (2.50.55 w pamięci):
  APP_VERSION = "2.50.55"
  fetch /version.json → "2.50.56"
  różnica → banner

Użytkownik klika „Odśwież teraz”:
  location.reload() → nowy index.html + hashed bundle
```

**Problem rozwiązany:** otwarta karta SPA nie wymaga już Ctrl+Shift+R — użytkownik dostaje banner z ręcznym odświeżeniem.

---

## Final Verdict

```text
RELEASE SUCCESS
```

---

## Baseline po wdrożeniu

```text
Version: 2.50.56
Commit: 1be7a80
Deploy: 4995835869
Status: RELEASED · STABLE

Sprint 20.5B.7 — Version Awareness & Update Banner

✓ APP_VERSION w bundle
✓ version.json generowany przy build
✓ polling wersji co 5 minut
✓ focus / visibility detection
✓ globalny banner aktualizacji
✓ Odśwież teraz (manual refresh)
✓ Później (dismiss sesji)
✓ brak auto-reload
✓ brak zmian sync, KV, Edge
✓ regresja PASS
```
