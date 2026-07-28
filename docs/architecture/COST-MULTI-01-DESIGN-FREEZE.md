# COST-MULTI-01 — MULTI COST DOCUMENT · DESIGN FREEZE

> **ID:** COST-MULTI-01-DESIGN-FREEZE  
> **EPIC:** COST-MULTI-01 · MULTI COST DOCUMENT STRATEGY  
> **STATUS:** **DESIGN FREEZE · IMPLEMENTED (M1–M3)** · UI **2.65.74** · Owner GO IMPLEMENTATION **DONE**  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **model biznesowy + warstwa klasyfikacji/agregacji** · **#CORE-013**  
> **Wejście:** [`COST-MULTI-01-AUDIT.md`](COST-MULTI-01-AUDIT.md) · fixture `08dee335-f338-1f30-ebd1-65000155122a`  
> **IMPL:** [`COST-MULTI-01-IMPLEMENTATION-REPORT.md`](COST-MULTI-01-IMPLEMENTATION-REPORT.md) · [`CLOSEOUT`](COST-MULTI-01-CLOSEOUT.md)

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-MULTI-01 DF):
  Zastąpić ciche ONE COST DOCUMENT świadomym modelem
  Cost Package + Branch Package z klasyfikacją relacji
  i polityką agregacji (NIE ślepe sum(all)).

  Bid / Discovery / parsers / COST-PIPELINE / Payroll /
  Cloud Sync = OUT OF SCOPE tego DF (osobny GO + DF
  na konsumpcję wyceny).

IMPLEMENT M1–M3: DONE (2.65.74). M4 Bid: nadal OOS.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*brak nowych LS kluczy w v1)
G3 Cloud Sync:   NIE* (*bez nowego DATA_KEYS / merge SSOT;
                      ewentualny zapis = istniejący persist
                      itemu pipeline / dossier — bez edycji
                      cloud-sync.ts)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      TAK* (*opcjonalny deep-link tab Kosztorys /
                      Dokumenty — istniejący router)

Wynik: Gate GREEN.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Cel zamrożony

| Cel | Opis |
|-----|------|
| **Model biznesowy** | `CostPackage` + `BranchPackage` jako SSOT relacji dokumentów kosztowych |
| **Klasyfikacja** | Relacje: ta sama branża · inna branża · wariant · duplikat · rewizja · etap · opcja |
| **Agregacja** | Polityka warunkowa (SUM / BEST / HOLD) — **zakaz** `sum(all)` bez klasyfikacji |
| **Jawność** | UI/kontrakt: ile dokumentów, które w pakiecie, które wykluczone, dlaczego |
| **Kompatybilność** | Ścieżka ONE (`tenderDossier.kosztorys`) **zostaje** w v1 — warstwa MULTI jest **addycyjna** |

**Sukces DF ≠** automatycznie poprawne PLN w Bid.  
**Sukces DF =** zamrożony model + reguły + AC + rollback, gotowe do IMPLEMENT po Owner GO.

**Fixture sukcesu biznesowego (późniejsza weryfikacja):** dla `08dee335` system rozpoznaje **≥3 rozłączne branże** + sygnał **niepełnego ONE** — bez wymogu zmiany Bid w v1.

---

## 2. OUT OF SCOPE (zamrożone)

| Obszar | Status w COST-MULTI-01 v1 |
|--------|---------------------------|
| **Bid** (`tenders-bid-calculator`, Bid UI, sticky oferta) | **OOS** — konsumpcja pakietu = osobny DF / Owner GO |
| **Discovery** (`discoverBestCostDocument` zachowanie ONE) | **OOS** — nie zmieniać turnieju `best` |
| **ZIP / 7Z unpack** | **OOS** |
| **ATH / NOR / XML parser** | **OOS** |
| **PDF przedmiar parser** | **OOS** |
| **COST-PIPELINE / AI Cost / OfferBoq** | **OOS** |
| **Payroll** | **OOS** |
| **Cloud Sync** (`cloud-sync.ts`, merge, nowe klucze KV) | **OOS** |
| Ślepe **`sum(all)`** kandydatów kosztowych | **ZAKAZANE** na zawsze w tym epicu |

**REUSE (dozwolone w IMPLEMENT v1):**

