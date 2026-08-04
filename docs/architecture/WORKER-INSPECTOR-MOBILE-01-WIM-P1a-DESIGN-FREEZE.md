# WORKER-INSPECTOR-MOBILE-01 — WIM-P1a DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN**  
> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P1a-DESIGN-FREEZE  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01  
> **SLICE:** **WIM-P1a** — Capture & Privacy (Worker)  
> **FAZA:** **DESIGN FREEZE** · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data freeze:** 2026-08-04  
> **Wejście:** Owner **GO DESIGN FREEZE** · AUDIT **PASS**  
> **Parent AUDIT:** [`WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md)  
> **Epic AUDIT (context):** [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md) · W-02 / W-03 / W-04 · RCA-02  
> **Prior CLOSED:** [`WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P0-CLOSEOUT.md) · Viewport SSOT **READ-ONLY**  
> **Następne:** Owner **GO → ARCHITECTURE REVIEW** (tylko)  
> **Tip prod (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.06** / **`1f04f559`**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P1a DESIGN FREEZE — FROZEN

CEL: Worker Capture & Privacy contract
  · Aparat = HiddenFileInput · capture · SINGLE (bez multiple)
  · Galeria = KEEP (multiple · bez capture · już PASS)
  · Paragon = 2 CTA (Aparat | Plik/PDF) · zawsze suppress
  · Zero raw <input type="file"> w WorkerPhotoView

ZAMYKA: W-02 · W-03 · W-04

OUT (twarde):
  Inspector capture · lightbox · chrome · viewport
  Cloud · Payroll CORE · upload/queue rewrite · AI · Rysunki
  privacy-shield redesign · HiddenFileInput rewrite (prefer)

IMPLEMENT zakazany do: Owner GO → ARCHITECTURE REVIEW
  → GO IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 0. Cel slice (zamrożony · 1 zdanie)

**WIM-P1a** ujednolica **kontrakt wyboru pliku** w Panelu Pracownika: każdy picker przez `HiddenFileInput` (suppress Privacy Shield), aparat = single + `capture`, galeria bez zmian, paragon rozdzielony na aparat vs plik/PDF — **bez** zmian viewportu, Inspectora, upload/Cloud/Payroll CORE.

### 0.1 Relacja dokumentów

| Dokument | Rola |
|----------|------|
| [`WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md) | RCA · W-02/W-03/W-04 · wejście **ACCEPTED** |
| **Ten plik** | **SSOT decyzji WIM-P1a** — wygrywa konflikty zakresu slice |
| WIM-P0 DF / CLOSE | Viewport **FROZEN / CLOSED** — **nie** otwierać w P1a |
| WIM-P1b+ | Inspector capture · chrome · LB — **NIE** w tym DF |

**Konflikt zakresu:** ten plik wygrywa dla WIM-P1a.

### 0.2 Zasady FROZEN

| Zasada | Wiązanie |
|--------|----------|
| **SSOT FIRST** | Picker Worker = wyłącznie `HiddenFileInput` |
| **REUSE FIRST** | Galeria multi (PASS) · `privacy-shield` · `handleFiles` / `submitReceipt` / upload / queue |
| **ZERO DUPLICATE** | Zakaz nowego `capture-contract` lib · zakaz drugiego suppress mechanizmu |
| **THIN SLICE** | Tylko atrybuty pickera + CTA paragon + copy · zero product redesign |
| **Admin Viewport Contract** | WIM-P0 / `--app-height` — **READ-ONLY** |

---

## 1. PAYROLL SAFETY GATE

```text
PAYROLL SAFETY GATE — WIM-P1a

G1–G9: FEATURE thin · UI file picker only (WorkerPhotoView)
Cloud Sync / merge / DATA_KEY: ZERO
Edge / API / JSON schema: ZERO
Payroll Hours-wipe / carry / week merge: OUT
  (submitReceipt / syncWeekEmployees = REUSE call sites only —
   zakaz zmian logiki merge / extraCosts model)
AI / CORE: OUT
Viewport / app-viewport / shell CSS: OUT (WIM-P0)

Wynik: FEATURE Worker capture/privacy picker only
```

---

## 2. Final Design Freeze — kontrakt capture (WIM-DF-P1a)

### 2.1 Macierz ścieżek (wiążąca)

| ID | Ścieżka UI | Komponent | multiple | capture | accept | suppress |
|----|------------|-----------|----------|---------|--------|----------|
| **G** | Galeria — wiele | `HiddenFileInput` (**KEEP**) | **true** | **omit** | default `IMAGE_ACCEPT` | via HFI |
| **A** | Szybki aparat (Przed / W trakcie / Po) | `HiddenFileInput` (**NEW wire**) | **false** | **`environment`** | image (`IMAGE_ACCEPT` lub `image/*`) | via HFI |
| **R-cam** | Paragon — Aparat | `HiddenFileInput` | **false** | **`environment`** | image only | via HFI |
| **R-file** | Paragon — Plik/PDF | `HiddenFileInput` | **false** | **omit** | `image/*,application/pdf` (+ `.pdf` OK) | via HFI |

### 2.2 Zakazy / nakazy (FROZEN)

| # | Reguła |
|---|--------|
| **Z-01** | **ZAKAZ** `multiple` **razem z** `capture` na tym samym input w Worker |
| **Z-02** | **ZAKAZ** raw `<input type="file">` w `WorkerPhotoView.tsx` (w tym `<label>` + `sr-only`) |
| **Z-03** | **NAKAZ** każdy Worker file open → `suppressPrivacyShieldBriefly` wyłącznie przez `HiddenFileInput` |
| **Z-04** | **ZAKAZ** zmian semantyki **G** (`onGalleryPick` / preview / `submitGallery`) poza koniecznym touch copy |
| **Z-05** | **ZAKAZ** redesign Privacy Shield UI / z-index / copy / hook |
| **Z-06** | **ZAKAZ** nowego lib „capture contract” |
| **Z-07** | Po picku **A**: wołaj istniejące `handleFiles(files, label)` (pierwszy plik / FileList długości 1) |
| **Z-08** | Po picku **R-cam** / **R-file**: wołaj istniejące `submitReceipt(file)` — **jeden** `File` |

### 2.3 Decyzje szczegółowe (FROZEN)

| ID | Temat | Decyzja FROZEN |
|----|-------|----------------|
| **WIM-DF-P1a-01** | Capture & Privacy Contract (Worker) | Macierz § 2.1 + zakazy § 2.2 |
| **D-P1a-01** | Szybki aparat UX | Trzy rzędy (Przed / W trakcie / Po) pozostają; każdy = **`WgButton` (lub równoważny touch CTA) + `HiddenFileInput`** z `capture="environment"` · **bez** `multiple` · **bez** `<label>`+raw input. Prefer: osobny HFI per label (czytelność) **ALBO** jeden HFI + `galleryLabel`-style state — **AR może wybrać jedną formę**; semantyka atrybutów **nie** zmienia się. |
| **D-P1a-02** | Paragon CTA | **Dwa** osobne CTA: **„Aparat”** (**R-cam**) + **„Plik/PDF”** (**R-file**). Usunąć pojedynczy label „Skan” z raw input. Oba: `WG_TOUCH_MIN` · jasne etykiety PL. |
| **D-P1a-03** | `HiddenFileInput.tsx` | **Zero zmian kodu** (prefer). Comment-only dopuszczalne **tylko** po AR explicit. **Zakaz** zmiany timingów suppress (15s / 2s). |
| **D-P1a-04** | Privacy lib/hook | **`privacy-shield.ts`** + **`useWorkerPrivacyShield`** = **REUSE as-is** · zero diff |
| **D-P1a-05** | Upload / queue / sync | **`uploadPhoto` · `prepareWatermarkedPhoto` · `photo-queue` · `uploadReceipt` · `syncJobs` / `syncWeekEmployees` body** = **REUSE** · tylko call-site z nowego pickera |
| **D-P1a-06** | Viewport / shell | **Zero** zmian `app-viewport.ts` · `mobile.css` shell (`.worker-shell` / `.inspector-shell`) · className `worker-shell` |
| **D-P1a-07** | Copy UI | Aparat: hint „1 zdjęcie” (lub równoważne). Paragon: rozróżnienie Aparat vs Plik/PDF. Bez marketing noise. |
| **D-P1a-08** | Inspector | **OUT** — zero diff w `InspectorPhotoGallery` / `InspectorQuickPhotoFab` / `InspectorBillingProposalModal` / `InspectorJobFileUpload` |
| **D-P1a-09** | Accept aparat | Prefer REUSE `IMAGE_ACCEPT` z `HiddenFileInput` (heic/heif). Dopuszczalne `image/*` jeśli AR potwierdzi parity. |
| **D-P1a-10** | Multi-file z aparatu | **NIE** wspierane w P1a — seria = wyłącznie ścieżka **G** (galeria) |

### 2.4 Findings zamknięte tym DF (po IMPLEMENT)

| Finding | Zamknięcie |
|---------|------------|
| **W-02** | Aparat bez `multiple`+`capture` |
| **W-03** | Wszystkie pickery Worker → HFI suppress |
| **W-04** | PDF/plik bez `capture`; aparat osobno |

**Nie zamyka:** I-09 · W-05…W-11 · lightbox · chrome · viewport (P0).

---

## 3. Scope IN

| # | IN |
|---|-----|
| 1 | Worker **Szybki aparat** → `HiddenFileInput` · `capture="environment"` · **bez** `multiple` → `handleFiles` |
| 2 | Worker **Paragon** → dwa CTA (**R-cam** + **R-file**) → `submitReceipt` |
| 3 | Usunięcie raw `<input type="file">` z `WorkerPhotoView` |
| 4 | Copy/hint zgodne z D-P1a-07 |
| 5 | Zachowanie semantyki **Galerii** (multi · no capture) — regresja |
| 6 | Smoke `scripts/test-worker-inspector-mobile-p1a.mjs` (**NEW**) — markery kontraktu |
| 7 | `changelog-data.ts` + `CHANGELOG.md` — **tylko** przy Owner GO COMMIT (nie w DF/AR) |

---

## 4. Scope OUT

| OUT | Powód / defer |
|-----|----------------|
| IMPLEMENT / commit / push w tej fazie | DF only |
| **Inspector** capture / FAB / gallery / billing pickers | **WIM-P1b** |
| Lightbox · pinch · Worker LB | **WIM-P1d** |
| CommandLayer / job chrome compact | **WIM-P1c** |
| `history.pushState` · landscape | **WIM-P2*** |
| Offline queue paragonów (W-05) | P2 |
| Toast/sonner Worker (W-06) | P2 |
| Privacy Shield redesign / copy / z-index | OUT |
| Rewrite `privacy-shield.ts` / `useWorkerPrivacyShield` | OUT |
| Rewrite `HiddenFileInput` (logika suppress / click) | OUT (D-P1a-03) |
| `uploadPhoto` / `uploadReceipt` / watermark / `photo-queue` semantics | OUT |
| `cloud-sync.ts` · Edge · Payroll Hours-wipe / carry / merge model | CORE |
| `app-viewport.ts` · shell CSS · Suspense height | WIM-P0 FROZEN |
| AI · WM Rysunki · GPS · Admin Jobs upload | poza slice |
| Nowy shared capture lib | ZERO DUPLICATE |

---

## 5. File Allowlist

### 5.1 IN (wolno zmieniać przy GO IMPLEMENT)

| Plik | Rola |
|------|------|
| `src/app/WorkerPhotoView.tsx` | Aparat + paragon → HFI · copy · usunięcie raw inputs |
| `scripts/test-worker-inspector-mobile-p1a.mjs` | **NEW** — smoke markery WIM-P1a |
| `src/app/changelog-data.ts` | Bump wersji UI — przy GO COMMIT |
| `CHANGELOG.md` | Skrót — przy GO COMMIT |

### 5.2 READ-ONLY / VERIFY (nie diff semantyki)

| Plik | Rola |
|------|------|
| `src/app/HiddenFileInput.tsx` | REUSE as-is (prefer zero diff) |
| `src/lib/privacy-shield.ts` | REUSE |
| `src/app/hooks/useWorkerPrivacyShield.ts` | REUSE |
| `src/lib/photo-queue.ts` | REUSE |
| `src/lib/app-viewport.ts` | WIM-P0 |
| `src/styles/mobile.css` | WIM-P0 shells |

### 5.3 FORBIDDEN (zakaz w P1a)

| Plik / obszar |
|---------------|
| `src/lib/cloud-sync.ts` · Edge `make-server-*` |
| Payroll merge / Hours-wipe / carry libs (poza niezmienionym call `syncWeekEmployees` z UI) |
| `InspectorPhotoGallery.tsx` · `InspectorQuickPhotoFab.tsx` · `InspectorBillingProposalModal.tsx` · `InspectorJobFileUpload.tsx` · `InspectorPanel.tsx` · `InspectorShell.tsx` |
| AI / tenders / WM Rysunki panels |
| `git add -A` · obce WIP |

**Reguła:** plik spoza § 5.1 → **STOP** · Owner re-GO lub defer slice.

---

## 6. Reuse Contract

| Asset | Kontrakt |
|-------|----------|
| **`HiddenFileInput`** | **MUST** — jedyny picker Worker w P1a; suppress built-in |
| **`IMAGE_ACCEPT`** | Prefer na ścieżkach image (A, R-cam, G) |
| **Galeria G** | **KEEP** — `multiple` · no `capture` · istniejący `onGalleryPick` / preview / `submitGallery` |
| **`handleFiles` / `uploadFilesBatch*`** | **KEEP** — aparat woła istniejący pipeline |
| **`submitReceipt` / `uploadReceipt`** | **KEEP** — tylko źródło `File` z HFI |
| **`prepareWatermarkedPhoto` / `uploadPhoto` / `queuePhoto`** | **KEEP** — zero redesign |
| **`privacy-shield` + hook + overlay UI** | **KEEP as-is** |
| **`.worker-shell` / `--app-height`** | **KEEP** — WIM-P0 |
| **`WG_TOUCH_MIN` / WgButton / WgField** | REUSE design system |
| **Nowy capture helper module** | **FORBIDDEN** |

---

## 7. Boundary Contract

```text
┌─────────────────────────────────────────────────────────┐
│ WIM-P1a BOUNDARY                                        │
│                                                         │
│  IN:  WorkerPhotoView file-picker wiring + copy         │
│       + smoke markers                                   │
│                                                         │
│  WALL — nie przekraczać:                                │
│   · Inspector* pickers          → WIM-P1b               │
│   · Viewport / mobile.css shell → WIM-P0 CLOSED         │
│   · Privacy shield visuals      → OUT                   │
│   · Upload / IDB queue / API    → REUSE call only       │
│   · syncWeekEmployees merge     → REUSE call only       │
│   · Cloud / Edge / Payroll CORE → OUT                   │
│   · Lightbox / chrome / history → późniejsze slice      │
└─────────────────────────────────────────────────────────┘
```

| Granica | Reguła |
|---------|--------|
| **UI vs data** | Zmiana tylko **jak** wybieramy plik — nie **co** zapisujemy w job/week |
| **Worker vs Inspector** | Zero cross-edit Inspector w P1a |
| **P0 vs P1a** | Viewport nietknięty; capture wcześniej OUT w P0 — teraz IN tylko Worker |
| **Privacy** | Suppress = side-effect HFI; nie nowy event model |
| **Payroll** | `extraCosts` append path AS-IS; Gate G1–G9 FEATURE thin |

---

## 8. Acceptance Criteria

| AC | Kryterium | Warstwa |
|----|-----------|---------|
| **AC-P1a-01** | `WorkerPhotoView.tsx`: **0** raw `type="file"` (poza tym, co renderuje wyłącznie `HiddenFileInput`) | Unit / grep |
| **AC-P1a-02** | **0** inputów Worker z `multiple` **i** `capture` jednocześnie | Unit / grep |
| **AC-P1a-03** | Ścieżka **A**: `HiddenFileInput` · `capture="environment"` · **bez** `multiple` · woła `handleFiles` | Code + smoke |
| **AC-P1a-04** | Ścieżka **G**: `multiple` · **bez** `capture` — semantyka preview/submit **bez regresji** | Code + device |
| **AC-P1a-05** | Ścieżki **R-cam** + **R-file** obecne; PDF możliwy **bez** `capture`; aparat osobno | Code + device |
| **AC-P1a-06** | Otwarcie aparatu/pickera **nie** pokazuje Privacy Shield (suppress) | Device OV |
| **AC-P1a-07** | Upload job photo (online) + fallback `queuePhoto` (offline) — semantyka **bez zmian** | Device / regresja |
| **AC-P1a-08** | Paragon → `uploadReceipt` + pending `extraCosts` — semantyka **bez zmian** | Device / regresja |
| **AC-P1a-09** | Diff **zero** na: `cloud-sync.ts` · `app-viewport.ts` · Inspector capture files · `privacy-shield.ts` · hook | Diff guard |
| **AC-P1a-10** | Smoke `test-worker-inspector-mobile-p1a.mjs` **PASS** | CI/local |
| **AC-P1a-11** | Desktop/mobile layout shell Worker (`worker-shell`) **nietknięty** | Diff / visual smoke |
| **AC-P1a-12** | CTA aparat/paragon ≥ touch 44px (`WG_TOUCH_MIN`) | Code review |

---

## 9. Risks

| ID | Ryzyko | Sev | Mitygacja FROZEN |
|----|--------|-----|------------------|
| **R-P1a-01** | iOS i tak 1 klatka z aparatu | Low | **Cel** kontraktu · copy „1 zdjęcie” · seria = Galeria |
| **R-P1a-02** | Dwa CTA paragon = clutter na Wypłacie | Med | D-P1a-02 · `WG_TOUCH_MIN` · krótkie etykiety · layout flex gap |
| **R-P1a-03** | Scope creep Inspector / LB / toast | High | Allowlista § 5 · OUT § 4 |
| **R-P1a-04** | Regresja galerii (blob URL / revoke) | Med | Z-04 · nie edytować `onGalleryPick` body |
| **R-P1a-05** | Field FAIL Safari mimo unit PASS | Med | Verification Plan · Device OV obowiązkowe przed CLOSE |
| **R-P1a-06** | Residual raw input po partial edit | Low | AC-P1a-01 grep gate w smoke |
| **R-P1a-07** | Przypadkowa zmiana payroll merge | High | Allowlista · Gate · tylko `submitReceipt` call |
| **R-P1a-08** | Viewport regresja przy layout touch | Med | D-P1a-06 · nie edytować shell CSS |
| **R-P1a-09** | `handleFiles` z FileList length>1 po złym OS | Low | Aparat bez `multiple`; UI single; `handleFiles` AS-IS nadal bezpieczny |
| **R-P1a-10** | HEIC accept drift | Low | Prefer `IMAGE_ACCEPT` (D-P1a-09) |

---

## 10. Rollback Plan

```text
ROLLBACK WIM-P1a

1. TRIGGER:
   - Device OV FAIL (shield blokuje / brak PDF / aparat multi chaos)
   - Regresja upload/queue/receipt
   - PV FAIL po push

2. METHOD (prefer):
   git revert <feature-commit-WIM-P1a>
   → push main (tylko Owner GO)
   → verify version.json / smoke

3. SCOPE revert:
   WorkerPhotoView picker wiring + changelog bump + smoke script
   NIE revertować WIM-P0 (viewport) — osobny tip

4. DATA:
   Brak migracji KV / schema — rollback UI-only bezpieczny
   Offline queue / pending receipts już w IDB/week = nietknięte przez revert pickera

5. KOMUNIKACJA:
   Tip wraca do 2.66.06 / 1f04f559 (WIM-P0) lub poprzedni tip przed P1a bump
```

| Warunek | Akcja |
|---------|--------|
| FAIL przed commit | Nie commit · fix w working tree lub abort slice |
| FAIL po commit / przed push | Nie push · revert lokalny / nowy commit fix (Owner GO) |
| FAIL po PV | Owner GO → revert commit → push → CLOSE abort / hotfix |

---

## 11. Verification Plan

### 11.1 Przed GO COMMIT (po IMPLEMENT)

| # | Krok | PASS |
|---|------|------|
| V1 | `npm run build` | PASS |
| V2 | `npx vite-node scripts/test-worker-inspector-mobile-p1a.mjs` (lub `node`) | PASS |
| V3 | Grep guard: brak raw file + brak multi+capture w WorkerPhotoView | PASS |
| V4 | Diff guard: brak cloud-sync / app-viewport / Inspector capture / privacy-shield | PASS |
| V5 | Regresja wizualna: sekcja Galeria + Aparat + Wypłata paragony | PASS |

### 11.2 Smoke unit (wymagania skryptu)

| Marker | Oczekiwanie |
|--------|-------------|
| M1 | `HiddenFileInput` użyty dla aparatu (capture) |
| M2 | Galeria: `multiple` bez `capture` w tym samym HFI |
| M3 | Paragon: ścieżka bez `capture` z PDF w accept |
| M4 | Paragon: ścieżka z `capture` image |
| M5 | Brak `type="file"` poza HFI w WorkerPhotoView (statycznie: brak raw input JSX) |
| M6 | Brak wzorca `multiple`+`capture` w tym samym tagu/input props |

### 11.3 Device Owner Verification (przed CLOSE)

| Device | Scenariusz |
|--------|------------|
| **Safari iPhone** | Aparat 1 zdjęcie · Galeria multi · PDF paragon · Aparat paragon · shield **nie** zasłania podczas pickera · powrót z kamery OK |
| **Chrome Android** | To samo + file intent Plik/PDF |
| Regresja | Offline queue zdjęć robót · watermark · pending extraCost |

### 11.4 Po push (PV)

| # | Krok |
|---|------|
| P1 | Jedno `curl` `version.json` — oczekiwana wersja changelog |
| P2 | CDN/bundle markery kontraktu (jak WIM-P0 PV pattern) |
| P3 | **VERIFY DEPLOY FAST** — bez retry spam |

### 11.5 OUT of verification P1a

- Inspector album split (P1b)
- Lightbox zoom
- Landscape certification
- Fizyczna certyfikacja Capacitor poza standardowym native back AS-IS

---

## 12. Thin Slice / Release posture

```text
Powierzchnia: WorkerPhotoView + smoke (+ changelog przy COMMIT)
Plików release: typowo ≤ 4 · FAST RELEASE candidate
Jeden concern: Capture & Privacy Worker
Jeden tip bump: przy GO COMMIT (nie teraz)
```

---

## 13. Werdykt DESIGN FREEZE

```text
DF STATUS:        FROZEN
SLICE:            WIM-P1a Capture & Privacy (Worker)
KONTRAKT:         WIM-DF-P1a-01 + D-P1a-01…10
ZAMYKA:           W-02 · W-03 · W-04
ALLOWLIST:        WorkerPhotoView · smoke P1a · changelog@COMMIT
REUSE:            HiddenFileInput · privacy · upload/queue · Galeria G
OUT:              Inspector · viewport · Cloud · Payroll CORE · LB · chrome

IMPLEMENT:        BLOCKED
COMMIT/PUSH:      BLOCKED

Następne: OWNER GO → ARCHITECTURE REVIEW (WIM-P1a)
Nie startuj IMPLEMENT bez AR PASS + Owner GO IMPLEMENT.
```

---

*DESIGN FREEZE ONLY · bez implementacji · bez zmian kodu · bez commit · bez push.*
