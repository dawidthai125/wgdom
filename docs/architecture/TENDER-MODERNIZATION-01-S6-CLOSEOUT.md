# TENDER-MODERNIZATION-01 / S6 — CLOSEOUT (Decision Persist Bridge)

> **STATUS:** **S6 CLOSED** · **PRODUCTION VERIFIED** · POST RELEASE COMPLETE  
> **ID:** TENDER-MODERNIZATION-01-S6-CLOSEOUT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S6 — Decision Persist → legacy bridge**  
> **Production Version:** **2.66.22** (bez bumpa UI)  
> **Feature / Deploy Commit:** **`cb91027d`** (`cb91027dde1658184a8e290d24ba3d266b5cbfa4`) · `version.json` **`cb91027`**  
> **Data:** 2026-08-08  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PV:** [`TENDER-MODERNIZATION-01-S6-PRODUCTION-VERIFY.md`](TENDER-MODERNIZATION-01-S6-PRODUCTION-VERIFY.md)  
> **DF:** [`TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md)  
> **IMPLEMENT:** [`TENDER-MODERNIZATION-01-S6-IMPLEMENT.md`](TENDER-MODERNIZATION-01-S6-IMPLEMENT.md)  
> **Prior tip:** TM-01 S5 @ **`ebae3d2e`**

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S6 — CLOSED

2.66.22 / cb91027d
PRODUCTION VERIFIED

Persist-first @ DecisionWorkspaceHost
  SUCCESS → mapPersistActionToLegacyOwnerDecision → setOwnerDecision
  FAIL → ZERO legacy mirror
  missing/mismatch scoringBundle → Persist KEEP · mirror SKIP

Map: approve→GO · reject→NO-GO · needs_review→HOLD
scoringBundle = REUSE intelligenceCtx only · NO new engine
Stores: kw-decision-persist-v1 append · kw-tender-decisions upsert · NO third key
S4 Hub DW KEEP · S5 Decyzja overview KEEP · DecisionView KEEP
Persist API NO TOUCH

Harness S6 28 · S2 45 · S4 37 · S5 27 · OV PASS · Bundle PASS

S0–S6 = CLOSED · S7–S8 = OPEN
ACTIVE EPIC = NONE
TRYB = UTRZYMANIE
NEXT: TENDER-MODERNIZATION-01 / S7 · WAITING FOR OWNER GO → AUDIT
════════════════════════════════════════════════════════
```

---

## 1. Delivered

| Krok | Treść |
|------|--------|
| **S6-A** | `mapPersistActionToLegacyOwnerDecision` (pure · zero I/O) |
| **S6-B** | Host Persist-first · `scoringBundle` · `setOwnerDecision` |
| **S6-C** | DetailPanel + HubPanel prop-drill |
| **S6-D** | Harness + S2/S5 assert updates |

---

## 2. Explicit OUT (LOCKED)

| Item | Status |
|------|--------|
| Expert / Chief / Session / Validation / Adapters / TF BC | **NO TOUCH** |
| Persist API signatures / schema | **NO TOUCH** |
| New scoring engine / `scoreTender` in Host | **FORBIDDEN** |
| Third decision store / cloud Persist | **FORBIDDEN** |
| Strategy rewrite · DecisionView delete | **OUT** |
| S4/S5 UX rewrite | **OUT** (KEEP) |
| S7 TRE · S8 REMOVE | **OUT** |
| `useTenderOfferRun.ts` | **LOCAL WIP** · nie tip |

---

## 3. Rollback

`git revert cb91027d` (UI allowlist) · Persist history KEEP · legacy rows optional leave · brak migracji down.

---

## 4. Residual / NEXT

| | |
|--|--|
| **Local WIP** | `src/app/hooks/useTenderOfferRun.ts` (M) — poza S6 |
| **NEXT** | **TM-01 S7** TRE deprecate path — **tylko Owner GO → AUDIT** |
| **EPIC** | TM-01 **nie** CLOSED (S7–S8 OPEN) |
