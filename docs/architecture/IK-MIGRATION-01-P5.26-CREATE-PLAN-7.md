# IK-MIGRATION-01 — P5.26 CREATE PLAN 7

> **Status:** READY_FOR_OWNER_GO · **PROPOSALS ONLY**  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p526-create-plan-7.json`  
> **CREATE EXECUTED = 0**

Nie wykonuj CREATE / BIND / ACCEPT bez osobnego Owner GO `P5.26-CREATE-7`.

## Proposed hosts (7)

| Group | UI name | proposedWorkId | Domain | Unit | Labor | Material | Margin |
|-------|---------|----------------|--------|------|------:|---------:|-------:|
| G121 | Układanie paneli podłogowych | `cc-p0c-w1-ukladanie-paneli-m2` | PACKAGE | m2 | 43.83 | — | 0 |
| G093 | Izolacja rurociągów otuliną Ø20 | `cc-p0c-w1-otulina-fi20-mb` | PACKAGE | mb | — | 8.56 | 0 |
| G091 | Montaż rurociągów PCW Ø50 | `cc-p0c-w1-pcw-fi50-mb` | PACKAGE | mb | 80 | — | 0 |
| G120 | Posadzki z płytek | `cc-p0c-w1-posadzki-plytki-m2` | PACKAGE | m2 | 110 | — | 0 |
| G128 | Warstwy wyrównawcze pod posadzki | `cc-p0c-w1-warstwy-wyrownawcze-m2` | PACKAGE | m2 | 45 | — | 0 |
| G063 | Dopasowanie skrzydeł drzwiowych | `cc-p0c-w1-dopasowanie-skrzydel-szt` | LABOR | szt | 92 | — | 0 |
| G007 | Skraplacz kondensatu do kotła gazowego | `cc-p0c-w1-skraplacz-kondensatu-szt` | MATERIAL | szt | — | 70.6 | 0 |

## Rules

- PACKAGE store domain = `LABOR_MATERIAL_PACKAGE` przy CREATE (jak P5.26-C), jeśli Owner GO tak zdecyduje.
- PARTIAL rates: labor XOR material — nie inventuj brakującej składowej.
- Duplicate check: proposed workId **nie** istnieje w katalogu (zweryfikowane w audycie).
- Catalog musi pozostać **464** do czasu Owner GO CREATE.

## STOP

```text
CREATE = 0 · BIND = 0 · ACCEPT = 0 · WRITE = 0
Next = Owner GO P5.26-CREATE-7
```
