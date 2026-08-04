# WM-RYSUNKI-MOBILE-01 MOBILE-P0 — MOBILE SIMULATION REVIEW

> **ID:** WM-RYSUNKI-MOBILE-01-P0-MOBILE-SIMULATION-REVIEW  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P0**  
> **FAZA:** **MOBILE SIMULATION REVIEW**  
> **TO NIE JEST DEVICE PASS** · **TO NIE ZAMYKA GATE-B**  
> **STATUS:** **COMPLETE** (symulacja Chromium)  
> **WERDYKT SYMULACJI:** **PASS WITH NOTES**  
> **DEVICE PASS:** **NIE WYSTAWIONY**  
> **COMMIT / PUSH:** **NIE**  
> **Data:** 2026-08-04  
> **Engine:** Playwright Chromium · viewport / `isMobile` / `hasTouch` emulation  
> **Base:** `http://127.0.0.1:4173` (Vite preview po `npm run build`, tip lokalny **2.66.04**)  
> **Artefakty:** `.tmp-mobile-sim/out/report.json` · screenshoty `.tmp-mobile-sim/out/*.png`  
> **Spec:** `.tmp-mobile-sim/wm-rysunki-mobile-p0-sim.spec.ts`

```text
════════════════════════════════════════════════════════
MOBILE SIMULATION REVIEW — WM-RYSUNKI-MOBILE-01 / MOBILE-P0

NIE: DEVICE PASS
NIE: Safari iOS / Samsung Internet verified
NIE: GO COMMIT

TAK: Chromium multi-viewport simulation COMPLETE
WERDYKT SYMULACJI: PASS WITH NOTES
GOTOWE DO DEVICE OWNER VERIFICATION: TAK (z notatkami §4–§5)

COMMIT / PUSH: NIE
════════════════════════════════════════════════════════
```

---

## 0. Zakres i ograniczenia

| Co zrobiono | Co to **nie** jest |
|-------------|-------------------|
| Emulacja CSS viewportów telefonów / iPada / desktop | Fizyczny iPhone / Pixel / Galaxy / iPad |
| Chromium + Playwright pointer/mouse | WebKit Safari, Blink Samsung Internet, gesture OS |
| `visualViewport` / `--app-height` w Chromium | Dynamic Island, home indicator, URL bar show/hide iOS |
| `env(safe-area-inset-*)` floor (0.5rem → 8px) | Prawdziwe insety notch / gesture bar |
| `hasTouch: true` + mouse/pointer events | Multi-touch pinch OS, palm rejection |

**Owner GO:** „MOBILE SIMULATION REVIEW” — nie Device OV, nie commit, nie push.

---

## 1. Profile urządzeń (symulacja)

| Profile | Viewport (CSS) | DPR | Oczekiwany path | Wynik profilu |
|---------|----------------|-----|-----------------|---------------|
| iPhone 17 Pro Max (sim) | 440×956 | 3 | Portal FS `<md` | **PASS** (0 FAIL) |
| iPhone 16 (sim) | 393×852 | 3 | Portal FS | **PASS** |
| iPhone 15 (sim) | 393×852 | 3 | Portal FS | **PASS** |
| Pixel 9 Pro (sim) | 412×915 | 2.625 | Portal FS | **PASS** |
| Galaxy S24 Ultra (sim) | 384×824 | 3.75 | Portal FS | **PASS** |
| iPad Mini (sim) | 768×1024 | 2 | Desktop path (≥768) | **PASS WITH WARN** (pan) |
| Desktop 1920 | 1920×1080 | 1 | Desktop path | **PASS** (regresja) |

**Summary JSON:** `profiles: 7` · `failChecks: 0` · `warnChecks: 1` · `suiteErrors: 0`.

---

## 2. Matryca weryfikacji (symulacja)

| Obszar | Werdykt sim | Dowód / uwagi |
|--------|-------------|----------------|
| Fullscreen editor `<md` | **PASS** | `data-testid=wm-drawing-fs` · height ≈ viewport |
| `createPortal(document.body)` | **PASS** | `parentElement === document.body` na wszystkich telefonach |
| `modal-overlay` + `modal-lightbox` | **PASS** | klasy obecne; **bez** `modal-sheet` |
| Safe-area | **PASS (sim)** | `paddingTop` computed **8px** (floor `max(0.5rem, env(…))`) — insety OS **nie** zweryfikowane |
| `visualViewport` / `100dvh` / `--app-height` | **PASS (sim)** | `--app-height` ustawione (np. `956px`); `height`/`maxHeight` FS = ten kontrakt |
| `touch-action: none` | **PASS** | computed na `.wm-drawing-surface` |
| Pointer capture | **PASS (sim)** | `hasPointerCapture` true w trakcie pan |
| `pointercancel` | **PASS (sim)** | dispatch nie wywala edytora |
| `pointerleave` ≠ end drag | **PASS (sim)** | leave + kontynuacja move → pan dalej działa |
| Zoom ± | **PASS** | title Powiększ / Pomniejsz |
| Pan (Wybierz + tło) | **PASS** (telefony + desktop) · **WARN** iPad | transform `translate(…)` |
| Reset widoku | **PASS** | `scale(1)` po Reset |
| Orientation change | **PASS WITH NOTES** | patrz §3.1 |
| Toolbar layout | **PASS (sim)** | edytor otwarty; canvas share ~65–73% wysokości FS |
| Clipping / overflow | **PASS (sim)** | surface w granicach FS; `overflow: hidden` na FS surface |
| z-index | **PASS** | `z-index: 50`; bottom-nav „Lista” **przykryta** przez portal (`elementFromPoint`) |
| Modal scroll lock | **PASS** | `html.modal-scroll-locked` |
| Draw wall (2-click) | **PASS (sim)** | `[data-id]` count +1 |
| Drag object | **PASS (sim)** | mouse drag na `[data-id]` |
| Desktop regression | **PASS** | brak portalu; zoom/pan/wall OK |

