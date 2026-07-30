# MARKET-SYNC-01 — PLAN

> **ID:** MARKET-SYNC-01-PLAN  
> **EPIC:** MARKET-SYNC-01 (nowy · **nie** część CENY-MATERIAŁÓW-04)  
> **STATUS:** PLAN ONLY · DOCS ONLY · **bez IMPLEMENT / DF / commit / push / OPS / zmian kodu**  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE** (oczekiwane przy IMPLEMENT)  
> **Wejście:** AUDIT **zaakceptowany** · Owner GO PLAN · [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md)  
> **Baseline tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) (bez bumpa w PLAN)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (MARKET-SYNC-01):
  Ręczna, rzadka (2–3 mies.) synchronizacja cen produktów
  DIY (Leroy Merlin · Castorama → później OBI/…) przez
  MarketProduct + ProviderQuote → Preview → Accept →
  commitMarketQuotesImport → Product Quotes → controlled_market
  — BEZ AI-COST / Cloud CORE / Bid / drugiego toru Quotes.
════════════════════════════════════════════════════════
```

---

## 0. Wejście z AUDIT (FROZEN)

| Decyzja AUDIT | Status w PLAN |
|---------------|---------------|
| WC = SSOT robót | **FROZEN** |
| Product Quotes = jedyne ceny produkcyjne rynku w wycenie | **FROZEN** |
| `commitMarketQuotesImport` = **jedyny** publish Quotes | **FROZEN** |
| Warstwa **MarketProduct** + **ProviderQuote** | **FROZEN** |
| Historia cen = **osobny** komponent | **FROZEN** (slice P2) |
| Import **ręczny** Admin · brak cron · brak auto-publish | **FROZEN** |
| Preview + akceptacja obowiązkowe | **FROZEN** |
| P0 bez scrapera (Legal Gate) | **FROZEN** |
| Werdykt AUDIT | **CONDITIONAL GO → PLAN** → ten dokument |

**OUT (odziedziczone):** AI-COST · Cloud Sync CORE · Bid Calculator · Payroll · Scoring · klasyfikator · parser kosztorysów · CENY-MATERIAŁÓW-04 P0–P3 · drugi tor zapisu Quotes.

---

## 1. Zasady inżynieryjne (weryfikacja PLAN)

| Zasada | Jak PLAN spełnia |
|--------|------------------|
| **SSOT FIRST** | Robota → WC; oferta sklepu → MarketProduct/ProviderQuote; cena w wycenie → wyłącznie `marketQuotes` po commit |
| **REUSE FIRST** | `previewMarketCsvImport` · `commitMarketQuotesImport` · merge apply · average engine · controlled_market · wzorzec P3.3 Preview UX |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiego zapisu `marketQuotes`; zakaz drugiego silnika średniej; zakaz podmiany `companyPricePln` z rynku |
| **FEATURE-DATA ONLY** | Nowy moduł ops + dane; **0** zmian AI-COST / Bid / scoring / Cloud CORE |
| **DATA FIRST, NOT AI** | Match regułowy (EAN/SKU/aliases); brak LLM w torze sync |

---

## 2. Docelowa architektura modułu

```text
┌─ MARKET-SYNC-01 (FEATURE) ─────────────────────────────┐
│  Admin (ręczny start)                                   │
│  Import → Normalize → Match → Preview → Accept          │
│                                                         │
│  Store (FEATURE):                                       │
│    MarketProduct[]                                      │
│    ProviderQuote[]                                      │
│    PriceHistory[]          ← P2; nie wchodzi w Quotes   │
│    SyncRun / PreviewSession (ops meta)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ publish (tylko accepted + linkedWork)
                       ▼
┌─ REUSE P3.2 / P3.3 ─────────────────────────────────────┐
│  build publish rows (workId, origin, region, price, …)  │
│  → previewMarketCsvImport (weryfikacja)                 │
│  → commitMarketQuotesImport                             │
│  → CatalogWork.marketQuotes[origin][region]             │
│     origin ∈ { leroy, castorama, … }                    │
└──────────────────────┬──────────────────────────────────┘
                       │ read-only
                       ▼
