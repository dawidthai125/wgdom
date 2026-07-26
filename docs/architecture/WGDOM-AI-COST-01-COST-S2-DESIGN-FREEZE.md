# WGDOM — AI-COST-01 / COST-S2 DESIGN FREEZE (Mapping Engine)

> **ID:** COST-S2  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S1 `2.65.52` / `fd4b112`

```text
One Bundle = One Goal: semantyczne mapowanie OfferBoqLine → Work Catalog (bez wyceny)
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S2)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-mapping.ts` | **NOWY** — Mapping Engine (pure) |
| `src/lib/tender-offer-boq.ts` | pola `workCategory`, `matchedBy`, `candidateMatches` + schema bump |
| `scripts/test-cost-s2-offer-boq-mapping.mjs` | **NOWY** |
| `src/app/changelog-data.ts` | **2.65.53** |
| docs DF/RELEASE · `09` · `CURRENT-TASK` | tip |

**REUSE:** `classifyAthLineCategory` · `foldPolishText` · `extractKatalogHintFromDescription` · `listActiveWorksForRegion` · `TRADE_LABELS_PL` · legacyCategoryId bridge · `OfferBoq` S1.

---

## 2. OUT

- Ceny M/R/S · Kp · marża · bid · eksport  
- Nowe parsery PDF/ATH  
- Nowy katalog robót  
- Duży UI (edycja / kolumny BOQ) — **odłożony** jeśli > thin touch  
- Pricing / Autonomous / Bid Proposal rewrite  

---

## 3. Kontrakt mapowania

```text
1. KNR hint ∈ work.id | keywords | namePl  → exact_knr / catalog_map · HIGH|MEDIUM
2. classifyAthLineCategory → categoryId
3. Score active works (legacyCategory + unit + keywords/name) → primary + candidates[]
4. unmatched → catalogWorkId null · LOW · rationale wyjaśnia
```

**Multi-activity prep:** `candidateMatches: OfferBoqMatchCandidate[]` (role `primary` | `candidate`) — S2 wybiera jedno primary; przyszły split bez przebudowy.

**matchedBy** = produktowy alias metody (`exact_knr` | `catalog_map` | `category_heuristic` | `keyword` | `unmatched` | …).

**workCategory** = `TRADE_LABELS_PL[tradeId]` lub label kategorii legacy gdy brak work.

---

## 4. UI

**Decyzja DF:** podgląd RO w BOQ **ODŁOŻONY** (wymaga load Work Catalog w explorer + nowe kolumny → ryzyko regresji wyceny). Engine + testy = DoD. UI RO → COST-S2.1 / S3 po Owner GO.

---

## 5. AC

1. `mapOfferBoqDocument` ustawia catalogWorkId / workCategory / matchConfidence / matchedBy / aiRationale na każdej linii.  
2. `candidateMatches` obecne (nawet puste / 1 primary).  
3. Zero wyceny / parserów.  
4. build + testy · RR · commit · push · tip `09`.

---

**FROZEN** · IMPLEMENT dozwolony
