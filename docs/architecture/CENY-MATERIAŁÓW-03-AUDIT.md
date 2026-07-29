# CENY-MATERIAŁÓW-03 — AUDIT COMPLETE

> **ID:** CENY-MATERIAŁÓW-03-AUDIT  
> **TRYB:** AUDIT ONLY · DOCS ONLY  
> **Data:** 2026-07-29  
> **BEZ:** implementacji · commit · push  
> **Wejście:** [`CENY-MATERIAŁÓW-02-VALIDATION-COMPLETE.md`](CENY-MATERIAŁÓW-02-VALIDATION-COMPLETE.md) · tip **2.65.80**  
> **Evidence:** `.tmp/ceny-materialow-03-audit.json` · `.tmp/ceny-materialow-02-validation.json`  
> **Źródło READ-ONLY:** Cloud KV `kw-wgdom-work-catalog` · `kw-tenders-pipeline`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-03 AUDIT COMPLETE
Decyzja: READY FOR PLAN
════════════════════════════════════════════════════════
```

---

## 0. Kontekst (CM-01 / CM-02)

| Fakt | Wartość |
|------|---------|
| CM-01 | **CLOSED** · flaga `kw-ceny-materialow-01` default OFF |
| CM-02 (18/18) | `controlled_market` **0%** · WC **+1.48 pp** · HE **−1.48 pp** · **0 regresji** |
| Blokada | Quotes = **0** na matched works we wszystkich 18 sprawach |

---

## 1. Dlaczego Quotes = 0% — RCA

### 1.1 Werdykt przyczyny

| Hipoteza | Wynik | Dowód |
|----------|-------|-------|
| **Brak rekordów `marketQuotes`** | **POTWIERDZONE — ROOT CAUSE** | **34/34** aktywnych robót w `kw-wgdom-work-catalog`: **zero** snapshotów z `price > 0` (ani product, ani `legacy_seed`) |
| Brak powiązań OfferBoq ↔ workId | **NIE primary** | CM-02: matched works istnieją (`withoutQuotes` 7–22 / sprawę) — powiązanie jest, **brak ceny** |
| Brak importu CSV (P3.3) | **POTWIERDZONE (przyczyna operacyjna)** | Flaga `kw-wc-p33-market-pricing-ux` default **OFF** · brak śladu product Quotes w chmurze |
| Brak aktywacji flagi CM-01 | **NIE** | CM-02 ON: WC rośnie, CM nadal 0 — flaga CM-01 nie tworzy Quotes |
| Inna (engine / region) | **Wtórna** | `computeMarketAverageForWork` → **priceNull na 34/34** przy pustym store; region nie ma czego resolvować |

**Dokładna przyczyna:** w SSOT katalogu (`kw-wgdom-work-catalog`) **nie ma żadnych rekordów cen rynkowych**. Tor `controlled_market` wymaga `computeMarketAverageForWork` → `pricePln > 0`; przy pustych Quotes zawsze zwraca null → provider nie trafia. To **brak danych**, nie bug mapowania CM-01.

### 1.2 Co katalog zawiera zamiast Quotes

| Pole | Stan prod (KV) |
|------|----------------|
| Aktywne roboty | **34** |
| Prefiks `legacy-*` | **100%** |
| Trade coverage | ELEKTRYKA, SCIANY_GK, LAZIENKA, HYDRAULIKA, OGRZEWANIE, MALOWANIE, PODLOGI, PRZYGOTOWANIE, ROZBIORKI, DRZWI, TRANSPORT, POZOSTALE, WENTYLACJA, MONTAZ |
| `marketQuotes` product | **0** |
| `marketQuotes.legacy_seed` | **0** |
| `companyPricePln` | obecne (tor `work_catalog` działa) |

---

## 2. Lifecycle Quotes (AS-IS)

```text
[CSV / źródło rynku]
        │
        ▼
 market-csv-preview (P3.2) ──podgląd──▶ UI Biblioteka (P3.3 S4, flaga OFF)
        │
        ▼
 applyMarketQuotesFromPreview  →  mutacja store.works[].marketQuotes
        │
        ▼
 commitMarketQuotesImport (P3.3)
   load → snapshot → apply → saveWorkCatalogRouted → persist cloud
        │
        ▼
 SSOT: kw-wgdom-work-catalog  (Cloud + LS)
        │
        ├─▶ computeMarketAverageForWork  (odczyt)
        │         │
        │         ▼
        │   createControlledMarketPriceProvider  → origin controlled_market
        │
        ├─▶ Work Catalog Market Comparison / Coverage (P3.3 S5)
        │
        └─▶ (OUT Phase 2) NIE: Bid Calculator · Kp · marża · scrapery
