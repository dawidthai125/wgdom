# MOBILE-LIGHTBOX-IOS-01 — RCA / AUDIT

> **ID:** MOBILE-LIGHTBOX-IOS-01  
> **STATUS:** RCA COMPLETE · DF: [`MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md`](MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md) · czeka na Owner GO  
> **Data:** 2026-07-25  
> **IMPLEMENT / src / commit / push:** **NIE** bez Owner GO  
> **Objaw:** fizyczny **iPhone Safari** — Roboty → robota → Zdjęcia → otwarcie zdjęcia → lightbox „zamarza” (brak close / brak przejścia na kolejne); wyjście tylko przez zmianę zakładki (np. Dokumenty → Zdjęcia).  
> **Kontekst:** po MUX-B1.1 L1 ma `useModalScrollLock` + `modal-overlay` + `modal-sheet`; emulacja Chromium **PASS**, field Safari **FAIL**.

---

## 0. Werdykt (jedna przyczyna)

**Najbardziej prawdopodobna przyczyna (RCA):**  
Lightbox L1 (`JobPhotoGallery`) jest montowany **in-tree** jako `position: fixed` **wewnątrz** kontenera `.mobile-view-scroll` (`overflow-y: auto` + `-webkit-overflow-scrolling: touch`) w `JobsView`. Na WebKit/iOS Safari powoduje to **rozjazd warstwy wizualnej i hit-testingu** (fixed traktowane jak w containing block scrollporta / zła kompozycja). Tapy nie trafiają w handlery React na overlayu (X / backdrop), więc close nie działa.

**Dlaczego zakładki działają:** `JobDetailSectionNav` siedzi w **sticky headerze poza** scroll-rootem — poza „zepsutym” stackingiem lightboxa — więc zmiana sekcji odmontowuje galerię / czyści `lightbox` state.

**Chromium:** inny model fixed+overflow → harness emulacji nie reprodukuje → wygląda na „tylko Safari”.

---

## 1. Dokładna analiza przepływu zdarzeń

### 1.1 Drzewo DOM (mobile Jobs detal)

```text
JobsView
└─ [mobile] absolute inset-0 z-40  (panel detalu)
   ├─ header shrink-0 z-10          ← JobDetailSectionNav (Dokumenty / Zdjęcia / …)
   │    [POZA scroll-root — tapy zawsze „żywe”]
   └─ div[data-mobile-scroll-root=jobs-detail]
        class="mobile-view-scroll flex-1 overflow-y-auto overscroll-contain"
        CSS: -webkit-overflow-scrolling: touch; touch-action: pan-y
        └─ … sekcja photos …
             └─ JobPhotoGallery
                  └─ div.space-y-5
                       └─ [gdy lightbox]
                            div.fixed.inset-0.z-50.modal-overlay.modal-sheet
                              onClick → setLightbox(null)          // backdrop
                              ├─ button X  onClick stopPropagation + close
                              ├─ JobPhotoImg  onClick stopPropagation  // NIE zamyka
                              └─ caption absolute bottom (bez pointer-events-none)
```

**Portal:** brak (`createPortal` nieużywane) — overlay zostaje potomkiem scrollporta.

### 1.2 Otwarcie

1. Thumb: `div.aspect-square` `onClick` → `setLightbox(p)`.  
2. `useModalScrollLock(true)` → `html.modal-scroll-locked`, `lockCount++`.  
3. Globalny `document` `touchmove` (`passive: false`) z `modal-scroll-lock.ts`:  
   - jeśli target **nie** jest w `.modal-overlay | .modal-sheet | [data-slot=…]` → `preventDefault()`.  
   - jeśli target **jest** w marked overlay → allow (scroll/gest w surface).  
4. Escape: `window` `keydown` → close (na telefonie bez klawiatury praktycznie nieistotne).

### 1.3 Zamknięcie — zamierzony kontrakt

| Gesture | Handler | Skutek |
|---------|---------|--------|
| Tap X | `stopPropagation` + `setLightbox(null)` | close + lock release |
| Tap tło (root) | `onClick` root | close |
| Tap obraz | `stopPropagation` na `img` | **nie** close |
| Swipe / next | **brak w L1** | „kolejne zdjęcie” **nie istnieje** w UI L1 — wymaga close + inny thumb |

