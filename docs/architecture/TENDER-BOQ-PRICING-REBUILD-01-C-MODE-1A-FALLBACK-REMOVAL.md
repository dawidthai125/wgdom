# TENDER-BOQ-PRICING-REBUILD-01 — C-MODE-1a FALLBACK REMOVAL

> **STATUS:** IMPLEMENTATION COMPLETE  
> **DATA:** 2026-08-12  
> **UI:** **2.66.43**  
> **Owner Decision:** [`…-OWNER-DECISION-C-MODE-1A.md`](./TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md)

```text
OFFERBOQ NULL → GAP
ath_priced / catalog / companyPricePln FALLBACK = ZERO (auto pricing)
F5 / Position Cost / OUR RATE / BOM / PM = UNCHANGED
ATH = SEPARATE INPUT · KEEP
legacy catalog = KEEP TECHNICAL
P7 = NIE
```

---

## 1. Root cause

Po F5 cutover ścieżka `computeRuntimeBidFromOfferBoq` przy obecnym OfferBoq zwraca wynik F5 (w tym GAP `ok:false`) i **nie** spada na catalog.

Jednak `resolveTenderPricingAutoProposal` (BUGFIX-01) gdy **OfferBoq runtime === null** wołał:

`computeCatalogBidProposalForPricingAuto` → `computeTenderBidProposal` bez `offerBoqDirect`

→ tryb **`ath_priced`** albo **`catalog`**.

To naruszało C-MODE-1a (pkt 1, 2, 12).

---

## 2. Poprzedni fallback

```text
costPipeline ON
  → computeRuntimeBidFromOfferBoq
  → null
  → computeCatalogBidProposalForPricingAuto   ← USUNIĘTE
       → ath_priced | catalog
```

---

## 3. Nowe zachowanie

```text
costPipeline ON
  → computeRuntimeBidFromOfferBoq
  → proposal (F5 / ok:false GAP)  ALBO
  → null                          ← OfferBoq unavailable = GAP
```

| Warunek | Wynik |
|---------|--------|
| OfferBoq istnieje | F5 path (`offer_boq_ai`) |
| OfferBoq null | **`null`** (jawny GAP) |
| costPipeline OFF | legacy catalog (flaga historyczna · KEEP) |

---

## 4. GAP semantics

- **OfferBoq unavailable** → brak Bid proposal (`null`) · UI: brak rekomendowanej ceny.  
- **OfferBoq + incomplete Position Cost** → już F5: `ok:false` + warnings (UNCHANGED).  
- **NIE** inventować ceny · **NIE** przełączać na ATH / catalog „żeby coś pokazać”.

---

## 5. Potwierdzenie C-MODE-1a

| Reguła | Status |
|--------|--------|
| OfferBoq null ↛ ath_priced | **PASS** |
| OfferBoq null ↛ catalog | **PASS** |
| OfferBoq null ↛ companyPricePln | **PASS** |
| NEW BID = F5 | **PASS** |
| ATH SEPARATE INPUT | **PASS** (parser / enum KEEP) |
| Legacy catalog KEEP TECHNICAL | **PASS** (`computeCatalogBidProposalForPricingAuto` retained) |

---

## 6. Zakres kodu

| Plik | Zmiana |
|------|--------|
| `src/app/hooks/useTenderPricingAuto.ts` | OfferBoq null → `return null` |
| Testy bugfix-01 / C-MODE / F6 audit asserts | zaktualizowane |
| Nowy harness | `…-c-mode-1a-fallback-removal.mjs` |

**ZERO** zmian: Position Cost · OUR RATE · BOM · PM · Bid calculator stack · ATH parser.

---

## 7. Testy

`npx vite-node scripts/test-tender-boq-pricing-rebuild-01-c-mode-1a-fallback-removal.mjs` — CASE 1–10.

---

## 8. STOP

NIE startuj P7. Soft-deprecate catalog / usuwanie pól = osobny GO.
