# COST-REGRESSION-01 — PLAN naprawy

> **ID:** COST-REGRESSION-01-PLAN  
> **MODE:** **DOCS ONLY** · **bez implementacji** · **bez commit** · **bez push**  
> **Owner GO:** PLAN  
> **Data:** 2026-07-28  
> **Wejście:** [`COST-REGRESSION-01-AUDIT.md`](COST-REGRESSION-01-AUDIT.md) · [`COST-REGRESSION-01-TRACE.md`](COST-REGRESSION-01-TRACE.md)  
> **H3:** **ODRZUCONA** · WAVE 2 **nie** jest regresją silnika Bid

```text
════════════════════════════════════════════════════════
ROZDZIELENIE:
  EPIC A = F2 — brak kosztorysu w dossier
  EPIC B = F1 — pusty snapshot (0 rows · 0 qty)

IMPLEMENT: ZABLOKOWANY do Design Freeze + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. Kontekst TRACE (produkt)

| Populacja WM (prod KV) | n |
|------------------------|---|
| WM w pipeline | 13 |
| Z ceną | 6 |
| Bez ceny | **7** |
| z czego **F2** | **6** |
| z czego **F1** | **1** |

Objaw UI: Outcome / sticky → **„Brak rekomendowanej ceny”** (`recommendedBidPln` nie `> 0`).

**Zakaz w obu epicach (do DF):** zmiana kontraktu F1–F4 silnika Bid · zmiana COST-PIPELINE wire · Payroll · Cloud Sync merge ogólny · WAVE 2 UI.

---

# EPIC A — F2: Brak kosztorysu w dossier

**ID roboczy:** `COST-REGRESSION-01-A` · **Klasa Bid:** **F2**  
**Warning SSOT:** *„Brak kosztorysu ATH/XLSX — wczytaj załącznik, aby wyliczyć ofertę.”*  
**Signal TRACE:** `kosztorysOk=null` · `parsedAt=null` · `sourceFilename=null` · OfferBoq **null** → catalog → `ok:false`

---

## A.1 Root Cause

**Warstwa:** **dane / pipeline dokumentów**, nie kalkulator Bid.

`tenderDossier.kosztorys` **nie istnieje** (lub nie jest `ok`) w zapisanym itemie pipeline. Przyczyny kandydackie (do DF — wybrać jedną ścieżkę primary):

| RC-A | Opis | Pewność po TRACE |
|------|------|------------------|
| **A1** | Heavy/partial parse **nigdy nie zapisał** kosztorysu (brak ATH/XLSX/PDF przedmiaru w załącznikach albo nierozpoznany plik) | **WYSOKA** (najczęstszy wzorzec) |
| **A2** | Dokumenty są, ale **discovery / gate** nie uruchomił parse przedmiaru | **ŚREDNIA** (wymaga probe załączników per ID) |
| **A3** | Parse wystąpił, wynik **nie zmergowany / nadpisany** pustką | **NISKA–ŚREDNIA** (brak dowodu w TRACE; osobny probe merge) |

Ścieżka Bid jest **poprawna**: OfferBoq null → catalog → F2. Naprawa A **nie** polega na „obejściu F2 w kalkulatorze”, tylko na **dostarczeniu `kosztorys`**.

---

## A.2 Wpływ na użytkowników

| Obszar | Efekt |
|--------|-------|
| Outcome / TRE | Natychmiastowe **„Brak rekomendowanej ceny”** |
| Sticky Kosztorysy | Ten sam komunikat (brak OfferBoq summary) |
| Zaufanie | Owner odbiera jako „wycena zepsuta” mimo że Bid działa, gdy dossier ma przedmiar |
| Skala WM | **~6/7** faili WM w TRACE = ta klasa → **główny ból biznesowy** |

---

## A.3 Zakres danych

| Element | Zakres |
|---------|--------|
| Encja | `TenderPipelineItem` w `kw-tenders-pipeline` |
| Pole krytyczne | `tenderDossier.kosztorys` (obecnie **null** / brak) |
| Powiązane | załączniki dossier · heavy parse · `athPreviewToSnapshot` |
| Przykłady TRACE | `08dede90-…`, `08dee7ec-…`, `08dee3f6-…`, `08dedc1f-…`, `08ded29e-…`, `08ded122-…` |
| Poza zakresem A | Snapshot z `ok:true` i 0 rows (**to Epic B**) · dead `catalogQuantities` przy działającym OfferBoq |

---

## A.4 Możliwe warianty naprawy

| ID | Wariant | Opis | Effort | Rekomendacja wstępna |
|----|---------|------|--------|----------------------|
| **A-V1** | **Diagnostyka + CTA UX** | Jawny status: „Brak przedmiaru w dossier — dołącz ATH/XLSX/PDF” + deep-link Dokumenty; bez auto-rewrite Bid | S | **Must** (nawet jeśli V2 later) |
| **A-V2** | **Re-run discovery/parse** | Dla F2: akcja „Ponów analizę kosztorysu” (reuse pipeline bootstrap) gdy załączniki istnieją | M | **Primary fix danych** |
| **A-V3** | **Batch audit załączników** | Skrypt READ/repair: które F2 mają plik przedmiaru nierozpoznany | M | Evidence Gate przed V2 |
| **A-V4** | **Zmiana F2 → fałszywy catalog** | Generowanie Bid bez kosztorysu | — | **ZAKAZ** (fałszywe PLN) |
| **A-V5** | **ensure-on-read bez snapshotu** | — | — | **Niewykonalne** (brak wejścia) |

**Kierunek DF (propozycja):** Evidence Gate (A-V3) → A-V2 (gdy plik jest) + A-V1 (zawsze).

---

## A.5 Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| Re-parse nadpisze dobry dossier | Guard: tylko gdy `!kosztorys?.ok` / brak kosztorysu |
| Fałszywy „sukces” bez przedmiaru | Nie zmieniać F2 na ok:true bez danych |
| Storm parse na wielu tenderach | Batch limit · Owner GO · sandbox IDs |
| Pomylenie z Epic B | Osobny ticket / osobny DF |

---

## A.6 Rollback

| Scenariusz | Akcja |
|------------|-------|
| CTA UX (A-V1) | Revert UI copy/status |
| Re-parse (A-V2) | Nie auto-rollback KV; restore z backup pipeline jeśli merge zepsuje |
| Batch | Tylko dry-run domyślnie; write = Owner GO |

---

## A.7 Acceptance Criteria (Epic A)

| ID | Kryterium |
|----|-----------|
| **AC-A1** | Tender F2 bez pliku przedmiaru: UI **nie** obiecuje ceny; komunikat ≠ „silnik zepsuty” |
| **AC-A2** | Tender F2 **z** rozpoznanym załącznikiem przedmiaru: po re-parse `kosztorys.ok` **lub** jawny fail parse (nie milczący null) |
| **AC-A3** | Po udanym parse: `resolveTenderPricingAutoProposal` może zwrócić PLN **lub** przejść do Epic B / OfferBoq — ale **nie** F2 |
| **AC-A4** | Zero zmian `computeTenderBidProposal` kontraktu F1–F4 |
| **AC-A5** | Regresja: tender z obecną ceną (OfferBoq/catalog) **bez** zmiany PLN (fixture TRACE OK) |
| **AC-A6** | Test/smoke: klasyfikacja F2 vs F1 na fixturech z TRACE |

---

## A.8 Szacowany wpływ na produkcję

| Metryka | Szacunek |
|---------|----------|
| WM bez ceny dziś | ~7 |
| Adresowane przez A (F2) | **~6** (~85% faili WM) |
| Szansa odzyskania Bid po samym A | **Tylko** gdy załącznik przedmiaru istnieje i parse się uda |
| Ryzyko regresji Bid silnika | **Niskie** (A nie rusza kalkulatora) |
| Czas do wartości Ownera | **Szybki** przy A-V1; **średni** przy A-V2 |

---

# EPIC B — F1: Pusty snapshot (0 rows · 0 qty)

**ID roboczy:** `COST-REGRESSION-01-B` · **Klasa Bid:** **F1**  
**Warning SSOT:** *„Brak cen w kosztorysie i brak ilości do wyceny katalogowej — wczytaj przedmiar ATH.”*  
**Signal TRACE:** `kosztorysOk=true` · plik obecny · **`rows=0`** · **`catalogQuantities=0`** · OfferBoq null · ensure **no-op**

**Przykład:** `08dee401-…5521cf` (paczka VIII · `3-go Maja 2A_1 - przedmiar.pdf` · `parsedAt` 2026-07-25)

---

## B.1 Root Cause

**Warstwa:** **jakość / kompletność parse PDF (lub innego) przedmiaru**, nie martwe `catalogQuantities` (H3 odrzucone).

Snapshot powstał (`ok:true`, `sourceFilename`, `parsedAt`), ale **bez linii ilościowych**:

| RC-B | Opis | Pewność |
|------|------|---------|
| **B1** | PDF przedmiar: **brak / słaba warstwa tekstu** → 0 rows (heurystyka Case 3 / extract fail) | **ŚREDNIA–WYSOKA** |
| **B2** | Parser uznał plik za „ok” zbyt wcześnie (puste preview → `ok:true`) | **ŚREDNIA** |
| **B3** | Zły plik podpięty jako przedmiar (nie ATH qty) | **NISKA–ŚREDNIA** |
| **B4** | CATALOG-BID ensure odzyska qty | **ODRZUCONA** na tym case (brak rows → ensure no-op) |

`pricingMode=null` → F1 jest **oczekiwane** przy pustym wejściu. Naprawa B = **wypełnić rows/qty** albo **nie oznaczać pustego snapshotu jako sukcesu parse**.

---

## B.2 Wpływ na użytkowników

| Obszar | Efekt |
|--------|-------|
| UI | Identyczny string „Brak rekomendowanej ceny” jak F2 → **trudna diagnostyka** |
| Różnica vs F2 | Owner widzi plik w Kosztorysach / Evidence, ale wycena martwa → większa frustracja |
| Skala WM TRACE | **1/7** faili — mniejsza liczebnie, wyższy koszt zaufania per case |
| OfferBoq | Nie startuje (brak linii) — brak „ratunku” jak przy Grafit |

---

## B.3 Zakres danych

| Element | Zakres |
|---------|--------|
| Encja | `tenderDossier.kosztorys` **istniejący** |
| Kryteria B | `ok===true` ∧ `rows.length===0` ∧ brak usable qty ∧ brak ATH total>0 |
| Pola diagnostyczne | `pdfPrzedmiarCase` · `pdfPrzedmiarNoTextLayer` · `pdfPrzedmiarExtractError` · `warnings` |
| Poza zakresem B | Brak całego `kosztorys` (**Epic A**) · Bid tail / marża |

---

## B.4 Możliwe warianty naprawy

| ID | Wariant | Opis | Effort | Rekomendacja wstępna |
|----|---------|------|--------|----------------------|
| **B-V1** | **Fail-loud pustego snapshotu** | Nie prezentować „Gotowe” gdy 0 rows; status „Przedmiar bez pozycji — sprawdź PDF” | S–M | **Must UX** |
| **B-V2** | **Re-parse PDF z diagnostyką Case** | Ponów heurystykę / OCR path tylko gdy Case 3 / noTextLayer | M–L | **Primary recovery** |
| **B-V3** | **Ręczne podmiana pliku ATH** | Owner workflow (już możliwy) + lepszy hint | S | Complementary |
| **B-V4** | **ensureKosztorysCatalogQuantities on-read** | Pomaga tylko gdy są rows z qty | — | **Niewystarczające** dla 0-rows (TRACE) |
| **B-V5** | **Obniżyć próg `ok:true`** | `ok` wymaga ≥1 qty line lub ATH total | M | Rozważyć w DF (zmiana semantyki snapshotu — ostrożnie) |

**Kierunek DF (propozycja):** B-V1 + (opcjonalnie B-V5) · recovery B-V2 po forensics pliku VIII.

---

## B.5 Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| `ok:false` na wielu historycznych PDF „pustych ale oznaczonych ok” | Feature flag / tylko nowe parse |
| OCR / re-parse kosztowny | Tylko F1 empty · Owner GO |
| False positive „pusty” przy ATH-only totals | Guard: ATH total>0 → nie Epic B |
| Scope creep parsera PDF | Osobny DF; nie łączyć z Epic A |

---

## B.6 Rollback

| Scenariusz | Akcja |
|------------|-------|
| UX fail-loud | Revert status copy |
| Zmiana semantyki `ok` | Feature flag off |
| Re-parse | Snapshot poprzedni w item (jeśli zachowany) / re-upload |

---

## B.7 Acceptance Criteria (Epic B)

| ID | Kryterium |
|----|-----------|
| **AC-B1** | Fixture paczka VIII: UI rozróżnia **pusty przedmiar** od **braku pliku** (≠ sam F2 copy) |
| **AC-B2** | Po udanym re-parse z qty>0: `pricingMode` ∈ {`catalog`,`ath_priced`} **lub** OfferBoq PLN>0 |
| **AC-B3** | `ensure` na 0-rows **nie** jest akceptowany jako „naprawa” (test: ensure no-op) |
| **AC-B4** | Tender z ATH total>0 **nie** klasyfikowany jako Epic B |
| **AC-B5** | Zero zmian kontraktu F1 early-return (warning może zostać; zmienia się **wejście** lub **status parse**) |
| **AC-B6** | Regresja CATALOG-BID-01 (qty>0 materializacja) PASS |

---

## B.8 Szacowany wpływ na produkcję

| Metryka | Szacunek |
|---------|----------|
| WM FAIL adresowane przez B | **~1/7** w TRACE (może więcej poza WM) |
| Wartość | Wysoka jakość diagnostyki + odzysk konkretnych PDF |
| Ryzyko regresji | **Średnie** przy zmianie semantyki `ok` |
| Zależność od A | Niska (inne wejście) |

---

## 3. Porównanie Epic A vs B (macierz)

| | **Epic A (F2)** | **Epic B (F1)** |
|--|-----------------|-----------------|
| `kosztorys` | brak | jest, pusty |
| Skala WM FAIL | ~85% | ~15% |
| Naprawa primary | discovery / parse start | jakość PDF parse / fail-loud |
| ensure CATALOG-BID | n/a | no-op |
| Bid calculator | bez zmian | bez zmian |
| Priorytet biznesowy | **Wyższy** (więcej tenderów) | Niższy liczebnie, wyższy „zaufanie” |

---

## 4. Rekomendacja (kolejność · razem vs osobno)

### 4.1 Kolejność realizacji

```text
1) Design Freeze EPIC A (F2)  →  IMPLEMENT A (UX + re-parse gdy plik)
2) Design Freeze EPIC B (F1)  →  IMPLEMENT B (fail-loud + PDF recovery)
```

**Uzasadnienie kolejności:**

1. **F2 adresuje większość** objawu „wiele WM bez ceny” (TRACE 6/7).  
2. F2 i F1 mają **różne root cause** i różne pliki/pipeline — łączenie w jeden release zwiększa ryzyko Shared / złej diagnozy.  
3. Epic B wymaga forensics PDF (Case / text layer) — nie powinno blokować szybkiego A-V1.  
4. H3 odrzucone — **nie** planować „ensure-on-read” jako naprawy głównej.

### 4.2 Razem czy osobno?

| Decyzja | Werdykt |
|---------|---------|
| **Jeden wspólny IMPLEMENT bundle A+B?** | **NIE** — osobne Design Freeze + osobne releasy |
| **Wspólny epic tracking COST-REGRESSION-01?** | **TAK** (parent) · child A / child B |
| **Wspólny copy UI „Brak rekomendowanej ceny”?** | Rozdzielić w A-V1/B-V1 (różne komunikaty) — można dostarczyć w A, doprecyzować w B |

### 4.3 Co NIE robić

- Nie „naprawiać” Bid przez ukrywanie F1/F2.  
- Nie cofać COSTORYS-UX WAVE 2.  
- Nie traktować CATALOG-BID-01 ensure jako fix Epic B (0 rows).  
- Nie łączyć z parser rewrite bez DF Epic B.

---

## 5. STOP

```text
PLAN COMPLETE — COST-REGRESSION-01
EPIC A = F2 (brak kosztorysu)
EPIC B = F1 (pusty snapshot)
Rekomendacja: osobno · najpierw A · potem B

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do DESIGN FREEZE
(preferowane: najpierw DF EPIC A).
```
