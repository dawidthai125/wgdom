# DESIGN FREEZE — WR-LABOR-EVIDENCE-QUALITY-01

> **Epic:** `WR-LABOR-EVIDENCE-QUALITY-01`  
> **Parent:** WR-PASS2-ALLOWLIST-WAVE-1 (prod tip **2.66.52** / **`0c49c87d`**) · LIVE RESEARCH / COVERAGE VALIDATION  
> **Stage:** **DESIGN FREEZE APPROVED** · **IMPLEMENT D1 = LOCAL GREEN** (undeployed)  
> **Status:** **DESIGN FREEZE = APPROVED** · **IMPLEMENT = GREEN (local)** · **COMMIT = NOT DONE**  
> **Date:** 2026-08-14  
> **SOURCE GAP:** **OPEN**  
> **NICHE:** **NOT CLAIMED**  
> **Next:** `OWNER GO: COMMIT — WR-LABOR-EVIDENCE-QUALITY-01`  
> **Local tip:** **2.66.53** (changelog) · prod tip remains **2.66.52** / **`0c49c87d`** until commit/push

```text
DESIGN FREEZE          = THIS FILE
IMPLEMENTATION         = ZERO until Owner GO IMPLEMENT
COMMIT / PUSH / DEPLOY = FORBIDDEN in this stage
KV / ACCEPT / OUR RATE = FORBIDDEN
MARGIN / SEED          = FORBIDDEN
PASS2 MAX / HOSTS      = LOCKED UNCHANGED
F5 / mapper / qualify / median engine = LOCKED (no global rewrite)
namesLooselyMatch threshold = LOCKED (no loosen to “fix plaster”)
```

---

## LOCK ACKNOWLEDGEMENT

```text
OWNER GO: DESIGN FREEZE — WR-LABOR-EVIDENCE-QUALITY-01
SSOT: this file
Date: 2026-08-14
ZERO CODE · ZERO KV · ZERO ACCEPT · ZERO OUR RATE WRITE
ZERO MARGIN WRITE · ZERO SEED · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
```

---

## 1. LIVE baseline

| Item | Value |
|------|--------|
| Production tip | **2.66.52** / **`0c49c87d`** |
| Edge PASS2 | SUCCESS (workflow `31807994243`) |
| PASS2 Wave-1 | kb `grooves`+`plaster` · CR `painting` · MAX=**2** |
| Artefakt LIVE | `.tmp-catalog-ui-unification-pv/live-pass2-wave1-coverage-report.json` |

| Case | PASS2 routed | Fetch | Identity / evidence | Candidate | marketBase | Region |
|------|--------------|-------|---------------------|-----------|------------|--------|
| **GROOVES** `cc-p0c-w1-zaprawianie-bruzd` | YES | YES | YES (synonym exact) | **YES** | **20** (15–25 mid) | **POLSKA** |
| **PLASTER** `legacy-gladzie_tynki-m2` | YES | HTTP 200 | **FAIL** PARSE_EMPTY | **NO** | — | — |
| **PAINTING** `legacy-malowanie-m2` | YES | YES | YES but **over-broad** | **YES** | **68.5** (polluted) | WROCLAW prefer |

**Interpretacja:**

- Pipeline PASS2 → fetch → qualify → Candidate **działa** (grooves, painting).
- Plaster: problem **nie** jest allowlistą / URL / MAX / regionem NATIONAL.
- Painting: Candidate ≠ „dobry” marketBase dla typowych ścian (16–26); silnik dostał semantycznie mieszany pool.

**Katalog docelowy (kontekst produktu):** nie tylko bruzdy — malowanie, gładzie/tynki, elektryka, hydraulika, biały montaż, demontaż, odpady, itd. Ten epic naprawia **jakość evidence identity** jako warunek dalszego pokrycia.

---

## 2. Plaster root cause

### 2.1 Facts

