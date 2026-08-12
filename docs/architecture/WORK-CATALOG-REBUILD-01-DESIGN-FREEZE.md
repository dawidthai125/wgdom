# WORK-CATALOG-REBUILD-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE COMPLETE** · **LOCKED** · **OWNER CORRECTION P0 2026-08-11** · **NO IMPLEMENTATION** · **NO COMMIT** · **NO PUSH** · **PRODUCTION UNCHANGED**  
> **DATA:** 2026-08-11  
> **SSOT DECYZJI:** ten dokument (+ [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md) dla semantyki `companyPricePln`)  
> **INPUT:** [`WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md`](./WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md) · [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md) · repo  
> **SUPERSEDES (zakres):** „tylko additive Labor Rate Memory” bez rebuildu — decyzja Ownera = **przebudowa modelu**  
> **NEXT:** potwierdzenie OWNER → GO IMPLEMENT P0 (dopiero po GO)

---

## 0. Owner Decision (LOCKED)

Owner **odchodzi** od starego modelu:

```text
Biblioteka Robót + companyPricePln (mixed) + heurystyki
  = główne źródło wyceny robót
```

**★ Korekta 2026-08-11:** stary model jest **WYCOFYWANY**, nie „zachowywany jako legacy pricing source”.  
`companyPricePln` = **TECHNICAL LEGACY FIELD** (może zostać w modelu), **nie** źródło OUR RATE / fallback / seed.

Docelowo:

```text
PRZEDMIAR
  → konkretna robota
  → IDENTITY (workId + unit)
  → NASZ KATALOG ROBÓT
  → AKTUALNA STAWKA?
       TAK → REUSE → ZERO HTTP
       NIE → SELECTIVE RESEARCH (ONE WORK)
            → KB.pl / inne zatwierdzone źródło
            → WROCŁAW → DOLNY ŚLĄSK → POLSKA
            → kwalifikacja → wartość reprezentatywna (MEDIANA)
            → OWNER ACCEPT
            → zapis OUR RATE + historia
  → kolejny przetarg → REUSE
```

**Ten Design Freeze nie implementuje nic.** Blokuje kontrakt przed kodem.

---

## 1. SSOT (LOCKED)

| Warstwa | SSOT | Semantyka |
|---------|------|-----------|
| **Definicja roboty** | `CatalogWork` / Biblioteka Robót | co to za robota, jednostka, nazwa, keywords, active, normy |
| **Stawka roboty** | **Nasz Katalog Robót** | OUR RATE za `(workId, unit)` |
| **Materiały** | Price Memory (`marketQuotes`) | **osobna domena — DO NOT TOUCH** |

```text
OUR RATE = stawka zaakceptowana przez Ownera
           za konkretną robotę + jednostkę
```

### Zakazy SSOT

| Zakaz | Status |
|-------|--------|
| `marketQuotes` dla robót | **FORBIDDEN** |
| Drugi Price Memory materiałów | **FORBIDDEN** |
| Drugi Cost Catalog jako SSOT stawek | **FORBIDDEN** |
| Labor Benchmark jako SSOT OUR RATE | **FORBIDDEN** (tylko referencja) |
| Auto-zapis research → OUR RATE | **FORBIDDEN** |

---

## 2. Identity (LOCKED)

```text
WORK_RATE_IDENTITY = workId + unit
```

| Element | LOCK |
|---------|------|
| `workId` | `CatalogWork.id` — REUSE |
| `unit` | jednostka z `CatalogWork` — REUSE |
| Nazwa / keywords / mapping przedmiaru | REUSE istniejące |
| Nowa taksonomia robót | **FORBIDDEN** |
| **Region w identity** | **NIE** — region = właściwość obserwacji / stawki rynkowej (`regionScope`) |

Stawka bez jednostki = **niepoprawna** (odrzuć w modelu).

---

## 3. Storage (LOCKED)

### Decyzja

```text
ONE WORK CATALOG STORE
EXTEND kw-wgdom-work-catalog
ZERO nowego KV (domyślnie)
```

Stawki Nasz Katalog Robót = **additive pola** na `CatalogWork` (lub równoważna mapa w tym samym store), z osobną semantyką od `marketQuotes` / `commercialPricing` / `companyPricePln`.

### Dlaczego NIE osobny KV (domyślnie)

