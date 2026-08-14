# OWNER DECISION — PODEJŚCIE UNIT `pkt` vs `mb`

> **Epic:** `IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1`  
> **Tip / Evidence tip context:** **2.66.59** / **`9bcc558`**  
> **Date:** 2026-08-14  
> **Mode:** OWNER DECISION ONLY · **ZERO** implement · remap · Evidence · Catalog · OUR RATE · Accept · margin · code · commit · push · deploy  
> **Tablica:** Evidence **VERIFIED** — **DO NOT TOUCH**

```text
OWNER DECISION = HOLD / UNPROVEN

UNIT_EQUIVALENCE = UNPROVEN
FINAL            = PARSE_GAP / UNIT_MISMATCH
Evidence write   = NOT DONE (Podejście)
Implement remap  = NOT STARTED (forbidden without later GO)

Tablica Evidence = UNCHANGED (67 / rev 3 / r3-a8226101)
STOP
```

---

## 1. Target facts

| Field | Value |
|-------|--------|
| workId | `p2b-podejscie-wod-kan-mb` |
| Catalog namePl | Podejście wodociągowo-kanalizacyjne łączone |
| Catalog unit | **`mb`** |
| companyPrice (catalog, RO) | 78 · OUR RATE = null |
| mappingId | `lim-w1-podejscie-wod-kan-cr` |
| mapping catalogUnit / observedUnit | **`mb` / `mb`** |
| Source | `cennikremontow_pl` |
| Source URL | `https://cennikremontow.pl/instalacje-wodno-kanalizacyjno-gazowe-cennik` |
| Observed operation | `Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź` |
| Source range | **234–650** |
| Source unit | **`pkt`** |
| Current engine verdict | PARSE_GAP / UNIT_MISMATCH |

---

## 2. Evidence corpus (read-only)

### 2.1 Live PASS2 CR validation

| Fact | Source |
|------|--------|
| PASS2 plumbing page HTTP 200 | Live Validation |
| Operation text present on page | Live Validation body diagnostic |
| Price cells 234 / 650 | Live Validation |
| Unit column = **`pkt`** | Live Validation |
| Engine offers = 0 → `parse_empty` | Live Validation |
| Review: UNIT_EQUIVALENCE = UNPROVEN | PASS2-CR Live Validation Review |

### 2.2 Historical `p0-gap-closure-audit.json`

Repeated cells for the **same** operation + URL:

```text
["Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź", "234", "650", "pkt"]
```

Including the row scored against `potentialWorkId: "p2b-podejscie-wod-kan-mb"` — unit token remains **`pkt`**, never `mb`.

→ Source unit for this operation is **stable historically**, not a one-off scrape glitch.

### 2.3 Wave-1 mapping + Owner Decision Closeout

| Artifact | Claim |
|----------|--------|
| Registry `lim-w1-podejscie-wod-kan-cr` | `observedUnit: "mb"` · notes: „exact_normalized · **mb**” |
| Wave-1 Owner Decision §2.3 | Observed side listed as same alias **(`mb`)** |
| Wave-1 A2 (reaffirmed) | `catalogUnit` + `observedUnit` · **no implicit conversion** |
| Identity DF A2 | Store both · **no implicit unit conversion** (example: szt ≠ mb) |

**Conflict:** Wave-1 Closeout **labeled** the CR observation as `mb`, but live + historical CR **cells** show **`pkt`**.  
That label is **not** a proof that CR’s `pkt` equals catalog `mb` — it is an assumption that now conflicts with the source column.

### 2.4 Wave-1 Audit qualify note

Audit table: „Approach run **mb**” for this candidate.

Raw cells in the same research era: **`pkt`**.

→ Auditor narrative ≠ source unit column → **not** equivalence proof.

### 2.5 Catalog economics (RO)

| Catalog | CR source |
|---------|-----------|
| Name: „… **łączone**” | Name: „Wykonanie podejścia … plastik i miedź” |
| Unit: **mb** (linear) | Unit: **pkt** (token used elsewhere on CR for discrete „punkt …” rows) |
| companyPrice 78 / mb | Range 234–650 / pkt |

Same page neighbor (historical cells): „Wykonanie odejścia kanalizacyjnego” uses **`szt`** — CR distinguishes discrete unit tokens (`pkt` / `szt` / `mb`) on the plumbing cennik. That supports **care**, not automatic identity of `pkt` with `mb`.

