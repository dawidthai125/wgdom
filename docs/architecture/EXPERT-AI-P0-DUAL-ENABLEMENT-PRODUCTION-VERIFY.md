# EXPERT-AI-P0-DUAL-ENABLEMENT — PRODUCTION VERIFY

> **STATUS:** **PV PASS** · **PRODUCTION VERIFIED**  
> **ID:** EXPERT-AI-P0-DUAL-ENABLEMENT-PV  
> **Date:** 2026-08-09  
> **Production:** UI **2.66.22** · commit **`1902daa`** (`1902daa7*`)  
> **origin/main:** **`1902daa7`** (`1902daa7bad6b5360fcc95188f6889a314fffa3f`)  
> **Parent:** **`f5f598c5`**  
> **CLOSEOUT:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-CLOSEOUT.md)  
> **DF:** [`EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md`](EXPERT-AI-P0-DUAL-ENABLEMENT-DESIGN-FREEZE.md)

```text
════════════════════════════════════════════════════════
PV PASS — 1902daa7* / 2.66.22

M = ACCESS · D = RUNTIME
F1 Bid PRIMARY · no false Expert runtime
T11 Offer / NO PRIMARY
LS kill/OV · Decision⇒Session
NO third flag/store/price engine
S7 · Q12 · Persist KEEP
════════════════════════════════════════════════════════
```

---

## 1. Tip

| | |
|--|--|
| `version.json` | `"version":"2.66.22"`, `"commit":"1902daa"` |
| Expected | **`1902daa7*`** |
| Match | **PASS** |

---

## 2. Live bundles

| Asset | Role |
|-------|------|
| `index-CeNs6meA.js` | entry / mapDeps |
| `app-core-D5O_H9zX.js` | shell · module access settings |
| **`TendersModule-Dp9bh5sc.js`** | Dual Outcome · Session · DW · PLN · S7 |

### Bundle evidence (minified)

| Symbol / pattern | Meaning |
|------------------|---------|
| `function Ea(){return wa()}` | `isExpertAiRuntimeEffective` thin alias |
| `wa()` LS `"0"`/`"1"` → `expertAiDecydentEnabled` | Session / D runtime |
| `function qC(e){return wa()}` | Session stack — **ignores M** |
| `function HC(e){return pC()}` | DW stack → Decision flag |
| `pC`: `if(!wa())return!1` | Decision ⇒ Session coupling |
| Hub `const h=Ea()` → `Hh({expertEffective:h,…})` | PLN authority on D |
| `Hh` → `offer_expert` / `bid_legacy` / `none` | S3 formula KEEP |
| `data-s2-dw-primary` · `data-s7-hub-first` · `data-s7-tre-recovery` | S2/S7 KEEP |
| `kw-decision-persist-v1` | Persist KEEP |
| `useTenderOfferRun TRACE` | **ABSENT** |
| `kw-expert-ai` / `applyBidTimeLoadGuard` | **ABSENT** |

---

## 3. Regression harness

| Harness | Result |
|---------|--------|
| S2 Dual Outcome | **55 PASS** |
| S4 Hub | **40 PASS** |
| S5 Tab Decyzja | **27 PASS** |
| S6 Persist bridge | **28 PASS** |
| S7 Hub-first | **30 PASS** |
| Enablement | **28 PASS** |
| Session (+ Q12) | **67 PASS** |
| Decision Workspace | **15 PASS** |
| Persist | **14 PASS** |
| P0 truth table | **22 PASS** |

---

## 4. Build

| Tree | Result |
|------|--------|
| Isolated P0 (bid WIP parked) | **PASS** |
| Current + `bid-time-load-guard` WIP | **FAIL** — **PRE-EXISTING / OUT** (`applyBidTimeLoadGuard` export) |

---

## 5. Protected / OUT

| Item | Status |
|------|--------|
| `useTenderOfferRun.ts` | LOCAL M · **OUT** · not in feature commit · TRACE absent prod |
| `bid-time-load-guard/**` | LOCAL ?? · **OUT** |
| Engines vs parent `f5f598c5..1902daa7` | **empty** (Chief/Experts/Persist API) |

---

## 6. Verdict

**EXPERT-AI-P0 — PRODUCTION VERIFY PASS**