- istniejąca lista kandydatów / wyniki heavy (`allCandidates`, `costCandidates`, snapshoty już sparsowane),
- istniejące heurystyki nazw (`classifyCostDocumentType`, `isPdfPrzedmiarCostFilename`, depriority opcji z `scoreCostTitleMatch`),
- istniejący `tenderDossier.kosztorys` jako **Branch member** lub **legacy winner** (read-only względem Bid).

---

## 3. Zasady nadrzędne (zamrożone)

```text
P1  NIE sum(all).
P2  Najpierw klasyfikuj relacje, potem agreguj.
P3  Przy niepewności → HOLD_MANUAL (nie auto-SUM).
P4  Wykluczenia > agregacja (najpierw odfiltruj).
P5  ONE legacy path pozostaje; MULTI jest addycyjne.
P6  Bid nie czyta CostPackage w v1 (OOS).
P7  Każda decyzja agregacji ma reason code (auditowalny).
P8  Duplikat / rewizja / wariant / opcja / etap
    NIGDY nie wchodzą do SUM bazowego razem z bazą.
```

---

## 4. Model: Cost Package

### 4.1 Definicja

**Cost Package** = kontener poziomu **przetargu / przedmiotu zamówienia (lot)**, grupujący wszystkie wykryte dokumenty kosztowe oraz wynik polityki agregacji.

Nie zastępuje pliku ATH/PDF. Opisuje **relacje i politykę**, nie format parse.

### 4.2 Pola logiczne (kontrakt — zamrożony kształt)

```text
CostPackage {
  tenderItemId: string
  lotKey: string | null          // null = domyślny / nieznany lot
  status: CostPackageStatus
  members: CostDocumentRef[]     // wszystkie wykryte kosztowe
  branches: BranchPackage[]      // po klasyfikacji branż
  exclusions: CostExclusion[]    // z reason code
  aggregate: CostAggregate | null
  legacyOneWinner: CostDocumentRef | null  // obecny dossier.kosztorys source
  incompleteness: IncompletenessSignal
  policyVersion: "cost-multi-01-v1"
  builtAt: ISO-8601
}

CostPackageStatus =
  | "empty"                 // brak dokumentów kosztowych
  | "single"                // dokładnie 1 member po exclusions
  | "multi_ready"           // ≥2 rozłączne branże, auto-SUM dozwolony
  | "multi_hold"            // ≥2 dokumenty, ale polityka wymaga Ownera
  | "conflict"              // sprzeczne sygnały (np. wariant + brak bazy)

IncompletenessSignal {
  legacyOneCoversAllBranches: boolean
  selectedCount: number       // ile w aggregate.included
  detectedCostCount: number
  missingBranchHints: string[]  // np. ["budowlana","elektryczna"] gdy ONE=pensjonat
  messageKey: string          // UI copy key — nie hardcod PLN
}
```

### 4.3 `CostDocumentRef` (zamrożony)

```text
CostDocumentRef {
  id: string                    // stabilny klucz: documentIndex + zipInnerPath|filename
  filename: string
  zipInnerPath?: string
  costType: TenderCostDocumentType | "unknown"
  parseOk: boolean | null       // null = nie parsowano / nieznane w v1
  rowCount: number | null
  totalValuePln: number | null  // tylko gdy znane z ATH; null dla PDF qty-only
  branchHint: BranchCode | "unknown"
  relationHints: RelationHint[] // surowe sygnały przed finalną relacją
  roleInPackage: MemberRole
}

MemberRole =
  | "included_base"      // w SUM / BEST bazowym
  | "excluded"
  | "held"               // czeka na decyzję
  | "legacy_winner"      // ONE path (informacyjnie)
  | "alternate"          // wariant / opcja (osobny tor)
```

### 4.4 Semantyka statusów

| Status | Znaczenie biznesowe | Auto-agregacja |
|--------|---------------------|----------------|
| `empty` | Brak kosztowych | brak |
| `single` | Jeden dokument = pakiet | BEST = ten dokument |
| `multi_ready` | Rozłączne branże, pewność OK | **SUM branch winners** |
| `multi_hold` | Multi, ale ryzyko | **brak SUM** — Owner |
| `conflict` | Sprzeczność reguł | **brak SUM** |

---

## 5. Model: Branch Package

### 5.1 Definicja

**Branch Package** = grupa dokumentów kosztowych przypisanych do **jednej branży** (lub `unknown`) w ramach jednego `CostPackage` / `lotKey`.

