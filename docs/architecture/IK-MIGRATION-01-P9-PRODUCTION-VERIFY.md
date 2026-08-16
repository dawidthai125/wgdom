# IK-MIGRATION-01 — P9 PRODUCTION VERIFY

> **ID:** `IK-MIGRATION-01-P9-PRODUCTION-VERIFY`  
> **Date:** 2026-08-16  
> **JSON:** `.tmp/p9-production-verify.json`  
> **Closeout:** [`IK-MIGRATION-01-P9-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P9-IMPLEMENTATION-CLOSEOUT.md)  
> **Mode:** FINAL PRODUCTION VERIFY · ONE-SHOT · NO POLLING · CODE = 0 after push

---

## ONE-SHOT live check

| Field | Value |
|-------|-------|
| Expected UI | **2.66.86** |
| Impl commit | *(filled after push)* |
| Live `version.json` (one-shot) | *(filled after one-shot)* |
| Ancestry | impl ⊂ live OR **DEPLOY_PROPAGATING** |
| Verdict | *(filled after one-shot)* |

---

## Bundle containment (expected markers)

| Marker | Expect |
|--------|--------|
| `data-ik-p9-owner-verify` / `data-ik-p9-target` | PRESENT |
| Gate order `gate_a,gate_b,owner_verify` | PRESENT |
| Target UUID `08def45d-ead6-5db8-962b-120001d33d37` | PRESENT (identity) |
| `ikP9Enabled` / `ikOwnerVerifyEnabled` | **ABSENT** |
| RESEARCH / HTTP / ACCEPT attrs on marker | `0` |
| D diff guard attrs | PRESENT |
| P8 `ikRiskDecisionE2eEnabled` / `data-ik-p8-*` | UNCHANGED |
| P7 F5/Bid EC facts | UNCHANGED |

---

## Production locks

| Check | Status |
|-------|--------|
| No `ikP9*` lever | **PASS** |
| Controlled Owner Verify | **NOT_EXERCISED** (manual Owner only) |
| RESEARCH = 0 | **PASS** |
| HTTP = 0 | **PASS** |
| ACCEPT / CREATE / BIND / WRITE = 0 | **PASS** |
| CatalogWork **471** | **UNCHANGED** |
| D mutation protection | **PASS** (diff must = 0) |
| Mobile physical | **NOT VERIFIED** |
| F5-T2 labor-next | **PRE-EXISTING · OUT OF P9 GATE (F5-A)** — suite **not** claimed PASS |

---

## Tests / build (from closeout)

```text
P9: 53 PASS / 0 FAIL
P2/P3 Option B: PASS
P0–P8 relevant + Bid + PackageGate/SUM + RW-03: PASS
F5 cutover T2: PRE-EXISTING (not P9 gate)
BUILD: PASS
```

---

## FINAL (template — complete after one-shot)

```text
P9 = PRODUCTION VERIFIED / LOCKED   OR   DEPLOY_PROPAGATING
LIVE = <version>/<sha>
Controlled Owner Verify = NOT_EXERCISED
RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · WRITE = 0
CatalogWork = 471
D DIFF = 0
P10 = NOT STARTED
P5.33 = DO NOT CREATE
STOP.
```
