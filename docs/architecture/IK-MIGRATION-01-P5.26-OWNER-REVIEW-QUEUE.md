# P5.26 OWNER REVIEW QUEUE

> **TRYB:** AUDIT / PREPARATION ONLY  
> **Date:** 2026-08-15  
> **HTTP = 0 · Accept = 0 · writes = 0 · code = 0 · commit = 0 · push = 0**  
> **Źródło:** wyłącznie artefakty P5.25+ (bez nowego researchu)

---

## Summary counts

| Bucket | Count |
|---|---:|
| **A. CANDIDATES** | **11** |
| **B. INTERNAL SEMANTIC REVIEW** | **8** |
| **C. CONFIRMED FALSE POSITIVES** | **3** |
| **D. RESEARCH GAP (groups)** | **159** |
| GAP lines (approx) | 294 |
| Semantic family clusters | 5 |
| Missing from expected candidate list | 0 |

---

## A. CANDIDATES

Gotowe do Owner Review. Kolumna **OWNER DECISION** — pusta (wypełnia Owner).

### A.1 Semantic families (dedupe hint)

Jedna decyzja Ownera może pokryć całą rodzinę, jeśli zakres jest akceptowalny.

| FAMILY | GROUPS | BASE PROPOSAL | NOTE |
|---|---|---:|---|
| wykucie-bruzd-72.5 | G015, G024, G081 | 72.5 | Deduped semantic family — one Owner decision can cover all three if scope accepted |
| gruntowanie-13.5 | G035, G036, G067 | 13.5 | Deduped semantic family |
| malowanie-emulsja-21.8 | G092, G107 | 21.8 | PACKAGE complete price check (Owner: farba w cenie jeśli brak wykazu) |
| montaz-grzejnika-97.3 | G153, G154 | 97.3 | PACKAGE montaż grzejnika — scope akumulacyjny+sterownik |
| glowica-termostatyczna-97.3 | G112 | 97.3 | SAME numeric price as grzejnik family — DIFFERENT identity (głowica ≠ grzejnik) |

### A.2 Full candidate table

