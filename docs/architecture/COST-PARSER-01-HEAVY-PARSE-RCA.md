# COST-PARSER-01 — HEAVY PARSE RCA

> **ID:** COST-PARSER-01-HEAVY-PARSE-RCA  
> **STATUS:** **AUDIT COMPLETE** · **READ ONLY** · **IMPLEMENT ZABLOKOWANY** do Owner GO  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** PARSER / Heavy Dossier · **#CORE-013** — zero Bid · zero COST-PIPELINE · zero Payroll · zero Sync merge  
> **Wejście:** UI „Nie znaleziono kosztorysu w archiwum ZIP” (CR-02) · tender live `08dee178-1010-dbe7-ebd1-650001a84a9f` · DF CR-02 · kod `tender-document-resolver` / `tender-dossier-pipeline` / Edge zip-catalog  
> **Zakaz sesji:** bez implementacji · bez commit · bez push

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-PARSER-01 AUDIT):
  Ustal, dlaczego Heavy kończy się HeavyDone bez
  tenderDossier.kosztorys mimo ZIP z dokumentacją.
  Śledź: unpack → kandydaci → parse → snapshot.

IMPLEMENT: ZABLOKOWANY.
════════════════════════════════════════════════════════
```

---

## 0. Executive summary

| Pytanie | Odpowiedź (tender RCA) |
|---------|-------------------------|
| Czy w ZIP są pliki kosztorysu? | **TAK** — **12× `.ATH`** w 2× „Dokumentacja Techniczna ZADANIE *.zip” (Edge catalog **dziś**) |
| Czy Discovery UI (CR-02) kłamie? | **Częściowo** — komunikat „nie znaleziono w ZIP” jest **zbyt wąski**; w tym case Heavy **w ogóle nie dostał innerów** |
| Root cause | **Silent ZIP unpack failure** podczas Heavy: `scanSummary.zipUnpackOk === false` · `zipInnerCount === 0` · `costDiscovery.found === false` · `parsed === 0` · `kosztorys === null` · mimo to `parsedAt` ustawione → `heavyParseDone` |
| Czy parser ATH działa na tych plikach? | **TAK** (READ ONLY probe): 1× ATH → `ok:true` · **46 rows** |
| Czy Bid / COST-PIPELINE winne? | **NIE** |

**Werdykt:** problem **nie** jest „ZIP bez ATH”. Problem jest: **Heavy zakończył się terminalnie bez udanego unpack ZIP**, więc ATH nigdy nie weszły do `parseDocumentToKosztorys`, a UI CR-02 interpretuje to jako „nie znaleziono kosztorysu w archiwum”.

---

## 1. Fixture live (KV + Edge) — 2026-07-28

### 1.1 Tender

| Pole | Wartość |
|------|---------|
| Pipeline id | `08dee178-1010-dbe7-ebd1-650001a84a9f` |
| BZP / OCDS | `ocds-148610-78cb0bfd-a66c-44a8-8c77-8ff3bb467752` |
| Tytuł (skrót) | ZZK-NZ/241/3408/72/26 Roboty remontowe… pustostany Wrocław |
| `parserVersion` | **4** |
| `builtAt` / `scanSummary.parsedAt` | **2026-07-28T19:02:03.820Z** |
| `kosztorys` | **`null`** |
| `tenderDossierHeavyParseDone` | **`true`** |
| Gate | `Closed` / `HeavyDone` · `heavyEligibleCount: 7` |

### 1.2 Top-level załączniki BZP (7)

| # | Plik | Ext |
|---|------|-----|
| 1 | Ogłoszenie o zamówieniu.pdf | pdf |
| 2 | SWZ 72 .pdf | pdf |
| 3 | załączniki edytowalne SWZ.docx | docx |
| 4 | **Dokumentacja Techniczna ZADANIE 1.zip** | zip · ~5.2 MB |
| 5 | **Dokumentacja Techniczna ZADANIE 2.zip** | zip · ~1.4 MB |
| 6 | Specyfikacja techniczna - pustostany BGK….pdf | pdf |
| 7 | 4.kpl. prot. - pustostany ryczałt adresowe (1).zip | zip · ~0.2 MB |

### 1.3 `scanSummary` (stan po Heavy — kluczowy dowód)

```json
{
  "zipUnpackOk": false,
  "zipInnerCount": 0,
  "kosztorysFound": false,
  "costDiscovery": { "found": false, "type": "none", "source": "", "confidence": 0 },
  "parsed": 0,
  "scanned": 6,
  "byType": { "pdf": 3, "zip": 3, "docx": 1, "ath": 0, "xlsx": 0 },
  "parsedAt": "2026-07-28T19:02:03.820Z"
}
```

**Interpretacja:** Heavy **nie** zbudował żadnego kandydata `zipInnerPath`. Cost discovery nie znalazł ATH. Żaden kosztorys nie został sparsowany. Mimo to ustawiono `parsedAt` → UI CR-02: F2 ∧ archive ∧ heavyDone → „Nie znaleziono… w archiwum ZIP”.

### 1.4 Co jest **w środku** ZIP (Edge `tenders-bzp-zip-catalog` — dziś)

#### ZIP index 4 — Dokumentacja Techniczna ZADANIE 1.zip · **6 ATH** (wszystkie `zip_ath` / role `kosztorys`)

| Inner path (skrót) |
|--------------------|
| `…/Dolnobrzeska 16A m. 8 …-bud.-ZESTAW.-.ATH` |
| `…/Dolnobrzeska 16a lok.8 - ogrzew.el._p.ath` |
| `…/Dolnobrzeska 16a_8 - sanitarna -p-.ATH` |
| `…/Dolnobrzeska 16 lok. 7-el._p.ath` |
| `…/Dolnobrzeska 16 m. 7 …-bud.-Zestaw..ATH` |
| `…/Dolnobrzeska 16_7 - sanitarna -p-.ATH` |

#### ZIP index 5 — Dokumentacja Techniczna ZADANIE 2.zip · **6 ATH**

| Inner path (skrót) |
|--------------------|
| `…/ŁUKASIŃSKIEGO 6 m 16 - SANITARNY ….ATH` |
| `…/Łukasińskiego 6 lok. 16 - budowlany ….ath` |
| `…/Łukasińskiego 6 lok.16 el.zest..ath` |
| `…/ŁUKASIŃSKIEGO 15 b m 45 - SANITARNY ….ATH` |
| `…/Łukasińskiego 15b lok. 45 - budowlany ….ath` |
| `…/Łukasińskiego 15b lok. 45_p.ath` |

#### ZIP index 7 — protokoły · **0** wpisów w Edge catalog

(Prawdopodobnie same pliki poza filtrem Edge: brak `.ath|nor|xml|pdf|xlsx|docx` z `score≥6` / `costRelevant` — np. skany bez keywordów.)

### 1.5 Probe parse (READ ONLY) — jeden ATH z ZIP#4

| Metryka | Wartość |
|---------|---------|
| Endpoint | `tenders-bzp-zip-entry-bytes` |
| Bytes | 18 271 |
| `parseKosztorysBytes` → `ok` | **`true`** |
| Rows | **46** |
| Sample | KNR 4-01 … „Wykucie z muru ościeżnic…” |
| `totalValue` | `"0"` (ceny zerowe — **nie** blokuje powstania snapshotu `ok`) |

**Wniosek:** gdy unpack + parse dojdą do tego ATH, **`tenderDossier.kosztorys` powinien powstać**.

---

## 2. Pełny przebieg pipeline Heavy → `kosztorys`

```text
[1] deriveUnifiedAttachmentGate / heavyParseDocuments
      → ZIP wchodzi do heavy (gate NIE wymaga ATH w nazwie outer)

