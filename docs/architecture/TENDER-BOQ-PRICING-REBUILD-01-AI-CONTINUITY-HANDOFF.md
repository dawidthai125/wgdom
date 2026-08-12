# TENDER-BOQ-PRICING-REBUILD-01 — AI / CURSOR CONTINUITY HANDOFF

> **STATUS:** **ACTIVE** · SESSION CLOSED 2026-08-12  
> **DLA:** przyszły ChatGPT · przyszły Cursor · kolejny Owner GO  
> **Tip numeryczny:** wyłącznie [`docs/AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Thin pointer AI:** [`docs/AI/10_TENDER_PRICING_CONTINUITY.md`](../AI/10_TENDER_PRICING_CONTINUITY.md)  
> **Session closeout:** [`TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md`](./TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md)

```text
NIE zgaduj tipu · NIE odtwarzaj F0–F6 · NIE cofaj C-MODE-1a
NIE startuj P7 / Equipment / ATH rebuild / legacy cleanup bez Owner GO
NEXT FUNCTIONAL GAP = EQUIPMENT / TRANSPORT / AUXILIARY (AUDIT first)
```

---

## 1. Production baseline (checkpoint)

| Pole | Wartość |
|------|---------|
| **UI / version.json** | **2.66.43** |
| **LIVE COMMIT** | **`d92aef0`** |
| **Feature SHA (C-MODE-1a)** | **`d92aef0a`** |
| **STATUS** | **PRODUCTION VERIFIED · GREEN** |
| **URL** | https://www.wgdom.fun |
| **Branch** | `main` |
| **PV** | [`…-C-MODE-1A-FALLBACK-REMOVAL-PRODUCTION-VERIFY.md`](./TENDER-BOQ-PRICING-REBUILD-01-C-MODE-1A-FALLBACK-REMOVAL-PRODUCTION-VERIFY.md) |

Prior F5 Bid cutover: UI **2.66.42** · feature **`3995c9af`** · PV GREEN.

---

## 2. Chronologia F0–F6 + C-MODE-1a

| Faza | Temat | UI | Feature SHA | Harness | Status |
|------|-------|-----|-------------|---------|--------|
| **F0** | Position Cost Engine (pure) | 2.66.37 | `bf4e1beb` | 46/0 | **CLOSED** |
| **F1** | OUR RATE → labor | 2.66.38 | `bec3c56e` | 36/0 | **CLOSED** |
| **F2** | Price Memory SELL → material | 2.66.39 | `98207d3d` | 62/0 | **CLOSED** |
| **F3** | Technology / BOM | 2.66.40 | `7ab67c4b` | 41/0 | **CLOSED** |
| **F4** | OfferBoq → shadow Position Cost | 2.66.41 | `f7d48aad` | 36/0 | **CLOSED** |
| **F5** | Bid cutover | 2.66.42 | `3995c9af` | 36/0 | **CLOSED · PV GREEN** |
| **F6** | ATH / legacy catalog AUDIT | docs | `1425bb15` | 21/0 | **CLOSED (AUDIT)** |
| **C-MODE-1a** | OfferBoq null → GAP (no legacy Bid fallback) | **2.66.43** | **`d92aef0a`** | 34/0 | **CLOSED · PV GREEN** |

SSOT design: [`…-DESIGN-FREEZE.md`](./TENDER-BOQ-PRICING-REBUILD-01-DESIGN-FREEZE.md) · [`…-ARCH-REVIEW.md`](./TENDER-BOQ-PRICING-REBUILD-01-ARCH-REVIEW.md) · [`…-OWNER-DECISION-C-MODE-1A.md`](./TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md).

---

## 3. C-MODE-1a (LOCKED)

```text
costPipeline ON + OfferBoq === null
  → return null (GAP)
  → NIE ath_priced · NIE catalog · NIE companyPricePln
```

Plik: `src/app/hooks/useTenderPricingAuto.ts` · `resolveTenderPricingAutoProposal`.  
Doc: [`…-FALLBACK-REMOVAL.md`](./TENDER-BOQ-PRICING-REBUILD-01-C-MODE-1A-FALLBACK-REMOVAL.md).  
`computeCatalogBidProposalForPricingAuto` = **KEEP TECHNICAL** (pipeline OFF / P7) — **nie** wołać z path ON.

---

## 4. Aktualne SSOT (warstwy)

```text
Biblioteka Robót          → DEFINICJA / IDENTITY / NORMA
Nasz Katalog Robót        → OUR RATE (workId+unit)
Technology / BOM          → SKŁAD MATERIAŁOWY (qty × qtyFactor)
Nasz Katalog Cen          → Price Memory + commercialPricing (SELL)
Position Cost Engine      → KOSZT POZYCJI (labor + Σ materials)
OfferBoq                  → BOQ struktura / outcome
offerBoqDirect            → direct z Position Cost (F5)
computeTenderBidProposal  → Bid stack (Kp · profit · minMargin)
recommendedBidPln         → FINAL BID
```

**ATH** = SEPARATE INPUT (qty/unit/description → OfferBoq → F5).  
**ATH PLN / `ath_priced`** ≠ Bid SSOT · ≠ OUR RATE.  
**Legacy catalog / `companyPricePln`** = TECHNICAL ONLY · ZERO new Bid source.

---

## 5. Granice modułów

| Moduł | Path | Zakaz |
|-------|------|-------|
| `src/lib/tender-position-cost/` | F0–F5 | Nie drugi engine · nie HTTP |
| `lookupWorkRate` | F1 | Nie `companyPricePln` |
| Price Memory / `computeSellPricePln` | F2 | Nie invent · nie second DB |
| TechnologyPack / `projectBom` | F3 | Nie invent BOM |
| `bid-position-cost-cutover.ts` | F5 | Gate FAIL → GAP · ZERO legacy fallback |
| `useTenderPricingAuto.ts` | C-MODE-1a | OfferBoq null → null |

---

## 6–10. Material · Work · BOM · Position Cost · Bid

**Material:** MATERIAL ONLY · `materialKey` · CURRENT/STALE/MISSING · C01 45 · C02 36 · C03 31 · ~372 keys.  
**Work:** OUR RATE · selective research · `WORK_RATE_LEGAL_GATE=PASS` · KB/SCCOT/Extradom/CennikRemontow · FULL CATALOGUE FORBIDDEN · cache-first · Owner Accept.  
**BOM:** multi-material tylko z Technology · brak BOM = GAP.  
**Position Cost:** pure `computePositionCost` · labor + materials 0..N.  
**Bid:** F5 pipeline · stack Kp/profit/minMargin **UNCHANGED**.

---

## 11–13. ATH · companyPricePln · legacy catalog

| Element | Status |
|---------|--------|
| ATH parse / structure | **KEEP AS SEPARATE INPUT** |
| ATH → OfferBoq → F5 | **ACTIVE** |
| `ath_priced` Bid mode | **NO BID SSOT** · API KEEP TECHNICAL |
| `companyPricePln` | TECHNICAL LEGACY · **NO** OUR RATE / Position Cost / Bid / seed / migrate |
| Legacy catalog Bid | **NO BID SSOT** (auto) · KEEP TECHNICAL · soft-deprecate = **P7 osobny GO** |

F6 audit: [`…-F6-ATH-CATALOG-AUDIT.md`](./TENDER-BOQ-PRICING-REBUILD-01-F6-ATH-CATALOG-AUDIT.md).

---

## 14–15. Legal gates · research

| Gate | Status |
|------|--------|
| Material Legal Gate | UNCHANGED (nie ruszać w pricing rebuild) |
| `WORK_RATE_LEGAL_GATE` | **PASS** |
| Research on catalog open | **FORBIDDEN auto** |
| Research during Bid calc | **FORBIDDEN** · HTTP **0** |
| Full catalogue | **FORBIDDEN** |

---

## 16–17. Test · production evidence

| Suite | Wynik |
|-------|-------|
| F0…F5 | 46 / 36 / 62 / 41 / 36 / 36 · **0 FAIL** |
| F6 audit | 21 · **0 FAIL** |
| C-MODE-1a fallback removal | 34 · **0 FAIL** |
| PM C01–C03 · WR · LIVE-08 · MMR · Bid/Offer | **0 FAIL** (sesja) |
| Live PV C-MODE-1a | **2.66.43** / `d92aef0` · bundle HIT · **GREEN** |

---

## 18. Zamknięte (ten epic)

F0–F6 · C-MODE-1a · Bid cutover PV · fallback removal PV.  
Powiązane CLOSED (kontekst): WORK-CATALOG-REBUILD P0/P1 · PRICE-MEMORY C01–C03 · WORK-RATE legal/P2/RW-03.

---

## 19. Pozostałe GAP-y (NIE COMPLETE)

1. **EQUIPMENT / TRANSPORT / AUXILIARY** — najważniejszy funkcjonalny GAP (F4/F5: GAP · nie invent · nie labor · nie material · nie companyPrice). Najpierw AUDIT→MODEL→PLAN→DF→ARCH→Owner GO.  
2. **ATH modernization** — pd/KNR identity · labor-only semantics · materialKey — **nie blocker F5** · nie start bez GO.  
3. **Legacy cleanup / P7** — usuwanie pól/adapterów — **NOT STARTED** · dependency audit first.  
4. **Real BOQ coverage audit** — GAP > invent.

---

## 20. Następny właściwy krok

```text
WAITING FOR OWNER GO
Rekomendowany temat: EQUIPMENT / TRANSPORT / AUXILIARY (AUDIT ONLY first)
NIE auto-start P7
NIE auto-start ATH rebuild
NIE auto-start legacy delete
```

---

## 21. Zakazy (HARD)

- Drugi Price Memory / Work Rate Memory / BOM / pricing engine  
- `companyPricePln` jako cena / fallback / seed / migracja → OUR RATE  
- ATH price → OUR RATE / Bid fallback  
- Catalog jako Bid fallback (path ON)  
- Invent ceny / norm / materiałów / identity  
- Full catalogue / auto research / HTTP w Bid  
- Zmiana F5 / PM / Work Rate / Kp/profit/minMargin bez Owner GO  

---

## 22. Owner GO workflow

```text
AUDIT → (opcjonalnie PLAN) → DESIGN FREEZE → ARCH REVIEW → OWNER GO → IMPLEMENT
→ harness 0 FAIL → build → commit → push → VERIFY FAST version.json → PV GREEN
```

Payroll / sync / Edge: Gate [`PAYROLL_SAFETY_GATE.md`](../AI/PAYROLL_SAFETY_GATE.md) gdy dotyczy.  
Tip: **tylko 09** — nie hardcoduj wersji w regułach Cursor.

---

## Kluczowe ścieżki kodu

| Obszar | Path |
|--------|------|
| Position Cost | `src/lib/tender-position-cost/*` |
| Auto Bid Outcome | `src/app/hooks/useTenderPricingAuto.ts` |
| OfferBoq runtime | `src/lib/tender-offer-boq-explainability.ts` |
| Bid calculator | `src/lib/tenders-bid-calculator.ts` |
| OUR RATE | `src/lib/work-catalog/work-rate-lookup.ts` |
| Sell / PM | `src/lib/price-intelligence/*` · commercialPricing |
| Technology | `src/lib/technology-foundation/*` |

Harnessy: `scripts/test-tender-boq-pricing-rebuild-01-*.mjs` · `…-c-mode-1a-*.mjs`.