| Fact | Detail |
|------|--------|
| workId | `legacy-gladzie_tynki-m2` |
| namePl | `Gładzie / tynki (m2)` |
| family | `plaster` (routing OK) |
| PASS2 | `kb_pl` / `plaster` |
| URL | `https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/` |
| HTTP | 200 · body non-empty |
| Owner synonyms attached | **none** (`listWorkRateMatchNamesPl` → tylko namePl) |
| offerCount on PASS2 page | **0** (parser znalazł 0 identity match) |

### 2.2 Mechanism (bez zmiany threshold)

`namesLooselyMatch` (LOCKED):

1. Normalizacja; tokeny oczekiwane `length > 3`.  
2. Dla `Gładzie / tynki (m2)` → tokeny ok. **`gladzie`**, **`tynki`**.  
3. Pierwszy token źródła musi odpowiadać `gladzie`.  
4. ≥ 60% tokenów oczekiwanych musi trafić w słowa źródła → tu **ceil(2×0.6)=2** → **oba** tokeny wymagane.

**Źródło L1 (labor-only) — przykładowe wiersze:**

| Usługa (KB) | Dlaczego nie matchuje namePl |
|-------------|------------------------------|
| Gładzenie ścian | ma rdzeń gładź/gładzenie, **brak** tokenu `tynki` → hit &lt; 2 |
| Jednokrotne / Dwukrotne szpachlowanie ścian | first token ≠ `gladzie` |
| Szlifowanie gładzi gipsowej | first ≠ `gladzie` / brak obu tokenów |
| Gruntowanie | inna usługa |
| Tynkowanie… (sekcja L+M) | materials + first token / scope |

**Probe (2026-08-14):** wszystkie próbki (`Gładź gipsowa`, `Szpachlowanie ścian`, `Tynk gipsowy`, …) → `namesLooselyMatch("Gładzie / tynki (m2)", …) = false`.

### 2.3 Semantic conclusion

Bucket katalogowy **„Gładzie / tynki”** jest **złożony** (dwa rodzaje prac).  
Źródło rozdziela: **gładzenie**, **szpachlowanie 1×/2×**, **szlifowanie**, (osobno) **tynk**.

→ **NIE** traktować automatycznie całego bucketa jako jednej usługi.  
→ **NIE** luzować globalnego `namesLooselyMatch`.  
→ **TAK** Owner-curated identity / subfamilies / aliases **tylko** dla równoważnych pozycji.

### 2.4 Forbidden plaster matches

| Forbidden | Reason |
|-----------|--------|
| `szpachlowanie bruzd po kablach` | grooves KEEP (Wave-1 / KB-BRUZDY) |
| bare `szpachlowanie bruzd` | not approved |
| tynk elewacyjny / ETICS | inna tożsamość |
| L+M table as preferred evidence | materials included |
| stiuk / dekoracyjne tynki | special |

---

## 3. Painting quality root cause

### 3.1 Facts

| Fact | Detail |
|------|--------|
| workId | `legacy-malowanie-m2` |
| namePl | `Malowanie (m2)` |
| family | `painting` |
| PASS2 | `cennikremontow_pl` / `painting` → `malowanie-cennik` |
| Candidate | YES · marketBase **68.5** · proposed **68.5** @ margin 0 |
| Typowe ściany/sufity (PASS2) | midpoints ~**16–26** PLN/m² |
| Outliers w tym samym poolu | artystyczne ~**374**, drzwi ~**155**, okna ~**274**, balustrady ~**112** |

### 3.2 Mechanism

`Malowanie (m2)` → pierwszy token **`malowanie`**.  
Każdy wiersz zaczynający się od „Malowanie …” przechodzi `namesLooselyMatch` (includes / first-token rule), **w tym**:

| Segment | Przykłady LIVE | Czy powinny być w poolu „ściany”? |
|---------|----------------|-----------------------------------|
| **A WALLS/CEILINGS** | Malowanie ścian 1×/2× biała/kolor · sufit 1×/2× | **TAK** (dla tego bucketa) |
| **B JOINERY/OBJECTS** | drzwi · okna · balustrady · rury | **NIE** (bezwarunkowo) |
| **C SPECIAL/ARTISTIC** | artystyczne · fantazyjne · dekoracyjne | **NIE** |

