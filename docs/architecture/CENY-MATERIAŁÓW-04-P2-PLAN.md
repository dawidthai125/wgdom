# CENY-MATERIAŁÓW-04 P2 — PLAN

> **ID:** CENY-MATERIAŁÓW-04-P2-PLAN  
> **Etykieta:** Work Catalog + Quotes — **Depth** (rozbiórki → instalacje)  
> **STATUS:** PLAN ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push / zmian kodu**  
> **Data:** 2026-07-30  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P1 **COMPLETE** ([`CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md`](CENY-MATERIAŁÓW-04-P1-CLOSEOUT.md)) · P2 AUDIT **READY FOR PLAN** · EPIC DF [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) §4.3 / §7.3 · Parent PLAN [`CENY-MATERIAŁÓW-04-PLAN.md`](CENY-MATERIAŁÓW-04-PLAN.md) §5  
> **Baseline tip:** UI **2.65.83** · feature P1-C **`992023cc`** · CM **73.2%** · HE **26.8%** · false **0/0** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P2):
  Pogłębić Work Catalog + marketQuotes w ROZBIORKACH
  oraz depth instalacji (ELEKTRYKA / HYDRAULIKA / SCIANY_GK),
  aby obniżyć częstość unmatched/HE na sprawach remontowych
  przez nowe match → controlled_market — BEZ zmian AI-COST.
  REUSE lekcji P1: dane najpierw · zero generycznych tokenów ·
  keywords = wyłącznie pełne frazy · Quotes 100% w tym samym slice.