┌─ AS-IS (OUT zmian) ─────────────────────────────────────┐
│  computeMarketAverageForWork → controlled_market        │
│  OfferBoq · AI-COST · Bid — BEZ ZMIAN                   │
└─────────────────────────────────────────────────────────┘
```

### 2.1 Granice odpowiedzialności

| Warstwa | Odpowiada za | Nie odpowiada za |
|---------|--------------|------------------|
| MARKET-SYNC | ingest sklepu, tożsamość produktu, Preview, mapa produkt→robota, build rows | wycenę oferty, merge cloud-sync, parser ATH |
| WC / Quotes | trwała cena rynku **na robocie** po commit | katalog SKU DIY |
| OfferBoq | odczyt średniej / controlled_market | skąd przyszła cena sklepowa |

### 2.2 Persystencja (PLAN — decyzja DF zamrozi szczegóły)

| Opcja | Opis | Rekomendacja PLAN |
|-------|------|-------------------|
| **A** | Staging **local-first** + eksport/import JSON ops; publish tylko do istniejącego `kw-wgdom-work-catalog` | **P0 preferowana** — zero nowych DATA_KEYS / Cloud CORE |
| **B** | Nowy klucz KV (np. `kw-market-sync`) + sync jak WC | **Dopiero po Gate** w DF (jeśli multi-device Admin wymagany) |

**PLAN binding:** P0 **nie** wymaga nowego Cloud CORE. Decyzja A vs B = **otwarta w DF** (nie blokuje PLAN COMPLETE).

### 2.3 Feature flag

| Flaga (szkic) | Default | Rola |
|---------------|---------|------|
| `kw-market-sync-01` (nazwa DF) | **OFF** | Ukrywa UI sync; publish retail origins nie wpływa gdy OFF |
| Retail w `enabledOrigins` średniej | **OFF** do Owner GO | Chroni Bid przed przypadkowym drift |

---

## 3. Model danych

### 3.1 MarketProduct (referencja WGDOM)

| Pole | Wymagane | Opis |
|------|----------|------|
| `id` | tak | `mp-{uuid}` stabilny |
| `canonicalNamePl` | tak | Nazwa kanoniczna |
| `unit` | tak | Kanoniczna jm (po normalizacji) |
| `ean` | nie | GTIN — preferowany most cross-shop |
| `manufacturer` | nie | Producent |
| `variantKey` | nie | Grubość / kolor / opakowanie |
| `aliases[]` | nie | Nazwy z LM/Casto/historyczne |
| `linkedWorkIds[]` | nie | `CatalogWork.id` — **tylko po mapowaniu Admin** |
| `active` | tak | Soft-disable |
| `updatedAt` | tak | ISO |
| `createdAt` | tak | ISO |

**Semantyka:** produkt referencyjny ≠ robota. Bez `linkedWorkIds` **nie** wolno publish do Quotes.

### 3.2 ProviderQuote (oferta sklepu)

| Pole | Wymagane | Opis |
|------|----------|------|
| `id` | tak | `pq-{uuid}` |
| `providerId` | tak | `leroy` \| `castorama` \| `obi` \| … (extensible) |
| `providerSku` | tak | SKU w sklepie |
| `ean` | nie | Z feedu |
| `rawName` | tak | Nazwa AS-IS |
| `pricePln` | tak | > 0 |
| `unitRaw` | tak | Jm surowa |
| `unitNorm` | nie | Po normalizacji |
| `marketProductId` | nie | null = unmatched |
| `fetchedAt` | tak | Czas importu |
| `sourceKind` | tak | `csv_export` \| `licensed_api` \| `manual` \| `scraper` (P3 only) |
| `confidence` | tak | 0..1 (match) |
| `status` | tak | `draft` \| `in_preview` \| `accepted` \| `rejected` \| `deferred` |
| `regionCode` | nie | Domyślnie `polska` lub `wroclaw` (DF) |
| `sourceUrl` | nie | Opc. audyt |
| `syncRunId` | tak | Idempotencja runu |

### 3.3 PriceHistory (scope P2)

| Pole | Opis |
|------|------|
| `id` | wpis |
| `marketProductId` | lub `providerId+sku` gdy brak MP |
| `providerId` | |
| `pricePln` | |
| `at` | ISO (= fetchedAt zaakceptowanego) |
| `sourceKind` | |
| `syncRunId` | |

**Zasady:**

- Append-only · **cap** (np. 24 punkty / produkt×provider) — DF zamrozi.  
- **Nie** jest wejściem do `computeMarketAverageForWork`.  
- Write historii przy **Accept** (nie przy samym Import), żeby nie zaśmiecać draftami.

### 3.4 SyncRun / PreviewSession (ops meta)

| Pole | Opis |
|------|------|
| `id` | run |
| `providerId` | |
| `startedAt` / `finishedAt` | |
| `actorAdminId` | |
| `stats` | imported · matched · unmatched · changed · accepted · published |
| `publishFingerprint` | opc. po commit |

---

## 4. Relacje z WC · Product Quotes · controlled_market

```text
MarketProduct ──linkedWorkIds──► CatalogWork (1 product → 0..N works; typowo 0..1 w P1)
ProviderQuote ──marketProductId──► MarketProduct
Accept + linkedWork ──build rows──► preview/commit ──► marketQuotes[origin][region]
marketQuotes ──computeMarketAverageForWork──► controlled_market (AS-IS)
```

| Relacja | Reguła PLAN |
|---------|-------------|
| Product → Work | **N:1 preferowane w P1** (jeden produkt → jedna robota); N:M = backlog DF jeśli potrzebne |
| Quote → Product | Match auto lub ręczny w Preview |
| Quote → Quotes WC | **Tylko** przez commit; cena na **robocie**, nie na SKU |
| controlled_market | **Read-only** konsument; zero zmian providera |

**Mapowanie ceny produktu → ceny roboty (P1):**

- Admin ustala `linkedWorkIds` + ewentualny **współczynnik** (opc. DF: `publishFactor` default 1.0).  
- P1 default: **1:1** `pricePln` produktu → snapshot Quotes (Owner akceptuje uproszczenie; kalibracja = późniejszy IMPROVEMENT).  
- Zakaz auto-wyliczania z AI.

---

## 5. Workflow szczegółowy

```text
[1] IMPORT (Admin, ręczny)
      plik CSV/XLSX eksportu sklepu  |  manual paste  |  (P3: API/scraper)
      → SyncRun(status=running)
        ↓