| Argument | Ocena |
|----------|-------|
| Identity już w WC | REUSE — jeden merge, jeden backup, jeden sync |
| Wzorzec już istnieje | `marketQuoteHistory` / `commercialPricing` żyją na tym samym work |
| Nowy KV | nowy merge · CloudLoader · backup keys · ryzyko rozjazdu identity vs stawka |
| „Wygoda implementacji” | **niewystarczający** powód osobnego KV |

### Kiedy osobny KV byłby uzasadniony (wyjątek — wymaga nowego LOCK Ownera)

Tylko jeśli ARCH REVIEW udowodni **konflikt merge** uniemożliwiający bezpieczne współistnienie pól stawek robót z polami materiałów na tym samym `updatedAt` LWW **bez** rozwiązania w normalize.  
Do tego czasu: **EXTEND ONLY**.

### Cap historii

```text
history ring cap = 24
```

(wzorzec Price Memory / `marketQuoteHistory`)

---

## 4. Model stawki — kontrakt (LOCKED)

### 4.1. Semantyka

| Pojęcie | Znaczenie |
|---------|-----------|
| **SOURCE RATE** | wynik researchu / uśrednienia — **kandydat** |
| **OUR RATE** | nasza zaakceptowana stawka — **SSOT katalogu** |
| **sourceType** | `OWNER` \| `MARKET` \| `CALCULATED` \| `BENCHMARK` (referencja) |
| **regionScope** | zakres geograficzny obserwacji rynkowej |
| **observedAt** / **updatedAt** | ISO |
| **freshness** | CURRENT / STALE / MISSING (lib) → UI PL |
| **history** | ring obserwacji |
| **change** | delta vs poprzednie OUR RATE |

### 4.2. Twardy przepływ zapisu

```text
research
  → candidate (SOURCE RATE)
  → Owner Accept
  → OUR RATE
```

```text
NIGDY: research → automatyczny OUR RATE
```

### 4.3. Nazwy pól (orientacyjne — do implementacji; semantyka LOCKED)

Kontrakt logiczny (nie wymusza finalnych identyfikatorów TS w DF):

- `ourRatePln` — OUR RATE (zł / unit)  
- `sourceRatePln` — ostatni zaakceptowany lub ostatni kandydat SOURCE (rozróżnij w typie: candidate vs lastSource)  
- `sourceType`  
- `regionScope`  
- `observedAt` / `updatedAt`  
- `workRateHistory[]` — ring  

Dokładne nazwy symboli: decyzja implementacyjna w granicach tej semantyki.

### 4.4. Pure helper (NIE implementować w DF)

```text
calculateRepresentativeWorkRate(observations) → representative | low_sample
```

Zasady: §8.

---

## 5. Owner Edit (LOCKED)

Owner może **ręcznie ustawić / zmienić OUR RATE**.

```text
research: 52 zł/m² (SOURCE / candidate)
Owner:    55 zł/m²
Katalog:  OUR RATE = 55
sourceType = OWNER
historia: zachowana (SOURCE + OUR)
```

Kolejny przetarg: **REUSE 55** przy AKTUALNA · ZERO HTTP.

---

## 6. Freshness (LOCKED)

| Parametr | LOCK |
|----------|------|
| **TTL** | **90 dni** |
| Uzasadnienie | zgodność z `WORK_FRESHNESS_STALE_AFTER_DAYS` Biblioteki; wystarczające dla stawek robót |

| Enum lib (OK EN) | UI (TYLKO PL) |
|------------------|---------------|
| CURRENT | **AKTUALNA** |
| STALE | **PRZETERMINOWANA** |
| MISSING | **BRAK STAWKI** |

UI: **zakaz** wyświetlania CURRENT / STALE / MISSING / UNKNOWN.

| Status | Zachowanie |
|--------|------------|
| AKTUALNA | REUSE · ZERO HTTP |
| PRZETERMINOWANA | OUR RATE widoczna · selective research dozwolony (gdy Legal PASS) |
| BRAK STAWKI | selective research dozwolony (gdy Legal PASS) · Owner edit zawsze |

---

## 7. Region (LOCKED)

Kolejność preferencji researchu:

```text
1. WROCŁAW
2. DOLNY ŚLĄSK
3. POLSKA   ← tylko fallback
```

| Zasada | LOCK |
|--------|------|
| Każda obserwacja ma `regionScope` | TAK |
| Mieszanie regionów w jednej medianie bez oznaczenia | **FORBIDDEN** |
| Region w WORK_RATE_IDENTITY | **NIE** |

---

## 8. Uśrednianie (LOCKED)

