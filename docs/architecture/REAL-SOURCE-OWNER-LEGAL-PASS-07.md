# REAL-SOURCE-OWNER-LEGAL-PASS-07

> **TRYB:** LEGAL ENABLEMENT + ARCH REVIEW  
> **DATA:** 2026-08-11  
> **JĘZYK:** PL (nazwy techniczne / SSOT bez zmian)  
> **OWNER GO:** YES — **LEGAL ENABLEMENT** (nie GO IMPLEMENT)  
> **PRIVATE EVIDENCE:** HELD BY OWNER · **NOT STORED IN REPOSITORY**

```text
BASELINE (przed tym etapem)
────────────────────────────────
UI / tip:     2.66.25 · tip 5bf42364 · feature 7c61cc4e
Price Memory: 372 unique materialKeys (invoice seed)
Legal:        OPEN
D1:           UNKNOWN
liveHttp:     false · ADAPTER_NOT_IMPLEMENTED
```

**Powiązane:** `REAL-SOURCE-LEGAL-ENABLEMENT-06.md` · `REAL-SOURCE-PRACTICAL-SOURCE-TEST-05.md` · `MARKET-PRICE-MEMORY-READINESS-AUDIT.md` · `MARKET-MATERIAL-RESEARCH-02-ARCHITECTURE-REVIEW.md`

---

## 1. Owner Attestation (bez treści prywatnej)

Owner potwierdza posiadanie **pisemnego potwierdzenia** od:

1. **Leroy Merlin**
2. **Castorama**
3. **OBI**

Owner potwierdza, że zakres zgody obejmuje:

- pozyskiwanie cen produktów danego retailera,
- zapisanie cen w **prywatnej** bazie WGDOM (Price Memory),
- wykorzystanie wewnątrz prywatnego systemu WGDOM,
- wewnętrzne wycenianie / kosztorysowanie własnych przetargów,
- przygotowanie własnych ofert przetargowych.

Owner potwierdza również:

- brak dostępnego dla jego skali dedykowanego API „dużych firm / porównywarek”,
- uzgodniony sposób = **selektywne wyszukiwanie konkretnych produktów** (nie pełny katalog).

```text
Evidence form (jedyna dozwolona w repo):

  Owner potwierdza posiadanie pisemnego potwierdzenia od danego
  retailera dotyczącego dozwolonego zakresu wykorzystania danych.

  PRIVATE OWNER EVIDENCE
  NOT STORED IN REPOSITORY
```

**Agent nie widział oryginalnych e-maili. Brak cytatów. Brak PII w repo.**

---

## 2. Rozgraniczenie względem Enablement-06

| Podstawa | Enablement-06 | Owner-Legal-Pass-07 |
|----------|---------------|---------------------|
| Public ToS / robots | Selective automated = FAIL / REQUIRES AGREEMENT | **superseded for Legal Gate** by Owner Attestation |
| DATA EXISTENCE (TEST-05) | PASS ≠ Legal | nadal obowiązuje (model qualify) |
| Owner Attestation | brak | **CONFIRMED** |
| Public site alone | ≠ Legal PASS | nadal **≠** Legal PASS — podstawą jest attestation |

**Nadal obowiązują (produkt / safety):**

- brak bulk crawl / full catalogue,
- brak marketplace / third-party seller,
- brak promo jako reference,
- brak invent prices,
- brak obejścia CAPTCHA / access control / hidden endpoints,
- RESEARCH tylko MISSING/STALE materialKey.

---

## 3. Status retailerów

| Retailer | OWNER AUTHORIZATION | Selective research | Storage (private PM) | Internal tender costing | Final (Legal) |
|----------|---------------------|--------------------|----------------------|-------------------------|---------------|
| **Leroy Merlin** | **CONFIRMED** | ALLOWED (Owner) | ALLOWED (Owner) | ALLOWED (Owner) | **PASS** (Owner Attestation) |
| **Castorama** | **CONFIRMED** | ALLOWED (Owner) | ALLOWED (Owner) | ALLOWED (Owner) | **PASS** (Owner Attestation) |
| **OBI** | **CONFIRMED** | ALLOWED (Owner) | ALLOWED (Owner) | ALLOWED (Owner) | **PASS** (Owner Attestation) |

