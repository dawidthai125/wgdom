# IK-MIGRATION-01 — P5.28 PRE-RESEARCH FAMILY TRIAGE

> **Date:** 2026-08-15  
> **Status:** **COMPLETE** · **QUEUE = TRIAGED_AWAITING_OWNER_RESEARCH_GO**  
> **Mode:** READ-ONLY / TRIAGE ONLY  
> **HTTP = 0 · Research = 0 · Accept = 0 · Writes = 0 · new categoryKey = 0 · CatalogWork = 0 · Commit = 0 · Push = 0**  
> **Artifacts:** `.tmp/p528-family-triage.json` · `.tmp/p528-family-triage-FULL.md`

---

## Executive

| | |
|--|--:|
| CKM baseline (P5.27) | **97** |
| True SAFE (po korekcie G109/G140) | **20** |
| E CORRECT REJECT (G109/G140) | **2** |
| Residual (POST-REUSE) | **75** |
| → C TRUE NEW KEY/FAMILY (grupy) | **65** |
| → D OUT OF RESEARCH | **10** |
| C semantic families (deduped) | **36** |
| → demolition→repairs families | **8** *(13 grup)* |
| → flooring families | **1** |
| Proposed research batches | **4** |
| MAX HTTP / batch | **40** |
| BATCH-01 started? | **NIE** |

**Reconciliation PASS:** 20 + 2 + 65 + 10 = **97** · 0 dup · 0 missing · 0 orphan.

---

## A. G109 / G140 correction

| Group | Opis (skrót) | Kind | Status |
|-------|--------------|------|--------|
| **G109** | Malowanie farbami **wapiennymi** starych tynków… | WAPNO | **FALSE_POSITIVE_REJECTED** |
| **G140** | Malowanie farbą **olejną** rur wodociągowych… | OLEJ | **FALSE_POSITIVE_REJECTED** |

| Gate | |
|------|--|
| Używać `painting` (emulsja) jako BASE? | **NIE** |
| Nowy mapping / HTTP? | **NIE** |
| Bucket | **E = CORRECT REJECT** |
| Usunięte z SAFE coverage | **TAK** (honest SAFE = 20) |

---

## B. 65 TRUE NEW KEY/FAMILY → 36 semantic families

65 | Groups | Families |
|--|-------:|---------:|
| C total | **65** | **36** |
| demolition → repairs | **13** | **8** |
| flooring | **1** | **1** |
| unknown / specialty | **51** | **27** |

**Nie** = 65 CatalogWork · **Nie** = 65 categoryKey.  
Dedupe: domain + unit + semantic scope (nie sam czasownik).

Zachowane rozróżnienia: emulsja≠wapno≠olej≠stolarka · grzejnik≠głowica · wykucie≠zaprawianie · PACKAGE≠MATERIAL≠LABOR.

Pełna lista rodzin: `.tmp/p528-family-triage-FULL.md` § B.

### Priority (families)

| P | Families |
|---|--------:|
| P0 | 9 |
| P1 | 17 |
| P2 | 10 |

---

## C. Demolition → repairs (13 grup / 8 rodzin)

| Status | **NEW_CATEGORY_KEY_REQUIRED_LATER** |
|--------|-------------------------------------|
| EXISTING KEY | **NONE** (brak allowlist URL) |
| Zakaz zamienników | plaster · zaprawianie · wykucie host · general labor |

Nie tworzyć `repairs` teraz. Nie research bez Owner-curated URL.

---

## D. Flooring (1)

| Status | **NEW_CATEGORY_KEY_REQUIRED_LATER** |
|--------|-------------------------------------|
| EXISTING KEY | **NONE** (typ istnieje, URL brak) |

Nie zgadywać mappingu.

---

## E. OUT OF RESEARCH (10)

| Kind | n | Groups |
|------|--:|--------|
| **GRUZ** | 6 | G021, G022, G053, G054, G085, G086 |
| **POMIARY** | 4 | G038, G041, G047, G048 |

