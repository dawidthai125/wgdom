# CENY-MATERIAŁÓW-04 P1-C — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-04-P1-C-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P1-C-PLAN.md`](CENY-MATERIAŁÓW-04-P1-C-PLAN.md) · **PASS**  
> **DF COMPLETE:** [`…-DESIGN-FREEZE-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-C-DESIGN-FREEZE-COMPLETE.md) · READY FOR AR  
> **P0 / P1-A / P1-B:** **CLOSED** · tip UI **2.65.82** · feature P1-B **`dca25c96`**  
> **Parent AR:** [`CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md) · APPROVED  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Evidence scan:** `.tmp/ar-p1c-token-scan.mjs` → bannedHits **[]**

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-04 P1-C z SSOT · P3.3
        · OUT · KPI · token safety (lekcje P1-A + P1-B)
WERDYKT: PASS
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| P1-C PLAN | **PASS** |
| P1-C DESIGN FREEZE | **PASS** · **FROZEN** |
| P1-A / P1-B CLOSED | **PASS** · lekcje tokenów obowiązujące |
| Kod / IMPLEMENT | **brak** (review docs + AS-IS tip) |
| Owner GO OPS | **odblokowany** po tym AR PASS |

**Metoda:** DF P1-C vs SSOT · parent P1 AR · pipeline P3.3 · OUT · lista 7×`p1c-*` · kontrakt name/desc/keywords vs scoring AS-IS (`tender-offer-boq-mapping.ts`) · niezależny scan §5.2 · KPI · rollback · wpływ modułów.

---

## 1. REUSE pipeline Quotes

| Check | Werdykt |
|-------|---------|
| CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC | **PASS** (D-P1-C-5 · DF §2) |
| Tor tip istnieje | **PASS** (`src/lib/work-catalog/commit-market-quotes.ts` · `market-csv-preview.ts` · export `index.ts`) |
| Odczyt → `controlled_market` AS-IS | **PASS** |
| Zakaz scrapera / drugiej ścieżki | **PASS** (OUT §12) |

**Wniosek:** pipeline **zgodny** z P3.3 / parent DF — **bez** nowego toru.

---

## 2. Brak zmian silnika / OUT

| Obszar | DF | Werdykt |
|--------|-----|---------|
| AI-COST | OUT D-P1-C-9 · §12 | **PASS** |
| Scoring / mapping | bloklista §13 + OUT | **PASS** (zakaz edycji) |
| Providerzy / reorder | OUT | **PASS** |
| Bid Calculator | OUT | **PASS** |
| Cloud Sync CORE | OUT · Gate G3 | **PASS** |
| Allowlista tylko WC + P3.3 + docs | §13 | **PASS** |
| Mutacja `p1a-*` / `p1b-*` | D-P1-C-10 · OUT | **PASS** |

**Wniosek:** brak wpływu na Payroll · Bid · CloudLoader · AI-COST · provider registry · P1-A/P1-B — **PASS**.

---

## 3. Zakres zamrożony (lista · cap · rollback)

| Check | FROZEN | Werdykt |
|-------|--------|---------|
| 7 robót core `p1c-*` | §4.1 | **PASS** |
| Cap 3–12 · target OPS 7 (w PLAN 6–8) | D-P1-C-1 | **PASS** |
| Prefiks `p1c-*` · wrocław+dolnyśląsk | D-P1-C-2 | **PASS** |
| Zakres materiałowy: EPS/ETICS · warstwa zbrojona · tynk · farba (+ REC) | §1 · §4 | **PASS** |
| Rollback L1–L3 | §11 | **PASS** |
| Ochrona `p1a-*` / `p1b-*` przy L1–L2 | D-P1-C-10 | **PASS** |
| Bucket triage IN/OUT (okablowanie · stolarka · wewnętrzne) | D-P1-C-6 | **PASS** |

**Cap 3–12:** dziedziczy uzasadnienie parent AR (koncentracja bucketa · catch 40–80% · max=depth) — **bez zmiany**.

---

## 4. namePl / descriptionPl vs lekcje P1-A + P1-B

### 4.1 Mechanizm AS-IS (wiążący)

`scoreWorkAgainstLine` dodaje punkty za **każdy token** `namePl` (len≥4) / `descriptionPl` (len≥5) przez `hay.includes(token)` — **nie** wymaga pełnej frazy.  
Keywords = pełna fraza (OK).

Dlatego D-P1-C-4 / §5.2 zakazuje gołych tokenów m.in. `wykonanie`, `siatka`, `system`, `elewacji`, `ocieplenia`, `ułożenie`, … w name/desc.

### 4.2 Audyt zamrożonych tekstów §5.3

| ID | namePl (skrót) | §5.2 ∩ tokens | Werdykt |
|----|----------------|---------------|---------|
| #1 EPS/ETICS | Ocieplenie ścian płytami EPS (ETICS) | ∅ | **PASS** |
| #2 warstwa zbrojona | Warstwa zbrojona ETICS na płytach izolacyjnych | ∅ | **PASS** |
| #3 tynk | Tynk elewacyjny cienkowarstwowy | ∅ | **PASS** |
| #4 farba | Farba elewacyjna na tynku zewnętrznym | ∅ | **PASS** |
| #5 zbrojenie tynku | Zbrojenie powierzchniowe tynku elewacyjnego | ∅ | **PASS** |
| #6 wełna MW | Ocieplenie ścian wełną mineralną MW | ∅ | **PASS** |
| #7 listwa | Listwa startowa cokołowa ETICS | ∅ | **PASS** |

