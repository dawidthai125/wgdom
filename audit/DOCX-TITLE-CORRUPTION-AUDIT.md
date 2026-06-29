# DOCX Title Corruption Audit — `r.OŚWIADCZENIE`

**Data:** 2026-06-16  
**Tryb:** AUDIT ONLY · READ ONLY · bez zmian kodu  
**Moduł:** Odbiory WM Druk · szablony DOCX  
**Objaw:** zamiast tytułu `OŚWIADCZENIE KIEROWNIKA BUDOWY O…` użytkownik widzi `r.OŚWIADCZENIE KIEROWNIKA BUDOWY O…`

---

## Werdykt (skrót)

| Pytanie | Odpowiedź |
|---------|-----------|
| **A. Błąd już w DOCX?** | **TAK** — w wygenerowanym pliku `.docx` z ZIP WM Druk |
| **B. Dopiero w PDF?** | **NIE** — brak konwersji DOCX→PDF w pipeline WGDOM; PDF (jeśli użytkownik drukuje z Worda) odzwierciedla ten sam DOCX |
| **C. Jaki placeholder?** | **`{{DATE}}`** — dokładnie sufiks **` r.`** z `formatWmPrintDate()` |
| **D. Podatne dokumenty?** | **Wszystkie 4 prod szablony DOCX** WM Druk używające `{{DATE}}` sklejonego z tekstem w tym samym akapicie |
| **E. Minimalny fix?** | **Szablon Word:** odstęp / podział akapitu między `{{DATE}}` a tytułem **albo** przeniesienie literalnego ` r.` do szablonu i skrócenie wartości `DATE` do `dd.mm.yyyy` |

**Root cause:** kombinacja **(1)** formatu daty `dd.mm.yyyy r.` w kodzie oraz **(2)** układu szablonu Word, gdzie run `{{DATE}}` jest bezpośrednio przed runem `OŚWIADCZENIE` w tym samym akapicie — po podstawieniu powstaje literalny ciąg `…2026 r.OŚWIADCZENIE…`, a łamanie wizualne Worda oddziela liczbę daty od `r.` + tytułu.

**To nie jest:** błąd split-run parsera (P0-C), mammoth, docx-preview, ani konwersji PDF.

---

## Odpowiedzi A–E (szczegółowo)

### A. Czy błąd występuje już w DOCX?

**TAK.**

Forensyka prod szablonu **Oświadczenie kierownika** (storage Supabase, URL z `test-wm-print-p0-1a-docx-fix.mjs`):

**Runy akapitu 0 w `word/document.xml` (szablon):**

```text
[padding/spaces] | "Wrocław, " | "{{DATE}}" | "OŚWIADCZENIE" | "KIEROWNIKA BUDOWY O… ZAKOŃCZENIU ROBÓT BUDOWLANYCH"
```

**Po `generateDocxFromTemplate()` (combined text runów):**

```text
Wrocław, 15.06.2026 r.OŚWIADCZENIEKIEROWNIKA BUDOWY O… ZAKOŃCZENIU ROBÓT BUDOWLANYCH
```

Test regresji: `r.OŚWIADCZENIE` występuje w **100%** wygenerowanych DOCX ze wszystkich 4 prod szablonów oświadczeń.

Pliki lokalne `scripts/audit-p0-1-out/orig-Oświadczenia.docx` i `gen-Oświadczenia.docx` — ten sam wzorzec.

---

### B. Czy pojawia się dopiero w PDF?

**NIE** (w sensie pipeline WGDOM).

| Etap | Udział |
|------|--------|
| `generate-zip.ts` | ZIP zawiera **`.docx`** dla `type: "docx"` |
| Konwersja DOCX→PDF w aplikacji | **Brak** |
| mammoth / docx-preview | **Nie używane** w WM Druk |
| pdfmake | Tylko inne moduły (płace, przetargi) |

Użytkownik otwiera DOCX w Word / LibreOffice / „Drukuj → PDF”. Uszkodzenie jest już w DOCX — ewentualny PDF to kopia tego samego układu.

ZI (`pdf_form`) i statyczne PDF — **poza zakresem** tego buga.

---

### C. Jaki placeholder powoduje problem?

**`{{DATE}}`** — klucz `DATE` w `buildWmPrintVariableMap()`.

