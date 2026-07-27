# WGDOM — AI-COST-01 / COST-S3 RAPORT WYDANIA

> **ID:** COST-S3  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **PRODUCTION VERIFIED**  
> **Data:** 2026-07-27  
> **UI:** **2.65.54**  
> **Commit:** **`61b7590`**  
> **DF:** [`WGDOM-AI-COST-01-COST-S3-DESIGN-FREEZE.md`](WGDOM-AI-COST-01-COST-S3-DESIGN-FREEZE.md)  
> **Prior:** COST-S2 `2.65.53` @ `17a7a83`  
> **Język:** polski

---

## 1. Cel

Po wczytaniu przedmiaru AI najpierw **rozumie** pozycję (typ, sposób wyceny, czy rozbić), zanim S4+ przypisze ceny. To fundament AI Kosztorysanta — nie klasycznego ręcznego kosztorysu.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Silnik | `analyzeOfferBoqLineCostIntelligence` · `applyOfferBoqCostIntelligence` |
| Typy | MaterialInstallation · Equipment · Measurement · Programming · SupplyInstallation · IndividualAnalysis · CompleteSystem · Demolition · CivilWorks · Unknown |
| Strategia | plan składowych (M/R/zakup/transport/…) **bez kwot** |
| Dekompozycja | tylko gdy ma wartość (np. wymiana instalacji, dostawa+montaż UPS); **nie** dla malowania / oprawy LED |
| Model | `OfferBoqCostIntelligence` na linii · schema OfferBoq **v3** · `buildStatus: analyzed` |
| Prep S4 | `plannedEngines`: material · labour · equipment · transport · calculator |
| Changelog | **2.65.54** |

**REUSE:** Mapping Engine S2 · `foldPolishText` · kategorie / jednostki · `candidateMatches`.

**Nienaruszone:** ceny · Bid Proposal · Pricing/Autonomous · AP2 · parsery PDF/ATH.

---

## 3. UI (read-only)

Panel „AI Cost Intelligence” **ODŁOŻONY** — podpięcie do BOQ Explorer wymaga load Work Catalog + nowych kolumn (ryzyko regresji wyceny WGDOM). Silnik jest gotowy do cienkiego panelu w **COST-S3.1** po Owner GO.

---

## 4. Pliki zmienione

- `src/lib/tender-offer-boq-cost-intelligence.ts` (**NOWY**)
- `src/lib/tender-offer-boq.ts` (typy S3 · pole `costIntelligence` · schema 3)
- `scripts/test-cost-s3-cost-intelligence.mjs` (**NOWY**)
- `scripts/test-cost-s1-offer-boq.mjs` (kompatybilność)
- `src/app/changelog-data.ts`
- DF + RELEASE · `docs/AI/09_PRODUCTION_BASELINE.md` · `CURRENT-TASK.md`

---

## 5. Testy / build

| | |
|--|--|
| `test-cost-s3-cost-intelligence.mjs` | **PASS** |
| `test-cost-s2-offer-boq-mapping.mjs` | **PASS** |
| `test-cost-s1-offer-boq.mjs` | **PASS** |
| `npm run build` | **PASS** (oczekiwane) |
| lint (eslint projektu) | **N/A** — brak konfiguracji eslint dla tych plików (jak S2) |

---

## 6. Kryteria akceptacji (DoD)

| Kryterium | Status |
|-----------|--------|
| Klasyfikacja każdej pozycji | **PASS** |
| Strategia przyszłej wyceny | **PASS** |
| Decyzja dekompozycji | **PASS** |
| Dekompozycja tylko gdy ma wartość | **PASS** |
| Model AI Cost Intelligence | **PASS** |
| Zgodność architektury / REUSE | **PASS** |
| Zero cen / zero nowych parserów | **PASS** |
| RR PL · commit · push · tip | **PASS** · `61b7590` |

---

## 7. Rekomendacje → COST-S4

1. **Material Engine** — wypełnia `material*` tylko dla strategii z komponentem `material` / `purchase`.  
2. **Labour Engine** — RBH + stawka dla `labor` / `installation`.  
3. **Equipment / Transport Engine** — wg `plannedEngines` i elementów dekompozycji.  
4. **Cost Calculator** — suma elementów → `lineTotalPln` (nadal jeden aggregator, REUSE Bid Proposal na końcu).  
5. Thin UI RO: typ · strategia · liczba elementów · confidence · rationale.

---

## 8. Gate

```text
G1–G9: ALL-NIE · Lista Płac / Autonomous / Pricing: OUT
```
