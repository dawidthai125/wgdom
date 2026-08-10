# TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01

> **TRYB:** SOURCE RESEARCH ONLY · **CODE / COMMIT / PUSH / PRODUCTION / DATA = ZERO**  
> **Date:** 2026-08-10  
> **Baseline:** UI **2.66.23** · tip **`0884fb06`** · PRODUCTION VERIFIED  
> **Prior:** LINE-BINDING-01 · RECIPE-01A · RECIPE-01B (painting) · DECOMPOSITION-01  
> **Roadmap input:** TECHNOLOGY COVERAGE ROADMAP — PRIMING = Wave 1 ROI  
> **Evidence BOQ:** 5 tenders · priming wording sample (ZZK / MOPS / WM) · tip family `priming` ≈ 22 lines UNBOUND  

```text
LAYER LOCK
──────────
RESEARCH ≠ IMPLEMENT
SOURCE ≠ ACTIVE recipe
PI identity ≠ consumption factor
MARKET ≠ PURCHASE
ACCEPT ≠ Purchase
ACCEPT ≠ Offer Cost
Painting 01B ≠ Priming (osobne TechUnit / osobne recipe)
```

---

## 1. Executive verdict

### **A — SOURCE READY**

dla wąskiego profilu:

**`ECONOMY_INTERIOR_PRIMER_V1`**  
= ekonomiczna **lateksowa farba podkładowa / emulsja gruntująca do wnętrz** (1 warstwa), typowa pod malowanie / „gruntowanie podłoży preparatami” w remoncie lokalu.

**Nie** oznacza to, że wszystkie 22 linie z tokenem „grunt*” są gotowe do jednego ACTIVE pack.

| Werdykt cząstkowy | Zakres |
|-------------------|--------|
| **A — READY** | Lateksowy grunt podkładowy (Śnieżka Grunt / Dekoral GRUNT L) · 1 coat · factor z „do m²/L” |
| **OUT / UNBOUND** | Grunty głęboko penetrujące nazwane w BOQ (CT 17 / Atlas Uni-Grunt) · grunt pod hydroizolację · grunt pod klej do płytek · grunt zaprawą cementową · linie „bez gruntowania” (to painting) |
| **PARTIAL** | Linie compound „malowanie + gruntowanie” — OK jako **2 TechUnit**, ale deep-primer named lines ≠ V1 |

**NIE** przechodzić samodzielnie do IMPLEMENT. Następny gate po Owner: **DESIGN FREEZE** (osobne GO).

---

## 2. Real BOQ evidence

Źródło: operate/triage linie z wordingiem grunt* (sample 5 tenderów; treść @ baseline operate `0933aab`; tip recognition `priming`).

### 2.1 Obserwacje zbiorcze

| Obserwacja | Evidence |
|------------|----------|
| Jednostka | niemal zawsze **`m2`** |
| Słowo „gruntowanie” | **TAK** — dominujące |
| „Jednokrotne gruntowanie” | **TAK** (WM: „Jednokrotne gruntowanie”; „jednokrotne gruntowanie podłoża pod kleje…”) |
| „Dwukrotne gruntowanie” | **NIE** w tej próbce jako osobna robota gruntu |
| Rodzaj gruntu nazwany | **TAK** w MOPS: **CERESIT CT 17** + **ATLAS UNI GRUNT** |
| Podłoże / cel | często: pionowe/poziome; „pod tynk”; „pod malowanie”; „pod uszczelnienia”; „pod kleje cementowe”; keramzyt + zaprawa |
| Osobna linia | **TAK** — większość „Gruntowanie podłoży preparatami…” |
| Razem z malowaniem (jawnie) | **TAK** — np. „…malowanie… z jednokrotnym gruntowaniem”; „…z gruntowaniem”; „wraz z gruntowaniem” |
| „Bez gruntowania” | **TAK** — linie malowania (to **nie** PRIMING) |
| Deterministyczna ilość materiału z samego BOQ | **NIE** — BOQ daje **m²** + czasem coats/produkt; **nie** podaje L/m² |

### 2.2 Katalog linii (skrót klasyfikacji SCOPE)

