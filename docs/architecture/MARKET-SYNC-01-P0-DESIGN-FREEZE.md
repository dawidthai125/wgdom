# MARKET-SYNC-01 P0 — DESIGN FREEZE

> **ID:** MARKET-SYNC-01-P0-DESIGN-FREEZE  
> **EPIC:** MARKET-SYNC-01 · **Slice:** **P0 — Model + Preview**  
> **STATUS:** **DESIGN FREEZE · FROZEN (P0)** · **IMPLEMENT ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push / OPS**  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE** (oczekiwane przy IMPLEMENT)  
> **Wejście:** PLAN **zaakceptowany** · Owner GO DF P0 · [`MARKET-SYNC-01-PLAN.md`](MARKET-SYNC-01-PLAN.md) · [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md)  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (MARKET-SYNC-01 P0):
  Zamrozić model MarketProduct + ProviderQuote oraz tor
  Import → Normalize → Match → Preview (STOP).
  BEZ Accept · BEZ publish · BEZ commitMarketQuotesImport.
  BEZ AI-COST / Cloud CORE / Bid / drugiego toru Quotes.

IMPLEMENT zakazany do: Architecture Review PASS + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*P0: staging local-first FEATURE — bez kasowania/migracji LP)
G3 Cloud Sync:   NIE   (P0: BRAK nowego DATA_KEY · BRAK edycji cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE*  (*opc. panel w istniejącej Bibliotece / Super Admin — bez nowych tras CORE)

Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
Owner GO IMPLEMENT (P0): dopiero po Arch Review PASS + jawne GO
```

---

## 1. Cel P0 (FROZEN)

| IN P0 | OUT P0 |
|-------|--------|
| Finalny model **MarketProduct** · **ProviderQuote** | Accept Admin |
| Relacje z WC / Quotes / controlled_market (**dokumentacja**) | Publish / `commitMarketQuotesImport` |
| Przepływ Import → Normalize → Match → **Preview STOP** | PriceHistory (P2) |
| Match regułowy + Preview UI kontrakt | Origins `leroy`/`castorama` w WC |
| Persist **local-first** staging (opcja A PLAN) | Nowy Cloud DATA_KEY |
| Fixture CSV + testy pure (przy IMPLEMENT) | Scraper / API / cron |
| | linkedWorkIds publish path (P1) |
| | Zmiany AI-COST / Bid / scoring / CM-04 |

**STOP line (FROZEN):** po Preview **koniec P0**. Żaden kod P0 nie wolno wywołać `commitMarketQuotesImport` ani mutować `CatalogWork.marketQuotes`.

---

## 2. Architektura P0 (FROZEN)

```text
┌─ MARKET-SYNC-01 P0 ────────────────────────────────────┐
│  Admin (ręczny start)                                   │
│  Import → Normalize → Match → Preview                   │
│                      STOP ════╝                         │
│  Staging local: MarketProduct[] · ProviderQuote[]       │
│                 SyncRun (ops meta)                      │
└─────────────────────────────────────────────────────────┘
        │
        │  (P0: BRAK strzałki publish)
        ✕  commitMarketQuotesImport
        ✕  marketQuotes / controlled_market write

┌─ AS-IS (read-only dokumentacja relacji) ───────────────┐
│  Work Catalog · Product Quotes · controlled_market     │
│  — P0 NIE czyta wyceny · NIE zapisuje Quotes           │
└─────────────────────────────────────────────────────────┘
```

### 2.1 Relacje (P0 — tylko kontrakt, bez write)

| Encja | Relacja w P0 | Relacja od P1 |
|-------|--------------|---------------|
| **MarketProduct** | SSOT produktu referencyjnego w staging | + `linkedWorkIds` → CatalogWork |
| **ProviderQuote** | Oferta sklepu; opc. `marketProductId` po Match | Accept → publish rows |
| **Work Catalog** | **Poza zapisem P0** · SSOT robót nietknięty | Publish Quotes na `workId` |
| **Product Quotes** | **Poza zapisem P0** · jedyny przyszły tor = commit | P1 |
| **controlled_market** | **Poza P0** (konsument AS-IS od P1 gdy origins ON) | P1+ |

**SSOT FIRST (P0):** staging Market Sync ≠ WC. Żadne „doklejanie” ceny sklepu do `companyPricePln` / `marketQuotes` w P0.

---

## 3. Przepływ P0 (FROZEN)

```text
[1] IMPORT
      Admin wybiera plik CSV (fixture / eksport sklepu)
      → SyncRun { id, provider?, startedAt, actorAdminId, sourceKind: csv_export|manual }
        ↓
[2] NORMALIZACJA
      · trim / fold PL nazw
      · EAN → digits-only; lista ean[] (walidacja długości 8/13)
      · unit raw → unit kanoniczny (mapa jednostek — tabela DF §7)
      · grossPrice → number ≥ 0; currency default PLN
      · reject wiersza: brak productName LUB brak ceny LUB (brak EAN i brak providerSku)
        ↓
[3] MATCH (§6)
      → candidate MarketProduct(s) + confidence + matchMethod
      → ProviderQuote.status = proposed | unmatched | conflict
        ↓
[4] PREVIEW (§8)
      Buckety + proponowany Match + pewność
        ↓
      ════════ STOP P0 ════════
```

**Zakaz w P0:** Accept · Reject-as-publish · build rows · `previewMarketCsvImport` jako tor produkcji · `commitMarketQuotesImport` · batch-set WC.

**Uwaga REUSE:** Wzorzec UX Preview **może** inspirować się P3.3 CSV panel — **bez** podłączania commit.

---

## 4. MarketProduct — pola FROZEN (P0)

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `id` | `string` | tak | Stabilny `mp-{uuid}` |
| `canonicalName` | `string` | tak | Nazwa kanoniczna WGDOM (PL) |
| `manufacturer` | `string \| null` | nie | Producent |
| `unit` | `string` | tak | Jm kanoniczna po normalizacji (np. `m2`, `mb`, `szt`, `kg`, `l`) |
| `category` | `string \| null` | nie | Kategoria ops (whitelist w DF §7.2; nie = tradeId WC) |
| `aliases` | `string[]` | tak (może `[]`) | Alternatywne nazwy (sklepy / historyczne) |
| `ean` | `string[]` | tak (może `[]`) | Lista GTIN/EAN (most cross-shop) |
| `active` | `boolean` | tak | Default `true` |
| `createdAt` | `string` ISO | tak | |
| `updatedAt` | `string` ISO | tak | |

### 4.1 Pola **NIE** w P0 (przeniesione → P1)

| Pole PLAN | Powód |
|-----------|--------|
| `linkedWorkIds` | Publish / mapa do CatalogWork = **P1** |
| `variantKey` | Opc. P1 jeśli konflikty wariantów na fixture |
| `canonicalNamePl` | Zastąpione przez **`canonicalName`** (Owner DF) |

### 4.2 Inwarianty MarketProduct

1. `id` immutable po create.  
2. `canonicalName.trim().length ≥ 1`.  
3. Każdy wpis `ean[]` = same digits; unikalność EAN w obrębie aktywnych MP (kolizja = Preview conflict / blok create).  
4. `aliases` bez duplikatów (fold).  
5. P0 **nie** wymaga powiązania z `CatalogWork`.

---

## 5. ProviderQuote — pola FROZEN (P0)

| Pole | Typ | Wymagane | Opis |
|------|-----|----------|------|
| `id` | `string` | tak | `pq-{uuid}` |
| `provider` | `ProviderId` | tak | Enum ops: `leroy` \| `castorama` \| `obi` \| `bricoman` \| `psb` \| `other` — **P0 fixture może używać dowolnego; brak zapisu do MARKET_ORIGIN_IDS** |
| `providerSku` | `string` | tak* | SKU sklepu (*wymagane jeśli brak EAN) |
| `ean` | `string \| null` | nie | Pojedynczy EAN z wiersza feedu |
| `productName` | `string` | tak | Nazwa AS-IS z feedu |
| `unit` | `string` | tak | Jm po normalizacji (lub raw zachowane w `unitRaw` — patrz §5.1) |
| `grossPrice` | `number` | tak | Cena brutto ≥ 0 |
| `currency` | `string` | tak | Default **`PLN`**; inne = reject lub Preview warn (P0: tylko PLN accept) |
| `sourceUrl` | `string \| null` | nie | URL źródła |
| `importedAt` | `string` ISO | tak | = czas importu wiersza |
| `status` | `ProviderQuoteStatus` | tak | Patrz §5.2 |
| `syncRunId` | `string` | tak | Idempotencja |
| `marketProductId` | `string \| null` | nie | Wypełniane przez Match (propozycja) |
| `matchConfidence` | `number` | nie | 0..1 |
| `matchMethod` | `MatchMethod \| null` | nie | §6 |
| `matchCandidates` | `{ marketProductId, confidence, method }[]` | nie | Przy conflict |

### 5.1 Pola pomocnicze normalizacji (dozwolone w P0, nie w liście Owner — wewnętrzne)

| Pole | Opis |
|------|------|
| `unitRaw` | Opc. jm sprzed normalizacji |
| `productNameFold` | Opc. cache fold do match (nie UI) |

### 5.2 `ProviderQuoteStatus` (P0 FROZEN)

| Status | Znaczenie |
|--------|-----------|
| `imported` | Po normalizacji, przed/w trakcie match |
| `proposed` | Dokładnie **1** kandydat Match (auto-propozycja) |
| `unmatched` | 0 kandydatów |
| `conflict` | **≥2** kandydatów (multi-match) |
| `rejected_row` | Odrzucony w normalizacji (nie trafia do bucketów „biznesowych” lub osobny bucket) |

**P0 nie używa:** `accepted` · `rejected` (Accept) · `deferred` · `published` — to **P1**.

### 5.3 Inwarianty ProviderQuote

1. `currency === "PLN"` w P0 (inne → `rejected_row`).  
2. `grossPrice` skończona liczba ≥ 0.  
3. Unikalność w SyncRun: `(provider, providerSku)` lub `(provider, ean)` gdy SKU puste.  
4. P0 **nie** ustawia statusów publish.

---

## 6. Match — priorytet FROZEN

```text
1. EAN
     Quote.ean ∈ MarketProduct.ean[]  → confidence 1.0 · method=ean
2. Provider SKU
     (provider, providerSku) znany z wcześniejszego Quote → ten sam marketProductId
     (P0: jeśli brak historii, pomiń / confidence n/a)
3. Producent + Nazwa + Jednostka
     manufacturer fold + (canonicalName|alias) exact fold + unit equal
     → confidence 0.85 · method=mfr_name_unit
4. Alias
     productNameFold ∈ aliases fold (exact) + unit equal
     → confidence 0.75 · method=alias
5. Preview Manual Review
     brak auto-link · status=unmatched LUB conflict
     method=manual (tylko po akcji Admin w P1; w P0 tylko wyświetlenie)
```

### 6.1 Reguły twarde

| Reguła | Treść |
|--------|--------|
| **M1** | **Zakaz** automatycznego **fuzzy** merge / auto-create MarketProduct z podobieństwa stringów |
| **M2** | Fuzzy (jeśli w ogóle w kodzie) = **tylko** podpowiedź UI z `confidence < 0.75` i **nigdy** nie ustawia `marketProductId` bez Manual (P1); w **P0** fuzzy **WYŁĄCZONY** (FROZEN) |
| **M3** | ≥2 trafienia priorytetów 1–4 → `status=conflict` · `matchCandidates` pełne · **bez** wyboru zwycięzcy |
| **M4** | 1 trafienie → `status=proposed` · `marketProductId` = propozycja (robocza w Preview; **nie** akceptacja biznesowa) |
| **M5** | 0 trafień → `status=unmatched` |
| **M6** | EAN conflict (ten sam EAN na dwóch aktywnych MP) → traktuj jako conflict danych referencyjnych (Preview) |

---

## 7. Normalizacja — tabele FROZEN (minimalne P0)

### 7.1 Jednostki (mapa surowa → kanoniczna)

| unitRaw (przykłady) | unit |
|---------------------|------|
| m2, m², mb2, metr kw. | `m2` |
| mb, m.b., m | `mb` |
| szt, szt., sztuka | `szt` |
| kg, KG | `kg` |
| l, L, litr | `l` |
| kpl, komplet | `kpl` |
| nieznane | `rejected_row` lub Preview `unit_conflict` bez match |

DF IMPLEMENT: mapa w pure lib; rozszerzenia tylko amend DF.

### 7.2 `category` (opc.)

Whitelist startowa (może być pusta w P0): `chemia` · `suche_zabudowy` · `instalacje` · `wykończenie` · `inne`.  
**Nie** mapować automatycznie na `TradeId` WC.

### 7.3 Provider enum

`leroy` · `castorama` · `obi` · `bricoman` · `psb` · `other`  
P0 **nie** dodaje ich do `MARKET_ORIGIN_IDS` (to P1).

---

## 8. Preview — kontrakt UI FROZEN

### 8.1 Buckety (obowiązkowe)

| Bucket | Kryterium |
|--------|-----------|
| **Nowe produkty** | Brak wcześniejszego Quote dla `(provider, providerSku\|ean)` w staging **oraz** unmatched/proposed bez historii ceny |
| **Zmienione ceny** | Istnieje poprzedni Quote (ten sam klucz) z `grossPrice` ≠ nowy (ε = 0.01 PLN) — porównanie w staging / ostatni import |
| **Brak dopasowania** | `status=unmatched` |
| **Konflikt wielu dopasowań** | `status=conflict` |
| **Proponowany Match** | `status=proposed` — pokaż `canonicalName` + `id` |
| **Poziom pewności** | `matchConfidence` + etykieta `matchMethod` |

Dodatkowo (dozwolone): `rejected_row` · `unit_conflict` · `unchanged` (cena bez Δ).

### 8.2 Kolumny wiersza (minimum)

`provider` · `providerSku` · `ean` · `productName` · `unit` · `grossPrice` · `currency` · bucket · proposed MP · confidence · method · candidates (conflict).

### 8.3 Akcje Admin w P0

| Dozwolone | Zakazane |
|-----------|----------|
| Uruchom import pliku | Accept / Reject biznesowy (P1) |
| Filtr bucketów | Publish / commit Quotes |
| Podgląd candidates | Auto-merge fuzzy |
| Eksport Preview JSON (ops) | Edycja WC / marketQuotes |
| (opc.) ręczny **podgląd** „jakby link” bez zapisu Accept | linkedWork picker (P1) |

---

## 9. Persist P0 (FROZEN)

| Decyzja | Wartość |
|---------|---------|
| **D-P0-1** | Persist = **local-first** (opcja A PLAN) — `localStorage` / IndexedDB FEATURE klucz ops **nie** w `DATA_KEYS` cloud-sync |
| **D-P0-2** | Brak nowego KV cloud w P0 |
| **D-P0-3** | Opc. eksport/import pliku JSON staging (backup Admin) |
| **D-P0-4** | Multi-device sync store = **P1/DF amend** jeśli Owner wymaga |

Nazwa klucza local (szkic IMPLEMENT): `kw-market-sync-01-staging` — **nie** mylić z `kw-wgdom-work-catalog`.

---

## 10. Acceptance Criteria P0 (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P0-1** | Typy/model MarketProduct + ProviderQuote zgodne z §4–§5 |
| **AC-P0-2** | Tor Import → Normalize → Match → Preview działa na fixture CSV |
| **AC-P0-3** | Preview pokazuje wszystkie buckety §8.1 |
| **AC-P0-4** | Match stosuje priorytet §6; conflict przy ≥2; **zero** fuzzy auto-merge |
| **AC-P0-5** | W kodzie P0 **brak** wywołań `commitMarketQuotesImport` / zapisu `marketQuotes` |
| **AC-P0-6** | Brak Accept / publish / origins w `MARKET_ORIGIN_IDS` |
| **AC-P0-7** | Persist local-only; **brak** edycji `cloud-sync.ts` |
| **AC-P0-8** | Testy pure: EAN hit · unmatched · conflict · reject bez ceny |
| **AC-P0-9** | UI tylko Super Admin (lub równoważny ACL Biblioteki) |
| **AC-P0-10** | OUT §13 zachowane (AI-COST / Bid / CM-04 / …) |

---

## 11. KPI P0 (FROZEN)

| ID | KPI | Target |
|----|-----|--------|
| **K-MS-0** | Preview fixture end-to-end (bez publish) | **PASS** |
| **K-MS-0a** | Match EAN precision na fixture gold | **100%** proposed/conflict zgodne z gold |
| **K-MS-0b** | Fuzzy auto-link count | **0** |
| **K-MS-0c** | Wywołania commit Quotes w P0 | **0** (grep/test) |
| **K-MS-5** | Regresja AI-COST / Cloud CORE / Bid / WC Quotes | **brak zmian** (diff allowlist) |

---

## 12. Ryzyka P0

| ID | Ryzyko | Sev | Mitygacja DF |
|----|--------|-----|--------------|
| R-P0-1 | Przypadkowy publish w „wygodnym” PR | P0 | AC-P0-5 · allowlist review |
| R-P0-2 | Fuzzy „na chwilę” | P0 | M2 FROZEN OFF |
| R-P0-3 | Zapis do WC „żeby zobaczyć” | P0 | STOP line · local staging |
| R-P0-4 | Kolizja nazewnictwa z PLAN (`canonicalNamePl`) | P1 | Alias dokumentacyjny §4.1 |
| R-P0-5 | Fixture ≠ real LM/Casto CSV | P1 | P1 adapters; P0 = kontrakt pól |
| R-P0-6 | Local-only gubi dane przy clear storage | P1 | Eksport JSON · opc. KV później |

---

## 13. Rollback P0

| Scenariusz | Działanie |
|------------|-----------|
| Zły import | Nowy SyncRun / clear staging local / wczytaj backup JSON |
| Zły Match proposed | P0: brak Accept — wystarczy re-import lub clear `marketProductId` w staging (ops) |
| Publish | **N/A** — P0 nie publish’uje; rollback Quotes = poza scope |

---

## 14. OUT P0 (twarde)

| OUT |
|-----|
| Accept / Reject biznesowy / Deferred |
| `commitMarketQuotesImport` · `applyMarketQuotesFromPreview` na WC |
| Mutacja `marketQuotes` / `companyPricePln` |
| Origins w `MARKET_ORIGIN_IDS` / `enabledOrigins` |
| PriceHistory |
| linkedWorkIds / picker CatalogWork |
| Scraper / licensed API / cron |
| AI-COST · Cloud Sync CORE · Bid · Scoring · klasyfikator · parser |
| CENY-MATERIAŁÓW-04 P0–P3 |
| Fuzzy auto-merge |
| Drugi tor Quotes |
| Nowy DATA_KEY cloud |

---

## 15. Zgodność z zasadami (weryfikacja DF)

| Zasada | Jak P0 DF spełnia | Werdykt |
|--------|-------------------|---------|
| **PLAN** | Slice P0 = Model+Preview; STOP przed Accept/publish | **PASS** |
| **AUDIT** | Warstwa MP+PQ; REUSE commit dopiero P1; local-first | **PASS** |
| **SSOT FIRST** | Staging ≠ WC; Quotes nietknięte | **PASS** |
| **REUSE FIRST** | Wzorzec Preview UX; commit **nie** w P0 (świadomie) | **PASS** |
| **ZERO DUPLICATE LOGIC** | Brak drugiego toru Quotes (brak toru w ogóle w P0) | **PASS** |
| **FEATURE-DATA ONLY** | Model + ops UI; 0 CORE | **PASS** |
| **DATA FIRST** | Match regułowy; zero AI | **PASS** |

---

## 16. Decyzje architektoniczne FROZEN (P0)

| ID | Decyzja |
|----|---------|
| **D-P0-A** | P0 = Import→Normalize→Match→Preview **STOP** |
| **D-P0-B** | Pola MarketProduct wg §4 (`canonicalName`, `ean[]`, …) |
| **D-P0-C** | Pola ProviderQuote wg §5 (`grossPrice`, `currency`, `importedAt`, …) |
| **D-P0-D** | Match priorytet EAN→SKU→Mfr+Name+Unit→Alias→Manual; **fuzzy OFF** |
| **D-P0-E** | Conflict = ≥2 kandydatów; bez auto-wyboru |
| **D-P0-F** | Persist **local-first**; brak cloud DATA_KEY w P0 |
| **D-P0-G** | PLN only w P0 |
| **D-P0-H** | `provider` enum ops ≠ `MARKET_ORIGIN_IDS` do P1 |
| **D-P0-I** | Zero wywołań `commitMarketQuotesImport` w P0 |

---

## 17. Otwarte decyzje → P1 (nie blokują DF P0)

| ID | Temat | Uwaga |
|----|-------|-------|
| **O-P1-1** | Accept / Reject / Deferred statusy | |
| **O-P1-2** | `linkedWorkIds` + picker WC | |
| **O-P1-3** | Amend `MARKET_ORIGIN_IDS`: `leroy`, `castorama` | |
| **O-P1-4** | Publish rows → preview CSV → **commitMarketQuotesImport** | |
| **O-P1-5** | `enabledOrigins` default OFF | |
| **O-P1-6** | Cloud KV vs local dla multi-device | |
| **O-P1-7** | `publishFactor` / kalibracja cena produktu→robota | |
| **O-P1-8** | Czy `proposed` w P0 staje się Accept 1-click | |
| **O-P1-9** | RegionCode default retail Quotes | |
| **O-P1-10** | Feature flag `kw-market-sync-01` nazwa finalna | |

---

## 18. Allowlist IMPLEMENT (po Arch Review + Owner GO) — szkic

| Dozwolone (orientacyjnie) | Zakazane |
|---------------------------|----------|
| `src/lib/market-sync/**` (nowy) | `cloud-sync.ts` |
| Panel UI Super Admin / Biblioteka (mount) | `tender-offer-boq-mapping.ts` / AI-COST |
| Testy `scripts/test-market-sync-01-p0*.mjs` | `commit-market-quotes.ts` wywołania |
| Fixture `.tmp` / `fixtures/market-sync-01/` | Zmiany CM-04 / Payroll |

Dokładna allowlist = Arch Review.

---

## 19. NEXT

```text
DF P0 FROZEN (ten dokument)
  → ARCHITECTURE REVIEW
  → Owner GO IMPLEMENT P0
  → IMPLEMENT P0
  → (P1 DF dopiero po P0 CLOSE — osobny Owner GO)
```

**Zakaz:** IMPLEMENT · P1 DF · publish — bez kolejnych GO.

> **STATUS 2026-07-30:** Architecture Review P0 **COMPLETE** · **READY FOR OWNER GO** · [`MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW.md`](MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW.md) · karta [`…-COMPLETE.md`](MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW-COMPLETE.md) · IMPLEMENT **BLOCKED** do Owner GO.
