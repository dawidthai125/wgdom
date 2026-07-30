# SMART-PRICING-01 — PLAN

> **ID:** SMART-PRICING-01-PLAN  
> **EPIC:** **SMART-PRICING-01** — inteligentne uzupełnianie brakujących cen przy wycenie przetargu  
> **Etap:** **PLAN ONLY** · **DOCS ONLY**  
> **STATUS:** **PLAN COMPLETE · zaakceptowany** · DF **FROZEN** · AR **READY FOR OWNER GO** → [`SMART-PRICING-01-ARCHITECTURE-REVIEW.md`](SMART-PRICING-01-ARCHITECTURE-REVIEW.md)  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE** (oczekiwane przy IMPLEMENT)  
> **Wejście:** AUDIT **zaakceptowany** · Owner GO PLAN · [`SMART-PRICING-01-AUDIT.md`](SMART-PRICING-01-AUDIT.md)  
> **Zależności CLOSED (REUSE, nie ownership):** Product Quotes / `commitMarketQuotesImport` · MARKET-SYNC-01 **P0–P1** · COST-02-A `controlled_market` · Work Catalog P3.x  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zakaz:** IMPLEMENT · commit · push · OPS · scrapery · rewrite AI-COST / Cloud CORE / Payroll · IMPLEMENT bez Owner GO IMPLEMENT

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (SMART-PRICING-01):
  Warstwa DECYZJI przy braku ceny w wycenie.
  Quotes = SSOT rynku · MS = propozycje staging ·
  SMART = detect → evidence → decyzja (Odrzuć|One-shot|Zapisz).
  Zapisz Quotes = WYŁĄCZNIE commitMarketQuotesImport.
  BEZ drugiego toru publish · BEZ przejęcia MS/Quotes.
  DF FROZEN · AR READY FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Wejście z AUDIT (FROZEN w PLAN)

| Decyzja AUDIT | Status w PLAN |
|---------------|---------------|
| Nowy EPIC (≠ MS P2 ≠ hotfix AI-COST) | **FROZEN** |
| Product Quotes = SSOT ceny produkcyjnej rynku | **FROZEN** |
| MARKET-SYNC = supply propozycji (RO staging) | **FROZEN** |
| One-shot ≠ zapis Quotes | **FROZEN** |
| Zapis Quotes = tylko `commitMarketQuotesImport` | **FROZEN** |
| Kill Switch przy zapisie (jak MS P1) | **FROZEN** |
| Fuzzy OFF · brak scrapera / auto-accept | **FROZEN** |
| Roadmapa P0→P4 thin slices | **FROZEN** (szczegóły §8) |
| Session-first one-shot (O-SP-B rekomendacja) | **PLAN binding B1** |
| Save Quotes: Super Admin (O-SP-C rekomendacja) | **PLAN binding B2** |

**OUT (odziedziczone):** AI-COST rewrite · Cloud Sync CORE · Bid Calculator · Payroll · Scoring · parser · scraper/cron · auto-accept · fuzzy ON · N:M mapowanie · `enabledOrigins` DIY ON by default · drugi tor Quotes · PriceHistory (MS P2) · target-hack Bid.

---

## 1. Zasady inżynieryjne (weryfikacja PLAN)

| Zasada | Jak PLAN spełnia | Werdykt |
|--------|------------------|---------|
| **SSOT FIRST** | Trwały rynek = `CatalogWork.marketQuotes`; staging MS ≠ wycena; one-shot = ephemeral sesji | **PASS** |
| **REUSE FIRST** | Odczyt Quotes AS-IS · staging MS RO · match helpers MS · `commitMarketQuotesImport` · capture/restore Undo · Kill Switch MS | **PASS** |
| **ZERO DUPLICATE LOGIC** | Zakaz `applyMarketQuotesFromPreview` / ręcznego `marketQuotes` z SMART; jedyny save = commit; ranking providerów **nie** mutuje źródeł | **PASS** |
| **FEATURE-DATA ONLY** | Moduł `smart-pricing` + cienki UX wyceny; **0** edycji `cloud-sync.ts` · **0** nowego DATA_KEY cloud w P0–P3 (session) | **PASS** |
| **DATA FIRST** | Price Evidence regułowe · confidence/method · ranking konfiguracyjny · zero LLM jako źródło ceny | **PASS** |