---

## 3. Lista znalezionych problemów / obserwacji

### 3.1 Landscape na telefonie wychodzi z path mobile (oczekiwane P0 / DF P2)

Przy obróceniu viewportu telefonu do landscape **szerokość CSS** staje się długością długiej krawędzi (np. 956 / 852 / 915 / 824) → **`matchMedia(max-width: 767px) = false`** → portal FS **znika**, edytor przechodzi na path „desktop / in-place”.

| Profil | Landscape CSS | Portal po rotate |
|--------|---------------|------------------|
| iPhone 17 Pro Max | 956×440 | **brak** (`matchMobile: false`) |
| iPhone 16/15 | 852×393 | **brak** |
| Pixel 9 Pro | 915×412 | **brak** |
| Galaxy S24 Ultra | 824×384 | **brak** |

**Klasyfikacja:** zgodne z DF (`isMobile` = `< md`); **landscape UX = P2**, nie regresja P0 portrait.  
**Dla Device OV:** Owner musi świadomie testować portrait (P0) i osobno landscape (oczekiwane zachowanie / P2 gap).

### 3.2 iPad Mini (768) — path desktop, pan WARN

| Fakt | Skutek |
|------|--------|
| Breakpoint `max-width: 767px` | iPad Mini **768** → **bez** portalu (DF) |
| `pan_gesture_sim` | **WARN** — transform pozostał `scale(1)` / `translate(0)` w tej próbie |
| Zoom / wall / Lista | **PASS** |

**Klasyfikacja:** nie FAIL P0 (tablety ≥ md poza kontraktem FS). Ryzyko UX na iPadzie: nested scroll vs pan — **Device OV / P2**.

### 3.3 Pułapka selektora „Lista” (test infra, nie bug produktu)

Bottom-nav **Lista** (Lista Płac) vs chrome edytora **Lista**. Portal poprawnie przechwytuje hit-test — klik w bottom-nav jest blokowany. To potwierdza **z-index**, nie defekt rysunków.

### 3.4 Brak FAIL produktowych w symulacji portrait

**0** `failChecks` w `report.json` po poprawionej matrycy. Jedyny WARN produktowy: pan na iPad Mini.

---

## 4. Ryzyka — tylko fizyczne urządzenie / real browser

| Ryzyko | Dlaczego sim nie wystarczy |
|--------|----------------------------|
| Safari iOS `100dvh` + pasek adresu / visualViewport resize | Chromium preview stały viewport |
| Safe-area notch / Dynamic Island / home indicator | `env()` w Desktop Chromium ≈ 0 |
| `position: fixed` + portal pod Safari (historyczne bugi) | sim potwierdził `document.body`, nie WebKit |
| Multi-touch pinch vs app zoom | brak prawdziwego pinch OS |
| `pointercancel` od scroll / call / browser chrome | tylko syntetyczny dispatch |
| Palm rejection / accidental scroll podczas draw | real finger |
| Samsung Internet / Chrome Android gesture nav | nie testowane |
| Performance SVG + zoom na SoC telefonu | brak pomiaru FPS |
| Landscape P2 UX (toolbar, canvas share) | path zmienia się na ≥768 — wymaga Device OV |
| Hitboxy &lt;44px (P1 OUT) | nie w zakresie P0 sim quality |

---

## 5. Rekomendacja — gotowość do DEVICE OWNER VERIFICATION

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy kod P0 jest **gotowy do Device OV**? | **TAK** — symulacja portrait + desktop nie wykazała blokerów P0 |
| Czy to oznacza **DEVICE PASS**? | **NIE** |
| Czy wolno **GO COMMIT** po samej sim? | **NIE** — nadal wymagany Owner Device OV ([`…-P0-DEVICE-OWNER-VERIFICATION.md`](./WM-RYSUNKI-MOBILE-01-P0-DEVICE-OWNER-VERIFICATION.md)) |
| Co Owner powinien priorytetowo sprawdzić | Safari iPhone portrait FS · draw/pan/zoom · safe-area real · Chrome Android · desktop ≥768 · **świadomie** landscape (wyjście z FS) |

```text
REKOMENDACJA:
  MOBILE SIMULATION REVIEW = PASS WITH NOTES
  → Owner: DEVICE OWNER VERIFICATION (GATE-B)
  → PASS device → GO COMMIT (osobne polecenie)
  → FAIL device → AUDIT / RCA / REQUIRED FIXES

NIE WYSTAWIONO: DEVICE PASS
NIE WYKONANO: commit / push
```

---

## 6. Jak odtworzyć symulację

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
# osobny terminal:
set PW_BASE_URL=http://127.0.0.1:4173
npx playwright test -c .tmp-mobile-sim/playwright.config.ts
```

Wynik: `.tmp-mobile-sim/out/report.json`.

---

## 7. Powiązane dokumenty

| Doc | Rola |
|-----|------|
| [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md) | Kontrakt P0 / P2 landscape |
| [`WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md) | Portal → `document.body` |
| [`WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION.md`](./WM-RYSUNKI-MOBILE-01-P0-OWNER-VERIFICATION.md) | Pack implement |
| [`WM-RYSUNKI-MOBILE-01-P0-DEVICE-OWNER-VERIFICATION.md`](./WM-RYSUNKI-MOBILE-01-P0-DEVICE-OWNER-VERIFICATION.md) | GATE-B Owner — **nadal OPEN** |

---

**Koniec raportu — MOBILE SIMULATION REVIEW · NIE DEVICE PASS · bez commit/push.**