| Reguła | LOCK |
|--------|------|
| Automatyczne **minimum** | **FORBIDDEN** jako representative |
| ≥3 porównywalne obserwacje (ten sam regionScope) | **MEDIANA** |
| 1–2 obserwacje | **niska próba** — nie udawać pełnej reprezentatywności |
| Pure helper | `calculateRepresentativeWorkRate(...)` — projekt; **nie implementować w DF** |

---

## 9. Selective research (LOCKED)

```text
Research = ONE WORK + unit + region preference
```

| Zakaz | |
|-------|--|
| FULL CATALOGUE | **FORBIDDEN** |
| Category crawl | **FORBIDDEN** |
| Preload tysięcy pozycji | **FORBIDDEN** |
| Research wszystkich robót przy otwarciu przetargu | **FORBIDDEN** |

PRIMARY CANDIDATE źródła: **KB.pl** (po Legal PASS).  
Inne źródła: tylko po osobnym LOCK / Legal.

---

## 10. Cache-first (LOCKED)

```text
ZAWSZE: lookup Nasz Katalog Robót
PRZED:  zewnętrznym źródłem
```

| Stan | HTTP |
|------|------|
| CURRENT / AKTUALNA | **0** · REUSE |
| STALE / MISSING | selective ONE WORK (gdy gate PASS) |
| Manual refresh | ONE WORK (nawet CURRENT) → wynik = candidate → Accept |
| Otwarcie katalogu | **0** |
| Otwarcie przetargu (sam lookup) | **0** |

---

## 11. Legal (LOCKED)

| Element | LOCK |
|---------|------|
| Osobny gate | **`WORK_RATE_LEGAL_GATE`** |
| Status gate (2026-08-12) | **PASS** — Owner Attestation |
| Reuse `MARKET_SYNC_P3_LEGAL_GATE` | **FORBIDDEN** |
| Źródła VERIFIED | KB.pl · SCCOT · Extradom · CennikRemontow.pl |
| Selective research (legal) | **AUTHORIZED** |
| Live adapters / HTTP | **P2 SELECTIVE** — ONE work · Edge allowlist · Owner Accept |
| Full catalogue | **FORBIDDEN** |
| Owner ręczny OUR RATE | **DOZWOLONY** (także przed/obok research) |

SSOT: [`WORK-RATE-OWNER-LEGAL-PASS.md`](./WORK-RATE-OWNER-LEGAL-PASS.md) · P2: [`WORK-RATE-SELECTIVE-RESEARCH-02.md`](./WORK-RATE-SELECTIVE-RESEARCH-02.md) · historyczny: [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md).

Legal PASS + P2 selective ≠ full catalogue. Bid/Offer wire = osobny etap.

---

## 12. `companyPricePln` (LOCKED) — ★ OWNER CORRECTION 2026-08-11

```text
companyPricePln = TECHNICAL LEGACY FIELD
  ≠ LEGACY PRICING SOURCE
  ≠ prawidłowa / aktualna stawka robocizny
  ≠ źródło / fallback / seed OUR RATE
```

**Owner Decision:** stary model wyceny oparty o `companyPricePln` jest **WYCOFYWANY**.  
Nie zakładamy, że stare ceny są poprawne. Nie kopiujemy ich do Nasz Katalog Robót.

| Zakaz / nakaz | |
|---------------|--|
| Usunąć pole teraz (w ciemno) | **NIE** — najpierw audyt zależności → osobny GO |
| Traktować jako SSOT / legacy source nowej wyceny | **FORBIDDEN** |
| Lookup OUR RATE z `companyPricePln` | **FORBIDDEN** |
| Fallback OUR RATE ← `companyPricePln` | **FORBIDDEN** |
| Seed / auto-migracja → OUR RATE | **FORBIDDEN** |
| Pokazywać w Nasz Katalog Robót jako „aktualną stawkę” | **FORBIDDEN** |
| Preserve w normalize / sync (bitowo) | **TAK** (nie strip, nie mutate przy OUR RATE) |

Bid / Offer mogą **technicznie** jeszcze czytać pole do P7 (**ZERO TOUCH** P0–P6) — to **debt do wycofania**, nie akceptacja starego modelu jako źródła prawdy.

