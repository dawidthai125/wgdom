# IK-MIGRATION-01 — P5.26 FINAL OWNER QUEUE

> **Status:** `READY`  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p526-final-owner-queue.json`  
> **Closeout:** `IK-MIGRATION-01-P5.26-FINAL-CLOSEOUT.md`

RECORD-ONLY · Accept Execution = **NOT EXECUTED** · HTTP = 0 · Write = 0

Owner Action column: wypełnia Owner (`ACCEPT` / `REVIEW` / `REJECT` / `RESEARCH_LATER`).  
Agent **nie** wpisuje automatycznie ACCEPT.

---

## Reconciliation

| Check | Result |
|-------|--------|
| TOTAL | **18** |
| CANDIDATE | **12** |
| REVIEW_REQUIRED | **6** |
| RESEARCH_GAP | **0** |
| CHATGPT_REVIEW_REQUIRED | **0** |
| duplicates / missing / orphan | **0 / 0 / 0** |
| G007 | CANDIDATE 70.60 PLN/szt · READY_FOR_OWNER_ACCEPT |

---

## Owner Queue — 18 pozycji

| GROUP | DESCRIPTION | DOMAIN | UNIT | LABOR | MATERIAL | R+M | SOURCE | CONF | STATUS | OWNER ACTION |
|-------|-------------|--------|------|-------|----------|-----|--------|------|--------|--------------|
| G121 | Posadzki z paneli podłogowych | PACKAGE | m² | **43.83**/m² | — | — | Murator | MED_HIGH | CANDIDATE · READY_FOR_ACCEPT | _pending_ |
| G093 | Otulina Thermaflex Ø20 | PACKAGE | mb | — | **8.56**/mb netto | — | hurt.aka + Owner Ø20 | MED | CANDIDATE_PARTIAL | _pending_ |
| G082 | Wykucie otworów działowa 1/2 ceg | LABOR | m² | **425**/m² (350–500) | — | — | kb.pl | MED | CANDIDATE_REVIEW | _pending_ |
| G091 | Montaż PCW Ø50 | PACKAGE | mb | **80**/mb (60–100) | — | — | oferteo · Owner Ø50 | MED | CANDIDATE_PARTIAL | _pending_ |
| G075 | Rozebranie ścianek prefab lekkie | LABOR | m² | **150**/m² (120–180) | — | — | kb.pl | **LOW** | CANDIDATE_REVIEW_LOW | _pending_ |
| G078 | Rozebranie ścianki 1/2 ceg | LABOR | m² | **150**/m² (120–180) | — | — | kb.pl | MED | CANDIDATE_REVIEW | _pending_ |
| G052 | Wykucie ościeżnic drewnianych | LABOR | szt | **180**/szt (140–220) | — | — | kb.pl demontaż | MED | CANDIDATE | _pending_ |
| G084 | Wykucie podokienników | LABOR | mb | **90**/mb (70–110) | — | — | sccot | **LOW** | CANDIDATE | _pending_ |
| G120 | Posadzki płytkowe kamień szt. 20×20 | PACKAGE | m² | **110**/m² (70–150) | — | — | cenniki płytek · ≠G121 | MED | CANDIDATE | _pending_ |
| G128 | Warstwy wyrównawcze cementowe | PACKAGE | m² | **45**/m² (35–55) | — | — | kb.pl · ≠G121 | MED | CANDIDATE | _pending_ |
| G063 | Dopasowanie skrzydeł drzwiowych | LABOR | szt | **92**/szt (70–120) | — | — | cenauslug · ≠300 mat | MED | CANDIDATE | _pending_ |
| G007 | Skraplacz pary (kondensat kocioł) | MATERIAL | szt | — | **70.60**/szt | — | EXTERNAL + CHATGPT (KP) | MED | CANDIDATE · READY_FOR_OWNER_ACCEPT | _pending_ |
| G004 | Skrzydła drzwiowe … ≤1.6 m² | MATERIAL | m² | — | **300**/szt | — | OWNER_KNOWLEDGE | HIGH | REVIEW_REQUIRED | _pending_ |
| G008 | Skrzydła drzwiowe … ≤1.6 m² | MATERIAL | m² | — | **300**/szt | — | OWNER_KNOWLEDGE | HIGH | REVIEW_REQUIRED | _pending_ |
| G009 | Skrzydła drzwiowe wejściowe ≤2.0 m² | MATERIAL | m² | — | **300**/szt | — | OWNER_KNOWLEDGE | HIGH | REVIEW_REQUIRED | _pending_ |
| G083 | Wykucie kratek wentylacyjnych/drzwiczek | LABOR | szt | — (source m² only) | — | — | kb.pl conflict | LOW | REVIEW_REQUIRED | _pending_ |
| G165 | Montaż PCW Ø110 | PACKAGE | mb | — | — | — | Owner Ø50/Ø100 only | LOW | REVIEW_REQUIRED | _pending_ |
| G064 | Dopasowanie skrzydeł okiennych | LABOR | szt | **52**/szt (30–75) | — | — | regulacja evidence · identity risk | LOW | REVIEW_REQUIRED | _pending_ |

---

## Uwagi

1. **R+M** = puste dla wszystkich — PACKAGE bez kompletu labor+materiał lub conflict jednostek.  
2. **G004/G008/G009** — nie przeliczać szt→m².  
3. **G083** — nie przypisywać 1000–1300 PLN/m² do szt.  
4. **G165** — nie zamieniać Ø110→Ø100.  
5. **G120/G128** ≠ G121.  
6. **G063** ≠ materiał skrzydła 300 PLN.  
7. **G007** — CANDIDATE 70.60; **nie** Accept Execution w tym kroku.  
8. Owner Action = `_pending_` we wszystkich wierszach — zbiera Owner zbiorczo.

---

## STOP

```text
P5.26 FINAL OWNER QUEUE — READY
Accept / P5.27 / P6 / CREATE / BIND / research = NIE
```