[2] NORMALIZACJA
      · trim / fold PL
      · unitRaw → unitNorm (mapa DF)
      · price → PLN number
      · EAN digits-only validate
      · reject: brak ceny / jm / nazwy
        ↓
[3] MATCH → MarketProduct
      priorytet §6
      → ProviderQuote.status = draft|in_preview
      → confidence
        ↓
[4] PREVIEW (§8)
      buckety: new · changed · unchanged · unmatched · unit_conflict · rejected
      ΔPLN / Δ% vs ostatni accepted
        ↓
[5] AKCEPTACJA Admin
      accept / reject / defer per wiersz lub bulk filtr
      → status=accepted|rejected|deferred
      → (P2) append PriceHistory dla accepted
        ↓
[6] PUBLISH GUARD
      require: accepted ∧ linkedWorkIds.length≥1 ∧ unitNorm OK
      build rows: workId, origin=providerId, region, price, updatedAt, confidence
        ↓
[7] REUSE TOR QUOTES
      previewMarketCsvImport(rows)  → musi matched/low_confidence wg reguł
      Admin potwierdza publish
      commitMarketQuotesImport(preview)
        ↓
[8] VERIFY
      Quotes cells origin×region obecne · fingerprint SyncRun
      (opc.) coverage panel REUSE
