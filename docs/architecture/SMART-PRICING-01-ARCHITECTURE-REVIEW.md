# SMART-PRICING-01 — ARCHITECTURE REVIEW

> **ID:** SMART-PRICING-01-ARCHITECTURE-REVIEW  
> **EPIC:** SMART-PRICING-01  
> **Etap:** **ARCHITECTURE REVIEW** · DOCS ONLY  
> **Data:** 2026-07-30  
> **DF:** [`SMART-PRICING-01-DESIGN-FREEZE.md`](SMART-PRICING-01-DESIGN-FREEZE.md) · **FROZEN** · COMPLETE  
> **PLAN:** [`SMART-PRICING-01-PLAN.md`](SMART-PRICING-01-PLAN.md) · zaakceptowany  
> **AUDIT:** [`SMART-PRICING-01-AUDIT.md`](SMART-PRICING-01-AUDIT.md) · zaakceptowany  
> **Zakaz:** IMPLEMENT · kod · commit · push · OPS · AI-COST rewrite · zmiana ownership MARKET-SYNC · alt publish Quotes

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 ARCHITECTURE REVIEW
Decyzja: READY FOR OWNER GO
Kontrole Owner 1–11: ALL PASS · FAIL = 0
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF FROZEN vs pytania Ownera 1–11 + zasady projektu + REUSE AS-IS (`commitMarketQuotesImport`, MS P1) |
| Kod IMPLEMENT | **brak** |
| Kryterium PASS | Brak sprzeczności blokującej IMPLEMENT; bindingi AR tylko wzmacniają egzekucję DF |
| Kryterium FAIL | Sprzeczność DF / luka uniemożliwiająca bezpieczny IMPLEMENT |

---

## 1. Kontrole Ownera (PASS/FAIL)

### 1. SMART pozostaje wyłącznie warstwą decyzyjną

| Dowód DF | Ocena |
|----------|--------|
| D-SP-1 · §3 OUT „Ownership Publish MS” | SMART = detect · evidence · rank · decyzja · orchestration Save |
| Allowlist §11 · zakaz fork Accept–Publish MS | Brak przejęcia ownership |
| AC-SP-1 | Jawne |

**Werdykt: PASS**

---

### 2. Product Quotes pozostają jedynym SSOT cen rynku

| Dowód DF | Ocena |
|----------|--------|
| D-SP-2 · AC-SP-2 · SSOT FIRST §12 | Trwały rynek = `marketQuotes` |
| One-shot ≠ SSOT (§7.2) | Ephemeral sesji |
| Staging MS ≠ wycena produkcyjna | RO supply |

**Werdykt: PASS**

---

### 3. MARKET-SYNC pozostaje jedynym właścicielem Publish

| Dowód DF | Ocena |
|----------|--------|
| D-SP-3 · R-SP-MS · denylist §11 | Accept/Publish batch + staging = MS |
| Workflow [7c]: Save **nie** zastępuje batch Publish MS | §4.1 |
| SMART Save = wywołanie commit (REUSE), nie „Publish MS” | Orchestration FEATURE |

**Uwaga AR (nie FAIL):** SMART w fazie P3 **woła** `commitMarketQuotesImport` — to **ten sam** mechanizm zapisu Quotes, nie drugi proces „Publish sklepu”. Właścicielem **procesu Publish** (Accept→Guard→…→batch) pozostaje MS. SMART nie definiuje Accept/Publish UI ops.

**Werdykt: PASS**

---

### 4. One-shot nie zapisuje Quotes i nie wpływa na kolejne wyceny

| Dowód DF | Ocena |
|----------|--------|
| D-SP-4 · §7.2 · AC-SP-7 · K-SP-1a | Zero `commit*` / `apply*` przy One-shot |
| Scope = bieżąca wycena (`tender`+`lineRef` sesji) | Brak Cloud DATA_KEY |
| Persist session/in-memory | Po zakończeniu sesji overlay znika → **kolejne wyceny / inne sesje bez wpływu** |

**Wiązanie AR (IMPLEMENT):**

