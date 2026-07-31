# AI-DOC-DETECTION-IMPLEMENT-01

> **ID:** AI-DOC-DETECTION-IMPLEMENT-01  
> **STATUS:** **IMPLEMENT COMPLETE** · **READY FOR OWNER VERIFICATION**  
> **MODE:** THIN SLICE · NO COMMIT · NO PUSH  
> **Data:** 2026-07-31  
> **Owner GO IMPLEMENT:** APPROVED  
> **SSOT:** [`AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01.md`](AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01.md) · RCA · PLAN  
> **Changelog:** **2.65.95**

```text
════════════════════════════════════════════════════════
AI-DOC-DETECTION-IMPLEMENT-01

IN: Doc.D1/D2/D3 · aliasy · copy UX_A–D · prezentacja dossier
OUT: AI · Bid · OCR · Confidence · Scope Gap · SMART · KV rename

aliasVersion = doc-detection-alias-1
copyVersion  = doc-detection-ux-1

Werdykt: READY FOR OWNER VERIFICATION
════════════════════════════════════════════════════════
```

---

## 1. Zakres zmian (zrobione)

| # | Element DF | Implementacja |
|---|------------|---------------|
| 1 | Model **Doc.D1 / Doc.D2 / Doc.D3** | `src/lib/doc-detection/types.ts` — `DOC_LAYER_LABEL_PL` |
| 2 | Aliasy BOQ · Bill of Quantities · kosztorys ślepy (+ tip przedmiar/obmiar/ATH) | `aliases.ts` → `isDocD1PdfFilename` / `hasDocD1CostFilenameHint` · wire w discovery / F2 RE / role |
| 3 | UX_A brak przedmiaru · UX_B OCR · UX_C brak odczytu · UX_D brak kosztorysu ofertowego | `copy.ts` → F2 / ZIP overlay / Offer Run / empty state |
| 4 | Prezentacja dossier **bez** rename `tenderDossier.kosztorys` | `dossier-presentation.ts` + thin `tender-data-ssot.ts` |
| 5 | Testy + changelog 2.65.95 | `test-doc-detection-ux-alias.mjs` + regresje F2/ZIP/TEUX6 |

### Fail-safe (DF §8)

| Reguła | Potwierdzenie |
|--------|----------------|
| CASE 3 → UX_B, nigdy UX_A | `resolveCostRegressionF2Presentation` + test T4 |
| Doc.D1 z pozycjami, brak Bid → UX_D | `tender-offer-run.ts` (`!isCostRegressionF1`) + test UX_D |
| F1 (ok, 0 pozycji) ≠ UX_D | AC-A8 nadal „Brak rekomendowanej ceny” |
| Formularz ofertowy ≠ Doc.D1 | tip exclude bez zmian |

---

## 2. Lista plików

### Nowe

| Plik | Rola |
|------|------|
| `src/lib/doc-detection/types.ts` | Doc.D1/D2/D3 + wersje alias/copy |
| `src/lib/doc-detection/aliases.ts` | fold + BOQ/BoQ/ślepy + PDF tip |
| `src/lib/doc-detection/copy.ts` | stałe UX_A–D (+ warianty C/ZIP/F1) |
| `src/lib/doc-detection/dossier-presentation.ts` | mapowanie statusu dossier → warstwy |
| `src/lib/doc-detection/index.ts` | barrel |
| `scripts/test-doc-detection-ux-alias.mjs` | gate T1–T7 |
| `docs/architecture/AI-DOC-DETECTION-IMPLEMENT-01.md` | ten raport |

### Zmodyfikowane (thin wire)

