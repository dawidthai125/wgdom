# IK-MIGRATION-01 — P9 IMPLEMENTATION CLOSEOUT

> **ID:** `IK-MIGRATION-01-P9-IMPLEMENTATION-CLOSEOUT`  
> **Date:** 2026-08-16  
> **Owner GO:** TAK — IMPLEMENT + TEST + BUILD + PUSH + ONE-SHOT PV  
> **JSON:** `.tmp/p9-implementation-closeout.json`  
> **Plan DF:** [`IK-MIGRATION-01-P9-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P9-PLAN-DESIGN-FREEZE.md)  
> **Truth Gates:** [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md)  
> **P8 LOCKED:** [`IK-MIGRATION-01-P8-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P8-PRODUCTION-VERIFY.md) · `1f980aa0` / live tip `6f58c8e`

---

## FINAL STATUS

```text
P9 IMPLEMENTATION = PASS
TEST = PASS (53 PASS / 0 FAIL + Validation + P4 reuse)
BUILD = PASS
P9 GATE = PASS
FULL REGRESSION = PASS EXCEPT KNOWN PRE-EXISTING F5-T2
F5-A = OUT OF P9 GATE (documented)
UI = 2.66.86 (changelog)
BRAK ikP9* lever
RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0
CatalogWork 471 = UNCHANGED
D diff = 0 (session guard)
Controlled Owner Verify = NOT_EXERCISED (manual only)
P10 = NOT STARTED
P5.33 = DO NOT CREATE
```

---

## What shipped

| Piece | Detail |
|-------|--------|
| Lib | `ik-p9-owner-verify.ts` — target UUID · Gate A/B evaluators · `runIkP9OwnerVerify` · D snapshot/diff · permission REUSE |
| Order | **Gate A → Gate B → Owner Verify** (frozen) |
| Target | `08def45d-ead6-5db8-962b-120001d33d37` |
| UI | `IkP9OwnerVerifyMarker` on `TenderDetailPage` (`data-ik-p9-*`) — no auto Owner Verify |
| Lever | **NONE** — no `ikP9*` / `ikOwnerVerifyEnabled` |
| Locks | researchExecuted=false · httpCalls=0 · accept/create/bind/catalog/pm write=false |

---

## PRE-EXISTING F5 BASELINE EXCEPTION (F5-A)

| Field | Value |
|-------|--------|
| **Test** | `scripts/test-tender-boq-pricing-rebuild-01-f5-bid-cutover.mjs` |
| **Failure** | `T2 labor next` (`cmp.next.laborPln === 2000`) |
| **Observed** | **36 PASS / 1 FAIL** |
| **Verified** | Same FAIL on **clean `main`** with P9 WIP stashed |
| **P9 IMPACT** | **NONE** |
| **P9 CODE IMPACT** | **NONE** (P9 does not touch F5 / Bid / Position Cost) |
| **Decision** | **F5-A** — exclude from **P9 release gate only** |
| **Scope** | **OUT OF P9 GATE** |
| **P7** | **LOCKED / unchanged** |
| **F5-B hotfix** | **NOT SELECTED** — test content / expectations / engine **not** modified |

**Reporting rule:** do **not** claim the F5 cutover suite as PASS. Report:

```text
FULL REGRESSION = PASS EXCEPT KNOWN PRE-EXISTING F5-T2
P9 GATE = PASS
```

F5/Bid/PackageGate/SUM coverage for P9 gate: P7 suite · `test-cost-s6-bid-proposal-integration.mjs` · `test-multi-dwelling-01.mjs`.

---

## P2 / P3 Accept false-positive (Option B)

| File | Assert | Fix |
|------|--------|-----|
| `test-ik-migration-01-p2-implementation.mjs` | `P2 host does not call Accept` | hostAcceptProbe strips P8 telemetry |
| `test-ik-migration-01-p3-implementation.mjs` | `W no Accept in host P3 path` | same probe |

- Original regex `/autoAccept/` matched P8 LOCKED `data-ik-p8-auto-accept` / `autoAcceptExecuted`
- **No** P9 Accept invocation · **P8 unchanged** · production code **unchanged**
- Real call forms still fail: `acceptCatalog` · `AcceptCandidate` · `\bautoAccept\s*\(`

---

## Boundaries confirmed

| Boundary | Result |
|----------|--------|
| P0–P8 engines | untouched |
| Dual Outcome D | snapshot before/after · diff must = 0 |
| CatalogWork 471 | UNTOUCHED |
| Price Memory | UNTOUCHED |
| Research / HTTP | hard lock 0 |
| Accept / CREATE / BIND / WRITE | hard lock 0 |
| P10 / P5.33 | not started / do not create |

---

## Tests

```text
npx vite-node scripts/test-ik-migration-01-p9-implementation.mjs
→ 53 PASS / 0 FAIL

P0–P5.32 · domain · matcher · PASS2 · Material · MMR · Bid · PackageGate/SUM
P6 · P7 · P8 · P9 · RW-03 → PASS
F5 cutover T2 → PRE-EXISTING / OUT OF P9 GATE (F5-A)
npm run build → PASS
```

---

## STOP

```text
P10 = NOT STARTED
P5.33 = DO NOT CREATE
Controlled Owner Verify on prod = NOT auto-run
```
