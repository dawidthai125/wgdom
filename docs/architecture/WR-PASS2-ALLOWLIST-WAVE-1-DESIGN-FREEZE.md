# DESIGN FREEZE — WR-PASS2-ALLOWLIST-WAVE-1

> **Epic:** `WR-PASS2-ALLOWLIST-WAVE-1`  
> **Parent:** Broad Labor Rate Coverage Audit · Discovery INFRA `WORK-RATE-RESEARCH-DISCOVERY-01` · KB-BRUZDY (control)  
> **Stage:** **OWNER GO IMPLEMENT DONE (local)** · DESIGN FREEZE remains SSOT  
> **Status:** **ARCH REVIEW = PASS WITH CONDITION** · **OWNER DECISIONS CLOSED (Option D)** · **IMPLEMENTATION = LOCAL GREEN** · **COMMIT/PUSH/DEPLOY = NOT DONE**  
> **Local tip (undeployed):** **2.66.52** · **Production baseline:** **2.66.51** / **`31a12d0e`**  
> **Date:** 2026-08-14  
> **SOURCE GAP:** **OPEN**  
> **NICHE:** **NOT CLAIMED**

```text
DESIGN FREEZE          = THIS FILE
ARCH REVIEW            = PASS WITH CONDITION (2026-08-14)
OWNER DECISION         = RECORDED (Option D · MAX=2 · 2026-08-14)
IMPLEMENTATION         = LOCAL GREEN (Owner GO IMPLEMENT 2026-08-14)
COMMIT / PUSH / DEPLOY = NOT DONE
HOST ALLOWLIST         = LOCKED (kb · cennikremontow · sccot · extradom)
NEW HOSTS              = FORBIDDEN in this epic
CRAWLER / SEARCH       = FORBIDDEN
INVENT URL             = FORBIDDEN
ACCEPT / OUR RATE      = OUT OF SCOPE
MARGIN ENGINE          = OUT OF SCOPE (reuse only)
F5 / mapper / qualify / median = LOCKED UNCHANGED
kb_pl PASS2 MAX        = 2 (NOT raised to 3)
Wave-1 allowlist shape = CR painting · kb_pl grooves + plaster
```

---

## LOCK ACKNOWLEDGEMENT

```text
OWNER GO: IMPLEMENT — WR-PASS2-ALLOWLIST-WAVE-1
SSOT: this file §0 + allowlist in work-rate-discovery-allowlist.ts
Date: 2026-08-14
LOCAL CODE GREEN · ZERO COMMIT · ZERO PUSH · ZERO DEPLOY
ZERO KV · ZERO ACCEPT · ZERO OUR RATE WRITE · ZERO MARGIN WRITE · ZERO SEED
```

---

## 0. OWNER DECISION CLOSEOUT (2026-08-14) — BINDING

> Source: **OWNER DECISION CLOSEOUT** after ARCH REVIEW PASS WITH CONDITION.  
> This section supersedes open checkboxes in §20 for Wave-1 MVP scope.

### 0.1 Architectural lock — Option D · MAX=2

```text
PASS2 kb_pl MAX = 2
DO NOT raise MAX to 3 in this epic.

kb_pl top-2 categoryKeys (allowlist inventory order REQUIRED):
  1. grooves   → G0 (KEEP · regression lock)
  2. plaster   → L1 (APPROVE Wave-1)

cennikremontow_pl:
  painting → P1 (APPROVE Wave-1)

FORBIDDEN allowlist shape on kb_pl:
  painting + plaster   (would drop grooves from available top-2)
  painting + grooves   (drops plaster; painting belongs on CR in Option D)
  any 3rd kb_pl categoryKey without separate Owner GO to raise MAX
```

**Code semantics reminder (ARCH):** `listWorkRatePass2CategoryKeysForSource` exposes only the first `MAX` distinct `categoryKey`s for a source in allowlist order. Grooves **must** remain among those first two entries on `kb_pl`.

### 0.2 Final Owner Decision Table

| Item | Decision | Reason |
|------|----------|--------|
| kb_pl MAX | **D / MAX=2** | Preserve current architecture · no silent crawl surface · grooves cannot be dropped |
| grooves G0 | **APPROVE / KEEP** | Existing verified coverage · control `cc-p0c-w1-zaprawianie-bruzd` |
| painting CR P1 | **APPROVE** | Verified labor source `malowanie-cennik` · NATIONAL |
| painting KB P2 / P3 | **DEFER (Wave-1)** | Would overflow kb_pl MAX=2 under Option D · painting carried by CR |
| plaster KB L1 | **APPROVE** | Verified NATIONAL gładź / szpachlowanie labor-only tables |
| plaster KB L2 | **DEFER (Wave-1 budget)** | Valid WROCLAW tynkowanie page · no free kb_pl slot under MAX=2 + grooves+L1 |
| L3 masonry-plaster CR | **REJECT / DEFER** | High false-positive / wide-range risk |
| sealing S1 | **NEEDS OWNER DECISION / DEFER** | Identity „przed malowaniem” ≠ proven ≡ „powierzchni folią” |
| repairs / wykwity | **DEFER** | No verified dedicated URL · no placeholder · no new host |
| new hosts | **REJECT** | Host lock |
| raise MAX→3 | **REJECT (now)** | Not in this epic · requires separate Owner GO if ever revisited |

