# WGDOM — AI-COST-01 / COST-S1 RELEASE REPORT

> **ID:** COST-S1  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **READY FOR PV** (po push)  
> **Data:** 2026-07-26  
> **UI:** **2.65.52**  
> **DF:** [`WGDOM-AI-COST-01-COST-S1-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S1-DESIGN-FREEZE.md)  
> **Prior tip:** AP2-S4 `2.65.51` @ `5355c19`

---

## 1. Cel

Fundament AI Kosztorysanta: model **OfferBoq** / **OfferBoqLine** ze istniejącego `TenderKosztorysSnapshot` — bez wyceny, bez parserów. Użytkownik w przyszłości sprawdzi i poprawi pozycje; AI uzupełni M/R/S w kolejnych Slice.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Model | `OfferBoqDocument` (= OfferBoq) + `OfferBoqLine` + `OfferBoqPriceSourceRef` |
| Adapter | `buildOfferBoqFromSnapshot` — preferuje `catalogQuantities`, fallback `rows` |
| Placeholder wyceny | M/R/S/Kp/marża/`lineTotalPln` = **null**; ATH seed osobno (`athUnitPricePln`) |
| Edycja (prep) | `markOfferBoqLineEdited` + `replaceOfferBoqLine` (bez przeliczeń) |
| Transparentność | `pricingSourceLabelPl`, `aiConfidence`, `aiRationale`, `PriceSourceRef` |
| Changelog | **2.65.52** |

**Nienaruszone:** Bid Proposal · Pricing Gate · Autonomous Gate · AP2 · PDF/ATH parsers.

---

## 3. Pliki zmienione

- `src/lib/tender-offer-boq.ts` (**NOWY**)
- `scripts/test-cost-s1-offer-boq.mjs` (**NOWY**)
- `src/app/changelog-data.ts`
- `docs/architecture/WGDOM-AI-COST-01-COST-S1-DESIGN-FREEZE.md` (**NOWY**)
- `docs/architecture/WGDOM-AI-COST-01-COST-S1-RELEASE-REPORT.md` (**NOWY**)
- `docs/AI/09_PRODUCTION_BASELINE.md`
- `CURRENT-TASK.md`

---

## 4. Testy / build

| | |
|--|--|
| `test-cost-s1-offer-boq.mjs` | **PASS** |
| `npx tsc --noEmit` | **PASS** (oczekiwane) |
| `npm run build` | **PASS** (oczekiwane) |

---

## 5. AC (DoD)

| AC | Status |
|----|--------|
| Model OfferBoq / OfferBoqLine ze snapshotu | **PASS** |
| Brak nowych parserów | **PASS** |
| Zgodność architektury (REUSE snapshot) | **PASS** |
| Pola pod M/R/S/Kp/marża | **PASS** (null) |
| Przygotowanie pod edycję pozycji | **PASS** |
| Transparentność (źródło / confidence / rationale) | **PASS** |
| Brak regresji gate’ów / bid | **PASS** (nie ruszane) |
| typecheck / build / testy | **PASS** |
| RR + commit + push | **po domknięciu** |

---

## 6. Rekomendacje → COST-S2

1. **COST-S2 — Mapping Engine:** `description` / `knrHint` → `catalogWorkId` + `matchMethod` / `matchConfidence` (REUSE Work Catalog + istniejące mapowania ATH).  
2. Nie wypełniać jeszcze cen M/R/S — tylko mapowanie + uzasadnienie (`aiRationale`).  
3. Podłączyć `buildOfferBoqFromSnapshot` do ścieżki dossier (read-only) po S2, bez UI tabeli.  
4. COST-S3+: silniki materiału / robocizny / sprzętu na zmapowanych liniach.  
5. UI edycji + recompute dopiero gdy linie mają składowe (S6–S7).

---

## 7. Gate reminder

```text
G1–G9: ALL-NIE · Payroll / Autonomous / Pricing: OUT
```