[2] useTenderDossierHeavyLazy (E-RUN)
      → skip jeśli tenderDossierHeavyParseDone
      → buildTenderDossierCostPhase

[3] prepareTenderDossierParseSession
      → buildTenderDocCandidates
           · outer: scoreTenderFilename
           · dla każdego .zip/.7z:
                unpackZipArchiveInnerCandidates
                  A) loadZipInnerEntries → Edge GET tenders-bzp-zip-catalog
                  B) jeśli brak entries → download bytes → listZipFiles (JSZip)
                  C) top ZIP_INNER_MAX (=20) → kandydat "Outer.zip → inner.ext"
           · filterOuterArchiveWhenInnerExists (usuwa outer gdy są inners)
      → discoverBestCostDocument(allCandidates)   // classifyCostDocumentType
      → selectDossierCandidates + pickCostParseCandidates
      → flagi: zipUnpackOk · zipInnerCount

[4] executeTenderDossierCostPhase
      → parseTenderDocumentCandidate × costCandidates
           · Edge zip-entry-bytes LUB readZipEntry
           · parseDocumentToKosztorys → athPreviewToSnapshot
      → bestKosztorys TYLKO gdy parsed.kosztorys?.ok

[5] buildHeavyScanSummary(partial:true)  // BEZ parsedAt
      → lokalny partial dossier (może kosztorys=null)

