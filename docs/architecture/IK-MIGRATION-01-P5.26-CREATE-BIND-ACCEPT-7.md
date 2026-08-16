# IK-MIGRATION-01 — P5.26 CREATE → BIND → ACCEPT 7

> **Status:** COMPLETE  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p526-create-bind-accept-7.json`

## Catalog

| | |
|--|--:|
| Baseline (pre-orphan) | **464** |
| BEFORE this run | **465** (G007 host already present from prior failed tradeId attempt) |
| AFTER | **471** |
| Net new this run | **+6** |
| Hosts for 7 groups | **7/7** (6 CREATE + 1 USE_EXISTING G007) |

## Summary

| Metric | Value |
|--------|-------|
| CREATED (new rows) | **6/7** |
| USE_EXISTING | **1** (G007 — no duplicate) |
| BIND | **7/7** |
| ACCEPT | **7/7** |
| VERIFY | **7/7** |
| WRITE | **8** |
| Research / matcher / commit / push | **0** |

## Created / reused hosts

| Group | workId | Domain | Unit | BASE | Note |
|-------|--------|--------|------|-----:|------|
| G121 | `cc-p0c-w1-ukladanie-paneli-m2` | PACKAGE | m2 | 43.83 | CREATE |
| G093 | `cc-p0c-w1-otulina-fi20-mb` | PACKAGE | mb | 8.56 | CREATE |
| G091 | `cc-p0c-w1-pcw-fi50-mb` | PACKAGE | mb | 80 | CREATE |
| G120 | `cc-p0c-w1-posadzki-plytki-m2` | PACKAGE | m2 | 110 | CREATE |
| G128 | `cc-p0c-w1-warstwy-wyrownawcze-m2` | PACKAGE | m2 | 45 | CREATE |
| G063 | `cc-p0c-w1-dopasowanie-skrzydel-szt` | LABOR | szt | 92 | CREATE |
| G007 | `cc-p0c-w1-skraplacz-kondensatu-szt` | MATERIAL | szt | 70.60 | USE_EXISTING |

## Accept / Verify

| Group | PRE-ACCEPT | ACCEPT | VERIFY | Rate |
|-------|------------|--------|--------|-----:|
| G121 | PASS | EXECUTED | PASS | 43.83 |
| G093 | PASS | EXECUTED | PASS | 8.56 |
| G091 | PASS | EXECUTED | PASS | 80 |
| G120 | PASS | EXECUTED | PASS | 110 |
| G128 | PASS | EXECUTED | PASS | 45 |
| G063 | PASS | EXECUTED | PASS | 92 |
| G007 | PASS | EXECUTED | PASS | 70.6 |

## Protected (must unchanged)

| Group | workId | Before | After | OK |
|-------|--------|-------:|------:|----|
| G052 | `p2a-demontaz-drzwi-wewn-szt` | 180 | 180 | true |
| G078 | `p2a-rozebranie-scianek-dzialowych-m2` | 150 | 150 | true |

## REVIEW untouched

G082, G075, G084, G004, G008, G009, G083, G165, G064

## Verdict

```text
P5.26 BLOCKED ACCEPT = CLOSED
P5.26 ACCEPT EXECUTION = COMPLETE

G052 = VERIFIED (180)
G078 = VERIFIED (150)
G121 = VERIFIED (43.83)
G093 = VERIFIED (8.56)
G091 = VERIFIED (80)
G120 = VERIFIED (110)
G128 = VERIFIED (45)
G063 = VERIFIED (92)
G007 = VERIFIED (70.60)

CREATED new = 6/7 · USE_EXISTING = 1 · BIND = 7/7 · ACCEPT = 7/7 · VERIFY = 7/7
Catalog 464→471 (via 465 intermediate)
WRITE = 8 · RESEARCH = 0 · COMMIT = 0 · PUSH = 0
REVIEW queue untouched
```

**STOP.** Nie P5.27.
