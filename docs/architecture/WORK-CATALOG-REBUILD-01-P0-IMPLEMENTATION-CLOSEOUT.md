# WORK-CATALOG-REBUILD-01 — P0 Implementation Closeout

> **STATUS:** **COMPLETE**  
> **DATA:** 2026-08-11  
> **UI:** **2.66.32**  
> **SSOT decyzji:** Design Freeze · ARCH REVIEW · Owner Decision P0 Correction

---

## Raport

```text
==================================================
WORK-CATALOG-REBUILD-01 — P0
==================================================

IMPLEMENTATION: COMPLETE

SSOT: Nasz Katalog Robót (OUR RATE)
BIBLIOTEKA: Definicja / Identity
OUR RATE: Jedyny SSOT aktualnej stawki
IDENTITY: workId + unit
STORAGE: kw-wgdom-work-catalog

C1 NORMALIZE: PASS
C-EMPTY: PASS
C-NO-SEED: PASS

COMPANYPRICEPLN: TECHNICAL LEGACY FIELD
COMPANYPRICEPLN → OUR RATE: ZERO
FALLBACK: ZERO
AUTO MIGRATION: ZERO

FRESHNESS: 90 dni (observedAt OUR RATE)
HISTORY: 24 (osobna od marketQuoteHistory)

CACHE-FIRST: PASS
ZERO HTTP: PASS
RESEARCH: BLOCKED
KB.PL: NOT IMPLEMENTED
WORK_RATE_LEGAL_GATE: BLOCKED
MARKET_SYNC_P3_LEGAL_GATE: UNCHANGED (PASS)

MATERIAL PRICE MEMORY: UNCHANGED
BID: UNCHANGED
OFFER: UNCHANGED

TESTY: 95 PASS / 0 FAIL (P0 harness)
BUILD: PASS
```

*(COMMIT / PUSH / PRODUCTION — poniżej.)*

---

## Commit

| Pole | Wartość |
|------|---------|
| **COMMIT** | `dc9647af` |
| **PUSH** | *(po `git push origin main`)* |
| **PRODUCTION** | DEPLOY PROPAGATING / VERIFIED (po `version.json`) |

| Element | Plik / ścieżka |
|---------|----------------|
| Typy OUR RATE | `src/lib/work-catalog/work-rate-types.ts` |
| Legal gate | `src/lib/work-catalog/work-rate-legal.ts` |
| Research stub | `src/lib/work-catalog/work-rate-research-stub.ts` |
| Freshness | `src/lib/work-catalog/work-rate-freshness.ts` |
| Normalize + historia | `src/lib/work-catalog/work-rate-normalize.ts` |
| Lookup | `src/lib/work-catalog/work-rate-lookup.ts` |
| Owner patch | `src/lib/work-catalog/work-rate-patch.ts` |
| C1 preserve | `normalizeCatalogWork` → `ourWorkRate` |
| Public API | `src/lib/work-catalog/index.ts` |
| Harness | `scripts/test-work-catalog-rebuild-01-p0.mjs` |

## Regresje (PASS)

- PRICE-MEMORY-CATALOG-01 (45)
- PRICE-MEMORY-CATALOG-02 (36)
- PRICE-MEMORY-CATALOG-03 (31)
- LIVE-ADAPTERS-08 (42)
- invoice seed (38)
- work-catalog store / freshness / public-api
- CATALOG-BID-01
- price persist P2.2
- COST-S1 OfferBoq

## Zakazy przestrzegane

- brak seed/fallback `companyPricePln` → OUR RATE  
- brak KB.pl / HTTP / full catalogue  
- brak Bid / Offer wire  
- brak nowego KV  
- brak UI P1 (celowo)  

## NEXT

```text
P1 — Firma → Nasz Katalog Robót (UI PL)
  · bez auto-start Legal / KB.pl / Bid
```

---

## Commit

| Pole | Wartość |
|------|---------|
| **COMMIT** | `dc9647af` |
| **PUSH** | PASS (`origin/main`) |
| **PRODUCTION** | DEPLOY PROPAGATING (verify FAST) |

---
