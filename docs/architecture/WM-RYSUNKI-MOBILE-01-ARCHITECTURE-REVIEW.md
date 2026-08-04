# WM-RYSUNKI-MOBILE-01 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-MOBILE-01 — Mobile usability (Rysunki)  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH DF CORRECTIONS** *(≡ CHANGE REQUIRED → thin amend DF · potem READY)*  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-MOBILE-01-AUDIT.md`](./WM-RYSUNKI-MOBILE-01-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md) (**FROZEN** + thin amend z tego AR)  
> **Baseline tip:** UI **2.66.03** / **`77f18b78`** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Kod read-only:** `WmPrintDrawingEditor.tsx` · `WmPrintDrawingsPanel.tsx` · `WmPrintView.tsx` · `AdminViewRouter.tsx` · `modal-scroll-lock.ts` · `app-viewport.ts` · `mobile.css` · `JobPhotoGallery.tsx` (portal pattern) · `wall-preview.ts` / `export-pdf.ts` / `zip-entries.ts` (blast)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-MOBILE-01 — ARCHITECTURE REVIEW

WERDYKT: PASS WITH DF CORRECTIONS
         (CHANGE REQUIRED → thin DF amend · brak blokerów domenowych)

Blokery domenowe (Cloud/JSON/PDF/ZIP/Ghost/P3B.1): BRAK
Blokery arch. mobile (Safari fixed/overflow):
  → createPortal(document.body) = WYMAGANE (nie opcjonalne)
  → root: modal-overlay + modal-lightbox (NIE modal-sheet)
  → height: var(--app-height, 100dvh)
  → useModalScrollLock + klasy lock-compatible

Po thin amend DF → READY FOR Owner GO IMPLEMENT MOBILE-P0
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF MOBILE-P0 ↔ AUDIT ↔ living shell / lock / viewport / editor (read-only) |
| Kryterium **FAIL** | Cloud/schema/PDF-ZIP semantics/Ghost P3B.1 muszą się zmienić · brak realnej ścieżki Safari |
| Kryterium **CHANGE REQUIRED** | DF nie domyka krytycznej decyzji montażu (portal/klasy/viewport) |
| Kryterium **PASS** | brak blokerów + DF kompletny bez korekt |
| **PASS WITH DF CORRECTIONS** | brak blokerów domenowych + **obowiązkowy thin amend DF** przed IMPLEMENT |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura MOBILE-P0 jest wykonalna thin? | **TAK** |
| Czy są blokery Cloud/JSON/PDF/ZIP/Ghost? | **NIE** |
| Czy fullscreen w drzewie WM (bez portalu) jest bezpieczny na Safari? | **NIE** — ryzyko `fixed` w `overflow-hidden` ancestors |
| Czy `createPortal(document.body)`? | **TAK — FROZEN wymagane** |
| Czy DF wymaga korekt przed IMPLEMENT? | **TAK** — thin (§6) |
| Czy wolno IMPLEMENT po amend + Owner GO? | **TAK** |

**WERDYKT: PASS WITH DF CORRECTIONS** (= Owner checklist: **CHANGE REQUIRED** na DF, potem **GO IMPLEMENT MOBILE-P0**)

---

## 2. Checklist weryfikacji Owner (1–15)

| # | Temat | Werdykt | Uzasadnienie |
|---|-------|---------|--------------|
| **1** | Fullscreen mobile editor | **PASS** (+ korekta montażu) | D-M0-01 TAK `<md` · chrome sticky + canvas `flex-1 min-h-0` · AS-IS in-place w scrollu = niewystarczające (AUDIT M-P0-03) |
| **2** | `createPortal(document.body)` | **CHANGE → FROZEN TAK** | Admin content: `overflow-hidden` (`AdminViewRouter` ~478) + WM `overflow-y-auto` · Safari/`fixed` w containing block = klasyczny fail · **REUSE** `JobPhotoGallery` portal → `document.body` |
| **3** | Gesture contract | **PASS** | `.wm-drawing-surface` owns gestures · lista poza surface · DF D-M0-03 |
| **4** | Pointer Capture | **PASS** | `setPointerCapture` na drag/pan · D-M0-05 · nie zmienia Ghost |
| **5** | PointerCancel | **PASS** | jawny handler · zakaz silent drop · D-M0-06 |
| **6** | `touch-action` | **PASS** | `touch-action: none` na surface · D-M0-04 · scope nie na listę |
| **7** | Zoom/Pan bounded | **PASS** (+ uszczegółowienie) | Ephemeral React state + CSS transform wrapper · **nie** JSON · clamp · Reset · przyciski ± wymagane P0 · pinch 2-finger opcjonalny (R-05) · `getScreenCTM` REUSE |
| **8** | Safe Area | **PASS** | `env(safe-area-inset-*)` na overlay · D-M0-10 · wzorzec JobPhotoGallery / WorkerPhotoView |
| **9** | visualViewport | **PASS** (+ korekta height) | REUSE `--app-height` z `app-viewport.ts` · overlay `height: var(--app-height, 100dvh)` · **zakaz** gołego `100vh` |
| **10** | Modal Scroll Lock | **PASS** (+ korekta klas) | `useModalScrollLock(open)` REUSE · root **musi** mieć `.modal-overlay` (guard `isScrollableModalSurface`) · **zakaz** samego `.modal-sheet` (cap `max-height: 92dvh` w `mobile.css`) · prefer `modal-overlay` + `modal-lightbox` |
| **11** | Brak regresji desktop | **PASS** | Portal/fullscreen **tylko** `<md` · `≥md` in-place AS-IS · AC-M0-09 |
| **12** | Brak regresji Ghost/P3B.1 | **PASS** | P0 = shell/gestures/viewport wokół editora · **zakaz** zmiany `finishLine` SUCCESS → `clearWallPreview` / sticky wall · smoke P3B.1 |
| **13** | Brak wpływu PDF/ZIP | **PASS** | P0 **nie** dotyka `render-svg` hit mode · export path bez zmian · P1 dopiero edit/export split |
| **14** | Brak wpływu Cloud | **PASS** | Allowlist OUT `cloud-sync` / merge · ten sam `onChange`/`onAutosave` |
| **15** | Brak wpływu JSON schema | **PASS** | Zoom/pan/gesture = ephemeral UI state · zero `schemaVersion` / normalize |

