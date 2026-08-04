# WORKER-INSPECTOR-MOBILE-01 — AUDIT (Mobile UX)

> **ID:** WORKER-INSPECTOR-MOBILE-01-AUDIT  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01 · **STATUS:** **NEW EPIC** · **AUDIT COMPLETE / PASS**  
> **FAZA:** AUDIT CLOSED (wejście) · DF → [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-DESIGN-FREEZE.md)  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO AUDIT**  
> **Następne:** Owner **GO → ARCHITECTURE REVIEW** (WIM-P0 DF FROZEN)  
> **Tip prod (kontekst, nie zmieniać w AUDIT):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.05** / **`59f09c1c`**  
> **Korelacje:** [`MOBILE-UX-AUDIT-01.md`](./MOBILE-UX-AUDIT-01.md) · [`MOBILE-UX-MUX-B1-AUDIT.md`](./MOBILE-UX-MUX-B1-AUDIT.md) · Mobile Recovery · GLOBAL-UX-02 (Inspector paint) · WM-RYSUNKI-MOBILE (osobny epic)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WORKER-INSPECTOR-MOBILE-01 — AUDIT COMPLETE

SCOPE: Panel Pracownika + Panel Inspektora (pełna architektura mobile)
OUT:   IMPLEMENT · COMMIT · PUSH · Payroll CORE · Cloud Sync · AI · WM Rysunki

ROOT THEME:
  Admin shell już pije --app-height (visualViewport)
  Worker + Inspector nadal surowy 100dvh  →  P0 systemowy

WERDYKT: GOTOWY DO DESIGN FREEZE (thin slices)
════════════════════════════════════════════════════════
```

---

## 0. Executive Summary

Oba panele terenowe (**Worker**, **Inspector**) mają **świadomą strukturę mobile** (safe-area, `overscroll-contain`, touch 44px w wielu CTA, offline photo queue, Inspector: bottom nav + MV-2 job detail, GLOBAL-UX-02 GDS). To **nie** jest „desktop-only”.

Jednocześnie **nie konsumują SSOT wysokości viewportu** (`--app-height` z `app-viewport.ts` / `visualViewport`), którą admin shell już używa (`.admin-app-shell`). Worker i Inspector siedzą na surowym **`100dvh`** → Safari iPhone (pasek URL, Dynamic Island, home indicator) oraz Android gesture bar = ucięty chrome / zbędny scroll / FAB i bottom nav poza bezpiecznym obszarem.

Drugorzędnie (P1): **kontrakt aparatu/galerii** (Worker: `multiple`+`capture`; Inspector: często tylko `capture`), **brak lightboxa u Workera**, **3 lightboxy u Inspectora bez pinch-zoom**, **wysoki chrome job detail Inspectora**, overcrowded CommandLayer.

**Payroll / Cloud Sync / AI / JSON drawings:** OUT — audyt nie proponuje zmian CORE.

**Gotowość terenowa (orientacyjna):**

| Rola | Ocena | Komentarz |
|------|------:|-----------|
| Worker | **58%** | Upload/offline photos OK; viewport + capture + brak LB |
| Inspector | **62%** | Shell/nav solidne (GDS); viewport + chrome budget + LB zoom |
| Admin (referencja) | **~72%** | `--app-height` + Recovery — wzorzec REUSE |

---

## 1. Scope IN / OUT

### 1.1 IN

| Powierzchnia | Tematy |
|--------------|--------|
| **Worker** | Roboty · upload · aparat · galeria · file picker · preview · formularze · toasty · scroll · nested scroll · keyboard · visualViewport · dvh · safe-area · Dynamic Island · orientation · offline · sticky · pointer/touch |
| **Inspector** | Roboty · galerie · upload · lightbox · formularze · raporty/PDF · checkboxy · modale · keyboard · scroll · sticky · safe-area · touch/pointer · zoom · orientation |
| **Shared** | `--app-height` · `modal-scroll-lock` · `mobile.css` · device matrix |

### 1.2 OUT (twarde)

| OUT | Powód |
|-----|-------|
| IMPLEMENT / commit / push | AUDIT ONLY |
| Payroll write-path / Hours-wipe / Edge merge | CORE |
| Cloud Sync drawings / AI-COST | Osobne epiki |
| WM-RYSUNKI-MOBILE-P2 | Osobny epic |
| Pełny redesign produktowy Worker/Inspector | Poza thin slice |
| Field device certification (fizyczny iPhone) | Osobna faza po DF/IMPLEMENT |

---

## 2. Architektura mobilna (mapa)

### 2.1 Shared foundation (REUSE)

| Element | Plik | Stan |
|---------|------|------|
| `--app-height` z `visualViewport` | `src/lib/app-viewport.ts` · `main.tsx` | **Ustawiane globalnie** |
| Admin konsumuje | `.admin-app-shell` w `mobile.css` | **PASS** |
| Worker / Inspector konsumują | — | **FAIL** (surowy `100dvh`) |
| Keyboard inset | `mobile-keyboard.ts` · `data-keyboard-aware` | Worker: używa; Inspector: częściowo |
| Modal scroll lock | `modal-scroll-lock.ts` | Inspector L3/L4/L5: **TAK**; Worker: brak (brak LB) |
| Font 16px inputs &lt;768 | `mobile.css` | Global |

### 2.2 Worker — layout tree

```text
AppInnerWithAuth [worker]  →  WorkerPhotoView ONLY (bez Admin Toaster)
└─ div height:100dvh · flex-col · select-none
   ├─ Header + safe-area-top
   ├─ Tabs TOP: Roboty | Grafik | Wypłata  (gdy !selectedJob)
   ├─ Help / PWA / offline queue banner
   └─ Scroll flex-1 overflow-y-auto overscroll-contain · data-keyboard-aware · safe-area-bottom
        ├─ Lista robót (+ PTR)  LUB  detal:
        │    Progress → photos (HiddenFileInput / raw capture) → JobReportForm
        └─ PrivacyShield fixed inset-0 z-[200]