### 0.3 Exact approved URLs for future IMPLEMENT (Wave-1 MVP only)

| sourceId | categoryKey | Exact URL | Region | Status |
|----------|-------------|-----------|--------|--------|
| `kb_pl` | `grooves` | `https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/` | POLSKA | **KEEP** |
| `kb_pl` | `plaster` | `https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/` | POLSKA | **APPROVE** |
| `cennikremontow_pl` | `painting` | `https://cennikremontow.pl/malowanie-cennik` | POLSKA | **APPROVE** |

**Allowlist array order for `kb_pl` (mandatory):** `grooves` entry **before** `plaster` entry.

### 0.4 Category decisions (detail)

#### PAINTING — APPROVE P1 only (Wave-1)

- Exact URL: `https://cennikremontow.pl/malowanie-cennik`
- Semantics: painting labor (ściany / sufity ranges on page)
- **Do not** auto-extend to decorative / artistic / specialty coatings not represented as the intended wall-painting identity
- KB painting URLs (P2/P3): **out of Wave-1** under Option D budget

#### PLASTER — APPROVE L1 only (Wave-1)

- Exact URL: L1 national gładź page (table above)
- Identity: gładź / szpachlowanie ścian (labor-only section preferred over L+M)
- L3 CR murarsko-tynkarskie: **REJECT / DEFER**
- L2 Wrocław tynkowanie: **DEFER** (budget), not rejected for quality — may return in a later wave / MAX GO

#### GROOVES — KEEP (no behavior change)

- Exact approved alias: **`szpachlowanie bruzd po kablach`**
- **NOT approved:** bare `szpachlowanie bruzd`
- **Forbidden conflation:** kucie · bruzdowanie · wycinanie · folia · inne naprawy
- Control regression: Candidate 15–25 → marketBase 20 · margin 0 · POLSKA · OUR RATE null unless Owner Accept (unchanged)

#### SEALING — DEFER

- Do **not** auto-equate „Zabezpieczenie folią przed malowaniem” = „Zabezpieczenie powierzchni folią”
- Status: **NEEDS OWNER DECISION / DEFER**
- No sealing PASS2 entry in Wave-1 implement

#### REPAIRS / WYKWITY — DEFER

- No verified URL → **DEFER**
- No placeholder URL · no new host · no invent
- Existing synonyms may remain documentary only · **no Candidate without evidence**

### 0.5 Policy locks (unchanged)

| Topic | Lock |
|-------|------|
| Hosts | kb · cennikremontow · sccot · extradom only |
| Off-host need | `BLOCKED_BY_HOST_ALLOWLIST` |
| National | `POLSKA` / NATIONAL — never relabel → WROCLAW |
| Wrocław | only when source/URL declares city |
| Point | source → marketBase |
| Range | `(min+max)/2` → marketBase |
| companyPricePln | never as source / marketBase / OUR RATE |
| Margin | `commercialPricing.marginPct` · reuse resolveMarginPct / computeSellPricePln / computeProposedWorkRatePln · labor 0% unchanged |
| Candidate | n=1 → `lowSample=true` · not auto-FAIL |
| OUR RATE | Owner Accept only |

### 0.6 Implementation boundary (future Owner GO IMPLEMENT)

**IN scope:**

1. Approved PASS2 allowlist entries only (table §0.3)  
2. Exact `categoryKey`  
3. Exact approved URL  
4. Provenance / docs as needed  
5. Grooves regression test (T0)  
6. Targeted Wave-1 tests (painting CR · plaster L1 · no overflow · no new hosts)

**OUT of scope:**

F5 · mapper · qualify · median · margin engine · companyPrice · Accept · OUR RATE · AI Accept · new hosts · crawler · search · family=unknown invent · finishing alias pack · quality guard · batch Accept · KV changes · MAX→3 · sealing · repairs

### 0.7 Success criteria (post-implement — not claimed now)

- grooves still routable  
- painting routable (CR)  
- approved plaster routable (L1)  
- no new hosts · no arbitrary URL · no category overflow  
- no identity broadening  
- NATIONAL remains POLSKA  
- range midpoint unchanged · commercial margin unchanged  
- Candidate ≠ OUR RATE · Accept = only OUR RATE write  
- **SOURCE GAP remains OPEN** · **NICHE NOT CLAIMED**

---

## 1. Executive Summary

Broad Labor Rate Coverage Audit (prod tip **2.66.51**) showed:

| Metric | Value |
|--------|-------|
| Active labor works | **89** |
| Candidate possible | **4 / 89 (~4.5%)** |
| Blocked | **85 / 89** |
| Dominant blocker | `PASS2_EMPTY_FOR_FAMILY_AND_PASS1_MISS` |
| `family=unknown` | **65 / 89** |
| PASS2-routable today | **1** (`kb_pl` · `grooves`) |
| Labor margin | **89 / 89 = 0%** |

**Control (do not regress):**

