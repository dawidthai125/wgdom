# INTELLIGENT ESTIMATOR — AI CONTINUITY (ChatGPT + Cursor)

> **ID:** `INTELLIGENT-ESTIMATOR-AI-CONTINUITY`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-18  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
> **Sesja Autonomy:** [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
Nie czytaj historii czatu jako architektury.
Nie buduj Przetargów / IK / Catalog / Pricing od zera.
SEARCH → REUSE → AUDIT → Owner GO → IMPLEMENT.
```

---

## A. Cold start (ChatGPT / any AI)

### First words

**„Nie buduj od nowa.”** Domenа Przetargów i kosztorysowania już istnieje.

### First reads (order)

1. [`../AI/WGDOM-COLD-START-HANDOFF.md`](../AI/WGDOM-COLD-START-HANDOFF.md)  
2. **TEN PLIK** + [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
3. [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md) — stan Autonomy 05–08 · A08-P2 **CLOSED**  
4. [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
5. [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md)  
6. [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) + `version.json`  
7. [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) · Gate payroll  
8. [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) (gdy UI Przetargu)  
9. [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) — historyczny NG-10 freeze · P0–P9 **LOCKED** · **nie** next IMPLEMENT P2

### First action

Repository reconnaissance — nie IMPLEMENT.

```text
git status -sb
git log -10 --oneline
curl / Invoke-RestMethod version.json
Grep: TendersModule · classifyEstimatorPricingPlane · acceptWorkRateResearchCandidate
```

### Search before create

Jeśli nie wiesz gdzie jest funkcja → **Grep / Glob / Trace**.  
Jeśli istnieje → **opisz i reuse**.  
**CREATE** tylko po Owner GO.

---

## B. Existing SSOT map (pointers)

| Need | Open |
|------|------|
| IK contract | Master SSOT |
| File paths | Architecture + Reuse Map |
| Flows | Data Flow |
| Tip / Tablica / HOLD | Production Baseline + 09 |
| Evidence≠OUR RATE | `IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md` |
| TM-01 | `TENDER-MODERNIZATION-01-MASTER.md` |
| Pricing continuity | `../AI/10_TENDER_PRICING_CONTINUITY.md` |

---

## C. Production baseline (do not hardcode elsewhere)

Read **09** + Production Baseline IE. **Nie** hardcoduj tipu tutaj.  
Tablica OUR RATE **546 ACCEPT** · Podejście **HOLD** · Wykwity **SOURCE GAP**.

---

## D. Open blockers

- Podejście `pkt` vs `mb` UNPROVEN  
- Wykwity SOURCE GAP  
- No auto epic  
- Stabilization / payroll gate still bind app-wide work  

---

## E. Current EPIC

**IK AUTONOMY-08** — epic **NOT CLOSED**.

| Slice | Status |
|-------|--------|
| A08-P0 Documents→BOQ | **COMPLETE / CLOSED** |
| A08-P1 Settings Unification | **COMPLETE / CLOSED** |
| A08-P2 Research-on-miss | **COMPLETE / CLOSED** · PV **PASS** · leftover `ik*ResearchEnabled` no-op |

Handoff: [`IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md`](./IK-MASTER-CONTINUITY-HANDOFF-2026-08-18.md).  
IK-MIGRATION-01 P0–P9 **LOCKED** — **nie** next = Document Expert P2.

---

## F. Next valid epic candidates

Only after Owner GO → AUDIT. **Nie** auto-start A08-P3.

- PACKAGE layer vs COMPOUND HOLD freeze — osobny GO (nie A08-P2 / nie P3)  
- Next labor identity/Evidence item (not Podejście without unit proof)  
- Residual C1–C6 / TM follow-ups (no invent S10)  
- Docs-only continuity

---

## G. Forbidden operations

```text
❌ New TenderModule / Workspace clone
❌ New Work Catalog / Evidence / Accept / OUR RATE system
❌ Evidence → OUR RATE auto
❌ companyPrice → OUR RATE
❌ Research COMPOUND/UNKNOWN
❌ New IK flag / second orchestrator / Research rebuilt from scratch
❌ Technical failure treated as MISS
❌ pkt≡mb invent
❌ git add -A
❌ vercel deploy
❌ Commit src / .tmp / unrelated WIP in docs GO
❌ REMOVE NG-10 before P9+P10 Owner GO
❌ expertAiDecydentEnabled ON as IK cutover
```

---

## H. Git rules

- Explicit `git add <paths>` only  
- Docs-only commits when task is documentation  
- Push only when Owner asks (this GO: Owner asked push)  
- Never force-push main  

---

## I. Audit workflow

```text
AUDIT (read-only) → RCA (if bug) → PLAN → DESIGN FREEZE
  → Owner GO → IMPLEMENT → smoke → commit → push → verify version.json FAST
```

No IMPLEMENT from chat nostalgia alone.

---

## J. Cursor continuity protocol

1. `git status -sb` · `git log -10 --oneline`  
2. Read `AGENTS.md` START HERE  
3. Read Project Guide / Architecture if touching domain  
4. Read **Master SSOT** + **Reuse Map** + **09**  
5. Repo search for existing symbols  
6. Map SSOT file → API → store  
7. **No code** until Owner GO (unless GO says implement)  
8. Propose plan (thin)  
9. Wait Owner GO  
10. Implement minimal · tests · docs · explicit commit  

### Cursor anti-pattern (historical failure)

Handoff said „continue tenders” → agent built **new** tender/pricing modules.  
**Correct:** open `TendersModule.tsx`, Classification Gate, Work Catalog Accept — extend seams only.

---

## K. Final cost estimate / UX reminder

Presentation layer over existing pipeline.  
Full estimate table required at end of flow.  
PDF = reuse existing stack after AUDIT.

---

## L. Cross-links for future AI mistakes

| Mistake | Correction doc |
|---------|----------------|
| Rebuild Przetargi | Reuse Map + Architecture |
| Auto OUR RATE from Evidence | Evidence contract audit + Data Flow |
| Use companyPrice as rate | WORK-CATALOG-REBUILD P0 correction |
| Research UNKNOWN | Classification Gate DF |
| Start from CURRENT-TASK only | Cold start + AI_ENTRY |
| Resume IK-MIGRATION P2 as next | Continuity handoff 2026-08-18 + A08 next-break audit |
| Auto Research on timeout/error | Continuity §4 · technical failure ≠ MISS |

**STOP.**
