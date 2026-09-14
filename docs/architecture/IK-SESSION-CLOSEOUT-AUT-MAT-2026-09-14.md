# IK SESSION CLOSEOUT — AUT-MAT Material SELL (2026-09-14)

> **ID:** `IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14`  
> **STATUS:** **CLOSED (capability)** · DOCUMENTATION ONLY  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Reuse:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
> **PAYROLL:** **OUT OF SCOPE** — this closeout does not document Payroll.

---

## 0. Purpose

Persist the AUT-MAT / PriceMemory session so a future GPT or Cursor **without this chat** can reconstruct:

- what was closed,
- what must be REUSED,
- what is still OPEN,
- how material SELL flows through the **ONE Decision Tree**.

```text
★★ IK IS ITS FUNCTION TREE ★★
DECISION TREE → ORCHESTRA → EXPERTS → CATALOGS / EVIDENCE / RESEARCH → PERSIST → REUSE
```

---

## 1. Problem → decision → implementation → evidence → outcome

| Step | Content |
|------|---------|
| **Problem** | MOPS tender `08def932-…`: 12 paint/prime lines had IDENTITY+RATE+BOM OK but `BRAK_CENY_MATERIALU` (missing material SELL). |
| **Decision** | REUSE existing AUT-MAT → PriceMemory Accept path. No TechnologyPack PLN. No second writer. No BidCutover rewrite. |
| **Implementation** | Ensure `cw.product.atlas_uni_grunt` · margin floor 20% · AUT_MAT Accept two retail quotes (Leroy) · durable `marketQuotes`. |
| **Evidence** | Cloud read-back CURRENT · 12/12 target lines positionComplete · `BRAK_CENY_MATERIALU` 12→0. |
| **Outcome** | Capability **`AUT_MAT_ACCEPT_2_MATERIALS_COMPLETE`** · commit **`e43acb19`** · changelog **2.66.212**. **≠** Global IK PV. |

---

## 2. Commits / tip

| Item | Value |
|------|-------|
| Feature commit | **`e43acb19`** — `feat(ik): accept canonical material sell quotes` |
| Changelog | **2.66.212** |
| Pushed | **YES** (`origin/main`) |
| Live tip | **FETCH** `/version.json` (may be ahead of this feature tip — lag EXPECTED) |

**PAYROLL commits after this tip are unrelated** — do not mix into IK residual narrative.

---

## 3. Materials closed

### 3.1 Paint — `mat.farba_lateksowa_wewnetrzna`

| Field | Value |
|-------|-------|
| Host | `cw.product.farba_lateksowa_wewnetrzna` |
| Unit | `l` |
| Source | Leroy Merlin — Luxens Lateksowa biała 10 l |
| Gross package | 99.99 PLN / 10 l |
| **priceNet (observed gross)** | **10.00 PLN/l** |
| Margin | 20% |
| **SELL** | **12.00 PLN/l** |
| decisionKind | `AUT_MAT` |
| sourceType | `market_reference` |
| provider | `leroy` |

### 3.2 Atlas — `mat.atlas_uni_grunt`

| Field | Value |
|-------|-------|
| Host | `cw.product.atlas_uni_grunt` (**≠** `mat.grunt` / `cw.product.grunt`) |
| Unit | `l` |
| Source | Leroy Merlin — ATLAS UNI-GRUNT 12 l |
| Gross package | 50.88 PLN / 12 l |
| **priceNet (observed gross)** | **4.24 PLN/l** |
| Margin | 20% (`applyGlobalCommercialMarginFloorToStore` + `OWNER_AUTHORIZED_MATERIAL_GLOBAL_MARGIN_FLOOR_PCT`) |
| **SELL** | **5.09 PLN/l** |
| decisionKind | `AUT_MAT` |
| Host ensure | `applyEconomyProductHostsToWorkCatalog` (work count 904→906) |

**HARD:** `mat.grunt` remains **MISSING** SELL — do **not** alias Atlas → generic grunt.

Casto / OBI paint quotes = **corroboration only** — **do not average** providers for Accept.

---

## 4. Critical contract — `priceNet` = observed retail GROSS

```text
DIY / Accept path:
  priceNet := observed retail GROSS PLN (per unit)
  NOT VAT-stripped net
Evidence: src/lib/price-intelligence/mmr-selective-diy-provider.ts
  priceNet = parsed.priceGrossPln
```