```

**Zakaz:** krok 7 omijający preview/commit; auto-przejście 5→7 bez kliknięcia Admin.

---

## 6. Zasady identyfikacji (match)

| Priorytet | Klucz | Wynik | Auto-accept? |
|-----------|-------|-------|--------------|
| **1** | EAN (= GTIN) → istniejący MarketProduct.ean | high confidence | **Nie** (nadal Preview); auto-**link** produktu OK |
| **2** | `providerId` + `providerSku` → znany ProviderQuote historyczny → ten sam MP | high | Nie publish auto |
| **3** | EAN most: nowy SKU z EAN = istniejący MP innej sieci | high cross-shop | Link MP; Preview |
| **4** | manufacturer + canonical/alias + unitNorm | medium | Tylko Preview |
| **5** | fuzzy `rawName` vs aliases/canonical (próg DF) | low | **Nigdy** auto-link; unmatched lub low |
| **6** | wariant (`variantKey`) | obowiązkowy wymiar | Konflikt wariantu = osobny MP |

**Aliasy:** przy ręcznym linku Admin dodaje `rawName` do `aliases[]`.  
**Most EAN:** dwa SKU (LM + Casto) z tym samym EAN → **jeden** MarketProduct.

---

## 7. Strategia wykrywania zmian cen

| Stan Preview | Warunek |
|--------------|---------|
| `new` | Brak poprzedniego accepted dla provider+SKU/EAN |
| `unchanged` | \|Δprice\| ≤ ε (np. 0.01 PLN) |
| `changed` | \|Δ\| > ε; pokaż ΔPLN i Δ% |
| `unit_conflict` | unitNorm ≠ MP.unit i brak mapy |
| `missing_from_feed` | Było accepted wcześniej, brak w tym SyncRun (soft warn; nie kasuj Quotes auto) |

**Publish default:** tylko `new` + `changed` z Accept.  
**Re-publish unchanged:** opc. bulk „force” — DF.

Alert UI (P2): \|Δ%\| ≥ próg konfiguracyjny (np. 10%) — wyróżnienie, nie blokada.

---

## 8. Produkty nierozpoznane (unmatched)

| Ścieżka | Opis |
|---------|------|
| **A — Create MP** | Admin tworzy MarketProduct z rawName/EAN/unit → link Quote |
| **B — Link existing** | Wyszukaj MP · przypisz |
| **C — Defer** | Zostaje unmatched; nie publish |
| **D — Reject** | Śmieć / poza whitelist kategorii |
| **E — Link Work later** | MP bez `linkedWorkIds` — sync katalogu produktów OK, **Quotes nie** |

**KPI ops:** % unmatched po runie; trend w dół po 2–3 syncach.

---

## 9. Zakres Preview (UI)

### 9.1 Musi pokazywać (P0+)

| Element | P0 | P1 |
|---------|----|----|
| Lista wierszy feedu z statusem match | ✓ | ✓ |
| Buckety new/changed/unchanged/unmatched/conflict | ✓ | ✓ |
| rawName · SKU · EAN · cena · jm | ✓ | ✓ |
| Proponowany / powiązany MarketProduct | ✓ | ✓ |
| Akcje: accept / reject / defer / create MP / link MP | częściowo | ✓ |
| linkedWorkIds + picker CatalogWork | — | ✓ |
| Δ ceny vs poprzedni accepted | — | ✓ |
| Guard „Publish” disabled bez Accept+Work | — | ✓ |
| Wynik `previewMarketCsvImport` przed commit | — | ✓ |
| Historia (timeline) | — | P2 |

### 9.2 Nie w Preview

- Edycja AI-COST / Bid  
- Zmiana `companyPricePln`  
- Auto-cron controls  
- Scraper credentials (P3)

---

## 10. Rollback

| Poziom | Mechanizm | Zakres |
|--------|-----------|--------|
| **Quotes (publish)** | Istniejący `captureMarketQuotesSnapshot` / local restore P3.2 | **REUSE** — tylko local; cloud rollback = OUT P3.3 |
| **Accept (pre-publish)** | Cofnij status Quote → deferred/rejected; bez commit | P1 |
| **PriceHistory** | Nie usuwać (append-only); ewentualny soft tombstone | P2 |
| **MarketProduct** | Soft `active=false`; nie kasować ID | P0+ |

**Zasada:** rollback publish ≠ kasowanie historii cen.

---

## 11. KPI

### 11.1 Hard (per slice CLOSE)

| ID | KPI | P0 | P1 | P2 |
|----|-----|----|----|-----|
| **K-MS-0** | Model + Preview RO działa na fixture CSV (bez publish) | **PASS** | — | — |
| **K-MS-1** | Publish **wyłącznie** przez `commitMarketQuotesImport` (test/assert) | — | **PASS** | — |
| **K-MS-2** | ≥1 Quote `leroy` + ≥1 `castorama` w WC po Accept (flaga ON) | — | **PASS** | — |
| **K-MS-3** | False publish (Quote→zła robota) = **0** na sample Owner | — | **PASS** | — |
| **K-MS-4** | PriceHistory append po Accept; średnia rynku **nie** czyta historii | — | — | **PASS** |
| **K-MS-5** | Regresja: AI-COST / Bid / Cloud CORE / CM-04 P1–P2 intact | **PASS** | **PASS** | **PASS** |

### 11.2 Soft (ops)

| Metryka | Cel orientacyjny |
|---------|------------------|
| Match rate (EAN/SKU) | ↑ z każdym sync |
| Unmatched % | ↓ |
| Czas Admin Preview | ≤ 1 sesja na sync 2–3 mies. |
| Δ% outlier | widoczne w UI |

---

## 12. Ryzyka (PLAN)

| ID | Ryzyko | Sev | Mitygacja PLAN/DF |
|----|--------|-----|-------------------|
| R1 | Produkt≠robota → złe Quotes | P0 | Brak publish bez `linkedWorkIds`; origins retail OFF w średniej |
| R2 | Drugi tor Quotes | P0 | AC + test: tylko commit |
| R3 | Scraper w P0 | P0 | Slice P3 + Legal GO |
| R4 | Nowy DATA_KEY bez Gate | P1 | P0 local-first (opcja A) |
| R5 | False fuzzy match | P1 | Fuzzy → unmatched/low; EAN-first |
| R6 | Drift Bid | P1 | Flag OFF; enabledOrigins |
| R7 | Kolizja z CM-04 P3 INNE | P1 | Osobny EPIC; OUT wzajemne |
| R8 | VAT / opakowanie / jm | P1 | unit_conflict bucket |
| R9 | 1:1 cena produktu→robota zbyt naiwna | P2 | `publishFactor` IMPROVEMENT |
| R10 | Brak cloud rollback Quotes | P2 | Komunikat Admin; snapshot local REUSE |

---

## 13. Acceptance Criteria (EPIC + slice)

### 13.1 AC — cały EPIC (Definition of Done wysokopoziomowy)

| AC | Treść |
|----|-------|
| AC-1 | Istnieje warstwa MarketProduct + ProviderQuote oddzielona od CatalogWork |
| AC-2 | Każdy publish Quotes idzie przez `commitMarketQuotesImport` |
| AC-3 | Brak auto-publish i brak schedulera |
| AC-4 | Preview + Accept przed produkcją |
| AC-5 | Leroy + Castorama (P1) z oznaczonym `origin` |
| AC-6 | Historia cen (P2) nie wpływa na average engine |
| AC-7 | Zero zmian AI-COST / Cloud CORE / Bid / scoring / CM-04 |
| AC-8 | Feature flag default OFF |
| AC-9 | API/scraper tylko P3 + Legal/Owner GO |

### 13.2 AC — P0 (Model + Preview)

| AC | Treść |
|----|-------|
| AC-P0-1 | Typy/model + persist lokalny (lub uzgodniony store) MarketProduct/ProviderQuote |
| AC-P0-2 | Import CSV fixture → Normalize → Match → Preview buckets |
| AC-P0-3 | UI Preview (Super Admin) — bez commit Quotes |
| AC-P0-4 | Testy pure: match EAN/SKU · reject bez ceny |
| AC-P0-5 | OUT: scraper · publish · nowe origins w enabledOrigins |

### 13.3 AC — P1 (Publish + LM + Casto)

| AC | Treść |
|----|-------|
| AC-P1-1 | Origins `leroy` · `castorama` + adaptery / build rows |
| AC-P1-2 | Mapowanie MP → CatalogWork w Preview |
| AC-P1-3 | Accept → previewMarketCsvImport → commitMarketQuotesImport |
| AC-P1-4 | K-MS-1…3 + K-MS-5 PASS |
| AC-P1-5 | Flaga OFF ⇒ brak wpływu na controlled_market sample |

### 13.4 AC — P2 (Historia + szablon providerów)

| AC | Treść |
|----|-------|
| AC-P2-1 | PriceHistory append przy Accept · cap |
| AC-P2-2 | UI timeline / Δ% alert |
| AC-P2-3 | Szablon `providerId` (obi/bricoman/psb) — bez pełnego sync produkcyjnego |
| AC-P2-4 | K-MS-4 PASS |

### 13.5 AC — P3 (Integracje auto)

| AC | Treść |
|----|-------|
| AC-P3-1 | Osobny Legal GO + Owner GO |
| AC-P3-2 | `sourceKind=licensed_api|scraper` za flagą |
| AC-P3-3 | Nadal Preview + Accept + commit (zero auto-publish) |

---

## 14. Podział EPIC na slice’y

| Slice | Nazwa | IN | OUT | Wejście DF |
|-------|-------|----|-----|------------|
| **P0** | Model + Preview | Model MP/PQ · SyncRun · Import CSV · Normalize · Match · Preview UI · testy | Publish · LM/Casto origins w WC · historia · scraper · Cloud KEY | Thin DF P0 |
| **P1** | Publish + Leroy + Castorama | Origins · linkedWork · Accept · commit path · Δ ceny · OV | Historia ring · OBI full · scraper · Cloud CORE | DF P1 amend origins |
| **P2** | Historia + szablon providerów | PriceHistory · alerty · template OBI/Bricoman/PSB | Live OBI sync · scraper | DF P2 |
| **P3** | API / scraper | Po **Legal + Owner GO** · nadal Preview/Accept/commit | Daily cron · auto-publish | DF P3 + legal pack |

**Kolejność sztywna:** P0 → P1 → P2 → (P3 opc.).  
**Nie** łączyć P0+P1 w jednym IMPLEMENT bez Owner GO.

---

## 15. Origins retail (P1) — kontrakt

| `origin` | Label PL (szkic) | W `MARKET_ORIGIN_IDS` | W `enabledOrigins` default |
|----------|------------------|----------------------|----------------------------|
| `leroy` | Leroy Merlin | **TAK** (amend P1) | **NIE** (do GO) |
| `castorama` | Castorama | **TAK** | **NIE** |
| `obi` / … | szablon P2 | opc. | **NIE** |

Snapshot nadal: `price` · `regionCode` · `coverage` · `updatedAt` · `confidence` · `origin`.

---

## 16. Test / weryfikacja (bez IMPLEMENT teraz)

| Faza | Artefakt |
|------|----------|
| P0 | Fixture CSV LM/Casto-like · unit tests match |
| P1 | Ops script preview→commit na sandbox workIds · OV false=0 |
| P2 | Test cap historii · assert average nie czyta history |
| Regresja | Sample 18 spraw CM intact (K-MS-5) |

---

## 17. Otwarte decyzje dla DESIGN FREEZE (nie blokują PLAN)

| # | Decyzja | Opcje |
|---|---------|--------|
| D1 | Persist P0: local-only vs `kw-market-sync` | A / B (§2.2) |
| D2 | Default `regionCode` retail | `polska` vs `wroclaw` |
| D3 | `publishFactor` w P1 | brak (1.0) vs pole opc. |
| D4 | N:M product→works | tylko 1 work w P1 vs lista |
| D5 | Próg fuzzy / Δ% alert | liczby w DF |
| D6 | Nazwa flagi KV | DF |

---

## 18. OUT (twarde — cały EPIC)

| OUT |
|-----|
| AI-COST · pricing-engine · explain · 02-B |
| Cloud Sync CORE · nowe merge · fence |
| Bid Calculator · GAP-B · softcode kwot |
| Scoring / ATH classifier / parser kosztorysów |
| CENY-MATERIAŁÓW-04 P0–P3 (w tym INNE seed) |
| Drugi tor zapisu `marketQuotes` |
| Nadpisanie `companyPricePln` z rynku |
| Cron / daily scrape / auto-publish |
| Scraper w P0–P2 |
| Payroll |

---

## 19. NEXT

```text
PLAN COMPLETE (ten dokument + PLAN-COMPLETE card)
  → DESIGN FREEZE (Owner GO) — najpierw Thin DF P0
  → ARCHITECTURE REVIEW
  → OWNER GO IMPLEMENT
  → P0 IMPLEMENT → …
