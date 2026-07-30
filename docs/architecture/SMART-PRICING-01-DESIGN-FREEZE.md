# SMART-PRICING-01 — DESIGN FREEZE

> **ID:** SMART-PRICING-01-DESIGN-FREEZE  
> **EPIC:** **SMART-PRICING-01** — warstwa decyzyjna przy braku ceny w wycenie  
> **STATUS:** **DESIGN FREEZE · FROZEN** · AR **READY FOR OWNER GO** · **IMPLEMENT P0 CLOSED / RELEASED** → [`SMART-PRICING-01-P0-CLOSEOUT.md`](SMART-PRICING-01-P0-CLOSEOUT.md) · tip **2.65.86** · **`9ca4a4e5`** · **P1 ZABLOKOWANY** do Owner GO  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA · Gate G1–G9 **ALL-NIE**  
> **Wejście:** PLAN **zaakceptowany** · Owner GO DF · [`SMART-PRICING-01-PLAN.md`](SMART-PRICING-01-PLAN.md) · [`SMART-PRICING-01-AUDIT.md`](SMART-PRICING-01-AUDIT.md)  
> **Zależności CLOSED (REUSE):** Product Quotes · `commitMarketQuotesImport` · MARKET-SYNC-01 **P0–P1** · COST-02-A  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (SMART-PRICING-01):
  Zamrozić warstwę DECYZJI wyceny:
  Detect → Quotes → (opc.) MS staging → Price Evidence →
  Resolution Policy + Decision Confidence →
  Odrzuć | One-shot (sesja) | Zapisz (commit ONLY).
  SMART ≠ ownership Publish MS · Quotes = SSOT rynku.
  BEZ alt publish · BEZ AI-COST rewrite · BEZ Cloud CORE.

