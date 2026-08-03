# AI-COST-02 I3 — DESIGN FREEZE

> **ID:** AI-COST-02-I3-DESIGN-FREEZE  
> **EPIC:** AI-COST-02 · **Slice:** **AI-COST-02-I3** — Competitiveness / quality signals (RO)  
> **STATUS:** **DESIGN FREEZE · ACCEPTED** · **IMPLEMENT COMPLETE** (local) · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **MODE:** DF FROZEN · IMPLEMENT wg allowlisty · OV: [`AI-COST-02-I3-OWNER-VERIFICATION.md`](./AI-COST-02-I3-OWNER-VERIFICATION.md)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE\*** (\*G2 = wyłącznie nowy klucz flagi FEATURE — nie Payroll)  
> **Wejście:** AUDIT **ACCEPTED** · Owner **GO DESIGN FREEZE** · decyzje O-I3 zamrożone poniżej  
> **AUDIT:** [`AI-COST-02-I3-AUDIT.md`](./AI-COST-02-I3-AUDIT.md)  
> **Parents:** [`AI-COST-02-B-DESIGN-FREEZE.md`](./AI-COST-02-B-DESIGN-FREEZE.md) · [`AI-COST-02-B-CLOSEOUT.md`](./AI-COST-02-B-CLOSEOUT.md) · [`WGDOM-AI-COST-02-STARTING-POINT.md`](./WGDOM-AI-COST-02-STARTING-POINT.md) · COST-02-A CLOSED  
> **Baseline tip:** UI **2.65.95** / **`99c6337`** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (AI-COST-02-I3):
  Competitiveness RO = pozycja wyceny vs marketQuotes
  — jako ROZSZERZENIE Explain AI-COST-02-B
  — REUSE controlled_market + marketQuotes
  — CK = wyłącznie RO hint
  — linia + summary · progi % zamrożone
  — BEZ win-probability · Bid rewrite · Save Quotes
  — BEZ pricing rewrite · Payroll · Cloud · LLM

IMPLEMENT zakazany do: Owner GO IMPLEMENT.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
PAYROLL SAFETY GATE — AI-COST-02 I3

G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*jedyny wyjątek FEATURE: nowy klucz flagi
                        kw-ai-cost-02-i3-competitiveness — bez kasowania/migracji LP)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE  (bez nowych tras)

