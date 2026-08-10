# SOURCE PACK — ECONOMY_INTERIOR_WHITE_PAINT_V1

> **Status:** **OWNER APPROVED SOURCE CANDIDATE** · Policy **B — CONSERVATIVE** · **NOT production implementation**  
> **Approved factors:** 1 coat **0.083333** L/m² · 2 coats **0.166667** L/m² · coverage **12 m²/L**  
> **Next:** DESIGN FREEZE 01B → Owner GO IMPLEMENT (separate)  
> **Date:** 2026-08-10  
> **Depends on:** TECHNOLOGY-RECIPE-CONSUMPTION-01A (PRODUCTION VERIFIED) · SOURCE RESEARCH 01B  
> **Rule:** SOURCE → NORMALIZE → OWNER APPROVE → VERSION → ACTIVE

```text
SystemId:     ECONOMY_INTERIOR_WHITE_PAINT_V1
Technology:   interior white emulsion / acrylic wall+ceiling paint
Coats:        1 | 2  (from BOQ / technology param — not invented)
Waste:        included_in_factor (Owner policy)
PI layer:     UNCHANGED (price separately)
```

---

## 1. Product set (Owner designation)

| # | Product | Manufacturer | Official product page |
|---|---------|--------------|----------------------|
| P1 | Śnieżka EKO MATOWA (Eko) | Śnieżka | https://www.sniezka.pl/produkt/sniezka-eko/ |
| P2 | Dekoral EKO BIAŁA | Dekoral | https://dekoral.pl/produkty/dekoral-eko-biala |
| P3 | Dekoral KLASYCZNA BIEL | Dekoral | https://dekoral.pl/produkty/dekoral-klasyczna-biel |
| P4 | Dekoral ŚCIANY I SUFITY | Dekoral | https://dekoral.pl/produkty/dekoral-sciany-i-sufity |

---

## 2. Official TDS / manufacturer data (citations)

| Product | Coverage stated (1 coat) | Coats note | Primary SOURCE ref |
|---------|--------------------------|------------|--------------------|
| Śnieżka EKO MATOWA | **do 13 m²/L** przy jednokrotnym malowaniu | Product page: **Ilość warstw: 2** | Product page + TDS PDF: `https://karty-techniczne.sniezka.pl/pl/%C5%9ANIE%C5%BBKA_EKO_MATOWA_AKRYLOWA_FARBA_DO_%C5%9ACIAN_I_SUFIT%C3%93W.pdf` (aktualizacja TDS wg producenta) |
| Dekoral EKO BIAŁA | **12 m²/l** | Page lists next-coat time; 2w1 podkład+nawierzchnia | Official page + „Karta Techniczna Produktu” link on same page |
| Dekoral KLASYCZNA BIEL | **12 m²/l** | Next coat 2 h | Official page + TDS link on page |
| Dekoral ŚCIANY I SUFITY | **12 m²/l** | Castorama TDS excerpt: **2 warstwy** · wydajność do 12 m²/L przy jednej warstwie | Official page + retailer TDS consistent with 12 m²/L |

**Conditions (all manufacturers):** practical coverage depends on substrate absorption, texture, tool, method. Stated values are **manufacturer nominal / “do”** on prepared substrate — not a guarantee for every BOQ surface.

**Primer:** TDS/pages often recommend separate grunt (Śnieżka Grunt / Dekoral GRUNT L / Acryl Grunt) on absorbent substrates. **Not** in this product set → primer **OUT of V1 paint factor** unless Owner adds a primer SKU later.

---

## 3. NORMALIZE (deterministic math — no invented constants)

```text
coverage_m2_per_L   = value from TDS (1 coat)
factor_L_per_m2_1coat = 1 / coverage_m2_per_L
factor_L_per_m2_Ncoat = N × factor_L_per_m2_1coat
wastePolicy           = included_in_factor
```

| Product | coverage (1 coat) | factor 1 coat (L/m²) | factor 2 coats (L/m²) |
|---------|-------------------|----------------------|------------------------|
| Śnieżka EKO MATOWA | 13 | **1/13 ≈ 0.076923** | **2/13 ≈ 0.153846** |
| Dekoral EKO BIAŁA | 12 | **1/12 ≈ 0.083333** | **2/12 = 0.166667** |
| Dekoral KLASYCZNA BIEL | 12 | **1/12 ≈ 0.083333** | **2/12 = 0.166667** |
| Dekoral ŚCIANY I SUFITY | 12 | **1/12 ≈ 0.083333** | **2/12 = 0.166667** |

Example (illustrative only — not production until APPROVE):

```text
BOQ 500 m² · 2 coats · Dekoral-class factor 0.166667 L/m²
→ 500 × 0.166667 ≈ 83.333 L
```

---

## 4. Set-level policy options (Owner must choose ONE)

| Option | Rule | When to use |
|--------|------|-------------|
| **A — Per-SKU** | Factor follows resolved product identity | When purchase SKU known |
| **B — Set conservative (economy planning)** | Use **worst coverage in set** = **12 m²/L** → 1 coat **0.083333**, 2 coats **0.166667** L/m² | Interchangeable economy white set without SKU |
| **C — Set optimistic** | Use best = 13 m²/L (Śnieżka) | **NOT recommended** for cost risk |

**Recommendation for ECONOMY_INTERIOR_WHITE_PAINT_V1 planning BOM:** **Option B** (conservative within Owner-approved set).

Material identity (PI reuse, no new key required for first wire): prefer existing `mat.farba_lateksowa_wewnetrzna` as generic economy white paint identity — **or** Owner later adds SKU-specific keys. **No new materialKey in this audit doc.**

---

## 5. Technology mapping (Binding)

| BOQ / family | coats | Recipe factor |
|--------------|-------|---------------|
| `painting` + „jednokrotne” / coats=1 | 1 | set or SKU 1-coat factor |
| `painting` + „dwukrotne” / coats=2 | 2 | set or SKU 2-coat factor |
| `priming` | — | **UNBOUND** in V1 (no primer SKU in set) |

---

## 6. Provenance fields (01A-ready — after APPROVE)

```text
factorSourceKind: owner_approved
factorSourceRef:  OWNER://ECONOMY_INTERIOR_WHITE_PAINT_V1@2026-08-10
                  (+ pinned manufacturer TDS URLs above)
factorApprovedAt: <ISO when Owner APPROVES>
wastePolicy:      included_in_factor
```

Lifecycle: DRAFT → REVIEW → APPROVED → **ACTIVE** only after Owner APPROVE.

---

## 7. Open Owner decisions (checklist)

- [ ] Confirm product names match intended retail SKUs (esp. „Śnieżka EKO MATOWA” = Śnieżka Eko)  
- [ ] Choose set policy **A / B / C** (recommend **B**)  
- [ ] Confirm coats: 1 vs 2 from BOQ text only (no default invent)  
- [ ] Confirm primer OUT of V1  
- [ ] Confirm waste = included_in_factor (no extra %)  
- [ ] Pin PDF download date / revision for each TDS in approval record  
- [ ] **OWNER APPROVE** → then separate **GO DESIGN FREEZE / IMPLEMENT** for ACTIVE pack  

---

## 8. Explicit non-actions

```text
NO IMPLEMENT
NO ACTIVE TechnologyPack
NO COMMIT / PUSH
NO new materialKey / CatalogWork / aliases
NO PI / Purchase / Market writes
NO Bid changes
```

**STOP — awaiting OWNER APPROVE on normalized factors + set policy.**
