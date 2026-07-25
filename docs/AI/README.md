# WGDOM AI Knowledge Base — INDEX

> **ID:** WGDOM-AI-KNOWLEDGEBASE-01  
> **STATUS:** DOCUMENTATION COMPLETE  
> **Dla:** Cursor Agents · ChatGPT · każde nowe AI **bez** historii projektu  
> **Zakaz w tej bazie:** implementacja kodu (tu tylko docs)

```text
══════════════════════════════════════
WGDOM AI KNOWLEDGE BASE COMPLETE
══════════════════════════════════════
```

---

## Start here (kolejność dla nowego AI)

```text
0. Ten INDEX (README.md)
0a. AI_MEMORY.md                 ★★★ pamięć projektu — PRZED wszystkim
0b. AI_DECISION_TREE.md          ★★★ drzewo decyzji — zanim kod
1. 08_AI_GUARDRAILS.md          ★ zakazy — PRZED kodem
2. 01_AI_ONBOARDING.md          mapa projektu
3. 09_PRODUCTION_BASELINE.md    aktualny tip prod
4. 03_ENGINEERING_RULES.md      zasady
5. 02_ARCHITECTURE.md           architektura
6. 04_INCIDENTS_HISTORY.md      pułapki historyczne
7. 07_KNOWN_RISKS.md            ryzyka otwarte
8. 05_MODULE_GUIDE.md           moduł, nad którym pracujesz
9. 06_RELEASE_PROCESS.md        gdy release
10. 11_GLOSSARY.md              słownik
11. 12_DECISION_LOG.md          dlaczego tak jest
12. 10_HANDOFF_TEMPLATE.md      koniec sesji
```

### ★ Lista Płac / Cloud Sync (obowiązkowa ścieżka AI Safety)

```text
P−1. AI_MEMORY.md + AI_DECISION_TREE.md  ← zawsze najpierw
P0. PAYROLL_QUICK_START.md      ← minimalny onboarding LP
P1. PAYROLL_GUARD_RAILS.md      ← zakazy + checklisty commit/push
P2. PAYROLL_DEPENDENCY_MAP.md   ← co przypadkowo psuje LP
P3. PAYROLL_REGRESSION_HISTORY.md
P4. PAYROLL_AI_PLAYBOOK.md      ← AUDIT / DF / Owner GO
P5. ../PAYROLL-ARCHITECTURE-SSOT.md  ← ★ SSOT przepływ + invariants
P6. ../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md  (głęboko)
```

Audyt docs: [`../architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md`](../architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md).

**Potem living SSOT repo:** `AGENTS.md` → `docs/AGENT-CONTINUITY-GUIDE.md` → `CURRENT-TASK.md` → Workflow / ARCHITECTURE (wg tematu).

---

## Katalog dokumentów

| Plik | Opis |
|------|------|
| [`AI_MEMORY.md`](AI_MEMORY.md) | **★★★ Pamięć projektu** — reguły, których AI nie wolno zapomnieć (≤5 min) |
| [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) | **★★★ Drzewo decyzji** — Payroll / bootstrap / sync / Shared → AUDIT/DF/GO |
| [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) | **★★ Handoff** — stan docs FINALIZED · start nowych sesji |
| [`01_AI_ONBOARDING.md`](01_AI_ONBOARDING.md) | Cel, historia, stack, repo, moduły, sync, release, OV vs PV — start kognitywny |
| [`02_ARCHITECTURE.md`](02_ARCHITECTURE.md) | Frontend (Vite/React **nie** Next), Supabase, LS/KV, Pipeline, Payroll, Jobs, Catalog, Auth, Edge, SSOT, przepływy, CORE |
| [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) | SSOT/Reuse/Mobile/Cloud First, flagi, release, Owner GO, Payroll, Tenders, git |
| [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md) | Sync Storm 23.07, Payroll seria, bootstrap, Jobs photos, Theme, egress, deadlock, iOS login |
| [`05_MODULE_GUIDE.md`](05_MODULE_GUIDE.md) | Per-moduł: cel, pliki, hooki, zależności, pułapki |
| [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md) | AUDIT→…→CLOSE — znaczenie każdego etapu + VERIFY FAST |
| [`07_KNOWN_RISKS.md`](07_KNOWN_RISKS.md) | Critical→Info: residual Sync Storm, fat key, payroll regress, gated EPICs |
| [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) | **★ Najważniejszy** — lista NIE WOLNO + checklisty przed kod/commit/push |
| [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) | UI **2.65.43** / feature `ea1b0a6` · Hours-wipe EPIC CLOSED · Hardening 01A/B0/D CLOSED |
| [`10_HANDOFF_TEMPLATE.md`](10_HANDOFF_TEMPLATE.md) | Wzorzec handoffu między agentami |
| [`11_GLOSSARY.md`](11_GLOSSARY.md) | SSOT, Sync Storm, coalesce, fence, PWRB, OV, … |
| [`12_DECISION_LOG.md`](12_DECISION_LOG.md) | Decyzje D-01…D-20 z uzasadnieniem |
| [`PAYROLL_QUICK_START.md`](PAYROLL_QUICK_START.md) | **★ Payroll** — minimalny onboarding AI |
| [`PAYROLL_AI_PLAYBOOK.md`](PAYROLL_AI_PLAYBOOK.md) | **★ Payroll** — kolejność AUDIT → DF → GO → IMPLEMENT |
| [`PAYROLL_GUARD_RAILS.md`](PAYROLL_GUARD_RAILS.md) | **★ Payroll** — zakazy + checklisty commit/push |
| [`PAYROLL_DEPENDENCY_MAP.md`](PAYROLL_DEPENDENCY_MAP.md) | **★ Payroll** — co zależy / co psuje LP |
| [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) | **★ Payroll** — RC → fix → zapobieganie |

