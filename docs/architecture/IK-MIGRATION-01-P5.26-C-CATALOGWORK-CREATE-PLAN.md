# IK-MIGRATION-01 — P5.26-C CATALOGWORK CREATE PLAN

> **TRYB:** DESIGN / AUDIT ONLY  
> **Date:** 2026-08-15  
> **JSON:** `.tmp/p526-catalogwork-create-plan.json`  
> **CREATE = 0 · WRITE = 0 · ACCEPT = 0 · HTTP = 0 · RESEARCH = 0**

## Context

| Step | Result |
|---|---|
| P5.26 Owner Decision | 4 families ACCEPTED (BASE fixed) |
| P5.26 Accept Execution | **STOPPED** — `workId = null` → `WORK_NOT_FOUND` |
| P5.26 Bind Audit | 460 scanned · **SAFE = 0** · **NO_SAFE_MATCH = 4** |

Ten dokument = **plan 4 nowych hostów**.  
**Nie** tworzy rekordów. Czeka na osobny GO: **P5.26-C CREATE CATALOGWORK**.

---

## A–L. Proposed CatalogWork (4)

### Summary strip

| Name (UI) | Proposed workId | Domain | Unit | BASE |
|---|---|---|---|---:|
| Wykucie bruzd | `cc-p0c-w1-wykucie-bruzd` | LABOR | mb | **72.5** |
| Gruntowanie | `cc-p0c-w1-gruntowanie-m2` | LABOR | m² | **13.5** |
| Malowanie emulsją | `cc-p0c-w1-malowanie-emulsja-m2` | LABOR_MATERIAL_PACKAGE | m² | **21.8** |
| Montaż grzejnika | `cc-p0c-w1-montaz-grzejnika-szt` | LABOR_MATERIAL_PACKAGE | szt | **97.3** |

`workId` = **propozycja** (konwencja `cc-p0c-w1-*` jak `cc-p0c-w1-zaprawianie-bruzd`).  
**Nie** zapisany w KV / katalogu.

**Margin assumption (proposal only):** `marginPct = 0` (jak live sibling zaprawianie) → **SELL = BASE**.  
Po CREATE: zweryfikować live `commercialPricing` przed Accept.

---

### 1. Wykucie bruzd

| Field | Value |
|---|---|
| **E. UI name** | Wykucie bruzd |
| **B. Proposed workId** | `cc-p0c-w1-wykucie-bruzd` |
| **C. Domain** | LABOR |
| **D. Unit** | mb |
| **G. Owner Accepted BASE** | **72.5 PLN/mb** |
| **F. Scope** | Wykonanie wykucia bruzdy wg BOQ (G015/G024/G081) — stawka jednostkowa mb |
| Groups | G015 · G024 · G081 |

**H. Pricing semantics (proposal — not persisted)**

| | |
|---|---:|
| marketBaseRatePln | 72.5 |
| ourRatePln | 72.5 |
| marginPct | 0 |
| SELL | 72.5 (= BASE) |

**I. Provenance:** P5.26 Owner Accepted Candidate · lineage P5.25 kb_pl · **≠** invent research.

**J. Expected F5 (after future CREATE+BIND+ACCEPT):** LABOR · `qty × 72.5` · bez osobnego materiału wypełnienia.

**K. Expected Position Cost:** `Σ qty × 72.5` na zbindowanych liniach.

**L. Conflicts / FP checks**

| Do NOT link | Reason |
|---|---|
| `cc-p0c-w1-zaprawianie-bruzd` (20) | wykucie ≠ zaprawianie |
| `cc-w2-wykucie-wnek` | wnęka ≠ bruzda |

**M. CREATE readiness:** READY_FOR_OWNER_GO_CREATE

---

### 2. Gruntowanie

| Field | Value |
|---|---|
| **E. UI name** | Gruntowanie |
| **B. Proposed workId** | `cc-p0c-w1-gruntowanie-m2` |
| **C. Domain** | LABOR |
| **D. Unit** | m² |
| **G. Owner Accepted BASE** | **13.5 PLN/m²** |
| **F. Scope** | Gruntowanie powierzchni przed wykończeniem (pion/poziom — jeden host rodzinny) · bez marki gruntu |
| Groups | G035 · G036 · G067 |

**H. Pricing:** BASE/OUR/SELL = **13.5** · marginPct **0** (proposal).

**I. Provenance:** P5.26 Owner ACCEPT 13.5 · P5.25 research.

**J/K. F5 / Position Cost:** `qty × 13.5` · LABOR.

**L. Conflicts:** folia · koryto gruntowe drogowe — nie bind.

