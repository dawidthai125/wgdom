# CENY-MATERIAŁÓW-04 P1 — ARCHITECTURE REVIEW

> **ID:** CENY-MATERIAŁÓW-04-P1-ARCHITECTURE-REVIEW  
> **MODE:** ARCHITECTURE REVIEW ONLY · **DOCS ONLY** · **bez IMPLEMENT / commit / push**  
> **Data:** 2026-07-30  
> **Język:** polski  
> **DF:** [`CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-P1-DESIGN-FREEZE.md) — **FROZEN**  
> **PLAN:** [`CENY-MATERIAŁÓW-04-P1-PLAN.md`](CENY-MATERIAŁÓW-04-P1-PLAN.md) · **PASS**  
> **P0 OPS:** **PASS**  
> **EPIC DF / AR:** [`CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md`](CENY-MATERIAŁÓW-04-DESIGN-FREEZE.md) · [`…-ARCHITECTURE-REVIEW.md`](CENY-MATERIAŁÓW-04-ARCHITECTURE-REVIEW.md) · APPROVED  
> **Tip bazowy:** UI **2.65.80** — SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
REVIEW: zgodność DF CENY-MATERIAŁÓW-04 P1 (DATA / OPS)
        z SSOT · zasady · pipeline P3.3 · KPI · OUT · rollback
WERDYKT: PASS
DECYZJA: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

---

## 0. Zakres przeglądu

| Element | Status wejścia |
|---------|----------------|
| P1 PLAN | **PASS** |
| P1 DESIGN FREEZE | **PASS** · **FROZEN** |
| P0 OPS | **PASS** (Quotes@34 · CM 65.7% · HE ~34.3%) |
| Kod / IMPLEMENT | **brak** (review docs + AS-IS `commitMarketQuotesImport`) |
| Owner GO OPS | **oczekuje** na ten raport (zalecane: GO P1-A) |

**Metoda:** DF P1 vs SSOT tip · EPIC DF · REUSE P3.3/WC/COST-02-A · scope A/B/C · KPI hard/soft/coverage · OUT · rollback · Gate · uzasadnienie cap 3–12.

---

## 1. Zgodność z SSOT

| SSOT / kontrakt | DF P1 | Werdykt |
|-----------------|-------|---------|
| Tip tylko w `09` | Baseline **2.65.80** · bez bump tipu | **PASS** |
| WC SSOT `kw-wgdom-work-catalog` | Nowe custom works + `marketQuotes` | **PASS** |
| P3.3 — jedyny commit Quotes | D-P1-D · `commitMarketQuotesImport` | **PASS** (symbol tip: `commit-market-quotes.ts`) |
| `computeMarketAverageForWork` | Odczyt AS-IS | **PASS** |
| `controlled_market` (COST-02-A) | Konsument AS-IS | **PASS** |
| OfferBoq provider order | Zakaz reorder / nowych | **PASS** |
| CM-01 CLOSED | Zakaz re-open mapping | **PASS** |
| EPIC DF D-A…D-H | Dziedziczone · bez konfliktu | **PASS** |
| GAP-B / Kp / marża / 1,6M | OUT §10 | **PASS** |

**Wniosek §1:** DF P1 **nie koliduje** z tip · WC · P3.3 · COST-02-A · Freeze AI-COST · EPIC DF.

---

## 2. Zasady projektowe

| Zasada | Ocena | Dowód |
|--------|-------|--------|
| **SSOT FIRST** | **PASS** | Jedyny zapis Quotes = P3.3 → `works[].marketQuotes`; works tylko w WC |
| **REUSE FIRST** | **PASS** | Biblioteka + preview + `commitMarketQuotesImport` + CM probe — zero nowego toru |
| **ZERO DUPLICATE LOGIC** | **PASS** | Zakaz drugiej ścieżki Quotes · scrapera · nowego providera / średniej |
| **MOBILE FIRST** | **PASS** | Brak nowego UI · ops w istniejącej Bibliotece Robót |
| **Payroll Safety Gate** | **PASS** | ALL-NIE · FEATURE-DATA/OPS |
| **#CORE-013 / #CORE-014** | **PASS** | `cloud-sync.ts` bloklista · 0 LOC silnika |

---

## 3. Jedyny tor zasilania Quotes

| Check | Werdykt |
|-------|---------|
| CSV → preview → **`commitMarketQuotesImport`** → WC → `marketQuotes` | **PASS** (D-P1-D) |
| Zakaz omijania commit | **PASS** (MUST NOT) |
| Zakaz scrapera / live API | **PASS** (OUT) |
| Odczyt: average → `controlled_market` → OfferBoq | **PASS** (AS-IS) |

**AS-IS:** `commitMarketQuotesImport` istnieje w tip — kontrakt P3.3 potwierdzony.

---

## 4. Zakres P1-A / P1-B / P1-C

| Grupa | Scope DF | Werdykt |
|-------|----------|---------|
| **P1-A** | Chodniki i nawierzchnie (`DROGI_*`) | **PASS** |
| **P1-B** | Ogrodzenia (`OGRODZENIA_*`) | **PASS** |
| **P1-C** | Elewacje i ocieplenia (`ELEWACJE_*`) | **PASS** |
| Kolejność A→B→C | D-P1-A sztywna | **PASS** |
| Poza scope (P2/P3/INNE seed) | OUT | **PASS** |
| D-P1-F triage fałszywych bucketów | FROZEN | **PASS** |

---

## 5. Cap · Quotes · AI-COST · providerzy

| Check | FROZEN | Werdykt |
|-------|--------|---------|
| Cap **3–12** robót / grupę | D-P1-B | **PASS** |
| **100%** product Quotes przed CLOSE | D-P1-C | **PASS** |
| Brak zmian AI-COST | §10 OUT · EPIC D-B | **PASS** |
| Brak nowych providerów / reorder | §10 · Gate G7 | **PASS** |
| Work = SSOT WC + P3.3 Quotes | §5 DF | **PASS** |

### 5.1 Cap 3–12 vs KPI — uzasadnienie AR (bez zmiany zakresu)

| Pytanie | Ocena AR |
|---------|----------|
| Czy 3–12 wystarczy do K-P1-1 (≤50% unmatched top-3)? | **TAK, z uzasadnieniem empirycznym — bez podnoszenia capu w DF** |

**Uzasadnienie (wiążące dla OPS, nieblokujące APPROVAL):**

1. **Koncentracja bucketów:** P1-A/B/C to łącznie **57 linii** unmatched (~803 k PLN) na **3–5 przetargach** per gap — nie długi ogon tysięcy SKU. Dominują powtarzalne typy (kostka / siatka ogrodzeniowa / ETICS), nie 50 wariantów jednostkowych.
2. **Cel KPI ≠ 100% eliminacji:** K-P1-1 wymaga spadku do **≤ ~400 k** (50%), nie wyzerowania top-3. PLAN szacuje catch **~40–80%** bucketu przy **3–6** dobrze dobranych keywords — mieści się w capie.
3. **Min 3 = gate jakości, max 12 = zawór depth:** Start od 3 złotych robót → pomiar K-P1-C1/C2 → dopychanie do 12 **tylko** gdy coverage pokazuje lukę w buckecie. Zakaz seedowania „na zapas”.
4. **Soft HE (28–30%) nie jest hard:** Reszta HE (INNE ~1,72 M + P2) jest **poza** P1 — cap nie musi „naprawić” całego 34,3%.
5. **Jeśli po max 12/grupę K-P1-1 FAIL:** decyzja OPS = **P1 REQUIRES IMPROVEMENTS** / amend DF (osobny GO) — **nie** ciche przekroczenie capu. To jest świadomy zawór anty-scope-creep, nie obietnica sukcesu przy 3 robotach bez PV.

**Wniosek:** Cap **3–12 pozostaje FROZEN**. AR **nie** wymaga zmiany zakresu. OPS **musi** raportować K-P1-C1/C2 i eskalować w ramach capu przed deklaracją CLOSE.

**IC-P1-1 (nieblokujący):** Przed CLOSE każdej grupy — jeśli K-P1-C2 (HE/unmatched w buckecie) nie spada mimo zbliżenia do 12 robót, **STOP slice** i raport Owner (nie dodawać 13.).

---

## 6. KPI

### 6.1 Hard

| KPI | Target DF | AR |
|-----|-----------|-----|
| **K-P1-1** | Unmatched top-3 ≤50% baseline (~803 k → ≤~400 k) | **PASS** (mierzalny · CM-03 gap) |
| **K-P1-2** | ≥3 nowe / grupę · 100% product Quotes | **PASS** |
| **K-P1-3** | Regresje = 0 | **PASS** |

### 6.2 Soft

| KPI | Target DF | AR |
|-----|-----------|-----|
| **K-P1-S1** | HE avg 18: ~34.3% → ~28–30% | **PASS** jako soft (D-P1-E) — nie hard gate |

### 6.3 Coverage

| KPI | Definicja DF | AR |
|-----|--------------|-----|
| **K-P1-C1** | # linii BOQ z `catalogWorkId` ∈ nowe roboty grupy | **PASS** (obowiązkowy pomiar OPS) |
| **K-P1-C2** | # linii w buckecie grupy nadal HE lub unmatched | **PASS** |

**IC-P1-2 (nieblokujący):** Evidence probe per grupa musi zawierać C1/C2 obok hard KPI — inaczej CLOSE grupy niekompletny.

---

## 7. OUT

| OUT | AR |
|-----|-----|
| AI-COST | **PASS** |
| Providerzy / reorder | **PASS** |
| Heurystyki | **PASS** |
| Bid Calculator | **PASS** |
| Cloud Sync CORE | **PASS** |
| Scraper | **PASS** |
| GAP-B · marża · Kp | **PASS** |

---

## 8. Rollback

| Zakres | L1 | L2 | L3 | AR |
|--------|----|----|----|-----|
| **Per grupa A/B/C** | `active=false` nowych | Rollback Quotes P3.3 + dezaktywacja/usunięcie works | Restore backup sprzed slice | **PASS** |
| **Cały P1** | Dezaktywacja A+B+C | Rollback Quotes nowych · stan P0-only | Restore backup sprzed P1-A | **PASS** |

Backup przed każdym slice — **obowiązkowy** (DF §8).

---

## 9. Boundary / Gate

| Check | Wynik |
|-------|--------|
| FEATURE-DATA / OPS | **PASS** |
| Gate G1–G9 ALL-NIE | **PASS** |
| Preferencja 0 LOC silnika | **PASS** |

**Boundary:** **PASS**.

---

## 10. IMPLEMENT / OPS CONSTRAINTS (wiążące po GO)

| ID | Constraint |
|----|------------|
| **IC-P1-1** | Cap 3–12 bez przekroczenia; eskalacja coverage w ramach capu; FAIL K-P1-1 po 12 → IMPROVEMENTS / amend, nie 13. robota |
| **IC-P1-2** | K-P1-C1/C2 obowiązkowe w evidence CLOSE grupy |
| **IC-P1-3** | Kolejność A→B→C · Quotes 100% przed CLOSE |
| **IC-P1-4** | MUST NOT edit AI-COST / Bid / cloud-sync / CM-01 mapping / heurystyki |
| **IC-P1-5** | D-P1-F: Owner triage złotych opisów — zero fałszywych bucketów |
| **IC-P1-6** | Soft HE nie blokuje CLOSE jeśli hard KPI PASS |

---

## 11. Ryzyko wdrożenia

| Ryzyko | Poziom | Mitigacja |
|--------|--------|-----------|
| Fałszywy match | Śr | D-P1-F · wąskie keywords · PV |
| Cap za mały vs K-P1-1 | Niski–śr | §5.1 · C1/C2 · amend tylko z Owner GO |
| Scope creep | Niski | Cap 12 · CLOSE per grupa |
| Regresja cen | Niski | K-P1-3 · rollback L1 |

**Ryzyko slice P1:** **NISKIE** (dane + REUSE · P0 już udowodnił tor Quotes→CM).

---

## 12. Checklist końcowa

| # | Pytanie | Wynik |
|---|---------|--------|
| 1 | DF ↔ SSOT? | **PASS** |
| 2 | SSOT · REUSE · ZERO DUP · MOBILE · Gate? | **PASS** |
| 3 | Jedyny zapis Quotes = commit P3.3? | **PASS** |
| 4 | Scope A/B/C? | **PASS** |
| 5 | Cap 3–12 · Quotes 100% · zero AI-COST/providerów? | **PASS** (+ §5.1) |
| 6 | Hard · Soft · Coverage KPI? | **PASS** |
| 7 | OUT? | **PASS** |
| 8 | Rollback L1–L3 grupa + cały P1? | **PASS** |

---

## 13. Werdykt

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P1 ARCHITECTURE REVIEW COMPLETE
Werdykt: PASS
Decyzja: APPROVED FOR OWNER GO
════════════════════════════════════════════════════════
```

| | |
|--|--|
| **Decyzja** | **APPROVED FOR OWNER GO** |
| **Nie** | ARCHITECTURE CHANGES REQUIRED |
| **Uwagi** | IC-P1-1…6 nieblokujące — **wiążące przy OPS**; cap 3–12 **uzasadniony i FROZEN** |

**Blokada OPS:** do jawnego **Owner GO** (rekomendacja: **GO OPS P1-A**).

---

**AR STATUS:** **COMPLETE** · **APPROVED FOR OWNER GO**
