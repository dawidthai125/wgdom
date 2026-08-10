# DESIGN FREEZE — ECONOMY-ELECTRICAL-CABLE-V1

> **Slice:** ECONOMY ELECTRICAL CABLE MATERIAL MAP · Intelligent Estimator  
> **ID:** `ECONOMY-ELECTRICAL-CABLE-V1`  
> **Status:** **IMPLEMENT DONE** · **TEST DONE** · **AWAITING OWNER VERIFICATION** · **COMMIT / PUSH / PRODUCTION = NOT AUTHORIZED**  
> **Date:** 2026-08-10  
> **Baseline tip:** UI **2.66.23** / **`9ad22fc`**  
> **Prior:** OWNER CABLE MAP AUDIT · OWNER GO IMPLEMENT (LOCKED) · DECOMPOSITION / 01A / 01B / PRIMING PRODUCTION VERIFIED  
> **Evidence:** 20 TechUnits `electrical_cable_lay` · tenders `08dee335` · `08dee8b8` · `08dec13d`  
> **Artefakt pomocniczy:** `.tmp-operate-learn-audit/electrical-material-map-freeze.json` · audit `.tmp-operate-learn-audit/owner-cable-map-audit.md`  
> **Test:** `npx vite-node scripts/test-economy-electrical-cable-v1.mjs` → **11 PASS**

```text
OWNER POLICY (LOCKED — OWNER GO IMPLEMENT 2026-08-10)
────────────────────────────────────────────────────
Profile:     ECONOMY_ELECTRICAL_CABLE_V1
SOURCE:      BOQ wording (type + cores + cross-section) — NOT TDS for cable type
Identity:    normalize(circuitSpec) → exact materialKey (commodity)
Quantity:    materialQty = BOQ qty  (m / mb)
Waste:       W1 = 1.00  (qtyFactor 1.0 · wastePolicy none · no +5%/+10%)
Guessing:    NEVER (no socket→3x2.5, no lighting→3x1.5)
Labor≠Material: both may apply on same BOQ line
YDY ≠ YDYżo: SEPARATE keys
YDY 3x2.5:   NOT created (no evidence)
DEFER:       HDGs · LgY · LgYżo
OUT:         NHXH · UTP · coax · YTKSY · HtKSH · XzTKMXpw
```

```text
LAYER LOCK
──────────
Technology / Material map = CZEGO I ILE (metres of named cable)
PI / Purchase / Market     = ILE KOSZTUJE
MARKET ≠ PURCHASE
mat.gniazdo / mat.wlacznik ≠ cable
kf-a1-ukladanie-kabla-ydy  = LABOR seed ONLY — never material identity
```

```text
IMPLEMENT DONE — EXACT 4 KEYS
─────────────────────────────
mat.przewod_ydy_3x1_5     ← YDY 3x1.5
mat.przewod_ydyzo_3x1_5   ← YDYzo 3x1.5
mat.przewod_ydyzo_3x2_5   ← YDYzo 3x2.5
mat.przewod_ydyzo_5x6     ← YDYzo 5x6
```

---

## 1. Executive decision (LOCKED + IMPLEMENTED)

| Element | Locked decision |
|---------|-----------------|
| Profile | `ECONOMY_ELECTRICAL_CABLE_V1` |
| Trigger TechUnit | `electrical_cable_lay` + complete `circuitSpec` (via BOQ wording normalize) |
| Qty rule | **`materialQty = BOQ.quantity`** (unit `m`/`mb`) |
| Waste | **W1 = 1.00** · `qtyFactor=1` · `wastePolicy=none` |
| Identity level | **COMMODITY** (no manufacturer SKU) |
| Keys created | **exactly 4** (MUST HAVE) |
| Implement | **DONE** (awaiting Owner verification · no commit) |

```text
BOQ (jawny typ+przekrój)
  → TechUnit electrical_cable_lay
  → normalize circuitSpec
  → materialKey (commodity)
  → projectProductionBom qty = BOQ qty
  → (później) Purchase / Real Cost
```

---

## 2. Evidence base (20 lines — facts only)

