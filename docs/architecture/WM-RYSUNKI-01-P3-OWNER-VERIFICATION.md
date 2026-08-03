# WM-RYSUNKI-01 P3 — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-01-P3-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P3 — ZIP PACKAGE INTEGRATION**  
> **FAZA:** **OWNER VERIFICATION** → **PASS**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **IMPLEMENT:** COMPLETE (lokalnie)  
> **Wersja changelog:** **2.66.00** (working tree, niecommitted)  
> **Data OV:** 2026-08-03  
> **Wejście:** Owner **GO OWNER VERIFICATION**  
> **AUDIT:** [`WM-RYSUNKI-01-P3-AUDIT.md`](./WM-RYSUNKI-01-P3-AUDIT.md) (**ACCEPTED**)  
> **DF:** [`WM-RYSUNKI-01-P3-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P3-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P3-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION COMPLETE · **NO COMMIT** · **NO PUSH**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P3 — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

P3  32 PASS · P2 28 · P1B 32 · P1 43 · P0 33
build PASS (IMPLEMENT) · changelog 2.66.00

Punkty OV 1–9: PASS
AC-P3-01…11: PASS
MR-P3-01…06 · D-P3-16…20 · D-AR-P3-01…05: PASS
AUDIT · DF · AR: zgodne

OUT respektowane:
  nowy ZIP/PDF builder · Cloud drawings merge · Payroll · Points · CAD/DXF

COMMIT: NIE
PUSH: NIE
NEXT: Owner GO COMMIT (allowlist P3 only)
════════════════════════════════════════════════════════
```

---

## 0. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy P3 spełnia AUDIT + DF + AR + AC? | **TAK** |
| Czy punkty OV 1–9 przechodzą? | **TAK** |
| Czy są blokery przed COMMIT? | **NIE** (allowlist P3) |
| Regresja P0 / P1 / P1B / P2 | **BRAK** |
| Cloud merge drawings / Payroll / Punkty w P3? | **NIE** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna | `test-wm-rysunki-01-p3.mjs` (32) · P2 · P1B · P1 · P0 |
| Statyczna | `zip-entries.ts` · `generate-zip.ts` · publications · `WmPrintView` · audit |
| Kontrakt | DF AC-P3-01…11 · AR MR/D-AR · Owner D-P3-16…20 |
| Git scope | allowlist P3 vs obce WIP (CloudLoader/Payroll — **nie** P3) |

---

## 2. Punkty OV (Owner checklist 1–9)

### 1. 0 Final → ZIP bez folderu `Rysunki/`

| | |
|--|--|
| **Kod** | `buildWmPrintDeliveryZipBytes`: `includeDrawings` → `listFinalDrawingsForJob`; append **tylko** gdy `finals.length > 0` — brak pustego `zip.folder("Rysunki")` |
| **D-AR-P3-03** | pusty `Rysunki/` **nie** tworzyć — **PASS** |
| **Test** | T09–T10 (count/list finals only) |
| **Wynik** | **PASS** |

### 2. 1 Final → `Rysunki/RYSUNEK_xxx.pdf`

| | |
|--|--|
| **Kod** | `prepareDrawingZipFileEntries` → `generateDrawingPdf` 1× → `drawingPdfFileName` → `appendNamedFilesToZip(..., "Rysunki", …)` |
| **Test** | T14–T17 · T19 · T01 |
| **Wynik** | **PASS** |

### 3. N Final → kolizje → `_{shortId}`

| | |
|--|--|
| **Kod** | `applyDrawingZipNameCollision` · `drawingZipShortId` = 6 znaków id bez `-` (D-AR-P3-02) |
| **Test** | T11–T13 · T31–T32 |
| **Wynik** | **PASS** |

### 4. Manifest sekcja `Rysunki` — additive

| | |
|--|--|
| **Kod** | `DeliveryPackageManifestFolder` + `"Rysunki"` · `folderFromPath` · `groupBy` Odbiory→Pomiary→Rysunki · fingerprint `schemaVersion: 1` + `includeDrawings` / `drawingDigests` · normalize defaults `rysunkiFileCount: 0` / `includeDrawings: false` |
| **D-AR-P3-01** | schemaVersion zostaje 1 · pola additive — **PASS** |
| **Test** | T20–T26 |
| **D-P3-19** | publish: ZIP bytes → fingerprint → `buildDeliveryPackageManifestFromZipBytes` — **PASS** |
| **Wynik** | **PASS** |

### 5. Checkbox „Dołącz rysunki” → wyłącznie ZIP

| | |
|--|--|
| **Kod** | `includeDrawingsInZip` tylko w `handleGenerateZip` / `handlePublishForInspector` → `delivery.includeDrawings`; default ON iff `rysunkiEnabled && finalDrawingsCount > 0` |
| **D-AR-P3-04** | feature OFF → `includeDrawings = false` niezależnie od checkbox — **PASS** |
| **D-AR-P3-05** | download + publish te same options — **PASS** |
| **Test** | T29–T30 |
| **Wynik** | **PASS** (nie wpływa na edytor / P2 PDF pojedynczy) |

### 6. Brak zmian Cloud / Payroll / Punkty

| | |
|--|--|
| **P3 allowlist** | `zip-entries` · `generate-zip` · delivery-package-publications · `wm-druk-audit` · `WmPrintView` · Guide · changelog · test P3 · docs P3 |
| **cloud-sync / drawings merge** | **nie** w allowlist P3 · `zip-entries` bez payroll/points |
| **Uwaga dirty tree** | `CloudLoader.tsx` (storage budget) · `PayrollView.tsx` (modal CSS) = **obce WIP** — **nie** wchodzą do COMMIT P3 |
| **Wynik** | **PASS** (zakres P3) |

### 7. Deterministyczna kolejność ZIP

| | |
|--|--|
| **Kod** | D-P3-16 / MR-P3-03: `sortFinalDrawingsForZip` — `updatedAt DESC` → `title` pl → `id ASC` przed generate+append |
| **Folder order** | Odbiory → Pomiary → Rysunki (append po EM) |
| **Test** | T07–T08 |
| **Wynik** | **PASS** |

### 8. Transakcyjność — błąd PDF → FAIL całego ZIP

| | |
|--|--|
| **Kod** | `prepareDrawingZipFileEntries` throw → przed `appendNamed` / `generateAsync`; `downloadWmPrintZip` catch → `ok: false` (brak `saveAs`); publish `try/catch` toast |
| **D-P3-17** | PDF 1× / rysunek · reuse bytes — **PASS** (T15) |
| **D-P3-18** | `appendNamedFilesToZip` tylko `{fileName, bytes}` — **PASS** (T03) |
| **D-P3-20** / AC-P3-11 / MR-P3-04 — **PASS** |
| **Test** | T18 · T27 |
| **Wynik** | **PASS** |

### 9. Regresja P2 / P1B / P1 / P0

| Suite | Wynik (OV re-run 2026-08-03) |
|-------|------------------------------|
| P3 | **32 PASS · 0 FAIL** |
| P2 | **28 PASS · 0 FAIL** |
| P1B | **32 PASS · 0 FAIL** |
| P1 | **43 PASS · 0 FAIL** |
| P0 | **33 PASS · 0 FAIL** |
| **Wynik** | **PASS** |

---

## 3. Acceptance Criteria (DF)

| ID | Kryterium | Wynik |
|----|-----------|--------|
| **AC-P3-01** | `includeDrawings` + ≥1 final → `Rysunki/*.pdf` via `generateDrawingPdf` | **PASS** |
| **AC-P3-02** | Draft nie w ZIP | **PASS** |
| **AC-P3-03** | Manifest `"Rysunki"` · fingerprint drawings | **PASS** |
| **AC-P3-04** | Checkbox default ON iff ≥1 final | **PASS** |
| **AC-P3-05** | Schematy poza ZIP | **PASS** |
| **AC-P3-06** | 0 final → brak `Rysunki/` | **PASS** |
| **AC-P3-07** | Kolizja → `_{shortId}` | **PASS** |
| **AC-P3-08** | Download + Publish ten sam orchestrator | **PASS** |
| **AC-P3-09** | Brak Payroll / merge drawings / Points | **PASS** |
| **AC-P3-10** | Regresja EM/Odbiory + P0–P2 unit | **PASS** |
| **AC-P3-11** | DrawingPdfError → cały ZIP FAIL | **PASS** |

---

## 4. MR-P3 + decyzje Owner / AR

| ID | Status |
|----|--------|
| **MR-P3-01** | **PASS** — helper w `wm-technical-drawings/zip-entries.ts` (nazwa pliku ≠ `zip-append.ts`, intencja AR spełniona) |
| **MR-P3-02** | **PASS** — `fileCount` + normalize defaults |
| **MR-P3-03** | **PASS** — sort finals (= D-P3-16) |
| **MR-P3-04** | **PASS** — abort przed generateAsync/saveAs |
| **MR-P3-05** | **PASS** — trzeci `if`, bez ZipSectionRegistry |
| **MR-P3-06** | **PASS** — toast `Odbiory + N pomiarów + M rysunków` |
| **D-P3-16…20** | **PASS** (pkt 7–8 + prepare/append) |
| **D-AR-P3-01…05** | **PASS** |

---

## 5. Zgodność AUDIT · DF · AR

| Dokument | Werdykt OV |
|----------|------------|
| AUDIT | Zakres IN/OUT · ryzyka R2 (partial ZIP) zamknięte AC-P3-11 — **zgodne** |
| DESIGN FREEZE | Folder · checkbox · manifest additive · fail-loud · reuse P2 — **zgodne** |
| ARCHITECTURE REVIEW | MR wdrożone · SSOT/REUSE/ZERO DUP/THIN — **zgodne** |

---

## 6. Allowlist COMMIT (po Owner GO COMMIT)

| Plik | Rola |
|------|------|
| `src/lib/wm-technical-drawings/zip-entries.ts` | **NEW** |
| `src/lib/wm-print/generate-zip.ts` | Rysunki + appendNamed |
| `src/lib/delivery-package-publications/types.ts` | folder · fingerprint · counts |
| `src/lib/delivery-package-publications/manifest.ts` | folderFromPath · groupBy |
| `src/lib/delivery-package-publications/normalize.ts` | defaults additive |
| `src/lib/delivery-package-publications/publication.ts` | fingerprint · publish |
| `src/lib/wm-druk-audit.ts` | `drawing_zip_included` |
| `src/app/WmPrintView.tsx` | checkbox · wire |
| `src/app/GuideView.tsx` | help (jeśli w diff P3) |
| `src/app/changelog-data.ts` | **2.66.00** |
| `CHANGELOG.md` | skrót |
| `scripts/test-wm-rysunki-01-p3.mjs` | **NEW** |
| `docs/architecture/WM-RYSUNKI-01-P3-*.md` | AUDIT · DF · AR · OV |

**Zakaz:** `CloudLoader.tsx` · `PayrollView.tsx` · pozostały dirty tree · `git add -A`

---

## 7. Evidence testów (re-run OV)

| Suite | Wynik |
|-------|--------|
| `npx vite-node scripts/test-wm-rysunki-01-p3.mjs` | **32 PASS · 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p2.mjs` | **28 PASS · 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p1b.mjs` | **32 PASS · 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p1.mjs` | **43 PASS · 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p0.mjs` | **33 PASS · 0 FAIL** |

---

## 8. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: Owner GO COMMIT
  → jawny git add allowlist P3 only
  → bez CloudLoader / Payroll / obcego WIP
  → (następnie) Owner GO PUSH → VERIFY FAST → CLOSE

COMMIT: NIE (ten dokument)
PUSH: NIE
P4: NIE
```

**STOP.** Czekaj na **OWNER GO COMMIT**.