Wynik: ALL-NIE · FEATURE (flag LS = wzorzec 02-B / GAP-A)
Owner GO CORE: NIE
Owner GO IMPLEMENT (slice): dopiero po ACCEPTED DF + osobnym GO
```

Jeżeli IMPLEMENT naruszy G3 / Payroll / `cloud-sync.ts` / Storage CORE → **STOP** · nowy DF / amend.

---

## 1. Cel architektoniczny (zamrożony)

Zamrożyć **cienkie RO rozszerzenie Explain (02-B)** pokazujące operatorowi:

1. **Per linia** — jak unit wyceny leży względem benchmarku rynkowego (`marketQuotes` / `controlled_market`).  
2. **Summary** — ile linii poniżej / w paśmie / powyżej / bez benchmarku.  
3. **CK** — wyłącznie **hint RO** (gdy dostępny), **bez** wpływu na band.

**Efekt:** lepsza jakość decyzji człowieka na konkurencyjności cenowej — **bez** zmiany generatora, Bid, Quotes, silnika wygranej.

**Sukces I3 ≠** Bid == Owner ~1,6M · **≠** win%.  
**Sukces I3 =** sygnały RO zgodne z AC · flaga OFF = parity tip · 02-B Explain nieskażony.

---

## 2. Decyzje Ownera zamrożone (O-I3)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **O-I3-01** | Identyfikator slice | **`AI-COST-02-I3`** |
| **O-I3-02** | Flaga | **`kw-ai-cost-02-i3-competitiveness`** · osobna od 02-B |
| **O-I3-02b** | Default flagi | **OFF** |
| **O-I3-03** | Relacja do 02-B | I3 = **rozszerzenie Explain 02-B** · UI I3 wymaga **02-B ON ∧ I3 ON** |
| **O-I3-04** | Agregacja | **Linia + summary** |
| **O-I3-05** | Progi | **Zamrożone w DF** (§5) |
| **O-I3-06** | CK | **Wyłącznie RO hint** · nie napędza band |
| **O-I3-07** | Benchmark | **REUSE `marketQuotes`** + **REUSE `controlled_market`** (COST-02-A) |

Zmiana O-I3-\* = **amend DF** + Owner GO.

---

## 3. Zakres funkcjonalny IN (zamrożony)

| ID | Wymaganie FROZEN |
|----|------------------|
| **C1** | Pure adapter konkurencyjności RO (§6) — zero mutacji OfferBoq / Bid / Quotes |
| **C2** | Per-line: `offerUnit` vs `marketUnit` → `deltaPct` + `band` (§5) |
| **C3** | Summary: liczniki below / inBand / above / noBenchmark (+ opc. udział PLN w above) |
| **C4** | CK: gdy `companyKnowledgeHint` / explain CK dostępne → **tekst RO** obok linii · **nie** zmienia `band` |
| **C5** | UI: sekcja „Konkurencyjność (RO)” **wewnątrz** Cost Intelligence / Explain 02-B (§7) |
| **C6** | Fokus linii (scroll/highlight) — REUSE wzorca Queue 02-B, bez nowego scoringu |
| **C7** | Feature flag I3 default **OFF** (§8) |
| **C8** | Pure helpers + smoke `scripts/test-ai-cost-02-i3-*.mjs` |
| **C9** | Thin UI PL · Mobile First (§12) |
| **C10** | Docs IMPL / PV / CLOSE po ścieżce release (po GO IMPLEMENT) |

---

## 4. Zakres funkcjonalny OUT (zamrożony — twarde)

```text
✗ Win-probability / szansa wygrania / ML scoring
✗ Bid Calculator rewrite (tenders-bid-calculator.ts)
✗ Pricing engine rewrite / nowy OfferBoqPriceSourceProvider
✗ Zmiana semantyki / formuły COST-02-A controlled_market provider
✗ Save Quotes / SMART Save / One-shot / MS Publish / commit*
✗ Hardcode 1,6M / global multiplier / target-hacking
✗ GAP-A / GAP-B / GAP-C implementacja
✗ LLM / autopilot oferty
✗ Cloud Sync / cloud-sync.ts / DATA_KEYS / Edge
✗ Payroll / bootstrap / week / Domain Push
✗ Przebudowa AI-COST-01 S1–S7 core
✗ Zmiana formuły S7 impactScore
✗ Parser / ZIP / ATH / Discovery rewrite
✗ Company Knowledge schema / cloud CK / zapis CK
✗ Nowy „Competitiveness App” / nowe trasy / shell rewrite
✗ Re-open AC Phase 1 02-B (I1/I2) bez osobnego amend
✗ Mixed FEATURE+CORE (#CORE-013)
```

---

## 5. Progi procentowe (zamrożone)

### 5.1 Definicja Δ

```text
Gdy marketUnitPln > 0 i offerUnitPln jest finite:
  deltaPct = ((offerUnitPln - marketUnitPln) / marketUnitPln) * 100

Gdy brak marketUnitPln (≤0 / null / brak ścieżki katalogowej):
  band = no_benchmark
  deltaPct = null
  (NIGDY nie mapować braku Quotes → above_market)
```

| Symbol | Znaczenie |
|--------|-----------|
| `offerUnitPln` | Unit wyceny linii — **FROZEN:** `lineDirect / quantity` gdy `quantity > 0`; inaczej `no_benchmark` dla tej linii (nie zgadywać) |
| `marketUnitPln` | Benchmark unit — §6.2 |

### 5.2 Pasmo (band)

| Stała | Wartość FROZEN | Opis |
|-------|----------------|------|
| **`BAND_HALF_PCT`** | **`10`** | Pasmo OK = **±10%** |
| **`OUTLIER_PCT`** | **`25`** | Ostrzejszy sygnał UI gdy `\|deltaPct\| > 25` |

| `band` | Warunek FROZEN |
|--------|----------------|
| **`no_benchmark`** | Brak `marketUnitPln` |
| **`below_market`** | `deltaPct < -BAND_HALF_PCT` (−10) |
| **`in_band`** | `-BAND_HALF_PCT ≤ deltaPct ≤ +BAND_HALF_PCT` |
| **`above_market`** | `deltaPct > +BAND_HALF_PCT` (+10) |

| Flaga pochodna | Warunek |
|----------------|---------|
| **`isOutlier`** | `band ≠ no_benchmark` ∧ `\|deltaPct\| > OUTLIER_PCT` |

**Zakaz:** progi runtime z UI / Owner target PLN / „domknij do 1,6M”.  
Zmiana `BAND_HALF_PCT` / `OUTLIER_PCT` = **amend DF**.

### 5.3 Etykiety PL (UI)

| `band` | Label PL FROZEN |
|--------|-----------------|
| `below_market` | Poniżej rynku |
| `in_band` | W paśmie rynku (±10%) |
| `above_market` | Powyżej rynku |
| `no_benchmark` | Brak benchmarku |

`isOutlier === true` → dopisek UI: **„outlier”** (np. „Powyżej rynku · outlier”) — bez osobnego band enum.

---

## 6. Kontrakt adaptera (zamrożony)

### 6.1 Moduł

| Pole | FROZEN |
|------|--------|
| **Plik** | `src/lib/ai-cost-02-i3-competitiveness.ts` (**NOWY**) |
| **Charakter** | **Pure** · synchroniczny · deterministyczny · **0** I/O poza argumentami |
| **Flaga** | `src/lib/ai-cost-02-i3-flag.ts` (**NOWY**) — wzorzec `ai-cost-02-b-flag.ts` |
| **Zakaz** | Mutacja dokumentu · zapis Quotes · wywołanie Bid calculator · Date.now w formule band |

### 6.2 Rozwiązanie benchmarku (priority FROZEN)

Dla linii z `catalogWorkId` i dostępną pracą katalogową:

```text
1) PRIMARY — REUSE computeMarketAverageForWork(work, …)
   → marketUnitPln = avg.pricePln  (gdy > 0)
   → marketSource = "market_quotes"
   → region / asOf / originCount z avg (RO meta)