AR: READY FOR OWNER GO
IMPLEMENT P0: CLOSED / RELEASED (2.65.86 · 9ca4a4e5)
P1+ zakazany do Owner GO
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony wynik przed IMPLEMENT)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE*  (*FEATURE: one-shot session + provider rank LS — bez migracji LP)
G3 Cloud Sync:   NIE   (brak edycji cloud-sync.ts · brak nowego DATA_KEY w P0–P3)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA
Owner GO CORE: NIE
Owner GO IMPLEMENT: dopiero po Arch Review PASS + jawne GO
Uwaga: write Quotes wyłącznie przez REUSE commitMarketQuotesImport / router — nie CORE rewrite.
```

---

## 1. Decyzje architektoniczne FROZEN (Owner + PLAN)

| ID | Decyzja | Status |
|----|---------|--------|
| **D-SP-1** | SMART = **wyłącznie warstwa decyzyjna** (detect · evidence · rank · decyzja · orchestration Save) | **FROZEN** |
| **D-SP-2** | Product Quotes = **SSOT** cen rynku produkcyjnego | **FROZEN** |
| **D-SP-3** | MARKET-SYNC = **wyłączny właściciel procesu Publish** (Accept/Publish batch · staging ownership) | **FROZEN** |
| **D-SP-4** | One-shot = **wyłącznie** kontekst bieżącej wyceny (session) · **zero** zapisu Quotes | **FROZEN** |
| **D-SP-5** | Zapis Quotes = **wyłącznie** `commitMarketQuotesImport` · brak alt publish | **FROZEN** |
| **D-SP-6** | Price Evidence — pola obowiązkowe §4.1 (w tym `provider`, `matchMethod`, `matchDetail`, `region` jeśli dostępny) | **FROZEN** |
| **D-SP-7** | **Price Resolution Policy** §5 — ranking · preferencje biznesowe · preferowany dostawca przy małej Δ ceny | **FROZEN** |
| **D-SP-8** | **Decision Confidence** §6: `READY` · `REVIEW` · `MANUAL` | **FROZEN** |
| **D-SP-9** | Kill Switch `MARKET_SYNC_PUBLISH_ENABLED` przy Save · fail-closed w **lib** | **FROZEN** |
| **D-SP-10** | Save Quotes: **Super Admin only** | **FROZEN** |
| **D-SP-11** | Fuzzy matching **OFF** · brak scrapera · brak auto-accept | **FROZEN** |
| **D-SP-12** | Lookup order: Quotes **najpierw** · MS staging **opcjonalnie** | **FROZEN** |
| **D-SP-13** | Region Save / lookup default = **`activeRegion`** katalogu | **FROZEN** |
| **D-SP-14** | Persist one-shot = **session/in-memory**; rank prefs = FEATURE LS; **brak** nowego Cloud DATA_KEY P0–P3 | **FROZEN** |
| **D-SP-15** | Save ≠ włączenie DIY w `enabledOrigins` | **FROZEN** |
| **D-SP-16** | Undo po Save = REUSE `capture`/`restore` · **single** | **FROZEN** |
| **D-SP-17** | DF **epicki z fazami** P0–P3 (nie osobne DF per slice na start) | **FROZEN** |

---

## 2. Zamknięcie otwartych decyzji PLAN (O-SP-*)

| ID PLAN | Decyzja DF |
|---------|------------|
| **O-SP-A** | EPIC potwierdzony |
| **O-SP-B** | One-shot = **session-first** (bieżąca wycena) |
| **O-SP-C** | Save = **Super Admin** |
| **O-SP-D** | SMART może czytać MS **P1** staging RO |
| **O-SP-E** | Priorytet vs CM-04 P3 / MS P2 = **poza** ten DF (osobny Owner) |
| **O-SP-F** | Min confidence Detect „użyteczna cena”: **0.50**; stale = `acquiredAt` starsze niż **180 dni** → traktuj jako brak (Detect) |
| **O-SP-G** | Default provider rank: `wgdom` → `leroy` → `castorama` → `kb_pl` → `interbud` → `sekocenbud` → remaining alpha |
| **O-SP-H** | DF epicki z fazami P0–P3 |
| **O-SP-I** | **Price delta preferencji dostawcy** (§5.3): próg **≤ 3%** względnej różnicy ceny (lub ≤ **0.50 PLN** abs — wygrywa warunek spełniony pierwszy) |
| **O-SP-J** | Decision Confidence — reguły §6 |

---

## 3. Cel EPIC / fazy (FROZEN)

| IN (P0–P3) | OUT |
|------------|-----|
| Detect braku ceny w wycenie | Ownership Publish MS |
| Price Evidence + Resolution Policy + Confidence | Alt publish Quotes / bezpośredni apply |
| One-shot sesji wyceny | Cloud DATA_KEY one-shot |
| Save via commit + KS + Summary | AI-COST / Bid / Payroll rewrite |
| Rank prefs FEATURE LS | Scraper · cron · fuzzy ON · auto-accept |
| MS staging RO (P2 fazy) | N:M · PriceHistory · enabledOrigins DIY ON |

### Fazy IMPLEMENT (kolejność FROZEN)

| Faza | IN | OUT tej fazy |
|------|----|--------------|
| **P0** | Detect + surface RO | Evidence UI pełne · decyzje · save |
| **P1** | Evidence z Quotes · Rank · Confidence · One-shot · Odrzuć | MS staging · Save commit |
| **P2** | Evidence z MS staging RO | Auto-publish |
| **P3** | Save → commit · Summary · KS · Undo | Drugi tor · enabledOrigins ON |
| **P4** | Audit trail FEATURE (opc.) | Cloud CORE bez GO |

---

## 4. Finalny workflow (FROZEN)

```text
[0] Kontekst bieżącej wyceny (tender · lineRef · opc. workId / query / EAN)
      ↓
[1] DETECT
      · brak Quotes work×region LUB confidence < 0.50 LUB stale > 180d
        LUB brak workId (unmapped)
      · Decision Confidence seed = MANUAL jeśli unmapped, inaczej TBD po evidence
      ↓
[2] SEARCH A — Product Quotes (obowiązkowy pierwszy)
      → PriceEvidence[] source=product_quotes
      ↓