SSOT korekty: [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

---

## 13. `laborRbhPerUnit` (LOCKED)

```text
Semantyka = norma technologiczna / czas
≠ automatycznie OUR RATE
```

**Zachować.** Nie usuwać. Nie równać z Nasz Katalog Robót.

---

## 14. `fullyLoadedHourly` (LOCKED)

```text
Semantyka = koszt roboczogodziny firmy
(avgGrossHourly × (1 + employerBurden))
```

**Zachować.** Nie zmieniać teraz. Nie zmieniać Bid.

`CALCULATED = rbh × fullyLoadedHourly` może być **propozycją** (niska pewność / fallback), nigdy auto OUR RATE bez Accept.

---

## 15. Bid (LOCKED)

```text
BID = OSOBNY EPIC (P7)
Do P7: ZERO zmian Bid / minMarginPct / kalkulatora
```

Docelowy border (nie implementować teraz):

```text
PRZEDMIAR
  → ROBOTA
  → OUR RATE (Nasz Katalog Robót)
  + Price Memory materiałów
  → KOSZT
  → MARŻA (cost model)
  → OFERTA
```

---

## 16. UI (LOCKED)

### Wejście

```text
Firma → Nasz Katalog Robót
```

Wzorzec wizualny: podobny do **Firma → Nasz katalog cen**, ale **wyłącznie roboty**.  
Etykiety UI: **tylko polski**.

### Kolumny

| Kolumna PL |
|------------|
| ROBOTA |
| JEDNOSTKA |
| NASZA STAWKA |
| STAWKA RYNKOWA |
| REGION |
| AKTUALNOŚĆ |
| DATA |
| ZMIANA |
| ŹRÓDŁO |
| AKCJA |

### Statusy UI

- AKTUALNA  
- PRZETERMINOWANA  
- BRAK STAWKI  

### Akcje

- **AKTUALIZUJ** — ONE WORK (force research → Accept)  
- Edycja **NASZA STAWKA** (Owner edit)

---

## 17. Biblioteka Robót (LOCKED)

| Warstwa | Rola |
|---------|------|
| **Biblioteka Robót** | definicje · identity · norma · active · pakiety |
| **Nasz Katalog Robót** | stawki · historia · research · Accept |

**Nie usuwać** Biblioteki Robót.

### Ścieżka UX (żeby nie było dwóch konkurencyjnych cenników)

1. **Primary:** użytkownik wycenia i przegląda stawki w **Nasz Katalog Robót**.  
2. **Biblioteka:** admin definicji (dodaj robotę, keywords, active, normy) — nie „drugi cennik”.  
3. Ewentualnie w UI Biblioteki: link „Stawki → Nasz Katalog Robót” / ukrycie edycji mixed jako głównej ceny po cutoverze P7 (późniejszy LOCK).  
4. Do P7: w **Bibliotece** `companyPricePln` może zostać widoczne jako **stare pole techniczne „Cena firmy (łącznie)”** z jasnym opisem, że **nie** jest Naszą stawką robót i **nie** zasila Nasz Katalog Robót. W **Nasz Katalog Robót** przy braku OUR RATE = **BRAK STAWKI** (nigdy nie podstawiać 35 zł z mixed).

---

## 18. Historia (LOCKED)

Ring history — każda pozycja:

| Pole | |
|------|--|
| wartość | |
| source / sourceType | |
| regionScope | |
| timestamp | |
| rodzaj | SOURCE i/lub OUR |
| change | względem poprzedniego OUR (opcjonalnie) |

Stare wartości **nie znikają** (do cap **24**).

---

## 19. Manual refresh (LOCKED)

```text
AKTUALIZUJ = ONE WORK
nawet CURRENT może być wymuszony
research result ≠ OUR RATE
po research → Owner Accept
```

---

## 20. Materiały — ZERO TOUCH (LOCKED)

| Element | |
|---------|--|
| Price Memory materiałów | **UNCHANGED** |
| LIVE-ADAPTERS-08 | **UNCHANGED** |
| LM / Castorama / OBI | **UNCHANGED** |
| `MARKET_SYNC_P3_LEGAL_GATE` | **UNCHANGED** / **DO NOT TOUCH** |

Materiały ≠ roboty.

---

## 21. Migracja (LOCKED)

```text
AUTO-MIGRATION = FORBIDDEN
```

| Stare | Nowe |
|-------|------|
| `companyPricePln` | TECHNICAL LEGACY FIELD — preserve; nie źródło OUR RATE |
| OUR RATE | niezależne; start puste (BRAK STAWKI) |

P6/P7: kontrolowana migracja dopiero po osobnym GO (ręczne Accept / narzędzia — nie batch invent).

---

## 22. Performance (LOCKED)

| Scenariusz | HTTP |
|------------|------|
| Otwarcie Nasz Katalog Robót | **0** |
| Otwarcie przetargu (lookup) | **0** |
| CURRENT | **0** |
| MISS / STALE research | ONE WORK (gdy Legal PASS) |
| FULL CATALOGUE | **FORBIDDEN** |

---

## 23. Test Contract (LOCKED)

1. identity (`workId + unit`)  
2. unit wymagane  
3. CURRENT → REUSE  
4. STALE  
5. MISSING  
6. ZERO HTTP on open  
7. selective research  
8. ONE WORK  
9. Accept → OUR RATE  
10. Owner Edit  
11. persist  
12. history (cap 24)  
13. timestamp  
14. change / „Brak danych porównawczych”  
15. regionScope / cascade metadata  
16. sourceType  
17. second tender → REUSE ZERO HTTP  
18. no duplicate research przy HIT  
19. no full catalogue  
20. material Price Memory unchanged  
21. `companyPricePln` unchanged (P0–P6)  
22. Bid unchanged (do P7)  
23. legal blocked (gate ≠ PASS)  
24. no `marketQuotes` for labor/works rates  

---

## 24. Fazy implementacji (po GO — nie w DF)

| Faza | Zakres |
|------|--------|
| P0 | model + identity + SSOT extend WC + lookup OUR RATE · **zero seed/fallback z companyPricePln** · BRAK STAWKI gdy puste |
| P1 | UI Nasz Katalog Robót (PL) · nie pokazywać mixed jako stawki |
| P2 | history + freshness OUR RATE + Owner edit |
| P3 | selective research za `WORK_RATE_LEGAL_GATE` |
| P4 | region + mediana |
| P5 | Accept → persist → REUSE |
| P6 | **NIE** auto-migracja cen · ewentualnie narzędzia disconnect / Accept only (osobny GO) |
| P7 | Bid → OUR RATE (osobny epic / GO) · wycofanie toru mixed |

---

## 25. Risks (LOCKED awareness)

| Ryzyko | Mitygacja w kontrakcie |
|--------|------------------------|
| Legal KB długo BLOCKED | P0–P2 = Owner rates bez HTTP |
| Dwa UI cenników | §17 — primary = Nasz Katalog Robót |
| Merge WC materials vs work rates | osobne pola · testy preserve |
| Auto-migrate mixed | FORBIDDEN |
| Regresja Bid | ZERO Bid do P7 |
| Użycie marketQuotes | FORBIDDEN |

---

## 26. Explicit prohibitions (LOCKED)

1. Implementacja / commit / push / zmiana produkcji **w tym kroku DF**  
2. `marketQuotes` jako stawka robót  
3. Drugi material Price Memory / drugi KV bez nowego LOCK  
4. Full catalogue / category crawl / preload  
5. Auto OUR RATE z research  
6. Auto-migracja / seed / fallback `companyPricePln` → OUR RATE  
6a. Traktowanie `companyPricePln` jako LEGACY PRICING SOURCE nowej wyceny  
7. Flip `MARKET_SYNC_P3_LEGAL_GATE`  
8. Live research przy `WORK_RATE_LEGAL_GATE` ≠ PASS  
9. Zmiana Bid / `minMarginPct` przed P7  
10. Angielskie statusy w UI  
11. Region jako część identity  
12. Representative = min  

---

## 27. Relacja do wcześniejszych dokumentów

| Dokument | Status względem DF |
|----------|-------------------|
| LABOR-PRICING-READINESS-AUDIT-01 | INPUT (faktografia) |
| LABOR-RATE-MEMORY-01-PLAN | częściowo **SUPERSEDED** — rebuild > additive-only |
| WORK-CATALOG-REBUILD-01-AUDIT-PLAN | INPUT; DF **zamyka** LOCK-i |
| WORK-RATE-REAL-SOURCE-LEGAL | INPUT Legal — bez flipu |

---

## 28. Następny krok

```text
OWNER DECISION P0 CORRECTION (2026-08-11) — zastosowana w §12 / §24
  → potwierdzenie OWNER
  → OWNER GO IMPLEMENT P0 (skorygowany kontrakt)
  → … zgodnie z fazami
```

**Bez GO Ownera: ZERO kodu.**

Korekta: [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

---

*Koniec DESIGN FREEZE. Dokument jest SSOT decyzji WORK-CATALOG-REBUILD-01 (z korektą Owner Decision P0).*
