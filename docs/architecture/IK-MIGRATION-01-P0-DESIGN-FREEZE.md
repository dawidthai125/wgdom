# IK-MIGRATION-01 — P0 DESIGN FREEZE  
## Formal Next Stage Resolution (post P5.26–P5.32 landing)

> **ID:** `IK-MIGRATION-01-P0-DESIGN-FREEZE`  
> **STATUS:** **P0 DESIGN FREEZE = COMPLETE** · **P0 IMPLEMENTATION = COMPLETE** · see [`IK-MIGRATION-01-P0-IMPLEMENTATION-CLOSEOUT.md`](./IK-MIGRATION-01-P0-IMPLEMENTATION-CLOSEOUT.md)  
> **Date:** 2026-08-16  
> **Mode:** Design Freeze docs remain SSOT · implementation landed under Owner GO  
> **JSON:** `.tmp/p0-design-freeze.json` · `.tmp/p0-implementation-closeout.json`  
> **Technical SSOT (REUSE — nie duplikować):** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **Pakiet P0:** NG10 Decommission · E2E Truth Gates · BOQ Discovery · Multi-BOQ Address · EC Contract  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)

---

## 0. Formal decision (LOCKED this resolution)

| Decyzja | Stan |
|---------|------|
| **P5.33** | **NIE ISTNIEJE** jako formalny etap IK-MIGRATION-01 · **NIE twórz** · **NIE numeruj** |
| P5.26–P5.32 | Praca **pomocnicza** (coverage / routing / research infra) w obrębie IK — **nie** zastępuje faz P0–P10 |
| **NEXT FORMAL STAGE** | **P0 — DESIGN FREEZE** (ten pakiet) |
| Po P0 | **STOP** · czekaj **Owner GO P0** · **NIE** auto P1 |

### Production baseline

| | |
|--|--|
| Commit | **`e2733550`** |
| P5.26 | LOCKED @ `1d41f619` · ACCEPT 9/9 · Catalog **471** · REVIEW **9 frozen** |
| P5.27 / P5.31 / P5.32 | LANDED / VERIFIED |
| P5.28–P5.30 | DOC_ONLY |
| P5.33 | **DO NOT CREATE** |

### Formal IK phases (Master / Plan)

```text
P0  Design Freeze          ← YOU ARE HERE (Owner GO)
P1  IK Entry Shell
P2  Documents → BOQ
P3  Classification + Identity
P4  Chief Wiring
P5  Labor E2E
P6  Material E2E
P7  Position Cost → Bid
P8  Risk + Chief Decision
P9  Owner Verification
P10 NG-10 Removal
```

**Uwaga Master:** wcześniejsze oznaczenia „P1 COMPLETE” w Master dotyczą pracy pod **`ikEntryEnabled` default OFF**. Ten dokument **nie** uruchamia P1. Wymaga **świeżego Owner GO P0** przed jakimkolwiek dalszym IMPLEMENT.

**Master SSOT:** zgodny z controlled replacement / flag OFF / no P5.33 invent — **brak CHATGPT_ESCALATION**.

---

## 1. AD (LOCKED) — Owner must accept

| AD | Treść |
|----|--------|
| **AD-IK-M01** | Controlled Replacement — NG-10 first-screen → IK Entry Host + `ExpertConversationSurface` |
| **AD-IK-M02** | No Rebuild / Reuse First — TendersModule, NG-02, OfferBoq, F5, Work Catalog, Evidence, Accept, Price Memory, DIY, Chief, EC, Bid PDF |
| **AD-IK-M03** | `ikEntryEnabled` ≠ Dual Outcome D (`expertAiDecydentEnabled`) |
| **AD-IK-M04** | Parity (Gate A + Gate B) before REMOVE NG-10 |
| **AD-IK-M05** | Truth In Conversation — events with real `sourceRef` (no invented facts) |

*(AD-IK-M06–M10 remain LOCKED in parent DF — Document Expert first, BOQ required, multi-dwelling lineage, SUM, no ATH writer invent.)*

---

## 2. IK-entry flag contract (DESIGN — no implement)

