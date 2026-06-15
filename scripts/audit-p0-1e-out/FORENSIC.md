# P0.1E FORENSIC — ZI `{{JOB_*}}` w Edge po 2.59.13

## 1. Wersja prod

- `version.json`: **2.59.13** (w momencie audytu)
- Plik ZIP UI: `50-ZI-zgloszenie-gotowosci-instalacji-do-przylaczenia-gd.pdf`
- Szablon KV: `e911d6a5-3728-4089-bb9a-a4adec6e9c20` · `sortOrder=50`

## 2. Odtworzenie ścieżki UI

Pipeline: `buildWmPrintFilesForJob` + prod KV `kw-wm-print-templates` + adres **Sępa Szarzyńskiego 83/7**.

Artefakty: `scripts/audit-p0-1e-out/`

## 3. Wynik na 2.59.13 (przed fixem)

| Warstwa | Wynik |
|---------|-------|
| `/V` pola 8/9/10 (pdf-lib) | PASS — `Sępa Szarzyńskiego` / `83` / `7` |
| Literal `{{JOB_*}}` w bajtach | 0 trafień |
| `/AP` Noto widgetów | PASS — Tj zawiera zakodowane wartości |
| pdfjs extractText | 0 placeholderów, **0 adresu** (tekst niewidoczny w warstwie tekstowej) |
| Edge (user) | FAIL — nadal `{{JOB_STREET}}` itd. |

### Widgety (annot) — prod 2.59.13

| Rect | /V | AP Noto Tj |
|------|-----|------------|
| 25.336 592.73407 (ulica) | Sępa… | hex Sępa |
| 25.336 655.73102 (budynek) | 83 | `001B0016` |
| 196.336 655.73102 (lokal) | 7 | `001A` |

## ROOT CAUSE

**Mechanizm renderowania Edge (i części viewerów PDF):**

1. Szablon LiveCycle/XFA ma **statyczną warstwę tła** (`/XObject /Im0` + content streams 380–387) z graficznymi placeholderami `{{JOB_*}}` — **nie jako literal w bajtach**, tylko jako rasteryzowana/vectorowa grafika formularza.
2. P0.1D `updateAppearances(Noto)` poprawnie ustawia `/V` i `/AP` widgetów AcroForm, ale:
   - `/AP` używa **clip path bez pełnego białego wypełnienia** — nie zasłania tła Im0.
   - Edge **nie ekstrahuje** tekstu z `/AP` Noto (pdfjs: 0 hitów adresu) i **kompozytuje** widoczną warstwę placeholderów z tła pod/bądź zamiast widgetów.
3. Placeholdery `{{JOB_*}}` widoczne dla użytkownika to **warstwa statyczna szablonu (Im0/content)**, nie wartość `/V` ani literal w pliku.

P0.1C overlay na content stream **był pod widgetami** → FAIL.  
P0.1D samo `/AP` **nie zasłania tła Im0 w Edge** → FAIL wizualny mimo PASS technicznego `/V`.

## DOWÓD

- `scripts/audit-p0-1e-ui-zip-forensic.mjs` — pełny ZIP prod KV
- `scripts/audit-p0-1e-pdfjs-ap.mjs` — pdfjs 0 placeholderów, 0 adresu na 2.59.13
- `scripts/audit-p0-1e-page-layer.mjs` — brak overlay na stronie; widgetRef=NONE w pdf-lib API
- Surowe AP obj 807/808/809: Noto Tj OK, brak `JOB` w streamie
- Strona 365: `/Contents` + `/Im0` (25264 B) + `/Annots` 36 widgetów

## FIX (2.59.14 P0.1E)

`finalizeZiHybridForm`:

1. `updateAppearances(Noto)` — zachowane (/V + /AP)
2. **Biały `drawRectangle` + `drawText(Noto)` na content stream strony** w rect pól 8/9/10
3. **`/F = 2` (Hidden)** na widgetach — Edge nie renderuje warstwy placeholderów widgetów/tła interaktywnego

## TEST

```bash
npx vite-node scripts/test-wm-print-p0-1e-zi-edge.mjs
npx vite-node scripts/audit-p0-1e-ui-zip-forensic.mjs
```

Oczekiwane po 2.59.14: pdfjs widzi Sępa / 83 / 7 na stronie 1.
