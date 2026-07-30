# MARKET-SYNC-01 — AUDIT

> **ID:** MARKET-SYNC-01-AUDIT  
> **EPIC:** MARKET-SYNC-01 (nowy · **nie** część CENY-MATERIAŁÓW-04)  
> **Etap:** **AUDIT ONLY** · **bez IMPLEMENT / OPS / commit / push / zmian kodu**  
> **Data:** 2026-07-30  
> **Język:** polski  
> **Tip UI (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) — bez bumpa w tym AUDIT  
> **Zależności CLOSED (REUSE, nie scope):** WORK-CATALOG-P3.0–P3.3 · CENY-MATERIAŁÓW-01 · CENY-MATERIAŁÓW-04 **P0–P2** (P3 INNE = osobny)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 AUDIT
Werdykt: CONDITIONAL GO → PLAN
STATUS 2026-07-30: AUDIT ACCEPTED · PLAN COMPLETE
  → docs/architecture/MARKET-SYNC-01-PLAN.md
  → docs/architecture/MARKET-SYNC-01-PLAN-COMPLETE.md
  NEXT = DESIGN FREEZE (Owner GO) · nie auto-start
════════════════════════════════════════════════════════
```

---

## 0. Cel biznesowy (wiązany)

| Założenie | Implikacja AUDIT |
|-----------|------------------|
| Sync **ręczny** (Admin) | Brak cron / Edge scheduler / daily scrape |
| Częstotliwość **2–3 miesiące** | Ops batch, nie real-time feed |
| **Preview → akceptacja → produkcja** | Obowiązkowy gate admin (wzór P3.2/P3.3 CSV) |
| Dostawcy v1: **Leroy Merlin · Castorama** | Nowi `origin` / adaptery · poza listą P3.1 |
| Przyszłość: OBI · Bricoman · PSB · inne | Model musi być **provider-agnostic** |
| Dane → Preview → akceptacja → Quotes → `controlled_market` | Konsument OfferBoq **AS-IS** (COST-02-A) |

**OUT twarde (ten EPIC):** AI-COST · Cloud Sync CORE · Bid Calculator · Payroll · Scoring · klasyfikator robót · parser kosztorysów · CENY-MATERIAŁÓW P0–P3 (INNE).

---

## 1. AS-IS — co już istnieje (fakty tip)

### 1.1 Work Catalog + Product Quotes

| Element | Fakt |
|---------|------|
| SSOT | `kw-wgdom-work-catalog` · schema **v4** |
| Encja | `CatalogWork` — **robota** (PLN / jm roboty), nie SKU półki |
| Rynek | `marketQuotes?: WorkMarketQuotes` = `origin → regionCode → MarketSourceSnapshot` |
| Origins produktowe | `kb_pl` · `interbud` · `sekocenbud` · `wgdom` (`MARKET_ORIGIN_IDS`) |
| Snapshot | `price` · `regionCode` · `coverage` · `updatedAt` · `confidence` · `origin` |
| Regiony rynku | `wroclaw` → `powiat_wroclawski` → `dolnyslask` → `polska` |
| EAN / SKU / GTIN | **BRAK** na `CatalogWork` |
| Historia cen | **BRAK** (nadpisanie komórki origin×region) |

Kluczowe pliki: `src/lib/work-catalog/types.ts` · `market-sources.ts` · `market-regions.ts` · `market-average-engine.ts`.

### 1.2 Pipeline Quotes (zamrożony kontrakt CM-04 / P3.3)

```text
CSV → previewMarketCsvImport → (Admin) → commitMarketQuotesImport
  → applyMarketQuotesFromPreview (merge-not-replace)
  → save → kw-wgdom-work-catalog
  → computeMarketAverageForWork → controlled_market → OfferBoq
