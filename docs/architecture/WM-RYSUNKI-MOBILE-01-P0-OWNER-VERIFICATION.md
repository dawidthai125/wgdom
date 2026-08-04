# WM-RYSUNKI-MOBILE-01 MOBILE-P0 — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P0**  
> **FAZA:** **OWNER VERIFICATION**  
> **STATUS:** **OWNER APPROVED** · Device OV **PASS** · Commit MOBILE-P0 · **NO PUSH** (czekaj Owner GO PUSH)  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO IMPLEMENT** · DF **FROZEN** · AR **PASS WITH DF CORRECTIONS**  
> **DF:** [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md)  
> **AR:** [`WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md)  
> **Changelog tip (lokalny, nie prod):** **2.66.04**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P0 — OWNER VERIFICATION PACK

IMPLEMENT: COMPLETE (working tree)
BUILD: PASS
SMOKE P0: 27 PASS
REGRESJA P3B.1: 14 PASS
COMMIT: GO (Owner APPROVED) · PUSH: NIE — czekaj Owner GO PUSH

OUT zachowane:
  hitboxes · 44px redesign · prompt · create menu
  PDF/ZIP semantics · Cloud · JSON · Ghost/P3B.1
════════════════════════════════════════════════════════
```

---

## 1. Co zaimplementowano (IN)

| DF | Deliverable |
|----|-------------|
| D-M0-01 / 13 | Fullscreen `<md` via **`createPortal(document.body)`** |
| D-M0-14 | Root `modal-overlay` + `modal-lightbox` (nie `modal-sheet`) |
| D-M0-15 | `height: var(--app-height, 100dvh)` + safe-area padding |
| D-M0-02 | `useModalScrollLock` gdy FS open |
| D-M0-03/04 | `.wm-drawing-surface` + `touch-action: none` |
| D-M0-05/06/07 | `setPointerCapture` · `pointercancel` · leave ≠ end drag |
| D-M0-08/16 | Ephemeral zoom ± / Reset / pan (select + empty) · nie JSON |
| D-M0-09 | FS flex column · canvas `flex-1 min-h-0` |
| D-M0-10 | `env(safe-area-inset-*)` |
| D-M0-11 | `matchMedia(max-width: 767px)` |

## 2. Pliki zmienione

| Plik | Rola |
|------|------|
| `src/app/WmPrintDrawingsPanel.tsx` | Portal FS · scroll lock · breakpoint |
| `src/app/WmPrintDrawingEditor.tsx` | Capture · cancel · leave · zoom/pan · surface |
| `src/lib/wm-technical-drawings/drawing-viewport.ts` | **NEW** clamp helpers |
| `src/styles/mobile.css` | `.wm-drawing-surface` |
| `src/app/changelog-data.ts` | **2.66.04** |
| `CHANGELOG.md` | skrót |
| `scripts/test-wm-rysunki-mobile-p0.mjs` | **NEW** smoke |

## 3. Self-review

| Check | Wynik |
|-------|-------|
| createPortal body | **PASS** |
| modal-sheet uniknięty jako root | **PASS** |
| Ghost `clearWallPreview` nietknięty semantycznie | **PASS** (smoke P3B.1) |
| PDF/ZIP / Cloud / schema | **PASS** (nie ruszane) |
| Zoom w JSON | **PASS** (tylko React state) |
| Desktop ≥md in-place | **PASS** (bez portalu) |

## 4. Testy automatyczne

| Test | Wynik |
|------|-------|
| `npx vite-node scripts/test-wm-rysunki-mobile-p0.mjs` | **27 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p3b1.mjs` | **14 PASS / 0 FAIL** |
| `npm run build` | **PASS** |

## 5. Checklist Owner (urządzenia)

### Desktop (≥md)

| # | Scenario | Owner |
|---|----------|-------|
| D1 | Wall 2-click + Ghost + STOP (P3B.1) | ☐ |
| D2 | Zoom ± / Reset działa | ☐ |
| D3 | PDF Podgląd bez artefaktów | ☐ |

### Safari iOS (Pro Max)

| # | Scenario | Owner |
|---|----------|-------|
| S1 | Open rysunek → fullscreen overlay | ☐ |
| S2 | Tło WM nie scrolluje | ☐ |
| S3 | Wall 2-tap + Ghost + STOP | ☐ |
| S4 | Drag obiektu bez urwania | ☐ |
| S5 | Pan (Wybierz + puste tło) + zoom ± | ☐ |
| S6 | Safe-area / Dynamic Island / home | ☐ |

### Chrome Android / Samsung Internet

| # | Scenario | Owner |
|---|----------|-------|
| A1 | Parity S1–S5 | ☐ |
| K1 | Samsung — surface captures | ☐ |

## 6. Werdykt pakietu

| Pole | Wartość |
|------|---------|
| IMPLEMENT | **COMPLETE** (code + docs tip lokalny) |
| RELEASE | **NOT READY** — brak COMMIT |
| NEXT | Owner OV device → **GO COMMIT** → PUSH → PV |

```text
WAITING FOR OWNER GO → COMMIT
```
