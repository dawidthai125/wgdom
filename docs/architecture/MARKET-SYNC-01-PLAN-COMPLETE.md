# MARKET-SYNC-01 — PLAN COMPLETE

> **ID:** MARKET-SYNC-01-PLAN-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** PLAN ONLY · DOCS ONLY  
> **PLAN:** [`MARKET-SYNC-01-PLAN.md`](MARKET-SYNC-01-PLAN.md)  
> **AUDIT:** [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md) · **zaakceptowany** · Owner GO PLAN  
> **Commit / push / IMPLEMENT / DF / zmiany kodu:** **NIE** (w tej karcie)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 PLAN COMPLETE
Decyzja: READY FOR DESIGN FREEZE
════════════════════════════════════════════════════════
```

---

## 1. Decyzja

| | |
|--|--|
| **Decyzja** | **READY FOR DESIGN FREEZE** |
| **Nie** | PLAN REQUIRES CHANGES |
| **Następny etap** | **DESIGN FREEZE** — tylko po **Owner GO** · najpierw **Thin DF P0** |

---

## 2. One Bundle

Ręczna, rzadka synchronizacja cen DIY (LM → Casto → później inne) przez **MarketProduct + ProviderQuote → Preview → Accept → `commitMarketQuotesImport` → Product Quotes → `controlled_market`**, bez AI-COST / Cloud CORE / Bid / drugiego toru Quotes.

---

## 3. Slice’y (sztywna kolejność)

| Slice | Fokus | Publish Quotes | Scraper |
|-------|-------|----------------|---------|
| **P0** | Model + Preview | **NIE** | **NIE** |
| **P1** | Publish + `leroy` + `castorama` | **TAK** (tylko commit) | **NIE** |
| **P2** | PriceHistory + szablon OBI/Bricoman/PSB | — | **NIE** |
| **P3** | API/scraper | TAK + Preview | **Tylko Legal+Owner GO** |

---

## 4. Kontrakty FROZEN (z AUDIT → PLAN)

| Kontrakt | Wartość |
|----------|---------|
| SSOT robót | Work Catalog |
| Ceny produkcyjne rynku | Product Quotes (`marketQuotes`) |
| Jedyny publish | **`commitMarketQuotesImport`** |
| Nowa warstwa | MarketProduct · ProviderQuote |
| Historia | Osobny komponent (P2) · nie w average |
| Ops | Ręczny Admin · Preview · Accept · brak cron / auto-publish |

---

## 5. KPI hard (skrót)

| KPI | Slice |
|-----|-------|
| K-MS-0 Preview fixture | P0 |
| K-MS-1 tylko commit path | P1 |
| K-MS-2 LM+Casto w WC | P1 |
| K-MS-3 false publish 0 | P1 |
| K-MS-4 historia ≠ average | P2 |
| K-MS-5 brak regresji CORE/AI-COST/CM-04 | wszystkie |

---

## 6. Zasady — weryfikacja

| Zasada | PLAN |
|--------|------|
| SSOT FIRST | **PASS** |
| REUSE FIRST | **PASS** |
| ZERO DUPLICATE LOGIC | **PASS** (jedyny tor Quotes) |
| FEATURE-DATA ONLY | **PASS** |
| DATA FIRST, NOT AI | **PASS** |

---

## 7. OUT (przypomnienie)

AI-COST · Cloud Sync CORE · Bid · Scoring · klasyfikator · parser · CM-04 P0–P3 · drugi tor Quotes · auto-publish · scraper przed P3+Legal GO.

---

## 8. Otwarte dla DF (nie blokują PLAN)

D1 persist local vs KV · D2 region default · D3 publishFactor · D4 N:M link · D5 progi · D6 nazwa flagi — szczegóły w PLAN §17.

---

## 9. NEXT

```text
Owner GO → DESIGN FREEZE (P0 Thin)
  → ARCHITECTURE REVIEW
  → OWNER GO → IMPLEMENT P0
```

**Nie** startować DF ani IMPLEMENT bez Owner GO.