════════════════════════════════════════════════════════
```

---

## 0. Punkt startowy (P1 COMPLETE)

| Pole | Wartość |
|------|---------|
| Status P1 | **COMPLETE** · **PRODUCTION VERIFIED** |
| UI tip | **2.65.83** |
| Feature tip P1-C | **`992023cc`** |
| WC po P1 | ~**58** aktywnych (34 legacy + 24 P1: 10A+7B+7C) · Quotes 100% na P1 |
| CM / HE avg 18 (ON) | **73.2% / 26.8%** |
| P1 false | known **0** · new **0** |
| Pipeline Quotes | CSV → preview → **`commitMarketQuotesImport`** → WC → `controlled_market` |
| Parent CM-04 | **NIE** zamknięty — otwarte **P2** (+ P3) |
| AUDIT P2 | **COMPLETE** · **READY FOR PLAN** (sesja 2026-07-30) |

**Wniosek:** P0 odblokował CM; P1 zaadresował top-3 PLN (~803 k). Pozostała dźwignia P2 = **częstość** (rozbiórki 14/18) + **depth** ponad cienkie `legacy-*` instalacji — nadal wyłącznie dane.

---

## 1. Zasady (wiązane z EPIC DF + lekcje P1)

| Zasada | Wartość |
|--------|---------|
| **SSOT FIRST** | WC = `kw-wgdom-work-catalog` · tip tylko w `09` · baseline gap = CM-03 + refresh readonly |
| **REUSE FIRST** | P3.3 preview/commit · coverage S5 · CM-01 mapping AS-IS · controlled_market AS-IS |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiego toru Quotes / scoringu / providerów |
| Kolejność slice | **P2-A → P2-B** (sztywna) — §5 |
| Cap robót | **3–12** nowych aktywnych / slice (jak D-E P1; DF zamrozi D-P2-*) |
| Quotes | **100%** product Quotes na nowych przed CLOSE slice (D-F parent) |
| Zasilanie Quotes | wyłącznie CSV → preview → **`commitMarketQuotesImport`** |
| Forma | **OPS + dane** (Biblioteka Robót) · **0 LOC** silnika AI-COST |
| Token safety | **zero** generycznych tokenów w `namePl` / `descriptionPl` / keywords · keywords = **pełne frazy** |
| Overlap | Najpierw sprawdź `legacy-*` + `p1a-rozebranie-*` — patch keywords > duplikat roboty |

---

## 2. OUT (twarde — cały P2)

| OUT |
|-----|
| Zmiany **AI-COST** / pricing-engine / mapping CM-01 |
| Nowi **providerzy** / reorder |
| Zmiany **heurystyk** |
| **Bid Calculator** |
| Edycja **Cloud Sync CORE** (`cloud-sync.ts`) / nowe DATA_KEYS |
| **Scrapery** / live API cen |
| **GAP-B** · **marża** · **Kp** · softcode 1,6M |
| Discovery / **parser rewrite** (tylko ticket outbound przy junk) |
| Ślepy seed **INNE** (~1,72 M) — to **P3** |
| Nowe branże poza listą (stolarka EI masowa, posadzki/SSP jako główny seed) |
| Nadpisanie `companyPricePln` z rynku (D-C) |
| Pełny katalog branżowy „wszystko naraz” |
| Residual P1-A DROGI / P1-C ELEW jako główny cel P2 (backlog IMPROVEMENTS) |

---

## 3. Readonly gap probe (obowiązkowy krok PLAN → DF)

### 3.1 Cel

Odświeżyć residual **po P1** na **tych samych 18 sprawach** co CM-03 / CM-02bis — bez mutacji KV / bez commit Quotes.

### 3.2 Metoda (readonly)

```text
1. Snapshot / odczyt tip WC (aktywne works + product Quotes count)
2. Probe OfferBoq ON (CM-01 flaga jak w pomiarach P1) na 18 sprawach
3. Agregacja linii BEZ catalogWorkId (unmatched) · te same bucket rules co CM-03
4. Dodatkowo: linie z catalogWorkId ale materiał heuristic_estimate w bucketach P2
5. Artefakt: .tmp/ceny-materialow-04-p2-gap-probe.json (+ opc. .md skrót)
6. Dokumentacja K-P1-1: unmatched PLN DROGI+OGRODZENIA+ELEWACJE vs baseline ~803 k
```

**Zakaz w probe:** `commitMarketQuotesImport` · batch-set · edycja Biblioteki · push.

### 3.3 Co mierzyć

| Metryka | Baseline CM-03 (pre-P1) | Po P1 (oczekiwane / znane) | Po probe P2 |
|---------|-------------------------|----------------------------|-------------|
| `ROZBIORKI_WYBURZENIA` linie / PLN | **38** / **~80 k** · 14 spraw | *do potwierdzenia* (P1-A ma `p1a-rozebranie-*` — możliwy partial absorb) | **SSOT residual** |
| `ELEKTRYKA_TELETECHNIKA` | 15 / ~36 k · 5 | *do potwierdzenia* | residual |
| `GK_ZABUDOWY` | 20 / ~16 k · 8 | *do potwierdzenia* | residual |
| `INSTALACJE_SANITARNE_CO` | 4 / ~12 k · 3 | *do potwierdzenia* | residual |
| Top-3 P1 (K-P1-1) | ~803 k | ELEW ~40 k · OGROD 0 · DROGI 11 linii | formalny % vs 803 k |
| Global CM / HE | — | **73.2 / 26.8** | parity tip |

### 3.4 Gate probe

| Wynik | Decyzja |
|-------|---------|
| Residual ROZBIORKI linie **≥ 20** (lub PLN ≥ ~40 k) | Kontynuuj P2-A jak PLAN |
| Residual ROZBIORKI linie **&lt; 20** już przed OPS | DF może **obniżyć** cap / skrócić listę — **nie** pomijać K-P2-1 bez amend |
| Bucket samples = szum (fałszywe klasy) | DF: Owner triage złotych opisów (jak D-P1-E/F) |
| Probe FAIL (brak danych / tip drift) | **STOP** → FIX pomiaru · **nie** start OPS |

**Probe jest wejściem do DF / OPS — nie osobnym IMPLEMENT.**

---

## 4. Analiza residual (stan na start PLAN)

### 4.1 Ranking luk (CM-03 + residual P1)

| # | Gap | Linie | PLN | # spraw | Relacja do P2 |
|---|-----|------:|----:|--------:|---------------|
| 1 | **INNE** | 436 | **~1,72 M** | 16 | **P3** — OUT z P2 |
| 2 | DROGI residual | ~11 | (po P1-A −73%) | — | backlog · nie P2 |
| 3 | ELEW residual | 15 | **~40 k** (−82.9%) | — | backlog · nie P2 |
| 4 | OGRODZENIA | 0 | 0 | — | **CLOSED** P1-B |
| 5 | **ROZBIORKI** | **38** | **~80 k** | **14/18** | **P2-A PRIMARY** |
| 6 | **ELEKTRYKA** | 15 | ~36 k | 5 | **P2-B depth** |
| 7 | **GK / SCIANY** | 20 | ~16 k | 8 | **P2-B depth** |
| 8 | **HYDRAULIKA/CO** | 4 | ~12 k | 3 | **P2-B depth** |
| 9 | Posadzki / SSP | 2+2 | ~6 k | 1 | backlog poza P2 |

Źródła: [`.tmp/ceny-materialow-03-audit.json`](../../.tmp/ceny-materialow-03-audit.json) · [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) · OV P1-C (ELEW ~40 125 PLN).

### 4.2 Istniejący overlap WC (krytyczne dla residual)

| Asset | Uwaga PLAN |
|-------|------------|
| `legacy-rozbiorki-m2` / `m3` / `mb` | Cienki seed — P2-A **depth** ponad legacy, nie klon 1:1 |
| `p1a-rozebranie-chodnikow-m2` · `kostki` · `podbudowy` · `obrzezy-mb` | Już pokrywa rozbiórki **nawierzchniowe** — **nie** dublować generycznym „rozebranie” |
| `legacy-elektryka-*` · `legacy-hydraulika-*` · `legacy-gk-m2` | Depth = konkretne brakujące opisy z residual probe, nie nowe jednostki „na wszelki wypadek” |

### 4.3 Jakość bucketów CM-03 (lekcja P1)

| Bucket | Ryzyko szumu | Akcja |
|--------|--------------|-------|
| ROZBIORKI | Mieszanka dach/obróbki / ścianki / nawierzchnie | Owner triage · OUT linii już pokrytych `p1a-rozebranie-*` |
| ELEKTRYKA | Teletechnika / multiswitch / SSP | Preferuj typowe remonty instalacji; SSP → backlog |
| GK | YTONG / ścianki ≠ czyste GK | Keywords pełne frazy · nie gołe „ścianka” |
| HYDRAULIKA | Próbka CM-03 „Przemurowanie…” = możliwy misbucket | **Walidacja opisów przed seed** |

### 4.4 Residual HE global

HE **26.8%** po P1 = głównie **INNE** + residual top-3 + nienamapowane depth. P2 obniża HE **lokalnie / częstościowo**; nie obiecuje zejścia poniżej ~20% bez P3.

---

## 5. Kolejność slice (sztywna)

```text
Readonly gap probe (PLAN→DF input)
        │
        ▼
