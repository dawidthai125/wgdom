# WORK-CATALOG-REBUILD-01 — ARCH REVIEW

> **STATUS:** **ARCH REVIEW COMPLETE** · **ADDENDUM OWNER DECISION 2026-08-11**  
> **WERDYKT:** **PASS WITH CONDITIONS** (semantyka `companyPricePln` **skorygowana** — nie „legacy pricing source”)  
> **DATA:** 2026-08-11  
> **SSOT DECYZJI:** [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) · korekta [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md)  
> **INPUT:** [`WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md`](./WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md) · [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md) · repo  
> **TRYB:** wyłącznie przegląd architektury  
> **ZAKAZ:** implementacja · commit · push · adapter KB.pl · live research · flip Legal Gate · zmiana produkcji

---

## 0. Cel przeglądu

Ocena, czy Design Freeze da się wdrożyć **bezpiecznie** bez:

- drugiej bazy cen materiałów,
- `marketQuotes` dla robót,
- utraty danych,
- konfliktu Biblioteka ↔ Nasz Katalog Robót,
- konfliktu z Price Memory materiałów,
- regresji Bid,
- uszkodzenia CloudLoader / sync / normalize,
- auto-migracji `companyPricePln`,
- masowego researchu,
- obejścia Legal Gate.

**Ten dokument nie naprawia kodu** — tylko PASS / CONDITION / BLOCKER.

---

## 1. SSOT — PASS

| Warstwa | Werdykt | Uzasadnienie |
|---------|---------|--------------|
| Definicja roboty = `CatalogWork` / Biblioteka | **PASS** | Identity, unit, keywords, active już w WC |
| Stawka = Nasz Katalog Robót (OUR RATE) | **PASS** | Semantyka DF spójna; storage EXTEND WC |
| Price Memory / `marketQuotes` = tylko materiały | **PASS** | CATALOG-02 + osobne pole; DF zakazuje reuse Quotes dla robót |

`marketQuotes → roboty`: **FORBIDDEN** w DF — **PASS** (kontrakt).

---

## 2. Storage — PASS WITH CONDITIONS

### Decyzja DF: EXTEND `kw-wgdom-work-catalog` — potwierdzona

| Aspekt | Stan w repo | Werdykt |
|--------|-------------|---------|
| Jeden KV | `WORK_CATALOG_STORAGE_KEY` = `kw-wgdom-work-catalog` | **PASS** |
| Cloud sync | `cloud-sync.ts` DATA_KEYS + `mergeWorkCatalogStore` | **PASS** (ścieżka istnieje) |
| Normalize | `normalizeWorkCatalogStore` / `normalizeCatalogWork` | **CONDITION C1** |
| Merge LWW | porównanie `updatedAt` **całego store** | **CONDITION C4** |
| Preserve PM | `commercialPricing`, `marketQuotes`, `marketQuoteHistory` w normalize | **CONDITION C1** (wzorzec C1 PM — trzeba powtórzyć dla nowych pól) |
| Backup | klucz w liście sync/persist | **PASS** (ten sam klucz) |
| Osobny KV | nie wymagany przy spełnieniu C1 | **PASS** (nie wybierać dla wygody) |

### CONDITION C1 — normalize allowlist (REALNY)

`normalizeCatalogWork` w `work-catalog-store.ts` buduje **nowy obiekt z jawną listą pól**.  
Pola **nieobecne** na liście są **odrzucane** przy load/save/merge/normalize.

**Warunek wdrożenia P0:** przed pierwszym zapisem OUR RATE musi istnieć:

- typy na `CatalogWork`,
- `normalizeWorkRate*` (lub równoważne) w `normalizeCatalogWork`,
- testy: round-trip preserve `marketQuotes` + `marketQuoteHistory` + `commercialPricing` + `companyPricePln` + **nowe pola stawek**,
- test: unknown fields nie niszczą PM.

Bez C1: EXTEND store **FAIL w praktyce** (stawki znikną przy sync).

### CONDITION C4 — LWW store-level (REALNY, znany)

`mergeWorkCatalogStore`: wygrywa **cały** nowszy store (`updatedAt` top-level), **nie** merge per-work.

Skutek (już dziś dla PM + companyPrice):

- urządzenie A: Accept materiału  
- urządzenie B: Owner edit OUR RATE  
- → jedno z urządzeń może **nadpisać** drugie całością katalogu  

**Warunek:** P0–P2 dokumentują ryzyko; testy regresji LWW; **nie** inventować per-work LWW bez osobnego Design Freeze sync.  
**Nie** BLOCKER DF — ten sam model co `commercialPricing`.  
Opcjonalny przyszły HARDENING: merge per `work.id` — **poza** scope P0 bez nowego GO.

