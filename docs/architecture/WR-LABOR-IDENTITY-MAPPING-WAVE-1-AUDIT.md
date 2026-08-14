# WR-LABOR-IDENTITY-MAPPING-WAVE-1 — AUDIT

> **Epic proposal:** `WR-LABOR-IDENTITY-MAPPING-WAVE-1`  
> **Prior epic:** `WR-LABOR-IDENTITY-MAPPING-01` (**PRODUCTION VERIFIED** · tip **2.66.55** / **`8af757e0`**)  
> **Prior live validation:** [`LIVE IDENTITY MAPPING VALIDATION = PASS`](../../.tmp-catalog-ui-unification-pv/live-identity-mapping-validation.json)  
> **Design freeze:** [`WR-LABOR-IDENTITY-MAPPING-01-DESIGN-FREEZE.md`](./WR-LABOR-IDENTITY-MAPPING-01-DESIGN-FREEZE.md)  
> **Date:** 2026-08-14  
> **Mode:** READ / FETCH ONLY · **ZERO IMPLEMENT** · **ZERO COMMIT** · **ZERO PUSH** · **ZERO DEPLOY**  
> **Owner Decision Closeout:** [`WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md`](./WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md) · **COMPLETE**

```text
LIVE IDENTITY MAPPING VALIDATION REVIEW = CLOSED (PASS)
WAVE-1 AUDIT                            = COMPLETE (this file)
OWNER DECISION CLOSEOUT                 = COMPLETE
WAVE-1 IMPLEMENT / SEED MAPPINGS        = LOCAL GREEN (2.66.56 · undeployed · 2 rows)
mappingId assignment                    = LOCAL (lim-w1-tablica-rozdzielcza-cr · lim-w1-podejscie-wod-kan-cr)
Evidence WRITE / populate               = NOT DONE
Work Catalog WRITE                      = NOT DONE
Accept / OUR RATE / margin              = NOT DONE
ALLOWLIST CHANGE                        = NOT DONE
SOURCE GAP                              = OPEN
NICHE                                   = NOT CLAIMED
```

---

## 0. LIVE VALIDATION REVIEW — 10 confirmations

| # | Assertion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Mapping engine ready for use | **CONFIRMED** | Prod tip 2.66.55 · markers `exact_normalized` / `catalogUnit` / `observedUnit` / `owner_identity_mapping` · live matrix PASS |
| 2 | Registry EMPTY is correct | **CONFIRMED** | `WORK_RATE_IDENTITY_MAPPINGS = []` · MAPPED = **0** (expected) |
| 3 | D1 remains fallback when no mapping | **CONFIRMED** | Grooves / painting / plaster → `D1_MATCH` with Owner synonyms |
| 4 | Bucket mapping FORBIDDEN | **CONFIRMED** | S1/S2 · `legacy-elektryka-*` / `legacy-hydraulika-*` → UNMATCHED · A3 helper BLOCKED |
| 5 | Mapping = concrete op ↔ concrete observation only | **CONFIRMED** | Design Freeze A3 + live electrical/plumbing concrete ops do not invent HIT |
| 6 | Unit mismatch → BLOCK / UNMATCHED | **CONFIRMED** | S4 UNIT_GUARD = PASS |
| 7 | Ambiguity → AMBIGUOUS / UNMATCHED | **CONFIRMED** | S5 AMBIGUITY_GUARD = PASS |
| 8 | Unknown workId → BLOCKED | **CONFIRMED** | S6 WORK_ID_GUARD = PASS |
| 9 | White-install without workId → HOLD | **CONFIRMED** | Live WHITE-HOLD + Wave-1 missing-workId sanitary rows |
| 10 | D1 scope not bypassed by mapping | **CONFIRMED** | A5 · PAINT joinery `scopeAllowed=false` → BLOCKED · walls_ceilings active |

**Verdict:** technical layer of `WR-LABOR-IDENTITY-MAPPING-01` is **safely closed**.  
**Separate Wave-1 of concrete operational mappings may start** — only after Owner Decision GO (this audit is proposal + candidates, not seed).

---

## 1. Safety (before = after)

| Check | Value |
|-------|--------|
| Evidence | rev **2** · etag **`r2-7a927415`** · obs **66** · **UNCHANGED** |
| Work Catalog | **460** / **34** / **426** · control `companyPrice=35` · OUR RATE `null` · `marginPct=0` · `updatedAt` unchanged |
| Mapping registry | **EMPTY** before = **EMPTY** after |
| KV WRITE | **0** |
| CATALOG WRITE | **0** |
| MAPPING WRITE | **0** |
| Accept | **0** |
| OUR RATE | **0** |
| Margin | **0** |
| batchSet / kvSet | **0** / **0** |
| HEAD | **`8af757e0`** = `origin/main` · staged **0** · WIP untouched |
| Allowlist | **UNCHANGED** (KEEP-4) |

Artefakt JSON (tmp only): `.tmp-catalog-ui-unification-pv/wave1-identity-mapping-audit.json`

---

## 2. Source priority (Wave-1 — no allowlist change)