`cc-p0c-w1-zaprawianie-bruzd` → KB range **15–25** → marketBase **20** → margin **0%** → proposed **20** → Candidate YES · lowSample · POLSKA · widthClaim `NOT_SPECIFIED` · OUR RATE null · Accept NOT DONE.

**Wave-1 goal (design only):** Owner-curated PASS2 entries for **painting · plaster · repairs · sealing_protection**, using **only verified allowlisted URLs**, without claiming niche coverage closed and without inventing slugs.

**This DF does not solve electrical / plumbing / unknown-family routing** (separate epic `WR-FAMILY-ROUTING-TRADES-01`).

---

## 2. Current baseline

### 2.1 Production

| Field | Value |
|-------|-------|
| Tip | 2.66.51 |
| Commit | `31a12d0e` |
| Work Catalog Wrocław | 460 active · 34 legacy · 426 custom |
| Labor (¬material host) | 89 |
| Material hosts | 371 |
| Labor margin | 0% (Owner floor applied) |

### 2.2 Current PASS2 allowlist (prod)

| sourceId | categoryKey | URL | Status |
|----------|-------------|-----|--------|
| `kb_pl` | `grooves` | `https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/` | **LIVE · KEEP** |

### 2.3 Locked hosts (no expansion)

```text
kb.pl
cennikremontow.pl
sccot.pl
extradom.pl
```

PASS1 canonicals remain unchanged (Wrocław city pages / editorial tables).  
PASS2 = Owner category URL resolve only · client never sends arbitrary URL.

### 2.4 Commercial / pricing stack (reuse — do not fork)

```text
SOURCE (point | range)
  → marketBase (point | range_midpoint)
  → resolveMarginPct(commercialPricing.marginPct)
  → computeSellPricePln / computeProposedWorkRatePln
  → Candidate (RO)
  → Owner Accept ONLY
  → OUR RATE
```

`companyPricePln` ≠ marketBase ≠ OUR RATE.

---

## 3. Problem statement

1. **PASS2 is effectively empty** outside `grooves` → most families never fetch niche pages.  
2. **PASS1 alone** only occasionally matches (malowanie, opportunistic extradom rows).  
3. Some works already have **Owner synonyms** (repairs / sealing) but **no PASS2 URL** → identity ready, routing empty.  
4. **65/89 `family=unknown`** cannot reach PASS2 under current `FAMILY_TO_CATEGORY` (out of Wave-1 implement scope; design must not force-assign).  
5. Quality risk already visible: malowanie Candidate with noisy range (e.g. artistic 124–624) → deferred to `WR-OBS-QUALITY-GUARD-01`.

---

## 4. Target categories (Wave-1)

| Owner label | Proposed `categoryKey` (reuse existing enum) | In scope |
|-------------|-----------------------------------------------|----------|
| PAINTING | `painting` | YES |
| PLASTER / GŁADZIE / TYNKI | `plaster` (optional secondary `masonry_plaster` — Owner decide) | YES |
| REPAIRS | `repairs` | YES |
| SEALING / FOLIA | `sealing_protection` | YES |

**Existing `grooves`:** KEEP as-is · **not** the Wave-1 expansion target · regression-locked.

**Optional sub-key (propose only, do not implement):** `priming` as painting-adjacent — only if Owner wants separate PASS2 page; otherwise priming rides painting pages via identity.

---

## 5. Owner-curated URL table (candidates)

> Status meanings:  
> **VERIFIED** = HTTP content inspected in this DF session / prior DISCOVERY audit · allowlisted host · table evidence seen.  
> **NEEDS OWNER URL** = no qualifying verified page for the intended identity.  
> **KEEP (prod)** = already live PASS2.  
> **Owner decision** required before any implement allowlist entry.

| ID | sourceId | categoryKey | Exact URL | Region semantics | Evidence type | Status |
|----|----------|-------------|-----------|------------------|---------------|--------|
| G0 | `kb_pl` | `grooves` | `https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/` | POLSKA / NATIONAL | labor range tables | **KEEP (prod)** |
| P1 | `cennikremontow_pl` | `painting` | `https://cennikremontow.pl/malowanie-cennik` | POLSKA / NATIONAL (no city in URL/title) | labor range tables m2 | **VERIFIED** |
| P2 | `kb_pl` | `painting` | `https://kb.pl/cenniki/miejskie/malowanie-i-tapetowanie/wroclaw/` | **WROCLAW** (city page) | city table (netto/brutto point-ish) | **VERIFIED** |
| P3 | `kb_pl` | `painting` | `https://kb.pl/cenniki/uslugi/cennik-uslug-remontowych-aktualne-ceny/` | POLSKA / NATIONAL | range tables (malowanie + mixed trades) | **VERIFIED** · multi-trade risk |
| L1 | `kb_pl` | `plaster` | `https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/` | POLSKA / NATIONAL | labor-only range + separate L+M table | **VERIFIED** |
| L2 | `kb_pl` | `plaster` | `https://kb.pl/cenniki/miejskie/tynkowanie/wroclaw/` | **WROCLAW** | city table gładź/tynk | **VERIFIED** |
| L3 | `cennikremontow_pl` | `plaster` | `https://cennikremontow.pl/uslugi-murarsko-tynkarskie-cennik` | POLSKA / NATIONAL | wide ranges · mixed masonry | **VERIFIED** · high FP risk |
| R1 | `kb_pl` | `repairs` | *(reuse G0 URL?)* or **NEEDS OWNER URL** dedicated | — | wykwity / zacieki | **NEEDS OWNER DECISION** |
| S1 | `kb_pl` | `sealing_protection` | `https://kb.pl/cenniki/miejskie/malowanie-i-tapetowanie/wroclaw/` | **WROCLAW** | row „Zabezpieczenie folią przed malowaniem” | **VERIFIED** · identity TBD |
| S2 | — | `sealing_protection` | — | — | NATIONAL labor-only folia row | **NEEDS OWNER URL** |

