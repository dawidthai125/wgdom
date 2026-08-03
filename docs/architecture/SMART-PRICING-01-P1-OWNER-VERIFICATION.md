# SMART-PRICING-01 P1 — Owner Verification Checklist

> **STATUS:** IMPLEMENT done · **NO COMMIT** · **NO PUSH** (czekaj Owner GO)  
> **Data:** 2026-08-03  
> **Flaga:** `kw-smart-pricing-01-p1` default **OFF** (`localStorage.setItem('kw-smart-pricing-01-p1','1')` do ON)

| # | Check | Jak | Pass? |
|---|-------|-----|-------|
| **OV-1** | Flaga OFF → UI = P0 Detect only | Bez LS key / `=0` · brak panelu Evidence · brak linku Evidence na linii | |
| **OV-2** | Flaga ON → panel Evidence z Quotes | `localStorage.setItem('kw-smart-pricing-01-p1','1')` · klik brak w bannerze → panel | |
| **OV-3** | Rank zmienia kolejność, nie ceny źródłowe | Lista #1 wgdom→leroy→… · ceny = Quotes · Biblioteka niezmieniona | |
| **OV-4** | Badge Confidence · 0 persist | READY\|REVIEW\|MANUAL widoczny · reload → Confidence nie „wraca z LS” | |
| **OV-5** | Odrzuć → 0 side-effects Quotes | Odrzuć zamyka panel / czyści wybór · Quotes fingerprint OK | |
| **OV-6** | One-shot sesja · reload gasi | One-shot → badge na linii · F5 → overlay znika | |
| **OV-7** | 0 LS one-shot · 0 Cloud | DevTools LS: brak kluczy one-shot · Network: brak cloud write Quotes | |
| **OV-8** | Brak CTA Zapisz / commit | Panel bez „Zapisz do Product Quotes” · brak `commitMarketQuotesImport` | |
| **OV-9** | Detect P0 progi | Detect nadal: conf≥0.5 · stale 180d | |
| **OV-10** | Diff ⊆ allowlist · Gate ALL-NIE | Tylko `smart-pricing/**` · OfferBoq wire · smoke scripts | |

## Smoke (dev)

```bash
npx vite-node scripts/test-smart-pricing-01-p0.mjs
npx vite-node scripts/test-smart-pricing-01-p1.mjs
npm run build
```

## Enable P1 (manual)

```js
localStorage.setItem("kw-smart-pricing-01-p1", "1");
location.reload();
```