Wewnątrz branży obowiązuje **BEST (jeden zwycięzca)**, nigdy SUM wielu wersji tej samej branży.

### 5.2 Branch codes (zamrożona taksonomia v1)

```text
BranchCode =
  | "construction"   // budowlana / ogólnobudowlana
  | "electrical"     // elektryczna / teletechnika (v1: jedna koszyk)
  | "sanitary"       // sanitarna / hydrauliczna / wod-kan
  | "fire"           // hydrant / ppoż / tryskacze
  | "hvac"           // wentylacja / klimatyzacja
  | "finishes"       // wykończenia / lokale / mieszkania (ostrożnie)
  | "other"          // rozpoznana branża spoza listy
  | "unknown"        // brak sygnału branży
```

**Mapowanie nazw (v1 — heurystyka filename, REUSE stylu discovery):**

| Sygnał w nazwie (PL, case-insensitive) | BranchCode |
|----------------------------------------|------------|
| `budowlana`, `ogólnobudowl`, `konstrukcy` | `construction` |
| `elektrycz`, `elektro`, `teletech` | `electrical` |
| `sanitar`, `hydraul`, `wod.-kan`, `wodkan` | `sanitary` |
| `hydrant`, `ppoż`, `ppoz`, `tryskacz` | `fire` |
| `wentyl`, `klimatyz`, `hvac` | `hvac` |
| `mieszkan`, `lokal`, `wytchnieni`, `wykońc` | `finishes` |
| brak | `unknown` |

**Fixture `08dee335` (oczekiwane v1):**

| Plik | branchHint |
|------|------------|
| `…_b_budowlana_…` | `construction` |
| `…_b_elektryczna_…` | `electrical` |
| `…hydrantowa…` | `fire` |
| `…Pensjonat…lokaleOZN…` | `finishes` |

### 5.3 Pola `BranchPackage`

```text
BranchPackage {
  branch: BranchCode
  members: CostDocumentRef[]     // ta sama branża (po klasyfikacji)
  winner: CostDocumentRef | null // BEST wewnątrz branży
  winnerRule: "sole" | "tier_rows" | "revision_latest" | "manual" | "none"
  status: "ok" | "ambiguous" | "empty"
}
```

**Reguła BEST wewnątrz branży (v1):**

1. Wyklucz `excluded` / formal offer.  
2. Preferuj wyższy tier źródła (ATH > NOR > XML > XLSX > PDF) — **REUSE** semantyki `kosztorysSourceQualityTier` / `pickBetterKosztorys` **bez zmiany** merge globalnego.  
3. Przy tym samym tierze: wyższy `rowCount`.  
4. Przy remisie: nowsza **rewizja** jeśli wykryta; inaczej HOLD (`ambiguous`).  
5. **Nigdy** nie SUM-uj memberów tej samej branży.

---

## 6. Reguły klasyfikacji dokumentów

Klasyfikacja działa **parami** (A, B) oraz **per dokument** (sygnały solo). Wynik finalny: `RelationType`.

### 6.1 `RelationType` (zamrożone)

```text
RelationType =
  | "same_branch"      // ta sama branża (konkurenci / wersje)
  | "other_branch"     // inna branża (kandydat do SUM pakietu)
  | "variant"          // wariant / oferta wariantowa / zamienny
  | "duplicate"        // ten sam zakres, ta sama wersja (lub near-dup)
  | "revision"         // nowsza/starsza wersja tego samego zakresu
  | "stage"            // etap I/II / faza
  | "option"           // prawo opcji / zakres opcjonalny
  | "unrelated_lot"    // inna część zamówienia (lot) — v1: HOLD
  | "unknown"          // brak pewności
```

### 6.2 Sygnały solo (per plik)

| Sygnał | RelationHint | Priorytet wykluczenia |
|--------|--------------|----------------------|
| `prawo opcji`, `opcja`, `opcjonaln` | `option` | wysoki |
| `wariant`, `alternatyw`, `zamienn` | `variant` | wysoki |
| `etap`, `faza`, `część I`, `czesc 1`, `stage` | `stage` | wysoki |
| `rev`, `wersja`, `v2`, `poprawion`, `aktualiz` | `revision` | średni |
| formal offer / formularz cenowy | *(exclusion)* | najwyższy |
| branża z mapy §5.2 | `branch:*` | klasyfikacja |

