# COST-PARSER-01 — ZIP-UNPACK DESIGN FREEZE

> **ID:** COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE  
> **EPIC:** COST-PARSER-01 · **CHILD:** ZIP-UNPACK  
> **STATUS:** **DESIGN FREEZE · IMPLEMENTED** · UI **2.65.73** · czekaj tip commit w closeout  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** PARSER / Heavy Dossier · **#CORE-013** — zero Payroll · zero sync merge · **zero Bid / COST-PIPELINE / AI Cost / OfferBoq**  
> **Wejście:** [`COST-PARSER-01-HEAVY-PARSE-RCA.md`](COST-PARSER-01-HEAVY-PARSE-RCA.md) · CR-02 CLOSED [`COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md`](COST-REGRESSION-02-DISCOVERY-ZIP-DESIGN-FREEZE.md) · Epic A [`COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md`](COST-REGRESSION-01-EPIC-A-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-PARSER-01 · ZIP-UNPACK):
  Rozróżnij A/B/C po Heavy ZIP:
    A) unpack failed
    B) unpack OK · brak ATH/XLSX/PDF kosztowego
    C) unpack OK · parser nie zbudował kosztorysu
  1× retry unpack. Prawdziwy copy. Zero Bid.

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE* (*REUSE istniejący persist dossier po Heavy / Ponów — bez nowego merge / kluczy)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE* (*bez nowych deep-linków; CTA Ponów jak Epic A / CR-02)

Wynik: Gate GREEN.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Cel (zamrożony)

| Cel | Opis |
|-----|------|
| **Semantyka A/B/C** | Nie mylić „nie odczytano ZIP” z „w ZIP nie ma kosztorysu” ani z „parser padł” |
| **UI copy** | Macierz komunikatów per stan A/B/C (+ running) |
| **HeavyDone** | Terminal tylko po wyczerpaniu reguł §4 (w tym 1× retry) |
| **Retry** | Dokładnie **jedna** automatyczna ponowna próba unpack przy fail |
| **Sukces** | Operator / UI wie **dlaczego** brak `kosztorys`; transient unpack ma szansę recovery |

**Sukces 01 ≠** zawsze PLN / zawsze multi-ATH merge.  
**Sukces 01 =** poprawna klasyfikacja A/B/C + właściwy copy + 1× retry unpack.

**Zamrożony pakiet:** RCA rekomendacja **A (copy) + C (1× retry)** + zamrożona semantyka HeavyDone (§4).  
**Odrzucone w tym DF:** Soft-gate „nigdy Done przy `zipUnpackOk=false`” (pętla Heavy) · Multi-ATH merge · zmiana Bid · redefiniowanie `archive_candidate` CR-02.

---

## 2. Definicje sygnałów (zamrożone)

### 2.1 Istniejące (REUSE — bez zmiany kontraktu nazwy)

| Sygnał | Źródło | Znaczenie |
|--------|--------|-----------|
| `hasTopLevelZip` | top-level `.zip`/`.7z` w załącznikach (jak CR-02 `hasArchiveCandidate`) | Jest archiwum do unpack |
| `zipUnpackOk` | `scanSummary.zipUnpackOk` / sesja parse | `true` gdy **brak** ZIP **lub** ≥1 ZIP ma ≥1 `zipInnerPath` |
| `zipInnerCount` | `scanSummary.zipInnerCount` | Liczba kandydatów z `zipInnerPath` |
| `kosztorys.ok` | `tenderDossier.kosztorys?.ok` | Snapshot kosztorysu |
| `costDiscovery.found` | `scanSummary.costDiscovery.found` | Wykryto typ kosztowy wśród kandydatów |
| `heavyParseDone` | `tenderDossierHeavyParseDone` | `parserVersion` OK ∧ (`kosztorys.ok` ∨ `scanSummary.parsedAt`) |

### 2.2 Nowe (zamrożone intencje — IMPLEMENT po GO)

| Sygnał | Znaczenie zamrożone |
|--------|---------------------|
| `zipUnpackRetryUsed` | Czy **już** zużyto 1× auto-retry unpack w tej sesji Heavy (lub fingerprint run) |
| `zipCostInnerPresent` | Po unpack OK: istnieje inner sklasyfikowany jako kosztowy (`zip_ath` / `zip_xlsx` / `zip_pdf_przedmiar` / nor/xml analog) |
| `zipParseAttempted` | ≥1 cost candidate z ZIP był przekazany do `parseTenderDocumentCandidate` |

