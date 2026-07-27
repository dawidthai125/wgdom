# WGDOM — AI-COST-01 · ARCHITEKTURA (AI Kosztorysant)

> **ID:** WGDOM-AI-COST-01  
> **STATUS:** **SUPERSEDED** — patrz **[`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md)**  
> **Data draftu:** 2026-07-26 · **Freeze:** 2026-07-27  
> **AUDIT:** [`WGDOM-AI-COST-01-AUDIT.md`](WGDOM-AI-COST-01-AUDIT.md)

```text
Ten plik = historyczny draft kontraktu.
Źródło prawdy architektury = ARCHITECTURE-FREEZE + SSOT.
```

---

## 1. Cel produktu

AI Kosztorysant przygotowuje **kompletną propozycję kosztorysu ofertowego** na bazie przedmiaru i dokumentacji, z możliwością ręcznej korekty każdej pozycji i natychmiastowego przeliczenia.

```text
AP2 (docs) ──► Przedmiar (snapshot)
                    │
                    ▼
            OfferBoqBuilder (mapowanie + ceny)
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
      Materiały  Robocizna  Sprzęt
         └──────────┬──────────┘
                    ▼
         Kp · Overhead · Marża
                    │
                    ▼
         TenderBidProposal (REUSE agregat)
                    │
                    ▼
         UI edycja LP → recompute
```

**Jawny kontrakt z AP2:** AP2 dostarcza jakość dokumentów / fakty / ryzyko biznesowe. AI-COST dostarcza **liczby oferty**. Nie zastępują się wzajemnie.

---

## 2. Moduły architektury

### 2.1 Parser przedmiaru *(REUSE — nie nowy PDF parser)*

| | |
|--|--|
| **Odpowiedzialność** | Dostarczyć kanoniczną listę pozycji (LP, opis, jm, ilość, sygnały KNR/kategoria). |
| **REUSE** | `ath-parser`, `pdf-przedmiar-heuristic`, dossier heavy → `TenderKosztorysSnapshot` |
| **OUT** | Rewrite PDF/OCR (osobne EPIC) |
| **Output** | `OfferBoqInputLine[]` (normalizacja ze snapshotu) |

### 2.2 Silnik mapowania pozycji

| | |
|--|--|
| **Odpowiedzialność** | Opis/KNR pozycji → pozycja Work Catalog / kategoria kosztowa + **confidence**. |
| **REUSE** | `classifyAthLineCategory`, phrase rules, work-catalog mapping seeds |
| **NOWE (thin)** | `OfferBoqMatchResult` (matchedId, method, confidence, unknowns) |
| **OUT** | LLM w P0 — najpierw reguły + katalog; LLM opcjonalnie później |

### 2.3 Silnik cen materiałów

| | |
|--|--|
| **Odpowiedzialność** | `materialUnitPln` × ilość → `materialCostPln` |
| **Źródła (priorytet)** | 1) override LP · 2) override kategorii · 3) Work Catalog / cost engine · 4) ATH seed (gdy FOUND_WITH_VALUE) · 5) unknown |
| **REUSE** | `wgdom-catalog-cost-engine`, price-overrides, company material index |

### 2.4 Silnik cen robocizny

| | |
|--|--|
| **Odpowiedzialność** | Norma rbh × `fullyLoadedHourly` → `laborCostPln` |
| **REUSE** | `company-labor-cost.ts`, katalog labor rates, costModel |
| **UWAGA** | Nie dublować ZUS/narzutów poza istniejącym fully-loaded |

### 2.5 Silnik sprzętu

| | |
|--|--|
| **Odpowiedzialność** | First-class `equipmentUnitPln` / `equipmentCostPln` per LP (lub reguła % / katalog sprzętu). |
| **Stan dziś** | ATH kn= sprzęt (odczyt); bid = proxy weekly tools — **GAP (RC-4)** |
| **Kierunek** | Nowy slot w `OfferBoqLine` + źródło z katalogu / % od R+M / user override |
| **Thin start** | COST-S4: equipment = 0 lub % reguła z costModel (jawna), potem katalog |

### 2.6 Kalkulator kosztów pośrednich (Kp / overhead)

| | |
|--|--|
| **Odpowiedzialność** | Kp % od kosztów bezpośrednich + stałe / koszty poboczne firmy |
| **REUSE** | `kpPct`, weekly ancillary, fixed overhead share w `computeTenderBidProposal` |
| **Poziom** | Per LP (proporcjonalnie) **oraz** suma w podsumowaniu |

### 2.7 Kalkulator marży

| | |
|--|--|
| **Odpowiedzialność** | `profitPct`, `riskReservePct`, `minMarginPct` → narzut / floor |
| **REUSE** | pola `TenderCompanyCostModel` + logika bid calculator |

### 2.8 Kalkulator ceny ofertowej

| | |
|--|--|
| **Odpowiedzialność** | Suma pozycji → `costPricePln` → recommended / floor / safe / aggressive |
| **REUSE** | **`computeTenderBidProposal`** jako aggregator końcowy (rozszerzony o input z OfferBoq) |
| **ZAKAZ** | Drugi niezależny „AI bid engine” |

### 2.9 Analiza ryzyk kosztowych

| | |
|--|--|
| **Odpowiedzialność** | Ryzyka **cenowe**: UNKNOWN %, krótkie terminy (S3), wysokie kary, brak waloryzacji, wysoki udział UNKNOWN, niskie confidence match |
| **REUSE wejścia** | AP2-S3 facts, AP2-S4 (docs risk), bid-quality `catalogUnknownPct` |
| **OUT z P0** | Pełny scoring ryzyk kosztowych można odłożyć do COST-S7 |

### 2.10 Generator rekomendacji

| | |
|--|--|
| **Odpowiedzialność** | Tekst/werdykt: czy składać ofertę przy danej rentowności + ryzykach kosztowych |
| **REUSE** | AP2-S4 BusinessVerdict (docs) + nowy `CostRecommendation` (liczby) — **dwa panele, jedna narracja UI** |
| **ZAKAZ** | Nadpisywanie `overlay.displayDecision` Autonomous |

---

## 3. Model danych — pozycja kosztorysu ofertowego

### 3.1 `OfferBoqLine` (target SSOT pozycji)

```ts
interface OfferBoqLine {
  // Tożsamość
  lineId: string;              // stabilne: tenderId + lp + hash(opis)
  lp: string;
  description: string;
  quantity: number;
  unit: string;

  // Mapowanie
  catalogWorkId: string | null;
  categoryId: string | null;
  knrHint: string | null;
  matchMethod: "exact_knr" | "catalog_map" | "category_heuristic" | "ath_seed" | "manual" | "unmatched";
  matchConfidence: "high" | "medium" | "low";

  // Materiały
  materialUnitPln: number | null;
  materialCostPln: number | null;
  materialSource: PriceSourceRef;

  // Robocizna
  laborRbh: number | null;
  laborRatePlnPerH: number | null;
  laborCostPln: number | null;
  laborSource: PriceSourceRef;

  // Sprzęt
  equipmentUnitPln: number | null;
  equipmentCostPln: number | null;
  equipmentSource: PriceSourceRef;

  // Narzuty pozycji
  directCostPln: number | null;     // M+R+S
  kpPln: number | null;
  overheadSharePln: number | null;
  marginPln: number | null;
  lineTotalPln: number | null;      // wartość końcowa pozycji

  // Meta
  pricingSourceLabelPl: string;     // „katalog” | „override” | „ATH” | „AI+katalog” …
  aiConfidence: "high" | "medium" | "low";
  userEdited: boolean;
  editedFields?: Array<"material" | "labor" | "equipment" | "kp" | "margin" | "quantity">;
  warnings: string[];
}

interface PriceSourceRef {
  kind: "work_catalog" | "category_override" | "line_override" | "ath" | "company_model" | "manual" | "unknown";
  refId?: string;
  asOf?: string;           // ISO — transparentność
  labelPl: string;
}
```

### 3.2 `OfferBoqDocument` (dokument kosztorysu)

```ts
interface OfferBoqDocument {
  tenderId: string;
  version: number;
  builtAt: string;
  parserSnapshotRef: {
    kosztorysParsedAt: string | null;
    sourceFilename: string | null;
    rowCount: number;
  };
  lines: OfferBoqLine[];
  totals: OfferBoqTotals;
  recommendation: CostRecommendation | null;
  recomputeToken: string;   // bump po edycji → UI wie że trzeba przeliczyć
}

interface OfferBoqTotals {
  materialsPln: number;
  laborPln: number;
  equipmentPln: number;
  directPln: number;
  kpPln: number;
  overheadPln: number;
  costPricePln: number;
  marginPln: number;
  recommendedBidPln: number;
  profitPln: number | null;
  profitabilityPct: number | null;
  estimatedDurationDays: number | null;   // z S3 / costModel — later
  workingCapitalPln: number | null;       // wadium+ZNW+bufor — later
}
```

### 3.3 Relacja do istniejącego `TenderBidProposal`

```text
OfferBoqDocument.totals  ──feeds──►  computeTenderBidProposal (extended input)
                                      │
                                      └─ UI nadal pokazuje TenderBidProposal
                                         (REUSE panelu oferty)
```

Edycja LP aktualizuje `OfferBoqLine` → `recomputeOfferBoq` → odświeża proposal.

---

## 4. Widok kosztorysu (architektura UI — bez implementacji)

### 4.1 Layout zakładki Kosztorys (target)

```text
┌─────────────────────────────────────────────────────────────┐
│ SUMMARY STRIP (sticky)                                      │
│ Cena ofertowa · M · R · S · Kp · Zysk · Rentowność · …     │
│ Rekomendacja AI (COST) · [Przelicz] [Eksport]               │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: Szukaj · Filtr branża/UNKNOWN · Sort LP/wartość    │
├─────────────────────────────────────────────────────────────┤
│ TABLE OfferBoq                                              │
│ LP | Opis | Ilość | jm | M | R | S | Razem | Źródło | AI% │
│  ▸ expand → szczegóły + edycja pól + reguła match           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Zachowania (kontrakt)

| Akcja | Zachowanie |
|-------|------------|
| Sort / filtr / search | Client-side na `OfferBoqLine[]` (jak BOQ explorer dziś) |
| Expand wiersza | Breakdown M/R/S/Kp/marża + źródła + confidence |
| Edycja ceny | `userEdited=true` · bump `recomputeToken` · **natychmiastowe przeliczenie** w future slice (hook `recomputeOfferBoq`) |
| Brak danych | UNKNOWN + niska pewność — nie ukrywać wiersza |

### 4.3 REUSE UI

- Shell: `TenderKosztorysWorkspace`  
- Tabela: ewolucja BOQ Explorer (nie nowa zakładka routing)  
- Summary: rozszerzenie KPI / `TenderBidProposalPanel`  
- TEUX tokens — bez Wg* cross-DS bez DF

---

## 5. Podsumowanie kosztorysu (summary strip — placeholdery)

Miejsce na górze ekranu (obliczenia w późniejszych slice):

| Pole | Źródło docelowe |
|------|-----------------|
| Rekomendowana cena ofertowa | `totals.recommendedBidPln` / bid proposal |
| Koszt materiałów | sum `materialCostPln` |
| Koszt robocizny | sum `laborCostPln` |
| Koszt sprzętu | sum `equipmentCostPln` |
| Koszty pośrednie | Kp + overhead |
| Przewidywany zysk | bid − costPrice |
| Rentowność | % marży |
| Szacowany czas realizacji | AP2-S3 realization / heuristic |
| Wymagany kapitał obrotowy | wadium + ZNW + bufor (S3 facts) |
| Rekomendacja AI | `CostRecommendation` (+ link do AP2-S4 docs risk) |

---

## 6. Źródła cen (legal / controlled)

### 6.1 Priorytet resolution (per składowa M/R/S)

```text
1. Line override (user)           — najwyższy priorytet
2. Category override (istniejący)
3. Work Catalog companyPrice / rates
4. ATH priced seed (gdy FOUND_WITH_VALUE)
5. Company model defaults / indices
6. unknown → null + warning
```

### 6.2 Dozwolone źródła

| Źródło | Status |
|--------|--------|
| Wewnętrzna baza WGDOM (Work Catalog) | **PRIMARY SSOT** |
| Konfiguracja użytkownika (region, marża, Kp, RBH, overhead) | **PRIMARY** |
| Ręczne override LP / kategorii | **PRIMARY** |
| Oficjalne / licencjonowane feedy dostawców (przyszłość) | Adapter + DF + Owner GO |
| CSV marketQuotes (już w work-catalog) | Kontrola usera — commit quotes |

### 6.3 Zakazane

| Zakaz | Powód |
|-------|-------|
| Auto-scrape Google / kb.pl / marketplace | Legal + DF work-catalog P3 |
| Ukryte API bez umowy | Compliance |
| Nadpisywanie `companyPricePln` z rynku bez akcji usera | Drift SSOT |

### 6.4 Transparentność

Każda składowa ceny ma `PriceSourceRef` (kind · label · asOf) — spójne z AP2 (source + confidence).

---

## 7. Roadmapa Thin Slice (rekomendowana)

Owner podał przykładowy podział. Poniżej **ulepszona** kolejność (uzasadnienie: najpierw kontrakt danych + UI skeleton, potem silniki, na końcu AI/eksport — unika dwóch kalkulatorów).

| ID | Slice | Cel | OUT |
|----|-------|-----|-----|
| **COST-S0** | Architecture freeze | Ten pakiet → DF allowlist + Gate | kod |
| **COST-S1** | OfferBoq model + adapter ze snapshotu | `OfferBoqLine` z LP/opis/ilość/jm (ceny null) + testy | UI heavy |
| **COST-S2** | Mapping engine v1 | match katalog/kategoria + confidence | LLM |
| **COST-S3** | Silnik M+R (reuse catalog engine) | wypełnienie material/labor + totals direct | sprzęt full |
| **COST-S4** | Silnik sprzętu v1 | equipment slot (% lub katalog) | OCR |
| **COST-S5** | Kp + marża + feed do `TenderBidProposal` | jedna ścieżka oferty | Pricing Gate rewrite (tylko jeśli DF) |
| **COST-S6** | UI tabela + summary strip | sort/filtr/search/expand | edycja |
| **COST-S7** | Edycja LP + recompute | override per pozycja → natychmiastowe przeliczenie | — |
| **COST-S8** | Ryzyka kosztowe + rekomendacja AI | UNKNOWN%, bufory, narracja | Autonomous |
| **COST-S9** | Eksport kosztorysu (PDF/XLSX) | pakiet ofertowy | nowe Edge |
| **COST-S10** | Finalizacja / PV / closeout | tip · RR · Owner verify | — |

### Dlaczego nie „parser osobno jako S1 Owner example”?

Parser **już istnieje** (AP2 + ATH/PDF). Oddzielny „COST-S1 parser” = ryzyko duplikatu.  
**S1 = normalizacja do OfferBoq**, nie nowy parser PDF.

### Mapowanie na przykład Ownera

| Owner example | Nasz ID |
|---------------|---------|
| COST-S0 architektura | COST-S0 |
| COST-S1 parser pozycji | **wchłonięty w S1 adapter** (REUSE parserów) |
| COST-S2 model kosztorysu | COST-S1 |
| COST-S3 materiały | COST-S3 |
| COST-S4 robocizna | COST-S3 (razem M+R — jeden engine call) |
| COST-S5 cena ofertowa | COST-S5 |
| COST-S6 edycja | COST-S7 |
| COST-S7 AI rekomendacja | COST-S8 |
| COST-S8 eksport | COST-S9 |
| COST-S9 finalizacja | COST-S10 |

---

## 8. Ryzyka techniczne

| ID | Ryzyko | Mitygacja |
|----|--------|-----------|
| T1 | Drugi kalkulator oferty | Twardy REUSE `computeTenderBidProposal` |
| T2 | Drift Work Catalog vs legacy cost | SSOT = Work Catalog; legacy tylko adapter |
| T3 | Cap 500 pozycji | Jawny warning + paginacja UI; nie podnosić cap bez DF |
| T4 | Sync Storm / heavy persist | OfferBoq w osobnym kluczu / coalescing; nie pisać builtAt do fingerprint heavy |
| T5 | Pricing Gate regresja | Zmiany gate tylko DF + testy canCompute* |
| T6 | Autonomous fingerprint | COST nie resetuje Gate; osobny artifact |
| T7 | Edycja LP bez recompute | `recomputeToken` + single recompute fn |
| T8 | Fałszywe poczucie „pełnego S” | Equipment v1 = jawna reguła / unknown |
| T9 | Legal scrape creep | Checklist w każdym DF COST |
| T10 | Mieszanie AP2-S4 z COST recommendation | Dwa panele; wspólny copy „dokumentacja vs koszty” |

---

## 9. Rekomendacje implementacyjne (dla Ownera)

1. **ACK tego AUDIT+ARCH** przed jakimkolwiek kodem.  
2. Pierwszy IMPLEMENT = **COST-S1** (model + adapter ze snapshotu + testy) — zero UI polish.  
3. Nie ruszać Autonomous / Payroll / cloud-sync.  
4. Pricing Gate: zostawić; ewentualne poluzowanie = osobny slice + Owner GO.  
5. UI edycji dopiero po S3–S5 (żeby było co edytować).  
6. Trzymać **transparentność źródła** jak w AP2 (source + confidence).  
7. Po S5 zrobić demo Ownera na 1 realnym przedmiarze PDF (FOUND_NO_VALUE).  
8. Eksport i „AI rekomendacja” na końcu — najpierw wiarygodne liczby.

---

## 10. Definition of Done (ten etap — dokumenty)

| Deliverable | Plik |
|-------------|------|
| AUDIT + RCA | [`WGDOM-AI-COST-01-AUDIT.md`](WGDOM-AI-COST-01-AUDIT.md) |
| Architektura modułów | ten plik §2 |
| Model danych | §3 |
| Projekt UI | §4–5 |
| Źródła cen | §6 |
| Roadmapa Thin Slice | §7 |
| Ryzyka techniczne | §8 |
| Rekomendacje | §9 |

**Kod:** brak · **Commit/push:** brak · **IMPLEMENT:** tylko po Owner GO.

---

**AI-COST-01 ARCHITECTURE** · 2026-07-26 · **DRAFT FOR OWNER ACCEPTANCE**
