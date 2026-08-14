# IK-MIGRATION-01 P2.75-B — Owner dwelling map → Master BOQ READY

> **STATUS:** COMPLETE (harness Gate B PASS · prod UI map still Owner-applied locally)  
> **Date:** 2026-08-15  
> **Tip:** 2.66.64  
> **Real tender:** `08def45d-ead6-5db8-962b-120001d33d37`

## Owner map (explicit — not silent filename SSOT)

| dwellingId | labelPl | artifacts |
|------------|---------|-----------|
| `kotlarska` | Kotlarska | SANITARNY ATH + budowlany XML |
| `nasturcjowa` | Nasturcjowa | SANITARNY ATH + el ATH (empty→EXCLUDE) + budowlany XML |
| `ptasia` | Ptasia | SANITARNY + el + budowlane ATH |
| `zernicka` | Żernicka | SANITARNY + bud + el ATH |
| `common_wentylacja` | Wentylacja / zakres wspólny | 2× PDF wentylacja |

Applied via `applyExplicitOwnerDwellingMap` (same APIs as `MultiDwellingPackagePanel`).

## Line integrity

| Metric | Value |
|--------|-------|
| RAW rows (P2.5) | **484** |
| Extractable (merge path) | **444** |
| Composed Master | **430** |
| KEEP ONE explained | **14** (wentylacja + intra) |
| RAW_ROW_SKIP explained | **40** (empty LP/opis) |
| Unexplained loss | **0** |
| Unexplained dup | **0** |
| Master BOQ | **READY** |

## Fixes required after Owner map (no new parser)

1. `inferBranchHint` — `budowlany` / token `el`
2. `resolve` — empty parse → `EXCLUDE_EMPTY_PARSE` (continue)
3. `merge` — sanitize corrupt XML LP markup
4. Document Expert — raw vs extractable explained when integrity OK

## Production note

`ikEntryEnabled` remains **OFF**. Owner must still confirm the same map in Hub `MultiDwellingPackagePanel` on their browser LS (`kw-multi-dwelling-package-v1`) when enabling IK locally.
