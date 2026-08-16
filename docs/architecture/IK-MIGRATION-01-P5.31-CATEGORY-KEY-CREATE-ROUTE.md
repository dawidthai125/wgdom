# IK-MIGRATION-01 — P5.31 CATEGORY KEY CREATE / ROUTE IMPLEMENTATION

> **Date:** 2026-08-15  
> **Status:** **COMPLETE** · **SAFE / A ONLY**  
> **HTTP = 0 · Research = 0 · Accept = 0 · CatalogWork = 0 · Commit = 0 · Push = 0**  
> **Artifacts:** `.tmp/p531-category-key-create.json` · `.tmp/p531-category-key-create-FULL.md`

---

## BEFORE → AFTER

| | Before (P5.30) | After (P5.31) |
|--|--|--|
| Allowlist entries | 5 | **9** |
| `flooring` URL | NONE | **kb_pl** national panels labor |
| `repairs_wall` | type absent | **created + kb_pl URL** |
| `repairs_opening` | type absent | **created + kb_pl URL** |
| `joinery_finish` | type absent | **created + CR stolarskie URL** |
| `repairs` umbrella URL | NONE | **still NONE** (OWNER_REVIEW / general) |
| Research / HTTP | 0 | **0** |

## Reconciliation

**PASS** — 65/65 groups · 105/105 lines · 0 dup · 0 missing · 0 orphan.

## Audit (65 groups)

| Status | n |
|---|---:|
| **OWNER_REVIEW** | **19** |
| **IMPLEMENTED** | **15** |
| **BLOCKED** | **30** |
| **UNRESOLVED** | **1** |

### IMPLEMENTED (PASS2_READY on SAFE key)

- G137 → `joinery` / CATEGORY_KEY_MISSING:- · PASS2_READY:joinery_finish
- G188 → `joinery` / CATEGORY_KEY_MISSING:- · PASS2_READY:joinery_finish
- G120 → `flooring` / PASS2_READY:flooring · CATEGORY_KEY_MISSING:-
- G128 → `flooring` / PASS2_READY:flooring · CATEGORY_KEY_MISSING:-
- G052 → `demolition` / PASS2_READY:repairs_opening · CATEGORY_KEY_MISSING:-
- G083 → `demolition` / PASS2_READY:repairs_opening · CATEGORY_KEY_MISSING:-
- G075 → `demolition` / PASS2_READY:repairs_wall · CATEGORY_KEY_MISSING:-
- G078 → `demolition` / PASS2_READY:repairs_wall · CATEGORY_KEY_MISSING:-
- G077 → `flooring` / PASS2_READY:flooring · CATEGORY_KEY_MISSING:-
- G088 → `flooring` / PASS2_READY:flooring · CATEGORY_KEY_MISSING:-
- G063 → `joinery` / CATEGORY_KEY_MISSING:- · PASS2_READY:joinery_finish
- G064 → `joinery` / CATEGORY_KEY_MISSING:- · PASS2_READY:joinery_finish
- G121 → `flooring` / PASS2_READY:flooring · CATEGORY_KEY_MISSING:-
- G082 → `demolition` / PASS2_READY:repairs_opening · CATEGORY_KEY_MISSING:-
- G084 → `demolition` / PASS2_READY:repairs_opening · CATEGORY_KEY_MISSING:-

### Created keys

- `repairs_wall`
- `repairs_opening`
- `joinery_finish`

### Reused keys

- `flooring` (type already existed — **ADD_ALLOWLIST_URL_ONLY**)

### Routes added

| Source | Key | URL |
|---|---|---|
| kb_pl | `flooring` | https://kb.pl/cenniki/uslugi/cennik-ukladania-paneli-podlogowych-w-calej-polsce/ |
| kb_pl | `repairs_wall` | https://kb.pl/cenniki/uslugi/cennik-wyburzania-scian-dzialowych/ |
| kb_pl | `repairs_opening` | https://kb.pl/cenniki/uslugi/cennik-wykucia-otworow-w-scianie-i-stropie-sprawdzamy-ceny/ |
| cennikremontow_pl | `joinery_finish` | https://cennikremontow.pl/uslugi-stolarskie-cennik/ |

## Explicitly NOT implemented

| Item | Reason |
|---|---|
| `repairs` general | OWNER_REVIEW |
| `repairs_electrical` | no unambiguous demontaż URL (≠ install electrical page) |
| `repairs_appliance` | no unambiguous demontaż URL |
| `repairs_finish` / `floor_trim` / `biocide` | MED / not A |
| `repairs_joinery` as separate key | covered via `repairs_opening` for ościeżnice HIGH |
| G187 numer lokalu | UNRESOLVED |
| 19 OWNER_REVIEW groups | blocked |

## Flooring

PACKAGE may use `flooring` labor host. **PACKAGE ↛ MATERIAL** shop price gate retained.

## Repairs model

Only **wall** + **opening** got keys+URLs. Remaining 7 P5.30 repairs families stay deferred.

## Tests

| Suite | Result |
|---|---|
| P5.31 create/route | **35/35** |
| P5.27-FIX | **39/39** |
| PASS2 wave-1 | **85/85** |
| P5.26-FIX | **30/30** |
| P5.26-E matcher | **21/21** |
| P5.25 domain | **40/40** |
| RW-03 | **16/16** |
| `npm run build` | **PASS** |

## STOP

**P5.31 COMPLETE.**

- **NIE** research · **NIE** HTTP · **NIE** Accept · **NIE** CatalogWork  
- **NIE** commit · **NIE** push  

Czekaj na **Owner Review** przed P5.32 research re-run.

**ABSOLUTE STOP.**
