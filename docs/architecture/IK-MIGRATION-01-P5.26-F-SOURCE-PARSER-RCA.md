# IK-MIGRATION-01 — P5.26-F SOURCE PARSER / CATEGORYKEY RCA

> **TRYB:** AUDIT + RCA ONLY  
> **Date:** 2026-08-15  
> **Status:** COMPLETE — **NO FIX · NO HTTP · NO CODE · NO COMMIT**  
> **HTTP research = 0 · Accept = 0 · Writes = 0 · Create = 0**  
> **Artifacts:** `.tmp/p526-f-source-parser-rca.json` · `.tmp/p526-f-source-parser-rca-FULL.md` · `.tmp/p526-f-source-parser-rca-probes.json`  
> **Prior:** BATCH-01 CLOSED (26/26) · CONTINUATION BLOCKED BY RCA

---

## 1. Executive summary

BATCH-01 miał **42× HTTP 200**, **0 błędów sieciowych** i **0 candidates**, bo ścieżka researchu:

1. zawsze trafiała w **4 kanoniczne URL PASS1** (miejski / ogólny cennik),
2. **nigdy** nie użyła **PASS2 category URL** (0/42),
3. parser zwraca tylko wiersze z **identity match** (`namesLooselyMatch`) — brak match = `PARSE_EMPTY`,
4. runner myląco nazywa to „SOURCE_NO_MATCH”, choć to oznacza wyłącznie: **obecna ekstrakcja nie znalazła candidate**.

**Nie udowodniono**, że „na rynku nie ma ceny”.

| | |
|---|---|
| **PRIMARY ROOT CAUSE** | **C. CATEGORY_KEY** (+ brak PASS2 w całym BATCH-01) |
| **SECONDARY** | **E. IDENTITY / NORMALIZATION** · **B. QUERY_BUILDER** (regex bez soft) · **D. PARSER** (conflation EMPTY) |
| **Confidence** | **HIGH** (ścieżka URL/category) · **MEDIUM** (brak pozycji na PASS1) · **LOW** (zmiana struktury HTML) |
| **Recommended next** | **P5.26-FIX** (Owner GO) — nie wznawiać BATCH-02 research |

---

## 2. G087 full trace

| Step | Value |
|------|-------|
| BOQ description | `Zamurowanie przebić w ścianach z cegieł o grubości 1/2 ceg.` |
| domain | `LABOR` |
| unit raw → mapped | `szt` → `szt` OK |
| researchKey | `LABOR\|szt\|zamurowanie przebic w scianach z cegiel o grubosci 1 2 ceg` |
| normalized query | `zamurowanie przebic w scianach z cegiel o grubosci 1 2 ceg` |
| categoryKey (runner) | **`null`** — brak reguły laborQuery dla zamurowania; brak PASS2 `masonry` |
| sources tried (diag) | `kb_pl`, `cennikremontow_pl` |
| URL | PASS1 only: KB Wrocław remony · CR Wrocław remony |
| HTTP | **200** · body ~49 521 / ~264 936 B · Edge OK |
| parser input | full HTML body |
| parser path | markers → none → `<tr>` tables → `parseTableRowCandidate` → `namesLooselyMatchAny` |
| extracted candidates | **0** |
| final class (diag) | labeled `SOURCE_NO_MATCH` |
| **precise class** | **`PARSER_NO_MATCH` ∪ possible `REAL_SOURCE_NO_MATCH` on PASS1 page** — **not proven which** |

Offline probe: na **syntetycznej** tabeli z wierszem „Zamurowanie otworów w ścianie” parser **znajduje** offer przy alternate `zamurowanie otworów`.  
Wniosek: **parser nie jest globalnie martwy**; live PASS1 albo nie ma wiersza, albo struktura nie daje `<tr>`+ceny+jednostki, albo identity nie trafia synonimów.

---

## 3. Second-domain comparison (G090 PACKAGE)

