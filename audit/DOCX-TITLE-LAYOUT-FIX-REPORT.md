# DOCX Title Layout Fix — raport wdrożenia

**Data:** 2026-06-16  
**Zakres:** tylko szablony DOCX WM Druk · **bez zmian kodu aplikacji (`src/`)**  
**Powiązany audyt:** [`DOCX-TITLE-CORRUPTION-AUDIT.md`](DOCX-TITLE-CORRUPTION-AUDIT.md)

---

## Werdykt

| Status | Wynik |
|--------|-------|
| **Fix 4× DOCX** | **PASS** |
| **Prod storage + KV** | **PASS** (`--execute`) |
| **Smoke per template** | **24/24 PASS** |
| **BUILD** | **PASS** |
| **Regresja DOCX P0.1A** | **27/27 PASS** |
| **ZIP WM Druk (ZI sim)** | **PASS** |
| **PRODUCTION VERIFIED** | **2.59.24** (bez bump wersji UI — zmiana tylko storage/KV) |

---

## Problem (przypomnienie)

Po podstawieniu `{{DATE}}` → `15.06.2026 r.` tytuł `OŚWIADCZENIE…` był w tym samym akapicie co data → wizualnie **`r.OŚWIADCZENIE…`**.

---

## Rozwiązanie

**Podział akapitu Word (`<w:p>`)** w `word/document.xml`:

- Akapit 1: `Wrocław, {{DATE}}` → po generacji: `Wrocław, 15.06.2026 r.`
- Akapit 2: `OŚWIADCZENIE KIEROWNIKA BUDOWY O…`

Próba `w:br` w tym samym akapicie **niewystarczająca** — `substituteParagraphWmPrintVariables` scala tekst do pierwszego runu przy podstawianiu.

---

## Naprawione pliki

| Plik | Nowy fileId (storage) |
|------|------------------------|
| Oświadczenie bezrobotny umowa 154.docx | `80af5ca3-a5e3-4382-a58b-09302a465ec3` |
| Oświadczenie kierownik.docx | `a4ff0658-118e-4e1b-b5eb-e5a7e8dc804f` |
| Oświadczenie o zatrudnieniu.docx | `ff19a9be-d3ad-4912-9072-f91c6cc121c6` |
| Oświadczenie podwyk.docx | `69674d91-fb67-4702-abd4-42425656dfc1` |

**Template KV:** `c8ec0bd6-f6a6-42ce-94d5-9605e7c00217` (Oświadczenia)

**Kopia repo:** `audit/wm-print-docx-fixed/`  
**Manifest:** `audit/wm-print-docx-title-layout-fix-report.json`

---

## Komendy

```bash
# Fix + smoke + upload (wykonane z --execute)
npx vite-node scripts/publish-wm-print-docx-title-layout-fix.mjs --execute

npm run build
npx vite-node scripts/test-wm-print-p0-1a-docx-fix.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
```

---

## VERIFY DEPLOY FAST

```text
GET https://www.wgdom.fun/version.json
→ { "version": "2.59.24" }
```

Brak zmian frontendu — werdykt dotyczy **storage/KV** (natychmiastowe po `--execute`).

---

## Manual gate (zalecane)

1. Odbiory WM Druk → ZIP dla roboty Sępa 83/7  
2. Otwórz **Oświadczenie kierownik.docx** w Word  
3. Potwierdź układ:

```text
Wrocław, 15.06.2026 r.

OŚWIADCZENIE KIEROWNIKA BUDOWY O
ZAKOŃCZENIU ROBÓT BUDOWLANYCH
```

**AUDIT → IMPLEMENT (templates) COMPLETE**