---

## 3. Identity — PASS WITH CONDITION

| Reguła DF | Werdykt |
|-----------|---------|
| `workId + unit` | **PASS** |
| `workId` = `CatalogWork.id` | **PASS** |
| unit wymagane | **PASS** (`isValidUnit` w normalize) |
| brak nowej taksonomii | **PASS** |
| region ∉ identity | **PASS** |

### CONDITION C2 — mapowanie przedmiar → workId

Dziś Bid/katalog często:

```text
opis ATH → classifyAthLineCategory (keywords kategorii)
         → rate kategorii (aggregated), nie zawsze 1:1 CatalogWork.id
```

Istnieje `resolveWorkIdFromIndex` / market mapping — pod ingest zewnętrzny, **nie** pełny SSOT przedmiar→work w Bid.

**Warunek:** P0–P5 Nasz Katalog Robót operuje na **istniejących** `CatalogWork` (lista Biblioteki).  
Mapowanie przedmiar→konkretny `workId` do research/Bid = **osobna jakość** (może REUSE keywords / user dict); **nie blokuje** P0 modelu/UI katalogu.  
P7 Bid: wymaga jawnej strategii resolve — CONDITION na epic Bid, nie na P0.

---

## 4. Model OUR / SOURCE — PASS

| Reguła | Werdykt |
|--------|---------|
| SOURCE ≠ OUR | **PASS** (DF) |
| Research → candidate → Accept → OUR | **PASS** |
| Auto research → OUR | **FORBIDDEN** — **PASS** |
| Pola: rate, sourceType, regionScope, timestamps, freshness, history, change | **PASS** (kontrakt DF) |

---

## 5. Owner Edit — PASS

| Reguła | Werdykt |
|--------|---------|
| Ręczny OUR RATE · sourceType=OWNER · historia | **PASS** |
| Nie zmienia `companyPricePln` | **PASS** (osobne pole; test regresji wymagany) |

---

## 6. Freshness — PASS WITH CONDITION

| Reguła | Werdykt |
|--------|---------|
| TTL 90 dni | **PASS** — stała `WORK_FRESHNESS_STALE_AFTER_DAYS = 90` |
| UI PL: AKTUALNA / PRZETERMINOWANA / BRAK STAWKI | **PASS** (kontrakt) |

### CONDITION C-FRESH — nie reuse ślepy `deriveFreshnessStatus`

Obecne `deriveFreshnessStatus` liczy od **`companyPricePln`** + `updatedAt` work.

OUR RATE wymaga:

- osobnego wejścia (`ourRatePln` + `observedAt`/`updatedAt` stawki),
- **REUSE TTL 90**,
- **NIE** podmieniania semantyki freshness mixed ceny firmy.

Shared `updatedAt` na `CatalogWork` (jedno pole) vs `observedAt` stawki: DF już rozdziela — implementacja musi bumpować timestamp **stawki**, nie mylić z PM commit.

---

## 7. Region — PASS

| Reguła | Werdykt |
|--------|---------|
| WROCŁAW → DOLNY ŚLĄSK → POLSKA | **PASS** (kontrakt) |
| `regionScope` na obserwacji | **PASS** — wzorzec `MarketRegionCode` / region WC istnieje; osobny enum scope do zdefiniowania w P0 |
| Brak mieszania regionów | **PASS** (kontrakt mediany) |

Store WC ma slice `wroclaw` / `dolnyslask` dla **definicji** robót — to **nie** zastępuje `regionScope` obserwacji rynkowej (DF: region ∉ identity). **CONDITION lekki:** nie mylić `activeRegion` katalogu z `regionScope` researchu.

---

## 8. Mediana — PASS

| Reguła | Werdykt |
|--------|---------|
| ≥3 → MEDIANA | **PASS** (kontrakt) |
| 1–2 → niska próba | **PASS** |
| min = representative | **FORBIDDEN** — **PASS** |
| Helper pure | możliwy; **nie** implementowany w tym review |

Materiały: `averageQualifyingRegularMarketPrices` — **nie kopiować**; domena robót = mediana (DF).

---

## 9. Cache-first — PASS

Architektura umożliwia:

```text
lookup lokalny WC (OUR RATE)
  → HIT CURRENT → ZERO HTTP
  → MISS/STALE → (później) selective port
```

Otwarcie UI katalogu: tylko `loadWorkCatalogStoreLocal` / hook — **0 HTTP** dziś dla Biblioteki; ten sam wzorzec dla Nasz Katalog Robót.

**PASS** kontraktu performance.

---

## 10. Selective research — PASS WITH CONDITION (Legal)