| | G087 LABOR | G090 PACKAGE |
|--|------------|--------------|
| domain | LABOR | LABOR_MATERIAL_PACKAGE |
| unit | szt OK | **`msc` → mapped `msc`** (nie `szt`/`kpl`) |
| query helper | soft fallback | `packageQuery` → `wymiana podejścia PVC` |
| categoryKey | null | **null** (package path nie ustawia PASS2) |
| BATCH-01 sources | kb + cennik (rotacja) | **sccot + extradom** |
| URLs | PASS1 | PASS1 only |
| CR plumbing PASS2 | nie użyte | **nie użyte** (mimo allowlist `cennikremontow_pl:plumbing`) |
| result | PARSE_EMPTY | PARSE_EMPTY |

**Wniosek:** problem jest **GLOBALNY dla ścieżki PASS1+identity**, nie tylko LABOR. PACKAGE nie dostał lepszego routingu category.

---

## 4–7. Source-by-source

### KB (`kb_pl`)

| | |
|--|--|
| Adapter | Edge `work-rate-selective-lookup` + `parseWorkRateOffersFromHtml` |
| Query format | semantyczny (match w parserze) — **nie buduje URL** |
| categoryKey PASS2 | tylko `grooves`, `plaster` — **brak plumbing / masonry** |
| BATCH-01 URL | wyłącznie `…/remonty-mieszkan/wroclaw/` |
| Result | PARSE_EMPTY / PARSE_EMPTY_OR_IDENTITY ×11 HTTP |
| Reason | PASS1 generic + selective identity; brak category dla zamurowania |

### CennikRemontow (`cennikremontow_pl`)

| | |
|--|--|
| PASS2 allowlist | painting · electrical · **plumbing** |
| BATCH-01 URL | wyłącznie `…/wroclaw-remonty-cennik/` — **0× plumbing PASS2** |
| Result | empty ×11 |
| Reason | categoryKey nie dochodził / nie ustawiony; PASS1 overview |

### SCCOT (`sccot`)

| | |
|--|--|
| PASS2 | **brak** (allowlist null) |
| URL | stały artykuł cennik usług |
| Result | empty ×10 |
| Reason | tylko PASS1 + identity; te same limity ekstrakcji |

### Extradom (`extradom`)

| | |
|--|--|
| PASS2 | **brak** |
| URL | stały artykuł poradnikowy |
| Result | empty ×10 |
| Reason | j.w. |

**Unikalne URL w całym BATCH-01: dokładnie 4** (= kanoniczne PASS1). Zero diversity category.

---

## 8. Query diagnosis

- Soft normalize działa (`ł→l`, `ą→a`).
- `buildWorkRateSelectiveRequestUrl` **ignoruje treść query** przy budowie URL (by design).
- Runner `laborQuery` regexy często na **raw** BOQ z polskimi znakami:
  - G013: `/demontaz.*rurociag/i.test("Demontaż…")` = **false**
  - po soft = **true** → gdyby soft przed regex, `categoryKey=plumbing`
- G087: brak specjalnej reguły → soft slice + `categoryKey=null`.

**Klasa:** `QUERY_BUILDER_MISMATCH` (częściowo) + by-design URL decoupling.

---

## 9. categoryKey diagnosis

| Fakt | |
|------|--|
| PASS2 entries | kb: grooves, plaster · CR: painting, electrical, plumbing |
| BATCH-01 PASS2 hits | **0** |
| G087 needed family | masonry / wall repair — **brak w allowlist** |
| G090 needed | plumbing — **istnieje dla CR**, nie użyte |
| G013 | plumbing mógłby być ustawiony, gdyby regex na soft |

**Klasa PRIMARY:** `CATEGORY_KEY_MISMATCH` / incomplete routing.

---

## 10. Parser diagnosis

- Ścieżka: `data-wgdom-work-rate` markers **lub** `<tr>` + cells + price + unit.
- Match: `namesLooselyMatch` — **pierwszy token** musi prowadzić nazwę znalezioną; ≥60% tokenów.
- `parseWorkRateOffersFromHtml` zwraca **tylko** identity-matched → 0 offers = jedna etykieta.
- Runner: `PARSE_EMPTY` / `PARSE_EMPTY_OR_IDENTITY` / diag `SOURCE_NO_MATCH` — **conflation**.
- Test offline `test-work-rate-real-world-validation-03.mjs`: **16 PASS / 0 FAIL** (fixtures) → parser działa na znanym HTML.

**Klasa:** `PARSER_NO_MATCH` (operational) — nie udowodniono `SOURCE_STRUCTURE_CHANGED`.

