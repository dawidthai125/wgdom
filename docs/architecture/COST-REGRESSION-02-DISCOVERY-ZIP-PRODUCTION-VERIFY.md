# COST-REGRESSION-02 — DISCOVERY-ZIP PRODUCTION VERIFY

> **ID:** COST-REGRESSION-02-DISCOVERY-ZIP-PRODUCTION-VERIFY  
> **Data:** 2026-07-28  
> **UI target:** **2.65.72** · feature **`c5c95ed`**  
> **STATUS:** **DEPLOY PROPAGATING** (VERIFY FAST — jedno odczytanie)

---

## 1. version.json (VERIFY FAST — jedno odczytanie)

```json
{
  "version": "2.65.71",
  "commit": "fbb971d",
  "timestamp": "2026-07-28T19:01:52.307Z"
}
```

| Pole | Oczekiwane | Live | Werdykt |
|------|------------|------|---------|
| version | `2.65.72` | **2.65.71** | **STALE → DEPLOY PROPAGATING** |
| feature on `main` | `c5c95ed` | pushed `main` | **PASS (git)** |

**RELEASE GO** nadal OK — Vercel propaguje; bez retry/pollingu.

---

## 2. Smoke (pre-prod / pure)

| Check | Evidence | Werdykt |
|-------|----------|---------|
| AC-02-1…09 | `scripts/test-cost-regression-02-discovery-zip.mjs` | **PASS** |
| Epic A regresja | `scripts/test-cost-regression-01-epic-a.mjs` | **PASS** |
| Build | `npm run build` | **PASS** |
| Allowlist | commit `c5c95ed` — brak Bid / PricingAuto / resolver / sync | **PASS** |

---

## 3. Werdykt PV

| Werdykt | Status |
|---------|--------|
| RELEASE GO | **TAK** |
| PRODUCTION VERIFIED | **NIE** — **DEPLOY PROPAGATING** |

Po propagacji: jedno `curl.exe -s https://www.wgdom.fun/version.json` → oczekiwane `2.65.72` / tip ≥ `c5c95ed`.
