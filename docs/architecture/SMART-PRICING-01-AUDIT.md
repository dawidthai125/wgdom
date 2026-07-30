# SMART-PRICING-01 — AUDIT (Warsztat architektoniczny)

> **ID:** SMART-PRICING-01-AUDIT  
> **EPIC (proponowany):** **SMART-PRICING-01** — inteligentne uzupełnianie **brakujących cen** przy wycenie przetargu  
> **Etap:** **AUDIT ONLY** · **DOCS ONLY**  
> **STATUS:** **AUDIT COMPLETE · zaakceptowany** · PLAN accepted · DF **FROZEN** · AR **READY FOR OWNER GO** → [`SMART-PRICING-01-ARCHITECTURE-REVIEW.md`](SMART-PRICING-01-ARCHITECTURE-REVIEW.md)  
> **Data:** 2026-07-30  
> **Język:** polski  
> **Zakaz:** IMPLEMENT · commit · push · OPS · scrapery · zmiany AI-COST / Cloud CORE / Payroll / MS ownership  
> **Tip (kontekst):** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · MARKET-SYNC-01 **P1 CLOSED** · CM-04 **P2 COMPLETE**  
> **Wejście REUSE (CLOSED, nie scope):** Product Quotes / `commitMarketQuotesImport` · MARKET-SYNC-01 P0–P1 · COST-02-A `controlled_market` · Work Catalog P3.x · CENY-MATERIAŁÓW-04

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 AUDIT
Werdykt: RECOMMENDED AS NEW EPIC — ZAAKCEPTOWANY
PLAN COMPLETE · DF FROZEN · AR READY FOR OWNER GO
  → docs/architecture/SMART-PRICING-01-ARCHITECTURE-REVIEW.md
NEXT = Owner GO IMPLEMENT · nie auto-start
════════════════════════════════════════════════════════
```

---

## 0. Cel warsztatu

| Pytanie Ownera | Cel AUDIT |
|----------------|-----------|
| Brakujące ceny materiałów przy wycenie przetargu | Czy potrzebujemy **osobnego** EPIC-u „smart fill”? |
| Product Quotes | Jak uczynić je **głównym** źródłem ceny produkcyjnej |
| MARKET-SYNC | Jak użyć go jako **źródła propozycji**, nie jako auto-publish |
| Workflow | brak → search → propozycje → decyzja → one-shot **lub** zapis Quotes |
| Separacja | Granica SMART-PRICING × MARKET-SYNC |
| Ryzyka | Biznes + tech — zanim PLAN/DF |

**OUT tego AUDIT:** szczegółowy design API · UI wireframe · lista plików IMPLEMENT · scraper · auto-accept · rewrite Bid.

---

## 1. Problem biznesowy (AS-IS)

### 1.1 Co boli

Podczas wyceny przetargu (OfferBoq / katalog / ścieżka `controlled_market`) operator napotyka pozycje, dla których:

| Sytuacja | Skutek |
|----------|--------|
| Brak `companyPricePln` / brak użytecznego `marketQuotes` | Spadek `controlled_market` · fallbacki · UNKNOWN · luka Bid vs ręka Ownera |
| Materiał „z półki” nie zmapowany na robotę WC | Nie da się wziąć ceny z Quotes bez decyzji mapowania |
| Cena jest w sklepie (staging MARKET-SYNC), ale **nie** w Quotes | Operator wie, że „jest gdzieś w sync”, ale nie ma **bezpiecznego** toru z kontekstu wyceny |
| Ręczne CSV / Biblioteka | Działa ops, **nie** w flow wyceny — kontekst przełączany, ryzyko pominięcia |

### 1.2 Czego problem **nie** jest

| Nie jest | Dlaczego |
|----------|----------|
| Batch sync sklepów DIY | To **MARKET-SYNC-01** (2–3 mies. · Preview · Accept · Publish) |
| Kalibracja marży Bid ≈ 1,6M | To residual **GAP-B** — **NOT RECOMMENDED** jako NEXT ([`GAP-B-AUDIT.md`](GAP-B-AUDIT.md)) |
| Parser / Heavy / Aggregate | AI-COST / COST-MULTI — **FROZEN / CLOSED**; nie mieszać |
| Master danych SKU sklepu w WC | WC = **robota**; Quotes = benchmark **roboty** ([`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md) §1.1–1.2) |