2) FALLBACK meta — gdy PRIMARY ok, a linia/komponenty mają
   controlledMarketHint / origin.kind === "controlled_market":
   → controlledMarketUsed = true (RO) — NIE nadpisuje marketUnit
     chyba że PRIMARY brak, wtedy:
3) SECONDARY — gdy PRIMARY brak, a controlled_market unit
   jest odtworzalne RO z już policzonych komponentów linii
   (suma unit controlled_market M+R+… zgodna z unit pracy):
   → marketUnitPln z tej ścieżki
   → marketSource = "controlled_market"
   (bez rewrite providera COST-02-A)

4) ELSE → no_benchmark
```

**REUSE obowiązkowe:** `computeMarketAverageForWork` · typy WC · `OfferBoqControlledMarketHint` (odczyt).  
**Zakaz:** nowy scraper · nowy average engine · zmiana `createControlledMarketPriceProvider`.

### 6.3 CK (RO hint only)

```text
IF komponent/linia ma companyKnowledgeHint.used === true
   LUB istniejące companyKnowledgeExplainPl z Explain:
  → ckHint: { present: true, entryId?, occurrenceCount?, labelPl RO }
ELSE
  → ckHint: { present: false }

ckHint NIGDY nie ustawia band / deltaPct / marketUnitPln.
```

### 6.4 Typy wyjścia (kontrakt VM)

```ts
/** Pseudokod kontraktu — nazwy ostateczne w IMPLEMENT ⊆ semantyka FROZEN */

type I3Band = "below_market" | "in_band" | "above_market" | "no_benchmark";
type I3MarketSource = "market_quotes" | "controlled_market" | "none";

