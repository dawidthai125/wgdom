# COST-MULTI-02 — PRODUCTION VERIFY

> **STATUS:** **DEPLOY PROPAGATING** (VERIFY FAST 2026-07-28)  
> **Expected UI:** **2.65.75** · feature commit **`8f4673ce`**  
> **Live `version.json` (jedno odczytanie):** `2.65.74` / `85c0629`

## VERIFY FAST

```bash
curl.exe -s https://www.wgdom.fun/version.json
```

| Wynik | Werdykt |
|-------|---------|
| version === 2.65.75 | **PRODUCTION VERIFIED** |
| **2.65.74 (obecne)** | **DEPLOY PROPAGATING** — RELEASE GO nadal OK |

## Owner smoke (po PRODUCTION VERIFIED)

1. Tender `08dee335-f338-1f30-ebd1-65000155122a`
2. **Ponów analizę** (żeby zbudować `branchWinnerArtifacts`)
3. Kosztorys: banner Aggregate / N branż
4. Bid ≫ ~280k (rząd Owner)
5. Jednobranżowy przetarg: Bid bez regresji
