# IK-MIGRATION-01 — P5.30 CATEGORY KEY DESIGN / FAMILY RESOLUTION

> **Date:** 2026-08-15  
> **Status:** **COMPLETE** · **AUDIT + DESIGN ONLY**  
> **HTTP = 0 · Research = 0 · CREATE key = 0 · CatalogWork = 0 · Accept = 0 · Writes = 0 · Code = 0 · Commit = 0 · Push = 0**  
> **Artifacts:** `.tmp/p530-category-key-design.json` · `.tmp/p530-category-key-design-FULL.md` · `.tmp/p530-family-resolution.md` · `.tmp/p530-research-routing-plan.json`

---

## Executive

| | |
|--|--:|
| Groups (P5.29 C-queue) | **65** |
| Lines | **105** |
| P5.29 FAMILY_UNKNOWN | **51** |
| P5.29 CATEGORY_KEY_MISSING | **14** |
| Designed semantic families | **31** |
| RESOLVED_EXISTING (reuse candidate) | **0** |
| NEW_KEY_PROPOSED (groups) | **45** |
| OWNER_REVIEW (groups) | **19** |
| UNRESOLVED (groups) | **1** |
| New categoryKey candidates (unique, no URL yet) | **18** |
| OUT OF RESEARCH (in this 65) | **0** |
| HTTP / Writes / Code | **0 / 0 / 0** |

**Najważniejszy wniosek (zachowany):** P5.29 GAP ≠ brak ceny. To był **routing block** (FAMILY_UNKNOWN / CATEGORY_KEY_MISSING).

**Reconciliation:** PASS — 65/65 groups · 105/105 lines · 0 dup · 0 missing · 0 orphan.

---

## A. 51 FAMILY_UNKNOWN

Każda pozycja przeanalizowana (patrz `.tmp/p530-family-resolution.md`). Nie nadano automatycznie categoryKey w kodzie.

Wynik designu (grupy):

```
{
  "OWNER_REVIEW": 17,
  "NEW_KEY_PROPOSED": 33,
  "UNRESOLVED": 1
}
```

Obowiązkowe rozdzielenia zachowane: emulsja≠wapno≠olej · grzejnik≠głowica · wykucie≠zaprawianie · demontaż gniazda≠drzwi · PACKAGE≠LABOR≠MATERIAL.

---

## B. 14 CATEGORY_KEY_MISSING

| Bucket | n | Znaczenie |
|---|---:|---|
| **A** safe new key / URL candidate | **11** | HIGH confidence · można projektować URL w P5.31 |
| **B** Owner review | **3** | reuse plumbing/electrical lub niepewny scope |
| **C** remain unresolved | **0** | nie projektować key teraz |

Pełna tabela: `.tmp/p530-category-key-design-FULL.md` § CKM.

---

## C. REPAIRS FAMILY MODEL (design only — NIE jeden worek)

Nie wrzucamy całego demolition do jednego `repairs`, jeżeli zakresy cenowe są różne.

| Family | Suggested key | Groups | Lines | Scope |
|---|---|---:|---:|---|
| repairs_demolition_electrical | `repairs_electrical` | 2 | 4 | demolition_electrical_fixture |
| repairs_opening_cut | `repairs_opening` | 3 | 3 | opening_cut |
| repairs_demolition_general | `repairs` | 2 | 2 | demolition_general |
| repairs_demolition_joinery | `repairs_joinery` | 1 | 2 | demolition_joinery |
| repairs_demolition_appliance | `repairs_appliance` | 2 | 3 | demolition_appliance |
| repairs_demolition_finish | `repairs_finish` | 2 | 3 | demolition_wall_finish |
| repairs_biocide | `repairs_biocide` | 2 | 2 | biocide_treatment |
| repairs_demolition_wall | `repairs_wall` | 2 | 2 | demolition_wall |
| repairs_demolition_floor_trim | `repairs_floor_trim` | 1 | 1 | demolition_floor_trim |

**Istniejący type key `repairs`:** może zostać umbrella + osobne klucze `repairs_*` albo Owner wybiera jeden URL na podrodzinę. **P5.31 dopiero po GO.**

---

## D. FLOORING

| | |
|--|--|
| Suggested key | `flooring` (już w `WorkRateCategoryKey`) |
| Brak | PASS2 allowlist URL |
| Domain | LABOR / PACKAGE (m2) |
| Sources | KB / CennikRemontow / kosztorysowe — **nie** cena panelu ze sklepu jako PACKAGE |
| Status | NEW_KEY_PROPOSED = **ADD_ALLOWLIST_URL_ONLY** |

---

## E. Naming + routing

Konwencja: istniejący `snake_case` `WorkRateCategoryKey` — bez nowej konwencji.

| Domain | Preferred | Forbidden |
|--------|-----------|-----------|
| LABOR / PACKAGE | KB · CR · sccot · extradom | Leroy · Castorama · OBI |
| MATERIAL | sklepy | — |

**PACKAGE ↛ MATERIAL.** LABOR ↛ sklepy.

---

## F. Research gate (per family)

Wymagane: CATEGORY_KEY · DOMAIN · UNIT · SOURCE_ROUTE · QUERY · NEGATIVE_TERMS · EXPECTED_HTTP.

Brak któregokolwiek → **RESEARCH_BLOCKED** (stan obecny dla prawie wszystkich do P5.31).

Plan: `.tmp/p530-research-routing-plan.json`

---

## G. Future batches (NIE WYKONYWAĆ)

| Batch | Families | Groups | EST HTTP | Cap |
|---|---:|---:|---:|---:|
| P530-FUTURE-BATCH-01 | 6 | 18 | 36 | 40 |
| P530-FUTURE-BATCH-02 | 8 | 15 | 30 | 40 |
| P530-FUTURE-BATCH-03 | 7 | 11 | 22 | 40 |

Pre-flight przed przyszłym runem musi policzyć rzeczywisty max ≤ 40.

---

## H. Owner Knowledge locks

- **72.5** wykucie bruzd — do not extend
- **13.5** gruntowanie — do not extend
- **21.8** emulsja — do not extend to wapno/olej/stolarka
- **97.3** montaż grzejnika — do not extend to głowica

---

## STOP

**P5.30 = COMPLETE (design only).**

- **NIE** create categoryKey · **NIE** CatalogWork · **NIE** Accept · **NIE** HTTP  
- **NIE** commit · **NIE** push  

Czekaj na **Owner Review**.

**NEXT:** P5.31 CATEGORY KEY CREATE / ROUTE IMPLEMENTATION — **tylko po osobnym Owner GO**.

**ABSOLUTE STOP.**
