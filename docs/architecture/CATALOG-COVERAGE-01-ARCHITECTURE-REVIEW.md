# CATALOG-COVERAGE-01 — ARCHITECTURE REVIEW

> **ID:** CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW  
> **EPIC:** CATALOG-COVERAGE-01  
> **Etap:** **ARCHITECTURE REVIEW** · DOCS ONLY  
> **Data:** 2026-07-30  
> **DF:** [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) · **FROZEN** · Owner zatwierdził  
> **PLAN / AUDIT / RCA:** zaakceptowane  
> **Zakaz:** IMPLEMENT · kod · commit · push · OPS · rewrite AI-COST · SMART P1 FULL · MS Publish · alt write Quotes

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 ARCHITECTURE REVIEW
Decyzja: READY FOR OWNER GO
Kontrole Owner 1–11: ALL PASS · FAIL = 0
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF FROZEN vs kontrole Ownera 1–11 + zasady projektu + REUSE `mapOfferBoqLine` / WC / CM-01 |
| Kod IMPLEMENT | **brak** |
| Kryterium PASS | Brak sprzeczności blokującej IMPLEMENT; bindingi AR tylko wzmacniają egzekucję DF |
| Kryterium FAIL | Sprzeczność DF / luka uniemożliwiająca bezpieczny IMPLEMENT |

---

## 1. Kontrole Ownera (PASS/FAIL)

### 1. Noise Filter usuwa wyłącznie pozycje niemateriałowe

| Dowód DF | Ocena |
|----------|--------|
| §2.1 · D-CC-5 | Filtr only · **nie mapuje** · **nie zapisuje** Library/Quotes |
| Kinds P0 | `kalkulacja_wlasna` · `transport` · `lp_artifact` · `smieci_krotkie` |
| Zakaz ślepego drop KNR | Realne roboty z kodem KNR → Normalizer, nie Noise |

**Wiązanie AR (IMPLEMENT):** wzorce Noise = allowlist kinds; OV lista „false noise”; rozszerzenie kinds tylko DF amend.

**Werdykt: PASS**

---

### 2. Normalizer nie zmienia semantyki produktów

| Dowód DF | Ocena |
|----------|--------|
| §2.2 · D-CC-6 | Standaryzacja formy (KNR/jm/średnice/format) · **bez zmiany znaczenia** |
| Zakaz | Dopisywanie materiału · zapis Library |
| REUSE | `foldPolishText` / normalizatory jednostek |

**Wiązanie AR:** testy golden — ten sam materiał przed/po (kanoniczny opis); strip tylko meta ATH.

**Werdykt: PASS**

---

### 3. Alias Resolver wyłącznie mapuje nazwy równoważne

| Dowód DF | Ocena |
|----------|--------|
| §2.3 · D-CC-7 | Łączy równoważne nazwy → sygnał dla Mappera |
| Zapis Library / Quotes | **NIE** |
| Alias ≠ tworzenie work | Target musi istnieć w Library |
| REUSE | CM-01 specialty alias path |

Uwaga językowa: „mapuje nazwy” = **rozwiązuje równoważność tekstu**, nie zastępuje Product Mappera (decyzja `catalogWorkId` wyłącznie w Mapperze).

**Werdykt: PASS**

---

### 4. Coverage Score jest wyłącznie metryką

| Dowód DF | Ocena |
|----------|--------|
| §2.4 · D-CC-8 | Pure compute · **zero mutacji** źródeł |
| Pola M-CC-* | Diagnostyka coverage |
| Persystencja §5 | Ephemeral |

**Werdykt: PASS**

---

### 5. Product Mapper pozostaje jedynym modułem mapującym

| Dowód DF | Ocena |
|----------|--------|
| D-CC-3 · §2.5 · AC-CC-4 | Jedyny właściciel `catalogWorkId` |
| REUSE | `mapOfferBoqLine` (+ cienki wrapper pipeline) |
| Denylist | Drugi matcher · fork scoringu · fuzzy ON |

**Wiązanie AR:** test static — jeden call site decyzji `catalogWorkId` w torze coverage.

**Werdykt: PASS**

---

### 6. Product Library pozostaje jedynym SSOT produktów

| Dowód DF | Ocena |
|----------|--------|
| D-CC-2 · §2.6 | WC = SSOT mapowania |
| Quotes | Osobny SSOT **cen** — ownership bez zmian |
| Seed P0d | FEATURE-DATA via REUSE · nie nowy DATA_KEY |

**Werdykt: PASS**

---

### 7. AI-COST nie wymaga zmian architektonicznych

| Dowód DF | Ocena |
|----------|--------|
| D-CC-12 · §4 | Coverage = thin **przed** istniejącym mapowaniem OfferBoq |
| Zakaz | Rewrite Bid · heurystyk · parser · L0/L1/L2 |
| Pricing | AS-IS `controlled_market` po mapped+Quotes |

**Werdykt: PASS** — brak zmiany architektury AI-COST; tylko punkt wpięcia pre-map.

---

### 8. SMART Detect działa bez zmian

| Dowód DF | Ocena |
|----------|--------|
| D-CC-10 · pipeline [7] | SMART Detect **AS-IS** |
| P1ux | Tylko copy UI (noise vs unmapped vs brak Quotes) — opc. · poza Detect engine |
| Zakaz | Evidence · One-shot · Save · nowy Detect |

