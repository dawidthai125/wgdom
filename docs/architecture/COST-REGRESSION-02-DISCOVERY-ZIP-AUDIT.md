# COST-REGRESSION-02 — DISCOVERY-ZIP AUDIT + DESIGN

> **ID:** COST-REGRESSION-02-DISCOVERY-ZIP-AUDIT  
> **STATUS:** **AUDIT + DESIGN COMPLETE** · **IMPLEMENT ZABLOKOWANY** do Design Freeze + Owner GO  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **tylko Discovery UI** · zero Bid · zero COST-PIPELINE · zero Epic B  
> **Wejście:** HOTFIX-AUDIT RCA tender `08dee178-1010-dbe7-ebd1-650001a84a9f` · Epic A CLOSED (`COST-REGRESSION-01-EPIC-A-CLOSEOUT.md`) · DF Epic A (`COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md`)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-REGRESSION-02):
  Gdy F2 + top-level ZIP z dokumentacją — Discovery UI
  nie kłamie „Brak przedmiaru w dokumentach”.
  Heavy już umie szukać ATH/XLSX/PDF wewnątrz ZIP.
  Nie zmieniać Bid / COST-PIPELINE / Epic B.

IMPLEMENT: ZABLOKOWANY do Design Freeze + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. Kontekst (zamrożony z RCA)

| Fakt | Wartość (live KV, tender `08dee178-…`) |
|------|----------------------------------------|
| `tenderDossier.kosztorys` | **`null`** |
| `isCostRegressionF2` | **true** (poprawnie) |
| Załączniki BZP | **7** (3× ZIP dokumentacji/protokołów + SWZ/PDF/DOCX) |
| `isPrzedmiarCandidateFilename` na top-level | **0 / 7** (wszystkie ZIP odrzucone) |
| `discoveryStatus` | **`no_candidate`** |
| UI | **„Brak przedmiaru w dokumentach”** — produktowo mylące |
| Heavy | `scanSummary.parsedAt` set · `heavyParseDone = true` · **bez** snapshotu kosztorysu |

**NIE jest to:** regresja Bid · regresja semantyki F2 Epic A · utrata danych KV.

**Jest to:** rozjazd **UI Discovery (Epic A helper)** vs **rzeczywisty tor heavy (ZIP unpack)**.

---

## 1. Czy heavy parser potrafi znaleźć ATH/XLSX/PDF wewnątrz ZIP?

### Werdykt: **TAK**

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy potrafi? | **TAK** |
| Kiedy? | Podczas **Heavy / dossier cost phase** (lazy), gdy w `bzpDocuments` (lub heavy-eligible set) jest plik `.zip` / `.7z` |
| Gdzie? | `tender-document-resolver.ts` + `tenders-bzp-doc-parse.ts` (+ Edge zip-catalog / 7z-wasm) |
| Jaki flow? | patrz §1.1 |

### 1.1 Flow (skrót)

```text
BZP attachment *.zip
  → deriveUnifiedAttachmentGate  (ZIP wchodzi do heavyParseDocuments — gate NIE filtruje po ATH)
  → useTenderDossierHeavyLazy
  → buildTenderDossierCostPhase
  → prepareTenderDossierParseSession
       → buildTenderDocCandidates
            → unpackZipArchiveInnerCandidates / 7z
                 · Edge fetchTenderZipCatalog  LUB  listZipFiles (JSZip)
                 · inner → candidate z zipInnerPath
                 · display: "outer.zip → inner.ath"
            → filterOuterArchiveWhenInnerExists (usuwa outer gdy są inners)
       → discoverBestCostDocument (typy: zip_ath / zip_xlsx / zip_pdf_przedmiar)
       → pickCostParseCandidates
  → parseTenderDocumentCandidate
       → fetch/read inner bytes po zipInnerPath
       → parseDocumentToKosztorys
  → tenderDossier.kosztorys (gdy znaleziono)
```

**Kluczowe symbole:**

| Plik | Symbole |
|------|---------|
| `src/lib/tender-document-resolver.ts` | `unpackZipArchiveInnerCandidates`, `loadZipInnerEntries`, `parseTenderDocumentCandidate`, `pickBestFromZipBytes` (fallback) |
| `src/lib/tenders-bzp-doc-parse.ts` | `listZipFiles`, `readZipEntry`, `pickBestFromZipBytes` |
| `src/lib/wgdom-7z-archive.ts` | `list7zFiles`, `read7zEntry` |
| `src/lib/tender-cost-discovery.ts` | `classifyCostDocumentType` → `zip_ath` / `zip_xlsx` / `zip_pdf_przedmiar` |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | heavy entry → cost phase |

### 1.2 Kiedy outer ZIP **nie** jest „typem kosztorysu”