Nie dopisano warunków prawnych poza Owner Attestation.

---

## 4. Legal Gate — formalny flip

| | Przed | Po |
|--|-------|-----|
| Const | `MARKET_SYNC_P3_LEGAL_GATE = "OPEN"` | **`"PASS"`** |
| Plik | `src/lib/market-sync/p3-flag.ts` | zaktualizowany |
| Helper | `isMarketSyncP3LegalPass()` | **true** |

```text
LEGAL GATE: PASS
Podstawa: Owner Attestation (PRIVATE) + Owner GO LEGAL ENABLEMENT
NIE: „strona jest publiczna”
```

**Uwaga shared gate:** ten sam flag dotyczy Market Sync P3.  
P3 UI flag default **OFF** · jedyny adapter nadal **mock** · brak klienta HTTP sklepu w MS P3.  
Legal PASS **czyści** `refuseLiveIngestIfBlocked` — nadal **brak** live scraper/API client w MS.

---

## 5. D1 — formalny flip

| | Przed | Po |
|--|-------|-----|
| Const | `MMR_02_PRIMARY_SOURCE_STATUS = "UNKNOWN"` | **`"VERIFIED"`** |
| Typ SSOT | `"UNKNOWN" \| "VERIFIED"` | **bez nowego statusu / bez drugiego D1** |
| Plik | `market-material-research-02-config.ts` | zaktualizowany |

```text
D1: VERIFIED
Primary DIY coverage (Owner): leroy · castorama · obi
```

Brak technicznego bloku: SSOT już ma `"VERIFIED"`.  
Brak formalnego bloku poza attestation (dostarczone przez Ownera).

---

## 6. liveHttpEligible

```text
isMmr02LiveHttpEligible() = Legal PASS && D1 !== "UNKNOWN"
→ true
```

| | Status |
|--|--------|
| `liveHttpEligible` | **true** |
| `connected` (prod) | **false** |
| `reason` | **`OK_DISCONNECTED_NO_ADAPTER`** |
| `httpFetchCount` | **0** |
| Live shop HTTP | **NIE** (brak adapterów) |

---

## 7. Architecture Review (thin adapters)

### 7.1 Werdykt

```text
ARCH REVIEW: PASS
IMPLEMENT: BLOCKED — wymaga osobnego Owner GO IMPLEMENT
```

### 7.2 Checklist (REUSE FIRST)

| Element | Status | Uwagi |
|---------|--------|-------|
| `MaterialResearchProvider` | READY | kontrakt: `id` · `connected` · `research` · `autoAccepted:false` |
| Provider boundary / factory | READY | `resolveMmr02Phase2Provider` |
| Price Memory | READY | `lookupPriceMemory` · Quotes · history |
| Demand lifecycle | READY | QUEUED / research job |
| Candidate lifecycle | READY | Stage B orch |
| Accept | READY | Owner trust boundary |
| Quotes persist | READY | `commitMarketQuotesImport` |
| Dedupe / materialKey | READY | research per key, nie per BOQ line |
| Single-flight | READY | Stage A lease |
| Cooldown | READY | session cooldown map |
| Fail-soft | READY | `PRICE_GAP` / disconnect errors |
| Promo exclusion | READY | `qualifyMarketResearchObservation` |
| Marketplace exclusion | READY | j.w. · sellerKind |
| Average (qualified) | READY | `averageQualifiedMarketObservations` |
| Identity | READY | istniejący resolver — **nie** duplikować |
| Shop stubs | READY | `leroy` / `castorama` / `obi` disconnected |
| Invoice seed 372 | KEEP | HISTORICAL PURCHASE / `wgdom` |

### 7.3 Wnioski ARCH

1. Live adapter = **cienka** implementacja `MaterialResearchProvider` per shop.  
2. **Bez** nowego Price Memory / cache / identity / orchestration / provider framework.  
3. Po GO IMPLEMENT: inject do factory zamiast `ADAPTER_NOT_IMPLEMENTED`.  
4. CURRENT → REUSE → **0** live calls — już wymuszane w Phase1/Phase2.  
5. MISSING/STALE → selective research — już w orch.  
6. Qualify promo/marketplace → GAP — już w harness.  
7. Brak przebudowy systemu.