### 6.3 Reguły pary (A vs B) — zamrożona kolejność

```text
classifyRelation(A, B):
  1. Jeśli którykolwiek formal_offer → exclude (nie relation do SUM)
  2. Jeśli lotKey(A) ≠ lotKey(B) (gdy oba znane) → unrelated_lot
  3. Jeśli option hint na A lub B → option (względem bazy)
  4. Jeśli variant hint → variant
  5. Jeśli stage hint różny etap → stage
  6. Jeśli same branchHint (oba ≠ unknown):
       - near-identical filename / same basename → duplicate
       - revision signals → revision
       - else → same_branch
  7. Jeśli różne branchHint (oba ≠ unknown) → other_branch
  8. Jeśli jeden unknown → unknown
  9. Else → unknown
```

### 6.4 Pewność klasyfikacji

```text
ClassificationConfidence =
  | "high"    // oba branchHint znane i różne/same + brak conflicting hints
  | "medium"  // jeden sygnał silny
  | "low"     // unknown / konflikt sygnałów
```

**Zamrożone:** `auto-SUM` wymaga **wyłącznie** relacji `other_branch` z confidence **high** między winnerami branż.  
`low` / `unknown` → `multi_hold`.

---

## 7. Reguły wykluczeń

Wykluczenia stosowane **przed** agregacją. Każde ma `ExclusionReasonCode`.

### 7.1 Reason codes (zamrożone)

| Code | Znaczenie | Trafia do aggregate base? |
|------|-----------|---------------------------|
| `formal_offer` | Formularz oferty / cenowy wykonawcy | **NIE** |
| `option_scope` | Prawo opcji / zakres opcjonalny | **NIE** (osobny tor `alternate`) |
| `variant_scope` | Wariant / zamienny | **NIE** (alternate) |
| `stage_out_of_base` | Etap poza zakresem oferty bazowej (v1: zawsze HOLD, nie auto) | **NIE** auto |
| `duplicate_of_winner` | Duplikat względem winnera branży | **NIE** |
| `superseded_revision` | Starsza rewizja | **NIE** |
| `unsupported_type` | Typ nieobsługiwany jako koszt | **NIE** |
| `parse_failed` | Parse nie-ok (gdy znane) | **NIE** |
| `manual_exclude` | Owner wykluczył (przyszłe UI) | **NIE** |
| `lot_mismatch` | Inny lot | **NIE** |

### 7.2 Kolejność wykluczeń

```text
1. formal_offer
2. unsupported_type
3. parse_failed (gdy parseOk === false)
4. option_scope / variant_scope / stage_out_of_base / lot_mismatch
5. wewnątrz BranchPackage: duplicate_of_winner / superseded_revision
6. manual_exclude
```

---

## 8. Reguły agregacji

### 8.1 Polityki (zamrożone) — NIE `sum(all)`

```text
AggregatePolicy =
  | "BEST_SINGLE"           // 0–1 dokument po exclusions
  | "SUM_BRANCH_WINNERS"    // suma WYŁĄCZNIE winnerów BranchPackage
  | "HOLD_MANUAL"           // brak auto; wymagana decyzja Ownera
```

### 8.2 Wybór polityki

```text
selectPolicy(package):
  members = afterExclusions(package.members)

  if members.length === 0 → status empty; policy n/a
  if members.length === 1 → BEST_SINGLE

  build BranchPackages from members

  if any member has unresolved option|variant|stage|lot
     without clear base separation → HOLD_MANUAL

  if any BranchPackage.status === ambiguous → HOLD_MANUAL

  if count(branches with winner, branch ≠ unknown) >= 2
     AND all pairwise relations among winners are other_branch
     AND confidence high
     AND zero unknown winners required for completeness
     → SUM_BRANCH_WINNERS

  if count >= 2 but unknown branches present
     → HOLD_MANUAL

  if all members collapse to one branch
     → BEST_SINGLE (winner tej branży)  // NIE suma wersji

  else → HOLD_MANUAL
```

### 8.3 Co oznacza SUM_BRANCH_WINNERS (semantyka v1)

```text
CostAggregate {
  policy: "SUM_BRANCH_WINNERS"
  included: CostDocumentRef[]     // dokładnie 1 winner per branch
  excluded: CostExclusion[]
  metrics: {
    branchCount: number
    totalRowCount: number | null  // suma rowCount winnerów (jeśli znane)
    totalValuePln: number | null  // suma totalValuePln TYLKO gdy
                                  // WSZYSTKIE included mają wartość;
                                  // inaczej null (PDF qty-only → null)
  }
  warnings: string[]              // reason codes czytelne
}
```