### 1.4 Co się dzieje na iPhone Safari (hipoteza zdarzeń)

```text
touchstart  →  (hit-test WebKit często wskazuje element POD warstwą wizualną
                lightboxa ALBO sticky header / scroll content)
touchmove   →  jeśli target ∉ .modal-overlay/.modal-sheet
                → global preventDefault (lock ON)  → gest „martwy”
touchend    →  brak syntetyzowanego click na X / backdrop
React       →  setLightbox(null) NIE wywołane
UI          →  overlay nadal widoczny, interakcje „martwe”

Tap na „Dokumenty” (header poza scroll-root)
  → setDetailSection(...)
  → JobPhotoGallery unmount / lightbox state ginie
  → lock cleanup
  → „odzyskanie” aplikacji
```

### 1.5 Porównanie Safari vs Chromium

| Aspekt | Chromium (emul / Android-like) | iPhone Safari |
|--------|--------------------------------|---------------|
| `fixed` w `overflow` + `-webkit-overflow-scrolling` | Zwykle viewport-fixed, hit-test OK | Częsty containing-block / compositing bug |
| MUX-B1 emul L1 | PASS (X, Escape, rapid×10) | Field: FAIL (objaw Ownera) |
| Sticky nav poza scroll | N/A dla repro | Escape hatch działa |

### 1.6 Wzmacniacze (nie RCA #1, ale pogarszają)

| ID | Mechanizm | Efekt |
|----|-----------|-------|
| **W1** | Klasa `modal-sheet` na fullscreen lightbox → `mobile.css` `@media max-width:767`: `max-height: 92dvh` + padding | Overlay **nie** jest prawdziwym full-bleed; luka / sticky chrome |
| **W2** | L1 bez next/prev/swipe | Po „stuck” nie da się zmienić zdjęcia w ogóle |
| **W3** | `img` `stopPropagation` + duży `max-h-[90dvh]` | Mało powierzchni backdrop; close praktycznie tylko X |
| **W4** | X: `top-4 right-4`, mały hit (`p-2`), bez `safe-area-inset-top` | Łatwo nietrafić / kolizja z notch |
| **W5** | Caption `absolute` bez `pointer-events-none` | Może przejmować tapy w dole |
| **W6** | Global `touchmove` preventDefault | **Objawia się dopiero gdy hit-test jest poza allowlist** — wtórny do W0/RCA |

**Odrzucone jako RCA #1:** sam brak Escape (telefon); sam `z-50` vs inspector `z-100` (w path Jobs lokalny context); sam stuck `lockCount` bez unmount (zmiana zakładki naprawia → unmount/state clear działa).

---

## 2. Prawdopodobna przyczyna

### RCA #1 (P0) — **fixed lightbox in-tree w scroll-root WebKit**

```text
BŁĄD ARCHITEKTURY OVERLAY:
  JobPhotoGallery renderuje fixed inset-0 jako dziecko
  .mobile-view-scroll (-webkit-overflow-scrolling: touch)

→ iOS Safari: broken hit-testing / containing block
→ handlery onClick (X, backdrop) nie dostają zdarzeń
→ wygląd: „lightbox zablokowany”
→ wyjście: zakładka poza scroll-root (Dokumenty) odmontowuje drzewo
```

To jest spójne z:
- wyłącznie fizycznym Safari,
- działającą zmianą zakładki,
- PASS Chromium emulacji,
- wcześniejszą notatką audytową **B1-PORTAL** („OK na dziś” — **błędnie niedoszacowane** dla iOS).

### RCA #2 (P1 współczynnik) — **`modal-sheet` CSS sheet semantics na lightbox**

MUX-B1 dodał `modal-sheet` dla allowlist touchguarda, ale ta klasa niesie layout sheet (`max-height: 92dvh`). Fullscreen L1 dziedziczy ograniczenie wysokości → pogarsza pokrycie i stacking względem chrome Jobs.

---

## 3. Minimalny zakres poprawki (PLAN ONLY — nie implementować tu)

### 3.1 MUST (naprawa objawu L1)