[3] SEARCH B — MARKET-SYNC staging (opcjonalny)
      · gdy A puste LUB user jawnie „Szukaj w sklepach”
      · RO only · match REUSE MS (fuzzy OFF)
      → PriceEvidence[] source=market_sync_staging
      ↓
[4] PRICE RESOLUTION POLICY (§5)
      · rank providerów · preferencje biznesowe · preferowany dostawca przy małej Δ
      → ordered Evidence[]
      ↓
[5] DECISION CONFIDENCE (§6)
      · READY | REVIEW | MANUAL per kontekst / top evidence
      ↓
[6] PRESENT — Price Evidence + confidence badge
      ↓
[7] USER DECISION
      a) Odrzuć     → zero side-effects
      b) One-shot   → session overlay TYLKO bieżąca wycena · ZERO Quotes write
      c) Zapisz do Product Quotes
            · tylko gdy confidence pozwala Save (READY lub REVIEW+Confirm)
            · Super Admin · workId · Summary · Kill Switch ON
            · commitMarketQuotesImport ONLY
            · opc. Undo single
```

### 4.1 Semantyka decyzji (FROZEN)

| Decyzja | Quotes | Bieżąca wycena | MS Publish |
|---------|--------|----------------|------------|
| Odrzuć | bez zmian | bez zmian | bez zmian |
| One-shot | **bez zmian** | overlay sesji | bez zmian |
| Zapisz | **commit only** | po sukcesie widzi Quotes w kolejnych runach | **nie** zastępuje batch Publish MS |

---

## 5. Price Resolution Policy (FROZEN)

Cel: ustalić **kolejność i rekomendację** Evidence **bez** mutacji danych źródłowych (Quotes / staging).

### 5.1 Ranking providerów (sort key)

Domyślna kolejność preferencji (FEATURE LS nadpisuje, nie DATA_KEYS):

```text
wgdom > leroy > castorama > kb_pl > interbud > sekocenbud > (remaining A–Z)
```

Algorytm pure (stabilny):

```text
1) index w liście preferencji (niższy = lepszy; brak na liście = ∞)
2) confidence DESC
3) acquiredAt DESC (nowsze pierwsze)
4) id ASC (tie-break)
```

**Zakaz:** zmiana `price` / `confidence` / staging / Quotes w torze rank.

### 5.2 Preferencje biznesowe (reguły)

| Reguła | Efekt |
|--------|--------|
| **B1** | `source=product_quotes` sortuje **przed** `market_sync_staging` przy równym providerze (Quotes > staging) |
| **B2** | Evidence z `matchMethod` ∈ {`ean`,`provider_sku`,`direct_work_quote`,`manual`} przed `alias` / `mfr_name_unit` przy remisie conf±0.02 |
| **B3** | Unit mismatch → odsuń na koniec + `warnings` · nie auto-rekomenduj |
| **B4** | Conflict / unmatched MS → nie w puli rekomendacji Save |

### 5.3 Preferowany dostawca przy niewielkiej różnicy cen

Gdy po ranku top-2 Evidence spełniają:

- ten sam `workId` (lub oba bez workId w trybie tylko One-shot), **oraz**
- względna różnica ceny **≤ 3%** **lub** abs **≤ 0.50 PLN**,

wtedy UI **może** podnieść Evidence zgodne z **preferowanym dostawcą użytkownika** (FEATURE LS `preferredProvider`) na pozycję #1 **wyłącznie do rekomendacji**, bez zmiany pól Evidence.

```text
if nearTie(top, second) && preferredProvider set:
  promote evidence where provider === preferredProvider
else:
  keep pure rank
