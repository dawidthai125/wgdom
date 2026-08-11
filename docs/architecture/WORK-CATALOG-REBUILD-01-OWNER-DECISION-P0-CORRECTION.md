# WORK-CATALOG-REBUILD-01 — Korekta Owner Decision (P0)

> **STATUS:** **OWNER DECISION CORRECTION** · **ZERO IMPLEMENTACJI** · **ZERO COMMIT** · **ZERO PUSH**  
> **DATA:** 2026-08-11  
> **SSOT DECYZJI (nadpisuje niejasność):** ten dokument + poprawione § w Design Freeze / ARCH REVIEW  
> **Bazuje na:** [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · [`WORK-CATALOG-REBUILD-01-ARCH-REVIEW.md`](./WORK-CATALOG-REBUILD-01-ARCH-REVIEW.md)

---

## 0. Co było źle zrozumiane

**ŹLE:**

> „zachowujemy stary model wyceny robót jako legacy i nadal go wykorzystujemy”

**DOBRZE (Owner):**

```text
STARY MODEL WYCENY ROBÓT JEST WYCOFYWANY.
companyPricePln ≠ prawidłowa / aktualna stawka robocizny
companyPricePln ≠ źródło OUR RATE
companyPricePln ≠ fallback OUR RATE
companyPricePln ≠ seed nowego Katalogu Robót
AUTO-MIGRACJA companyPricePln → OUR RATE = FORBIDDEN
```

Pole może zostać w modelu **tylko jako TECHNICAL LEGACY FIELD** (inne stare ścieżki app mogą je jeszcze czytać),  
**nie** jako **LEGACY PRICING SOURCE** dla nowej wyceny.

---

## 1. Nowy SSOT (potwierdzony)

```text
Biblioteka Robót
  → DEFINICJA / IDENTITY (workId, nazwa, unit, keywords, normy, active…)

Nasz Katalog Robót
  → AKTUALNA NASZA STAWKA (OUR RATE) — jedyny SSOT stawki robót

Źródło zewnętrzne (po Legal PASS)
  → KB.pl / zatwierdzone
  → stawka rynkowa + region + mediana
  → OWNER ACCEPT
  → OUR RATE
```

**Pierwsza OUR RATE** wyłącznie z:

1. Owner ręcznie, **lub**  
2. zatwierdzony research → Owner Accept  

**Nigdy** ze starego `companyPricePln`.

**Przykład Ownera:** Malowanie 35 zł w Bibliotece → w Nasz Katalog Robót = **BRAK STAWKI** (nie 35).

---

## 2. Audyt zależności `companyPricePln` (repo)

Podział: **A–G**.  
**ZOSTAJE TECHNICZNIE** = nie usuwać w P0–P6.  
**ODŁĄCZYĆ OD NOWEJ WYCENY** = nie lookup / nie fallback / nie UI Nasz Katalog / nie seed.

### A. DEFINICJA / DANE TECHNICZNE

| Miejsce | Rola dziś | P0 |
|---------|-----------|-----|
| `CatalogWork.companyPricePln` (`types.ts`) | pole modelu | **ZOSTAJE** (pole techniczne) |
| `normalizeCatalogWork` | preserve wartości | **ZOSTAJE** (preserve; nie strip) |
| `laborRbhPerUnit` / seed migrate | norma / legacy seed | **ZOSTAJE** (norma ≠ cena) |
| hosty PM (`companyPricePln: 0`) | material hosts | **ZOSTAJE** (nie mylić z OUR RATE) |

### B. STARY MODEL WYCENY

| Miejsce | Rola dziś | P0 |
|---------|-----------|-----|
| `cost-split.ts` / `splitCompanyPrice` | mixed → M+R | **STARY TOR** — nie zasila OUR RATE |
| `work-catalog-engine-adapter.ts` | adapter do silnika kosztów | **STARY TOR** do P7 Bid |
| `freshness.ts` + `isCompanyPricePresent` | freshness **mixed** | **STARY TOR**; Nasz Katalog = osobny freshness OUR RATE |
| `work-catalog-completeness.ts` | „kompletna” = cena > 0 | **STARY TOR** Biblioteki; Nasz Katalog ≠ completeness mixed |
| `work-catalog-bootstrap` / `tender-active-catalog` | filtr „ma cenę” | **STARY TOR** — nie używać jako „ma OUR RATE” |
| seedy A1 / foundation (`companyPricePln` w specs) | seed mixed | **NIE seedować** do OUR RATE |

### C. BID

| Miejsce | Rola dziś | P0–P6 |
|---------|-----------|--------|
| tor Bid via adapter / katalog / category rates | czyta legacy mixed | **ZERO TOUCH** (nie przełączać na OUR RATE bez P7 GO) |
| `tenders-bid-calculator` | nie ma bezpośredniego pola (pośrednio catalog) | **UNCHANGED** |

**Uwaga Owner:** Bid nadal **technicznie** może czytać `companyPricePln` do P7 — to **nie** oznacza, że jest to akceptowane źródło **nowej** wyceny. To **debt** do wycofania w P7, nie „legacy SSOT”.

### D. OFFER

| Miejsce | Rola dziś | P0 |
|---------|-----------|-----|
| `tender-offer-boq-pricing-engine.ts` | `work.companyPricePln > 0` → unitPrice / split | **STARY TOR** — ZERO TOUCH w P0; później Offer ↔ OUR RATE osobnym GO |

### E. HISTORIA

| Miejsce | Rola dziś | P0 |
|---------|-----------|-----|
| `catalog-rate-history-snapshot` / category history | snapshoty z adaptera legacy | **STARY TOR** — nie kopiować do historii OUR RATE |
| historia Nasz Katalog Robót | nowa (cap 24) | **NOWA** — pusta do pierwszego Accept / Owner edit |

### F. UI

| Miejsce | Rola dziś | P0 / P1 |
|---------|-----------|---------|
| `WorkCatalogCompanyPriceField` / Biblioteka | edycja „Cena firmy” | **ZOSTAJE** technicznie (stary ekran); **NIE** jest Nasz Katalog Robót |
| `WorkCatalogMarketComparison` | porównanie vs mixed | **STARY UI** |
| **Nasz Katalog Robót** (plan) | NASZA STAWKA | **BRAK STAWKI** gdy brak OUR RATE — **nigdy** nie pokazywać `companyPricePln` jako aktualnej stawki |

### G. INNE

| Miejsce | Rola | P0 |
|---------|------|-----|
| `our-price-catalog.ts` (materiały) | passthrough pola w row | **NO TOUCH** PM; nie używać do labor OUR RATE |
| apply-etics seed (`marketQuotePln` → companyPrice gdy 0) | material path | **NO TOUCH** PM / nie seed labor |
| testy C01–C03 | asercje untouched | **ZOSTAJE** — nadal „companyPricePln bitowo bez zmian” przy OUR RATE patch |

---

## 3. STARE / NOWE / WYCOFANE / MIGRACJA

### STARE — co zostaje technicznie (P0)

- `CatalogWork` identity + normy (`laborRbhPerUnit`, keywords, unit…)  
- pole `companyPricePln` w store / normalize / sync (preserve)  
- Biblioteka Robót UI edycji „Ceny firmy” (na razie)  
- Bid / Offer / adapter / completeness / freshness mixed — **bez zmian kodu** do osobnego GO  
- Price Memory materiałów — **ZERO TOUCH**

### NOWE — co zastępuje stary model wyceny

- **Nasz Katalog Robót** = SSOT **OUR RATE**  
- lookup OUR RATE: tylko nowe pola stawek (po C1 normalize)  
- start: **puste** OUR RATE → UI **BRAK STAWKI**  
- źródła OUR RATE: Owner ręcznie **lub** research + Accept  
- freshness OUR RATE (TTL 90) — osobno od freshness mixed  

### WYCOFANE — przestaje być źródłem ceny (od P0 kontraktu)

- `companyPricePln` jako **prawidłowa / aktualna** stawka robót  
- `companyPricePln` jako **fallback** OUR RATE  
- `companyPricePln` jako **seed** Nasz Katalog Robót  
- auto: stara cena → nowa cena  
- traktowanie Biblioteki jako cennika docelowego  

### MIGRACJA — później (nie P0)

| Co | Kiedy | Co NIE |
|----|-------|--------|
| Bid → OUR RATE | **P7** + Owner GO | auto-kopiowanie mixed |
| Offer BOQ → OUR RATE | osobny GO po Bid lub równolegle | seed z mixed |
| Odłączenie UI Biblioteki od „ceny robót” | P1+ copy / soft-deprecate | usunięcie pola w ciemno |
| Usunięcie / soft-delete pola `companyPricePln` | dopiero po audycie zależności **po** P7 | P0–P6 |
| P6 w DF | **PRZEDEFINIOWANE:** nie „migruj ceny”; najwyżej narzędzia Accept / disconnect — **bez** batch `companyPricePln → OUR RATE` | auto-migrate |

---

## 4. Poprawiony zakres P0 (kontrakt)

P0 = **model + identity + extend WC + lookup OUR RATE**, z twardymi regułami:

| # | Reguła P0 |
|---|-----------|
| 1 | EXTEND `kw-wgdom-work-catalog` + **C1** normalize preserve |
| 2 | Identity `workId + unit` |
| 3 | Lookup OUR RATE **tylko** z nowego modelu |
| 4 | Brak OUR RATE → **BRAK STAWKI** / MISS |
| 5 | **ZERO** seed / copy / fallback z `companyPricePln` |
| 6 | **ZERO** Bid / Offer / PM changes |
| 7 | Owner edit OUR RATE dozwolony (osobny patch) |
| 8 | Research live: **BLOCKED** (Legal) |
| 9 | `companyPricePln` **preserve** bitowo przy operacjach OUR RATE |

**Poza P0:** UI pełny (P1), historia/freshness UI (P2), research (P3+), Bid (P7).

---

## 5. Konflikt z ARCH REVIEW?

| Punkt ARCH REVIEW | Po korekcie |
|-------------------|-------------|
| PASS WITH CONDITIONS | **NADAL WAŻNY** |
| C1 normalize | **NADAL OBOWIĄZKOWY** |
| C7 „nie mutuj companyPricePln” | **WZMOCNIONY** + „nie czytaj jako OUR RATE” |
| „LEGACY” jako pricing source | **SKORYGOWANE** → TECHNICAL LEGACY FIELD |
| Empty catalog / no seed | **NOWY WARUNEK C-EMPTY** |
| Bid ZERO TOUCH | **BEZ ZMIANY** (debt do P7, nie „akceptacja starego modelu”) |

**Werdykt konfliktu:** brak BLOCKER-a.  
ARCH REVIEW wymaga **addendum** semantyki (zrobione w pliku ARCH REVIEW) — **nie** unieważnia PASS WITH CONDITIONS.

---

## 6. Nowy CONDITION (obowiązkowy)

```text
C-EMPTY / C-NO-SEED:
  Nasz Katalog Robót startuje bez OUR RATE
  dopóki Owner Accept lub Owner Edit.
  Żaden kod P0+ nie wolno:
    ourRate = companyPricePln
    ourRate ??= companyPricePln
    seedFromCompanyPrice(...)
```

---

## 7. Zakazy tej korekty

- ZERO implementacji  
- ZERO commit / push  
- ZERO usuwania `companyPricePln` z modelu  
- ZERO przełączania Bid na OUR RATE  

**NEXT:** potwierdzenie OWNER → dopiero potem ewentualne **GO IMPLEMENT P0** (wg skorygowanego kontraktu).

---

*Koniec korekty. Czeka na potwierdzenie Ownera.*