[6] enrichTenderDossierMetadataPhase
      → buildHeavyScanSummary(partial:false)  // ★ parsedAt = ISO
      → persist cloud

[7] tenderDossierHeavyParseDone =
      parserVersion===CURRENT
      ∧ (kosztorys?.ok ∨ scanSummary.parsedAt)
```

### 2.1 Kluczowe bramki (file:line)

| Bramka | Lokalizacja |
|--------|-------------|
| Heavy done | `tender-dossier-pipeline.ts` ~171–176 |
| `parsedAt` tylko gdy `!partial` | `tender-dossier-pipeline.ts` ~303 |
| Cost phase pick tylko `.ok` | `tender-dossier-pipeline.ts` ~355–359 |
| ZIP unpack | `tender-document-resolver.ts` ~348–399 |
| `zipUnpackOk` / `zipInnerCount` | `tender-document-resolver.ts` ~1079–1090 |
| Best kosztorys session | `tender-document-resolver.ts` ~1183–1188 |
| Cost type inner ATH | `tender-cost-discovery.ts` ~126–128 |
| Outer ZIP → `none` | `tender-cost-discovery.ts` ~154–156 |
| Edge catalog filter | `supabase/.../index.tsx` ~2798–2839 |
| UI CR-02 ZIP copy | `cost-regression-f2.ts` ~156–160, ~217–227 |

### 2.2 Odpowiedzi na 8 pytań Ownera (dla fixture RCA)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Pliki wewnątrz ZIP? | **12× ATH** (Z1+Z2) + protokół ZIP bez cost-entries w Edge |
| 2 | Które zakwalifikowane jako kandydaci? | **W udanym unpacku:** wszystkie 12 ATH → `zip_ath` / role `kosztorys`. **W failed Heavy:** **0** innerów |
| 3 | Dlaczego pozostałe odrzucone? | Outer PDF/DOCX/ZIP bez inner: nie ATH; protokół ZIP: Edge catalog **0**; rysunki bez keywordów: filtr Edge |
| 4 | Który plik wybrany do parsowania? | **Żaden kosztowy** (`costDiscovery.found=false`, `parsed=0`) |
| 5 | Czy parser uruchomiony? | **Nie** na ATH (brak cost candidates z ZIP). Metadata mogła skanować outer PDF (scanned=6) |
| 6 | Czy parser zwrócił dane? | **Nie** w sesji Heavy. **Tak** w probe offline (46 rows) |
| 7 | Czy powstał `tenderDossier.kosztorys`? | **Nie** (`null`) |
| 8 | Etap przerwania | **Etap [3] archive unpack → 0 inners** (`zipUnpackOk=false`). Potem pipeline **kontynuuje** do [6] i **myślnie kończy** HeavyDone bez snapshotu |

---

## 3. Root cause

### 3.1 Primary (twardy dowód KV)

```text
ROOT CAUSE (PRIMARY):
  Heavy archive unpack zakończył się bez żadnego zipInnerPath
  (zipUnpackOk=false, zipInnerCount=0), mimo że ZIP zawiera ATH.

  Skutek łańcuchowy:
    costDiscovery.found = false
    → costCandidates bez ATH
    → bestKosztorys = null
    → tenderDossier.kosztorys = null
    → metadata i tak ustawia scanSummary.parsedAt
    → heavyParseDone = true
    → UI CR-02: „Nie znaleziono kosztorysu w archiwum ZIP”