1. Overlay kluczem **sesja przeglądarki + tenderId + lineRef** — nie globalny store WC.  
2. Test: One-shot → fingerprint Quotes unchanged **oraz** nowa sesja / inny tender **bez** overlay.  
3. Zakaz zapisu one-shot do `kw-wgdom-work-catalog` / tender cloud bez osobnego DF+GO CORE.

**Werdykt: PASS** (z bindingiem powyżej)

---

### 5. Jedyna droga trwałego zapisu = `commitMarketQuotesImport`

| Dowód DF | Ocena |
|----------|--------|
| D-SP-5 · §8 · AC-SP-8 · K-SP-1 | Jedyny write |
| Zakaz apply poza commit · ręczny `marketQuotes` | §8 · §11 |
| Kill Switch w lib przed commit | D-SP-9 · AC-SP-10 |

**Wiązanie AR (IMPLEMENT):**

1. Jedyny call site SMART → commit = save orchestration w `src/lib/smart-pricing/**`.  
2. UI wyceny **nie** importuje `commitMarketQuotesImport` bezpośrednio (jak MS P1 UI → `runMarketSyncPublish`).  
3. Test static: zero `applyMarketQuotesFromPreview(` w smart-pricing poza ścieżką commit (powinno być **0** apply).

**Werdykt: PASS**

---

### 6. Price Evidence kompletne — pełne uzasadnienie propozycji

| Pole wymagane (DF §7.1) | Uzasadnienie |
|-------------------------|--------------|
| `source` | Skąd propozycja |
| `provider` | Kto |
| `price` · `acquiredAt` | Co / kiedy |
| `confidence` | Siła sygnału |
| `matchMethod` · `matchDetail` | **Dlaczego** dopasowanie |
| `region` (jeśli dostępny) | Kontekst geo |

| Dowód | Ocena |
|-------|--------|
| D-SP-6 · AC-SP-4 · K-SP-1c | Komplet pól |
| Workflow Present §4 [6] | UI musi pokazać Evidence |

**Werdykt: PASS**

---

### 7. Price Resolution Policy = konfiguracja biznesowa, nie hardcode

| Element DF | Rola |
|------------|------|
| FEATURE LS `kw-smart-pricing-01-provider-rank` | **Konfiguracja** kolejności |
| FEATURE LS `kw-smart-pricing-01-preferred-provider` | Preferowany dostawca (near-tie) |
| O-SP-G lista domyślna | **Factory default** gdy LS puste — nie jedyny tor |
| B1–B4 · próg Δ 3% / 0.50 PLN | Reguły polityki (zamrożone progi DF — jak min confidence) |

**Ocena:** Polityka jest **konfigurowalna biznesowo** (rank + preferred provider). Domyślna lista i progi Δ są **DF-frozen defaults**, nie „ceny zahardkodowane w UI”. To zgodne z DATA FIRST + FEATURE LS.

**Wiązanie AR (IMPLEMENT — nie zmienia DF):**

1. Runtime **najpierw** czyta FEATURE LS; default O-SP-G tylko gdy brak / uszkodzony store.  
2. Zakaz hardcode kolejności providerów w komponencie UI poza odczytem z lib policy.  
3. Test: zmiana LS rank zmienia kolejność Evidence bez rebuildu źródeł (K-SP-1d).

**Werdykt: PASS** (z bindingiem powyżej)

---

### 8. Decision Confidence = zestaw reguł, nie pojedynczy wskaźnik

| Dowód DF §6.1 | Wiele sygnałów |
|---------------|----------------|
| `matchMethod` | tak |
| `confidence` | tak (progi 0.85 / 0.75 / 0.60) |
| `source` | product_quotes vs staging |
| `unit` OK / mismatch | tak |
| conflict / unmapped / brak Evidence | tak |
| Konserwatywny tie-break klas | MANUAL > REVIEW > READY |

**Nie** jest to `if (confidence > X) READY` w izolacji.

**Werdykt: PASS**

---

### 9. SMART działa gdy MARKET-SYNC nie dostarcza propozycji

| Dowód DF | Ocena |
|----------|--------|
| D-SP-12 · workflow [2] Quotes obowiązkowy pierwszy | Działa na samym Quotes |
| [3] MS staging **opcjonalny** („gdy A puste LUB user Szukaj”) | Brak MS ≠ blokada Detect/Quotes/One-shot |
| Faza P1 IN bez MS staging | P1 świadomie niezależna od MS |
| Brak Evidence → Confidence **MANUAL** | Degradacja kontrolowana |