### 1.3 Semantyka krytyczna (wiązanie)

```text
Product Quotes (marketQuotes)  = cena rynkowa ROBOTY (origin×region)
MARKET-SYNC Product/Quote      = cena PRODUKTU sklepu (staging) → dopiero po linku N:1 → Quotes
SMART-PRICING (proponowany)    = decyzja w kontekście WYCENY gdy cena BRAKUJE
```

Mylenie produktu z robotą = false `controlled_market` = ryzyko biznesowe **P0**.

---

## 2. AS-IS — źródła i tory (fakty tip)

### 2.1 Product Quotes (główne źródło produkcyjne)

| Element | Fakt |
|---------|------|
| SSOT | `CatalogWork.marketQuotes` w `kw-wgdom-work-catalog` |
| Konsument wyceny | COST-02-A · `controlled_market` · OfferBoq (REUSE) |
| Zapis oficjalny | **Tylko** `commitMarketQuotesImport` (P3.2 · MARKET-SYNC P1 · CM-04) |
| Zakaz | Drugi tor `applyMarketQuotesFromPreview` / ręczny patch Quotes |
| Średnia | `enabledOrigins` — DIY (`leroy`/`castorama`) **default OFF** po P1 |

**Wniosek AUDIT:** SMART-PRICING **musi** traktować Quotes jako **jedyne źródło ceny produkcyjnej rynku** po decyzji „zapisz”. One-shot w wycenie **nie** równa się automatycznemu zapisowi Quotes.

### 2.2 MARKET-SYNC-01 (P0–P1 CLOSED)

| Element | Fakt |
|---------|------|
| Staging | MarketProduct · ProviderQuote · local `kw-market-sync-01-staging` |
| Publish | Accept → Guard → Dry Run → Delta → Summary → Kill Switch → **commit** |
| Kill Switch | `MARKET_SYNC_PUBLISH_ENABLED` default **OFF** |
| Mapowanie | `linkedWorkIds` **N:1** (P1) |
| P2 | **NIE** rozpoczęty — osobny AUDIT + GO |

**Wniosek AUDIT:** MARKET-SYNC = **supply / katalog propozycji sklepowych** + opcjonalny batch publish.  
SMART-PRICING = **demand / decyzja przy brakującej cenie w wycenie**.

### 2.3 Co już zamyka lukę „brak ceny” (częściowo)

| Mechanizm | Rola | Limit |
|-----------|------|--------|
| CM-04 zasianie Quotes | Więcej `controlled_market` | Ops offline · nie kontekst przetargu |
| GAP-A catalog cal | Overlay marketQuotes | Nie „szuka w sklepie” |
| P3.3 CSV import | Admin Biblioteka | Nie flow wyceny |
| MARKET-SYNC Preview/Accept | Propozycje sklepowe | Bez deep-linku z pozycji kosztorysu |

**Luka produktowa:** brak **kontrolowanego** workflow „ta pozycja wyceny nie ma ceny → pokaż propozycje → zdecyduj”.

---

## 3. Odpowiedzi na pytania warsztatu

### 3.1 Jak wykorzystać Product Quotes jako główne źródło cen?

| Priorytet lookup (koncepcja) | Opis |
|------------------------------|------|
| **1. Quotes SSOT** | Dla `workId` (lub zmapowanej roboty): odczyt `marketQuotes` · region `activeRegion` / hierarchy · confidence / freshness AS-IS silnika |
| **2. companyPricePln** | Cena firmy — osobna warstwa (nie rynek); SMART-PRICING **nie** nadpisuje jej bez jawnej decyzji |
| **3. Propozycja zewnętrzna** | Tylko gdy (1) nie daje użytecznej ceny — wtedy MARKET-SYNC / staging / inne origins |
| **4. Zapis zwrotny** | Wyłącznie przez **istniejący** `commitMarketQuotesImport` (+ Kill Switch / Guard polityki Ownera) |