| Pole | Wartość |
|------|---------|
| **Nazwa** | `ikEntryEnabled` |
| **Storage** | `AppSettings` / `kw-app-settings` |
| **Default** | **`false` (OFF)** — absolute |
| **Włączenie** | Super Admin only (⚙) |
| **Scope** | App-level setting (jak inne Super Admin flags); per-tender override = **OUT P0** (nie invent bez DF amend) |
| **Rollback** | `ikEntryEnabled=false` → NG-10 Gate first screen **UNCHANGED** |
| **Kill switch** | Same flag OFF (+ opcjonalny LS kill dopiero jeśli przyszły P1 DF tego wymaga) |
| **FORBIDDEN as IK ON** | `expertAiDecydentEnabled` · Chief session alone · invent S10 |

---

## 3. Chief / D separation (Wariant A — LOCKED)

| Mechanizm | Rola |
|-----------|------|
| **IK-entry** (`ikEntryEnabled`) | First screen + orchestration host |
| **Dual Outcome D** (`expertAiDecydentEnabled`) | Offer PLN authority / Decydent — **osobny** |
| Chief | Może startować **scoped** gdy IK ON (P4) — **bez** global D ON |
| Zakaz | IK ON ⇒ auto D ON |

---

## 4. Expert Conversation event contract (LOCKED)

```text
IkConversationEvent
  id: string
  at: ISO
  actor: Chief | Document | Labor | Material | Control | Pricing | Risk
  status: pending | active | done | blocked | skipped | hold | partial | gap
  messagePl: string
  detailPl?: string
  sourceRef: {
    kind: document | classify | identity
        | labor_lookup | labor_research
        | evidence | candidate
        | material_lookup | material_research
        | product_offer | position_cost | bid | risk | chief_decision
        | hold | boq_ready | extraction
    tenderId: string
    lineId? / dwellingId? / workId? / materialKey? / documentId?
    artifact: /* real object/id/count — never invented */
  }
```

**Zakazy:** LLM invent · `Bid.ok` ⇒ „wyliczono materiały” · NG-10 timeline as research proof.  
**SSOT detail:** [`IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md`](./IK-MIGRATION-01-EXPERT-CONVERSATION-CONTRACT.md)

---

## 5. DetailPage seam (LOCKED)

```text
TenderDetailPage
  IK-entry OFF → NG-10 TenderAutonomousGate UNCHANGED
  IK-entry ON  → thin IkEntryHost → ExpertConversationSurface
                 → existing workspace / pipeline (Hub / tabs V4 KEEP)
```

**FORBIDDEN:** second TenderModule · second parser · second F5 · second Work Catalog · second Price Memory.

---

## 6. REUSE map (LOCKED)

| Domain | Reuse |
|--------|--------|
| Documents | NG-02 |
| BOQ | OfferBoq |
| Classification | Classification Gate |
| Identity | Work Identity |
| Labor | Work Catalog + `ourWorkRate` · `lookupWorkRate` · `runSelectiveWorkRateResearch` · Candidate · Owner Accept |
| Material | Price Memory · Phase2 DIY · Candidate/Accept |
| Cost | F5 |
| Bid | `computeTenderBidProposal` |
| Conversation | `ExpertConversationSurface` |
| Chief | `runChiefOrchestrator` |
| PDF | existing bid / ATH preview stack |

---

## 7. Labor contract (P0 freeze)

| Path | Rule |
|------|------|
| **CURRENT** | ZERO HTTP · reuse existing `ourWorkRate` |
| **MISS** | research → qualify → Candidate → **Owner Accept** → persist → `notifyIkPricingAccepted` → F5 recompute |
| **COMPOUND / UNKNOWN** | **HOLD** |
| Zakaz | invent · guess · `pkt→mb` / unsafe unit maps · auto-Accept |

*(P5.26–P5.32 routing/coverage = infra under this contract — not a separate epic.)*

---

## 8. Material contract (P0 freeze)

| Path | Rule |
|------|------|
| **CURRENT** | ZERO HTTP |
| **MISS** | existing Phase2 material research |
| **Candidate** | product + price + URL |
| **Accept** | Owner only |
| **Persist** | existing Price Memory / CatalogWork path |
| Zakaz | MaterialCatalogV2 · PriceMemoryV2 · new material store |

---

