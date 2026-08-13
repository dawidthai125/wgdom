# MULTI-DWELLING-01 — PRODUCTION VERIFY

> **STATUS:** **PRODUCTION VERIFIED · GREEN**
> **Data:** 2026-08-13
> **Epic:** MULTI-DWELLING-01
> **Closeout:** [`MULTI-DWELLING-01-CLOSEOUT.md`](./MULTI-DWELLING-01-CLOSEOUT.md)
> **Prior tip:** `7a37b822` (pre-feature) · MODEL-1B hist. `f9324eb6`
> **Feature / live:** `0f1a52f48f86d54c166e577dcfc04081b0156f3c`

```text
PRODUCTION VERIFIED · GREEN
tip 2.66.43 / 0f1a52f4 · Package + document mapping live
EPIC CLOSED (content) · docs commit may follow Owner GO
```

---

## 1. Production tip

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| HTTP `/` | **200** |
| UI | **2.66.43** |
| `version.json` commit | **`0f1a52f`** (≡ **`0f1a52f4`**) |
| `version.json` timestamp | `2026-08-13T09:35:18.037Z` |
| GitHub Deployment | **`5885523509`** · sha **`0f1a52f48f86…`** · Production · **success** |
| Vercel status | **success** · Deployment has completed |
| Feature SHA | **`0f1a52f48f86d54c166e577dcfc04081b0156f3c`** |

**HARD:** Production commit == **`0f1a52f4`** · **PASS**.

---

## 2. Live MULTI-DWELLING evidence

Chunk prod: `TendersModule-BDXmv_F7.js` (lazy from `index-BvfVY-fk.js`)

| Marker | Wynik |
|--------|--------|
| `kw-multi-dwelling-package-v1` | **PRESENT** |
| `expectedDwellingCount` | **PRESENT** |
| `documentToDwelling` / `sourceDocumentIds` | **PRESENT** |
| `DOCUMENT_MAPPING_REQUIRED` | **PRESENT** (attach guard) |
| `DOCUMENT_MAPPING_MISSING` | **PRESENT** (PackageGate) |
| `PackageGate` / `completeDwellingCount` | **PRESENT** |
| `legacy_single` | **PRESENT** |
| `Package BLOCKED` | **PRESENT** |
| UI „Paczka mieszkań” | **PRESENT** |
| `equipmentGapCount` / `transportGapCount` | **PRESENT** |
| `bid_candidate` / `NOISE_SKIP` | **PRESENT** (MODEL-1B keep) |
| `mode==="multi"` przy gate | **PRESENT** |

Component symbol name may be minified — string markers + tip SHA = sufficient (tree-shake ≠ FAIL).

---

## 3. Hard gates

| Gate | Stan |
|------|------|
| Document mapping required in multi | **PASS** |
| BOQ+F5 without mapping → BLOCKED | **PASS** (T19) |
| Attach without mapping → `DOCUMENT_MAPPING_REQUIRED` | **PASS** (T23) |
| Filename/AI/LP ≠ SSOT dwelling | **PASS** |
| PackageGate incomplete → BLOCKED | **PASS** (T6/T8/T10) |
| Aggregation SUM → `computeTenderBidProposal` | **PASS** |
| Legacy `legacy_single` + DEFAULT dwelling | **PASS** (T13) |
| OfferBoq schema v5 / no WithDwelling in offer-boq | **PASS** |
| Cloud Sync / DATA_KEYS for multi package | **ABSENT** |
| PayrollView in feature commit | **NO** (0 lines) |

---

## 4. Regression @ tip (fresh PV)

| Suite | Result |
|-------|--------|
| MULTI-DWELLING-01 | **72/0** |
| OWNER-INPUT-01 | **115/0** |
| GO-1 | **62/0** |
| MODEL-1B | **64/0** |
| Transport-01 | **75/0** |
| Equipment-01 | **36/0** |
| C-MODE contract / fallback | **44/0 · 34/0** |
| F0–F6 | **46 · 36 · 62 · 41 · 36 · 37 · 21 / 0** |
| Payroll B4 | **13/13** |
| Payroll battery | **16/16 scripts** |
| COST-MULTI | **PASS** |

> B4 = **13/13**. Battery = **16/16 scripts**. Nie mieszać.

---

## 5. Release hygiene

- Range: `7a37b822` → **`0f1a52f4`**
- Exact **20** files (MULTI-DWELLING-01 allowlist)
- `PayrollView.tsx` **nie** w release (local M OUT)
- ZERO Edge / Supabase / DATA_KEYS / schema bump / second Bid engine

---

## 6. Verdict

**PRODUCTION VERIFIED · GREEN**
**MULTI-DWELLING-01 CLOSED (content)** · tip **2.66.43 / `0f1a52f4`**