**Zasady twarde (AUDIT binding → przyszły PLAN):**

1. Quotes = **jedyny** trwały zapis ceny rynkowej do produkcji.  
2. SMART-PRICING **nie** tworzy drugiego magazynu cen.  
3. One-shot w sesji wyceny = **ephemeral** (tylko ta oferta / ten run) — dopóki user nie wybierze „Zapisz do Quotes”.  
4. Brak auto-publish przy samym otwarciu propozycji.

### 3.2 Jak wykorzystać MARKET-SYNC jako źródło propozycji?

| Rola MARKET-SYNC | Rola SMART-PRICING |
|------------------|-------------------|
| Trzyma / odświeża staging produktów i provider quotes | Czyta staging **read-only** (lub snapshot propozycji) |
| Accept/Publish batch (ops) | **Nie** zastępuje Accept/Publish — może **deep-link** / „Otwórz w Market Sync” |
| `linkedWorkIds` N:1 | Może **sugerować** link, ale zapis linku = decyzja w MS lub jawny krok SMART |
| Kill Switch na Publish | SMART **nie** obchodzi KS przy zapisie Quotes |

**Model współpracy (koncepcja):**

```text
[Wycena] brak ceny
    → SMART: lookup Quotes (work)
    → jeśli brak: SMART: query propozycji z MARKET-SYNC staging
         (match EAN/SKU/nazwa — reguły z MS, fuzzy OFF jak P0/P1)
    → lista propozycji (provider · cena · confidence · czy linkedWork)
    → user: Odrzuć | One-shot w wycenie | Zapisz do Quotes (→ commit path)
```

**Zakaz:** SMART nie woła scrapera „na żywo” w P0 bez osobnej decyzji prawnej (dziedzictwo MARKET-SYNC AUDIT §1.3).

### 3.3 Workflow docelowy (produktowy — bez IMPLEMENT)

```text
[0] Wycena pozycji / materiału
      ↓
[1] DETECT: brak użytecznej ceny
      · brak Quotes / poniżej confidence / brak mapowania work
      ↓
[2] SEARCH (warstwy, w kolejności):
      A. Product Quotes (workId znane)
      B. MARKET-SYNC staging (produkt → opc. linked work)
      C. (BACKLOG) inne origins / katalog — poza P0
      ↓
[3] PROPOSALS (UI decyzji)
      · ranked · źródło · ostrzeżenia (mfr_name_unit / alias)
      · konflikt / unmatched = nie w batchu „zapisz”
      ↓
[4] USER DECISION
      a) Odrzuć / odłóż
      b) ONE-SHOT — użyj ceny tylko w tej wycenie (nie mutuj Quotes)
      c) SAVE TO QUOTES — po Confirm → tor commitMarketQuotesImport
         (+ opc. najpierw Accept/link w MS jeśli brak N:1)
      ↓
[5] AUDIT TRAIL (koncepcja)
      · kto · kiedy · źródło propozycji · one-shot vs saved
```

**Warianty decyzji — semantyka:**

| Decyzja | Wpływ na Quotes | Wpływ na wycenę |
|---------|-----------------|-----------------|
| One-shot | **Zero** | Lokalny override / temporary rate w kontekście oferty |
| Zapisz do Quotes | **TAK** (jedyny commit) | Kolejne wyceny / `controlled_market` widzą cenę |
| Odrzuć | Zero | Pozycja bez ceny / inny fallback AS-IS |

### 3.4 Separacja odpowiedzialności SMART-PRICING × MARKET-SYNC

| Concern | SMART-PRICING-01 | MARKET-SYNC-01 |
|---------|------------------|----------------|
| **Trigger** | Sesja wyceny przetargu · brak ceny | Ops batch · import CSV · Preview |
| **Aktor** | Kalkulator / admin wyceny | Super Admin sync sklepów |
| **Dane własne** | Decyzje one-shot · session proposals (FEATURE) | Staging Product/Quote |
| **Write Quotes** | Może **wywołać** istniejący commit (REUSE) | Publish batch (już P1) |
| **Accept sklepu** | Nie zastępuje | Własność MS |
| **Scraper / cron** | OUT | OUT (do osobnej decyzji) |
| **AI-COST core** | OUT (tylko konsumpcja RO / cienki UX) | OUT |
| **P2 MS** | Nie blokuje startu SMART (może REUSE P1) | Osobny AUDIT |

