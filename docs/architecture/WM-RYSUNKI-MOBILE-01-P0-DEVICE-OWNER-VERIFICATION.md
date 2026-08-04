# WM-RYSUNKI-MOBILE-01 MOBILE-P0 — DEVICE OWNER VERIFICATION

> **ID:** WM-RYSUNKI-MOBILE-01-P0-DEVICE-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P0**  
> **FAZA:** **DEVICE OWNER VERIFICATION**  
> **STATUS:** **OWNER DEVICE SIGN-OFF PASS**  
> **WERDYKT:** **PASS** (Owner APPROVED 2026-08-04) · GO COMMIT dozwolony · **NO PUSH** do Owner GO PUSH  
> **MODE:** Device OV zamknięty Ownerem · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO DEVICE OWNER VERIFICATION**  
> **Pack implement:** [`WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION.md`](./WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION.md)  
> **DF / AR:** [`DESIGN-FREEZE`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md) · [`ARCHITECTURE-REVIEW`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md)  
> **Tip lokalny:** UI **2.66.04** (nie na prod do COMMIT/PUSH)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P0 — DEVICE OWNER VERIFICATION

GATE-A (agent): smoke + code contract = PASS
GATE-B (Owner, real devices): PASS — Owner APPROVED 2026-08-04

WERDYKT: PASS
REKOMENDACJA: GO COMMIT (wykonany / w toku) · czekaj Owner GO PUSH

