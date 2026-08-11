# REAL-SOURCE-LEGAL-ENABLEMENT-06

> **TRYB:** LEGAL ENABLEMENT AUDIT ONLY  
> **DATA:** 2026-08-11  
> **OWNER GO (ten dokument):** YES — *legal enablement analysis*  
> **OWNER GO ≠ Legal PASS** — nie traktujemy GO jako zgody na scraping  
> **CODE / COMMIT / PUSH / Legal flip / D1 flip / LIVE adapters:** **NONE**

```text
BASELINE (PRODUCTION VERIFIED — bez zmian w tym audycie)
────────────────────────────────────────────────────────
UI / tip:            2.66.25 · docs tip 5bf42364 · feature 7c61cc4e
Price Memory seed:   372 unique materialKeys (HISTORICAL PURCHASE / wgdom)
Cache-first / REUSE: PASS · fetch on HIT = 0
MARKET_SYNC_P3_LEGAL_GATE = OPEN
MMR_02_PRIMARY_SOURCE_STATUS = UNKNOWN
liveHttpEligible = false
SCRAPING = NOT APPROVED
Provider LIVE = NO
```

**Powiązane (czytane / nie powielane w całości):**

| Doc | Rola |
|-----|------|
| `REAL-SOURCE-AUDIT-01.md` | Brak public shelf API DIY |
| `REAL-SOURCE-LEGAL-ENABLEMENT-02.md` | Affiliate / Admitad §11 FAIL → Memory |
| `REAL-SOURCE-INTERNAL-PROCUREMENT-LEGAL-REVIEW-03.md` | Model contractor/buyer · A–I |
| `REAL-SOURCE-UNIFIED-LEGAL-GATE-04.md` | PRIMARY B2B Onninen/TIM · DIY scrape NOT PASS |
| `REAL-SOURCE-PRACTICAL-SOURCE-TEST-05.md` | DATA EXISTENCE WC kompakt PASS ≠ Legal automated |
| `MARKET-MATERIAL-PRICE-MEMORY-SEED-CLOSEOUT.md` | Seed CLOSED · live BLOCKED |
| `MARKET-PRICE-MEMORY-READINESS-AUDIT.md` | Architecture READY |

---

## 0. Centralne pytanie

> Czy **selective automated lookup** konkretnego produktu (MISSING/STALE materialKey)  
> na stronach **Leroy Merlin / Castorama / OBI** (direct retailer, regular price)  
> może **legalnie** zasilać **wewnętrzną** Price Memory WGDOM (storage + średnia + cross-tender reuse)?

### Short answer

| Source | Selective human browse + Own Accept | Selective **automated** site HTTP | Authorized feed/API → Memory | Final for LIVE adapters |
|--------|--------------------------------------|-----------------------------------|------------------------------|-------------------------|
| **Leroy Merlin** | NOT SPECIFIED / OPTION B (buyer note) | **FAIL** (Marketplace scrapowanie + DB + commercial copy ban) | Affiliate **REQUIRES AGREEMENT** (cel promocji) | **NOT VIABLE** (scrape) · **REQUIRES AGREEMENT** (official channel) |
| **Castorama** | NOT SPECIFIED / OPTION B | **FAIL / UNKNOWN≠PASS** (IP/DB + disruption; brak PASS) | Admitad Product Feed → Memory **FAIL §11** | **NOT VIABLE** (Admitad→Memory) · **REQUIRES AGREEMENT** (CastoPro/API) |
| **OBI** | NOT SPECIFIED / OPTION B | **FAIL / UNKNOWN≠PASS** (zakaz użycia „informacji” bez zgody + disruption + robots API) | Affiliate **REQUIRES AGREEMENT** | **REQUIRES AGREEMENT** · scrape **NOT APPROVED** |