| Metric | Value |
|--------|------:|
| TechUnits | 20 |
| Tenders | 3 (`08dee335` MOPS · `08dee8b8` WM · `08dec13d` WM) |
| Existing cable `materialKey` | **0** |
| Safe map to current catalog | **0** |
| Runtime `circuitSpec` hits | 2/20 (parser gaps — out of DF scope to fix) |

**SOURCE OF TRUTH for type/section = BOQ text.** TDS nie służy do wyboru typu kabla.

---

## 3. V1 scope split

### A. MUST HAVE V1

Tylko wzorce z **realnego evidence** + zgodne z preferencją Ownera (YDY/YDYżo 3×1,5 · 3×2,5 · 5×6).

| # | Normalized circuitSpec | proposed materialKey (NOT created) | Lines | Tenders | Σ qty (evidence) | Notes |
|---|------------------------|-------------------------------------|------:|--------:|------------------:|-------|
| M1 | `YDY 3x1.5` | `mat.przewod_ydy_3x1_5` | 1 | 1 | 909 mb | MOPS |
| M2 | `YDYzo 3x1.5` | `mat.przewod_ydyzo_3x1_5` | 2 | 1 | 600 m | WM `08dec13d` · **≠ M1** |
| M3 | `YDYzo 3x2.5` | `mat.przewod_ydyzo_3x2_5` | 1 | 1 | 80 m | WM · **no YDY 3x2.5 in dataset** |
| M4 | `YDYzo 5x6` | `mat.przewod_ydyzo_5x6` | 1 | 1 | 520 m | WM |

**Nie dodano do MUST HAVE mimo preferencji „YDY 3×2,5”:** w 20 liniach **brak** wzorca `YDY 3x2.5` (jest tylko `YDYzo 3x2.5`). Dodanie `YDY 3x2.5` bez evidence = zabronione.

Każdy MUST HAVE = **`NEW_KEY_REQUIRED`** · existing CatalogWork = **NO**.

### B. OPTIONAL V1

Evidence istnieje, ale inna rodzina / niska powtarzalność / nie w rdzeniu Owner MUST.

| # | Normalized circuitSpec | proposed materialKey | Lines | Tenders | Why OPTIONAL |
|---|------------------------|----------------------|------:|--------:|--------------|
| O1 | `HDGs 3x1.5` | `mat.przewod_hdgs_3x1_5` | 1 | 1 | 336 mb MOPS — real, ale nie YDY-family |
| O2 | `HDGs 3x2.5` | `mat.przewod_hdgs_3x2_5` | 1 | 1 | 77 mb MOPS |
| O3 | `HDGs 5x1` | `mat.przewod_hdgs_5x1` | 1 | 1 | 10 m WM — rzadki przekrój |
| O4 | `LgY 6` | `mat.przewod_lgy_6` | 1 | 1 | PE żółto-zielony w ATH WM |
| O5 | `LgYzo 16` | `mat.przewod_lgyzo_16` | 1 | 1 | 1× WM — rzadki |

**Owner może:** (a) wyłączyć cały OPTIONAL z V1, (b) wziąć tylko HDGs 3x1.5/3x2.5, (c) odłożyć LgY.

### C. OUT OF SCOPE V1

| Pattern | Evidence lines | Reason |
|---------|---------------:|--------|
| UTP (kat. 6 / 5e) | 2 | special LV / data — poza power economy V1 |
| coax 75 Ω | 1 | special LV |
| YTKSY 1x2x1 / 8x2x0.5 | 2 | teletech |
| HtKSH … | 2 | special LV / PH90 |
| XzTKMXpw … | 1 | special LV |
| NHXH 5x6 / 3x2.5 | 2 | **proponowane OUT** (klasa często ppoż./safety) — Owner może przenieść do OPTIONAL osobnym GO |
| unit `t` ATH anomalies | 2 (HtKSH/XzTKMXpw) | poza V1 wraz z typem; semantyka qty niejasna |

---

## 4. Material identity cards (MUST HAVE)

### M1 — YDY 3×1.5

