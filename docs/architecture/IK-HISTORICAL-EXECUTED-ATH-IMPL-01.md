# IK — HISTORICAL EXECUTED ATH · IMPLEMENTATION #01

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-IMPL-01` |
| **Status** | **IMPLEMENTATION = PASS WITH GAPS** |
| **Date** | 2026-08-20 |
| **Owner GO** | **YES** |
| **Arch Review** | [`IK-HISTORICAL-EXECUTED-ATH-ARCH-REVIEW-01.md`](./IK-HISTORICAL-EXECUTED-ATH-ARCH-REVIEW-01.md) **PASS WITH GAPS** |
| **Design Freeze** | [`IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01.md`](./IK-HISTORICAL-EXECUTED-ATH-DESIGN-FREEZE-01.md) |
| **Shadow #03** | [`IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03.md`](./IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03.md) |

```text
IMPLEMENTATION         = PASS WITH GAPS
COMMIT                 = AUTHORIZED (OD-IMPL-1 scoped · local only)
PUSH / DEPLOY          = NOT AUTHORIZED
Host hydration (9 ATH) = NOT WIRED (OD-IMPL-2 NOT STARTED)
KL-6 / Level A / Catalog writes = 0
```

---

## 1. Implementation scope

READ-ONLY **Historical Executed WGDOM Knowledge**:

- in-memory index from ATH / occurrences  
- pure lookup L0–L5 kinds  
- wire into `runIkKnrExpert` → `buildIkKnrConversation` → EC  
- soft P8 reasons on CONFLICT (MISS never blocks)  
- optional `historicalIndex` prop on `IkEntryHost`  

**Out of scope:** Host auto-load of 9 jobs · Labor/Material rate writes · Level A · KL-6 · new Catalog KV · L4 semantic.

---

## 2. Exact files changed

| File | Role |
|------|------|
| `src/lib/intelligent-estimator/historical-executed/*` | **NEW** types · normalize · index · lookup |
| `src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts` | `includeIncompleteRms` option |
| `src/lib/intelligent-estimator/ik-knr-expert.ts` | historical field + counts |
| `src/lib/intelligent-estimator/ik-knr-conversation.ts` | EC historical narrative |
| `src/lib/intelligent-estimator/ik-p8-risk-decision.ts` | soft knrHistorical |
| `src/app/intelligent-estimator/IkEntryHost.tsx` | prop + pass to KNR/P8 |
| `src/lib/intelligent-estimator/index.ts` | exports |
| `scripts/test-historical-executed-ath.mjs` | **NEW** harness |
| `docs/architecture/IK-HISTORICAL-EXECUTED-ATH-IMPL-01.md` | this file |
| `docs/architecture/IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03.md` | Shadow #03 |

---

## 3. Exact seam

```text
parseAthKnrNormExport({ includeIncompleteRms: true })
  → buildHistoricalExecutedIndexFromAthSources | FromOccurrences
  → lookupHistoricalExecuted(query, index)          [PURE]
  → runIkKnrExpert({ historicalIndex })             [IkEntryHost ~KNR useMemo]
  → buildIkKnrConversation(report)
  → buildIkEntryConversationViewModel → ExpertConversationSurface
  → runIkP8RiskDecision({ knrHistorical: knr })     [Soft CONFLICT only]
```

---

## 4. Reuse map

| Component | Action |
|-----------|--------|
| `parseAthKnrNormExport` | REUSE + extend option |
| `buildKnrNormContentHash` | REUSE |
| `runIkKnrExpert` / conversation / EC Surface | EXTEND |
| `runIkP8RiskDecision` | EXTEND soft |
| KL-3 HOST / KL-6 / write-router | **untouched** |
| PDF Candidate | untouched |

---

## 5. Match contract

Kinds: `HISTORICAL_EXACT_RMS` · `EXACT` · `FAMILY` · `CONFLICT` · `MISS`  
Levels: L0…L5 (DF). L4 OFF.  
`authority: false` always.  
No VERIFIED/APPROVED/REJECTED statuses.

---

## 6. Provenance contract

Result carries: jobs · ATH paths · hashes · identity · chapters · descriptions · occurrence counts · conflict variants · `evidenceRef` · soft hints (non-pricing).

---

## 7. Conflict behavior

Fail-closed · keep all variants · no majority/first/latest.  
Fixture: `KNR 2-05 1003-06` ŚCIANY/M0.18 vs BIAŁY MONTAŻ/M0.33 → CONFLICT (H-HIST-04).

---

## 8. Miss behavior

`HISTORICAL_MISS` first-class · Expert COMPLETED · lineStatus from basis unchanged · P8 does **not** mention MISS · no tender block (H-HIST-MISS-FLOW).

---

## 9. Authority invariants

```text
historicalAuthority = false
catalogWorkIdWritten = 0
no executeKnrOwnerVerify*
no persistVerified*
no write-router
Labor/Material rates not written from history
```

---

## 10. Tests

```text
npx vite-node scripts/test-historical-executed-ath.mjs
→ 67 PASS / 0 FAIL

Regression:
  test-ik-knr-expert-slice-b.mjs     PASS
  test-ik-knr-expert-slice-c2.mjs    PASS (533)
  test-knr-pdf-match-candidate.mjs   PASS
```

---

## 11. Shadow Test #03

See [`IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03.md`](./IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03.md) — PASS WITH GAPS (Host corpus hydrate OPEN).

---

## 12. Known gaps

| ID | Gap | Class |
|----|-----|-------|
| IG-1 | App does not yet build/pass `historicalIndex` from completed jobs | SOFT |
| IG-2 | ATH parser family=KNR path — limited NNRNKB/KNNR | SOFT |
| IG-3 | ValidationFindingCode union not extended — P8 reasonsPl Soft instead | SOFT (by design) |
| IG-4 | L4 semantic OFF | FROZEN |
| IG-5 | Master SSOT pointer not updated (no silent edit) | DOC |

---

## 13. Open Owner decisions

| ID | Question |
|----|----------|
| OD-IMPL-1 | GO commit? |
| OD-IMPL-2 | Wire Host corpus load from `kw-jobs` completed ATH (next slice)? |
| OD-IMPL-3 | Persist projection KV (still forbidden until separate GO)? |

---

```text
STOP — no commit / push / deploy without Owner GO.
```
