# MOBILE-LIGHTBOX-IOS-01 — Cross-Platform Regression Audit

> **STATUS:** AUDIT COMPLETE (Chromium mobile emulation)  
> **Data:** 2026-07-25  
> **Product `src/**`:** **nie zmieniany** w tej fazie audytu  
> **Fizyczny iPhone Safari:** **NIE ZWERYFIKOWANY — OPEN** (agent bez urządzenia · **nie raportować PASS Safari**)  
> **Commit / push:** **NIE**

```text
WAŻNE: Wszystkie projekty Playwright = Chromium + device descriptors.
To NIE jest WebKit/Safari. Emulacja iPhone ≠ fizyczny iPhone Safari.
```

**Harness:** `playwright.lightbox-cross-platform.config.mjs` + `e2e/lightbox-cross-platform-audit.spec.ts`  
**Preview:** `http://127.0.0.1:4173` (`dist` po MOBILE-LIGHTBOX-IOS-01)

**Uwagi urządzeń:**
- **Pixel 8** — brak w bundled Playwright → `cp-pixel-8-approx` (viewport/UA zbliżone)
- **Galaxy S23** — brak w bundled → `cp-galaxy-s23-proxy` (viewport 360×780 na bazie Galaxy S24)

---

## 0. Scorecard

| | Wynik |
|--|--------|
| Testy | **35** (7 devices × 5 lightboxów) |
| **PASS** | **28** |
| **FAIL** | **7** (wyłącznie **L3 × X** na wszystkich device) |
| Fizyczny Safari | **OPEN / nie wykonano** |

---

## 1. Wyniki per urządzenie (Chromium emul)

| Device project | L1 | L2 | L3 | L4 | L5 | Uwagi |
|----------------|----|----|----|----|----|-------|
| **iPhone SE** | PASS | PASS | **FAIL (X)** | PASS | PASS | Escape L3 OK |
| **iPhone 12** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |
| **iPhone 14 Pro** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |
| **iPhone 15 Pro Max** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |
| **Pixel 7** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |
| **Pixel 8 (approx)** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |
| **Galaxy S23 (proxy)** | PASS | PASS | **FAIL (X)** | PASS | PASS | j.w. |

**L3 FAIL detail (identyczny na 7/7):** po Escape (PASS) → reopen → klik `aria-label=Zamknij` → overlay **pozostaje** (`count=1`, timeout 10s). Screenshot pokazuje lightbox nadal otwarty (chevrons / Pobierz / Udostępnij / X widoczne).

---

## 2. Wyniki per lightbox

| Lightbox | Open | X | Backdrop | Escape | Rapid / reopen | Stuck lock | Portal / markers | Werdykt emul |
|----------|------|---|----------|--------|----------------|------------|------------------|--------------|
| **L1** JobPhotoGallery | PASS | PASS | PASS | PASS | PASS ×10 + 2nd thumb | PASS | **portal→body**, `modal-overlay`+`modal-lightbox`, bez `modal-sheet`; coverage viewport PASS; `pointer-events` ≠ none; z-index ≥50 | **PASS** |
| **L2** JobPhotosGalleryView | PASS | PASS | PASS | PASS | PASS (×5) | PASS | in-tree + `modal-sheet` (MUX-B1); pe OK | **PASS** |
| **L3** InspectorPhotoGallery | PASS | **FAIL** | N/A (by design) | **PASS** | FAIL na ścieżce X | Escape czyści lock | in-tree + `modal-sheet`; pe OK przy open | **FAIL (X only)** |
| **L4** InspectorOverlays | PASS | PASS | PASS | PASS | PASS | PASS | in-tree + `modal-sheet` | **PASS** |
| **L5** InspectorJobPhotosGalleryView | PASS | PASS | PASS | PASS | PASS (×5) | PASS | in-tree + `modal-sheet` | **PASS** |

### L1 structural (audit evaluate) — PASS na wszystkich device

```text
parentIsBody: true          ← createPortal OK
hasOverlay / hasLightbox: true
hasSheet: false
position: fixed
pointer-events: not none
z-index ≥ 50
coversViewport: true
po close: 0 overlay w DOM + brak html.modal-scroll-locked
```

### L3 X — interpretacja (audit only, bez fix)

