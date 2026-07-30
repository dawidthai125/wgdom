# CATALOG-COVERAGE-01 — AUDIT

> **ID:** CATALOG-COVERAGE-01-AUDIT  
> **EPIC:** **CATALOG-COVERAGE-01** — zwiększenie coverage mapowania materiałów / robót → Biblioteka → Quotes  
> **Etap:** **AUDIT ONLY** · **DOCS ONLY**  
> **STATUS:** **AUDIT COMPLETE**  
> **Data:** 2026-07-30  
> **Wejście:** [`TENDER-VALIDATION-01-REPORT.md`](TENDER-VALIDATION-01-REPORT.md) · `.tmp/tender-validation-01-results.json` · `.tmp/catalog-coverage-01-classify.json`  
> **Zakaz:** IMPLEMENT · commit · push · SMART P1 · MS P2 · zmiany prod  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01 AUDIT
Baseline Quotes coverage: 76.4% (1702/2228)
Unmapped: 526 (100% SMART missing)
Root problem: MAPOWANIE / COVERAGE KATALOGU — nie Quotes/SMART/MS
Noise ATH (filtr): 36 (6.8% unmapped)
Actionable unmapped: 490 (93.2%)
════════════════════════════════════════════════════════
```

---

## 0. Kontekst z TENDER-VALIDATION-01 (FROZEN)

| Fakt | Wartość |
|------|---------|
| Próba | **18** przetargów · **2228** pozycji |
| Product Quotes hit | **1702 / 2228 = 76.4%** |
| SMART Detect missing | **526** |
| mapped + missing Quotes | **0** |
| MARKET-SYNC fillable | **0** |
| One-shot | **0** (P1 niedostępne) |

**Wniosek TV-01 (potwierdzony):** bottleneck jest **wcześniej** niż Quotes/SMART/MS — na torze **opis pozycji → mapowanie → Work Catalog**.

---

## 1. Dlaczego 526 pozycji nie zostało zmapowanych?

Mechanizm AS-IS (`mapOfferBoqLine`):

1. Fold PL + score vs aktywne roboty WC (keywords / nazwa / KNR / jednostka / CM-01 alias).  
2. Primary wymaga sygnału semantycznego (KNR **lub** frazy **lub** kategoria+jm **lub** score≥40 **lub** alias≥28).  
3. Brak primary → `matchMethod=unmatched` → `catalogWorkId=null`.  
4. SMART Detect traktuje to jako **unmapped** (brak useful Quotes).

Na 526 unmapped:

| Klasa | Count | % unmapped | Znaczenie |
|-------|------:|----------:|-----------|
| **Noise / filtr ATH** | **36** | 6.8% | Nie powinny iść do mapowania Quotes |
| **Actionable gap** | **490** | 93.2% | Brak work / słaby score / format opisu |

**Nie** zaobserwowano: mapped work bez Quotes / stale / low_confidence (TV-01).

---

## 2. Najczęstsze przyczyny (multi-label na unmapped)

Klasyfikator RO (`.tmp/catalog-coverage-01-classify.mjs`) — pozycja może mieć wiele tagów:

| Przyczyna (sygnał) | Count | Interpretacja |
|--------------------|------:|---------------|
| **LIBRARY_GAP_OR_SCORE** | **276** | Brak silnego hit vs WC / za niski score (dominanta) |
| **KNR_CODE_HEAVY** | **124** | Opis przeładowany kodami KNR/d.x / „Krotność” — szum semantyczny |
| **UNIT_EMBEDDED** | **98** | jm / „m d.” wklejone w opis — utrudnia fold/score |
| **DIAMETER_SPEC** | **69** | ø / śr. / mm / DN — warianty bez aliasów |
| **ALIAS_GAP_CANDIDATE** | **55** | Powtarzalne frazy bez specialty alias (zawór odpowietrzający, bruzdy, winidur, stop ptaków, gzyms…) |
| **FORMAT_LONG_TECH** | **83** | Opisy >120 znaków (renowacja / projekty / opinie) |
| **ATH_NOISE** | **36** | Kalkulacja własna / transport / artefakty |
| **MANUFACTURER_SKU** | **4** | Rzadkie SKU w opisie |

**Ranking root (biznesowo):**  
1) **luka / score biblioteki** · 2) **format ATH/KNR w opisie** · 3) **specyfikacja średnic/jm** · 4) **brak aliasów** · 5) **noise**.

---

## 3. Dominujące grupy materiałów / robót (po odjęciu noise)

| Grupa | Count | Komentarz |
|-------|------:|-----------|
| **INNE** | **300** | Renowacja detalu, izolacje, inwentaryzacje, rusztowania, Helifix, cegła, opinie… |
| **HYDRAULIKA_CO** | **64** | Zawory, rury, bruzdy, winidur, odpowietrzniki |
| **NOISE_FILTER** | **36** | Kalkulacja własna / transport |
| **ELEKTRYKA_TELETECH** | **34** | Aparaty, kołki, mocowania, oświetlenie detale |
| **PRZYGOTOWANIE_PODLOZA** | **27** | Oczyszczenie, zmywanie, impregnacja |
| **ROZBIORKI** | **26** | Piece, wykucia, demontaże |
| **ELEWACJE_OCIEPLENIA** | **20** | Gzymsy, docieplenie, stop ptaków |
| **GK_ZABUDOWY** | **10** | |
| **DROGI_CHODNIKI** | **4** | |
| **STOLARKA** | **3** | |
| **POSADZKI_TYNKI / MALARSKIE** | 1+1 | |

**INNE (300)** to największy koszyk — nie „jeden materiał”, lecz **ogony domenowe** (renowacja zabytkowa, izolacje specjalne, prace towarzyszące, dokumentacja).

---

## 4. Czy problemem są aliasy / skróty / jm / średnice / producenci / literówki / formaty / KNR / ATH / inne?

| Hipoteza | Werdykt | Dowód |
|----------|---------|-------|
| **Aliasy** | **TAK (istotne, nie #1)** | 55 ALIAS_GAP_CANDIDATE |
| **Skróty** | **CZĘŚCIOWO** | wplecione w KNR/ATH (`m d.`, `śr.`) |
| **Jednostki** | **TAK** | 98 UNIT_EMBEDDED |
| **Średnice** | **TAK** | 69 DIAMETER_SPEC |
| **Producenci / SKU** | **NISKIE** | 4 MANUFACTURER_SKU |
| **Literówki** | **NIE potwierdzone masowo** | brak sygnału w próbie |
| **Formaty nazw** | **TAK** | 83 FORMAT_LONG_TECH + KNR w treści |
| **Opisy KNR** | **TAK** | 124 KNR_CODE_HEAVY |
| **ATH** | **TAK (noise + struktura)** | 36 ATH_NOISE + artefakty LP |
| **Inne = luka WC** | **TAK (#1)** | 276 LIBRARY_GAP_OR_SCORE · INNE 300 |

---

## 5. Ile pozycji to szum do odfiltrowania przed mapowaniem?

| Kategoria Ownera | Count (próba 526) | Uwagi |
|------------------|------------------:|-------|
| **„Kalkulacja własna”** | **31** | Pewne |
| **„Robocizna”** | **0** | Brak hitów regex w unmapped |
| **„Transport”** | **5** | |
| **„LP” / artefakty** | **~0–kilka** | Regex surowy; przykłady `.4 2` z TV-01 istnieją — **niedoszacowanie**; DF powinien rozszerzyć wzorce |
| **„Pozycje techniczne”** | **~124** (KNR_CODE_HEAVY) | Część to realne roboty z kodem w opisie — **nie wszystkie** filtr; część = normalizacja |
| **„Śmieci”** (krótkie) | **0** (@≤3 znaki) | Łącznie z LP → rozszerzyć w DF |
| **SUMA pewnego noise (kalk+transport)** | **36** | **6.8%** unmapped · **1.6%** wszystkich linii |

**Rekomendacja AUDIT:** filtr ATH minimum = **kalkulacja własna + transport + rozszerzone LP/śmieci**; „pozycje techniczne” → raczej **normalizacja opisu**, nie ślepy drop.

---

## 6. Metryki coverage — baseline i potencjał

| Scenariusz | Est. Quotes coverage | Delta vs 76.4% | Założenie |
|------------|---------------------:|---------------:|-----------|
| **Dziś** | **76.4%** | — | 1702/2228 |
| Po **filtrze ATH** (36) — coverage *eligible* | **~77.6%** | +1.2 pp eligible | 1702/(2228−36); hit Quotes bez zmian |
| + **normalizacja** (jm/średnice/KNR strip) | **~82%** | **+~5–6 pp** | ~35% z (UNIT∪DIAMETER∪KNR) actionable → map |
| + **aliasy** specialty | **~84%** | **+~2 pp** | ~50% z 55 alias candidates |
| + **parser/ATH cleanup** | **~86–88%** | **+~2–4 pp** | mniej szumu + lepsze linie wejściowe |
| + **rozszerzenie Product Library** (priorytetowe grupy) | **~90–92%** | **+~4–6 pp** | ~40–50% z 490 actionable |
| Stretch (głębokie INNE / renowacja) | **~95%** | trudne | wymaga szerokiego WC + akceptacji ryzyka false map |

**Realistyczny cel EPIC (po DF):** **88–92%** Quotes coverage na tej samej próbie 18 przetargów — **bez** SMART P1 / MS P2.

---

## 7. Zgodność z zasadami

| Zasada | AUDIT |
|--------|-------|
| SSOT FIRST | Quotes pozostają SSOT rynku; coverage = więcej mapowań do WC |
| REUSE FIRST | REUSE `mapOfferBoqLine` / WC / CM-01 alias — bez nowego silnika |
| ZERO DUPLICATE LOGIC | Zakaz drugiego matchera „coverage” |
| FEATURE-DATA ONLY | Seed WC / aliasy FEATURE; brak Cloud CORE |
| DATA FIRST | Klasyfikacja na realnych 526 unmapped |

---

## 8. Artefakty / NEXT

| Plik | Rola |
|------|------|
| Ten AUDIT | SSOT problemów |
| [`CATALOG-COVERAGE-01-RCA.md`](CATALOG-COVERAGE-01-RCA.md) | Root causes A–F |
| [`CATALOG-COVERAGE-01-PLAN.md`](CATALOG-COVERAGE-01-PLAN.md) | ROI · werdykt DF |

**NEXT:** RCA + PLAN → Owner GO DESIGN FREEZE.