```

**Nawigacja:** top tabs (nie bottom nav). Detal = `selectedJobId` in-place. Capacitor back zamyka detal; Safari `history.back` **bez** `pushState`.

### 2.3 Inspector — layout tree

```text
InspectorPanel h-[100dvh]
└─ InspectorShell h-[100dvh] flex-col
   ├─ InspectorCommandLayer (safe-area-top · sync · notes · help · theme · logout)
   ├─ workspace
   │  ├─ L1: ViewRouter (Dashboard/Roboty/Galeria/Pliki/Portfolio + PTR)
   │  └─ L2: JobWorkspace (chrome sticky + scroll · photos · docs · billing · delivery)
   └─ BottomNav (md:hidden · OFF gdy jobDetailOpen)
└─ InspectorOverlays (L4 lightbox · FAB · notes · Toaster)
```

**Lightboxy:** L3 (`InspectorPhotoGallery`) · L4 (`InspectorOverlays`) · L5 (`InspectorJobPhotosGalleryView`) — lock **obecny** (MUX-A parcialmente); **brak** wspólnego pinch-zoom / jeden SSOT close UX.

---

## 3. Mapa problemów (W- / I- / S-)

### 3.1 Shared (S)

| ID | Sev | Kat. | Evidence | Problem |
|----|-----|------|----------|---------|
| **S-01** | **P0** | viewport / dvh / visualViewport / Dynamic Island | Worker `100dvh` · Inspector Panel+Shell `h-[100dvh]` vs `app-viewport.ts` + `.admin-app-shell` | Worker+Inspector **ignorują** `--app-height` → Safari/Android chrome mismatch |
| **S-02** | **P1** | orientation | Brak reguł landscape dla Worker/Inspector shell | Landscape telefon = chrome chaos; iPad 768+ = desktop path |
| **S-03** | **P2** | memory / compression | Watermark Worker; Inspector upload bez wspólnego budget UI | Duże zdjęcia terenowe — ryzyko OOM / wolny upload (monitor) |
| **S-04** | **P2** | accessibility | Bottom nav Inspector `text-[9px]`; Worker OK-ish 44px | Słabe etykiety / focus w lightboxach |

### 3.2 Worker (W)

| ID | Sev | Kat. | Evidence | Problem |
|----|-----|------|----------|---------|
| **W-01** | **P0** | viewport | `WorkerPhotoView.tsx` ~683 `height:"100dvh"` | = S-01 Worker |
| **W-02** | **P1** | camera / file picker | ~1344 `multiple` + `capture="environment"` | Konflikt iOS/Android capture vs multi |
| **W-03** | **P1** | privacy / camera | Raw `<input>` aparat/paragon **bez** `suppressPrivacyShieldBriefly` | Shield vs picker |
| **W-04** | **P1** | upload / PDF | Receipt `accept=image/*,pdf` + `capture` | Utrudnia wybór PDF |
| **W-05** | **P2** | offline | `photo-queue` tylko zdjęcia robót | Paragony bez kolejki offline |
| **W-06** | **P2** | toast | Worker poza `AppInner` Toaster | Brak sonner — tylko inline errors |
| **W-07** | **P2** | navigation | Brak `history.pushState` na detal | Safari back ≠ close job |
| **W-08** | **P2** | scroll | Scroll bez `.mobile-view-scroll` / `min-h-0` jawnego SSOT | Edge overflow WebKit |
| **W-09** | **P2** | lightbox / preview | Miniatury 80×80; brak fullscreen LB | Brak review jakości przed/po |
| **W-10** | Info | GPS | 0× `geolocation` w `src/` | Brak GPS (nie bug — gap produktowy) |
| **W-11** | **P2** | keyboard | `data-keyboard-aware` OK; długi `JobReportForm` | Pola dolne nadal ryzykowne przy sticky |

### 3.3 Inspector (I)

| ID | Sev | Kat. | Evidence | Problem |
|----|-----|------|----------|---------|
| **I-01** | **P0** | viewport | `InspectorPanel` + `InspectorShell` `100dvh` | = S-01 Inspector |
| **I-02** | **P1** | viewport | Podwójne `h-[100dvh]` Panel+Shell | Zagnieżdżony pełny viewport |
| **I-03** | **P1** | sticky | JobWorkspace chrome: Wróć+adres+handover+section nav+… | Za mało content area na telefonie |
| **I-04** | **P1** | bottom nav / touch | CommandLayer: Music+Cloud+Notes+Help+Theme+Wyloguj | Overcrowding / mis-tap |
| **I-05** | **P1** | lightbox / z-index | L3/L4/L5 różne close UX | Drift UX (lock OK po MUX; unify nadal) |
| **I-06** | **P1** | zoom | Brak pinch/double-tap we wszystkich LB | Odbiór terenowy bez powiększenia |
| **I-07** | **P2** | safe-area / notch | L5 X `top-4` bez safe-area | Notch zasłania close |
| **I-08** | **P2** | touch | L3 chevron/X bez `WG_TOUCH_MIN` | &lt;44px |
| **I-09** | **P1** | camera / upload | Często tylko `capture="environment"` | Brak ścieżki album |
| **I-10** | **P2** | nested scroll | PTR w job gdy `scrollTop≈0` | Kradnie gest |
| **I-11** | **P2** | modal / keyboard | Billing `92vh` + autofocus | Sheet ucięty pod klawiaturą |
| **I-12** | **P2** | checkbox / touch | Stage Tak/Później bez 44px | Niespójne z DocChecklist |
| **I-13** | **P2** | PDF / reports | Dashboard PDF OK; preview plików małe targety | Touch polish |
| **I-14** | **P2** | overflow CSS lock | `html.modal-scroll-locked .admin-app-shell` nie celuje `.inspector-shell` | CSS overscroll admin-only |
| **I-15** | **P2** | orientation / back | Safari back ≠ close job | Jak Mobile Recovery Jobs |

---

## 4. RCA (root causes)

### RCA-01 — Viewport SSOT niepodpięty (P0)

```text
CAUSE: initAppViewport() ustawia --app-height, ale tylko .admin-app-shell go używa.
Worker/Inspector hardcoded 100dvh.
EFFECT: Safari visualViewport ≠ layout height → clipped bottom nav/FAB/CTA.
FIX CLASS: thin shell height = var(--app-height, 100dvh) + min-h-0 scroll SSOT.
```

### RCA-02 — Capture API drift (P1)

```text
CAUSE: Różne ścieżki <input capture/multiple/accept> bez kontraktu SSOT.
EFFECT: iOS nieprzewidywalny (1 klatka vs seria); privacy shield vs blur; PDF+capture.
FIX CLASS: HiddenFileInput + rozdział Aparat (1× capture) vs Galeria (multi, no capture).
```

### RCA-03 — Lightbox fragmentation (P1)

```text
CAUSE: 5+ copy-paste overlays historycznie; Inspector nadal 3 warianty; Worker 0.
EFFECT: Brak pinch; niespójne close; L5 safe-area; Worker bez review.
FIX CLASS: REUSE najlepszy L3 + wspólny PhotoLightbox thin; Worker adopt.
NOTE: MUX-B1 lock residual częściowo zamknięty (L3/L4/L5 mają useModalScrollLock).
```

### RCA-04 — Inspector chrome budget (P1)

```text
CAUSE: CommandLayer always-on + dense job chrome + section nav.
EFFECT: Mało miejsca na docs/zdjęcia na iPhone.
FIX CLASS: Compact command (⋯) + collapsible job chrome.
```

### RCA-05 — History / orientation debt (P2)

```text
CAUSE: Capacitor back only; brak landscape policy.
EFFECT: Safari back nie zamyka detalu; landscape niecertyfikowany.
FIX CLASS: pushState (jak Jobs MV-2) · P2 landscape slice.
```

---

## 5. Priorytety P0 / P1 / P2

| Priorytet | IDs | Cel biznesowy |
|-----------|-----|---------------|
| **P0** | S-01, W-01, I-01, I-02 | Stabilny viewport terenowy (Safari/Android) |
| **P1** | W-02…W-04, W-07/W-09, I-03…I-06, I-09, S-02 | Capture · privacy · LB · chrome · album |
| **P2** | W-05/06/08/11, I-07…I-15, S-03/S-04 | Offline receipts · toast · PTR · touch polish · a11y |
| **P3 / backlog** | GPS produktowy · full pinch parity admin · S9 ui-guard | Poza pierwszym DF |

---

## 6. Thin Slice Proposal

Epic **WORKER-INSPECTOR-MOBILE-01** = seria thin slices (każdy: AUDIT→DF→AR→GO→IMPLEMENT→OV→PV→CLOSE).

| Slice | Nazwa | Zakres | Zamyka |
|-------|-------|--------|--------|
| **WIM-P0** | Viewport SSOT | Worker + Inspector → `var(--app-height, 100dvh)` · jeden kontener wysokości · scroll `min-h-0` · opcjonalnie `.inspector-shell` / `.worker-shell` w `mobile.css` | S-01, W-01, I-01, I-02 |
| **WIM-P1a** | Capture & Privacy (Worker) | Rozdziel aparat/galeria · HiddenFileInput + suppress shield · receipt PDF bez capture | W-02, W-03, W-04 |
| **WIM-P1b** | Capture & Album (Inspector) | Aparat \| Galeria · FAB + PhotoGallery | I-09 |
| **WIM-P1c** | Inspector chrome | Compact CommandLayer + job chrome budget | I-03, I-04 |
| **WIM-P1d** | Lightbox unify + zoom MVP | Jedna warstwa close/safe-area; pinch lub double-tap; Worker LB thin REUSE | I-05…I-08, W-09 |
| **WIM-P2a** | History back | `pushState` Worker detal + Inspector job (Safari) | W-07, I-15 |
| **WIM-P2b** | Polish | PTR guard · toast Worker · touch targets · billing sheet `dvh` · CSS lock inspector | W-06, I-10…I-14 |

**Rekomendacja startu DF:** najpierw **WIM-P0** (najwyższy ROI, zero logiki biznesowej).

---

## 7. Design Freeze Recommendations

1. **SSOT FIRST:** wysokość shella = wyłącznie `var(--app-height, 100dvh)` (REUSE admin).  
2. **REUSE FIRST:** `HiddenFileInput`, `useModalScrollLock`, `modal-overlay`/`modal-lightbox`, `WG_TOUCH_MIN`, Jobs MV-2 history pattern.  
3. **ZERO DUPLICATE:** nie dodawać 4. lightboxa — unifikować L3→SSOT.  
4. **THIN SLICE:** WIM-P0 **bez** pinch, **bez** capture rewrite, **bez** redesign Command.  
5. **OUT CORE:** zakaz `cloud-sync` / payroll / Edge / AI.  
6. **Capture contract (do DF P1):**  
   - Aparat: `capture="environment"` · **bez** `multiple` · 1 plik.  
   - Galeria: `multiple` opcjonalnie · **bez** `capture`.  
7. **Privacy:** każdy Worker file input → `suppressPrivacyShieldBriefly`.  
8. **Orientation:** P0 nie otwiera landscape; P2 osobno.  
9. **GPS:** nie w zakresie MVP (osobny produkt GO).  
10. **Field validation:** po IMPLEMENT P0 — Owner device OV (Safari iPhone + Android).

---

## 8. Allowlist (propozycja na WIM-P0)

### 8.1 IN (WIM-P0)

| Plik | Rola |
|------|------|
| `src/app/WorkerPhotoView.tsx` | `height/max-height: var(--app-height, 100dvh)` · scroll min-h-0 |
| `src/app/InspectorPanel.tsx` | jeden kontener wysokości |
| `src/app/inspector/InspectorShell.tsx` | `h-[var(--app-height,100dvh)]` |
| `src/styles/mobile.css` | `.worker-shell` / `.inspector-shell` (opcjonalnie) |
| `scripts/test-worker-inspector-mobile-p0.mjs` | **NEW** smoke markery |
| `changelog-data.ts` + `CHANGELOG.md` | bump przy GO COMMIT |

### 8.2 OUT (WIM-P0)

| Zakaz |
|-------|
| `cloud-sync.ts` · Edge · payroll · AI |
| Capture / lightbox / CommandLayer redesign |
| `app-viewport.ts` rewrite (REUSE as-is) |
| GPS · offline receipts · toast Worker |

---

## 9. Ryzyka

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| **R-01** | `--app-height` + keyboard inset interakcja | REUSE istniejący `data-keyboard-aware`; device OV |
| **R-02** | Privacy shield vs camera (iOS) | WIM-P1a HiddenFileInput |
| **R-03** | Pinch zoom złożoność | MVP double-tap scale w P1d; pełny pinch później |
| **R-04** | Scope creep „cały mobile app” | Twarde slice OUT; Admin poza epicem |
| **R-05** | MUX-B1 / GLOBAL-UX-02 overlap | Ten epic = residual Worker/Inspector; nie reimplement GDS paint |
| **R-06** | Field FAIL Safari mimo unit PASS | Device OV obowiązkowe przed CLOSE P0 |

---

## 10. Acceptance Criteria (propozycja epic / P0)

| AC | Kryterium |
|----|-----------|
| **AC-WIM-01** | Worker shell height = `var(--app-height, 100dvh)` (nie sam `100dvh`) |
| **AC-WIM-02** | Inspector shell/panel height = `var(--app-height, 100dvh)` (jeden SSOT kontener) |
| **AC-WIM-03** | Bottom nav / FAB / Worker CTA widoczne przy otwartym URL bar Safari (device OV) |
| **AC-WIM-04** | Zero regresji: upload zdjęć Worker · Inspector photo queue · DocChecklist |
| **AC-WIM-05** | Zero zmian Cloud/Payroll/AI |
| **AC-WIM-06** (P1+) | Aparat i Galeria = osobne ścieżki (kontrakt capture) |
| **AC-WIM-07** (P1+) | Worker: privacy shield nie blokuje pickera |
| **AC-WIM-08** (P1+) | Inspector lightbox: spójne close + safe-area + zoom MVP |
| **AC-WIM-09** | Desktop ≥md: Inspector sidebar path PASS |
| **AC-WIM-10** | Smoke unit P0 markery PASS |

---

## 11. Test Matrix

| Warstwa | Co | Kiedy |
|---------|-----|-------|
| Unit smoke | Markery `--app-height` / brak surowego `100dvh` w shellach | Każdy slice |
| Static | Capture bez `multiple`+`capture` razem | P1a/P1b |
| Manual Worker | Lista→detal→aparat→galeria→dokumentacja→paragon | Device OV |
| Manual Inspector | Tabs→job→zdjęcia→LB→upload→checklist→billing sheet | Device OV |
| Keyboard | Focus pola w JobReportForm / Billing | Device OV |
| Orientation | Portrait PASS; landscape = note / P2 | Device OV |
| Offline | Worker photo queue flush on online | Device OV |
| Regresja | Admin shell `--app-height` nietknięty | Smoke |

---

## 12. Device Matrix

| Urządzenie | Priorytet | Focus |
|------------|-----------|-------|
| **Safari iPhone** (notch / Dynamic Island) | **P0** | Viewport · keyboard · capture · privacy |
| **Chrome Android** | **P0** | Viewport · file picker · FAB/nav |
| **Samsung Internet** | P1 | File intents · capture |
| **iPad** (768+) | P1 | Desktop path vs FS; orientation |
| **Pixel** | P1 | Chrome Android parity |
| **Galaxy** | P1 | Samsung + Chrome |
| Capacitor (jeśli w użyciu) | P1 | Native back |

---

## 13. Co już działa (REUSE — nie psuć)

- Worker: offline `photo-queue` · watermark · `HiddenFileInput` w części ścieżek · `data-keyboard-aware` · safe-area · PTR off w detalu · touch 44px CTA  
- Inspector: Shell/Router/Workspace · bottom nav hide on job · DocChecklist 44px · L3 swipe + lock · offline queue · Capacitor back · GDS GLOBAL-UX-02  
- Shared: `app-viewport.ts` · `modal-scroll-lock` · font 16px  

---

## 14. Relacja do poprzednich epików

| Epic / doc | Relacja |
|------------|---------|
| MOBILE-UX-AUDIT-01 | Potwierdza M-100DVH / MUX-E — ten AUDIT **doprecyzowuje** Worker+Inspector jako owner surface |
| MUX-B1 | Lock L3/L5 częściowo zamknięty; **zoom + unify + Worker LB** nadal tu |
| Mobile Recovery | Jobs MV-2 history — wzorzec dla W-07 / I-15 |
| GLOBAL-UX-02 | Paint Inspector DONE — nie rozwiązuje viewport |
| WM-RYSUNKI-MOBILE | Osobny epic (Rysunki) — **nie** mieszać |

---

## 15. Werdykt AUDIT

```text
AUDIT STATUS:     COMPLETE / PASS (dokument gotowy)
IMPLEMENT:        BLOCKED — czekaj Owner GO → DESIGN FREEZE
REKOMENDACJA DF:  START WIM-P0 (Viewport SSOT) — thin · REUSE --app-height
P0:               S-01 / W-01 / I-01
P1:               Capture · chrome · lightbox zoom · album
OUT:              CORE · AI · Cloud · WM Rysunki · GPS MVP

Następne: OWNER GO → DESIGN FREEZE (WIM-P0 lub epic DF thin)
```

---

*AUDIT ONLY · bez implementacji · bez commit · bez push.*
