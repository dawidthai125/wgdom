# TENDER-MODERNIZATION-01 / S8 — PLAN (Hard REMOVE / Bid retirement)

> **STATUS:** **PLAN COMPLETE** · **DF COMPLETE** · **IMPLEMENT COMPLETE (HOLD)** · **WAITING FOR OWNER GO → COMMIT**  
> **ID:** TENDER-MODERNIZATION-01-S8-PLAN  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S8 — Hard REMOVE / Bid retirement**  
> **TRYB:** **PLAN** (zamknięty przez DF · OPTION A HOLD) · ZERO kodu w PLAN  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** · feature **`617f0cb5`** · docs tip **`df395eed`** · `origin/main` **`df395eed`**  
> **Owner GO PLAN:** 2026-08-08 (jawny)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S8-AUDIT.md`](TENDER-MODERNIZATION-01-S8-AUDIT.md) (**COMPLETE**)  
> **DF SSOT:** [`TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S8-DESIGN-FREEZE.md) (**COMPLETE** · **OPTION A HOLD**)  
> **MASTER:** [`TENDER-MODERNIZATION-01-MASTER.md`](TENDER-MODERNIZATION-01-MASTER.md) § S8  
> **Epic DF:** [`TENDER-MODERNIZATION-01-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-DESIGN-FREEZE.md) § S8 · L8 G1–G8 · AC-S8-1…4  
> **Decision SSOT:** [`DECISION-ARCHITECTURE.md`](DECISION-ARCHITECTURE.md)  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **NO TOUCH**  
> **IMPLEMENT:** [`TENDER-MODERNIZATION-01-S8-IMPLEMENT.md`](TENDER-MODERNIZATION-01-S8-IMPLEMENT.md) (**COMPLETE** · ZERO code)  
> **Next:** Owner GO **COMMIT** (docs allowlist) · **nie** invent code · **nie** auto-start

```text
════════════════════════════════════════════════════════
S8 PLAN — THREE OPTIONS

AUDIT LOCKED:
  Hard REMOVE of Bid / DecisionView / kw-tender-decisions /
  TRE Outcome / Offer Run / OfferBoq / S6 = BLOCKED

OPTION A — HOLD REMOVE          ← ★ RECOMMENDED
OPTION B — MICRO DEAD-EXPORT    ← optional hygiene only
OPTION C — MIGRATE              ← no fit for 4 symbols;
                                  broader migrate = OUT of S8 micro

DECISION RULE APPLIED:
  Static zero-call-site ≠ absolute L8 REMOVE proof
  → default KEEP / HOLD

STOP — WAIT OWNER GO → COMMIT (docs allowlist HOLD)
════════════════════════════════════════════════════════
```

---

## 0. Inputs (frozen from AUDIT)

| Surface | Class | REMOVE now? |
|---------|-------|-------------|
| Intelligence / Hub Insights | KEEP | **NO** |
| DecisionView | KEEP (demote write @ Expert ON) | **NO** |
| `kw-tender-decisions` | MIGRATE (long) / KEEP now | **NO** |
| Bid / OfferBoq | KEEP · S3-D BLOCKED | **NO** |
| TRE Outcome / Offer Run | KEEP recovery + R0 | **NO** |
| S6 bridge / Persist | KEEP | **NO** |
| 4 symbols (§2) | potential micro | **see options** |

---

## 1. Per-symbol proof matrix (PLAN evidence)

Method: repo-wide search (`src/` · `scripts/` · docs) excluding `node_modules` / `dist` / `.tmp*`.  
**Occurrences outside definition + S8 AUDIT docs = 0** for all four names.

### 1.1 `digestOfferRunSnapshot`

| # | Check | Result |
|---|-------|--------|
| 1 | **Definition** | `src/lib/tender-offer-run-foundation.ts` L53–61 · `createDigest` on snapshot fields |
| 2 | **Direct consumers** | **NONE** (no import / call) |
| 3 | **Indirect consumers** | **NONE** · sibling `digestRecommendationPayload` **IS** used by `useTenderOfferRun` + `test-tre-01-offer-run.mjs` |
| 4 | **Runtime** | Never invoked · dead export (tree-shake likely) |
| 5 | **Tests** | **NONE** reference this symbol (TRE-01 uses `digestRecommendationPayload`) |
| 6 | **Build** | No named import → no compile dependency |
| 7 | **Dynamic/string** | No string `"digestOfferRunSnapshot"` outside definition/AUDIT |
| 8 | **Behavior if removed** | **No runtime change** (today) |
| 9 | **Migration required?** | **NO** — nothing to migrate |
| 10 | **Rollback** | restore export from tip / `git revert` |

**Caveat (non-absolute):** Foundation spine API symmetry (digest snapshot vs recommendation). Removal is hygiene, not product. Future harness could have used it.

### 1.2 `emitOfferRunDegradedAudit`

| # | Check | Result |
|---|-------|--------|
| 1 | **Definition** | `tender-offer-run-foundation.ts` L126–141 · uses `TRE_01_AUDIT_RUN_DEGRADED` |
| 2 | **Direct consumers** | **NONE** |
| 3 | **Indirect** | Hook uses **`emitOfferRunDegradedEvent`** (L168+) — parallel Event path **LIVE** |
| 4 | **Runtime** | Never invoked |
| 5 | **Tests** | **NONE** call Audit variant |
| 6 | **Build** | No named import |
| 7 | **Dynamic/string** | Symbol name only at definition (+ AUDIT) · constant `TRE_01_AUDIT_RUN_DEGRADED` only inside this function |
| 8 | **Behavior if removed** | **No runtime change**; if also drop unused constant → still no runtime change |
| 9 | **Migration?** | **NO** — Event path already SSOT for degrade |
| 10 | **Rollback** | restore function (+ constant) |

**Caveat:** Audit vs Event dual surface is intentional FND pattern; only Audit half unused.

### 1.3 `resetOfferRunIdMemoryForTests`

| # | Check | Result |
|---|-------|--------|
| 1 | **Definition** | `src/lib/tender-offer-run.ts` L103–106 · clears `offerRunIdMemory` Map |
| 2 | **Direct consumers** | **NONE** (no test imports it) |
| 3 | **Indirect** | Memory Map **IS** used by `readStoredOfferRunId` / `writeStoredOfferRunId` (live) |
| 4 | **Runtime** | Never called in prod |
| 5 | **Tests** | **NONE** currently call reset (TRE-01 does not import it) |
| 6 | **Build** | No named import |
| 7 | **Dynamic/string** | Name only at definition (+ AUDIT) |
| 8 | **Behavior if removed** | **No current test/runtime change**; **reduces** future test isolation API |
| 9 | **Migration?** | **NO** |
| 10 | **Rollback** | restore export |

**Caveat:** Explicit `ForTests` API — unused today ≠ permanently dead. Removing weakens harness toolkit.

### 1.4 `removeOwnerDecision`

| # | Check | Result |
|---|-------|--------|
| 1 | **Definition** | `src/lib/tenders-strategy-owner-decisions.ts` L120–125 · immutable delete from `byId` |
| 2 | **Direct consumers** | **NONE** in `src/` UI/hooks |
| 3 | **Indirect** | Store CRUD siblings `upsertOwnerDecision` / `load` / `save` **LIVE**; Strategy readers live |
| 4 | **Runtime** | Never invoked |
| 5 | **Tests** | `test-tender-center-owner-decisions.mjs` uses **upsert only** · S6 harness string-checks `upsertOwnerDecision` · **no** `removeOwnerDecision` assert |
| 6 | **Build** | No named import |
| 7 | **Dynamic/string** | Name only at definition (+ AUDIT) |
| 8 | **Behavior if removed** | **No tip UI change**; shrinks public store API |
| 9 | **Migration?** | **NO** for symbol · store itself remains KEEP |
| 10 | **Rollback** | restore export |

**Caveat:** Public store API completeness; future “clear decision” UX would need recreate. **Not** a store REMOVE.

---

## 2. OPTION A — HOLD REMOVE ★ RECOMMENDED

### Intent

No functional deletion. Document why product REMOVE remains blocked. Defer even symbol prune until Owner explicitly values hygiene.

### Why A wins (DECISION RULE)

| Reason | |
|--------|--|
| Hard REMOVE surfaces | Still **BLOCKED** (AUDIT) |
| Symbol proof | Static zero-call-site **yes** · absolute L8 product value **no** |
| Rule | „If zero-consumer proof is not absolute → **KEEP / HOLD**” |
| Risk/reward | Micro-delete = noise · tip churn · WIP contamination risk if touching Offer Run file |
| Tip stability | S7 just CLOSED · UTRZYMANIE |

### Allowlist (A)

| Allowlist | |
|-----------|--|
| Docs only | S8 PLAN · (later) DF HOLD · optional AUDIT status |
| Code | **EMPTY** |

### OUT (A)

Everything in §6 OUT · plus any symbol delete · any file delete.

### AC-S8 (A — HOLD)

| AC | Assertion |
|----|-----------|
| AC-S8-H1 | No code tip change for S8 REMOVE |
| AC-S8-H2 | AUDIT+PLAN document HOLD reasons |
| AC-S8-H3 | Regression harnesses remain green **without** S8 code diff (baseline) |
| AC-S8-H4 | `useTenderOfferRun.ts` untouched |

### Regression (A)

| Gate | Expect |
|------|--------|
| S2 | **45 PASS** (no change) |
| S4 | **37 PASS** |
| S5 | **27 PASS** |
| S6 | **28 PASS** |
| S7 | **30 PASS** |
| Build | **PASS** (unchanged) |
| OV-S8 | Owner confirms HOLD · no prod UI delta |

### Rollback (A)

N/A (no code). Docs tip optional.

---

## 3. OPTION B — MICRO DEAD-EXPORT CLEANUP (optional)

### Intent

Delete **only** the four `export function` bodies/names **if** Owner GO DF explicitly chooses B.  
**No file deletion.** **No behavior change.** Re-grep mandatory at IMPLEMENT.

### Exact allowlist (B) — LOCKED if chosen

| File | Change |
|------|--------|
| `src/lib/tender-offer-run-foundation.ts` | Remove `digestOfferRunSnapshot` · Remove `emitOfferRunDegradedAudit` · optionally unused `TRE_01_AUDIT_RUN_DEGRADED` **only if** solely referenced by removed Audit fn |
| `src/lib/tender-offer-run.ts` | Remove `resetOfferRunIdMemoryForTests` only |
| `src/lib/tenders-strategy-owner-decisions.ts` | Remove `removeOwnerDecision` only |
| Docs | S8 DF/IMPLEMENT/PV notes |
| Harness | Optional assert „symbol absent” — **not** required |

### Exact OUT (B)

| OUT |
|-----|
| Whole file deletes |
| DecisionView · TRE Outcome · Offer Run modules · Bid · OfferBoq |
| `kw-tender-decisions` / Persist / S6 bridge |
| Strategy semantics · scoring · third store |
| `useTenderOfferRun.ts` (**even** if adjacent) |
| `emitOfferRunDegradedEvent` / `digestRecommendationPayload` / `upsertOwnerDecision` |
| S3-D · Hub · Autonomous · Intelligence |

### Behavior / migration

| | |
|--|--|
| Behavior delta | **Expected ZERO** |
| Migration | **NONE** |
| Parity | N/A |

### AC-S8 (B)

| AC | Assertion |
|----|-----------|
| AC-S8-1 | Re-grep `src/`+`scripts/`: zero references to removed symbols |
| AC-S8-2 | Osobny Owner GO REMOVE (micro) |
| AC-S8-3 | Diff ⊆ §3 allowlist |
| AC-S8-4 | PV: no UI/behavior delta (smoke Hub + recovery CTA still present) |
| AC-S8-5 | S2=45 · S4=37 · S5=27 · S6=28 · S7=30 · build PASS |
| AC-S8-6 | Bid/OfferBoq/DecisionView/stores/S6 **untouched** in diff |
| AC-S8-7 | `useTenderOfferRun.ts` **not** in tip diff |
| AC-S8-8 | S7 markers `data-s7-hub-first` / `data-s7-tre-recovery-cta` still in DetailPage source |

### OV-S8 (B)

| OV | Check |
|----|-------|
| OV-S8-1 | Expert ON Hub-first still |
| OV-S8-2 | Recovery CTA still works |
| OV-S8-3 | Expert OFF LS=`1` Outcome R0 still |
| OV-S8-4 | Strategy / lejek unchanged |
| OV-S8-5 | No console/regression from Offer Run |

### Rollback (B)

`git revert <micro-sha>` · never force-push.

### PLAN note on B

B is **valid hygiene**, not epic progress toward Bid/DecisionView/store REMOVE.  
Choosing B does **not** unlock S3-D.

---

## 4. OPTION C — MIGRATE

### Fit for the 4 symbols?

| Symbol | Migrate to existing SSOT? |
|--------|---------------------------|
| `digestOfferRunSnapshot` | **NO** — unused; sibling digest already SSOT for recommendation |
| `emitOfferRunDegradedAudit` | **NO** — Event path already used; Audit unused |
| `resetOfferRunIdMemoryForTests` | **NO** — test helper, not domain migrate |
| `removeOwnerDecision` | **NO** — no caller to move; store KEEP |

**Verdict C for symbols:** **N/A / OUT**.

### Broader MIGRATE (documented, OUT of this S8 micro PLAN)

| Track | Status | Note |
|-------|--------|------|
| Strategy readers → Persist | OPEN long | Requires Strategy rewrite · **OUT** S8 micro · 8 LOCK / NO BIG-BANG |
| S3-D Bid deprecate authoritative | BLOCKED | Consumers ≫ 0 · needs own Owner GO AUDIT→DF |
| DecisionView write → DW-only | Partially done (Expert ON) | Expert OFF still needs legacy write · DELETE blocked |

Do **not** start these under S8 PLAN without separate Owner scope.

---

## 5. Comparison

| Criterion | A HOLD | B MICRO | C MIGRATE |
|-----------|--------|---------|-----------|
| Product REMOVE progress | None (honest) | None | N/A for symbols |
| Behavior risk | Zero | Near-zero | High if forced on live surfaces |
| Tip churn | Docs only | 3 lib files | Large |
| L8 readiness | HOLD documented | Symbols only | Blocked for stores/Bid |
| Fits DECISION RULE | **YES** | Conditional Owner opt-in | No fit |
| Unlocks Bid/DecisionView delete? | No | No | Only as separate tracks |

---

## 6. Exact OUT (all options)

| OUT |
|-----|
| Remove DecisionView / TRE Outcome / Offer Run / Bid / OfferBoq files |
| Remove `kw-tender-decisions` / Persist / S6 bridge |
| Modify Strategy semantics / scoring / third store / third engine |
| Touch `useTenderOfferRun.ts` |
| Blind cleanup / unrelated refactor / S4–S5 UX rewrite |
| Auto DF / IMPLEMENT / commit / push |
| Assume unused-export lint = L8 REMOVE |

---

## 7. Recommended decision for DF

```text
★ PRIMARY: OPTION A — HOLD REMOVE

Document in S8 DF:
  - Hard REMOVE surfaces = BLOCKED (cite AUDIT)
  - Symbol micro = DEFERRED (not in tip) unless Owner amends DF to B
  - NEXT residual: S3-D / Strategy←Persist / DecisionView retirement
    = osobne Owner GO → AUDIT tracks
  - ACTIVE EPIC slice S8 can CLOSE as HOLD (docs) OR stay OPEN residual
    (Owner chooses in DF)

OPTIONAL AMEND: OPTION B only with explicit Owner line in DF:
  "S8-B MICRO DEAD-EXPORT ALLOWLIST = 4 symbols"
```

---

## 8. Proposed DF freeze seeds (not DF — PLAN only)

| Seed | Content |
|------|---------|
| Scope | HOLD (A) default |
| Allowlist code | empty (A) **or** §3 (B) |
| OUT | §6 |
| AC | §2 AC-S8-H* (A) **or** §3 AC-S8-1…8 (B) |
| Regression | S2=45 S4=37 S5=27 S6=28 S7=30 · build |
| OV | HOLD: no UI delta · B: OV-S8-1…5 |
| Rollback | A N/A · B revert |
| Protected | `useTenderOfferRun.ts` |

---

## 9. Residual backlog (not S8 IMPLEMENT)

| Residual | Gate |
|----------|------|
| S3-D Bid authoritative deprecate | Owner GO → AUDIT |
| Strategy migrate off `kw-tender-decisions` | Owner GO → AUDIT (post-parity) |
| DecisionView file REMOVE | After Expert OFF write retirement + L8 |
| TRE Outcome / Offer Run REMOVE | After S7 recovery retirement + L8 |
| Symbol micro B | Optional DF amend |

---

## 10. STOP

```text
PLAN COMPLETE
RECOMMENDATION = OPTION A (HOLD REMOVE) → LOCKED IN DF
OPTIONAL = OPTION B (micro symbols) only via DF amend
OPTION C = no fit for listed symbols

DF COMPLETE · OPTION A HOLD REMOVE
IMPLEMENT COMPLETE · ZERO functional code
WAIT: OWNER GO → COMMIT (docs allowlist)
DO NOT invent cleanup · DO NOT manufacture feature commit
```