---

## 3. Fullscreen architecture (TARGET · MOBILE-P0)

```text
<root document.body>   ← createPortal
  div.fixed.inset-0.z-50.modal-overlay.modal-lightbox
     style/height: var(--app-height, 100dvh)
     padding: env(safe-area-inset-*)
     useModalScrollLock(true)
     overscroll-behavior: none
     │
     ├─ chrome (back · title compact · tools · zoom ± Reset)
     ├─ .wm-drawing-surface (flex-1 min-h-0, touch-action: none)
     │     └─ transform wrapper (scale + translate)  ← ephemeral
     │           └─ SVG markup (SSOT JSON unchanged)
     └─ optional compact meta / hint
```

| Reguła | Binding |
|--------|---------|
| Montaż | **`createPortal(…, document.body)`** wyłącznie path `<md` + drawing selected |
| Poza portalem | Lista rysunków zostaje w `WmPrintDrawingsPanel` (pod spodem, zablokowany scroll) |
| Desktop | **Bez** portalu · existing in-place tree |
| Z-index | `z-50` (+ `modal-overlay`) · align DF D-M2-06 early |
| Back | UI „Lista” zamyka portal · Capacitor native back (już) · history = P2 |

### 3.1 Dlaczego portal (Safari)

| Fakt | Skutek |
|------|--------|
| `AdminViewRouter` wrapper `overflow-hidden` | `position: fixed` child może być **clip/containing-block** zależnie od bundla CSS ancestors |
| WM `overflow-y-auto` + nested editor | Nested scroll = AUDIT RCA-02 |
| Pattern prod | `JobPhotoGallery` · LoginTheme · Music — **portal + modal-overlay** |

**Wniosek AR:** fullscreen **bez** portalu = **odrzut** dla MOBILE-P0.

### 3.2 Dlaczego nie `modal-sheet`

`mobile.css` `@media max-width 767px`: `.modal-sheet { max-height: 92dvh }` — psuje fullscreen working area (D-M0-09).  
Użyj **`modal-lightbox`** (`max-height: none`) + **`modal-overlay`** (lock allowlist + reconcile).

---

## 4. Gesture / pointer / zoom (BINDING IMPLEMENT)

| Temat | Binding |
|-------|---------|
| Surface | Klasa `.wm-drawing-surface` + `touch-action: none` |
| Drag obiektu | `pointerdown` → `setPointerCapture` → move → up/cancel |
| `pointerleave` | **Nie** commit/end drag gdy capture aktywny (naprawa AS-IS) |
| `pointercancel` | Clear drag **lub** commit jak up — jedna ścieżka; clear Ghost preview tylko wg istniejącego Esc/clear API — **bez** zmiany P3B.1 post-success |
| Pan | Jedno-palcowy pan **gdy** tool=select **i** brak hit drag **albo** osobny tryb/przestrzeń pustego tła — IMPLEMENT wybiera thin: **pan na empty hit / dedicated pan**, zoom buttons zawsze |
| Zoom | `scale` clamp np. **0.4…3** (wartości finalne w IMPLEMENT, bounded) · Reset → identity |
| CTM | `clientToSvgPoint` bez duplikacji matematyki — transform na wrapper HTML wokół SVG |
| 2-finger pinch | **Opcjonalny** w P0 · nie blocker AC jeśli buttons ± działają |

---

## 5. Blast radius (OUT potwierdzone)