**Werdykt: PASS**

---

### 9. Pipeline jest idempotentny

| Dowód DF | Ocena |
|----------|--------|
| §3 Invariant | Kroki 1–3 i 8 = **pure / ephemeral** |
| Fuzzy OFF · auto-accept OFF | Brak nondeterministycznych acceptów |
| Mapper REUSE | Deterministyczny score + sort (AS-IS `mapOfferBoqLine`) |

DF nie zawiera słowa „idempotentny”, ale kontrakt pure + brak side-effects w P0a–P0c to zapewnia.

**Wiązania AR (IMPLEMENT — obowiązkowe):**

1. Noise / Normalize / Alias / Coverage Score = pure functions `(input, frozenConfig) → output`.  
2. Zakaz `Date.now` / random / I/O w torze P0a–P0c.  
3. Snapshot Library wejściowy stały w jednym runie.  
4. Test: podwójne uruchomienie pipeline na tej samej linii → **identyczny** fingerprint (noise · normalized · aliasHits · catalogWorkId · score fields).

**Werdykt: PASS** (z bindingiem powyżej)

---

### 10. Raportowanie Coverage po każdej warstwie pipeline'u

| Dowód DF | Ocena |
|----------|--------|
| §6 M-CC-1…5 · AC-CC-7 | Metryki po każdym slice |
| Pipeline [1]→[8] | Noise tag · mapped · quotesHit · coveragePct |
| Harness TV-01 | Ta sama próba 18 ID |

Owner wymaga raportu **po każdej warstwie w jednym przebiegu**, nie tylko po releasie slice.

**Wiązanie AR (IMPLEMENT):** Coverage Score / harness eksponuje etapy:

| Po warstwie | Metryki min. |
|-------------|--------------|
| Noise | `noiseCount` · `noisePct` · `eligibleCount` |
| Normalize | `normalizedCount` (eligible) · opc. strip stats |
| Alias | `aliasHitCount` · `aliasHitPct` (eligible) |
| Mapper | `mappedCount` · `mappedPct` · `unmappedCount` |
| Library+Quotes | `quotesHit` · `quotesCoveragePct` · `mappedMissingQuotes` |

Jedno uruchomienie harness = pełny raport warstwowy (JSON).

**Werdykt: PASS** (z bindingiem powyżej)

---

### 11. Zasady projektu

| Zasada | Dowód DF / AR | Werdykt |
|--------|---------------|---------|
| **SSOT FIRST** | Library SSOT produktów · Quotes SSOT cen | **PASS** |
| **REUSE FIRST** | `mapOfferBoqLine` · fold · CM-01 · commit seed | **PASS** |
| **ZERO DUPLICATE LOGIC** | Jeden Mapper · denylist fork | **PASS** |
| **FEATURE-DATA ONLY** | Gate ALL-NIE · brak cloud-sync / DATA_KEY | **PASS** |
| **DATA FIRST** | TV-01 baseline · klasyfikacja unmapped · bez LLM-as-price | **PASS** |

**Werdykt: PASS** (ALL 5)

---

## 2. Checklist DF §11 (AR-1…AR-12)

| # | Wynik |
|---|--------|
| AR-1 … AR-12 | **ALL PASS** (potwierdzone niezależnie od auto-oceny w DF) |

---

## 3. Wiązania IMPLEMENT (nieblokujące — nie CHANGES REQUIRED)

| ID | Binding |
|----|---------|
| **AR-B1** | Noise = allowlist kinds · OV false-noise |
| **AR-B2** | Normalizer golden semantic-stable |
| **AR-B3** | Jedyny call site `catalogWorkId` = Product Mapper |
| **AR-B4** | Idempotencja: double-run fingerprint equal (P0a–P0c) |
| **AR-B5** | Harness raportuje metryki **po każdej warstwie** w jednym runie |
| **AR-B6** | Start IMPLEMENT od **P0a** (Noise Filter) |

---

## 4. Ryzyka residualne (monitor, nie FAIL)

| Ryzyko | Status |
|--------|--------|
| False noise drop | Mitygacja OV · wąskie kinds |
| Normalize zbyt agresywny | Golden tests |
| Alias bez work w Library | Alias nie tworzy work (DF) |
| P0d seed vs „brak nowych ścieżek” | REUSE only · poza ephemeral P0a–P0c |

---

## 5. WERDYKT

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 ARCHITECTURE REVIEW

WERDYKT: READY FOR OWNER GO

Kontrole 1–11:  PASS = 11 · FAIL = 0
Zasady projektu: ALL PASS
DF FROZEN: spójny · bindingi AR-B1…B6 nieblokujące

IMPLEMENT: nadal ZABLOKOWANY do jawnego Owner GO IMPLEMENT
Zalecenie: GO na fazę P0a (Noise Filter) jako pierwszy bundle
════════════════════════════════════════════════════════
```

**CHANGES REQUIRED:** **NIE**

---

## 6. Artefakty / NEXT

| Dokument | Rola |
|----------|------|
| Ten plik | **SSOT ARCHITECTURE REVIEW** |
| [`CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW-COMPLETE.md`](CATALOG-COVERAGE-01-ARCHITECTURE-REVIEW-COMPLETE.md) | Marker |
| DF | [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md) |

**NEXT:** Owner GO **IMPLEMENT** (prefer **P0a**) · **nie** auto-start.
