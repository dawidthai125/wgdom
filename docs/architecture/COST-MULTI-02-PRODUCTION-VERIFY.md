# COST-MULTI-02 — PRODUCTION VERIFY

> **STATUS:** pending curl after push  
> **Expected UI:** **2.65.75**

## VERIFY FAST

```bash
curl -s https://www.wgdom.fun/version.json
```

| Wynik | Werdykt |
|-------|---------|
| version === 2.65.75 | **PRODUCTION VERIFIED** |
| poprzednia wersja | **DEPLOY PROPAGATING** (RELEASE GO nadal OK) |

## Owner smoke (po PV)

1. Tender `08dee335-f338-1f30-ebd1-65000155122a`
2. **Ponów analizę** (żeby zbudować `branchWinnerArtifacts`)
3. Kosztorys: banner Aggregate / N branż
4. Bid ≫ ~280k (rząd Owner)
5. Jednobranżowy przetarg: Bid bez regresji
