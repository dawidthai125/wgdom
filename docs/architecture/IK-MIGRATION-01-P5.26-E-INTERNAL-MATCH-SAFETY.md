# IK-MIGRATION-01 — P5.26-E INTERNAL MATCH SAFETY HARDENING

> **TRYB:** AUDIT → RCA → PLAN → DESIGN FREEZE → IMPLEMENT → TEST  
> **Owner GO:** TAK (tylko hardening)  
> **Date:** 2026-08-15  
> **Status:** COMPLETE — await Owner Review  
> **Artifacts:** `.tmp/p526-e-matcher-safety-results.json` · `.tmp/p526-e-matcher-safety-FULL.md` · `.tmp/p526-e-post-hardening-coverage.json`

## Absolute constraints (honoured)

| | |
|---|---|
| Research / HTTP research | **0** |
| Accept / CREATE CatalogWork / price / bind / F5 | **0** |
| `commercialPricing` / `ikEntryEnabled` / P5.27 | **unchanged** |
| Commit / push | **0** (Owner review first) |

---

## 1. RCA

### Problem #1 — głowica → montaż grzejnika

Synthetic «Montaż głowicy … grzejnika» scored **HIGH** on `cc-p0c-w1-montaz-grzejnika-szt` via token overlap `montaz` + `grzejnik`, without object identity gate.

**Root cause (soft):** `softInternalFirstText` NFD-stripped accents but **Polish `ł` does not NFD-decompose** → «głowicy» became «g owicy», so `glowic` never matched.

### Problem #2 — malowanie emulsją ← wapno / olej

Host `cc-p0c-w1-malowanie-emulsja-m2` SAFE-matched G108/G109 (wapienne) and REVIEW-hit G141/G143 (olej stolarka) on shared verb «malowanie».

**Root cause:** no paint-type positive marker / conflict gate on emulsja host; MEDIUM Owner Knowledge treated any `malowan`↔`malowan` as OK.

---

## 2. Design freeze (QUALITY > COVERAGE)

1. **Host-scoped gates only** — not global threshold raise.  
2. **NO_INTERNAL_MATCH is correct** when unsafe.  
3. Preserve: wykucie≠zaprawianie · PACKAGE≠MATERIAL · LABOR≠PACKAGE · G112 REJECTED.  
4. Owner binds G015/024/081 · 035/036/067 · 092/107 · 153/154 **untouched**.

---

## 3. Gates implemented

| Gate | Effect |
|------|--------|
| `hostObjectSafetyGate` — grzejnik host | Reject if query has głowica / termostat / zawór termostatyczny / regulator / element regulacyjny |
| `hostObjectSafetyGate` — emulsja host | Require `emuls*` marker; reject wapno / klejowe / olejne / lakier / stolarka / elewacyjne |
| `hostObjectSafetyGate` — bruzdy | Reinforce wykucie ≠ zaprawianie |
| `mediumOwnerKnowledgeOk` | Tighten malowanie + grzejnik whitelist |
| `softInternalFirstText` | Map `ł`/`Ł` → `l` before strip |
| emuls stem overlap | After gate OK: align `emulsja` ↔ `emulsyjnymi` for scoring (no threshold change) |

**New file:** `src/lib/intelligent-estimator/internal-first-host-safety.ts`

---

## 4. BEFORE (P5.26-D) vs AFTER (P5.26-E)

| Metric | P5.26-D AFTER | P5.26-E AFTER |
|--------|-------------:|-------------:|
| CURRENT EXACT | 35 | **35** |
| INTERNAL EXACT | 0 | 0 |
| INTERNAL SEMANTIC SAFE | 24 | **24** |
| INTERNAL SEMANTIC REVIEW | 41 | **81** |
| NO_INTERNAL_MATCH | 317 | **280** |
| FALSE POSITIVE (probe fail) | 1 (głowica) | **0** |
| Malowanie host groups | 092/107 + spill 108/109/141/143 | **092/107 only** |
| Grzejnik host groups | 153/154 | **153/154** |
| Wykucie host groups | 015/024/081 | **015/024/081** |

SAFE count unchanged; **unsafe spillover removed**. REVIEW ↑ / NO_MATCH ↓ partly from `ł→l` improving legitimate near-miss classification — **not** threshold loosening.

HTTP AVOIDED (theoretical / measured internal): Owner-bind **21** linii nadal; research HTTP **0**.

---

## 5. Regression matrix A–O

| ID | Case | Expected | Result |
|----|------|----------|--------|
| A | Montaż grzejnika | SAFE | PASS |
| B | Montaż grzejnika stalowego | SAFE | PASS |
| C | Montaż głowicy termostatycznej grzejnika | NOT SAFE | PASS |
| D | Montaż głowicy do grzejnika | NOT SAFE | PASS |
| E | Wymiana głowicy termostatycznej | NOT SAFE | PASS |
| F | Malowanie emulsją | SAFE | PASS |
| G | Dwukrotne malowanie farbami emulsyjnymi | SAFE | PASS |
| H–L | wapienne / olejne / stolarka / elewacyjne | NOT SAFE | PASS |
| M | Zaprawianie ≠ wykucie host | PASS | PASS |
| N–O | Wykucie bruzd (+ w ścianie) | SAFE | PASS |

**Tests:** `scripts/test-ik-migration-01-p526e-matcher-safety.mjs` → **21/21**  
**Regresja domain:** `test-ik-migration-01-p525-fix-domain-gate.mjs` → **40/40**  
**Build:** PASS

---

## 6. Changed files

| File | Change |
|------|--------|
| `src/lib/intelligent-estimator/internal-first-host-safety.ts` | **NEW** host gates |
| `src/lib/intelligent-estimator/internal-first-semantic-match.ts` | wire gate + Owner Knowledge + emuls stem |
| `src/lib/intelligent-estimator/internal-first-text.ts` | `ł`→`l` |
| `src/lib/intelligent-estimator/index.ts` | re-exports |
| `scripts/test-ik-migration-01-p526e-matcher-safety.mjs` | **NEW** A–O |

---

## 7. Integrity

| | |
|---|---|
| CatalogWork created / modified rates | **0** |
| Bind / BASE / Accept | **0** |
| Invented prices | **0** |
| Research HTTP | **0** |

---

## 8. STOP

**P5.26-E COMPLETE.** Czekaj na Owner Review.

- Nie BATCH / research  
- Nie Accept  
- Nie CREATE  
- Nie P5.27  
- Nie commit/push bez Owner GO  
