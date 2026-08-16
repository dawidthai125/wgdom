# IK-MIGRATION-01 — LOCAL_STACK_LANDING CLOSEOUT

> **Status:** **COMPLETE**  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — land P5.27–P5.32 local stack  
> **Mode:** AUDIT → TEST → COMMIT → PUSH → PV · **NO new research / HTTP batches / Accept / CatalogWork / P5.33**  
> **JSON:** `.tmp/ik-migration-01-local-stack-landing.json`

---

## FINAL STATUS

| Stage | Status |
|-------|--------|
| **P5.26** | **LOCKED / VERIFIED** @ `1d41f619` (Accept 9/9 · Catalog 471 · REVIEW-9 frozen) |
| **P5.27** | **LANDED / PRODUCTION VERIFIED** |
| **P5.28** | **DOC_ONLY** (historical) |
| **P5.29** | **DOC_ONLY** (historical) |
| **P5.30** | **DOC_ONLY** (historical) |
| **P5.31** | **LANDED / PRODUCTION VERIFIED** |
| **P5.32** | **LANDED / PRODUCTION VERIFIED** |
| **P5.33** | **NOT STARTED** |

**Landing commit:** see `git log -1` after push (message: `IK-MIGRATION-01: land P5.27-P5.32 local stack`).

---

## TEST GATE (pre-commit)

| Suite | Result |
|-------|--------|
| P5.27-FIX existing reuse | **39/39** |
| P5.31 create/route | **35/35** |
| P5.32 Edge parity | **30/30** |
| Local SSOT ↔ Edge file `--check` | **PASS 9 keys** |
| P5.26-FIX category/PASS2 | **30/30** |
| P5.26-E matcher | **21/21** |
| P5.25 domain gate | **40/40** |
| PASS2 wave-1 | **85/85** |
| RW-03 | **16/16** |
| `npm run build` | **PASS** |

---

## EDGE

| Check | Result |
|-------|--------|
| LOCAL allowlist size | **9** |
| LOCAL Edge file map size | **9** |
| LOCAL ↔ file parity | **PASS** |
| Live health | **200 ok** |
| Live P5.31 keys (selective-lookup) | **recognized** (no `unknown_category_key`) |
| Control bogus key | **`unknown_category_key`** |
| Redeploy this landing | **NO-OP** (already aligned) |

Keys: legacy 5 + `flooring` + `repairs_wall` + `repairs_opening` + `joinery_finish`.

---

## CRITICAL REVIEW (PASS)

| Gate | |
|------|--|
| P5.26 Accept 9/9 untouched | PASS |
| REVIEW-9 untouched | PASS |
| No new CatalogWork / Accept / Bind | PASS |
| No pricing / P5.26 rate changes | PASS |
| Single SSOT allowlist → sync → Edge | PASS |
| No unauthorized URLs beyond P5.31 set | PASS |
| Domain gates retained | PASS |

---

## SCOPE COMMITTED

- `src/lib/work-catalog/work-rate-discovery-allowlist.ts` (+ index exports)
- `src/lib/intelligent-estimator/internal-first-*` (+ index) — dependency / matcher regress
- `supabase/functions/make-server-0afb8820/index.tsx` — PASS2 URL map
- `scripts/sync-work-rate-pass2-edge-from-ssot.mjs`
- tests: p525 / p526 / p526e / p527 / p531 / p532 / wave-1 allowlist
- docs: P5.27–P5.32 + POST-P5.26 reconciliation / next-stage / escalation + this closeout

**Not committed:** unrelated ~800 WT paths · `.tmp/*`

---

## VERDICT

```text
LOCAL_STACK_LANDING = COMPLETE
P5.26 = LOCKED
P5.27 / P5.31 / P5.32 = PRODUCTION VERIFIED
P5.28 / P5.29 / P5.30 = DOC_ONLY
P5.33 = NOT STARTED
```

**STOP** — no P5.33 · no research · no REVIEW · no Accept · no CatalogWork.