---

## 2. Architektura modułu

### 2.1 Pozycjonowanie warstw

```text
┌─ WYCENA (OfferBoq / controlled_market) — AS-IS konsument ─┐
│  Trigger: pozycja bez użytecznej ceny rynkowej            │
└──────────────────────────┬────────────────────────────────┘
                           │ invoke (RO + decyzja)
                           ▼
┌─ SMART-PRICING-01 (FEATURE — ownership) ──────────────────┐
│  DetectMissingPrice                                        │
│  Lookup Product Quotes ──────────────┐                     │
│  Optional Lookup MARKET-SYNC staging─┤                     │
│  Build PriceEvidence[] + rank         │                     │
│  Present Evidence UI                  │                     │
│  Decision: Reject | OneShot | Save    │                     │
│     OneShot → session overlay only    │                     │
│     Save → orchestrate commit ONLY ───┼──► commitMarket…   │
└───────────────────────────────────────┴────────────────────┘
         │ RO                         │ RO (nie ownership)
         ▼                            ▼
┌─ Product Quotes SSOT ──┐   ┌─ MARKET-SYNC-01 P0–P1 ──────┐
│ marketQuotes (WC)      │   │ Staging MP/PQ · Accept/Pub  │
│ ownership: WC / MS Pub │   │ ownership: Market Sync      │
└────────────────────────┘   └─────────────────────────────┘
```

### 2.2 Granice odpowiedzialności

| Warstwa | Odpowiada za | **Nie** odpowiada za |
|---------|--------------|----------------------|
| **SMART-PRICING** | Detect braku · zbieranie Evidence · ranking prezentacji · one-shot sesji · wywołanie commit przy Save | Ownership staging MS · batch Accept/Publish · silnik średniej · Bid/AI-COST |
| **Product Quotes / WC** | SSOT `marketQuotes` · region · confidence komórki | UX decyzji w wycenie |
| **MARKET-SYNC** | Staging produktów · Match · Accept · Publish batch · Kill Switch definicja | Modal wyceny · one-shot |
| **controlled_market / OfferBoq** | Konsumpcja Quotes AS-IS po Save | Generowanie Evidence |

### 2.3 Potwierdzenia twarde (PLAN binding)

| # | Twierdzenie | Binding |
|---|-------------|---------|
| **T1** | One-shot **nie** zapisuje do Product Quotes | Brak call `commit*` / `apply*` przy One-shot |
| **T2** | Zapis do Product Quotes = **wyłącznie** `commitMarketQuotesImport` | Jedyny call site Save w SMART = orchestration → commit (jak MS `runMarketSyncPublish`) |
| **T3** | SMART **nie** tworzy alternatywnego mechanizmu publikacji | Zakaz bezpośredniego apply / saveWorkCatalog* Quotes / patch `marketQuotes` |
| **T4** | Ranking providerów zmienia **kolejność Evidence**, nie dane źródłowe | Pure sort key; staging/Quotes immutable w torze Propose |
| **T5** | Save respektuje `MARKET_SYNC_PUBLISH_ENABLED` (fail-closed w lib) | Ten sam Kill Switch co MS P1 |

### 2.4 Persystencja (PLAN)

| Dane | Store | Slice |
|------|-------|-------|
| Price Evidence (wynik lookup) | Ephemeral (compute) | P0–P3 |
| One-shot decyzje | **Session / in-memory** (binding B1) | P1+ |
| Preferencje rankingu providerów | FEATURE LS (np. `kw-smart-pricing-01-provider-rank`) — **nie** DATA_KEYS | P1+ |
| Product Quotes po Save | `kw-wgdom-work-catalog` via commit | P3 |
| Audit trail decyzji | BACKLOG P4 (FEATURE; cloud tylko + Owner GO CORE) | P4 |
| Nowy Cloud DATA_KEY | **NIE** w P0–P3 | — |

---

## 3. Workflow (FROZEN w PLAN → DF)

