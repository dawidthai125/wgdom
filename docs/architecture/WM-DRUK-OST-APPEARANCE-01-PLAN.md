# WM-DRUK-OST-APPEARANCE-01 — AUDIT + PLAN

> **TRYB:** AUDIT + PLAN · **NO IMPLEMENT** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-05  
> **Wejście:** VISIBLE-FIELDS-01 — `/V` OK · `/AP` = `() Tj` · `NeedAppearances=false` · Chrome rysuje AP  
> **Status:** PLAN READY · **WAITING FOR OWNER GO**

---

## 0. ROOT CAUSE (kod — doprecyzowanie)

W `generatePdfFormFromTemplate` (ścieżka OST / non-legacy):

```text
fillPdfFormFieldMapping():
  form.updateFieldAppearances = () => {};   // ★ monkey-patch NOOP
  … setText(value) …                         // /V ustawione; AP nie przebudowane

potem (L423–426):
  form.updateFieldAppearances(font);        // ★ wywołuje TEN SAM noop!
catch { /* /V wystarczy */ }                // ★ błąd czcionki też połykany
```

Efekt na Owner PDF:

| Warstwa | Stan |
|---------|------|
| `/V` | `3 Maja` / `4a` / `2` |
| `/AP` `/N` | `() Tj` (pusty Helv z szablonu) |
| `NeedAppearances` | `false` (szablon AcroForm) |
| Chrome | pokazuje puste widgety |

**ZI Tauron** (`generate-pdf-zi-tauron2026.ts`) robi ten sam noop, ale potem **`NeedAppearances=true`** — Chrome/FormMaker regeneruje z `/V`. OST tego nie robi → regresja wizualna tylko na OST.

EM (DOCX): **poza zakresem** — brak pdf-lib AcroForm.

---

## 1. Czy wywołać `form.updateFieldAppearances(...)`?

**TAK — ale dopiero po przywróceniu prawdziwej metody.**

Sam „wywołaj ponownie” (jak dziś L426) **nie wystarczy**, bo metoda jest już `() => {}`.

| Opcja | Werdykt |
|-------|---------|
| Zostawić noop + liczyć na NeedAppearances | działa dla ZI; **zawodzi OST** gdy NA=false |
| Przywrócić API + `form.updateFieldAppearances(font)` | **REKOMENDOWANE** (pdf-lib SSOT) |
| Tylko `NeedAppearances=true` bez AP | Chrome często OK; Adobe/print bywa niespójne — **słabe jako jedyny fix** |

---

## 2. Czy wystarczy `field.updateAppearances(...)` dla wszystkich pól?

**Wystarczy dla pól wypełnionych mappingiem; nie trzeba przebudowywać całego formularza.**

| Podejście | Plus | Minus |
|-----------|------|-------|
| `form.updateFieldAppearances(font)` | jedno API; pdf-lib standard | przebudowa **wszystkich** pól (checkboxy, puste commonforms) — większy diff bajtów / ryzyko czcionki na polach z Tahoma_EE |
| `field.updateAppearances(font)` tylko dla pól z `mapping` gdzie `executed` | **cięższy zakres** · mniej regresji wizualnych na innych widgetach | trzeba trzymać listę `PDFTextField` po fill |

**Rekomendacja:**  
po fill — **tylko** `PDFTextField` trafione przez `pdfFieldMapping` (JOB_STREET / BUILDING / APARTMENT / …) → `field.updateAppearances(font)`.

Opcjonalnie (defense): jeśli lista pusta / fail → fallback `form.updateFieldAppearances(font)`.

---

## 3. `NeedAppearances = true` vs `false` + poprawne `/AP`

| Strategia | Chrome | Adobe / druk | Zgodność z ZI |
|-----------|--------|--------------|---------------|
| A. Tylko NA=true, AP puste | zwykle OK | ryzyko | jak ZI „catch” |
| B. Tylko poprawne `/AP`, NA=false | OK jeśli AP pełne | OK | czysty AcroForm |
| **C. Oba: poprawne `/AP` + NA=true** | **najbezpieczniej** | **najbezpieczniej** | **wzorzec ZI** (`setNeedAppearances` + update AP) |

**Rekomendacja: wariant C (OST path only).**  
- Primary: wygenerować poprawne `/AP` (tekst w `Tj`).  
- Secondary: `NeedAppearances=true` jak ZI — belt-and-suspenders dla viewerów, które ignorują stare AP.

**Nie** polegać wyłącznie na NA=true przy nadal pustym AP.

---

## 4. Zgodność z pdf-lib

| API | Rola |
|-----|------|
| `field.setText(v)` | ustawia `/V`; domyślnie woła appearance — **dlatego** jest noop podczas batch fill (uniknięcie N× Helv) |
| `field.updateAppearances(font)` | buduje `/AP` z `/V` + font |
| `form.updateFieldAppearances(font)` | to samo dla wszystkich pól formularza |
| `embedFont` + `fontkit` | już używane (`loadWmPrintZiPdfFontBytes` / Noto) — **reuse** |
| Monkey-patch `form.updateFieldAppearances = () => {}` | anty-pattern; **musi być scoped** (save → restore w `finally`) |

Wymaganie weryfikacji post-fix (test):

