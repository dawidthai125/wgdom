# SMART-PRICING-01 P2 — Owner Verification Checklist

> **STATUS:** IMPLEMENT done · **NO COMMIT** · **NO PUSH** (czekaj Owner GO)  
> **Data:** 2026-08-03  
> **Flagi:**  
> - `kw-smart-pricing-01-p1` (P1)  
> - `kw-smart-pricing-01-p2` default **OFF** · **P2⇒P1**

| # | Check | Jak | Pass? |
|---|-------|-----|-------|
| **OV-1** | P2 OFF → UI = P1 (Quotes only); obie OFF → Detect P0 | Bez LS / `p2=0` | |
| **OV-2** | P1+P2 ON → Evidence może mieć `market_sync_staging` | Staging z linkedWorkId + Accept | |
| **OV-3** | Rank B1: Quotes nad staging @ equal provider | Ten sam provider w Quotes i staging | |
| **OV-4** | Ten sam panel P1 · label źródła Quotes / MS staging | Brak Evidence v2 | |
| **OV-5** | Merge nie zapisuje LS/Cloud/staging | DevTools · fingerprint | |
| **OV-6** | One-shot ze staging → session · reload gasi · Quotes FP OK | | |
| **OV-7** | Odrzuć → 0 side-effects Quotes/staging | | |
| **OV-8** | Brak CTA Zapisz / Auto-publish / commit | | |
| **OV-9** | Detect P0 progi bez zmian | | |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE | | |

## Enable P2 (manual)

```js
localStorage.setItem("kw-smart-pricing-01-p1", "1");
localStorage.setItem("kw-smart-pricing-01-p2", "1");
location.reload();
```

## Smoke

```bash
npx vite-node scripts/test-smart-pricing-01-p0.mjs
npx vite-node scripts/test-smart-pricing-01-p1.mjs
npx vite-node scripts/test-smart-pricing-01-p2.mjs
npm run build
```
