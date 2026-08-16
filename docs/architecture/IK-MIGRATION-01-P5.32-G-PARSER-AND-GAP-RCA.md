# IK-MIGRATION-01 — P5.32-G PARSER AND GAP RCA

> **Date:** 2026-08-15  
> **Status:** **COMPLETE** · **AUDIT ONLY**  
> **HTTP / CODE / ACCEPT / WRITE / COMMIT / PUSH:** **0**  
> **Artifacts:** `.tmp/p532-g-gap-rca.json` · `.tmp/p532-g-gap-rca-FULL.md`

---

## 1. Executive summary

P5.32 RESEARCH RESUME pobrał preferowane strony PASS2 (**HTTP 200**, HTML niepusty).  
**Nie** było `unknown_category_key`. Edge działa.

**9× PARSER_EMPTY** = parser **nie zwrócił oferty** dopasowanej do nazwy pozycji BOQ po selective identity filter — **nie** dowód „braku ceny na rynku”.

**4× CKM** = świadomy fallback po `EMPTY_STREAK_LIMIT=3` na preferowanym źródle: kolejne hosty (sccot/extradom/kb bez `joinery_finish`) **nie mają** PASS2 dla tych kluczy → `CATEGORY_KEY_MISSING` **bez** HTTP.

**PRIMARY ROOT CAUSE (wspólny dla większości 13):**  
**B. CATEGORY_IDENTITY_MISMATCH** + **A. QUERY_TOO_NARROW** — strona kategorii (family-level) vs pełny opis KNR/BOQ jako `expectedNamePl`; `namesLooselyMatch` wymaga zgodności pierwszego tokenu.

**SECONDARY:** **G. CKM_ROUTING_LIMIT** (streak) · telemetry **H. DATA_MISSING** (brak HTML body / `rawRowCandidates` w artefaktach) · etykieta `PARSER_EMPTY` łączy identity-miss i selector-miss.

**RESEARCH RETRY (ślepy):** **NOT REQUIRED** — ten sam kontrakt dałby ten sam wynik.  
**Retry po zmianie query/identity:** tylko po osobnym Owner GO (nie w tym audycie).

---

## 2. Reconciliation

| Check | Value |
|---|---:|
| Queue groups | **13/13** |
| Queue lines | **18/18** |
| Results groups | 13 |
| Results lines | 18 |
| Duplicate | **0** |
| Missing | **0** |
| Orphan | **0** |
| Excluded scope (not in queue) | G077, G088 |

**PASS.**

---

## 3. Research quality scores

| Dimension | Score | Note |
|---|---|---|
| ROUTE QUALITY | **PASS** | Edge + PASS2 URLs 200; `unknown_category_key=0` |
| QUERY QUALITY | **FAIL** | Default = soft/slice BOQ (60/80); brak aliasów kategorii P5.31 |
| PARSER QUALITY | **WARN** | Selective identity OK by design; `PARSER_EMPTY` conflates causes; no `rawRowCandidates` logged |
| SOURCE QUALITY | **UNKNOWN→WARN** | Body size proves page returned; content vs BOQ **DATA_MISSING** without HTML store |
| IDENTITY QUALITY | **FAIL** | Family page ≠ line-level KNR wording |
| UNIT QUALITY | **WARN** | G084 `m` vs typowe m²/szt na stronach otworów |
| FALLBACK QUALITY | **WARN** | Streak→CKM na hostach bez PASS2 = oczekiwane, mało informacyjne |

---

## 4. Thirteen-group table

