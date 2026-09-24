# IK-IDENTITY-KLAMKI-CLOUD-PERSISTENCE-LOSS — CLOSEOUT

> **ID:** `IK-IDENTITY-KLAMKI-CLOUD-PERSISTENCE-LOSS-CLOSEOUT`
> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED = YES**
> **Data:** 2026-09-24
> **UI:** **2.66.235**
> **Commit:** **`643bd6e0`** (`643bd6e0fbe716cc09eefbf5c60483b4b0a373fa`)
> **Baseline (pre-fix):** **`398b7c85`** (`398b7c8536248fb543be57c5c041b9b52b164dea`)
> **Push:** fast-forward `398b7c85..643bd6e0` → `origin/main`
> **Prod:** https://www.wgdom.fun · `/version.json` → `version=2.66.235` · `commit=643bd6e`
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §1.1d
> **Reuse:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)
> **Continuity:** [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)
> **Tip SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)
> **DOCUMENTATION CLOSEOUT:** **`f756b27b1538f4c3143b11a0f1c76c593fbce6c9`** (`f756b27b`) — DOCUMENTATION-ONLY · ≠ application tip · NO DEPLOY
> **Application:** **`643bd6e0` / 2.66.235**
> **PAYROLL / Finance / Eq·Tr·Waste / Rate·Catalog:** **OUT OF SCOPE** — untouched

## 0.1 Canonical distinction (no RCA rewrite)

```text
IDENTITY LOGIC = VALID / CLOSED
PERSISTENCE CONVERGENCE = FIXED / CLOSED
```

REUSE: full RCA / C+D evidence remains in §§1–9 below — do not duplicate.


---

## 0. One-line verdict

**Gated multi-dwelling identity persistence** no longer reports SUCCESS on local `writes.length` alone: batch attach is local-only (suspend ×N), then **one** awaited cloud flush, then **required cloud readback**. Non-browser live `persistKey` is fail-closed without explicit opt-in.

```text
IK-IDENTITY-KLAMKI-CLOUD-PERSISTENCE-LOSS = CLOSED
PRODUCTION VERIFIED = YES

≠ FULL IK AUTONOMY CLOSED
≠ Finance Gate / READY_TO_BID CLOSED
≠ Eq/Tr/Waste CLOSED
≠ Rate/Catalog drift 0815-04 FIXED
≠ RECLASS / CREATE / CONNECT semantic rewrite
```

---

## 1. Incident / RCA (confirmed only)

| Step | Content |
|------|---------|
| **Symptom** | Cloud reapply of 3 klamki RECLASS lines ended **durable 2/3** — `obl_d6175564` (wygodna) lost to stale RMW. |
| **Root cause** | Gated multi-dwelling identity batch issued **intermediate** package cloud persists (fire-and-forget) while attaching N dwellings → parallel blind RMW on `kw-multi-dwelling-package-v1` → later stale snapshot could overwrite earlier durable state. |
| **Architecture** | Lost-update on shared package key (score-tie / merge path) — **not** RECLASS contract failure. |
| **Out of scope** | Identity allowlist / Safe Merge eligibility / OUR RATE / BOM / Finance / Payroll. |

---

## 2. C — cloud flush latch

| Element | Contract |
|---------|----------|
| Sync `runGatedIdentityPersist` | After local writes → `gateStatus=incomplete` · `cloudFlush=pending` · `success=false` · attaches `cloudFlushPromise` |
| Settle | `settleGatedIdentityPersistCloud` / `runGatedIdentityPersistAwaitCloud` → **`await cloudFlushPromise`** |
| SUCCESS | Only after flush resolves successfully (presence of Promise ≠ SUCCESS) |
| Callers | Orchestra + autonomous writeback use **`isGatedIdentityPersistSuccess`** (not `writes.length`) |
| Flush fail | `gateStatus=fail` · SUCCESS forbidden · no auto-retry / no rollback |

---

## 3. D — post-push cloud readback

| Element | Contract |
|---------|----------|
| After flush OK | `readCloudTenderPackage` → `verifyGatedIdentityCloudReadback` |
| Per target line | `lineId` · `workId` · `mappingId` · attestation · protected `qty` / `unit` / `description` / `price` |
| SUCCESS | Requires `cloudReadback=pass` when `writeCount>0` |
| Fail | Partial / mismatch / protected drift → `gateStatus=fail` |
| Local helper | `readbackGatedIdentityLocalLines` ≠ production SUCCESS proof |
| Soft-disable | Test harness may mirror local under `WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH=1` — **not** production cloud path |

---

## 4. Lost-update closure

```text
ATTACH × N  (cloud:false · under runWithMultiDwellingCloudPushSuspended)
  → ONE flushMultiDwellingPackageStoreToCloud(finalStore)
  → await cloudFlushPromise
  → CLOUD READBACK
  → SUCCESS | FAIL
```

