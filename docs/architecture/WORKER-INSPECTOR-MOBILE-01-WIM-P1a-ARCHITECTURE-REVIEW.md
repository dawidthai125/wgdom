# WORKER-INSPECTOR-MOBILE-01 — WIM-P1a ARCHITECTURE REVIEW

> **ID:** WORKER-INSPECTOR-MOBILE-01-WIM-P1a-ARCHITECTURE-REVIEW  
> **EPIC:** WORKER-INSPECTOR-MOBILE-01  
> **SLICE:** **WIM-P1a** — Capture & Privacy (Worker)  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-04  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P1a-AUDIT.md) (**PASS**) · [`WORKER-INSPECTOR-MOBILE-01-WIM-P1a-DESIGN-FREEZE.md`](./WORKER-INSPECTOR-MOBILE-01-WIM-P1a-DESIGN-FREEZE.md) (**FROZEN**)  
> **Kontekst:** [`WORKER-INSPECTOR-MOBILE-01-AUDIT.md`](./WORKER-INSPECTOR-MOBILE-01-AUDIT.md) · WIM-P0 **CLOSED**  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · **2.66.06** / **`1f04f559`**  
> **Kod read-only:** `WorkerPhotoView.tsx` · `HiddenFileInput.tsx` · `privacy-shield.ts` · `useWorkerPrivacyShield.ts` · `photo-queue.ts` · `app-viewport.ts` · `mobile.css`  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WIM-P1a — ARCHITECTURE REVIEW

WERDYKT: PASS

WIM-DF-P1a-01:  PASS (macierz G/A/R-cam/R-file wykonalna)
REUSE FIRST:    PASS (HiddenFileInput · privacy · upload/queue)
ZERO DUPLICATE: PASS (brak nowego capture lib)
BOUNDARY:       PASS (Worker picker only · Inspector OUT)
THIN SLICE:     PASS (≤4 pliki allowlist)
AC-P1a-01…12:   PASS (wykonalne · mierzalne)
ROLLBACK:       PASS (UI-only revert)
RISKS:          ACCEPTABLE (mitygacje w DF)

Blokery Cloud/JSON/API/Payroll CORE/AI/Viewport: BRAK
DF thin amend:  NIE WYMAGANY
  (AR wiąże tylko otwarte wybory D-P1a-01 / D-P1a-09)

READY FOR: Owner GO → IMPLEMENT (WIM-P1a)
IMPLEMENT / COMMIT / PUSH: NIE (ten dokument)
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF WIM-P1a ↔ AUDIT W-02/W-03/W-04 ↔ living Worker capture/privacy |
| **FAIL** | Wymaga Cloud/Payroll CORE · niewykonalny Safari · boundary broken |
| **CHANGE REQUIRED / PASS WITH DF CORRECTIONS** | DF nie domyka ownership / sprzeczność SSOT |
| **PASS** | Brak blokerów + DF kompletny · AR może tylko **wiązać** wybory już delegowane w DF |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy WIM-DF-P1a-01 jest wykonalny thin? | **TAK** — REUSE `HiddenFileInput` |
| Czy AUDIT findings mają mapę na DF? | **TAK** — W-02→A · W-03→HFI · W-04→R-cam/R-file |
| Czy są blokery CORE? | **NIE** |
| Czy DF wymaga korekt przed IMPLEMENT? | **NIE** |
| Czy wolno IMPLEMENT po Owner GO? | **TAK** |

**WERDYKT: PASS**

---

## 2. Checklist weryfikacji (żądane tematy)

| # | Temat | Werdykt | Uzasadnienie |
|---|-------|---------|--------------|
| **1** | Zgodność z SSOT | **PASS** | Picker SSOT = `HiddenFileInput` (DF §0.2) · Viewport SSOT WIM-P0 READ-ONLY (D-P1a-06) · tip 2.66.06 nietknięty do COMMIT |
| **2** | REUSE FIRST | **PASS** | HFI · `privacy-shield` · hook · Galeria G · `handleFiles` / `submitReceipt` / watermark / `uploadPhoto` / `queuePhoto` / `uploadReceipt` — zero rewrite |
| **3** | ZERO DUPLICATE LOGIC | **PASS** | Z-06 zakaz capture-lib · Z-03 suppress tylko przez HFI · nie drugi blur-guard |
| **4** | Boundary Contract | **PASS** | UI „jak wybieramy plik” vs data „co zapisujemy” · Inspector OUT (D-P1a-08) · Cloud/Edge FORBIDDEN |
| **5** | Thin Slice | **PASS** | 1 concern · allowlist ≤4 · FAST RELEASE posture |
| **6** | File Allowlist | **PASS** | `WorkerPhotoView` + smoke NEW + changelog@COMMIT · HFI/privacy READ-ONLY |
| **7** | AC-P1a-01…12 | **PASS** | Wszystkie mierzalne (grep/smoke/device/diff) — §4 |
| **8** | Rollback | **PASS** | `git revert` UI-only · bez KV/schema · nie cofa WIM-P0 |
| **9** | Risk Assessment | **PASS** | R-P1a-01…10 sklasyfikowane · brak High bez mitygacji (§6) |
| **10** | Payroll Safety Gate | **PASS** | FEATURE thin · merge/extraCosts model OUT · tylko call-site `submitReceipt` |
| **11** | Admin Mobile Viewport Contract | **PASS** | Nie otwierany · `.worker-shell` / `app-viewport` poza allowlistą |