```text
[0] Kontekst wyceny (tender · pozycja · opc. workId / tekst / EAN)
      ↓
[1] DETECT — brak użytecznej ceny
      · brak Quotes dla work×region (lub poniżej min confidence / stale — próg DF)
      · lub brak mapowania na workId
      ↓
[2] SEARCH A — Product Quotes (priorytet)
      · jeśli workId znane → snapshoty origin×region
      · zbuduj PriceEvidence[] source=product_quotes
      ↓
[3] SEARCH B — MARKET-SYNC staging (opcjonalnie, gdy A puste lub user „Szukaj sklep”)
      · RO ProviderQuote / MarketProduct
      · match REUSE (EAN / SKU / alias / … · fuzzy OFF)
      · zbuduj PriceEvidence[] source=market_sync_staging
      ↓
[4] RANK — Provider Preference (tylko kolejność)
      ↓
[5] PRESENT — Price Evidence panel
      ↓
[6] USER DECISION
      a) Odrzuć     → koniec · brak mutacji
      b) One-shot   → session overlay na wycenę · ZERO Quotes
      c) Zapisz do Product Quotes
            → wymaga workId (N:1) · Confirm · Summary
            → Kill Switch ON
            → commitMarketQuotesImport ONLY
            → opc. Undo single (REUSE capture/restore)
```

### 3.1 Semantyka decyzji

| Decyzja | Quotes | Wycena (sesja) | Wymagania |
|---------|--------|----------------|-----------|
| **Odrzuć** | bez zmian | bez zmian | — |
| **One-shot** | **bez zmian** | overlay ceny rynkowej / materiału w kontekście oferty | Evidence wybrane · etykieta „tylko ta wycena” |
| **Zapisz do Product Quotes** | **TAK** via commit | po sukcesie kolejne runy widzą Quotes | workId · Confirm · KS ON · Super Admin (B2) |

---

## 4. Modele (kontrakt PLAN)

### 4.1 Price Evidence (obowiązkowy)

Kanoniczny obiekt propozycji prezentowany użytkownikowi i używany do decyzji:

| Pole | Typ (koncepcja) | Wymagane | Opis |
|------|-----------------|----------|------|
| `id` | string | tak | Stabilny id evidence w sesji |
| `source` | enum | tak | `product_quotes` \| `market_sync_staging` \| (BACKLOG inne) |
| `price` | number | tak | Cena brutto PLN (jm zgodna z kontekstem) |
| `currency` | string | tak | Domyślnie `PLN` |
| `acquiredAt` | ISO string | tak | Data pozyskania (Quotes.`updatedAt` lub Quote.`importedAt`) |
| `confidence` | number 0..1 | tak | Z Quotes / Match |
| `matchJustification` | object | tak | Uzasadnienie dopasowania |
| `matchJustification.method` | enum | tak | `ean` \| `provider_sku` \| `mfr_name_unit` \| `alias` \| `manual` \| `direct_work_quote` |
| `matchJustification.detail` | string | tak | Np. „EAN 590…”, „SKU LM-1001”, „Quotes origin=wgdom region=wroclaw” |
| `provider` | string \| null | opc. | `leroy` / `castorama` / `wgdom` / … |
| `origin` | MarketQuoteOriginId \| null | opc. | Do Save → komórka Quotes |
| `workId` | string \| null | opc. | Wymagane przy Save |
| `regionCode` | MarketRegionCode \| null | opc. | Domyślnie `activeRegion` |
| `unit` | string \| null | opc. | Kontrola zgodności jm |
| `warnings` | string[] | opc. | np. alias low / unit mismatch |
| `rawRef` | opaque | opc. | Id ProviderQuote / klucz Quotes — bez mutacji źródła |

**Invariant:** budowa Evidence = **pure projection** ze źródeł; nie zapisuje do staging ani Quotes.

### 4.2 Missing Price Context

| Pole | Opis |
|------|------|
| `tenderId` / `lineRef` | Kontekst wyceny |
| `workId` | Jeśli znany |
| `query` | Tekst / EAN / SKU do search B |
| `regionCode` | Region lookup |
| `reason` | `no_quotes` \| `low_confidence` \| `unmapped` \| `stale` (próg DF) |

### 4.3 One-shot Overlay (session)

