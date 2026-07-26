# WGDOM-UI-REGRESSION-GUARD-01 — IMPLEMENT REPORT

> **Status:** **SHIPPED** · tip **`2a99e54`** · prod **9/9 PASS**  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md`](./WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md)  
> **Foundation:** [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](./WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md)

---

## 1. Summary

Dodano cienki Playwright project **`e2e-ui-guard`** (T01–T08 + RG-09 + RG-10). **Zero** zmian `src/app/**`.

---

## 2. Pliki

| Plik | Rola |
|------|------|
| `e2e/ui-regression-guard.spec.ts` | **NEW** — suite |
| `e2e/helpers/ui-shell-guard.ts` | **NEW** — measure / primary CTA / ring helper |
| `playwright.config.ts` | Project `e2e-ui-guard` (1280×800) |
| `package.json` | Script `test:e2e:ui-guard` |

---

## 3. Lista testów + wynik asercji

| ID | Test | Wynik |
|----|------|--------|
| **T01** | Sidebar `scrollWidth === clientWidth` idle · tip `display:none` | **PASS** |
| **T02** | Hover tip `display:block` · equal widths · tip ≤ scrollport | **PASS** |
| **T03** | Focus tip `display:block` · equal widths | **PASS** |
| **T04** | Tip: brak `calc(100%)` / `w-max` · ma `left-0 right-0` + `hidden` | **PASS** |
| **T05 / RG-09** | Dokładnie **1** hero Primary CTA (accessible name) | **PASS** |
| **T06** | Karta Roboty: class `focus-visible:ring` / ring token | **PASS** |
| **T07** | Tab detail: ring token · brak `aria-pressed` · jest `aria-selected` | **PASS** |
| **T08** | Dashboard / jobs-list (/ detail) / payroll scroll root — brak H-overflow | **PASS** |
| **RG-10** | Po zamknięciu tooltipa (leave hover) · `scrollWidth === clientWidth` | **PASS** |

**RG-09 selector (stabilny, bez klas paint):**  
`getByRole('button', { name: /^(Przejdź do Robot|Zapisz tydzień\s*→|Lista płac\s*→)$/ })` w `[data-mobile-scroll-root="dashboard"]` — dokładnie 1.

---

## 4. Czas wykonania

| | |
|--|--|
| Playwright report | **9 passed (19.9s)** |
| Wall clock (`npm run test:e2e:ui-guard`) | **~21.5 s** |
| Target DF | &lt; 2 min · **OK** |

`PW_BASE_URL=http://127.0.0.1:4173`

---

## 5. Gates

| Gate | Wynik |
|------|--------|
| `test:e2e:ui-guard` | **PASS** 9/9 |
| Build | **PASS** |
| Login smoke (P0-A) | **PASS** 11/0 |

---

## 6. Uwagi

- **Brak** zmian `src/app/**` · brak pixel snapshots · brak mobile matrix.
- T06/T07 zakładają lokalny tip z **A11Y-01** (focus ring na kartach/tabach). Na prod bez A11Y-01 te dwa testy padną — oczekiwane do czasu release A11Y.
- Primary CTA: bez `data-wg-variant` (zakaz src); użyto **accessible name** + `data-mobile-scroll-root="dashboard"`.

---

**OWNER:** gotowe do REVIEW / GO COMMIT.  
**Nie wykonano commit ani push.**
