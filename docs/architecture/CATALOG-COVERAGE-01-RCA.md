# CATALOG-COVERAGE-01 — RCA (Root Cause Analysis)

> **ID:** CATALOG-COVERAGE-01-RCA  
> **EPIC:** CATALOG-COVERAGE-01  
> **Etap:** **RCA ONLY** · **DOCS ONLY**  
> **STATUS:** **RCA COMPLETE**  
> **Data:** 2026-07-30  
> **AUDIT:** [`CATALOG-COVERAGE-01-AUDIT.md`](CATALOG-COVERAGE-01-AUDIT.md)  
> **Zakaz:** IMPLEMENT · commit · push

```text
════════════════════════════════════════════════════════
PRIMARY ROOT CAUSE:
  Work Catalog coverage + mapping score threshold
  vs real ATH line language (KNR/jm/średnice/renowacja)

SECONDARY:
  ATH noise (kalkulacja własna / transport)
  Missing specialty aliases
  Description format pollution (KNR codes in text)

NOT ROOT:
  Product Quotes freshness/confidence
  SMART-PRICING logic
  MARKET-SYNC Publish path
════════════════════════════════════════════════════════
```

---

## 0. Objaw vs przyczyna

| Objaw (TV-01) | Powierzchowna interpretacja | RCA |
|---------------|----------------------------|-----|
| 526 bez useful Quotes | „Brak cen rynku” | **Brak `catalogWorkId`** → Quotes nigdy nie startują |
| MS fillable = 0 | „MS nie działa” | Publish MS wymaga workId — **unmapped nie wchodzi** |
| SMART missing = unmapped | „SMART słaby” | SMART P0 **poprawnie** raportuje lukę wcześniejszą |

---

## A. Problemy jakości danych

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **A1** | Linie ATH niebędące robotami: „Kalkulacja własna” | **P0** | 31 unmapped |
| **A2** | Linie logistyczne: „Transport” / przewóz | **P1** | 5 |
| **A3** | Artefakty LP / fragmenty numeracji (`.4 2`) | **P1** | TV-01 samples; regex niedoszacował |
| **A4** | Pozycje dokumentacyjne / opinie / POR (nie materiał) | **P1** | INNE samples (inwentaryzacja ornitologiczna, projekt organizacji ruchu) |
| **A5** | Duplikaty semantyczne między przetargami (te same wolne lokale) | **P2** | Seria 08decd* / 08dee* |

**Efekt:** zawyżony mianownik „linii do wyceny Quotes”; szum w SMART Detect.

---

## B. Problemy parsera / ATH → OfferBoq

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **B1** | Opis pozycji = sklejka nazwa + KNR + krotność + jm | **P0** | 124 KNR_CODE_HEAVY |
| **B2** | Brak osobnego pola czystego „nazwa robót” vs meta | **P0** | UNIT_EMBEDDED 98 · FORMAT_LONG 83 |
| **B3** | Szum wchodzi do `line.description` mappera | **P0** | A1–A3 |
| **B4** | Parser nie jest winny braku Quotes (mapped mają Quotes) | — | TV-01 mapped+missing=0 |

**Efekt:** sygnał semantyczny dla `mapOfferBoqLine` jest zanieczyszczony → score&lt;próg mimo istniejącego work.

---

## C. Problemy normalizacji

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **C1** | Średnice (ø / śr. / mm / DN) bez kanonicznej formy | **P0** | 69 DIAMETER_SPEC |
| **C2** | jm w tekście (`m2`, `m d.`) vs `line.unit` | **P0** | 98 UNIT_EMBEDDED |
| **C3** | Fold PL istnieje, ale nie usuwa bloków KNR/d.x | **P0** | B1 + fold AS-IS |
| **C4** | Soft unit przy alias (CM-01) działa tylko przy specialty alias hit | **P1** | kod mapping |

**Efekt:** false negative mapowania przy realnej obecności work w WC.

---

## D. Problemy aliasów

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **D1** | CM-01 alias coverage za wąski vs hydraulika/elewacja/teletech detale | **P0** | 55 ALIAS_GAP_CANDIDATE |
| **D2** | Brak aliasów: zawór odpowietrzający, winidur/bruzdy, stop ptaków, gzyms, mocowanie aparatów | **P0** | samples classify |
| **D3** | Alias≠nowa robota — bez work w WC alias nie wystarczy | **P0** | LIBRARY_GAP 276 |

**Efekt:** szybkie wygrane na powtarzalnych frazach **tylko** gdy istnieje target work.

---

## E. Problemy Product Library (Work Catalog)

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **E1** | Luka coverage w HYDRAULIKA / ELEKTRYKA detale / PRZYGOTOWANIE / ROZBIORKI / ELEWACJA detale | **P0** | groupCounts |
| **E2** | Ogromny koszyk INNE (300): renowacja zabytkowa, izolacje specjalne, rusztowania, Helifix, cegła… | **P0** | INNE freq |
| **E3** | Keywords/namePl niedopasowane do języka ATH (długie opisy KNR) | **P0** | C+B |
| **E4** | Quotes na istniejących mapped = OK — problemem nie jest pusty Quotes | — | TV-01 |

**Efekt:** **główny limiter** wzrostu coverage do 90%+.

---

## F. Problemy AI-COST

| ID | Opis | Sev | Dowód |
|----|------|-----|-------|
| **F1** | Heurystyka wycenia unmapped → UI „wszystko ma cenę”, ukrywa lukę SSOT Quotes | **P1** | withoutAnyComponentPrice=0 |
| **F2** | Próg score mapowania (40 / alias 28) konserwatywny — chroni false map, generuje unmapped | **P1** (by design) | `mapOfferBoqLine` |
| **F3** | Brak jawnego statusu „noise / skip Quotes” w torze wyceny | **P1** | SMART pokazuje unmapped=brak Quotes |
| **F4** | AI-COST **nie** psuje Quotes dla mapped | — | 76.4% controlled_market |

**Efekt:** F1–F3 to UX/metryki; **nie** root braku 526 mapowań.

---

## Macierz przyczyn → warstwa

```text
ATH noise (A) ──► filtr przed mapowaniem
      │
ATH format (B+C) ──► normalizacja opisu (strip KNR/jm/średnica)
      │
Brak aliasów (D) ──► REUSE CM-01 alias pack (tylko + work target)
      │
Luka WC (E) ──► FEATURE-DATA seed / keywords  ★ PRIMARY
      │
AI-COST (F) ──► metryki/UX (nie primary fix coverage)
```

---

## Werdykt RCA

| Pytanie | Odpowiedź |
|---------|-----------|
| Co naprawiać najpierw? | **E + A + C/D** (biblioteka · filtr noise · normalizacja/aliasy) |
| Co odroczyć? | SMART P1 FULL · MS P2 · obniżanie progu score bez DF |
| Czy Quotes/SMART/MS są root? | **NIE** |

**RCA STATUS:** **COMPLETE** · spójny z AUDIT · gotowy do PLAN.