**Scenariusz AR:** staging pusty / MS niedostępny → Search B = [] → Resolution na samym A (lub MANUAL) → Odrzuć / One-shot z Quotes / Save z Quotes gdy READY/REVIEW.

**Werdykt: PASS**

---

### 10. Brak alternatywnego mechanizmu publikacji Product Quotes

| Dowód DF | Ocena |
|----------|--------|
| D-SP-5 · AC-SP-9 · denylist §11 | Zakaz apply / ręczny patch / drugi tor |
| Save path §8 wyłącznie commit | Jedna ścieżka |
| MS Publish ownership osobno | Nie dubluje procesu w SMART |

**Werdykt: PASS**

---

### 11. Zgodność z zasadami projektu

| Zasada | Dowód DF / AR | Werdykt |
|--------|---------------|---------|
| **SSOT FIRST** | Quotes SSOT · one-shot ≠ SSOT · staging ≠ produkcja | **PASS** |
| **REUSE FIRST** | commit · capture/restore · MS match RO · KS | **PASS** |
| **ZERO DUPLICATE LOGIC** | Jeden write · rank nie kopiuje cen · brak alt publish | **PASS** |
| **FEATURE-DATA ONLY** | Gate ALL-NIE · brak cloud-sync.ts · brak DATA_KEY P0–P3 | **PASS** |
| **DATA FIRST** | Evidence + Resolution + Confidence regułowe · fuzzy OFF · zero LLM jako cena | **PASS** |

**Werdykt: PASS** (ALL 5)

---

## 2. Checklist DF §13 (AR-1…AR-14)

| # | Wynik |
|---|--------|
| AR-1 … AR-14 | **ALL PASS** (mapowanie 1:1 na kontrole Ownera + allowlist + Gate) |

---

## 3. Wiązania IMPLEMENT (nieblokujące — nie CHANGES REQUIRED)

| ID | Binding |
|----|---------|
| **AR-B1** | One-shot: klucz sesji tender+lineRef · test braku wpływu na inne wyceny |
| **AR-B2** | Save: jedyny commit call site w lib smart-pricing · UI bez bezpośredniego commit |
| **AR-B3** | Kill Switch check w lib tuż przed commit |
| **AR-B4** | Resolution: FEATURE LS first · default O-SP-G fallback |
| **AR-B5** | Start IMPLEMENT od fazy **P0** (zalecenie DF) — Owner może GO P0-only |

---

## 4. Ryzyka residualne (monitor, nie FAIL)

| Ryzyko | Status |
|--------|--------|
| Operator myli One-shot z Save | Mitygacja UI etykiet — OV przy P1 |
| Puste Quotes + puste MS → tylko MANUAL | Oczekiwane · nie regresja |
| Preferowany provider przy near-tie | Tylko reorder — K-SP-1d |

---

## 5. WERDYKT

```text
════════════════════════════════════════════════════════
SMART-PRICING-01 ARCHITECTURE REVIEW

WERDYKT: READY FOR OWNER GO

Kontrole 1–11:  PASS = 11 · FAIL = 0
Zasady projektu: ALL PASS
DF FROZEN: spójny · bez luk blokujących

IMPLEMENT: nadal ZABLOKOWANY do jawnego Owner GO IMPLEMENT
Zalecenie: GO na fazę P0 (Detect RO) jako pierwszy bundle
════════════════════════════════════════════════════════
```

**CHANGES REQUIRED:** **NIE**

---

## 6. Artefakty / NEXT

| Dokument | Rola |
|----------|------|
| Ten plik | **SSOT ARCHITECTURE REVIEW** |
| [`SMART-PRICING-01-ARCHITECTURE-REVIEW-COMPLETE.md`](SMART-PRICING-01-ARCHITECTURE-REVIEW-COMPLETE.md) | Marker |
| DF | [`SMART-PRICING-01-DESIGN-FREEZE.md`](SMART-PRICING-01-DESIGN-FREEZE.md) |

**NEXT:** Owner GO **IMPLEMENT** (prefer P0) · **nie** auto-start.
