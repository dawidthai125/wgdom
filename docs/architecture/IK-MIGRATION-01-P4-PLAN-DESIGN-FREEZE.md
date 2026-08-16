# IK-MIGRATION-01 — P4 PLAN + DESIGN FREEZE  
## Chief Wiring (IK-scoped · pre-Labor · pre-Material)

> **ID:** `IK-MIGRATION-01-P4-PLAN-DESIGN-FREEZE`  
> **STATUS:** **P4 PLAN + DESIGN FREEZE = COMPLETE** · **READY FOR P4 OWNER GO**  
> **Date:** 2026-08-16  
> **Mode:** **DOCS ONLY** · CODE = 0 · RESEARCH = 0 · HTTP = 0 · ACCEPT = 0 · CREATE = 0 · BIND = 0 · WRITE = 0 · COMMIT = 0 · PUSH = 0  
> **JSON:** `.tmp/p4-plan-design-freeze.json`  
> **Escalation resolution:** Owner Decision 2026-08-16 — **P4 = Chief Wiring** · Labor = **P5** · Material = **P6**  
> **Prior audit:** [`IK-MIGRATION-01-P4-AUDIT.md`](./IK-MIGRATION-01-P4-AUDIT.md) (`CHATGPT_ESCALATION_REQUIRED` → **RESOLVED** by Owner)  
> **Parent DF:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) §4–5 · [`IK-MIGRATION-01-P0-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P0-DESIGN-FREEZE.md) §0  
> **P3:** [`IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md`](./IK-MIGRATION-01-P3-PLAN-DESIGN-FREEZE.md) · PV [`IK-MIGRATION-01-P3-PRODUCTION-VERIFY.md`](./IK-MIGRATION-01-P3-PRODUCTION-VERIFY.md) · impl **`350e81e6`**

```text
P4 = CONTROLLED Chief Wiring UNDER IK
     REUSE existing Chief T1–T6 · useChiefOrchestratorSession · EC
     NOT Labor research · NOT Material research · NOT F5/Bid rebuild
     NOT Dual Outcome (D) · NOT expertAiDecydentEnabled flip
DEFAULT: P4 Chief enable OFF until Owner GO IMPLEMENT
EXECUTE_RESEARCH / RUN_RATE_EXPERTS stay OFF
```

---

## 0. Owner resolution (LOCKED)

| Phase | Formal meaning |
|-------|----------------|
| P0 | Design Freeze |
| P1 | IK Entry Shell |
| P2 | Documents → BOQ |
| P3 | Classification + Identity |
| **P4** | **Chief Wiring** |
| **P5** | **Labor E2E** |
| **P6** | **Material E2E** |
| P7 | Position Cost → Bid |
| P8 | Risk + Chief Decision |
| P9 | Owner Verification |
| P10 | NG-10 Removal |

**P4 ≠ Labor Expert.**  
Historical labels (`IK-MIGRATION-01-P4-LABOR*`, E2E Truth Gates row “P4 = Labor Expert”) = **LEGACY / HISTORICAL** — do **not** override this freeze. Annotate in IMPLEMENT docs; do not renumber Labor into P4.

---

## 1. Baseline (LOCKED)

| | |
|--|--|
| P0–P3 | **PRODUCTION VERIFIED** |
| P3 impl | **`350e81e6`** |
| Live tip (P3 PV) | **2.66.80** / **`ad6273b`** (contains P3) |
| P4 formal | **NOT IMPLEMENTED** under controlled IK seam (Chief stack AVAILABLE, gated by D today) |
| P5.26 | LOCKED @ `1d41f619` · CatalogWork **471** · REVIEW-9 frozen |
| P5.27 / 31 / 32 | LANDED / VERIFIED |
| P5.33 | **DO NOT CREATE** |
| IDENTITY_COVERAGE | P3 lever · default **OFF** · P4 does **not** flip |
| EXECUTE_RESEARCH | **OFF** |
| RUN_RATE_EXPERTS | **OFF** |
| AUTO_INGEST | P2 lever · unchanged |

---

## 2. AD (P4) — LOCKED this freeze

| AD | Treść |
|----|--------|
| **AD-IK-P4-01** | P4 = Chief Wiring only · T1–T6 REUSE · STOP before Labor/Material research execution |
| **AD-IK-P4-02** | REUSE FIRST — zero Chief V2/V3 · zero new Cost/Offer expert engines |
| **AD-IK-P4-03** | Input = validated P3 handoff context + OfferBoq + `pricingReady` (partial \| final) |
| **AD-IK-P4-04** | Trigger = `ikEntryEnabled` ∧ OfferBoq/pricingReady ∧ **P4 Chief enabled** |
| **AD-IK-P4-05** | **IK ≠ D** — P4 MUST NOT set `expertAiDecydentEnabled=true` as side effect of IK ON |
| **AD-IK-P4-06** | Dual Outcome / Offer PLN authority / Decision Workspace semantics **UNCHANGED** |
| **AD-IK-P4-07** | Sole new P4 IMPLEMENT lever: narrow **Chief-under-IK** enable (name TBD in IMPLEMENT; default **OFF**) — not D |
| **AD-IK-P4-08** | No Chief when IK OFF · no BOQ · HOLD · GAP · missing pricingReady |
| **AD-IK-P4-09** | Cost BLOCKED = **legal** Chief state · ≠ P4 failure · ≠ research fallback |
| **AD-IK-P4-10** | T4 existing fail-soft MMR Phase1 enqueue = **REUSE as-is** · no new HTTP · no T4→research orchestrator |
| **AD-IK-P4-11** | EXECUTE_RESEARCH / RUN_RATE_EXPERTS stay **OFF**; P4 does not call `runIkLaborGapResearch` / `executeMaterialResearchPhase2` |
| **AD-IK-P4-12** | ACCEPT/CREATE/BIND/WRITE = 0 · no Work Catalog / PM / OUR RATE / CatalogWork mutation |
| **AD-IK-P4-13** | F5 / `useTenderPricingAuto` / Bid = **OUT** (P7) · dossier cost/offer facts REUSE only |
| **AD-IK-P4-14** | EC facts via `IkConversationEvent` + `sourceRef` · no synthetic verified claims |
| **AD-IK-P4-15** | REVIEW ≠ ACCEPT · NO_MATCH ≠ market absence · GAP ≠ price absence · PARSER_EMPTY ≠ market absence |
| **AD-IK-P4-16** | P5.26–32 UNTOUCHED · no new category keys · no P5.33 |
| **AD-IK-P4-17** | Rollback: P4 Chief enable = false → Chief under IK OFF; D path unchanged |
| **AD-IK-P4-18** | P4 MUST NOT auto-start P5 Labor / P6 Material / P7 F5-Bid |

*(Parent AD-IK-M01–M10 · AD-IK-P2-* · AD-IK-P3-* remain LOCKED.)*

---

## 3. P4 objective (contract)

```text
P3 handoff STOP
  + OfferBoq / Master BOQ context
  + pricingReady (pipeline partial|final)
  → [eligibility] IK ON ∧ P4 Chief enabled ∧ pricingReady ∧ not HOLD/GAP-only
  → useChiefOrchestratorSession({ enabled: <P4 seam> })
  → runChiefOrchestrator T1→T6 (existing)
  → Chief dossier / session status
  → Cost / Offer facts → ExpertConversationSurface (sourceRef)
  → STOP
```

**OUT:** Labor selective research · Material DIY research · Accept · CatalogWork · F5 rebuild · Bid · Dual Outcome · NG-10 removal · invent engines.

---

## 4. P3 → P4 seam (LOCKED)

| From P3 | P4 use |
|---------|--------|
| BOQ rows + provenance | Context for Chief / EC truth |
| Classification planes + handoff flags | Facts only · **not** auto Labor/Material expert run |
| Identity thin/coverage | Facts only · IDENTITY_COVERAGE not flipped by P4 |
| REVIEW / NO_MATCH / GAP | Preserve semantics · **no** research fallback |

P3 contract **unchanged**.

---

## 5. Trigger / eligibility (LOCKED)

| Condition | Chief under P4 |
|-----------|----------------|
| `ikEntryEnabled` OFF | **NO** |
| No OfferBoq / not pricingReady | **NO** |
| Document Expert HOLD (technical) | **NO** (no fake Chief success) |
| Document Expert GAP | **NO** |
| IK ON + pricingReady + P4 Chief enable ON | **YES** — start session |
| D OFF + P4 Chief ON | **YES** — Chief without Dual Outcome |
| D ON | Dual Outcome path **unchanged** (orthogonal) |

**Implement shape (future Owner GO):** prefer AppSettings narrow flag (mirror P2/P3 pattern) **or** host const + Super Admin toggle; default **OFF**. Must **not** alias to `expertAiDecydentEnabled`.

**Current gap (AUDIT):** today `TenderDetailPage` uses `isChiefSessionStackEnabled(expertEffective)` → `isChiefOrchestratorSessionEnabled()` → **D / LS**. P4 IMPLEMENT must add IK-scoped seam **without** mutating D semantics.

---

## 6. Chief REUSE (LOCKED)

| Component | Role |
|-----------|------|
| `useChiefOrchestratorSession` | Session hook |
| `runChiefOrchestrator` | T1–T6 engine |
| `chief-orchestrator/*` · wire adapters · dossier UI | Existing stack |
| `ExpertConversationSurface` | Presentation |
| `IkConversationEvent` / sourceRef | Truth |

**Tasks (existing ids — do not invent):**  
`T1_execution` · `T2_materials` · `T3_pricing` · (optional return loop) · `T4_cost` · `T5_offer` · `T6_assemble_dossier`

Chief **is not** Labor research engine · **is not** Material research engine.

---

## 7. Dual Outcome separation (LOCKED)

| Flag / axis | P4 rule |
|-------------|---------|
| `ikEntryEnabled` | IK first-screen / P2–P4 eligibility |
| P4 Chief enable | Narrow Chief-under-IK |
| `expertAiDecydentEnabled` (D) | **UNTOUCHED** by P4 IMPLEMENT |
| Offer PLN / DW / Dual Outcome | **UNCHANGED** |

```text
IK ON  ≠  D ON
P4 Chief ON  ≠  Dual Outcome ON
```

---

## 8. Research / Accept / F5 boundaries (LOCKED)

| Boundary | Rule |
|----------|------|
| `EXECUTE_RESEARCH` | **OFF** |
| `RUN_RATE_EXPERTS` | **OFF** |
| `runIkLaborGapResearch` | **FORBIDDEN** in P4 |
| Material Phase2 / DIY live HTTP | **FORBIDDEN** in P4 |
| Accept / CatalogWork write | **FORBIDDEN** (P5/P6 Owner Accept) |
| F5 / Bid mutation | **FORBIDDEN** (P7) |
| T4 `enqueueMaterialResearchPhase1` | **REUSE existing** fail-soft · cache-first / demand queue · documented **0 live shop HTTP** in wire module — **do not expand** |
| Cost BLOCKED | Legal · no fallback research |

**IMPLEMENT risk flag:** if any P4 wiring would set `executeResearch:true` on labor/material experts → **BLOCKER** · stop · escalate.

---

## 9. P4 output (LOCKED)

```text
Chief session status
+ T1–T6 task outcomes (incl. Cost BLOCKED legal)
+ Cost / Offer dossier facts
+ EC events with sourceRef
+ researchExecuted=false (P4 path)
+ autoAcceptExecuted=false
→ STOP
```

No auto P5.

---

## 10. Provenance / unit / category / P5.26

| Topic | Rule |
|-------|------|
| Provenance | Preserve BOQ + P3 classify/identity evidence; Chief facts need real sourceRef |
| Units | No invent remap |
| Category keys | P5.31/32 LOCKED · no create |
| P5.26 | CatalogWork **471** UNTOUCHED · no Accept |

---

## 11. Mobile

REUSE `ExpertConversationSurface` / existing shell.  
No new mobile UI.  
Physical device: **NOT VERIFIED** until Owner PV.

---

## 12. Test design (future IMPLEMENT)

| ID | Case |
|----|------|
| A | IK OFF → no P4 Chief |
| B | IK ON + no BOQ → no Chief |
| C | IK ON + HOLD → no Chief |
| D | IK ON + GAP → no Chief |
| E | IK ON + BOQ READY → Chief eligible |
| F | pricingReady → Chief starts (with P4 enable) |
| G | D OFF + P4 Chief ON → Chief without Dual Outcome |
| H | D ON semantics unchanged |
| I–N | T1…T6 execute (existing contract) |
| O | Cost BLOCKED legal |
| P–R | no labor/material research · no pricing HTTP invent |
| S–T | no Accept · no CatalogWork write |
| U | no F5 mutation |
| V–W | provenance · EC sourceRef |
| X–Z | P3 / P5.26 / P2 regression |

**REUSE:** `test-wire-chief-session-01.mjs` + existing Chief harnesses. New harness only for **P4 IK seam** gaps.

Historical `test-ik-migration-01-p4-labor-expert.mjs` = **P5 regression suite** (legacy filename) — do not treat as P4 Chief coverage.

---

## 13. Risk matrix (LOCKED awareness)

| ID | Sev | Risk | Mitigation |
|----|-----|------|------------|
| R-P4-01 | **P0** | Wire Chief by flipping D | Separate P4 enable · AD-IK-P4-05 |
| R-P4-02 | **P0** | P4 starts Labor/Material research | Experts hard OFF · forbid bridges |
| R-P4-03 | **P0** | Labor `executeResearch` default true if called | Never call from P4 path |
| R-P4-04 | **P1** | Expand T4 enqueue into live HTTP | REUSE only · no expand |
| R-P4-05 | **P1** | Cost BLOCKED → invent research | AD-IK-P4-09 |
| R-P4-06 | **P1** | Legacy “P4 Labor” docs confuse IMPLEMENT | This freeze + audit note |
| R-P4-07 | **P1** | Accept / CatalogWork leak | WRITE=0 |
| R-P4-08 | **P2** | F5/Bid touch | P7 boundary |
| R-P4-09 | **P2** | Synthetic EC verified facts | sourceRef contract |
| R-P4-10 | **P2** | P5.26 mutation | UNTOUCHED |

---

## 14. Minimal IMPLEMENT plan (future Owner GO only)

| Phase | Work |
|-------|------|
| **A** | Split Chief-under-IK enable from D (new narrow flag/seam · default OFF) |
| **B** | Trigger: IK ON ∧ OfferBoq/pricingReady ∧ P4 enable |
| **C** | Wire `useChiefOrchestratorSession` to P4 seam (REUSE engine) |
| **D** | EC event wiring · sourceRef truth |
| **E** | Guards: EXECUTE_RESEARCH / RUN_RATE_EXPERTS OFF · no labor/material expert call |
| **F** | Tests A–Z (reuse Chief + P3/P2/P5.26 regression) |
| **G** | Production Verify · P4 enable default OFF · STOP before P5 |

**Do not** build new orchestrators · **do not** invent P5.33 · **do not** auto P5.

---

## 15. Frozen surface (checklist)

```text
[x] P4 input
[x] P4 trigger
[x] Chief enable (narrow · ≠ D)
[x] D separation
[x] T1–T6 REUSE
[x] P4 output + STOP
[x] Research boundary
[x] Accept / write boundary
[x] F5 boundary
[x] Legacy P4-Labor label demotion
```

---

## 16. Execution integrity (this document)

```text
CODE = 0
RESEARCH = 0
HTTP = 0
ACCEPT = 0
CREATE = 0
BIND = 0
WRITE = 0
EDGE = 0
COMMIT = 0
PUSH = 0
```

---

## 17. Final verdict

```text
P4 PLAN + DESIGN FREEZE = COMPLETE
ESCALATION = RESOLVED (Owner: P4 = Chief Wiring)
READY FOR P4 OWNER GO
STOP

NIE IMPLEMENTUJ
NIE URUCHAMIAJ CHIEF
NIE URUCHAMIAJ RESEARCH
NIE URUCHAMIAJ LABOR (P5)
NIE URUCHAMIAJ MATERIAL (P6)
NIE WYKONUJ ACCEPT
NIE PRZECHODŹ DO P5
```
