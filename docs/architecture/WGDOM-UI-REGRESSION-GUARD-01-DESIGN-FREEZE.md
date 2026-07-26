# WGDOM-UI-REGRESSION-GUARD-01 — DESIGN FREEZE

> **Status:** **FROZEN** · Owner GO: DESIGN FREEZE · 2026-07-26  
> **Klasa:** TEST / GUARD · Thin Playwright suite · Minimal maintenance  
> **Parent:** POST-RELEASE · SHELL-RELEASE-01 · SIDEBAR-REGRESSION-02 · A11Y-01  
> **Etap:** wyłącznie DESIGN FREEZE — **bez IMPLEMENT** · bez commit · bez push

---

## 0. Cel

Minimalny, automatyczny **regression guard** App Shell — łapie regresje, które już kosztowały Ownera (poziomy scroll Sidebara, focus kart/tabów, CTA hierarchy Dashboard), bez rozrostu suite E2E i bez pixel-diff.

**Technologia:** Playwright · istniejący `playwright.config.ts` · helpery `e2e/helpers/auth.ts` · viewport desktop.

---

## 1. Scope

| IN | OUT (twarde) |
|----|----------------|
| Desktop Chromium Playwright suite (1 project + 1–2 pliki) | Visual regression / Percy / screenshot golden |
| Sidebar `.admin-sidebar-scroll` geometry (idle / hover / focus) | Mobile multi-device matrix (osobne projekty iPhone/Pixel) |
| Tooltip `NavItemWithHint` — brak wpływu na `scrollWidth` | Payroll CORE · TEUX · Cloud · API · Edge |
| Dashboard — **≤1** Primary CTA w pierwszym viewport / headerze | Dashboard body (braki/pilne) polish |
| Roboty — `focus-visible` class / ring token na karcie + tabach | Detail body / Hub / forms |
| Główne panele admin — brak **niezamierzonego** poziomego scrolla kontenera | Celowe `overflow-x-auto` chip/tab lanes (KPI/fazy/taby) |
| Reuse `loginAdmin` / seed istniejący | Nowy test harness SSOT · nowe fixture DB |
| npm script cienki (`test:e2e:ui-guard` lub równoważny) | Zmiana semantyki produkcyjnej UI |

**Zasada kosztu:** ≤ **8 asercji logicznych** w ≤ **1 describe** (lub 2 pliki max: helper + spec). Runtime target **&lt; 2 min** lokalnie na preview/prod URL.

### PAYROLL SAFETY GATE

| Warstwa | ALL-NIE? |
|---------|----------|
| Persist / write / sync / week / hours | **NIE** (testy read-only UI) |
| Login seed haseł lokalnych | Jak istniejące E2E — bez domeny płac |

---

## 2. Design Freeze

### UG-DF-01 — Forma suite

| Element | Zamrożenie |
|---------|------------|
| Framework | **Playwright Test** (nie osobny `node` smoke długoterminowo) |
| Project | Nowy **`e2e-ui-guard`** w `playwright.config.ts` **lub** rozszerzenie `desktop-chrome` — **jedna** decyzja IMPLEMENT: preferuj **osobny project** `testMatch: /ui-regression-guard\.spec\.ts/` · viewport **1280×800** (md sidebar widoczny) |
| Spec | `e2e/ui-regression-guard.spec.ts` (jeden plik) |
| Helper (opcjonalny) | `e2e/helpers/ui-shell-guard.ts` — tylko `measureScrollBox(selector)`, `assertNoHorizontalOverflow(el)`, `countPrimaryCtas(...)` |
| Auth | `gotoLoginPick` + `loginAdmin` z `e2e/helpers/auth.ts` |
| Base URL | `PW_BASE_URL` / config default (jak reszta E2E) |
| Zakaz | Duplikowanie pełnego login flow z `smoke-*.mjs` · osobny chromium.launch poza Test runnerem w CI |

### UG-DF-02 — Sidebar scrollWidth

| Stan | Asercja |
|------|---------|
| **Idle** | `.admin-sidebar-scroll`: `scrollWidth === clientWidth` (tolerancja **0**; opcjonalnie `≤ clientWidth + 1` tylko jeśli subpixel — default **strict equal**) |
| **Hover** | Hover pierwszego `.admin-sidebar-nav button` → tooltip może być `display:block` → **nadal** `scrollWidth === clientWidth` |
| **Focus** | `focus()` **lub** Tab do pierwszego itemu z `group-focus-within` → tip widoczny → **nadal** equal |
| Zakaz | `overflow-x: hidden` jako „fix” w teście · asercja na `aside` zamiast scroll container |