**Region:** silnik preferuje WROCLAW gdy są obserwacje city — legalne; **NATIONAL nie jest GAP**. Problem jakości ≠ brak Wrocławia.

**Nie** projektujemy `reject if rate > X`. Outlier ma wypaść przez **segment identity**, nie hard price cap.

---

## 4. Identity model (design)

```text
CatalogWork (workId, namePl, unit, family)
        │
        ▼
Identity Profile (Owner-curated)
  - identityKey
  - allowedSourcePhrases[] / Owner synonyms (exact / scoped)
  - evidenceScopeTag   (e.g. walls_ceilings | joinery | special | plaster_fill | …)
  - forbiddenPhrases[]
  - unit expect
  - notes / scope
        │
        ▼
SOURCE EVIDENCE row (future DB)
  - sourceId, url, region, laborOnly, range|point, …
  - matchedIdentityKey + scopeTag
        │
        ▼
Candidate pool = observations with SAME scopeTag as work profile
        │
        ▼
EXISTING median / qualify / marketBase (UNCHANGED formulas)
```

**Zasady:**

1. Matching pozostaje **Owner-curated** (+ istniejący algorithm) — **bez** lowering threshold.  
2. Synonym / phrase maps **do** scopeTag — nie „wszystko malowanie”.  
3. Compound buckets (`Gładzie / tynki`, `Malowanie`) wymagają **rozstrzygnięcia Ownera**: subfamily vs osobne workIds.  
4. Grooves alias exact **`szpachlowanie bruzd po kablach`** — **KEEP**; never reuse for plaster.

### 4.1 Proposed plaster identities (Owner review — not auto-approved)

| identityKey | Equivalence (source phrases) | Unit | Scope | Do NOT match |
|-------------|------------------------------|------|-------|--------------|
| `plaster.gladzenie_scian` | Gładzenie ścian · Gładź gipsowa (1 warstwa, labor) | m2 | fill_walls | szlifowanie-alone · L+M · elewacja · bruzdy |
| `plaster.szpachlowanie_1x` | Jednokrotne szpachlowanie ścian | m2 | fill_walls | bruzdy · ubytki-only (optional separate) |
| `plaster.szpachlowanie_2x` | Dwukrotne szpachlowanie ścian | m2 | fill_walls | as above |
| `plaster.szlifowanie_gladzi` | Szlifowanie gładzi gipsowej | m2 | finishing_step | full gładzenie package |
| `plaster.tynk_wewn` | Tynk gipsowy / tynkowanie wewnętrzne (labor-only) | m2 | plaster_coat | ETICS · elewacja |

**Mapowanie bucketa `legacy-gladzie_tynki-m2`:** Owner musi wybrać **jedną** primary identity **albo** rozdzielić katalog (patrz Option C/D) — **nie** merge wszystkich wierszy L1 w jeden pool bez decyzji.

### 4.2 Proposed painting scope tags

| Tag | Allowed phrases (examples) | Forbidden |
|-----|----------------------------|-----------|
| `painting.walls_ceilings` | Malowanie ścian… · Malowanie sufitu… · Malowanie ścian i sufitów · 1×/2× · biała/kolor | artystyczne · fantazyjne · drzwi · okna · balustrady · rury · elewacja (unless work is elewacja) |
| `painting.joinery_objects` | Malowanie drzwi · okien · balustrad · poręczy | ściany/sufity |
| `painting.special_artistic` | artystyczne · dekoracyjne · fantazyjne | zwykłe ściany |

Dla `legacy-malowanie-m2` **rekomendacja:** przypisać **tylko** `painting.walls_ceilings` (Owner confirm).

---

## 5. Architecture options A–D

