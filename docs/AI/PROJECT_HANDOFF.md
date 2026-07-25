# WGDOM — Project Handoff (AI sessions)

> **STATUS:** **DOCS FINALIZED** · gotowe do **nowych** sesji ChatGPT / Cursor  
> **Data:** 2026-07-25  
> **Zakaz w tym handoffie:** implementacja bez Owner GO · mieszanie FEATURE+CORE  
> **Tip app (feature):** UI **2.65.43** / `ea1b0a6` · CI Gates green @ `c681f88`  
> **Tip docs (ten handoff):** **`08e5c60`**

```text
══════════════════════════════════════
ZAMKNIĘTE SESJE DOCS (2026-07-25)
CI Remediation EPIC ………… CLOSED (Gates GREEN)
Payroll Docs Hardening …… COMPLETE
AI Safety pack …………… COMPLETE
AI_MEMORY + Decision Tree … COMPLETE
══════════════════════════════════════
```

---

## 1. Jak startuje NOWA sesja AI

```text
README.md (root)
  → docs/AI/README.md
  → AI_MEMORY.md
  → AI_DECISION_TREE.md
  → PAYROLL_QUICK_START.md
  → PAYROLL_GUARD_RAILS.md
  → PAYROLL_DEPENDENCY_MAP.md
  → PAYROLL_AI_PLAYBOOK.md
  → docs/PAYROLL-ARCHITECTURE-SSOT.md
  → docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md  (głęboko)
  → AGENTS.md · CURRENT-TASK.md · AGENT-CONTINUITY-GUIDE.md
```

**Hasło Ownera „kontynuuj WGDOM”** → dodatkowo `.cursor/rules` + Continuity Guide.

---

## 2. SSOT map (jeden dokument na temat)

| Temat | SSOT |
|-------|------|
| Pamięć / decyzje AI | `docs/AI/AI_MEMORY.md` · `AI_DECISION_TREE.md` |
| Zakazy globalne | `docs/AI/08_AI_GUARDRAILS.md` |
| Tip produkcji | `docs/AI/09_PRODUCTION_BASELINE.md` |
| Payroll AI | `docs/PAYROLL-ARCHITECTURE-SSOT.md` |
| Payroll Guard / Playbook / Deps / Regression | `docs/AI/PAYROLL_*.md` |
| Sync głęboko | `docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` |
| CI Remediation | `docs/architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md` |
| Docs hardening audit | `docs/architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md` |
| Workflow / deploy | `docs/WORKFLOW-RELEASE-DEPLOY.md` · Owner GO |
| Living arch | `docs/ARCHITECTURE.md` |

Historyczne RCA/DF w `docs/architecture/` i `docs/recovery/` — **nie kasować**; czytać przy potrzebie.

---

## 3. Stan systemu (skrót)

| Obszar | Status |
|--------|--------|
| App / Lista Płac Hours-wipe | **CLOSED** @ 2.65.43 |
| TEST-INFRA Gates M/B/C | **GREEN** |
| CI Remediation | **EPIC CLOSED** |
| Residual CI-C-2 | P3 · legacy `e2e-happy-path` · **nie** blokuje Gate C |
| STABILIZATION WINDOW | **ACTIVE** — brak auto-EPIC |
| Protected Core | **GREEN** |

---

## 4. Co wolno / czego nie w nowej sesji

| Wolno (docs / AUDIT) | Nie wolno bez Owner GO |
|----------------------|-------------------------|
| AUDIT / RCA / DF (docs) | IMPLEMENT Payroll / cloud-sync / Edge |
| Smoke read-only | Mixed FEATURE+CORE commit |
| Pytania / mapowanie | Usuwanie fence / omijanie Domain Gate |
| CI-C-2 maintenance (po GO) | Nowy EPIC w Stabilization |

---

## 5. Backlog (nie tip-blockery)

1. **CI-C-2** — `jobs-mobile-layout` „Lista” (P3).  
2. HARDENING B1/C/E · ARCH-02F · H0.x · DEADLOCK-N2 — tylko Owner GO.  
3. TI-B1–B3 — post-MVP test-infra.

---

## 6. Definition of Done — nowe sesje

Nowy Agent po ścieżce §1:

- wie, że **Lista Płac = #1**  
- umie użyć Decision Tree przed kodem  
- zna SSOT Payroll i Dependency Map  
- nie miesza FEATURE z write-path  
- wie, że CI tip jest GREEN i docs AI są kompletne  

**Projekt gotowy do zamknięcia starych sesji i startu nowych.**