| GROUP | WORK ID | DESCRIPTION | DOMAIN | UNIT | LINES | SOURCE | URL | PRICE/RANGE | BASE PROPOSAL | CONF | n | LOW SAMPLE? | RESEARCH KEY | INTERNAL MATCH? | WHY CANDIDATE | OWNER DECISION |
|---|---|---|---|---|---:|---|---|---|---:|---|---:|---|---|---|---|---|
| G015 | — (unbound) | Mechaniczne wykucie bruzd dla przewodów wtynkowych w cegle | LABOR | m | 4 | kb_pl | — | 55–90 | 72.5 | LOW | 1 | YES | `LABOR\|m\|mechaniczne wykucie bruzd dla przewodó` | legacy-elektryka-mb | External kb_pl candidate wykucie bruzd · LOW sample · unbound CatalogWork · Owner Knowledg |  |
| G024 | — (unbound) | Wykucie bruzd poziomych 1/4x1 ceg. w ścianach z cegieł na zaprawie cementowo-wapiennej ( n | LABOR | m | 3 | kb_pl | [url](https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/) | 55–90 | 72.5 | LOW | 1 | YES | `LABOR\|m\|wykucie bruzd poziomych 1/4x1 ceg. w ś` | legacy-hydraulika-mb | External kb_pl candidate wykucie bruzd · LOW sample · unbound · Owner Knowledge: LABOR |  |
| G035 | — (unbound) | (z.VII) Gruntowanie podłoży preparatami - powierzchnie pionowe | LABOR | m2 | 2 | kb_pl | [url](https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/) | 10–14 | 13.5 | MEDIUM | 2 | no | `LABOR\|m2\|(z.vii) gruntowanie podłoży preparata` | cc-p0c-w1-zabezpieczenie-folia | External kb_pl candidate gruntowanie · n=2 MEDIUM · unbound |  |
| G036 | — (unbound) | (z.VII) Gruntowanie podłoży preparatami - powierzchnie poziome | LABOR | m2 | 2 | kb_pl | [url](https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/) | 10–14 | 13.5 | MEDIUM | 2 | no | `LABOR\|m2\|(z.vii) gruntowanie podłoży preparata` | cc-p0c-w1-zabezpieczenie-folia | External kb_pl candidate gruntowanie · n=2 MEDIUM · unbound |  |
| G067 | — (unbound) | (z.VII) Gruntowanie podło ż y preparatami-powierzchnie pionowe | LABOR | m2 | 1 | kb_pl | [url](https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/) | 10–14 | 13.5 | MEDIUM | 2 | no | `LABOR\|m2\|(z.vii) gruntowanie podło ż y prepara` | cc-p0c-w1-zabezpieczenie-folia | External kb_pl candidate gruntowanie · n=2 MEDIUM · unbound |  |
| G081 | — (unbound) | Wykucie bruzd o przekroju ( 4cm x  6cm)  do 0.023 m2 poziomych lub pionowych w elementach  | LABOR | m | 1 | kb_pl | [url](https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/) | 55–90 | 72.5 | LOW | 1 | YES | `LABOR\|m\|wykucie bruzd o przekroju ( 4cm x 6cm)` | p2a-rozebranie-rynien-rur-spustowych-mb | External kb_pl candidate wykucie bruzd · LOW sample · unbound · Owner Knowledge: LABOR |  |
| G092 | — (unbound) | Dwukrotne malowanie farbami emulsyjnymi powierzchni wewn ę trznych | LABOR_MATERIAL_PACKAGE | m2 | 4 | kb_pl | [url](https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/) | 21.8 | 21.8 | LOW | 1 | YES | `LABOR_MATERIAL_PACKAGE\|m2\|dwukrotne malowanie ` | p1c-farba-elewacyjna-m2 | External kb_pl candidate malowanie emulsją · PACKAGE (Owner: bez wykazu farby) · LOW sampl |  |
| G107 | — (unbound) | Dwukrotne malowanie farbami emulsyjnymi starych tynków wewnętrznych ścian | LABOR_MATERIAL_PACKAGE | m2 | 2 | kb_pl | [url](https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/) | 21.8 | 21.8 | LOW | 1 | YES | `LABOR_MATERIAL_PACKAGE\|m2\|dwukrotne malowanie ` | p2a-zerwanie-tynkow-wewn-m2 | External kb_pl candidate malowanie emulsją · PACKAGE · LOW sample · verify complete price  |  |
| G112 | — (unbound) | Montaż  głowicy  termostatycznej  przy zaworze grzejnikowym c.o.  o śr. 15 mm. | LABOR_MATERIAL_PACKAGE | szt | 2 | kb_pl | [url](https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/) | 97.3 | 97.3 | LOW | 1 | YES | `LABOR_MATERIAL_PACKAGE\|szt\|montaż głowicy term` | cc-w2-przygotowanie-osprzet | External kb_pl candidate montaż głowicy termostatycznej · LOW n=1 · identity risk: ≠ monta |  |
| G153 | — (unbound) | Montaż grzejnika akumulacyjnego wraz ze sterownikiem o mocy P=1,5 kW w pokoju 2 | LABOR_MATERIAL_PACKAGE | szt | 1 | kb_pl | [url](https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/) | 97.3 | 97.3 | LOW | 1 | YES | `LABOR_MATERIAL_PACKAGE\|szt\|montaż grzejnika ak` | cc-p0c-w1-multiswitch-antenowy | External kb_pl candidate montaż grzejnika akumulacyjnego + sterownik · PACKAGE · LOW sampl |  |
| G154 | — (unbound) | Montaż grzejnika akumulacyjnego wraz ze sterownikiem o mocy P=3,0 kW w pokoju 1 | LABOR_MATERIAL_PACKAGE | szt | 1 | kb_pl | [url](https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/) | 97.3 | 97.3 | LOW | 1 | YES | `LABOR_MATERIAL_PACKAGE\|szt\|montaż grzejnika ak` | cc-p0c-w1-multiswitch-antenowy | External kb_pl candidate montaż grzejnika akumulacyjnego + sterownik · PACKAGE · LOW sampl |  |

---

## B. INTERNAL SEMANTIC REVIEW

**BASE z matcha NIE jest zaakceptowaną ceną.** OWNER DECISION: `ACCEPT` / `REJECT` / `ACCEPT WITH RULE` / `REVIEW`.

| GROUP | BOQ DESCRIPTION | DOMAIN | UNIT | INTERNAL MATCH | MATCH DESCRIPTION | MATCH BASE | MATCH SOURCE | CONF | WHY REVIEW REQUIRED | PACKAGE/LABOR/MATERIAL RELATION | OWNER DECISION |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| G177 | Ścianki działowe GR z płyt gipsowo-kartonowych na rusztach metalowych pojedynczy | LABOR_MATERIAL_PACKAGE | m2 | p2b-scianka-gk-na-stelazu-m2 | Zabudowa działowa z płyt gipsowo-kartonowych na st | 118 | CatalogWork / OUR RATE or Price Memory | HIGH | BOQ PACKAGE vs Owner map LABOR na hostcie; kompletność 118 (płyty+stelaż?) niejasna; 1 host — BASE 1 | PACKAGE ↛ LABOR (Owner classification) — do not reuse BASE as PACKAGE |  |
| G076 | Rozebranie obróbek blacharskich murów ogniowych, okapów, kołnierzy, gzymsów itp. | LABOR | m2 | p2a-rozebranie-obrobek-blacharskich-m2 | Kołnierze okapowe i gzymsy dachowe | 42 | CatalogWork / OUR RATE or Price Memory | HIGH | Nazwa katalogu (kołnierze okapowe/gzymsy) vs pełne BOQ rozebrania obróbek — potwierdzić 1:1 | LABOR ↔ LABOR (scope text risk) |  |
| G134 | Wymiana zaworu gazowego kulowego przelotowego o śr. 20 mm - w instalacjach (przy | LABOR_MATERIAL_PACKAGE | szt | legacy-instalacje_gaz-szt | Instalacje gazowe (szt) | 276 | CatalogWork / OUR RATE or Price Memory | HIGH | Legacy/broad host «Instalacje gazowe (szt)» vs konkretna wymiana zaworu gazowego | PACKAGE ↔ legacy broad LABOR/category |  |
| G135 | Wymiana zaworu grzejnikowego  o śr. 15 mm | LABOR_MATERIAL_PACKAGE | szt | legacy-instalacje_co-szt | Instalacje centralnego ogrzewania (szt) | 257.5 | CatalogWork / OUR RATE or Price Memory | HIGH | Legacy/broad host «Instalacje c.o. (szt)» vs konkretna wymiana zaworu grzejnikowego | PACKAGE ↔ legacy broad LABOR/category |  |
| G144 | Jednowarstwowa izolacja o grubo ś ci 30 mm otulinami z wełny mineralnej m2 d.1 0 | LABOR_MATERIAL_PACKAGE | m2 | p1c-welna-mw-etics-m2 | MW-ETICS izolacja elewacyjna | 120 | CatalogWork / OUR RATE or Price Memory | MEDIUM | Otulina rur PACKAGE ≠ MW-ETICS izolacja elewacyjna — ryzyko FP | PACKAGE ↔ MATERIAL/ETICS (object mismatch) |  |
| G126 | Rurociągi w instalacjach gazowych miedziane o połączeniach lutowanych o śr.zewn. | LABOR_MATERIAL_PACKAGE | m | legacy-instalacje_gaz-mb | Instalacje gazowe (mb) | 65.8 | CatalogWork / OUR RATE or Price Memory | HIGH | Legacy/broad «Instalacje gazowe (mb)» vs rurociągi Cu lutowane — BASE 65.8 NIE UŻYWAĆ | PACKAGE ↔ legacy broad |  |
| G141 | Dwukrotne malowanie farbą olejną uprzednio malowanej stolarki okiennej o powierz | LABOR_MATERIAL_PACKAGE | m2 | legacy-malowanie-m2 | Malowanie (m2) | 21.6 | CatalogWork / OUR RATE or Price Memory | MEDIUM | Legacy «Malowanie (m2)» ≠ malowanie stolarki olejnej PACKAGE — BASE 21.6 NIE UŻYWAĆ | PACKAGE ↔ legacy broad LABOR category |  |
| G143 | Jednokrotne malowanie farbą olejną uprzednio malowanej stolarki okiennej o powie | LABOR_MATERIAL_PACKAGE | m2 | legacy-malowanie-m2 | Malowanie (m2) | 21.6 | CatalogWork / OUR RATE or Price Memory | MEDIUM | Legacy «Malowanie (m2)» ≠ malowanie stolarki olejnej PACKAGE — BASE 21.6 NIE UŻYWAĆ | PACKAGE ↔ legacy broad LABOR category |  |

### Hard bans (already established)

- **G177:** PACKAGE ≠ LABOR host · **118 NIE UŻYWAĆ** bez Owner GO
- **G141 / G143:** «Malowanie (m2)» ≠ malowanie stolarki · **21.6 NIE UŻYWAĆ**
- **G126:** legacy gaz mb · **65.8 NIE UŻYWAĆ**
- PACKAGE ↛ MATERIAL · PACKAGE ↛ LABOR · MATERIAL ↛ PACKAGE · LABOR ↛ PACKAGE

---

## C. CONFIRMED FALSE POSITIVES

**Nie pytaj Ownera ponownie** — utrwalone odrzucenia.

| GROUP | BOQ | FALSE MATCH | BASE | REASON REJECTED | RULE TO REMEMBER |
|---|---|---|---:|---|---|
| G111 | Montaż do gotowego podłoża gniazd wtyczkowych podtynkowych 2-biegunowy | cw.inv.pug60gl1 («PUSZKA PODT.DO G-K 60ŁĄCZ./GŁ.») | 4.33 | PACKAGE→MATERIAL | PACKAGE ↛ MATERIAL — montaż gniazd ≠ puszka |
| G149 | Montaż do gotowego podłoża gniazd wtyczkowych podtynkowych 2-bieg.z uz | cw.inv.pug60gl1 («PUSZKA PODT.DO G-K 60ŁĄCZ./GŁ.») | 4.33 | PACKAGE→MATERIAL | PACKAGE ↛ MATERIAL — montaż gniazd ≠ puszka |
| G150 | Montaż do gotowego podłoża gniazd wtyczkowych podtynkowych podwójnych  | cc-w2-przygotowanie-osprzet («Przygotowanie podłoża pod osprzęt / apar») | 38 | gniazda≠prep | montaż gniazd ≠ przygotowanie osprzętu — nie reuse BASE |

---

## D. RESEARCH GAP SUMMARY

Agregat only — **bez** ponownego researchu i **bez** pytań per grupa.

| Metric | Value |
|---|---:|
| GAP groups | 159 |
| GAP lines (approx) | 294 |

### Domain breakdown (GAP groups)

| DOMAIN | GROUPS |
|---|---:|
| LABOR | 67 |
| LABOR_MATERIAL_PACKAGE | 87 |
| MATERIAL | 5 |

### Source outcome observations (across batches; not unique groups)

| Observation | Count |
|---|---:|
| PARSE_EMPTY / identity / qualify fails | 312 |
| Source unhealthy / unavailable | 3 |
| Source policy rejects | 0 |

| Error | Count |
|---|---:|
| PARSE_EMPTY | 170 |
| PARSE_EMPTY_OR_IDENTITY | 135 |
| upstream_403 | 7 |
| QUALIFY_REJECT | 7 |
| upstream_503 | 6 |
| upstream_404 | 6 |
| SOURCE_UNHEALTHY | 3 |
| unknown_category_key | 2 |

---

## E. OWNER KNOWLEDGE ACTIVE RULES

1. Montaż/wymiana bez osobnego wykazu materiałów → LABOR_MATERIAL_PACKAGE (jedna kompletna cena)
2. Wymiana baterii / podejścia PVC / rurociągi PCW / otuliny / ustęp kompakt / montaż gniazd (bez wykazu) / montaż grzejnika (bez wykazu) → kompletna cena PACKAGE
3. Sam «Grzejnik» / «Gniazdo» → MATERIAL
4. Malowanie bez wykazu farby → PACKAGE; orientacyjnie 1L / 8 m² — seed ≠ BASE
5. Skrzydła drzwiowe → MATERIAL; seed ~300 PLN/szt ≠ auto BASE
6. Opłata utylizacyjna → NON_COST; ~600 PLN/kontener/mieszkanie; NIE × m³
7. Opinia kominiarska → NON_COST; ~300 PLN/szt
8. Wzmocnienie nadproża → PACKAGE
9. Malowanie stolarki → PACKAGE; seed ~200 PLN/okno (50 farba + 150 robocizna) ≠ auto BASE
10. Pomiary elektryczne → mieszkanie ≈500; większy obiekt ≈1000–1500 — sanity only, ≠ auto BASE
11. Podejście pod pralkę → PACKAGE (fi40/50 + syfon); nie reuse samej rury
12. Szyby: prefer 3-szybowe ranges Owner-side — seed ≠ auto Accept
13. HARD: Owner Knowledge NIE jest automatycznym Accept / BASE write

**Twarda zasada:** Owner Knowledge pomaga interpretować candidate, ale **NIE** jest automatycznym BASE / Accept.

Nie pytaj ponownie o rzeczy już ustalone (PACKAGE kompletny, gniazdo≠montaż, grzejnik≠montaż, utylizacja/opinia NON_COST, nadproże/stolarka PACKAGE, pralka=standardowe podejście).

---

## F. DECISION FORMAT

Dla każdej pozycji w A i B Owner odpowiada jedną z:

- `ACCEPT`
- `REJECT`
- `ACCEPT WITH RULE`
- `REVIEW`

Przykłady:

```text
G015 → ACCEPT 72.5
G024 → ACCEPT 72.5   # family wykucie-bruzd
G081 → ACCEPT 72.5
G112 → REJECT 97.3   # głowica ≠ grzejnik
G177 → REVIEW — PACKAGE ≠ LABOR; 118 nie używać
G141 → REJECT 21.6
G143 → REJECT 21.6
```

Po odpowiedzi Ownera → osobny GO na Accept/Write (P5.27+). **Ten dokument nie wykonuje decyzji.**

---

## Absolute stop

```text
P5.26 PREPARATION COMPLETE
HTTP=0 ACCEPT=0 WRITES=0 CODE=0 COMMIT=0 PUSH=0
STOP — czekaj na Owner Review
```
