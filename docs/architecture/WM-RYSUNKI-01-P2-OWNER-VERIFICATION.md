# WM-RYSUNKI-01 P2 — OWNER VERIFICATION

> **ID:** WM-RYSUNKI-01-P2-OWNER-VERIFICATION  
> **EPIC:** WM-RYSUNKI-01 · **Slice:** **P2 — PDF EXPORT**  
> **FAZA:** **OWNER VERIFICATION**  
> **STATUS:** **OWNER VERIFICATION PASS**  
> **IMPLEMENT:** COMPLETE (lokalnie)  
> **Wersja changelog:** **2.65.99**  
> **Data OV:** 2026-08-03  
> **Wejście:** Owner **GO IMPLEMENT** → OV pack  
> **AUDIT:** [`WM-RYSUNKI-01-P2-AUDIT.md`](./WM-RYSUNKI-01-P2-AUDIT.md) (**ACCEPTED**)  
> **DF:** [`WM-RYSUNKI-01-P2-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-P2-DESIGN-FREEZE.md) (**FROZEN**)  
> **AR:** [`WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md`](./WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md) (**PASS WITH MINOR RECOMMENDATIONS**)  
> **MODE:** VERIFICATION ONLY · **NO COMMIT** · **NO PUSH**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 P2 — OWNER VERIFICATION

STATUS: OWNER VERIFICATION PASS

P2 28 PASS · P0 33 PASS · P1 43 PASS · P1B 32 PASS
build PASS · changelog 2.65.99

AC-P2-01…11 PASS (kontrakt + testy)
MR-P2-01…06 · D-P2-15…18 PASS
D-AR-P2-01…05 PASS

OUT: ZIP · CAD · DXF · watermark · punkty · Payroll · shared helper

COMMIT: NIE
PUSH: NIE
NEXT: Owner GO COMMIT (allowlist P2)
════════════════════════════════════════════════════════
```

---

## 0. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy P2 spełnia DF + AR + AC? | **TAK** |
| Czy są blokery przed COMMIT? | **NIE** |
| Regresja P0 / P1 / P1B | **BRAK** (33 + 43 + 32 PASS) |
| Zmiana JSON schema / drugi renderer | **NIE** |
| Payroll / ZIP / watermark | **OUT respektowane** |
| **STATUS** | **OWNER VERIFICATION PASS** |

---

## 1. Metoda weryfikacji

| Warstwa | Zakres |
|---------|--------|
| Automatyczna | `test-wm-rysunki-01-p2.mjs` (28) · P0 · P1 · P1B |
| Build | `npm run build` **PASS** |
| Statyczna | `export-pdf.ts` · `svg-raster.ts` · `WmPrintDrawingEditor` · `wm-druk-audit` |
| Kontrakt | DF §2–§14 · AR MR/D-AR · Owner D-P2-15…18 |
| Ręczna UI | OV-UI poniżej — **opcjonalna** po COMMIT (nie blokuje PASS) |

---

## 2. Acceptance Criteria

| ID | Kryterium | Wynik |
|----|-----------|--------|
| **AC-P2-01** | Podgląd 1 strona · SVG bez siatki | **PASS** (T06–T08 · UI preview) |
| **AC-P2-02** | Pobierz · nazwa `RYSUNEK_…` | **PASS** (T01–T03 · download) |
| **AC-P2-03** | Drukuj = te same bytes (sesja) | **PASS** (T26 · `pdfSessionRef`) |
| **AC-P2-04** | Chrome: nazwa roboty + data | **PASS** (export drawText jobLabel + documentDate) |
| **AC-P2-05** | A4/A3 × portrait/landscape | **PASS** (T09–T14) |
| **AC-P2-06** | Brak watermark / ZIP / podpis | **PASS** (T11 · T20 · T28) |
| **AC-P2-07** | Skala uniform całego SVG | **PASS** (fitScale w export-pdf) |
| **AC-P2-08** | Model / `renderDrawingSvg` API bez schema bump | **PASS** (konsumpcja only) |
| **AC-P2-09** | Audit `drawing_pdf_exported` | **PASS** (T17 · UI download) |
| **AC-P2-10** | Regresja P0/P1/P1B | **PASS** |
| **AC-P2-11** | Determinizm layoutu | **PASS** (T15–T16) |

---

## 3. Decyzje Owner / AR

| ID | Temat | Wynik |
|----|-------|--------|
| **D-P2-15** | Pure `generateDrawingPdf(drawing, options) → Uint8Array` | **PASS** |
| **D-P2-16** | `jobLabel` obowiązkowy · nie z global state | **PASS** (T04 · panel → editor prop) |
| **D-P2-17** | `DrawingPdfError` + toast · bez utraty danych | **PASS** (catch → toast · model nietknięty) |
| **D-P2-18** | Reuse bytes Preview→Download→Print · invalidate po zmianie | **PASS** (`pdfFingerprint` / `pdfSessionRef`) |
| **MR-P2-01** | jobLabel w opts | **PASS** |
| **MR-P2-02** | reuse bytes sesji | **PASS** |
| **MR-P2-03** | DrawingPdfError + toast + busy | **PASS** |
| **MR-P2-04** | allowlist (bez Payroll/ZIP) | **PASS** (pliki poniżej) |
| **MR-P2-05** | shared helper OUT | **PASS** |
| **MR-P2-06** | fake rasterizer w testach | **PASS** |
| **D-AR-P2-01** | fallback `"Bez roboty"` | **PASS** |
| **D-AR-P2-03** | audit tylko po Pobierz | **PASS** |
| **D-AR-P2-04** | metadata z `documentDate` | **PASS** |

---

## 4. Zasady WGDOM

| Zasada | Wynik |
|--------|--------|
| SSOT FIRST | **PASS** — `renderDrawingSvg` · `showGrid: false` |
| REUSE FIRST | **PASS** — pdf-lib · fontkit · Noto · saveAs · wzorzec Schematy |
| ZERO DUPLICATE LOGIC | **PASS** — jeden generator · 3 akcje UI |
| THIN SLICE | **PASS** — OUT lista respektowana |

---

## 5. Build / Test

| Komenda | Wynik |
|---------|--------|
| `npm run build` | **PASS** |
| `npx vite-node scripts/test-wm-rysunki-01-p2.mjs` | **28 PASS** |
| `npx vite-node scripts/test-wm-rysunki-01-p0.mjs` | **33 PASS** |
| `npx vite-node scripts/test-wm-rysunki-01-p1.mjs` | **43 PASS** |
| `npx vite-node scripts/test-wm-rysunki-01-p1b.mjs` | **32 PASS** |

---

## 6. Pliki IMPLEMENT (allowlist COMMIT)

```text
src/lib/wm-technical-drawings/export-pdf.ts
src/lib/wm-technical-drawings/svg-raster.ts
src/lib/wm-technical-drawings/index.ts
src/lib/wm-druk-audit.ts
src/app/WmPrintDrawingEditor.tsx
src/app/WmPrintDrawingsPanel.tsx
src/app/changelog-data.ts
src/app/GuideView.tsx
CHANGELOG.md
scripts/test-wm-rysunki-01-p2.mjs
docs/architecture/WM-RYSUNKI-01-P2-AUDIT.md
docs/architecture/WM-RYSUNKI-01-P2-DESIGN-FREEZE.md
docs/architecture/WM-RYSUNKI-01-P2-ARCHITECTURE-REVIEW.md
docs/architecture/WM-RYSUNKI-01-P2-OWNER-VERIFICATION.md
```

**Zakaz:** `git add -A` · Payroll* · CloudLoader · generate-zip · Bid Guard WIP.

---

## 7. Checklist UI (opcjonalnie po COMMIT / preview)

| ID | Krok |
|----|------|
| OV-UI-01 | Włącz Rysunki (AppSettings) · otwórz rysunek |
| OV-UI-02 | Podgląd PDF — 1 strona · widać robotę + datę · brak siatki |
| OV-UI-03 | Pobierz PDF — nazwa `RYSUNEK_…` |
| OV-UI-04 | Drukuj bez ponownej długiej generacji (sesja) |
| OV-UI-05 | Edycja ściany → ponowny PDF odzwierciedla zmianę (cache wygasł) |
| OV-UI-06 | A3 portrait — rozmiar strony OK |
| OV-UI-07 | Błąd raster (opcjonalnie) → toast · rysunek nietknięty |

---

## 8. NEXT

```text
STATUS: OWNER VERIFICATION PASS

NEXT: Owner GO COMMIT
  → allowlist P2 only
  → (następnie) Owner GO PUSH → VERIFY FAST → CLOSE

COMMIT: NIE (ten dokument)
PUSH: NIE
P3 ZIP / P4: NIE
```

**STOP.** Czekaj na **OWNER GO COMMIT**.
