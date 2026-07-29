# CENY-MATERIAŁÓW-04 P0 — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P0-OPS-COMPLETE  
> **Data:** 2026-07-29  
> **MODE:** OPS IMPLEMENTATION · Owner GO **APPROVED**  
> **Klasa:** FEATURE-DATA / OPS · **bez** zmian AI-COST / providerów / heurystyk / Bid / Cloud Sync CORE  
> **Pipeline:** CSV → `previewMarketCsvImport` → **`commitMarketQuotesImport`** → `kw-wgdom-work-catalog` → cloud  
> **Evidence:** `.tmp/ceny-materialow-04-p0-*.json` · `.tmp/ceny-materialow-04-p0-quotes.csv`  
> **Baseline tip:** UI **2.65.80** (`c2d504d`)  
> **Commit kodu FEATURE / push repo:** **NIE** (czysty OPS danych)

```text
════════════════════════════════════════════════════════
CENY-MATERIAŁÓW-04 P0 OPS COMPLETE
Decyzja: READY FOR P1
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR P1** |
| **Nie** | P0 REQUIRES IMPROVEMENTS |
| **KPI** | K-P0-1 · K-P0-2 · K-P0-3 — **PASS** |

---

## 2. Co wykonano

| Krok | Wynik |
|------|--------|
| Backup katalogu (pre) | `.tmp/ceny-materialow-04-p0-catalog-backup.json` |
| CSV Quotes (wgdom · 34 wiersze) | `.tmp/ceny-materialow-04-p0-quotes.csv` |
| Preview match | **34/34** (100%) · 0 unmatched / rejected |
| `commitMarketQuotesImport` | **committed** · `worksTouched=34` · `cellsAdded=34` |
| Persist cloud (`batch-set`) | **OK** · verify **34/34** product Quotes |
| Walidacja 18 przetargów (CM-02 sample) | `.tmp/ceny-materialow-04-p0-validation.json` |

**Źródło ceny OPS:** origin produktowy **`wgdom`**, cena = `companyPricePln` z SSOT katalogu (brak zewnętrznego CSV Sekocenbud/KB w tym slice — DF dopuszcza `wgdom` jako product). `companyPricePln` **nie** było zmieniane.

**REUSE:** wyłącznie P3.3 preview + commit · zero nowych providerów · zero scraperów · zero nowych tabel.

---

## 3. Pokrycie Quotes (katalog)

| Metryka | Przed P0 | Po P0 |
|---------|----------|-------|
| Aktywne roboty | 34 | 34 |
| Roboty z **product** Quotes | **0** | **34** |
| Odsetek product Quotes | **0%** | **100%** (≥80% KPI) |
| `computeMarketAverage` OK | 0 | **34** |
| Zaimportowane Quotes (komórki) | — | **34** (`wgdom` × `wroclaw`) |
| Braki Quotes na 34 | 34 | **0** |

**K-P0-1:** **PASS** (100% ≥ 80%).

---

## 4. Walidacja 18 przetargów (ta sama próba CM-02)

| Share materiałów (średnia 18, CM-01 **ON**) | CM-02 przed (ON) | P0 po (ON) | Δ |
|---------------------------------------------|------------------|------------|---|
| **controlled_market** | **0%** | **65.7%** | **+65.7 pp** |
| **work_catalog** | ~65.7%\* | **0%** | **−65.7 pp** |
| **heuristic_estimate** | ~34.3%\* | **34.3%** | **0 pp** |
| **category_rate** | 0% | 0% | 0 |

\*Przed P0: CM=0, więc trafienia katalogowe szły w `work_catalog`. Po P0 ta sama masa PLN przechodzi na `controlled_market` (kolejność providerów AS-IS) — ceny z Quotes = `companyPricePln`, więc **direct PLN bez krytycznych regresji**.

| KPI | Wynik |
|-----|--------|
| **K-P0-2** CM > 0% | **PASS** (65.7%; soft ≥10% też PASS) |
| **K-P0-3** regresje direct Δ% &lt; −5% | **PASS** (0) |

### OFF vs ON (po P0)

| Share (avg 18) | OFF | ON |
|----------------|-----|-----|
| controlled_market | 64.2% | 65.7% |
| work_catalog | 0% | 0% |
| heuristic_estimate | 35.8% | 34.3% |

CM działa niezależnie od flagi CM-01 (Quotes w katalogu); ON nadal lekko pomaga mappingowi (~+1.5 pp CM / −1.5 pp HE) — spójne z CM-02.

### Quotes coverage na liniach z `catalogWorkId`

Średnio **withQuotes ≈ 13.4** matched works / sprawę (wcześniej **0**).

---

## 5. Braki / uwagi (nieblokujące P0)

| Brak | Status |
|------|--------|
| Roboty bez product Quotes | **0** |
| Unmatched / HE ~34% | Oczekiwane — luka coverage WC (chodniki / ogrodzenia / elewacje / INNE) → **P1–P3** |
| Zewnętrzny cennik Sekocenbud/KB | Nie użyty w P0 — OPS na `wgdom`+`companyPricePln`; P1+ może podmienić originami zewnętrznymi bez zmiany toru |
| Pierwszy `batch-set` | Nie utrzymał payloadu (obiekt store); **retry** z `JSON.parse(JSON.stringify)` — **PASS** |

**OUT honorowane:** brak zmian AI-COST · providerów · heurystyk · Bid · `cloud-sync.ts` · costModel · scraperów · auto-seed.

---

## 6. Rollback (jeśli potrzeba)

| Poziom | Akcja |
|--------|--------|
| L1 | P3.3 rollback Quotes / restore z `.tmp/ceny-materialow-04-p0-catalog-backup.json` → `batch-set` |
| L2 | Jak L1 |
| L3 | Tip parity: puste Quotes = stan CM-02 (CM znów 0%) |

---

## 7. Następny krok

```text
Owner GO P1 (chodniki → ogrodzenia → elewacje)
  · nowe roboty + product Quotes w tym samym slice (D-F)
  · bez startu CLOSE bez P0 PASS — spełnione
```

---

**P0 STATUS:** **COMPLETE** · **READY FOR P1**