**Zasada:** nie wymagać nowego KV klucza. Preferuj pola w `scanSummary` / sesji parse (persist dossier jak dziś).

---

## 3. Rozróżnienie stanów A / B / C (zamrożone)

Wymaganie wejściowe: F2 (`!kosztorys.ok`) ∧ `hasTopLevelZip`.

```text
priorytet klasyfikacji (pierwszy match wygrywa):

1. parse_running / Heavy I/O w toku
     → (osobno) RUNNING — poza A/B/C

2. hasTopLevelZip
   ∧ zipUnpackOk === false
   ∧ (po regułach §4: retry wyczerpany LUB jeszcze przed terminalem)
     → STAN A — ZIP unpack failed

3. hasTopLevelZip
   ∧ zipUnpackOk === true
   ∧ ¬zipCostInnerPresent
   ∧ !kosztorys.ok
     → STAN B — unpack OK · brak ATH/XLSX/PDF kosztowego

4. hasTopLevelZip
   ∧ zipUnpackOk === true
   ∧ zipCostInnerPresent
   ∧ !kosztorys.ok
     → STAN C — unpack OK · parser nie odczytał kosztorysu

5. else (bez ZIP / inne F2)
     → semantyka Epic A / CR-02 (bez zmian definicji archive_candidate)
```

### 3.1 Tabela stanów

| Stan | Warunek (skrót) | Co się stało technicznie | Co **nie** wolno mówić w UI |
|------|-----------------|--------------------------|-----------------------------|
| **A** | ZIP ∧ `!zipUnpackOk` | Brak (lub 0) `zipInnerPath` — Edge/JSZip/download fail | „Nie znaleziono kosztorysu w archiwum” · „Brak przedmiaru w dokumentach” |
| **B** | ZIP ∧ unpack OK ∧ brak inner kosztowych | Listing OK; filtry / brak ATH·XLSX·PDF-przedmiar | „Nie udało się odczytać archiwum” (to A) |
| **C** | ZIP ∧ unpack OK ∧ inner kosztowy ∧ `!kosztorys.ok` | Kandydat był; parse null / unusable / nie wybrany | „Brak przedmiaru w dokumentach” · „nie odczytano ZIP” |

### 3.2 Mapowanie na RCA buckets

| Stan | Bucket RCA |
|------|------------|
| A | **B9** (zip open / empty unpack) |
| B | **B10** (+ B1/B6/B7 gdy listing odrzucił) |
| C | **B11** / B12 (parse unusable / nie selected) |

### 3.3 Fixture RCA `08dee178…`

| Pole live | Stan DF |
|-----------|---------|
| `zipUnpackOk: false`, `zipInnerCount: 0`, ATH istnieją w ZIP | **A** (nie B) |
| Copy CR-02 „Nie znaleziono… w archiwum ZIP” | **Niezgodny z A** — do korekty macierzą §5 |

---

## 4. HeavyDone przy `zipUnpackOk == false` (zamrożone)

### 4.1 Decyzja

```text
Czy HeavyDone MOŻE być ustawione gdy zipUnpackOk == false?

  TAK — ale TYLKO jako TERMINAL po wyczerpaniu 1× auto-retry unpack (§6).

  NIE — w trakcie pierwszej próby ani w trakcie retry
        (nie stawiać scanSummary.parsedAt / nie uznawać Done).
```

### 4.2 Nowa semantyka (zamrożona)

```text
BEFORE (dziś — RCA):
  metadata phase zawsze może ustawić parsedAt
  nawet gdy zipUnpackOk=false ∧ zipInnerCount=0
  → HeavyDone + mylący copy „nie znaleziono w ZIP”

AFTER (ten DF):
  1) Pierwszy unpack → zipUnpackOk=false
        → NIE terminal HeavyDone
        → uruchom 1× retry unpack (§6)
  2a) Retry → zipUnpackOk=true
        → kontynuuj cost/metadata jak dziś
        → HeavyDone wg istniejącej reguły (kosztorys.ok ∨ parsedAt)
  2b) Retry → nadal zipUnpackOk=false
        → wolno ustawić parsedAt / HeavyDone (terminal STAN A)
        → UI = macierz stanu A (nie B)
  3) Brak top-level ZIP
        → bez zmian względem Epic A / CR-02
```