**Zamrożone ograniczenia SUM:**

1. SUM dotyczy **dokumentów-winnerów branż**, nie surowych plików.  
2. Jeśli choć jeden included nie ma `totalValuePln` → `aggregate.metrics.totalValuePln = null` (nie zgaduj PLN).  
3. `totalRowCount` może być sumą qty-lines — **to nie jest cena oferty**.  
4. **v1 nie woła Bid** do przeliczenia aggregate.  
5. Dokumenty `finishes` + `construction` w tym samym pakiecie: jeśli oba `other_branch` high → mogą wejść do SUM; jeśli podejrzane pokrycie zakresu (przyszła heurystyka overlap) → HOLD.  
   **v1 overlap content:** **NIE** (brak porównywania treści pozycji) — tylko nazwy/branże. Przy `finishes` + `construction` bez dalszych sygnałów: **dozwolone SUM** (fixture 08dee335), z warningiem `scope_overlap_unchecked`.

### 8.4 Odrzucone polityki (explicit)

| Polityka | Status |
|----------|--------|
| `sum(all files)` | **ZAKAZ** |
| `sum(all parsed)` bez branch | **ZAKAZ** |
| Auto-SUM przy `unknown` branch | **ZAKAZ** |
| Auto-SUM wariant+baza | **ZAKAZ** |
| Auto-SUM opcja+baza | **ZAKAZ** |
| Zmiana Bid na aggregate w v1 | **OOS** |

---

## 9. Macierz decyzji

### 9.1 Macierz relacji → akcja

| Relacja A↔B | Akcja w pakiecie bazowym | Aggregate |
|-------------|--------------------------|-----------|
| `other_branch` (high) | Oba mogą być winnerami swoich BranchPackage | kandydat **SUM** |
| `same_branch` | BEST wewnątrz branży | **nie SUM** tej pary |
| `duplicate` | jeden exclude `duplicate_of_winner` | **nie SUM** |
| `revision` | starsza → `superseded_revision` | BEST nowsza |
| `variant` | alternate; exclude z bazy | **HOLD** jeśli brak jasnej bazy |
| `option` | alternate; exclude z bazy | baza bez opcji |
| `stage` | v1: **HOLD_MANUAL** | brak auto |
| `unrelated_lot` | osobne CostPackage / exclude | brak SUM cross-lot |
| `unknown` | **HOLD_MANUAL** | brak auto-SUM |

### 9.2 Macierz liczby dokumentów

| Sytuacja | Status pakietu | Policy |
|----------|----------------|--------|
| 0 kosztowych | `empty` | — |
| 1 kosztowy | `single` | `BEST_SINGLE` |
| N≥2, wszystkie same_branch | `single` (po BEST) | `BEST_SINGLE` |
| N≥2, ≥2 other_branch high, bez hold-flag | `multi_ready` | `SUM_BRANCH_WINNERS` |
| N≥2, mixed unknown / stage / variant unresolved | `multi_hold` | `HOLD_MANUAL` |
| Konflikt wariant vs brak bazy | `conflict` | `HOLD_MANUAL` |

### 9.3 Macierz vs legacy ONE

| Legacy ONE | CostPackage | Sygnał UI (v1) |
|------------|-------------|----------------|
| 1 doc = jedyny member | `single` | zgodne — bez alarmu multi |
| ONE winner, ale ≥2 other_branch detected | `multi_ready` lub `multi_hold` | **„Wykryto N przedmiarów branżowych — wycena ONE może być niepełna”** |
| ONE = finishes, inne = construction/electrical/fire | jak wyżej (fixture) | incompleteness: `legacyOneCoversAllBranches=false` |

**Zamrożone:** v1 **nie zmienia** wartości `tenderDossier.kosztorys` ani Bid. Tylko **sygnał incompleteness** + struktura pakietu.

### 9.4 Fixture `08dee335` — decyzja oczekiwana