**Budget note (prod lock):** `WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE = 2`.  
Per source, Owner must pick ≤2 category URLs for Wave-1 implement — not all rows above.

---

## 6. Exact URL evidence

### 6.1 PAINTING — P1 `cennikremontow.pl/malowanie-cennik`

| Field | Evidence |
|-------|----------|
| Host | `cennikremontow.pl` — allowlisted |
| Purpose | National painting price list 2026 |
| Sample rows | Malowanie ścian 1× biała **12–20** zł/m2 · 2× biała **16–24** · sufit · gruntowanie |
| Price type | **range** → midpoint |
| Labor | Declared service rates · material called out separately on many rows |
| Region | No city token in URL → **POLSKA / NATIONAL** |
| Expected match phrases | „Malowanie ścian…”, „Gruntowanie” |
| False positives | „Malowanie artystyczne” **124–624** · drzwi/okna package-like · must not become default for `legacy-malowanie-m2` without identity discipline |
| Confidence | **HIGH** for wall painting ranges · **MED** for clean Candidate quality |

### 6.2 PAINTING — P2 `kb.pl/.../malowanie-i-tapetowanie/wroclaw/`

| Field | Evidence |
|-------|----------|
| Host | `kb.pl` — allowlisted |
| Purpose | Wrocław city painting/tapeting table |
| Sample rows | Malowanie ścian i sufitów (trzy warstwy) ~21/22.6 zł/m2 · Gruntowanie · **Zabezpieczenie folią przed malowaniem** ~15.2/16.4 |
| Price type | City matrix netto/brutto (treat carefully vs od–do range) |
| Region | URL contains `wroclaw` → **WROCLAW** (not invented) |
| Multi-use | Also candidate for sealing / repairs-ubytki rows on same page |
| Confidence | **HIGH** for WROCLAW painting · **MED** for sealing identity |

### 6.3 PAINTING — P3 `kb.pl/.../cennik-uslug-remontowych-aktualne-ceny/`

| Field | Evidence |
|-------|----------|
| Purpose | Broad national renovation table |
| Painting rows | Malowanie 22–38 (3×+grunt) · 18–25 (2×+grunt) · Gruntowanie 10–14 |
| Also contains | tynk · płytki · hydraulika · elektryka |
| Risk | Multi-trade page → higher false-positive if used as sole painting PASS2 |
| Region | NATIONAL |
| Recommendation | Prefer **P1** as primary painting PASS2; P3 = Owner optional secondary only |

### 6.4 PLASTER — L1 `kb.pl/.../cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/`

| Field | Evidence |
|-------|----------|
| Labor-only table | Gładzenie **45–70** · szpachlowanie 1× **30–45** · 2× **35–54** · szlifowanie · grunt |
| L+M table | Separate section — qualify must prefer **labor-only** section |
| Region | Title „w całej Polsce” · no city → **POLSKA** |
| Confidence | **HIGH** for gładź/szpachlowanie labor |

### 6.5 PLASTER — L2 `kb.pl/.../tynkowanie/wroclaw/`

| Field | Evidence |
|-------|----------|
| Rows | Tynki gipsowe · Gładź gipsowa · Naprawa ubytków · Skuwanie tynku |
| Region | **WROCLAW** |
| Confidence | **HIGH** for Wrocław plaster |

### 6.6 PLASTER — L3 `cennikremontow.pl/uslugi-murarsko-tynkarskie-cennik`

| Field | Evidence |
|-------|----------|
| Rows | Gładź gipsowa 72–104 · tynkowanie ręczne · skuwanie · naprawa rys |
| Risk | Extreme ranges (e.g. skuwanie 30–164) · masonry packages · L+M ambiguity |
| Recommendation | **Owner caution** — secondary only after quality guard epic, or REJECT for Wave-1 |

### 6.7 REPAIRS

| Option | Evidence |
|--------|----------|
| Reuse G0 (grooves national repairs) | Page already has naprawy ubytków / pęknięcia / bruzdy. **Wykwity / zacieki** were previously audited as **not reliably present** as priced labor rows on allowlisted pages (DISCOVERY-01). |
| Painting city pages | „Naprawa ubytków” appears on P2 — may help ubytki, **not** wykwity identity |
| Dedicated wykwity URL | **NEEDS OWNER URL** on allowlisted host |

### 6.8 SEALING