**M. CREATE readiness:** READY_FOR_OWNER_GO_CREATE  
*(Opcjonalny późniejszy EDIT: split pion/poziom — nie wymagany do P5.26.)*

---

### 3. Malowanie emulsją

| Field | Value |
|---|---|
| **E. UI name** | Malowanie emulsją |
| **B. Proposed workId** | `cc-p0c-w1-malowanie-emulsja-m2` |
| **C. Domain** | LABOR_MATERIAL_PACKAGE |
| **D. Unit** | m² |
| **G. Owner Accepted BASE** | **21.8 PLN/m²** |
| **F. Scope** | Dwukrotne malowanie emulsją wewnątrz — **jedna** kompletna cena (R+M) |
| Groups | G092 · G107 |

**H. Pricing:** BASE/OUR/SELL = **21.8** · marginPct **0** (proposal).

**PACKAGE contract:** **jeden** rekord pricingowy.  
**Nie** tworzyć osobnego LABOR + MATERIAL farby.

**I. Provenance:** P5.26 Owner ACCEPT 21.8 (tylko emulsja).

**J/K. F5 / Position Cost:** PACKAGE `qty × 21.8` · farba logicznie w cenie kompletnej.

**L. Conflicts — NIE bind**

| | |
|---|---|
| `legacy-malowanie-m2` | ogólne ≠ emulsja · G141/G143 REJECT 21.6 |
| farba elewacyjna / SKU Śnieżka emulsja | PACKAGE ↛ MATERIAL |
| malowanie stolarki / olejne | poza zakresem |

**M. CREATE readiness:** READY_FOR_OWNER_GO_CREATE

---

### 4. Montaż grzejnika

| Field | Value |
|---|---|
| **E. UI name** | Montaż grzejnika |
| **B. Proposed workId** | `cc-p0c-w1-montaz-grzejnika-szt` |
| **C. Domain** | LABOR_MATERIAL_PACKAGE |
| **D. Unit** | szt |
| **G. Owner Accepted BASE** | **97.3 PLN/szt** |
| **F. Scope** | Kompletny montaż grzejnika (BOQ: akumulacyjny+sterownik) — jedna cena szt |
| Groups | G153 · G154 |

**H. Pricing:** BASE/OUR/SELL = **97.3** · marginPct **0** (proposal).

**PACKAGE contract:** montaż + grzejnik w **jednym** rekordzie.  
**Nie** MATERIAL «Grzejnik» + LABOR «montaż».

**I. Provenance:** P5.26 Owner ACCEPT 97.3 dla montażu grzejnika.  
**Explicitly NOT from G112** (głowica — REJECTED mimo tej samej liczby).

**J/K. F5 / Position Cost:** PACKAGE `qty × 97.3`.

**L. Conflicts:** G112 · przygotowanie osprzętu · bare MATERIAL grzejnik.

**M. CREATE readiness:** READY_FOR_OWNER_GO_CREATE

---

## Owner approval table

| Family | Proposed CatalogWork | Domain | Unit | BASE | Owner Decision |
|---|---|---|---|---:|---|
| Wykucie bruzd | Wykucie bruzd · `cc-p0c-w1-wykucie-bruzd` | LABOR | mb | 72.5 | **PENDING** |
| Gruntowanie | Gruntowanie · `cc-p0c-w1-gruntowanie-m2` | LABOR | m² | 13.5 | **PENDING** |
| Malowanie emulsją | Malowanie emulsją · `cc-p0c-w1-malowanie-emulsja-m2` | PACKAGE | m² | 21.8 | **PENDING** |
| Montaż grzejnika | Montaż grzejnika · `cc-p0c-w1-montaz-grzejnika-szt` | PACKAGE | szt | 97.3 | **PENDING** |

Owner Decision per row: **CREATE** · **EDIT** · **REJECT**  
Żadna decyzja nie jest wykonywana automatycznie.

---

## Final safety report

| Metric | Value |
|---|---|
| CatalogWork scanned (prior audit) | **460** |
| Existing safe hosts | **0** |
| Proposed new hosts | **4** |
| CREATE | **0** |
| WRITE / KV | **0** |
| ACCEPT | **0** |
| HTTP / RESEARCH | **0** |
| CODE / COMMIT / PUSH | **0** |
| ikEntryEnabled | **OFF** |
| NG-10 | **RETAINED** |

---

## Absolute STOP

```text
P5.26-C CREATE PLAN COMPLETE
CREATE = 0 · czekaj na OWNER GO: P5.26-C CREATE CATALOGWORK
Nie twórz rekordów · Nie Accept · Nie P5.27
```
