# MARKET-SYNC-01 P0 — CLOSEOUT (SSOT)

> **ID:** MARKET-SYNC-01-P0-CLOSEOUT  
> **EPIC:** MARKET-SYNC-01 · **Slice:** P0 — Model + Preview  
> **STATUS:** **CLOSED** · **RELEASE GO** · tip UI **2.65.84** · feature **`273fb3e0`**  
> **Data:** 2026-07-30  
> **Production Verify (FAST):** po feature push = **DEPLOY PROPAGATING**; po docs push odczyt = **PRODUCTION VERIFIED** (`2.65.84` / `273fb3e`) — szczegóły [`MARKET-SYNC-01-P0-PRODUCTION-VERIFY.md`](MARKET-SYNC-01-P0-PRODUCTION-VERIFY.md) · [`MARKET-SYNC-01-P0-RELEASE-REPORT.md`](MARKET-SYNC-01-P0-RELEASE-REPORT.md)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P0 = CLOSED
Import → Normalize → Match → Preview STOP
Local-first staging · zero Quotes / Cloud CORE / Accept / Publish
NEXT EPIC slice = P1 (Accept + Publish via commitMarketQuotesImport)
  — tylko po Owner GO · DESIGN FREEZE P1 najpierw
════════════════════════════════════════════════════════
```

---

## 1. Co zamknięto

| Element | Wartość |
|---------|---------|
| **Zakres** | MarketProduct · ProviderQuote · CSV import · Normalize · Match · Preview UI · JSON export/import · local staging |
| **STOP** | Brak Accept · Publish · `commitMarketQuotesImport` · write Quotes · controlled_market |
| **Persist** | `kw-market-sync-01-staging` (localStorage FEATURE) — **nie** w `DATA_KEYS` |
| **UI** | Super Admin → Biblioteka → **Market Sync Preview** |
| **UI version** | **2.65.84** |
| **Feature commit** | **`273fb3e0`** |
| **Test** | `npx vite-node scripts/test-market-sync-01-p0.mjs` — **25 PASS** |
| **Build** | **PASS** |
| **OV** | **PASS** · [`MARKET-SYNC-01-P0-OWNER-VERIFICATION.md`](MARKET-SYNC-01-P0-OWNER-VERIFICATION.md) |
| **Gate** | ALL-NIE · FEATURE-DATA |

---

## 2. Commity / hash

| Rola | Hash |
|------|------|
| **Feature / tip deploy** | **`273fb3e0`** (`feat(market-sync): MARKET-SYNC-01 P0 — Model + Preview staging (2.65.84)`) |
| Docs sync tip (jeśli osobny) | patrz git log po CLOSEOUT docs commit |

---

## 3. Artefakty SSOT łańcucha

| Etap | Dokument |
|------|----------|
| AUDIT | [`MARKET-SYNC-01-AUDIT.md`](MARKET-SYNC-01-AUDIT.md) |
| PLAN | [`MARKET-SYNC-01-PLAN.md`](MARKET-SYNC-01-PLAN.md) |
| DF P0 | [`MARKET-SYNC-01-P0-DESIGN-FREEZE.md`](MARKET-SYNC-01-P0-DESIGN-FREEZE.md) |
| AR P0 | [`MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW.md`](MARKET-SYNC-01-P0-ARCHITECTURE-REVIEW.md) |
| IMPLEMENT | [`MARKET-SYNC-01-P0-IMPLEMENT.md`](MARKET-SYNC-01-P0-IMPLEMENT.md) |
| OV | [`MARKET-SYNC-01-P0-OWNER-VERIFICATION.md`](MARKET-SYNC-01-P0-OWNER-VERIFICATION.md) |
| PV | [`MARKET-SYNC-01-P0-PRODUCTION-VERIFY.md`](MARKET-SYNC-01-P0-PRODUCTION-VERIFY.md) |
| **CLOSEOUT (ten plik)** | **SSOT zamknięcia P0** |

---

## 4. OUT (zachowane)

AI-COST · Cloud Sync CORE · Bid · Scoring · Parser · Payroll · Product Quotes write · controlled_market · Accept · Publish · scraper · origins w `MARKET_ORIGIN_IDS` · fuzzy auto-merge.

---

## 5. Gotowość P1

| | |
|--|--|
| **P0** | **CLOSED** |
| **P1** | **CLOSED** · tip **2.65.85** · [`MARKET-SYNC-01-P1-CLOSEOUT.md`](MARKET-SYNC-01-P1-CLOSEOUT.md) |
| **P2** | **NIE rozpoczęty** · AUDIT + Owner GO |
| **Zakaz** | Auto-start P2 · drugi write path Quotes |

---

## 6. Lessons (krótko)

1. Staging local-first skutecznie izoluje DIY sync od WC/Quotes.  
2. Fuzzy OFF + conflict ≥2 chroni przed false match w P0.  
3. REUSE parsera CSV Work Catalog OK; **nie** reuse commit path do P1.