| Option | Evidence |
|--------|----------|
| S1 = P2 Wrocław painting page | Row **„Zabezpieczenie folią przed malowaniem”** ~15–16 zł/m2 · labor-like · WROCLAW |
| Identity vs catalog | Catalog control: `cc-p0c-w1-zabezpieczenie-folia` = „Zabezpieczenie powierzchni folią”. Existing synonyms emphasize **okien / stolarki**. Owner must decide if „przed malowaniem” (podłogi/meble/okna) is same commercial work. |
| NATIONAL sealing-only page | **NEEDS OWNER URL** (KB product-article about folia material ≠ labor rate) |

---

## 7. Host allowlist check

| Candidate | Host allowlisted? | Result |
|-----------|-------------------|--------|
| All P1–P3, L1–L3, G0, S1 | YES | Eligible for Owner APPROVE/REJECT |
| Any off-host specialty cennik | NO | **BLOCKED_BY_HOST_ALLOWLIST** → future epic only |

No new hosts in Wave-1.

---

## 8. CategoryKey proposal

Reuse existing `WorkRateCategoryKey` values:

```text
painting
plaster
repairs
sealing_protection   // Owner label “SEALING” — keep enum name
grooves              // KEEP prod — out of Wave-1 change set except regression tests
```

**Optional (Owner decide, not implement now):**

| Proposal | Why | Default |
|----------|-----|---------|
| Use `masonry_plaster` for L3 CR page | Separates dirty masonry list from gładź national | Prefer **REJECT L3 for Wave-1** instead |
| Add `priming` PASS2 | Gruntowanie often on painting pages | Prefer **no new key** — match via painting pages |

**Routing design (Wave-1):**

```text
FAMILY_TO_CATEGORY (existing shape):
  painting → ["painting"]
  priming  → ["painting", "plaster"]   // already
  plaster  → ["plaster", "masonry_plaster"]
  repairs  → ["repairs"]
  sealing_protection → ["sealing_protection"]
  grooves  → ["grooves"]
  electrical / plumbing / unknown → []   // unchanged — do NOT force-assign
```

If `family=unknown` → **ROUTING = UNKNOWN** · reason `insufficient identity evidence` · no PASS2 fetch invented.

---

## 9. Identity / alias requirements

> Aliases below are **audit directions**, not automatic approvals.  
> Exact Owner synonym rows land in `WR-ALIAS-PACK-FINISHING-01` unless already present.

### 9.1 PAINTING

| Concept | Source phrases (examples) | Candidate aliases (Owner review) | Forbidden / do not auto-merge |
|---------|---------------------------|----------------------------------|-------------------------------|
| malowanie ścian | Malowanie ścian… · Malowanie ścian i sufitów | malowanie · malowanie dwukrotne · malowanie sufitów | malowanie artystyczne · malowanie drzwi/okien · malowanie elewacji (unless work is elewacja) |
| gruntowanie | Gruntowanie ścian… | gruntowanie | gruntowanie posadzki / elewacji without work match |

**Catalog examples:** `legacy-malowanie-m2`, `p1c-farba-elewacyjna-m2` (elewacja ≠ ściany wewn. — separate identity).

### 9.2 PLASTER

| Concept | Source phrases | Candidate aliases | Forbidden |
|---------|----------------|-------------------|-----------|
| gładź | Gładzenie ścian · Gładź gipsowa | gładź · gładzie | stiuk wenecki · tynk elewacyjny ETICS without match |
| szpachlowanie ścian | Jednokrotne/Dwukrotne szpachlowanie ścian | szpachlowanie (ścian) | **szpachlowanie bruzd po kablach** (belongs to grooves) |
| tynk wewnętrzny | Tynki gipsowe · Tynk cementowo-wapienny | tynkowanie | tynk elewacyjny cienkowarstwowy / ETICS |

**Catalog examples:** `legacy-gladzie_tynki-m2`, `p1c-tynk-elewacyjny-m2` (elewacja — careful).

### 9.3 REPAIRS

| Concept | Source phrases | Existing synonyms (prod) | Gap |
|---------|----------------|--------------------------|-----|
| wykwity / zacieki | — | wykwity · zaciek · usuwanie… · skasowanie wykwitów | **URL still missing** |
| naprawa ubytków | Naprawa ubytków · Szpachlowanie ubytków | may use painting/plaster pages | do not equate to all „naprawa” |
| bruzdy fill | Szpachlowanie bruzd po kablach | already Owner-approved | **KEEP grooves path** |

### 9.4 SEALING

| Concept | Source phrases | Existing synonyms | Owner decision |
|---------|----------------|-------------------|----------------|
| folia ochronna labor | Zabezpieczenie folią przed malowaniem | zabezpieczenie folią · okien · stolarki | Is catalog „powierzchni” ≡ „przed malowaniem”? |
| Forbidden | folia izolacyjna / wełna+folia packages · product SKU articles | — | REJECT material/product pages |

---

## 10. Region policy (LOCKED)

```text
If URL/path/title contains Wrocław city token → regionScope = WROCLAW
Else if source does not declare city → regionScope = POLSKA · countryScope = POLSKA · NATIONAL
NEVER relabel POLSKA → WROCLAW
NEVER invent city from company HQ / domain
```

Examples:

