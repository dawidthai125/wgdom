# IK — REAL TENDER BOQ INGEST BLOCKER · IMPL #01

| Field | Value |
|-------|-------|
| **ID** | `IK-REAL-TENDER-BOQ-INGEST-BLOCKER-IMPL-01` |
| **Date** | 2026-08-21 |
| **Mode** | **IMPLEMENTATION A ONLY** · no commit · no push · no deploy |
| **ARCH** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-ARCH-REVIEW-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-ARCH-REVIEW-01.md) — HB1+HB2 accepted |
| **DF** | [`IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01.md`](./IK-REAL-TENDER-BOQ-INGEST-BLOCKER-DESIGN-FREEZE-01.md) |

```text
IMPLEMENTATION = COMPLETE / PASS WITH GAPS
HB1 = PASS
HB2 = PASS
T01–T12 = PASS (31/31 harness)
REGRESSION = PASS (P2.5 ingest · KNR Slice B)
REAL TENDER #05c = PASS WITH GAPS (proxy Host lifecycle; MOPS absent in local pipeline)
VERIFY = 0
APPROVE = 0
REJECT = 0
CATALOG WRITES = 0
KL-6 = UNCHANGED
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

---

## 1. Scope

**IN:** Host P2 lifecycle latch only (generation · isStale · owner-safe `bridgeBusy` · remove P2 permanent attempt latch · fingerprint deps · HB1 `onUpdateRef` · HB2 pipeline flag refs).

**OUT:** B TenderDetailPanel · C QuotaExceeded · D TendersModule · Historical · KNR Expert · PDF Candidate · EC · P8 · KL-6 · VERIFY/APPROVE/REJECT · write-router · Catalog · evidence · LLM · NG-02 bridge contract · `readyForExperts` semantics.

Unrelated WIP in `IkEntryHost` (KL-3 knowledge side-channel) **left intact**.

---

## 2. Changed files

| Path | Change |
|------|--------|
| `src/lib/intelligent-estimator/ik-entry-p2-ingest-latch.ts` | **NEW** — pure predicates (fingerprint · isStale · release · cleanup invalidate · double-start) |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | P2 effect rewrite only (HB1/HB2 + generation) |
| `scripts/test-ik-entry-p2-ingest-latch.mjs` | **NEW** — T01–T12 + HB source contracts |
| `docs/architecture/IK-REAL-TENDER-BOQ-INGEST-BLOCKER-IMPL-01.md` | this report |

**NOT changed:** `ik-ng02-ingest-bridge.ts` · `ik-knr-expert.ts` · `TenderDetailPanel.tsx` · Historical · Catalog · KL-6.

---

## 3. HB1 / HB2 verification

| HB | Evidence | Result |
|----|----------|--------|
| **HB1** | `onUpdateRef.current = onUpdate`; apply via `onUpdateRef.current`; effect deps comment + omit `onUpdate` | **PASS** |
| **HB2** | `dossierBuilding` / `dossierEnriching` primitives in deps; `dossierBuildingRef` / `dossierEnrichingRef` for gates + post-wait; no `pipelineIngest` object identity in deps | **PASS** |

---

## 4. Lifecycle behavior (implemented)

```text
gates (before BEGIN) → ++generation → owner=gen → busy=true
  → optional 1500ms wait (hasPipelineIngest) reading HB2 refs
  → runIkNg02IngestBridge (itemRef / getTenderPackage snapshot)
  → live only: setIngest + onUpdateRef patches
  → finally: releaseIfOwner(gen)
cleanup: cancelled + p2CleanupInvalidate (bump + owner-safe busy clear)
```

- Synthetic `ingest=started` remains UI-derived (`bridgeBusy && !ingest`).
- Permanent P2 `attemptedRef` **removed** → cancel no longer blocks retry.
- Stale gen cannot set ingest / cannot clear newer busy.
- `readyForExperts` never Host-forced.

---

## 5. Test matrix T01–T12

Harness: `npx vite-node scripts/test-ik-entry-p2-ingest-latch.mjs` → **31 PASS / 0 FAIL**

| ID | Result |
|----|--------|
| T01 success | PASS |
| T02 cancel | PASS |
| T03 error | PASS |
| T04 early before BEGIN | PASS |
| T05 retry after cancel | PASS |
| T06 retry after error | PASS |
| T07 stale generation | PASS |
| T08 double start | PASS |
| T09 unmount | PASS |
| T10 rapid fingerprint change | PASS |
| T11 old success after new | PASS |
| T12 old cancel after new | PASS |
| + HB1/HB2 source asserts | PASS |

---

## 6. Regression

| Suite | Result |
|-------|--------|
| `scripts/test-ik-migration-01-p25-ingest.mjs` | **23 PASS / 0 FAIL** (live bridge extract OK) |
| `scripts/test-ik-knr-expert-slice-b.mjs` | **95 PASS / 0 FAIL** (incl. BLOCKED not ready / MASTER gate) |

Banlist surfaces untouched by this IMPL.

---

## 7. Localhost smoke (#05c)

**Env:** Vite `http://127.0.0.1:5173` (existing `npm run dev`).

| Check | Result |
|-------|--------|
| Login admin | PASS |
| Exact MOPS `2026/BZP 00391783` / `08def932-…` in local pipeline list | **FAIL / ABSENT** after sync window (GAP — data availability, not latch) |
| Proxy tender Host mount (`08def844-…/przetarg`) | PASS |
| `data-ik-ingest-phase` | `idle` (terminal · **not** stuck `started`) |
| extracted lines | `154` |
| `data-ik-master-ready` | `0` (honest · not forced) |
| KNR | `BLOCKED` (legitimate while not ready) |

**#05c verdict:** **PASS WITH GAPS** — latch terminal behavior observed on live Host; exact MOPS tender not present in current local BZP queue for end-to-end BOQ re-ingest. Re-run Owner UI when MOPS is in pipeline.

Artifacts: `.tmp/smoke-05c-boq-ingest.json` (direct URL miss) · console proxy samples above.

---

## 8. Known gaps (soft — not expanded)

| Gap | Status |
|-----|--------|
| SG1 same-length doc swap without `documentsFetchedAt` | OPEN (accepted) |
| SG2 `pkg` outside deps — snapshot via `getTenderPackage` at call | DONE |
| SG3 error retry = effect re-entry only | intentional |
| SG4 harness = pure sim + source contracts | DONE |
| SG5 B/C/D residual | OUT |
| MOPS not in local list during #05c window | GAP for exact tender |

No soft gap escalated to HARD during IMPL.

---

## 9. Banlist confirmation

| Surface | Touch? |
|---------|--------|
| NG-02 bridge contract | NO |
| `readyForExperts` contract | NO |
| KNR Expert / Historical / PDF / EC / P8 / KL-6 | NO |
| VERIFY / APPROVE / REJECT / write-router / Catalog / evidence / LLM | NO |
| TenderDetailPanel / Quota / TendersModule | NO |

```text
VERIFY = 0
APPROVE = 0
REJECT = 0
CATALOG WRITES = 0
KL-6 = UNCHANGED
```

---

## 10. Final

```text
IMPLEMENTATION = COMPLETE / PASS WITH GAPS
HB1 = PASS
HB2 = PASS
T01–T12 = PASS
REGRESSION = PASS
REAL TENDER #05c = PASS WITH GAPS
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

**STOP — brak commit / push / deploy. Czekaj na Owner GO.**