**Automatyczny scan** (`.tmp/ar-p1c-token-scan.mjs` · `foldPolishText` · lista §5.2): **bannedHits = []**.

**Spójność §5.3 ↔ §5.2:** **PASS** (w przeciwieństwie do P1-B AR FAIL przed amend — tu DF napisany od razu pod lekcje A+B).

### 4.3 Residual (nie blokuje AR · obowiązek OPS/OV)

| Residual | Uwaga |
|----------|--------|
| Token `warstwa` / `ocieplenie` | poza listą §5.2; mogą punktować szeroko — OV false gate + keywords frazy nadrzędne |
| Keywords z `ułożenie` / `system ETICS` / `siatka …` | **dozwolone** jako pełne frazy; scoring keywords = substring frazy, nie tokenizacja name |
| `malowanie elewacji farbą` | false gate vs malowanie wewnętrzne (DF §5.3 #4 + §10) |

---

## 5. keywords — wyłącznie pełne frazy

| Check | Werdykt |
|-------|---------|
| Reguła DF §5.1 | **PASS** |
| Scan: brak 1-słownych keywords bez `-` | **PASS** (`shortKeywords = []`) |
| Gołe `siatka` / `system` tylko we frazach keywords (nie name/desc) | **PASS** |
| Intencja match (EPS · warstwa zbrojona · Rabitz · farba elew.) | **PASS** |

---

## 6. Hard KPI

| ID | Target DF | Werdykt |
|----|-----------|---------|
| H1 | 3–12 `p1c-*` | **PASS** |
| H2 | Quotes **100%** | **PASS** |
| H3 | false = **0** | **PASS** |
| H4 | brak nieuzasadnionych regresji vs P1-B | **PASS** |
| H5 | unmatched ELEWACJE ↓ ≥**25%** vs ~234 k | **PASS** |
| H6 | token scan = **0** | **PASS** |
| H7 | P1-A **10** + P1-B **7** intact | **PASS** |

---

## 7. Soft KPI

| ID | Target DF | Werdykt |
|----|-----------|---------|
| S1 | HE avg 18 ≤ **27.0%** | **PASS** (baseline tip P1-B) |
| S2 | CM avg 18 ≥ **73.0%** | **PASS** |
| S3 | fokus `08dee3f6` | **PASS** |

---

## 8. Coverage KPI

| ID | Metryka | Werdykt |
|----|---------|---------|
| K-P1-C1 | linie → `p1c-*` · C1 > 0 przy CLOSE | **PASS** |
| K-P1-C2 | HE/unmatched w buckecie elewacji | **PASS** (raport obowiązkowy) |

Zgodność z parent DF § Coverage — **PASS**.

---

## 9. Brak wpływu na pozostałe moduły

| Moduł | Wpływ | Werdykt |
|-------|-------|---------|
| AI-COST / pricing-engine | brak (OUT) | **PASS** |
| OfferBoq scoring | brak zmian kodu | **PASS** |
| Bid Calculator | brak | **PASS** |
| Cloud Sync / CloudLoader | brak CORE | **PASS** |
| Payroll / Jobs / WM | brak | **PASS** |
| Work Catalog SSOT | tylko dane `p1c-*` + Quotes P3.3 | **PASS** |
| P1-A / P1-B works | chronione D-P1-C-10 | **PASS** |

---

## 10. Zgodność z parent P1 / SSOT

| Check | Werdykt |
|-------|---------|
| Bucket = `ELEWACJE_OCIEPLENIA` (parent DF §4.3) | **PASS** |
| Kolejność A→B→**C** (D-P1-A) | **PASS** |
| Transfer OUT P1-B (siatka tynkarska/zbrojona) → IN P1-C #5 | **PASS** |
| FEATURE-DATA / Gate ALL-NIE | **PASS** |
| Tip SSOT `09` — bez bump w AR | **PASS** (docs-only) |

---

## 11. Decyzja

| | |
|--|--|
| **Werdykt AR** | **PASS** |
| **Decyzja** | **APPROVED FOR OWNER GO** |
| **Nie** | ARCHITECTURE REVIEW FAILED |

**Blokady:** brak. OPS/IMPLEMENT nadal wymaga **osobnego Owner GO OPS** (nie ten dokument).

### IC (nieblokujące)

| ID | Treść |
|----|--------|
| IC-P1-C-1 | OPS: skrypt scan §5.2 = 0 przed cloud commit (jak P1-B) |
| IC-P1-C-2 | OV: false gate okablowanie / malowanie wewnętrzne / `p1a-*` / `p1b-*` |
| IC-P1-C-3 | Residual tokeny `warstwa`/`ocieplenie` — monitor C1/C2; patch WC-only jeśli false |

---

## 12. Następny krok

```text
Owner GO OPS P1-C
  → seed 7× p1c-* wg DF §5.3 + Quotes P3.3
  → token scan = 0 · walidacja 18 · OV
  → READY FOR COMMIT (osobny GO)
```

**Zakaz teraz:** IMPLEMENT silnika · commit · push bez Owner GO OPS.