```text
members: 4 PDF przedmiar
branches:
  construction → budowlana
  electrical   → elektryczna
  fire         → hydrantowa
  finishes     → pensjonat/OZN
pairwise winners: other_branch × high
policy: SUM_BRANCH_WINNERS
status: multi_ready
legacyOneWinner: pensjonat/OZN
incompleteness.legacyOneCoversAllBranches: false
aggregate.totalValuePln: null   // PDF bez ATH total
aggregate.totalRowCount: suma rowCount jeśli znane po parse
Bid: BEZ ZMIAN (OOS)
```

Jeśli w IMPLEMENT rowCount innych PDF niejest dostępny bez re-parse:  
`parseOk/rowCount = null` dla non-legacy → **nie blokuje** `multi_ready` klasyfikacji filename; metrics częściowe + warning `row_counts_partial`.  
**Zakaz** uruchamiania nowych parserów w v1 wyłącznie dla metrics (OOS parsers) — metrics best-effort z już sparsowanych snapshotów.

---

## 10. Fazy IMPLEMENT (po Owner GO) — bez Bid

Zamrożony podział, żeby nie mieszać OOS:

| Faza | Zakres | OOS nadal |
|------|--------|-----------|
| **M1 — Model + classify** | Lib: typy, `classifyRelation`, `buildBranchPackages`, `selectPolicy`, reason codes + testy jednostkowe na nazwach (fixture filename set) | Bid, Discovery, parsers, sync |
| **M2 — Package attach** | Budowa `CostPackage` z istniejących kandydatów/dossier; opcjonalny zapis addycyjny w item pipeline **bez** `cloud-sync.ts` | Bid |
| **M3 — UX sygnał** | Read-only: „N przedmiarów / incomplete ONE / HOLD” na Kosztorys/Dokumenty | Bid, sticky PLN |
| **M4+** | Konsumpcja przez Bid / catalog | **Wymaga osobnego DF + Owner GO** |

**Definition of Done epiku v1 = M1+M2+M3.**  
M4 **nie** jest w tym DF.

---

## 11. Acceptance Criteria

### 11.1 AC modelu (M1)

| ID | Kryterium |
|----|-----------|
| **AC-M1-01** | Istnieje kontrakt `CostPackage` / `BranchPackage` zgodny z §4–§5 |
| **AC-M1-02** | `sum(all)` **nie** występuje jako policy |
| **AC-M1-03** | Fixture filenames `08dee335` → 4 branchHints zgodne z §5.2 |
| **AC-M1-04** | Pary other_branch → policy `SUM_BRANCH_WINNERS` |
| **AC-M1-05** | Dwa pliki `…budowlana…` + `…budowlana…v2…` → same_branch/revision, **nie** SUM obu |
| **AC-M1-06** | Plik z `prawo_opcji` → exclude `option_scope` |
| **AC-M1-07** | Plik wariant → nie w bazie SUM |
| **AC-M1-08** | `unknown` branch + inny known → `HOLD_MANUAL` |
| **AC-M1-09** | Każde exclude ma `ExclusionReasonCode` z §7.1 |
| **AC-M1-10** | Testy lib PASS bez uruchamiania Bid/parsers |

### 11.2 AC pakietu (M2)

| ID | Kryterium |
|----|-----------|
| **AC-M2-01** | Dla fixture: `detectedCostCount >= 4` |
| **AC-M2-02** | `legacyOneWinner` wskazuje Pensjonat/OZN **lub** aktualny dossier source (jeśli się zmieni) |
| **AC-M2-03** | `incompleteness.legacyOneCoversAllBranches === false` gdy ≥2 other_branch |
| **AC-M2-04** | Istniejący `tenderDossier.kosztorys` **niezmieniony** semantycznie przez builder pakietu |
| **AC-M2-05** | Brak zmian w `cloud-sync.ts` / Payroll / Bid |

### 11.3 AC UX (M3)

| ID | Kryterium |
|----|-----------|
| **AC-M3-01** | Przy `multi_ready` / `multi_hold`: widoczny sygnał „wykryto N przedmiarów branżowych” |
| **AC-M3-02** | Przy `HOLD_MANUAL`: copy nie obiecuje PLN z SUM |
| **AC-M3-03** | Lista memberów: included vs excluded + powód (skrót) |
| **AC-M3-04** | Przy `single` / `empty`: brak fałszywego alarmu multi |
| **AC-M3-05** | Recommended Bid / sticky **bez zmian** vs baseline przed M3 |

### 11.4 AC negatywne (cały v1)