- No intermediate fire-and-forget package push during gated batch.
- Regression: **3-dwelling lost-update PASS** (exactly 1 flush attempt · all three dwellings TARGET).

---

## 5. Live-cloud safety guard

| Runtime | Rule |
|---------|------|
| Browser (prod UI) | Allowed (unchanged) |
| Non-browser (vite-node / CI / scripts) | Live write/read requires **`WGDOM_ALLOW_LIVE_MULTI_DWELLING_CLOUD_PUSH=1`** |
| Without opt-in | **`[WGDOM_LIVE_CLOUD_BLOCKED]`** before `persistKey` |
| Soft dry-run | `WGDOM_DISABLE_MULTI_DWELLING_CLOUD_PUSH=1` → skip network (tests) |
| Module | `src/lib/multi-dwelling/cloud-push-safety.ts` · assert in `store.ts` flush/push |

---

## 6. Validation (pre-push / commit)

| Suite | Result |
|-------|--------|
| Persistence C+D | **31/31** |
| Identity persist execution seam | **25/0** |
| GO-AUTO | **27/0** |
| CONNECT | **63/0** |
| RECLASS | **77/0** |
| CREATE | **80/0** |
| CREATE_KPL | **62/0** |
| AID | **22/0** |
| `npm run build` | **PASS** |

---

## 7. Production verification (2026-09-24)

| Gate | Result |
|------|--------|
| Deploy path | Vercel Git Integration after `git push origin main` (no CLI `vercel deploy`) |
| `/version.json` | `{"version":"2.66.235","commit":"643bd6e",...}` |
| HTTP | `/` · `/version.json` · main JS → **200** |
| Shell | module + `app-core` preload present |
| Bundle markers (app-core) | `cloudFlushPromise` · `isGatedIdentityPersistSuccess` · `WGDOM_LIVE_CLOUD_BLOCKED` |
| Regression signal | **NONE** |
| Cloud / prod data mutation in PV | **0** |

---

## 8. Protected domains

| Domain | Status |
|--------|--------|
| Payroll | UNTOUCHED |
| Finance Gate / READY_TO_BID | UNTOUCHED |
| Rate / Catalog / Safe Merge allowlist | UNTOUCHED |
| Equipment / Transport / Waste | UNTOUCHED |
| RECLASS / CREATE / CREATE_KPL / CONNECT semantics | UNTOUCHED (regression PASS only) |

---

## 9. Git / release record

| Field | Value |
|-------|-------|
| Baseline | `398b7c8536248fb543be57c5c041b9b52b164dea` |
| Commit | `643bd6e0fbe716cc09eefbf5c60483b4b0a373fa` |
| Message | `feat(ik): fix gated cloud persistence convergence` |
| Files | **13** (persist seam · orchestra/writeback · store · cloud-push-safety · tests · changelog) |
| Push | FF `398b7c85..643bd6e0` |
| HEAD = origin/main | `643bd6e0` · ahead/behind **0/0** |
| Unrelated dirty WT | Preserved (auto-g1 · our-work-rate* · discovery-allowlist · docs/scripts) |

---

## 10. Known unrelated — PRE_EXISTING_RATE_DRIFT

| Item | Status |
|------|--------|
| WorkId | `cw.knr.knr-2-02.0815-04.m2` |
| Expected | **13.15** |
| Actual | **26.64** |
| Scope | **OUTSIDE** this release — do **not** fix here · do **not** claim Rate CLOSED |

---

## 11. Key files (REUSE — do not duplicate)

| File | Role |
|------|------|
| `orchestra/ik-identity-persist-glue.ts` | Gated persist · settle · readback · SUCCESS contract |
| `orchestra/ik-autonomous-identity-writeback.ts` | AwaitCloud · `isGatedIdentityPersistSuccess` |
| `orchestra/use-ik-orchestra.ts` | Latch / F5 only after SUCCESS |
| `multi-dwelling/store.ts` | Suspend · flush · attach `cloud:false` |
| `multi-dwelling/cloud-push-safety.ts` | Live opt-in guard |
| `scripts/test-multi-dwelling-cloud-persistence-loss-fix.mjs` | C+D + guard regression |

---

## 12. CLOSEOUT stamp

```text
IK-IDENTITY-KLAMKI-CLOUD-PERSISTENCE-LOSS = CLOSED
PRODUCTION VERIFIED = YES
COMMIT = 643bd6e0
UI = 2.66.235
DOCUMENTATION CLOSEOUT = f756b27b1538f4c3143b11a0f1c76c593fbce6c9
IDENTITY LOGIC = VALID / CLOSED
PERSISTENCE CONVERGENCE = FIXED / CLOSED
```
