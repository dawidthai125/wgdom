# WGDOM — Project Handoff (AI sessions)

> **STATUS:** **ACTIVE** · AI-DOCS-PAYROLL-GUARD-02  
> **Data:** 2026-07-26  
> **Tip:** patrz [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) — **nie** powielaj numeru tutaj  
> **Zakaz:** implementacja bez Entry + Safety Gate · mixed FEATURE+CORE

```text
══════════════════════════════════════
OFICJALNY START = docs/AI/AI_ENTRY.md
══════════════════════════════════════
```

---

## 1. Jak startuje NOWA sesja AI

```text
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
```

**Hasło Ownera „kontynuuj WGDOM”** → najpierw Entry + Gate, potem Continuity / rules.

---

## 2. SSOT map

| Temat | SSOT |
|-------|------|
| Entry AI | `docs/AI/AI_ENTRY.md` |
| Tip produkcji | `docs/AI/09_PRODUCTION_BASELINE.md` |
| Safety Gate | `docs/AI/PAYROLL_SAFETY_GATE.md` |
| Never break | `docs/AI/PAYROLL_NEVER_BREAK_RULES.md` |
| Feature checklist | `docs/AI/FEATURE_IMPLEMENTATION_CHECKLIST.md` |
| Payroll architektura | `docs/PAYROLL-ARCHITECTURE-SSOT.md` |
| Incidents / RCA | `PAYROLL_INCIDENT_INDEX` · `PAYROLL_RCA_INDEX` |
| Zakazy globalne | `08_AI_GUARDRAILS.md` |
| Workflow / deploy | `WORKFLOW-RELEASE-DEPLOY` · Owner GO |

Historyczne `docs/architecture/PAYROLL-*` — przez INDEX, nie jako start.

---

## 3. Stan systemu (skrót)

| Obszar | Status |
|--------|--------|
| Lista Płac Hours-wipe | **CLOSED** (feature baseline w 09) |
| AI Payroll Guard onboarding | **ACTIVE** (GUARD-02) |
| STABILIZATION WINDOW | **ACTIVE** |
| Protected Core | **GREEN** |

---

## 4. Co wolno / czego nie

| Wolno | Nie wolno bez Owner GO |
|-------|-------------------------|
| AUDIT / RCA / DF (docs) | IMPLEMENT Payroll / cloud-sync / Edge |
| Smoke read-only | Mixed FEATURE+CORE |
| Pytania / mapowanie | Usuwanie fence / omijanie Domain Gate |

---

## 5. DEPRECATED

`AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md` → Entry.