| Field | Value |
|-------|--------|
| proposed materialKey | `mat.przewod_ydy_3x1_5` |
| display name | Przewód YDY 3×1,5 mm² (economy commodity) |
| normalized circuitSpec | `YDY 3x1.5` |
| BOQ patterns | `YDY 3x1,5mm2` · `YDY 3x1,5mm²` · `YDY 3×1,5 mm²` |
| tender count | 1 (`08dee335`) |
| line count | 1 |
| unit | `mb` / `m` (treat as length) |
| qty source | **BOQ qty** |
| economy rationale | Najczęstszy jawny YDY power w sample (909 mb) — commodity economy |
| existing CatalogWork? | **NO** |
| new materialKey required? | **NEW_KEY_REQUIRED** |

**Traceability**

| BOQ | TechUnit | circuitSpec | proposed key |
|-----|----------|-------------|--------------|
| `obl_7481cdfa` · YDY 3x1,5mm2 wciągane · 909 mb | `tu:obl_7481cdfa:electrical_cable_lay:0` | `YDY 3x1.5` | `mat.przewod_ydy_3x1_5` |

---

### M2 — YDYżo 3×1.5

| Field | Value |
|-------|--------|
| proposed materialKey | `mat.przewod_ydyzo_3x1_5` |
| display name | Przewód YDYżo 3×1,5 mm² (economy commodity) |
| normalized circuitSpec | `YDYzo 3x1.5` |
| BOQ patterns | `YDYżo 3x1,5` · `YDYzo 3x1,5` |
| tender count | 1 (`08dec13d`) |
| line count | 2 |
| unit | `m` |
| qty source | **BOQ qty** |
| economy rationale | 2 linie WM · łącznie 600 m — rdzeń remontów |
| existing CatalogWork? | **NO** |
| new materialKey required? | **NEW_KEY_REQUIRED** |

**Identity rule:** `YDY 3x1.5` **≠** `YDYzo 3x1.5` — **osobne keys** (nie scalać po samym przekroju).

**Traceability**

| BOQ | TechUnit | circuitSpec | proposed key |
|-----|----------|-------------|--------------|
| `obl_7444b21` · Ułożenie YDYżo 3x1,5 · 420 m | `tu:obl_7444b21:electrical_cable_lay:0` | `YDYzo 3x1.5` | `mat.przewod_ydyzo_3x1_5` |
| `obl_f8b994df` · Ułożenie YDYżo 3x1,5 · 180 m | `tu:obl_f8b994df:electrical_cable_lay:0` | `YDYzo 3x1.5` | `mat.przewod_ydyzo_3x1_5` |

---

### M3 — YDYżo 3×2.5

| Field | Value |
|-------|--------|
| proposed materialKey | `mat.przewod_ydyzo_3x2_5` |
| display name | Przewód YDYżo 3×2,5 mm² (economy commodity) |
| normalized circuitSpec | `YDYzo 3x2.5` |
| BOQ patterns | `YDYżo 3x2,5` |
| tender count | 1 |
| line count | 1 |
| unit | `m` |
| qty source | **BOQ qty** |
| economy rationale | Jawny power 3×2,5 w WM sample |
| existing CatalogWork? | **NO** |
| new materialKey required? | **NEW_KEY_REQUIRED** |

**Traceability:** `obl_ce05fe66` · 80 m · `tu:obl_ce05fe66:electrical_cable_lay:0`

---

### M4 — YDYżo 5×6

| Field | Value |
|-------|--------|
| proposed materialKey | `mat.przewod_ydyzo_5x6` |
| display name | Przewód YDYżo 5×6 mm² (economy commodity) |
| normalized circuitSpec | `YDYzo 5x6` |
| BOQ patterns | `YDYżo 5x6` |
| tender count | 1 |
| line count | 1 |
| unit | `m` |
| qty source | **BOQ qty** |
| economy rationale | 520 m — istotny wolumen w jednym przetargu WM |
| existing CatalogWork? | **NO** |
| new materialKey required? | **NEW_KEY_REQUIRED** |

**Traceability:** `obl_c79557a6` · Wciąganie YDYżo 5x6 · 520 m · `tu:obl_c79557a6:electrical_cable_lay:0`

---

## 5. Deterministic identity (LOCKED proposal)

