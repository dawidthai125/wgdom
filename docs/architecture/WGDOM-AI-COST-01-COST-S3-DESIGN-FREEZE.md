# WGDOM — AI-COST-01 / COST-S3 DESIGN FREEZE (AI Cost Intelligence)

> **ID:** COST-S3  
> **Parent:** WGDOM-AI-COST-01  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-27)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** COST-S2 `2.65.53` / `17a7a83`  
> **Język dokumentacji:** polski

```text
One Bundle = One Goal: klasyfikacja + strategia wyceny + inteligentna dekompozycja (bez cen)
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt COST-S3)
```

---

## 1. Cel biznesowy

AI Kosztorysant najpierw rozumie pozycję (co to jest, jak wyceniać, czy rozbić), dopiero potem (S4+) przypisuje ceny. Użytkownik weryfikuje — nie buduje kosztorysu od zera.

---

## 2. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-offer-boq-cost-intelligence.ts` | **NOWY** — silnik Cost Intelligence (pure) |
| `src/lib/tender-offer-boq.ts` | pole `costIntelligence` · schema **v3** · typy współdzielone |
| `scripts/test-cost-s3-cost-intelligence.mjs` | **NOWY** |
| `scripts/test-cost-s1-offer-boq.mjs` / S2 | kompatybilność pól |
| `src/app/changelog-data.ts` | **2.65.54** |
| DF / RELEASE / `09` / `CURRENT-TASK` | tip PL |

**REUSE:** `foldPolishText` · wynik Mapping Engine (`matchedBy`, `candidateMatches`, `workCategory`, `categoryId`, `knrHint`) · jednostki · kategorie legacy.

---

## 3. OUT

- Ceny M/R/S/Kp/marża · Bid Proposal · drugi kalkulator  
- Nowe / zmienione parsery PDF/ATH · AP2 · Pricing/Autonomous  
- Duży UI (panel) — **ODŁOŻONY** jeśli > thin touch  

---

## 4. Kontrakt modelu

```text
OfferBoqCostIntelligence {
  lineKind                  // MaterialInstallation | Equipment | …
  pricingStrategyId         // material_plus_labor | supply_and_install | …
  pricingComponents[]       // plan składowych pod S4 (bez kwot)
  requiresDecomposition
  decompositionElements[]   // tylko gdy ma wartość
  confidence                // high | medium | low
  aiRationale               // PL, dla użytkownika
  plannedEngines[]          // material | labour | equipment | transport | calculator
}
```

### Typy pozycji (lineKind)

MaterialInstallation · Equipment · Measurement · Programming · SupplyInstallation · IndividualAnalysis · CompleteSystem · Demolition · CivilWorks · Unknown

### Strategia wyceny → składowe (bez cen)

| Strategia | Składowe (plan) |
|-----------|-----------------|
| Materiał + montaż | material, labor, auxiliary_material |
| Gotowe urządzenie | purchase, installation, commissioning |
| Pomiary | labor, measurement_equipment |
| Dostawa i montaż | purchase, transport, installation, commissioning, acceptance |
| Analiza indywidualna | (propozycja domenowa — plannedEngines) |
| Komplet / dekompozycja | elementy + per-element components |
| Rozbiórki / ogólnobudowlane | labor (+ material gdy dotyczy) |

### Dekompozycja — reguła wartości

- **TAK:** wymiana instalacji, dostawa+montaż urządzeń złożonych, komplety systemowe  
- **NIE:** malowanie ścian, pojedyncza oprawa LED, prosta robota katalogowa o wysokim match  

Sygnały: opis + mapa kandydatów S2 + kategoria + jm — **nie** wyłącznie jeden regex.

---

## 5. UI

Panel „AI Cost Intelligence” **ODŁOŻONY** (jak S2 RO) — ryzyko regresji BOQ. Engine + testy = DoD. Thin panel → S3.1 po Owner GO.

---

## 6. AC

1. Każda linia po `analyzeOfferBoqCostIntelligence` ma `costIntelligence`.  
2. Typ + strategia + decyzja dekompozycji + rationale + confidence.  
3. Dekompozycja tylko gdy `requiresDecomposition === true`.  
4. Zero cen. Zero nowych parserów.  
5. Prep `plannedEngines` pod S4.  
6. Testy · build · RR PL · commit · push · tip `09`.

---

**FROZEN** · IMPLEMENT dozwolony
