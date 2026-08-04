# WM-RYSUNKI-MOBILE-01 — AUDIT

> **ID:** WM-RYSUNKI-MOBILE-01-AUDIT  
> **EPIC:** WM-RYSUNKI-MOBILE-01 — Mobile usability (Rysunki / Odbiory WM)  
> **FAZA:** **AUDIT**  
> **STATUS:** **AUDIT COMPLETE** · **ACCEPTED** · DF → [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md) (**FROZEN**)  
> **MODE:** AUDIT ARCHIVE · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO AUDIT** (EPIC WM-RYSUNKI-MOBILE-01)  
> **Baseline prod tip:** UI **2.66.03** / **`77f18b78`** · WM-RYSUNKI-01 P0–P3B.1 **CLOSED** · [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Parent EPIC:** WM-RYSUNKI-01 (**CORE COMPLETE**) — desktop-first; mobile **nie** był IN w P0–P3B.1  
> **Living SSOT:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md)  
> **Reuse wzorców:** OperationalNotes (44px drill-in) · Schematy (native back) · `modal-scroll-lock` · `mobile.css` / `app-viewport.ts`  
> **DF:** [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-MOBILE-01 AUDIT

CEL: pełny audyt Rysunki pod Safari iOS / Chrome Android /
     Samsung Internet — viewport · safe-area · touch · SVG

STATUS: AUDIT COMPLETE · ACCEPTED
DF: FROZEN → WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md
NEXT: Owner GO → IMPLEMENT (MOBILE-P0) · lub ARCH REVIEW

SSOT FIRST · REUSE FIRST · ZERO DUPLICATE · THIN SLICE
════════════════════════════════════════════════════════
```

---

## 0. Cel AUDIT

| Pytanie | Odpowiedź |
|---------|-----------|
| Co audytujemy? | Zakładka **Odbiory WM → Rysunki** · lista + edytor SVG |
| Cel produktowy | Możliwość **użytecznej** edycji szkicu na telefonie (iPhone 17 Pro Max / Android) bez konfliktu scroll↔draw |
| Czego nie budujemy w tym EPICu? | CAD · pinch-CAD · Cloud merge · schema 2 · P4 punkty · nowy PDF/ZIP builder |
| OUT tej fazy | IMPLEMENT · DF freeze (osobny GO) · commit/push |

---

## 1. Baseline / zakres urządzeń

| Pole | Wartość |
|------|---------|
| **Prod tip** | **2.66.03** / **`77f18b78`** |
| **Branch** | `main` |
| **Flaga** | `AppSettings.wmRysunkiEnabled` default **OFF** (P1B) |
| **Target browsers** | Safari iOS (iPhone 17 Pro Max) · Chrome Android · Samsung Internet |
| **Orientacje** | portrait + landscape |
| **Metoda AUDIT** | **code evidence** + **inferred device risk** · device PV = po IMPLEMENT |

**Uwaga:** Ten AUDIT jest **statyczny** (repo). Zachowanie Safari overflow+pointer na SVG wymaga **device verify** po DF/IMPLEMENT — lista luk w §9.

---

## 2. Architektura powierzchni (AS-IS)

```text
AdminViewRouter
  └─ pb-[calc(3.5rem+env(safe-area-inset-bottom))]  (mobile nav)
     └─ WmPrintView
          └─ content: flex-1 min-h-0 overflow-y-auto p-4
               └─ tab rysunki → WmPrintDrawingsPanel
                    ├─ LISTA (create menu absolute z-20)
                    └─ DETAIL (in-place, NIE modal)
                         ├─ back „Lista” + Final/Duplikuj/Usuń
                         └─ WmPrintDrawingEditor
                              ├─ title
                              ├─ toolbar (flex-wrap, ikony 14px)
                              ├─ selection toolbar
                              ├─ SVG host: overflow-auto + pointer*
                              └─ metadata
```

| Fakt | Dowód |
|------|-------|
| Edytor = **in-place drill-in**, nie fullscreen modal | `WmPrintDrawingsPanel.tsx` ~190–244 |
| Native Capacitor back zamyka detal | `registerNativeBackHandler` ~91–97 |
| SVG = stałe px A4 landscape **842×595** / A3 **1191×842** | `types.ts` `DRAWING_PAGE_SIZE_PX` |
| Host scrolluje natywnie (`overflow-auto`) | `WmPrintDrawingEditor.tsx` ~944–959 |
| Pointer: `onPointerDown/Move/Up` · **brak** `setPointerCapture` · **brak** `touch-action` · **brak** `pointercancel` | ~524–709, ~947–953 |
| `onPointerLeave` → `onPointerUp()` (kończy drag) | ~950–952 |
| Tekst / wymiar: `window.prompt` | ~546, ~603 |
| Hit: `closest("[data-id]")` · ściany `stroke-width` ~4 · wymiar 1.25px | `render-svg.ts` · `symbols/index.ts` |
| Shell: `--app-height` / `100dvh` OK | `mobile.css` · `app-viewport.ts` |
| Local safe-area w Rysunki: **brak** | `WmPrintView` `p-4` only · editor bez `env(safe-area-*)` |

---

## 3. RCA (Root Cause Analysis)

### RCA-01 — Desktop-first editor w mobile scroll shell

**Przyczyna główna:** WM-RYSUNKI-01 P0–P3B.1 celowo budował **edytor szkiców desktop** (pointer 2-click wall, Ghost, PDF/ZIP). Mobile viewport / gesture / touch target **nie były IN** żadnego slice.

**Efekt systemowy:**

1. **Konflikt gestów:** SVG host jest jednocześnie powierzchnią rysowania i kontenerem `overflow-auto`. Globalny `mobile.css` włącza `-webkit-overflow-scrolling: touch` dla `[class*="overflow-*"]`, ale **nie** definiuje `touch-action` dla powierzchni rysowania → OS może interpretować drag jako scroll.
2. **Brak modelu zoom/pan aplikacji:** rysunek A4 landscape (842 CSS px) ≫ szerokość telefonu (~430 CSS px Pro Max) → jedyna „nawigacja” = natywny scroll / browser pinch. Pinch przeglądarki koliduje z pointer draw.
3. **Hitbox = geometria wizualna:** brak niewidzialnych hit-area ≥44 CSS px → selekcja ścian/wymiarów/strzałek na touch jest losowa.
4. **Toolbar gęsty:** `px-2 py-1.5` + ikony 14px · poniżej `.touch-target` 44×44 z `mobile.css` · etykiety `hidden sm:inline`.
5. **Input desktop:** `window.prompt` + hover drzwi (`hoverWallId`) — na iOS prompt psuje viewport; hover nie istnieje.

**Klasyfikacja RCA:** **PRODUCT/UX GAP** (nie regresja P3B.1) — feature tip prod działa na desktop; mobile = **nowy EPIC**.

### RCA-02 — Nested scroll + Safari chrome

WM content (`overflow-y-auto`) + SVG host (`overflow-auto`) + bottom nav (`3.5rem + safe-area`) + Safari bottom bar / Dynamic Island → **wielowarstwowy scroll** bez kontraktu „drawing surface owns gestures”. To klasyczny wzorzec awarii iOS (scroll parent wygrywa z drag child).

### RCA-03 — Brak kontraktu warstw UI mobile

Create menu `absolute z-20` bez outside-click / safe-area / scroll-lock. Brak fullscreen sheet jak w Payroll/OperationalNotes → edytor „tonie” w scrollu zakładki zamiast zajmować viewport roboczy.

---

## 4. Lista problemów (pełna) + priorytety

### P0 — blokuje użyteczną edycję na telefonie

| ID | Problem | Dowód | Safari iOS | Chrome Android | Samsung Internet |
|----|---------|-------|------------|----------------|------------------|
| **M-P0-01** | Konflikt **scroll ↔ draw** na SVG host (`overflow-auto` + pointer bez capture/`touch-action`) | Editor ~944–953 · `mobile.css` overflow touch | Wysokie ryzyko — drag = scroll / urwanie drag (`pointerleave`) | Wysokie | Wysokie |
| **M-P0-02** | Brak **app zoom/pan** dla A4/A3 landscape; tylko scrollbar + browser pinch | `DRAWING_PAGE_SIZE_PX` · brak gesture handlers | Pinch koliduje z tap/draw · brak reset zoom | j.w. | j.w. |
| **M-P0-03** | Powierzchnia edycji **nie zajmuje viewportu roboczego** (title+toolbar+hint zjadają wysokość; `min-h-[280px]`; nested w WM scroll) | Panel `min-h-[70vh]` · editor `h-full` · WM `overflow-y-auto` | Safari bottom bar / Dynamic Island zmniejszają realne płótno | Toolbar systemowy | j.w. |

### P1 — poważna degradacja UX / błędy hitów

| ID | Problem | Dowód |
|----|---------|-------|
| **M-P1-01** | **Hitbox SVG** = stroke wizualny (ściana ~4px, wymiar 1.25px, strzałka 2px, drzwi 28×28) — brak enlarged hit area | `render-svg.ts` · `symbols/index.ts` |
| **M-P1-02** | Toolbar / akcje **&lt; 44px** · ikony 14px · label ukryty &lt;`sm` | Editor `toolBtn` · `.touch-target` w `mobile.css` nieużyty |
| **M-P1-03** | Selection bar (Obrót / Duplikuj / Usuń) jeszcze gęstszy (`py-1`, ikony 12px) | Editor ~899–938 |
| **M-P1-04** | Back „Lista” + Final/Duplikuj/Usuń **bez** `min-h-[44px]` | Panel ~194–227 vs OperationalNotes 44px |
| **M-P1-05** | `window.prompt` dla wymiaru i tekstu — iOS klawiatura / focus / viewport | Editor ~546, ~603 |
| **M-P1-06** | Brak `setPointerCapture` / `pointercancel` — drag urywa się poza hostem | Editor ~700–709, leave→up |
| **M-P1-07** | Menu „Nowy rysunek” `absolute z-20` — ryzyko ucięcia przy dolnej krawędzi / brak outside-click / brak safe-area | Panel ~274–311 |

### P2 — polish / secondary / orientacja

| ID | Problem | Dowód |
|----|---------|-------|
| **M-P2-01** | Brak lokalnego `env(safe-area-inset-*)` w panelu/edytorze (shell ma bottom nav padding) | WmPrintView `p-4` · editor bez inset |
| **M-P2-02** | Notch / Dynamic Island — top inset nie lokalny (zależność od topbar shell) | brak `safe-area-inset-top` w Rysunki |
| **M-P2-03** | Hover-only: `hoverWallId` drzwi · `hover:bg-*` na przyciskach | Editor ~651–659 |
| **M-P2-04** | Landscape vs portrait — tylko `flex-wrap`; brak layoutu „toolbar compact / canvas max” | brak media rules Rysunki w `mobile.css` |
| **M-P2-05** | Z-index: create `z-20` vs global modals `z-50` — brak kontraktu warstw Rysunki | Panel · porównanie Payroll |
| **M-P2-06** | Highlight SVG renderowany przed body objects — selekcja może być wizualnie „pod” | `render-svg.ts` kolejność |
| **M-P2-07** | Keyboard Esc / skróty — desktop; touch bez ekwiwalentu UI dla cancel preview poza Esc | Editor keyboard effect |
| **M-P2-08** | Browser history.back ≠ zamknięcie drill-in (tylko Capacitor native back) | Panel native back only |
| **M-P2-09** | Nested overscroll bounce (WM scroller + SVG host) | WmPrintView + editor |
| **M-P2-10** | PDF Preview iframe `position:fixed` — PV mobile (overlap nav / safe-area) | Editor ~326 |

### Już OK / REUSE (nie problem)

| Element | Stan |
|---------|------|
| App shell `100dvh` + `visualViewport` | OK foundation |
| AdminRouter bottom `safe-area` + nav | OK |
| Drill-in list→detail + Capacitor back | OK wzorzec (Schematy) |
| Ghost / continuous P3B.1 logika | NIE ruszać bez briefu |
| JSON / PDF / ZIP / Cloud merge | Poza mobile UX |

---

## 5. Macierz obszarów (wymaganie Ownera)

| Obszar | Werdykt AS-IS | Priorytet |
|--------|---------------|-----------|
| Safari iOS (Pro Max) | Wysokie ryzyko P0 (scroll/draw + brak zoom) | P0 |
| Chrome Android | j.w. | P0 |
| Samsung Internet | j.w. (+ własne chrome) | P0 |
| viewport vh/dvh | Shell OK; editor bez dedic. dvh canvas | P0/P2 |
| safe-area / notch / Dynamic Island | Shell partial; Rysunki local brak | P2 |
| modal / popup | Brak modal edytora; create menu słaby | P1 |
| canvas / SVG | Fixed px + scroll host | P0 |
| pointer/touch | Pointer OK API; brak capture/touch-action | P0/P1 |
| pinch | Brak app pinch; browser pinch konflikt | P0 |
| zoom / pan | Brak modelu app | P0 |
| toolbar | Gęsty &lt;44px | P1 |
| bottom nav Safari | Nested scroll + chrome | P0/P2 |
| landscape / portrait | Przypadkowe | P2 |
| responsywność | flex-wrap only | P1/P2 |
| SVG hitbox | Geometria wizualna | P1 |
| z-index | Local only | P2 |
| overflow / fixed / sticky | Nested overflow-auto | P0 |
| touch scrolling | Global CSS pomaga scroll, szkodzi draw | P0 |

---

## 6. Thin Design Freeze

> **STATUS DF:** **FROZEN** → [`WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-DESIGN-FREEZE.md)  
> Decyzje D-M0 / D-M1 / D-M2 · AC · allowlist · release · test plan = **w DF** (ten § = pointer).

