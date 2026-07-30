# CATALOG-COVERAGE-01 — DESIGN FREEZE

> **ID:** CATALOG-COVERAGE-01-DESIGN-FREEZE  
> **EPIC:** **CATALOG-COVERAGE-01** — Coverage Product Library (mapowanie ATH → WC → Quotes)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · AR **READY FOR OWNER GO** → [`CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md) · **IMPLEMENT ZABLOKOWANY** do Owner GO IMPLEMENT  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push / OPS / zmian kodu**  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE** (oczekiwane przy IMPLEMENT)  
> **Wejście:** AUDIT + RCA + PLAN **zaakceptowane** · Owner GO DF ·  
> [`CATALOG-COVERAGE-01-AUDIT.md`](CATALOG-COVERAGE-01-AUDIT.md) ·  
> [`CATALOG-COVERAGE-01-RCA.md`](CATALOG-COVERAGE-01-RCA.md) ·  
> [`CATALOG-COVERAGE-01-PLAN.md`](CATALOG-COVERAGE-01-PLAN.md) ·  
> [`TENDER-VALIDATION-01-REPORT.md`](TENDER-VALIDATION-01-REPORT.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CATALOG-COVERAGE-01):
  Podnieść Quotes coverage (baseline TV-01 76.4% → cel 88–92%)
  przez warstwy:
  Noise Filter → Normalizer → Alias Resolver → Coverage Score
  → Product Mapper (JEDYNY) → Product Library (SSOT).
  BEZ naruszenia AI-COST / SMART-PRICING / MARKET-SYNC ownership.
  BEZ nowego toru zapisu Quotes · BEZ drugiego matchera · BEZ fuzzy ON.

AR: READY FOR OWNER GO
IMPLEMENT zakazany do: Owner GO IMPLEMENT.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*opc. FEATURE flaga coverage — bez migracji LP)
G3 Cloud Sync:   NIE   (brak edycji cloud-sync.ts · brak nowego DATA_KEY)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
Owner GO IMPLEMENT: dopiero po Arch Review PASS + jawne GO
Seed WC / Quotes: wyłącznie istniejący tor FEATURE-DATA (REUSE commit/router) — nie CORE rewrite.
```

---

## 1. Decyzje architektoniczne FROZEN

| ID | Decyzja | Status |
|----|---------|--------|
| **D-CC-1** | Cel EPIC = **Coverage mapowania** (więcej `catalogWorkId` → useful Quotes), nie nowa wycena | **FROZEN** |
| **D-CC-2** | **Product Library (Work Catalog)** = jedyny SSOT produktów / robót mapowania | **FROZEN** |
| **D-CC-3** | **Product Mapper** = **jedyny** moduł mapujący linię → `catalogWorkId` (REUSE `mapOfferBoqLine` / wrapper) | **FROZEN** |
| **D-CC-4** | Pipeline zamrożony: Noise → Normalize → Alias → Score → Mapper → Library | **FROZEN** |
| **D-CC-5** | Noise Filter **nie mapuje** i **nie zapisuje** Library/Quotes | **FROZEN** |
| **D-CC-6** | Normalizer **nie zmienia znaczenia** materiału — tylko forma tekstu | **FROZEN** |
| **D-CC-7** | Alias Resolver **nie zapisuje** do Product Library | **FROZEN** |
| **D-CC-8** | Coverage Score = metryka / diagnostyka — **zero mutacji** źródeł | **FROZEN** |
| **D-CC-9** | Product Quotes pozostają SSOT **cen** rynku (bez zmian ownership) | **FROZEN** |
| **D-CC-10** | SMART-PRICING pozostaje warstwą decyzyjną — coverage **nie** przejmuje Detect/Evidence/Save | **FROZEN** |
| **D-CC-11** | MARKET-SYNC pozostaje właścicielem Publish — coverage **nie** woła Accept/Publish | **FROZEN** |
| **D-CC-12** | AI-COST: coverage wstrzykuje się **przed** mapowaniem w istniejącym torze OfferBoq — **bez rewrite** Bid/heurystyk/core | **FROZEN** |
| **D-CC-13** | Fuzzy matching **OFF** · auto-accept mapowań **OFF** | **FROZEN** |
| **D-CC-14** | Próg score Mappera (`mapOfferBoqLine`) **bez obniżania** w P0 bez osobnego DF amend | **FROZEN** |
| **D-CC-15** | KPI SSOT próby = TV-01 (**18** przetargów · **2228** linii) · baseline **76.4%** · cel **88–92%** | **FROZEN** |
| **D-CC-16** | Seed WC (P0d) = FEATURE-DATA · Quotes tylko REUSE istniejącego commit path · nie alt write | **FROZEN** |
| **D-CC-17** | DF epicki z fazami P0a–P0d → P1 (INNE) · P1ux (SMART copy) | **FROZEN** |

---

## 2. Zamrożone komponenty (kontrakt)

### 2.1 Noise Filter

| | FROZEN |
|--|--------|
| **Rola** | Oznacza / wyklucza wpisy **niemateriałowe** przed mapowaniem |
| **IN** | Opis linii ATH (raw) |
| **OUT** | `{ isNoise, noiseKind }` · opc. skip Mapper |
| **Mapuje produkty?** | **NIE** |
| **Zapis Library/Quotes?** | **NIE** |
| **Kinds P0 (min)** | `kalkulacja_wlasna` · `transport` · `lp_artifact` · `smieci_krotkie` (wzorce rozszerzalne w DF amend) |
| **Kinds NIE filtruj ślepo** | Realne roboty z kodem KNR w opisie → idą do Normalizer, nie drop |

### 2.2 Normalizer

| | FROZEN |
|--|--------|
| **Rola** | Standaryzuje tekst **bez zmiany znaczenia** |
| **Standaryzuje** | KNR / bloki `d.x` / krotność · jednostki w tekście · średnice (ø/śr./DN/mm) · zapis nazw · format (whitespace, fold PL REUSE) |
| **OUT** | `normalizedDescription` (+ opc. extracted hints: unit, diameter) |
| **NIE** | Zmiana semantyki · dopisywanie materiału · zapis Library |
| **REUSE** | `foldPolishText` / istniejące normalizatory jednostek WC |

### 2.3 Alias Resolver

| | FROZEN |
|--|--------|
| **Rola** | Łączy równoważne nazwy / frazy specialty → sygnał dla Mappera |
| **REUSE** | Ścieżka CM-01 specialty alias w scoringu `mapOfferBoqLine` (rozszerzenie packa) |
| **Zapis Product Library?** | **NIE** |
| **Zapis Quotes?** | **NIE** |
| **P0 pack (kierunek)** | Hydraulika detale · elewacja (gzyms/stop ptaków) · teletech mocowania · bruzdy/winidur · odpowietrzniki |
| **Wymaga** | Target work istnieje w Library (alias ≠ tworzenie work) |

### 2.4 Coverage Score

| | FROZEN |
|--|--------|
| **Rola** | Ocena jakości dopasowania / diagnostyka coverage |
| **Pola (min)** | `mapped` · `noise` · `unmapped` · `quotesHit` · `coveragePct` · opc. `topFailGroup` · `scoreBand` |
| **Wpływ na dane źródłowe?** | **NIE** (pure compute) |
| **Mierzenie po każdej zmianie** | **TAK** — ten sam harness TV-01 / classify (D-CC-15) |

### 2.5 Product Mapper

| | FROZEN |
|--|--------|
| **Rola** | **Jedyny** właściciel decyzji `catalogWorkId` |
| **Implementacja** | REUSE **`mapOfferBoqLine`** (ew. cienki wrapper wołający Noise→Normalize→Alias→map) |
| **Zakaz** | Drugi matcher · fork scoringu · fuzzy ON |
| **Wejście** | Linia po Noise/Normalize + sygnały Alias |
| **Wyjście** | AS-IS kontrakt OfferBoq mapping (`catalogWorkId`, confidence, matchedBy, …) |

### 2.6 Product Library (Work Catalog)

| | FROZEN |
|--|--------|
| **Rola** | **Jedyny SSOT** produktów/robót do mapowania |
| **Klucz** | `kw-wgdom-work-catalog` (AS-IS) |
| **Quotes** | `marketQuotes` = SSOT cen (osobna warstwa; ownership zapisu bez zmian) |
| **Seed P0d** | FEATURE-DATA: works + keywords (+ Quotes via REUSE commit) — **nie** nowy DATA_KEY cloud |
| **Priorytet seed** | HYDRAULIKA · ELEKTRYKA · PRZYGOTOWANIE_PODLOZA · ROZBIORKI · ELEWACJE detale |
| **INNE / renowacja** | **P1** — poza P0 |

---

## 3. Pipeline FROZEN (kolejność)

```text
[0] OfferBoq line (ATH / kosztorys)
      ↓
[1] NOISE FILTER
      · isNoise? → tag noise · SKIP Mapper (brak catalogWorkId) · Coverage Score: noise
      · else ↓
[2] NORMALIZER
      · normalizedDescription (+ hints)
      ↓
[3] ALIAS RESOLVER
      · alias hits / expanded hay (ephemeral)
      ↓
[4] PRODUCT MAPPER  ★ jedyny map
      · mapOfferBoqLine(… REUSE …)
      ↓
[5] PRODUCT LIBRARY (SSOT odczyt)
      · work + marketQuotes
      ↓
[6] AI-COST pricing AS-IS (controlled_market gdy mapped+Quotes)
      ↓
[7] SMART Detect AS-IS (unmapped vs no_quote — P1ux może tylko copy)
      ↓
[8] COVERAGE SCORE (agregat / harness)
```

**Invariant:** kroki 1–3 i 8 są **pure / ephemeral** względem Library i Quotes (poza osobnym slice seed P0d FEATURE-DATA).

---

## 4. Granice vs AI-COST · SMART · MARKET-SYNC

| System | Co coverage **MOŻE** | Co coverage **NIE MOŻE** |
|--------|----------------------|---------------------------|
| **AI-COST** | Wpiąć Noise/Normalize/Alias **przed** istniejącym mapowaniem OfferBoq | Rewrite Bid · heurystyk pricing · parser dossier · zmienić L0/L1/L2 |
| **SMART-PRICING** | P1ux: lepszy copy Detect (noise/unmapped vs brak Quotes) | Evidence · One-shot · Save · commit · nowy Detect engine |
| **MARKET-SYNC** | — (brak zależności P0) | Accept · Publish · staging ownership · Kill Switch · commit Quotes |
| **Product Quotes** | Korzystać z useful Quotes po mapowaniu | Alt publish / apply / ręczny patch `marketQuotes` w torze coverage |

---

## 5. Persystencja / zapis (FROZEN)

| Dane | Store | Kiedy |
|------|-------|-------|
| Noise / Normalize / Alias / Score | Ephemeral (compute) | Zawsze |
| Alias pack definicje | Kod FEATURE / istniejący mechanizm CM-01 — **nie** DATA_KEYS | P0c |
| Seed works + Quotes | `kw-wgdom-work-catalog` via **istniejący** tor zapisu katalogu / commit Quotes | **Tylko** P0d + Owner GO seed |
| Nowy Cloud DATA_KEY | **NIE** | — |
| `cloud-sync.ts` | **NIE** edytować | — |

**Zakaz ścieżek zapisu w P0a–P0c:** zero write.  
**P0d:** wyłącznie REUSE ścieżek FEATURE-DATA już używanych do seed WC/Quotes — **nie** nowy publish.

---

## 6. Coverage measurement (obowiązkowe)

| ID | Metryka | Definicja FROZEN |
|----|---------|------------------|
| **M-CC-1** | `quotesCoveragePct` | Linie z `controlled_market` / wszystkie linie próby TV-01 |
| **M-CC-2** | `mappedPct` | Linie z `catalogWorkId` / wszystkie |
| **M-CC-3** | `noisePct` | Noise Filter hit / wszystkie |
| **M-CC-4** | `actionableUnmapped` | Unmapped ∧ ¬noise |
| **M-CC-5** | `mappedMissingQuotes` | catalogWorkId ∧ ¬useful Quotes (regresja → **0** target) |

**Harness:** powtórzenie TV-01 probe / classify na tej samej liście 18 ID — **po każdym slice** (AC-CC-measure).

---

## 7. Acceptance Criteria FROZEN

| ID | Kryterium |
|----|-----------|
| **AC-CC-1** | TV-01 Quotes coverage ≥ **88%** (stretch **92%**) |
| **AC-CC-2** | Noise nie jest raportowany jako „brak Quotes” w sensie SSOT (tag / wyłączenie) |
| **AC-CC-3** | `mappedMissingQuotes` ≈ **0** (brak regresji Quotes) |
| **AC-CC-4** | Jedyny Mapper = tor `mapOfferBoqLine` (static/test guard) |
| **AC-CC-5** | Zero write w P0a–P0c; P0d tylko REUSE seed path |
| **AC-CC-6** | Zero edycji SMART P1 FULL / MS Publish / AI-COST core / cloud-sync |
| **AC-CC-7** | Coverage Score liczy M-CC-1…5 po każdym slice |
| **AC-CC-8** | Fuzzy OFF · próg score Mappera bez obniżenia P0 |

---

## 8. KPI FROZEN

| ID | Target |
|----|--------|
| **K-CC-1** | Coverage Quotes TV-01 **88–92%** |
| **K-CC-2** | Noise filter łapie ≥ baseline kalkulacja+transport (31+5) + LP |
| **K-CC-3** | False map: brak wzrostu krytycznego na OV sample (Owner) |
| **K-CC-5** | Brak regresji AI-COST Bid / SMART P0 / MS P1 — **PASS** |

---

## 9. Allowlist / Denylist IMPLEMENT

### Dozwolone

| Obszar |
|--------|
| `src/lib/**` thin: noise · normalize · alias pack extend · coverage score · wrapper Mapper |
| REUSE `mapOfferBoqLine` · `foldPolishText` · WC store RO · CM-01 alias path |
| FEATURE-DATA seed WC + Quotes (P0d) przez istniejący tor |
| Testy / harness TV-01 coverage |
| CHANGELOG / thin UX SMART copy (P1ux) |

### Zakazane

| Obszar |
|--------|
| `cloud-sync.ts` · nowe DATA_KEYS |
| Drugi Product Mapper / fork scoringu |
| Fuzzy ON · auto-accept |
| SMART Evidence / One-shot / Save / commit |
| MARKET-SYNC Accept/Publish / staging ownership |
| AI-COST Bid rewrite · parser dossier rewrite |
| Alt write `marketQuotes` / `applyMarketQuotesFromPreview` poza REUSE seed |
| Obniżenie globalnego progu score bez DF amend |

---

## 10. Fazy IMPLEMENT (kolejność FROZEN)

| Faza | IN | OUT |
|------|----|-----|
| **P0a** | Noise Filter | Normalize/Alias/Seed |
| **P0b** | Normalizer | Seed Library |
| **P0c** | Alias Resolver pack | Seed Library |
| **P0d** | Product Library seed (top grupy) + Quotes REUSE | INNE głębokie |
| **P1** | INNE / renowacja | — |
| **P1ux** | SMART Detect copy (unmapped vs noise vs brak Quotes) | Evidence/One-shot |

---

## 11. Checklist ARCHITECTURE REVIEW (AR-1…AR-12)

| # | Check | Wynik DF |
|---|--------|----------|
| **AR-1** | Brak nowych ścieżek zapisu (P0a–P0c ephemeral; P0d tylko REUSE) | **PASS** |
| **AR-2** | Brak duplikacji logiki mapowania (jeden Product Mapper) | **PASS** |
| **AR-3** | Zgodność z AI-COST (thin pre-map · bez rewrite) | **PASS** |
| **AR-4** | Zgodność z SMART-PRICING (bez przejęcia decyzji/Save) | **PASS** |
| **AR-5** | Zgodność z MARKET-SYNC (bez Publish ownership) | **PASS** |
| **AR-6** | Coverage mierzalne po każdej zmianie (M-CC + harness TV-01) | **PASS** |
| **AR-7** | SSOT FIRST (Library + Quotes) | **PASS** |
| **AR-8** | REUSE FIRST (`mapOfferBoqLine` · fold · CM-01 · commit seed) | **PASS** |
| **AR-9** | ZERO DUPLICATE LOGIC | **PASS** |
| **AR-10** | FEATURE-DATA ONLY · Gate ALL-NIE | **PASS** |
| **AR-11** | DATA FIRST (TV-01 · classify · bez LLM-as-price) | **PASS** |
| **AR-12** | Noise≠map · Alias≠write Library · Score≠mutate | **PASS** |

**AR FAIL count (w DF):** **0**

---

## 12. Ryzyka FROZEN (mitygacje)

| ID | Ryzyko | Mitygacja DF |
|----|--------|--------------|
| R-CC-01 | False map po alias/normalize | Próg score bez obniżenia · OV sample |
| R-CC-02 | Noise drop realnej roboty | Wąskie kinds · review list w OV |
| R-CC-03 | Seed bez Quotes | P0d zawsze z Quotes REUSE |
| R-CC-04 | Scope SMART/MS | Denylist §9 |
| R-CC-05 | INNE ∞ | Cap P0d · INNE = P1 |

---

## 13. WERDYKT DESIGN FREEZE

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 DESIGN FREEZE · FROZEN
ARCHITECTURE REVIEW: READY FOR OWNER GO
  → docs/architecture/CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 14. Artefakty

| Dokument | Rola |
|----------|------|
| [`CATALOG-COVERAGE-01-AUDIT.md`](CATALOG-COVERAGE-01-AUDIT.md) | AUDIT accepted |
| [`CATALOG-COVERAGE-01-RCA.md`](CATALOG-COVERAGE-01-RCA.md) | RCA accepted |
| [`CATALOG-COVERAGE-01-PLAN.md`](CATALOG-COVERAGE-01-PLAN.md) | PLAN accepted |
| **Ten plik** | **SSOT DESIGN FREEZE** |
| [`CATALOG-COVERAGE-01-DESIGN-FREEZE-COMPLETE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE-COMPLETE.md) | Marker |
| [`CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md`](CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW.md) | **AR · READY FOR OWNER GO** |

**NEXT:** Owner GO IMPLEMENT (prefer **P0a** Noise Filter first).