```text
LEGAL GATE:     OPEN  (NOT READY FOR PASS for DIY automated)
D1:             UNKNOWN (no authorized DIY primary)
LIVE HTTP:      BLOCKED
IMPLEMENTATION: BLOCKED (live adapters)
```

**DATA EXISTENCE (TEST-05) ≠ LEGAL AUTOMATED ACCESS.**

---

## 1. Owner GO — zakres i granica

Owner GO dla **REAL-SOURCE-LEGAL-ENABLEMENT-06** oznacza:

1. ponowną analizę Terms / evidence,
2. matrix PASS/FAIL/UNKNOWN/REQUIRES AGREEMENT/NOT VIABLE,
3. rekomendację Legal Gate + D1,
4. plan implementacji **warunkowy**.

Owner GO **nie** oznacza:

- Legal PASS,
- D1 READY,
- włączenia live scrape,
- obejścia robots / CAPTCHA / hidden endpoints,
- bulk catalogue harvest.

---

## 2. Docelowy model produktowy (bez zmian architektury)

```text
PRZETARG → BOM → materialKey → Price Memory
  CURRENT → REUSE → 0 live
  MISSING/STALE → selective research (1 materialKey)
       → LM / Casto / OBI (DIRECT + REGULAR only)
       → qualify → average → Price Memory
NEXT TENDER → HIT → REUSE
```

**REUSE FIRST:** istniejący `MaterialResearchProvider` · Demand · Candidate · Accept · Quotes · Price Memory · single-flight · dedupe · cooldown · fail-soft.

**Zakaz produktowy (niezależnie od Legal):** bulk crawl · full catalogue · marketplace · promo-as-reference · invent price · research per BOQ line.

---

## 3. LEGAL MATRIX — LEROY MERLIN

### 3.1 Evidence (re-check 2026-08-11)

| # | SOURCE | URL | Section / finding | Confidence |
|---|--------|-----|-------------------|------------|
| LM-Z | Zastrzeżenia prawne | https://www.leroymerlin.pl/zastrzezenia-prawne.html | Kopiowanie części serwisu **do użytku osobistego** OK; **zabronione** wykorzystywanie informacji w sposób związany z **celami komercyjnymi** / upublicznianiem | HIGH |
| LM-M1 | Regulamin Marketplace | https://www.leroymerlin.pl/regulamin-marketplace-do-3-08-2026.html | Art. **14.1 pkt 7** — zakaz podważania systemów m.in. przez **scrapowanie** | HIGH |
| LM-M2 | j.w. | Art. **16** — zakaz pobierania / ponownego wykorzystania **istotnej części** bazy danych | HIGH |
| LM-R | robots.txt | https://www.leroymerlin.pl/robots.txt | Disallow m.in. search/customer/API-like paths; **nie** jest licencją na bot research | HIGH |
| LM-P | Practical TEST-05 | PDP Zita Sensea art. 89322996 · 178 PLN · seller LEROY MERLIN | **DATA EXISTENCE PASS** | HIGH |
| LM-A | Enablement-02 | VIVnetworks/CJ Product Feed | Feed istnieje dla **promocji**; → Memory **REQUIRES AGREEMENT** | MEDIUM–HIGH |
| LM-K | Klub PRO | leroymerlin.pl Klub PRO | B2B lojalność / zakupy — **≠** public shelf-price API | HIGH |

### 3.2 Matrix (Owner §14)