```

| Funkcja | Rola |
|---------|------|
| `previewMarketCsvImport` | RO preview · matched / low_confidence / unmatched / rejected |
| `commitMarketQuotesImport` | **Jedyny** oficjalny zapis Quotes z UI/ops |
| `MarketWorkMapping` | `origin` + `externalId` (+ aliases) → `workId` |
| P3.3 UX | Preview panel · coverage · flaga `kw-wc-p33-market-pricing-ux` |

**Semantyka krytyczna:** Quotes = **benchmark ceny roboty**, potem `costSplit` → materiał/robocizna.  
**Nie** jest to master danych produktów DIY z półki.

### 1.3 Dokumentowany zakaz scrapera

P3.0 / P3.3 / CM-01 / CM-04: **CSV first · zakaz scrapingu / nieoficjalnych API** bez licencji.  
MARKET-SYNC-01 **nie może** „przemyccić” scrapera w P0 bez osobnej decyzji Ownera + oceny prawnej.

---

## 2. Odpowiedzi na pytania AUDIT (1–12)

### 2.1 Czy WC + Product Quotes da się rozszerzyć bez zmian architektury?

| Wariant | Ocena |
|---------|--------|
| **A — tylko nowe origins** (`leroy`, `castorama`) + CSV w kształcie P3.2 | **Częściowo TAK** — REUSE silnika średniej i commit. **NIEWYSTARCZAJĄCE** semantycznie: sklep sprzedaje **produkt**, WC trzyma **robotę**. |
| **B — rozszerzenie bez nowej warstwy** (mapowanie nazwy sklepu → `workId` ad-hoc) | **NIE rekomendowane** — false `controlled_market`, brak tożsamości cross-shop, kolizje nazw. |
| **C — warstwa Market Product + Provider Quote → dopiero mapowanie na CatalogWork** | **TAK (rekomendacja)** — WC/Quotes bez zmiany semantyki roboty; sync sklepu poza CM-04. |

**Wniosek:** istniejący model **nie wymaga rewrite** AI-COST ani OfferBoq, ale **wymaga** warstwy produktowej **przed** zapisem do `marketQuotes`. „Bez żadnej architektury” = tylko jeśli Owner zaakceptuje sync wyłącznie jako **ręczny CSV już zmapowany na `workId`** (cienki ops, bez katalogu produktów) — wtedy EPIC jest bardzo wąski i **nie** rozwiązuje Leroy≠Castorama naming.

---

### 2.2 Czy warto wprowadzić Market Product + Provider Quote?

**TAK — rekomendowane jako rdzeń MARKET-SYNC-01.**

```text
MarketProduct (referencja WGDOM)
  id, canonicalNamePl, unit, manufacturer?, ean?, aliases[]
  ↔ mapowanie opcjonalne → CatalogWork.id (N:1 lub M:N w późniejszej fazie)

ProviderQuote (oferta sklepu)
  providerId (leroy|castorama|…)
  providerSku / ean / rawName
  pricePln, unitRaw, currency, fetchedAt, sourceUrl?, confidence
  → marketProductId (po match)
```

| Korzyść | Opis |
|---------|------|
| Cross-shop | Ten sam produkt ≠ ta sama nazwa w LM vs Casto |
| Legal / audit | Osobny staging Preview przed WC |
| REUSE | Po akceptacji: eksport/transform → CSV/wiersze → **`commitMarketQuotesImport`** |
| Izolacja | CM-04 P3 INNE / AI-COST nietknięte |

**Bez tej warstwy** EPIC degeneruje do ręcznego CSV robót (już mamy w P3.3) i **nie** uzasadnia nowego EPIC.

---

### 2.3 Czy `commitMarketQuotesImport` można REUSE?

**TAK — jako jedyny tor zapisu do produkcji Quotes.**

| Etap | Rola commit |
|------|-------------|
| Sync sklepu / normalizacja / match produktu | **PRZED** commit — nowy kod FEATURE (nie Cloud CORE) |
| Preview Admin (produkty / mapowania / delty cen) | Nowy UI ops — **nie** zastępuje preview CSV, może je **żywić** |
| Po akceptacji | Wygenerować wiersze zgodne z kontraktami adapterów **lub** rozszerzyć preview o nowy origin → **`commitMarketQuotesImport`** |
| Zakaz | Drugi zapis `marketQuotes` omijający commit (ZERO DUPLICATE · CM-04 D-A) |

**Uwaga:** obecne adapters znają `kbCode` / `interbudId` / `sekocenCode` / `workId`. Nowi dostawcy wymagają **nowego origin + adapter** (amend listy `MARKET_ORIGIN_IDS`) **albo** mapowania wyłącznie przez `workId` w CSV po decyzji Admina (bez nowego origin — wtedy średnia nie rozróżnia LM vs Casto w UI porównania).  
**Rekomendacja PLAN:** nowi origins `leroy` · `castorama` (i szablon `retail_*`) + adaptery + opcjonalnie wyłączenie z `enabledOrigins` średniej do czasu Owner GO na wpływ Bid.

---

### 2.4 Pipeline docelowy

```text
[1] Import danych (ręczny start Admin)
      źródło: plik eksportu / API licencjonowane / (opc. scraper — TYLKO po Legal GO)
        ↓