P2-A  ROZBIORKI_WYBURZENIA     ← PRIMARY (częstość 14/18 · K-P2-1)
        │  CLOSE gdy: ≥1 depth work · Quotes 100% · unmatched linie ≤50% baseline
        │            · false 0 · P1 A/B/C intact
        ▼
P2-B  Depth ≥1 z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK}
        │  rekomendowana kolejność OPS wewnątrz B (nie sztywna DF-hard):
        │    B1 ELEKTRYKA → B2 SCIANY_GK → B3 HYDRAULIKA
        │  CLOSE gdy: K-P2-2 spełnione (≥1 trade z listy poza ROZBIORKI) · Quotes 100% · regresje 0
        ▼
P2 CLOSE  (K-P2-1 · K-P2-2 · K-P2-3)
        │
        ▼
P3 INNE triage  (osobny etap — nie startować w P2)
```

| Slice | Prefiks ID | Min / max nowych | Gap ID |
|-------|------------|------------------|--------|
| **P2-A** | `p2a-*` | **≥ 3** / **≤ 12** (rekomendacja PLAN: **5–8**) | `ROZBIORKI_WYBURZENIA` |
| **P2-B** | `p2b-*` | **≥ 1** na wybrany trade · łącznie depth **3–12** (rekomendacja: **4–8** na 1–3 trade) | `ELEKTRYKA_TELETECHNIKA` · `GK_ZABUDOWY` · `INSTALACJE_SANITARNE_CO` |

**K-P2-2 interpretacja PLAN:** wymagane (1) ≥1 nowa robota depth w **ROZBIORKI** (spełnione w P2-A) **oraz** (2) ≥1 nowa robota depth w **co najmniej jednym** z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK}. DF zamrozi, czy P2-B musi pokryć **wszystkie trzy** trade, czy wystarczy **≥1** (parent DF §7.3 = „≥1 z {…}”).

**Propozycja PLAN do DF (D-P2-B):** hard = **≥1** trade z trójki; soft = pokrycie **2–3** trade jeśli residual probe pokazuje ROI.

---

## 6. Scope

### 6.1 IN

| Element | Opis |
|---------|------|
| Nowe `CatalogWork` | Depth ROZBIORKI + depth instalacji (lista finalna w DF) |
| Keywords | Wyłącznie **pełne frazy** · Owner triage złotych opisów z residual probe |
| `companyPricePln` | Cennik Ownera |
| Product Quotes | CSV P3.3 · 100% na nowych w slice |
| Persist | Cloud AS-IS (batch-set / sync istniejący) |
| Pomiary | Readonly probe 18 + fokus spraw (jak P1) |
| Docs | `CENY-MATERIAŁÓW-04-P2-*` · backup `.tmp/` |

### 6.2 Szkic robót P2-A (do zamrożenia w DF — nie OPS jeszcze)

| # | Robota (robocza) | Unit | Uzasadnienie | OUT / uwaga |
|---|------------------|------|--------------|-------------|
| 1 | Rozebranie ścianek działowych (cegła / 1/4–1/2) | m2 | Próbki CM-03 `08dee335` | Pełne frazy · nie „rozebranie” |
| 2 | Rozebranie obróbek blacharskich / kołnierzy / gzymsów | m2 | Próbki dach/obróbki | Nie mylić z `p1a-rozebranie-*` nawierzchni |
| 3 | Demontaż stolarki / drzwi wewnętrznych (jeśli residual) | szt | Tylko po triage | Stolarka EI masowa = OUT |
| 4 | Zerwanie tynków / okładzin (jeśli residual) | m2 | Częste w remontach | |
| 5–8 | *(opc. depth)* wyburzenia lokalne, demontaż instalacji (bez hydrauliki głębokiej) | … | Do cap | Owner GO |

### 6.3 Szkic robót P2-B (do DF)

| Trade | Szkic (1–3 / trade) | Unit | Uwaga |
|-------|---------------------|------|-------|
| ELEKTRYKA | Punkt świetlny / gniazdo · prowadzenie kabla · tablica (wąsko) | szt / mb | Nie SSP/multiswitch bez triage |
| SCIANY_GK | Ścianka GK na stelażu · sufit podwieszany GK | m2 | Nie YTONG jako „GK” bez frazy |
| HYDRAULIKA | Punkt wod-kan · podejście · (opc.) grzejnik | szt / mb | Odrzuć misbucket „przemurowanie” |

### 6.4 Quotes (oba slice)

| Reguła | Wartość |
|--------|---------|
| Pipeline | preview → **`commitMarketQuotesImport`** |
| Match preview | ≥ **80%** matched na nowych przed commit |
| CLOSE | **100%** product Quotes (`price > 0`) na nowych ID |
| Preferowane źródła CSV | wgdom / kb_pl / sekocenbud / interbud (jak P1) |

---

## 7. KPI

### 7.1 Hard (parent DF §7.3 — potwierdzone PLAN)

| ID | Target | Pomiar |
|----|--------|--------|
| **K-P2-1** | Unmatched **linie** w buckecie ROZBIORKI ≤ **50%** baseline (**38 → ≤ 19**) na powtórce 18 | Gap probe jak CM-03 · residual po P2-A |
| **K-P2-2** | ≥ 1 nowa robota depth w ROZBIORKI **oraz** depth w ≥1 z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK} · Quotes **100%** na nowych | Inspect WC |
| **K-P2-3** | Regresje = **0** (known/new false · nieuzasadniony spadek CM / wzrost HE) | Probe 18 OFF/ON vs tip P1 |

**Baseline liczbowy linii ROZBIORKI:** CM-03 = **38**, o ile gap probe P2 nie wykaże, że residual już &lt; 38 — wtedy DF zamrozi **baseline_residual** = wynik probe (KPI = ≤50% *tego* residual, nie sztuczne „38” jeśli już mniej).  
**Propozycja D-P2-1:** `baseline_rozbiorki_lines = max(probe_residual, 1)` z floor dokumentacyjnym; target ≤ 50% baseline wybranego w DF.

### 7.2 Soft (raport · nie hard gate)

| Soft | Cel |
|------|-----|
| Global HE avg 18 | ≤ **26.8%** (parity) lub lekki ↓ |
| Global CM avg 18 | ≥ **73.2%** |
| Coverage C1 | linie bucketa → nowe `p2a-*` / `p2b-*` |
| Coverage C2 | residual HE/unmatched w buckecie po slice |
| K-P1-1 dokumentacja | unmatched top-3 PLN ≤ **50%** ~803 k (formalny re-probe w artefakcie probe) |

### 7.3 Per-slice CLOSE gates

| Slice | Hard przed CLOSE |
|-------|------------------|
| P2-A | ≥3 `p2a-*` · Quotes 100% · false 0 · token scan 0 · P1 intact · progres K-P2-1 (raport linii) |
| P2-B | Spełnienie K-P2-2 (trade) · Quotes 100% · false 0 · P2-A intact · K-P2-3 |
| P2 EPIC | K-P2-1 PASS · K-P2-2 PASS · K-P2-3 PASS |

---

## 8. Rollback

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na nowych `p2a-*` / `p2b-*` |
| **L2** | Rollback Quotes (P3.3) + dezaktywacja / usunięcie custom works Owner |
| **L3** | Restore backup JSON katalogu tip sprzed P2 (`.tmp/ceny-materialow-04-p2-*-catalog-backup.json`) |

**Zasada:** rollback **nie** cofa P0/P1 bez osobnego Owner GO.  
Backup obowiązkowy **przed** pierwszym commit Quotes każdego slice.

---

## 9. Ryzyka

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Generyczne tokeny (`rozebranie`, `demontaż`, `ścianka`) → false match | **Wysoki** | Pełne frazy · token scan · lekcja P1-A/B/C |
| Kanibalizacja `p1a-rozebranie-*` / legacy | Śr | Residual probe + exclude nawierzchni · patch keywords > nowy ID |
| Szum CM-03 (misbucket HYDRAULIKA / GK) | Śr | Owner triage złotych opisów przed DF final list |
| Cap za mały vs K-P2-1 | Śr | Amend DF po probe · nie ciche &gt;12 |
| Scope creep → P3 INNE | Śr | Twarde OUT · osobny etap |
| Dotknięcie AI-COST / Bid / Cloud CORE | Niski | Bloklista · FEATURE-DATA only |
| Tip / Quotes drift (jak P1-A heal) | Śr | Verify Quotes 100% + heal P0/P1 przed seed |
| Baseline 38 nieaktualne po P1 | Śr | D-P2-1: baseline = wynik readonly probe |

---

## 10. Harmonogram realizacji

```text
T0  PLAN COMPLETE → DESIGN FREEZE P2 (D-P2-*)
T1  Architecture Review P2 (lekki — parent AR APPROVED; slice recheck)
T2  Owner GO → readonly gap probe (jeśli nie wykonany przed DF) + freeze list robót
T3  Owner GO OPS P2-A
      backup → works p2a-* → CSV Quotes → commit → probe → OV → CLOSE P2-A