| GROUP | DOMAIN | UNIT | CATEGORY_KEY | SOURCE (preferred / used) | QUERY (runner) | HTTP | BODY | PARSER | FALLBACK | FINAL | RCA_CLASS |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| 137 | PACKAGE | szt | joinery_finish | CR / CR | BOQ slice „Założenie…klamek…” | 200 | YES (~223KB) | PARSER_EMPTY | — | RESEARCH_GAP | **A+B** |
| 188 | PACKAGE | szt | joinery_finish | CR / CR | „Założenie odbojników…” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **A+B** |
| 063 | LABOR | szt | joinery_finish | CR / CR | „Dopasowanie skrzydeł drzwiowych…” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **A+B** |
| 064 | LABOR | szt | joinery_finish | CR blocked | (no preferred HTTP) | — | NO | — | CKM (extradom, kb) | RESEARCH_GAP | **G** |
| 120 | PACKAGE | m2 | flooring | KB / KB | „Posadzki płytkowe…kamieni…” | 200 | YES (~36KB) | PARSER_EMPTY | — | RESEARCH_GAP | **B** (+A) |
| 128 | PACKAGE | m2 | flooring | KB / KB | „Warstwy wyrównawcze pod posadzki…” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **B** |
| 121 | PACKAGE | m2 | flooring | KB / KB | „Posadzki z paneli podłogowych” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **A** (+H) |
| 052 | LABOR | szt | repairs_opening | KB / KB | „Wykucie…ościeżnic…” | 200 | YES (~32KB) | PARSER_EMPTY | — | RESEARCH_GAP | **A+B** |
| 083 | LABOR | szt | repairs_opening | KB / KB | „Wykucie…kratek wentylacyjnych…” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **A+B** |
| 082 | LABOR | m2 | repairs_opening | KB / KB | „Wykucie otworów w ścianach…” | 200 | YES | PARSER_EMPTY | — | RESEARCH_GAP | **A** (+H) |
| 084 | LABOR | m | repairs_opening | KB blocked | — | — | NO | — | CKM (sccot, extradom) | RESEARCH_GAP | **G** |
| 075 | LABOR | m2 | repairs_wall | KB blocked | — | — | NO | — | CKM | RESEARCH_GAP | **G** |
| 078 | LABOR | m2 | repairs_wall | KB blocked | — | — | NO | — | CKM | RESEARCH_GAP | **G** |

Query reconstruction (runner): `laborQuery` / `packageQuery` → default `soft(desc).slice(0,60)` + `names:[desc.slice(0,80)]` — **brak** specjalnych aliasów dla P5.31 families w artefaktach.

---

## 5. Nine PARSER_EMPTY — analysis

### What artifacts prove

| Fact | Evidence |
|---|---|
| HTML received | `responseStatus: 200`, `responseSize` 32k–223k |
| HTML not empty | size ≫ 40 |
| PASS2 route OK | `discoveryMethod: PASS2_CATEGORY`, `categoryKey` set, URL = P5.31 allowlist |
| Offers returned to runner | **0** → `classifyWorkRateLookupEmpty` → **PARSER_EMPTY** |
| Shops used for LABOR/PACKAGE | **No** (CR/KB only on preferred hits) |

### What artifacts do **not** prove (→ DATA_MISSING)

- Czy w HTML były wiersze `<tr>` z cenami (`rawRowCandidates` **nie logowane**)
- Czy query / tokeny BOQ występują w HTML
- Czy problem to wyłącznie identity filter vs brak tabeli / inny format (JS-rendered) → **H** + possible **C/E** unproven

### Parser contract (code, read-only)

`parseWorkRateOffersFromHtml` zwraca **tylko** wiersze z `namesLooselyMatch` / exact alias.  
`namesLooselyMatch`: pierwszy token oczekiwanego opisu musi pasować do pierwszego słowa znalezionej nazwy + ≥60% tokenów.

Skutek: opis KNR „Założenie na nowym miejscu klamek…” **nie** złapie wiersza typu „Montaż okuć…” / „Usługi stolarskie…”, nawet jeśli strona ma ceny.

`classifyWorkRateLookupEmpty`: przy `offerCount===0` i PASS2 → zawsze **PARSER_EMPTY** (nawet przy identity-miss). To **etykieta**, nie dowód zepsutego selectora.

### Per-group (9)

| GROUP | Page topic (from URL) | Line topic | Dominant class |
|---|---|---|---|
| 137 | usługi stolarskie | klamki z szyldami | A+B |
| 188 | usługi stolarskie | odbojniki drzwiowe | A+B |
| 063 | usługi stolarskie | dopasowanie skrzydeł drzwiowych | A+B |
| 120 | **układanie paneli** | **płytki kamień sztuczny** | **B** (route family vs line) |
| 128 | układanie paneli | warstwa wyrównawcza cementowa | **B** |
| 121 | układanie paneli | posadzki z paneli | **A** (najbliższy; brak HTML → H dla selectora) |
| 052 | wykucie otworów | wykucie ościeżnic | A+B |
| 083 | wykucie otworów | kratki/drzwiczki | A+B |
| 082 | wykucie otworów | wykucie otworów w ścianach | A (+H) |

**Nie stwierdzono F. SOURCE_HAS_NO_MATCH** — brak dowodu z body, że strona nie zawiera żadnych cen.

---

## 6. Four CKM fallback — analysis