| # | Axis | Status | Note |
|---|------|--------|------|
| 1 | Public price | **PASS** | PDP / katalog |
| 2 | Direct retailer | **PASS** | „Sprzedawane i wysyłane przez LEROY MERLIN” (TEST-05) |
| 3 | Selective **human** lookup | **PASS** (browse) | Jako klient sklepu |
| 4 | Selective **automated** lookup | **FAIL** | Scrapowanie (Marketplace) + ryzyka IP/DB + commercial copy ban (Zastrzeżenia) |
| 5 | Storage (automated scrape→Memory) | **FAIL** | DB / commercial restrictions |
| 6 | Derived / reference (from scrape) | **FAIL** | Nie „wypłukuje” ograniczeń źródła |
| 7 | Cross-tender reuse (from scrape) | **FAIL** | j.w. |
| 8 | Internal commercial use (automated site) | **FAIL / NOT VIABLE** | Zastrzeżenia: cele komercyjne |
| 9 | API / feed / authorized channel | **REQUIRES AGREEMENT** | Affiliate CJ — cel promocji; brak public shelf API |
| 10 | Restrictions | Scrapowanie · istotna część DB · commercial reuse of site materials | |
| 11 | Required agreement | **TAK** — pisemna zgoda / API/feed license **pod Price Memory / tender costing** | |
| 12 | **Final legal status (LIVE DIY)** | **FAIL** (site automation) · **REQUIRES AGREEMENT** (official channel) · **NOT VIABLE** as scrape-based D1 | |

### 3.3 LEROY — werdykt

```text
LEROY: FAIL (automated site) · REQUIRES AGREEMENT (authorized channel)
```

---

## 4. LEGAL MATRIX — CASTORAMA

### 4.1 Evidence (re-check 2026-08-11)

| # | SOURCE | URL | Section / finding | Confidence |
|---|--------|-----|-------------------|------------|
| CA-R | Regulamin serwisu | https://www.castorama.pl/regulaminwww | Zakaz utrudniania/zakłócania Serwisu; zakaz zachowań sprzecznych z **przeznaczeniem**; ochrona **utworów i baz danych**; Aplikacja na **użytek osobisty** | HIGH |
| CA-A | Admitad Terms | Enablement-02 | §11 — zakaz własnych DB / other purposes → Memory **FAIL** | HIGH |
| CA-P | Practical TEST-05 | Tapia · 5063022580511 · 178 PLN · Castorama Polska | DATA EXISTENCE PASS · marketplace filterable | HIGH |
| CA-B | CastoPro | castopro.castorama.pl | Lojalność B2B ≠ API | HIGH |
| CA-robots | robots.txt | https://www.castorama.pl/robots.txt | **2026-08-11:** odpowiedź maintenance HTML (nie klasyczny robots) — **UNKNOWN** signal; **nie** PASS | MEDIUM |

### 4.2 Matrix

| # | Axis | Status | Note |
|---|------|--------|------|
| 1 | Public price | **PASS** | |
| 2 | Direct retailer | **PASS** | „Castorama Polska” (TEST-05) |
| 3 | Selective human lookup | **PASS** (browse) | |
| 4 | Selective automated lookup | **FAIL / UNKNOWN≠PASS** | Brak wyraźnego „scrapowanie”, ale IP/DB + disruption + brak autoryzacji machine access |
| 5 | Storage (Admitad→Memory) | **FAIL** | §11 |
| 6 | Derived (Admitad) | **FAIL** | |
| 7 | Cross-tender (Admitad) | **FAIL** | |
| 8 | Internal commercial (site scrape) | **UNKNOWN≠PASS** | Brak PASS w ToS |
| 9 | API / feed authorized | **REQUIRES AGREEMENT** | Admitad ≠ Memory license; CastoPro contact |
| 10 | Restrictions | DB/IP · przeznaczenie serwisu · Admitad own DB ban | |
| 11 | Required agreement | **TAK** dla machine ingest | |
| 12 | **Final** | **NOT VIABLE** (Admitad→Memory) · **REQUIRES AGREEMENT** (official) · scrape **NOT APPROVED** | |

### 4.3 CASTORAMA — werdykt

```text
CASTORAMA: FAIL (Admitad→Memory) · REQUIRES AGREEMENT (authorized) · scrape NOT APPROVED
```

---

## 5. LEGAL MATRIX — OBI

### 5.1 Evidence (re-check 2026-08-11)