interface I3LineCompetitiveness {
  lineId: string;
  offerUnitPln: number | null;
  marketUnitPln: number | null;
  deltaPct: number | null;       // null ⇔ no_benchmark
  band: I3Band;
  isOutlier: boolean;
  marketSource: I3MarketSource;
  controlledMarketUsed: boolean; // RO meta
  ckHint: { present: boolean; labelPl?: string };
  lineDirectPln: number;         // do summary / sort UI
}

interface I3CompetitivenessSummary {
  lineCount: number;
  withBenchmark: number;
  below: number;
  inBand: number;
  above: number;
  noBenchmark: number;
  outlierCount: number;
  /** Udział lineDirect linii above_market w sumie lineDirect (0..1), RO */
  aboveDirectShare: number;
}

interface I3CompetitivenessView {
  builtAt: string;               // ISO z callera — bez Date.now w pure, jeśli caller poda
  summary: I3CompetitivenessSummary;
  lines: I3LineCompetitiveness[];  // pełna lista RO; UI może Top-N
}
```

### 6.5 API (zamrożone)

| Funkcja | Kontrakt |
|---------|----------|
| `buildI3CompetitivenessView(input)` | Pure → `I3CompetitivenessView` |
| Input minimalny | OfferBoqDocument (RO) + works katalogu (RO) + opc. region/asOf memo jak COST-02-A |
| Sort linii w VM | Po `lineDirect` ↓ (stabilny) — **nie** zmienia `impactScore` |
| Top-N UI | UI może pokazać Top-**10** outlier/above najpierw; VM trzyma pełną listę |

### 6.6 Anti-kontrakt adaptera

```text
✗ Zwracać winProbability
✗ Mutować line / component / user_changed
✗ Pisać marketQuotes / CK store
✗ Importować / wywoływać SMART One-shot / Save
✗ Zmieniać impactScore
```

---

## 7. Kontrakt UI (zamrożony)

### 7.1 Surface

| Element | FROZEN |
|---------|--------|
| **Host** | `OfferBoqCostIntelligencePanel.tsx` — sekcja **wewnątrz** Explain 02-B |
| **Opc. komponent** | `src/app/kosztorys/OfferBoqI3CompetitivenessBlock.tsx` (**NOWY**, thin) — prezentacja only |
| **Zakaz** | Nowy panel root · nowa trasa · karty w hero · Evidence/SMART rewrite |

### 7.2 Widoczność (gate UI)

```text
UI I3 WIDOCZNE ⇔
  isAiCost02bExplainQueueEnabled() === true
  ∧ isAiCost02I3CompetitivenessEnabled() === true

