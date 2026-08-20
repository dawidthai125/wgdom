# IK — HISTORICAL EXECUTED ATH · SHADOW TEST #03

| Field | Value |
|-------|-------|
| **ID** | `IK-HISTORICAL-EXECUTED-ATH-SHADOW-TEST-03` |
| **Date** | 2026-08-20 |
| **Mode** | **SHADOW / READ-ONLY** |
| **IMPL** | [`IK-HISTORICAL-EXECUTED-ATH-IMPL-01.md`](./IK-HISTORICAL-EXECUTED-ATH-IMPL-01.md) |
| **Tender** | `2026/BZP 00391783` · MOPS Wrocław |
| **Harness** | `npx vite-node scripts/test-historical-executed-ath.mjs` → **67 PASS / 0 FAIL** |

```text
SHADOW TEST #03 = COMPLETE / PASS WITH GAPS

PENDING_VERIFY = 0
VERIFY = 0
APPROVE = 0
REJECT = 0
catalogWrites = 0
KL-6 = 0
Host live corpus load = NOT WIRED (optional prop only)
```

---

## A. Tender identity

Same as Shadow #01 / #02:

| Field | Value |
|-------|-------|
| BZP | `2026/BZP 00391783` |
| Pipeline id | `08def932-550d-d6f5-962b-1200014aa6e7` |
| Docs | 3× PDF przedmiar · **0× ATH** |
| Rows | **88** |

---

## B. Method

1. Unit/integration harness H-HIST-01…18 + KNR/EC wiring (PASS).  
2. Offline join (Audit #01) of PDF rows × harvest 9 ATH — **expected live distribution** once Host receives `historicalIndex`.  
3. Host default without prop ⇒ all lines `HISTORICAL_MISS` (first-class · not error) — verified by H-HIST-MISS-FLOW.

**Not executed:** Owner VERIFY · Catalog write · live Edge corpus hydrate into Host.

---

## C. Expected kind distribution (corpus join · Audit baseline)

| Kind | ~count (88) | Notes |
|------|------------:|-------|
| HISTORICAL_EXACT / EXACT_RMS | **~21** | L0 rare on PDF (no identityKeyV2) → mostly L2 EXACT |
| HISTORICAL_FAMILY | **~48** | family-only codes |
| HISTORICAL_CONFLICT | **0–few** | if conflict display appears on BOQ |
| HISTORICAL_MISS | **~19** | NEW KNR — **not an error** |
| HISTORICAL_EXACT_RMS (L0) | **~0–3** | requires identity — PDF typically cannot |

---

## D. Provenance coverage

| Field | Harness | Live Host (MVP) |
|-------|---------|-----------------|
| job / ATH / address | YES (index) | when index provided |
| contentHash / identity | YES when FULL | same |
| authority:false | YES | YES |
| soft Labor/Material hints | YES · no rate write | not auto-applied to OUR RATE |

---

## E. False-positive / false-negative

| Risk | Mitigation |
|------|------------|
| FP FAMILY as EXACT | matchLevel 3 · confidence LOW · EC wording |
| FP L0 on PDF | identityKeyV2 forced null in Expert path |
| FN MISS when table in description | L2 via table token extract (H-HIST-13) |
| Conflict majority | forbidden · variants retained (H-HIST-04) |

---

## F. Authority audit

```text
catalogWorkIdWritten = 0
historicalAuthority = false
KL-6 calls = 0
VERIFY/APPROVE/REJECT = 0
evidence / catalog mutation = 0
```

Banlist on `historical-executed/*` PASS.

---

## G. Gaps for live Host corpus

| Gap | Class |
|-----|-------|
| `IkEntryHost` accepts `historicalIndex` but App does not yet load 9 completed-job ATH | **SOFT** |
| Parser `knrFamilyOnly` path — NNRNKB/KNNR from ATH limited | **SOFT** |
| Shadow live EC counts on localhost with full index | **SOFT** — pending Host hydrate |

---

## H. Verdict

```text
SHADOW #03 = PASS WITH GAPS
Library + KNR/EC/P8 soft seam = VERIFIED by harness
Live Host corpus injection = OPEN (optional prop ready)
```