### 4.3 Konsekwencje decyzji „TAK (po retry)”

| Konsekwencja | Opis |
|--------------|------|
| Gate Closed / HeavyDone | Po terminalu A — gate może być Closed; **Ponów** (manual) nadal dozwolony (Epic A guard F2) |
| Ryzyko false negative ATH | Nadal możliwe po 2 failach sieci — akceptowalne v1; copy A mówi o odczycie archiwum |
| Brak pętli Heavy | Soft-gate „nigdy Done” **odrzucony** — unikamy wiecznego `parse_running` |
| CR-02 | `archive_candidate` / enum discovery **bez redefinicji**; zmienia się **tylko** copy gdy wiemy, że to A vs B/C |
| Persist | Dossier z `zipUnpackOk:false` + `parsedAt` jest legalnym terminalem A |

### 4.4 Odrzucona semantyka

| Opcja | Werdykt |
|-------|---------|
| HeavyDone natychmiast przy pierwszym `zipUnpackOk=false` | **ZAKAZ** (to jest bug RCA) |
| Nigdy HeavyDone przy `zipUnpackOk=false` | **ZAKAZ** (pętla / UX) |
| Batch auto-retry wszystkich F2+ZIP w portfolio | **ZAKAZ** |

---

## 5. Macierz komunikatów UI (zamrożona)

Powierzchnie: Outcome / Offer Run / sticky / empty Kosztorysy (REUSE CR-02 surfaces).  
**Nie** zmieniać definicji `archive_candidate` CR-02.  
**Rozszerzyć** presentation/copy o stan A/B/C gdy F2 ∧ ZIP.

| Stan | `phaseLabelPl` (primary) | Hint (secondary) | Primary CTA | Secondary |
|------|--------------------------|------------------|-------------|-----------|
| **RUNNING** | Trwa analiza kosztorysu… | Po zakończeniu wycena uruchomi się automatycznie. | none | — |
| **A — unpack failed** | **Nie udało się odczytać archiwum ZIP** | System nie otworzył zawartości ZIP (sieć / katalog / pobranie). To nie oznacza, że w archiwum nie ma kosztorysu. Ponów analizę. | **Ponów analizę** | Dołącz inny plik |
| **B — unpack OK · brak kosztowych** | **Nie znaleziono kosztorysu w archiwum ZIP** | Heavy przeanalizował załączniki ZIP, ale nie wykryto ATH/XLSX/PDF przedmiaru. Sprawdź zawartość lub dołącz inny plik. To nie awaria kalkulatora oferty. | **Ponów analizę** | Dołącz inny plik |
| **C — unpack OK · parse fail** | **Nie udało się odczytać kosztorysu z archiwum** | W ZIP był kandydat kosztowy, ale nie powstał snapshot kosztorysu. Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty. | **Ponów analizę** | Dołącz inny plik |
| Legacy CR-02 (gdy brak sygnału `zipUnpackOk` w starym dossier) | Jak CR-02 „Nie znaleziono… w archiwum ZIP” | Jak CR-02 | Ponów | Dołącz |

### 5.1 Flagi `data-*` (allowlist)

REUSE: `data-cost-regression-f2` · `data-cost-regression-discovery` · `data-cost-regression-archive` · `data-cost-regression-reparse-cta`

**Nowe (opcjonalne, v1):**  
`data-cost-parser-zip-state="unpack_failed|no_cost_inner|parse_failed"`

### 5.2 Relacja do CR-02 copy

| Copy CR-02 | Po tym DF |
|------------|-----------|
| „Nie znaleziono kosztorysu w archiwum ZIP” | **Tylko stan B** (i legacy bez flagi) |
| (brak osobnego A) | **Nowy** wiersz A |
| „Nie udało się odczytać kosztorysu” (ogólny) | Preferuj **C** gdy ZIP+inner; ogólny zostaje dla non-ZIP F2 |

**Zakaz:** Discovery Variant C (unpack w warstwie Discovery UI). Unpack zostaje w Heavy.

---

## 6. Jednorazowy retry unpack (zamrożony)

### 6.1 Trigger