**Fullscreen mobile editor:** **ACCEPTED** (`<md`).  
**Release order:** MOBILE-P0 → P1 → P2.  
**Zoom/pan bounded:** IN w P0 (canvas viewport).

---

## 7. Zakres implementacji

Patrz DF §6 File Allowlist · §7 Release Plan.

**Hit overlays:** edit-only · nie w PDF/ZIP (DF D-M1-02).

---

## 8. Acceptance criteria

Superseded by DF §5 (AC-M0 / AC-M1 / AC-M2).

---

## 9. Luki wymagające device verify (nie z kodu)

1. Safari iOS pointer vs legacy overflow residual.  
2. Browser pinch vs draw conflict.  
3. Modal input + visualViewport restore.  
4. Toolbar wrap na 320 / 390 / 430 CSS px.  
5. Landscape canvas vs compact chrome.  
6. PDF preview iframe mobile.  
7. Samsung Internet chrome interference.

---

## 10. Ryzyka / Constraints

Superseded by DF §4 (R-01…R-09).

---

## 11. Werdykt AUDIT

| Pole | Wartość |
|------|---------|
| **AUDIT** | **COMPLETE** |
| **IMPLEMENT** | **NIE** |
| **COMMIT / PUSH** | **NIE** |
| **Root cause** | Desktop-first SVG editor bez mobile gesture/viewport/hitbox contract |
| **Najwyższy sygnał** | **M-P0-01** scroll↔draw · **M-P0-02** brak zoom/pan · **M-P0-03** canvas height |
| **Rekomendowany NEXT** | DF **FROZEN** · Owner **GO IMPLEMENT MOBILE-P0** (lub ARCH REVIEW) |
| **Nie startować** | P4 punkty · Cloud · PDF rewrite · implement bez GO |

```text
AUDIT ACCEPTED · DF FROZEN
WAITING FOR OWNER GO → IMPLEMENT (MOBILE-P0)
```

---

## 12. Historia

| Data | Event |
|------|-------|
| 2026-08-04 | Owner GO AUDIT · AUDIT COMPLETE · docs only |
| 2026-08-04 | Owner GO DESIGN FREEZE · DF FROZEN · AUDIT → ACCEPTED |