```text
AP /N decode → Tj zawiera "3 Maja" / "4a" / "2"
(nie () Tj)
```

---

## 5. Wpływ na ZI / EM / inne AcroForm

| Moduł | Wpływ przy fixie **tylko OST branch** | Ryzyko |
|-------|----------------------------------------|--------|
| **OST** `generatePdfFormFromTemplate` non-legacy | **IN** — target fix | niski, jeśli scoped |
| **ZI** `generatePdfZiTauron2026` | **NO TOUCH** (domyślnie) | brak |
| **ZI** gdy ktoś włączy `legacyZiFieldFill` w `generatePdfFormFromTemplate` | inna gałąź (hybrid finalize) | nie ruszać |
| **Izba / SEP / static `pdf`** | copy-only / bez fill | brak |
| **EM** DOCX | brak pdf-lib form | brak |
| Inne `pdf_form` ≠ ZI przez `generatePdfFormFromTemplate` | dostaną ten sam fix appearance | **pozytyw** (jeśli są) |

**Opcjonalny follow-up (osobny GO):** w ZI przywrócić prawdziwe `updateFieldAppearances` po fill (dziś noop + NA=true) — nie w zakresie tego PLAN, uniknąć regresji Tauron bez smoke.

---

## Rekomendowane API (frozen intent)

```text
OST path w generatePdfFormFromTemplate (legacyZiFieldFill !== true):

1. fillPdfFormFieldMapping
   - noop appearance TYLKO w bloku try/finally
   - restore form.updateFieldAppearances z prototypu / zapisanej ref

2. Zebrać PDFTextField, dla których setText executed === true
   (po nazwach z mapping bez "{{…}}")

3. registerFontkit + embedFont(Noto)  // reuse loadWmPrintZiPdfFontBytes

4. dla każdego zebranego text field:
     field.updateAppearances(font)

5. setNeedAppearances(pdfDoc, true)  // thin helper — mirror ZI, OST-only call site

6. NIE połykać błędów czcionki/AP bez śladu
   - fail-loud w testach
   - w runtime: log + opcjonalnie throw w DEV; prod: prefer throw jeśli address fields filled
     (do ustalenia w IMPLEMENT — minimum: test assert AP)

OUT OF SCOPE:
  generatePdfZiTauron2026
  generate-zip dispatch
  EM
  zmiana pdfFieldMapping / aliasów BUILDING→JOB_BUILDING
```

---

## Ryzyko regresji

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| R1 | Noto nie embeduje / brak glyph → AP fail | assert w teście; fallback StandardFonts.Helvetica dla ASCII-only adresu (opcjonalnie) |
| R2 | `updateAppearances` na całym form psuje AP pól z Tahoma_EE (Wrocław) | **tylko pola z mappingu**, nie pełny form |
| R3 | NA=true zmienia zachowanie Adobe vs Chrome | akceptowane (wzorzec ZI); E2E screenshot |
| R4 | Dotknięcie ZI | **NO TOUCH** pliku ZI |
| R5 | Noop zostaje bez restore | code review + test „AP Tj non-empty” |

---

## PLAN implementacji (po OWNER GO)

### P0 — Design Freeze thin (jeśli Owner wymaga DF)

1 strona: API C + scope OST-only + AC poniżej.

### P1 — IMPLEMENT (jeden plik logiczny)

| Krok | Plik | Zmiana |
|------|------|--------|
| 1 | `src/lib/wm-print/generate-pdf.ts` | scoped noop + restore; po fill OST: `updateAppearances` na filled text fields + `NeedAppearances=true` |
| 2 | (opcjonalnie) `src/lib/wm-print/ost-appearances.ts` | thin helper `applyOstFieldAppearances(form, fields, pdfDoc)` — jeśli chcesz zero clutter w generate-pdf |
| 3 | `scripts/test-wm-druk-ost-appearance-01.mjs` | fill 3 Maja → decode AP → assert Tj; NeedAppearances true |
| 4 | Changelog thin | patch UI (np. 2.66.11) — dopiero przy release |

**AC (must):**

1. `/V` = street/building/apartment (bez regresji).  
2. `/AP` `/N` zawiera tekst (nie `() Tj`) dla JOB_STREET, BUILDING, APARTMENT.  
3. `NeedAppearances === true` w AcroForm.  
4. ZI path / `generatePdfZiTauron2026`: **0 diff** zachowania (NO TOUCH lub test regresji).  
5. `npm run build` PASS · test appearance PASS.

**AC (Owner):** ponowny ZIP `3 Maja 4a/2` → Chrome: Ulica / Nr domu / Nr lokalu widoczne.

### P2 — VERIFY / RELEASE

Owner GO → commit allowlist → push → PV `version.json` + Owner screenshot OST.

---

## Decyzje do Owner GO

1. **Akceptacja wariantu C** (`updateAppearances` na polach mappingu + `NeedAppearances=true`).  
2. **Scope:** tylko OST / non-legacy `generatePdfFormFromTemplate` — ZI NO TOUCH.  
3. Po GO: IMPLEMENT → test → OV → commit/push.

```text
PLAN COMPLETE
WAITING FOR OWNER GO
(no implement / no commit / no push)
```