### UG-DF-03 — Tooltip vs layout

| Check | Zamrożenie |
|-------|------------|
| Tip class | **Brak** `left-[calc(100%` / brak **samodzielnego** `w-max` na tipie Sidebara (po SIDEBAR-02) |
| Tip idle | `display: none` (nie `opacity:0` + `visibility:hidden` z `display:block`) |
| Hover/focus | Tip w obrębie szerokości itemu: `getBoundingClientRect().right ≤ scrollport.right + 1` |
| Zakaz | Testy treści hintów / delay animacji |

### UG-DF-04 — Dashboard Primary CTA

| Check | Zamrożenie |
|-------|------------|
| Scope | Widok **Pulpit** po `loginAdmin` |
| Definicja Primary | Elementy z klasą / variantem **Primary** w **headerze** Dashboard (kontener nagłówka + sobota banner jeśli widoczny) — **nie** całe `document` |
| Reguła | Liczba Primary **≤ 1** w headerze *albo* dokładnie 1 gdy `!showSaturdayBanner`; gdy banner soboty — Primary w bannerze, header bez drugiego Primary (zgodnie z UI-01B) |
| Implement hint | Preferuj `page.locator('[data-wg-variant="primary"]')` **tylko jeśli** atrybut już istnieje; **zakaz** dodawania data-attrs w tym slice guard **chyba że** zero-cost w WgButton — **DEFER data-attr** → asercja przez widoczne CTA: max jeden button z klasami `bg-primary` **w** `h1` sibling header row |
| Zakaz | Snapshot całego Dashboard · liczenie KPI jako CTA |

### UG-DF-05 — Roboty focus-visible

| Check | Zamrożenie |
|-------|------------|
| Lista | Po wejściu w Roboty: karta select (`button` z adresem / `aria-pressed`) ma w `className` token ring: `focus-visible:ring` **lub** `ring-primary/15` (z `WG_FOCUS_RING`) |
| Taby | `getByRole('tab')` — class zawiera focus-visible ring; **brak** `aria-pressed` na tabie; jest `aria-selected` |
| Aktywacja focus | Użyć **klawiatury** (`Tab` / `focus()` + weryfikacja class) — nie wymagać computed `box-shadow` (flaky) |
| Seed | Jeśli lista pusta: minimalny job w `localStorage` **jak** istniejące smoke A11Y — tylko w teście guard |
| Zakaz | Pełny keyboard matrix Esc/Shift+Tab (już pokryte smoke A11Y; guard = smoke klas) |

### UG-DF-06 — Główne panele: brak poziomego scrolla

| Panel | Kontener do pomiaru |
|-------|---------------------|
| Pulpit | `[data-mobile-scroll-root="dashboard"]` **lub** główny scroll Dashboard |
| Roboty | Shell split: **nie** chip lanes; sprawdź `aside` list scroll **oraz** detail scroll root jeśli obecny — **tylko** `scrollWidth <= clientWidth + 1` na **pionowym** scroll root |
| Lista płac | Wejście w widok (nawigacja) → główny scroll root Payroll — **read-only**, bez edycji godzin |

| Reguła | Zamrożenie |
|--------|------------|
| Document | Opcjonalnie reuse `assertNoDocumentScroll` z `desktop-layout.spec.ts` (export helper lub duplikata 5 linii) |
| Zakaz | Fail na wewnętrznych `overflow-x-auto` (tablist/KPI) — mierzyć **scroll root panelu**, nie każdy child |

### UG-DF-07 — CI / npm

| Element | Zamrożenie |
|---------|------------|
| Script | `package.json`: `"test:e2e:ui-guard": "playwright test --project=e2e-ui-guard"` |
| CI | **NIE** blokować całego Gate B w v1 — Owner GO osobno; lokalnie + opcjonalnie nightly |
| Env | Działa na `PW_BASE_URL=http://127.0.0.1:4173` (preview) i na prod URL (jak inne E2E) |

### UG-DF-08 — DEFER

