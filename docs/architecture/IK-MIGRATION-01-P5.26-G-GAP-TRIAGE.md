# IK-MIGRATION-01 — P5.26-G GAP TRIAGE / RESEARCH RESULT AUDIT

> **Date:** 2026-08-15  
> **Status:** **P5.26-G COMPLETE** · **QUEUE = TRIAGED**  
> **Mode:** AUDIT ONLY · READ-ONLY  
> **HTTP = 0 · CODE = 0 · ACCEPT = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0**  
> **Evidence:** P5.26-F continuous closeout + BATCH-01…12 results · `.tmp/p526-f-continuous-progress.json`  
> **Outputs:** `.tmp/p526-g-gap-triage.json` · `.tmp/p526-g-gap-triage-FULL.md` · `.tmp/p526-g-owner-review.md`

---

## Executive

Po P5.26-F (**128/128**, remaining **0**, HTTP **74**, candidates **0**) wszystkie grupy zakończyły się `RESEARCH_GAP`.  
**GAP ≠ brak ceny na rynku.** Triage rozłożył GAP na przyczyny pipeline / ścieżki / streak / correct reject.

| Werdykt | Wartość |
|--------|--------:|
| Reconciliation | **PASS** |
| P5.26-G | **COMPLETE** |
| Queue | **TRIAGED** |
| Następny research / P5.27 / Accept | **STOP — tylko Owner GO** |

---

## 1. Reconciliation (GATE)

| Check | Result |
|-------|--------|
| TOTAL INPUT | **128** |
| Results rows (BATCH-01…12) | **128** |
| Unique `groupNo` | **128** |
| Progress `groupsCompleted` | **128** |
| Duplicates | **0** |
| Missing | **0** |
| Re-processed without reason | **0** (każda grupa dokładnie raz w artefaktach F) |

**PASS → triage kontynuowany.**

Źródła: `.tmp/p526-f-batch-01-results.json` … `batch-12` · `.tmp/p526-f-continuous-progress.json` · queue SSOT `.tmp/p526-f-research-queue.json`.

---

## 2. Final metrics

| Metric | Count |
|--------|------:|
| TOTAL GROUPS | **128** |
| CURRENT EXACT | **0** |
| INTERNAL SAFE | **0** |
| INTERNAL REVIEW | **0** |
| RESEARCH SUCCESS | **0** |
| PARSER_EMPTY | **20** |
| CATEGORY_KEY_MISSING | **97** |
| QUERY_FAILURE | **0** |
| SOURCE_NO_MATCH | **0** |
| SOURCE_UNAVAILABLE | **11** *(primary = `SOURCE_UNHEALTHY`)* |
| CORRECT_REJECT | **9** *(overlay P4; primary nadal CKM/PARSER_EMPTY)* |
| OWNER_REVIEW | **40** *(rodziny, nie grupy)* |
| INSUFFICIENT_EVIDENCE | **0** |
| OTHER | **0** |
| HTTP TOTAL (F) | **74** |
| Candidates | **0** |
| Accept | **0** |
| Writes | **0** |
| Invented | **0** |
| Code (G) | **0** |
| Commit | **0** |
| Push | **0** |

### Priority buckets (grupy)

| P | Groups | Znaczenie |
|---|-------:|-----------|
| **P0** | 64 | Naprawa pipeline / allowlist **przed** kolejnym researchem |
| **P1** | 44 | Warto ponowić research **po** poprawnej ścieżce (FIX / identity / page scope) |
| **P2** | 11 | Research możliwy, niski priorytet (głównie source unhealthy) |
| **P3** | 0 | — |
| **P4** | 9 | Correct reject / no action |

### Domains

| Domain | Groups |
|--------|-------:|
| LABOR | 69 |
| LABOR_MATERIAL_PACKAGE | 48 |
| MATERIAL | 11 |

---

## 3. Primary reason rollup