**Werdykt separacji:**  
SMART-PRICING **nie** powinien być P2 MARKET-SYNC.  
MARKET-SYNC **nie** powinien rosnąć o „modal w wycenie” bez utraty jasności ops sync.

**Współdzielone (REUSE, nie ownership):**

- model propozycji (cena · origin · confidence)  
- reguły match (EAN / SKU / … · fuzzy OFF)  
- `commitMarketQuotesImport`  
- Kill Switch przy zapisie Quotes  

### 3.5 Ryzyka

#### Biznesowe

| ID | Ryzyko | Sev | Mitygacja AUDIT |
|----|--------|-----|-----------------|
| R-SP-01 | False match produkt≠robota → zła cena w ofercie | **P0** | Propozycje + Confirm · warn method · N:1 · brak auto-accept |
| R-SP-02 | One-shot mylony z ceną firmową / Quotes | **P0** | Jawne etykiety · osobne ścieżki decyzji |
| R-SP-03 | Zanieczyszczenie Quotes masowym „Zapisz” | **P1** | Confirm · Summary · KS · limit batch · Super Admin na save |
| R-SP-04 | Oczekiwanie „AI samo wyceni przetarg” | **P1** | Scope: **uzupełnianie braków**, nie pełna wycena AI |
| R-SP-05 | Konflikt z polityką DIY origins OFF w średniej | **P1** | Save ≠ auto-enable `enabledOrigins` |

#### Techniczne / architektoniczne

| ID | Ryzyko | Sev | Mitygacja AUDIT |
|----|--------|-----|-----------------|
| R-SP-10 | Drugi tor zapisu Quotes | **P0** | Zakaz · tylko `commitMarketQuotesImport` |
| R-SP-11 | Coupling do AI-COST / Bid rewrite | **P0** | FEATURE cienki · RO consumers · Gate ALL-NIE |
| R-SP-12 | Obejście Kill Switch z UI wyceny | **P0** | Ten sam check lib co MS P1 |
| R-SP-13 | Duplikacja logiki match MS | **P1** | REUSE FIRST · shared pure helpers (po DF) |
| R-SP-14 | Persist one-shot w Cloud CORE / nowy DATA_KEY bez GO | **P1** | Domyślnie session/ephemeral; cloud tylko po Owner GO CORE |
| R-SP-15 | Scraper „żeby było smart” | **P0** | OUT · CSV/staging only jak MS |
| R-SP-16 | Payroll / Cloud Sync CORE | **P0** | Zakaz · Gate |

---

## 4. Czy to powinien być **nowy EPIC**?

### 4.1 Alternatywy rozważone

| Opcja | Ocena | Werdykt |
|-------|-------|---------|
| **A. Slice MARKET-SYNC-01 P2** | P2 naturalnie = PriceHistory / N:M / scraper policy — **inny** cel niż „brak w wycenie” | **ODRZUCONA** jako domyślna |
| **B. Hotfix AI-COST / OfferBoq** | Miesza CORE wyceny z ops cen; ryzyko Gate / FROZEN AI-COST | **ODRZUCONA** |
| **C. Tylko ops CM-04 / P3.3** | Nie rozwiązuje kontekstu przetargu | **NIEWYSTARCZAJĄCA** sama |
| **D. Nowy EPIC SMART-PRICING-01** | Osobny trigger · osobny UX decyzji · REUSE Quotes+MS | **REKOMENDOWANA** |
| **E. Pod-EPIC CENY-MATERIAŁÓW-04** | CM-04 = zasianie katalogu robót; smart fill = runtime wyceny | **NIE** jako default (kolizja nazwy/scope) |

### 4.2 Werdykt

