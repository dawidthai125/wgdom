# CENY-MATERIAŁÓW-04 P1 — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE  
> **Etykieta:** P1 — WC + Quotes · chodniki → ogrodzenia → elewacje  
> **STATUS:** **DESIGN FREEZE · FROZEN** · OPS / IMPLEMENT **ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-30  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Wejście:** P1 PLAN **PASS** ([`CENY-MATERIAŁÓW-04-P1-PLAN.md`](CENY-MATERIAŁÓW-04-P1-PLAN.md) · [`PLAN-COMPLETE`](CENY-MATERIAŁÓW-04-P1-PLAN-COMPLETE.md)) · P0 OPS **PASS** · EPIC DF [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md)  
> **Baseline tip:** UI **2.65.80** · po P0: CM **65.7%** · HE **~34.3%** · Quotes@34 **100%** · regresje **0**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04 P1):
  Dodać roboty + product Quotes w 3 grupach AUDIT
  (P1-A chodniki → P1-B ogrodzenia → P1-C elewacje)
  → ↓ unmatched top-3 + ↓ HE — BEZ zmian AI-COST / providerów.

OPS / IMPLEMENT zakazany do:
  Architecture Review PASS + Owner GO (per grupa A/B/C).
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE   (brak nowych kluczy FEATURE; WC / P3.3 AS-IS)
G3 Cloud Sync:   NIE   (zakaz edycji cloud-sync.ts · brak nowych DATA_KEYS)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE (Payroll) · OfferBoq = ZERO nowych / ZERO reorder
G8 Shell:        NIE
G9 Routing:      NIE

Wynik: ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS P1 (slice A/B/C): TAK — po Arch Review PASS
```

Naruszenie Gate / edycja `cloud-sync.ts` / nowi providerzy → **STOP** · amend DF.

---

## 1. Cel architektoniczny (zamrożony)

Zmniejszyć lukę **heuristic_estimate ≈34.3%** (po P0) przez **wyłącznie dane**:

- nowe `CatalogWork` w SSOT `kw-wgdom-work-catalog`,  
- **product** `marketQuotes` na każdej nowej robocie,  
- tor odczytu AS-IS: `computeMarketAverage` → `controlled_market` → OfferBoq,

**bez** zmian AI-COST, providerów, heurystyk, Bid, Cloud Sync CORE.

**Sukces P1 ≠** Bid ≈ 1,6M.  
**Sukces P1 =** KPI hard §7 + coverage §7.3 na powtórce 18 spraw (CM-02/P0 sample).

---

## 2. Decyzje produktowe zamrożone (D-P1-A…F)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-P1-A** | Kolejność grup | **1** P1-A Chodniki/nawierzchnie → **2** P1-B Ogrodzenia → **3** P1-C Elewacje/ocieplenia |
| **D-P1-B** | Cap robót | **3–12** nowych aktywnych `CatalogWork` / grupę |
| **D-P1-C** | Quotes na nowych | **100%** product Quotes (`sekocenbud` / `kb_pl` / `wgdom` / `interbud`, `price > 0`) przed CLOSE grupy · `legacy_seed` **nie** liczy się do KPI |
| **D-P1-D** | Pipeline Quotes | **WYŁĄCZNIE** CSV → preview → **`commitMarketQuotesImport`** → WC → `marketQuotes` |
| **D-P1-E** | Soft HE | Cel roboczy HE avg 18: **~34.3% → ~28–30%** — **nie** hard gate (hard = K-P1-1…3) |
| **D-P1-F** | Jakość bucketów | Owner triage złotych opisów · **zakaz** seedowania fałszywych trafień regex (np. siatka tynkarska ≠ ogrodzenie parcelowe; izolacja bitumiczna pionowa ≠ chodnik) |

Zmiana D-P1-A…F = **amend DF** + Owner GO.

**Dziedziczone z EPIC DF (bez zmian):** D-A (pipeline) · D-B (zakaz AI-COST) · D-F (work bez Quotes = nie CLOSE) · D-H (OPS-first).

---

## 3. Pipeline (zamrożony — AS-IS)

```text
Owner / ops: nowe CatalogWork (Biblioteka · custom)
        +