```text
IF hasTopLevelZip
AND zipUnpackOk === false po pierwszym buildTenderDocCandidates / unpack
AND zipUnpackRetryUsed === false
THEN
  zipUnpackRetryUsed = true
  wyczyść / nie używaj pustego artifact cache cost dla tego fingerprint (jeśli blokuje)
  powtórz unpack (Edge catalog → fallback JSZip) dokładnie 1 raz
  kontynuuj prepare session z wynikiem retry
```

### 6.2 Limity twarde

| Reguła | Wartość |
|--------|---------|
| Liczba auto-retry | **1** (nie 2+) |
| Scope | **tylko unpack** (nie pełny storm parse wszystkich PDF) |
| Concurrent | max **1** Heavy run per tender (REUSE lazy circuit) |
| Batch portfolio | **ZAKAZ** |
| Manual „Ponów analizę” | **nie** liczy się do `zipUnpackRetryUsed` sesji auto — to nowy run użytkownika (guard F2) |

### 6.3 Po retry

| Wynik | Dalej |
|-------|-------|
| `zipUnpackOk=true` | Normalny cost phase → możliwe B lub C lub sukces `kosztorys.ok` |
| `zipUnpackOk=false` | Terminal **A** · wolno HeavyDone (§4) |

### 6.4 Telemetria (minimalna, allowlist)

Preferuj rozszerzenie `scanSummary` (bez nowego KV):

```text
zipUnpackOk
zipInnerCount
zipUnpackRetryUsed?: boolean
zipUnpackFailReason?: "edge_empty" | "download_failed" | "open_failed" | "unknown"
```

(Dokładny enum implementacyjny może być węższy — intencja zamrożona.)

---

## 7. Acceptance Criteria (zamrożone)

| ID | Kryterium |
|----|-----------|
| **AC-ZU-1** | Fixture: `hasTopLevelZip` ∧ `zipUnpackOk=false` ∧ retry wyczerpany → klasyfikacja **A** · copy **„Nie udało się odczytać archiwum ZIP”** · **nie** „Nie znaleziono kosztorysu w archiwum ZIP” |
| **AC-ZU-2** | Fixture: unpack OK ∧ brak inner kosztowych ∧ F2 → klasyfikacja **B** · copy „Nie znaleziono kosztorysu w archiwum ZIP” |
| **AC-ZU-3** | Fixture: unpack OK ∧ inner `zip_ath` ∧ parse nie dał `kosztorys.ok` → klasyfikacja **C** · copy „Nie udało się odczytać kosztorysu z archiwum” |
| **AC-ZU-4** | Przy pierwszym `zipUnpackOk=false` **przed** retry: **brak** terminalnego HeavyDone (`parsedAt` nie ustawia terminalu A przed retry) |
| **AC-ZU-5** | Auto-retry unpack wykonuje się **≤1** raz na run; drugi fail → terminal A + HeavyDone dozwolone |
| **AC-ZU-6** | Manual Ponów (F2) nadal działa (Epic A / CR-02 guard) — bez zależności od `zipUnpackRetryUsed` poprzedniego auto-run |
| **AC-ZU-7** | Diff: **brak** zmian `tenders-bid-calculator` · `useTenderPricingAuto` resolve · OfferBoq engines · cloud-sync merge · Payroll |
| **AC-ZU-8** | **Brak** zmiany definicji CR-02 `archive_candidate` / `hasPrzedmiarCandidate` (tylko copy/stan A/B/C) |
| **AC-ZU-9** | Pure test `scripts/test-cost-parser-01-zip-unpack.mjs` (lub równoważny) pokrywa A/B/C + retry counter |
| **AC-ZU-10** | `npm run build` PASS |

---

## 8. Rollback

| Element | Rollback |
|---------|----------|
| Copy A/B/C | Revert presentation → semantyka CR-02 (jedno „nie znaleziono w ZIP”) |
| 1× retry unpack | Usuń gałąź retry → poprzedni single-pass unpack |
| HeavyDone gate przed retry | Przywróć natychmiastowy `parsedAt` (niezalecane; tylko awaryjnie) |
| Pola `scanSummary` nowe | Ignorowane przez stary UI — bezpieczne |
| Dane `kosztorys` po udanym retry | **Zostają** |
| Regresja Bid PLN | Natychmiastowy revert bundle COST-PARSER-01 — **nie** patchuj kalkulatora |

