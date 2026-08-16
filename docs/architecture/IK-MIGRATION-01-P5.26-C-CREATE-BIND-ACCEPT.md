# IK-MIGRATION-01 — P5.26-C CREATE → BIND → ACCEPT

> **TRYB:** CONTROLLED EXECUTION · Owner GO = TAK  
> **Date:** 2026-08-15  
> **Status:** **COMPLETE**  
> **Artifacts:** `.tmp/p526-create-bind-accept.json` · `.tmp/p526-create-bind-accept-FULL.md` · runner `.tmp/p526-create-bind-accept-run.mjs`  
> **Commit / push:** **0** (czekają na Owner)

## Summary

| Metric | Value |
|--------|------:|
| Created CatalogWork | **4** |
| Pre-existing CatalogWork modified | **0** |
| Duplicate CatalogWork | **0** |
| Bound groups | **10** / 10 |
| Accepted hosts (Accept API) | **4** |
| Accepted groups (via hosts) | **10** |
| Research / external HTTP research | **0** |
| Invented prices | **0** |
| Auto-Accept other candidates | **0** |
| Matcher / F5 / domain-gate code changes | **0** |

**Path:** `acceptWorkRateResearchCandidate` + `saveWorkCatalogRouted` (istniejący Accept).  
**Persist:** `kw-wgdom-work-catalog` (routed).  
**Catalog size:** 460 → **464**.

---

## 1. Pre-create safety

| workId | existed before CREATE |
|--------|-----------------------|
| `cc-p0c-w1-wykucie-bruzd` | false |
| `cc-p0c-w1-gruntowanie-m2` | false |
| `cc-p0c-w1-malowanie-emulsja-m2` | false |
| `cc-p0c-w1-montaz-grzejnika-szt` | false |

No safe host appeared between audit and execution. **PASS.**

---

## 2. CREATE (exactly 4)

| UI name | workId | Domain (store) | Unit | BASE (Owner) |
|---------|--------|----------------|------|-------------:|
| Wykucie bruzd | `cc-p0c-w1-wykucie-bruzd` | LABOR | mb | 72.5 |
| Gruntowanie | `cc-p0c-w1-gruntowanie-m2` | LABOR | m2 | 13.5 |
| Malowanie emulsją | `cc-p0c-w1-malowanie-emulsja-m2` | LABOR_MATERIAL_PACKAGE | m2 | 21.8 |
| Montaż grzejnika | `cc-p0c-w1-montaz-grzejnika-szt` | LABOR_MATERIAL_PACKAGE | szt | 97.3 |

PACKAGE = jeden rekord cenowy kompletnego wykonania (bez osobnego MATERIAL / LABOR sibling).

---

## 3. Pricing (po Accept)

| workId | BASE (`marketBaseRatePln` / OUR) | marginPct | SELL |
|--------|--------------------------------:|----------:|-----:|
| wykucie | 72.5 | 0 | 72.5 |
| gruntowanie | 13.5 | 0 | 13.5 |
| malowanie emulsją | 21.8 | 0 | 21.8 |
| montaż grzejnika | 97.3 | 0 | 97.3 |

Kontrakt: BASE → `commercialPricing.marginPct` → SELL. SELL ≠ zapisane jako BASE; przy margin 0 wartości numeryczne równe.

Lookup status po Accept: **CURRENT** · history entries ≥ 2 (create seed + accept).

---

## 4. BIND (10 groups only)

| Host | Groups | lineIds (count) |
|------|--------|-----------------|
| Wykucie bruzd | G015 · G024 · G081 | 4+3+1 |
| Gruntowanie | G035 · G036 · G067 | 2+2+1 |
| Malowanie emulsją | G092 · G107 | 4+2 |
| Montaż grzejnika | G153 · G154 | 1+1 |

**Bind kind:** `OWNER_P526_LINE_MAP` (mapa lineId → workId w runnerze + F5 z explicit `catalogWorkId`).

**Nie zbindowano (forbidden):** G112 · G141 · G143 · G126 · G076 · G134 · G135 · G144 · G111 · G149 · G150 · G177.

**Semantic locks preserved:**
- wykucie **≠** `cc-p0c-w1-zaprawianie-bruzd` (OUR nadal **20**)
- malowanie emulsją **≠** `legacy-malowanie-m2` (bez OUR)
- grzejnik **≠** G112 głowica (REJECTED)

**Uwaga Owner:** Product Mapper alias pack **nie** był zmieniany (zakaz matcherów). Produkcyjny auto-match bez explicit `catalogWorkId` może wymagać osobnego GO na alias pack.

---

## 5. ACCEPT

Tylko 4 kandydaci Owner:

| BASE | Host | Groups covered |
|-----:|------|----------------|
| 72.5 | wykucie | 015/024/081 |
| 13.5 | gruntowanie | 035/036/067 |
| 21.8 | malowanie emulsją | 092/107 |
| 97.3 | montaż grzejnika | 153/154 |

API: `acceptWorkRateResearchCandidate` → `saveWorkCatalogRouted`.  
**Nie** Accept dla REJECT/REVIEW/FP.

---

## 6. F5 verification (READ-ONLY smoke, qty=1)

| Family | Expected | Result |
|--------|----------|--------|
| Wykucie | qty × 72.5 LABOR | engine/shadow labor **72.5** · material **0** · complete |
| Gruntowanie | qty × 13.5 LABOR | **13.5** · material **0** · complete |
| Malowanie | qty × 21.8 PACKAGE | **21.8** · single pricing · complete |
| Grzejnik | qty × 97.3 PACKAGE | **97.3** · single pricing · complete |

F5 code **nie** zmieniany. LABOR smoke używa runtime `laborOnlyWorkIds` (bez edycji allowlist w repo).

---

## 7. Integrity

| Check | Result |
|-------|--------|
| Created CatalogWork | 4 |
| Pre-existing hosts rate-touched | **0** (`zaprawianie` = 20; legacy-malowanie untouched) |
| Duplicate workId | 0 |
| Bound / expected groups | 10 / 10 |
| Accepted groups | 10 |
| Research = 0 · HTTP research = 0 | PASS |
| Invented prices = 0 · Auto-Accept = 0 | PASS |
| Unexpected writes outside plan | 0 (tylko create+accept persist na 4 nowych hostach) |

JSON field `existingCatalogWorkModifiedRates: 4` = Accept na **nowo utworzonych** 4 hostach (nie na pre-existing).

---

## 8. Zero research / zero HTTP research

| Action | Count |
|--------|------:|
| KB.pl / CennikRemontow / SCCOT / Extradom / Leroy / Castorama / OBI | **0** |
| Owner Accepted Candidate as BASE source | **4** |

KV `batch-get` / routed save = persist katalogu, **nie** research HTTP.

---

## 9. STOP

**P5.26-C COMPLETE.**

- **Nie** P5.27  
- **Nie** research 159 GAP  
- **Nie** dalsze Accept  
- **Nie** commit / push (do decyzji Ownera)

Czekaj na następny Owner GO.