```text
BOQ wording
  → extract { family, cores, sectionMm2 }
  → normalize circuitSpec
  → exact match materialKey
```

### 5.1 Normalization rules (V1)

| Rule | Spec |
|------|------|
| Family tokens | `YDY` · `YDYzo` (ż/ź/z folded to ASCII `z` in **normalized** form only) · optional later `HDGs` / `LgY` / `LgYzo` |
| Cores×section | `NxS` with **dot** decimal: `3x1.5` not `3x1,5` |
| mm² suffix | optional in input; **stripped** in normalized spec (`YDY 3x1.5`) |
| Multiply signs | `x` `×` `X` → `x` |
| Whitespace | single space between family and NxS |
| Case | family upper ASCII |

**Examples (same identity):**

| BOQ fragment | Normalized |
|--------------|------------|
| `YDY 3x1,5mm2` | `YDY 3x1.5` |
| `YDY 3×1,5 mm²` | `YDY 3x1.5` |
| `YDYżo 3x1,5` | `YDYzo 3x1.5` |

**Different identity (do NOT merge):**

| A | B |
|---|---|
| `YDY 3x1.5` | `YDYzo 3x1.5` |
| `YDYzo 3x1.5` | `YDYzo 3x2.5` |
| `YDYzo 3x1.5` | `HDGs 3x1.5` |

### 5.2 Parameter gate (LOCKED)

Complete `circuitSpec` requires **all**:

1. cable family/type  
2. conductor count (or single-core form for LgY-class if Owner later IN)  
3. cross-section  

Else → **`PARAMETER_REQUIRED`**.

**Forbidden:**  
„gniazdo” → YDY 3×2,5 · „oświetlenie” → YDY 3×1,5 · „typowy kabel”.

---

## 6. Quantity & waste (LOCKED proposal)

| Rule | Value |
|------|--------|
| `materialQty` | **= BOQ `quantity`** |
| Units accepted | `m` · `mb` (synonyms for length) |
| Extra factor | **NONE** |
| l/m · norms · typical waste | **FORBIDDEN** |

### Waste — OWNER LOCKED = **W1**

| ID | Policy | Meaning | V1 |
|----|--------|---------|----|
| **W1** | `1.00` | qty_material = qty_BOQ | **ACTIVE** |
| **W2** | `included_in_factor` | qty still 1.00; waste only in Purchase | not used |
| **W3** | explicit % | Owner number + rationale | **FORBIDDEN** in V1 |

---

## 7. Labor vs material (LOCKED)

Line example: *„Ułożenie przewodu YDYżo 3×1,5 — 420 m”*

| Layer | Result |
|-------|--------|
| Technology | `electrical_cable_lay` |
| Material | `YDYzo 3x1.5` → proposed `mat.przewod_ydyzo_3x1_5` |
| Qty | 420 m |
| Labor | osobny mechanizm robocizny (nie blokuje material map) |

**A ∩ B allowed.** Labor wording ≠ absence of material when circuitSpec complete.

`kf-a1-ukladanie-kabla-ydy` pozostaje **labor seed** — **nie** materialKey.

---

## 8. Family policy (evidence-based)

| Family | V1 policy | Evidence in 20 | Rationale |
|--------|-----------|----------------|-----------|
| **YDY** | **IN V1** (MUST where evidenced) | 1× `3x1.5` | Owner priority · commodity power |
| **YDYżo** | **IN V1** (MUST) | 3×1.5×2 · 3×2.5×1 · 5×6×1 | Owner priority · separate from YDY |
| **HDGs** | **OPTIONAL** | 3 lines / 2 tenders | Real but not YDY-core; Owner may defer |
| **NHXH** | **OUT** (default) / Owner may promote | 2 lines | Safety/fire class — not default economy V1 |
| **LgY** | **OPTIONAL** | 1× 6 mm² PE | Sparse |
| **LgYżo** | **OPTIONAL** | 1× 16 | Sparse |
| **UTP** | **OUT** | 2 | special LV |
| **coax** | **OUT** | 1 | special LV |
| **YTKSY** | **OUT** | 2 | teletech |
| **HtKSH** | **OUT** | 2 | special LV |
| **XzTKMXpw** | **OUT** | 1 | special LV |

