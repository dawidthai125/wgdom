# IK-IDENTITY-APPLY-MOPS-ELEC-RC1 — EPIC CLOSEOUT

> **ID:** `IK-IDENTITY-APPLY-MOPS-ELEC-RC1-CLOSEOUT`  
> **STATUS:** **CLOSED** · DOCUMENTATION + PRODUCTION CLOUD VERIFIED  
> **Data:** 2026-09-22  
> **Tender:** `08def932-550d-d6f5-962b-1200014aa6e7` (MOPS)  
> **Source seam tip:** **`b64a5d8a`** (`feat(ik): Safe Merge OWNER_RC1_VERIFY_CONNECT leaf upgrade class`)  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Reuse:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
> **Continuity:** [`INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md`](./INTELLIGENT-ESTIMATOR-AI-CONTINUITY.md)  
> **PAYROLL / Finance / Eq·Tr·Waste:** **OUT OF SCOPE** — untouched by this EPIC  

---

## 0. One-line verdict

**Six Owner-approved RC1 VERIFY_CONNECT OfferBoq lines** on MOPS were identity-unlocked through the **existing** Safe Merge identity-upgrade contract (narrow class — **not** global `p2b-*`), then continuation yielded **6/6 `positionComplete`** with FTO projection `POSITION_COMPLETE` / `position_cost` / `blocker=null`.

```text
≠ FULL IK AUTONOMY CLOSED
≠ MOPS FULL TENDER CLOSED
≠ Finance Gate / READY_TO_BID CLOSED
≠ Eq/Tr/Waste CLOSED
≠ all electrical lines CLOSED
```

---

## 1. Problem → RCA → resolution

| Step | Content |
|------|---------|
| **Problem** | Six MOPS electrical lines stayed on `legacy-elektryka-szt` despite Owner RC1 VERIFY_CONNECT mappings to existing CONNECT leaves (wylączniki / oprawy IP20). |
| **Initial cloud apply FAIL** | Safe Merge rejected local CONNECT leaves: **`LOCAL_NOT_CANONICAL_LEAF`** because eligible leaf predicate was **`/^cw\.knr\./i` only**. |
| **Secondary** | Without RC1 attestation, path would also hit **`MISSING_CANONICAL_REBIND_ATTESTATION`** (CLLR tokens are **not** substitutes for RC1). |
| **Resolution (DESIGN_A)** | **`OWNER_RC1_VERIFY_CONNECT_LEAF_UPGRADE_v1`** — fail-closed allowlist of **exactly 2** CONNECT workIds + **exactly 2** paired mappingIds + attestation **`OWNER_RC1_VERIFY_CONNECT`** + `mappingId=<exact>` in rationale. |
| **Correct wording** | Two Owner-approved RC1 VERIFY_CONNECT leaves became **eligible for the existing identity-upgrade merge contract**. **Not:** „p2b became canonical globally”. |

### 1.1 Eligible pair (SSOT — no duplicate lists)

| CONNECT workId | mappingId |
|----------------|-----------|
| `p2b-montaz-wylacznikow-szt` | `lim-mops-elec-rc1-0407-01-wylacznik-nadpradowy` |
| `p2b-montaz-opraw-oswietleniowych-szt` | `lim-mops-elec-rc1-0504-03-oprawy-ip20` |

**REUSE:** catalog constants + LIM rows · contract `owner-rc1-verify-connect-contract.ts` · apply `owner-rc1-verify-connect-apply.ts` · merge `canonical-identity-upgrade-merge.ts`.

**FORBIDDEN in this class:** `/^p2b-/` · CREATE/OPEN p2b · COMPOUND/CANONICAL_LEAF_REBIND as RC1 substitute · raw `batch-set` · merge bypass · hardcoding six lineIds in merge module.

---

## 2. Architectural path (authorities)

```text
RC1 VERIFY_CONNECT (LIM + Owner approval)
  → applyOwnerRc1VerifyConnectIdentityToLine
  → applyAutonomousIdentityLeafToLine   (attestation OWNER_RC1_VERIFY_CONNECT + mappingId=)
  → runGatedIdentityPersist
  → persistKey → pushKeysToCloudSafe
  → mergeMultiDwellingPackageStore / evaluateCanonicalIdentityUpgradeMerge
  → ACCEPT_CANONICAL_IDENTITY_UPGRADE
  → cloud readback 6/6
  → scheduleManyIkContinuations([6 lineIds])
  → existing P5/P6 / FTO walk projection
  → P7 positionComplete (cost authority)
  → FTO status POSITION_COMPLETE · stage position_cost · blocker=null
```

| Layer | Authority |
|-------|-----------|
| **Safe Merge** | Identity persistence safety (score-tie upgrade ACCEPT / REJECT) |
| **P7 / Position Cost** | Cost authority (`positionComplete`, LABOR_ONLY BOM status) |
| **FTO** | Orchestration / audit / projection ledger — **≠** cost SSOT |