```

| Etap | Gdzie | Kto używa |
|------|-------|-----------|
| **Powstanie** | Import CSV → `apply` + `commitMarketQuotesImport` | Ops / użytkownik Biblioteki (wymaga P3.3 ON) |
| **Zapis** | `kw-wgdom-work-catalog` via catalog write router + cloud persist | Work Catalog sync |
| **Odczyt** | `computeMarketAverageForWork(work, region…)` | Silnik średniej rynku |
| **Użycie wyceny** | `controlled_market` w łańcuchu OfferBoq (po `company_knowledge`) | AI-COST OfferBoq |
| **Migracja legacy** | v3→v4: `marketAvgPln` → `legacy_seed` | **Nie zasiliła** prod (brak seed Quotes) |

**Wniosek lifecycle:** pipeline techniczny **istnieje i jest CLOSED (P3.3)**; na produkcji **nie został zasilony**.

---

## 3. Pokrycie Work Catalog vs 18 przetargów

### 3.1 Stan katalogu

| Metryka | Wartość |
|---------|---------|
| Roboty aktywne | **34** (wszystkie `legacy-*`) |
| Grupy trade obecne | 14 tradeId (lista §1.2) |
| Grupy **nieobecne / krytycznie cienkie** vs próba | **Elewacje/ocieplenia**, **chodniki/nawierzchnie**, **ogrodzenia**, bogatsze **rozbiórki**, teletechnika |

### 3.2 Luka mappingu (ON, 18 spraw)

| Metryka | Wartość |
|---------|---------|
| Linie **bez** `catalogWorkId` | **574** |
| Szac. direct PLN linii unmatched | **~2,67 M PLN** |
| Komponenty materiałowe `heuristic_estimate` | 28 / ~9 k PLN (reszta HE w CM-02 to udział % w materiałach już zmapowanych lub inne kategorie — dominantą biznesową jest **unmatched line PLN**) |

### 3.3 Gdzie pada heuristic / unmatched (próbki CM-02)

| Przyczyna | Objaw |
|-----------|--------|
| Brak pozycji WC | ogrodzenia, chodniki, docieplenia — brak workId |
| Brak Quotes | matched `legacy-*` → WC/`companyPrice`, **nigdy** controlled_market |
| Inny (parser) | XLS formularz oferty (08deb669) — śmieciowe linie |

---

## 4. Ranking brakujących kategorii (18 przetargów)

**Metoda:** linie OfferBoq ON **bez** `catalogWorkId`, agregacja PLN `lineDirect` · bucket reguł tekstowych.  
**Evidence:** `.tmp/ceny-materialow-03-audit.json`.

| # | Kategoria (gap) | Linie | PLN (unmatched) | # przetargów | Wpływ biznesowy | Akcja Phase 2 |
|---|-----------------|------:|----------------:|-------------:|-----------------|---------------|
| 1 | **INNE / niesklasyfikowane** | 436 | **~1,72 M** | 16 | Duży koszyk mieszany + szum parsera — wymaga triażu, nie ślepego seed | TRIAGE → potem WC |
| 2 | **Chodniki / nawierzchnie / podbudowy** | 30 | **~311 k** | 3 | Wysoki PLN / sprawę (m.in. 08decd0e) | **ADD WORKS + QUOTES** |
| 3 | **Ogrodzenia / siatki / bramy** | 15 | **~258 k** | 5 | 100% HE na 08ded5cb | **ADD WORKS + QUOTES** |
| 4 | **Elewacje / ocieplenia** | 12 | **~234 k** | 4 | Duży upside (CM-02 już pokazał +159 k przy lepszym mapowaniu) | **ADD WORKS + QUOTES** |
| 5 | **Rozbiórki / demontaże** | 38 | **~80 k** | 14 | Częste, umiarkowany PLN | ADD WORKS → Quotes |
| 6 | **Elektryka / teletechnika** | 15 | **~36 k** | 5 | Uzupełnienie ponad legacy-elektryka | ADD WORKS → Quotes |
| 7 | **GK / ścianki / sufity** | 20 | **~16 k** | 8 | Pogłębienie seed | ADD WORKS → Quotes |
| 8 | **Hydraulika / CO** | 4 | **~12 k** | 3 | Pogłębienie seed | ADD WORKS → Quotes |
| 9 | Posadzki / płytki | 2 | ~5 k | 1 | Niski | backlog |
| 10 | Oddymianie / SSP | 2 | ~0,4 k | 1 | Niski w tej próbie (istotne jakościowo) | backlog + keywords |

**Uwaga:** bucket INNE zawyża „nieznane” — część to realne roboty bez keyword match. Phase 2 PLAN powinien rozbić INNE top-N opisów (ops), nie traktować 1,72 M jako jednej roboty.

### 4.1 Szacunek wpływu na końcową wycenę

| Warstwa | Szacunek |
|---------|----------|
| **A. Quotes na istniejących 34** | Odblokuje `controlled_market` dla linii już zmapowanych (CM-02: często 50–80%+ `catalogWorkId`) — **najszybszy dźwignia KPI CM** bez nowych robót |
| **B. Top-3 brakujące grupy (#2–#4)** | ~**800 k PLN** unmatched direct w próbie 18 — potencjał zejścia z HE/category na WC/CM |
| **C. Rozbiórki (#5)** | Częstość (14/18) > PLN — jakość coverage, mniejszy ticket |
| **D. INNE** | Do 1,7 M — dopiero po triażu; inaczej szum |

---

## 5. Plan Phase 2 (wyłącznie pokrycie danych)

### 5.1 Zasady (OUT twarde)

| OUT | Status |
|-----|--------|
| Zmiany heurystyk / providerów / kolejności | **ZAKAZ** |
| GAP-B · Kp · marża · Bid Calculator | **ZAKAZ** |
| Cloud Sync CORE · scrapery · nowe źródła API | **ZAKAZ** |
| Zmiany AI-COST silnika | **ZAKAZ** |
| **IN** | Dane: Works + `marketQuotes` przez **istniejący** P3.3 CSV commit |

### 5.2 Kolejność rekomendowana

| Priorytet | Slice danych | Cel | Narzędzie |
|-----------|--------------|-----|-----------|
| **P0** | Zasilenie **Quotes** dla **istniejących 34** `legacy-*` (region Wrocław/polska) | `controlled_market` > 0 na CM-02bis | P3.3 import CSV ON · commit |
| **P1** | Nowe roboty WC: **Chodniki/nawierzchnie**, **Ogrodzenia**, **Elewacje/ocieplenia** (+ keywords) | ↓ unmatched #2–#4 | Biblioteka Robót + Quotes |
| **P2** | Pogłębienie **Rozbiórki** + elektryka/GK/hydraulika | Coverage częstotliwości | Seed/custom works + Quotes |
| **P3** | Triaż **INNE** (top opisy z 18 spraw) | Odróżnić lukę WC vs śmieci parsera | Ops lista → P1/P2 lub COST-PARSER backlog |

### 5.3 Kryteria sukcesu Phase 2 (propozycja do PLAN)

| KPI | Target roboczy |
|-----|----------------|
| % aktywnych robót z product Quotes | ≥ **80%** z 34 (P0) |
| `controlled_market` share mat. (powtórka 18) | **> 0%** średnio; cel orientacyjny **≥ 10%** po P0 |
| Unmatched PLN w bucketach #2–#4 | spadek vs baseline ~800 k |
| Regresje OFF/ON | **0** (jak CM-02) |

### 5.4 Co NIE wchodzi do Phase 2

- Przepinanie providerów / „wzmocnienie” heuristic  
- GAP-B kalibracja costModel  
- Target 1,6 M / marża / Kp  
- Nowe integracje cenowe poza CSV P3.3  

---

## 6. Rekomendacja kolejności uzupełniania WC

```text
1) Quotes → 34 legacy (P0)     // odblokuj controlled_market TERAZ
2) Works+Quotes: DROGI         // ~311 k unmatched
3) Works+Quotes: OGRODZENIA    // ~258 k
4) Works+Quotes: ELEWACJE      // ~234 k + dowód CM-02 (+159 k)
5) Works: ROZBIORKI depth      // 14/18 spraw
6) Triaż INNE                  // nie seedować na ślepo
```

---

## 7. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR PLAN** |
| **Nie** | NOT RECOMMENDED |
| **Uzasadnienie** | RCA Quotes = **NO_RECORDS** jest jednoznaczna; lifecycle i tor P3.3 istnieją; ranking luk z 18 spraw daje kolejność danych **bez** ruszania AI-COST |

**Następny krok procesu:** Owner GO → **PLAN** CENY-MATERIAŁÓW-04 (lub PHASE-2 DATA) wyłącznie: Quotes fill + top-3 works — DF cienki, allowlista katalog/CSV, zero silnika wyceny.

**Commit / push / implementacja:** **nie wykonano.**