---

## 11. Identity diagnosis

| Probe | Result |
|-------|--------|
| `zamurowanie przebić` vs `Zamurowanie otworów w ścianie` | **false** |
| alternate `zamurowanie otworów` vs ta sama | **true** (synth offer found) |
| unit `msc` (G090) | **nie mapowane** → ryzyko qualify/unit później |

**Klasa:** `IDENTITY_MISMATCH` risk gdy synonim nie jest w `names[]`.

---

## 12. Root cause classification

| Code | Role | Evidence |
|------|------|----------|
| **C. CATEGORY_KEY** | **PRIMARY** | 0/42 PASS2 · 4-only URLs · G090 nie hit CR plumbing · G087 brak masonry key |
| **E. IDENTITY / NORMALIZATION** | SECONDARY | loose match fail na synonimach; `msc` unmapped |
| **B. QUERY_BUILDER** | SECONDARY | laborQuery regex na raw z diakrytykami (G013) |
| **D. PARSER** | SECONDARY (ops) | conflates empty rows vs no-identity; works on fixtures |
| A. REAL_SOURCE_NO_MATCH | **NOT PROVEN** | brak dump wierszy z live HTML |
| F. SOURCE_STRUCTURE_CHANGED | **NOT PROVEN** | HTTP 200 + large HTML; RW-03 fixtures PASS |
| G. MULTIPLE SOURCE FAILURES | observed symptom | wszystkie 4 źródła empty z tej samej architektury PASS1 |
| H. UNKNOWN | — | — |

---

## 13. Confidence RCA

| Claim | Confidence |
|-------|------------|
| Research path = PASS1-only + selective identity | **HIGH** |
| categoryKey/PASS2 nie użyte w BATCH-01 | **HIGH** |
| „Parser całkowicie zepsuty” | **LOW** (fixtures + synth PASS) |
| „Źródła nie mają żadnej ceny zamurowania” | **LOW / NOT PROVEN** |
| Diakrytyki w laborQuery blokują categoryKey | **HIGH** (repro offline G013) |

---

## 14. Evidence

- `.tmp/p526-f-batch-01-results.json` — 26 GAP, 4 unique URLs  
- `.tmp/p526-f-source-diagnostic-087.json` — HTTP 200, PARSE_EMPTY  
- `.tmp/p526-f-source-parser-rca-probes.json` — offline probes  
- `src/lib/work-catalog/work-rate-source-html-parse.ts` — URL ignores query  
- `src/lib/work-catalog/work-rate-discovery-allowlist.ts` — PASS2 list  
- `scripts/test-work-rate-real-world-validation-03.mjs` — 16 PASS fixtures  
- Runner `.tmp/p526-f-continuous-run.mjs` — laborQuery / packageQuery  

---

## 15. What is NOT proven

- Że KB/CR/SCCOT/Extradom **nie zawierają** cen dla tych robót na innych URL.  
- Że struktura HTML PASS1 „się zepsuła” vs fixtures.  
- Ile wierszy `<tr>` faktycznie wyekstrahowano z live body (brak row-count w telemetry).  
- Że INTERNAL-FIRST mógłby trafić (0 hit — osobny temat katalogu, nie źródła).  

---

## 16. Recommended next action

**NIE** wznawiać BATCH-02 research.

Osobny Owner GO **P5.26-FIX** (design only → potem implement):

1. Telemetry: rozdziel `PARSER_NO_ROWS` vs `PARSER_IDENTITY_MISS` vs `SOURCE_NO_MATCH`.  
2. categoryKey: soft-normalize przed regex; mapowanie family → PASS2; PACKAGE plumbing → CR PASS2.  
3. Allowlist: decyzja Owner czy masonry/zamurowanie dostaje PASS2 URL.  
4. Unit: `msc` → polityka mapowania.  
5. Opcjonalnie: offline HTML snapshot + row inventory **zanim** kolejny HTTP batch.

---

## Status

| | |
|--|--|
| P5.26-F BATCH-01 | **CLOSED** (42 HTTP final) |
| P5.26-F CONTINUATION | **BLOCKED BY RCA** |
| FIX / RESUME | **czekają na osobny Owner GO** |
| COMMIT / PUSH | **0** |