```

**To nie jest:** brak ATH w archiwum · błąd `parseKosztorysBytes` na tych plikach · regresja Bid · Discovery „no_candidate” (CR-02 już naprawione dla top-level ZIP).

### 3.2 Dlaczego unpack mógł się wyzerować (hipotezy — bez logu sesji w KV)

| ID | Hipoteza | Siła |
|----|----------|------|
| H1 | Transient fail Edge catalog + fail download outer ZIP (sieć / timeout logintrade) → `zip_open_failed` | **Wysoka** (pasuje do `zipUnpackOk=false`) |
| H2 | Edge zwrócił puste `entries` w momencie Heavy, a fallback JSZip nie doszedł (brak bytes) | Wysoka |
| H3 | Circuit breaker / max-runs lazy → terminal `parsedAt` bez pełnego unpack | Średnia (gate już HeavyDone) |
| H4 | Artifact cache full-hit ze „pustym” dossier | Niska (builtAt=parsedAt ten sam tick) |
| H5 | Błąd ścieżek Unicode przy listingu (dziś Edge zwraca PL ścieżki OK) | Niska dziś; możliwa historycznie |

**Brak w KV:** bufor `traceDossierPipeline` (`zip_open_failed` / `zip_inner_files_found`) — nie jest persistowany w `tenderDossier`.

### 3.3 Secondary (gdy unpack **działa**)

Nawet po udanym unpacku pozostają ryzyka (OOS tego RCA, ale na Design):

| Ryzyko | Opis |
|--------|------|
| Multi-ATH | 12 ATH (bud / san / el × lokale) — `discoverBestCostDocument` wybierze **jeden**; pozostałe nie w Bid |
| `totalValue: "0"` | Snapshot `ok` z wierszami, ale wycena może być słaba (COST / Bid — osobny tor) |
| Nazwa outer „Dokumentacja Techniczna” | Warning unpack tylko dla `/dokumentacja\s*projektowa|przedmiar|kosztorys/i` — **Techniczna** ≠ **projektowa** → **cisza** przy fail |

---

## 4. Klasyfikacja problemu

| Wymiar | Klasa |
|--------|-------|
| Warstwa | **Heavy Parse / Archive Unpack** |
| Typ | **Silent failure + false terminal HeavyDone** |
| Bucket | **B9** (zip open/unpack fail) → wygląda jak **B10** (docs-only) w UI |
| Nie jest | Bid bug · COST-PIPELINE · Epic B · Variant C Discovery unpack · F2 classifier bug |
| UI symptom | CR-02 copy ZIP-aware (poprawna względem DF CR-02; **semantycznie myląca** gdy `zipUnpackOk=false`) |

### 4.1 Macierz bucketów (referencyjna)

| Bucket | Znaczenie | Ten tender |
|--------|-----------|------------|
| B0 outer_zip_type_none | Outer ZIP ≠ cost type | Oczekiwane |
| B1 edge_catalog_drop | Edge odrzuca inner | **Nie** (dziś 12 ATH w catalog) |
| B6/B7 XLSX/PDF heurystyka | Inner bez hintu | N/A (ATH) |
| B8 nested ZIP | Brak rekurencji | Nie stwierdzono |
| **B9 zip_open_failed / empty unpack** | **0 inners** | **★ PRIMARY** |
| B10 unpack OK, brak cost | ZIP bez ATH | **FAŁSZYWY** opis UI |
| B11 parse unusable | ATH parsowany źle | **Obalone** probe |

---

## 5. Możliwe warianty naprawy (tylko Design — bez IMPLEMENT)

| Wariant | Opis | Plus | Minus |
|---------|------|------|-------|
| **A — Diagnostics + copy** | Gdy `zipUnpackOk===false` ∧ archive → copy „Nie udało się odczytać archiwum ZIP” (≠ „nie znaleziono”) · CTA Ponów | Mały scope · prawda UI | Nie tworzy kosztorysu sam |
| **B — Soft gate HeavyDone** | Nie stawiać `parsedAt` (lub nie uznawać Done) gdy są ZIP ∧ `!zipUnpackOk` | Wymusza retry | Ryzyko pętli Heavy / UX „wiecznie w toku” |
| **C — Auto-retry unpack 1×** | Przy `zipUnpackOk===false` jedna ponowna próba Edge→JSZip | Naprawia H1 transient | Timeout / storm — limity |
| **D — Persist unpack telemetry** | `scanSummary.zipOpenErrors[]` / last trace | RCA bez probe | Nie naprawia samo |
| **E — Owner Ponów (operacyjny)** | Manual re-parse — dziś ATH dostępne | Zero kodu | Nie skaluje |
| **F — Multi-ATH merge** | Łączenie wielu ATH z ZIP | Wartość biznesowa | **OOS** — duży scope, nie root tego case |

**Odrzucone teraz:** zmiana Bid · przebudowa Edge katalogu „na ślepo” bez DF · Variant C Discovery unpack · Payroll/Sync.

---

## 6. Rekomendacja

```text
REKOMENDACJA: Wariant A + C (Design Freeze COST-PARSER-01)
  1) Rozróżnij UI: zipUnpackOk=false  ≠  „brak ATH w ZIP”
  2) Jedna kontrolowana retry unpack gdy archive ∧ !zipUnpackOk
  3) (opcjonalnie D) zapisz zipInnerCount/zipUnpackOk już jest —
     dopisz powód fail do scanSummary

