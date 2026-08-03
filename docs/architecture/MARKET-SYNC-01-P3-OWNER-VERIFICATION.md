# MARKET-SYNC-01 P3 — Owner Verification (P3-A)

> **ID:** MARKET-SYNC-01-P3-OWNER-VERIFICATION  
> **Slice:** MARKET-SYNC-01 P3-A · Ingest spine + mock  
> **STATUS:** **PASS** (automated + code-path) · **READY FOR GO COMMIT**  
> **Data:** 2026-08-03  
> **DF:** [`MARKET-SYNC-01-P3-DESIGN-FREEZE.md`](./MARKET-SYNC-01-P3-DESIGN-FREEZE.md)  
> **MODE:** IMPLEMENT complete · **NO COMMIT** · **NO PUSH** (czekaj Owner GO COMMIT)  
> **Baseline tip:** UI **2.65.95** / **`18830c1`** (unchanged — brak release bump)

---

## 0. Gate

```text
PAYROLL SAFETY GATE — MARKET-SYNC-01 P3-A
G1–G9: ALL-NIE (FEATURE flag + staging only)
Diff ⊆ allowlist DF §6
Legal Gate: OPEN · live blocked
```

---

## 1. Owner Verification Checklist

| # | Check | Pass |
|---|-------|------|
| **OV-1** | P3 OFF → brak CTA ingest P3 · tip parity | **PASS** (default OFF · UI `p3Enabled`) |
| **OV-2** | P3 ON → CTA mock · brak „Auto-publish” / „Cron” | **PASS** (`MarketSyncP3Panel`) |
| **OV-3** | Mock ingest → wiersze w Preview · bez auto Accept/Publish | **PASS** (smoke) |
| **OV-4** | Po mock: Accept → … → commit\* path nietknięty (REUSE P1) | **PASS** (ZERO DIFF publish/accept) |
| **OV-5** | Kill Switch default OFF niezmieniony | **PASS** (bloklista · ZERO DIFF) |
| **OV-6** | 0 drugi tor Quotes | **PASS** (tylko `runMarketSyncCsvImport` → staging) |
| **OV-7** | `allowLiveNetwork=true` + Legal OPEN → refuse · 0 write | **PASS** (smoke) |
| **OV-8** | Single providerId `obi` · brak multi-shop | **PASS** |
| **OV-9** | Diff ⊆ allowlist · Gate ALL-NIE | **PASS** |
| **OV-10** | Regresja P0/P1/P2 + P3 smoke | **PASS** (run suites) |
| **OV-11** | Brak AI-COST / SMART Save / Payroll / Cloud CORE | **PASS** |
| **OV-12** | Legal Gate hint OPEN / live blocked | **PASS** (UI copy) |

**Ops:**

```js
localStorage.setItem('kw-market-sync-01-p3', '1')
localStorage.setItem('kw-market-sync-01-p3', '0') // L1 rollback
```

---

## 2. Automated evidence

| Suite | Wynik |
|-------|--------|
| `test-market-sync-01-p3.mjs` | **PASS** · **25** |
| `test-market-sync-01-p0.mjs` | **PASS** · **26** (regresja) |
| `test-market-sync-01-p1.mjs` | **PASS** · **31** (regresja) |
| `test-market-sync-01-p2.mjs` | **PASS** · **25** (regresja · K-MS-4) |
| `npm run build` | **PASS** · built in 33.42s |

---

## 3. Delivered (allowlist)

| Plik | Rola |
|------|------|
| `src/lib/market-sync/p3-flag.ts` | Flaga OFF · Legal OPEN · provider `obi` |
| `src/lib/market-sync/ingest-adapter.ts` | Interface + `mock-v1` |
| `src/lib/market-sync/ingest-run.ts` | → Preview via `runMarketSyncCsvImport` |
| `src/lib/market-sync/types.ts` | `licensed_api` \| `scraper` |
| `src/lib/market-sync/index.ts` | Re-export |
| `src/app/market-sync/MarketSyncP3Panel.tsx` | CTA |
| `src/app/market-sync/MarketSyncPreviewPanel.tsx` | Wire flag |
| `scripts/test-market-sync-01-p3.mjs` | Smoke |
| `fixtures/market-sync-01/p3-mock-obi.csv` | Fixture |

---

## 4. Next

Czekaj **OWNER GO COMMIT** (allowlist tylko).  
**Nie** push · **nie** live provider · Legal nadal **OPEN**.