---

## 9. Allowlist (IMPLEMENT — po Owner GO)

| Obszar | Zakres |
|--------|--------|
| Heavy unpack session | 1× retry gdy `!zipUnpackOk` · flaga `zipUnpackRetryUsed` |
| `scanSummary` | opcjonalnie `zipUnpackRetryUsed` / `zipUnpackFailReason` |
| `tenderDossierHeavyParseDone` / `parsedAt` timing | Semantyka §4 (nie Done przed retry) |
| Presentation / copy F2+ZIP | Macierz §5 stany A/B/C (helper presentation — **bez** zmiany `archive_candidate`) |
| Outcome / sticky / empty | Copy + opcjonalny `data-cost-parser-zip-state` |
| Test | `scripts/test-cost-parser-01-zip-unpack.mjs` |
| Changelog | bump UI przy release |

**Zakaz allowlist:**  
`tenders-bid-calculator` · `computeTenderBidProposal` · `useTenderPricingAuto` resolve · COST-PIPELINE flaga · AI Cost / OfferBoq engines · Payroll · cloud-sync merge · redefinicja CR-02 `archive_candidate` · Variant C Discovery unpack · multi-ATH merge · Edge zip-catalog rewrite (chyba że osobny GO).

---

## 10. Out of Scope (twarde)

| Obszar | Status |
|--------|--------|
| Bid / `computeTenderBidProposal` | **ZAKAZ** |
| COST-PIPELINE / pricing auto resolve | **ZAKAZ** |
| AI Cost / OfferBoq engines | **ZAKAZ** |
| Discovery CR-02 (`archive_candidate` / enum) | **ZAKAZ redefinicji** — tylko copy A/B/C |
| Payroll | **ZAKAZ** |
| Cloud Sync (nowy merge / klucze) | **ZAKAZ** |
| Multi-ATH merge / wybór wielu lokali | **ZAKAZ** (osobny epic) |
| Nested ZIP-in-ZIP recursion | **ZAKAZ** v1 |
| Gwarancja PLN po retry | **NIE** |

---

## 11. Ryzyka (zamrożone mitygacje)

| Ryzyko | Mitygacja DF |
|--------|--------------|
| Retry podwaja czas Heavy | Tylko gdy `!zipUnpackOk`; max 1× |
| Pętla HeavyDone | Terminal A po retry — §4 |
| Copy A vs B pomylone | AC-ZU-1…3 · priorytet §3 |
| Scope creep Bid | §10 ZAKAZ |
| Stare dossier bez `zipUnpackOk` | Legacy wiersz CR-02 §5 |

---

## 12. Kolejność IMPLEMENT (po Owner GO)

| Krok | Deliverable |
|------|-------------|
| M0 | Owner GO IMPLEMENTATION |
| M1 | Klasyfikator A/B/C (pure) z `scanSummary` / session |
| M2 | Semantyka HeavyDone §4 + 1× retry unpack |
| M3 | Macierz copy UI §5 |
| M4 | Testy AC-ZU-1…10 · build · changelog · PV |

---

## 13. Relacja do CR-02 / Epic A

| Element | Ten DF |
|---------|--------|
| CR-02 `archive_candidate` | **BEZ ZMIAN** |
| CR-02 copy „Nie znaleziono… w archiwum” | **Zawężone do stanu B** (+ legacy) |
| Epic A F2/F1 / re-parse guard | **REUSE** |
| RCA `08dee178` stan A | **Cel naprawczy v1** |

---

## 14. STOP

```text
DESIGN FREEZE COMPLETE — COST-PARSER-01 ZIP-UNPACK
Dokument: docs/architecture/COST-PARSER-01-ZIP-UNPACK-DESIGN-FREEZE.md

Zamrożone:
  stany A / B / C
  macierz UI
  HeavyDone przy zipUnpackOk=false → TAK tylko PO 1× retry (terminal A)
  1× auto-retry unpack
  AC-ZU-1…10 · rollback · allowlist · OOS

Bid / COST-PIPELINE / AI Cost / OfferBoq / CR-02 archive_candidate /
Payroll / Sync / multi-ATH = ZAKAZ

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO do IMPLEMENTATION.
```
