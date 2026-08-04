# WORKER-INSPECTOR-MOBILE-01 WIM-P1a — AUDIT (Capture & Privacy Worker)

> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01 · **Slice:** **WIM-P1a**  
> **STATUS:** **AUDIT COMPLETE / PASS**  
> **FAZA:** AUDIT ONLY · **IMPLEMENT BLOCKED**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO AUDIT** (WIM-P1a)  
> **Następne:** Owner **GO → DESIGN FREEZE** (tylko)  
> **Tip prod (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.06** / **`1f04f559`** · WIM-P0 **CLOSED**  
> **Bazowy AUDIT epic:** [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md) · findings **W-02 / W-03 / W-04** · RCA-02  
> **WIM-P0 CLOSE:** [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P1a — AUDIT COMPLETE / PASS

SCOPE: Capture & Privacy (Worker) ONLY
BASE:  WIM-P0 Viewport SSOT CLOSED (REUSE · nie ruszać)
OUT:   IMPLEMENT · COMMIT · PUSH · Inspector capture ·
       Lightbox · Chrome · Cloud · Payroll · AI · Rysunki

ZAMYKA: W-02 · W-03 · W-04
WERDYKT: GOTOWY DO DESIGN FREEZE (thin)
════════════════════════════════════════════════════════
```

---

## 0. Executive Summary

Po **WIM-P0** shell Worker/Inspector pije `--app-height` (PASS). Residual terenowy **#1** u Workera to **kontrakt wyboru pliku**:

| Ścieżka | Mechanizm dziś | Privacy suppress | Problem |
|---------|----------------|------------------|---------|
| **Galeria — wiele** | `HiddenFileInput` `multiple` · **bez** `capture` | **TAK** (built-in) | **PASS** — wzorzec REUSE |
| **Szybki aparat** | raw `<input multiple capture="environment">` w `<label>` | **NIE** | **W-02** + **W-03** |
| **Paragon „Skan”** | raw `<input accept=image/*,pdf capture>` w `<label>` | **NIE** | **W-03** + **W-04** |

**Root theme:** część Workera już ma SSOT (`HiddenFileInput` + `suppressPrivacyShieldBriefly`); ścieżki aparat/paragon omijają go → iOS blur otwiera Privacy Shield; `multiple`+`capture` oraz PDF+`capture` są nieprzewidywalne na Safari/Android.

**Viewport SSOT (WIM-P0):** **OUT** tego slice — nie zmieniać `.worker-shell` / `app-viewport.ts`.  
**Inspector capture (I-09):** **OUT** → **WIM-P1b**.

**Werdykt:** **GOTOWY DO DESIGN FREEZE** · thin · REUSE FIRST · zero upload/Cloud rewrite.

---

## 1. RCA

### RCA-P1a-01 — Capture API drift (Worker) · **W-02**

```text
CAUSE:
  „Szybki aparat” = <input type=file accept=image/* multiple capture="environment">
  HTML: multiple + capture razem = undefined behavior (Safari często 1 klatka;
  Android/intent różnie traktuje multi vs forced camera).

EFFECT:
  Użytkownik myśli „seria z aparatu”; OS daje 1 zdjęcie LUB galerię mimo capture;
  niespójność vs karta „Galeria — wiele” (już bez capture).

FIX CLASS (thin):
  Aparat = HiddenFileInput capture="environment" · BEZ multiple · 1 plik.
  Galeria = istniejący HiddenFileInput multiple · BEZ capture (bez zmian semantyki).
```

### RCA-P1a-02 — Privacy shield vs system picker · **W-03**

```text
CAUSE:
  useWorkerPrivacyShield: blur/visibility → full-screen shield z-[200]
    („Dane wypłat ukryte”), chyba że isPrivacyShieldSuppressed().
  suppressPrivacyShieldBriefly() wołane TYLKO z HiddenFileInput.open/onChange.
  Raw <input> w label (aparat + paragon) NIE woła suppress → blur okna
  przy otwarciu aparatu/pickera = shield zasłania UI / race z powrotem.

EFFECT:
  Safari/iOS: camera/picker → blur → shield; po powrocie focus race;
  zły UX / wrażenie „zawieszenia”; ryzyko utraty kontekstu CTA.

FIX CLASS (thin):
  Każdy Worker file-input → HiddenFileInput (suppress 15s open + 2s onChange).
  Nie przepisywać useWorkerPrivacyShield / privacy-shield.ts (REUSE as-is).
```

### RCA-P1a-03 — Receipt PDF + capture · **W-04**

```text
CAUSE:
  Paragon „Skan”: accept="image/*,application/pdf" + capture="environment"
  Capture wymusza ścieżkę kamery → PDF z plików/„Pliki” utrudniony lub niemożliwy.

EFFECT:
  Pracownik nie może wygodnie wybrać skanu PDF paragonu;
  etykieta „Skan” sugeruje tylko aparat mimo accept PDF.

FIX CLASS (thin):
  Rozdziel:
    · Zdjęcie paragonu (aparat): HiddenFileInput capture · accept image · BEZ multiple
    · Plik PDF/obraz z dysku: HiddenFileInput BEZ capture · accept image+pdf
  LUB (jeśli Owner w DF wybierze minimalniej):
    jeden picker BEZ capture (image+pdf) + osobny przycisk aparat (image+capture).
  Upload receipt (uploadReceipt / syncWeekEmployees) = REUSE as-is.
```

### RCA-P1a-04 — Boundary po WIM-P0 (nie regresja)

```text
CAUSE (historyczna, ZAMKNIĘTA w P0):
  100dvh bez --app-height.

STATUS:
  WIM-P0 CLOSED · .worker-shell = var(--app-height, 100dvh).
  WIM-P1a NIE otwiera ponownie viewportu.
```

---

## 2. Current Architecture

### 2.1 Mobile Viewport SSOT (WIM-P0 — **READ-ONLY** dla P1a)

```text
main.tsx → initAppViewport() → --app-height (visualViewport)
mobile.css:
  .admin-app-shell / .worker-shell / .inspector-shell
    height+max-height: var(--app-height, 100dvh)
    overflow: hidden · min-height: 0
WorkerPhotoView root: className="worker-shell …"
InspectorShell: .inspector-shell
Suspense Inspector: height+maxHeight var(--app-height)

WIM-P1a: ZERO zmian w app-viewport.ts / shell CSS / shell classNames.
```

### 2.2 Worker Mobile — layout (skrót)

```text
AppInnerWithAuth [worker]
└─ WorkerPhotoView.worker-shell
   ├─ Header + safe-area-top
   ├─ Tabs: Roboty | Grafik | Wypłata
   └─ Scroll (mobile-view-scroll / overscroll-contain · data-keyboard-aware)
        ├─ Lista LUB detal roboty
        │    ├─ Progress · Zdjęcia
        │    │    ├─ Galeria: HiddenFileInput multiple     ← PASS
        │    │    └─ Szybki aparat: raw input multi+capture ← FAIL W-02/W-03
        │    └─ JobReportForm
        ├─ Wypłata → Paragon „Skan”: raw input pdf+capture  ← FAIL W-03/W-04
        └─ PrivacyShield fixed inset-0 z-[200] (blur/hidden)
```

### 2.3 Capture Flow (Worker) — stany

| ID | UI | Input | multiple | capture | accept | suppress | Upload path |
|----|-----|-------|----------|---------|--------|----------|-------------|
| **G** | Galeria — wiele | `HiddenFileInput` | yes | — | default images | yes | preview → `uploadFilesBatch` → watermark → `uploadPhoto` / `queuePhoto` |
| **A** | Szybki aparat (label×3) | raw `<input>` | **yes** | **environment** | `image/*` | **no** | `handleFiles` → ten sam batch |
| **R** | Paragon Skan | raw `<input>` | no | **environment** | `image/*,application/pdf` | **no** | `submitReceipt` → `uploadReceipt` → `syncWeekEmployees` |

### 2.4 Privacy

| Element | Plik | Rola |
|---------|------|------|
| Suppress timer | `src/lib/privacy-shield.ts` | `suppressPrivacyShieldBriefly` / `isPrivacyShieldSuppressed` |
| Hook | `src/app/hooks/useWorkerPrivacyShield.ts` | blur / visibility / contextmenu |
| UI | `WorkerPhotoView` overlay z-[200] | „Dane wypłat ukryte” |
| Integracja | `HiddenFileInput` | jedyny konsument suppress w Worker UI dziś |

### 2.5 Upload / Cache (boundary — **nie redesign**)

| Warstwa | Plik | Stan |
|---------|------|------|
| Watermark | `prepareWatermarkedPhoto` (`app-domain`) | REUSE |
| Upload photo | `uploadPhoto` | REUSE |
| Offline queue | `photo-queue.ts` (IndexedDB) | REUSE · tylko job photos (nie paragony) — W-05 = P2 OUT |
| Receipt upload | `uploadReceipt` | REUSE |
| Sync jobs / week | `syncJobs` / `syncWeekEmployees` | REUSE · **zakaz** Cloud CORE rewrite |

### 2.6 Inspector Mobile (boundary — **OUT P1a**)

| Surface | Capture dziś | Slice |
|---------|--------------|-------|
| `InspectorPhotoGallery` | `HiddenFileInput` + `capture` · **bez** album split | **WIM-P1b** |
| `InspectorQuickPhotoFab` | `HiddenFileInput` + `capture` | **WIM-P1b** |
| `InspectorBillingProposalModal` | image `multiple`+`capture` + PDF osobno | **WIM-P1b** (nota: też drift multi+capture) |
| Viewport / chrome / LB | — | P0 CLOSED / P1c / P1d |

Inspector **już** używa `HiddenFileInput` (privacy Worker-only) — problem I-09 = brak ścieżki album, nie shield.

---

## 3. Reuse Map

| Asset | REUSE? | Uwagi |
|-------|--------|-------|
| **`HiddenFileInput`** | **MUST** | suppress + programmatic click — SSOT pickera |
| **`privacy-shield.ts`** | **as-is** | bez zmian API |
| **`useWorkerPrivacyShield`** | **as-is** | bez redesign shield UI |
| **Galeria `HiddenFileInput multiple`** | **KEEP** | wzorzec „bez capture” |
| **`handleFiles` / `uploadFilesBatch` / `onGalleryPick`** | **KEEP** | tylko zmiana wejścia plików z aparatu |
| **`submitReceipt` / `uploadReceipt`** | **KEEP** | tylko zmiana pickera |
| **`photo-queue` / `uploadPhoto` / watermark** | **KEEP** | OUT redesign |
| **`.worker-shell` / `app-viewport.ts`** | **KEEP** | WIM-P0 FROZEN |
| **Inspector pickers** | **NIE ruszać** | WIM-P1b |
| **Jobs admin `HiddenFileInput`** | wzorzec | nie mieszać w allowliście P1a |
| **Nowy lib capture-contract** | **NIE** (prefer) | zero duplicate — atrybuty na `HiddenFileInput` wystarczą |

---

## 4. Risks

| ID | Ryzyko | Sev | Mitygacja DF |
|----|--------|-----|--------------|
| **R-P1a-01** | iOS nadal 1 plik mimo „aparat” po usunięciu `multiple` | Low | To **cel** kontraktu · copy UI „1 zdjęcie” |
| **R-P1a-02** | Dwa CTA paragon (aparat vs PDF) = clutter Wypłata | Med | DF: max 2 touch targets · etykiety PL jasne · `WG_TOUCH_MIN` |
| **R-P1a-03** | Scope creep → Inspector / lightbox / toast | High | Twarde OUT · allowlista plików |
| **R-P1a-04** | Regresja galerii multi (preview/revoke URL) | Med | Nie zmieniać `onGalleryPick` / submitGallery |
| **R-P1a-05** | Field FAIL Safari mimo unit PASS | Med | Device OV: iPhone Safari + Android · aparat + galeria + PDF + shield |
| **R-P1a-06** | `label`+`sr-only` residual gdzieś indziej w Worker | Low | Grep `type="file"` w `WorkerPhotoView` = 0 raw po IMPLEMENT |
| **R-P1a-07** | Payroll week / extraCosts merge | High jeśli ruszony | **Zakaz** zmian sync/merge — tylko UI picker |
| **R-P1a-08** | Viewport regresja przy edycji layout | Med | Nie edytować shell / mobile.css viewport |

---

## 5. Scope IN

| IN | Evidence / cel |
|----|----------------|
| Worker **Szybki aparat** → `HiddenFileInput` `capture="environment"` · **bez** `multiple` | W-02 · W-03 |
| Worker **Paragon** → pickery z suppress · rozdział capture vs PDF/plik | W-03 · W-04 |
| Copy/hint UI (1 zdjęcie · PDF bez aparatu) | AC czytelność |
| Zachowanie istniejącej **Galerii** (multi, no capture) | regresja PASS |
| Smoke/unit markery: brak `multiple`+`capture` w WorkerPhotoView; raw file input = 0 | test |
| Changelog bump **tylko** przy Owner GO COMMIT (nie w AUDIT) | proces |

**Allowlista plików (propozycja DF):**

| Plik | Rola |
|------|------|
| `src/app/WorkerPhotoView.tsx` | aparat + paragon → HiddenFileInput · copy |
| `scripts/test-worker-inspector-mobile-p1a.mjs` (NEW) | smoke: markery kontraktu |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | przy GO COMMIT |

Opcjonalnie (tylko jeśli DF wymaga shared helper **bez** nowej logiki biznesowej):  
`src/app/HiddenFileInput.tsx` — **tylko** jeśli trzeba doprecyzować typy/docs; **prefer zero zmian**.

---

## 6. Scope OUT

| OUT | Powód |
|-----|-------|
| IMPLEMENT / commit / push | AUDIT ONLY |
| **Inspector** capture / FAB / PhotoGallery / Billing multi+capture | **WIM-P1b** |
| Lightbox Worker/Inspector · pinch | **WIM-P1d** |
| CommandLayer / job chrome | **WIM-P1c** |
| `history.pushState` / landscape | **WIM-P2*** |
| Offline queue dla paragonów (W-05) | P2 |
| Toast/sonner Worker (W-06) | P2 |
| Privacy shield **redesign** / copy / z-index | OUT — tylko suppress via HiddenFileInput |
| `privacy-shield.ts` / hook rewrite | REUSE |
| `uploadPhoto` / `uploadReceipt` / `photo-queue` / watermark | REUSE |
| `cloud-sync` · Edge · Payroll CORE · Hours-wipe | CORE |
| AI · WM Rysunki · GPS | osobne |
| `app-viewport.ts` · `.worker-shell` CSS | WIM-P0 FROZEN |
| Admin Jobs photo upload | poza Worker |

---

## 7. Thin Slice

```text
WIM-P1a = Capture & Privacy (Worker) ONLY

  1) Aparat: HiddenFileInput · capture · single file · → handleFiles
  2) Galeria: bez zmian semantyki (już PASS)
  3) Paragon: suppress + rozdział PDF vs kamera
  4) Smoke markery + device OV po IMPLEMENT

NIE: Inspector · LB · chrome · viewport · Cloud · queue semantics
```

**Zamyka findings:** **W-02**, **W-03**, **W-04** (z epic AUDIT).  
**Nie zamyka:** I-09, W-05…W-11, lightbox, viewport (już P0).

**Szacunek powierzchni:** ~1 plik UI + 1 smoke · &lt;15 plików release · FAST RELEASE candidate po GO.

---

## 8. Design Freeze Proposal

> **Status:** **PROPOSAL ONLY** — nie FROZEN aż Owner **GO DESIGN FREEZE**.

### 8.1 Kontrakt capture (WIM-DF-P1a — draft)

| Ścieżka | `HiddenFileInput` | multiple | capture | accept |
|---------|-------------------|----------|---------|--------|
| **Aparat (job)** | TAK | **false** | `environment` | `image/*` (+ heic jak default IMAGE_ACCEPT OK) |
| **Galeria (job)** | TAK (istniejąca) | **true** | **omit** | default images |
| **Paragon — aparat** | TAK | **false** | `environment` | image only |
| **Paragon — plik/PDF** | TAK | **false** | **omit** | `image/*,application/pdf` (lub IMAGE + `.pdf`) |

**Zakaz:** `multiple` **razem z** `capture` w Worker.  
**Zakaz:** raw `<input type="file">` / `<label>`+sr-only dla tych ścieżek.  
**Nakaz:** każdy open → `suppressPrivacyShieldBriefly` (via HiddenFileInput).

### 8.2 Decyzje do zamrożenia w DF (Owner)

| ID | Decyzja draft | Alternatywa |
|----|---------------|-------------|
| **D-P1a-01** | Szybki aparat: 3 rzędy labeli → buttony + HiddenFileInput per label (lub 1 input + label state) | — |
| **D-P1a-02** | Paragon: **2** CTA („Aparat” + „Plik/PDF”) | 1 CTA bez capture (słabsze W-04) |
| **D-P1a-03** | Zero zmian `HiddenFileInput.tsx` | drobny comment-only OK |
| **D-P1a-04** | Zero zmian privacy lib/hook | — |
| **D-P1a-05** | Zero zmian upload/queue/sync | — |
| **D-P1a-06** | Viewport / mobile.css shell — nie tykać | — |

### 8.3 AC (draft)

| AC | Kryterium |
|----|-----------|
| **AC-P1a-01** | WorkerPhotoView: **0** raw `type="file"` |
| **AC-P1a-02** | Brak atrybutów `multiple`+`capture` na tym samym input w Worker |
| **AC-P1a-03** | Aparat job: `capture` · single · HiddenFileInput |
| **AC-P1a-04** | Galeria: `multiple` · bez `capture` (regresja) |
| **AC-P1a-05** | Paragon: możliwy PDF **bez** `capture`; zdjęcie z aparatem osobno |
| **AC-P1a-06** | Otwarcie pickera nie aktywuje Privacy Shield (suppress) — device OV |
| **AC-P1a-07** | Upload job photo + offline queue path bez zmian semantyki |
| **AC-P1a-08** | Zero diff: cloud-sync · payroll merge · app-viewport · Inspector capture files |
| **AC-P1a-09** | Smoke unit P1a PASS |

### 8.4 Test Matrix (draft)

| Warstwa | Co |
|---------|-----|
| Unit smoke | Markery: HiddenFileInput paths · no multi+capture · no raw file |
| Device OV Safari iPhone | Aparat → 1 zdjęcie · Galeria multi · PDF paragon · shield nie blokuje |
| Device OV Android Chrome | To samo + file intent |
| Regresja | Watermark · queue flush · Wypłata extraCosts pending |

### 8.5 Workflow po DF

```text
OWNER GO DESIGN FREEZE
  → DF doc FROZEN (+ decyzje D-P1a-*)
  → ARCHITECTURE REVIEW
  → OWNER GO IMPLEMENT
  → OV → COMMIT → PUSH → PV → CLOSE
```

---

## 9. Werdykt AUDIT

```text
AUDIT STATUS:     COMPLETE / PASS
SLICE:            WIM-P1a Capture & Privacy (Worker)
ZAMYKA:           W-02 · W-03 · W-04
REUSE:            HiddenFileInput · privacy-shield · upload/queue
OUT:              Inspector · viewport · Cloud · Payroll · LB · chrome
IMPLEMENT:        BLOCKED
COMMIT/PUSH:      BLOCKED

Następne: OWNER GO → DESIGN FREEZE (WIM-P1a)
Nie startuj IMPLEMENT bez DF FROZEN + AR + Owner GO IMPLEMENT.
```

---

*AUDIT ONLY · bez implementacji · bez zmian kodu · bez commit · bez push.*
