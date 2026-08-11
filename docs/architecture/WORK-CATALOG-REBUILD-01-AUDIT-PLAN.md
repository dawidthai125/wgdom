# WORK-CATALOG-REBUILD-01 — AUDIT + PLAN

> **STATUS:** **AUDIT COMPLETE** · **PLAN COMPLETE** · **DESIGN FREEZE:** [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · **NO IMPLEMENTATION** · **NO COMMIT** · **NO PUSH** · **PRODUCTION UNCHANGED**  
> **DATA:** 2026-08-11  
> **TRYB:** OWNER GO — AUDIT → PLAN → DF  
> **INPUT:** [`LABOR-PRICING-READINESS-AUDIT-01.md`](./LABOR-PRICING-READINESS-AUDIT-01.md) · [`LABOR-RATE-MEMORY-01-PLAN.md`](./LABOR-RATE-MEMORY-01-PLAN.md) · repo  
> **LEGAL:** [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md)  
> **NEXT:** ARCH REVIEW → OWNER GO IMPLEMENT

---

## 0. Decyzja Ownera (wiążąca dla planu)

Owner **rezygnuje** ze starego założenia wyceny opartego o `companyPricePln` jako podstawowe źródło ceny robót.

Cel **nie** jest „dokleić Labor Rate Memory do mixed”.  
Cel jest:

```text
PRZEBUDOWAĆ model katalogu robót
→ NASZ KATALOG ROBÓT
= pamięć zaakceptowanych stawek za konkretne roboty
(analogicznie do Price Memory materiałów)
```

**Bez** implementacji w tym kroku.

---

## 1. Owner decision — skrót

| Stare | Nowe |
|-------|------|
| Biblioteka + `companyPricePln` mixed jako baza Bid | **Nasz Katalog Robót** = SSOT stawek robót (OUR RATE) |
| Często: przetarg → katalog/heuristic → cena | **cache-first**: Katalog → HIT → REUSE → ZERO HTTP |
| Brak selective research robót | MISS/STALE → selective research → Accept → persist |
| Labor Benchmark info-only | zostaje referencją; **≠** OUR RATE |
| Materiały w Price Memory | **UNCHANGED** — osobna domena |

---

## 2. Obecny model (AUDIT)

### 2.1. Mapa warstw dziś

| Warstwa | Semantyka | Wpływ Bid |
|---------|-----------|-----------|
| `CatalogWork` / Biblioteka | definicja roboty + `companyPricePln` **mixed M+R** | TAK (via adapter) |
| `costSplit` + `laborRbhPerUnit` | rozdział → norma rbh | TAK |
| `fullyLoadedHourly(costModel)` | koszt rbh firmy | TAK |
| `kw-wgdom-cost-catalog-history` | historia **kategorii** | UI / trend |
| Labor Benchmark | rynek min/avg/max | **NIE** |
| Material Price Memory | materiały | **NIE** jako labor |
| Firma hub | Biblioteka · Nasz katalog cen · Ustawienia wyceny | UI |

### 2.2. Problemy (dlaczego rebuild)

1. **`companyPricePln` miesza materiał i robociznę** — nie da się wiarygodnie powiedzieć „stawka roboty”.  
2. **Brak cache-first memory robót** analogicznej do materiałów (HIT → ZERO HTTP).  
3. **Brak selective research + Accept** dla konkretnej roboty.  
4. **Historia per robot+jednostka** — słaba (kategorie, nie work).  
5. **Labor Benchmark ≠ operacyjna stawka** i nie zasila Bid.  
6. Użytkownik nie ma jednego „Nasz Katalog Robót” — ma Bibliotekę (definicja+mixed) i osobno katalog materiałów.

### 2.3. Co działa i trzeba zachować

- Identity: `workId` + `unit` + nazwa + keywords + active  
- Seed struktury (~142 pozycji, YAML bez cen)  
- Sync `kw-wgdom-work-catalog`  
- Bid / Offer / cost model (do osobnej fazy)  
- Material Price Memory (C01–C03)  
- Hub Firma IA  

---

## 3. Nowy model — NASZ KATALOG ROBÓT

### 3.1. Filozofia (REUSE z materiałów, nie kopiuj kodu)

```text
MATERIAŁY:  Nasz katalog cen     → Price Memory (marketQuotes)
ROBOTY:     Nasz Katalog Robót   → Work Rate Memory (nowa semantyka)
```

Wspólne wzorce:

| Wzorzec materiałów | Zastosowanie do robót |
|--------------------|------------------------|
| cache-first | lookup katalogu **przed** HTTP |
| identity | workId + unit (+ region scope) |
| CURRENT / STALE / MISSING | AKTUALNA / PRZETERMINOWANA / BRAK STAWKI |
| selective research | **ONE WORK** · zero full catalogue |
| Accept | Owner Accept **wymagany** przed OUR RATE |
| history ring | cap (kandydat 24) |
| force refresh | ONE WORK nawet CURRENT |
| ZERO HTTP on open | otwarcie katalogu / przetargu bez bulk research |

### 3.2. Główny flow (docelowy)

```text
PRZEDMIAR
  → konkretna robota wymagająca wyceny
  → WORK IDENTITY (workId + unit)
  → LOOKUP Nasz Katalog Robót
       ├─ AKTUALNA  → REUSE → ZERO HTTP
       ├─ PRZETERMINOWANA → selective research → qualify → region → representative
       │                      → OWNER ACCEPT → SAVE (+ historia)
       └─ BRAK STAWKI → j.w. (research)
  → (później Bid) OUR RATE + materiały PM → koszt → marża → oferta
```

### 3.3. Invariant twardy

```text
PRZED każdym zewnętrznym research:
  NAJPIERW lookup Nasz Katalog Robót.
NIGDY: przetarg → KB.pl → katalog, gdy HIT AKTUALNA.
```

---

## 4. SSOT — propozycja

### Decyzja planu (do LOCK)

```text
DEFINICJA ROBOTY  = Biblioteka Robót (CatalogWork) — REUSE identity
STAWKA ROBOTY     = Nasz Katalog Robót (Work Rate Memory) — SSOT OUR RATE
```

**UI użytkownika:** jedna spójna sekcja **Firma → Nasz Katalog Robót** (definicja + stawka + rynek + historia w jednym widoku).  
**Technicznie:** dwie warstwy semantyczne (definicja vs stawka), **nie** dwa konkurujące cenniki.

| Opcja storage | Ocena |
|---------------|-------|
| Additive pola na `CatalogWork` + ring history | **PREFEROWANA** (ZERO nowego KV, REUSE merge WC) |
| Osobny KV tylko stawek | tylko jeśli LOCK Ownera (izolacja merge) |
| Reuse `marketQuotes` | **FORBIDDEN** |
| Drugi Cost Catalog | **FORBIDDEN** |

`companyPricePln`: **LEGACY** podczas przejścia — **UNCHANGED** semantycznie; nie SSOT nowego modelu.

---

## 5. Identity

```text
WORK_RATE_IDENTITY = CatalogWork.id + unit
(+ regionScope w obserwacji rynkowej)
```

- Stawka bez jednostki = **zakaz**.  
- Rozpoznanie z przedmiaru: istniejące keywords / klasyfikacja → mapowanie na `workId` (REUSE; jakość match = osobne ryzyko).  
- Nie inventować drugiej taksonomii `mat.*`.

---

## 6. Cache-first / freshness

### Statusy (lib EN · UI PL)

| Lib (wewnętrznie) | UI |
|-------------------|-----|
| CURRENT | AKTUALNA |
| STALE | PRZETERMINOWANA |
| MISSING | BRAK STAWKI |

### TTL — propozycja

| Kandydat | Uzasadnienie |
|----------|--------------|
| **90 dni** | REUSE istniejącego `WORK_FRESHNESS_STALE_AFTER_DAYS` dla cen firmy; robocizna zmienia się wolniej niż SKU marketu, ale 90d jest już kontraktem produktu WC |
| Alternatywa 180 dni | tylko po LOCK Ownera (mniej researchu, większe ryzyko STALE w ofercie) |

**Rekomendacja planu:** start **90 dni** (spójność z Biblioteką); Owner może zmienić w Design Freeze.

### Zachowanie

| Status | Research auto (gdy Legal PASS) | OUR RATE widoczna |
|--------|--------------------------------|-------------------|
| AKTUALNA | NIE (chyba force ONE WORK) | TAK → REUSE |
| PRZETERMINOWANA | TAK selective | TAK (stara wartość zostaje do Accept) |
| BRAK STAWKI | TAK selective | „—” |

---

## 7. SOURCE RATE vs OUR RATE

| Pojęcie | Semantyka |
|---------|-----------|
| **SOURCE RATE** | wartość z researchu / uśrednienia (np. KB) — kandydat |
| **OUR RATE** | zaakceptowana stawka WGDOM (Owner Accept lub Owner edit) — **SSOT katalogu** |
| **CALCULATED** | `rbh × fullyLoadedHourly` — norma technologiczna / fallback (nie zastępuje OUR RATE bez decyzji) |

Przykład semantyczny (bez inventowanych liczb w kodzie):

```text
SOURCE (KB, Wrocław, representative) → kandydat
Owner Accept / edit → OUR RATE w katalogu
Historia: obie wartości + source + region + timestamp
```

Po Owner edit: `sourceType = OWNER`; kolejny przetarg REUSE OUR RATE.

---

## 8. Selective research

### Zasady

- Tylko **ONE WORK** (+ unit + preferowany region).  
- **ZERO** full catalogue / category crawl / preload tysięcy pozycji.  
- Otwarcie katalogu: **0 HTTP**.  
- Otwarcie przetargu: **0** pełnego research (tylko lookup lokalny; research na żądanie MISS/STALE lub CTA).  

### Region cascade

```text
1. WROCŁAW
2. DOLNY ŚLĄSK
3. POLSKA (fallback)
```

Każda obserwacja musi mieć `regionScope`. Nie mieszać regionów w jednej „średniej” bez oznaczenia.

### Uśrednienie (rekomendacja)

Dla **robót** Owner chce **rynkową wartość reprezentatywną**, nie „najtańszy sklep”.

| Metoda | Ocena dla robót |
|--------|-----------------|
| Min | **NIE** jako OUR/SOURCE default |
| Średnia arytmetyczna | OK przy ≥3 porównywalnych; wrażliwa na outliery |
| **Mediana** | **REKOMENDOWANA** jako representative przy ≥3 |
| 1 obserwacja | zapis jako single; nie udawać multi-average |

**Rekomendacja:** `representative = MEDIANA` kwalifikowanych obserwacji w tym samym `regionScope`; przy 1–2: single / średnia z etykietą „niska próba”.

(Materiały DIY używają average qualifying — **nie kopiować ślepo**; domena robót ≠ SKU.)

---

## 9. Źródła / provider boundary

```text
sourceType:
  OWNER      — ręczna stawka
  MARKET     — zewnętrzny provider (KB.pl candidate)
  CALCULATED — rbh×FL (derived)
  BENCHMARK  — labor-benchmark (referencja / suggest; ≠ SSOT)
```

PRIMARY CANDIDATE: **KB.pl**  
Inne źródła: tylko po osobnym Legal + Design Freeze.

Adapter boundary (jak LIVE-ADAPTERS-08 dla DIY):

```text
WorkRateResearchPort.lookupOne({ workIdentity, unit, regionPreference })
  → raw observations
  → qualify
  → representative
  → candidate (SOURCE RATE)
  → NIE auto-write OUR RATE
```

---

## 10. Legal

Pełna ocena: [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md)

| | |
|--|--|
| LEGAL KB.pl | **REVIEW / UNKNOWN** → live = **BLOCKED** |
| `MARKET_SYNC_P3_LEGAL_GATE` | **DO NOT TOUCH** |
| Osobny gate robót | **wymagany** przed P3 research |

Do PASS: umowa/API/Attestation Owner — nie scraping „na próbę”.

---

## 11. Owner Accept / Owner edit / Manual refresh

| Akcja | Zachowanie |
|-------|------------|
| Accept | SOURCE → OUR RATE · historia · timestamp |
| Edit | OUR RATE = wartość Owner · source=OWNER · historia |
| Aktualizuj (ONE WORK) | force research nawet CURRENT · wynik = kandydat · **wymaga Accept** |
| Odrzut | brak zapisu OUR RATE |

**Nigdy** nie zapisywać niezaakceptowanego researchu jako OUR RATE.

---

## 12. Historia / change

Ring history (wzorzec `marketQuoteHistory`):

- wartość (SOURCE i/lub OUR)  
- sourceType / label  
- regionScope  
- observedAt  
- change vs previous OUR RATE  

UI: `+X zł` / `+Y%` lub „Brak danych porównawczych”.  
Stare wartości **nie znikają** (do cap).

---

## 13. UI — Firma → Nasz Katalog Robót

### IA

```text
Firma
  → Nasz Katalog Robót     ← NOWY spójny widok (P1)
  → Nasz katalog cen       ← materiały (UNCHANGED)
  → Biblioteka Robót       ← może stać się „definicje / admin” lub scalić w widok katalogu (LOCK)
  → Ustawienia wyceny
```

**Preferencja UX:** użytkownik pracuje w **Nasz Katalog Robót**; Biblioteka nie konkuruje jako drugi cennik.

### Kolumny (PL)

| Robota | Jedn. | Nasza stawka | Stawka rynkowa (ost.) | Region | Aktualność | Data | Zmiana | Źródło | Akcja |
|--------|-------|--------------|------------------------|--------|------------|------|--------|--------|-------|

Statusy tylko PL. Zero CURRENT/STALE/MISSING/UNKNOWN w UI.

---

## 14. `companyPricePln` — migracja (bezpieczna)

### Użycie dziś (AUDIT — miejsca)

- UI Biblioteki / completeness / freshness mixed  
- Adapter → Bid catalog / Offer BOQ  
- Historia kategorii (fingerprint)  
- Hosty materiałowe często `0`  

### Zasady przejścia

| Zakaz | |
|-------|--|
| Auto-migracja `companyPricePln` → OUR RATE | **TAK zakaz** (mixed ≠ labor/work rate) |
| Usunięcie pola w P0–P5 | **NIE** |
| Nadpisanie OUR RATE z mixed | **NIE** |

### Ścieżka LEGACY → REPLACE (P6)

1. Oznaczyć `companyPricePln` jako **LEGACY_DISPLAY / LEGACY_BID_INPUT**.  
2. Nowy model zbiera OUR RATE wyłącznie: Owner / Accept research / (opcjonalnie) Accept CALCULATED.  
3. Po pokryciu katalogu OUR RATE + Owner GO: Bid przełącza się na Nasz Katalog Robót (P7).  
4. Dopiero potem: soft-deprecate UI „Cena firmy” mixed.

---

## 15. laborRbhPerUnit / fullyLoadedHourly

| Element | Rola docelowa |
|---------|---------------|
| `laborRbhPerUnit` | **norma technologiczna** (czas) — REUSE |
| `fullyLoadedHourly` | **koszt rbh firmy** — REUSE w cost model |
| CALCULATED = rbh×FL | fallback / propozycja; **nie** automatyczny OUR RATE |
| Bid | **bez zmian** do P7 |

Rebuild **nie wymaga** usuwania norm rbh — to inna oś (czas), nie rynek stawki jednostkowej.

---

## 16. Bid boundary (osobna faza P7)

```text
PRZEDMIAR
  → ROBOT IDENTITY
  → NASZ KATALOG ROBÓT (OUR RATE)
  + Price Memory materiałów
  → KOSZT WŁASNY
  → MARŻA (cost model — bez zmiany minMarginPct w rebuild)
  → CENA OFERTOWA
```

Do P7: Bid nadal na obecnym torze (`companyPricePln` / rbh×FL).

---

## 17. Material Price Memory

**DO NOT TOUCH** — osobna domena, osobny UI, osobne adaptery DIY.

---

## 18. Macierz REUSE / EXTEND / LEGACY / REPLACE / DO NOT TOUCH

| Komponent | Werdykt |
|-----------|---------|
| `CatalogWork` identity / unit / name | **REUSE** |
| `kw-wgdom-work-catalog` store/merge | **EXTEND** (pola stawek) lub **REUSE** + thin map |
| `companyPricePln` | **LEGACY** (transition) → późniejszy **REPLACE** roli w Bid |
| `costSplit` / rbh | **REUSE** (norma) |
| `TenderCompanyCostModel` / FL hourly | **REUSE** · **DO NOT TOUCH** marż |
| Bid calculator | **DO NOT TOUCH** do P7 |
| Labor Benchmark | **REUSE** jako referencja UI |
| `marketQuotes` / PM / Nasz katalog cen | **DO NOT TOUCH** |
| LIVE-ADAPTERS-08 / Legal Gate DIY | **DO NOT TOUCH** |
| `marketQuoteHistory` wzorzec | **REUSE pattern** (nie dane) |
| Firma hub | **EXTEND** sekcja Nasz Katalog Robót |
| KB.pl adapter | **NEW** dopiero po Legal PASS |

---

## 19. Performance (kontrakt)

| Scenariusz | HTTP |
|------------|------|
| Otwarcie Nasz Katalog Robót | **0** |
| Otwarcie przetargu (lookup) | **0** (lokalny HIT/MISS) |
| MISS/STALE research | selective ONE WORK (gdy Legal PASS) |
| Manual refresh | ONE WORK |
| Full catalogue | **FORBIDDEN** |

---

## 20. Test contract (projekt — bez implementacji)

1. WORK identity  
2. UNIT identity  
3. Catalog HIT → REUSE  
4. Catalog MISS  
5. Catalog STALE  
6. CURRENT → ZERO HTTP  
7. MISS → selective research (gdy gate PASS; else blocked)  
8. STALE → selective research  
9. ONE WORK refresh  
10. Owner Accept  
11. Persist OUR RATE  
12. Second tender → REUSE ZERO HTTP  
13. History append  
14. Timestamp  
15. Change / brak previous  
16. Region cascade metadata  
17. Source types  
18. Owner override  
19. No full catalogue  
20. Material PM unchanged  
21. `companyPricePln` unchanged podczas migracji P0–P5  
22. Bid unchanged P0–P6  
23. No duplicate research przy HIT  
24. No second material price DB / no marketQuotes for works  

---

## 21. Ryzyka

| Ryzyko | Mitygacja |
|--------|-----------|
| Legal KB BLOCKED długo | P0–P2 działają na Owner rates bez HTTP |
| Słabe mapowanie przedmiar→workId | osobny quality gate; nie fake HIT |
| Podwójne UI (Biblioteka vs Katalog) | Design Freeze: jeden front „Nasz Katalog Robót” |
| Przypadkowa migracja mixed→OUR | zakaz auto-migrate + testy |
| Regresja Bid | Bid dopiero P7 + harness |
| Mylenie z Labor-Rate-Memory-01 | Ten dokument **superseduje** „tylko additive LRM” decyzją Ownera **rebuild** |

### Relacja do LABOR-RATE-MEMORY-01

`LABOR-RATE-MEMORY-01-PLAN` był planem **cienkej warstwy additive**.  
**WORK-CATALOG-REBUILD-01** jest **superseding Owner decision**: przebudowa modelu katalogu + cache-first + research path.  
Elementy REUSE z LRM-01 (identity, freshness, Owner rate, zakaz marketQuotes) **pozostają**; zakres jest szerszy (research, region, Accept, migracja legacy, UI katalogu).

---

## 22. Plan implementacji (fazy)

### P0 — Model + identity + SSOT

Zakres: kontrakt OUR/SOURCE · identity · storage extend WC · lookup cache-first pure.  
NIE: UI research · Bid · Legal flip · migracja cen.

### P1 — Nasz Katalog Robót UI

Zakres: Firma → Nasz Katalog Robót · lista · statusy PL · ZERO HTTP.  
Reuse UX wzorców z `OurPriceCatalogPanel` (filozofia, nie kopiuj PM).

### P2 — History + freshness + Owner edit

Zakres: ring · TTL · edit · change UI · seed empty OUR RATE = BRAK STAWKI.

### P3 — Selective external research (gated)

Zakres: port + KB adapter **za** `WORK_RATE_LEGAL_GATE`.  
Bez PASS: stub BLOCKED + testy gate.

### P4 — Qualify + region + averaging (mediana)

Zakres: region cascade · mediana · etykiety próby.

### P5 — Accept → persist → katalog

Zakres: Accept → OUR RATE · historia · second lookup REUSE.

### P6 — Migracja starego modelu

Zakres: oznaczenie LEGACY `companyPricePln` · narzędzia ręcznego Accept CALCULATED (opcjonalnie) · **zero auto-batch**.  
NIE: Bid cutover.

### P7 — Bid integration

Zakres: Bid czyta OUR RATE · fallback CALCULATED/legacy wg LOCK · regresje.

---

## 23. Design Freeze — LOCK Ownera

1. SSOT: definicja WC + stawki w Nasz Katalog Robót (extend WC vs osobny KV)  
2. Identity: workId + unit  
3. TTL: 90 vs 180  
4. Averaging: **mediana** (propozycja)  
5. Legal: osobny gate; KB = REVIEW do PASS  
6. UI: jedna sekcja „Nasz Katalog Robót” vs zachowanie osobnej Biblioteki admin  
7. `companyPricePln`: LEGACY do P7  
8. Bid: dopiero P7  
9. Auto-migrate: **FORBIDDEN**  
10. Region cascade: WROCŁAW → DS → PL  
11. Force refresh CURRENT: TAK (jak materiały)  
12. Relacja do LABOR-RATE-MEMORY-01: **superseded by rebuild** (TAK/NIE potwierdzenie)

---

## 24. Zakazy

- implementacja / commit / push / prod  
- full catalogue  
- second material Price Memory  
- marketQuotes dla robót  
- flip `MARKET_SYNC_P3_LEGAL_GATE`  
- auto-migracja `companyPricePln`  
- zmiana Bid przed P7  
- inventowanie stawek / seed cen  

---

## 25. Pliki kluczowe (odniesienia)

| Obszar | Ścieżka |
|--------|---------|
| Types WC | `src/lib/work-catalog/types.ts` |
| Freshness 90d | `src/lib/work-catalog/freshness.ts` |
| Bid | `src/lib/tenders-bid-calculator.ts` |
| Cost engine | `src/lib/wgdom-catalog-cost-engine.ts` |
| Firma hub | `src/app/tenders/tabs/TendersCompanyTab.tsx` |
| Nasz katalog cen | `src/app/price-catalog/OurPriceCatalogPanel.tsx` |
| Legal DIY gate | `src/lib/market-sync/p3-flag.ts` |
| PM qualify avg | `src/lib/price-intelligence/market-research-qualify.ts` |

---

**KONIEC AUDIT + PLAN. Zero kodu poza dokumentami.**