| URL | Region |
|-----|--------|
| P1 CR malowanie-cennik | POLSKA |
| P2 KB malowanie Wrocław | WROCLAW |
| L1 KB gładź „cała Polska” | POLSKA |
| L2 KB tynkowanie Wrocław | WROCLAW |
| G0 KB repairs national | POLSKA |

---

## 11. Price evidence policy (LOCKED)

```text
point  → marketBaseRatePln = sourcePoint
range  → marketBaseRatePln = (sourceMin + sourceMax) / 2
```

- Do **not** invent point from narrative.  
- Do **not** use `companyPricePln`.  
- Prefer **labor-only** tables over „robocizna + materiał” sections on same page (L1).  
- `lowSample=true` for n&lt;3 remains **honest signal**, not automatic FAIL.  
- Outlier / package rows → `WR-OBS-QUALITY-GUARD-01` (out of Wave-1).

---

## 12. Unit policy

| Category | Expected units | Reject |
|----------|----------------|--------|
| painting | m2 (walls/ceilings) | żeberko / szt for wall work · artistic package |
| plaster | m2 | mb for wall gładź unless source+work are mb |
| repairs | m2 or mb per work | unit_mismatch without conversion |
| sealing | m2 | material roll prices |

Unit mismatch → qualify reject (existing) · **no eye-ball conversion**.

---

## 13. False-positive risks

| Risk | Example | Mitigation (design) |
|------|---------|---------------------|
| Artistic / package painting | CR 124–624 | Identity first-token + Owner alias pack · quality guard epic |
| Multi-trade national page | P3 renovations | Prefer dedicated painting URL P1 |
| L+M plaster table | L1 second table | Prefer labor-only section |
| Wide masonry ranges | L3 | Prefer REJECT for Wave-1 |
| Folia material article | KB product blog | REJECT — not labor cennik |
| Grooves confusion | szpachlowanie bruzd vs szpachlowanie ścian | Keep grooves alias exact · plaster forbidden list |
| City page shared by painting+sealing | P2/S1 same URL | Allowed if identity distinguishes rows · budget counts as one PASS2 URL |

---

## 14. PASS2 routing design

```text
PASS1: unchanged canonical URLs (4 hosts)
PASS2: for each sourceId in WORK_RATE_RESEARCH_SOURCE_ORDER:
         categoryKeys = intersection(FAMILY_TO_CATEGORY[family], allowlist for source)
         fetch ≤ PASS2_MAX_PAGES_PER_SOURCE
         resolve URL from Owner allowlist only
```

**Wave-1 recommended allowlist shape (≤2 per source — Owner picks):**

### Wave-1 MVP allowlist (OWNER LOCKED — Option D)

| sourceId | categoryKey | URL ID | Priority |
|----------|-------------|--------|----------|
| `kb_pl` | `grooves` | G0 | **KEEP · must be first kb entry** |
| `kb_pl` | `plaster` | L1 | **APPROVE · second kb entry** |
| `cennikremontow_pl` | `painting` | P1 | **APPROVE** |
| — | sealing / repairs / P2 / P3 / L2 / L3 | — | **DEFER / REJECT per §0** |

**Conflict with max=2 on `kb_pl`:**  
If Owner wants painting + plaster + sealing + grooves on kb_pl, **budget overflows**.  
Design options (Owner choose one before implement):

1. **A — Prefer families:** kb_pl PASS2 = `{painting:P2, plaster:L1}` · sealing waits · grooves KEEP may require raising max or swapping.  
2. **B — Raise max pages/source to 3** (tiny infra change — separate Owner GO if needed).  
3. **C — Share URL:** one kb_pl entry P2 serves painting; sealing uses same URL via same category or painting family match only (no separate sealing key until URL exists).  
4. **D — CR carries painting; kb_pl carries plaster + grooves** (sealing/repairs deferred).

**OWNER DECISION (2026-08-14):** **Option D adopted** · MAX remains **2** · **B REJECTED for now**.  
Wave-1 MVP = P1 (CR painting) + G0 (kb grooves) + L1 (kb plaster). See **§0**.

---

## 15. Test matrix (design — not run as implement gate yet)

| ID | Case | Expect |
|----|------|--------|
| T0 | Control bruzdy regression | Candidate 15–25 → 20 · margin 0 · POLSKA · no OUR RATE write |
| T1 | `legacy-malowanie-m2` + P1/P2 | Candidate possible · region prefer WROCLAW if P2 qualifies · lowSample honesty |
| T2 | `legacy-gladzie_tynki-m2` + L1 | Range midpoint · POLSKA · labor-only table |
| T3 | Wrocław plaster work + L2 | region WROCLAW |
| T4 | `cc-w2-wykwity-zacieki` | GAP or Candidate **only if** Owner supplies repairs URL |
| T5 | `cc-p0c-w1-zabezpieczenie-folia` | Candidate only if Owner APPROVES S1 identity |
| T6 | Electrical / plumbing / unknown | Still PASS2 empty · no invent routing |
| T7 | companyPrice isolation | marketBase ≠ companyPrice |
| T8 | No Accept path | research never writes OUR RATE |
| T9 | No new host fetch | Edge URL allowlist reject |
| T10 | L+M plaster section | not preferred over labor-only |