```text
RECOMMENDED AS NEW EPIC: SMART-PRICING-01

Uzasadnienie:
  1. Inny trigger i aktor niż MARKET-SYNC (wycena vs batch sync).
  2. Inna semantyka decyzji (one-shot vs Publish Quotes).
  3. Quotes pozostają SSOT; MS pozostaje supply — czysta granica.
  4. Zmniejsza ryzyko „wszystko w Market Sync” i „wszystko w AI-COST”.
```

**Warunek startu PLAN:** jawne **Owner GO** na PLAN (po tym AUDIT).  
**Warunek IMPLEMENT:** Gate + DF + AR + Owner GO — jak zawsze.

---

## 5. Proponowana roadmapa (bez IMPLEMENT)

> Thin slices · Owner GO na każdy etap · **nie** auto-start.

| Slice | Cel | IN | OUT | Zależności |
|-------|-----|----|-----|------------|
| **P0 — Detect & Surface (RO)** | Wykryj brak użytecznej ceny w kontekście wyceny · pokaż status | Diagnostyka · licznik braków · deep-link do Biblioteki/MS | Propozycje · zapis · scraper | Tip Quotes + OfferBoq RO |
| **P1 — Propose from Quotes** | Propozycje **wyłącznie** z Product Quotes (work znany / mapowalny) | Lista propozycji · confidence · one-shot **w pamięci sesji** | Save Quotes · MS staging | P0 · silnik Quotes AS-IS |
| **P2 — Propose from MARKET-SYNC staging** | Propozycje z staging DIY (read-only) | Ranking · warn match · link do Accept MS | Auto-publish · fuzzy ON | MS P1 CLOSED · P1 SMART |
| **P3 — Persist to Quotes** | Decyzja „Zapisz” → **tylko** `commitMarketQuotesImport` | Confirm · Summary · Kill Switch · Undo single (REUSE) | Drugi tor write · enabledOrigins ON | P1–P2 · kontrakt MS P1 |
| **P4 — (opc.) Policy & audit trail** | Historia decyzji one-shot vs saved · limity | FEATURE audit (nie Cloud CORE bez GO) | Payroll · rewrite Bid | P3 |
| **P5+ BACKLOG** | N:M · live provider API · auto-suggest cron | — | Bez DF prawnego / Owner | — |

**Kolejność rekomendowana:** P0 → P1 → P2 → P3.  
**Równolegle do:** MARKET-SYNC P2 AUDIT (Owner wybór) · CM-04 P3 — **bez** mieszania scope w jednym commit.

**Anti-goals roadmapy:**

- Auto-accept propozycji  
- Scraper w P0–P3  
- Zapis `companyPricePln` z ceny sklepu bez jawnej decyzji  
- Edycja `cloud-sync.ts` / Payroll  
- Target-hack Bid  

---

## 6. PAYROLL SAFETY GATE (oczekiwany przy przyszłym IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE session / opc. flaga — bez migracji LP)
G3 Cloud Sync:   NIE   (brak edycji cloud-sync.ts; Quotes przez istniejący commit/router)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE*
G8 Shell:        NIE
G9 Routing:      NIE*