| Pole | Opis |
|------|------|
| `lineRef` | Pozycja wyceny |
| `evidenceId` | Wybrane Evidence |
| `price` | Skopiowana z Evidence |
| `appliedAt` | ISO |
| `actorAdminId` | Kto |

**Invariant:** overlay **nie** jest `marketQuotes`; znika z sesją (P1–P3).

### 4.4 Provider Preference (ranking)

| Element | Opis |
|---------|------|
| **Cel** | Kolejność listy Evidence |
| **Input** | Ordered list provider/origin ids (FEATURE LS) |
| **Algorytm** | Sort Evidence: (1) preferencja providera, (2) confidence desc, (3) acquiredAt desc, (4) id |
| **Zakaz** | Mutacja ceny / confidence / staging / Quotes |
| **Default** | Np. `wgdom` → `leroy` → `castorama` → pozostałe (DF zamrozi listę) |

```text
rank(evidence[], prefs[]) → evidence[]  // pure · stabilny · bez I/O
```

---

## 5. Save path (P3) — orchestration

```text
User: Zapisz do Product Quotes
  → Guard: Super Admin · workId · Evidence.ok · unit OK · nie conflict
  → Kill Switch MARKET_SYNC_PUBLISH_ENABLED === true
  → Build MarketCsvPreviewReport (in-memory) z Evidence
  → (opc.) Delta vs istniejące Quotes
  → Confirm Summary
  → commitMarketQuotesImport(preview)   ← JEDYNY WRITE
  → fail → lokalny restore w commit
  → success → opc. Undo token (capture przed commit)
```

**Zakaz w SMART:** `applyMarketQuotesFromPreview` poza commit · `saveWorkCatalog*` z ręcznym `marketQuotes` · Publish bez KS.

---

## 6. Acceptance Criteria

| ID | Kryterium |
|----|-----------|
| **AC-SP-1** | Detect braku ceny działa w kontekście wyceny bez mutacji Quotes/MS |
| **AC-SP-2** | Lookup Quotes ma priorytet przed MS staging |
| **AC-SP-3** | MS staging jest opcjonalny i **read-only** |
| **AC-SP-4** | Każda propozycja = kompletne **Price Evidence** (§4.1) |
| **AC-SP-5** | Ranking providerów zmienia tylko kolejność |
| **AC-SP-6** | Odrzuć = zero side-effects na Quotes/MS |
| **AC-SP-7** | One-shot = session only · fingerprint Quotes **bez zmian** |
| **AC-SP-8** | Zapisz = wyłącznie `commitMarketQuotesImport` (K-SP-1) |
| **AC-SP-9** | Kill Switch OFF ⇒ Save zablokowany w lib (nie tylko UI) |
| **AC-SP-10** | Brak drugiego toru publish / apply z SMART |
| **AC-SP-11** | Fuzzy OFF · brak scrapera · brak auto-accept |
| **AC-SP-12** | SMART nie przejmuje Accept/Publish batch MS |
| **AC-SP-13** | Save ≠ włączenie DIY w `enabledOrigins` |
| **AC-SP-14** | Gate ALL-NIE · FEATURE-DATA · Super Admin na Save (B2) |

---

## 7. KPI

| ID | Target |
|----|--------|
| **K-SP-1** | Jedyny write Quotes z SMART = commit path — **PASS** |
| **K-SP-1a** | One-shot · Quotes fingerprint unchanged — **PASS** |
| **K-SP-1b** | Kill Switch OFF → Save commit count **0** — **PASS** |
| **K-SP-1c** | Evidence fields complete (source·price·acquiredAt·confidence·justification) — **PASS** |
| **K-SP-1d** | Rank prefs reorder only — source payload hash unchanged — **PASS** |
| **K-SP-2** | ≥1 scenariusz Quotes-hit + ≥1 MS-staging-hit (sandbox) — **PASS** |
| **K-SP-3** | False auto-save — **0** |
| **K-SP-5** | Brak regresji AI-COST / Cloud CORE / Bid / MS P0–P1 / Payroll — **PASS** |

---

## 8. Roadmapa slice’ów (PLAN → DF per slice lub DF epicki z fazami)