```5:10:src/lib/wm-print/variables.ts
export function formatWmPrintDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy} r.`;
}
```

- **` r.`** to skrót polski „roku” (np. *15.06.2026 r.*) — **zamierzony** sufiks daty, nie osobny placeholder.
- **`{{YEAR}}`** — osobna zmienna (`"2026"`) — **nie** powoduje tego objawu.
- **`substituteWmPrintVariables()`** — prosta podmiana `{{KEY}}` → wartość; działa poprawnie.

Mechanizm wizualny: w szablonie `{{DATE}}` i `OŚWIADCZENIE` to **osobne runy** w **jednym akapicie**. Po podstawieniu Word łamie linię tak, że `Wrocław, 15.06.2026` ląduje na linii daty, a **`r.`** (koniec wartości DATE) + **`OŚWIADCZENIE`** (początek tytułu) — na linii tytułu → screenshot: **`r.OŚWIADCZENIE…`**.

---

### D. Jakie dokumenty są podatne?

**Wszystkie prod szablony DOCX** modułu WM Druk z `{{DATE}}` sklejonym z tekstem bez separatora w tym samym akapicie:

| Szablon (KV prod) | `dateGlueInTemplate`* | `rGlueInOutput`* |
|-------------------|----------------------|------------------|
| Oświadczenie kierownika | TAK | TAK |
| Oświadczenie o zatrudnieniu | TAK | TAK |
| Oświadczenie podwykonawcy | TAK | TAK |
| Oświadczenie bezrobotny | TAK | TAK |

\*Audyt readonly 2026-06-16: wzorzec `\{\{DATE\}\}[A-ZĄĆĘŁŃÓŚŹŻ]` w tekście połączonym runów szablonu; `r.[A-Z]` / `r.OŚWIADCZENIE` w outputcie.

**Nie podatne:**

- **ZI.pdf** (Tauron 2026) — PDF form, inny generator
- Szablony **pdf** / **pdf_form** bez DOCX
- Dokumenty spoza WM Druk (płace, wykaz robót P2-F — własne formaty dat)

**Znane wcześniej:** `audit/archive/legacy-zi-livecycle-2021/zi-new-template-FORENSIC.md` §9 — wpis **DOCX-TEMPLATE-MINOR (r.OŚWIADCZENIE)** jako backlog.

---

### E. Jaki jest minimalny fix?

**Rekomendacja 1 (najmniejsze ryzyko, tylko szablony):**  
W Wordzie edytować 4 szablony DOCX w panelu WM Druk → Szablony:

- Wstawić **podział akapitu** (`Enter`) lub **`w:br`** między linię daty a tytuł, **albo**
- Dodać **spację / nową linię** między runem `{{DATE}}` a runem tytułu.

Upload z powrotem do storage — **bez zmian kodu**.

**Rekomendacja 2 (kod + szablony, spójność):**

- `formatWmPrintDate()` → zwracać **`dd.mm.yyyy`** (bez ` r.`)
- W szablonie literalnie: `Wrocław, {{DATE}} r.` + łamanie linii przed tytułem

Wymaga aktualizacji testów (`test-wm-print-p1.mjs`: `"14.06.2026 r."`) i UI podglądu daty w `WmPrintView.tsx`.

**Nie rekomendowane jako minimalny fix:**

- Zmiana `substituteParagraphWmPrintVariables` — parser P0-C działa; `{{DATE}}` jest w **jednym** runie
- Usunięcie sufiksu ` r.` tylko w kodzie **bez** poprawy szablonu — nadal możliwe sklejenie daty z tytułem (`2026OŚWIADCZENIE`)

---

## Pipeline — gdzie powstaje uszkodzenie

```text
WmPrintView → buildWmPrintFilesForJob()
  → buildWmPrintVariableMap()
       formatWmPrintDate()  ←── "15.06.2026 r."  ★ źródło "r."
  → generate-zip.ts
       type === "docx"
  → generateDocxFromTemplate()          [generate-docx.ts]
       substituteWmPrintVariablesInDocxXml()
         substituteParagraphWmPrintVariables()  ← per akapit, scala runy
           substituteWmPrintVariables()         [variables.ts]
  → ZIP .docx  ★ uszkodzenie widoczne TUTAJ
  → (brak dalszej konwersji w WGDOM)