Do **not** reinterpret accepted PM cells as VAT-net.

---

## 5. Canonical Accept path (REUSE ONLY)

```text
evaluateAutMatMaterialAcceptContract
  → tryAutMatAcceptMaterialCandidate
  → acceptMaterialResearchCandidate
  → acceptManualMarketPriceResearchPure
  → commitMarketQuotesImport
  → CatalogWork.marketQuotes  (kw-wgdom-work-catalog)
```

SELL runtime:

```text
lookupPriceMemory / evaluateMaterialCache
  → resolveMaterialInputFromPriceMemory
  → computeSellPricePln(base, marginPct)
  → Position Cost material leg
```

**FORBIDDEN:** second PriceMemory writer · PLN inside TechnologyPack · invent PLN.

---

## 6. Persistence lesson — LWW / `updatedAt`

| Failure | Cause |
|---------|--------|
| First `union` push lost quotes | `applyMarketQuotesFromPreview` does **not** bump `CatalogWork.updatedAt`; `unionMerge` `pickNewerWork` on equal timestamps **keeps CLOUD** (no quotes). |

| Fix | Action |
|-----|--------|
| Durable Accept | Bump product-host `updatedAt` after Accept · push with **`intent`** (or ensure candidate is strictly newer than cloud). |

**Do not** regress to “write quotes then rely on union alone.”

---

## 7. Target closure (MOPS `08def932`)

| Metric | Value |
|--------|-------|
| Target lines | **12/12** (3×1204-02 · 3×1505-01 · 3×1134-01 · 3×1134-02) |
| Identity / OUR RATE / BOM | OK |
| `BRAK_CENY_MATERIALU` | **12 → 0** |
| positionComplete (target) | **12** |

---

## 8. Global package residual (post-session evidence)

| Gap | Count |
|-----|------:|
| BRAK_CENY_MATERIALU | **0** |
| BRAK_TECHNOLOGII_BOM | **69** |
| BRAK_STAWKI_ROBOT | **67** |
| BRAK_IDENTYFIKACJI_ROBOTY | **9** |
| NIEJEDNOZNACZNA_ROBOTA | **6** |

BidCutover (same tender snapshot): billable **97** · complete **12** · gapLineCount **85** · pass **false**.

```text
GLOBAL IK PRODUCTION VERIFIED = NO
FULL IK AUTONOMY = NO (North Star only)
CURRENT OPEN NODE (bid path) = OWNER_FINANCE_NOT_OK
```

`OWNER_FINANCE_NOT_OK` = **downstream gate symptom**. Upstream residuals are mostly **DATA / RESEARCH / IDENTITY / BOM** — **not** “build Finance Engine 2”.

---

## 9. Gap class rule (engine vs data)

| Residual | NOT automatic meaning | Prefer |
|----------|----------------------|--------|
| BRAK_STAWKI_ROBOT | missing AUT-R1 engine | DATA / UNIT / IDENTITY (AUT-R1 exists) |
| BRAK_TECHNOLOGII_BOM | new BOM engine | TechnologyPack / AUTO_BOM / LABOR_ONLY residual |
| BRAK_CENY_MATERIALU | new Material Price Engine | AUT-MAT + PM (this session closed **12** paint/prime) |
| OWNER_FINANCE_NOT_OK | Finance engine broken | incomplete upstream → BidCutover fail-closed |

Classify every residual: **ENGINE | DATA | RESEARCH | IDENTITY | UNIT | PERSISTENCE | SAFETY | OWNER EXCEPTION | ARCHITECTURE** before IMPLEMENT.

---

## 10. GPT ↔ Cursor (session-proven)

| Role | Duty |
|------|------|
| **ChatGPT** | Architect · research · evidence · map problem → Tree → Orchestra → Expert → Catalog · ready-to-paste Cursor prompt |
| **Cursor** | Inspect repo · REUSE · implement · test · commit/push · report evidence |

When Cursor lacks external source / ambiguity / price / regulation: **STOP → report exact question → escalate to ChatGPT/Owner**. **Never invent.**

Every durable discovery must land in Master / Reuse Map / this closeout — **not** only in chat.

---

## 11. Not touched (regression)

- TechnologyPacks / BOM factors  
- OUR RATE / AUT-R1  
- Identity / OfferBoq quantities  
- BidCutover / Finance core  
- `mat.grunt`  
- **Payroll (OUT OF SCOPE)**

---

**STOP.**
