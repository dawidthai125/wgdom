# CENY-MATERIAŁÓW-02 — VALIDATION COMPLETE

> **ID:** CENY-MATERIAŁÓW-02-VALIDATION-COMPLETE  
> **TRYB:** TEST / AUDYT · **BEZ zmian w kodzie · BEZ commit · BEZ push**  
> **Data:** 2026-07-29  
> **Feature pod testem:** CENY-MATERIAŁÓW-01 · tip **2.65.80** / **`c2d504d`**  
> **Źródło danych:** Cloud KV `kw-tenders-pipeline` + `kw-wgdom-work-catalog` (READ-ONLY)  
> **Evidence:** `.tmp/ceny-materialow-02-validation.json` · probe `.tmp/ceny-materialow-02-validation-probe.mjs`

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-02 VALIDATION COMPLETE
Decyzja: REQUIRES IMPROVEMENTS
════════════════════════════════════════════════════════
```

---

## 1. Werdykt

| | |
|--|--|
| **Decyzja** | **REQUIRES IMPROVEMENTS** |
| **Nie** | PASS (pełne cele Phase 1 na realnych danych) |
| **Regresje** | **0 / 18** |
| **Poprawa originów** | **6 / 18** (głównie `work_catalog` ↑ / `heuristic` ↓) |
| **Blokada `controlled_market`** | **TAK** — **0%** OFF i ON na całej próbie (brak Quotes) |

**Uzasadnienie:** mapping uplift działa i obniża heuristic na części spraw, ale **KPI `controlled_market` nie rusza** bez zasilenia `marketQuotes`; katalog aktywny ma tylko **34** roboty — za wąsko vs realne przedmiary (chodniki, ogrodzenia, elewacje specjalne).

---

## 2. Próba

| Pole | Wartość |
|------|---------|
| Pipeline (KV) | **309** pozycji |
| Z użytecznym kosztorysem (`resolveKosztorysSnapshotForPricing`) | **18** |
| Próba walidacyjna | **18** (wszystkie dostępne z BOQ) |
| Rozkład | large **7** · medium **10** · small **1** |
| Branże / typy | remonty pustostanów · elewacje · klatki · ośrodek (Aggregate) · chodniki · ogrodzenie · toalety UM · TBS |
| Work Catalog (aktywne) | **34** roboty |
| Flaga OFF/ON | `forceCenyMaterialow01ForTests` w procesie probe (bez mutacji prod LS) |

---

## 3. Metryki zbiorcze (OFF → ON)

| Metryka | Wynik |
|---------|--------|
| Śr. Δ `controlled_market` (pp materiałów) | **0.00** |
| Śr. Δ `work_catalog` (pp) | **+1.48** |
| Śr. Δ `category_rate` (pp) | **0.00** (w tej próbie materiały ≈ WC + heuristic; category_rate mat. ≈ 0) |
| Śr. Δ `heuristic_estimate` (pp) | **−1.48** |
| Śr. Δ `% linii z catalogWorkId` | **+0.27** pp |
| Przetargi z poprawą | **6** |
| Bez zmian originów | **11** |
| Value shift bez poprawy originów | **1** |
| Regresje | **0** |
| Quotes `withQuotes` (średnio / typowo) | **0** na wszystkich 18 |
| Quotes `withoutQuotes` (matched works) | typowo **7–22** / sprawę |
| Czas build OfferBoq OFF / ON / ON-repeat | **46 / 54 / 54 ms** śr. — memo bez regresji czasu; brak I/O |

---

## 4. Zestawienie per przetarg

Wartość = `directPln` OfferBoq. Origins = **udział PLN komponentów materiałowych**.

| ID (skr.) | Bucket | Linie | OFF PLN | ON PLN | Δ PLN | Δ % | WC OFF→ON | HE OFF→ON | catWorkId % | Outcome |
|-----------|--------|------:|--------:|-------:|------:|------:|-----------|-----------|-------------|---------|
| 08dec13d | large | 302 | 2 034 928 | 2 035 178 | +250 | ~0 | 59.8→60.0 | 40.2→40.0 | 57.6→57.9 | improved |
| 08debcad | large | 221 | 559 989 | 560 426 | +437 | +0.1 | 68.5→68.5 | 31.5→31.5 | 100 | value_shift |
| 08dee335 | large | 196 | 605 985 | 605 811 | −174 | ~0 | 82.4→82.4 | 17.6→17.6 | 69.4→70.4 | improved |
| 08decd21 | large | 178 | 199 388 | 199 388 | 0 | 0 | 67.6 | 32.4 | 73 | no_change |
| 08dee8b8 | large | 167 | 155 636 | 155 636 | 0 | 0 | 75.1 | 24.9 | 76.6 | no_change |
| 08decd1d | large | 159 | 101 265 | 101 265 | 0 | 0 | 78.3 | 21.7 | 80.5 | no_change |
| 08ded02d | large | 158 | 117 901 | 117 901 | 0 | 0 | 78.1 | 21.9 | 82.3 | no_change |
| 08dee3f6 | medium | 115 | 1 178 003 | 1 337 385 | **+159 382** | **+13.5** | **47.8→70.1** | **52.2→29.9** | 50.4→53.9 | **improved** |
| 08ded8e7 | medium | 100 | 97 500 | 97 500 | 0 | 0 | 77.0 | 23.0 | 80 | no_change |
| 08dee178 | medium | 80 | 75 622 | 77 544 | +1 923 | +2.5 | 70.8→71.9 | 29.2→28.1 | 72.5 | improved |
| 08dec6bc | medium | 76 | 88 397 | 92 242 | +3 845 | +4.4 | 75.0→76.5 | 25.0→23.5 | 71.1 | improved |
| 08debd4b | medium | 72 | 67 671 | 70 234 | +2 564 | +3.8 | 69.8→71.3 | 30.2→28.7 | 76.4 | improved |
| 08debfde | medium | 69 | 64 452 | 64 452 | 0 | 0 | 71.5 | 28.5 | 72.5 | no_change |
| 08debbce | medium | 69 | 136 735 | 136 735 | 0 | 0 | 72.8 | 27.2 | 87 | no_change |
| 08debd77 | medium | 47 | 27 228 | 27 228 | 0 | 0 | 79.7 | 20.3 | 76.6 | no_change |
| 08deb669 | medium | 45 | 4 366 | 4 366 | 0 | 0 | 44.3 | 55.7 | 28.9 | no_change |
| 08decd0e | medium | 43 | 430 111 | 430 111 | 0 | 0 | 37.5 | 62.5 | 20.9 | no_change |
| 08ded5cb | small | 5 | 66 006 | 66 006 | 0 | 0 | 0 | **100** | 20 | no_change |

`controlled_market` = **0%** na wszystkich wierszach (OFF i ON).

---

## 5. Największe zyski

| Sprawa | Efekt |
|--------|--------|
| **08dee3f6** elewacje (Nowowiejska) | WC **+22.3 pp** · HE **−22.3 pp** · direct **+159 k PLN (+13.5%)** · catalogWorkId **+3.5 pp** |
| Pustostany (08dec6bc / 08debd4b / 08dee178) | WC **+1.1…1.5 pp** · HE ↓ · direct **+1.9…3.8 k PLN** |
| 08dec13d Sępa Szarzyńskiego | lekki uplift mapping / WC |

---

## 6. Największe problemy / residual heuristic

| Sprawa | HE ON | Przyczyna (próbki) |
|--------|------:|--------------------|
| **08ded5cb** ogrodzenie kortów | **100%** | **brak mappingu** — brak robót WC dla siatki/ogrodzeń; 1 matched work bez Quotes |
| **08decd0e** chodniki | **62.5%** | **brak mappingu** — rozbiórki/podbudowy poza katalogiem 34 pozycji |
| **08deb669** Grafit (XLS oferta) | **55.7%** | **zły/niepełny przedmiar** (formularz oferty w BOQ) + brak mappingu |
| **08dec13d** | **40%** | mix: **brak mappingu** (docieplenie/zerwanie) + **mapping bez controlled_market** (Quotes puste → spad do WC/heuristic) |

### Klasyfikacja residual heuristic (ON)

| Przyczyna | Obserwacja |
|-----------|------------|
| **Brak Quotes** | **Dominująca dla toru `controlled_market`** — `withQuotes=0` na 18/18; matched works mają `withoutQuotes` > 0 |
| **Brak mappingu** | Częste na specjalistycznych opisach (ogrodzenia, chodniki, docieplenia) |
| **Brak pozycji Work Catalog** | Katalog **34** aktywne — za wąski vs realny ATH/PDF |
| **Inny** | Śmieciowe linie z XLS formularza oferty (08deb669) — problem Discovery/parser, nie CM-01 |

---

## 7. Memo / performance

| Check | Wynik |
|-------|--------|
| ON vs ON-repeat | **54 ≈ 54 ms** — brak regresji; memo nie dokłada I/O |
| Supabase w buildzie OfferBoq | **0** dodatkowych zapytań (probe czyta KV tylko do pobrania próbki) |

---

## 8. Wnioski (bez IMPLEMENT)

1. **CM-1 mapping** — działa na części spraw (szczególnie elewacje); średnio **+1.5 pp WC / −1.5 pp HE**; **0 regresji**.  
2. **CM controlled_market** — **nieaktywny na produkcji** bez Quotes (IC-3 potwierdzony empirycznie).  
3. **CM-2 Quotes gaps** — diagnostyka adekwatna: wszystkie matched works = braki Quotes.  
4. **Następny krok biznesowy (nie ten audyt):** ops P3.3 import Quotes + rozszerzenie seed/katalogu branż „dziurawych” — osobny GO / thin slice, **nie** re-open kodu CM-01 w tym raporcie.

---

## 9. Decyzja

**REQUIRES IMPROVEMENTS**

Warunki ewentualnego PASS w CM-02bis (po ops, bez konieczności nowego kodu CM-01):

- `controlled_market` > 0 na ≥ części próby po imporcie Quotes, **lub**
- wyraźny spadek HE przy utrzymaniu 0 regresji po uzupełnieniu katalogu/Quotes.

**Commit / push / implementacja:** **nie wykonano.**
