# INTELLIGENT ESTIMATOR — DATA FLOW

> **ID:** `INTELLIGENT-ESTIMATOR-DATA-FLOW`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-09-14 (AUT-MAT / PriceMemory reconcile) · prior 2026-08-14  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md) §15  
> **Session:** [`IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md`](./IK-SESSION-CLOSEOUT-AUT-MAT-2026-09-14.md)  
> **Reuse:** [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)

---

## 1. Entry: Tender → BOQ

```text
Tender selected
  → Document discovery / ingest / dossier
  → OfferBoq lines (identity + qty + unit)
  → classifyEstimatorPricingPlane (BEFORE research)
  → plane routing
```

---

## 2. Classification routing

```text
LABOR     → Work Catalog path
MATERIAL  → Price Memory path
COMPOUND  → HOLD (no research, no invent, no fallback)
UNKNOWN   → HOLD (no research, no invent, no fallback)
```

Owner map counts: LABOR 29 · MATERIAL 24 · COMPOUND 6 · UNKNOWN 30.

---

## 3. MATERIAL flow (contract)

```text
★ ONE TREE (Material):
Document/Line → Classification → Material Expert (P6)
  → Research (DIY LM primary) → Evidence/Candidate
  → AUT-MAT (§0.2) → Price Memory (marketQuotes)
  → commercial margin → Material SELL
  → Position Cost → BidCutover

BOQ line (MATERIAL) / BOM component
  → Price Memory / our-price-catalog lookup
  → if CURRENT price exists:
       REUSE (HTTP 0)
  → if MISSING:
       material research (DIY LM / Casto / OBI + approved wholesalers)
       → pick correct product identity (host cw.product.* — e.g. atlas_uni_grunt ≠ mat.grunt)
       → observed retail GROSS PLN → field priceNet (NO VAT strip — see mmr-selective-diy-provider)
       → LM = primary Accept · Casto/OBI = corroboration only (do NOT average)
       → AUT-MAT Accept (§0.2) OR Owner Exception
            evaluateAutMatMaterialAcceptContract
            → tryAutMatAcceptMaterialCandidate
            → acceptMaterialResearchCandidate
            → marketQuotes (decisionKind=AUT_MAT · sourceType=market_reference · provider=leroy)
       → bump CatalogWork.updatedAt · push Work Catalog with intent (LWW-safe)
       → next tender = REUSE
  → apply existing WGDOM commercial margin (e.g. 20% floor) → SELL
  → F5 Position Cost material leg
```

**Verified example (capability `e43acb19`):** paint base 10 → SELL **12**; Atlas base 4.24 → SELL **5.09**.

**Business rule:** market observation is durable in Price Memory; WGDOM margin is a separate commercial layer (≠ Finance Bid / Kp / minMargin).

**Nie mieszać:** purchase · marketBase · companyPrice · OUR RATE · SELL · margin · Finance Bid stack.

**Gap class:** `BRAK_CENY_MATERIALU` ≠ automatic “build Material Price Engine 2” — prefer AUT-MAT + PM (REUSE).

---

## 4. LABOR flow (contract)

```text
★ ONE TREE (Labor):
Work identity → Work Catalog → Research/Evidence → AUT-R1 → OUR RATE → Position Cost

BOQ line (LABOR)
  → Work Catalog lookup (workId + unit)
  → if ourWorkRate CURRENT:
       REUSE (HTTP 0)
  → if MISSING / STALE (policy):
       runSelectiveWorkRateResearch
         PASS1 canonical + PASS2 Owner allowlist categories
         sources: KB.pl · CennikRemontow.pl · SCCOT · Extradom
         (+ inne TYLKO po allowlist Owner)
       → qualify (laborOnly · unit · identity)
       → marketBase (point or range midpoint DERIVED)
       → proposed = marketBase × (1 + marginPct/100)
       → optional Evidence write (isolated KV)
       → Candidate (ephemeral)
       → AUT-R1 (§0.2) OR Owner Exception
       → acceptWorkRateResearchCandidate
       → ourWorkRate on CatalogWork
       → next tender = REUSE
  → F5 Position Cost labor leg
```