| Role | Sources |
|------|---------|
| **PRIMARY** | `kb.pl` · `cennikremontow.pl` · Extradom |
| **SECONDARY** | SCCOT |
| **REFERENCE** | Zleca (evidence only — no auto identity) |
| **OUTSIDE until Owner GO** | Kul-Bud · Budowalka · Murator · Ogarnij Remont · CennikiBudowlane |

**This audit:** KB + CR = highest weight for `matchConfidence=HIGH`. SCCOT/Extradom may supply additional observed rows but **must not** auto-create identity. Host allowlist **not** modified.

### Pages fetched (READ-ONLY)

| Page | HTTP | Rows |
|------|-----:|-----:|
| CR instalacje-elektryczne-cennik | 200 | 25 |
| CR instalacje-elektryczne-wroclaw-cennik | 200 | 25 |
| CR instalacje-wodno-kanalizacyjno-gazowe-cennik | 200 | 17 |
| CR bialy-montaz-cennik | 200 | 16 |
| CR bialy-montaz-wroclaw-cennik | 200 | 16 |
| CR rozbiorki-cennik | **404** | 0 |
| CR wywoz-gruzu-cennik | **404** | 0 |
| KB gładź | 200 | 15 |
| KB naprawy | 200 | 13 |
| Extradom | 200 | 63 |
| SCCOT | 200 | 77 |

---

## 3. Wave-1 counts (candidates only — **no mappingId**)

| Metric | Count |
|--------|------:|
| **proposed mapping candidates** (workId × observedName × URL) | **8** |
| **proposed unique workIds** | **4** |
| **blocked** (incl. A3 buckets + unit issues) | **16** |
| **ambiguous** | **0** |
| **missing-workId** | **23** |
| **no_source_hit** (concrete workId, no row this pass) | **10** |

**Important:** proposed ≠ approved. Zero rows written to registry.

---

## 4. PROPOSED candidates (Owner Decision input)

Dedup note: POLSKA + Wrocław CR often duplicate the same `observedName` — listed once per distinct URL pair in JSON; table below collapses to unique `workId` + `observedName`.