Wynik oczekiwany: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE (o ile brak nowego DATA_KEY cloud)
```

\*Jeśli P0 wymaga deep-link routingu — ocenić w PLAN; preferować istniejące wejścia Biblioteka / Przetargi bez nowego shell.

---

## 7. Zgodność z zasadami projektu

| Zasada | Spełnienie w AUDIT | Werdykt |
|--------|--------------------|---------|
| **SSOT FIRST** | Quotes = SSOT rynku produkcyjnego | **PASS** |
| **REUSE FIRST** | commit · MS staging · controlled_market RO | **PASS** |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiego write Quotes · REUSE match | **PASS** (binding PLAN) |
| **FEATURE-DATA ONLY** | Brak Cloud CORE / Payroll | **PASS** |
| **DATA FIRST** | Propozycje regułowe · fuzzy OFF dziedziczone | **PASS** |

---

## 8. Relacja do kandydatów NEXT

| Kandydat | Relacja do SMART-PRICING |
|----------|--------------------------|
| MARKET-SYNC-01 **P2** | **Osobny** — nie blokuje SMART; SMART P2 czyta staging P1 |
| CENY-MATERIAŁÓW-04 **P3** | Zasianie katalogu INNE — **komplementarne** (więcej Quotes = mniej braków) |
| GAP-B | **Nie** zamiennik — inny problem (stack marży) |
| I3 / TP200B | Inny scope |

**Rekomendacja priorytetu (nie wybór za Ownera):**  
SMART-PRICING ma sens **po** (lub równolegle thin z) dalszym zasiewem Quotes / MS — ale **AUDIT pozwala** start PLAN niezależnie, jeśli Owner chce najpierw UX braków w wycenie (P0 RO).

---

## 9. Otwarte decyzje Ownera (O-SP-*)

| ID | Pytanie | Opcje (AUDIT) |
|----|---------|----------------|
| **O-SP-A** | Czy zatwierdzasz **nowy EPIC** SMART-PRICING-01? | TAK → PLAN · NIE → zamknij / odłóż |
| **O-SP-B** | One-shot: tylko session vs persist w ofercie (KV tender)? | Session-first (rekomendacja P1) · tender persist (wymaga DF + Gate) |
| **O-SP-C** | Kto może „Zapisz do Quotes”? | Super Admin only (rekomendacja P3) · Admin wyceny |
| **O-SP-D** | Czy SMART P2 wolno czytać MS staging przed MS P2? | TAK (P1 MS wystarczy) · Czekaj na MS P2 |
| **O-SP-E** | Priorytet vs CM-04 P3 / MS P2 | Wybór Ownera — AUDIT nie narzuca |

---

## 10. Acceptance Criteria AUDIT (kompletność warsztatu)

| ID | Kryterium | Status |
|----|-----------|--------|
| AC-A-1 | Opisano użycie Quotes jako głównego źródła | **PASS** |
| AC-A-2 | Opisano użycie MARKET-SYNC jako propozycji | **PASS** |
| AC-A-3 | Workflow brak→search→propozycje→decyzja→one-shot/save | **PASS** |
| AC-A-4 | Separacja SMART × MS | **PASS** |
| AC-A-5 | Ryzyka biznes + tech | **PASS** |
| AC-A-6 | Werdykt: nowy EPIC + roadmapa | **PASS** |
| AC-A-7 | Zero IMPLEMENT / zero design freeze kodu | **PASS** |

---

## 11. WERDYKT KOŃCOWY

```text
════════════════════════════════════════════════════════
SMART-PRICING-01
AUDIT COMPLETE

REKOMENDACJA: NOWY EPIC (nie P2 MARKET-SYNC, nie hotfix AI-COST)

Product Quotes     = SSOT ceny produkcyjnej rynku
MARKET-SYNC        = źródło propozycji (staging) + opc. Publish
SMART-PRICING      = workflow decyzji przy BRAKU ceny w wycenie
Zapis Quotes       = wyłącznie commitMarketQuotesImport

Roadmapa: P0 Detect RO → P1 Propose Quotes → P2 Propose MS
          → P3 Persist Quotes → P4 Audit trail

NEXT: Owner GO na PLAN · nie auto-start IMPLEMENT · nie start P2 MS
════════════════════════════════════════════════════════
```

---

## 12. Artefakty / linki

| Dokument | Rola |
|----------|------|
| Ten plik | **SSOT AUDIT** SMART-PRICING-01 |
| [`MARKET-SYNC-01-P1-CLOSEOUT.md`](MARKET-SYNC-01-P1-CLOSEOUT.md) | Supply Publish CLOSED |
| [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md) | Semantyka produkt≠robota |
| [`CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P2-CLOSEOUT.md) | Zasianie Quotes / controlled_market |
| [`GAP-B-AUDIT.md`](GAP-B-AUDIT.md) | Nie mylić z kalibracją marży |
| [`NEXT-EPIC-CANDIDATES.md`](NEXT-EPIC-CANDIDATES.md) | Kandydaci — SMART do dopisania **po** Owner GO |

**Po akceptacji AUDIT:** PLAN (`SMART-PRICING-01-PLAN.md`) — tylko na polecenie Ownera.