[2] Normalizacja
      unit · currency · VAT? · fold nazw · EAN/SKU
        ↓
[3] Match → MarketProduct (+ ProviderQuote draft)
      EAN → SKU+provider → fuzzy name+unit+manufacturer
        ↓
[4] Preview (Admin)
      nowe / zmienione / unmatched / konflikty jednostek / Δ% ceny
        ↓
[5] Akceptacja Admin (gate)
      select subset · reject · defer
        ↓
[6] Publish path (REUSE)
      build rows → previewMarketCsvImport (weryfikacja)
        → commitMarketQuotesImport
        → CatalogWork.marketQuotes[origin][region]
        ↓
[7] Konsument AS-IS
      computeMarketAverageForWork → controlled_market → OfferBoq
```

**Brak:** cron, worker ciągły, auto-publish bez Preview.

---

### 2.5 Identyfikacja produktów (priorytet match)

| Priorytet | Klucz | Pewność |
|-----------|-------|---------|
| 1 | **EAN / GTIN** | Wysoka (cross-shop) |
| 2 | **provider + SKU** | Wysoka w obrębie sklepu |
| 3 | **producent + nazwa kanoniczna + jednostka** | Średnia |
| 4 | **nazwa + jednostka** (fuzzy) | Niska → tylko Preview / low_confidence |
| 5 | **wariant** (kolor/grubość/opakowanie) | Obowiązkowy wymiar MarketProduct — inaczej false match |

**Zasada:** auto-publish tylko przy priorytecie 1–2 + zgodna jednostka. Reszta = Preview ręczny.

---

### 2.6 Różne nazwy tego samego produktu (cross-shop)

| Mechanizm | Opis |
|-----------|------|
| **MarketProduct** kanoniczny | Jedna referencja WGDOM |
| **aliases[]** | Nazwy LM / Casto / historyczne |
| **ProviderQuote.rawName** | Zachowane AS-IS (audit) |
| **EAN jako most** | Preferowany cross-shop join |
| **Manual link** w Preview | Admin łączy dwa SKU → jeden MarketProduct |
| **Zakaz** | Auto-merge wyłącznie po podobieństwie stringów bez EAN |

---

### 2.7 Historia cen

| Opcja | Ocena |
|-------|--------|
| Tylko `updatedAt` na snapshocie (AS-IS) | **Niewystarczające** dla sync co 2–3 mies. |
| **Append-only PriceHistory** (rekomendacja) | Ring/cap per `(marketProductId|workId, provider, region)` — np. 24 punkty |
| Osobny KV | Możliwe w PLAN (Gate: czy nowy DATA_KEY?) — preferuj **FEATURE store** z sync jak WC **tylko** po Gate; alternatywa: historia w blobcie ops bez nowego CORE |

**Rekomendacja:** P1 = historia przy MarketProduct/ProviderQuote; **nie** rozbudowywać `MarketSourceSnapshot` o tablicę (mąci średnią). Publish do WC nadal = **ostatnia zaakceptowana** cena.

---

### 2.8 Oznaczanie źródła ceny

| Warstwa | Pola |
|---------|------|
| ProviderQuote | `providerId` · `providerSku` · `sourceKind` (`csv_export`\|`licensed_api`\|`manual`) · `fetchedAt` · opc. `sourceUrl` |
| marketQuotes (po publish) | `origin` = `leroy` / `castorama` / … · `updatedAt` · `confidence` · `coverage` |
| UI / explain | Etykieta PL origin (jak KB.pl) — **bez** zmiany łańcucha AI-COST providerów |

---

### 2.9 Wykrywanie zmiany ceny

| Krok | Logika |
|------|--------|
| Porównanie | Nowa cena vs ostatni zaakceptowany ProviderQuote (ten sam provider+SKU/EAN) |
| Flagi Preview | `new` · `unchanged` · `changed` (ΔPLN, Δ%) · `unit_conflict` · `missing_from_feed` |
| Próg | Konfigurowalny (np. alert gdy \|Δ%\| ≥ X) — tylko UI ops |
| Publish | Tylko wiersze `new`/`changed` zaakceptowane (opc. force re-publish) |

---

### 2.10 Ryzyka architektoniczne

| # | Ryzyko | Sever. | Mitygacja |
|---|--------|--------|-----------|
| R1 | **Semantyka produkt ≠ robota** → złe `controlled_market` | P0 | Warstwa MarketProduct + mapowanie work **tylko** po akceptacji; origins retail wyłączone ze średniej do GO |
| R2 | **Scraper / ToS** | P0 | Legal Gate; P0 = CSV/eksport; scraper = osobny slice po GO |
| R3 | **Drugi tor zapisu Quotes** | P0 | Wyłącznie `commitMarketQuotesImport` |
| R4 | **Nowy DATA_KEY / Cloud CORE** | P1 | Unikać w P0; staging local→Preview; KV dopiero po Gate |
| R5 | **False match nazw** | P1 | EAN-first; fuzzy = low_confidence |
| R6 | **Wpływ na Bid bez świadomości** | P1 | `enabledOrigins` / flaga feature OFF default |
| R7 | **Duplikat vs CM-04 P3 INNE** | P1 | MARKET-SYNC ≠ mapowanie residual INNE robót; OUT wzajemne |
| R8 | **Rozrost katalogu** | P2 | Cap produktów; sync tylko whitelist kategorii |
| R9 | **VAT / jednostka / opakowanie** | P1 | Normalizacja unit + Preview konflikty |
| R10 | **Mieszanie FEATURE+CORE** | P0 | Zero `cloud-sync.ts` merge rewrite |

---

### 2.11 REUSE (istniejący system)

| Komponent | REUSE |
|-----------|-------|
| `previewMarketCsvImport` / `commitMarketQuotesImport` | **Publish path** |
| `applyMarketQuotesFromPreview` merge | Tak |
| `MarketWorkMapping` pattern | Wzorzec mapowania externalId→workId |
| `market-average-engine` + region fallback | Konsument AS-IS |
| `createControlledMarketPriceProvider` | **Bez zmian** |
| P3.3 Preview UX / coverage | Wzorzec UI Admin |
| Adapter pattern P3.1 | Nowi adapterzy retail |
| Local rollback snapshot Quotes | Ops safety |

---

### 2.12 POZA ZAKRESEM (twarde OUT)

| Obszar | Powód |
|--------|-------|
| **AI-COST** (S1–S7, 02, explain) | Osobny EPIC FROZEN / CLOSED |
| **Cloud Sync CORE** / merge / fence | #CORE-013 |
| **Bid Calculator** / target kwot | CM-04 OUT |
| **Payroll** | Safety Gate |
| **Scoring / mapping ATH** | CM-04 OUT |
| **Klasyfikator robót / parser kosztorysów** | CM-04 OUT |
| **CENY-MATERIAŁÓW-04 P0–P3** | Inny EPIC; P3 INNE = triaż residual, nie DIY sync |
| Auto-harmonogram / daily scrape | Założenie biznesowe |
| Auto-publish bez Admin | Założenie biznesowe |
| Podmiana `companyPricePln` z rynku | P3.3 D-C OUT |

---

## 3. Rekomendowana architektura (wysoki poziom)

```text
┌─────────────────────────────────────────────────────────┐
│  MARKET-SYNC-01 (FEATURE)                               │
│  Import → Normalize → Match → Preview → Accept          │
│       MarketProduct  +  ProviderQuote (+ PriceHistory)  │
└───────────────────────────┬─────────────────────────────┘
                            │ publish (accepted only)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  REUSE P3.2/P3.3                                        │