```

**Invariant:** promocja = reorder presentation; payload Evidence hash bez pól rank-meta pozostaje równy projekcji źródła.

---

## 6. Decision Confidence (FROZEN)

Klasy (per pozycja wyceny / po Resolution):

| Klasa | Znaczenie | Dozwolone akcje |
|-------|-----------|-----------------|
| **READY** | Wysoka pewność dopasowania i ceny | Odrzuć · One-shot · Zapisz (po Confirm) |
| **REVIEW** | Użyteczna propozycja, wymaga świadomej weryfikacji | Odrzuć · One-shot · Zapisz **tylko** po dodatkowym Confirm + widoczne warnings |
| **MANUAL** | Brak wiarygodnej auto-rekomendacji | Odrzuć · One-shot **tylko** z jawnie wybranego Evidence · **Zapisz zablokowany** do poprawy mapowania / MS Accept |

### 6.1 Reguły wyliczenia (FROZEN)

| Warunek | Klasa |
|---------|-------|
| Brak Evidence | **MANUAL** |
| Top Evidence `matchMethod` ∈ {`ean`,`direct_work_quote`} ∧ confidence ≥ **0.85** ∧ source=`product_quotes` ∧ unit OK | **READY** |
| Top Evidence confidence ≥ **0.75** ∧ method ∈ {`ean`,`provider_sku`,`manual`,`direct_work_quote`} ∧ unit OK | **READY** |
| Top Evidence confidence ≥ **0.60** ∨ method ∈ {`mfr_name_unit`,`alias`} ∨ source=`market_sync_staging` z linkiem work | **REVIEW** |
| Unit mismatch ∨ conflict ∨ confidence < **0.60** ∨ unmapped bez silnego EAN | **MANUAL** |

Przy konflikcie reguł: wygrywa **bardziej konserwatywna** klasa (MANUAL > REVIEW > READY).

---

## 7. Modele (FROZEN)

### 7.1 Price Evidence (obowiązkowe pola)

| Pole | Wymagane | Opis |
|------|----------|------|
| `source` | **tak** | `product_quotes` \| `market_sync_staging` |
| `provider` | **tak** | Id dostawcy / origin prezentacyjny (`wgdom`, `leroy`, …); `"unknown"` tylko gdy brak |
| `price` | **tak** | PLN |
| `acquiredAt` | **tak** | ISO — Quotes.`updatedAt` lub PQ.`importedAt` |
| `confidence` | **tak** | 0..1 |
| `matchMethod` | **tak** | `ean` \| `provider_sku` \| `mfr_name_unit` \| `alias` \| `manual` \| `direct_work_quote` |
| `matchDetail` | **tak** | Uzasadnienie tekstowe (EAN/SKU/alias/…) |
| `region` | **tak jeśli dostępny** | `regionCode`; `null` tylko gdy niedostępny w źródle |
| `id` | tak | Sesyjny |
| `currency` | tak | `PLN` |
| `workId` | opc. | Wymagane przy Save |
| `origin` | opc. | Do komórki Quotes przy Save |
| `unit` | opc. | |
| `warnings` | opc. | |
| `rawRef` | opc. | Bez mutacji źródła |

### 7.2 One-shot Overlay

| Pole | FROZEN |
|------|--------|
| Scope | **Tylko bieżąca wycena** (tender+lineRef sesji) |
| Persist | Session / in-memory |
| Quotes | **Nie zapisuje** |

### 7.3 Provider Preference Store

| Klucz FEATURE (szkic) | Zawartość |
|-----------------------|-----------|
| `kw-smart-pricing-01-provider-rank` | ordered providers |
| `kw-smart-pricing-01-preferred-provider` | opc. preferred przy near-tie |

**Nie** w `DATA_KEYS`.

---

## 8. Save path (FROZEN — faza P3)

```text
Zapisz:
  Super Admin ∧ workId ∧ Evidence
  ∧ DecisionConfidence ∈ {READY, REVIEW}
  ∧ (REVIEW ⇒ extra Confirm)
  ∧ MARKET_SYNC_PUBLISH_ENABLED === true
  → build in-memory MarketCsvPreviewReport
  → Summary → Confirm
  → commitMarketQuotesImport
  → Undo token opc. (capture przed)