---

## Definition of Done (tożsamość nowego AI)

Po przeczytaniu Knowledge Base AI rozumie:

| # | Kompetencja | Doc |
|---|-------------|-----|
| ✔ | Architektura Vite/React + KV sync + Edge | 02 |
| ✔ | Jak działa WGDOM operacyjnie | 01, 05 |
| ✔ | Historia i incydenty | 04 |
| ✔ | Release + RCA pipeline | 06 |
| ✔ | Zasady inżynierskie | 03 |
| ✔ | Stan produkcji | 09 |
| ✔ | Czego nie wolno zmieniać | **08** |
| ✔ | Ryzyka residual | 07 |
| ✔ | Od czego zacząć | INDEX + 01 |
| ✔ | Słownik i decyzje | 11, 12 |

---

## Powiązane dokumenty poza `docs/AI/`

| Doc | Rola |
|-----|------|
| [`AGENTS.md`](../../AGENTS.md) | Workflow deweloperski |
| [`PROJECT-GUIDE.md`](../../PROJECT-GUIDE.md) | Known Issues |
| [`docs/AGENT-CONTINUITY-GUIDE.md`](../AGENT-CONTINUITY-GUIDE.md) | Kontekst sesji |
| [`docs/AGENT-APP-MAP.md`](../AGENT-APP-MAP.md) | Mapa widoków/KV |
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | Living architecture |
| [`docs/PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) | **★ Payroll AI SSOT** — przepływ · invariants · safety · Hours-wipe |
| [`docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) | Payroll sync/merge (głęboko) |
| [`PAYROLL_QUICK_START.md`](PAYROLL_QUICK_START.md) (+ Playbook / Guard Rails / Dependency / Regression) | AI Safety pack Listy Płac |
| [`docs/architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md`](../architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md) | Audyt + gap hardening docs |
| [`docs/WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) | Przetargi UX SSOT |
| [`docs/WORKFLOW-RELEASE-DEPLOY.md`](../WORKFLOW-RELEASE-DEPLOY.md) | Deploy |
| [`docs/WORKFLOW-OWNER-GO.md`](../WORKFLOW-OWNER-GO.md) | Owner GO |
| [`docs/architecture/WGDOM-FINAL-PRODUCTION-AUDIT-01.md`](../architecture/WGDOM-FINAL-PRODUCTION-AUDIT-01.md) | Sync Storm final audit |
| [`CURRENT-TASK.md`](../../CURRENT-TASK.md) | Status sesji |

---

## Utrzymanie

- Po każdym major release / P0 closeout: zaktualizuj **09** + wpis w **04/07/12** jeśli trzeba.  
- Guardrails (**08**) zmieniaj tylko świadomie (to kontrakt bezpieczeństwa AI).  
- Nie zastępuje Design Freeze / RCA w `docs/architecture/` — **indeksuje** je.

---

```text
WGDOM AI KNOWLEDGE BASE COMPLETE
```
