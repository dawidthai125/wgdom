# WGDOM — AI-COST-02 / COST-02-A DESIGN FREEZE (Modele cenowe)

> **ID:** COST-02-A  
> **Parent:** WGDOM-AI-COST-02  
> **STATUS:** **FROZEN** · **IMPLEMENT COMPLETE** · **PRODUCTION VERIFIED** · **CLOSED**  
> **Data:** 2026-07-27  
> **UI tip:** **2.65.62** · commit **`1e6fb12`**  
> **RELEASE:** [`WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md`](WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md)  
> **CLOSEOUT:** [`WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md`](WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE** (wymagane; bez Cloud Sync / Payroll)  
> **Wejście:** AUDIT PASS · RCA PASS · PLAN PASS · Arch Review PASS · PV PASS  
> **Zależność:** AI-COST-01 **ARCHITECTURE FROZEN** · **FIELD READY** · tip → [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **SSOT pokrewne:** [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`WGDOM-AI-COST-01-SSOT.md`](WGDOM-AI-COST-01-SSOT.md) · [`WGDOM-AI-COST-02-STARTING-POINT.md`](WGDOM-AI-COST-02-STARTING-POINT.md)  
> **Język:** polski

```text
One Bundle = One Goal:
  kontrolowane źródło cen (benchmark / region / aktualność)
  w łańcuchu S4 OfferBoqPriceSourceProvider
  — BEZ Kp / marży / oferty / scrapingu / Cloud Sync / Payroll
```

```text
AI-COST-01 = FROZEN — rozszerzaj obok, nie przebudowuj S1–S7.
Ten dokument ZAMRAŻA granice COST-02-A. Nie jest kodem ani planem implementacji.
IMPLEMENT zakazany do: Architecture Review PASS + Owner GO.
```

---

## PAYROLL SAFETY GATE (planowany wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE   (brak kasowania / migracji kluczy LP; brak nowego persist CK)
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE
Wynik:           ALL-NIE · FEATURE
Owner GO needed (CORE): NIE
Owner GO needed (slice IMPLEMENT): TAK (po Arch Review)
```

Jeżeli IMPLEMENT naruszy G2/G3 (np. cloud feed) → **STOP** · nowy DF / osobny slice.

---

## 1. Cel architektoniczny

Zamrozić **cienkie rozszerzenie** warstwy źródeł cen w AI Pricing Engine (S4): jedno **kontrolowane, legalne** źródło/benchmark cen komponentów (z metadanymi regionu i aktualności), podłączone przez istniejący kontrakt `OfferBoqPriceSourceProvider`, bez zmiany architektury AI-COST-01 i bez ingerencji w generator oferty.

**Efekt architektoniczny:** direct (`OfferBoqDocument` / `lineDirect`) może pochodzić także z kontrolowanego źródła zewnętrznego/oficjalnego; oferta końcowa nadal wyłącznie z `computeTenderBidProposal` via S6.

---

## 2. Zakres funkcjonalny (IN)

1. Dodanie **jednego** providera cen zgodnego z `OfferBoqPriceSourceProvider` do łańcucha S4.  
2. Użycie / uściślenie origin cenowego dla trafień z tego źródła (w tym przestrzeń `external_future` lub równoważny kind — bez mnożenia równoległych modeli).  
3. Metadane źródła widoczne w explainability RO: **źródło · region · aktualność · confidence · wymaga review**.  
4. REUSE odczytu istniejących, legalnych danych katalogowych / kontrolowanego ingestu Work Catalog (jeśli Owner wskaże to źródło) — **bez** nowego silnika oferty.  
5. Zachowanie preservacji `user_approved` / `user_changed` przy reprice.  
6. Testy jednostkowe/slice potwierdzające: provider · origin · zero Kp/marży · regresja Bid path (call-only).  
7. Tip / changelog / RR — wyłącznie w fazie release po IMPLEMENT (poza zakresem samego kodu silnika, ale w DoD release).

**Źródło danych (parametr Ownera — nie implementacja):**  
wyłącznie źródło **kontrolowane i legalne**, zatwierdzone przez Ownera przed IMPLEMENT.  
**Zakaz:** scraping ad-hoc Internetu / marketplace.

---

## 3. Zakres niefunkcjonalny

| Wymaganie | Zamrożenie |
|-----------|------------|
| Klasa zmiany | FEATURE / TEUX |
| Thin Slice | Jeden concern = modele cenowe w S4 |
| Performance | Bez ciężkiego I/O w pętli UI bez debounce; bez Sync Storm |
| Bezpieczeństwo danych | Brak sekretów w repo; brak scrapingu |
| Persist | **Bez** Cloud Sync · **bez** nowego KV · **bez** zmiany schema Company Knowledge |
| i18n UI | Etykiety PL (jeśli thin UI RO) |
| Regresja | Preservacja user · Bid Proposal path · STAB behaviors |
| Stabilization Window | IMPLEMENT tylko po Owner GO |

---

## 4. Ostateczna allowlista plików

| Plik | Dozwolona zmiana (granica) |
|------|----------------------------|
| `src/lib/tender-offer-boq-pricing-engine.ts` | Podpięcie providera / kolejność `leadingProviders` — **bez** przebudowy architektury silnika, **bez** Kp/marży |
| `src/lib/tender-offer-boq.ts` | Minimalne rozszerzenie origin / typów metadanych źródła — **bez** nowego modelu dokumentu |
| `src/lib/tender-offer-boq-controlled-price-source.ts` (**NOWY**, nazwa ostateczna w IMPLEMENT w tej roli) | Cienki moduł: provider + kontrakt odczytu kontrolowanego źródła — **jeden** concern |
| `src/lib/tender-offer-boq-explainability.ts` | RO: prezentacja origin / region / aktualność |
| `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx` | Wyłącznie thin UI RO (badge/hint źródła) — opcjonalne, jeśli wymagane AC |
| Istniejące API Work Catalog / marketQuotes / CSV adapters | **REUSE odczytu** — bez przebudowy Bid, bez nowego SSOT oferty |
| `scripts/test-cost-02a-controlled-price-source.mjs` (**NOWY**) | Testy slice |
| Regresja: istniejące `scripts/test-cost-s4*.mjs` / `test-cost-stab-01.mjs` (uruchomienie) | Bez zmiany kontraktu STAB; dopuszczalne asercje regresji jeśli konieczne |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | Wpis wersji UI po IMPLEMENT |
| `docs/AI/09_PRODUCTION_BASELINE.md` · `CURRENT-TASK.md` · RR COST-02-A | Tip / closeout po release |

**Zasada:** żaden plik spoza tej listy. Rozszerzenie allowlisty = **nowy DF** lub amend DF + Owner GO.

---

## 5. Ostateczna bloklista plików

| Plik / obszar | Zakaz |
|---------------|-------|
| `src/lib/tenders-bid-calculator.ts` | Logika Kp / marży / `recommendedBid` / costStack |
| `src/lib/tender-offer-boq-bid-adapter.ts` | Kontrakt S6 / `offer_boq_ai` / omijanie Bid |
| `src/lib/tender-offer-boq-mapping.ts` | S2 |
| `src/lib/tender-offer-boq-cost-intelligence.ts` | S3 (poza osobnym DF) |
| `src/lib/tender-offer-boq-company-knowledge.ts` | Schema / architektura CK |
| `src/lib/tender-offer-boq-component-edit.ts` | Zmiana semantyki preservacji (dozwolone tylko jeśli regresja — preferuj zero diff) |
| `src/lib/tender-offer-boq-validation.ts` | Nowy scoring oferty / drugi quality engine |
| Parsery ATH/PDF / dossier / snapshot builders | Rewrite „pod ceny” |
| `src/lib/cloud-sync.ts` · `CloudLoader.tsx` · Edge `make-server-*` | CORE / Cloud Sync |
| Payroll / PWRB / Domain Push / `kw-week-*` | Payroll |
| Shell / GDS / Dashboard Body / routing `App.tsx` | Poza slice (wyjątek: zero) |

---

## 6. Granice odpowiedzialności komponentów

| Komponent | Robi (COST-02-A) | Nie robi |
|-----------|------------------|----------|
| **Controlled price provider (S4)** | Zwraca cenę jednostkową komponentu + origin + metadata + confidence | Kp, marża, bid, VAT, brutto |
| **Pricing Engine S4** | Orkiestruje łańcuch providerów → `lineDirect` | Przebudowa strategii S3; oferta |
| **OfferBoqDocument** | Nadal SSOT kosztu bezpośredniego | Nowy równoległy model wyceny |
| **Explainability** | RO transparentność źródła | Edycja cen / auto-naprawa |
| **Company Knowledge** | Sąsiad w łańcuchu (bez zmian schema) | Benchmark rynkowy |
| **Work Catalog** | Opcjonalne źródło danych REUSE | Kalkulator oferty |
| **Adapter S6** | Bez zmian — `offer_boq_ai` | Logika AI Cost / rynku |
| **Bid Proposal** | Jedyny generator oferty (REUSE call-only) | Dekompozycja przedmiaru / źródła rynkowe |
| **UI panel** | Hint/badge RO | Lokalne sumowanie oferty |

---

## 7. Kontrakty pomiędzy modułami

### 7.1 Wejście / wyjście providera (architektura)

```text
Wejście (konceptualnie):
  kontekst komponentu OfferBoq (kategoria, jm, sygnały mapowania)
  + kontrolowane źródło zatwierdzone Ownerem

Wyjście (konceptualnie):
  unitPricePln | null
  + priceOrigin (kind kontrolowany / external_future-równoważny)
  + metadata: region?, asOf/aktualność?, labelPl
  + confidence
  + requiresUserReview (gdy niepewność / brak świeżości)

Zakaz wyjścia:
  recommendedBid · kpPct · margin · VAT · brutto oferty
```

### 7.2 Łańcuch S4 (zamrożona zasada)

```text
leadingProviders / łańcuch:
  Company Knowledge (istniejący)
  + Controlled price source (COST-02-A)   ← nowy wpis
  + work_catalog · company_model · category_rate · heuristic
  → applyOfferBoqPricing
  → components + lineDirect
  → (bez Kp)
```

Dokładna pozycja względna CK vs controlled source = **decyzja DF zamrożona jako:**  
controlled source **nie zastępuje** decyzji użytkownika (`user_*`);  
controlled source **nie liczy** oferty;  
priorytet względem CK: **nie może kasować** chronionych komponentów przy reprice (STAB-1).

### 7.3 Ścieżka oferty (nienaruszalna)

```text
OfferBoqDocument (direct)
  → integrateOfferBoqWithBidProposal (offer_boq_ai)
  → computeTenderBidProposal
  → TenderBidProposal (Kp · marża · recommendedBid · costStack)
```

**Zakaz:** jakakolwiek lokalna formuła oferty w allowlistowanych plikach AI-COST.

### 7.4 Relacja do AI-COST-01 Freeze

- Pipeline S1–S7 **bez fork**.  
- Extension point = Freeze §6.1 (`OfferBoqPriceSourceProvider`).  
- Draft `WGDOM-AI-COST-01-ARCHITECTURE.md` pozostaje **SUPERSEDED**.

---

## 8. Punkty integracji

| ID | Punkt | Status w DF |
|----|-------|-------------|
| P1 | `OfferBoqPriceSourceProvider` / `leadingProviders` | **PRIMARY** |
| P2 | `applyOfferBoqPricing` | REUSE orkiestracji |
| P3 | Origin + metadata na komponencie | IN |
| P4 | Explainability RO | IN |
| P5 | Work Catalog odczyt (opcjonalnie) | REUSE |
| P6 | Company Knowledge | Sąsiad — bez schema change |
| P7 | S5 preservacja `user_*` | Invariant — nie łamać |
| P8 | S6 `integrateOfferBoqWithBidProposal` | Call-only / zero diff preferowane |
| P9 | `computeTenderBidProposal` | Call-only / zero diff |
| P10 | S7 | Skutek uboczny confidence — bez nowego silnika |

---

## 9. Blast Radius

| Strefa | Promień | Status |
|--------|---------|--------|
| S4 provider + typy origin + explain + testy | WĄSKI | Docelowy |
| Thin UI RO panel | WĄSKI | Opcjonalny |
| S5 reprice / S7 issues | SĄSIEDNI | Regresja wymagana |
| S6 / Bid | POŚREDNI (tylko direct) | Zero edycji Bid |
| S1–S3, parsery | ZERO | Wymagane |
| Cloud Sync / Payroll / Edge | ZERO | Wymagane |
| CK schema | ZERO | Wymagane |

**Werdykt blast radius:** WĄSKI FEATURE.

---

## 10. Acceptance Criteria

1. Istnieje provider kontrolowanego źródła podpięty do łańcucha S4 bez przebudowy architektury Pricing Engine.  
2. Trafienie źródła ustawia origin + metadata (region i/lub aktualność, o ile dostępne) + confidence.  
3. Brak ceny ze źródła → `null` + review — fail-loud, bez zgadywania oferty.  
4. **Zero** Kp / marży / VAT / brutto / `recommendedBid` w plikach AI-COST allowlist.  
5. Oferta nadal wyłącznie przez `integrateOfferBoqWithBidProposal` → `computeTenderBidProposal`.  
6. Reprice **nie** kasuje `user_approved` / `user_changed`.  
7. Company Knowledge schema **bez** zmian.  
8. **Zero** zmian `cloud-sync` / Edge / Payroll.  
9. **Zero** scrapingu.  
10. Testy slice PASS + regresja S4/STAB (istotne ścieżki) PASS.  
11. `npm run build` PASS.  
12. Changelog + tip `09` zgodne po release (faza po IMPLEMENT).  

---

## 11. Ryzyka

| ID | Ryzyko | Poziom | Kontrola DF |
|----|--------|--------|-------------|
| D1 | Ukryte liczenie oferty w providerze | WYSOKI | AC 4–5 · bloklista Bid |
| D2 | Konflikty kolejności CK vs controlled source | ŚREDNI | Invariant preservacji user · testy |
| D3 | Owner nie wskaże legalnego źródła | WYSOKI | IMPLEMENT BLOCKED do wskazania źródła |
| D4 | Pokusa cloud sync feedu | ŚREDNI | G3 NIE · bloklista cloud-sync |
| D5 | Rozszerzenie allowlisty „przy okazji” S6 | WYSOKI | Arch Review · amend DF zabroniony bez GO |
| D6 | Fałszywie wysoka confidence | ŚREDNI | `requiresUserReview` przy niepewności |
| D7 | Drift Work Catalog ↔ controlled source | ŚREDNI | Jedna reguła łańcucha; brak drugiego SSOT oferty |

---

## 12. Plan testów wysokiego poziomu

| Warstwa | Zakres | Cel |
|---------|--------|-----|
| Unit / slice | Nowy skrypt `test-cost-02a-*` | Provider zwraca cenę+origin+metadata; brak Kp w wynikach S4 |
| Regresja S4 | Istniejące testy pricing engine | Łańcuch nadal buduje components / lineDirect |
| Regresja STAB | Preservacja user przy reprice | `user_*` nietknięte |
| Bid path (call-only) | Integracja S6 → Bid na fixtures | `computeTenderBidProposal` użyte; brak lokalnej marży |
| Negatywne | Brak trafienia źródła | `null` + review; brak crash |
| Zakazy | Skan / asercje testowe | Brak scrapingu; brak zmian kontraktu S6 w diff |
| Build | `npm run build` | PASS |
| Gate | G1–G9 ALL-NIE | Potwierdzenie przed IMPLEMENT |

**Poza zakresem tego DF:** pełny RWAT produkcyjny (opcjonalny po PV — osobna decyzja Ownera).

---

## 13. Kryteria zakończenia implementacji

```text
IMPLEMENT COMPLETE (COST-02-A) gdy:
  □ Diff ⊆ allowlista DF
  □ Bloklista nietknięta (Bid / S6 kontrakt / cloud-sync / Payroll / CK schema)
  □ AC 1–11 spełnione
  □ Gate ALL-NIE potwierdzone
  □ Build PASS · testy slice + regresja PASS
  □ Brak drugiego kalkulatora / Kp / obejść SSOT
  □ Owner poprosił o commit (osobno) · push (osobno)
  □ Release report PL + tip w 09 po deploy
```

**Nie jest zakończeniem:** sam Design Freeze · sam Arch Review · sam kod bez testów.

---

## 14. Potwierdzenia bezwzględne

| Twierdzenie | Status |
|-------------|--------|
| Brak drugiego kalkulatora ofert | **POTWIERDZONE** |
| Brak drugiego źródła Kp i marży | **POTWIERDZONE** (wyłącznie Bid) |
| Brak obejścia `computeTenderBidProposal` | **POTWIERDZONE** |
| Brak obejścia `integrateOfferBoqWithBidProposal` | **POTWIERDZONE** |
| Brak obejścia `OfferBoqDocument` | **POTWIERDZONE** |
| Brak zmian architektury AI-COST-01 (rdzeń S1–S7) | **POTWIERDZONE** (tylko extension S4) |
| Brak zmian CORE | **POTWIERDZONE** |
| Brak zmian Payroll | **POTWIERDZONE** |
| Brak zmian Cloud Sync | **POTWIERDZONE** |

---

## 15. Zasady nadrzędne

| Zasada | Zamrożenie |
|--------|------------|
| REUSE FIRST | Provider w istniejącym S4 · Bid · OfferBoq · Catalog |
| SSOT FIRST | Direct = OfferBoq/S4 · Oferta = Bid · Tip = `09` |
| ZERO DUPLICATE LOGIC | Zakaz drugiego kalkulatora / formuły Kp w AI-COST |

---

## 16. Status procesu

| Etap | Status |
|------|--------|
| AUDIT | PASS |
| RCA | PASS |
| PLAN | PASS |
| DESIGN FREEZE | **FROZEN** (ten dokument) |
| Architecture Review | **PASS** |
| Owner GO IMPLEMENT | **PASS** |
| IMPLEMENT | **PASS** |
| BUILD · COMMIT · PUSH | **PASS** · **`1e6fb12`** |
| PRODUCTION VERIFY | **PASS** · UI **2.65.62** |
| POST RELEASE | **PASS** · [`RELEASE-REPORT`](WGDOM-AI-COST-02-COST-02-A-RELEASE-REPORT.md) |
| CLOSE | **PASS** · [`CLOSEOUT`](WGDOM-AI-COST-02-COST-02-A-CLOSEOUT.md) |

---

**DESIGN FREEZE · COST-02-A · FROZEN** · **CLOSED** · EPIC COMPLETE · PRODUCTION VERIFIED