CSV cennik Quotes
        │
        ▼
previewMarketCsvImport          (P3.2 — REUSE)
        │
        ▼
commitMarketQuotesImport        (P3.3 — JEDYNY zapis Quotes)
        │
        ▼
kw-wgdom-work-catalog
  works[] (nowe + legacy)
  works[].marketQuotes          ← SSOT cen rynku
        │
        ▼
computeMarketAverageForWork     (AS-IS)
        │
        ▼
controlled_market → OfferBoq    (AS-IS · CM-01 flag tylko pomiar)
```

**MUST NOT:**

- omijać `commitMarketQuotesImport`,  
- scrapery / zewnętrzne API cen,  
- zmieniać kolejności providerów OfferBoq,  
- re-open CM-01 scoring / mapping code,  
- zamykać grupę z robotą bez product Quotes.

---

## 4. Zakres grup (FROZEN)

### 4.1 P1-A — Chodniki i nawierzchnie

| Pole | **FROZEN** |
|------|------------|
| **Gap ID** | `DROGI_CHODNIKI_NAWIERZCHNIE` |
| **Baseline unmatched** | ~**311 k PLN** · 30 linii · 3 przetargi (AUDIT CM-03) |
| **IN (min robót)** | ≥3 z: kostka brukowa (m2) · podbudowa/podsypka (m2) · krawężnik/obrzeże (mb) |
| **IN (opc. do cap 12)** | asfalt/nawierzchnia bitumiczna · płyty chodnikowe · frezowanie — **tylko** po Owner triage złotych opisów |
| **OUT grupy** | Izolacje pionowe fundamentów / bitum „elewacyjny” fałszywie w buckecie → nie P1-A |
| **Fokus pomiaru** | m.in. `08decd0e` |
| **Quotes** | 100% product · P3.3 · ten sam slice co works |

### 4.2 P1-B — Ogrodzenia

| Pole | **FROZEN** |
|------|------------|
| **Gap ID** | `OGRODZENIA_SIATKI` |
| **Baseline unmatched** | ~**258 k PLN** · 15 linii · 5 przetargów |
| **IN (min)** | ≥3 z: ogrodzenie z siatki (mb) · słupek (szt) · brama/furtka (szt) |
| **IN (opc.)** | fundament/stopy · panele 3D — do cap 12 · Owner triage |
| **OUT grupy** | Siatka cięto-ciągniona / Rabitz tynkarska → **P1-C** (warstwa zbrojona), nie ogrodzenie |
| **Fokus** | m.in. `08ded5cb` |
| **Quotes** | 100% product · P3.3 · ten sam slice |

### 4.3 P1-C — Elewacje i ocieplenia

| Pole | **FROZEN** |
|------|------------|
| **Gap ID** | `ELEWACJE_OCIEPLENIA` |
| **Baseline unmatched** | ~**234 k PLN** · 12 linii · 4 przetargi |
| **IN (min)** | ≥3 z: ocieplenie styropian ETICS (m2) · warstwa zbrojona z siatką (m2) · tynk/farba elewacyjna (m2) |
| **IN (opc.)** | wełna MW · listwy startowe/cokół · ocieplenie od spodu stropów — do cap 12 |
| **OUT grupy** | Pełny katalog fasadowy „wszystko” · stolarka EI masowa |
| **Fokus** | m.in. `08dee3f6` |
| **Quotes** | 100% product · P3.3 · ten sam slice |

### 4.4 Zależność zamrożona

```text
P1-A CLOSE (KPI slice + Quotes 100%)
  → P1-B
    → P1-C
      → P1 CLOSE (K-P1-1…3)