| Option | Idea | Pros | Cons |
|--------|------|------|------|
| **A** | Owner-curated **identity subfamilies** + synonym rows + scopeTag on match | Minimal surface · reuse PASS2 · no catalog migration | Bucket namePl remains ambiguous until mapped |
| **B** | **Scope tags / evidence dimensions** on observations; filter pool before median | Clean separation of evidence; fits future SOURCE EVIDENCE DB | Needs tag assignment rules; UI later |
| **C** | **Split catalog identities** (`painting_walls_ceiling`, `painting_joinery`, `painting_special`; analog plaster) | Clearest product semantics | Catalog / migration / naming work · out of Wave-1 comfort |
| **D** | **A + C** (subfamilies now; split IDs when Owner ready) | Pragmatic: fix LIVE quality fast, clean model later | Two-step Owner decisions |

---

## 6. Recommended option

**RECOMMENDED: Option D (phased)**

| Phase | Scope | Why |
|-------|--------|-----|
| **D1 (this epic IMPLEMENT later)** | Option **A+B lite**: Owner synonym / identity rows + **scopeTag** filter into Candidate pool for painting + plaster — **without** changing median formula, **without** loosening `namesLooselyMatch` | Fixes LIVE plaster miss + painting pollution with smallest safe change |
| **D2 (optional follow-up)** | Option **C** catalog splits when Owner wants explicit cost items | Product clarity for Estimator |

**Explicitly NOT recommended as first move:**

- Global threshold loosen.  
- Price hard-cap outlier guard.  
- Raising PASS2 MAX / new hosts.  
- Rewriting qualify/median engines.

---

## 7. Owner decisions required

> **CLOSED** — see **OWNER DECISION CLOSEOUT** at end of this file (2026-08-14). Historical options table retained for audit.

| DECISION | OPTIONS | RECOMMENDED | REQUIRED OWNER ACTION |
|----------|---------|-------------|------------------------|
| **D-ARCH** Architecture | A / B / C / D | **D (phased D1=A+B lite)** | Approve architecture |
| **D-PAINT-SCOPE** `legacy-malowanie-m2` | walls_ceilings only · walls+ceilings+joinery · keep current broad | **walls_ceilings only** | Approve scopeTag for bucket |
| **D-PLASTER-PRIMARY** `legacy-gladzie_tynki-m2` | map→`gladzenie_scian` only · map→`szpachlowanie_2x` · map→multi-pool (forbidden) · split catalog later | **map→`plaster.gladzenie_scian`** as primary Candidate identity for bucket **OR** defer Candidate until split | Choose primary **or** “no Candidate until C” |
| **D-PLASTER-ALIASES** Exact synonym rows | approve list §4.1 · edit · reject | Approve **labor-only** phrases only | Approve exact phrases (no bare fuzzy) |
| **D-PAINT-ALIASES** Allow/forbid lists | §4.2 | Approve forbid: artystyczne/drzwi/okna/balustrady | Approve |
| **D-GROOVES** | KEEP Wave-1 | **KEEP** exact `szpachlowanie bruzd po kablach` | Confirm no change |
| **D-NATIONAL** | POLSKA legal market evidence | **YES** — no GAP for missing WRO | Confirm |
| **D-SOURCE-DB** Relation to evidence DB | design-only pointer now | Defer implement to `WR-SOURCE-EVIDENCE-DB-01` | Confirm sequencing |

**Without D-ARCH + D-PAINT-SCOPE + D-PLASTER-PRIMARY → IMPLEMENT BLOCKED.**  
~~*(superseded)*~~ → Decisions closed · IMPLEMENT still requires separate **Owner GO IMPLEMENT**.

---

## 8. Test matrix (future IMPLEMENT — design only)