---

## 9. Economy / commodity policy

| Question | V1 answer |
|----------|-----------|
| Need manufacturer? | **NO** for MUST HAVE |
| Need exact SKU? | **NO** |
| Identity level | **COMMODITY / ECONOMY** |
| Legal reason for branded-only? | **None reported** from this dataset |

Purchase/PI later may bind quotes to commodity keys — **out of this DF**.

---

## 10. Parser gaps (explicitly NOT in V1 implement)

Reported only (from OWNER CABLE MAP AUDIT):

- `YDYżo NxM` without `mm2` → runtime `circuitSpec` often null  
- `NHXH` / most `HDGs` brand paths weak  
- special LV families not extracted  

**V1 DF does not authorize parser fixes.** Mapping rules assume complete normalized `circuitSpec` after extraction (existing or future). Missing extract → `PARAMETER_REQUIRED` until fixed in a **separate** Owner-authorized slice.

---

## 11. IMPLEMENTED ECONOMY ELECTRICAL V1 (summary)

| materialKey | circuitSpec | evidence lines | status |
|-------------|-------------|----------------|--------|
| `mat.przewod_ydy_3x1_5` | `YDY 3x1.5` | `obl_7481cdfa` | **CREATED** |
| `mat.przewod_ydyzo_3x1_5` | `YDYzo 3x1.5` | `obl_7444b21` · `obl_f8b994df` | **CREATED** |
| `mat.przewod_ydyzo_3x2_5` | `YDYzo 3x2.5` | `obl_ce05fe66` | **CREATED** |
| `mat.przewod_ydyzo_5x6` | `YDYzo 5x6` | `obl_c79557a6` | **CREATED** |

### DEFER (no keys)

HDGs · LgY · LgYżo

### OUT OF SCOPE

| pattern | reason |
|---------|--------|
| UTP / coax | special LV / data |
| YTKSY | teletech |
| HtKSH / XzTKMXpw | special LV |
| NHXH | fire/safety — OUT |
| YDY 3x2.5 (as key) | **no evidence** — not created |
| gniazda / oświetlenie without cable | **no guess** |
| incomplete circuitSpec | PARAMETER_REQUIRED / UNBOUND |

---

## 12. OWNER DECISIONS — LOCKED (implemented)

| # | Decision | Owner lock |
|---|----------|------------|
| D1 | MUST HAVE M1–M4 | **YES** |
| D2 | YDY ≠ YDYżo | **SEPARATE** |
| D3 | HDGs | **DEFER** |
| D4 | LgY / LgYżo | **DEFER** |
| D5 | NHXH | **OUT** |
| D6 | Waste | **W1 = 1.00** |
| D7 | Create 4 materialKey | **YES** |
| D8 | CatalogWork pairing `cw.product.*` | **YES** (map only — see §17 gap) |

---

## 13. Non-goals / do not touch

PI writes · Purchase · Market · Quotes · Memory · Bid · Offer · Real Cost · Payroll · Persist · SQL · HTTP · LLM · fuzzy · scrape · protected WIP (`bid-time-load-guard/**`, bid adapter/calculator, `useTenderOfferRun`) · painting/priming packs · multi-apartment.

---

## 14. Implementation (DONE)

1. Exact 4 `materialKey` in pack `pack.electrical.cable_economy_v1@1.0` + map entries.  
2. Normalize BOQ → circuitSpec → exact key (`electrical-circuit-spec.ts`).  
3. Bind `electrical_cable_lay` → BOM qty=BOQ · filter pack by materialKey.  
4. Tests A–I + CatalogWork pairing + provenance.  
5. Parser gaps for non-V1 families remain report-only (V1 normalize reads full BOQ wording).

---

## 15. FINAL GATE (post-IMPLEMENT)

