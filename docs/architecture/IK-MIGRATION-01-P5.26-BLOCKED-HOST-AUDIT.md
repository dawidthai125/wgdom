# IK-MIGRATION-01 — P5.26 BLOCKED ACCEPT HOST AUDIT

> **Status:** COMPLETE · AUDIT ONLY  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p526-blocked-host-audit.json`  
> **Catalog scanned:** **464** · CREATE/BIND/ACCEPT = **0**

## Safety

| | |
|--|--:|
| CatalogWork CREATE | **0** |
| BIND | **0** |
| ACCEPT | **0** |
| KV WRITE | **0** |
| Research HTTP | **0** |
| Commit / push | **0** |
| Catalog size | **464 → 464** |

## Summary

| Metric | Count |
|--------|------:|
| EXISTING SAFE HOSTS | **0** |
| REVIEW HOSTS | **0** |
| NO SAFE HOST | **7** |
| PROPOSED NEW HOSTS | **7** |

## Per group

| Group | Verdict | Safe host | Proposed workId | Proposed status |
|-------|---------|-----------|-----------------|-----------------|
| G121 | **NO_SAFE_HOST** | — | `cc-p0c-w1-ukladanie-paneli-m2` | PROPOSE_NEW |
| G093 | **NO_SAFE_HOST** | — | `cc-p0c-w1-otulina-fi20-mb` | PROPOSE_NEW |
| G091 | **NO_SAFE_HOST** | — | `cc-p0c-w1-pcw-fi50-mb` | PROPOSE_NEW |
| G120 | **NO_SAFE_HOST** | — | `cc-p0c-w1-posadzki-plytki-m2` | PROPOSE_NEW |
| G128 | **NO_SAFE_HOST** | — | `cc-p0c-w1-warstwy-wyrownawcze-m2` | PROPOSE_NEW |
| G063 | **NO_SAFE_HOST** | — | `cc-p0c-w1-dopasowanie-skrzydel-szt` | PROPOSE_NEW |
| G007 | **NO_SAFE_HOST** | — | `cc-p0c-w1-skraplacz-kondensatu-szt` | PROPOSE_NEW |

### G121 — Posadzki z paneli podłogowych / układanie paneli

| Field | Value |
|-------|-------|
| Domain / unit | PACKAGE / m2 |
| Labor / Material | 43.83 / — |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
- `p1b-panel-ogrodzeniowy-mb` — Odcinek ogrodzenia panelowego (HARD_REJECT_ID)
- `p2a-zerwanie-podloza-m2` — Usunięcie starej bazy pod kolejne pokrycie posadzkowe (HARD_REJECT_ID)

### G093 — Izolacja rurociągów otuliną Thermaflex Ø20

| Field | Value |
|-------|-------|
| Domain / unit | PACKAGE / mb |
| Labor / Material | — / 8.56 |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
_none_

### G091 — Montaż rurociągów PCW Ø50

| Field | Value |
|-------|-------|
| Domain / unit | PACKAGE / mb |
| Labor / Material | 80 / — |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
- `cw.inv.06370` — DRZWICZKI BIAŁE PCV 25X50CM (MISSING_REQUIRED_TOKEN)
- `cw.inv.5_4_6_4` — OBEJMA RURY PCV 40-50MM Z GUMĄ (HARD_REJECT_SEMANTIC)
- `cw.inv.h_ko_40sza` — KOLANO PCV 40/15,30,45,67,87" (HARD_REJECT_SEMANTIC)
- `cw.inv.h_ko110` — KOLANO PCV 110/15,30,45,67,90" (HARD_REJECT_SEMANTIC)
- `cw.inv.h_kor40` — KOREK PCV 40MM (HARD_REJECT_SEMANTIC)
- `cw.inv.h_kor50` — KOREK PCV 50MM (HARD_REJECT_SEMANTIC)
- `cw.inv.h_korp110` — KOREK PCV 110MM (HARD_REJECT_SEMANTIC)
- `cw.inv.h_korp160` — KOREK PCV 160MM (HARD_REJECT_SEMANTIC)

### G120 — Posadzki płytkowe z kamieni sztucznych 20x20

| Field | Value |
|-------|-------|
| Domain / unit | PACKAGE / m2 |
| Labor / Material | 110 / — |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
- `cw.inv.16_120` — TARCZA FIBRA DO KAMIENIA 125MM (MISSING_REQUIRED_TOKEN)
- `cw.inv.h0000dxphdl` — GLAZURNIK/ MAPEI-SILIKON MAPESIL AC 310ML (MISSING_REQUIRED_TOKEN)
- `cw.inv.kliny` — DO GLAZURY MAŁE (MISSING_REQUIRED_TOKEN)
- `cw.inv.pu60` — PUSZKA PODT.ZWYKŁA PŁYTKA 60 (MISSING_REQUIRED_TOKEN)
- `cw.inv.pug60` — PUSZKA PODT.DO G-K 60 PŁYTKA (MISSING_REQUIRED_TOKEN)
- `legacy-glazura-m2` — Glazura / płytki (m2) (MISSING_REQUIRED_TOKEN)
- `p2a-rozebranie-okladzin-sciennych-m2` — Glazura i okładziny płytkowe (MISSING_REQUIRED_TOKEN)

### G128 — Warstwy wyrównawcze pod posadzki z zaprawy cementowej

| Field | Value |
|-------|-------|
| Domain / unit | PACKAGE / m2 |
| Labor / Material | 45 / — |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
- `cc-p0c-w1-zaprawianie-bruzd` — Zaprawianie / zamurowanie bruzd (FORBIDDEN_GLOBAL)
- `p2a-rozebranie-posadzek-wewn-m2` — Posadzki mieszkaniowe (wylewki / okładziny) (DOMAIN_MISMATCH)
- `p2a-zerwanie-podloza-m2` — Usunięcie starej bazy pod kolejne pokrycie posadzkowe (HARD_REJECT_ID)

### G063 — Dopasowanie skrzydeł drzwiowych

| Field | Value |
|-------|-------|
| Domain / unit | LABOR / szt |
| Labor / Material | 92 / — |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
- `p1b-brama-ogrodzeniowa-szt` — Skrzydło wjazdowe w ciągu ogrodzenia (MISSING_REQUIRED_TOKEN)

### G007 — Skraplacz kondensatu do kotła gazowego

| Field | Value |
|-------|-------|
| Domain / unit | MATERIAL / szt |
| Labor / Material | — / 70.6 |
| Verdict | **NO_SAFE_HOST** |
| Exact hits | 0 |
| Semantic hits | 0 |
| Review hits | 0 |

**Rejected (sample):**
_none_


## Next

Osobne Owner GO: **P5.26-CREATE-7** (nie uruchamiać teraz).

```text
AUDIT = COMPLETE
CREATE = 0
BIND = 0
ACCEPT = 0
WRITE = 0
HTTP = 0
CODE = 0
COMMIT = 0
PUSH = 0
```