```

**Zakaz:** `applyMarketQuotesFromPreview` poza commit · ręczne `marketQuotes` · Save z MANUAL · obejście KS.

---

## 9. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-SP-1** | SMART nie jest właścicielem Publish MS |
| **AC-SP-2** | Quotes pozostają SSOT rynku |
| **AC-SP-3** | Detect + workflow §4 bez mutacji źródeł przy Propose |
| **AC-SP-4** | Evidence zawiera wszystkie pola obowiązkowe §7.1 |
| **AC-SP-5** | Resolution Policy: rank + preferencje + near-tie preferred provider |
| **AC-SP-6** | Decision Confidence = READY\|REVIEW\|MANUAL wg §6 |
| **AC-SP-7** | One-shot tylko bieżąca wycena · Quotes fingerprint unchanged |
| **AC-SP-8** | Save = wyłącznie `commitMarketQuotesImport` |
| **AC-SP-9** | Brak alt publish / apply z SMART |
| **AC-SP-10** | KS OFF ⇒ Save commit count 0 (lib) |
| **AC-SP-11** | MANUAL ⇒ Zapisz zablokowany |
| **AC-SP-12** | Fuzzy OFF · zero scrapera · zero auto-accept |
| **AC-SP-13** | Save ≠ enabledOrigins DIY ON |
| **AC-SP-14** | Gate ALL-NIE · FEATURE-DATA · Super Admin Save |
| **AC-SP-15** | Fazy P0–P3 respektują IN/OUT §3 |

---

## 10. KPI (FROZEN)

| ID | Target |
|----|--------|
| **K-SP-1** | Jedyny write Quotes = commit — **PASS** |
| **K-SP-1a** | One-shot · Quotes FP unchanged — **PASS** |
| **K-SP-1b** | KS OFF → Save commits **0** — **PASS** |
| **K-SP-1c** | Evidence required fields present — **PASS** |
| **K-SP-1d** | Rank/near-tie reorder · source payload unchanged — **PASS** |
| **K-SP-1e** | Confidence class assignment deterministic — **PASS** |
| **K-SP-2** | Sandbox: Quotes-hit + MS-hit — **PASS** |
| **K-SP-3** | False auto-save — **0** |
| **K-SP-5** | Brak regresji AI-COST / MS ownership / Cloud CORE / Payroll — **PASS** |

---

## 11. Allowlist IMPLEMENT (FROZEN)

### Dozwolone

| Ścieżka / obszar |
|------------------|
| `src/lib/smart-pricing/**` — detect · evidence · resolution policy · confidence · one-shot session · save orchestration→**tylko** `commitMarketQuotesImport` |
| Cienki UX entry w wycenie / OfferBoq (panel Evidence · decyzje) — **bez** rewrite Bid/AI-COST |
| FEATURE LS: provider rank · preferred provider |
| Testy `scripts/test-smart-pricing-01-*.mjs` · fixtures |
| CHANGELOG / Guide przy IMPLEMENT |

### Zakazane

| Ścieżka / obszar |
|------------------|
| `src/lib/cloud-sync.ts` · nowe `DATA_KEYS` |
| Bezpośredni `applyMarketQuotesFromPreview` / ręczny `marketQuotes` |
| Przejęcie / fork Accept–Publish MARKET-SYNC · zmiana ownership MS |
| Rewrite AI-COST · Bid calculator · Payroll · parser |
| Scraper · cron · fuzzy ON · auto-accept |
| Włączenie DIY `enabledOrigins` przy Save |

---

## 12. Zgodność z zasadami (DF)

| Zasada | Spełnienie | Werdykt |
|--------|------------|---------|
| **SSOT FIRST** | Quotes = SSOT rynku; one-shot ≠ SSOT; staging MS ≠ wycena | **PASS** |
| **REUSE FIRST** | commit · capture/restore · MS match · KS · controlled_market RO | **PASS** |
| **ZERO DUPLICATE LOGIC** | Jedyny write = commit; rank nie duplikuje cen; brak alt publish | **PASS** |
| **FEATURE-DATA ONLY** | Brak Cloud CORE / Payroll; session + FEATURE LS | **PASS** |
| **DATA FIRST** | Evidence + Resolution + Confidence regułowe; zero LLM jako cena | **PASS** |

---

## 13. Checklist ARCHITECTURE REVIEW

| # | Kontrola | Oczekiwane |
|---|----------|------------|
| AR-1 | Zgodność AUDIT + PLAN + DF | PASS |
| AR-2 | SMART = tylko warstwa decyzyjna | PASS |
| AR-3 | Quotes SSOT · MS właściciel Publish | PASS |
| AR-4 | One-shot = bieżąca wycena · zero Quotes write | PASS |
| AR-5 | Save = tylko `commitMarketQuotesImport` | PASS |
| AR-6 | Brak alt publish | PASS |
| AR-7 | Price Evidence fields §7.1 | PASS |
| AR-8 | Resolution Policy §5 (rank · biznes · near-tie) | PASS |
| AR-9 | Decision Confidence READY/REVIEW/MANUAL §6 | PASS |
| AR-10 | KS fail-closed · Super Admin Save | PASS |
| AR-11 | Allowlist §11 · OUT §3 | PASS |
| AR-12 | SSOT/REUSE/ZERO DUP/FEATURE-DATA/DATA FIRST | PASS |
| AR-13 | Gate ALL-NIE | PASS |
| AR-14 | Brak zmian AI-COST / MS ownership w allowlist | PASS |

**AR PASS** → Owner GO IMPLEMENT (zalecane: najpierw faza **P0**).

---

## 14. Checklist OWNER GO

### GO DESIGN FREEZE — **WYDANE**

| | |
|--|--|
| Owner GO DF | **TAK** (2026-07-30) |
| PLAN accepted | **TAK** |

### GO ARCHITECTURE REVIEW

| Check | Wymagane |
|-------|----------|
| DF FROZEN (ten plik) | TAK |
| Checklist AR §13 ALL PASS | TAK |
| Jawne Owner GO AR / werdykt READY FOR OWNER GO | TAK |

### GO IMPLEMENT

| Check | Wymagane |
|-------|----------|
| AR PASS | TAK |
| Owner GO IMPLEMENT | TAK (prefer P0 first) |
| Gate ALL-NIE | TAK |
| Zakaz alt publish / AI-COST / MS ownership | TAK |

### GO RELEASE

| Check | Wymagane |
|-------|----------|
| OV · AC · KPI fazy | PASS |
| Workflow release projektu | TAK |

---

## 15. Ryzyka (FROZEN mitygacje)

| ID | Sev | Mitygacja DF |
|----|-----|--------------|
| R-SP-01 false match | P0 | Confidence MANUAL/REVIEW · Confirm · fuzzy OFF |
| R-SP-02 one-shot≠Quotes | P0 | D-SP-4 · AC-SP-7 · K-SP-1a |
| R-SP-03 pollution | P1 | Super Admin · Summary · KS · MANUAL block Save |
| R-SP-10 drugi tor | P0 | D-SP-5 · allowlist |
| R-SP-11 AI-COST | P0 | Zakaz rewrite · cienki UX |
| R-SP-12 KS bypass | P0 | Lib check |
| R-SP-MS | P0 | D-SP-3 — MS jedyny Publish owner |

---

## 16. WERDYKT DESIGN FREEZE

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 DESIGN FREEZE · FROZEN
ARCHITECTURE REVIEW: READY FOR OWNER GO
  → docs/architecture/SMART-PRICING-01-ARCHITECTURE-REVIEW.md

IMPLEMENT: ZABLOKOWANY do Owner GO IMPLEMENT
════════════════════════════════════════════════════════
```

---

## 17. Artefakty

| Dokument | Rola |
|----------|------|
| [`SMART-PRICING-01-AUDIT.md`](SMART-PRICING-01-AUDIT.md) | AUDIT accepted |
| [`SMART-PRICING-01-PLAN.md`](SMART-PRICING-01-PLAN.md) | PLAN accepted |
| **Ten plik** | **SSOT DESIGN FREEZE** |
| [`SMART-PRICING-01-DESIGN-FREEZE-COMPLETE.md`](SMART-PRICING-01-DESIGN-FREEZE-COMPLETE.md) | Marker |
| AR (SSOT) | [`SMART-PRICING-01-ARCHITECTURE-REVIEW.md`](SMART-PRICING-01-ARCHITECTURE-REVIEW.md) · **READY FOR OWNER GO** |
