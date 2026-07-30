# CENY-MATERIAŁÓW-04 P1-B — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-04-P1-B-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P1-B-PLAN.md`](CENY-MATERIAŁÓW-04-P1-B-PLAN.md) · **PASS**  
> **DF COMPLETE:** [`…-DESIGN-FREEZE-COMPLETE.md`](CENY-MATERIAŁÓW-04-P1-B-DESIGN-FREEZE-COMPLETE.md) · READY FOR AR  
> **P1-A:** **CLOSED · PV** · tip **2.65.81** / **`dc0daea0`**  
> **Parent AR:** [`CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW.md) · APPROVED  
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-04 P1-B z SSOT · P3.3
        · OUT · KPI · token safety (lekcje P1-A)
WERDYKT: FAIL (niespójność §5.3 vs §5.2)
DECYZJA: ARCHITECTURE REVIEW FAILED
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| P1-B PLAN | **PASS** |
| P1-B DESIGN FREEZE | **PASS** · **FROZEN** (wejście formalne) |
| P1-A CLOSED | **PASS** · lekcje tokenów obowiązujące |
| Kod / IMPLEMENT | **brak** (review docs + AS-IS tip) |
| Owner GO OPS | **zablokowany** do poprawki DF |

**Metoda:** DF P1-B vs SSOT · parent P1 AR · pipeline P3.3 · OUT · lista 7×`p1b-*` · kontrakt name/desc/keywords vs scoring AS-IS (`tender-offer-boq-mapping.ts`) · KPI · rollback · wpływ modułów.

---

## 1. REUSE pipeline Quotes

| Check | Werdykt |
|-------|---------|
| CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → WC | **PASS** (D-P1-B-5 · DF §2) |
| Tor tip istnieje | **PASS** (`src/lib/work-catalog/commit-market-quotes.ts` · `market-csv-preview.ts`) |
| Odczyt → `controlled_market` AS-IS | **PASS** |
| Zakaz scrapera / drugiej ścieżki | **PASS** (OUT) |

**Wniosek:** pipeline **zgodny** z P3.3 / parent DF — **bez** nowego toru.

---

## 2. Brak zmian silnika / OUT

| Obszar | DF | Werdykt |
|--------|-----|---------|
| AI-COST | OUT D-P1-B-9 | **PASS** |
| Scoring / mapping | bloklista + OUT | **PASS** (zakaz edycji) |
| Providerzy / reorder | OUT | **PASS** |
| Bid Calculator | OUT | **PASS** |
| Cloud Sync CORE | OUT · Gate G3 | **PASS** |
| Allowlista tylko WC + P3.3 + docs | §13 | **PASS** |

**Wniosek:** brak wpływu na Payroll · Bid · CloudLoader · AI-COST · provider registry — **PASS**.

---

## 3. Zakres zamrożony (lista · cap · rollback)

| Check | FROZEN | Werdykt |
|-------|--------|---------|
| 7 robót core `p1b-*` | §4.1 | **PASS** |
| Cap 3–12 · target OPS 7 | D-P1-B-1 | **PASS** |
| Prefiks `p1b-*` · wrocław+dolnyśląsk | D-P1-B-2 | **PASS** |
| Rollback L1–L3 | §11 | **PASS** |
| Ochrona `p1a-*` przy L1–L2 | D-P1-B-10 | **PASS** |
| Bucket triage (zakaz siatki tynkarskiej) | D-P1-B-6 | **PASS** (intencja) |

**Cap 3–12:** dziedziczy uzasadnienie parent AR (koncentracja bucketa · catch 40–80% · max=depth) — **bez zmiany**.

---

## 4. namePl / descriptionPl vs lekcje P1-A — **FAIL**

### 4.1 Mechanizm AS-IS (wiążący)

`scoreWorkAgainstLine` dodaje punkty za **każdy token** `namePl` (len≥4) / `descriptionPl` (len≥5) przez `hay.includes(token)` — **nie** wymaga pełnej frazy.  
Keywords = pełna fraza (OK).

Dlatego D-P1-B-4 / §5.2 zakazuje **gołych** tokenów m.in. `siatka`, `panele`, `brama`, `furtka` w name/desc.

### 4.2 Audyt zamrożonych tekstów §5.3

| ID | Problem tokenizacji | Ryzyko false match |
|----|---------------------|-------------------|
| `p1b-ogrodzenie-siatka-mb` | name/desc zaczyna się od **`Siatka`** → token `siatka` | siatka cięto-ciągniona / tynkarska (CM-03) |
| `p1b-panel-ogrodzeniowy-mb` | token **`panele`** | panele ścienne / elewacyjne |
| `p1b-brama-ogrodzeniowa-szt` | token **`brama`** + **`siatki`** | bramy niespecyficzne · siatka tynkarska |
| `p1b-furtka-ogrodzeniowa-szt` | token **`furtka`** | furtki poza ogrodzeniem |
| `p1b-slupek-ogrodzeniowy-szt` | desc: **`panele`** (+ odmiana siatki) | panele obce |
| `p1b-zdjecie-ogrodzenia-mb` | desc: **`siatki`** / **`paneli`** | j.w. |
| `p1b-ogrodzenie-systemowe-mb` | name/desc bez listy §5.2 | **OK** |

**Werdykt §4:** DF **sam sobie przeczy** — §5.3 narusza §5.2 / D-P1-B-4 / lekcje P1-A.  
Przy seedzie AS-IS OPS odtworzyłby klasę false match (jak ścieki/`ustawienie` w P1-A).

**Wymagane przed Owner GO:** **amend DF §5.3** — name/desc **bez** zabronionych tokenów; sygnał „siatka/brama/…” wyłącznie w **pełnych frazach keywords**.

Przykłady kierunku amend (nie OPS — tylko DF):

| ID | Kierunek namePl (szkic) |
|----|-------------------------|
| siatka-mb | `Ogrodzenie liniowe w ramach na słupkach` (bez słowa siatka) |
| panel-mb | `Ogrodzenie liniowe z paneli stalowych` → unikać gołego `panele`; np. `Odcinek ogrodzenia panelowego` |
| brama-szt | `Skrzydło ogrodzeniowe wjazdowe` / `Brama w ciągu ogrodzenia parcelowego` — bez gołego `brama` jeśli nadal token; lepiej fraza wielowyrazowa zaczynająca od `Ogrodzeniowa…` |
| furtka-szt | `Przejście piesze w ciągu ogrodzenia` |

Keywords z §5.3 (pełne frazy) — **PASS**, zostawić.

---

## 5. Keywords

| Check | Werdykt |
|-------|---------|
| Wyłącznie pełne frazy w §5.3 | **PASS** |
| Fraza `siatka ogrodzeniowa` ≠ match „siatka cięto-ciągniona” | **PASS** (substring pełnej frazy) |
| Opc. keywords z `ustawienie i dzierżawa` tylko jako fraza | **PASS** (uwaga DF #7) |

---

## 6. Hard KPI

| ID | Target DF | Werdykt |
|----|-----------|---------|
| H1 | 3–12 `p1b-*` | **PASS** |
| H2 | Quotes **100%** | **PASS** |
| H3 | false = **0** | **PASS** (gate) — **zagrożony** bez amend §5.3 |
| H4 | regresje 0 | **PASS** |
| H5 | unmatched ↓ ≥25% | **PASS** (mierzalny) |
| H6 | token scan = 0 | **PASS** (gate) — **obecne §5.3 FAIL scan** |

**Wniosek:** definicje KPI **OK**; zamrożone teksty **nie przejdą H6** bez amend.

---

## 7. Soft KPI · Coverage KPI

| ID | Target | Werdykt |
|----|--------|---------|
| S1 HE ≤ 32.4% | Soft | **PASS** |
| S2 CM ≥ 67.6% | Soft | **PASS** |
| S3 fokus `08ded5cb` | Soft | **PASS** |
| K-P1-C1 > 0 | Coverage | **PASS** |
| K-P1-C2 raport | Coverage | **PASS** |

---

## 8. Wpływ na pozostałe moduły

| Moduł | Wpływ | Werdykt |
|-------|-------|---------|
| Payroll / PWRB | brak | **PASS** |
| Bid Calculator | OUT | **PASS** |
| Cloud Sync / Edge CORE | OUT | **PASS** |
| AI-COST / providers | OUT | **PASS** |
| P1-A `p1a-*` | chronione L1–L2 | **PASS** |
| Mobile / nowe UI | brak | **PASS** |

---

## 9. Zasady projektowe

| Zasada | Ocena |
|--------|-------|
| SSOT FIRST | **PASS** (WC + P3.3) |
| REUSE FIRST | **PASS** |
| ZERO DUP | **PASS** |
| Payroll Gate ALL-NIE | **PASS** |
| Token safety (P1-A) | **FAIL** (§5.3 vs scoring AS-IS) |

---

## 10. Werdykt łączny

| Blok | Wynik |
|------|--------|
| Pipeline / REUSE / OUT silnika | **PASS** |
| Cap · lista ID · rollback · KPI definicje | **PASS** |
| Keywords pełne frazy | **PASS** |
| Soft / Coverage | **PASS** |
| Brak wpływu na inne moduły | **PASS** |
| namePl/descriptionPl zgodne z §5.2 / P1-A | **FAIL** |

| | |
|--|--|
| **Werdykt techniczny** | **FAIL** |
| **Decyzja** | **ARCHITECTURE REVIEW FAILED** |
| **Nie** | APPROVED FOR OWNER GO |

---

## 11. Warunki odblokowania Owner GO

```text
1. Amend DF §5.3 (namePl/descriptionPl) — zero tokenów z listy §5.2
2. Ponowny thin Architecture Review P1-B (lub re-check w COMPLETE)
3. Dopiero wtedy APPROVED FOR OWNER GO → OPS
```

**Zakaz:** OPS seed z obecnymi tekstami §5.3 · commit · push · IMPLEMENT silnika.

---

## 12. IC (wiążące po amend — na później)

Po poprawce DF, OPS nadal musi:

| ID | Constraint |
|----|------------|
| **IC-P1-B-1** | Scan tokenów §5.2 = 0 przed OV |
| **IC-P1-B-2** | Quotes wyłącznie `commitMarketQuotesImport` |
| **IC-P1-B-3** | Nie seedować siatki tynkarskiej |
| **IC-P1-B-4** | Nie ruszać `p1a-*` |
| **IC-P1-B-5** | False gate H3 = 0 na 18 + fokus |
