# CENY-MATERIAŁÓW-04 P2 — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE  
> **Etykieta:** P2 — WC + Quotes · **Depth** (ROZBIORKI → ELEKTRYKA / GK / HYDRAULIKA)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **AMEND A1–A4 (2026-07-30)** · OPS / IMPLEMENT **ZABLOKOWANY** do thin AR PASS + Owner GO  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push / OPS / zmian kodu**  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P2 PLAN **PASS** · AR **CHANGES REQUIRED** ([`…-P2-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-P2-ARCHITECTURE-REVIEW.md)) · tip UI **2.65.83** · feature **`992023cc`**  
> **Parent EPIC DF:** [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) §4.3 / §7.3  
> **Amend SSOT:** [`CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE-AMEND-A1-A4.md`](CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE-AMEND-A1-A4.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P2):
  Zamrozić: legacy keyword EXTEND → nowe CatalogWork depth
  + Quotes P3.3 → controlled_market — BEZ AI-COST / scoringu.
  Kolejność: najpierw rozszerzenie legacy, potem nowe ID.
  Keywords = wyłącznie pełne frazy · zero generycznych tokenów.
  AMEND A1–A4: token name §6.2 · anti-dup EXTEND↔NEW.

OPS / IMPLEMENT zakazany do:
  thin Architecture Review PASS + Owner GO (per slice P2-A / P2-B).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE   (zakaz edycji cloud-sync.ts · brak nowych DATA_KEYS)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE · OfferBoq = ZERO nowych / ZERO reorder
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS P2-A / P2-B: TAK — po Arch Review PASS
```

Naruszenie Gate / edycja `cloud-sync.ts` / nowi providerzy / scoring / Bid → **STOP** · amend DF.

---

## 1. Cel architektoniczny (zamrożony)

Zmniejszyć **częstość** unmatched / HE na sprawach remontowych przez **wyłącznie dane**:

1. **najpierw** keyword EXTEND na istniejących `legacy-*` (pełne frazy),  
2. **potem** nowe `CatalogWork` `p2a-*` / `p2b-*` tam, gdzie legacy jest za szerokie albo wymaga osobnej ceny,  
3. **product** `marketQuotes` na **każdym** nowym ID (+ verify Quotes na legacy po EXTEND),  
4. tor odczytu AS-IS: `computeMarketAverage` → `controlled_market` → OfferBoq.

**Sukces P2 ≠** Bid ≈ 1,6M · **≠** triaż INNE.  
**Sukces P2 =** K-P2-1…3 + AC §11 + false **0**.

---

## 2. Decyzje zamrożone (D-P2-A…I)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P2-A** | Kolejność slice | **1** P2-A ROZBIORKI → **2** P2-B depth instalacji |
| **D-P2-B** | K-P2-2 trades | Hard: depth w ROZBIORKI **oraz** ≥**1** z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK}. Soft OPS: pokryć **wszystkie 3** trade jeśli residual probe ≥ ROI |
| **D-P2-C** | Cap | **3–12** nowych aktywnych / slice · target OPS: P2-A **6** · P2-B **6** |
| **D-P2-D** | Quotes | **100%** product na **nowych** przed CLOSE · `price` = `companyPricePln` · origin preferowany `wgdom` |
| **D-P2-E** | Baseline K-P2-1 | Linie ROZBIORKI: default CM-03 **38**; po readonly probe → `baseline_rozbiorki_lines = probe_residual` (jeśli probe &lt; 38) · target ≤ **50%** wybranego baseline |
| **D-P2-F** | Token safety | §6 — keywords = pełne frazy · zakaz generyków w name/desc |
| **D-P2-G** | Anti-dup | Jedna klasa residual → **jeden** workId · najpierw EXTEND legacy · nowe ID tylko gdy §4.0 |
| **D-P2-H** | Forma | OPS-first · **0 LOC** AI-COST / scoring / Bid / Cloud CORE / parser |
| **D-P2-I** | OUT | INNE (P3) · residual DROGI/ELEW jako główny cel · nowe branże · ślepy seed · stolarka EI masowa · SSP/multiswitch bez triage |

Zmiana D-P2-* = **amend DF** + Owner GO.

**Dziedziczone z EPIC DF (bez zmian):** D-A (pipeline P3.3) · D-B (zakaz AI-COST) · D-F (work bez Quotes = nie CLOSE) · D-H (OPS-first).

---

## 3. Pipeline (zamrożony — AS-IS)

```text
[1] Keyword EXTEND na legacy-*          (Biblioteka · pełne frazy)
[2] Nowe CatalogWork p2a-* / p2b-*      (tylko gdy D-P2-G)
[3] CSV Product Quotes
        │
        ▼
previewMarketCsvImport                  (P3.2 — REUSE)
        │
        ▼
commitMarketQuotesImport                (P3.3 — JEDYNY zapis Quotes)
        │
        ▼
kw-wgdom-work-catalog                   (SSOT)
        │
        ▼
computeMarketAverageForWork → controlled_market → OfferBoq
```

**MUST NOT:** omijać `commitMarketQuotesImport` · scrapery · reorder providerów · re-open CM-01 · zamykać slice bez Quotes 100% na nowych.

---

## 4. Finalny scope P2 (FROZEN)

### 4.0 Reguła EXTEND vs NEW (FROZEN)

| Warunek | Akcja |
|---------|--------|
| Residual pasuje do istniejącego `legacy-*` (trade+unit) **i** cena legacy akceptowalna **i** brak ryzyka false-match z innymi klasami | **LEGACY EXTEND** — tylko `keywords[]` (pełne frazy) |
| Potrzebna **osobna** `companyPricePln` / izolacja false-match / jednostka nie pokryta | **NEW** `p2a-*` / `p2b-*` |
| Residual już pokryty przez `p1a-rozebranie-*` / `p1b-*` / `p1c-*` | **NIE ruszać** · nie dublować fraz na nowym ID |
| Fraza już przypisana do workId | **ZAKAZ** kopiowania tej samej frazy na drugi ID |

**Kolejność OPS (sztywna):** EXTEND legacy slice → verify → NEW works → CSV Quotes → commit.

### 4.1 P2-A — ROZBIÓRKI / WYBURZENIA (PRIMARY)

| Pole | **FROZEN** |
|------|------------|
| **Gap ID** | `ROZBIORKI_WYBURZENIA` |
| **Baseline** | CM-03: **38** linii · **~80 k PLN** · **14/18** spraw · override D-P2-E po probe |
| **Prefiks NEW** | `p2a-*` · tradeId `ROZBIORKI` |
| **IN** | §5.1 EXTEND + §5.2 NEW |
| **OUT** | `p1a-rozebranie-*` (nawierzchnie) · ogrodzenia (`p1b-zdjecie-*`) · elewacje · INNE · stolarka EI masowa |
| **Fokus OV** | m.in. `08dee335` · próbka 18 |
| **Quotes** | 100% na **nowych** `p2a-*` · legacy EXTEND: verify istniejące product Quotes (P0) nadal OK |

### 4.2 P2-B — ELEKTRYKA · ŚCIANY/GK · HYDRAULIKA

| Pole | **FROZEN** |
|------|------------|
| **Gap IDs** | `ELEKTRYKA_TELETECHNIKA` · `GK_ZABUDOWY` · `INSTALACJE_SANITARNE_CO` |
| **Baseline** | ~36 k / ~16 k / ~12 k (CM-03) · refresh probe |
| **Prefiks NEW** | `p2b-*` |
| **Hard K-P2-2** | ≥1 NEW depth w **co najmniej jednym** trade z trójki (+ P2-A już dał ROZBIORKI) |
| **Soft** | NEW w **wszystkich trzech** trade (target OPS §5.4) |
| **OUT** | SSP/multiswitch/teletech bez triage · YTONG jako „GK” · misbucket „przemurowanie” jako hydraulika · INNE |
| **Fokus** | sprawy z residual probe · próbka 18 |
| **Quotes** | 100% na nowych `p2b-*` |

### 4.3 Chronione (NIE MODYFIKOWAĆ w P2 poza verify)

| Prefiks / ID | Status |
|--------------|--------|
| `p1a-*` · `p1b-*` · `p1c-*` | **intact** — zakaz zmiany keywords/name/Quotes w OPS P2 (L1–L2 nie rusza P1) |
| Pozostałe `legacy-*` poza listą EXTEND | **nie ruszać** |

---

## 5. Lista CatalogWork (FROZEN)

### 5.1 P2-A — LEGACY EXTEND (najpierw)

| # | Work ID (istniejący) | Unit | tradeId | Akcja | ADD keywords (**pełne frazy FROZEN**) |
|---|----------------------|------|---------|-------|--------------------------------------|
| E1 | `legacy-rozbiorki-m2` | m2 | ROZBIORKI | EXTEND keywords | `prace rozbiórkowe powierzchniowe` · `roboty rozbiórkowe powierzchniowe` · `rozbiórka elementów betonowych powierzchniowych` |
| E2 | `legacy-rozbiorki-mb` | mb | ROZBIORKI | EXTEND keywords | `prace rozbiórkowe liniowe` · `roboty rozbiórkowe liniowe` · `rozbiórka elementów liniowych` |
| E3 | `legacy-rozbiorki-m3` | m3 | ROZBIORKI | EXTEND keywords | `prace rozbiórkowe objętościowe` · `roboty rozbiórkowe objętościowe` · `wyburzenia objętościowe betonu` |

**ZAKAZ na E1–E3:** dodawanie gołych stemów (`rozbior`, `demonta`, `wyburz`, `skucie`, `zdjec`, `usuwanie`) — legacy już je ma; P2 **nie** dokłada generyków.  
**ZAKAZ:** frazy zarezerwowane dla `p1a-rozebranie-*` / `p2a-*` (§5.2).

**Verify po EXTEND:** product Quotes na E1–E3 nadal `price > 0` (P0 heal) — jeśli brak → heal Quotes **tym samym** pipeline P3.3 (nie nowy tor).

### 5.2 P2-A — NEW CatalogWork (po EXTEND)

| # | ID **FROZEN** | Unit | tradeId | Klasa residual | Relacja do legacy / P1 |
|---|---------------|------|---------|----------------|------------------------|
| 1 | `p2a-rozebranie-scianek-dzialowych-m2` | m2 | ROZBIORKI | ścianki działowe cegła 1/4–1/2 | **NEW** — nie dublować na `legacy-rozbiorki-m2` |
| 2 | `p2a-rozebranie-obrobek-blacharskich-m2` | m2 | ROZBIORKI | obróbki / kołnierze / gzymsy / okapy | **NEW** |
| 3 | `p2a-zerwanie-tynkow-wewn-m2` | m2 | ROZBIORKI | zerwanie tynków wewnętrznych | **NEW** |
| 4 | `p2a-rozebranie-okladzin-sciennych-m2` | m2 | ROZBIORKI | okładziny ścienne / glazura ścian (rozbiórka) | **NEW** |
| 5 | `p2a-demontaz-drzwi-wewn-szt` | szt | ROZBIORKI | demontaż drzwi wewnętrznych | **NEW** — nie stolarka EI / drzwi EI |
| 6 | `p2a-rozebranie-posadzek-wewn-m2` | m2 | ROZBIORKI | rozebranie posadzek wewnętrznych | **NEW** — ≠ `p1a-rozebranie-kostki/chodnikow` |
| 7 | `p2a-rozebranie-stropow-drewnianych-m2` | m2 | ROZBIORKI | stropy drewniane · polepa · zasypki · kasetony | **NEW** — Residual ROZ amend (Owner GO K-P2-1) |
| 8 | `p2a-zerwanie-podloza-m2` | m2 | ROZBIORKI | zerwanie istniejącego podłoża | **NEW** — ≠ posadzki wewn. (#6) · nameTok F2 bez „podłoża”/„warstw” |
| 9 | `p2a-rozebranie-rynien-rur-spustowych-mb` | mb | ROZBIORKI | rynny / rury spustowe blaszane | **NEW** — ≠ obróbki (#2) · nameTok F2 bez „rury”/„rynny” |

**Min CLOSE P2-A:** ≥ **3** z {#1,#2,#3} aktywne + Quotes 100%.  
**Target OPS:** wszystkie **6** (+ residual **#7–#9** po triage K-P2-1).  
**Cap:** ≤ **12** · residual amend **+3** (aktywne P2-A NEW: **9**).

**OUT NEW (FROZEN):**  
- jakiekolwiek `p2a-*` dla chodników/kostki/obrzeży/podbudowy → już `p1a-rozebranie-*`  
- rozebranie ogrodzenia → `p1b-*`  
- ocieplenia/elewacje → `p1c-*`

### 5.3 P2-B — LEGACY EXTEND (najpierw)

| # | Work ID | Unit | tradeId | ADD keywords (**pełne frazy FROZEN**) |
|---|---------|------|---------|--------------------------------------|
| E4 | `legacy-elektryka-szt` | szt | ELEKTRYKA | `gniazdo wtyczkowe podtynkowe` · `łącznik instalacyjny podtynkowy` · `osprzęt elektryczny podtynkowy sztukowy` |
| E5 | `legacy-elektryka-mb` | mb | ELEKTRYKA | `przewód elektryczny instalacyjny` · `prowadzenie kabli elektrycznych` · `trasa kabli elektrycznych` |
| E6 | `legacy-gk-m2` | m2 | SCIANY_GK | `zabudowa z płyt gipsowo-kartonowych` · `okładzina z płyt gipsowo-kartonowych` · `płyty gipsowo-kartonowe wewnętrzne` |
| E7 | `legacy-hydraulika-szt` | szt | HYDRAULIKA | `punkt wodociągowy wewnętrzny` · `punkt kanalizacyjny wewnętrzny` · `armatura sanitarna punktowa` |
| E8 | `legacy-hydraulika-mb` | mb | HYDRAULIKA | `rura wodociągowa wewnętrzna` · `rura kanalizacyjna wewnętrzna` · `podejście wodociągowe wewnętrzne` |

**ZAKAZ:** dokładać stemów typu `elektr`, `gniazd`, `hydrau`, `rura`, `glad`, `tynk` jako nowe keywords.  
**ZAKAZ fraz na E4–E8 (zarezerwowane dla `p2b-*`):**  
- E4: **wszystkie** frazy z rdzeniem `punkt oświetleniowy*` / `punkt świetlny*` / `oprawa oświetleniowa*` → wyłącznie `p2b-punkt-elektryczny-oswietleniowy-szt`  
- E6: **wszystkie** frazy z `na stelażu` / `ścianka … gipsowo-kartonow*` / `zabudowa GK na stelażu*` → wyłącznie `p2b-scianka-gk-na-stelazu-m2`  
- E8: frazy `podejście wodociągowo-kanalizacyjne*` / `podejście wod-kan*` → wyłącznie `p2b-podejscie-wod-kan-mb` · E8 **zatrzymuje** `podejście wodociągowe wewnętrzne` (REUSE FIRST · legacy)

### 5.4 P2-B — NEW CatalogWork (po EXTEND)

| # | ID **FROZEN** | Unit | tradeId | Klasa | Uwaga anti-dup |
|---|---------------|------|---------|-------|----------------|
| 1 | `p2b-scianka-gk-na-stelazu-m2` | m2 | SCIANY_GK | zabudowa działowa GK na stelażu | **wyłączny** owner fraz `*na stelażu*` / `ścianka … gipsowo*` — **nie** na E6 |
| 2 | `p2b-sufit-podwieszany-gk-m2` | m2 | SCIANY_GK | sufit podwieszany GK | **NEW** |
| 3 | `p2b-punkt-elektryczny-oswietleniowy-szt` | szt | ELEKTRYKA | punkt oświetleniowy (depth) | **wyłączny** owner `punkt oświetleniowy*` — **nie** na E4 |
| 4 | `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | szt | ELEKTRYKA | rozdzielnica mieszkaniowa | **NEW** — nie SSP |
| 5 | `p2b-podejscie-wod-kan-mb` | mb | HYDRAULIKA | podejście wod-kan (łączone) | tylko `wodociągowo-kanalizacyjne` / `wod-kan` — **nie** duplikować E8 |
| 6 | `p2b-grzejnik-plytowy-szt` | szt | HYDRAULIKA | grzejnik płytowy (CO) | **NEW** — tylko jeśli residual probe potwierdzi; inaczej OPC |

**Min CLOSE P2-B (hard K-P2-2):** ≥ **1** aktywne NEW w **≥1** trade ∈ {ELEKTRYKA, HYDRAULIKA, SCIANY_GK} + Quotes 100%.  
**Target OPS (soft):** **#1–#5** obowiązkowe · **#6** po triage.  
**Cap:** ≤ **12**.

**OUT P2-B:** centrala TSZ / multiswitch / SSP · YTONG jako GK · „przemurowanie pęknięć” jako hydraulika.

---

## 6. Kontrakt namePl / descriptionPl / keywords (FROZEN)

### 6.1 Zasady (lekcje P0–P1)

| Reguła | **FROZEN** |
|--------|------------|
| Keywords | **wyłącznie pełne frazy** (substring) — nigdy samotne generyki / stemy |
| namePl / descriptionPl | konkret + kwalifikator · **bez** gołych tokenów §6.2 |
| Scan OPS | §6.2 → **0** trafień w name/desc przed OV |
| Anti-dup fraz | każda fraza keywords → max **1** workId w całym WC P2 |

### 6.2 Tokeny zakazane w namePl / descriptionPl (gołe)

Po `foldPolishText` + split — **żaden** token (len≥4 name / ≥5 desc) **nie może** być dokładnie:

| Token | Powód |
|-------|--------|
| `rozbiorka` / `rozbiórka` / `rozbiorki` / `rozbiórki` | zbyt szerokie |
| `demontaz` / `demontaż` | obce demontaże |
| `wyburzenie` / `wyburzenia` | zbyt szerokie |
| `skucie` / `zerwanie` | bez kwalifikatora w name — używaj pełnej nazwy z obiektem |
| `montaz` / `montaż` / `wykonanie` / `ulozenie` / `ułożenie` | lekcja P1 |
| `scianka` / `ścianka` / `gniazdo` / `rura` / `panel` / `siatka` | false match |
| `instalacja` / `elektryka` / `hydraulika` | gołe branże |
| `ustawienie` | lekcja P1-A/B |

**Jedyny wyjątek name (uzasadniony — wzorzec P1-A):** forma `Rozebranie <obiekt ≥2 słowa>` (np. `Rozebranie ścianek działowych z cegły`). Token `rozebranie` **nie** jest na liście §6.2; `ścianek` ≠ `ścianka`.  
**ZAKAZ wyjątków** dla `Zerwanie` / `Demontaż` / `Ścianka` w name/desc — **AMEND A1:** rename bez tych tokenów (patrz §6.3–6.4). Keywords mogą zawierać pełne frazy z tymi słowami jako **część frazy** (≥2 słowa z obiektem), nie jako samotny token name.

> **Uwaga zgodności z P1-B:** w P1-B gołe `rozebranie` było zakazane dla ogrodzeń. W P2-A name `Rozebranie <obiekt…>` jak P1-A. Keywords: tylko pełne frazy z obiektem, nigdy samotne `rozebranie` / `zerwanie` / `demontaż` / `ścianka`.

### 6.3 Zamrożone teksty — P2-A NEW

#### 1. `p2a-rozebranie-scianek-dzialowych-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Rozebranie ścianek działowych z cegły` |
| descriptionPl | `Rozebranie ścianek działowych o grubości 1/4 lub 1/2 cegły` |
| keywords | `rozebranie ścianek działowych` · `rozebranie ścianek działowych o grub` · `ścianek działowych o grub. 1/4` · `ścianek działowych o grub. do 1/2` · `ścianek działowych z cegły` |

#### 2. `p2a-rozebranie-obrobek-blacharskich-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Rozebranie obróbek blacharskich dachowych` |
| descriptionPl | `Rozebranie obróbek blacharskich murów ogniowych, okapów, kołnierzy i gzymsów` |
| keywords | `rozebranie obróbek murów ogniowych` · `rozebranie obróbek blacharskich` · `obróbek murów ogniowych, okapów` · `kołnierzy, gzymsów` · `rozebranie okapów i kołnierzy` |

#### 3. `p2a-zerwanie-tynkow-wewn-m2`

| Pole | **FROZEN** · **AMEND A1** |
|------|------------|
| namePl | `Usunięcie tynków wewnętrznych ze ścian` |
| descriptionPl | `Usunięcie tynków wewnętrznych ze ścian i stropów` |
| keywords | `zerwanie tynków wewnętrznych` · `zerwanie tynków ze ścian` · `skucie tynków wewnętrznych` · `usunięcie tynków wewnętrznych` |

#### 4. `p2a-rozebranie-okladzin-sciennych-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Rozebranie okładzin ściennych wewnętrznych` |
| descriptionPl | `Rozebranie okładzin ściennych wewnętrznych (płytki / okładziny)` |
| keywords | `rozebranie okładzin ściennych` · `rozebranie okładzin wewnętrznych` · `skucie płytek ściennych` · `usunięcie okładzin ściennych` |

#### 5. `p2a-demontaz-drzwi-wewn-szt`

| Pole | **FROZEN** · **AMEND A1** |
|------|------------|
| namePl | `Zdjęcie drzwi wewnętrznych wraz z ościeżnicą` |
| descriptionPl | `Zdjęcie drzwi wewnętrznych wraz z ościeżnicą — bez drzwi EI` |
| keywords | `demontaż drzwi wewnętrznych` · `demontaż drzwi wewnętrznych wraz z ościeżnicą` · `zdjęcie drzwi wewnętrznych` · `rozebranie drzwi wewnętrznych` |

#### 6. `p2a-rozebranie-posadzek-wewn-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Rozebranie posadzek wewnętrznych` |
| descriptionPl | `Rozebranie posadzek wewnętrznych (wylewki / okładziny podłogowe)` |
| keywords | `rozebranie posadzek wewnętrznych` · `rozebranie posadzki wewnętrznej` · `skucie posadzki wewnętrznej` · `usunięcie posadzek wewnętrznych` |

### 6.4 Zamrożone teksty — P2-B NEW

#### 1. `p2b-scianka-gk-na-stelazu-m2`

| Pole | **FROZEN** · **AMEND A1** |
|------|------------|
| namePl | `Zabudowa działowa z płyt gipsowo-kartonowych na stelażu` |
| descriptionPl | `Zabudowa działowa z płyt gipsowo-kartonowych na stelażu metalowym` |
| keywords | `ścianka z płyt gipsowo-kartonowych` · `płyt gipsowo-kartonowych na stelażu` · `płyty gipsowo-kartonowe na stelażu` · `ścianki działowe z płyt gipsowo-kartonowych` · `zabudowa GK na stelażu metalowym` |

#### 2. `p2b-sufit-podwieszany-gk-m2`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Sufit podwieszany z płyt gipsowo-kartonowych` |
| descriptionPl | `Sufit podwieszany z płyt gipsowo-kartonowych na ruszcie` |
| keywords | `sufit podwieszany z płyt gipsowo-kartonowych` · `sufit podwieszany GK` · `płyty gipsowo-kartonowe sufit` · `zabudowa sufitu z płyt GK` |

#### 3. `p2b-punkt-elektryczny-oswietleniowy-szt`

| Pole | **FROZEN** · **AMEND A3** (wyłączny owner rdzenia oświetleniowego) |
|------|------------|
| namePl | `Punkt oświetleniowy instalacji elektrycznej` |
| descriptionPl | `Punkt oświetleniowy instalacji elektrycznej wewnętrznej` |
| keywords | `punkt oświetleniowy instalacji elektrycznej` · `punkt oświetleniowy wewnętrzny` · `oprawa oświetleniowa wewnętrzna` · `punkt świetlny instalacji elektrycznej` |
| Anti-dup | **E4 nie** ma żadnej frazy `punkt oświetleniowy*` / `punkt świetlny*` / `oprawa oświetleniowa*` |

#### 4. `p2b-tablica-rozdzielcza-mieszkaniowa-szt`

| Pole | **FROZEN** |
|------|------------|
| namePl | `Tablica rozdzielcza mieszkaniowa` |
| descriptionPl | `Tablica rozdzielcza mieszkaniowa niskiego napięcia` |
| keywords | `tablica rozdzielcza mieszkaniowa` · `rozdzielnica mieszkaniowa` · `tablica bezpiecznikowa mieszkaniowa` |

#### 5. `p2b-podejscie-wod-kan-mb`

| Pole | **FROZEN** · **AMEND A4** (bez near-dup vs E8) |
|------|------------|
| namePl | `Podejście wodociągowo-kanalizacyjne wewnętrzne` |
| descriptionPl | `Podejście wodociągowo-kanalizacyjne wewnętrzne — odcinek mb` |
| keywords | `podejście wodociągowo-kanalizacyjne` · `podejście wodociągowo-kanalizacyjne wewnętrzne` · `podejście wod-kan wewnętrzne` |
| Anti-dup | Fraza `podejście wodociągowe wewnętrzne` / `podejścia wodociągowe wewnętrzne` → **tylko E8** (REUSE FIRST) · **nie** na `p2b-*` |

#### 6. `p2b-grzejnik-plytowy-szt` (OPC)

| Pole | **FROZEN** |
|------|------------|
| namePl | `Grzejnik płytowy centralnego ogrzewania` |
| descriptionPl | `Grzejnik płytowy instalacji centralnego ogrzewania` |
| keywords | `grzejnik płytowy` · `grzejnik płytowy CO` · `grzejniki płytowe centralnego ogrzewania` |
| Warunek | residual probe potwierdza linie CO · inaczej **nie** tworzyć |

### 6.5 Scan weryfikacyjny (wymagany przed OV)

| Zakres | Wymaganie |
|--------|-----------|
| namePl+descriptionPl wszystkich NEW | ∩ §6.2 = **∅** |
| keywords NEW + EXTEND | każda pozycja to fraza (≥2 słowa lub złożenie z kwalifikátorem obiektu) |
| Duplikaty fraz między ID | **0** |
| Kolizja z `p1a-rozebranie-*` / `p1b-*` / `p1c-*` | **0** wspólnych fraz keywords |

---

## 7. Product Quotes — struktura (FROZEN)

### 7.1 Kontrakt wiersza CSV

| Kolumna | Wymaganie **FROZEN** |
|---------|---------------------|
| `workId` | dokładne ID z §5.2 / §5.4 (NEW) · opc. legacy E1–E8 przy heal |
| `origin` | product: `wgdom` (preferowany) / `kb_pl` / `sekocenbud` / `interbud` · **nie** `legacy_seed` |
| `region` | min `wroclaw` · rekomendacja + `dolnyslask` (jak P1-B) |
| `price` | `> 0` · **=** `companyPricePln` worka |
| `updatedAt` | ISO OPS |
| `confidence` | ≥ **0.85** (wzorzec P1: 0.92) |

### 7.2 Mapowanie CSV → CatalogWork → Quotes

```text
CSV row.workId  ──match──▶  CatalogWork.id
CSV row.price   ──write──▶  marketQuotes[].price  (via commitMarketQuotesImport)
CSV row.origin  ──write──▶  marketQuotes[].origin (product)
companyPricePln ──parity──▶  CSV price (MUST equal)
```

| Reguła | **FROZEN** |
|--------|------------|
| Preview | ≥ **80%** matched na wierszach NEW przed commit |
| CLOSE | **100%** NEW aktywnych ma ≥1 product quote `price > 0` |
| Legacy EXTEND | nie wymaga nowych Quotes jeśli P0 OK; jeśli NO_RECORDS → heal P3.3 |
| Zakaz | ręczny zapis `marketQuotes` poza P3.3 · nadpisanie `companyPricePln` „z rynku” |

### 7.3 `companyPricePln` (Owner w OPS)

DF **nie** zamraża kwot PLN (cennik Owner). OPS ustala ceny przed CSV; Quotes muszą być **parity**.  
Orientacja (nie binding): legacy ROZBIORKI m2 ≈14.9 → NEW depth zwykle **wyżej**; elektryka/GK/hydraulika — vs legacy szt/mb.

---

## 8. KPI (FROZEN)

### 8.1 Hard — K-P2-1…3 (parent DF §7.3)

| ID | Target **FROZEN** |
|----|-------------------|
| **K-P2-1** | Unmatched **linie** `ROZBIORKI_WYBURZENIA` ≤ **50%** `baseline_rozbiorki_lines` (D-P2-E) na powtórce 18 |
| **K-P2-2** | ≥1 NEW depth ROZBIORKI (`p2a-*`) **oraz** ≥1 NEW depth w ≥1 z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK} (`p2b-*`) · Quotes **100%** na wszystkich NEW aktywnych |
| **K-P2-3** | Regresje = **0** (known/new false · nieuzasadniony Δ CM/HE) vs tip P1 **2.65.83** |

### 8.2 Hard per-slice (AC)

| ID | Target |
|----|--------|
| **H-A1** | P2-A: ≥3 · ≤12 `p2a-*` · Quotes 100% · token scan 0 · P1 intact |
| **H-A2** | EXTEND E1–E3 wykonany **przed** NEW |
| **H-B1** | P2-B: K-P2-2 trade spełnione · Quotes 100% · token scan 0 · P2-A intact |
| **H-B2** | EXTEND E4–E8 wykonany **przed** NEW |
| **H-G** | Brak duplikatów CatalogWork / fraz keywords |

### 8.3 Soft (raport)

| ID | Target |
|----|--------|
| **S1** | CM avg 18 ≥ **73.2%** |
| **S2** | HE avg 18 ≤ **26.8%** |
| **S3** | Coverage C1 (linie→`p2a-*`/`p2b-*`) > 0 przy CLOSE |
| **S4** | Dokumentacja K-P1-1 (top-3 residual) w artefakcie probe |

---

## 9. Acceptance Criteria (FROZEN)

| AC | Kryterium | Gate |
|----|-----------|------|
| **AC-P2.1** | Readonly gap probe wykonany (artefakt `.tmp/ceny-materialow-04-p2-gap-probe.json`) przed lub na starcie OPS | OPS start |
| **AC-P2.2** | Legacy EXTEND E1–E8 wg §5.1/§5.3 — tylko pełne frazy · zero nowych stemów | per slice |
| **AC-P2.3** | NEW lista = §5.2 / §5.4 · name/desc/keywords = §6.3/§6.4 | per slice |
| **AC-P2.4** | Anti-dup: 0 wspólnych fraz z P1 / między P2 ID | OV |
| **AC-P2.5** | CSV → preview ≥80% → `commitMarketQuotesImport` · Quotes 100% NEW | CLOSE slice |
| **AC-P2.6** | K-P2-1…3 PASS (po P2-B) | P2 CLOSE |
| **AC-P2.7** | False known/new = 0 · token scan = 0 | OV |
| **AC-P2.8** | P1 `p1a/b/c-*` intact · OUT silnika czyste | OV |
| **AC-P2.9** | Zero zmian AI-COST / scoring / providerów / Bid / Cloud CORE / parser | AR + OV |

---

## 10. Rollback (FROZEN)

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na `p2a-*` / `p2b-*` · **nie** ruszać P1 |
| **L2** | Rollback Quotes P3.3 (ostatni import P2) + cofnięcie EXTEND keywords (restore z backup) + dezaktywacja NEW |
| **L3** | Restore full backup `.tmp/ceny-materialow-04-p2-*-catalog-backup.json` (tip sprzed P2) |

Backup **obowiązkowy** przed EXTEND i przed pierwszym commit Quotes każdego slice.

---

## 11. Ryzyka i mitigacje (FROZEN)

| Ryzyko | Mitigacja **FROZEN** |
|--------|---------------------|
| Duplikat vs `p1a-rozebranie-*` | D-P2-G · scan fraz · OUT nawierzchni |
| Generyczne tokeny → false match | §6.2 scan · pełne frazy |
| Overload legacy jedną ceną | NEW dla klas z osobną ceną (§5.2/5.4) |
| Misbucket CM-03 (YTONG/SSP/przemurowanie) | OUT + Owner triage złotych opisów z probe |
| Baseline 38 nieaktualne | D-P2-E probe |
| Scope creep INNE | D-P2-I |
| Tip Quotes drift | verify P0 Quotes na legacy przed CLOSE |

---

## 12. Checklist ARCHITECTURE REVIEW

AR **PASS** tylko gdy wszystkie TAK:

| # | Pytanie | Oczekiwane |
|---|---------|------------|
| 1 | Zgodność z EPIC DF §4.3 / §7.3 (P2 Depth)? | TAK |
| 2 | Zgodność z P2 PLAN (kolejność A→B, OUT, KPI)? | TAK |
| 3 | Pipeline = wyłącznie `commitMarketQuotesImport`? | TAK |
| 4 | REUSE P3.3 / WC / controlled_market AS-IS? | TAK |
| 5 | ZERO DUPLICATE: legacy first → NEW; anti-dup fraz? | TAK |
| 6 | Keywords = pełne frazy · §6.2 kompletne? | TAK |
| 7 | Lista NEW + EXTEND finalna i zamrożona? | TAK |
| 8 | Quotes struktura + parity companyPrice? | TAK |
| 9 | K-P2-1…3 + AC + rollback L1–L3? | TAK |
| 10 | OUT: AI-COST · scoring · Bid · Cloud CORE · parser · INNE? | TAK |
| 11 | Gate G1–G9 ALL-NIE · FEATURE-DATA? | TAK |
| 12 | P1 chronione? | TAK |
| 13 | Brak zmian kodu w scope DF? | TAK |

**Werdykt AR:** `APPROVED FOR OWNER GO` \| `REJECTED — amend DF`.

---

## 13. Kryteria OWNER GO

Owner wydaje **GO OPS** osobno na P2-A i P2-B gdy:

| # | Kryterium |
|---|-----------|
| 1 | DF **FROZEN** (ten dokument) |
| 2 | Architecture Review **PASS** |
| 3 | Readonly gap probe **PASS** (lub zaakceptowany wynik w DF amend D-P2-E) |
| 4 | Cennik `companyPricePln` przygotowany Owner (NEW) |
| 5 | Potwierdzenie: **brak** IMPLEMENT kodu silnika |
| 6 | Backup plan L1–L3 zrozumiany |

**GO P2-B** wymaga **P2-A CLOSE** (H-A1) albo jawnego Owner waive (nie rekomendowane).

---

## 14. Harmonogram IMPLEMENT / OPS po GO

```text
T0  AR PASS + Owner GO P2-A
T1  Readonly gap probe (jeśli nie w T0) · zamrożenie baseline D-P2-E
T2  Backup katalogu
T3  LEGACY EXTEND E1–E3 · verify Quotes legacy
T4  NEW p2a-* (Biblioteka) · token scan
T5  CSV Quotes p2a → preview → commitMarketQuotesImport
T6  Probe 18 + fokus · OV P2-A → CLOSE P2-A
T7  Owner GO P2-B
T8  Backup · EXTEND E4–E8 · NEW p2b-* · Quotes · probe · OV → CLOSE P2-B
T9  K-P2-1…3 · P2 CLOSEOUT · tip/docs (osobny RELEASE)
```

**Zakaz:** start T3 przed T0 · pomijanie EXTEND · commit/push bez Owner · zmiany AI-COST.

---

## 15. Allowlista / bloklista (FROZEN)

### Allowlista

| Obszar |
|--------|
| Biblioteka Robót — EXTEND keywords + custom `p2a-*`/`p2b-*` |
| CSV + preview + **`commitMarketQuotesImport`** |
| Docs `CENY-MATERIAŁÓW-04-P2-*` · `.tmp/ceny-materialow-04-p2*` |
| Readonly probes |

### Bloklista

| Obszar |
|--------|
| `tender-offer-boq-pricing-engine.ts` · mapping CM-01 · Bid · `cloud-sync.ts` |
| Scrapery · nowe DATA_KEYS · parser/Discovery rewrite |
| GAP-B / Kp / marża · seed INNE · residual DROGI/ELEW jako główny P2 |

---

## 16. Weryfikacja zgodności (DF self-check) · **AMEND A1–A4**

| Check | Wynik |
|-------|--------|
| Parent EPIC DF P2 Depth | **PASS** |
| P2 PLAN READY FOR DF | **PASS** |
| P0–P1 lessons (frazе / dane first / P3.3) | **PASS** |
| Legacy first → NEW | **PASS** (§4.0 · §5) |
| Anti-dup vs p1a/b/c | **PASS** (OUT nawierzchnie/ogrodzenia/elewacje) |
| Anti-dup EXTEND↔NEW (A2–A4) | **PASS** — E4/E6/E8 rozdzielone od p2b-3/1/5 |
| Keywords pełne frazy | **PASS** (§5–§6) |
| namePl ∩ §6.2 = ∅ (A1) | **PASS** — rename Zerwanie/Demontaż/Ścianka |
| Quotes 100% NEW | **PASS** (§7) |
| K-P2-1…3 bez zmian | **PASS** (§8) |
| OUT silnika · rollback | **PASS** |
| Kod aplikacji | **bez zmian** |

---

## 17. Następny krok

```text
DESIGN FREEZE P2 FROZEN · AMEND A1–A4
  → THIN ARCHITECTURE REVIEW (re-check A1–A4)
  → Owner GO (dopiero po thin AR PASS)
  → OPS P2-A → P2-B
```

**Zakaz teraz:** IMPLEMENT · OPS · commit · push · zmiany kodu · OWNER GO przed thin AR PASS.

---

**DF STATUS:** **FROZEN** · **AMEND A1–A4 COMPLETE** · thin AR **PASS** · **READY FOR OWNER GO**