T4  Owner GO OPS P2-B
      backup → works p2b-* → CSV Quotes → commit → probe → OV → CLOSE P2-B
T5  P2 CLOSEOUT + tip/docs sync → READY FOR P3 AUDIT (osobno)
```

| Faza | Artefakty | Zakaz |
|------|-----------|-------|
| DF | `CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md` | OPS bez DF |
| AR | `CENY-MATERIAŁÓW-04-P2-ARCHITECTURE-REVIEW.md` | IMPLEMENT bez AR+GO |
| OPS A/B | `*-OPS-COMPLETE` · `.tmp/ceny-materialow-04-p2*` | Kod silnika |
| OV / PV / RELEASE / CLOSE | jak P1-A/B/C | Push bez Owner |

**Szacunek skali (orientacyjny, nie binding):** P2-A 1 sesja OPS · P2-B 1 sesja OPS · łącznie mniejszy ticket PLN niż P1, wyższa frekwencja.

---

## 11. Wzorzec OPS per slice (powtarzalny — jak P1)

```text
1. Backup JSON kw-wgdom-work-catalog
2. Utwórz CatalogWork (custom) w Bibliotece:
     id (p2a-*|p2b-*) · tradeId · namePl · unit · keywords[] (pełne frazy)
     · companyPricePln · active=true
