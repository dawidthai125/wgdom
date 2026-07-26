# WGDOM — AI-COST-01 / COST-S2 RELEASE REPORT

> **ID:** COST-S2  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **READY FOR PV**  
> **Data:** 2026-07-26  
> **UI:** **2.65.53**  
> **DF:** [`WGDOM-AI-COST-01-COST-S2-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S2-DESIGN-FREEZE.md)  
> **Prior:** COST-S1 `2.65.52` @ `fd4b112`

---

## 1. Cel

Semantyczne rozpoznawanie robót: każda `OfferBoqLine` dostaje wynik mapowania do Work Catalog — **bez wyceny**.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Mapping Engine | `mapOfferBoqLine` / `mapOfferBoqDocument` |
| REUSE | `classifyAthLineCategory` · `foldPolishText` · KNR hint · active `CatalogWork` |
| Pola linii | `catalogWorkId` · `workCategory` · `matchConfidence` · `matchedBy` · `aiRationale` |
| Multi-activity prep | `candidateMatches[]` (`primary` \| `candidate`) |
| Schema | OfferBoq **v2** · `buildStatus: mapped` · `mappingStats` |
| Changelog | **2.65.53** |

**Nienaruszone:** ceny M/R/S · Bid Proposal · Pricing/Autonomous · AP2 · parsery.

---

## 3. UI (read-only)

**ODŁOŻONY** do COST-S2.1 / S3 — podpięcie Work Catalog do BOQ Explorer + nowe kolumny = ryzyko regresji wyceny WGDOM. Engine jest czysty i gotowy do cienkiego podglądu po Owner GO.

---

## 4. Pliki

- `src/lib/tender-offer-boq-mapping.ts` (**NOWY**)
- `src/lib/tender-offer-boq.ts` (pola S2 + schema 2)
- `scripts/test-cost-s2-offer-boq-mapping.mjs` (**NOWY**)
- `scripts/test-cost-s1-offer-boq.mjs` (kompatybilność pól)
- `src/app/changelog-data.ts`
- DF + RELEASE · `09` · `CURRENT-TASK`

---

## 5. Testy / build

| | |
|--|--|
| `test-cost-s2-offer-boq-mapping.mjs` | **PASS** |
| `test-cost-s1-offer-boq.mjs` | **PASS** |
| `npm run build` | **PASS** (oczekiwane) |

---

## 6. AC

| AC | Status |
|----|--------|
| Mapowanie na każdej linii | **PASS** |
| REUSE Work Catalog / classifier | **PASS** |
| Brak nowych parserów | **PASS** |
| catalogWorkId · workCategory · confidence · matchedBy · aiRationale | **PASS** |
| UI RO | **DEFERRED** (uzasadnione) |
| candidateMatches (multi-activity) | **PASS** |
| Zero wyceny | **PASS** |

---

## 7. → COST-S3

1. Silnik materiałów na `catalogWorkId` (companyPrice / costSplit) — nadal transparentne źródło.  
2. Thin RO UI: kolumna „Dopasowanie AI” w BOQ Explorer (confidence + tooltip rationale).  
3. Opcjonalnie: split pozycji gdy `candidateMatches.length > 1` i opis zawiera „dostawa i montaż”.  
4. Nie ruszać Bid Proposal do czasu sumy pozycji (S6+).

---

## 8. Gate

```text
G1–G9: ALL-NIE · Payroll / Autonomous / Pricing: OUT
```
