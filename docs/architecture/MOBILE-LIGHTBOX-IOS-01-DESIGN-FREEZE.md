# MOBILE-LIGHTBOX-IOS-01 — DESIGN FREEZE

> **ID:** MOBILE-LIGHTBOX-IOS-01  
> **STATUS:** **IMPLEMENT COMPLETE** · Chromium PASS · field iPhone Safari **PENDING OWNER** · czeka na verify/commit Ownera  
> **Data:** 2026-07-25  
> **RCA SSOT:** [`MOBILE-LIGHTBOX-IOS-01-RCA.md`](MOBILE-LIGHTBOX-IOS-01-RCA.md)  
> **Kontrakty bazowe:** MUX-A R1/R4/R7 · MUX-B1 LB1–LB8 (z **amendem LB2 dla L1** — §1.3)  
> **Typ bundla:** **FEATURE / shell UX** · **NIE** Payroll CORE · **NIE** Cloud Sync · **NIE** write-path  
> **Commit / push:** **NIE** bez kolejnego polecenia Ownera  
> **IMPLEMENT:** **NIE** w tej paczce dokumentów — tylko po Owner GO

```text
════════════════════════════════════════════════════════
MOBILE-LIGHTBOX-IOS-01 = L1 ONLY:
  createPortal(lightbox → document.body)
  + useModalScrollLock (bez zmian API)
  + modal-overlay (allowlist MUX-A / MUX-B1)
  + modal-lightbox (NOWY marker fullscreen — BEZ modal-sheet)
  BEZ: L2–L5 · swipe · pinch · next/prev · PhotoLightboxShell
       · modal-scroll-lock.ts · Payroll · Cloud Sync · MUX-B2/D
════════════════════════════════════════════════════════
```

---

## 0. Cel i granice

### 0.1 Cel

1. Naprawić na **fizycznym iPhone Safari** zablokowane tapy na L1 (X / backdrop) po otwarciu zdjęcia w Roboty → Zdjęcia.  
2. Usunąć root cause: `position: fixed` lightbox **wewnątrz** `.mobile-view-scroll` (`-webkit-overflow-scrolling: touch`).  
3. Zachować kontrakt scroll-lock MUX-B1 (lock + allowlist marker).  
4. **Odciąć** L1 od layoutu `.modal-sheet` (`max-height: 92dvh` sheet CSS).  
5. Zero zmian logiki galerii / approve-reject / stanu poza montowaniem DOM overlaya.

### 0.2 IN — po Owner GO

| # | Zmiana | Plik | Uwagi |
|---|--------|------|-------|
| **I1** | `createPortal` root lightboxa → `document.body` gdy `lightbox != null` | `src/app/JobPhotoGallery.tsx` | MUST |
| **I2** | Root classes: `modal-overlay` + `modal-lightbox` (+ istniejące Tailwind `fixed inset-0 …`) | ten sam | MUST — **usunąć `modal-sheet` z L1** |
| **I3** | Zachować `useModalScrollLock(lightbox != null)` | ten sam | MUST — bez zmiany API hooka |
| **I4** | Zachować Escape `useEffect`, X `onClick`, backdrop `onClick`, `img` `stopPropagation` | ten sam | MUST — semantyka close bez zmian |
| **I5** | Minimalny CSS dla `.modal-lightbox` (fullscreen, bez sheet max-height) | `src/styles/mobile.css` | MUST jeśli nie da się w 100% Tailwindem; **tylko** reguły lightboxa |

**Dozwolone typy edycji w `JobPhotoGallery.tsx`:**

1. Import `createPortal` z `react-dom`.  
2. Opakowanie istniejącego JSX lightboxa w `createPortal(..., document.body)`.  
3. Zamiana className markera: `modal-sheet` → `modal-lightbox` (zostaje `modal-overlay`).  
4. **Opcjonalnie SHOULD (ten sam plik, zero stanu):** caption `pointer-events-none`; X `min-h/w-[44px]` + safe-area — tylko jeśli nie puchnie diff.

**Zakaz:** zmiana `approve`/`reject`/`remove`/`PhotoGrid`/filtrów/`onUpdate`; nowy state; next/prev/swipe; przenosiny do nowego komponentu.

### 0.3 OUT — zakaz