W `classifyCostDocumentType`: outer `.zip`/`.7z` **bez** ` → ` (inner) → `type: "none"`.  
Kandydat kosztowy to **inner** (`outer.zip → plik.ath`), nie sama nazwa archiwum.

### 1.3 Limity / luki heavy (ważne dla Design)

| Limit | Skutek |
|-------|--------|
| `ZIP_INNER_MAX` (cap ~20) | Słabo scorowane pliki poniżej top-N mogą wypaść |
| Inner XLSX bez hintu koszt/przedm/obmiar | Może dostać `none` |
| Brak rekurencji ZIP-w-ZIP | Nested archive nie jest osobnym unpack |
| Upload-only gate | Sam upload `.zip` (bez BZP) może **nie** otworzyć heavy (`isKosztorysPreviewExt`) |
| Heavy już `HeavyDone` + `scanSummary` bez `kosztorys` | Re-parse może nadal nie znaleźć ATH (ZIP bez ATH / filtr) — UI musi to przewidzieć |

### 1.4 Wniosek do Design

Heavy **już** ma tor ZIP→inner→kosztorys.  
Problem Epic A Discovery: **nie ogląda** tego toru — patrzy tylko na **top-level filename** przez `isPrzedmiarCandidateFilename()`.

---

## 2. Czy Discovery powinno uznawać ZIP za `candidate_ready`?

### Rekomendacja robocza (do DF): **TAK — warunkowo**

| Warunek | Uzasadnienie |
|---------|--------------|
| Top-level `.zip` / `.7z` w załącznikach **i** F2 | Heavy **może** znaleźć przedmiar w środku → UI **nie** powinno mówić „brak pliku” |
| Szczególnie nazwy: dokumentacja / przedmiar / kosztorys / protokół / obmiar | Wysokie P(istnieje inner kosztowy) |
| Nie każdy ZIP (np. same zdjęcia) | Ryzyko fałszywego `candidate_ready` — DF powinien zamrozić heurystykę nazw **lub** „any BZP zip when F2” |

**Semantyka DF (propozycja):**

```text
candidate_ready ≔
  F2
  ∧ (
       top-level ATH/XLSX/PDF-przedmiar
       ∨ top-level ZIP/7Z uznany za archive_candidate
     )
```

`no_candidate` tylko gdy **brak** zarówno pliku kosztowego top-level, **jak i** archiwum-kandydata.

---

## 3. Czy `isPrzedmiarCandidateFilename()` jest zbyt restrykcyjny?

### Werdykt: **TAK — względem produktu i względem heavy**

| Reguła dziś | Skutek |
|-------------|--------|
| `.ath/.nor/.xml` | OK |
| wszystkie `.xlsx` | OK (szerokie) |
| PDF tylko z keyword | OK dla top-level PDF |
| **`.zip` / `.7z` → zawsze false** | **Zbyt wąskie** — przeczy torowi heavy |
| DOCX → false | OK (nie tor kosztorysu) |

Dla tendra RCA: 3× ZIP dokumentacji = **0 kandydatów** → fałszywy `no_candidate`.

**Uwaga DF Epic A:** świadomie mówiło „ATH/XLSX/PDF” i **nie** zamrażało ZIP. Implementacja Epic A jest **zgodna z DF A**, ale DF A **niedoszacował** case’u dokumentacji w ZIP (luka produktowa, nie bug Bid).

---

## 4. Czy zmienić: tylko copy / tylko discovery / discovery + copy?

| Opcja | Wystarczy? |
|-------|------------|
| Tylko copy | **NIE** — CTA nadal „Dołącz przedmiar” przy istniejących ZIP; Owner myli się co do akcji |
| Tylko discovery | **Prawie** — `candidate_ready` już zmienia phaseLabel + primary CTA na Ponów (macierz Epic A) |
| **Discovery + copy** | **TAK (preferowane)** — doprecyzować copy pod ZIP („w archiwum ZIP”) + discovery `candidate_ready` |

---

## 5. ZIP: `candidate_ready` czy `no_candidate`?

### Werdykt Design: **`candidate_ready`** (gdy F2 + archive_candidate)

| Status | Kiedy |
|--------|-------|
| **`candidate_ready`** | F2 ∧ (ZIP/7Z kandydujący **lub** top-level ATH/XLSX/PDF) |
| **`no_candidate`** | F2 ∧ brak top-level kosztowych **i** brak archive_candidate |
| **`parse_failed`** | F2 ∧ po re-parse / heavy bez snapshotu (już w macierzy A) |
| **`parse_running`** | bez zmian |

ZIP **nie** powinien zostać przy `no_candidate` samym faktem istnienia dokumentacji w archiwum.

---

## 6. Warianty (A–D)

### Variant A — tylko copy