**Gap class:** `BRAK_STAWKI_ROBOT` ≠ automatic “missing AUT-R1 engine” — AUT-R1 exists; residual is often DATA/UNIT/IDENTITY.

**Region:** brak Wrocławia ≠ brak ceny. `regionScope` może być POLSKA / DOLNY_SLASK / WROCLAW per SSOT research.

**Range:** jeden zakres → midpoint = **DERIVED marketBase**, nie auto OUR RATE.

---

## 5. Evidence → OUR RATE (hard lock)

```text
FORBIDDEN:
  Evidence observation ──auto──▶ ourWorkRate
  Research quote ──auto──▶ OUR RATE / Price Memory CURRENT

REQUIRED (Labor):
  Evidence ──▶ Candidate ──▶ AUT-R1 (§0.2) OR Owner Exception ──▶ Accept ──▶ OUR RATE

REQUIRED (Material):
  Evidence/quote ──▶ Candidate ──▶ AUT-MAT (§0.2) OR Owner Exception ──▶ Price Memory ──▶ SELL
```

Evidence fields (durable): source, URL, operation, unit, range/point, provenance, quality, timestamps, dedupe, status.  
OUR RATE fields: firm rate on work · sourceType ACCEPT|OWNER · history.

Tablica precedent: range 312–780 · midpoint 546 DERIVED · Owner A · Accept → 546 · Evidence pricePoint remains **null**.

---

## 6. Identity (labor)

| Concept | Rule |
|---------|------|
| `exact_normalized` | Match observed ↔ catalog identity |
| `catalogUnit` / `observedUnit` | Must compatible; mismatch → HOLD |
| `laborOnly` | Required for labor qualify |
| `mappingId` / `workId` | Owner-approved mapping rows |
| Owner synonyms | Explicit only — no invent |
| Ambiguity | HOLD / Owner |
| Legacy bucket | Prohibited as silent dump |

**Production Wave-1 mappings (do not invent more without GO):**

- `lim-w1-tablica-rozdzielcza-cr` → `p2b-tablica-rozdzielcza-mieszkaniowa-szt`
- `lim-w1-podejscie-wod-kan-cr` → `p2b-podejscie-wod-kan-mb` (**HOLD** unit pkt vs mb)

---

## 6a. BOM / Technology flow (contract)

```text
★ ONE TREE (BOM):
Work identity → TechnologyPack → BOM components → material SELL → positionComplete

trusted labor/compound leaf
  → TechnologyPack (qtyFactor / steps / materialKey)
  → AUTO_BOM / LABOR_ONLY_AUTO_BOM_V1 (when contract PASS)
  → component materials resolve via Price Memory → SELL
  → Position Cost
```

**Gap class:** `BRAK_TECHNOLOGII_BOM` ≠ automatic “new BOM engine” — prefer existing TechnologyPack / AUTO_BOM / LABOR_ONLY.

---

## 7. F5 / Bid / Offer

```text
OfferBoq + OUR RATE + BOM/SELL (+ owner inputs)
  → Position Cost engine (F5)
  → PackageGate / Multi-dwelling SUM when enabled
  → Bid proposal / Offer primary (Expert ON rules)
```

C-MODE-1a: OfferBoq null → GAP (no companyPrice / ATH auto fallback).  
companyPricePln ≠ OUR RATE ≠ Bid source.  
`OWNER_FINANCE_NOT_OK` / BidCutover fail often = **upstream DATA** residual — not automatic Finance Engine 2.

---

## 8. Final cost estimate (product requirement)

User must see full estimate:

- opis · ilość · jednostka · materiał · robocizna · j.m. · wartość  
- źródło · CURRENT/REUSE/RESEARCH/ACCEPT/OWNER · status · HOLD/GAP  

Summary: materiały · robocizna · koszty · marża · final bid · # pozycji · # HOLD.

PDF preview/download: **REUSE existing PDF stack** after AUDIT — do not invent.

---

## 9. Isolation examples (Wave-1)

| Work | Status |
|------|--------|
| Tablica | CLOSED · OUR RATE 546 ACCEPT · Evidence VALID unchanged |
| Podejście | HOLD · UNIT_EQUIVALENCE UNPROVEN |
| Wykwity | SOURCE GAP REAL · no invent alias |

**STOP.**
