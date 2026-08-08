# TENDER-MODERNIZATION-01 / S6 — IMPLEMENT (Decision Persist Bridge)

> **STATUS:** **IMPLEMENT COMPLETE** · **OWNER VERIFY PENDING** · **NIE COMMIT**  
> **ID:** TENDER-MODERNIZATION-01-S6-IMPLEMENT  
> **EPIC / SLICE:** TENDER-MODERNIZATION-01 · **S6 — Decision Persist → legacy bridge**  
> **Data:** 2026-08-08  
> **Baseline tip:** UI **2.66.22** / S5 **`ebae3d2e`** · docs tip **`677afd98`**  
> **DF:** [`TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md`](TENDER-MODERNIZATION-01-S6-DESIGN-FREEZE.md)  
> **PLAN:** [`TENDER-MODERNIZATION-01-S6-PLAN.md`](TENDER-MODERNIZATION-01-S6-PLAN.md)  
> **AUDIT:** [`TENDER-MODERNIZATION-01-S6-AUDIT.md`](TENDER-MODERNIZATION-01-S6-AUDIT.md)  
> **WIP OUT:** `src/app/hooks/useTenderOfferRun.ts` — **nie** staged

```text
════════════════════════════════════════════════════════
S6 IMPLEMENT — Decision Persist → legacy bridge

Delivered:
  S6-A mapPersistActionToLegacyOwnerDecision (pure)
  S6-B Host Persist-first → map → setOwnerDecision
  S6-C DetailPanel + HubPanel scoringBundle prop-drill
  S6-D harness + S2/S5 assert updates

Gates:
  S6  28 PASS / 0 FAIL
  S2  45 PASS / 0 FAIL
  S4  37 PASS / 0 FAIL
  S5  27 PASS / 0 FAIL
  build PASS

Stores: Persist append KEEP · legacy upsert REUSE · NO third key
NEXT: Owner VERIFY (OV-S6-*) → OWNER GO COMMIT
════════════════════════════════════════════════════════
```

---

## 1. Diff allowlist

| Plik | Zmiana |
|------|--------|
| `src/lib/decision-persist-legacy-bridge.ts` | **NEW** — map-only |
| `src/app/decision-workspace/DecisionWorkspaceHost.tsx` | Persist-first · `scoringBundle` · `setOwnerDecision` |
| `src/app/TenderDetailPanel.tsx` | prop-drill `scoringBundle` |
| `src/app/TenderWorkflowHubPanel.tsx` | prop-drill `scoringBundle` |
| `scripts/test-tender-modernization-01-s6-decision-persist-bridge.mjs` | **NEW** harness |
| `scripts/test-tender-modernization-01-s2-dual-outcome.mjs` | Persist-first / AC-S2-5 update |
| `scripts/test-tender-modernization-01-s5-tab-decyzja-dw.mjs` | A7 bridge expect |
| `docs/architecture/TENDER-MODERNIZATION-01-S6-IMPLEMENT.md` | ten plik |

**NON-allowlist touched:** **NONE** (Persist API · DecisionView · PrimaryAction · OfferRun WIP untouched).

---

## 2. Behavior (as shipped)

| Warunek | Wynik |
|---------|--------|
| Persist SUCCESS + valid `scoringBundle` | map → `setOwnerDecision` (GO/NO-GO/HOLD) |
| Persist FAIL | **ZERO** legacy mirror |
| `scoringBundle` missing / id mismatch | Persist KEEP · mirror **SKIP** |
| `return` action | no Persist · no mirror |
| Expert OFF | Host hidden · legacy writers KEEP |
| Strategy | reads legacy projection after mirror only |

**Map LOCKED:** approve→GO · reject→NO-GO · needs_review→HOLD

---

## 3. Tests

| Gate | Wynik |
|------|-------|
| `npx vite-node scripts/test-tender-modernization-01-s6-decision-persist-bridge.mjs` | **28 PASS / 0 FAIL** |
| S2 Dual Outcome | **45 PASS / 0 FAIL** |
| S4 Hub hierarchy | **37 PASS / 0 FAIL** |
| S5 Tab Decyzja → DW | **27 PASS / 0 FAIL** |
| `npm run build` | **PASS** |

---

## 4. Owner Verification matrix (OV-S6-1…10)

| ID | Scenariusz | Oczekiwanie | Result |
|----|------------|-------------|--------|
| OV-S6-1 | Expert ON · Approve | Persist + legacy GO | PENDING Owner |
| OV-S6-2 | Reject | Persist + NO-GO | PENDING |
| OV-S6-3 | Needs review | Persist + HOLD | PENDING |
| OV-S6-4 | Persist cannot save | no legacy change | PENDING |
| OV-S6-5 | no scoringBundle | Persist OK · mirror skip | PENDING |
| OV-S6-6 | Expert OFF | Host hidden · legacy buttons OK | PENDING |
| OV-S6-7 | Hub DW Approve | parity Decyzja | PENDING |
| OV-S6-8 | DecisionView Expert ON | no new GO buttons | PENDING |
| OV-S6-9 | S2/S4/S5/build | harness PASS | **PASS** (agent) |
| OV-S6-10 | DevTools LS | only known keys | PENDING Owner |

---

## 5. STOP

```text
IMPLEMENT COMPLETE
NO commit · NO push · NO deploy · NO tip · NO S7
WAIT FOR OWNER GO → COMMIT
```