3. Token scan name/desc/keywords (banned generics)
4. CSV product Quotes → previewMarketCsvImport → commitMarketQuotesImport
5. Cloud persist AS-IS + verify Quotes 100%
6. Probe: powtórka 18 + fokus spraw bucketa · vs tip P1 / poprzedni slice
7. Owner Verification → CLOSE slice → następny
```

---

## 12. Allowlista / bloklista

### Allowlista

| Obszar |
|--------|
| Biblioteka Robót — custom `CatalogWork` |
| CSV + `previewMarketCsvImport` + **`commitMarketQuotesImport`** |
| Docs `CENY-MATERIAŁÓW-04-P2-*` · backup/probe `.tmp/` |
| Readonly gap / validation probes (wzorzec P1) |
| Flagi P3.3 / CM-01 **ON tylko sesja ops/pomiar** (default tip bez wymuszania) |

### Bloklista

| Obszar |
|--------|
| `tender-offer-boq-pricing-engine.ts` · `tender-offer-boq-mapping.ts` · Bid · `cloud-sync.ts` |
| Scrapery · nowe tabele Supabase · nowe DATA_KEYS |
| GAP-B / Kp / marża · parser Discovery rewrite |
| Seed INNE / residual DROGI·ELEW jako główny P2 |

---

## 13. Payroll Safety Gate

```text
PAYROLL SAFETY GATE (P2 PLAN — FEATURE-DATA / OPS)
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE  (persist AS-IS · bez edycji cloud-sync.ts)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE
Wynik: ALL-NIE
Owner GO CORE: NIE
Owner GO OPS P2 (per slice): TAK — po DF + AR + Owner GO
```

---

## 14. Decyzje do zamrożenia w DF P2 (D-P2-*)

| ID | Decyzja | Propozycja PLAN |
|----|---------|-----------------|
| **D-P2-A** | Kolejność | P2-A ROZBIORKI → P2-B depth instalacji |
| **D-P2-B** | K-P2-2 depth trades | Hard: ≥1 z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK} · Soft: 2–3 jeśli ROI |
| **D-P2-C** | Cap | 3–12 / slice · rekomendacja A: 5–8 · B: 4–8 |
| **D-P2-D** | Quotes | 100% product przed CLOSE slice |
| **D-P2-E** | Baseline K-P2-1 | Linie z **readonly probe** (nie ślepo 38, jeśli residual już niższy) |
| **D-P2-F** | Token safety | Zakaz generics · keywords = pełne frazy · token scan |
| **D-P2-G** | Overlap | Nie dublować `p1a-rozebranie-*` / legacy bez uzasadnienia residual |
| **D-P2-H** | Forma | OPS-first · 0 LOC AI-COST |
| **D-P2-I** | INNE / residual P1 | OUT z P2 → P3 / IMPROVEMENTS |

Zmiana D-P2-* = amend DF P2.

---

## 15. Kryteria przejścia do DESIGN FREEZE

PLAN → DF **tylko gdy wszystkie TAK:**

| # | Kryterium | Wynik |
|---|-----------|--------|
| 1 | P1 COMPLETE jako wejście | **TAK** |
| 2 | AUDIT P2 COMPLETE · READY FOR PLAN | **TAK** |
| 3 | Scope IN/OUT jawne · zgodne z parent DF §4.3 | **TAK** |
| 4 | Kolejność slice P2-A → P2-B zdefiniowana | **TAK** |
| 5 | KPI K-P2-1…3 + soft + CLOSE gates | **TAK** |
| 6 | Rollback L1–L3 | **TAK** |
| 7 | Ryzyka + token/overlap mitigacje | **TAK** |
| 8 | Readonly gap probe **zaplanowany** jako wejście DF/OPS (metoda §3) | **TAK** |
| 9 | Harmonogram T0–T5 bez pomijania AR / Owner GO | **TAK** |
| 10 | ZERO zmian AI-COST / scoring / Bid / Cloud CORE | **TAK** |
| 11 | SSOT · REUSE · ZERO DUPLICATE LOGIC | **TAK** |
| 12 | Lista robót finalna | **NIE w PLAN** — szkic OK · **final = DF** |

**Decyzja PLAN:** spełnione kryteria 1–11 → **READY FOR DESIGN FREEZE**.  
Finalne ID/nazwy/keywords/ceny = **wyłącznie DF** (po opc. wynikach probe).

---

## 16. Wpływ biznesowy (szacunek)

| Efekt | Szacunek |
|-------|----------|
| Adresowalny unmatched ROZBIORKI | do **~80 k PLN** · **38 linii** · **14/18** spraw |
| Catch realistyczny P2-A | **≥ 50% linii** (KPI) · PLN umiarkowany vs P1 |
| Depth instalacji | **~12–36 k**/trade · jakość coverage na częstych remontach |
| Global HE | lekki ↓ lub parity; dominanta INNE zostaje do P3 |
| Direct PLN | Shift HE→CM na złapanych liniach · regresje **0** (ceny Owner) |

```text
P0:  CM odblokowany (Quotes@34)
P1:  top-3 PLN unmatched ↓ (CM 73.2% · HE 26.8%)
P2:  częstość rozbiórek + depth instalacji
P3:  triaż INNE (~1,72 M) — nie w tym PLAN
```

---

## 17. Checklist PLAN

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | Readonly gap probe opisany? | **TAK** |
| 2 | Analiza residual (P1 + CM-03 + overlap)? | **TAK** |
| 3 | Kolejność slice? | **TAK** |
| 4 | Scope IN/OUT? | **TAK** |
| 5 | KPI hard/soft + CLOSE? | **TAK** |
| 6 | Rollback? | **TAK** |
| 7 | Ryzyka? | **TAK** |
| 8 | Harmonogram? | **TAK** |
| 9 | Kryteria → DF? | **TAK** |
| 10 | Zgodność parent DF K-P2-1…3? | **TAK** |

---

## 18. Następne kroki procesu

```text
PLAN P2 COMPLETE
  → DESIGN FREEZE P2 (D-P2-A…I · finalna lista robót · baseline z probe)
  → Architecture Review P2
  → Owner GO
  → Readonly gap probe (jeśli DF wymaga wyniku przed OPS) / OPS P2-A
  → OPS P2-B
  → OV → RELEASE → CLOSE
  → P3 AUDIT (osobno)
```

**Zakaz teraz:** IMPLEMENT · commit · push · zmiany kodu aplikacji.

---

**PLAN STATUS:** **COMPLETE** · **READY FOR DESIGN FREEZE**