**Opis:** Przy F2 + jakiekolwiek załączniki (lub ZIP) zmienić tekst z „Brak przedmiaru w dokumentach” na np. „Brak odczytanego kosztorysu” — **bez** zmiany enum discovery / CTA.

| | |
|--|--|
| **Zalety** | Najmniejszy diff; szybki; zero ryzyka storm parse |
| **Wady** | CTA nadal „Dołącz”; Owner nie dostaje „Ponów”; kłamstwo częściowo zostaje (sugeruje brak danych do działania) |
| **Ryzyko** | Niskie technicznie · średnie produktowo (pozorna „naprawa”) |
| **Wpływ na prod** | Tylko stringi Outcome/sticky |
| **Koszt** | **XS** (0.5–1 d) |

---

### Variant B — Discovery rozpoznaje ZIP (filename-level)

**Opis:** Rozszerzyć `hasPrzedmiarCandidate` / `isPrzedmiarCandidateFilename` (lub osobny `isArchiveCostCandidateFilename`): top-level `.zip`/`.7z` (opcjonalnie z heurystyką nazwy) → `candidate_ready` → istniejąca macierz A: „Brak odczytanego kosztorysu” + **Ponów analizę** (reuse heavy).

| | |
|--|--|
| **Zalety** | Naprawia RCA case; REUSE heavy (już umie ZIP); spójne z gate `heavyEligibleCount`; mały allowlist |
| **Wady** | Fałszywy `candidate_ready` na ZIP bez ATH (np. same PDF rysunki) → Ponów bez gwarancji PLN |
| **Ryzyko** | Niskie–średnie (1× re-parse per tender — guard Epic A); nie batch |
| **Wpływ na prod** | UI Discovery + CTA; **zero** Bid / COST-PIPELINE |
| **Koszt** | **S** (1–2 d + testy AC) |

---

### Variant C — Discovery analizuje zawartość ZIP

**Opis:** Przed ustawieniem discovery status UI odpala listZipFiles / Edge catalog i sprawdza inner ATH/XLSX/PDF.

| | |
|--|--|
| **Zalety** | Najwyższa precyzja `candidate_ready` vs `no_candidate` |
| **Wady** | Duplikuje heavy; koszt I/O; latency Outcome; ryzyko storm / Edge load; większy scope niż „copy/discovery UI” |
| **Ryzyko** | **Wysokie** (perf, sync storm, timeouty, cache) |
| **Wpływ na prod** | Nowy tor I/O przy otwarciu Outcome — **niepożądane** w oknie stabilizacji |
| **Koszt** | **L** (wiele dni + Edge + PV) |

---

### Variant D — Discovery + UX (B + doprecyzowanie copy/CTA)

**Opis:** Variant B **plus**:
- copy ZIP-aware: np. „W dokumentach jest archiwum ZIP — uruchom analizę kosztorysu” / hint o ATH wewnątrz ZIP;
- secondary CTA „Dołącz inny plik” zostaje;
- po `HeavyDone` ∧ F2 ∧ ZIP: preferuj copy bliski `parse_failed` / „nie znaleziono kosztorysu w archiwum” zamiast „brak przedmiaru” (opcjonalny stan `archive_parsed_empty` — tylko jeśli DF zamrozi).

| | |
|--|--|
| **Zalety** | Naprawia kłamstwo UI + właściwe CTA + edukuje Ownera; nadal REUSE heavy; domyka lukę DF A |
| **Wady** | Nieco większy scope niż B; wymaga starannej macierzy copy (nie obiecywać PLN) |
| **Ryzyko** | Niskie–średnie (jak B) + copy regression TRE labels (testy) |
| **Wpływ na prod** | Outcome / sticky / empty Kosztorysy; **zero** silników Bid |
| **Koszt** | **S–M** (2–3 d + AC + PV) |

---

## 7. Porównanie wariantów

| Kryterium | A Copy | B Discovery ZIP | C Unpack w Discovery | D Discovery+UX |
|-----------|--------|-----------------|----------------------|----------------|
| Naprawia RCA „kłamstwo UI” | częściowo | **tak** | tak | **tak** |
| Właściwe CTA Ponów | nie | **tak** | tak | **tak** |
| REUSE heavy | n/a | **tak** | częściowo duplikuje | **tak** |
| Ryzyko perf / storm | min | niskie | **wysokie** | niskie |
| Zgodność OOS Bid/Pipeline | tak | tak | ryzykowne creep | tak |
| Koszt | XS | S | L | S–M |
| Stabilization-friendly | tak | **tak** | nie | **tak** |

---