---

## 3. Target architecture (WIM-P1a)

```text
WorkerPhotoView.worker-shell          ← WIM-P0 READ-ONLY
└─ scroll
   ├─ Zdjęcia
   │  ├─ G  HiddenFileInput multiple · NO capture
   │  │      → onGalleryPick → preview → submitGallery
   │  │      → uploadFilesBatch → watermark → uploadPhoto | queuePhoto
   │  │
   │  └─ A  ×3 (Przed / W trakcie / Po)
   │         HiddenFileInput capture=environment · NO multiple
   │         → handleFiles(files, label)   ← REUSE
   │
   ├─ Wypłata · Paragon
   │  ├─ R-cam  HFI capture · image (IMAGE_ACCEPT) → submitReceipt(file)
   │  └─ R-file HFI NO capture · image+pdf         → submitReceipt(file)
   │
   └─ PrivacyShield (hook AS-IS)
        suppress ← wyłącznie HiddenFileInput.open / onChange
```

**Evidence gap dziś (pre-IMPLEMENT — oczekiwany):**

| Ścieżka | Stan kodu (read-only 2026-08-04) |
|---------|----------------------------------|
| **G** | PASS — już HFI multiple |
| **A** | FAIL — raw `<input multiple capture>` ~1343 |
| **R** | FAIL — raw `<input accept=image+pdf capture>` ~1010 |

DF zamyka A/R bez zmiany pipeline upload.

---

## 4. AR bindings (otwarte wybory DF — bez amend)

DF świadomie zostawił AR wybór w **D-P1a-01** i preferencję w **D-P1a-09**. Poniższe jest **wiążące dla IMPLEMENT** (nie wymaga zmiany tekstu DF).

| ID | Temat | Decyzja AR |
|----|-------|------------|
| **WIM-AR-P1a-01** | Forma szybkiego aparatu (D-P1a-01) | **3× `HiddenFileInput`** — po jednym w wierszu Przed / W trakcie / Po (`LABELS.map`). **Zakaz** wspólnego HFI + pending-label state w P1a (więcej state = zbędna złożoność). Każdy: `capture="environment"` · bez `multiple` · `onPick` → `handleFiles(files, lbl.value)`. CTA = `WgButton`/`button` + `WG_TOUCH_MIN` · **nie** `<label>`+raw input. |
| **WIM-AR-P1a-02** | Accept image (D-P1a-09) | **A** i **R-cam**: domyślny / jawny **`IMAGE_ACCEPT`** (REUSE export z `HiddenFileInput`). **R-file**: `image/*,application/pdf,.pdf` (lub równoważne obejmujące PDF). **Zakaz** samego `image/*` na A/R-cam jeśli odcina HEIC względem Galerii. |
| **WIM-AR-P1a-03** | Smoke AC-P1a-01 | Grep **tylko** `WorkerPhotoView.tsx` pod kątem raw `<input … type="file"` / `type="file"` w JSX Workera — **nie** failować na `HiddenFileInput.tsx` (tam input jest SSOT). |
| **WIM-AR-P1a-04** | Comment-only HFI | **NIE** — zero diff `HiddenFileInput.tsx` w P1a (D-P1a-03 prefer wzmocniony). |

---

## 5. AC-P1a-01…12 — przegląd wykonalności

| AC | AR | Nota |
|----|-----|------|
| **01** | **PASS** | Po wire: 0 raw file w WorkerPhotoView · WIM-AR-P1a-03 |
| **02** | **PASS** | Z-01 · smoke M6 |
| **03** | **PASS** | WIM-AR-P1a-01 · 3× HFI capture |
| **04** | **PASS** | Z-04 · nie ruszać `onGalleryPick` body |
| **05** | **PASS** | D-P1a-02 · R-cam + R-file |
| **06** | **PASS** | Device OV · HFI suppress 15s/2s AS-IS |
| **07** | **PASS** | Diff guard upload path · device regresja |
| **08** | **PASS** | `submitReceipt` body REUSE |
| **09** | **PASS** | Allowlista FORBIDDEN list |
| **10** | **PASS** | NEW script w allowlist |
| **11** | **PASS** | Nie edytować `className="worker-shell"` / shell CSS |
| **12** | **PASS** | `WG_TOUCH_MIN` na CTA A/R |

