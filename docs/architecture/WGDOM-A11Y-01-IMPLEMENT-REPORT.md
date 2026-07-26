# WGDOM-A11Y-01 — IMPLEMENT REPORT

> **Status:** IMPLEMENT COMPLETE · **Commit/Push:** NIE  
> **Date:** 2026-07-26  
> **DF:** [`WGDOM-A11Y-01-DESIGN-FREEZE.md`](./WGDOM-A11Y-01-DESIGN-FREEZE.md)  
> **Parent:** POST-RELEASE PR-P1-1 · PR-P1-2 · PR-P2-6

---

## 1. Summary

Thin accessibility polish: `WG_FOCUS_RING` → `focus-visible`; Job list cards and detail tabs get visible keyboard focus + corrected ARIA. Idle/hover/selected/layout **nietknięte**.

---

## 2. Zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/lib/wg-ui-tokens.ts` | `WG_FOCUS_RING`: `focus:ring-*` → `focus-visible:ring-*` (paint bez zmian) |
| `src/app/JobListCardV2.tsx` | `WG_FOCUS_RING` na select / bulk / delete / confirm / cancel; `aria-pressed={selected}` na select; `aria-label` delete/confirm |
| `src/app/JobDetailSectionNav.tsx` | `WG_FOCUS_RING` na tabach; **usunięto** `aria-pressed`; zachowano `aria-selected`; opcjonalne `id={job-detail-tab-*}` |

**WgButton:** 0 diff (dziedziczy token).

**Helper (nie allowlist release):** `scripts/smoke-a11y-01-keyboard.mjs` — keyboard smoke Playwright.

---

## 3. Gates

| Gate | Wynik |
|------|--------|
| Build | **PASS** |
| Typecheck (`tsc --noEmit`) | **PASS*** — wyłącznie pre-existing `TS5101` `baseUrl` |
| Login smoke | **PASS** `test-admin-login-shell-p0a.mjs` → **11/0** |
| Mobile audit | **PASS** `npm run audit:mobile` → **36/0** |
| Keyboard smoke | **PASS** **15/15** (`scripts/smoke-a11y-01-keyboard.mjs`) |

\*Brak nowych błędów TS z A11Y-01.

**Uwaga:** `smoke-etap2c-login.mjs` — ścieżki admin PASS; worker PIN FAIL (pre-existing / poza scope A11Y). Kanoniczny login gate = P0-A 11/0.

---

## 4. Keyboard smoke (lista + detail)

| Akcja | Lista kart | Detail tabs |
|-------|------------|-------------|
| Tab / Shift+Tab | PASS | PASS |
| Enter | PASS (aktywacja karty) | PASS (`aria-selected=true`) |
| Space | PASS | PASS (`aria-selected=true`) |
| Esc | PASS (no crash; brak modalu) | PASS |
| Focus class `focus-visible:ring-2` | PASS | PASS |
| `aria-pressed` tylko na karcie (nie na tab) | PASS | PASS (brak `aria-pressed`) |

---

## 5. Przed / po (krótko)

| | Przed | Po |
|--|-------|-----|
| Token focus | `focus:ring-2` (ring też po clicku myszą) | `focus-visible:ring-2` (klawiatura / AT) |
| Karta Roboty | Brak focus ring; brak `aria-pressed` na select | Ring + `aria-pressed={selected}` |
| Delete controls | Słabe/brak focus + aria | Ring + `aria-label` |
| Detail tabs | Ring brak; `aria-pressed` + `aria-selected` | Ring; tylko `aria-selected` |
| Idle / hover / selected paint | — | **Bez zmian** |

---

## 6. AC (DF)

| AC | Wynik |
|----|--------|
| AC-01…AC-10 | **PASS** (w zakresie allowlist) |

---

## 7. OUT (potwierdzone nietknięte)

Dashboard · Sidebar · Topbar pliki · Forms · JobsView body · API · Cloud · Payroll · DS API (brak nowych eksportów).

---

**OWNER:** gotowe do REVIEW / GO COMMIT.  
**Nie wykonano commit ani push.**