| Hipoteza | Komentarz |
|----------|-----------|
| Regresja MOBILE-LIGHTBOX-IOS-01 | **Mało prawdopodobna** — IOS-01 zmienia tylko L1; L3 nietknięty |
| Harness / click-through po unmount | Możliwe — Escape (keyboard) PASS, mouse X FAIL |
| Pre-existing L3 X w automacji | MUX-B1 harness L3 też zamykał głównie Escape, nie X |
| Produktowy bug X na L3 | **Nie wykluczony** — wymaga field / ręcznego tapu; **nie naprawiane** w tym audycie |

---

## 3. Console errors / React / hydration

| Typ | Wynik |
|-----|--------|
| `pageerror` (JS exceptions) | **Brak** (po filtrze) |
| React / hydration warnings | **Brak** |
| `console.error` | Surowy szum: **503** z `blockCloudSync` + okazjonalne **404** zasobów — **oczekiwane w e2e**, odfiltrowane w asercji audytu; **nie** traktowane jako regresja lightboxa |

---

## 4. Screenshoty / video przy FAIL

Wszystkie 7 FAIL = L3; artefakty Playwright (`screenshot` + `video` + `trace`):

| Device | Screenshot | Video |
|--------|------------|-------|
| iPhone SE | `test-results/lightbox-cross-platform-au-c6650-tuck-no-backdrop-by-design--cp-iphone-se/test-failed-1.png` | `…/video.webm` |
| iPhone 12 | `…--cp-iphone-12/…` | `…/video.webm` |
| iPhone 14 Pro | `…--cp-iphone-14-pro/…` | `…/video.webm` |
| iPhone 15 Pro Max | `…--cp-iphone-15-pro-max/…` | `…/video.webm` |
| Pixel 7 | `…--cp-pixel-7/…` | `…/video.webm` |
| Pixel 8 approx | `…--cp-pixel-8-approx/…` | `…/video.webm` |
| Galaxy S23 proxy | `…--cp-galaxy-s23-proxy/…` | `…/video.webm` |

Trace: `npx playwright show-trace test-results/<folder>/trace.zip`

---

## 5. Potencjalne ryzyka Safari / WebKit (**OPEN**)

| Ryzyko | Status |
|--------|--------|
| Fizyczny iPhone Safari — hit-test L1 po portalizacji | **OPEN** — nie testowane na urządzeniu |
| L2–L5 nadal **in-tree** w scroll-rootach | Residual WebKit hit-test (ten sam RCA co L1 przed portalem) |
| L3 bez backdrop + X FAIL w Chromium harness | Podwyższone ryzyko UX close na touch |
| Rubber-band / overscroll Safari | **Nie mierzalne** w Chromium |

**Nie twierdzimy PASS Safari.**

---

## 6. Android Chromium — przesłanki regresji?

| Pytanie | Odpowiedź |
|---------|-----------|
| L1 po portalizacji na Pixel 7 / Pixel 8-approx / Galaxy S23-proxy | **Brak przesłanek regresji** — L1 PASS (X, backdrop, Escape, ×10, portal, lock cleanup) |
| L2 / L4 / L5 | **PASS** na wszystkich Android projects |
| L3 X | FAIL także na Android emul — **nie wygląda na regresję IOS-01**; wygląda na L3-specific / harness |
| Ogólna regresja Android vs pre-IOS-01 | **Nie stwierdzono** dla L1 (cel fixa) |

---

## 7. Fizyczny iPhone Safari

```text
████████████████████████████████████████████████████
  FIZYCZNY iPhone Safari = NIE ZWERYFIKOWANY
  Status: OPEN
  Nie wolno zamykać MOBILE-LIGHTBOX-IOS-01 jako PASS Safari
  na podstawie tego raportu emulacji.
████████████████████████████████████████████████████
```

---

## 8. Werdykt audytu

| Gate | Werdykt |
|------|---------|
| L1 Chromium multi-device (cel IOS-01) | **PASS** |
| L2 / L4 / L5 Chromium | **PASS** |
| L3 Chromium (X) | **FAIL** (Escape OK) |
| Fizyczny iPhone Safari | **OPEN** |
| Regresja Android Chromium od IOS-01 | **Brak przesłanek** (L1) |
| Commit / push | **NIE wykonano** |

```text
Emulacja wspiera pewność L1 portal fix na Chromium.
Nie zastępuje field Safari.
L3 X FAIL = osobny wątek (nie blokuje twierdzenia „L1 emul OK”,
ale blokuje „wszystkie lightboxy 100% PASS”).
```

**Raport:** `docs/architecture/MOBILE-LIGHTBOX-IOS-01-CROSS-PLATFORM-AUDIT.md`
