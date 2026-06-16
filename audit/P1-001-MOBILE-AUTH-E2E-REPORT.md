# P1-001 — Mobile Authenticated E2E Coverage

**Data:** 2026-06-16  
**Status:** IMPLEMENT COMPLETE · **GO**  
**Baseline prod:** v2.59.25 · brak zmian w kodzie aplikacji (tylko E2E / Playwright)

---

## 1. Zakres

Lekki pakiet **Mobile Authenticated Smoke Tests** dla modułów wdrożonych po v2.51:

| ID | Moduł | Asercje smoke |
|----|--------|----------------|
| MOBILE-AUTH-001 | Dashboard V3 | Pulpit, KPI Wypłata, Braki dokumentów, Pilne uwagi, brak runtime error / horizontal scroll |
| MOBILE-AUTH-002 | Roboty | Lista → szczegóły, Dokumentacja, Powrót do listy (mobile) / h2 (tablet), brak horizontal scroll |
| MOBILE-AUTH-003 | Notatki operacyjne | Lista h3, szczegół notatki seed, brak runtime error |
| MOBILE-AUTH-004 | WM Druk | Heading, zakładka Szablony, grupa ZI (render only — bez ZIP/PDF) |
| MOBILE-AUTH-005 | Przetargi | Pełna lista → expand → 5 workspace tabs (Przegląd…Oferta), brak runtime error |

**Wzorzec:** `blockCloudSync` + rozszerzony `e2e-seed` + `loginAdmin` — deterministyczny, read-only, bez chmury.

**Urządzenia:** iPhone SE · iPhone 14 · Pixel 7 · iPad Mini (4 projekty Playwright).

---

## 2. Zmodyfikowane pliki

| Plik | Akcja |
|------|--------|
| `e2e/fixtures/e2e-seed.ts` | EXTEND — notatka, przetarg, WM ZI template |
| `e2e/helpers/admin-mobile-nav.ts` | **NEW** — bottom nav / Więcej / sidebar, job & tender open |
| `e2e/helpers/admin-mobile-smoke.ts` | **NEW** — assertNoApplicationError, job detail adaptive |
| `e2e/mobile-auth-smoke.spec.ts` | **NEW** — serial MOBILE-AUTH-001..005 |
| `playwright.config.ts` | EXTEND — iphone-14, ipad-mini, 4× e2e-mobile-auth-* |
| `package.json` | EXTEND — `test:e2e:mobile-auth` |
| `audit/P1-001-MOBILE-AUTH-E2E-REPORT.md` | **NEW** — ten raport |

---

## 3. Nowe scenariusze

Jeden plik serial `e2e/mobile-auth-smoke.spec.ts` × 4 urządzenia (Opcja A z planu).

**Stałe seed:**

```text
E2E_NOTE_TITLE = "E2E Notatka operacyjna Z1"
E2E_TENDER_TITLE = "E2E Przetarg Z1"
E2E_WM_ZI_TEMPLATE_ID = "e2e-wm-zi-template-001"
```

**Klucze LS:** `kw-operational-notes*`, `kw-tenders-pipeline`, `kw-wm-print-templates`, `kw-wm-print-job-docs`, `kw-wm-print-settings`.

**Helpery (reuse):** `blockCloudSync`, `loginAdmin`, `assertNoHorizontalScroll` z istniejących helperów E2E.

---

## 4. Wyniki build

| Komenda | Wynik |
|---------|--------|
| `npm run build` | **PASS** (vite build ~17s) |

---

## 5. Wyniki testów

| Komenda | Target | Wynik |
|---------|--------|--------|
| `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:mobile-auth` | preview lokalny | **4/4 PASS** (~8s) |
| `npm run audit:mobile` | statyczny | **36/36 PASS** |
| `npm run test:mobile` | prod www.wgdom.fun | **79/79 PASS** (~1.3 min) |

**Regresja:** 47 → **79** testów Playwright (+32: iphone-14/ipad-mini na mobile-smoke/flows + 4 mobile-auth).

---

## 6. Pokrycie modułów

| Moduł | Przed | Po |
|-------|-------|-----|
| Dashboard | LOW | **COVERED** |
| Roboty | PARTIAL | **COVERED** |
| Notatki | NONE | **COVERED** |
| WM Druk | NONE | **COVERED** |
| Przetargi | NONE | **COVERED** |

---

## 7. Mobile Risk Matrix

| Ryzyko | Poziom | Mitigacja w P1-001 |
|--------|--------|---------------------|
| Bottom nav intercept (klik job) | MEDIUM | `evaluate(click)` + dismiss toast |
| iPad ≥640px brak „Powrót do listy” | MEDIUM | `assertAdminJobDetailSmoke` — adaptive h2 vs button |
| Filtr „Do zgłoszenia” ukrywa seed tender | HIGH | `openE2eTenderWorkspace` → select „Pełna lista” |
| Tab badge „Dokumenty !” | MEDIUM | regex `^Dokumenty` zamiast exact |
| Lazy chunk WM/Przetargi | LOW | timeout 45s na heading |
| Cloud sync toast 503 | LOW | `dismissBlockingToasts` |

---

## 8. Ryzyka (backlog)

- **Prod-only mobile-auth:** `test:mobile` uruchamia mobile-auth na prod bez seed preview — PASS (login + LS seed w przeglądarce). CI powinien preferować `build && preview` dla happy-path i mobile-auth.
- **Czas CI:** +~8s dedykowany pakiet; pełny `test:mobile` +~32 testy (~+45s vs baseline 47).
- **Mutacja statusu tender:** expand wiersza ze statusem `interested` — bez auto-patch (patch tylko dla `new`).

---

## 9. Werdykt

**P1-001 GO** — Mobile Authenticated Smoke COMPLETE.  
Brak zmian w `src/` — deploy aplikacji opcjonalny; push utrwala konfigurację E2E w repo.

**Komendy:**

```bash
npm run build && npm run preview
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:mobile-auth
npm run audit:mobile
npm run test:mobile
```
