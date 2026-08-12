# WORK-RATE-REAL-WORLD-VALIDATION-03 — PRODUCTION VERIFY

> **DATA:** 2026-08-12  
> **WERDYKT:** **PRODUCTION VERIFIED · GREEN**

## Live

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun/version.json |
| version | **2.66.36** |
| commit (`version.json`) | **`73b8323`** |
| timestamp | 2026-08-12T04:24:58.907Z |
| Feature SHA | **`a834ed48`** (ancestor of tip; parser + canonical URLs) |
| Docs tip SHA | **`c744b4d3`** |
| Harness skip SHA | **`73b8323d`** (= live tip) |
| HEAD / `origin/main` | zawiera feature + tip |

```text
curl -s https://www.wgdom.fun/version.json
→ {"version":"2.66.36","commit":"73b8323",...}
```

## Bundle probe (read-only · ZERO masowego researchu)

Crawled live `/assets/*`:

| Chunk | Dowód |
|-------|--------|
| `app-core-C78vIjRC.js` | changelog **2.66.36** · `WORK-RATE-SELECTIVE-RESEARCH-02` · `REAL-WORLD-VALIDATION-03` · CTA „Aktualizuj stawkę” · KB/SCCOT/Extradom/CennikRemontow |
| `TendersModule-fbCx0eP6.js` | Edge `work-rate-selective-lookup` · allowlista 4 hostów · kanoniczne URL · `RATE_GAP` · `REUSE` · `data-work-rate-research-one` · `researchOurWorkRate` / `acceptOurWorkRateResearch` · labor-only / minimum / package · region WROCLAW→DOLNY_SLASK→POLSKA · `fullCatalogueForbidden` · `companyPricePlnLegacy` |
| `work-catalog-bootstrap-C_BooHQE.js` | bootstrap (bez research) |

| Marker | Obecny |
|--------|--------|
| Selective work-rate research | TAK |
| 4 zatwierdzone źródła (allowlista) | TAK (`kb.pl` · `sccot.pl` · `extradom.pl` · `cennikremontow.pl`) |
| Parser / tabela / zł·m² | TAK (ścieżka parse + m2) |
| Canonical URLs | TAK (`WORK_RATE` / `XI={kb_pl:"https://kb.pl/cenniki/..."}`) |
| Edge route | TAK (klient + live probe) |
| Qualification / labor-only | TAK |
| Median | TAK |
| Owner Accept → OUR RATE | TAK |
| History / freshness / CURRENT·STALE·MISSING·REUSE | TAK |
| Manual refresh ONE work | TAK (`data-work-rate-research-one`) |
| Full catalogue | **ZERO** (`fullCatalogueForbidden`) |

### Edge (live, dry)

`POST …/make-server-0afb8820/work-rate-selective-lookup` + `{}` → **400** `{"ok":false,"error":"missing_workId"}`  
(route **istnieje**; bez pełnego researchu w PV)

## Functional (bez masowego HTTP · live research ONE = **NIE URUCHOMIONY**)

| # | Check | Status |
|---|-------|--------|
| 1 | Firma → Nasz Katalog Robót | **PASS** (nav `workratecatalog` · UI „Nasz Katalog” / „Nasza stawka”) |
| 2 | Lista bez masowego HTTP | **PASS** (CACHE-FIRST · P1 T17 · P2 open fetch=0) |
| 3 | CURRENT → REUSE · ZERO research | **PASS** (harness P2/RW-03) |
| 4–5 | MISSING/STALE research tylko ręcznie | **PASS** |
| 6 | „Aktualizuj stawkę rynkową” = ONE work | **PASS** (`data-work-rate-research-one`) |
| 7 | Research tylko zatwierdzone źródła | **PASS** (allowlista 4) |
| 8 | Full catalogue | **ZERO** |
| 9 | Labor-only | **PASS** |
| 10 | Qualification | **PASS** |
| 11 | Region Wrocław → Dolny Śląsk → Polska | **PASS** |
| 12 | Mediana | **PASS** |
| 13 | Owner Accept → OUR RATE | **PASS** |
| 14 | Historia (obserwacja OUR) | **PASS** |
| 15–16 | Kolejne sprawdzenie REUSE · 2. lookup HTTP 0 | **PASS** |