| Obszar | Wpływ P0 | Dowód |
|--------|----------|-------|
| Ghost / `wall-preview.ts` | **ZERO** semantyki | Preview nadal z `lineStart`+`previewEnd` |
| P3B.1 STOP | **ZERO** | `finishLine` wall success → `clearWallPreview` zostaje |
| PDF `export-pdf.ts` | **ZERO** | P0 nie zmienia renderer export |
| ZIP `zip-entries.ts` | **ZERO** | |
| Cloud / merge | **ZERO** | Allowlist |
| JSON / types | **ZERO** | Zoom poza modelem |
| `app-viewport.ts` | **ZERO rewrite** | tylko **czytaj** `--app-height` |
| `modal-scroll-lock.ts` | **REUSE API** · zmiana allowlist **tylko jeśli** nowa klasa bez `modal-overlay` — **prefer uniknąć** (użyj `modal-overlay`) |

---

## 6. Korekty DF (OBOWIĄZKOWE · thin)

| ID | Korekta | Treść FROZEN do dopisania w DF |
|----|---------|--------------------------------|
| **DFC-01** | **D-M0-13** | Fullscreen `<md`: montaż **`createPortal(…, document.body)`** · **zakaz** `fixed` overlay wyłącznie wewnątrz `WmPrintView` scroll tree |
| **DFC-02** | **D-M0-14** | Root overlay classes: **`modal-overlay` + `modal-lightbox`** · **zakaz** `modal-sheet` jako root fullscreen (92dvh) |
| **DFC-03** | **D-M0-15** | Overlay size: **`height/max-height: var(--app-height, 100dvh)`** · REUSE `app-viewport` · **zakaz** `100vh` jako SSOT |
| **DFC-04** | **D-M0-16** | Zoom/pan: **ephemeral UI state** (React) + CSS transform wrapper · **nie** zapis do JSON · buttons ± + Reset **IN P0** |
| **DFC-05** | Allowlist | Jawnie IN: `createPortal` z `react-dom` w panel/editor · REUSE wzorzec `JobPhotoGallery.tsx` (reference only) |

**Amend DF:** wykonany wraz z tym AR (patrz historia DF) · bez zmiany OUT / P1 / P2 scope.

---

## 7. Minor recommendations (nie blokują · IMPLEMENT)

| ID | Rekomendacja |
|----|--------------|
| **MR-M-01** | `matchMedia('(max-width: 767px)')` live: resize desktop↔mobile mid-session — zamknij portal / przełącz path bez duplikacji editor state |
| **MR-M-02** | `data-testid="wm-drawing-fs"` na overlay pod PV |
| **MR-M-03** | Zoom clamp stałe w jednym helperze (`drawing-viewport.ts` thin) — tylko jeśli redukuje duplikację; inaczej lokalnie w editorze |
| **MR-M-04** | Nie dodawać `history.pushState` w P0 (zostaje P2) — uniknąć scope creep |
| **MR-M-05** | Regresja: uruchom `test-wm-rysunki-01-p3b1.mjs` w każdym P0 report |

---

## 8. File allowlist P0 (potwierdzony)

| Plik | Rola P0 |
|------|---------|
| `WmPrintDrawingsPanel.tsx` | Portal host · open/close · lock · back |
| `WmPrintDrawingEditor.tsx` | Surface · capture · cancel · zoom/pan UI · leave fix |
| `mobile.css` | `.wm-drawing-surface` · opcjonalnie helper FS |
| `modal-scroll-lock.ts` | **call only** (prefer) |
| `WmPrintView.tsx` | tylko jeśli sygnał open editor do lock — **minimal** |
| Tests `scripts/test-wm-rysunki-mobile-p0.mjs` | nowy |

**OUT P0:** `render-svg.ts` hit · `export-pdf` · `cloud-sync` · `types` · `wall-preview` semantyka.

---

## 9. Finalna rekomendacja przed IMPLEMENT

```text
1. DF thin amend DFC-01…05 = ZASTOSOWANY (ten cykl docs)
2. Architektura MOBILE-P0 = GO
3. Start IMPLEMENT dopiero po: Owner GO IMPLEMENT (MOBILE-P0)
4. Pierwszy commit bundle = tylko allowlist P0
5. PV obowiązkowy: Safari iOS (Pro Max) · Chrome Android · Samsung Internet
6. Desktop smoke: Ghost + P3B.1 STOP + PDF preview
```

| Pole | Wartość |
|------|---------|
| **AR** | **COMPLETE** |
| **Werdykt** | **PASS WITH DF CORRECTIONS** |
| **CHANGE REQUIRED** | **TAK** (thin DF) → **DONE w docs** |
| **IMPLEMENT** | **NIE** — czekaj Owner GO |
| **COMMIT / PUSH** | **NIE** |
| **NEXT** | **Owner GO → IMPLEMENT (MOBILE-P0)** |

```text
ARCHITECTURE REVIEW COMPLETE
WAITING FOR OWNER GO → IMPLEMENT (MOBILE-P0)
```

---

## 10. Historia

| Data | Event |
|------|-------|
| 2026-08-04 | Owner GO ARCHITECTURE REVIEW · COMPLETE · PASS WITH DF CORRECTIONS |
