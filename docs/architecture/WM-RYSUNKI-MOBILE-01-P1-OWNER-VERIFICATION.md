# WM-RYSUNKI-MOBILE-01 MOBILE-P1 — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-MOBILE-01-P1-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-MOBILE-01 · **Slice:** **MOBILE-P1**  
> **FAZA:** **OWNER VERIFICATION**  
> **STATUS:** **PASS** · rekomendacja **GO COMMIT**  
> **Data OV:** 2026-08-04  
> **Production baseline:** **2.66.04** / **`13ca099b8215306accefdc4aa3ce735829449014`**  
> **Local WIP tip:** **2.66.05**  
> **Wejście:** IMPLEMENT COMPLETE · DF **FROZEN** · AR **PASS WITH DF CORRECTIONS**  
> **DF:** [`WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md`](./WM-RYSUNKI-MOBILE-01-P1-DESIGN-FREEZE.md)  
> **AR:** [`WM-RYSUNKI-MOBILE-01-P1-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-MOBILE-01-P1-ARCHITECTURE-REVIEW.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
MOBILE-P1 — OWNER VERIFICATION · WERDYKT

OV STATUS:           PASS
REKOMENDACJA:        GO COMMIT
REQUIRED FIXES:      BRAK

BUILD:               PASS
SMOKE P1:            22 PASS
STATIC DFC OV:       22 PASS
REGRESJA P0 mobile:  27 PASS
REGRESJA P3A:        40 PASS
REGRESJA P3B:        24 PASS
REGRESJA P3B.1:      15 PASS

COMMIT: NIE wykonano (czekaj OWNER GO → COMMIT)
PUSH:   NIE wykonano
════════════════════════════════════════════════════════
```

---

## 1. Zakres weryfikacji

| Obszar | Metoda | Wynik |
|--------|--------|-------|
| **DFC-P1-01** default=`export` · editor `mode:"edit"` | kod + smoke + static | **PASS** |
| **DFC-P1-02** CTM/`clientToSvgPoint` · hit SVG units · inverse screen-pad OUT | kod + static | **PASS** |
| `mode="edit"` → hit overlays | render smoke | **PASS** |
| `mode="export"` / omit → **brak** hit | render smoke | **PASS** |
| Touch targets 44×44 (`.touch-target`) | kod editor+panel | **PASS** |
| Toolbar mobile (`overflow-x-auto` @ FS) | kod | **PASS** |
| Selection toolbar 44px | kod | **PASS** |
| Modal Tekst / Modal Długość | kod · `window.prompt(` OUT | **PASS** |
| Create sheet (portal + outside close) | kod | **PASS** |
| Desktop regression (P3A/P3B/P3B.1 + prompt UI) | smoke | **PASS** |
| MOBILE-P0 regression | smoke P0 | **PASS** |
| Build | `npm run build` | **PASS** |

---

## 2. DFC — szczegół

### DFC-P1-01

| Check | Evidence | Wynik |
|-------|----------|-------|
| Default / omit = **export** (no hit) | `isEdit = options.mode === "edit"` · smoke T06/T07 | **PASS** |
| Editor jawnie `mode: "edit"` | `WmPrintDrawingEditor.tsx` | **PASS** |
| PDF `mode: "export"` | `export-pdf.ts` | **PASS** |
| Ghost/highlight tylko edit | render + T12b P3B.1 | **PASS** |

### DFC-P1-02

| Check | Evidence | Wynik |
|-------|----------|-------|
| REUSE `clientToSvgPoint` + `getScreenCTM()` | editor pointer handlers | **PASS** |
| Hit pad SVG units (`DRAWING_HIT_LINE_WIDTH_SVG=24`, point `r=22`) | `render-svg.ts` | **PASS** |
| Inverse screen-pad / `stroke ∝ 1/viewScale` OUT | static scan | **PASS** |

---

## 3. Acceptance Criteria (DF §5)

| AC | Kryterium | OV |
|----|-----------|-----|
| **AC-M1-01** | Selekcja palcem (hit edit) | **PASS (kod+smoke)** · device spot-check zalecany |
| **AC-M1-02** | Export bez `data-hit` | **PASS** |
| **AC-M1-03** | Chrome ≥44×44 | **PASS** (`.touch-target`) |
| **AC-M1-04** | Zero `window.prompt(` | **PASS** |
| **AC-M1-05** | Create w viewport + close | **PASS** |
| **AC-M1-06** | Desktop + P3B.1 | **PASS** (smoke) |
| **AC-M1-07** | Hit @ zoom≠1 (CTM) | **PASS (architektura CTM)** · device spot-check zalecany |
| **AC-M1-08** | Regresja P0 | **PASS** (27) |

> **Uwaga device:** AC-M1-01 / AC-M1-07 nie mają full E2E na fizycznym telefonie w tej sesji OV. Kod i kontrakt CTM spełniają DF; **nie** blokują GO COMMIT (brak dowodu FAIL). Zalecany krótki spot-check na telefonie przed / zaraz po PUSH.

---

## 4. Testy (wykonane w OV)

| Suite | Wynik |
|-------|-------|
| `npx vite-node scripts/test-wm-rysunki-mobile-p1.mjs` | **22 PASS / 0 FAIL** |
| Static DFC OV (edit/export/CTM/prompt/create/P0 markers) | **22 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-mobile-p0.mjs` | **27 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p3a.mjs` | **40 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p3b.mjs` | **24 PASS / 0 FAIL** |
| `npx vite-node scripts/test-wm-rysunki-01-p3b1.mjs` | **15 PASS / 0 FAIL** |
| `npm run build` | **PASS** (~28.5s) |

---

## 5. Lista usterek

| ID | Severity | Opis | Blokuje COMMIT? |
|----|----------|------|-----------------|
| — | — | **Brak REQUIRED FIXES** | — |

### Residual / nieblokujące (świadomość)

| ID | Opis | Akcja |
|----|------|-------|
| **N-01** | Device finger hit @ zoom (AC-M1-01/07) — brak E2E urządzenia w tej sesji | Spot-check Owner przed/po PUSH |
| **N-02** | R-P1-03 iOS keyboard + modal w portal — bez regresji zgłoszonej | Monitor przy device OV |
| **N-03** | Desktop chrome też 44px (mobile-first) — zgodne z DF (desktop PASS only) | OK |

---

## 6. OUT — potwierdzenie nietknięcia

| OUT | Status |
|-----|--------|
| JSON schema / normalize breaking | **OK** |
| Cloud Sync / merge drawings | **OK** |
| PDF/ZIP semantics (poza thin `mode:"export"`) | **OK** |
| Ghost/P3B.1 wall STOP logic | **OK** (smoke) |
| Payroll / AI / CORE | **OK** |
| P2 landscape / orientation | **OK** (nie w zakresie) |

---

## 7. Pliki allowlist (do COMMIT)

**Modified**
- `src/lib/wm-technical-drawings/render-svg.ts`
- `src/lib/wm-technical-drawings/export-pdf.ts`
- `src/app/WmPrintDrawingEditor.tsx`
- `src/app/WmPrintDrawingsPanel.tsx`
- `src/app/changelog-data.ts`
- `CHANGELOG.md`
- `scripts/test-wm-rysunki-01-p3a.mjs`
- `scripts/test-wm-rysunki-01-p3b.mjs`
- `scripts/test-wm-rysunki-01-p3b1.mjs`

**Untracked**
- `scripts/test-wm-rysunki-mobile-p1.mjs`
- `docs/architecture/WM-RYSUNKI-MOBILE-01-P1-OWNER-VERIFICATION.md`

**Zakaz:** `git add -A` · nie zagarniać WIP spoza allowlist.

---

## 8. GIT

| | |
|--|--|
| HEAD / origin baseline | `13ca099b` (prod **2.66.04**) |
| Local tip changelog | **2.66.05** |
| Staged | nie |
| Commit / Push | **zakazane** do Owner GO |

---

## 9. WERDYKT

```text
OWNER VERIFICATION: PASS

REQUIRED FIXES: BRAK

REKOMENDACJA: GO COMMIT

Następne (Owner):
  1. OWNER GO → COMMIT (jawny allowlist P1)
  2. OWNER GO → PUSH
  3. PRODUCTION VERIFY (version.json → 2.66.05)
  4. CLOSE P1
```

### Checklist Owner (opcjonalny spot-check urządzenia przed PUSH)

- [ ] Telefon &lt;768: hit ściany/drzwi przy zoom ±
- [ ] Modal Tekst / Długość (nie system prompt)
- [ ] Toolbar przewijany · przyciski 44px
- [ ] Nowy rysunek: sheet + tap poza = close
- [ ] Desktop: wymiar/tekst modal · wall STOP P3B.1
- [ ] PDF podgląd bez hit artefacts

========================================

BUILD STATUS — PASS

TEST STATUS — PASS (P1 + P0 + P3A + P3B + P3B.1)

OV STATUS — PASS

REKOMENDACJA — **GO COMMIT**

COMMIT — nie wykonano · czekam na OWNER GO → COMMIT

PUSH — nie wykonano

========================================