### 2.6 What was **not** found

| Missing proof | Status |
|---------------|--------|
| Owner Decision stating `pkt ≡ mb` for this CR row | **ABSENT** |
| CR glossary / page footnote defining `pkt` as metr bieżący for podejście | **ABSENT** in repo artifacts |
| Conversion factor pkt→mb | **ABSENT** · forbidden to invent |
| Design Freeze clause approving unit remap for this work | **ABSENT** |

---

## 3. Semantic assessment

| Question | Assessment |
|----------|------------|
| Is source operation text the same as mapping alias? | **YES** (exact_normalized spelling) |
| Is source **price** usable as labor-only range if units matched? | Range exists (234–650); labor-only not re-proven here — blocked upstream by unit gate |
| Does any artifact **prove** CR `pkt` = catalog `mb` for this row? | **NO** |
| Does any artifact **prove** CR `pkt` ≠ catalog `mb`? | **NO** (Owner forbids assuming either side) |
| Is meaning of `pkt` on this row fully clear from repo evidence? | **NO** — token is consistent, economic definition vs `mb` is **not** established |
| Wave-1 A2 / DF A2 | Forbids implicit conversion without Owner-approved unit equivalence |

**Rule applied:** Decision A (APPROVE EQUIVALENCE / PROVEN) requires **sufficient proof of same economic unit**. That bar is **not** met.

---

## 4. OWNER DECISION

```text
DECISION A — EQUIVALENT / PROVEN     = REJECTED (insufficient proof)
DECISION B — HOLD / UNPROVEN         = SELECTED

UNIT_EQUIVALENCE = UNPROVEN
FINAL            = PARSE_GAP / UNIT_MISMATCH
```

### Consequences

| Action | Status |
|--------|--------|
| Evidence write for Podejście | **FORBIDDEN** (this decision) |
| Remap `pkt` → `mb` | **NOT APPROVED** · **NOT implemented** |
| Parser / mapping / catalogUnit / observedUnit change | **NOT DONE** |
| Separate IMPLEMENT GO for equivalence | **N/A** (requires PROVEN first) |
| Podejście remains | SOURCE/PARSE gap (unit) until a **new** Owner Decision with new proof |
| Tablica Evidence | **UNTOUCHED** |

---

## 5. Absolute locks (confirmed)

| Lock | Status |
|------|--------|
| Auto `pkt → mb` | NOT DONE |
| Converter / midpoint invent | NOT DONE |
| New alias / mapping / host | NOT DONE |
| D1 / qualify / threshold / parser change | NOT DONE |
| Catalog / Evidence / OUR RATE / Accept / margin write | NOT DONE |
| Code / commit / push / deploy | NOT DONE |

---

## 6. Safety (READ-ONLY)

| | Expected | Confirmed |
|--|----------|-----------|
| Evidence observations | **67** | **67** |
| revision | **3** | **3** |
| etag | **`r3-a8226101`** | **`r3-a8226101`** |
| Tablica evidenceId present | yes | **YES** (`7bd0bcf8-…`) |
| Registry | **2** | **2** |
| Catalog | **460 / 34 / 426** | **460 / 34 / 426** |
| companyPrice (control) | **35** | **35** |
| OUR RATE | **null** | **null** |
| marginPct | **0** | **0** |
| Accept | NOT DONE | NOT DONE |
| Writes this GO | **0** | **0** |

---

## 7. Final

```text
OWNER DECISION = HOLD / UNPROVEN

source operation = Wykonanie podejścia wodno - kanalizacyjnego plastik i miedź
source unit      = pkt
catalog unit     = mb
UNIT_EQUIVALENCE = UNPROVEN
FINAL            = PARSE_GAP / UNIT_MISMATCH

Podejście Evidence = NOT WRITTEN
Tablica            = VERIFIED · DO NOT TOUCH
Wykwity            = SOURCE GAP REAL

STOP — no automatic next stage
```

### NEXT (Owner only — not auto)

- Further **source/unit investigation** only if Owner commissions new evidence (outside invent).
- Or leave Podejście as HOLD / PARSE_GAP.
- **Do not** open IMPLEMENT remap GO while UNPROVEN.
- **Do not** proceed to OUR RATE from Tablica without a separate Owner GO.