│  rows → previewMarketCsvImport → commitMarketQuotesImport│
│  → CatalogWork.marketQuotes[leroy|castorama|…][region]  │
└───────────────────────────┬─────────────────────────────┘
                            │ read-only
                            ▼
┌─────────────────────────────────────────────────────────┐
│  AS-IS OfferBoq                                         │
│  computeMarketAverageForWork → controlled_market        │
│  (AI-COST / Bid / scoring — BEZ ZMIAN)                  │
└─────────────────────────────────────────────────────────┘
```

**Zasady:**

1. SSOT roboty = nadal WC.  
2. SSOT oferty sklepu = MarketProduct/ProviderQuote (nowe).  
3. SSOT ceny rynkowej **w wycenie** = `marketQuotes` po świadomym publish.  
4. Jedyny write Quotes = `commitMarketQuotesImport`.  
5. Feature flag default **OFF**.

---

## 4. Proponowany model danych (szkic PLAN — nie IMPLEMENT)

### 4.1 MarketProduct

| Pole | Typ (szkic) | Uwagi |
|------|-------------|--------|
| `id` | string | `mp-…` |
| `canonicalNamePl` | string | |
| `unit` | WgdomCostUnit / raw | normalizacja w ingest |
| `ean` | string? | preferowany join |
| `manufacturer` | string? | |
| `variantKey` | string? | grubość/kolor/opakowanie |
| `aliases` | string[] | nazwy sklepów |
| `linkedWorkIds` | string[] | CatalogWork — po akceptacji mapy |
| `active` | boolean | |
| `updatedAt` | ISO | |

### 4.2 ProviderQuote

| Pole | Typ (szkic) | Uwagi |
|------|-------------|--------|
| `id` | string | |
| `marketProductId` | string? | null = unmatched |
| `providerId` | `leroy`\|`castorama`\|… | |
| `providerSku` | string | |
| `ean` | string? | |
| `rawName` | string | |
| `pricePln` | number | |
| `unitRaw` | string | |
| `fetchedAt` | ISO | |
| `sourceKind` | enum | csv_export / licensed_api / manual |
| `confidence` | 0..1 | |
| `status` | draft\|preview\|accepted\|rejected | |

### 4.3 PriceHistoryEntry (opc.)

`{ at, pricePln, providerId, marketProductId, sourceKind }` — append-only, cap.

### 4.4 Publish row → WC

Po akceptacji: wiersz z `workId` (z `linkedWorkIds`) + `origin` + `region` + `price` + `updatedAt` + `confidence` → tor CSV/commit.

---

## 5. Proponowany workflow Admin

1. Admin → „Synchronizacja rynku” (menu Super Admin).  
2. Wybór dostawcy (Leroy / Castorama) + wgranie pliku / start importu licencjonowanego.  
3. Normalizacja + auto-match.  
4. Preview: delty · unmatched · konflikty.  
5. Akceptacja subsetu.  
6. Opcjonalnie: mapowanie MarketProduct → CatalogWork (jeśli brak).  
7. Publish → `commitMarketQuotesImport`.  
8. Coverage / porównanie origins (REUSE P3.3 paneli gdzie możliwe).

Częstotliwość: **ręcznie co 2–3 miesiące** — bez schedulera.

---

## 6. Propozycja EPIC (slice’y)

| Slice | Cel | IN | OUT |
|-------|-----|----|-----|
| **P0** | DF + model MarketProduct/ProviderQuote + staging Preview (CSV manual / eksport) · **bez** scrapera · **bez** publish do WC albo publish tylko na sandbox workIds testowych | model · UI Preview RO · testy pure | scraper · Cloud CORE · AI-COST · CM-04 |
| **P1** | Match EAN/SKU · Δ ceny · Accept gate · **publish** przez `commitMarketQuotesImport` · origins `leroy`/`castorama` · flaga OFF | adaptery · mapping → work | auto cron · Bid reorder |
| **P2** | Historia cen · alerty Δ% · coverage retail · OBI/Bricoman **szablon** (nie full sync) | history ring · UX | PSB full · scraper |
| **P3** | Licencjonowane API / scraper **tylko po Legal GO** · multi-provider ops pack | legal pack | codzienny scrape |

**Cap:** jeden concern na slice · Thin Slice · Owner GO per slice.

---

## 7. Wejście do PLAN — kryteria gotowości

| # | Kryterium | Status AUDIT |
|---|-----------|--------------|
| 1 | Rozróżnienie produkt vs robota udokumentowane | **PASS** |
| 2 | REUSE commit path zdefiniowany | **PASS** |
| 3 | OUT vs CM-04 / AI-COST / Cloud CORE | **PASS** |
| 4 | Manual-only / no cron | **PASS** |
| 5 | Preview przed produkcją | **PASS** |
| 6 | Legal path dla źródła danych (CSV vs scrape) | **OPEN** → PLAN musi zamknąć jako Gate |
| 7 | Decyzja: retail origins w `enabledOrigins` średniej | **OPEN** → Owner w PLAN/DF |

---

## 8. Rekomendacja GO / NO GO

### **CONDITIONAL GO → PLAN**

**Uzasadnienie GO:**

1. Potrzeba biznesowa (LM/Casto, sync rzadki, Preview) **nie koliduje** z założeniami P3.0 „CSV first / rzadki ingest”.  
2. Silnik Quotes + `controlled_market` da się **REUSE** bez AI-COST.  
3. Warstwa Market Product rozwiązuje naming cross-shop i chroni semantykę WC.

**Warunki (bez spełnienia = NO GO IMPLEMENT):**

| # | Warunek |
|---|---------|
| W1 | PLAN + DF wprowadza **MarketProduct + ProviderQuote** (nie tylko nowe keywords na robotach) |
| W2 | Publish **wyłącznie** przez `commitMarketQuotesImport` |
| W3 | P0 **bez scrapera** do czasu Legal GO |
| W4 | Feature flag default **OFF**; retail origins nie psują Bid bez świadomej decyzji |
| W5 | Zero zmian Cloud Sync CORE / AI-COST / Bid / scoring / CM-04 P3 |
| W6 | Osobny EPIC ID **MARKET-SYNC-01** — nie amend CM-04 |

### **NO GO (gdyby…)**

- Wymuszenie daily scrape / auto-publish.  
- Zapis Quotes poza commit.  
- Traktowanie EPIC jako „dokładka do CENY-MATERIAŁÓW-04 P3”.  
- Wymóg zmiany AI-COST lub Bid Calculator.

---

## 9. NEXT

```text
AUDIT COMPLETE (ten dokument)
  → PLAN (Owner GO)
  → DESIGN FREEZE
  → ARCHITECTURE REVIEW
  → OWNER GO
  → IMPLEMENT (P0…)
```

**Nie** startować PLAN/IMPLEMENT bez Owner GO.  
**Nie** mieszać z CENY-MATERIAŁÓW-04 P3 (INNE).

---

## 10. Indeks plików AS-IS (odniesienia)

| Temat | Ścieżka |
|-------|---------|
| Typy WC | `src/lib/work-catalog/types.ts` |
| Origins / snapshots | `src/lib/work-catalog/market-sources.ts` |
| Preview CSV | `src/lib/work-catalog/market-csv-preview.ts` |
| Commit Quotes | `src/lib/work-catalog/commit-market-quotes.ts` |
| Apply merge | `src/lib/work-catalog/apply-market-quotes.ts` |
| Średnia rynku | `src/lib/work-catalog/market-average-engine.ts` |
| Design P3.0 | `docs/work-catalog/P3.0-MARKET-SOURCES-ARCHITECTURE-DESIGN.md` |
| P3.3 DF | `docs/architecture/WORK-CATALOG-P3.3-DESIGN-FREEZE.md` |
| CM-04 P2 CLOSE | `docs/architecture/CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md` |

---

**AUDIT STATUS:** **COMPLETE** · **READY FOR PLAN** (po Owner GO) · **CONDITIONAL GO**