---

## 3. Targets (WRITE allowlist — historical)

| KNR | lineId | dwelling | CONNECT leaf |
|-----|--------|----------|--------------|
| 0407-01 | `obl_89c4e932` | `prusa-42-9` | `p2b-montaz-wylacznikow-szt` |
| 0407-01 | `obl_4dd3a97f` | `dubois-22a-21` | `p2b-montaz-wylacznikow-szt` |
| 0407-01 | `obl_4c99f4a4` | `wygodna-10-6` | `p2b-montaz-wylacznikow-szt` |
| 0504-03 | `obl_f4ec8870` | `prusa-42-9` | `p2b-montaz-opraw-oswietleniowych-szt` |
| 0504-03 | `obl_3306cb09` | `dubois-22a-21` | `p2b-montaz-opraw-oswietleniowych-szt` |
| 0504-03 | `obl_55979672` | `wygodna-10-6` | `p2b-montaz-opraw-oswietleniowych-szt` |

**Target fields only:** `catalogWorkId` · `matchMethod` · `matchedBy` · `aiRationale` · `candidateMatches`.

---

## 4. Production evidence (closeout read-back 2026-09-22)

| Gate | Result |
|------|--------|
| **Identity cloud** | **6/6** CONNECT · `auto_contract` · `OWNER_RC1_VERIFY_CONNECT` · exact `mappingId` · qty/unit/description preserved |
| **0407 cost** | OUR RATE **19 CURRENT** · LABOR_ONLY HIT · BOM **LABOR_ONLY** · `positionComplete` **3/3** |
| **0504 cost** | OUR RATE **193 CURRENT** · LABOR_ONLY HIT · BOM **LABOR_ONLY** · `positionComplete` **3/3** |
| **FTO** | **6/6** `POSITION_COMPLETE` · `position_cost` · `blocker=null` |
| **UNINTENDED_LINES** | **0** |
| **PAYROLL** | UNTOUCHED |
| **Finance / READY_TO_BID** | UNCHANGED (tender `bidCutoverPass=false` — other lines; not this EPIC) |
| **Eq/Tr/Waste** | UNTOUCHED |

**KV production mutation:** `kw-multi-dwelling-package-v1` (6 identity lines + continuation sidecar).

**No additional** AUT-R1 / AUT-MAT / BOM invent / Price Memory / TechnologyPack / Finance / Eq·Tr·Waste writes were required for these six lines.

Artefakty sesji (nie SSOT): `.tmp/go-ik-identity-apply-mops-elec-rc1-cloud-reapply-execute-report.json` · `.tmp/audit-ik-identity-apply-mops-elec-rc1-closeout-report.json`.

---

## 5. MOPS electrical coverage (this EPIC only)

| Metric | Value |
|--------|-------|
| **Before (prior audit)** | `legacy-elektryka-szt` held **18** lines |
| **ELECTRICAL_RC1_CONNECT_CLOSED** | **6** (0407-01×3 + 0504-03×3) |
| **REMAINING_ELECTRICAL_LINES** | **12** still on `legacy-elektryka-szt` (live closeout count) |
| **IDENTITY_UNLOCK** | **+6** |

### Closed clusters

- **0407-01** ×3 → `p2b-montaz-wylacznikow-szt`
- **0504-03** ×3 → `p2b-montaz-opraw-oswietleniowych-szt`

### Explicitly OUT OF SCOPE (still open / other clusters)

Live remaining **12** on `legacy-elektryka-szt` = **3× klamki** + **3× 0501-03** + **3× 0504-07** + **3× 0402-03** (still present; not written by this EPIC).

- **0504-07** (IP44 / separate leaf — still present in package)
- **0501-03**
- **0402-03**
- klamki / reclass (other path)
- hydraulika / stolarka / gładzie
- **0815** (must remain untouched by this merge class)
- CREATE / OPEN p2b · arbitrary `p2b-*`

---

## 6. Source commits

| Item | Value |
|------|-------|
| Safe Merge SRC SEAM | **`b64a5d8a`** |
| Cloud re-apply | Owner GO execute (no app version bump required) |
| Docs closeout | this file + thin SSOT pointers |

---

## 7. NEXT (do not auto-execute)

```text
NEXT_OPEN_NODE =
  IDENTIFY NEXT KNOWLEDGE / IDENTITY CLUSTER — DO NOT AUTO-EXECUTE

Requires separate Owner GO + AUDIT.
Do not invent a new identity engine.
Do not broaden OWNER_RC1_VERIFY_CONNECT allowlist without Owner GO.
```

---

## 8. Hard bans from this closeout

- Do **not** treat `/^p2b-/` as canonical.
- Do **not** use CLLR / COMPOUND tokens as RC1 substitute.
- Do **not** bypass Safe Merge with raw `batch-set`.
- Do **not** claim Full Autonomy / MOPS full tender / Finance closed from this EPIC.