| # | SOURCE | URL | Section / finding | Confidence |
|---|--------|-----|-------------------|------------|
| OB-R | Regulamin | https://www.obi.pl/legal/regulamin_a | § korzystanie: zakaz zakłócania; **dostęp do danych nieprzeznaczonych**; **wykorzystania bez zgody … innych informacji** znajdujących się w Serwisie | HIGH |
| OB-robots | robots.txt | https://www.obi.pl/robots.txt | Disallow m.in. `/api/pdp/*/availability`, market params; Allow `*/api/*` ≠ grant do research Memory | HIGH |
| OB-P | Practical TEST-05 | Cersanit Meza art. 7120249 · 164,50 PLN **promo** · seller OBI | DATA EXISTENCE PASS · promo ≠ reference | HIGH |
| OB-A | Affiliate | Enablement-02 / Audit-01 | XML via CJ — **REQUIRES AGREEMENT** | MEDIUM |

### 5.2 Matrix

| # | Axis | Status | Note |
|---|------|--------|------|
| 1 | Public price | **PASS** | |
| 2 | Direct retailer | **PASS** | seller OBI (TEST-05) |
| 3 | Selective human lookup | **PASS** (browse) | |
| 4 | Selective automated lookup | **FAIL / UNKNOWN≠PASS** | Zakaz użycia informacji bez zgody + disruption; brak API grant |
| 5 | Storage (automated) | **FAIL / REQUIRES AGREEMENT** | „informacje” bez zgody |
| 6 | Derived | **FAIL / REQUIRES AGREEMENT** | |
| 7 | Cross-tender | **FAIL / REQUIRES AGREEMENT** | |
| 8 | Internal commercial automated | **NOT VIABLE** bez zgody | |
| 9 | API / feed | **REQUIRES AGREEMENT** · public shelf API **NOT FOUND** | |
| 10 | Restrictions | Informacje bez zgody · robots availability · promo semantics | |
| 11 | Required agreement | **TAK** | |
| 12 | **Final** | **REQUIRES AGREEMENT** · scrape **NOT APPROVED** | |

### 5.3 OBI — werdykt

```text
OBI: REQUIRES AGREEMENT · automated site NOT APPROVED
```

---

## 6. Direct retailer · selective · storage · derived · reuse (synteza)

| Topic | Human + Own Accept (manual) | Automated site HTTP | Affiliate feed as Memory | Written API/data license |
|-------|-----------------------------|---------------------|--------------------------|---------------------------|
| Direct retailer filter | READY (TEST-05) | N/A if blocked | N/A | If granted |
| Selective lookup | OPTION B / NOT SPECIFIED ban | **BLOCKED** | Wrong purpose unless agreement | Preferred |
| Storage in Price Memory | NOT SPECIFIED ban (invoice/manual path already used) | **BLOCKED** | Admitad **FAIL** | If granted in writing |
| Derived average | OK **after** lawful observation | **BLOCKED** | FAIL if source FAIL | If granted |
| Cross-tender reuse | NOT SPECIFIED ban for own notes/invoices | **BLOCKED** | FAIL | If granted |
| Automation status | N/A | **NOT APPROVED** | REQUIRES AGREEMENT | REQUIRES AGREEMENT |

---

## 7. D1 recommendation

```text
CURRENT:  MMR_02_PRIMARY_SOURCE_STATUS = UNKNOWN
RECOMMEND: KEEP UNKNOWN
```

**Nie** ustawiać D1 = READY dla LM/Casto/OBI na podstawie:

- Owner GO,
- TEST-05 data existence,
- „selective only” (ToS nie dają progu „occasional scrape OK”).

D1 READY możliwe dopiero gdy istnieje **authorized primary** (pisemna zgoda / oficjalne API/feed **z prawami**: selective lookup · storage · derived · cross-tender · no redistribution).

Onninen/TIM (GATE-04) pozostają **osobnym** trackiem B2B — **nie** zamiennikiem scope DIY w tym GO.

---

