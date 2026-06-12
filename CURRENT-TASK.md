# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11 · **Dashboard V3 + docs**  
**Current Version:** **2.50.74**  
**Current Baseline:** **Dashboard V3 (P1-A) COMPLETE**  
**Prod `origin/main`:** v**2.50.74** · https://www.wgdom.fun · **PRODUCTION VERIFIED**

**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Pulpit V3:** [`docs/SESSION-HANDOFF-DASHBOARD-V3.md`](docs/SESSION-HANDOFF-DASHBOARD-V3.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Werdykt sesji

```text
BASELINE 2.50.74 · RELEASED · STABLE · PRODUCTION VERIFIED
Dashboard V3 (P1-A) COMPLETE
Inspector 2.1 CLOSED · 2.1.2 CANCELLED
Backlog: P1-B CC Reassessment · P2 Audit Center
```

---

## Commity baseline

| SHA | Opis |
|-----|------|
| **`5a54399`** | feat(dashboard): V3 operational layout without Hero (2.50.74) |
| **`ad859e6`** | feat(dashboard): Hero operational only (2.50.73) |
| **`ee2cd72`** | feat(jobs): default inspector recipient (2.1.1) · v2.50.70 |
| **`5391d03`** | feat(jobs): inspector communication templates (2.1.0) · v2.50.69 |

---

## Dashboard V3 (2.50.74 · `5a54399`) — COMPLETE

- Usunięto Hero stack, `attentionCount`, KPI „Do ogarnięcia”, kartę Recoverable
- KPI: Wypłata · Ekipa · WM · Braki dokumentów · Pilne uwagi
- Sekcje: Braki dokumentów + Pilne uwagi (7 kategorii) + Przetargi skrót
- SSOT liczników: `src/lib/dashboard-urgent-today.ts`
- Smoke: `test-dashboard-v3-counts.mjs` PASS

---

## Backlog (otwarty)

| Priorytet | Temat | Status |
|-----------|-------|--------|
| **P1-B** | Command Center Reassessment / Redesign | OTWARTY |
| **P2** | Audit Center / Security Log | OTWARTY |

**Bez polecenia:** nie startować P1-B ani P2 bez AUDIT → RCA → PLAN.

---

## Decyzje wiążące

- **Pulpit = operacje** · **CC = strategia** (moduł Przetargi)
- **2.1.2 CANCELLED** — nie implementować
- Workflow: `AUDIT → RCA → PLAN → IMPLEMENT`
- Release: A/B/C — [`WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Szybki start (nowy agent)

1. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
2. [`docs/SESSION-HANDOFF-DASHBOARD-V3.md`](docs/SESSION-HANDOFF-DASHBOARD-V3.md)
3. [`AGENTS.md`](AGENTS.md) → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
4. `curl -s https://www.wgdom.fun/version.json` → **2.50.74**
