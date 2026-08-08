# TENDER-MODERNIZATION-01 / S5 — CLOSEOUT (Tab Decyzja → DW)

> **STATUS:** **S5 CLOSED** · **PRODUCTION VERIFIED** · POST RELEASE COMPLETE  
> **ID:** TENDER-MODERNIZATION-01-S5-CLOSEOUT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S5 — Tab Decyzja → Decision Workspace**  
> **Production Version:** **2.66.22** (bez bumpa UI)  
> **Feature / Deploy Commit:** **`ebae3d2e`** (`ebae3d2e1cde4c008f356b9b9ff81eb58c33a0a2`) · `version.json` **`ebae3d2`**  
> **Data:** 2026-08-08  
> **Cold-start:** [`../AI/MASTER-AI-HANDOFF.md`](../AI/MASTER-AI-HANDOFF.md) · tip SSOT [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **PV:** [`TENDER-MODERNIZATION-01-S5-PRODUCTION-VERIFY.md`](TENDER-MODERNIZATION-01-S5-PRODUCTION-VERIFY.md)  
> **DF:** [`TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S5-DESIGN-FREEZE.md)  
> **IMPLEMENT:** [`TENDER-MODERNIZATION-01-S5-IMPLEMENT.md`](TENDER-MODERNIZATION-01-S5-IMPLEMENT.md)  
> **Prior tip:** TM-01 S4 @ **`85f4db14`**

```text
════════════════════════════════════════════════════════
TENDER-MODERNIZATION-01 / S5 — CLOSED

2.66.22 / ebae3d2e
PRODUCTION VERIFIED

Tab Decyzja overview @ Expert ON = DecisionWorkspaceHost PRIMARY
TenderDecisionView = recovery (Expert ON) / legacy PRIMARY (Expert OFF)
Hub DW (S4) = KEEP
?ws=qualification|offer = KEEP AS-IS
CTA home = decyzja (scroll if DW in DOM · else navigate decyzja)
Store = ZERO TOUCH · Persist REUSE Host · bridge = S6 OUT

Harness S5 27 · S2 45 · S4 37 · OV PASS · Bundle PASS

S0–S5 = CLOSED · S6–S8 = OPEN
ACTIVE EPIC = NONE
TRYB = UTRZYMANIE
NEXT: TENDER-MODERNIZATION-01 / S6 · WAITING FOR OWNER GO → AUDIT
════════════════════════════════════════════════════════
```

---

## 1. Delivered

| Krok | Treść |
|------|--------|
| **S5-A** | `chiefSessionForDecision` = `przetarg` **or** `decyzja`+overview |
| **S5-B** | Host mount above DecisionView on overview |
| **S5-C** | DecisionView thin copy + `data-s5-decision-fallback` |
| **S5-D** | PrimaryAction CTA dedicated home `decyzja` |
| **S5-E** | Harness AC-S5 |

---

## 2. Explicit OUT (LOCKED)

| Item | Status |
|------|--------|
| Expert / Chief / Session / Validation BC | **NO TOUCH** |
| Persist API / `kw-tender-decisions` schema | **NO TOUCH** |
| S6 bridge · S7 TRE · S8 removal | **OUT** |
| DecisionView hard delete | **OUT** |
| `useTenderOfferRun.ts` | **LOCAL WIP** · nie tip |
| Hub DW removal | **FORBIDDEN** (S4 KEEP) |

---

## 3. Rollback

`git revert ebae3d2e` (UI allowlist) · brak migracji danych · brak flagi.

---

## 4. Residual / NEXT

| | |
|--|--|
| **Local WIP** | `src/app/hooks/useTenderOfferRun.ts` (M) — poza S5 |
| **NEXT** | **TM-01 S6** Persist → legacy bridge — **tylko Owner GO → AUDIT** |
| **EPIC** | TM-01 **nie** CLOSED (S6–S8 OPEN) |
