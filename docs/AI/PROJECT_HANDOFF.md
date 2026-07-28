# WGDOM — Project Handoff (AI sessions)

> **STATUS:** **ACTIVE** · AI-COST-01 **FROZEN** · Foundation Lib Phase 0 **COMPLETE**  
> **Data:** 2026-07-28  
> **Tip:** patrz [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) — **nie** powielaj numeru tutaj  
> **Stan + NEXT:** [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md)  
> **Foundation Lib:** [`../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md`](../architecture/WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md)  
> **Zakaz:** implementacja bez Entry + Safety Gate · mixed FEATURE+CORE

```text
══════════════════════════════════════
STAN = docs/AI/MASTER_HANDOFF.md
OFICJALNY START = docs/AI/AI_ENTRY.md
AI-COST-01 = EPIC COMPLETE · FIELD READY · FROZEN
AI-COST-02 = BACKLOG (Starting Point only)
Foundation Lib Phase 0 = COMPLETE (FND-01…05)
FND-06 = BLOCKED · App nie używa jeszcze Foundation Lib
══════════════════════════════════════
```

---

## 1. Jak startuje NOWA sesja AI

```text
docs/AI/MASTER_HANDOFF.md   ← baseline · co zrobione · NEXT · zakazy
docs/AI/AI_ENTRY.md
  → PROJECT_HANDOFF.md          ← ten plik
  → AI_MEMORY.md
  → AI_DECISION_TREE.md
  → PAYROLL_SAFETY_GATE.md      ← odpowiedz G1–G9
  → AI_PAYROLL_SAFETY_MANUAL.md (gdy ≥1 TAK)
  → 02_ARCHITECTURE / docs/ARCHITECTURE.md
  → CURRENT-TASK.md
  → FEATURE_IMPLEMENTATION_CHECKLIST.md
  → IMPLEMENT

Gdy AI Cost / oferta / kosztorys:
  → WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
  → WGDOM-AI-COST-01-SSOT.md
  → WGDOM-AI-COST-01-LESSONS-LEARNED.md
  → WGDOM-AI-COST-02-STARTING-POINT.md  (tylko po Owner GO na COST-02)

Gdy Foundation Lib / FND-* / wgdom-foundation:
  → WGDOM-FOUNDATION-LIB-PHASE-0-SSOT.md
  → FND-06 = BLOCKED (ADR/Blueprint najpierw)
```

**Hasło Ownera „kontynuuj WGDOM”** → najpierw Master Handoff + Entry + Gate, potem Continuity / rules.

---

## 2. SSOT map

| Temat | SSOT |
|-------|------|
| Master Handoff (stan) | `docs/AI/MASTER_HANDOFF.md` |
| Entry AI | `docs/AI/AI_ENTRY.md` |
| Tip produkcji | `docs/AI/09_PRODUCTION_BASELINE.md` |
| Safety Gate | `docs/AI/PAYROLL_SAFETY_GATE.md` |
| Never break | `docs/AI/PAYROLL_NEVER_BREAK_RULES.md` |
| Feature checklist | `docs/AI/FEATURE_IMPLEMENTATION_CHECKLIST.md` |
| Payroll architektura | `docs/PAYROLL-ARCHITECTURE-SSOT.md` |
| **AI-COST-01 architektura** | `docs/architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md` |
| **AI-COST-01 SSOT** | `docs/architecture/WGDOM-AI-COST-01-SSOT.md` |
| **AI-COST-01 Lessons** | `docs/architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md` |
| **AI-COST-02 start** | `docs/architecture/WGDOM-AI-COST-02-STARTING-POINT.md` |
| UI Foundation | `docs/architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md` |
| Dashboard Body | `docs/architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md` |
| GDS | `docs/architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md` |
| Zakazy globalne | `08_AI_GUARDRAILS.md` |
| Workflow / deploy | `WORKFLOW-RELEASE-DEPLOY` · Owner GO |

Historyczne `docs/architecture/PAYROLL-*` — przez INDEX. Draft `WGDOM-AI-COST-01-ARCHITECTURE.md` = **SUPERSEDED** przez FREEZE.

---

## 3. Stan systemu (skrót)

| Obszar | Status |
|--------|--------|
| **AI-COST-01** | **EPIC COMPLETE** · **FIELD READY** · **ARCHITECTURE FROZEN** |
| **AI-COST-02** | **BACKLOG** · Starting Point only |
| Lista Płac Hours-wipe | **CLOSED** |
| UI Foundation v1.0 | **COMPLETE** |
| Dashboard Body S1–S4 | **COMPLETE** |
| GDS-01 + MAINT-01 | **CLOSED** |
| CI Remediation | **CLOSED** · Gates B/C **GREEN** |
| STABILIZATION WINDOW | **ACTIVE** |
| Protected Core | **GREEN** |

Pełny snapshot + NEXT → [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md). Tip → [`09`](09_PRODUCTION_BASELINE.md).

---

## 4. Co wolno / czego nie

| Wolno | Nie wolno bez Owner GO |
|-------|-------------------------|
| AUDIT / RCA / DF (docs) | IMPLEMENT Payroll / cloud-sync / Edge |
| Smoke read-only | Mixed FEATURE+CORE |
| Thin UI FEATURE (Boundary PASS) | Usuwanie fence / Domain Gate / second Primary |
| Czytanie Freeze + Starting Point | **AI-COST-02 IMPLEMENT** / przebudowa S1–S7 |
| Pytania / mapowanie | Re-open Foundation / BODY / AI-COST-01 freeze bez briefu |

---

## 5. DEPRECATED

`AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md` → Entry (+ Master Handoff).  
`WGDOM-AI-COST-01-ARCHITECTURE.md` (draft) → **FREEZE + SSOT**.
