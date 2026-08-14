# INTELLIGENT ESTIMATOR — PRODUCTION BASELINE

> **ID:** `INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-14  
> **Tip UI/commit SSOT:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)

---

## 1. Production tip (measured 2026-08-14)

| Field | Value |
|-------|-------|
| URL | https://www.wgdom.fun |
| UI version | **2.66.59** |
| Commit | **`9bcc558c26b454890dd17fb6b3634713caf4a0de`** (short **`9bcc558`**) |
| Feature area on tip | PASS2 CR discovery (`feat(costing): extend labor pass2 discovery`) |
| Branch | `main` |
| Deploy | push `main` → Vercel |

Prior costing chain on `main` (recent): IR Wave-1 · Classification Gate · Identity mapping · Evidence DB · Catalog UI unify — see `git log`.

---

## 2. Tablica (CLOSED · VERIFIED)

| Field | Value |
|-------|-------|
| workId | `p2b-tablica-rozdzielcza-mieszkaniowa-szt` |
| mappingId | `lim-w1-tablica-rozdzielcza-cr` |
| Evidence | VALID · source `cennikremontow_pl` · op. Montaż skrzynki rozdzielczej · unit `szt` |
| SOURCE RANGE | **312–780** PLN/szt |
| Midpoint | **546** DERIVED (not Evidence pricePoint) |
| Owner Decision | **A** — OUR RATE = **546** |
| OUR RATE | **546** PLN/szt |
| sourceType | **ACCEPT** |
| History | `SOURCE:RESEARCH:546` · `OUR:ACCEPT:546` |
| Accept API | `acceptWorkRateResearchCandidate` |
| Evidence pricePoint | **null** (unchanged) |
| Review | [`IE-LABOR-EVIDENCE-TABLICA-OUR-RATE-ACCEPT-REVIEW.md`](./IE-LABOR-EVIDENCE-TABLICA-OUR-RATE-ACCEPT-REVIEW.md) |

---

## 3. Podejście (HOLD)

| Field | Value |
|-------|-------|
| workId | `p2b-podejscie-wod-kan-mb` |
| mappingId | `lim-w1-podejscie-wod-kan-cr` |
| CR observed unit | **pkt** (range reported in live validation) |
| Catalog / mapping unit | **mb** |
| UNIT_EQUIVALENCE | **UNPROVEN** |
| Status | **HOLD** · no Evidence write for unit conversion · no Accept |
| Doc | [`IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PODEJSCIE-UNIT-DECISION.md`](./IE-LABOR-SELECTIVE-RESEARCH-IDENTITY-READY-WAVE-1-PODEJSCIE-UNIT-DECISION.md) |

**Forbidden:** implicit `pkt → mb`.

---

## 4. Wykwity (SOURCE GAP)

| Field | Value |
|-------|-------|
| workId | `cc-w2-wykwity-zacieki` |
| Status | **SOURCE GAP REAL** |
| Action | No invent alias / host / PASS2 without Owner GO |

---

## 5. Shared measured bags (post-Tablica Accept review)

| Bag | Value |
|-----|-------|
| Evidence observations | **67** |
| Evidence revision | **3** |
| Evidence etag | **`r3-a8226101`** |
| Work Catalog | **460** active / **34** legacy / **426** custom |
| Control `cc-p0c-w1-zaprawianie-bruzd` companyPrice | **35** |
| Control OUR RATE | **null** |
| Tablica companyPrice | **420** (orthogonal ≠ 546) |
| Tablica / control marginPct | **0** |

---

## 6. Closed epics (relevant · non-exhaustive)

| Epic / series | Status |
|---------------|--------|
| TM-01 Tender Modernization S0–S9 | EPIC CLOSED |
| Inteligentny Kosztorysant UX | CLOSED |
| Expert AI enablement / Dual | CLOSED |
| WORK-CATALOG-REBUILD P0/P1 | CLOSED |
| WORK-RATE selective / RW-03 | CLOSED |
| PRICE-MEMORY CATALOG 01/02 | CLOSED |
| TENDER-BOQ-PRICING F0–F5 + C-MODE-1a | CLOSED (features) |
| Classification Gate | CLOSED (shipped on main) |
| Labor Evidence DB | CLOSED |
| Identity mapping Wave-1 | CLOSED |
| IE Labor IR Wave-1 + PASS2 CR | on tip **2.66.59** |
| Tablica Evidence + OUR RATE Accept | **CLOSED / VERIFIED** (data) |

---

## 7. Open / HOLD / BLOCKED

| Item | State |
|------|-------|
| Podejście unit | HOLD UNPROVEN |
| Wykwity | SOURCE GAP |
| ACTIVE IMPLEMENT epic | **NONE** without Owner GO |
| F5 / Final Bid „all green on every real tender” | **NOT** claimed globally — per-tender AUDIT |
| Cloud Decision Persist | residual / Owner GO |
| invent S10 | FORBIDDEN |

---

## 8. NEXT (valid)

1. Owner GO: COMMIT/PUSH docs release (this continuity pack) — if not already.  
2. Owner GO: next labor item (not auto Podejście).  
3. Owner GO → AUDIT only for new epic.

**Do not auto-proceed.**

**STOP.**
