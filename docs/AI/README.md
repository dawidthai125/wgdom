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

**Potem living SSOT repo:** `AGENTS.md` → `docs/AGENT-CONTINUITY-GUIDE.md` → `CURRENT-TASK.md` → tematyczny guide (Payroll / Workflow / ARCHITECTURE).

---

## Katalog dokumentów

| Plik | Opis |
|------|------|
| [`01_AI_ONBOARDING.md`](01_AI_ONBOARDING.md) | Cel, historia, stack, repo, moduły, sync, release, OV vs PV — start kognitywny |
| [`02_ARCHITECTURE.md`](02_ARCHITECTURE.md) | Frontend (Vite/React **nie** Next), Supabase, LS/KV, Pipeline, Payroll, Jobs, Catalog, Auth, Edge, SSOT, przepływy, CORE |
| [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) | SSOT/Reuse/Mobile/Cloud First, flagi, release, Owner GO, Payroll, Tenders, git |
| [`04_INCIDENTS_HISTORY.md`](04_INCIDENTS_HISTORY.md) | Sync Storm 23.07, Payroll seria, bootstrap, Jobs photos, Theme, egress, deadlock, iOS login |
| [`05_MODULE_GUIDE.md`](05_MODULE_GUIDE.md) | Per-moduł: cel, pliki, hooki, zależności, pułapki |
| [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md) | AUDIT→…→CLOSE — znaczenie każdego etapu + VERIFY FAST |
| [`07_KNOWN_RISKS.md`](07_KNOWN_RISKS.md) | Critical→Info: residual Sync Storm, fat key, payroll regress, gated EPICs |
| [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md) | **★ Najważniejszy** — lista NIE WOLNO + checklisty przed kod/commit/push |
| [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) | Tip **2.65.40** / `23d7723`, open EPICs, backlog HIGH |
| [`10_HANDOFF_TEMPLATE.md`](10_HANDOFF_TEMPLATE.md) | Wzorzec handoffu między agentami |
| [`11_GLOSSARY.md`](11_GLOSSARY.md) | SSOT, Sync Storm, coalesce, fence, PWRB, OV, … |
| [`12_DECISION_LOG.md`](12_DECISION_LOG.md) | Decyzje D-01…D-17 z uzasadnieniem |

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
| [`docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) | Payroll sync |
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