| ID | Kryterium |
|----|-----------|
| **AC-N-01** | Brak wywołań zmian API Bid |
| **AC-N-02** | Brak zmian `discoverBestCostDocument` |
| **AC-N-03** | Brak zmian parserów ZIP/ATH/PDF |
| **AC-N-04** | Brak `sum(all)` w kodzie policy |
| **AC-N-05** | Gate Payroll G1–G9 bez regresji |

---

## 12. Rollback

### 12.1 Zasada

Warstwa MULTI jest **addycyjna**. Rollback = wyłączenie feature + ignorowanie `CostPackage` bez migracji wstecznej Bid (Bid i tak nie czyta pakietu w v1).

### 12.2 Kroki rollback

```text
1. Feature flag OFF: COST_MULTI_01 = false
   (lub revert commitów M1–M3)
2. UI przestaje renderować sygnały multi / incompleteness
3. Builder CostPackage nie uruchamia się (lub wynik discard)
4. tenderDossier.kosztorys / ONE path / Bid — bez zmian
5. Brak cleanup KV wymaganego (brak nowego DATA_KEYS)
6. Smoke: fixture ONE winner nadal działa jak przed M1
```

### 12.3 Kryteria rollback PASS

| # | Kryterium |
|---|-----------|
| R1 | Brak crash na detalu przetargu |
| R2 | `kosztorys.ok` legacy bez regresji |
| R3 | Bid recommended (jeśli był) bez zmiany ścieżki |
| R4 | Brak residual UI „N przedmiarów” po fladze OFF |

### 12.4 Czego rollback **nie** robi

- nie „naprawia” niedoszacowania ONE (wraca świadomie do AS-IS audytu),
- nie usuwa dokumentów z ZIP,
- nie wymaga restore KV.

---

## 13. Decyzje Ownera zamrożone w tym DF

| # | Pytanie z audytu | Decyzja DF |
|---|------------------|------------|
| 1 | SUM vs HOLD domyślnie przy N branżach? | **SUM_BRANCH_WINNERS** tylko przy `other_branch` × high; inaczej **HOLD_MANUAL** |
| 2 | UI luka „1 z N”? | **TAK** w M3 (sygnał incompleteness) — bez zmiany PLN Bid |
| 3 | ATH multi = PDF multi? | **TAK** — ta sama taksonomia Branch/Relation; tier BEST wewnątrz branży bez zmian parserów |
| 4 | Czy Bid w v1? | **NIE** (OOS) — osobny DF |
| 5 | Czy `sum(all)`? | **NIE** — zakaz permanentny w epicu |

---

## 14. Ryzyka (zaakceptowane w DF)

| Ryzyko | Mitigacja v1 |
|--------|--------------|
| Fałszywy `other_branch` z nazwy | confidence + HOLD przy unknown; warning overlap |
| `finishes` pokrywa się z `construction` | warning `scope_overlap_unchecked`; brak content-diff w v1 |
| Brak rowCount non-winner bez re-parse | metrics partial; klasyfikacja filename i tak działa |
| Owner oczekuje od razu PLN ~1,6 mln | **poza v1** — wymaga M4 Bid DF |
| Dwa loty nierozpoznane | `unrelated_lot` / HOLD — nie SUM |

---

## 15. Dokumenty powiązane

| Dokument | Rola |
|----------|------|
| [`COST-MULTI-01-AUDIT.md`](COST-MULTI-01-AUDIT.md) | RCA + potwierdzenie ONE vs MULTI |
| Ten plik | **Design Freeze v1** |
| *(przyszły)* `COST-MULTI-01-BID-DESIGN-FREEZE.md` | Konsumpcja aggregate przez Bid — **nie istnieje**, wymaga osobnego GO |
| CR-01 / CR-02 / PARSER-01 | Osobne epiki — **nie** łączyć w jeden commit z MULTI |

---

## 16. Stop

```text
STATUS: DESIGN FREEZE COMPLETE
IMPLEMENT: ZABLOKOWANY
COMMIT / PUSH: NIE (docs-only sesja — czekaj Owner GO na commit docs
                 oraz osobno na IMPLEMENTATION)
OOS: Bid · Discovery · ZIP/ATH/PDF parsers · COST-PIPELINE ·
     Payroll · Cloud Sync · sum(all)

Czekam na Owner GO do IMPLEMENTATION (M1→M3).
```