---

## 16. Security / pricing safety

| Rule | Wave-1 stance |
|------|----------------|
| Anti-SSRF / no client URL | KEEP |
| Host allowlist | KEEP · no expansion |
| companyPrice → OUR RATE | FORBIDDEN |
| research → OUR RATE | FORBIDDEN |
| Candidate → auto Accept | FORBIDDEN |
| AI invent price | FORBIDDEN |
| Margin second engine | FORBIDDEN |
| Seed / fixture prices | FORBIDDEN |
| Global margin floor | OUT OF SCOPE this epic |

---

## 17. Explicit non-goals

- Implementation / code / changelog / deploy  
- New hosts / crawler / search harvest  
- `WR-FAMILY-ROUTING-TRADES-01` full unknown→family solver  
- `WR-ALIAS-PACK-FINISHING-01` synonym table ship (except documenting needs)  
- `WR-OBS-QUALITY-GUARD-01` outlier filters  
- `WR-OWNER-ACCEPT-BATCH-UX-01`  
- Electrical / plumbing niche pages  
- Claiming SOURCE GAP closed / niche claimed  
- Changing control bruzdy behavior  
- Margin reconfiguration  
- Bid margin / F5 / mapper / qualify / median rewrites  

---

## 18. Future implementation boundary

After **ARCH REVIEW PASS WITH CONDITION** + **Owner Decision Closeout §0**:

```text
OWNER GO: IMPLEMENT — WR-PASS2-ALLOWLIST-WAVE-1 (MVP Option D)
  → WORK_RATE_PASS2_CATEGORY_ALLOWLIST =
       kb_pl grooves G0 (first)
       kb_pl plaster L1 (second)
       cennikremontow_pl painting P1
  → ZERO MAX raise
  → ZERO sealing / repairs entries
  → ZERO synonym invent beyond already-approved grooves alias
  → ZERO Accept / OUR RATE / margin write
  → regression: grooves control must stay green
```

If Owner later rejects P1 or L1 → Wave-1 implement **aborts or shrinks** · SOURCE GAP remains OPEN.

---

## 19. SOURCE GAP / NICHE status

```text
SOURCE GAP = OPEN
NICHE      = NOT CLAIMED
COVERAGE   = NOT SOLVED by this DF alone
```

Wave-1 DF only proposes **first curated expansion**. Even after implement, expect large residual GAP (electrical, plumbing, unknown, missing aliases, quality rejects).

---

## 20. Owner decisions required

> **SUPERSEDED for Wave-1 MVP by §0 OWNER DECISION CLOSEOUT (2026-08-14).**  
> Checkboxes below retained as historical DF draft trail. Binding status = §0.2 table.

### 20.1 PASS2 URL decisions — Wave-1 closeout

#### PAINTING

| ID | URL | Decision |
|----|-----|----------|
| P1 | `https://cennikremontow.pl/malowanie-cennik` | **[x] APPROVE** (Wave-1) |
| P2 | `https://kb.pl/cenniki/miejskie/malowanie-i-tapetowanie/wroclaw/` | **[x] DEFER** (kb MAX / Option D) |
| P3 | `https://kb.pl/cenniki/uslugi/cennik-uslug-remontowych-aktualne-ceny/` | **[x] DEFER / low priority** (multi-trade) |

#### PLASTER

| ID | URL | Decision |
|----|-----|----------|
| L1 | `https://kb.pl/cenniki/uslugi/cennik-gladzi-gipsowej-i-szpachlowania-scian-w-calej-polsce/` | **[x] APPROVE** (Wave-1 kb plaster slot) |
| L2 | `https://kb.pl/cenniki/miejskie/tynkowanie/wroclaw/` | **[x] DEFER** (budget · valid page) |
| L3 | `https://cennikremontow.pl/uslugi-murarsko-tynkarskie-cennik` | **[x] REJECT / DEFER** (high FP) |

#### REPAIRS

| ID | URL | Decision |
|----|-----|----------|
| R-G0-reuse | Reuse grooves URL G0 also as `repairs` key? | **[x] DEFER** (not Wave-1) |
| R-NEW | Owner supplies dedicated wykwity/zacieki labor URL on allowlisted host | **[x] DEFER** |

#### SEALING

| ID | URL | Decision |
|----|-----|----------|
| S1 | Same as P2 — row „Zabezpieczenie folią przed malowaniem” | **[x] NEEDS OWNER DECISION / DEFER** |
| S-NEW | Owner supplies NATIONAL labor-only folia URL | **[x] DEFER** |

#### GROOVES (regression)

| ID | URL | Decision |
|----|-----|----------|
| G0 | Existing national repairs / bruzdy page | **[x] KEEP** |

### 20.2 Budget / routing decisions — closed

| Decision | Outcome |
|----------|---------|
| kb_pl PASS2 budget | **[x] D** — CR painting · kb plaster + grooves · MAX=2 |
| L3 CR masonry page in Wave-1? | **[x] REJECT / DEFER** |
| Sealing identity „przed malowaniem” ≡ „powierzchni folią”? | **[x] NOT proven → DEFER** |
| Raise `PASS2_MAX_PAGES_PER_SOURCE`? | **[x] NO** (now) |