```

**Punkt uszkodzenia:** iloczyn **`formatWmPrintDate()`** + **layout szablonu Word** (akapit 0: `{{DATE}}` + `OŚWIADCZENIE` bez separatora). Kod XML/substytucji nie gubi znaków — **świadomie** skleja wartość DATE z następnym runem.

---

## Przebadane komponenty

| Komponent | Rola | Werdykt |
|-----------|------|---------|
| `variables.ts` — `formatWmPrintDate` | Sufiks ` r.` | **Źródło `r.`** |
| `variables.ts` — `substituteWmPrintVariables` | `{{DATE}}` → wartość | OK |
| `generate-docx.ts` — `substituteParagraphWmPrintVariables` | Split-run fix P0-C | OK dla `{{DATE}}` (pełny placeholder w 1 runie) |
| `generate-docx.ts` — `generateDocxFromTemplate` | JSZip + podmiana XML | OK |
| mammoth | SWZ / przetargi | **Nie w WM Druk** |
| docx-preview | — | **Brak w repo (WM Druk)** |
| PDF export | — | **Brak dla DOCX WM Druk** |

---

## Pliki kluczowe

| Plik | Znaczenie |
|------|-----------|
| `src/lib/wm-print/variables.ts` | `formatWmPrintDate`, `buildWmPrintVariableMap`, `substituteWmPrintVariables` |
| `src/lib/wm-print/generate-docx.ts` | Generator DOCX, P0-C split-run |
| `src/lib/wm-print/generate-zip.ts` | Routing `docx` → generator |
| `src/lib/wm-print/default-templates.ts` | Lista 4 oświadczeń DOCX |
| Prod storage `…/Oświadczenie kierownik.docx` | Szablon z runami DATE + tytuł |
| `scripts/test-wm-print-p0-1a-docx-fix.mjs` | Test prod kierownik/zatrudnieniu (nie łapie glue wizualnego) |
| `scripts/test-wm-print-p0-docx-runs.mjs` | Split-run DATE — PASS (inny scenariusz) |

---

## Zakres wpływu

- **Biznesowy:** estetyka / formalność nagłówka oświadczeń WM (kierownik, zatrudnienie, podwykonawca, bezrobotny)
- **Techniczny:** wyłącznie output DOCX z WM Druk ZIP
- **Severity:** niska–średnia (treść merytoryczna OK; widać artefakt `r.` przed tytułem)
- **Regresja od:** sufiks ` r.` + układ szablonu od początku modułu WM Druk (nie regresja P0-C / ZI 2026)

---

## Rekomendowany plan naprawy (IMPLEMENT — poza tym audytem)

1. **P0 template-only:** poprawić 4 DOCX w Word → upload przez panel Szablony → smoke manualny ZIP Sępa 83/7
2. **P1 opcjonalnie:** rozdzielić `DATE` (`dd.mm.yyyy`) vs literal ` r.` w szablonie + test `r.OŚWIADCZENIE` negatywny w smoke
3. **Dodać smoke:** assert brak wzorca `/\d{4} r\.[A-ZĄĆĘŁŃÓŚŹŻ]/` w tekście wygenerowanego DOCX

---

## Dowód (readonly)

Komenda audytu (sesja 2026-06-16, nie commitowana):

```bash
# fetch prod kierownik + generateDocxFromTemplate + inspect runs akapitu 0
# wynik: after sub combined = "... Wrocław, 15.06.2026 r.OŚWIADCZENIEKIEROWNIKA ..."
```

Wszystkie 4 URL storage z `audit/tauron-audit-2026-06-15/p0-wm-druk-zi-legacy-cleanup-backup.json` → `dateGlueInTemplate: true`, `rGlueInOutput: true`.

---

## Podsumowanie dla IMPLEMENT

| Nie ruszać | Ruszyć (na polecenie) |
|------------|------------------------|
| `substituteParagraphWmPrintVariables` (P0-C) | Szablony Word (4× DOCX) |
| ZI PDF / LiveCycle | Ewentualnie `formatWmPrintDate` + szablony razem |
| `JOB_*` mapping | Smoke anty-`r.OŚWIADCZENIE` |

**AUDIT COMPLETE · FIX WDROŻONY 2026-06-16** — [`DOCX-TITLE-LAYOUT-FIX-REPORT.md`](DOCX-TITLE-LAYOUT-FIX-REPORT.md)