| Slice | Cel | IN | OUT |
|-------|-----|----|-----|
| **P0** | Detect & surface RO | Missing context · badge/licznik · deep-link Biblioteka/MS | Evidence · decyzje · save |
| **P1** | Propose from Quotes + One-shot + Rank prefs | Evidence z Quotes · session overlay · ranking LS | MS staging · Save commit |
| **P2** | Propose from MS staging RO | Evidence z staging · warn match | Auto-publish · fuzzy |
| **P3** | Persist Save | Orchestration → commit · Summary · KS · Undo | Drugi tor · enabledOrigins ON |
| **P4** | Audit trail (opc.) | Log decyzji FEATURE | Cloud CORE bez GO |

**Rekomendacja DF:** DF epicki z fazami P0–P3 **albo** DF per slice — decyzja Ownera w checklist §11. PLAN zakłada **jeden DF epicki** z wyraźnymi fazami IN/OUT (mniej driftu kontraktu Evidence).

---

## 9. Ryzyka (PLAN — mitygacje)

| ID | Sev | Mitygacja PLAN |
|----|-----|----------------|
| R-SP-01 false match | P0 | Evidence + justification · Confirm Save · warn method · fuzzy OFF |
| R-SP-02 one-shot≠Quotes | P0 | AC-SP-7 · etykiety UI · K-SP-1a |
| R-SP-03 pollution Quotes | P1 | Super Admin · Summary · KS · single-item Save w P3 |
| R-SP-10 drugi tor | P0 | T2/T3 · allowlist · test static |
| R-SP-11 AI-COST coupling | P0 | OUT rewrite · cienki entry z wyceny |
| R-SP-12 KS bypass | P0 | Check w lib przed commit |
| R-SP-13 dup match | P1 | REUSE helpers MS |
| R-SP-14 cloud one-shot | P1 | Session-only P1–P3 |
| R-SP-15 scraper | P0 | OUT |
| R-SP-16 Payroll/CORE | P0 | Gate · allowlist |

---

## 10. Allowlist / denylist (szkic pod DF)

### Dozwolone (orientacyjnie)

| Obszar |
|--------|
| `src/lib/smart-pricing/**` — detect · evidence · rank · one-shot session · save orchestration→commit |
| Cienki UX w module wyceny / OfferBoq (entry + panel Evidence) — **bez** rewrite silnika Bid |
| FEATURE LS preferencji rankingu |
| Testy `scripts/test-smart-pricing-01-*.mjs` |
| CHANGELOG / Guide przy IMPLEMENT |

### Zakazane

| Obszar |
|--------|
| `cloud-sync.ts` · nowe `DATA_KEYS` |
| Bezpośredni `applyMarketQuotesFromPreview` / ręczny `marketQuotes` |
| Przejęcie / fork Accept-Publish MS |
| AI-COST · Bid calculator · Payroll · parser · scraper |
| Włączenie DIY `enabledOrigins` „przy okazji” Save |

---

## 11. Checklist DESIGN FREEZE (po PLAN)

| # | Kontrola DF | Oczekiwane |
|---|-------------|------------|
| DF-1 | Evidence fields §4.1 zamrożone | PASS |
| DF-2 | Workflow §3 + semantyka decyzji | PASS |
| DF-3 | T1–T5 (One-shot / commit-only / rank) | PASS |
| DF-4 | Provider Preference pure sort | PASS |
| DF-5 | Persystencja session / brak DATA_KEY P0–P3 | PASS |
| DF-6 | Kill Switch + Super Admin Save | PASS |
| DF-7 | Slice IN/OUT P0–P3 | PASS |
| DF-8 | Allowlist §10 | PASS |
| DF-9 | OUT §0 · zasady §1 | PASS |
| DF-10 | O-SP-* zamknięte lub jawnie FROZEN | PASS |

**DF PASS** → Architecture Review.

---

## 12. Checklist ARCHITECTURE REVIEW