| # | Zmiana | Plik(e) | Dlaczego |
|---|--------|---------|----------|
| **F1** | Render lightbox przez `createPortal(..., document.body)` (lub wspólny portal root) | `JobPhotoGallery.tsx` | Wyrwanie `fixed` ze scrollporta WebKit → hit-test = viewport |
| **F2** | Zachować lock + markery allowlist na portaled root (`modal-overlay`; patrz F3) | ten sam | Nie cofać MUX-B1 R1/R4 |
| **F3** | **Albo** (preferowane): na lightbox fullscreen użyć markera allowlist **bez** sheet-layout — np. tylko `modal-overlay` + ewentualnie nowa klasa `.modal-lightbox` w allowlist `modal-scroll-lock.ts` **albo** override CSS: `.modal-overlay.modal-sheet` fullscreen bez `max-height: 92dvh` | `modal-scroll-lock.ts` **lub** `mobile.css` + L1 className | Usunąć W1 bez psucia sheetów email/PDF |

### 3.2 SHOULD (tanie hardening L1)

| # | Zmiana |
|---|--------|
| **F4** | Caption: `pointer-events-none` |
| **F5** | X: większy touch target (`min-h/w-[44px]`) + `top` z `safe-area-inset-top` |
| **F6** | Overlay/img: `touch-action: manipulation`; img: opcjonalnie `-webkit-touch-callout: none` |

### 3.3 OUT tej naprawy

- Pinch-zoom, swipe parity L1 (MUX-D)  
- PhotoLightboxShell extract (wariant B)  
- Zmiana semantyki globalnego touchguarda poza allowlist dla lightbox  
- Payroll / Cloud Sync  

### 3.4 Weryfikacja po IMPLEMENT (Owner)

```text
P0 iPhone Safari:
  Roboty → Zdjęcia → open → X zamyka
  backdrop (jeśli dostępny) zamyka
  rapid open/close ×10 — brak stuck lock
  sticky nav nadal działa gdy lightbox ZAMKNIĘTY
  przy OTWARTYM lightboxie nav NIE musi być klikalny (prefer: overlay nad wszystkim)

P0 regresja: JobEmail / Payroll sheet scroll wewnątrz (MUX-A)
P1: L2/L5 ten sam wzorzec portal jeśli ten sam bug
```

---

## 4. Ocena ryzyka regresji

| Ryzyko | Poziom | Komentarz |
|--------|--------|-----------|
| Portal L1 tylko | **Niskie** | Lokalna zmiana montowania; state bez zmian |
| Allowlist / nowa klasa `.modal-lightbox` | **Niskie–średnie** | Musi zostać w sync z `isScrollableModalSurface`; test MUX-A sheets |
| Override CSS `.modal-sheet` max-height | **Średnie** | Można przypadkiem dotknąć bottom sheetów — lepiej selektor lightbox-only |
| F4–F6 | **Bardzo niskie** | Czysty UX |
| Regresja „tło znów scrolluje” | **Niskie** jeśli lock + markery zostają na portaled root | |
| L2/L3/L4/L5 bez portalu | **Średnie residual** | Ten sam wzorzec in-tree — mogą mieć ten sam Safari bug; scope osobno lub ten sam ticket follow-up |

**Gate:** FEATURE shell · nie Payroll CORE · nie Cloud Sync · Owner GO przed IMPLEMENT.

---

## 5. Mapowanie na wcześniejsze ID

| Wcześniejsze | Relacja |
|--------------|---------|
| MUX-B1 L1 | Lock/markery **nie wystarczają** na iOS gdy overlay w scroll-root |
| B1-PORTAL | Traktowane jako „OK” — **podnieść do P0 defect** |
| M-GALLERY-LOCK | Częściowo zaadresowane B1.1; ten ticket = **follow-up hit-test/portal** |
| M-LOCK-INNER | Inny mechanizm (scroll *wewnątrz* modała); tu: interakcja *z* lightboxem |

---

## 6. Rekomendacja procesu

```text
1. Owner ACK tego RCA
2. DESIGN FREEZE 1-pager (F1+F3 MUST; F4–F6 SHOULD) — MOBILE-LIGHTBOX-IOS-01
3. Owner GO → IMPLEMENT tylko L1 (lub L1+L2 jeśli ten sam mount path)
4. Field: fizyczny iPhone Safari (MUST) + Android smoke
5. Commit / push wyłącznie na polecenie Ownera
```

**Raport:** `docs/architecture/MOBILE-LIGHTBOX-IOS-01-RCA.md`