| PRIMARY_REASON | Groups | Interpretacja |
|----------------|-------:|---------------|
| **CATEGORY_KEY_MISSING** | **97** | Brak / nieprawidłowy `categoryKey` lub ścieżka pre-FIX PASS1 (B01) / FAMILY_UNKNOWN → **nie** „brak ceny” |
| **PARSER_EMPTY** | **20** | HTTP OK + PASS2 + `categoryKey` + 0 offers — parser nic nie wyciągnął (**≠** market absence) |
| **SOURCE_UNHEALTHY** | **11** | Źródło wykluczone / unhealthy · HTTP 0 |
| SOURCE_NO_MATCH | **0** | Świadomie **nie** nadane bez pełnej ścieżki PASS2+category+200 |
| QUERY_BUILD_FAILURE | **0** | — |

### Po batchu

| Batch | CKM | PARSER_EMPTY | SOURCE_UNHEALTHY |
|-------|----:|-------------:|-----------------:|
| 01 | 26 | 0 | 0 |
| 02 | 6 | 6 | 0 |
| 03 | 6 | 6 | 0 |
| 04 | 7 | 1 | 0 |
| 05 | 5 | 3 | 0 |
| 06 | 3 | 1 | 0 |
| 07 | 14 | 3 | 2 |
| 08 | 4 | 0 | 4 |
| 09 | 9 | 0 | 0 |
| 10 | 3 | 0 | 5 |
| 11 | 8 | 0 | 0 |
| 12 | 6 | 0 | 0 |

**BATCH-01:** wszystkie **26** → `CATEGORY_KEY_MISSING` (PASS1 / pre-FIX RCA + streak skip). Secondary: `PARSER_EMPTY_ON_PASS1_PRE_FIX` lub `STREAK_SKIP_PRE_FIX`.

---

## 4. Klasyfikacja — reguły zastosowane

### SOURCE_NO_MATCH (ścisłe)

Nadane **tylko** gdy: domain OK · `categoryKey` OK · query OK · parser dostał właściwą odpowiedź · zakres sprawdzony (PASS2).  
W tym zbiorze: **0**.  
Etykiety legacy `emptyReason=SOURCE_NO_MATCH` / `SOURCE_NO_MATCH_STREAK` **nie** kwalifikują bez proper path.

### PARSER_EMPTY

Przykład (B02+): `discoveryMethod=PASS2_CATEGORY`, `categoryKey=plumbing|plaster`, `emptyClass=PARSER_EMPTY`.  
→ **nie** interpretować jako „nie ma ceny na rynku”.

### CATEGORY_KEY_MISSING

- B01 pre-FIX (category null / PASS1 only)  
- B02+ `emptyClass=CATEGORY_KEY_MISSING` / `FAMILY_UNKNOWN`  
→ **FUTURE FIX / RESEARCH AFTER FIX** · **bez** retry teraz.

### Correct reject (P4)

Near-match odrzucony prawidłowo (emulsja ≠ wapno / olej):

`G018, G020, G040, G073, G078, G082, G108, G109, G140`  
→ **CORRECT_REJECT** · **nie** MISSING_REUSE · **nie** forsować INTERNAL HIT.

Hard gates zachowane (bez zmian kodu): PACKAGE ↛ MATERIAL/LABOR · LABOR ↛ PACKAGE · MATERIAL ↛ PACKAGE · głowica ≠ grzejnik · emulsja ≠ wapno/olej · stolarka ≠ ogólne malowanie · wykucie ≠ zaprawianie.

### INTERNAL-FIRST

Kolejka F = residual `NO_INTERNAL_MATCH` → CURRENT/INTERNAL w tym zestawie **0**.  
**INTERNAL-FIRST PROCESS VIOLATION: 0** (brak `INTERNAL_*` + HTTP>0).

### Owner knowledge

Nie rozszerzano seedów **72.5 / 13.5 / 21.8 / 97.3** na podobne pozycje. Brak invent cen.

---

## 5. Semantic families (skrót)

