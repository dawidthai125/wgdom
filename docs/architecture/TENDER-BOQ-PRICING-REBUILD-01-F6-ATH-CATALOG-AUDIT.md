# TENDER-BOQ-PRICING-REBUILD-01 — FAZA 6  
## AUDYT ATH + Legacy Catalog (+ granice)

> **STATUS:** AUDIT COMPLETE · **IMPLEMENTATION: NONE**  
> **DATA:** 2026-08-12  
> **JĘZYK:** PL  
> **BASELINE:** F5 **PRODUCTION VERIFIED · GREEN** · UI **2.66.42** · feature **`3995c9af`** · live tip **`1e7aced`**  
> **SSOT:** [`…-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · [`…-ARCH-REVIEW.md`](./TENDER-BOQ-PRICING-REBUILD-01-ARCH-REVIEW.md) · F5 [`…-F5-PRODUCTION-VERIFY.md`](./TENDER-BOQ-PRICING-REBUILD-01-F5-PRODUCTION-VERIFY.md)

```text
TRYB = AUDIT + REKOMENDACJA
KOD FEATURE = ZERO
ADAPTER ATH → Position Cost = NIE (wymaga Owner C-MODE-1)
USUWANIE ATH / companyPricePln = NIE
HTTP = 0 · RESEARCH = 0
```

---

## 0. Werdykt skrót

| Obszar | Werdykt |
|--------|---------|
| **ATH jako przedmiar (opis/jm/qty)** | **KEEP AS SEPARATE INPUT** |
| **ATH jako cena Bid (`ath_priced`)** | **C-MODE-1a ACCEPTED** · **NO BID SSOT · NO FALLBACK** (F5 path) |
| **ATH price → OUR RATE** | **FORBIDDEN** · **GAP** (nie labor-only; mixed investor) |
| **Legacy catalog Bid (`catalog`)** | **C-MODE-1a** · **NO BID SSOT** · KEEP TECHNICALLY · P7 soft-deprecate osobno |
| **`companyPricePln`** | **KEEP** jako pole techniczne · **ZERO** w new Bid (F5) |
| **Offer line pricing (providers)** | **UNCHANGED** · nadal czyta `companyPricePln` (osobny tor UI) |
| **F5 Bid / Position Cost / OUR RATE / PM** | **UNCHANGED** · brak BLOCKER-a |
| **Owner Decision** | [`…-OWNER-DECISION-C-MODE-1A.md`](./TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md) · **LOCKED** |

---

## 1. ATH — aktualny przepływ (dowód kodu)

### 1.1 Parse / preview

| Plik | Symbole | Rola |
|------|---------|------|
| `src/lib/ath-parser.ts` | `parseKosztorysBytes`, `AthPreviewResult`, `AthPreviewRow` | INI NORMA `[POZYCJA]`: `cj`/`ob`/`wn`/`kj`/`pd`/`jm`/`na` |
| `src/lib/tenders-bzp-doc-parse.ts` | `parseDocumentToKosztorys` | `.ath/.nor/.xml` → parser; XLSX/PDF → ten sam kształt preview |
| `src/lib/tender-ath-quick-access.ts` | `loadAthPreviewResult` | UI quick-access |
| `src/lib/ath-kosztorys-pdf.ts` | export PDF | **tylko prezentacja** |

### 1.2 Snapshot / dossier

| Plik | Symbole | Rola |
|------|---------|------|
| `src/lib/tenders-bzp-brief.ts` | `athPreviewToSnapshot`, `buildCatalogQuantitiesFromPreview` | Preview → `TenderKosztorysSnapshot` |
| `src/lib/tender-cost-snapshot.ts` | `enrichKosztorysSnapshotFromPreview` | sumy / estimate PLN |
| `src/lib/tender-document-resolver.ts` | heavy dossier | bytes → preview → snapshot |
| `src/lib/tender-dossier-pipeline.ts` | `applyUploadFallbackKosztorys` | upload fallback |

**Uwaga krytyczna:** w `athPreviewToSnapshot` pole KNR (`AthPreviewRow.code` z `pd`) **nie trafia** do `TenderCostLine` — gubi się przy przejściu do snapshotu. Identity później idzie z opisu + `mapOfferBoqLine`.

### 1.3 OfferBoq / Bid

```text
ATH bytes
  → AthPreviewResult
  → athPreviewToSnapshot
       rows: unitPrice/total (ceny inwestora)
       catalogQuantities: lp/opis/jm/qty  (BEZ cen)
  → buildOfferBoqFromSnapshot
       preferuje catalogQuantities → linie bez athUnitPricePln
       albo rows → athUnitPricePln/athTotalPln = SEED (S1: nie oferta)
  → mapOfferBoqLine (Alias / Product Mapper / classifyAthLineCategory)
  → F5 Position Cost (OUR RATE + BOM + PM SELL)   ← NIE czyta ATH PLN
  → offerBoqDirect → computeTenderBidProposal → offer_boq_ai
```

**Równoległy legacy Bid (gdy brak OfferBoq / fallback):**

```text
resolveTenderBidPricingMode(kosztorys)
  totalValue/rows totals > 0  →  ath_priced
  else qty                    →  catalog
computeAthPricedDirectCosts  → heurystyka laborShareOfRow + FL hourly
  → TEN SAM stack Kp/profit/minMargin
```

Źródło: `src/lib/tenders-bid-calculator.ts` (`resolveTenderBidPricingMode` L165–173, `computeAthPricedDirectCosts` L176–247).

Fallback produktowy: `useTenderPricingAuto.resolveTenderPricingAutoProposal` → gdy OfferBoq runtime = null → `computeCatalogBidProposalForPricingAuto` → może wybrać **`ath_priced`**.

---

## 2. Semantyka danych ATH

| Pole | Znaczenie w pliku | Znaczenie w Bid/Offer WGDOM |
|------|-------------------|-----------------------------|
| `cj`×`ob` / `wn`/`kj` | Cena jednostkowa × ilość z dokumentu inwestora | **Cena mieszana inwestora** (często R+M+S+narzuty — **UNKNOWN** dokładny skład) |
| `pd` → `code` | KNR | **GINIE** w snapshot · nie jest workId |
| `jm` / `ob` | jednostka / ilość | **Przedmiar strukturalny** → BOQ qty/unit |
| `na` | opis | Identity input + knrHint z tekstu |
| Element `kn=` R/M/S | podział kategorii | **Tylko display** · Bid ATH **nie** używa |
| Header `wk` | suma dokumentu | Gate `ath_priced` + skala |

### Labor semantics

`computeAthPricedDirectCosts` **nie** traktuje ATH jako labor-only.  
Dzieli `row.total` przez `laborShareOfRow(unit, description)` (0.25–0.92) albo RBH×`fullyLoadedHourly`.

→ **ATH LABOR SEMANTICS = GAP / MIXED HEURISTIC** · **≠ OUR RATE**.

### Material semantics

Część „materiałowa” = `(1 − share) × total` × indeks materiałowy.  
**Brak** `materialKey` · **brak** TechnologyPack · **brak** Price Memory.

→ **ATH MATERIAL SEMANTICS = GAP** względem F2/F3.

### Price semantics

ATH PLN = **historyczna / inwestorska wartość dokumentu**, nie cena WGDOM, nie SELL, nie OUR RATE.

→ **ATH PRICE SEMANTICS = INVESTOR MIXED / UNKNOWN SPLIT**.

---

## 3. ATH → Work Identity

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy ATH daje `workId+unit` bezpośrednio? | **NIE** |
| Czy REUSE resolverów OfferBoq? | **TAK** — `mapOfferBoqLine` (exact_knr z opisu / alias / catalog_map) |
| Czy F4/F5 shadow używa ATH PLN? | **NIE** |
| Ambiguous / unmatched | jawny GAP w F4/F5 (bez zgadywania) |

**ATH WORK IDENTITY:** **PASS** tylko na torze strukturalnym OfferBoq (opis+jm → mapping).  
**ATH code/KNR z `pd`:** **GAP** (utrata w snapshot).

---

## 4. ATH → Position Cost / F5

| Wejście | Zasila F5? |
|---------|------------|
| qty / unit / description | **TAK** (struktura) |
| `catalogWorkId` po mappingu | **TAK** |
| `athUnitPricePln` / `athTotalPln` | **NIE** |
| `ath_priced` Bid | **NIE** (osobny tor; C-MODE-1) |

Thin adapter „ATH → Position Cost” **już istnieje pośrednio** jako:

`ATH → snapshot → OfferBoq → F5 cutover`.

Dodatkowy adapter ATH→OUR RATE / ATH→cena **jest zabroniony** bez osobnego GO (reguła Ownera: ATH price ≠ OUR RATE).

---

## 5. Legacy catalog — mapa zależności

### Klasyfikacja A–I

| Bucket | Zawartość | Werdykt F6 |
|--------|-----------|------------|
| **A — nowy Bid (F5)** | `bid-position-cost-cutover`, OUR RATE, BOM, PM SELL | **ZERO `companyPricePln`** |
| **B — stary Bid** | `pricingMode: catalog` · `aggregateCatalogDirectCost` · `workToLegacyRate(companyPricePln)` · fallback `useTenderPricingAuto` | **AUDITED · KEEP LEGACY** do osobnego GO |
| **C — Offer** | `createWorkCatalogPriceProvider` · `applyOfferBoqPricing` · category/heuristic | **UNCHANGED** (UI linii) |
| **D — ATH Bid** | `ath_priced` · bez companyPrice | **KEEP LEGACY** + rekomendacja deprecate |
| **E — Biblioteka** | `CatalogWork.companyPricePln` · „Cena firmy” · completeness | **KEEP pole** |
| **F — UI** | WorkCatalogCompanyPriceField · TenderBidProposalPanel catalog | **KEEP** |
| **G — testy** | F0–F5 harness · catalog-bid · cost-pipeline | **REUSE** |
| **H — martwy / półmartwy** | `pricedActiveWorkCount` mało konsumowany | **I / cleanup później** |
| **I — P7 / cleanup** | wyłączenie catalog Bid · Offer provider · usunięcie pola | **OSOBNY GO · NIE F6** |

### `companyPricePln` — twardy kontrakt

```text
NEW BID (F5):     companyPricePln = ZERO źródło
OUR RATE:         NIE seed / NIE fallback
MATERIAL SELL:    NIE
POLE W MODELU:    KEEP (techniczne)
USUWANIE:         FORBIDDEN w F6
```

---

## 6. Nasz Katalog Robót vs Biblioteka

| Warstwa | SSOT |
|---------|------|
| **Nasz Katalog Robót** | **OUR RATE** (`ourWorkRate` · `lookupWorkRate`) |
| **Biblioteka Robót** | DEFINICJA / IDENTITY / NORMA (+ legacy `companyPricePln`) |
| Drugi Work Rate Memory | **FORBIDDEN** |

---

## 7. Decyzja ATH (rekomendacja)

| Opcja | Zastosowanie |
|-------|----------------|
| **A KEEP AS LEGACY** | Tryb Bid `ath_priced` — **tymczasowo TAK** (nadal w kodzie) |
| **B KEEP AS SEPARATE INPUT** | Parser / snapshot / qty / UI ATH — **TAK (zalecane)** |
| **C ADAPT TO NEW COST PIPELINE** | Struktura już przez OfferBoq→F5 · **NIE** adaptować ATH PLN do OUR RATE/PM |
| **D DEPRECATE** | `ath_priced` jako źródło direct — **rekomendacja po Owner C-MODE-1** |
| **E REMOVE LATER** | pola seed / enumy po deprecate Bid ATH |

**Wybrane w F6 (bez implementacji):**

1. ATH strukturalny → **B KEEP AS SEPARATE INPUT**  
2. ATH Bid money → **A KEEP AS LEGACY** + rekomendacja **D DEPRECATE** wymaga **Owner GO C-MODE-1**  
3. **STOP** — brak thin price adaptera

---

## 8. Decyzja legacy catalog (rekomendacja)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy jeszcze potrzebny? | **TAK** — Bid fallback bez OfferBoq · Offer providers · Biblioteka |
| Soft-deprecate Bid catalog? | **TAK** jako kierunek · **NIE** w tej fazie bez GO |
| Usunąć pole? | **NIE** |
| Usunąć Offer provider? | **NIE** bez Offer→Position Cost |

---

## 9. Granice F5 (nie regresuj)

| Element | F6 |
|---------|-----|
| Position Cost Engine | **UNCHANGED** |
| OUR RATE | **UNCHANGED** |
| Technology / BOM | **UNCHANGED** |
| Price Memory / sell | **UNCHANGED** |
| `computeTenderBidProposal` stack | **UNCHANGED** |
| Kp / profitPct / minMarginPct | **UNCHANGED** |
| recommendedBidPln (F5 path) | **UNCHANGED** |
| BLOCKER F5? | **NIE** |

---

## 10. GAP-y (jawne)

1. Semantyka ATH PLN = mixed investor · **UNKNOWN** dokładny R/M/S  
2. KNR `pd` ginie w snapshot  
3. `kn=` R/M/S nie używane w Bid ATH  
4. C-MODE-1 Owner: wyłączyć `ath_priced`/`catalog` teraz czy później?  
5. Offer nadal liczy linie przez `companyPricePln` (nie mylić z F5 Bid)  
6. Fallback auto-pricing może wrócić do `ath_priced` gdy brak OfferBoq  

---

## 11. Testy F6 (audit harness)

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f6-ath-catalog-audit.mjs`

Plus regresje F0–F5 / PM / WorkRate / Bid / Offer — bez zmian semantyki.

---

## 12. Implementation Gate — wynik

```text
Zmiana semantyki wymagana?     TAK (C-MODE-1) → STOP
Nowa decyzja architektoniczna? TAK (Owner)    → STOP
Thin adapter bezpieczny bez GO? NIE (ATH PLN ≠ OUR RATE / ≠ PM)
IMPLEMENTATION F6:             NONE
```

---

## 13. Następny krok

**C-MODE-1a ACCEPTED** (2026-08-12).

Opcjonalnie (osobny GO, nie auto):

1. Thin: `useTenderPricingAuto` OfferBoq-null → GAP (wyłączyć catalog fallback).  
2. **Offer cutover** (osobny epic): Offer line pricing → Position Cost.  
3. **Przywrócenie `pd` KNR** do snapshot (quality) — bez ceny.  
4. **P7** soft-deprecate legacy — tylko Owner GO.

**STOP. Nie startuj P7 / F7 automatycznie.**