## 8. Odpowiedzi na pytania Ownera (zbiorczo)

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Czy heavy znajduje ATH/XLSX/PDF w ZIP? | **TAK** — w torze dossier cost / `tender-document-resolver` (catalog + inner parse). Limity: cap inner, brak ZIP-w-ZIP, upload-only gate. |
| 2 | Czy Discovery ma uznawać ZIP za `candidate_ready`? | **TAK (warunkowo)** — F2 + archive_candidate. |
| 3 | Czy filtr filename jest zbyt restrykcyjny? | **TAK** — odrzuca wszystkie ZIP mimo heavy. |
| 4 | Copy / discovery / oba? | **Discovery + copy (Variant D)**; minimum akceptowalne = **B**. |
| 5 | ZIP = candidate_ready czy no_candidate? | **`candidate_ready`** (nie `no_candidate`). |

---

## 9. Out of Scope (twarde)

| Obszar | Status |
|--------|--------|
| Bid / `computeTenderBidProposal` | **ZAKAZ** |
| COST-PIPELINE / `useTenderPricingAuto` resolve | **ZAKAZ** |
| AI Cost / OfferBoq engines | **ZAKAZ** |
| Payroll / Cloud Sync merge | **ZAKAZ** |
| EPIC B (F1 pusty snapshot / PDF OCR) | **ZAKAZ** |
| Nowy parser / rewrite ZIP engine | **ZAKAZ** (REUSE istniejącego) |
| Batch auto re-parse wszystkich F2+ZIP | **ZAKAZ** (storm) |

---

## 10. PAYROLL SAFETY GATE (orientacyjnie — przed przyszłym IMPLEMENT)

```text
G1–G8: NIE (Payroll / sync merge / bootstrap payroll)
G9 Routing: NIE* (*opcjonalnie deep-link Dokumenty — jak Epic A)
Gate: GREEN (UI discovery only)
```

---

## 11. Propozycja allowlist (po DF + Owner GO IMPLEMENT)

| Element | Zakres |
|---------|--------|
| `src/lib/cost-regression-f2.ts` | archive_candidate · ZIP/7Z → `candidate_ready` |
| Macierz copy (Offer Run / Outcome / sticky) | ZIP-aware hint (opcjonalnie w D) |
| Testy `scripts/test-cost-regression-02-*.mjs` | AC: ZIP → nie `no_candidate`; F2 bez plików → nadal `no_candidate` |
| Docs closeout / changelog | przy release |

**Zakaz allowlist:** bid-calculator · pricing auto resolve · OfferBoq engines · cloud-sync · Edge rewrite.

---

## 12. Ryzyka Design

| Ryzyko | Mitygacja |
|--------|-----------|
| ZIP bez ATH → Ponów bez PLN | Copy: sukces = „analiza”, nie gwarancja ceny (jak Epic A) |
| Storm re-parse | Guard F2 · max 1 · bez batch |
| Regresja TRE labels | Testy Offer Run + AC discovery |
| Scope creep Variant C | **Odrzucić C** w DF |
| Case HeavyDone już bez kosztorysu | DF: po re-parse nadal F2 → `parse_failed` / copy „nie znaleziono w archiwum”, nie wracać do „brak przedmiaru” |

---

## 13. REKOMENDACJA (jednoznaczna)

```text
REKOMENDOWANY WARIANT:  D  (Discovery + UX)
AKCEPTOWALNE MINIMUM:   B  (Discovery rozpoznaje ZIP)

ODRZUCIĆ NA START:      C  (Discovery unpacka ZIP — duplikacja heavy, risk perf)
ODRZUCIĆ JAKO JEDYNE:   A  (tylko copy — nie naprawia CTA)
```

### Dlaczego D

1. **Heavy już umie** szukać w ZIP — nie trzeba Variant C.  
2. RCA root cause = **UI Discovery filename filter**, nie silnik Bid.  
3. Sam copy (A) zostawia CTA „Dołącz” przy istniejących ZIP — produktowo błędne.  
4. B naprawia enum + CTA; D dodatkowo **doprecyzowuje komunikat** („archiwum ZIP”), żeby Owner nie mylił braku ATH top-level z brakiem dokumentów.  
5. Zakres miesci się w oknie stabilizacji: thin UI + REUSE parse, OOS silniki.

### Następny krok procesu

```text
1. Owner GO → DESIGN FREEZE (COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md)
2. Zamrozić: definicję archive_candidate · macierz copy · AC · allowlist
3. Dopiero potem Owner GO IMPLEMENTATION
```

---

## 14. STOP

```text
AUDIT + DESIGN COMPLETE — COST-REGRESSION-02 DISCOVERY-ZIP
Dokument: docs/architecture/COST-REGRESSION-02-DISCOVERY-ZIP-AUDIT.md

Rekomendacja: Variant D (min. B) · Odrzuć C jako first slice · A niewystarczające

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do Design Freeze.
```