## 9. F5 contract (P0 freeze)

- F5 remains **PURE**
- IK reads shadow · calls existing mechanisms · after Accept uses existing pricing bump
- **No** second calculator · **No** HTTP inside F5

---

## 10. NG-10 migration contract (P0 freeze)

| Phase | NG-10 |
|-------|-------|
| P0–P8 | **RETAINED** (flag OFF = unchanged UX) |
| P9 | Production verify (parity) |
| P10 | Controlled removal only after P9 PASS + Owner GO REMOVE |

**FORBIDDEN:** big bang removal · global D ON as IK.

**Map:** [`IK-MIGRATION-01-NG10-DECOMMISSION-MAP.md`](./IK-MIGRATION-01-NG10-DECOMMISSION-MAP.md)

---

## 11. Mobile contract (P0 freeze — design only)

- Touch targets · scroll · conversation surface
- No mobile regression
- IK OFF → NG-10 fallback identical
- **No implement in P0**

---

## 12. Test strategy (design only — do not run as P0 gate)

| Phase | Intent |
|-------|--------|
| P1 | ON → no NG-10 first screen · OFF → NG-10 unchanged |
| P2 | documents → BOQ / explicit GAP |
| P3 | classification / identity |
| P4 | Chief start without D mutation |
| P5 | Labor CURRENT / MISS / Candidate / Accept |
| P6 | Material CURRENT / MISS / Candidate / Accept |
| P7 | F5 / Bid |
| P8 | Risk / Decision |
| P9 | real tender production |
| P10 | NG-10 removal |

**Truth gates:** [`IK-MIGRATION-01-E2E-TRUTH-GATES.md`](./IK-MIGRATION-01-E2E-TRUTH-GATES.md)

---

## 13. Production target (P9)

```text
08def45d-ead6-5db8-962b-120001d33d37
```

Verify: documents · BOQ/GAP · classification · labor · material · F5/Bid · EC truthfulness · **no accidental D mutation**.

---

## 14. P0 OWNER GO CHECKLIST

```text
[ ] AD-IK-M01 Controlled Replacement
[ ] AD-IK-M02 No Rebuild / Reuse First
[ ] AD-IK-M03 IK-entry ≠ Dual Outcome D
[ ] AD-IK-M04 Parity Before Remove
[ ] AD-IK-M05 Truth In Conversation / sourceRef

[ ] IK-entry flag contract (ikEntryEnabled · default OFF · Super Admin)
[ ] Chief/D separation (Wariant A)
[ ] EC event schema (IkConversationEvent + sourceRef)
[ ] DetailPage seam (OFF=NG-10 · ON=IkEntryHost)
[ ] Labor contract
[ ] Material contract
[ ] F5 contract
[ ] NG-10 decommission map
[ ] Mobile contract
[ ] Test allowlist / Truth Gates
[ ] Rollback strategy (flag OFF)

[ ] P5.33 abandoned (do not create)
[ ] P5.26 REVIEW-9 remain frozen (not auto next)
[ ] Baseline e2733550 acknowledged
```

---

## 15. OWNER DECISIONS REQUIRED

1. AD-IK-M01  
2. AD-IK-M02  
3. AD-IK-M03  
4. AD-IK-M04  
5. AD-IK-M05  
6. IK-entry flag contract  
7. Chief/D separation  
8. EC event schema  
9. DetailPage seam  
10. NG-10 decommission map  

*(Plus checklist §14 items.)*

---

## 16. Execution counters (this step)

| | |
|--|--:|
| CODE | **0** |
| HTTP / RESEARCH | **0** |
| CREATE / BIND / ACCEPT / WRITE | **0** |
| EDGE DEPLOY | **0** |
| COMMIT / PUSH | **0** |

---

## 17. Verdict

```text
P0 DESIGN FREEZE = COMPLETE
P0 IMPLEMENTATION = COMPLETE
READY FOR P1 OWNER GO

P5.33 = DO NOT CREATE
NEXT = P1 only with separate Owner GO (not automatic)

STOP — no auto P1 · no P5.33 · no research · no Accept · no NG-10 removal
Closeout: IK-MIGRATION-01-P0-IMPLEMENTATION-CLOSEOUT.md
```