| ID | Case | Expect |
|----|------|--------|
| T0 | grooves regression | Candidate path unchanged · synonym exact KEEP · MAX=2 · top-2 kb grooves first |
| T1 | plaster PASS2 URL still fetched | routing unchanged |
| T2 | plaster identity after Owner aliases | ≥1 labor-only match on L1 table · Candidate optional per D-PLASTER-PRIMARY |
| T3 | plaster does **not** match grooves alias | `szpachlowanie bruzd po kablach` never plaster |
| T4 | plaster rejects L+M preferred | labor-only section preferred |
| T5 | painting walls 1×/2× qualify | in pool for `legacy-malowanie-m2` |
| T6 | painting artystyczne **excluded** from walls pool | no inflate |
| T7 | painting drzwi/okna/balustrady **excluded** | no inflate |
| T8 | marketBase walls-only roughly ~16–26 band (honest mid of allowed obs) | not claim exact 68.5 regression |
| T9 | NATIONAL POLSKA evidence accepted | no forced WROCLAW |
| T10 | companyPrice / OUR RATE / Accept untouched | safety |
| T11 | no host allowlist change · MAX=2 | lock |
| T12 | `namesLooselyMatch` threshold unchanged | unit test / freeze note |

---

## 9. Pricing safety

| Rule | Lock |
|------|------|
| point → marketBase = point | KEEP |
| range → midpoint | KEEP |
| companyPricePln | NEVER marketBase / OUR RATE |
| commercial margin | REUSE only · no write in this epic |
| Candidate | research only · ≠ OUR RATE |
| Accept | sole OUR RATE write |
| NATIONAL / POLSKA | valid market evidence · **not GAP** |
| Multi-obs | keep provenance · aggregate via **existing** engine **after** scope filter |
| Invent / default / hard price cap | FORBIDDEN |

---

## 10. Relationship to `WR-SOURCE-EVIDENCE-DB-01`

| Layer | Role | This epic | Evidence DB epic |
|-------|------|-----------|------------------|
| SOURCE | host+URL allowlist / curated list | reuse PASS2 hosts | expand curated inventory (Owner GO) |
| SOURCE EVIDENCE | raw rows + provenance | produce cleaner matches | persist / query store |
| NORMALIZED MARKET EVIDENCE | unit + laborOnly + region + **scopeTag** | **introduce scopeTag conceptually** | store dimension |
| WORK MATCH | identityKey | **D1 focus** | consume |
| Candidate / OUR RATE | downstream | unchanged boundary | unchanged |

**PRIMARY sources (from prior audit — research inventory, not auto-allowlist):**  
KB · Extradom · cennikremontow · Ogarnij · Murator · Budowalka  

**SECONDARY:** SCCOT · Kul-Bud · CennikiBudowlane WRO · Zleca (packages — weak)

Owner URL list remains **design input** for Evidence DB; **this epic does not add hosts** to prod allowlist.

---

## 11. Explicit implementation boundary

**IN (only after Owner GO IMPLEMENT + decisions §7):**

1. Owner-curated synonym / identity rows for plaster (approved phrases only).  
2. ScopeTag (or equivalent) for painting walls_ceilings vs joinery vs special.  
3. Filter Candidate observation pool by scopeTag **before** existing median.  
4. Tests T0–T12.  
5. Docs / changelog.

**OUT:**

F5 · mapper · qualify formula rewrite · median formula rewrite · margin engine · companyPrice · Accept · OUR RATE · KV · seed · catalog migration (unless Owner picks C now) · PASS2 MAX · new hosts · crawler · URL invent · global threshold loosen · price hard-cap.

---

## 12. Forbidden changes (checklist)

```text
[ ] Do NOT loosen namesLooselyMatch globally
[ ] Do NOT invent PLN / midpoint outside source range
[ ] Do NOT use companyPrice as evidence
[ ] Do NOT auto-Accept / write OUR RATE
[ ] Do NOT raise PASS2 MAX
[ ] Do NOT add hosts / crawler / search
[ ] Do NOT conflate grooves ↔ plaster aliases
[ ] Do NOT merge artistic/joinery into walls painting pool
[ ] Do NOT treat missing Wrocław as SOURCE GAP
[ ] Do NOT claim niche closed / coverage % invented
```