NIE zaczynaj od multi-ATH merge (F).
NIE ruszaj Bid / COST-PIPELINE.
NIE traktuj case jako „ZIP pusty”.
```

**Owner GO następny krok:** DESIGN FREEZE COST-PARSER-01 (allowlist: heavy unpack retry + scanSummary/UX copy; zakaz Bid).

**Operacyjnie (opcjonalnie, poza kodem):** „Ponów analizę kosztorysu” na tym tenderze — z dużym prawdopodobieństwem zbuduje `kosztorys` (ATH już parsują się w probe).

---

## 7. Relacja do CR-02

| CR-02 (Discovery ZIP) | COST-PARSER-01 |
|-----------------------|----------------|
| Naprawił kłamstwo „Brak przedmiaru…” gdy top-level ZIP | **CLOSED** |
| Copy „Nie znaleziono… w archiwum” przy heavyDone ∧ !kosztorys | **Zbyt ogólne** gdy `zipUnpackOk=false` |
| Nie gwarantował PLN / snapshot | Zgodne z DF |
| Następny tor | **Ten RCA** — naprawa Heavy unpack / semantyki fail |

---

## 8. Dowody / artefakty (READ ONLY)

| Artefakt | Rola |
|----------|------|
| Live KV `kw-tenders-pipeline` | dossier + scanSummary |
| Edge `tenders-bzp-zip-catalog` | listing ATH |
| Edge `tenders-bzp-zip-entry-bytes` + `parseKosztorysBytes` | dowód parse OK |
| `.tmp/hotfix-audit-f2-08dee178*.mjs` | wcześniejszy HOTFIX-AUDIT |
| `.tmp/cost-parser-01-zip-catalog-probe.mjs` | listing (lokalny, **nie** do commit) |
| `.tmp/cost-parser-01-ath-parse-probe.mjs` | parse probe (lokalny, **nie** do commit) |

---

## 9. STOP

```text
AUDIT COMPLETE — COST-PARSER-01 HEAVY PARSE RCA
Dokument: docs/architecture/COST-PARSER-01-HEAVY-PARSE-RCA.md

Root cause: silent ZIP unpack failure (zipUnpackOk=false, zipInnerCount=0)
            mimo 12× ATH w ZIP; HeavyDone bez kosztorys; UI CR-02 mylące.

Ath parse: OK (46 rows) gdy unpack działa.
Rekomendacja: DF A+C (copy rozróżnienie + 1× unpack retry).

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO.
```