| # | Kontrola AR | Oczekiwane |
|---|-------------|------------|
| AR-1 | Zgodność AUDIT + PLAN | PASS |
| AR-2 | SMART nie przejmuje MS/Quotes ownership | PASS |
| AR-3 | Quotes SSOT · MS RO supply | PASS |
| AR-4 | One-shot zero Quotes write | PASS |
| AR-5 | Save = tylko `commitMarketQuotesImport` | PASS |
| AR-6 | Brak alternatywnego publish | PASS |
| AR-7 | Rank nie mutuje źródeł | PASS |
| AR-8 | Evidence kompletne | PASS |
| AR-9 | KS fail-closed w lib | PASS |
| AR-10 | SSOT/REUSE/ZERO DUP/FEATURE-DATA/DATA FIRST | PASS |
| AR-11 | Gate ALL-NIE | PASS |
| AR-12 | OUT AI-COST/Cloud CORE/Payroll/scraper | PASS |

**AR PASS** → Owner GO IMPLEMENT (per slice lub epicki — wg DF).

---

## 13. Checklist OWNER GO

### GO PLAN (ten dokument) — **WYDANE**

| | |
|--|--|
| Owner GO PLAN | **TAK** (2026-07-30) |
| AUDIT accepted | **TAK** |

### GO DESIGN FREEZE (następny)

| Check | Wymagane |
|-------|----------|
| PLAN COMPLETE · READY FOR DF | ten plik |
| Jawne Owner GO DF | **oczekiwane** |
| Zamknięcie O-SP-B/C/D/E lub FROZEN bindingi PLAN | B1/B2 już w PLAN; reszta w DF |

### GO IMPLEMENT (później)

| Check | Wymagane |
|-------|----------|
| DF FROZEN | TAK |
| AR PASS | TAK |
| Owner GO IMPLEMENT | TAK (per slice zalecane: najpierw P0) |
| Gate G1–G9 ALL-NIE | TAK |
| Build/Test plan z AC/KPI | TAK |

### GO RELEASE (później)

| Check | Wymagane |
|-------|----------|
| OV · AC · KPI | PASS |
| Standard workflow release projektu | TAK |

---

## 14. Otwarte decyzje → DF (O-SP)

| ID | PLAN binding / do DF |
|----|----------------------|
| **O-SP-A** | EPIC potwierdzony (GO PLAN) |
| **O-SP-B** | **B1 session-first** one-shot |
| **O-SP-C** | **B2 Super Admin** na Save |
| **O-SP-D** | SMART P2 wolno czytać MS P1 staging (**TAK**) |
| **O-SP-E** | Priorytet vs CM-04 P3 / MS P2 — **poza** DF SMART (Owner osobno) |
| **O-SP-F** | Próg „stale” / min confidence Detect — **DF** |
| **O-SP-G** | Default lista preferencji providerów — **DF** |
| **O-SP-H** | DF epicki vs DF per slice — **rekomendacja PLAN: epicki z fazami** |

---

## 15. WERDYKT PLAN

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 PLAN COMPLETE
READY FOR DESIGN FREEZE

Architektura: warstwa decyzji nad Quotes + MS (bez przejęcia)
Workflow: Detect → Quotes → (opc.) MS → Evidence → Rank → Decision
Model: Price Evidence (source·price·acquiredAt·confidence·justification)
Rank: preferencje providerów = sort only
T1 One-shot ≠ Quotes write
T2/T3 Save = tylko commitMarketQuotesImport · brak alt publish

Zasady: SSOT · REUSE · ZERO DUP · FEATURE-DATA · DATA FIRST = PASS

NEXT: Owner GO → DESIGN FREEZE
      Nie IMPLEMENT · nie commit · nie push · nie P2 MS
════════════════════════════════════════════════════════
```

---

## 16. Artefakty

| Dokument | Rola |
|----------|------|
| [`SMART-PRICING-01-AUDIT.md`](SMART-PRICING-01-AUDIT.md) | Wejście zaakceptowane |
| **Ten plik** | **SSOT PLAN** · READY FOR DF |
| [`SMART-PRICING-01-PLAN-COMPLETE.md`](SMART-PRICING-01-PLAN-COMPLETE.md) | Marker kompletności |
| DF (następny) | `SMART-PRICING-01-DESIGN-FREEZE.md` — tylko po Owner GO DF |
| MS P1 | [`MARKET-SYNC-01-P1-CLOSEOUT.md`](MARKET-SYNC-01-P1-CLOSEOUT.md) |
