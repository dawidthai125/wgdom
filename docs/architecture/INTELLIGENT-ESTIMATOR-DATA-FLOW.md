# INTELLIGENT ESTIMATOR — DATA FLOW

> **ID:** `INTELLIGENT-ESTIMATOR-DATA-FLOW`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-14  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)

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
BOQ line (MATERIAL)
  → Price Memory / our-price-catalog lookup
  → if CURRENT price exists:
       REUSE (HTTP 0)
  → if MISSING:
       material research (DIY LM / Casto / OBI + approved wholesalers)
       → pick correct product identity
       → prefer lowest valid purchase price
       → Owner Accept / commit into existing Price Memory
       → next tender = REUSE
  → apply existing WGDOM commercial margin → SELL
  → F5 Position Cost material leg
```

**Business rule:** najniższa poprawna cena zakupu jest świadoma — marża WGDOM jest osobną warstwą.

**Nie mieszać:** purchase · marketBase · companyPrice · OUR RATE · SELL · margin.

---

## 4. LABOR flow (contract)

```text
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
       → Owner Decision (value choice)
       → acceptWorkRateResearchCandidate
       → ourWorkRate on CatalogWork
       → next tender = REUSE
  → F5 Position Cost labor leg
```

**Region:** brak Wrocławia ≠ brak ceny. `regionScope` może być POLSKA / DOLNY_SLASK / WROCLAW per SSOT research.

**Range:** jeden zakres → midpoint = **DERIVED marketBase**, nie auto OUR RATE.

---

## 5. Evidence → OUR RATE (hard lock)

```text
FORBIDDEN:
  Evidence observation ──auto──▶ ourWorkRate

REQUIRED:
  Evidence ──▶ Candidate ──▶ Owner Decision ──▶ Accept ──▶ OUR RATE
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

## 7. F5 / Bid / Offer

```text
OfferBoq + OUR RATE + BOM/SELL (+ owner inputs)
  → Position Cost engine (F5)
  → PackageGate / Multi-dwelling SUM when enabled
  → Bid proposal / Offer primary (Expert ON rules)
```

C-MODE-1a: OfferBoq null → GAP (no companyPrice / ATH auto fallback).  
companyPricePln ≠ OUR RATE ≠ Bid source.

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