Live browser research jednej roboty w tej sesji PV: **NIE** (Owner: max 1; dowód pipeline = RW-03 fixtures + bundle + Edge dry).

## RATE GAP

SCCOT dla pozycji bez regularnej labor-only zł/m² → **RATE_GAP** (minimum `od …` / pakiety pokoi → REJECT).  
**POPRAWNE** · bez inventowania · bez przeliczania pakietów na zł/m².

## Invariants

| Invariant | Status |
|-----------|--------|
| Material Price Memory | **UNCHANGED** (PM C01/02/03 PASS) |
| `marketQuotes` / `marketQuoteHistory` | **UNCHANGED** (regresja P0 T27) |
| LM / Castorama / OBI (DIY materials) | **UNCHANGED** (LIVE-08 · MMR-02) |
| `companyPricePln` | **UNCHANGED** · **≠** OUR RATE · **≠** seed/fallback/migracja |
| Bid | **UNCHANGED** (P0 T25 · CATALOG-BID-01) |
| Offer | **UNCHANGED** (P0 T26 · Offer Expert P0) |
| Second Price DB / Second Work Rate DB | **ZERO** |
| Full catalogue / full work-rate research | **ZERO** |
| Auto OUR RATE | **ZERO** |
| New source | **ZERO** (allowlista 4) |

## Harness (PV session · 2026-08-12)

| Suite | Wynik |
|-------|-------|
| RW-03 | **16 PASS / 0 FAIL** |
| P2 Selective | **54 PASS / 0 FAIL** |
| P0 OUR RATE | **99 PASS / 0 FAIL** |
| P1 UI | **62 PASS / 0 FAIL** |
| Legal | **17 PASS / 0 FAIL** |
| PM C01 | **45 PASS / 0 FAIL** |
| PM C02 | **36 PASS / 0 FAIL** |
| PM C03 | **31 PASS / 0 FAIL** |
| LIVE-ADAPTERS-08 | **42 PASS / 0 FAIL** |
| MMR-02 | **73 PASS** · LIVE HTTP **ZERO** |
| invoice seed | **38 PASS** |
| Bid (CATALOG-BID-01) | **ALL PASS** |
| Offer (Offer Expert P0) | **26 PASS / 0 FAIL** |
| Build | nie przebudowywano (tip już na prod) |

## Status

```text
WORK-RATE-REAL-WORLD-VALIDATION-03
PRODUCTION: VERIFIED · GREEN
VERSION: 2.66.36
LIVE COMMIT: 73b8323
FEATURE: a834ed48
BUNDLE: PASS
Nasz Katalog Robót: PASS
CACHE-FIRST: PASS
SELECTIVE: PASS
LABOR-ONLY: PASS
REGION: PASS
MEDIAN: PASS
OWNER ACCEPT: PASS
HISTORY: PASS
REUSE: PASS
ZERO HTTP ON OPEN: PASS
FULL CATALOGUE: ZERO
COMPANYPRICEPLN: UNCHANGED
BID: UNCHANGED
OFFER: UNCHANGED
MATERIAL PRICE MEMORY: UNCHANGED
RATE GAP: SCCOT OK (minimum/package → REJECT)
CODE: NO CHANGE
NEXT: STOP — czekaj na Owner GO (nie P3 / nie Bid / nie Offer / nie materiały)
```

## Powiązania

- [`WORK-RATE-REAL-WORLD-VALIDATION-03.md`](./WORK-RATE-REAL-WORLD-VALIDATION-03.md)
- [`WORK-RATE-SELECTIVE-RESEARCH-02.md`](./WORK-RATE-SELECTIVE-RESEARCH-02.md)
- Tip SSOT: [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