| Reguła | Werdykt |
|--------|---------|
| ONE WORK + unit + region | **PASS** (kontrakt portu) |
| Full catalogue | **FORBIDDEN** — **PASS** |
| Adapter KB.pl teraz | **NIE** — Legal BLOCKED |

### CONDITION C-LEGAL-IMPL

Do `WORK_RATE_LEGAL_GATE === PASS`: implementacja research = stub **BLOCKED** + testy.  
Brak adaptera w P0–P2 = **OK**.

---

## 11. Legal — PASS (gate osobny; KB BLOCKED)

| Reguła | Werdykt |
|--------|---------|
| Osobny `WORK_RATE_LEGAL_GATE` | **PASS** (wymagany; jeszcze nie w kodzie — do P3) |
| Nie reuse / nie flip `MARKET_SYNC_P3_LEGAL_GATE` | **PASS** |
| KB.pl REVIEW/UNKNOWN · live BLOCKED | **PASS** |
| Owner ręczny OUR RATE przy BLOCKED | **PASS** |

**Nie BLOCKER** arch DF: Legal BLOCKED jest **oczekiwany**.

---

## 12. `companyPricePln` — PASS WITH CONDITIONS (★ skorygowane)

Użycie w repo (skrót A–G): pełny audyt w [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

| Reguła | Werdykt |
|--------|---------|
| Pole = **TECHNICAL LEGACY FIELD** (preserve) | **PASS** |
| Pole ≠ źródło / fallback / seed OUR RATE | **PASS** (kontrakt Owner) |
| Nasz Katalog startuje pusto → BRAK STAWKI | **PASS** (C-EMPTY) |
| Usunąć pole teraz | **FORBIDDEN** bez osobnego GO po P7 |
| Bid P0–P6 ZERO TOUCH | **PASS** (debt, nie akceptacja starego SSOT) |

### CONDITION C7 — regresja + odłączenie od nowej wyceny

- zapis OUR RATE **nie** przez `patchWorkCompanyPriceInStore`  
- po Owner edit OUR RATE → `companyPricePln` bitowo bez zmian  
- lookup / UI Nasz Katalog **nie** czyta `companyPricePln`  

### CONDITION C-EMPTY / C-NO-SEED (NOWY — Owner Decision)

Żaden kod P0+ nie wolno: `ourRate = companyPricePln` · fallback · seedFromCompanyPrice.  
Przykład: Biblioteka 35 zł/m² → Katalog = **BRAK STAWKI**, nie 35.

---

## 13–14. `laborRbhPerUnit` / `fullyLoadedHourly` — PASS

Norma czasu + koszt rbh firmy — **REUSE**, nie OUR RATE. Bid untouched. **PASS**.

---

## 15. Biblioteka vs Nasz Katalog Robót — PASS WITH CONDITION (UI)

Semantyka DF: **PASS**.

### CONDITION C-UI

Ryzyko dwóch cenników w hubie Firma (Biblioteka nadal pokazuje „Cena firmy”).

**Warunek P1:**  
- primary nawigacja stawek = **Nasz Katalog Robót**,  
- w Bibliotece: jasny opis, że „Cena firmy” to **stare pole techniczne**, nie Nasz Katalog,  
- Nasz Katalog **nigdy** nie pokazuje `companyPricePln` jako NASZA STAWKA,  
- nie dublować edycji OUR RATE w dwóch miejscach.

Tylko propozycja UX — **nie** implementacja w tym review.

---

## 16. UI — PASS (kontrakt)

Kolumny i statusy PL — zgodne z DF. Wzorzec hub: `TendersCompanyTab` + sekcje — **EXTEND** o nową sekcję (wymaga etykiety w `TENDERS_COMPANY_SECTION_LABELS` przy GO). **PASS** jako architektura IA.

---

## 17. Historia — PASS WITH CONDITION

Cap 24 — wzorzec `marketQuoteHistory`. **PASS**.

### CONDITION C9 — izolacja od historii materiałów

Nowa historia stawek robót **nie może**:

- pisać do `marketQuoteHistory`,
- czyścić `marketQuotes`,
- współdzielić normalizatora Quotes bez guardów.

Test obowiązkowy: commit material Quote nie rusza work-rate history i odwrotnie.

---

## 18. Material Price Memory — PASS

ZERO TOUCH: Quotes, LIVE-08, DIY, C4/C5, Legal Gate materiałów.  
DF + ten review: **PASS**.

---

## 19. Bid — PASS / UNCHANGED

P0–P6: **ZERO TOUCH**.  
P7: osobny GO.  
**PASS**.

---

## 20. Migracja — PASS

`AUTO-MIGRATION = FORBIDDEN`.  
Brak ścieżki w DF do kopiowania mixed→OUR. **PASS**.

---

## 21. Test architecture — PASS (wykonalność)

Wszystkie 24 punkty DF są testowalne pure-lib + harness (wzorzec C01/C03), z zastrzeżeniem:

- research live: mock / gate blocked do Legal PASS,
- Bid unchanged: asercje importów / smoke „no call site change”.

---

## 22. Macierz ryzyk C1–C12

| ID | Temat | Status | Komentarz |
|----|-------|--------|-----------|
| **C1** | normalize / merge strip | **CONDITION** | allowlist — obowiązkowe EXTEND normalize |
| **C2** | identity collision / przedmiar | **CONDITION** | P0 OK na workId; Bid resolve później |
| **C3** | material host vs work host | **CONDITION** | UI katalogu robót = definicje robót; nie hosty invoice-only |
| **C4** | updatedAt / LWW store | **CONDITION** | ryzyko istniejące; nie invent per-work merge w P0 |
| **C5** | CloudLoader / sync | **PASS** | ten sam klucz; po C1 OK |
| **C6** | backup / restore | **PASS** | ten sam KV |
| **C7** | companyPricePln regression + no pricing source | **CONDITION** | preserve · nie lookup/fallback/seed OUR RATE |
| **C8** | Bid regression | **PASS** | ZERO TOUCH do P7 |
| **C9** | Price Memory contamination | **CONDITION** | osobne pola/historia + testy |
| **C10** | legal gate bypass | **PASS** | osobny gate; DIY gate DO NOT TOUCH |
| **C11** | full catalogue research | **PASS** | kontrakt FORBIDDEN |
| **C12** | duplicate work rates | **CONDITION** | identity workId+unit; dedupe w normalize |

**BLOCKER-ów krytycznych uniemożliwiających start P0 przy spełnieniu CONDITIONS: BRAK.**

---

## 23. Werdykt końcowy

```text
ARCH REVIEW = PASS WITH CONDITIONS
(+ OWNER DECISION P0 CORRECTION 2026-08-11 — semantyka companyPricePln)
```

Można iść do **OWNER GO IMPLEMENT P0** dopiero po **potwierdzeniu Ownera** tej korekty, z obowiązkowymi CONDITIONS (szczególnie **C1** + **C-EMPTY**).

Nie wymaga pełnego ponownego ARCH REVIEW, o ile P0 nie naruszy DF (np. seed z mixed, nowy KV, marketQuotes dla robót, Bid wire).

---

## 24. CONDITIONS (lista obowiązkowa przed/przy P0)

1. **C1:** EXTEND `normalizeCatalogWork` (+ testy preserve PM + companyPrice + nowe pola).  
2. **C4:** świadome LWW store-level; bez cichego per-work merge.  
3. **C-FRESH:** osobny derive freshness OUR RATE; REUSE tylko TTL 90.  
4. **C7:** Owner edit OUR RATE ≠ mutacja `companyPricePln` · lookup ≠ mixed.  
4a. **C-EMPTY / C-NO-SEED:** brak OUR RATE = BRAK STAWKI · zero seed/fallback z `companyPricePln`.  
5. **C9:** historia robót ≠ `marketQuoteHistory`.  
6. **C3:** lista Nasz Katalog Robót = roboty definicji (nie material-only hosts).  
7. **C-UI:** unikanie dwóch konkurencyjnych cenników; mixed ≠ aktualna stawka w nowym katalogu.  
8. **C-LEGAL-IMPL:** research = BLOCKED stub do PASS gate.  
9. **C2:** P7 Bid resolve workId — poza P0; nie udawać 1:1 ATH→work już w P0.

---

## 25. BLOCKERS

```text
(brak)
```

KB.pl Legal BLOCKED **nie** jest blockerem architektury P0–P2 (Owner rates).

---

## 26. Zakazy przestrzegane w tym review

- ZERO implementacji  
- ZERO commit / push  
- ZERO adaptera KB.pl  
- ZERO live research  
- ZERO flip Legal Gate  
- ZERO zmian produkcji  

---

## 27. Następny krok

```text
POTWIERDZENIE OWNER (korekta P0)
  → OWNER GO IMPLEMENT P0
  (C1 + C-EMPTY + C7 obowiązkowe)
```

albo: Owner zmienia zakres → aktualizacja DF → krótki re-review.

---

## 28. ADDENDUM — Owner Decision P0 (2026-08-11)

Pełny tekst: [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md).

**Konflikt z pierwotnym ARCH REVIEW:** brak BLOCKER.  
Język „LEGACY = nadal używamy jako źródło wyceny” był **błędny** i jest **nadpisany**.

---

*Koniec ARCH REVIEW (+ addendum). Nie zmieniać kodu bez OWNER GO IMPLEMENT.*