## 8. Legal Gate recommendation

```text
CURRENT:  MARKET_SYNC_P3_LEGAL_GATE = OPEN
RECOMMEND: KEEP OPEN
STATUS:   NOT READY FOR PASS (DIY automated LM/Casto/OBI)
```

**PASS** dopiero po:

1. evidence authorization **per source**, oraz  
2. osobnym Owner GO **IMPLEMENT** + flip gate w kodzie z cytatem evidence.

**Nie** flipować gate w tym audycie.

---

## 9. LIVE HTTP

```text
LIVE HTTP: BLOCKED

Conditions ALL required for ELIGIBLE:
  Legal PASS
  + D1 != UNKNOWN
  + Owner GO IMPLEMENT
  + source authorization confirmed
→ currently NOT met
```

---

## 10. Architecture impact

| Area | Impact |
|------|--------|
| Price Memory / materialKey / Quotes | **NONE** — REUSE |
| MaterialResearchProvider boundary | **NONE** — keep; stay disconnected |
| Qualify promo/marketplace | **NONE** — already PASS in harness |
| Invoice seed 372 | **KEEP** — HISTORICAL PURCHASE path |
| Manual research / Own Accept | **KEEP** — lawful OPTION B path |
| Live adapters LM/Casto/OBI | **NOT STARTED** · **BLOCKED** |
| Onninen/TIM | Out of this Owner scope (future additive) |

---

## 11. Implementation plan (warunkowy — NIE STARTUJ TERAZ)

```text
ONLY IF written authorization / official channel PASS evidence:

1. ARCH REVIEW (thin adapters only)
2. Owner GO IMPLEMENT (explicit)
3. Flip Legal Gate + D1 with evidence citations in code comments/docs
4. Thin providers: leroy / castorama / obi
   - direct seller filter
   - regular-only
   - no promo / no marketplace
   - average of qualifying
   - fail-soft PRICE_GAP
5. Wire into existing orchestrate (no new job system)
6. Tests A–J (Owner §17) · fetchCalls=0 on CURRENT
7. build · commit · push · PV
```

**Do NOT start** steps 3–7 from this document alone.

---

## 12. Owner actions (legal / commercial — poza kodem)

Aby odblokować DIY LIVE:

1. **Leroy Merlin** — Klub PRO / partnership / data license: selective product price · storage · derived · cross-tender · no public redistribute.  
2. **Castorama** — CastoPro / legal: j.w. (**nie** Admitad→Memory).  
3. **OBI** — B2B/pro / legal: j.w.  
4. Alternatywnie: pozostawić DIY = **manual Own Accept** + invoice seed; automation tylko po zgodzie.

---

## FINAL VERDICT

```text
REAL-SOURCE-LEGAL-ENABLEMENT-06

AUDIT: COMPLETE

LEROY:      FAIL (automated site) · REQUIRES AGREEMENT (official channel) · NOT VIABLE as scrape D1
CASTORAMA:  FAIL (Admitad→Memory) · REQUIRES AGREEMENT (official) · scrape NOT APPROVED
OBI:        REQUIRES AGREEMENT · automated site NOT APPROVED

LEGAL GATE: OPEN / NOT READY FOR PASS / BLOCKED (DIY live)
D1:         UNKNOWN

LIVE HTTP:  BLOCKED

OWNER GO:   YES (legal enablement audit only)

IMPLEMENTATION: BLOCKED

CODE:   NONE
COMMIT: NONE
PUSH:   NONE
```

**Następny krok:** Owner decyduje ścieżkę (pisemne zgody DIY **lub** utrzymanie manual/invoice **lub** osobny B2B track).  
**Bez** kolejnego Owner GO **IMPLEMENT** — brak live adapters.

---

*Koniec REAL-SOURCE-LEGAL-ENABLEMENT-06. Nie jest to formalna opinia prawna kancelarii — research warunków i oficjalnych źródeł.*
