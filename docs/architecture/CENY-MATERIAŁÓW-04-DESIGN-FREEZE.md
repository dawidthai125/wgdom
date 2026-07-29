# CENY-MATERIAŁÓW-04 — DESIGN FREEZE

> **ID:** CENY-MATERIAŁÓW-04-DESIGN-FREEZE  
> **Etykieta:** Data Coverage Phase 2 — Quotes fill + WC expansion (P0–P3)  
> **STATUS:** **DESIGN FREEZE · FROZEN** · **IMPLEMENT / OPS masowy ZABLOKOWANY** do Arch Review PASS + Owner GO  
> **Data:** 2026-07-29  
> **MODE:** DESIGN FREEZE ONLY · DOCS ONLY · **bez IMPLEMENT / commit / push**  
> **Klasa:** FEATURE-DATA / OPS · Gate G1–G9 **ALL-NIE**  
> **Priorytet:** **P1**  
> **Wejście:** AUDIT **PASS** ([`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) · [`COMPLETE`](CENY-MATERIAŁÓW-03-AUDIT-COMPLETE.md)) · PLAN **PASS** ([`CENY-MATERIAŁÓW-04-PLAN.md`](CENY-MATERIAŁÓW-04-PLAN.md) · [`PLAN-COMPLETE`](CENY-MATERIAŁÓW-04-PLAN-COMPLETE.md))  
> **Baseline tip:** UI **2.65.80** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Zależności CLOSED:** CENY-MATERIAŁÓW-01 · WORK-CATALOG-P3.3 · COST-02-A · CM-02/03 empiria  
> **Język:** polski

```text
════════════════════════════════════════════════════════
One Bundle = One Goal (CENY-MATERIAŁÓW-04):
  Zapełnić marketQuotes + rozszerzyć Work Catalog
  w istniejącym pipeline P3.3 → controlled_market
  — BEZ zmian AI-COST / providerów / heurystyk
  — BEZ Bid Calculator / Cloud Sync CORE / scraperów
  — BEZ GAP-B / Kp / marży

IMPLEMENT / masowy OPS zakazany do:
  Architecture Review PASS + Owner GO.
════════════════════════════════════════════════════════
```

---

## 0. PAYROLL SAFETY GATE (zamrożony)

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE   (brak nowych kluczy FEATURE; P3.3 / WC keys AS-IS)
G3 Cloud Sync:   NIE   (zakaz edycji cloud-sync.ts · brak nowych DATA_KEYS)
G4 Bootstrap:    NIE
G5 Week:         NIE
G6 Shared hooks: NIE (Payroll)
G7 Providers:    NIE (Payroll) · OfferBoq providers = ZERO nowych / ZERO reorder
G8 Shell:        NIE
G9 Routing:      NIE  (UI Biblioteka Robót AS-IS · P3.3)

Wynik: ALL-NIE · FEATURE-DATA / OPS
Owner GO CORE: NIE
Owner GO OPS / IMPLEMENT (slice): TAK — po Arch Review PASS
```

Jeżeli naruszenie Gate / edycja `cloud-sync.ts` / nowi providerzy → **STOP** · amend DF.

---

## 1. Cel architektoniczny (zamrożony)

Usunąć blokadę **NO_RECORDS** (`marketQuotes` puste na 34/34) i zmniejszyć lukę unmatched WC przez **wyłącznie dane**, tak aby istniejący tor:

`controlled_market` ← `computeMarketAverageForWork` ← `marketQuotes`

zaczął trafiać w OfferBoq — **bez** zmian silnika AI-COST.

**Sukces EPIC ≠** Bid ≈ 1,6M.  
**Sukces EPIC =** KPI P0–P3 (§7) na powtórce empirii CM-02 (18 spraw) + coverage katalogu.

---

## 2. Decyzje produktowe zamrożone (D-A…D-H)

| ID | Decyzja | Wartość **FROZEN** |
|----|---------|-------------------|
| **D-A** | Pipeline Quotes | **WYŁĄCZNIE** CSV → preview → **`commitMarketQuotesImport`** → WC → `marketQuotes` → `computeMarketAverage` → `controlled_market` → OfferBoq |
| **D-B** | AI-COST / providerzy / heurystyki | **ZAKAZ ZMIANY** — zero LOC w pricing-engine, mapping CM-01, Bid, heurystykach |
| **D-C** | P0 scope | Quotes **tylko** dla **34** istniejących aktywnych robót · **bez** nowych works |
| **D-D** | P0 jakość Quotes | KPI wymaga **product** origins (`sekocenbud` / `kb_pl` / `wgdom` / `interbud`); `legacy_seed` **tylko most &lt;20%** robót, **nie** zalicza się do „≥80% product” |
| **D-E** | P1 kolejność grup | **1** Chodniki/nawierzchnie → **2** Ogrodzenia → **3** Elewacje/ocieplenia · cap **3–12** nowych robót / grupę |
| **D-F** | P1/P2 reguła Quotes | Nowa robota **bez** product Quotes = **slice NIE CLOSED** |
| **D-G** | P3 INNE | **Triaż ręczny** · **zakaz** automatycznego / ślepego seed · mikro-grupa tylko jeśli ≥**50 k PLN** i (≥**5** linii **lub** ≥**2** przetargi) |
| **D-H** | Forma dostawy | Preferencja **OPS + dane** (0 LOC silnika); opcjonalny artefakt docs/szablon CSV — **nie** wymóg kodu FEATURE |

Zmiana D-A…D-H = **amend DF** + Owner GO.

---

## 3. Pipeline (zamrożony — AS-IS)

```text
CSV (cennik Owner / ops)
        │
        ▼
previewMarketCsvImport          (P3.2 — REUSE)
        │
        ▼
commitMarketQuotesImport        (P3.3 — JEDYNY zapis importu z UI)
        │
        ▼
Work Catalog store
  kw-wgdom-work-catalog
  works[].marketQuotes          ← SSOT cen rynku
        │
        ▼
computeMarketAverageForWork     (AS-IS Engine)
        │
        ▼
controlled_market provider      (AS-IS · COST-02-A)
        │
        ▼
OfferBoq (AI-COST)              (AS-IS łańcuch · CM-01 flag opcjonalnie do pomiaru)
```

**MUST NOT:**

- omijać `commitMarketQuotesImport` (bezpośredni zapis „na czuja” poza routerem katalogu),  
- dodawać scrapera / zewnętrznego API cen,  
- zmieniać kolejności: knowledge → controlled_market → work_catalog → category_rate → heuristic.

---

## 4. Etapy zamrożone (P0–P3)

### 4.1 P0 — Quotes @ 34

| Pole | **FROZEN** |
|------|------------|
| **IN** | `marketQuotes` product dla 34 aktywnych `legacy-*` · region start `wroclaw` (fallback Engine AS-IS; `polska` OK) · P3.3 flag ON na czas ops |
| **OUT** | Nowe roboty · zmiana `companyPricePln` (D-C P3.3) · AI-COST · Bid · Cloud CORE |
| **Zasilanie** | **Wyłącznie** `commitMarketQuotesImport` |
| **KPI** | §7.1 |
| **Rollback** | §8.1 |

### 4.2 P1 — WC + Quotes (top-3)

| Pole | **FROZEN** |
|------|------------|
| **IN** | Nowe roboty + keywords + `companyPricePln` + **product Quotes** w grupach: chodniki → ogrodzenia → elewacje |
| **OUT** | Zmiana scoringu CM-01 · MPI · pełny katalog branżowy · D-C companyPrice z rynku |
| **Zasilanie Quotes** | Jak P0 (P3.3 commit) — **w tym samym slice** co works |
| **KPI** | §7.2 |
| **Rollback** | §8.2 |

### 4.3 P2 — Depth

| Pole | **FROZEN** |
|------|------------|
| **IN** | Depth: **rozbiórki** · **instalacje** (elektryka / hydraulika-CO / GK ponad legacy) · + Quotes |
| **OUT** | Nowe branże poza listą · Discovery/parser rewrite |
| **KPI** | §7.3 |
| **Rollback** | §8.3 |

### 4.4 P3 — INNE

| Pole | **FROZEN** |
|------|------------|
| **IN** | Lista/triaż top opisów unmatched INNE (~1,72 M) → klasyfikacja: P1/P2 grupa · mikro-grupa (D-G) · parser junk · odłożone |
| **OUT** | Automatyczny seed 400+ linii · traktowanie 1,72 M jako jednej roboty · implementacja parsera w tym EPIC (tylko ticket outbound) |
| **KPI** | §7.4 |
| **Rollback** | §8.4 |

**Zależność zamrożona:** P1 CLOSE wymaga **P0 PASS**. Nie zamykać nowych works bez Quotes (D-F).

---

## 5. REUSE obowiązkowy (FROZEN)

| Asset | Użycie |
|-------|--------|
| `previewMarketCsvImport` | Preview CSV |
| **`commitMarketQuotesImport`** | **Jedyny** commit Quotes z UI |
| P3.3 rollback / coverage S5 | Rollback L1 · weryfikacja pokrycia |
| `kw-wgdom-work-catalog` | SSOT works + Quotes |
| `computeMarketAverageForWork` | Odczyt średniej |
| `createControlledMarketPriceProvider` | Tor OfferBoq |
| CM-01 / CM-02 probe | Pomiar OFF/ON (bez zmian kodu FEATURE) |

---

## 6. Allowlista / bloklista (FROZEN)

### 6.1 Allowlista

| Obszar | Przykłady |
|--------|-----------|
| Ops UI | Biblioteka Robót · P3.3 import/commit/rollback · ręczne roboty custom |
| Dane | CSV Quotes · wpisy WC |
| Docs | `CENY-MATERIAŁÓW-04-*` · runbook ops · opcjonalny szablon CSV w `docs/ops/` |
| Pomiary | Readonly probe (wzorzec `.tmp/ceny-materialow-02-*`) |

### 6.2 Bloklista

| Plik / obszar |
|---------------|
| `tender-offer-boq-pricing-engine.ts` (reorder / nowi providerzy) |
| `tender-offer-boq-mapping.ts` / CM-01 flag logic (re-open) |
| `tenders-bid-calculator.ts` · `cloud-sync.ts` · costModel defaults |
| Scrapery · nowe tabele Supabase · nowe DATA_KEYS |
| GAP-B · Kp · marża · softcode 1,6M |

---

## 7. KPI zamrożone

### 7.1 P0

| KPI | Target **FROZEN** |
|-----|-------------------|
| **K-P0-1** | ≥ **80%** z 34 robót z **product** Quotes (`price > 0`) |
| **K-P0-2** | `controlled_market` share materiałów (powtórka 18 spraw, CM-01 ON) **> 0%** · cel roboczy ≥ **10%** |
| **K-P0-3** | Regresje krytyczne direct (Δ% &lt; −5% bez uzasadnienia) = **0** |

### 7.2 P1

| KPI | Target **FROZEN** |
|-----|-------------------|
| **K-P1-1** | Unmatched PLN w bucketach chodniki+ogrodzenia+elewacje ≤ **50%** baseline AUDIT (~800 k → ≤ ~400 k) na powtórce 18 |
| **K-P1-2** | ≥ **3** nowe aktywne roboty / grupę · **100%** z product Quotes przed CLOSE grupy |
| **K-P1-3** | Regresje = **0** |

### 7.3 P2

| KPI | Target **FROZEN** |
|-----|-------------------|
| **K-P2-1** | Spadek **częstości** unmatched w buckecie rozbiórek: linie ≤ **50%** baseline (38 → ≤ 19) na powtórce 18 |
| **K-P2-2** | ≥ 1 nowa robota depth w ROZBIORKI oraz depth w ≥1 z {ELEKTRYKA, HYDRAULIKA, SCIANY_GK} · Quotes **100%** na nowych |
| **K-P2-3** | Regresje = **0** |

### 7.4 P3

| KPI | Target **FROZEN** |
|-----|-------------------|
| **K-P3-1** | ≥ **70%** najczęstszych opisów z kategorii INNE (top-kwantyl / top-N zamrożony w AR/runbook, nie „cały szum”) **przypisanych** do właściwej grupy · parser junk · lub odłożone z uzasadnieniem |
| **K-P3-2** | **0** ślepego seed automatycznego |

Baseline liczbowy unmatched: [`CENY-MATERIAŁÓW-03-AUDIT.md`](CENY-MATERIAŁÓW-03-AUDIT.md) / `.tmp/ceny-materialow-03-audit.json`.

---

## 8. Rollback (zamrożony per etap)

### 8.1 P0

| Poziom | Akcja |
|--------|--------|
| **L1** | P3.3 **Rollback** ostatniego importu Quotes |
| **L2** | Przywrócenie backupu JSON katalogu sprzed commit (ops) |
| **L3** | Akceptacja powrotu do NO_RECORDS (tip parity CM) |

### 8.2 P1

| Poziom | Akcja |
|--------|--------|
| **L1** | `active=false` na nowych robotach grupy |
| **L2** | Rollback Quotes (P3.3) + usunięcie/dezaktywacja custom works |
| **L3** | Restore katalogu tip sprzed P1 |

### 8.3 P2

| Poziom | Akcja |
|--------|--------|
| **L1–L3** | Jak P1 (dezaktywacja depth works · rollback Quotes · restore tip) |

### 8.4 P3

| Poziom | Akcja |
|--------|--------|
| **L1** | Docs-only triaż: brak mutacji → brak rollback danych |
| **L2** | Jeśli powstała mikro-grupa: jak P1 L1–L2 |
| **L3** | Cofnięcie ticketów parsera nie dotyczy tego EPIC |

---

## 9. Feature flags (zamrożone)

| Flaga | Rola |
|-------|------|
| `kw-wc-p33-market-pricing-ux` | **ON tylko sesja ops** importu · tip default **OFF** |
| `kw-ceny-materialow-01` | Pomiar CM-02bis · tip default **OFF** |
| Nowa flaga CM-04 | **NIE** (brak FEATURE kodu wymaganego) |

---

## 10. OUT — potwierdzenie zamrożone

| OUT | Status DF |
|-----|-----------|
| Nowi providerzy OfferBoq | **ZAKAZ** |
| Zmiany AI-COST (silnik / mapping / Explain) | **ZAKAZ** |
| Zmiany heurystyk | **ZAKAZ** |
| Zmiany Bid Calculator | **ZAKAZ** |
| Zmiany Cloud Sync CORE (`cloud-sync.ts`) | **ZAKAZ** |
| Scrapery / zewnętrzne API cen | **ZAKAZ** |
| GAP-B · Kp · marża · softcode 1,6M | **ZAKAZ** |
| Nowe tabele / SKU ledger / nowe DATA_KEYS | **ZAKAZ** |
| Reorder providerów | **ZAKAZ** |
| Ślepy seed INNE | **ZAKAZ** |

---

## 11. Acceptance Criteria (orientacyjne — AR doprecyzuje)

| ID | Kryterium |
|----|-----------|
| **AC-P0.1** | Commit Quotes wyłącznie przez `commitMarketQuotesImport` |
| **AC-P0.2** | K-P0-1 i K-P0-2 PASS na evidence probe |
| **AC-P1.1** | Kolejność grup = chodniki → ogrodzenia → elewacje |
| **AC-P1.2** | K-P1-1 / K-P1-2 PASS · D-F respektowane |
| **AC-P2.1** | K-P2-1 / K-P2-2 PASS |
| **AC-P3.1** | K-P3-1 PASS · brak auto-seed |
| **AC-OUT** | Diff bloklisty = pusty względem silnika AI-COST / Bid / cloud-sync |

---

## 12. Ryzyka (zamrożona świadomość)

| Ryzyko | Mitigacja DF |
|--------|--------------|
| CSV nie mapuje `legacy-*` | Preview P3.3 · aliasy w CSV · target 80% matched przed commit |
| Nowe works bez Quotes | Gate CLOSE D-F |
| Fałszywy match | Cap 3–12 · keywords z próbek AUDIT · PV złote opisy |
| Scope creep INNE | D-G progi · triaż |
| P3.3 flag zostaje ON | Runbook: po ops → OFF |

---

## 13. Checklist DF

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | Pipeline P3.3 → CM zamrożony (D-A)? | **PASS** |
| 2 | Zero AI-COST / provider / heurystyka / Bid / Cloud CORE? | **PASS** |
| 3 | P0–P3 + KPI + rollback zamrożone? | **PASS** |
| 4 | OUT kompletne (§10)? | **PASS** |
| 5 | Gate ALL-NIE? | **PASS** |
| 6 | Blokery do AR? | **NIE** |

---

## 14. Werdykt DESIGN FREEZE

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 DESIGN FREEZE
STATUS: FROZEN
Decyzja procesu: READY FOR ARCHITECTURE REVIEW
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **DF STATUS** | **FROZEN** |
| **IMPLEMENT / masowy OPS** | **BLOCKED** do Arch Review PASS + Owner GO |
| **Następny krok** | Architecture Review → Owner GO OPS P0 (preferowane) / cienki IMPLEMENT tylko jeśli AR wymaga artefaktu docs |

**Zakaz teraz:** IMPLEMENT silnika · commit · push.