### 20.3 Explicit blocks (no Owner URL invent)

| Need | Status |
|------|--------|
| Wykwity / zacieki dedicated labor cennik on allowlisted host | **DEFER** |
| NATIONAL sealing-only labor cennik | **DEFER** |
| Electrical / plumbing niche pages | **OUT OF SCOPE** (+ host-gap if only off-host) |
| New hosts | **REJECT** |

---

## Appendix A — Target matrix (summary)

| Category | Work examples | Family today | PASS1 | PASS2 target | URL verified | Host | Expected evidence | Region | Alias needed | Risk |
|----------|---------------|--------------|-------|--------------|--------------|------|-------------------|--------|--------------|------|
| PAINTING | `legacy-malowanie-m2` | painting | partial | P1 + P2 | YES | CR + kb | range / city | NAT + WRO | finishing pack later | artistic outliers |
| PAINTING | `p1c-farba-elewacyjna-m2` | painting | miss | optional elewacja URL | **NEEDS OWNER** | — | — | — | yes | elewacja ≠ ściany |
| PLASTER | `legacy-gladzie_tynki-m2` | plaster | miss | L1 + L2 | YES | kb | range gładź | NAT + WRO | maybe | L+M table |
| PLASTER | `p1c-tynk-elewacyjny-m2` | plaster | opportunistic | L? | partial | extradom PASS1 already | range | POLSKA | careful | elewacja tech |
| REPAIRS | `cc-w2-wykwity-zacieki` | repairs | miss | R | **NO** | — | — | — | **already have** | SOURCE GAP |
| REPAIRS | ubytki | unknown/repairs | miss | P2/L2 rows | YES rows | kb | city | WRO | light | ≠ wykwity |
| SEALING | `cc-p0c-w1-zabezpieczenie-folia` | sealing_protection | miss | S1 | YES row | kb | city point-ish | WRO | maybe | identity TBD |
| GROOVES | control bruzdy | grooves | PASS2 live | G0 KEEP | YES | kb | 15–25 | POLSKA | approved | regression lock |

---

## Appendix B — Per-category answers (checklist § DF task)

### PAINTING
1. Works: `legacy-malowanie-m2` first; elewacja later.  
2. Pages: P1 + P2 (P3 optional).  
3. Yes — allowlisted.  
4. Verified this DF.  
5. Mostly **range** (P1/P3); P2 city netto/brutto.  
6. Match „Malowanie ścian…”; forbid artistic.  
7. Alias pack helpful, not mandatory for exact CR rows.  
8. m2.  
9. P1 NATIONAL · P2 WROCLAW.  
10. FP: artistic 624, doors/windows.  
11. Yes — many painting rows.  
12. `painting` sufficient.

### PLASTER
1. `legacy-gladzie_tynki-*`; cautious elewacja.  
2. L1 + L2; L3 caution.  
3. Yes.  
4. Verified.  
5. Range labor-only + L+M section.  
6. Gładź / szpachlowanie ścian — not bruzdy.  
7. Optional aliases.  
8. m2.  
9. L1 NATIONAL · L2 WROCLAW.  
10. FP: stiuk, L+M, wide masonry (L3).  
11. Yes.  
12. `plaster`; avoid new key unless Owner wants masonry split.

### REPAIRS
1. `cc-w2-wykwity-zacieki`; ubytki secondary.  
2. Dedicated URL **missing**; G0 reuse questionable for wykwity.  
3. Hosts OK only if URL found.  
4. Wykwity **not verified** on allowlist for priced row.  
5. —  
6. Synonyms exist.  
7. Already present.  
8. m2 expected.  
9. TBD with URL.  
10. „naprawa” over-broad.  
11. Maybe.  
12. `repairs` — keep; do not overload grooves.

### SEALING
1. `cc-p0c-w1-zabezpieczenie-folia`.  
2. S1 = Wrocław painting page row; NATIONAL missing.  
3. Yes for S1.  
4. Row verified; **identity** not Owner-approved.  
5. City point-ish.  
6. Needs alias/identity decision.  
7. Possibly tighten synonym.  
8. m2.  
9. WROCLAW for S1.  
10. Material folia articles; insulation packages.  
11. Shared with painting page.  
12. Keep `sealing_protection`.

---

## Document control

| Field | Value |
|-------|-------|
| Path | `docs/architecture/WR-PASS2-ALLOWLIST-WAVE-1-DESIGN-FREEZE.md` |
| Stage | **OWNER DECISION RECORDED** · DESIGN FREEZE locked for Wave-1 MVP |
| ARCH REVIEW | PASS WITH CONDITION |
| Owner budget | **Option D · MAX=2** |
| Next | **OWNER GO: IMPLEMENT — WR-PASS2-ALLOWLIST-WAVE-1** (MVP §0.3 only) *or* ARCH REVIEW FINAL if Owner wants a last confirm |
| Implement | **NOT DONE** |
| Commit / Push / Deploy | **NOT DONE** |

```text
SOURCE GAP = OPEN
NICHE      = NOT CLAIMED
```