| # | Client | Qty (m²) | Wording (skrót) | SCOPE vs V1 |
|---|--------|----------:|-----------------|-------------|
| 1–2,4–5 | ZZK | 137.69…177.56 | Gruntowanie podłoży preparatami — pionowe/poziome | **IN** (generic preparatami) |
| 3,6 | ZZK | ~3.3–3.5 | Przygotowanie … pod uszczelnienia — gruntowanie | **OUT** (hydro) |
| 7 | MOPS | 133.9 | Gruntowanie … **pod tynk** | **BORDER** — cel tynk, nie farba; V1 lateks pod malowanie = ostrożnie / Owner |
| 8 | MOPS | 133.9 | Dwukrotne malowanie … z **jednokrotnym gruntowaniem** | **COMPOUND** → TechUnit priming (1 coat) + painting (2) |
| 9 | MOPS | 1.39 | Malowanie ościeży … **wraz z gruntowaniem** | **COMPOUND** |
| 10 | MOPS | 181.6 | Gruntowanie … **CERESIT CT 17** i **ATLAS UNI GRUNT** | **OUT V1** → deep primer class |
| 11 | MOPS | 36.32 | Malowanie … **bez gruntowania** | **NOT PRIMING** (painting) |
| 12 | WM | 41.85 | Izolacje … **Gruntowanie** podłoża | **OUT** (hydro) |
| 13–14,16 | WM | 27–210 | Gruntowanie podłoży preparatami | **IN** |
| 15 | WM | 263.17 | Dwukrotne malowanie … **z gruntowaniem** | **COMPOUND** |
| 17 | WM | 6.75 | **Jednokrotne** gruntowanie … **pod kleje cementowe** | **OUT** (tile adhesive) |
| 18–19 | WM | 154.5 | Jednokrotne / Ręczne gruntowanie | **IN** (coats=1 jawne na #18) |
| 20 | WM | 24.76 | Gruntowanie … **zaprawą cementową** | **OUT** (mortar ≠ acrylic primer) |
| 21 | WM | 452.93 | Gruntowanie podłoża z tynku **pod malowanie** | **IN** (best match V1) |
| 22 | WM | 452.93 | Malowanie … **bez gruntowania** | **NOT PRIMING** |

**Wniosek wording:** V1 ma solidne pokrycie dla linii typu „gruntowanie podłoży preparatami” / „pod malowanie” / „jednokrotne gruntowanie”.  
**Nie** wolno jednym factorem pokryć CT17/Atlas, hydro, klejów, zaprawy cementowej.

### 2.3 Czy BOQ sam wystarcza do qty?

```text
qty_L = area_m2 × factor_L_per_m2 × coats
```

- `area_m2` — **z BOQ** (KNOWN)  
- `coats` — często 1 (SOURCE + czasem wording); inaczej PARAMETER_REQUIRED  
- `factor` — **tylko ze SOURCE** (nie z ATH)

---

## 3. Candidate products

Dwie **klasy** produktów (nie mylić):

| Klasa | Charakter | Kandydaci | Pasuje do typowego „pod malowanie”? |
|-------|-----------|-----------|-------------------------------------|
| **A. Lateksowa farba podkładowa** | biała emulsja gruntująca, 1 warstwa, m²/L | Śnieżka Grunt · Dekoral GRUNT L | **TAK** — economy / pustostany |
| **B. Grunt głęboko penetrujący** | rzadka dyspersja, kg/m² lub L/m² **zakres** | Atlas UNI-GRUNT · Ceresit CT 17 | **TAK** też w BOQ (nazwane), ale **inny model zużycia** |

Polityka Owner (economy / wygrywanie przetargów): klasa **A** jako pierwszy recipe — spójna z painting 01B (osobno).  
Klasa **B** = przyszły osobny profil lub UNBOUND gdy nazwana / cel ≠ lateks podkładowy.

---

## 4. Official sources (kandydaci)

### P1 — Śnieżka Grunt (lateksowa emulsja podkładowa)

| Pole | Wartość |
|------|---------|
| PRODUCT | Śnieżka Grunt — Lateksowa emulsja podkładowa do wnętrz |
| PRODUCENT | Śnieżka |
| TDS / SOURCE | Oficjalna strona produktu + link „Karta Techniczna Śnieżka Grunt” na tej stronie |
| URL | https://www.sniezka.pl/produkt/sniezka-grunt |
| DATA / VERSION | Stan strony research 2026-08-10 (TDS PDF — wersja wg producenta w pliku KT; pin przy DF) |
| RECOMMENDED USE | Wnętrza; pierwsze malowanie GK / niejednorodna faktura; pod emulsje nawierzchniowe |
| COVERAGE | **do 10 m²/l przy jednokrotnym malowaniu** |
| UNIT | m²/L → L/m² |
| NUMBER OF COATS | **Ilość warstw: 1** (strona producenta) |
| SUBSTRATE | Suche, czyste; mocno chłonne → zalecany najpierw inny grunt ACRYL-PUTZ (osobny produkt — **nie** wliczać w V1) |
| NOTES | „do” = górna wydajność nominalna; praktyka zależy od chłonności |
| SOURCE QUALITY | **B** (oficjalna strona) + **A** gdy Owner pinuje pobrany TDS z linku producenta |

### P2 — Dekoral GRUNT L

| Pole | Wartość |
|------|---------|
| PRODUCT | Dekoral GRUNT L — lateksowa farba podkładowa |
| PRODUCENT | Dekoral (PPG Deco Polska) |
| TDS / SOURCE | Oficjalna strona + „Karta Techniczna Produktu” (PDF na stronie) |
| URL | https://dekoral.pl/produkty/dekoral-grunt-l |
| DATA / VERSION | Research 2026-08-10 |
| RECOMMENDED USE | Wnętrza; tynki, GK; pod emulsje akryl/lateks |
| COVERAGE | **12 m²/l** (strona); TDS dystrybutora zgodny: **do 12 m²/l** przy 1 warstwie, zależnie od chłonności |
| UNIT | m²/L |
| NUMBER OF COATS | Specyfikacje / TDS: **1** warstwa |
| SUBSTRATE | Silnie chłonne/pyliste → Acryl grunt Progold 1:1 (**osobny** — OUT V1 factor) |
| NOTES | Economy; spójny ekosystem z farbami Dekoral z painting 01B set |
| SOURCE QUALITY | **B** + **A** (TDS PDF na stronie producenta) |

### P3 — ATLAS UNI-GRUNT (nazwany w BOQ)

| Pole | Wartość |
|------|---------|
| PRODUCT | ATLAS UNI-GRUNT |
| PRODUCENT | Atlas |
| TDS / SOURCE | https://www.atlas.com.pl/produkt/atlas-uni-grunt-471-390/ |
| COVERAGE | **0,05 – 0,2 kg/m²** (zależnie od chłonności; gęstość ~1,0 → rząd **0,05–0,2 L/m²**) |
| COATS | Gotowy / rozcieńczenia wg tabeli TDS; chłonne podłoża mogą wymagać więcej |
| NOTES | **Zakres 4×** — bez wyboru Owner / substratu **nie** da się jednej liczby bez zgadywania |
| SOURCE QUALITY | **A/B** oficjalne |
| V1 | **OUT** — osobna klasa |

### P4 — Ceresit CT 17 (nazwany w BOQ)

| Pole | Wartość |
|------|---------|
| PRODUCT | Ceresit CT 17 (Profi) — grunt głęboko penetrujący |
| PRODUCENT | Henkel / Ceresit |
| TDS / SOURCE | https://datasheets.tdx.henkel.com/CERESIT-CT-17-pl_PL.pdf |
| COVERAGE | **0,1 – 0,5 l/m²** zależnie od równości i nasiąkliwości |
| COATS | TDS: przy mocno chłonnych **dwie warstwy** (1. rozcieńczona 1:1, 2. bez); pod farby możliwe rozcieńczenie 1:1 |
| NOTES | Zakres **5×**; druga warstwa warunkowa — **PARAMETER / UNBOUND** bez Owner policy |
| SOURCE QUALITY | **A** (oficjalny TDS PDF) |
| V1 | **OUT** |

**KNR:** nie wymagany do V1 lateks — TDS producentów wystarcza. LICENSE REVIEW = N/A dla V1.

---

## 5. Coverage / consumption

### Klasa A (V1)

| Produkt | Stated coverage (1 coat) | Uwagi |
|---------|--------------------------|-------|
| Śnieżka Grunt | **do 10 m²/L** | oficjalna strona |
| Dekoral GRUNT L | **12 m²/l** / **do 12** w TDS | oficjalna strona + TDS |

### Klasa B (OUT V1)

| Produkt | Stated | Czy jedna liczba? |
|---------|--------|-------------------|
| Atlas UNI-GRUNT | 0,05–0,2 kg/m² | **NIE** bez substratu |
| CT 17 | 0,1–0,5 L/m² | **NIE** |

---

## 6. Normalization

```text
coverage_m2_per_L     = wartość z TDS / strony (1 coat)
factor_L_per_m2_1coat = 1 / coverage_m2_per_L
```

| Produkt | coverage | factor 1 coat (L/m²) |
|---------|----------|----------------------|
| Śnieżka Grunt | 10 | **1/10 = 0.10** |
| Dekoral GRUNT L | 12 | **1/12 ≈ 0.083333** |

### Zakres / „do X”

Producent podaje **górną** wydajność („do”). Real może być **gorsza** (więcej L/m²) na chłonnym podłożu — **nie ukrywać**.

| Opcja | Reguła | L/m² (1 coat) | Pasuje do ECONOMY / TENDER SAFE? |
|-------|--------|---------------|----------------------------------|
| Optimistic | najlepsza w set = 12 m²/L | 0.083333 | niższy koszt materiału — **wyższe ryzyko niedoszacowania** |
| Midpoint | np. 11 m²/L | ~0.0909 | **Wymyślone** — **NIE rekomendować** jako SOURCE |
| **Conservative (set)** | najgorsza w set = **10 m²/L** | **0.10** | **TAK** — tender-safe w klasie A |

**Rekomendacja V1 (jak painting Option B):**  
**Conservative set factor = 0.10 L/m²** (1 coat), pinned do Śnieżka „do 10” jako floor coverage w economy set.

Ograniczenie: to nadal **nominalne „do”**, nie gwarancja na sypiące/mocno chłonne podłoża (producenci wskazują wtedy **inny** grunt penetrujący — OUT V1).

---

## 7. Coat analysis

| Źródło | Coats |
|--------|-------|
| Śnieżka Grunt — strona | **Ilość warstw: 1** · „nakładać jedną warstwę” |
| Dekoral GRUNT L — TDS/spec | **1** |
| BOQ | „jednokrotne gruntowanie”; „z jednokrotnym gruntowaniem”; często samo „gruntowanie” bez liczby |
| CT 17 TDS | 2 warstwy **warunkowo** (chłonne) — OUT V1 |

**Czy wolno przyjąć coats=1 jako standard V1?**

**TAK — z uzasadnieniem SOURCE** dla klasy lateksowej farby podkładowej (P1/P2), gdy:

1. linia jest w SCOPE V1, **oraz**  
2. BOQ nie mówi „dwukrotne gruntowanie”, **oraz**  
3. linia nie wskazuje CT17/Atlas / hydro / klej / zaprawa.

Gdy BOQ milczy o liczbie warstw, coats=1 = **manufacturer standard**, nie „zgadywanie rynkowe”.

Gdy BOQ / cel / produkt wskazują deep primer z możliwą 2. warstwą → **PARAMETER_REQUIRED / UNBOUND** (nie V1).

**Nie** tworzyć domyślnego „gruntowanie=1” globalnie dla wszystkich rodzin gruntów.

---

## 8. Waste analysis

- TDS klas A: **brak** osobnego „+10% waste”.  
- Wydajność „do X m²/L” już jest optymalistycznym kresem; conservative 0.10 L/m² częściowo buforuje vs Dekoral 12.  
- **Nie** dodawać arbitralnego +5/+10/+15%.

**Rekomendacja:** `wastePolicy = included_in_factor` (jak painting 01B).

---

## 9. MaterialKey REUSE check

| Key | Status |
|-----|--------|
| **`mat.grunt`** | **ISTNIEJE** — PI / material-market-map · unit **`l`** · S2-C Owner LOCK · `cw.product.grunt` |
| Nowy key | **NIE WYMAGANY** do pierwszego wire V1 |

```text
REUSE: mat.grunt
NEW MATERIAL KEY REQUIRED — NIE (dla V1)
```

Identity ≠ consumption: `mat.grunt` dziś = ścieżka ceny; factor dopiero po Owner APPROVE + DF + IMPLEMENT.

---

## 10. Painting relationship

| Fact | Evidence |
|------|----------|
| Jawne PRIMING + PAINTING w jednej linii | TAK (MOPS/WM „z gruntowaniem” / „z jednokrotnym gruntowaniem”) |
| Jawne malowanie **bez** gruntowania | TAK |
| Osobne linie grunt + osobne malowanie | TAK |

**Reguła (Decomposition Architecture B):**

```text
EXPLICIT compound → TechUnit priming + TechUnit painting
PRIMING recipe (V1) + PAINTING recipe (01B)
≠ compound mega-recipe
≠ automatyczne dodawanie primingu do każdej farby
≠ automatyczne dodawanie farby do każdego gruntu
```

01B świadomie **wyłączył** primer z factor farby — V1 **uzupełnia** lukę, nie scala packów.

---

## 11. Legal / source quality

| Źródło | Quality | ACTIVE recipe OK? |
|--------|---------|-------------------|
| Śnieżka produkt + KT | B → A (pin TDS) | TAK |
| Dekoral produkt + KT PDF | B + A | TAK |
| Atlas / CT 17 oficjalne | A/B | TAK dla **osobnego** profilu; **nie** mieszać w V1 |
| Blogi / fora / AI typical | — | **ZAKAZ** |
| KNR | — | **NIE potrzebny** do V1 |

---

## 12. Risks

1. **Dwie klasy gruntów w real BOQ** — błędne użycie lateks V1 na linii CT17/Atlas = zły materiał i zły qty.  
2. **„do m²/L”** — niedoszacowanie na bardzo chłonnych podłożach.  
3. **Cel ≠ farba** (hydro, klej, tynk, zaprawa) — fałszywy bind.  
4. **Compound lines** — ryzyko double-count jeśli malowanie+gruntowanie źle zdekomponowane.  
5. **Podwójne gruntowanie** (Acryl przed Śnieżka Grunt na sypiącym) — OUT; nie invent.  
6. **MARKET≠PURCHASE** — factor qty ≠ cena; Purchase osobno.

---

## 13. Proposed ECONOMY_PRIMING_V1 (DESIGN ONLY — nie implementować)

```text
SystemId:     ECONOMY_INTERIOR_PRIMER_V1
Technology:   priming (CostItemFamily / TechUnit family)
Product set:  Śnieżka Grunt + Dekoral GRUNT L (economy latex primer)
Policy:       CONSERVATIVE set coverage = 10 m²/L
factor:       0.10 L/m² @ coats=1
coats:        1 (SOURCE; BOQ „jednokrotne” gdy obecne)
wastePolicy:  included_in_factor
materialKey:  mat.grunt   (REUSE)
factorSourceKind (future): owner_approved
factorSourceRef (future):  OWNER://ECONOMY_INTERIOR_PRIMER_V1@<date>
                           + pinned manufacturer URLs/TDS
```

### Flow (propozycja)

```text
BOQ line (SCOPE V1)
  → decomposition → TechUnit priming
  → coats = 1 (SOURCE / „jednokrotne”) else PARAMETER_REQUIRED
  → ACTIVE TechnologyPack (FUTURE — nie teraz)
  → projectProductionBom → mat.grunt litres
  → PI (Market quote) ≠ Purchase
  → Purchase → Real Cost → Offer
```

### UNBOUND when

- family ≠ priming / OUT scope  
- named deep primer (CT 17, Atlas Uni-Grunt, …) bez osobnego recipe  
- hydro / klej / zaprawa cementowa  
- coats nieustalone **i** poza standardem V1  
- brak ACTIVE pack (stan dzisiejszy tip)

### OUT of V1 (explicit)

- Ceresit CT 17 / Atlas UNI-GRUNT / inne deep primers  
- grunt pod uszczelnienia / hydroizolację  
- grunt pod kleje do okładzin  
- grunt zaprawą cementową  
- malowanie „bez gruntowania”  
- automatyczny priming przy samym painting

---

## 14. Exact missing information (przed IMPLEMENT)

| # | Brak | Owner action |
|---|------|--------------|
| 1 | Formalne **Owner APPROVE** factor **0.10 L/m²** + wastePolicy | GO / zmiana policy |
| 2 | Pin **konkretnych URL TDS PDF** (hash/data pliku) w DF | przy DESIGN FREEZE |
| 3 | Decyzja: czy linie „pod tynk” ∈ V1 czy UNBOUND | scope DF |
| 4 | Osobny profil deep-primer (CT17/Atlas) — **nie** w tym research jako READY single factor | przyszły research |
| 5 | Implement / ACTIVE pack / wiring | **ZAKAZ** w tym gate |

**Nie brakuje:** materialKey (`mat.grunt` REUSE) · wiarygodnego SOURCE klasy A/B dla lateks V1 · uzasadnienia coats=1 dla tej klasy.

---

## 15. Recommendation for next gate

| Gate | Status |
|------|--------|
| SOURCE RESEARCH PRIMING-01 | **DONE** · werdykt **A** (wąski V1) |
| **DESIGN FREEZE — ECONOMY_INTERIOR_PRIMER_V1** | **NASTĘPNY** — tylko po **Owner GO** |
| IMPLEMENT / ACTIVE pack | **NIE** — bez DF + Owner GO |
| Deep-primer SOURCE RESEARCH | osobny gate (zakresy 0,05–0,5) |

---

## FINAL BOX

```text
VERDICT: A — SOURCE READY
PROFILE: ECONOMY_INTERIOR_PRIMER_V1
PRODUCT SET: Śnieżka Grunt + Dekoral GRUNT L
FACTOR (proposed conservative): 0.10 L/m² @ 1 coat
COVERAGE PIN: 10 m²/L
WASTE: included_in_factor
MATERIALKEY: mat.grunt (REUSE)
COATS: 1 (manufacturer standard for class A)
CODE: NO
COMMIT: NO
PUSH: NO
PRODUCTION: NO
ACTIVE PACK: NO
IMPLEMENT: NO
```

**STOP. Czekaj na Owner — nie przechodź sam do DESIGN FREEZE / IMPLEMENT.**
