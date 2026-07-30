# CENY-MATERIAŁÓW-04 P2 — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-04-P2-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push / OPS / zmian kodu**  
> **Data:** 2026-07-30  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P2-DESIGN-FREEZE.md) — **FROZEN** (wejście)  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P2-PLAN.md`](CENY-MATERIAŁÓW-04-P2-PLAN.md) · **PASS**  
> **Parent EPIC DF:** [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) §4.3 / §7.3  
> **Tip bazowy:** UI **2.65.83** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-04 P2 (DATA / OPS)
        z Parent EPIC · PLAN · SSOT · REUSE · anti-dup · tokens
WERDYKT: FAIL (self-consistency §6.2 + overlap EXTEND↔NEW)
DECYZJA: CHANGES REQUIRED
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| P2 PLAN | **PASS** · READY FOR DF |
| P2 DESIGN FREEZE | **FROZEN** (docs) — review poniżej |
| P1 COMPLETE | **PASS** · tip **2.65.83** |
| Kod / IMPLEMENT / OPS | **brak** |
| Owner GO OPS | **zablokowany** do amend DF + re-AR PASS |

**Metoda:** checklist 11 punktów Ownera · skan name/desc vs §6.2 · anty-dup fraz E* ↔ `p2a/b-*` ↔ `p1a/b/c-*` · zgodność Parent KPI.

---

## 1. Checklist — PASS / FAIL

### 1.1 Zgodność z Parent EPIC (DF §4.3 + KPI §7.3)

| Check | Werdykt | Dowód |
|-------|---------|--------|
| IN = rozbiórki + instalacje (elektryka / hydraulika-CO / GK) + Quotes | **PASS** | DF §4.1–4.2 · §5 |
| OUT = nowe branże · Discovery/parser rewrite | **PASS** | D-P2-I · bloklista §15 |
| K-P2-1 linie ≤50% baseline (38→≤19 domyślnie) | **PASS** | §8.1 + D-P2-E (probe override = dopuszczalne doprecyzowanie) |
| K-P2-2 ≥1 NEW ROZBIORKI + ≥1 trade instalacji · Quotes 100% | **PASS** | D-P2-B · §5.2/5.4 · §8.1 |
| K-P2-3 regresje 0 | **PASS** | §8.1 |
| Rollback jak P1 L1–L3 | **PASS** | §10 |

**Wynik 1:** **PASS**

---

### 1.2 Zgodność z P2 PLAN

| Check | Werdykt |
|-------|---------|
| Kolejność P2-A → P2-B | **PASS** |
| Readonly gap probe jako wejście OPS | **PASS** (AC-P2.1) |
| Residual / OUT INNE · residual P1 | **PASS** |
| Cap 3–12 · Quotes P3.3 · FEATURE-DATA | **PASS** |
| Harmonogram EXTEND → NEW → Quotes | **PASS** |

**Wynik 2:** **PASS**

---

### 1.3 Zasady SSOT / REUSE / ZERO DUPLICATE / FEATURE-DATA

| Zasada | Werdykt | Dowód |
|--------|---------|--------|
| **SSOT FIRST** | **PASS** | WC `kw-wgdom-work-catalog` · tip w `09` · Quotes tylko P3.3 |
| **REUSE FIRST** | **PASS** | preview + `commitMarketQuotesImport` · controlled_market AS-IS · Biblioteka |
| **ZERO DUPLICATE LOGIC** | **PASS** (tor) | Zakaz drugiego toru Quotes / scoringu / providerów |
| **FEATURE-DATA ONLY** | **PASS** | Gate ALL-NIE · 0 LOC silnika · bloklista |

**Uwaga:** ZERO DUPLICATE **danych** (frazy) — patrz §1.5 / §1.6 (osobne FAIL).

**Wynik 3:** **PASS** (zasady toru / klasy)

---

### 1.4 EXTEND poprzedza NEW

| Check | Werdykt |
|-------|---------|
| Pipeline §3: [1] EXTEND → [2] NEW → [3] CSV | **PASS** |
| Kolejność OPS sztywna §4.0 | **PASS** |
| H-A2 / H-B2 w KPI | **PASS** |
| Harmonogram T3→T4 / T8 | **PASS** |

**Wynik 4:** **PASS**

---

### 1.5 Duplikaty względem p1a / p1b / p1c / legacy

| Check | Werdykt | Szczegóły |
|-------|---------|-----------|
| vs `p1a-rozebranie-*` (nawierzchnie) | **PASS** | OUT §5.2 · osobne ID posadzek **wewnętrznych** |
| vs `p1b-*` / `p1c-*` | **PASS** | OUT ogrodzenia/elewacje · chronione §4.3 |
| vs legacy (nowe ID zamiast klonu) | **PASS** (struktura) | EXTEND E1–E8 · NEW tylko przy izolacji ceny/false-match |
| **Kolizja fraz EXTEND ↔ NEW** | **FAIL** | Patrz §2.1 |

**Wynik 5:** **FAIL** (overlap semantyczny E4/E6/E8 ↔ `p2b-*`)

---

### 1.6 Keywords pełne frazy · brak generycznych tokenów w name/desc

| Check | Werdykt | Szczegóły |
|-------|---------|-----------|
| Keywords = frazy ≥2 słowa / kwalifikator | **PASS** (głównie) | Lista §5–§6; drobne: `kołnierzy, gzymsów` — słaba fraza (ryzyko, nie hard FAIL) |
| Brak dokładań stemów legacy (`rozbior`, `elektr`…) | **PASS** | Zakaz §5.1/5.3 |
| **namePl/descriptionPl ∩ §6.2 = ∅** | **FAIL** | Skan: **p2a-3** `zerwanie` · **p2a-5** `demontaż` · **p2b-1** `ścianka` |
| Wyjątek „Rozebranie &lt;obiekt&gt;” | **PASS** | p2a-1/2/4/6 zgodne z notą §6.2 |
| Wyjątek dla Zerwanie / Demontaż / Ścianka | **BRAK w DF** | → sprzeczność self-consistency |

**Wynik 6:** **FAIL**

Evidence skanu (foldPolish + token len≥4):

| ID | Trafienia §6.2 |
|----|----------------|
| `p2a-zerwanie-tynkow-wewn-m2` | `zerwanie` |
| `p2a-demontaz-drzwi-wewn-szt` | `demontaż` |
| `p2b-scianka-gk-na-stelazu-m2` | `ścianka` |

---

### 1.7 Każdy NEW ma komplet Product Quotes

| Check | Werdykt | Uwaga |
|-------|---------|-------|
| Kontrakt DF: 100% product Quotes na NEW przed CLOSE | **PASS** | D-P2-D · §7 · AC-P2.5 |
| Struktura CSV zamrożona | **PASS** | §7.1–7.2 |
| Runtime Quotes w KV | **N/A** | OPS jeszcze nie — AR ocenia kontrakt, nie stan prod |

**Wynik 7:** **PASS** (kontrakt projektowy)

---

### 1.8 Pipeline CSV → Preview → commit → Catalog → controlled_market

| Check | Werdykt |
|-------|---------|
| Jedyny zapis = `commitMarketQuotesImport` | **PASS** |
| Preview przed commit (≥80%) | **PASS** |
| Odczyt average → CM → OfferBoq AS-IS | **PASS** |
| Zakaz scrapera / ręcznego marketQuotes | **PASS** |

**Wynik 8:** **PASS**

---

### 1.9 KPI K-P2-1…3 mierzalne w Owner Verification

| KPI | Mierzalne? | Werdykt |
|-----|------------|---------|
| K-P2-1 | Gap probe linie ROZBIORKI vs `baseline_rozbiorki_lines` | **PASS** |
| K-P2-2 | Inspect WC: count `p2a-*` + `p2b-*` per trade · Quotes 100% | **PASS** |
| K-P2-3 | Probe 18 vs tip 2.65.83 · false 0 · token scan | **PASS** |
| D-P2-E baseline | Wymaga artefaktu probe — zdefiniowane | **PASS** |

**Wynik 9:** **PASS**

---

### 1.10 Rollback L1–L3

| Poziom | Kompletność | Werdykt |
|--------|-------------|---------|
| L1 | `active=false` NEW · P1 chronione | **PASS** |
| L2 | Rollback Quotes + cofnięcie EXTEND z backup | **PASS** |
| L3 | Full restore backup tip sprzed P2 | **PASS** |
| Backup obowiązkowy przed EXTEND/Quotes | **PASS** | §10 |

**Wynik 10:** **PASS**

---

### 1.11 OUT zachowany

| OUT | Werdykt |
|-----|---------|
| AI-COST | **PASS** |
| Scoring / mapping CM-01 | **PASS** |
| Providerzy / reorder | **PASS** |
| Bid Calculator | **PASS** |
| Cloud Sync CORE | **PASS** |
| Parser / Discovery rewrite | **PASS** |
| INNE (P3) | **PASS** |

**Wynik 11:** **PASS**

---

## 2. Wykryte ryzyka i FAIL

### 2.1 FAIL — kolizja fraz EXTEND ↔ NEW (anti-dup)

| Para | Problem |
|------|---------|
| E4 `punkt oświetleniowy wewnętrzny` ↔ `p2b-punkt-elektryczny-oswietleniowy-szt` | Wspólny rdzeń „punkt oświetleniowy*” — ryzyko ambiguous match |
| E6 `płyty gipsowo-kartonowe na stelażu` ↔ `p2b-scianka-gk-na-stelazu-m2` | Semantyczny overlap ze stelażem GK — narusza intencję „frazy nie na legacy-gk” |
| E8 `podejście wodociągowe wewnętrzne` ↔ `p2b-podejscie-wod-kan-mb` (`podejścia wodociągowe wewnętrzne`) | Near-duplicate frazy |

Narusza D-P2-G / §6.1 anti-dup (jedna fraza → jeden workId) w praktyce scoringu `hay.includes`.

### 2.2 FAIL — namePl vs §6.2 (self-consistency)

Trzy NEW mają w name/desc gołe tokeny z listy zakazanej **bez** wyjątku analogicznego do „Rozebranie &lt;obiekt&gt;”.

### 2.3 Ryzyka nieblokujące (nie zmieniają FAIL → mimo to raport)

| Ryzyko | Poziom | Uwaga |
|--------|--------|-------|
| Słaba fraza keywords `kołnierzy, gzymsów` | Niski | Preferować pełniejsze frazy w amend |
| Soft K-P2-2 (3 trade) vs hard (≥1) | Niski | Zgodne z Parent; OPS target jasny |
| Baseline probe jeszcze nie wykonany | Niski | AC-P2.1 przed OPS — OK |

---

## 3. Wymagane poprawki (amend DF — przed re-AR)

**Bez IMPLEMENT / OPS.** Tylko amend dokumentacji DF.

| # | Poprawka **WYMAGANA** |
|---|----------------------|
| **A1** | §6.2: dodać wyjątki jak dla Rozebranie **albo** zmienić namePl/descriptionPl: `Zerwanie…` · `Demontaż…` · `Ścianka…` tak, by skan §6.2 = **0** (rekomendacja AR: wyjątki `Zerwanie <obiekt≥2 słów>` · `Demontaż <obiekt≥2>` · `Ścianka działowa z …` / rename na `Zabudowa działowa z płyt gipsowo-kartonowych…`) |
| **A2** | Usunąć z **E6** frazę `płyty gipsowo-kartonowe na stelażu` (zarezerwować dla `p2b-scianka-*`) · zostawić szersze EXTEND bez „na stelażu” |
| **A3** | Usunąć z **E4** `punkt oświetleniowy wewnętrzny` **lub** z `p2b-3` zbędny overlap — jedna fraza-rdzeń na jednym ID |
| **A4** | Usunąć z **E8** `podejście wodociągowe wewnętrzne` **lub** z `p2b-5` `podejścia wodociągowe wewnętrzne` — zero near-dup |
| **A5** | (Zalecane) Wzmocnić keyword `kołnierzy, gzymsów` → pełna fraza z kontekstem obróbek |

Po A1–A4: **re-run Architecture Review** (thin) → dopiero Owner GO.

---

## 4. Macierz końcowa

| # | Punkt Ownera | Wynik |
|---|--------------|-------|
| 1 | Parent EPIC §4.3 / §7.3 | **PASS** |
| 2 | P2 PLAN | **PASS** |
| 3 | SSOT · REUSE · ZERO DUP LOGIC · FEATURE-DATA | **PASS** |
| 4 | EXTEND przed NEW | **PASS** |
| 5 | Anti-dup p1a/b/c + legacy | **FAIL** (EXTEND↔NEW) |
| 6 | Keywords / tokeny name | **FAIL** (§6.2) |
| 7 | Quotes kontrakt NEW | **PASS** |
| 8 | Pipeline P3.3 | **PASS** |
| 9 | KPI mierzalne OV | **PASS** |
| 10 | Rollback L1–L3 | **PASS** |
| 11 | OUT silnika + INNE | **PASS** |

**Agregat:** **FAIL** (2 punkty krytyczne).

---

## 5. Decyzja

| | |
|--|--|
| **Decyzja** | **CHANGES REQUIRED** |
| **Nie** | READY FOR OWNER GO |
| **Następny krok** | Amend DF (A1–A4) → thin re-AR → Owner GO |
| **Zakaz** | OPS · IMPLEMENT · commit · push · zmiany kodu |

---

## 6. Co jest gotowe (nie wymaga poprawki)

Architektura toru danych, Parent KPI, PLAN alignment, Gate, OUT silnika, rollback, kolejność EXTEND→NEW, lista ID NEW (intencja biznesowa) — **solidne**. Blokują wyłącznie **self-consistency tokenów** i **anty-dup fraz** EXTEND↔NEW.

---

**AR STATUS:** **COMPLETE** · **CHANGES REQUIRED** · **NIE** gotowe do OWNER GO
