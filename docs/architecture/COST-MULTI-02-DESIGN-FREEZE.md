# COST-MULTI-02 — AGGREGATE BID · DESIGN FREEZE

> **ID:** COST-MULTI-02-DESIGN-FREEZE  
> **EPIC:** COST-MULTI-02 · AGGREGATE BID  
> **STATUS:** **DESIGN FREEZE · Owner GO (architektura)** · **IMPLEMENT ZABLOKOWANY** do Owner GO IMPLEMENTATION  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Klasa:** FEATURE / Przetargi · **wejście Bid z CostPackage Aggregate** · **#CORE-013**  
> **Wejście:** [`COST-MULTI-01-DESIGN-FREEZE.md`](COST-MULTI-01-DESIGN-FREEZE.md) · [`COST-MULTI-01-CLOSEOUT.md`](COST-MULTI-01-CLOSEOUT.md) · UI tip **2.65.74**  
> **Zakaz sesji DF:** bez kodu · bez commit · bez push

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (COST-MULTI-02):
  Podłączyć CostPackage Aggregate (SUM_BRANCH_WINNERS)
  jako wejście do Bid — zamiast cichego legacy ONE —
  z jawnym przełączeniem, HOLD, fallback i rollback.

  NIE zmieniać parserów / Discovery / ZIP / Payroll / Sync.
  NIE sum(all) plików.

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENTATION.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (przed przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE* (*brak nowych LS kluczy; flaga w kodzie/config)
G3 Cloud Sync:   NIE* (*bez nowego DATA_KEYS / bez edycji cloud-sync.ts;
                      ewentualny zapis artefaktów = istniejący persist
                      itemu pipeline / dossier — addycyjnie)
G4 Bootstrap:    NIE (Payroll)
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE* (*bez nowych tras; UI w istniejącym Kosztorys/Outcome)

Wynik: Gate GREEN.
Owner GO IMPLEMENTATION: WYMAGANE przed kodem.
```

---

## 1. Problem AS-IS (po COST-MULTI-01)

```text
Parser / Heavy
  → allCandidates + costCandidateSources
  → CostPackage / BranchPackage / Aggregate
  → UX banner „ONE niepełne”
  → STOP

Bid / OfferBoq / AI Cost nadal:
  tenderDossier.kosztorys   ← JEDEN snapshot (legacy ONE)
```

**Skutek biznesowy (fixture `08dee335`):** Bid ~0,28–0,29 mln z jednego PDF (Pensjonat), Owner ~1,6 mln z kompletu branż.

COST-MULTI-01 = **wykrycie + polityka**.  
COST-MULTI-02 = **konsumpcja Aggregate przez wycenę**.

---

## 2. Cel zamrożony

| Cel | Opis |
|-----|------|
| **Aggregate → Bid** | Gdy `SUM_BRANCH_WINNERS` + warunki spełnione → Bid liczy z **zagregowanego wejścia**, nie z samego ONE |
| **Jawne przełączenie** | Adapter SSOT decyduje: `ONE` \| `AGGREGATE` \| `MANUAL_HOLD` |
| **HOLD bezpieczny** | Przy `HOLD_MANUAL` / `conflict` — **nie** zawyżać / nie zaniżać cicho; fallback + UX |
| **Kompatybilność** | Flaga OFF = zachowanie 2.65.74 (MULTI-01 UX + Bid ONE) |
| **Bez rewrite Bid core** | REUSE `computeTenderBidProposal` / catalog / OfferBoq wire — zmienia się **wejście kosztorysu**, nie formuła marży |

**Sukces 02 ≠** nowe parsery.  
**Sukces 02 =** przy `multi_ready` + kompletnych qty winnerów branż Bid widzi **sumę zakresów branżowych** (fixture: rząd ~Owner, nie ~jeden PDF).

---

## 3. OUT OF SCOPE (zamrożone)

| Obszar | Status |
|--------|--------|
| ZIP / 7Z unpack | **OOS** |
| Discovery `discoverBestCostDocument` (turniej ONE) | **OOS** — ONE nadal buduje `tenderDossier.kosztorys` |
| ATH / NOR / XML / PDF / XLSX **algorytmy** parserów | **OOS** |
| Payroll · Cloud Sync (`cloud-sync.ts`) | **OOS** |
| Ślepe `sum(all)` plików / pozycji bez BranchPackage | **ZAKAZ** |
| Auto-SUM przy `HOLD_MANUAL` / `conflict` / `unknown` branch | **ZAKAZ** |
| Zmiana semantyki Kp / marży / employer burden w Bid | **OOS** (REUSE) |
| Pełny content-overlap detector branż | **OOS** (ostrzeżenie `scope_overlap_unchecked` zostaje) |

**REUSE dozwolone:**

- `resolveCostPackageFromItem` / `buildCostPackage` (MULTI-01)
- `computeTenderBidProposal`, `resolveTenderBidPricingMode`, catalog engine
- `resolveTenderPricingAutoProposal` / OfferBoq → Bid wire (COST-PIPELINE) — **tylko przez wspólny resolver wejścia**
- Istniejące wyniki parse z heavy (`costCandidates` / snapshoty) — **bez** nowych formatów plików

---

## 4. Architektura docelowa

### 4.1 Diagram przepływu (zamrożony)

```text
┌─────────────────────────────────────────────────────────────┐
│  Heavy / Parser (bez zmian algorytmów)                      │
│  allCandidates → costCandidateSources → (opcjonalnie)       │
│  per-branch parse artifacts (addycyjne)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  COST-MULTI-01 (CLOSED)                                     │
│  CostPackage → BranchPackage → Aggregate policy             │
│  status: empty|single|multi_ready|multi_hold|conflict       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  COST-MULTI-02 ★ NOWY                                       │
│  resolveCostBidInput(item) → CostBidInputDecision           │
│    mode: ONE | AGGREGATE | MANUAL_HOLD                      │
│    kosztorysForBid: TenderKosztorysSnapshot | null          │
│    reasonCodes[]                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
     ONE (legacy)     AGGREGATE merge    MANUAL_HOLD
     dossier.kosztorys  synthetic snap   fallback ONE*
          │                 │                 │
          └────────────┬────┴─────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Bid SSOT (REUSE)                                           │
│  resolveTenderPricingAutoProposal                           │
│    → OfferBoq direct (jeśli ON i dostępny)                  │
│    → else computeTenderBidProposal(kosztorysForBid)         │
│  → AI Cost / OfferBoq UI (to samo wejście gdy Aggregate)    │
└─────────────────────────────────────────────────────────────┘

* MANUAL_HOLD: Bid NIE używa Aggregate; domyślnie legacy ONE
  + UX „HOLD — nie ufaj pełnej ofercie / wymagana weryfikacja”.
  Opcja twarda (flaga): Bid `ok:false` gdy HOLD — patrz §8.
```

### 4.2 Nowy kontrakt (zamrożony kształt)

```text
CostBidInputMode = "ONE" | "AGGREGATE" | "MANUAL_HOLD"

CostBidInputDecision {
  mode: CostBidInputMode
  packageStatus: CostPackageStatus | null
  aggregatePolicy: AggregatePolicy | null
  kosztorysForBid: TenderKosztorysSnapshot | null
  legacyKosztorys: TenderKosztorysSnapshot | null   // zawsze dossier.kosztorys ref
  reasonCodes: string[]
  warnings: string[]
  sourceDocumentCount: number   // ile winnerów weszło do merge
}

BranchWinnerSnapshot {             // artefakt addycyjny
  documentId: string
  filename: string
  branch: BranchCode
  snapshot: TenderKosztorysSnapshot   // ok + catalogQuantities/rows/totalValue
}
```

### 4.3 Semantyka AGGREGATE merge (kluczowa)

**Zakaz:** `sum(all files)`.  
**Dozwolone:** merge **wyłącznie** `aggregate.included` (= Branch winners przy `SUM_BRANCH_WINNERS`).

```text
buildAggregateKosztorysSnapshot(winners: BranchWinnerSnapshot[]):
  1. Wymagaj: każdy winner ma snapshot.ok === true
  2. Wejście qty:
       prefer catalogQuantities (usable qty > 0)
       else rows z qty
  3. Concat linii z prefixem branży w lp/description tag
       np. lp: "E.12" / meta branch=electrical
  4. totalValue:
       jeśli WSZYSTKIE winners mają parseable totalValuePln > 0
         → suma (ath_priced path możliwy)
       else → totalValue = null (catalog path)
  5. sourceFilename: "AGGREGATE:{n}-branches"
  6. ok: true
  7. warnings: dziedziczone + scope_overlap_unchecked jeśli finishes∩construction
```

**Gdy brak snapshotu dla non-legacy winnera** (tylko nazwa w `costCandidateSources`):

```text
→ NIE zgaduj qty
→ mode = MANUAL_HOLD  (lub ONE + reason missing_branch_snapshots)
→ UX: „Brak pełnych odczytów branż — Ponów analizę”
```

To jest **twarde** w DF: Aggregate Bid **wymaga** materii qty/cen per winner, nie samych nazw plików.

### 4.4 Skąd biorą się BranchWinnerSnapshot (bez nowych parserów)

| Źródło | Opis | OOS? |
|--------|------|------|
| Heavy cost phase | Przy parse `costCandidates` — **zachowaj** snapshot per kandydat (nie tylko `bestKosztorys`) | **Dozwolone** — orchestracja, nie algorytm parsera |
| Persist | Addycyjne pole np. `scanSummary.branchWinnerArtifacts[]` lub `tenderDossier.costBranchSnapshots[]` | **Dozwolone** bez `cloud-sync.ts` |
| Legacy only | Tylko `dossier.kosztorys` | Niewystarczające do Aggregate |

**Zakaz IMPLEMENT:** wywoływanie nowych parserów „w tle Bid” poza istniejącym heavy/re-parse CTA.

---

## 5. Moment przełączenia ONE → Aggregate

### 5.1 Jedyny punkt SSOT (zamrożony)

```text
resolveCostBidInput(item) 
  ← wołane PRZED:
      - resolveTenderPricingAutoProposal
      - computeTenderBidProposal (gdy catalog/ATH path)
      - build OfferBoq z kosztorysu (gdy tor COST-PIPELINE ON)
```

**Nie** przełączać:

- w `discoverBestCostDocument`
- w UI sticky bez zmiany wejścia
- w merge cloud
- w parserze PDF/ATH

### 5.2 Kolejność decyzji

```text
resolveCostBidInput(item):
  if !COST_MULTI_02_AGGREGATE_BID → ONE(legacy)
  if !COST_MULTI_01_ENABLED → ONE(legacy)

  pkg = resolveCostPackageFromItem(item)
  if !pkg → ONE(legacy)

  if pkg.status in {multi_hold, conflict} → MANUAL_HOLD
  if pkg.aggregate?.policy === "HOLD_MANUAL" → MANUAL_HOLD

  if pkg.status === "single" OR policy === "BEST_SINGLE"
    → ONE (winner = jedyny / branch BEST; zwykle = legacy)

  if pkg.status === "multi_ready"
     AND policy === "SUM_BRANCH_WINNERS"
     AND allIncludedHaveUsableSnapshots(pkg)
     AND pairwise other_branch high (już w MULTI-01)
    → AGGREGATE(merge)

  if multi_ready but missing snapshots → MANUAL_HOLD
     reason: missing_branch_snapshots

  else → ONE(legacy) + warning unresolved
```

### 5.3 Co dzieje się z `tenderDossier.kosztorys`

| Pole | Zachowanie 02 |
|------|----------------|
| `tenderDossier.kosztorys` | **Bez zmian semantyki** — nadal legacy ONE winner z Discovery |
| `kosztorysForBid` | Osobne wejście runtime (Aggregate lub ONE) |
| Persist Aggregate snapshot | **Opcjonalne** v1 IMPLEMENT — prefer runtime merge; cache OK jeśli addycyjny |

**Zasada:** nie nadpisywać ONE w dossier Aggregatem (rollback + audyt).

---

## 6. Warunki użycia polityk

### 6.1 `SUM_BRANCH_WINNERS` → Bid AGGREGATE

Wszystkie muszą być **TAK**:

| # | Warunek |
|---|---------|
| 1 | Feature `COST_MULTI_02_AGGREGATE_BID === true` |
| 2 | `COST_MULTI_01_ENABLED === true` |
| 3 | `CostPackage.status === multi_ready` |
| 4 | `aggregate.policy === SUM_BRANCH_WINNERS` |
| 5 | `aggregate.included.length >= 2` |
| 6 | Każdy included ma `BranchWinnerSnapshot` z `snapshot.ok` |
| 7 | Każdy included ma usable qty **lub** ATH total > 0 |
| 8 | Żaden included nie jest `option` / `variant` / `stage` / formal offer |
| 9 | Brak `unknown` branch wśród included |

→ `mode = AGGREGATE`, Bid/OfferBoq dostają merged snapshot.

### 6.2 `HOLD_MANUAL` → Bid MANUAL_HOLD

Gdy:

- `status ∈ {multi_hold, conflict}` **lub**
- policy `HOLD_MANUAL` **lub**
- `multi_ready` ale brak snapshotów branż **lub**
- stage / unresolved variant / unknown branch

→ `mode = MANUAL_HOLD`:

| Zachowanie zamrożone (v1) | Opis |
|---------------------------|------|
| **Bid input** | **Fallback ONE** (`dossier.kosztorys`) — nie Aggregate |
| **UX** | Warn: HOLD / nie traktuj jako pełna oferta wielobranżowa |
| **Sticky PLN** | Może pokazać ONE + badge HOLD (nie ukrywać liczby bez sensu) |
| **Twardy gate (opcjonalna flaga)** | `COST_MULTI_02_HOLD_BLOCKS_BID` — gdy true: `recommendedBidPln=null` przy HOLD |

**Domyślnie v1:** `COST_MULTI_02_HOLD_BLOCKS_BID = false` (ONE + warn).  
Owner może włączyć twardy gate w IMPLEMENT bez nowego DF, jeśli flaga jest w allowlist §9.

### 6.3 `BEST_SINGLE` / `single` / `empty`

| Status | Bid |
|--------|-----|
| `single` / BEST_SINGLE | **ONE** (zgodne z legacy) |
| `empty` | jak dziś F2 / brak kosztorysu |

---

## 7. Fallback (zamrożony)

```text
Priorytet bezpieczeństwa:
  1. Nie Aggregate przy niepewności
  2. Nie sumuj bez snapshotów
  3. Preferuj ONE + warn niż fałszywy PLN z partial merge
```

| Sytuacja | Fallback |
|----------|----------|
| Flaga 02 OFF | ONE (2.65.74) |
| Flaga 01 OFF | ONE |
| Brak CostPackage | ONE |
| HOLD / conflict | ONE + UX HOLD (*lub* block Bid jeśli flaga) |
| Aggregate merge throw / 0 linii | ONE + reason `aggregate_merge_empty` |
| OfferBoq null przy Aggregate | Catalog Bid na merged snap (REUSE BUGFIX-01) |
| OfferBoq OK | OfferBoq na **tym samym** `kosztorysForBid` (Aggregate) |

---

## 8. Feature Flag

```text
COST_MULTI_01_ENABLED          // istniejący — pakiet + UX
COST_MULTI_02_AGGREGATE_BID    // NOWY — Aggregate → Bid (default: false do PV, lub true po Owner GO IMPLEMENT)
COST_MULTI_02_HOLD_BLOCKS_BID  // NOWY — opcjonalny twardy gate HOLD (default: false)
```

| Flaga 01 | Flaga 02 | Zachowanie Bid |
|----------|----------|----------------|
| OFF | * | ONE |
| ON | OFF | ONE + banner MULTI-01 |
| ON | ON | resolveCostBidInput (ONE/AGGREGATE/HOLD) |

**Rollback szybki:** `COST_MULTI_02_AGGREGATE_BID = false` → natychmiast ONE.

---

## 9. Migracja i Backward Compatibility

### 9.1 Migracja danych

| Element | Plan |
|---------|------|
| Stare dossier bez `costCandidateSources` | Jak MULTI-01: ONE; UX bez multi; Owner **Ponów analizę** |
| Stare dossier z sources ale bez branch snapshots | `MANUAL_HOLD` + CTA Ponów (nie Aggregate) |
| Nowe heavy po 02 | Zapis addycyjnych `branchWinnerArtifacts` przy parse cost |

**Brak** migracji batch KV. **Brak** zmiany schematu payroll.

### 9.2 Backward Compatibility

| Konsument | Wymaganie |
|-----------|-----------|
| Bid UI / sticky | Czyta `kosztorysForBid` przez resolver; przy fladze OFF = dziś |
| Audit / Trust | ONE `dossier.kosztorys` nadal SSOT „który plik wygrał Discovery” |
| Eksport PDF oferty | Używa Bid proposal z runtime — przy Aggregate = suma branż |
| Kalibracja / history | Nie przepisywać historycznych snapshotów |
| E2E happy path | Flaga OFF lub single-doc tenders bez regresji |

### 9.3 Dual write (opcjonalny)

IMPLEMENT **może** zapisać `lastCostBidInputMode` w scanSummary (diagnostyka).  
**Nie** musi zapisywać merged snapshot do `kosztorys` (zakaz nadpisania ONE).

---

## 10. Decision Matrix — ONE / Aggregate / Manual

Legenda: **ONE** = legacy `dossier.kosztorys` · **AGG** = merged Aggregate · **HOLD** = MANUAL_HOLD (fallback ONE + warn, chyba że twardy gate)

| Scenariusz | Package / policy | Bid mode | Uwagi |
|------------|------------------|----------|-------|
| Jedna branża / 1 dokument | `single` / BEST_SINGLE | **ONE** | Brak zmiany |
| Wiele branż, other_branch high, pełne snapshoty | `multi_ready` / SUM_BRANCH_WINNERS | **AGG** | Cel epiku |
| Wiele branż, brak snapshotów non-ONE | `multi_ready` ale incomplete artifacts | **HOLD** | Ponów analizę |
| Wariant (+ baza) | exclude variant; baza OK | **ONE** lub **AGG** jeśli ≥2 branże bazy | Wariant nigdy w merge |
| Tylko warianty / konflikt | `conflict` | **HOLD** | |
| Rewizja (v1/v2 tej samej branży) | BEST wewnątrz branży | **ONE** lub **AGG** (inne branże) | Nie SUM obu rewizji |
| Duplikat | exclude duplicate | jak wyżej | |
| Etap | `multi_hold` | **HOLD** | |
| Opcja / prawo opcji | exclude `option_scope` | baza może **AGG** bez opcji | Opcja nie w Bid bazowym |
| Niejednoznaczność / unknown branch | `multi_hold` | **HOLD** | |
| Ambiguous branch winner | `multi_hold` | **HOLD** | |
| Flaga 02 OFF | — | **ONE** | Rollback |
| `empty` / F2 | — | jak dziś (brak Bid) | CR-01/02 |

### 10.1 Fixture `08dee335` (docelowo po 02 + Ponów)

```text
4 branże · multi_ready · SUM_BRANCH_WINNERS
+ 4× BranchWinnerSnapshot (qty)
→ mode AGGREGATE
→ Bid catalog na concat qty
→ recommendedBidPln ≈ rząd Owner (~1,x mln), NIE ~0,28 mln
→ dossier.kosztorys nadal Pensjonat (ONE Discovery)
→ banner: Aggregate aktywny / N branż w wycenie
```

---

## 11. Acceptance Criteria

### 11.1 Resolver

| ID | Kryterium |
|----|-----------|
| **AC-02-01** | Istnieje `resolveCostBidInput` zwracający `ONE\|AGGREGATE\|MANUAL_HOLD` |
| **AC-02-02** | Flaga 02 OFF → zawsze ONE (regresja 2.65.74 Bid) |
| **AC-02-03** | `multi_ready` + pełne snapshoty → AGGREGATE |
| **AC-02-04** | `HOLD_MANUAL` / `conflict` → MANUAL_HOLD (nie AGGREGATE) |
| **AC-02-05** | Brak snapshotu branży → nie AGGREGATE |
| **AC-02-06** | Aggregate merge = tylko `aggregate.included`, nie wszystkie pliki |
| **AC-02-07** | `dossier.kosztorys` nie nadpisany Aggregatem |

### 11.2 Bid / wycena

| ID | Kryterium |
|----|-----------|
| **AC-02-10** | Fixture synthetic 4 branże qty → Bid AGG > Bid ONE (rząd wielkości) |
| **AC-02-11** | Single-doc tender → Bid identyczny ±ε jak przed 02 (flaga ON) |
| **AC-02-12** | `computeTenderBidProposal` bez zmiany formuł marży (tylko input snap) |
| **AC-02-13** | OfferBoq path (gdy ON) używa tego samego `kosztorysForBid` |
| **AC-02-14** | HOLD + default: Bid z ONE; UX pokazuje HOLD |

### 11.3 Negatywne

| ID | Kryterium |
|----|-----------|
| **AC-02-N1** | Brak zmian `discoverBestCostDocument` |
| **AC-02-N2** | Brak zmian algorytmów ZIP/ATH/PDF/XLSX |
| **AC-02-N3** | Brak `sum(all)` / brak edycji `cloud-sync.ts` / Payroll |
| **AC-02-N4** | Opcja/wariant/etap nie wchodzą do merge Aggregate |

---

## 12. Rollback Plan

```text
1. COST_MULTI_02_AGGREGATE_BID = false
2. (opcjonalnie) revert commitów 02
3. Bid wraca do dossier.kosztorys ONLY
4. MULTI-01 banner nadal działa (jeśli 01 ON)
5. Brak migracji wstecznej KV
```

| Kryterium rollback PASS | |
|-------------------------|--|
| R1 | Single-doc Bid bez regresji |
| R2 | Brak crash Outcome / Kosztorys |
| R3 | Fixture z powrotem ~ONE PLN (świadomie) |
| R4 | Brak residual „Aggregate aktywny” w Bid gdy flaga OFF |

---

## 13. Risk Assessment

| Ryzyko | Impact | Mitigacja DF |
|--------|--------|--------------|
| **Podwójne liczenie** (ATH+PDF tej samej branży) | Wysoki | BEST w BranchPackage; merge tylko winners; never sum same_branch |
| **Błędna agregacja** (wariant/opcja w sumie) | Wysoki | Exclusions MULTI-01 + AC-02-N4 |
| **Partial merge** (1 z 4 snapshotów) → zaniżenie „udające pełne” | Wysoki | Brak snapshotu → HOLD, nie AGG |
| **Regresja Bid** single-doc | Wysoki | Flaga OFF default do PV; AC-02-11 |
| **AI Cost / OfferBoq** na złym wejściu | Średni | Ten sam `kosztorysForBid` SSOT; nie osobna ścieżka |
| **Eksport oferty** niespójny z UI | Średni | Eksport z Bid proposal runtime |
| **scope_overlap finishes∩construction** | Średni | Warning; nie blokuje AGG (jak MULTI-01); Owner świadomy |
| **Performance** merge dużych BOQ | Niski–średni | Cap linii REUSE TP200B; bez nowych parserów w Bid |
| **Fałszywe poczucie kompletności** | Średni | UX: „wycena z N branż” vs HOLD |

---

## 14. Plan wdrożenia etapami (po Owner GO IMPLEMENT)

| Etap | Zakres | Flaga |
|------|--------|-------|
| **B0** | Lib: `resolveCostBidInput` + `buildAggregateKosztorysSnapshot` + testy macierzy (bez UI Bid) | 02 OFF w prod do B2 |
| **B1** | Heavy: persist `branchWinnerArtifacts` z już parsowanych costCandidates (addycyjne) | 02 OFF |
| **B2** | Wire `resolveTenderPricingAutoProposal` → `kosztorysForBid` | 02 ON (canary / Owner) |
| **B3** | UX: banner „Aggregate w wycenie (N branż)” vs HOLD | 02 ON |
| **B4** | PV fixture `08dee335` + Ponów · Release · Closeout | — |

**DoD epiku 02** = B0–B3 + AC PASS + PV.  
**Nie** w 02: content-overlap engine · osobne Bid dla prawa opcji · zmiana Discovery.

---

## 15. Wpływ na sąsiadów (zamrożony kontrakt)

| Moduł | Wpływ 02 |
|-------|----------|
| **Bid calculator** | Tylko podmiana input snapshot |
| **AI Cost / OfferBoq** | To samo `kosztorysForBid` gdy Aggregate |
| **COST-PIPELINE flag** | Bez zmiany kolejności OfferBoq→catalog; zmiana źródła snap |
| **Discovery / ONE dossier** | Bez zmian |
| **MULTI-01 UX** | Rozszerzenie copy (Aggregate aktywny / HOLD) |
| **Eksport** | Idzie za Bid proposal |

---

## 16. Dokumenty powiązane

| Dokument | Rola |
|----------|------|
| [`COST-MULTI-01-DESIGN-FREEZE.md`](COST-MULTI-01-DESIGN-FREEZE.md) | Model Package / policy |
| [`COST-MULTI-01-CLOSEOUT.md`](COST-MULTI-01-CLOSEOUT.md) | M4 = ten epic |
| Ten plik | **DF Aggregate Bid** |
| *(przyszły)* IMPL / PV / RELEASE / CLOSEOUT | po Owner GO IMPLEMENT |

---

## 17. Stop

```text
STATUS: DESIGN FREEZE COMPLETE
IMPLEMENT: ZABLOKOWANY
COMMIT / PUSH: NIE
OOS: parsers · Discovery · ZIP · Payroll · Cloud Sync · sum(all)

Czekam na Owner GO do IMPLEMENTATION (B0→B3).
```