W przeciwnym razie: zero mount sekcji I3 (parity tip / Explain bez I3).
```

Pure adapter **może** być wołany w testach bez UI.  
W produkcji UI: **nie** renderować I3 gdy 02-B OFF (nawet jeśli I3 ON) — I3 = rozszerzenie Explain.

### 7.3 Layout sekcji

| Blok | Treść FROZEN |
|------|--------------|
| **Summary** | Liczniki: poniżej / w paśmie / powyżej / brak benchmarku · opc. „outlier: N” · opc. % direct powyżej |
| **Linie** | Lista (accordion / Top-10 + „pokaż więcej”) · band label · Δ% · marketSource · ckHint RO gdy present |
| **CTA** | Fokus linii (REUSE `onFocusLine`) — **bez** Save / One-shot / „ustaw cenę rynkową” |
| **Copy zakazane** | „Szansa wygrania” · „Domknij do 1,6M” · „Publish Quotes” |

### 7.4 Stany

| Stan | UI |
|------|-----|
| Brak linii | „Brak pozycji do oceny” |
| Wszystkie `no_benchmark` | Summary pokazuje brak benchmarku · **nie** „oferta droga” |
| Mix | Summary + linie z bandami |
| `isOutlier` | Wyróżnienie tekstowe (nie glow / nie purple theme) |

### 7.5 Mobile First

| Reguła | FROZEN |
|--------|--------|
| Layout | Jedna kolumna `< md` |
| Touch | Fokus / expand ≥ 44px |
| Summary | Nad listą · bez sticky konkurującego z Offer bar |
| Δ% | Skrót czytelny · bez horizontal overflow krytycznego |

---

## 8. Feature Flag (zamrożony)

| Pole | Wartość FROZEN |
|------|----------------|
| **LS key** | `kw-ai-cost-02-i3-competitiveness` |
| **Moduł** | `src/lib/ai-cost-02-i3-flag.ts` |
| **Default** | **OFF** (`false`) |
| **ON** | raw LS `"1"` |
| **OFF** | brak klucza / `"0"` / default |
| **Test override** | `forceAiCost02I3CompetitivenessForTests(on \| null)` — wzorzec 02-B |
| **Zależność UI** | I3 UI ⇒ 02-B ON (§7.2) |
| **Zakaz** | Default ON w release bez Owner GO ops |
| **Zakaz** | Wspólny toggle z GAP-A / SMART P1/P2 |

**Rollback L1:** `localStorage.setItem('kw-ai-cost-02-i3-competitiveness','0')`.

---

## 9. Allowlist (FROZEN)

| Plik | Dozwolona zmiana |
|------|------------------|
| `src/lib/ai-cost-02-i3-competitiveness.ts` | **NOWY** — pure adapter §6 |
| `src/lib/ai-cost-02-i3-flag.ts` | **NOWY** — flag §8 |
| `src/app/kosztorys/OfferBoqI3CompetitivenessBlock.tsx` | **NOWY** (opc.) — thin UI §7 |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Thin wire: mount I3 za podwójną flagą · fokus linii |
| `scripts/test-ai-cost-02-i3-competitiveness.mjs` | **NOWY** — unit/smoke AC |
| Regresja (uruchomienie): `scripts/test-ai-cost-02-b-explain-queue.mjs` | Bez zmiany kontraktu 02-B; asercja I3 OFF = parity Explain |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wpis UI **po** IMPLEMENT + Owner GO release |
| Docs `AI-COST-02-I3-*` · tip `09` · `CURRENT-TASK` | Po release / closeout |

**Zasada:** żaden plik spoza listy. Rozszerzenie = **amend DF** + Owner GO.

**Preferuj ZERO DIFF:** `tender-offer-boq-explainability.ts` — I3 **obok** Explain, nie fork VM 02-B. Dopuszczalny **minimalny** import/wire z panelu bez zmiany AC-E1…E5.

---

## 10. Bloklista (FROZEN)

| Plik / obszar | Zakaz |
|---------------|-------|
| `tenders-bid-calculator.ts` | Logika Bid |
| `tender-offer-boq-pricing-engine.ts` | Rewrite S4 |
| `tender-offer-boq-controlled-price-source.ts` | Zmiana COST-02-A |
| `tender-offer-boq-company-knowledge.ts` | Schema / zapis CK |
| `tender-offer-boq-validation.ts` | Formuła `impactScore` |
| `tender-offer-boq.ts` | Nowy model dokumentu (preferuj ZERO DIFF) |
| SMART commit / One-shot / Evidence rewrite | Ownership SMART |
| MS accept/publish · staging write | Ownership MS |
| `cloud-sync.ts` · `DATA_KEYS` · Payroll\* | CORE |
| Parsers · ZIP · Discovery · GAP-\* | Poza slice |

---

## 11. Punkty REUSE (zamrożone)

| # | REUSE | Użycie I3 |
|---|-------|-----------|
| **R1** | `OfferBoqCostIntelligencePanel` + Explain 02-B | Host UI |
| **R2** | `kw-ai-cost-02-b-explain-queue` / `isAiCost02bExplainQueueEnabled` | Gate UI §7.2 |
| **R3** | `computeMarketAverageForWork` + WC `marketQuotes` | Benchmark PRIMARY |
| **R4** | COST-02-A `controlled_market` / hints | Meta + SECONDARY |
| **R5** | `OfferBoqDocument` · `lineDirect` · `quantity` · `catalogWorkId` | offerUnit · scope |
| **R6** | `companyKnowledgeHint` / explain CK PL | CK RO hint only |
| **R7** | Fokus linii Queue 02-B | CTA fokus |
| **R8** | Wzorzec flagi `ai-cost-02-b-flag.ts` | Nowy flag module |
| **R9** | Accordion Explain W1 | Chrome — bez nowego sticky |

**ZERO DUPLICATE:** zakaz drugiego average engine · drugiego Explain VM · drugiego Bid · SMART Evidence clone.

---

## 12. Boundary SMART-PRICING (zamrożony)

| | SMART-PRICING | AI-COST-02-I3 |
|--|---------------|---------------|
| Cel | Propozycja / Evidence ceny | Pozycja wyceny vs rynek |
| Write Quotes | P3 only | **NIGDY** |
| One-shot | Session | **OUT** |
| UI | Evidence panel | Competitiveness w Explain |

I3 **może** tekstowo wskazać „brak benchmarku” (RO).  
I3 **nie** ownership Detect / Evidence / Save / One-shot.

---

## 13. Definition of Done / Acceptance Criteria (zamrożone)

| ID | Kryterium | Pass |
|----|-----------|------|
| **AC-I3-1** | Diff ⊆ allowlist §9 | `git diff` / review |
| **AC-I3-2** | Adapter **RO only** — 0 mutacji OfferBoq / Bid / Quotes / CK store | Snapshot / test |
| **AC-I3-3** | Benchmark = REUSE marketQuotes / controlled_market wg §6.2 | Unit |
| **AC-I3-4** | Progi = `BAND_HALF_PCT=10` · `OUTLIER_PCT=25` | Unit table |
| **AC-I3-5** | `no_benchmark` gdy brak Quotes — **nie** `above_market` | Unit |
| **AC-I3-6** | CK hint RO · **0** wpływu na `band` | Unit |
| **AC-I3-7** | Summary + linie (§3 C2–C3) | Unit + UI |
| **AC-I3-8** | Flaga I3 default OFF → brak UI I3 | OV / smoke |
| **AC-I3-9** | I3 ON ∧ 02-B OFF → brak UI I3 | OV |
| **AC-I3-10** | I3 ON ∧ 02-B ON → sekcja widoczna | OV |
| **AC-I3-11** | Regresja 02-B Explain+Queue PASS | Smoke 02-B |
| **AC-I3-12** | Build + `test-ai-cost-02-i3-competitiveness.mjs` PASS | CI/local |
| **AC-I3-13** | Gate G1–G9 ALL-NIE | Checklist |
| **AC-I3-14** | Boundary SMART: 0 One-shot/Save w I3 | Diff / OV |
| **AC-I3-15** | Mobile 375px: sekcja używalna · brak krytycznego overflow | Smoke |

### Anti-AC (nie wolno wymagać)

| ID | Anti |
|----|------|
| **AC-X1** | Bid == 1,6M |
| **AC-X2** | Win-probability % |
| **AC-X3** | Auto-price / Save Quotes |
| **AC-X4** | Zmiana default GAP-A / 02-B / SMART |

---

## 14. Rollback Strategy (zamrożona)

```text
L1 — Natychmiast (ops, bez redeploy):
  localStorage.setItem('kw-ai-cost-02-i3-competitiveness', '0')
  → UI I3 OFF · Explain 02-B / wycena / Bid / Quotes bez zmian