### 7.4 Zakres GO IMPLEMENT (plan — NIE STARTUJ TERAZ)

```text
1. Thin adapters: leroy · castorama · obi
   - selective product lookup only
   - DIRECT RETAILER filter
   - REGULAR PRICE only
   - identity validation (reuse)
   - fail-soft → PRICE_GAP
2. Wire into resolveMmr02Phase2Provider (multi-source qualify → average)
3. Tests 1–14 (Owner §19)
4. build · Owner Verification · COMMIT · PUSH · PV
```

**Zakaz w IMPLEMENT:** full crawl · category sync · background harvest · marketplace · promo-as-ref · invent · CAPTCHA bypass · unrelated refactor.

---

## 8. Status implementacji (ten etap)

| | |
|--|--|
| Legal flags | **ZMIENIONE** (PASS / VERIFIED) |
| Live adapters | **NOT STARTED** |
| Live HTTP | **brak** (factory disconnect) |
| COMMIT / PUSH | **NONE** (czekają na Owner) |
| PRODUCTION tip | **bez zmian** (2.66.25) do czasu commit/push |

---

## 9. Testy (regresja Legal Enablement)

Uruchomione / wymagane po flipie:

| Suite | Wynik |
|-------|-------|
| `test-market-material-research-02.mjs` | **74 PASS** · LIVE HTTP = ZERO · DISCONNECTED |
| `test-invoice-price-memory-seed.mjs` | **38 PASS** · `liveHttpEligible=true` · `ADAPTER_NOT_IMPLEMENTED` · fetch=0 |
| `test-market-sync-01-p3.mjs` | **PASS** · Legal PASS · mock path |

Testy live adapterów 1–14: **po** Owner GO IMPLEMENT.

---

## 10. Workflow (SSOT)

```text
AUDIT (06) → Owner Attestation → LEGAL ENABLEMENT (07) ✅
→ ARCH REVIEW ✅
→ OWNER GO IMPLEMENT  ← NEXT (wymagane osobno)
→ IMPLEMENT thin adapters
→ BUILD → TEST → OWNER VERIFICATION
→ COMMIT → PUSH → PRODUCTION VERIFY → CLOSE
```

Obecny Owner GO = **LEGAL ENABLEMENT** · **nie** = GO IMPLEMENT.

---

## FINAL

```text
REAL-SOURCE-OWNER-LEGAL-PASS-07

OWNER ATTESTATION:
CONFIRMED

LEROY MERLIN:
OWNER AUTHORIZATION = CONFIRMED · Legal PASS (Owner)

CASTORAMA:
OWNER AUTHORIZATION = CONFIRMED · Legal PASS (Owner)

OBI:
OWNER AUTHORIZATION = CONFIRMED · Legal PASS (Owner)

LEGAL GATE:
PASS

D1:
VERIFIED

liveHttpEligible:
true

ARCH REVIEW:
PASS

IMPLEMENTATION:
BLOCKED — awaiting Owner GO IMPLEMENT
(adapter status: ADAPTER_NOT_IMPLEMENTED · connected:false · fetch:0)

TEST:
74 (MMR-02) + 38 (invoice seed) + P3 smoke PASS · fetch=0 · no live adapters

CODE:
FLAGS FLIPPED (p3-flag · mmr-02-config) + changelog 2.66.26 + test/UI copy · NO live adapters

COMMIT:
NONE

PUSH:
NONE

PRODUCTION:
UNCHANGED (2.66.25) until Owner GO COMMIT/PUSH

PRIVATE EVIDENCE:
HELD BY OWNER
NOT STORED IN REPOSITORY

NEXT OWNER ACTION:
1) GO COMMIT (+ tip 2.66.26) dla Legal PASS / D1 VERIFIED
2) osobne GO IMPLEMENT — thin adapters Leroy / Castorama / OBI
```

---

*Koniec REAL-SOURCE-OWNER-LEGAL-PASS-07. Nie jest to formalna opinia prawna kancelarii — dokumentuje Owner Attestation i flip flag SSOT.*