Pomiary **≠** zwykła robocizna.  
Owner Knowledge (mieszkanie ≈ 500 · obiekt ≈ 1000–1500) = **sanity only** — **NIE** BASE / Accept / research price.

Inne Owner Knowledge (500/600/300/200/97.3/72.5/13.5/21.8) — **NIE** auto-BASE.

---

## F–G. Proposed batches (przyszły research — bez GO)

| Batch | Families | Groups | Lines | EST. HTTP | MAX | Budget |
|-------|--------:|-------:|------:|----------:|----:|:------:|
| **P528-BATCH-01** | ≤10 | — | — | **38** | 40 | PASS |
| **P528-BATCH-02** | ≤10 | — | — | **38** | 40 | PASS |
| **P528-BATCH-03** | ≤10 | — | — | **34** | 40 | PASS |
| **P528-BATCH-04** | ≤10 | — | — | **20** | 40 | PASS |

Heurystyka EST. HTTP ≈ grupy × 2 źródła (kb/cr lub sklepy MATERIAL).  
**Twardy limit 40** — brak mid-batch overrun w planie.  
**HTTP = 0 teraz.** Execution dopiero po osobnym Owner RESEARCH GO (+ allowlist keys gdzie NEW_KEY).

Szczegóły rodzin w batchu: `.tmp/p528-family-triage.json` → `sectionF_batches`.

---

## H. Source policy (domain-aware)

| Domain | Preferred | Forbidden |
|--------|-----------|-----------|
| **LABOR** | KB.pl · CennikRemontow · Murator · sccot · extradom | Leroy · Castorama · OBI |
| **PACKAGE** | kosztorysowe (jak wyżej) | sklepy jako cena kompletnego PACKAGE |
| **MATERIAL** | Castorama · OBI · Leroy · inne materiałowe | — |

**PACKAGE ↛ MATERIAL.**  
UNHEALTHY / 403 / 503 / timeout / CB → **nie** auto-retry (rotation dopiero w research execution).

---

## I. Risks

1. `repairs` / `flooring` — brak URL → research **zablokowany** do Owner allowlist GO.  
2. Clustering FAMILY_UNKNOWN jest heurystyczny — weryfikacja opisu przed HTTP.  
3. G109/G140 nigdy jako painting BASE.  
4. Nie przekraczać MAX_HTTP=40 w batchu.  
5. Internal-First przed każdym przyszłym HTTP (CURRENT → memory → MATERIAL/LABOR/PACKAGE → dopiero external).  
6. CORRUPT_PARSE poza research.  
7. Owner Knowledge ≠ BASE.

---

## Internal-First (przyszły kontrakt — bez zmian matcherów)

1. CURRENT EXACT  
2. Price Memory  
3. MATERIAL existing  
4. LABOR existing  
5. PACKAGE existing  
6. NO_INTERNAL_MATCH → external  

Gates: PACKAGE↛MATERIAL/LABOR · LABOR↛PACKAGE · MATERIAL↛PACKAGE · bez fuzzy SAFE.

---

## Example family row (schema)

Dla każdej z 36 rodzin C (pełny JSON):

| Field | |
|-------|--|
| FAMILY_ID | `C\|DOMAIN\|unit\|family\|scope` |
| GROUPS / LINES | … |
| DOMAIN / UNIT | … |
| DESCRIPTION | sample |
| PROPOSED_CATEGORY_KEY_NAME | np. `repairs` — **nie utworzony** |
| EXISTING_KEY | **NONE** |
| RESEARCH_PRIORITY | P0/P1/P2 |
| RESEARCH_SOURCES | preferred + forbidden |
| REASON | … |

---

## STOP

**P5.28 PRE-RESEARCH FAMILY TRIAGE = COMPLETE**

- **NIE** BATCH-01 · **NIE** HTTP · **NIE** categoryKey · **NIE** CatalogWork  
- **NIE** Accept · **NIE** commit · **NIE** push  

Czekaj na **Owner Review** + osobny **RESEARCH EXECUTION GO**.

**ABSOLUTE STOP.**