L2 — Tip revert (tylko Owner GO):
  revert commitów allowlisty FEATURE I3
  → nie ruszać 02-B / COST-02-A / SMART / GAP-A / parsers / Payroll / Cloud

L3 — Zakaz rollbacku „przy okazji”:
  02-B Phase 1 · COST-02-A · SMART P0–P2 · Payroll · Cloud
```

**DoD rollback:** AC-I3-8 weryfikowalne po L1.  
**Rollback cost:** niski (RO · brak migracji danych).

---

## 15. Owner Verification (zamrożony)

| # | Check | Pass |
|---|-------|------|
| **OV-1** | I3 OFF → brak sekcji Konkurencyjność · tip parity | |
| **OV-2** | I3 ON · 02-B OFF → brak sekcji I3 | |
| **OV-3** | I3 ON · 02-B ON · są Quotes → summary + bandy linii | |
| **OV-4** | Brak Quotes → „Brak benchmarku” · **nie** „Powyżej rynku” | |
| **OV-5** | CK obecne → hint RO widoczny · band bez zmiany przez CK | |
| **OV-6** | 0 zapis OfferBoq / Bid / Quotes / CK po otwarciu I3 | |
| **OV-7** | Explain + Queue 02-B nadal zgodne z AC Phase 1 | |
| **OV-8** | Brak win% / target 1,6M / Save Quotes w UI I3 | |
| **OV-9** | Diff ⊆ allowlist · Gate ALL-NIE | |
| **OV-10** | Mobile: czytelne · fokus linii działa | |
| **OV-11** | Outlier (|Δ|>25%) oznaczony · pasmo ±10% zgodne z DF | |

---

## 16. Fixtures / test plan (zamrożony szkic)

| Case | Oczekiwanie |
|------|-------------|
| Linia z Quotes · offer = market | `in_band` · Δ≈0 |
| Offer o 12% drożej | `above_market` · nie outlier |
| Offer o 30% drożej | `above_market` · `isOutlier` |
| Offer o 12% taniej | `below_market` |
| Brak `catalogWorkId` / brak Quotes | `no_benchmark` |
| CK used + Quotes | band z Quotes · `ckHint.present` |
| Flag matrix | OFF/OFF · ON/OFF · OFF/ON · ON/ON wg §7.2 |

Fixture produkcyjny: REUSE znane oferty z Quotes (np. ścieżki z PV 02-B / COST-02-A) — bez nowych dumpów w DF.

---

## 17. Zgodność z zasadami

| Zasada | Werdykt DF |
|--------|------------|
| **SSOT FIRST** | Tip = `09` · Direct = OfferBoq · Rynek = WC marketQuotes |
| **REUSE FIRST** | R1–R9 · COST-02-A · 02-B Explain |
| **ZERO DUPLICATE** | Jeden adapter I3 · zero drugiego average/Bid/Explain |
| **MOBILE FIRST** | §7.5 |
| **Payroll Safety Gate** | §0 ALL-NIE FEATURE |
| **AI-COST-01 Freeze** | RO obok · S4 pricing ZERO DIFF |
| **#CORE-013** | FEATURE only |

---

## 18. Etapy po FREEZE

```text
1. Owner ACCEPTED DESIGN FREEZE (checklist §19)
2. Owner GO IMPLEMENT
3. IMPLEMENT allowlisty §9
4. TEST → COMMIT (GO) → PUSH → PV → CLOSE
5. SMART P3 / GAP-B / win-probability = NIE bez osobnego Owner GO
```

---

## 19. Owner Acceptance Checklist

```text
[ ] Akceptuję O-I3-01…07 (§2)
[ ] Akceptuję IN §3 / OUT §4
[ ] Akceptuję progi BAND_HALF_PCT=10 · OUTLIER_PCT=25 (§5)
[ ] Akceptuję kontrakt adaptera §6 · UI §7 · flagę §8
[ ] Akceptuję allowlist §9 · bloklistę §10
[ ] Akceptuję DoD §13 · Rollback §14 · OV §15 · Gate §0
[ ] Potwierdzam: brak IMPLEMENT / commit / push do osobnego GO IMPLEMENT
```

---

## 20. Zakaz IMPLEMENT z tego dokumentu

Ten plik **nie** jest kodem.  
**IMPLEMENT** dopiero po: **Owner ACCEPTED DF** + **Owner GO IMPLEMENT**.

---

**DESIGN FREEZE STATUS:** **FROZEN**  
**Slice:** AI-COST-02-I3 · Competitiveness RO · flag OFF · I3⇒02-B UI  
**Next:** Owner ACCEPTED DF → **GO IMPLEMENT** (lub HOLD / amend)
