# IK-MIGRATION-01 — P5.26 MANUAL RESEARCH CLOSEOUT

> **Status:** COMPLETE · 2026-08-15
> **ACCEPT / WRITE / CatalogWork / Bind / CODE / COMMIT / PUSH = 0**

## Reconciliation (start)

- P5.26-F: 128 GAP (automated) — not re-run blindly
- P5.32: 13 PARSER_EMPTY/CKM — identity/query RCA applied
- Focus queue: **18 groups** with Owner interpretation + costorys evidence
- RCD: not in F queue (Owner 300 PLN/szt reserved)

## Totals

| Metric | Value |
|---|---:|
| TOTAL GROUPS | 18 |
| RESOLVED | 0 |
| CANDIDATES | 6 |
| REVIEW_REQUIRED | 5 |
| RESEARCH_GAP | 7 |
| Invented | 0 |
| Auto-Accept | 0 |
| Writes | 0 |

## By domain (status counts)

```json
{
  "LABOR": {
    "CANDIDATE": 3,
    "RESEARCH_GAP": 4,
    "REVIEW_REQUIRED": 1
  },
  "PACKAGE": {
    "CANDIDATE": 3,
    "REVIEW_REQUIRED": 1,
    "RESEARCH_GAP": 2
  },
  "MATERIAL": {
    "REVIEW_REQUIRED": 3,
    "RESEARCH_GAP": 1
  }
}
```

## Owner Knowledge used

- door_leaf_300_pln_szt
- pcw_diameters_50_and_100_only
- otulina_od20
- skraplacz_kondensat_kociol
- wykucie_otworow_drzwi_70_100

## Candidates (short)

- **G093** LABOR_MATERIAL_PACKAGE · labor=— · mat=8.56 · MEDIUM
- **G082** LABOR · labor=425 · mat=— · MEDIUM
- **G091** LABOR_MATERIAL_PACKAGE · labor=80 · mat=— · MEDIUM
- **G121** LABOR_MATERIAL_PACKAGE · labor=43.83 · mat=— · MEDIUM
- **G075** LABOR · labor=150 · mat=— · LOW
- **G078** LABOR · labor=150 · mat=— · MEDIUM

## REVIEW_REQUIRED

- **G004** — BOQ rozlicza m2 — potrzeba Owner decyzji przeliczenia lub zmiany jednostki
- **G008** — unit m2 vs szt
- **G009** — unit m2 vs szt
- **G083** — unit szt vs m2
- **G165** — Diameter policy vs BOQ 110

## RESEARCH_GAP

- **G007** — Skraplacz pary
- **G052** — Wykucie z muru ościeżnic drewnianych o powierzchni do 2 m2
- **G084** — Wykucie z muru podokienników drewnianych, stalowych
- **G120** — Posadzki płytkowe z kamieni sztucznych; płytki 20x20…
- **G128** — Warstwy wyrównawcze pod posadzki z zaprawy cementowej…
- **G063** — Dopasowanie skrzydeł drzwiowych…
- **G064** — Dopasowanie skrzydeł okiennych…

## Hard locks honored

- G112 / G141/G143 / G177 / emulsja≠wapno≠olej / grzejnik≠głowica / wykucie≠zaprawianie
- LABOR/PACKAGE ≠ Leroy/Castorama/OBI
- Door leaf 300/szt not replaced by shop scrape

**STOP.** Czekaj na Owner Review (Accept osobno).