| Item | Powód |
|------|-------|
| Axe / kontrast WCAG suite | Koszt utrzymania |
| A11Y-01B tabpanel `aria-controls` | Jeszcze nie na tipie |
| Visual diff Topbar glass | Flaky |
| Migracja `scripts/smoke-a11y-01-keyboard.mjs` → spec | Opcjonalnie po stabilizacji guard |

---

## 3. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-01** | Istnieje project + spec zgodne z UG-DF-01 |
| **AC-02** | Sidebar idle/hover/focus: `scrollWidth === clientWidth` |
| **AC-03** | Tooltip idle `display:none`; brak side `calc(100%)` layout leak |
| **AC-04** | Dashboard Primary CTA ≤1 w zdefiniowanym scope |
| **AC-05** | Roboty: karta + tab mają class focus-visible ring; tab bez `aria-pressed` |
| **AC-06** | Pulpit + Roboty (+ Payroll read-only) panel scroll root bez horizontal overflow |
| **AC-07** | Suite zielona lokalnie na preview &lt; 2 min |
| **AC-08** | Zero zmian produkcyjnego UI w tym slice (testy only) — **chyba że** DEFER data-attr świadomie odrzucone |
| **AC-09** | Nie dodano `overflow-x:hidden` „żeby test przeszedł” |

---

## 4. Lista testów

| ID | Nazwa (spec) | Co robi |
|----|--------------|---------|
| **UG-T01** | `sidebar scrollWidth idle` | Po login → measure `.admin-sidebar-scroll` |
| **UG-T02** | `sidebar scrollWidth hover tip` | Hover first nav → tip block → equal widths |
| **UG-T03** | `sidebar scrollWidth focus tip` | Focus first nav → tip block → equal widths |
| **UG-T04** | `tooltip not side-positioned` | Assert tip class / computed left strategy |
| **UG-T05** | `dashboard at most one primary CTA` | Pulpit header Primary count |
| **UG-T06** | `jobs card has focus-visible ring token` | Roboty → card class |
| **UG-T07** | `jobs detail tabs a11y focus token` | Taby: ring class + no `aria-pressed` |
| **UG-T08** | `main panels no horizontal overflow` | Dashboard + Jobs (+ Payroll) scroll roots |

**Mapowanie regresji:**

| Test | Chroni |
|------|--------|
| T01–T04 | SIDEBAR-REGRESSION-02 |
| T05 | UI-01B / Shell consistency |
| T06–T07 | A11Y-01 |
| T08 | Shell / desktop-layout family |

---

## 5. Ryzyka

| ID | Ryzyko | Mitigacja |
|----|--------|-----------|
| **R1** | `locator.focus()` ≠ `:focus-visible` w Chromium | Prefer Tab; asercja na **class token**, nie box-shadow |
| **R2** | Flaky hover (tooltip delay) | Brak delay w SIDEBAR-02 tip; `waitFor` display block z timeout krótkim |
| **R3** | Nav label `Roboty9` | Regex `/Roboty/i` (jak smoke A11Y) |
| **R4** | Primary CTA selector kruchy | Wąski scope header; dokumentować selector w helperze |
| **R5** | False fail na chip `overflow-x-auto` | Mierzyć tylko scroll roots (DF-06) |
| **R6** | Suite na prod z danymi Ownera | Read-only; nie klikać Usuń / zapis płac |
| **R7** | Koszt CI | v1 poza Gate B; osobny script |
| **R8** | Duplikacja vs `desktop-layout` / smoke A11Y | Guard = geometry shell; nie zastępuje happy-path |

---

## 6. Pliki (allowlist IMPLEMENT)

| Plik | Rola |
|------|------|
| `e2e/ui-regression-guard.spec.ts` | **NEW** — T01…T08 |
| `e2e/helpers/ui-shell-guard.ts` | **NEW** opcjonalny |
| `playwright.config.ts` | Project `e2e-ui-guard` |
| `package.json` | Script `test:e2e:ui-guard` |
| `docs/architecture/WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md` | Ten DF |

**Zakaz w commitcie IMPLEMENT:** `src/app/**` (chyba Owner GO na data-attr — default NIE).

---

## 7. Definition of Done (po Owner GO IMPLEMENT)

1. AC-01…09 PASS lokalnie.  
2. Krótki IMPLEMENT REPORT + przykładowy log T01–T08.  
3. Bez commit/push bez Owner GO RELEASE.

---

**OWNER:** DESIGN FREEZE gotowy. Czekam na **GO IMPLEMENT**.  
**Nie rozpoczęto implementacji.**