---

## Success criteria (post-implement — not claimed now)

- Plaster: PASS2 remains; identity can produce labor-only evidence **per Owner primary**.  
- Painting: Candidate pool for `legacy-malowanie-m2` = walls/ceilings only · no artistic/joinery pollution.  
- Grooves control unchanged.  
- SOURCE GAP remains **OPEN** · NICHE **NOT CLAIMED**.  
- National evidence still valid.

---

## DESIGN FREEZE status

```text
DESIGN FREEZE = APPROVED
IMPLEMENT     = GREEN (local D1 · undeployed)
COMMIT        = NOT DONE
PUSH          = NOT DONE
DEPLOY        = NOT DONE
OWNER DECISION CLOSEOUT = RECORDED (2026-08-14)
NEXT OWNER GO           = COMMIT — WR-LABOR-EVIDENCE-QUALITY-01
```

---

## OWNER DECISION CLOSEOUT

> **GO type:** OWNER DECISION CLOSEOUT only · **NOT** IMPLEMENTATION GO  
> **Date:** 2026-08-14  
> **SSOT:** this file · § below supersedes open “REQUIRED OWNER ACTION” rows in §7  

```text
THIS CLOSEOUT DOES NOT AUTHORIZE IMPLEMENTATION.
ZERO CODE · ZERO REFACTOR · ZERO IMPLEMENTATION TESTS
ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
ZERO KV · ZERO ACCEPT · ZERO OUR RATE · ZERO MARGIN · ZERO SEED
ZERO PASS2 MAX CHANGE · ZERO NEW HOSTS · ZERO PASS2 ALLOWLIST CHANGE
ZERO F5 · ZERO MAPPER · ZERO GLOBAL QUALIFY · ZERO GLOBAL MEDIAN ENGINE
```

### Closed decisions

| DECISION | OWNER VERDICT | Binding detail |
|----------|---------------|----------------|
| **D-ARCH** | **APPROVE D** | **D1 = A + B lite**: identity + **scopeTag** before aggregation/median. **C** (full catalog split) = **DEFERRED**. |
| **D-PAINT-SCOPE** | **APPROVE** | `legacy-malowanie-m2` → **`painting.walls_ceilings` only**. |
| **D-PLASTER-PRIMARY** | **APPROVE** | `legacy-gladzie_tynki-m2` → primary identity **`plaster.gladzenie_scian`**. |
| **D-PLASTER-ALIASES** | **APPROVE** | Labor-only **exact** aliases from DF §4.1 only. **No** bare fuzzy expansion. **Do not** treat “Gładzie / tynki” as automatically equivalent to every source row. |
| **D-PAINT-ALIASES** | **APPROVE** | Base pool for “Malowanie (m2)”: **ściany** + **sufity**. Exclude (via scopeTag, **not** price cap): artistic/decorative · drzwi · okna · balustrady · other joinery/object painting. |
| **D-GROOVES** | **APPROVE KEEP** | Exact synonym only: **`szpachlowanie bruzd po kablach`**. **Do not** add bare `szpachlowanie bruzd`. |
| **D-NATIONAL** | **APPROVE** | POLSKA/NATIONAL evidence is legal when Wrocław missing. **Do not** force WROCLAW. **Do not** treat NATIONAL as SOURCE GAP. |

### Implement gate (future — not this GO)

| Item | State |
|------|--------|
| Architecture for IMPLEMENT | **D1 only** (identity + scopeTag pre-median) |
| Catalog split **C** | **DEFERRED** (out of next IMPLEMENT pack) |
| Next Owner command | `OWNER GO: COMMIT — WR-LABOR-EVIDENCE-QUALITY-01` |

```text
DESIGN FREEZE = APPROVED
IMPLEMENT     = GREEN (local D1)
COMMIT        = NOT DONE
SOURCE GAP    = OPEN
NICHE         = NOT CLAIMED
```

**STOP.**
