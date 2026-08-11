# DESIGN FREEZE — MARKET-MATERIAL-RESEARCH-01

> **Epic:** Demand-driven market price research → WGDOM Price Memory (load-minimized)  
> **ID:** `MARKET-MATERIAL-RESEARCH-01`  
> **Status:** **DESIGN FREEZE COMPLETE** · **Hard SF Stage A = PRODUCTION VERIFIED GREEN** (`a3c7da0f`) · **Stage B orchestration = CODE IMPLEMENTED (awaiting Owner GO COMMIT)**  
> **Date:** 2026-08-11  
> **Baseline tip:** **`a3c7da0f`** (Hard SF) · UI tip SSOT = [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PRICE-PATH-01:** **GREEN** · PRICE DATA = **PRICE_GAP** where no Owner-approved data  
> **SOURCE AUDIT:** [`MARKET-MATERIAL-RESEARCH-01-SOURCE-AUDIT.md`](./MARKET-MATERIAL-RESEARCH-01-SOURCE-AUDIT.md) · **COMPLETE**  
> **Owner GO DESIGN FREEZE:** **YES** — 2026-08-11  
> **Owner GO AMEND (Hard SF Edge allowlist):** **YES** — 2026-08-11  
> **Owner GO Stage A COMMIT/PUSH/PV:** **YES** — GREEN  
> **Owner GO Stage B IMPLEMENT:** **YES** — 2026-08-11  
> **Hard SF files:** `research-job-lease.ts` · routes in `index.tsx` · `scripts/test-market-material-research-01-hard-sf.mjs`  
> **Stage B files:** `market-material-research-*.ts` · `scripts/test-market-material-research-01.mjs`  
> **Next gate:** **OWNER GO COMMIT** (Stage B) · Legal PASS przed live HTTP

```text
OWNER LOCKED PRODUCT PRINCIPLE
──────────────────────────────
WGDOM MUST NOT research all material prices.

Research ONLY materialKeys required by actual tenders
AND ONLY when Price Memory has NO usable CURRENT accepted price.

After validation + Owner Accept:
  materialKey → accepted price → Price Memory → reuse by future tenders

Future tender with CURRENT:
  REUSE → ZERO external research

PRIMARY GOAL:
  As #tenders ↑  →  external research per tender ↓  (not ↑)
```

```text
LAYER LOCK (UNCHANGED)
──────────────────────
Purchase / CK     = ONLY Real Cost source
Market Quotes     = compare / PE / Price Memory ONLY
PRICE-PATH-01     = consumer path — OUT of mutate
BOM / SCREED / PAINTING / DECOMP / Bid / VAT / package = OUT
NO INVENT         → PRICE_GAP
Legal Gate live   = OPEN (blocks live HTTP until PASS)
```

---

## 0. DF readiness checklist

| Criterion | Status |
|-----------|--------|
| Product principle locked (research only needed keys) | **PASS** |
| CACHE-FIRST / CURRENT → ZERO external locked | **PASS** |
| Unique keys + cross-tender dedup locked | **PASS** |
| Single-flight + job identity locked | **PASS** |
| Global rate limit + concurrency locked | **PASS** |
| Short cooldown + background worker locked | **PASS** |
| Source STOP + product cache semantics locked | **PASS** |
| Price history + controlled persistence locked | **PASS** |
| No full crawl / no render research / no invent locked | **PASS** |
| Market ≠ Real Cost locked | **PASS** |
| Legal Gate OPEN · one provider first locked | **PASS** |
| Mandatory load examples locked | **PASS** |
| OUT of scope / protected surfaces locked | **PASS** |
| No implementation in this gate | **PASS** |

**DESIGN FREEZE STATUS: PASS**

---

## 1. Objective (FROZEN)

Zamrozić **architekturę** demand-driven market research, która:

1. Buduje **własną** bazę cen WGDOM (Price Memory / Quotes).  
2. **Minimalizuje** obciążenie: PostgreSQL/Supabase · backend · frontend · sklepy · sieć.  
3. REUSE FIRST istniejącego: demand registry · manual Accept · `marketQuotes` · history · identity map · PE freshness · PRICE-PATH hosts.  
4. **Nie** startuje od live HTTP / scrapera / trzech sklepów naraz.

**Sukces tego DF ≠ IMPLEMENT.**  
**Sukces DF =** semantyka A–S zamrożona · Architecture Review może ocenić load/safety.

---

## 2. Architectural model (FROZEN)

```text
Tender
  → required materialKeys (from BOM / bound materials)
  → unique materialKeys
  → L1 cache lookup (accepted CURRENT market price)

CURRENT (usable):
  → REUSE
  → no demand execution
  → no external request

MISSING / STALE (not usable CURRENT):
  → demand registry upsert
  → cross-tender dedup
  → cooldown check
  → single-flight
  → background research job (async)

Worker:
  → claim job (ONE active per job identity)
  → global source rate limit
  → global concurrency limit
  → product cache lookup (L2)

  Known product (L2 hit):
    → price refresh only (no full discovery)

  Unknown product:
    → controlled product discovery (narrow · key-scoped · NEVER full crawl)

  → candidate
  → identity validation
  → unit validation
  → provenance
  → freshness
  → Owner Accept (trust boundary)
  → Quotes LAST + history archive
  → Price Memory (L1)

No accepted result:
  → PRICE_GAP (wycena nadal działa · Market null)
```

**Wycena / Chief request NIGDY nie czeka na external research.**  
Demand upsert = fail-soft · non-blocking (jak dziś `recordPriceDemandsFromExperts`).

---

## 3. Cache levels (semantics ONLY — no invent storage)

| Level | Semantics | Existing reuse (audit) | New storage in IMPLEMENT? |
|-------|-----------|------------------------|---------------------------|
| **L1** | `materialKey` → accepted **CURRENT** market price | `CatalogWork.marketQuotes` + PE freshness · Price Memory | Prefer **reuse** Quotes/Memory — **nie invent** nowego store bez Arch Review amend |
| **L2** | `materialKey` → validated market **product identity** | `material-market-map` (`workId` / `marketProductId`) | **MUST/SHOULD** semantics; physical store = reuse map + optional future field **only after amend** — **ZERO invent storage in this DF** |
| **History** | material/product/source/region → historical prices | `marketQuoteHistory` ring (cap 24) | **MUST** reuse existing ring pattern |
| **Demand** | missing/stale `materialKey` → research demand | `kw-price-intelligence-demand` | Reuse registry; may extend fields (cooldown/job link) **bez** dual demand stores |
| **Research Job** | `materialKey`[/source] → execution state | **MISSING today** | New job model allowed in IMPLEMENT **only after** Arch Review + GO; prefer minimal extension, not parallel pricing DB |

**DF rule:** nie projektować „nowej SQL Price DB” ani „drugiego katalogu cen” bez osobnego Owner amend.  
**DF rule:** L2 = semantyka product identity; implementacja storage = REUSE FIRST.

---

## 4. Locked safety rules (ABSOLUTE / MUST)

| # | Rule | Strength |
|---|------|----------|
| 1 | **CACHE-FIRST** | MUST |
| 2 | **UNIQUE materialKeys** per tender before enqueue | MUST |
| 3 | **GLOBAL CROSS-TENDER DEDUP** (same key → same job) | MUST |
| 4 | **SINGLE-FLIGHT** | MUST |
| 5 | **GLOBAL RATE LIMIT PER SOURCE** (not per user) | MUST |
| 6 | **GLOBAL CONCURRENCY LIMIT** | MUST |
| 7 | **SHORT COOLDOWN** per materialKey after attempt | MUST |
| 8 | **BACKGROUND WORKER** (nie w request wyceny) | MUST |
| 9 | **SOURCE STOP** (first good approved path → stop) | MUST |
| 10 | **PRODUCT CACHE** | MUST/SHOULD — reuse map; no invent storage |
| 11 | **PRICE HISTORY** | MUST |
| 12 | **CONTROLLED PERSISTENCE** | MUST |
| 13 | **NO FULL CRAWL** | ABSOLUTE |
| 14 | **NO RESEARCH FOR CURRENT** | ABSOLUTE |
| 15 | **NO FRONTEND RENDER RESEARCH** | ABSOLUTE |
| 16 | **NO INVENT PRICE** | ABSOLUTE |
| 17 | **MARKET ≠ REAL COST** | ABSOLUTE — Purchase only for Real Cost |

---

## 5. Freeze register A–S

### A. Cache-first semantics

1. Lookup L1 for each unique `materialKey`.  
2. If **CURRENT** (accepted + freshness usable per existing PE/Memory rules) → **REUSE** · skip demand execution · **ZERO** external.  
3. If **MISSING** or **STALE** (not usable as CURRENT) → may enter demand → job path.  
4. **STALE ≠ CURRENT** — stale may refresh via job, but must not silently present as CURRENT (PRICE-PATH / PE rule preserved).

### B. Material dedup (per tender)

BOQ may list the same `materialKey` N times → **ONE** cache lookup / dedup key → **NOT** N jobs.

### C. Cross-tender dedup

Same `materialKey` needed by Tender A and Tender B while research pending → **ONE** active job · both tenders are consumers.

### D. Single-flight

```text
ONE materialKey → ONE active research job → MANY consumers
N users × same key → 1 external research (not N)
```

### E. Job identity

Canonical job key (semantic):

```text
jobId = materialKey
        + optional sourceScope (default: "default" until single-provider locked)
        + regionScope (when regional quotes apply)
```

**Invariant:** at most **one ACTIVE** job per `jobId`.  
States: see §6.

### F. Global source rate limit

Limit is **global per external source** (e.g. future `leroy` | `castorama` | `obi`), shared across all users/sessions/tenders.  
**NOT** per-user quota as primary control.  
Concrete numbers = **NOT frozen here** (unknown without Legal/provider contract) — mechanism MUST exist.

### G. Concurrency limit

Hard cap on parallel external calls globally (`maxInFlightExternal = N`, N finite, small).  
Queue excess jobs as PENDING — never unbounded fan-out.

### H. Cooldown

After a research attempt for `materialKey` (success, fail, or empty):

- Short cooldown TTL blocks **new** external attempts for that key.  
- Distinct from 90d freshness window.  
- Prevents request storms / retry loops.

### I. Background execution

- Valuation / Expert / UI render: **enqueue demand only** (or no-op if CURRENT).  
- Research runs in **background worker** (future IMPLEMENT: client worker and/or Edge — **choice deferred to Arch Review**, semantics identical).  
- Main request **must not block** on shop HTTP.

### J. Source ordering / STOP

Ordered source preference (future, after Legal PASS):

```text
1) licensed API
2) legal feed
3) Owner-approved export
4) scraper — ONLY after Legal PASS
```

**One provider first** — NOT three shops simultaneously in first IMPLEMENT slice.  
If first provider yields a **valid candidate** that passes identity+unit+provenance gates for Accept path → **STOP** further sources for that job.

### K. Product cache

- If L2 / map already has validated product identity for `materialKey` → **price refresh only**.  
- Full product discovery only when identity unknown.  
- Discovery is **key-scoped** · never shop-wide crawl.  
- Storage: REUSE `material-market-map` / CatalogWork identity — **do not invent** new DB in this DF.

### L. Price history

- Before overwriting LAST Quotes cell → archive previous into history ring (existing S1-A pattern).  
- History is **not** CURRENT without freshness rules.  
- Cap / ring semantics: reuse existing (24) unless Arch Review amends.

### M. Controlled persistence

**Never:** one raw research hit = one trusted DB/Quotes write.

Persist to Price Memory / Quotes **only after**:

- identity validation  
- unit validation  
- provenance  
- acceptance policy (**Owner Accept** trust boundary unless future separate Owner-approved auto policy)

Staging/candidate may be ephemeral or Feature staging (MARKET-SYNC pattern) — **not** automatic L1 CURRENT.

### N. PRICE_GAP semantics

| Situation | Result |
|-----------|--------|
| No L1 CURRENT | Market price = null / PRICE_GAP |
| Job pending | PRICE_GAP (non-blocking) |
| Research failed / empty / rejected | PRICE_GAP |
| Owner did not Accept | PRICE_GAP |
| Invent / default / guessed PLN | **FORBIDDEN** |

Wrong price **worse** than missing price.

### O. Legal gate

- Live HTTP / scrape / credentials: **BLOCKED** while Legal Gate = **OPEN** (aligned with MARKET-SYNC-01 P3).  
- Mock / manual / Owner-approved CSV export: allowed paths (existing).  
- Live IMPLEMENT requires: **Legal PASS** + Owner GO + this DF still in force.

### P. No full crawl

**ABSOLUTE ban:**

- crawl entire Leroy / Castorama / OBI catalogs  
- import all products  
- unbounded discovery loops  

Only **needed** `materialKeys` from real tenders.

### Q. No render-triggered research

Frontend mount / re-render / list virtualization **MUST NOT** start external research.  
UI may: show demand status · open manual research · display Memory — only.

### R. No invent

No fake, default, orientacyjne, ETICS-copied, cross-key, or package-as-unit PLN.  
Missing → PRICE_GAP.

### S. Market ≠ Real Cost

| Layer | Role |
|-------|------|
| **Purchase / CK** | **Only** Real Cost (`purchaseUnitPln × BOM qty`) |
| **Market / Quotes / PE** | Compare / analysis / Price Memory |
| Market | **MUST NOT** enter Real Cost sum |
| Market | **MUST NOT** fallback-fill Purchase |

PRICE-PATH-01 dual-path remains authoritative.

---

## 6. State machines (FROZEN)

### 6.1 Cache / price usability

```text
MISSING  → no accepted Quotes / unusable
STALE    → accepted exists but outside usable CURRENT window
CURRENT  → accepted + usable freshness → REUSE ONLY

STALE may enqueue refresh job.
CURRENT must NOT enqueue external research.
```

### 6.2 Demand registry

```text
none → MISSING/STALE detected → DEMAND_UPSERTED
DEMAND_UPSERTED → (cooldown clear + not CURRENT) → JOB_ELIGIBLE
JOB_ELIGIBLE → JOB_ACTIVE (single-flight claim)
JOB_* terminal → demand may RESOLVED (market layer) or remain OPEN with PRICE_GAP
```

(Reuse existing demand statuses where possible: `MISSING|QUEUED|RESOLVED` — map in IMPLEMENT without breaking PI P3.2.)

### 6.3 Research job lifecycle

```text
PENDING
  → CLAIMED (single-flight)
  → RATE_WAIT (global source limit)
  → RUNNING
  → CANDIDATE_READY
  → AWAITING_ACCEPT   (Owner Accept boundary)
  → ACCEPTED → L1 write + history → SUCCEEDED
  → REJECTED / EMPTY / FAILED → PRICE_GAP + cooldown
  → CANCELLED (optional)

Terminal: SUCCEEDED | FAILED | EMPTY | REJECTED | CANCELLED
Active: CLAIMED | RATE_WAIT | RUNNING | CANDIDATE_READY | AWAITING_ACCEPT
Invariant: ≤1 Active job per jobId
```

### 6.4 Failure / retry

| Event | Behavior |
|-------|----------|
| Transient source error | Retry with backoff **inside** rate limit + concurrency; then FAILED + cooldown |
| Permanent empty | EMPTY + cooldown · PRICE_GAP |
| Validation fail (unit/identity) | REJECTED · **no** L1 write · PRICE_GAP |
| Accept declined | REJECTED · PRICE_GAP |
| Duplicate enqueue while ACTIVE | Attach consumer · **no** second job |
| CURRENT appears mid-flight | Prefer cancel/no-op external · REUSE wins |

**Forbidden:** unlimited polling loops · tight spin retry · per-render retry.

---

## 7. Load model (FROZEN examples)

### Example 1 — Tender A: farba + grunt + jastrych

| Case | External jobs |
|------|----------------|
| All CURRENT | **0** |
| Only farba MISSING | **max 1** |

### Example 2 — Tender B: farba + grunt + płytki + klej

- farba CURRENT · grunt CURRENT · płytki MISSING · klej MISSING  
→ **max 2 jobs** (not 4)

### Example 3 — 10 users need `mat.grunt` simultaneously

→ **1** active job · **10** consumers · **NOT** 10 external requests

### Example 4 — Learn then reuse

- Tender 1: farba MISSING → research → Owner Accept → L1 CURRENT  
- Tender 2: same farba CURRENT → **ZERO** external research

### Example 5 — BOQ duplicates

- Same `materialKey` × 20 lines in one BOQ  
→ **ONE** dedup key / cache lookup · **NOT** 20 jobs

### Primary goal metric (design intent)

```text
tenders ↑  ⇒  cache hit rate ↑  ⇒  external calls per tender ↓
```

---

## 8. DB read / write model (FROZEN)

### Reads

- Batched L1 / demand lookups by unique keys where possible.  
- No per-line N+1 research triggers.  
- No polling loop from UI.

### Writes

| Allowed | Forbidden |
|---------|-----------|
| Demand upsert (deduped) | Raw scrape hit → Quotes |
| Job state transitions (future) | N duplicate job rows for same jobId |
| Accept → Quotes + history archive | Invent default PLN |
| Controlled/batched persist | One HTTP response = automatic trusted write |

Prefer: **dedup + controlled/batched persistence**.

---

## 9. External source model (FROZEN)

| Source | Live today | DF stance |
|--------|------------|-----------|
| Leroy | NO | Future candidate · after Legal PASS · **not** first-three-at-once |
| Castorama | NO | Same |
| OBI | NO | Same · note: manual path maps OBI→`wgdom` origin today — do not invent DIY origin change here |
| licensed API / legal feed / Owner export | Preferred order | First live path when Legal PASS |
| scraper | Last resort | **ONLY** after Legal PASS |

**Do not invent** API shapes, feeds, or numeric rate limits in this DF.  
**Do not implement** scraping in IMPLEMENT without Legal PASS + GO.

**First IMPLEMENT provider slice:** **exactly one** source path (single-provider), mock-capable until Legal PASS.

---

## 10. Acceptance / trust boundary (FROZEN)

External research result is **NOT** automatically a trusted WGDOM price.

Before Price Memory / L1 CURRENT, require:

| Field | Required |
|-------|----------|
| identity (`materialKey` ↔ product/work) | YES |
| unit (match BOM / host unit) | YES |
| origin / source | YES |
| acceptedAt | YES |
| region | if applicable |
| currency | **PLN** |
| freshness | YES |
| current vs historical | YES |

**Owner Accept** remains the trust boundary unless a **future separately Owner-approved automatic policy** is frozen in a later DF amend.

---

## 11. Security / safety boundaries

| Boundary | Rule |
|----------|------|
| Payroll / CORE sync | **OUT** — FEATURE-DATA only; no Payroll merge changes |
| Secrets / API keys | No client-exposed credentials; live adapters Legal-gated |
| Frontend | No stealth network research |
| Real Cost | Purchase only |
| BOM / recipes | Immutable in this epic |
| PRICE-PATH | Consumer only — no semantic rewrite |
| bid-time-load-guard WIP | **OUT** · do not touch |
| Cloud new DATA_KEYS | Only if Arch Review explicitly amends · prefer reuse existing keys |

---

## 12. Reuse map (IMPLEMENT guidance — not authorization)

| Need | Prefer |
|------|--------|
| Demand registry | `price-intelligence/demand-*` |
| Manual Accept path | `manual-price-research.ts` · `commitMarketQuotesImport` |
| L1 Quotes | `kw-wgdom-work-catalog` / `marketQuotes` |
| History | `marketQuoteHistory` + `price-memory.ts` |
| Identity | `material-market-map` |
| Freshness | `pricing-expert/market-freshness.ts` |
| CSV/ops ingest | MARKET-SYNC pipeline (Legal-aligned) |
| Economy hosts | PRICE-PATH-01 ensure (structure only) |

---

## 13. OUT OF SCOPE (ABSOLUTE for this epic)

- Scraper implementation / live HTTP / API integration **before** Legal PASS + GO  
- New pricing engine  
- New BOM / recipes / SCREED / PAINTING / DECOMP changes  
- Package conversion / VAT  
- Bid bridge / Bid calculator / Offer adapter changes  
- Purchase semantics changes (Real Cost stays Purchase)  
- PRICE-PATH semantic changes  
- `bid-time-load-guard` WIP  
- Full shop crawls  
- Research-all-materials programs  
- Invent PLN / fake seeds  

---

## 14. Allowlist input (for future IMPLEMENT — NOT authorized now)

| Candidate | Role |
|-----------|------|
| `src/lib/price-intelligence/*` | Demand/job/cooldown/single-flight orchestration (minimal) |
| Optional worker module under price-intelligence or market-sync | Background execution |
| Tests `scripts/test-market-material-research-01*.mjs` | NEW harness |
| Docs / changelog | Release stage only |

**Extra file outside future Arch-Review-approved allowlist → STOP.**  
**This DF gate: ZERO CODE.**

---

## 15. Gate sequence

```text
SOURCE AUDIT COMPLETE
  → DESIGN FREEZE COMPLETE  (this document)
  → ARCHITECTURE REVIEW
  → OWNER GO IMPLEMENT (optional thin slices)
  → Legal PASS required before any live external source
  → COMMIT / PUSH / PV only on explicit Owner GO each
```

---

## 16. Mandatory freeze confirmation

| ID | Freeze item | Locked |
|----|-------------|--------|
| A | cache-first | YES |
| B | material dedup | YES |
| C | cross-tender dedup | YES |
| D | single-flight | YES |
| E | job identity | YES |
| F | global source rate limit | YES |
| G | concurrency limit | YES |
| H | cooldown | YES |
| I | background execution | YES |
| J | source ordering / STOP | YES |
| K | product cache | YES (semantics; no invent storage) |
| L | price history | YES |
| M | controlled persistence | YES |
| N | PRICE_GAP | YES |
| O | legal gate | YES |
| P | no full crawl | YES |
| Q | no render-triggered research | YES |
| R | no invent | YES |
| S | Market ≠ Real Cost | YES |

---

**MARKET-MATERIAL-RESEARCH-01 DESIGN FREEZE COMPLETE**

CODE = ZERO  
DB = ZERO  
COMMIT = NONE  
PUSH = NONE  
PRODUCTION = UNCHANGED  

**WAITING FOR ARCHITECTURE REVIEW**