```

**Zakaz:** start DF / IMPLEMENT bez Owner GO.  
**Zakaz:** mieszać z CM-04 P3.

---

## 20. Checklist „PLAN gotowy do DF”

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | Architektura + granice SSOT | **PASS** |
| 2 | Model MP / PQ / History | **PASS** |
| 3 | Relacje WC / Quotes / CM | **PASS** |
| 4 | Workflow 8 kroków | **PASS** |
| 5 | Identyfikacja + unmatched | **PASS** |
| 6 | Δ ceny + Preview + Rollback | **PASS** |
| 7 | KPI + AC + slice P0–P3 | **PASS** |
| 8 | Ryzyka + OUT | **PASS** |
| 9 | SSOT/REUSE/ZERO DUP/FEATURE-DATA/DATA FIRST | **PASS** |
| 10 | Jedyny publish = commitMarketQuotesImport | **PASS** |

**Decyzja PLAN:** **READY FOR DESIGN FREEZE**

> **STATUS 2026-07-30:** PLAN **zaakceptowany** · DF P0 **FROZEN** · [`MARKET-SYNC-01-P0-DESIGN-FREEZE.md`](MARKET-SYNC-01-P0-DESIGN-FREEZE.md) · karta [`…-COMPLETE.md`](MARKET-SYNC-01-P0-DESIGN-FREEZE-COMPLETE.md) · NEXT = **ARCHITECTURE REVIEW** (nie IMPLEMENT).
