# MARKET-SYNC-01 P1 — CLOSEOUT (SSOT)

> **ID:** MARKET-SYNC-01-P1-CLOSEOUT  
> **EPIC:** MARKET-SYNC-01 · **Slice:** P1 — Accept + Publish  
> **STATUS:** **CLOSED** · **RELEASE GO** · tip UI **2.65.85** · feature **`5326cf8c`**  
> **Data:** 2026-07-30  
> **Production Verify (FAST):** po feature push = **DEPLOY PROPAGATING** (`2.65.84` / `7f7bb0d`) — szczegóły [`MARKET-SYNC-01-P1-RELEASE-REPORT.md`](MARKET-SYNC-01-P1-RELEASE-REPORT.md) · [`MARKET-SYNC-01-P1-PRODUCTION-VERIFY.md`](MARKET-SYNC-01-P1-PRODUCTION-VERIFY.md)

```text
════════════════════════════════════════════════════════
MARKET-SYNC-01 P1 = CLOSED
Accept (staging) → Guard → Dry Run → Delta → Summary →
Kill Switch → commitMarketQuotesImport (JEDYNY WRITE) → Undo single
DIY origins leroy/castorama w Quotes · enabledOrigins DIY OFF
NEXT slice = P2 AUDIT — tylko po Owner GO (nie auto-start)
════════════════════════════════════════════════════════
```

---

## 1. Co zamknięto

| Element | Wartość |
|---------|---------|
| **Zakres** | Accept/Reject/Defer · linkedWorkIds N:1 · Guard · Dry Run · Delta · Publish Summary · Kill Switch · `runMarketSyncPublish` → **tylko** `commitMarketQuotesImport` · Undo single |
| **Origins** | `leroy`/`castorama` w `MARKET_QUOTE_ORIGIN_IDS` · **poza** `MARKET_ORIGIN_IDS` (średnia DIY default OFF) |
| **Kill Switch** | `MARKET_SYNC_PUBLISH_ENABLED` default **OFF** · check w lib przed commit |
| **Persist staging** | `kw-market-sync-01-staging` (local FEATURE) — **nie** w `DATA_KEYS` |
| **UI** | Super Admin → Biblioteka → **Market Sync** (P1) |
| **UI version** | **2.65.85** |
| **Feature commit** | **`5326cf8c`** |
| **Test** | P0 **26 PASS** · P1 **31 PASS** (idempotencja · KS · Undo) |
| **Build** | **PASS** |
| **OV** | **PASS** |
| **Gate** | ALL-NIE · FEATURE-DATA |

---

## 2. Commity / hash

| Rola | Hash |
|------|------|
| **Feature / tip deploy** | **`5326cf8c`** (`feat(market-sync): MARKET-SYNC-01 P1 — Accept + Publish (2.65.85)`) |
| Docs sync tip | patrz git log po CLOSEOUT docs commit |

---

## 3. Artefakty SSOT łańcucha P1

| Etap | Dokument |
|------|----------|
| AUDIT | [`MARKET-SYNC-01-P1-AUDIT.md`](MARKET-SYNC-01-P1-AUDIT.md) |
| PLAN | [`MARKET-SYNC-01-P1-PLAN.md`](MARKET-SYNC-01-P1-PLAN.md) |
| DF | [`MARKET-SYNC-01-P1-DESIGN-FREEZE.md`](MARKET-SYNC-01-P1-DESIGN-FREEZE.md) |
| AR | [`MARKET-SYNC-01-P1-ARCHITECTURE-REVIEW.md`](MARKET-SYNC-01-P1-ARCHITECTURE-REVIEW.md) |
| PV | [`MARKET-SYNC-01-P1-PRODUCTION-VERIFY.md`](MARKET-SYNC-01-P1-PRODUCTION-VERIFY.md) |
| RELEASE | [`MARKET-SYNC-01-P1-RELEASE-REPORT.md`](MARKET-SYNC-01-P1-RELEASE-REPORT.md) |
| **CLOSEOUT (ten plik)** | **SSOT zamknięcia P1** |

P0 SSOT: [`MARKET-SYNC-01-P0-CLOSEOUT.md`](MARKET-SYNC-01-P0-CLOSEOUT.md)

---

## 4. OUT (zachowane)

AI-COST · Cloud Sync CORE · Bid · Scoring · Parser · Payroll · drugi tor Quotes / bezpośredni `applyMarketQuotesFromPreview` · auto-publish · scraper · fuzzy ON · N:M · PriceHistory · multi-undo · `companyPricePln` z DIY · `enabledOrigins` DIY ON by default · P2.

---

## 5. Gotowość P2

| | |
|--|--|
| **P1** | **CLOSED** |
| **P2** | **NIE rozpoczęty** |
| **Warunek startu P2** | Owner GO → **AUDIT P2** → PLAN → DF → AR → GO IMPLEMENT |
| **Zakaz** | Auto-start P2 · Publish bez Kill Switch · drugi write path Quotes |

---

## 6. Lessons (krótko)

1. Kill Switch w **lib** (nie tylko UI) blokuje obejście Confirm.  
2. Scope Delta new+changed + idempotencja commit = bezpieczny re-Publish.  
3. DIY origins poza `MARKET_ORIGIN_IDS` chroni controlled_market / średnią.
