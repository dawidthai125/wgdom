# IK-MIGRATION-01 — P5.26 CATALOGWORK BIND AUDIT

> **TRYB:** READ-ONLY · EVIDENCE ONLY  
> **Date:** 2026-08-15  
> **Catalog scanned:** **460** (region `wroclaw`)  
> **JSON:** `.tmp/p526-catalogwork-bind-audit.json`

## Safety

| Check | Value |
|---|---|
| Research HTTP (KB/Cennik/shops/…) | **0** |
| Catalog SSOT read (`batch-get` read-only) | **1** |
| Accept | **0** |
| Catalog / KV writes | **0** |
| New CatalogWork | **0** |
| New workId | **0** |
| Bind executed | **0** |
| Code / commit / push | **0** |
| Accepted BASE unchanged | **72.5 / 13.5 / 21.8 / 97.3** |

---

## Summary

| Outcome | Count |
|---|---:|
| SAFE_EXACT_MATCH | **0** |
| SAFE_SEMANTIC_MATCH | **0** |
| REVIEW_REQUIRED | **0** |
| **NO_SAFE_MATCH** | **4 / 4 families** |
| False-positive rejects (documented) | **8+** |

---

## Main table

| Family | Group | Accepted BASE | Candidate workId | Catalog description | Domain | Unit | Existing Rate | Match | Confidence | Decision |
|---|---|---:|---|---|---|---|---:|---|---|---|
| Wykucie bruzd | G015 | 72.5 | — | — | LABOR | mb | — | none | — | **NO_SAFE_MATCH** |
| Wykucie bruzd | G024 | 72.5 | — | — | LABOR | mb | — | none | — | **NO_SAFE_MATCH** |
| Wykucie bruzd | G081 | 72.5 | — | — | LABOR | mb | — | none | — | **NO_SAFE_MATCH** |
| Gruntowanie | G035 | 13.5 | — | — | LABOR | m² | — | none | — | **NO_SAFE_MATCH** |
| Gruntowanie | G036 | 13.5 | — | — | LABOR | m² | — | none | — | **NO_SAFE_MATCH** |
| Gruntowanie | G067 | 13.5 | — | — | LABOR | m² | — | none | — | **NO_SAFE_MATCH** |
| Malowanie emulsją | G092 | 21.8 | — | — | PACKAGE | m² | — | none | — | **NO_SAFE_MATCH** |
| Malowanie emulsją | G107 | 21.8 | — | — | PACKAGE | m² | — | none | — | **NO_SAFE_MATCH** |
| Montaż grzejnika | G153 | 97.3 | — | — | PACKAGE | szt | — | none | — | **NO_SAFE_MATCH** |
| Montaż grzejnika | G154 | 97.3 | — | — | PACKAGE | szt | — | none | — | **NO_SAFE_MATCH** |

---

## A. WYKUCIE BRUZD (72.5 PLN/mb)

| Field | Value |
|---|---|
| Groups | G015 · G024 · G081 |
| Domain | LABOR |
| Unit | mb (BOQ `m` compatible) |
| Accepted BASE | **72.5** (unchanged) |
| Keyword universe | `bruzd` → 1 work · `wykucie` → 1 work |
| SAFE host | **NONE** |
| Decision | **NO_SAFE_MATCH** |

### Rejected near-hosts (do NOT bind)

| workId | Catalog description | Unit | Rate | Why rejected |
|---|---|---|---:|---|
| `cc-p0c-w1-zaprawianie-bruzd` | Zaprawianie / zamurowanie bruzd | mb | **20** | **wykucie ≠ zaprawianie** · Owner semantic separation |
| `cc-w2-wykucie-wnek` | Wykucie wnęk w murze | szt | null | wnęka ≠ bruzda · unit szt ≠ mb |

**Recommendation:** CREATE NEW HOST (not executed).

---

## B. GRUNTOWANIE (13.5 PLN/m²)

| Field | Value |
|---|---|
| Groups | G035 · G036 · G067 |
| Domain | LABOR |
| Unit | m² |
| Accepted BASE | **13.5** (unchanged) |
| Keyword `gruntowan` | **0** CatalogWork |
| SAFE host | **NONE** |
| Decision | **NO_SAFE_MATCH** |

