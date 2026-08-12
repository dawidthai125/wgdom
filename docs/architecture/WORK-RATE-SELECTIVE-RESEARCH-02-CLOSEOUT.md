# WORK-RATE-SELECTIVE-RESEARCH-02 — Closeout

> **STATUS:** **IMPLEMENTATION COMPLETE**  
> **DATA:** 2026-08-12

---

```text
WORK-RATE-SELECTIVE-RESEARCH-02

STATUS: IMPLEMENTATION COMPLETE

OUR RATE: PASS
CACHE-FIRST: PASS
SELECTIVE: PASS
FULL CATALOGUE: ZERO
LABOR-ONLY: PASS
REGION: PASS
MEDIAN: PASS
OWNER ACCEPT: PASS
HISTORY: PASS
FRESHNESS: PASS

COMPANYPRICEPLN: UNCHANGED
BID: UNCHANGED
OFFER: UNCHANGED
MATERIAL PRICE MEMORY: UNCHANGED

TESTS: P2 54 · P0 99 · P1 62 · Legal 17 · PM C01/02/03 · LIVE-08 · MMR-02 · invoice · Bid · BUILD PASS
BUILD: PASS
COMMIT: fcd65f43
PUSH: PASS
PRODUCTION: DEPLOY PROPAGATING

NEXT: STOP — czekaj na Owner GO (nie P3 / nie Bid)
```

## Zakres

| Zrobione | |
|----------|--|
| Selective research 4 źródeł | TAK |
| Qualify + mediana + region | TAK |
| Owner Accept → OUR RATE | TAK |
| UI „Aktualizuj stawkę rynkową” ONE | TAK |
| Edge allowlist | TAK |
| Anti-storm | TAK |
| Full catalogue | ZERO |
| Live auto przy open katalogu | ZERO |

## Czego nie zrobiono

- auto research całego przedmiaru  
- Bid / Offer wire (P7)  
- zmiany materiałów / LIVE-ADAPTERS  
- inventowanie cen z nieustrukturyzowanego HTML live (fail-soft GAP; fixture = dowód pipeline)

## Powiązania

- SSOT: [`WORK-RATE-SELECTIVE-RESEARCH-02.md`](./WORK-RATE-SELECTIVE-RESEARCH-02.md)  
- Legal: [`WORK-RATE-OWNER-LEGAL-PASS.md`](./WORK-RATE-OWNER-LEGAL-PASS.md)  
- P0/P1: Nasz Katalog Robót  

## Commit

| Pole | Wartość |
|------|---------|
| **COMMIT** | **`fcd65f43`** (feature) · tip **`ec99dbbf`** |
| **PUSH** | **PASS** (`origin/main`) |
| **UI** | **2.66.35** |
| **PRODUCTION** | DEPLOY PROPAGATING (live still 2.66.34) |