| Plik | Co |
|------|----|
| `src/lib/tender-cost-discovery.ts` | `isPdfPrzedmiarCostFilename` → Doc.D1; XLS hint aliasy |
| `src/lib/cost-regression-f2.ts` | copy z `doc-detection` · `DOC_D1_PDF_NAME_RE` · CASE 3 → UX_B |
| `src/lib/cost-parser-zip-unpack.ts` | overlay „przedmiar” (nie goły „kosztorys”) |
| `src/lib/tender-document-role.ts` | boq / bill of quantities / ślepy → `przedmiar` |
| `src/lib/tender-data-ssot.ts` | display FOUND_* przez `mapDossierKosztorysPresentation` |
| `src/lib/tender-kosztorys-process-phase.ts` | label/hint „odczyt przedmiaru” (bez zmiany derive faz) |
| `src/lib/tender-offer-run.ts` | UX_D gdy Doc.D1 z pozycjami i brak Bid |
| `src/app/TenderKosztorysWorkspace.tsx` | empty title „Brak przedmiaru” |
| `src/app/changelog-data.ts` | **2.65.95** |
| `CHANGELOG.md` | skrót 2.65.95 |
| `scripts/test-cost-regression-01-epic-a.mjs` | copy + UX_D |
| `scripts/test-cost-regression-02-discovery-zip.mjs` | hint UX_A DF |
| `scripts/test-cost-parser-01-zip-unpack.mjs` | copy ZIP |
| `scripts/test-tender-empty-states-teux6.mjs` | title przedmiar |

---

## 3. Wyniki testów

| Suite | Wynik |
|-------|--------|
| `npx vite-node scripts/test-doc-detection-ux-alias.mjs` | **PASS** |
| `npx vite-node scripts/test-cost-regression-01-epic-a.mjs` | **PASS** (+ UX_D) |
| `npx vite-node scripts/test-cost-regression-02-discovery-zip.mjs` | **PASS** |
| `npx vite-node scripts/test-cost-parser-01-zip-unpack.mjs` | **PASS** |
| `npx vite-node scripts/test-tender-empty-states-teux6.mjs` | **PASS** (37/0) |
| `npm run build` | **PASS** (`✓ built`) |

---

## 4. Zgodność z Design Freeze

| DF | Status |
|----|--------|
| Doc.D1 Przedmiar · Doc.D2 Dokumenty wspierające · Doc.D3 Kosztorys ofertowy | **OK** |
| `aliasVersion = doc-detection-alias-1` | **OK** |
| `copyVersion = doc-detection-ux-1` | **OK** |
| UX_A/B/C/D labels FROZEN | **OK** (stałe w `copy.ts`) |
| Brak rename `tenderDossier.kosztorys` | **OK** |
| Zakaz zmiany scoringu treści / parserów / OCR silnika | **OK** — tylko filename + copy |
| Allowlist DF §5.1 | **OK** (+ nowy moduł `doc-detection/` jako SSOT copy/alias) |

---

## 5. Potwierdzenie poza zakresem (OUT)

| Temat | Status |
|-------|--------|
| AI (OfferBoq / content score / PDF heuristics) | **bez zmian w tym slice** |
| Bid / Time-Load Guard | **bez zmian logiki Bid** (tylko copy Offer Run UX_D) |
| OCR silnik | **bez zmian** — wyłącznie komunikat UX_B |
| Confidence | **bez zmian** |
| Scope Gap | **bez zmian** |
| SMART | **bez zmian** |
| Payroll / cloud-sync CORE | **bez zmian** |
| KV / sync rename `kosztorys` | **zakazany — nie wykonany** |

---

## 6. Git / release

| | |
|--|--|
| Commit | **NIE** (Owner GO) |
| Push | **NIE** |
| Wersja changelog | **2.65.95** (working tree) |
| HEAD (niezmieniony) | lokalny tip bez tego slice |

Pliki implementacji są **modified / untracked** — do stage po Owner Verification + GO COMMIT.

---

## 7. Quality gates (podsumowanie)

```text
Klasyfikacja dokumentów (Doc.D1 aliasy)     PASS
Mapowanie aliasów (BOQ / BoQ / ślepy / tip) PASS
Komunikaty UX_A–D                           PASS
Brak regresji F2 / ZIP / TEUX6              PASS
build                                       PASS
testy gate                                  PASS
```

---

## 8. Werdykt

**IMPLEMENTATION COMPLETE** (thin slice)  
**RELEASE:** nie — brak commit/push (zgodnie z briefem)

```text
READY FOR OWNER VERIFICATION
```