| OUT | Powód |
|-----|--------|
| L2–L5 | Osobny ticket po field L1 |
| Swipe / pinch / next / prev | MUX-D |
| `PhotoLightboxShell` | Wariant B — osobny DF |
| `src/lib/modal-scroll-lock.ts` | Allowlist już obejmuje `.modal-overlay` — **nie ruszać** |
| `mobile.css` poza `.modal-lightbox` | Nie zmieniać reguł `.modal-sheet` / lock global |
| JobEmailModal / PayrollEmail* / inne overlaye | Zero blast radius |
| Payroll / Cloud Sync / Edge / LS keys | Boundary |
| MUX-B2 / MUX-D | Poza scope |
| Emulacja-only „gotowe” bez field Safari | AC wymaga fizycznego iPhone |

### 0.4 Boundary Check (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| FEATURE vs CORE | **FEATURE** — UI mount lightbox |
| Payroll write-path / hours / PWRB / Domain Push? | **NIE** |
| Cloud Sync / CloudLoader / Edge / LS keys? | **NIE** |
| Mixed FEATURE+CORE? | **NIE** |
| Gate B payroll? | **NIE** |
| Owner GO wymagany? | **TAK** |
| Naruszenie Payroll / Cloud Sync? | **NIE** |

---

## 1. Finalny kontrakt architektoniczny

### 1.1 RCA → decyzja

```text
PROBLEM:  fixed L1 in-tree w .mobile-view-scroll → WebKit hit-test fail
DECYZJA:  portal do document.body + marker fullscreen bez modal-sheet
```

### 1.2 Markery i allowlist (bez zmiany `modal-scroll-lock.ts`)

```text
MUX-A / runtime allowlist (NIE ZMIENIANA):
  .modal-sheet | .modal-overlay | [data-slot=sheet-content|dialog-content]

L1 PO tej naprawie:
  root = modal-overlay + modal-lightbox   ← BEZ modal-sheet

Dlaczego OK bez edycji modal-scroll-lock.ts:
  touchmove allowlist już przepuszcza .modal-overlay
  reconcileModalScrollLock już widzi .modal-overlay
```

### 1.3 Amend MUX-B1 LB2 — **tylko L1 / fullscreen media**

| Reguła | MUX-B1.1 (było) | MOBILE-LIGHTBOX-IOS-01 (L1) |
|--------|-----------------|----------------------------|
| **LB1** lock | `useModalScrollLock` | **bez zmian** |
| **LB2** markery | `modal-overlay` **+** `modal-sheet` | `modal-overlay` **+** `modal-lightbox` |
| **LB3** lock+markery razem | TAK | TAK |
| **LB4** close X/Escape/cleanup | TAK | TAK (handlery bez zmian semantyki) |
| **LB5** backdrop | TAK | TAK |
| Mount | in-tree | **`createPortal` → `document.body`** |

**Uzasadnienie amendu:** `.modal-sheet` w `mobile.css` niesie **layout sheetów** (`max-height: 92dvh`, padding safe-area sheet). Fullscreen lightbox nie może dziedziczyć tych reguł. Nowy marker `modal-lightbox` = semantyka mediów fullscreen; allowlist nadal przez `modal-overlay`.

**L2–L5:** pozostają przy MUX-B1 LB2 (`modal-sheet`) do osobnego ticketu — **OUT**.

### 1.4 Lock lifecycle + `createPortal`

```text
useModalScrollLock(open) żyje w fiber JobPhotoGallery (useEffect),
NIE w węźle DOM portalu.

open true  → acquireModalScrollLock()  (lockCount++, klasa html)
open false / unmount JobPhotoGallery → release z cleanup effect

createPortal:
  • przenosi TYLKO DOM overlaya pod document.body
  • NIE przenosi ownership efektów React
  • close → setLightbox(null) → ten sam cleanup co dziś
  • zmiana zakładki Jobs → unmount galerii → cleanup OK

Wniosek: portal NIE narusza lock lifecycle MUX-B1.
```

### 1.5 Wzorzec referencyjny L1 (zamrożony)