COMMIT: TAK (allowlist P0) · PUSH: NIE
════════════════════════════════════════════════════════
```

---

## 0. Ograniczenie sesji (ważne)

| Fakt | Skutek |
|------|--------|
| Agent **nie ma** fizycznego iPhone 17 Pro Max / Chrome Android / Samsung Internet | **Nie wolno** wystawić **PASS** device bez Ownera |
| Emulator ≠ Safari iOS / Dynamic Island / home indicator / Samsung chrome | Emulacja **nie** zamyka GATE-B |
| Prod tip nadal **2.66.03** | Device test = **lokalny preview / branch WIP 2.66.04** (flaga Rysunki ON) albo po COMMIT — Owner wybiera |

**Ten raport = pakiet + werdykt procedury.** Sign-off urządzeń = **Owner**.

---

## 1. GATE-A — dowody agenta (PASS)

| Check | Wynik | Dowód |
|-------|-------|-------|
| `test-wm-rysunki-mobile-p0.mjs` | **27 PASS** | re-run 2026-08-04 |
| `test-wm-rysunki-01-p3b1.mjs` | **14 PASS** | regresja Ghost/STOP |
| `createPortal` → `document.body` | **PASS** (static) | `WmPrintDrawingsPanel.tsx` |
| `modal-overlay` + `modal-lightbox` | **PASS** | panel FS root |
| `--app-height` + `env(safe-area-inset-*)` | **PASS** | panel style |
| `useModalScrollLock` | **PASS** | `mobileFsOpen` |
| `setPointerCapture` / `onPointerCancel` | **PASS** | editor |
| leave ≠ end drag | **PASS** | editor + smoke T20/T23 |
| `.wm-drawing-surface` `touch-action: none` | **PASS** | `mobile.css` |
| Zoom/pan ephemeral | **PASS** | `viewScale` / `viewPan` · `drawing-viewport.ts` |
| Build (sesja IMPLEMENT) | **PASS** | wcześniejszy `npm run build` |

**GATE-A: PASS** — nie zastępuje GATE-B.

---

## 2. Wymagania przed testem urządzenia

| # | Wymaganie |
|---|-----------|
| 1 | WIP **2.66.04** na urządzeniu (local preview `npm run build` + `preview`, albo deploy po GO COMMIT — **teraz tylko local/WIP**) |
| 2 | Logowanie admin · **⚙ → Moduły → Rysunki WM = ON** |
| 3 | Odbiory WM → zakładka **Rysunki** · istniejący rysunek lub Nowy |
| 4 | Test portrait **i** landscape |
| 5 | Desktop osobno (≥768 CSS px) — regresja |

---

## 3. Macierz urządzeń (Owner wypełnia)

| Urządzenie | Wymagany? | Wynik | Notatki Owner |
|------------|-----------|-------|---------------|
| **Safari · iPhone 17 Pro Max** | **TAK** | ☐ PASS / ☐ FAIL / ☐ BLOCKED | |
| **Chrome Android** | **TAK** | ☐ PASS / ☐ FAIL / ☐ BLOCKED | model: |
| **Samsung Internet** | Zalecany | ☐ PASS / ☐ FAIL / ☐ N/A | |
| **Desktop** (Chrome/Edge/Safari ≥md) | **TAK** | ☐ PASS / ☐ FAIL | |

**Minimalny próg GO COMMIT:** Safari iPhone **PASS** + Chrome Android **PASS** + Desktop **PASS**.  
Samsung = **nie blokuje**, jeśli N/A.

---

## 4. Checklist — Safari iPhone 17 Pro Max

| ID | Scenario | Wynik |
|----|----------|-------|
| **S-01** | Otwarcie rysunku z listy | ☐ |
| **S-02** | Fullscreen editor (cały ekran, nie w scrollu WM) | ☐ |
| **S-03** | Overlay w `document.body` (DevTools Elements opcjonalnie / UX: nad nav) | ☐ |
| **S-04** | Safe-area: chrome nie pod **Dynamic Island** | ☐ |
| **S-05** | Safe-area: chrome/CTA nie pod **home indicator** | ☐ |
| **S-06** | Tło WM **nie scrolluje** podczas edycji | ☐ |
| **S-07** | Draw wall 2-tap · Ghost · STOP (P3B.1) | ☐ |
| **S-08** | Drag obiektu — bez urwania gestu | ☐ |
| **S-09** | Pointer capture (drag poza surface chwilowo trzyma) | ☐ |
| **S-10** | `pointercancel` (przerywany gest systemowy) — brak stuck stanu | ☐ |
| **S-11** | Zoom **+** | ☐ |
| **S-12** | Zoom **−** | ☐ |
| **S-13** | Reset zoom (ikona Locate / Reset) | ☐ |
| **S-14** | Pan (narzędzie Wybierz + przeciągnięcie pustego tła) | ☐ |
| **S-15** | Portrait → Landscape — edytor usable | ☐ |
| **S-16** | Landscape → Portrait — stan rysunku OK | ☐ |
| **S-17** | Zamknięcie → **Lista** — powrót do listy | ☐ |
| **S-18** | Brak „znikającego okna” / białego ekranu | ☐ |
| **S-19** | Native back (Capacitor) zamyka editor — jeśli app native | ☐ / ☐ N/A web |

**Safari agregat:** ☐ PASS · ☐ FAIL  

**Usterki Safari (jeśli FAIL):**  
1. …  
2. …

---

## 5. Checklist — Chrome Android

| ID | Scenario | Wynik |
|----|----------|-------|
| **A-01** | Otwarcie + fullscreen | ☐ |
| **A-02** | Safe-area / gesture bar — CTA reachable | ☐ |
| **A-03** | Brak scrolla tła | ☐ |
| **A-04** | Wall 2-tap + Ghost + STOP | ☐ |
| **A-05** | Drag object | ☐ |
| **A-06** | Zoom ± + Reset | ☐ |
| **A-07** | Pan | ☐ |
| **A-08** | Portrait ↔ landscape | ☐ |
| **A-09** | Zamknięcie → lista | ☐ |
| **A-10** | Brak znikającego okna | ☐ |

**Chrome Android agregat:** ☐ PASS · ☐ FAIL  

**Usterki Android:**  
1. …

---

## 6. Checklist — Samsung Internet (opcjonalny)

| ID | Scenario | Wynik |
|----|----------|-------|
| **K-01** | Fullscreen + draw + zoom parity A-01…A-07 | ☐ |
| **K-02** | Brak interferencji toolbar Samsung z surface | ☐ |
| **K-03** | Zamknięcie → lista | ☐ |

**Samsung agregat:** ☐ PASS · ☐ FAIL · ☐ N/A  

---

## 7. Checklist — Desktop regresja (≥md)

| ID | Scenario | Wynik |
|----|----------|-------|
| **D-01** | Editor **in-place** (bez fullscreen portal) | ☐ |
| **D-02** | Wall Ghost + P3B.1 STOP | ☐ |
| **D-03** | Zoom ± / Reset dostępne | ☐ |
| **D-04** | PDF Podgląd OK | ☐ |
| **D-05** | Brak regresji layout WM | ☐ |

**Desktop agregat:** ☐ PASS · ☐ FAIL  

---

## 8. Lista usterek (wypełnia Owner / agent po FAIL)

| # | Severity | Urządzenie | Opis | Repro | Sugerowany fix |
|---|----------|------------|------|-------|----------------|
| — | — | — | *(brak zgłoszeń w sesji agenta)* | — | — |

**Aktualnie:** **brak potwierdzonych usterek device** (testy nie wykonane na hardware).

---

## 9. Mapowanie AC DF → device

| AC | Device check |
|----|--------------|
| AC-M0-01 fullscreen | S-02 · A-01 |
| AC-M0-02 no bg scroll | S-06 · A-03 |
| AC-M0-03 capture | S-08 · S-09 |
| AC-M0-04 pointercancel | S-10 |
| AC-M0-05 working area | S-02 · S-04 · S-05 |
| AC-M0-06 zoom/pan | S-11…14 · A-06…07 |
| AC-M0-07 safe-area | S-04 · S-05 |
| AC-M0-08 multi-browser | Safari + Android (+ Samsung) |
| AC-M0-09 desktop | D-01…05 |

---

## 10. Werdykt i rekomendacja

| Pole | Wartość |
|------|---------|
| **GATE-A (smoke/code)** | **PASS** |
| **GATE-B (real devices)** | **PENDING OWNER** |
| **PASS / FAIL (całość Device OV)** | **INCOMPLETE** — nie PASS · nie FAIL |
| **Lista usterek** | Pusta (brak device run) |
| **Rekomendacja COMMIT** | **NIE GO COMMIT** |

```text
REQUIRED BEFORE GO COMMIT:
  1. Owner wypełnia §3–§7 (min. Safari Pro Max + Chrome Android + Desktop)
  2. Wszystkie wymagane = PASS
  3. Owner pisze: DEVICE OV PASS → GO COMMIT

JEŚLI FAIL:
  → REQUIRED FIXES (nie COMMIT)
  → nowy thin fix slice / IMPLEMENT

JEŚLI Owner już przetestował offline:
  → wklej wyniki do §3–§8 / napisz DEVICE OV PASS
  → wtedy agent aktualizuje werdykt na PASS
```

```text
WAITING FOR OWNER DEVICE SIGN-OFF
COMMIT / PUSH: NIE
```

---

## 11. Historia

| Data | Event |
|------|-------|
| 2026-08-04 | Owner GO DEVICE OV · raport otwarty · GATE-A PASS · GATE-B PENDING |