| workId | namePl | unit | family | candidate observedName | sourceId | sourceUrl | confidence | qualify | reject |
|--------|--------|------|--------|------------------------|----------|-----------|------------|---------|--------|
| `p2b-punkt-elektryczny-oswietleniowy-szt` | Oprawa oświetleniowa punktowa | szt | electrical | Montaż lamp stropowych i kinkietów | cennikremontow_pl | …/instalacje-elektryczne-cennik (+ wroclaw) | **HIGH** | Concrete lighting fixture ↔ Oprawa | — |
| `p2b-punkt-elektryczny-oswietleniowy-szt` | Oprawa oświetleniowa punktowa | szt | electrical | Punkt oświetlenia górnego | cennikremontow_pl | …/instalacje-elektryczne-cennik (+ wroclaw) | **HIGH** | Same work · lighting point wording | Owner: confirm same-op vs separate SKU |
| `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | Tablica rozdzielcza mieszkaniowa | szt | electrical | Montaż skrzynki rozdzielczej | cennikremontow_pl | …/instalacje-elektryczne-cennik (+ wroclaw) | **HIGH** | Board / skrzynka rozdzielcza | — |
| `cc-w2-zawor-odcinajacy` | Zawór odcinający (mywalka / zlew / bojler) | szt | plumbing | Montaż licznika wody z zaworami odcinającymi | cennikremontow_pl | …/wodno-kanalizacyjno-gazowe-cennik | **HIGH** | Contains shut-off valves | Owner: may be multi-op (licznik+zawory) → split or reject |
| `p2b-podejscie-wod-kan-mb` | Podejście wodociągowo-kanalizacyjne łączone | mb | plumbing | Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź | cennikremontow_pl | …/wodno-kanalizacyjno-gazowe-cennik | **HIGH** | Approach run mb | — |

**Suggested Wave-1 seed size (if Owner GO):** start with **3–5** exact aliases max (lamp · skrzynka · podejście); defer licznik+zawór until semantic split confirmed. **Do not invent mappingId in this audit.**

---

## 5. BLOCKED

| workId / case | reason |
|---------------|--------|
| All `legacy-elektryka-*` | A3 bucket FORBIDDEN |
| All `legacy-hydraulika-*` | A3 bucket FORBIDDEN |
| All `legacy-instalacje_gaz-*` | A3 bucket FORBIDDEN |
| All `legacy-rozbiorki-*` | A3 bucket FORBIDDEN |
| All `legacy-instalacje_co-*` | A3 bucket FORBIDDEN |
| (affinity unit mismatch if any) | catalogUnit ≠ observedUnit → BLOCK |

Bucket absorb of CR electrical/plumbing rows remains **FORBIDDEN**.

---

## 6. AMBIGUOUS

| Count | Note |
|------:|------|
| **0** | No observedName hit ≥2 concrete workIds under Wave-1 affinity rules this pass |

---

## 7. MISSING workId / HOLD

| family | example observedName | reject |
|--------|----------------------|--------|
| electrical | Montaż gniazd i łączników · Punkt gniazda * · Wykucie gniazda pod puszkę | No concrete **gniazdo** workId · bucket FORBIDDEN |
| electrical | Montaż wyłączników | No concrete **wyłącznik** workId |
| electrical | Montaż taśmy LED · sterowniki LED · mata grzewcza | No concrete LED/heating-mat workId |
| white_install | Montaż umywalki · baterii · muszli · bidetu · wanny · brodzika · kabiny · geberitu · pralki · panelu prysznicowego | **HOLD** — no white-install workIds (A12) |

**White install:** source pages exist and parse (**16** rows) — catalog attach **impossible** without new workIds → **HOLD** (do not invent workId in Wave-1 unless separate Owner GO for catalog).

---

## 8. NO SOURCE HIT (concrete workId present)

| workId | namePl | family | note |
|--------|--------|--------|------|
| `cc-p0c-w1-multiswitch-antenowy` | Multiswitch antenowy | electrical | No CR/KB row this pass |
| `cc-w2-mocowanie-aparatow` | Mocowanie aparatów… | electrical | No row |
| `cc-w2-przygotowanie-osprzet` | Przygotowanie podłoża pod osprzęt | electrical | No row |
| `cc-p0c-w1-zawor-odpowietrzajacy` | Odpowietrznik automatyczny CO | plumbing | No row |
| `p2a-rozebranie-okladzin-sciennych-m2` | … | demolition | CR rozbiorki **404** |
| `cc-w2-przebijanie-otworow` | … | demolition | CR rozbiorki **404** |
| `cc-w2-wykucie-wnek` | … | demolition | CR rozbiorki **404** |
| `p1b-zdjecie-ogrodzenia-mb` | … | demolition | CR rozbiorki **404** |
| `legacy-transport_utylizacja-m3` | Transport i utylizacja (m3) | waste | CR wywoz **404** |
| `legacy-transport_utylizacja-kpl` | Transport i utylizacja (kpl) | waste | CR wywoz **404** |

Demolition / waste need alternate PRIMARY URLs (still KEEP-4) in a later Owner GO — **not** new hosts.

---

## 9. Family readiness for Wave-1

| Slice | Ready? | Note |
|-------|--------|------|
| A) ELECTRICAL | **PARTIAL** | Oprawa + tablica candidates · gniazdo/wyłącznik **blocked by missing workId** |
| B) PLUMBING | **PARTIAL** | Podejście strong · zawór needs Owner semantic check · buckets FORBIDDEN |
| C) WHITE INSTALL | **HOLD** | Sources OK · **0** workIds |
| D) DEMOLITION | **NOT READY** | Concrete workIds exist · CR rozbiorki 404 this pass |
| E) WASTE | **NOT READY** | Concrete workIds exist · CR wywoz 404 this pass |

---

## 10. Epic proposal — `WR-LABOR-IDENTITY-MAPPING-WAVE-1`

### In scope (after Owner Decision GO)

1. Owner-approved **exact_normalized** aliases only (cap ≤12 / mapping).
2. PRIMARY sources KB + CR (+ Extradom evidence optional).
3. Concrete existing workIds only (no buckets).
4. Unit bind `catalogUnit` + `observedUnit`.
5. Regression: grooves / painting / plaster D1 untouched.
6. Registry seed in code (`WORK_RATE_IDENTITY_MAPPINGS`) — **still ≠** Evidence populate / Accept / OUR RATE.

### Out of scope (hard)

- Evidence populate / KV write  
- Accept / OUR RATE / margin / companyPrice  
- New workIds for white-install / gniazdo / wyłącznik (needs separate catalog GO)  
- New hosts / PASS2 / qualify / median / D1 threshold changes  
- Bucket mappings  

### Recommended Owner Decision options

| Option | Meaning | Closeout |
|--------|---------|----------|
| **GO-MIN** | Seed ≤3 mappings: lamp→Oprawa · skrzynka→Tablica · podejście→Podejście | **SUPERSEDED** — Oprawa **HOLD**; APPROVE = tablica + podejście only |
| **GO-STD** | GO-MIN + Owner-confirmed zawór alias (or reject licznik compound) | **SUPERSEDED** — Zawór **HOLD** |
| **HOLD** | Wait for catalog workIds (gniazdo/wyłącznik/white) and/or demolition URL discovery | **PARTIAL** — applies to HOLD set in Closeout |
| **NO-GO** | Keep registry EMPTY · D1-only | Not selected — 2 APPROVE pending IMPLEMENT GO |

**Binding decisions:** [`WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md`](./WR-LABOR-IDENTITY-MAPPING-WAVE-1-OWNER-DECISION-CLOSEOUT.md)

---

## 11. STOP

```text
OWNER DECISION CLOSEOUT = COMPLETE
ZERO IMPLEMENT
ZERO COMMIT
ZERO PUSH
ZERO DEPLOY
ZERO MAPPING WRITE
ZERO EVIDENCE POPULATE
SOURCE GAP = OPEN
```

**NEXT OWNER GO:** `IMPLEMENT — WR-LABOR-IDENTITY-MAPPING-WAVE-1`