90 rodzin — pełna lista: `.tmp/p526-g-gap-triage-FULL.md`.

Największe (n≥3):

| FAMILY | n | PRIMARY | ACTION |
|--------|--:|---------|--------|
| wywiezienie gruzu… (m3) | 6 | CKM | FUTURE_FIX_THEN_RESEARCH |
| demontaż (m) | 5 | CKM | FUTURE_FIX_THEN_RESEARCH |
| tynkowanie (PACKAGE m) | 4 | CKM | FUTURE_FIX_THEN_RESEARCH |
| tynkowanie (LABOR m2) | 4 | CKM | FUTURE_FIX_THEN_RESEARCH |
| pomiary | 4 | CKM | FUTURE_FIX_THEN_RESEARCH |
| montaż rurociąg | 3 | PARSER_EMPTY | RESEARCH_AFTER_IDENTITY_OR_PAGE_SCOPE |
| przewody kabelkowe… | 3 | PARSER_EMPTY | RESEARCH_AFTER_IDENTITY_OR_PAGE_SCOPE |
| wymiana podejścia z rur | 3 | CKM | FUTURE_FIX_THEN_RESEARCH |
| malowanie wapienne / olejnie | — | CKM/PE + **P4** | CORRECT_REJECT_NO_ACTION |

---

## 6. Co warto / nie warto badać ponownie

| Bucket | Do | Nie |
|--------|----|-----|
| **P0** | Fix allowlist / category route (już częściowo P5.26-FIX; B01 nie re-run) | Blind HTTP retry |
| **P1** | Po FIX: B01 residual + PARSER_EMPTY z identity/synonym / Owner-curated PASS2 URL | Invent + Accept |
| **P2** | Opcjonalnie gdy źródło wróci healthy | Traktować unhealthy jako „brak ceny” |
| **P4** | — | Ponowny research wapno/olej jako emulsja |

**Nie uruchamiać teraz:** P5.27 · mass research · Accept · CREATE · Bind · pricing writes.

---

## 7. OWNER REVIEW

Plik: `.tmp/p526-g-owner-review.md` — **40 rodzin**, `DECYZJA: PENDING`.  
Nie pytamy o każdą grupę — decyzje **rodzinami**.

Format: RODZAJ · GRUPY · PROBLEM · PROPOZYCJA · DECYZJA=PENDING.

---

## 8. Potencjalne bugi (tylko dokumentacja — ZERO FIX)

1. **B01 nie był re-run po P5.26-FIX** — residual 26 grup nadal pre-FIX evidence; pilot G087/G090 (osobny) pokazał PASS2→PARSER_EMPTY, ale **nie** zastępuje artefaktów F.  
2. **Streak CB** w B01: HTTP=0 z `SOURCE_NO_MATCH_STREAK` — myląca nazwa vs właściwa przyczyna CATEGORY_KEY (RCA).  
3. **Legacy `emptyReason=SOURCE_NO_MATCH`** przy PARSE_EMPTY na PASS1 — conflation; triage G **nie** promuje do SOURCE_NO_MATCH.  
4. Brak wzmocnienia `SOURCE_NO_MATCH` SSOT w wynikach F przy proper path — w tym przebiegu **0** udokumentowanych właściwych NO_MATCH.

---

## 9. Safety checklist (G)

| Gate | |
|------|--|
| HTTP | **0** |
| Code / parser / matcher / category map / adapter | **0** |
| Accept / CREATE / Bind / KV / DB writes | **0** |
| Commit / Push | **0** |
| P5.27 / re-research | **STOP** |

---

## 10. Decision

**P5.26-G = COMPLETE**  
**QUEUE = TRIAGED**  

Owner widzi: większość GAP = **CATEGORY_KEY_MISSING** (97) · prawdziwy parser empty po FIX path = **20** · unhealthy = **11** · **SOURCE_NO_MATCH = 0** · correct reject = **9** · research success w kolejce F = **0**.

**ABSOLUTE STOP AFTER TRIAGE.**