### False-positive rejects

| workId | Why |
|---|---|
| `cc-p0c-w1-zabezpieczenie-folia` | folia ≠ gruntowanie (prior wrong internal match) |
| `p1a-koryto-jezdni-chodnik-m2` | «koryto **gruntowe**» drogowe ≠ gruntowanie podłoży |

Brak rozróżnienia pion/poziom — i tak brak hosta.

**Recommendation:** CREATE NEW HOST (not executed). Owner may later decide one shared host vs pion/poziom split.

---

## C. MALOWANIE EMULSJĄ (21.8 PLN/m² · PACKAGE)

| Field | Value |
|---|---|
| Groups | G092 · G107 |
| Domain | LABOR_MATERIAL_PACKAGE |
| Unit | m² |
| Accepted BASE | **21.8** (unchanged) |
| Keyword `malowan` | 1 (`legacy-malowanie-m2`) |
| Keyword `emuls` | 2 inventory paint SKUs |
| SAFE host | **NONE** |
| Decision | **NO_SAFE_MATCH** |

### Rejected near-hosts (do NOT bind)

| workId | Catalog description | Why rejected |
|---|---|---|
| `legacy-malowanie-m2` | Malowanie (m2) | ogólne ≠ emulsja · **G141/G143 path already REJECTED** 21.6 |
| `p1c-farba-elewacyjna-m2` | Farba elewacyjna … | elewacja ≠ emulsja wewnętrzna |
| `cw.inv.h0000e82b00` | ŚNIEŻKA-EKO EMULSJA 1L | **PACKAGE ↛ MATERIAL** paint SKU · unit szt |
| `cw.inv.h0000s2ky1p` | ŚNIEŻKA-EKO EMULSJA 10L | **PACKAGE ↛ MATERIAL** paint SKU · unit szt |

**Recommendation:** CREATE NEW HOST (PACKAGE, m²) — not executed.

---

## D. MONTAŻ GRZEJNIKA (97.3 PLN/szt · PACKAGE)

| Field | Value |
|---|---|
| Groups | G153 · G154 |
| Domain | LABOR_MATERIAL_PACKAGE |
| Unit | szt |
| Accepted BASE | **97.3** (unchanged) |
| Keyword `grzejnik` | **0** CatalogWork |
| SAFE host | **NONE** |
| Decision | **NO_SAFE_MATCH** |

### Rejected (known wrong prior matches / noise)

| workId | Why |
|---|---|
| `cc-p0c-w1-multiswitch-antenowy` | prior wrong internal match |
| `cc-w2-przygotowanie-osprzet` | przygotowanie osprzętu ≠ montaż grzejnika |
| `p2a-demontaz-drzwi-wewn-szt` | demontaż ≠ montaż (substring trap) |

Zero MATERIAL «Grzejnik» hosts found either — still would be **PACKAGE ↛ MATERIAL** if present.

**Recommendation:** CREATE NEW HOST (PACKAGE, szt) — not executed.

---

## Owner BIND decision (recommendation only)

| Family | Existing safe host? | workId | Recommendation |
|---|---|---|---|
| Wykucie bruzd | **NO** | — | **CREATE NEW HOST** |
| Gruntowanie | **NO** | — | **CREATE NEW HOST** |
| Malowanie emulsją | **NO** | — | **CREATE NEW HOST** |
| Montaż grzejnika | **NO** | — | **CREATE NEW HOST** |

Nie utworzono żadnego hosta. Nie wykonano bind. Nie wykonano Accept.

---

## Absolute STOP

```text
P5.26 CATALOGWORK BIND AUDIT COMPLETE
SAFE matches = 0
NO_SAFE_MATCH = 4/4
research HTTP = 0 · Accept = 0 · writes = 0 · new CatalogWork = 0
STOP — czekaj na OWNER BIND DECISION (CREATE NEW CATALOGWORK)
Nie przechodź do P5.27 · Nie Accept · Nie invent bez GO
```