```tsx
// JobPhotoGallery — skrót kontraktu (nie kod do wklejenia jako jedyny diff)
useModalScrollLock(lightbox != null);
// Escape useEffect — bez zmian

return (
  <div className="space-y-5">
    {/* grids — bez zmian */}
    {lightbox &&
      createPortal(
        <div
          className="fixed inset-0 z-50 modal-overlay modal-lightbox flex items-center justify-center p-4 bg-black/90"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button type="button" aria-label="Zamknij" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}>…</button>
          <JobPhotoImg … onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 … /* SHOULD: pointer-events-none */">…</div>
        </div>,
        document.body,
      )}
  </div>
);
```

### 1.6 Kontrakt CSS `.modal-lightbox` (jeśli I5)

```text
MUST (semantyka):
  • nie dziedziczyć max-height sheet z .modal-sheet
  • fullscreen covering viewport (fixed inset-0 już z Tailwind)

DOZWOLONE w mobile.css (tylko ten selektor):
  .modal-lightbox {
    /* belt: jawne wyłączenie sheet constraints jeśli kiedyś dodane globalnie */
    max-height: none;
    /* opcjonalnie: padding-bottom safe-area tylko jeśli potrzeba pod X/caption */
  }

ZAKAZ w tym DF:
  • edycja reguł .modal-sheet
  • edycja html.modal-scroll-locked { … } poza brakiem zmian
```

Jeśli Tailwind `fixed inset-0` + **brak** klasy `modal-sheet` wystarcza empirycznie, I5 może być pusty — wtedy plik CSS **OUT** z diffu (preferencja: jednak dodać 3–6 linii SSOT, żeby nikt nie „naprawił” L1 wracając do `modal-sheet`).

### 1.7 Impact na inne overlaye (Architecture Review)

| Overlay | Impact |
|---------|--------|
| JobEmailModal | **ZERO** — osobny tree, `modal-overlay`+`modal-sheet`, bez portalu L1 |
| PayrollEmailModal / PayrollPdfPreviewModal | **ZERO** |
| L2–L5 | **ZERO** w tym DF (nadal in-tree + `modal-sheet`) |
| `modal-scroll-lock.ts` allowlist / init | **ZERO** |
| Radix Dialog/Sheet | **ZERO** |
| AdminMobileNav / inne fixed | **ZERO** (portal L1 na `body` z `z-50` — jak dziś; przy konflikcie zrzut field, nie zmieniać z-index w tym DF bez Owner) |

**MUX-B1 kontrakt globalny:** L2–L5 nadal LB2 ze `modal-sheet`. L1 = **jedyny** amend LB2 → `modal-lightbox`. Dokument MUX-B1 DF należy **dopisać przypisem** w IMPLEMENT/commit docs (opcjonalnie 1 akapit w MUX-B1 DF) — **nie** w IMPLEMENT src.

---

## 2. Lista plików objętych zmianą

| Plik | Rola | MUST / MAY |
|------|------|------------|
| `src/app/JobPhotoGallery.tsx` | Portal + class markers | **MUST** |
| `src/styles/mobile.css` | Tylko `.modal-lightbox { … }` | **MAY→SHOULD** (zalecane SSOT) |

**Hard cap:** ≤ 2 pliki.  
**Zakaz:** `modal-scroll-lock.ts`, `JobsView.tsx`, L2–L5, Payroll*, Cloud*.

**Docs (poza runtime, poza AC build):** ten DF; po VERIFY — Owner Verification note (osobny plik lub sekcja).

---

## 3. Boundary Check (skrót operacyjny)

```text
✓ FEATURE only
✓ Brak Payroll / Cloud Sync
✓ Brak modal-scroll-lock.ts
✓ Brak L2–L5
✓ Owner GO przed IMPLEMENT
✓ Commit/push tylko na polecenie Ownera
```

---

## 4. Ryzyko regresji

| Ryzyko | Poziom | Mitygacja |
|--------|--------|-----------|
| Portal nie naprawia Safari (zły RCA) | Niskie | Field AC-P0; rollback = revert 1–2 plików |
| Double-mount / SSR `document.body` | Niskie | App to SPA client; portal tylko gdy `lightbox` (client render) |
| z-50 vs inne overlaye na body | Niskie | Status quo z-index L1; nie podnosić bez pola |
| Lock stuck po close | Niskie | Ten sam hook lifecycle; rapid ×10 w verify |
| Background scroll / rubber-band wraca | Niskie | Lock + `modal-overlay` zostaje |
| JobEmail / Payroll sheets zepsute | **Bardzo niskie** | Zero styku plików / allowlist |
| Regresja approve/reject thumbs | Bardzo niskie | Grids nietknięte |
| L2–L5 nadal bug Safari | Akceptowane residual | OUT — ticket follow-up |