**Luka produktowa (nie FAIL):** AC-P1a-06 / device OV są **po** IMPLEMENT — AR nie zastępuje Device OV.

---

## 6. Risk Assessment (AR)

| ID | Sev | AR | Werdykt |
|----|-----|-----|---------|
| **R-P1a-01** | Low | Cel kontraktu (single camera) | **ACCEPT** |
| **R-P1a-02** | Med | 2 CTA · touch 44px · krótkie etykiety | **ACCEPT** · verify layout Wypłata w OV |
| **R-P1a-03** | High | Allowlista + OUT | **MITIGATED** |
| **R-P1a-04** | Med | Z-04 | **MITIGATED** |
| **R-P1a-05** | Med | Device OV brama CLOSE | **ACCEPT** · obowiązkowe |
| **R-P1a-06** | Low | Smoke M5 | **MITIGATED** |
| **R-P1a-07** | High | Gate + allowlista | **MITIGATED** |
| **R-P1a-08** | Med | D-P1a-06 | **MITIGATED** |
| **R-P1a-09** | Low | bez `multiple` na A | **ACCEPT** |
| **R-P1a-10** | Low | WIM-AR-P1a-02 IMAGE_ACCEPT | **MITIGATED** |

**Brak ryzyka High bez mitygacji. Brak ryzyka CORE.**

### 6.1 Nota IMPLEMENT (nie DF correction)

Przy `receiptUploading === true` **oba** CTA R-cam/R-file → disabled/`pointer-events-none` (parity z obecnym single „Skan”).

---

## 7. Rollback — potwierdzenie AR

| Element | AR |
|---------|-----|
| Metoda | `git revert` feature commit P1a |
| Zakres | WorkerPhotoView + smoke + changelog tip |
| **NIE** revert | WIM-P0 viewport tip |
| Dane | Brak migracji — **PASS** bezpieczny |
| Tip po rollback | 2.66.06 / `1f04f559` (lub tip sprzed bumpa P1a) |

---

## 8. Boundary OUT (potwierdzone)

| OUT | AR |
|-----|-----|
| Inspector capture / FAB / gallery / billing | **POTWIERDZONE OUT** → WIM-P1b |
| Viewport / `app-viewport` / shell CSS | **POTWIERDZONE OUT** (WIM-P0) |
| Privacy shield redesign · HFI rewrite | **POTWIERDZONE OUT** |
| Upload / queue / Cloud / Payroll CORE / AI | **POTWIERDZONE OUT** |
| Lightbox · chrome · history · landscape | **POTWIERDZONE OUT** |

---

## 9. Final recommendation przed IMPLEMENT

```text
1. Owner GO → IMPLEMENT WIM-P1a (ten AR = PASS · DF FROZEN bez amend).
2. Implementacja (allowlista):
   - WorkerPhotoView:
       · A: 3× HiddenFileInput capture · IMAGE_ACCEPT · → handleFiles
       · R: 2× HiddenFileInput (R-cam / R-file) → submitReceipt
       · usuń raw <input type="file">
       · copy D-P1a-07 · WG_TOUCH_MIN
       · Galeria G: ZERO zmian semantyki
   - scripts/test-worker-inspector-mobile-p1a.mjs (M1–M6)
   - changelog dopiero przy Owner GO COMMIT
3. WIM-AR-P1a-01…04 przestrzegać.
4. build + smoke + diff guard → Owner OV device → GO COMMIT → GO PUSH → PV → CLOSE.
5. NIE startuj WIM-P1b bez kolejnego Owner GO → AUDIT.
```

**Gotowość:** **READY FOR IMPLEMENT** po Owner **GO IMPLEMENT**.

---

## 10. Werdykt

| Pole | Wartość |
|------|---------|
| **Architecture Review** | **COMPLETE** |
| **PASS / FAIL** | **PASS** |
| **WIM-DF-P1a-01** | **PASS** |
| **DF amend wymagany** | **NIE** |
| **AR bindings** | **WIM-AR-P1a-01…04** (wiążące) |
| **Blokery CORE** | **BRAK** |
| **IMPLEMENT** | **BLOCKED** do Owner **GO IMPLEMENT** |
| **COMMIT / PUSH** | **BLOCKED** |

```text
ARCHITECTURE REVIEW PASS

Następne: OWNER GO → IMPLEMENT (WIM-P1a)
Nie zmieniaj kodu w tej fazie.
```

---

*ARCHITECTURE REVIEW ONLY · bez implementacji · bez zmian kodu · bez commit · bez push.*