```

P0 PASS — **wymagane** — **spełnione**.

---

## 5. Kontrakt nowej roboty (FROZEN)

Każda nowa robota P1 **MUSI**:

| # | Wymaganie |
|---|-----------|
| 1 | Być `CatalogWork` w SSOT `kw-wgdom-work-catalog` (custom Biblioteka — **nie** nowa tabela) |
| 2 | Mieć: `id` · `tradeId` · `name` · `unit` · `keywords[]` · `companyPricePln` · `active=true` |
| 3 | Posiadać **product** `marketQuotes` (`price > 0`) przed CLOSE grupy |
| 4 | Otrzymać Quotes **wyłącznie** przez P3.3 (`commitMarketQuotesImport`) |
| 5 | Nie zmieniać `companyPricePln` „z rynku” (D-C) — cena firmy = Owner/ops |

**Work bez product Quotes = grupa NIE CLOSED** (D-P1-C / EPIC D-F).

---

## 6. REUSE obowiązkowy (FROZEN)

| Asset | Użycie |
|-------|--------|
| Biblioteka Robót (UI) | Tworzenie custom works |
| `previewMarketCsvImport` | Preview CSV |
| **`commitMarketQuotesImport`** | Jedyny commit Quotes |
| P3.3 rollback / coverage | L1 Quotes · verify |
| `kw-wgdom-work-catalog` | SSOT |
| `computeMarketAverageForWork` · `controlled_market` | Odczyt AS-IS |
| Probe CM-02 / P0 | Walidacja 18 · coverage KPI |

---

## 7. KPI zamrożone

### 7.1 Hard (gate CLOSE P1)

| ID | Target **FROZEN** | Baseline |
|----|-------------------|----------|
| **K-P1-1** | Unmatched PLN w bucketach P1-A+P1-B+P1-C ≤ **50%** baseline | ~**803 k** → ≤ **~400 k** na powtórce 18 |
| **K-P1-2** | ≥ **3** nowe aktywne roboty / grupę · **100%** z product Quotes | 3 grupy A/B/C |
| **K-P1-3** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia) = **0** | vs P0 OPS baseline |

### 7.2 Soft (orientacyjne — nie hard gate)

| ID | Target **FROZEN** |
|----|-------------------|
| **K-P1-S1** | `heuristic_estimate` share materiałów avg 18: **~34.3% → ~28–30%** |

### 7.3 Coverage KPI (obowiązkowy pomiar OPS — FROZEN)

Dla **każdej** grupy P1-A / P1-B / P1-C, na powtórce 18 (CM-01 ON), raportować:

| ID | Metryka | Definicja |
|----|---------|-----------|
| **K-P1-C1** | BOQ covered by new works | Liczba linii OfferBoq z `catalogWorkId` ∈ **nowe** roboty grupy |
| **K-P1-C2** | BOQ still in HE (group gap) | Liczba linii w buckecie gap grupy, które nadal mają materiał z `priceOrigin.kind = heuristic_estimate` **lub** brak `catalogWorkId` (unmatched w buckecie) |

**Źródło bucketów:** te same reguły co CM-03 (`.tmp/ceny-materialow-03-audit.json` / gap IDs §4).  
**Evidence:** `.tmp/ceny-materialow-04-p1-*-validation.json` (wzór P0).

Coverage KPI **nie zastępuje** K-P1-1…3 — uzupełnia diagnosę „ile złapaliśmy vs ile HE zostało w grupie”.

---

## 8. Rollback P1 (FROZEN)

### 8.1 Per grupa (A / B / C)

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na nowych robotach grupy |
| **L2** | Rollback Quotes (P3.3) + usunięcie/dezaktywacja custom works grupy |
| **L3** | Restore backup JSON katalogu sprzed slice grupy |

### 8.2 Cały P1

| Poziom | Akcja |
|--------|--------|
| **L1** | Dezaktywacja wszystkich robót P1-A+B+C |
| **L2** | Rollback Quotes nowych + restore prac P0-only |
| **L3** | Restore `.tmp` backup sprzed startu P1-A (tip parity P0) |

Backup **obowiązkowy** przed każdym slice OPS.

---

## 9. Feature flags (FROZEN)

| Flaga | Rola |
|-------|------|
| `kw-wc-p33-market-pricing-ux` | ON tylko sesja ops importu · tip default **OFF** |
| `kw-ceny-materialow-01` | Pomiar OFF/ON · tip default **OFF** |
| Nowa flaga P1 | **NIE** |

---

## 10. OUT (FROZEN — twarde)

| OUT |
|-----|
| Zmiany **AI-COST** / pricing-engine / mapping CM-01 |
| Nowi **providerzy** / reorder |
| Zmiany **heurystyk** |
| **Bid Calculator** |
| Edycja **Cloud Sync CORE** (`cloud-sync.ts`) / nowe DATA_KEYS |
| **Scrapery** / live API cen |
| **GAP-B** · **marża** · **Kp** · softcode 1,6M |
| P2 (rozbiórki/instalacje) / P3 (INNE auto-seed) w tym slice |
| Nadpisanie `companyPricePln` z rynku |

---

## 11. Allowlista / bloklista (FROZEN)

### 11.1 Allowlista

| Obszar |
|--------|
| Biblioteka Robót — custom works |
| CSV + preview + **`commitMarketQuotesImport`** |
| Docs `CENY-MATERIAŁÓW-04-P1-*` · backup / evidence `.tmp/` |
| Readonly probe walidacji + coverage K-P1-C1/C2 |

### 11.2 Bloklista

| Obszar |
|--------|
| `tender-offer-boq-pricing-engine.ts` |
| `tender-offer-boq-mapping.ts` / CM-01 flag logic (re-open) |
| `tenders-bid-calculator.ts` · `cloud-sync.ts` · costModel defaults |
| Scrapery · nowe tabele Supabase · nowe DATA_KEYS |
| GAP-B · Kp · marża |

---

## 12. Acceptance Criteria (FROZEN)

| ID | Kryterium |
|----|-----------|
| **AC-P1.1** | Quotes wyłącznie przez `commitMarketQuotesImport` |
| **AC-P1.2** | Kolejność A→B→C respektowana · cap 3–12 |
| **AC-P1.3** | K-P1-1 · K-P1-2 · K-P1-3 PASS na evidence |
| **AC-P1.4** | K-P1-C1 i K-P1-C2 zaraportowane per grupa |
| **AC-P1.5** | Zero LOC w blokliście §11.2 |
| **AC-P1.6** | Rollback L1–L3 udokumentowany + backup istnieje |

---

## 13. Ryzyka (zamrożone mitigacje)

| Ryzyko | Mitigacja **FROZEN** |
|--------|----------------------|
| Fałszywy match | Wąskie keywords · złote opisy · D-P1-F · Owner review |
| Scope creep | Cap 12 · CLOSE per grupa |
| Works bez Quotes | Gate D-P1-C |
| Regresja cen | K-P1-3 · rollback L1 |

---

## 14. Checklist DF

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | Pipeline CSV → commit P3.3 → WC → Quotes? | **PASS** (D-P1-D) |
| 2 | Zero AI-COST / providerów / heurystyk / Bid / Cloud CORE? | **PASS** (§10) |
| 3 | Scope tylko P1-A/B/C? | **PASS** (§4) |
| 4 | Każda nowa robota: product Quotes · P3.3 · SSOT WC? | **PASS** (§5) |
| 5 | KPI hard + soft + coverage zamrożone? | **PASS** (§7) |
| 6 | OUT potwierdzony? | **PASS** (§10) |
| 7 | Rollback P1 L1–L3? | **PASS** (§8) |
| 8 | Zgodność z P1 PLAN + EPIC DF? | **PASS** |

---

## 15. Status

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1 DESIGN FREEZE
STATUS: FROZEN
Decyzja procesu: READY FOR ARCHITECTURE REVIEW
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **DF STATUS** | **FROZEN** |
| **OPS / IMPLEMENT** | **BLOCKED** do Arch Review PASS + Owner GO |
| **Następny krok** | Architecture Review P1 → Owner GO OPS P1-A |

**Zakaz teraz:** IMPLEMENT · commit · push.