| GROUP | Preferred | Why no preferred HTTP | Fallback hosts | CKM meaning |
|---|---|---|---|---|
| 064 | CR `joinery_finish` | streak≥3 after G137/188/063 | extradom, kb_pl | **G** — hosts bez PASS2 joinery |
| 084 | KB `repairs_opening` | streak≥3 after G052/083/082 | sccot, extradom | **G** |
| 075 | KB `repairs_wall` | same KB streak (batch-02) | extradom, sccot | **G** — **wall URL nigdy nie fetch** |
| 078 | KB `repairs_wall` | same | sccot, extradom | **G** |

- CategoryKey preferowane **było** prawidłowe (kolejka + PASS2 na preferowanym źródle w grupach wcześniejszych).
- CKM **nie** oznacza braku klucza na Edge dla P5.31 — oznacza brak allowlisty PASS2 na **fallback** hostach.
- To **parser/streak limitation cascading**, nie „real missing category coverage” dla `repairs_wall` na KB.

**FIX_REQUIRED (doc only):** streak nie powinien spalać jedynego PASS2 hosta i oznaczać CKM na sccot/extradom jako równoważny wynik researchu.

---

## 7. Internal-first audit

| GROUP | INTERNAL | Note |
|---|---|---|
| All 13 | **NO_INTERNAL_MATCH** | Artefakt `internalOutcome` |
| 137,188 | soft hit Multiswitch antenowy rejected | poprawne (≠ joinery) |
| 120 | MEDIUM PACKAGE płyty drogowe — not Owner Knowledge | external eligible; nie BASE |
| 128 | MEDIUM koryto jezdni — rejected as unsafe reuse | OK |
| 084 | soft id `cc-p0c-w1-wykucie-bruzd` / 72.5 | **nie** użyte jako BASE (wykucie bruzd ≠ opening) — Owner lock zachowany |
| HTTP avoided by internal | **0** | z metryk batch |

---

## 8. Domain routing audit

| Check | Result |
|---|---|
| LABOR → KB/CR (not shops) | **ROUTING_OK** |
| PACKAGE → costorys | **ROUTING_OK** |
| PACKAGE ↛ MATERIAL shops | **ROUTING_OK** |
| flooring = układanie (G077/088 excluded) | **ROUTING_OK** (scope) |
| G120/128 on `flooring` panels URL | **ROUTING_OK** per P5.31 key assign · **IDENTITY WARN** vs page topic |
| repairs_wall / opening / joinery ≠ painting/bruzdy/shops | **ROUTING_OK** |

---

## 9. Special cases

| Rule | Status |
|---|---|
| flooring ≠ demontaż | PASS (077/088 out) |
| flooring ≠ cena paneli sklepowa | PASS (KB labor page; no shop) |
| G120 płytki ≠ panele page | WARN → class **B** |
| repairs_wall = wyburzanie | PASS route; HTTP never for 075/078 |
| repairs_opening ≠ zaprawianie/bruzdy | PASS (084 rejected grooves internal) |
| joinery ≠ general painting | PASS (CR stolarskie URL) |

---

## 10. Root cause verdict

| | Verdict |
|---|---|
| **PRIMARY** | **A. QUERY_TOO_NARROW** + **B. CATEGORY_IDENTITY_MISMATCH** (wspólne dla ≥9/13) |
| **SECONDARY** | **G. CKM_ROUTING_LIMIT** (4) · **H. DATA_MISSING** (HTML/`rawRowCandidates`) · possible **C/E** unproven |
| **NO BUGS FOUND** | Edge allowlist · domain shops gate · Owner locks · no invent/Accept |
| **FIX_REQUIRED** | (1) Telemetry: `rawRowCandidates` + optional HTML artifact for RCA · (2) Category-level query/alias strategy Owner GO · (3) Streak policy vs single PASS2 host · (4) Review G120/G128 vs panels URL identity |
| **RESEARCH RETRY REQUIRED** | **No** (blind) |
| **RESEARCH NOT REQUIRED** | To claim market empty |
| **False positives** | Calling 4× CKM „missing category on Edge” — **false**; Edge has keys |

---

## 11. Research efficiency

| Metric | Value |
|---|---:|
| HTTP executed | **9** |
| HTTP avoided by internal (proven) | **0** |
| Preferred PASS2 fetches that returned body | 9 |
| Speculative ROI | **not claimed** |

---

## 12. STOP

**P5.32-G COMPLETE.**

- Nie research retry · nie P5.33 · nie Accept · nie Create/Bind · nie P6  
- Nie commit · nie push  

Czekaj na **Owner Review**.
