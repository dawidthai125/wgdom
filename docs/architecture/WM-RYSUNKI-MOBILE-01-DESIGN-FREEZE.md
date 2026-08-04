# WM-RYSUNKI-MOBILE-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN** · AR → [`WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md) (**PASS WITH DF CORRECTIONS**)  
> **ID:** WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE  
> **EPIC:** WM-RYSUNKI-MOBILE-01 — Mobile usability (Rysunki / Odbiory WM)  
> **FAZA:** **DESIGN FREEZE**  
> **MODE:** DESIGN FREEZE ARCHIVE · DOCS ONLY · **NO IMPLEMENT** do Owner GO IMPLEMENT · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04 · **thin amend AR:** 2026-08-04 (D-M0-13…16)  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **COMPLETE** · AR **COMPLETE**  
> **Parent AUDIT:** [`WM-RYSUNKI-MOBILE-01-AUDIT.md`](./WM-RYSUNKI-MOBILE-01-AUDIT.md) (**AUDIT COMPLETE**)  
> **Architecture Review:** [`WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md)  
> **Parent EPIC tip:** WM-RYSUNKI-01 P0–P3B.1 **CLOSED** · UI **2.66.03** / **`77f18b78`** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Living SSOT:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md)  
> **Reuse:** OperationalNotes (44px) · Schematy (native back) · `modal-scroll-lock.ts` · `mobile.css` / `app-viewport.ts` · Ghost OUT export (P3B) · **`JobPhotoGallery` createPortal**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-MOBILE-01 DESIGN FREEZE — FROZEN
(+ AR thin amend D-M0-13…16)

CEL: użyteczna edycja Rysunków na telefonie
     (Safari iOS · Chrome Android · Samsung Internet)

SLICE RELEASE ORDER (wiążący):
  MOBILE-P0  →  MOBILE-P1  →  MOBILE-P2

MOBILE-P0 IN (FROZEN):
  fullscreen mobile editor = TAK (<md)
  createPortal(document.body) = WYMAGANE
  root = modal-overlay + modal-lightbox (NIE modal-sheet)
  height = var(--app-height, 100dvh)
  gesture · capture · pointercancel · touch-action
  nested scroll OFF · canvas working area · safe-area
  zoom/pan ephemeral + buttons ± + Reset

OUT (twarde):
  Cloud Sync · JSON schema · merge · PDF/ZIP semantics
  Ghost/P3B.1 logic · P4 · Payroll · AI · CORE

AR: PASS WITH DF CORRECTIONS
IMPLEMENT zakazany do: Owner GO IMPLEMENT (MOBILE-P0)
════════════════════════════════════════════════════════
```

---

## 0. Cel EPIC (zamrożony · 1 zdanie)

**WM-RYSUNKI-MOBILE-01** czyni edytor Rysunków **użytecznym na telefonie** (gesty, viewport, hit targets, input) — **bez** zmiany modelu JSON, syncu, PDF/ZIP, Ghost/P3B.1 ani Payroll/CORE.

### 0.1 Relacja dokumentów

| Dokument | Rola |
|----------|------|
| AUDIT | RCA · P0/P1/P2 · dowody kodu — **ACCEPTED jako wejście** |
| **Ten plik** | **SSOT decyzji** — wygrywa konflikty zakresu mobile |
| P3B / P3B.1 DF | Ghost · STOP wall · **NIE zmieniać** semantyki |
| P1B / AppSettings | flaga `wmRysunkiEnabled` — **REUSE**, bez zmiany default OFF |

**Konflikt:** ten plik wygrywa dla mobile UX. Semantyka wall/Ghost/PDF/ZIP = dokumenty WM-RYSUNKI-01.

### 0.2 Zasady FROZEN

| Zasada | Wiązanie |
|--------|----------|
| **SSOT FIRST** | Model rysunku = JSON `WmTechnicalDrawing` — **zero** schema bump |
| **REUSE FIRST** | `modal-scroll-lock` · OperationalNotes 44px · native back Schematy · `clientToSvgPoint` + CTM · Ghost OUT export pattern |
| **ZERO DUPLICATE** | Jeden gesture contract na powierzchni · jeden render edit vs export |
| **THIN SLICE** | Trzy releasy P0→P1→P2 · bez CAD · bez Cloud |

---

## 1. PAYROLL SAFETY GATE

```text
PAYROLL SAFETY GATE — WM-RYSUNKI-MOBILE-01

G1–G9: FEATURE thin · UI/gesture/viewport only
Cloud drawings / merge / DATA_KEY: ZERO
schemaVersion / normalize / types shape: ZERO
PDF/ZIP fingerprint / zip-entries semantics: ZERO
Ghost / P3B.1 finishLine STOP: ZERO zmian semantyki
Payroll / Hours-wipe / carry / Edge payroll: OUT
AI / CORE sync: OUT

Wynik: FEATURE mobile UX only
```

---

## 2. Scope IN / OUT (FROZEN)

### 2.1 IN — MOBILE-P0

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **D-M0-01** | **Fullscreen mobile editor** | **TAK** — na `<md` otwarcie rysunku = **fullscreen portal** (D-M0-13) nad WM (nie in-place w scrollu zakładki). Desktop `≥md` = layout AS-IS (in-place). |
| **D-M0-02** | Nested scroll | W trybie fullscreen editor: **WM content scroll ZABLOKOWANY** (`modal-scroll-lock` REUSE). SVG host **nie** jest `overflow-auto` scroll page — pan = app pan (D-M0-08). |
| **D-M0-03** | Gesture contract | Powierzchnia `.wm-drawing-surface`: gdy tool draw/select-drag/active preview — gesty należą do edytora. |
| **D-M0-04** | `touch-action` | Na `.wm-drawing-surface`: **`touch-action: none`** (draw/move/pan app). Lista rysunków poza surface — bez zmian. |
| **D-M0-05** | Pointer capture | Przy starcie drag / pan: **`setPointerCapture`**. |
| **D-M0-06** | `pointercancel` | Obsługa: anuluj lub commit spójnie z `pointerup` · **zakaz** silent drop stanu. |
| **D-M0-07** | `pointerleave` | **NIE** kończy drag gdy capture aktywny. Leave bez capture = jak dziś tylko dla hover cleanup. |
| **D-M0-08** | Canvas viewport / zoom/pan | **Bounded zoom + pan + Reset** (app-level). Clamp min/max. Ephemeral — patrz **D-M0-16**. **OUT:** free-CAD · browser-zoom jako SSOT. |
| **D-M0-09** | Canvas working area | Fullscreen: flex column — chrome (back+tools) sticky top · **canvas flex-1 min-h-0** zajmuje resztę viewportu · metadata compact / collapsible. |
| **D-M0-10** | Safe-area contract (P0) | Fullscreen overlay: `padding` z `env(safe-area-inset-top/bottom/left/right)` · bottom uwzględnia home indicator; **nie** koliduje z Dynamic Island. |
| **D-M0-11** | Breakpoint | Mobile shell fullscreen: **`< md` (768px)**. `≥md` = desktop path bez fullscreen wymogu. |
| **D-M0-12** | Browser pinch | Podczas aktywnej sesji draw: dążyć do braku konfliktu (touch-action + overlay). Regresja browser-zoom poza surface = OK. |
| **D-M0-13** | **Portal montaż** *(AR DFC-01)* | Fullscreen `<md`: **`createPortal(…, document.body)`** · **zakaz** `position:fixed` overlay wyłącznie w drzewie `WmPrintView` / `overflow-hidden` ancestors |
| **D-M0-14** | **Overlay classes** *(AR DFC-02)* | Root: **`modal-overlay` + `modal-lightbox`** · **zakaz** `modal-sheet` jako root FS (`max-height: 92dvh`) |
| **D-M0-15** | **Overlay height** *(AR DFC-03)* | **`height` / `max-height: var(--app-height, 100dvh)`** · REUSE `app-viewport.ts` · **zakaz** `100vh` jako SSOT |
| **D-M0-16** | **Zoom/pan state** *(AR DFC-04)* | Ephemeral React + CSS transform wrapper · **nie** JSON · buttons **±** + **Reset IN P0** · pinch 2-finger opcjonalny |

### 2.2 IN — MOBILE-P1

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **D-M1-01** | Touch hitboxes | Invisible hit geometry **edit-only** (`data-hit` / stroke szeroki transparent) dla wall · dimension · arrow · door/window/stamps. |
| **D-M1-02** | Edit vs export SVG | Hit overlays **TYLKO** `mode: "edit"`. Export PDF/ZIP = `mode: "export"` **bez** hit (jak Ghost OUT). |
| **D-M1-03** | Min touch target UI | Controles chrome ≥ **44×44 CSS px** (`touch-target` / `min-h-[44px]`) — Lista · Final · Duplikuj · Usuń · tool buttons · selection actions. |
| **D-M1-04** | Toolbar mobile | Mobile: większe cele · czytelne `title`/`aria-label` · dopuszczalny horizontal scroll toolbar **ALBO** 2-row wrap — **bez** ucinania narzędzi. |
| **D-M1-05** | Selection toolbar | Te same reguły 44px · Usuń/Duplikuj/Obrót reachability. |
| **D-M1-06** | `window.prompt` OUT | Wymiar „Długość” + Tekst → **inline field lub thin modal** w edytorze. **Zakaz** `window.prompt` w ścieżce Rysunki. |
| **D-M1-07** | Create menu | Mobile: menu tworzenia **nie ucięte** · outside-click/close · safe-area · prefer bottom-sheet/anchored w viewport (nie goły `absolute` poza ekran). |

### 2.3 IN — MOBILE-P2

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **D-M2-01** | Landscape polish | Landscape: kompaktowy chrome · max canvas · toolbar nie zjada &gt; ~40% wysokości. |
| **D-M2-02** | Orientation UX | Rotate portrait↔landscape: zachowaj drawing + tool + selection; reset tylko ephemeral preview jeśli konieczne; zoom clamp po resize. |
| **D-M2-03** | Local safe-area polish | Lista + non-fullscreen ścieżki: lokalny inset bottom/top gdzie shell nie wystarcza. |
| **D-M2-04** | History / back | Mobile fullscreen: **browser `history.pushState` + popstate** zamyka editor (jak Jobs MV-2 pattern) **OR** równoważny kontrakt + Capacitor native back (już jest). Minimum: back UI + native + (P2) history. |
| **D-M2-05** | PDF preview mobile | Preview/print iframe/fixed: safe-area · nie pod bottom nav · zamknięcie ≥44px. |
| **D-M2-06** | Z-index | Kontrakt: fullscreen editor `z-[50]` (align modal) · create sheet ≤ editor · &lt; global critical overlays payroll jeśli open. |
| **D-M2-07** | Hover cleanup | Door wall highlight: na touch — feedback po **pointerdown/move** (już częściowo); usunąć zależność od CSS `:hover` jako jedynego affordance krytycznych CTA. |
| **D-M2-08** | Cancel preview UI | Przycisk / gesture cancel mid-draw (Esc zostaje na desktop) — thin control „Anuluj” gdy `lineStart`. |

### 2.4 OUT (twarde · wszystkie slice)

| OUT | Powód |
|-----|-------|
| Cloud Sync / `cloud-sync.ts` merge drawings | Stabilization · zero sync risk |
| JSON `schemaVersion` / shape / normalize | Model frozen |
| PDF/ZIP **semantics** / fingerprint / folder rules | P2/P3 CLOSED |
| Ghost / P3B.1 wall STOP / continuous semantics | CLOSED · nie amend |
| P4 punkty | Osobny epic |
| Payroll / AI / CORE Edge | Zakaz |
| CAD / DXF / multi-select / layers | Poza EPIC |
| Zmiana default `wmRysunkiEnabled` | P1B — bez zmiany policy |
| Global rewrite `admin-app-shell` / `app-viewport.ts` | Foundation OK — tylko thin CSS helper |

---

## 3. Boundary (FROZEN)

```text
┌─────────────────────────────────────────────────────┐
│ Admin shell (dvh / visualViewport)     OUT change   │
│  └─ bottom nav + safe-area             REUSE        │
│     └─ WmPrintView list scroll         P0: lock when│
│        fullscreen editor open                       │
│        └─ WmPrintDrawingsPanel                      │
│           ├─ LIST  (<md)                 P1 create  │
│           └─ (state selected) ──────────┐           │
└─────────────────────────────────────────│───────────┘
                                          ▼
              createPortal → document.body (P0)
              root: modal-overlay + modal-lightbox
              height: var(--app-height, 100dvh)
              ├─ chrome (back/tools/zoom ±)   P0/P1
              ├─ .wm-drawing-surface         P0
              │    transform zoom/pan ephemeral
              │    hitboxes edit-only        P1
              └─ inline input                P1

DATA: kw-wm-technical-drawings  — READ/WRITE jak dziś · ZERO merge change
RENDER export PDF/ZIP           — bez hit overlays
RENDER edit                     — + hit (P1)
GHOST / wall STOP               — bez zmian semantyki
```

| Granica | Reguła |
|---------|--------|
| Desktop `≥md` | Regresja zera: P3B.1 + PDF/ZIP; **bez** portalu |
| Mobile `<md` | Fullscreen **portal** obowiązkowy w P0 |
| Edit SVG | Może mieć hit / transform UI |
| Export SVG | Identyczny kontrakt wizualny co tip (bez hit, bez Ghost) |

---

## 4. Risks (FROZEN awareness)

| ID | Ryzyko | Mitygacja DF |
|----|--------|--------------|
| **R-01** | Hit overlays w PDF/ZIP | `renderDrawingSvg({ mode })` · test: export HTML bez `data-hit` |
| **R-02** | `touch-action: none` blokuje listę | Scope **tylko** surface + fullscreen |
| **R-03** | Transform zoom psuje CTM | REUSE `getScreenCTM()` · transform na wrapper spójny z SVG |
| **R-04** | Fullscreen vs bottom nav / Safari fixed | **createPortal(body)** + `fixed inset-0 z-50` + `modal-overlay` + safe-area · nav pod spodem niewidoczny |
| **R-05** | Scope creep CAD pinch | Zoom = **buttons ±** + opcjonalnie 2-finger **tylko pan/zoom bounded** · bez precision CAD |
| **R-06** | iOS rubber-band nested | `modal-scroll-lock` + `overscroll-behavior: none` na overlay |
| **R-07** | Prompt→modal klawiatura viewport | REUSE visualViewport / keyboard-inset patterns z `mobile.css` modals |
| **R-08** | Regresja Ghost/P3B.1 | Smoke wall 2-tap STOP · zero change `clearWallPreview` contract |
| **R-09** | Trzy slice w jednym PR | **Zakaz** — Release Plan §7 |

---

## 5. Acceptance Criteria (FROZEN)

### 5.1 MOBILE-P0

| AC | Kryterium |
|----|-----------|
| **AC-M0-01** | `<md`: otwarcie rysunku = fullscreen overlay; WM lista nie scrolluje pod spodem |
| **AC-M0-02** | Drag obiektu / rysowanie **nie** scrolluje tła WM |
| **AC-M0-03** | `setPointerCapture` aktywne w drag; `pointerleave` **nie** urywa drag |
| **AC-M0-04** | `pointercancel` nie zostawia stale `lineStart`/drag |
| **AC-M0-05** | Canvas working area = majority viewport (chrome nie dominuje portrait Pro Max) |
| **AC-M0-06** | Zoom in/out + pan + Reset; A4 landscape użyteczny na ~430 CSS px |
| **AC-M0-07** | Safe-area: treść/chrome nie pod Dynamic Island / home indicator |
| **AC-M0-08** | Safari iOS + Chrome Android + Samsung Internet: AC-M0-01…07 PASS |
| **AC-M0-09** | Desktop `≥md`: regresja wall Ghost + P3B.1 STOP PASS |

### 5.2 MOBILE-P1

| AC | Kryterium |
|----|-----------|
| **AC-M1-01** | Selekcja ściany/wymiaru/strzałki palcem możliwa (edit hit) |
| **AC-M1-02** | PDF/ZIP/export **bez** widocznych hit overlays |
| **AC-M1-03** | Tool / Lista / Final / selection actions ≥ 44×44 |
| **AC-M1-04** | Zero `window.prompt` w flow wymiar/tekst |
| **AC-M1-05** | Create menu w pełni w viewport + zamknięcie outside/back |
| **AC-M1-06** | Desktop tool flow PASS (P3A wymiar/tekst nowym UI) |

### 5.3 MOBILE-P2

| AC | Kryterium |
|----|-----------|
| **AC-M2-01** | Landscape: canvas usable (chrome kompakt) |
| **AC-M2-02** | Rotate: stan rysunku zachowany · zoom clamped |
| **AC-M2-03** | history.back / native back zamyka fullscreen editor |
| **AC-M2-04** | PDF preview nie nachodzi na unsafe areas; close reachable |
| **AC-M2-05** | z-index create &lt; editor fullscreen; editor ≥ modal baseline |
| **AC-M2-06** | Mid-draw cancel dostępny bez klawiatury Esc |

---

## 6. File Allowlist (FROZEN)

### 6.1 IN — wszystkie slice (rdzeń)

| Plik | P0 | P1 | P2 |
|------|----|----|-----|
| `src/app/WmPrintDrawingEditor.tsx` | ● | ● | ● |
| `src/app/WmPrintDrawingsPanel.tsx` | ● | ● | ● |
| `src/styles/mobile.css` | ● | ○ | ● |

### 6.2 IN — warunkowe / slice

| Plik | Slice | Rola |
|------|-------|------|
| `src/lib/modal-scroll-lock.ts` | P0 | REUSE `useModalScrollLock` · root musi mieć `.modal-overlay` · change allowlist tylko awaryjnie |
| `src/app/WmPrintView.tsx` | P0 | Minimal: tylko jeśli sygnał open — prefer lock w panelu |
| `react-dom` `createPortal` | P0 | Montaż FS · wzorzec REUSE `JobPhotoGallery.tsx` (reference only, nie edytować) |
| `src/lib/wm-technical-drawings/render-svg.ts` | P1 | `mode: edit\|export` + hit overlays |
| `src/lib/wm-technical-drawings/symbols/render-symbol.ts` | P1 | hit padding |
| `src/lib/wm-technical-drawings/symbols/index.ts` | P1 | tylko jeśli hit defs |
| `src/lib/wm-technical-drawings/export-pdf.ts` | P1 | **tylko** jeśli trzeba wymusić `mode:"export"` (thin wire) |
| Tests `scripts/test-wm-rysunki-mobile-*.mjs` | P0–P2 | nowe · thin |

### 6.3 OUT — zakaz

| Plik / obszar |
|---------------|
| `src/lib/cloud-sync.ts` · Edge `index.tsx` · `merge.ts` drawings merge |
| `types.ts` schema bump · `normalize.ts` breaking |
| `wall-preview.ts` semantyka Ghost |
| `zip-entries.ts` kontrakt folderów |
| `PayrollView.tsx` · AI libs · `app-viewport.ts` rewrite |
| Niepowiązany WIP w working tree |

**Changelog:** bump UI **tylko** w slice z Owner GO COMMIT (konwencja repo).

---

## 7. Release Plan (FROZEN)

| Krok | Slice | Warunek startu | Deliverable |
|------|-------|----------------|-------------|
| 1 | — | Ten DF FROZEN + AR PASS | Owner **GO IMPLEMENT P0** |
| 2 | **MOBILE-P0** | Owner **GO IMPLEMENT P0** | Portal FS · gestures · capture · viewport · zoom/pan · safe-area |
| 3 | | build + test plan P0 PASS | Owner **OV** → COMMIT → PUSH → **PV** → CLOSE P0 |
| 4 | **MOBILE-P1** | P0 **CLOSED** + Owner **GO IMPLEMENT P1** | Hitboxes · 44px · prompt · create menu |
| 5 | | OV → COMMIT → PUSH → PV → CLOSE P1 |
| 6 | **MOBILE-P2** | P1 **CLOSED** + Owner **GO IMPLEMENT P2** | Landscape · back/history · PDF · z-index · hover |
| 7 | | OV → COMMIT → PUSH → PV → CLOSE P2 → **EPIC CLOSE** |

```text
ZAKAZ:
  · implement bez Owner GO IMPLEMENT (per slice)
  · łączenie P0+P1+P2 w jednym release bez Owner exception
  · commit/push bez Owner GO
```

**Tryb release:** oczekiwany **FAST RELEASE** per slice (&lt;15 plików, jeden bundle) — potwierdzić w raporcie release.

---

## 8. Test Plan (FROZEN)

### 8.1 Automat / smoke (repo)

| Test | Slice | Cel |
|------|-------|-----|
| Istniejące `test-wm-rysunki-01-p3b1.mjs` (+ P3A/P2) | P0+ | Regresja Ghost/STOP/PDF path |
| Nowy `test-wm-rysunki-mobile-p0.mjs` | P0 | Klasy surface · brak leave-commit przy capture (unit/logic) · zoom clamp |
| Nowy `test-wm-rysunki-mobile-p1.mjs` | P1 | edit SVG zawiera hit · export SVG **nie** · brak `window.prompt` w źródle editor |
| `npm run build` | każdy | PASS |

### 8.2 Desktop (regresja · każdy slice)

| # | Scenario | Expect |
|---|----------|--------|
| D1 | Wall 2-click + Ghost + P3B.1 STOP | PASS |
| D2 | Drag obiektu myszą | PASS |
| D3 | Wymiar ze ściany + tekst (po P1: nowy UI) | PASS |
| D4 | PDF Podgląd / Pobierz | PASS · bez hit artifacts |
| D5 | ZIP checkbox rysunki (jeśli flaga ON) | PASS visual |

### 8.3 Safari iOS (iPhone 17 Pro Max · portrait + landscape)

| # | Scenario | Slice | Expect |
|---|----------|-------|--------|
| S1 | Open drawing → fullscreen | P0 | Overlay · no background scroll |
| S2 | Draw wall 2-tap | P0 | No page scroll · Ghost OK · STOP |
| S3 | Drag object across surface | P0 | Capture holds · no abort on finger leave host briefly |
| S4 | Zoom ± · pan · Reset | P0 | A4 usable |
| S5 | Safe-area / Dynamic Island / home | P0 | No clipped chrome |
| S6 | Select thin wall/dimension | P1 | Reliable hit |
| S7 | Toolbar targets | P1 | ≥44px feel |
| S8 | Dimension + text input | P1 | No native prompt |
| S9 | Create drawing menu | P1 | Fully visible / closable |
| S10 | Landscape edit | P2 | Canvas majority |
| S11 | Rotate orientation mid-edit | P2 | State kept |
| S12 | Browser back / close | P2 | Exits editor |
| S13 | PDF preview | P2 | Usable + close |

### 8.4 Chrome Android

| # | Scenario | Expect |
|---|----------|--------|
| A1–A5 | Jak S1–S5 (P0) | PASS |
| A6–A9 | Jak S6–S9 (P1) | PASS |
| A10–A13 | Jak S10–S13 (P2) | PASS |
| A14 | System gesture bar / nav | No dead zone on primary CTA |

### 8.5 Samsung Internet

| # | Scenario | Expect |
|---|----------|--------|
| K1–K5 | P0 parity S1–S5 | PASS |
| K6 | Reader/toolbar chrome interference | Draw surface still captures |
| K7–K9 | P1 parity | PASS |
| K10–K12 | P2 parity (back/PDF) | PASS |

### 8.6 Device verify gaps (świadome)

Safari overflow legacy residual · exact pinch conflict · keyboard inset po modal — **PV obowiązkowy** na real device; emulator ≠ PASS final.

---

## 9. Mapping AUDIT → DF

| AUDIT ID | DF |
|----------|-----|
| M-P0-01 scroll↔draw | D-M0-02…07 |
| M-P0-02 zoom/pan | D-M0-08 · **D-M0-16** |
| M-P0-03 viewport | D-M0-01 · D-M0-09 · D-M0-10 · **D-M0-13…15** |
| M-P1-01 hitbox | D-M1-01 · D-M1-02 |
| M-P1-02…04 44px | D-M1-03…05 |
| M-P1-05 prompt | D-M1-06 |
| M-P1-06 capture | D-M0-05…07 |
| M-P1-07 create menu | D-M1-07 |
| M-P2-* | D-M2-01…08 |

---

## 10. Werdykt DESIGN FREEZE

| Pole | Wartość |
|------|---------|
| **DF** | **FROZEN** (+ AR thin amend D-M0-13…16) |
| **Fullscreen mobile editor** | **ACCEPTED (TAK)** · `<md` · **`createPortal(document.body)`** |
| **AR** | **PASS WITH DF CORRECTIONS** · [`ARCHITECTURE-REVIEW`](./WM-RYSUNKI-MOBILE-01-ARCHITECTURE-REVIEW.md) |
| **IMPLEMENT** | **NIE** — czekaj Owner GO IMPLEMENT (**MOBILE-P0**) |
| **COMMIT / PUSH** | **NIE** |
| **NEXT** | **Owner GO → IMPLEMENT (MOBILE-P0)** |

```text
DESIGN FREEZE COMPLETE · FROZEN · AR PASS (thin amend applied)
WAITING FOR OWNER GO → IMPLEMENT (MOBILE-P0)
```

---

## 11. Historia

| Data | Event |
|------|-------|
| 2026-08-04 | AUDIT COMPLETE |
| 2026-08-04 | Owner GO DESIGN FREEZE · **FROZEN** · docs only |
| 2026-08-04 | AR PASS WITH DF CORRECTIONS · amend **D-M0-13…16** (portal · classes · app-height · zoom state) |
