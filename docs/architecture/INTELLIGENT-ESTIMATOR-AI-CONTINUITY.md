# INTELLIGENT ESTIMATOR — AI CONTINUITY (ChatGPT + Cursor)

> **ID:** `INTELLIGENT-ESTIMATOR-AI-CONTINUITY`  
> **STATUS:** ACTIVE · DOCUMENTATION ONLY  
> **Data:** 2026-08-14  
> **Master:** [`INTELLIGENT-ESTIMATOR-MASTER-SSOT.md`](./INTELLIGENT-ESTIMATOR-MASTER-SSOT.md)  
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
3. [`INTELLIGENT-ESTIMATOR-REUSE-MAP.md`](./INTELLIGENT-ESTIMATOR-REUSE-MAP.md)  
4. [`INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md`](./INTELLIGENT-ESTIMATOR-PRODUCTION-BASELINE.md)  
5. [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md) + `version.json`  
6. [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md) · Gate payroll  
7. [`../WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) (gdy UI Przetargu)  
8. [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md) — NG-10 replacement · **no IMPLEMENT without Owner GO P1**

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

Read **09** + Production Baseline IE. Snapshot at docs write: **2.66.59** / **`9bcc558`**.  
Tablica OUR RATE **546 ACCEPT** · Podejście **HOLD** · Wykwity **SOURCE GAP**.

---

## D. Open blockers

- Podejście `pkt` vs `mb` UNPROVEN  
- Wykwity SOURCE GAP  
- No auto epic  
- Stabilization / payroll gate still bind app-wide work  

---

## E. Current EPIC

**IK-MIGRATION-01 P1 COMPLETE** — `ikEntryEnabled` default OFF · NG-10 rollback path · next **GO P2** (Document Expert) only.  
Last tip feature area: PASS2 CR + Tablica Accept (data verified). NG-10 is **not** target IK.

---

## F. Next valid epic candidates

Only after Owner GO → AUDIT:

- IK-MIGRATION-01 **P1** only after Owner GO (entry shell, flag default OFF)  
- Next labor identity/Evidence item (not Podejście without unit proof)  
- Residual C1–C6 / TM follow-ups (no invent S10)  
- Material coverage / real tender Wrocław audit streams  
- Docs-only continuity (this pack)

---

## G. Forbidden operations

```text
❌ New TenderModule / Workspace clone
❌ New Work Catalog / Evidence / Accept / OUR RATE system
❌ Evidence → OUR RATE auto
❌ companyPrice → OUR RATE
❌ Research COMPOUND/UNKNOWN
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

**STOP.**