| Gate | Status |
|------|--------|
| IMPLEMENT | **DONE** |
| TEST | **DONE** (`test-economy-electrical-cable-v1.mjs` 11 PASS) |
| REGRESSIONS | **PASS** (01A 60 · 01B 39 · PRIMING 61 · DECOMP 48 · LINE-BINDING 47) |
| COMMIT | **NOT AUTHORIZED** |
| PUSH | **NOT AUTHORIZED** |
| PRODUCTION | **NOT AUTHORIZED** |
| DATA MUTATIONS (PI/Purchase/Market) | **NONE** |
| NEW materialKey | **4** (exact MUST) |
| CatalogWork | **map pairing only** (`cw.product.przewod_*`) — no full seed objects |
| NEW PACK | `pack.electrical.cable_economy_v1` |
| Waste | **W1 = 1.00** |

---

## 16. Exact changed files

| Path | Change |
|------|--------|
| `src/lib/execution-expert/electrical-circuit-spec.ts` | **NEW** — normalize + resolve V1 |
| `src/lib/technology-foundation/electrical-cable-economy-v1.ts` | **NEW** — pack + 4 materials qtyFactor=1 |
| `src/lib/technology-foundation/pack-recipe-material-key.ts` | **NEW** — filter pack by materialKey |
| `src/lib/technology-foundation/fixtures.ts` | seed electrical pack |
| `src/lib/technology-foundation/index.ts` | exports |
| `src/lib/execution-expert/technology-line-binding.ts` | wire electrical_cable_lay → V1 resolve + BOM |
| `src/lib/execution-expert/index.ts` | exports |
| `src/lib/pricing-expert/material-market-map.ts` | 4 map entries + aliases `m`/`mb` |
| `scripts/test-economy-electrical-cable-v1.mjs` | **NEW** — A–I |
| `docs/architecture/ECONOMY-ELECTRICAL-CABLE-V1-DESIGN-FREEZE.md` | this DF → IMPLEMENT DONE |

**NOT modified by this slice:** `bid-time-load-guard/**` · `tenders-bid-calculator.ts` · `tender-offer-boq-bid-adapter.ts` · Payroll · Persist · Market Sync.

---

## 17. CatalogWork — explicit gap

| Done | Gap |
|------|-----|
| `MATERIAL_MARKET_MAP` pairing `materialKey` ↔ `cw.product.przewod_*` | Full CatalogWork seed objects in `work-catalog` YAML / runtime seed **not** created |
| Aliases unit `m`/`mb` for identity labels | No manufacturer / SKU / marketQuotes / purchase price |

Same pattern as other S2-C commodity products: identity IDs ready for later PI; **no invented prices**. Full CatalogWork catalog rows = **explicit gap** until Owner GO for catalog seed (without inventing unsafe fields).

---

## 18. Test results

```text
ECONOMY-ELECTRICAL-CABLE-V1 — ALL 11 PASS
  A exact YDY 3x1.5 variants
  B YDY ≠ YDYżo
  C YDYzo 3x2.5 + 5x6
  D no guess gniazda/oświetlenie
  E PARAMETER_REQUIRED + OUT + DEFER
  F+G qty 909/520 + technology+material coexistence
  H OUT UTP/NHXH
  CatalogWork cw.product.* pairing
  Pack ACTIVE + provenance
  I regression ETICS/kostka/painting/priming + electrical seed
  No YDY 3x2.5 key
```

Regressions: 01A · 01B · PRIMING-01 · DECOMPOSITION-01 · LINE-BINDING-01 = PASS.

---

## 19. Build / protected WIP

| Item | Status |
|------|--------|
| `npm run build` | **FAIL** — pre-existing protected WIP: `bid-time-load-guard` missing export `applyBidTimeLoadGuard` (not touched by this slice) |
| Protected WIP dirty (unrelated) | `tenders-bid-calculator.ts` · `tender-offer-boq-bid-adapter.ts` · `bid-time-load-guard/**` |
| Slice unit/regression tests | **PASS** without needing full app build |

---

## 20. RECOMMENDATION

### **OWNER VERIFICATION REQUIRED**

IMPLEMENT = **DONE** · TEST = **DONE**.

- **Nie** COMMIT / PUSH / PRODUCTION VERIFY bez Owner GO  
- Po Owner VERIFY → osobna sesja commit (tylko allowlist §16)

**STOP.**