---

## 5. Plan IMPLEMENT (po Owner GO)

```text
1. JobPhotoGallery.tsx
   - import { createPortal } from "react-dom"
   - lightbox JSX → createPortal(..., document.body)
   - className: usunąć modal-sheet; dodać modal-lightbox; zostawić modal-overlay
   - NIE ruszać useModalScrollLock / Escape / grids / state

2. (SHOULD) mobile.css
   - dodać wyłącznie blok .modal-lightbox (max-height: none; bez ruszania .modal-sheet)

3. (SHOULD same-file) caption pointer-events-none; X touch ≥44px + safe-area top

4. npm run build  → PASS

5. Smoke emulacja (opcjonalnie mux-b1 L1) — nie zastępuje field

6. Owner Verification — fizyczny iPhone Safari (MUST)
```

**Kolejność plików:** tylko `JobPhotoGallery.tsx` najpierw; CSS jeśli potrzebny do AC fullscreen.

---

## 6. Definition of Done

### 6.1 Acceptance Criteria (zamrożone)

| ID | Kryterium | Gate |
|----|-----------|------|
| **AC-P0-1** | Fizyczny **iPhone Safari**: Roboty → robota → Zdjęcia → open photo | MUST |
| **AC-P0-2** | **X** zamyka lightbox przy każdym tapie | MUST |
| **AC-P0-3** | **Backdrop** zamyka lightbox | MUST |
| **AC-P0-4** | Brak background scroll listy pod overlayem | MUST |
| **AC-P0-5** | Brak rubber-band tła pod overlayem | MUST |
| **AC-P0-6** | Po close: brak `html.modal-scroll-locked` (gdy brak innych modali); rapid open/close ×5+ bez stuck | MUST |
| **AC-B1** | `useModalScrollLock` nadal ON przy open; root ma `modal-overlay` | MUST |
| **AC-B2** | Root **nie** ma `modal-sheet`; ma `modal-lightbox` | MUST |
| **AC-B3** | Diff ⊆ `{JobPhotoGallery.tsx}` ∪ opcjonalnie `{mobile.css}` | MUST |
| **AC-B4** | `npm run build` PASS | MUST |
| **AC-R1** | JobEmailModal / PayrollEmail / PayrollPdf — bez regresji (smoke desktop lub emul; nie wymaga pełnego field jeśli zero diff w tych plikach) | SHOULD |
| **AC-A1** | Android Chrome smoke: open/close L1 OK | SHOULD |

### 6.2 DoD checklist

```text
□ Owner GO na ten DF
□ IMPLEMENT zgodnie z §0.2 / §5
□ Build PASS
□ AC-B1…B4 PASS
□ AC-P0-1…P0-6 PASS na fizycznym iPhone Safari (Owner lub delegat)
□ Raport Owner Verification zaktualizowany
□ Commit / push TYLKO na polecenie Ownera
□ Brak zmian w modal-scroll-lock.ts, L2–L5, Payroll, Cloud Sync
```

### 6.3 RELEASE

```text
RELEASE L1-iOS fix = AC-P0-* PASS na fizycznym iPhone Safari
  + build PASS + diff cap
Emulacja Chromium ≠ DoD tego ticketu.
```

---

## 7. Owner GO

```text
Po akceptacji tego DESIGN FREEZE Owner pisze:
  „GO MOBILE-LIGHTBOX-IOS-01” / „implementuj MOBILE-LIGHTBOX-IOS-01”

Dopiero wtedy AGENT wolno:
  - edytować pliki z §2
  - uruchomić build / verify

Zakaz do GO: src/** · commit · push
```

---

**Dokument:** `docs/architecture/MOBILE-LIGHTBOX-IOS-01-DESIGN-FREEZE.md`  
**RCA:** `docs/architecture/MOBILE-LIGHTBOX-IOS-01-RCA.md`
