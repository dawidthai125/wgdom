# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-12 · **P1 CLOSED — Documentation closeout**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.51.1 (PRODUCTION VERIFIED)

Dashboard V3 COMPLETE

Przetargi 3.0 COMPLETE

Command Center REMOVED (v2.51.0)

P1 CLOSED
```

**Baseline feature (P1):** v2.51.0 · commit `39b1892`  
**Baseline rename (ETAP 4):** v2.51.1 · commit `45ad21e`  
**Prod:** https://www.wgdom.fun

---

## OPEN BACKLOG

```text
P2
Audit Center / Security Log

P3
Dalsze usprawnienia Przetargów
```

**Bez polecenia:** nie startować P2/P3 bez AUDIT → RCA → PLAN.

---

## Domeny produktu (aktualne)

```text
Dashboard
Roboty
Do Rozliczenia
Przetargi
```

Strategia przetargowa wyłącznie: **Przetargi → Strategia** (`TendersModule`).

---

## Decyzje wiążące

- **2.1.2 CANCELLED** — pełna lista odbiorców inspektora z Kontaktów
- **Dashboard V2 Hero** — nie przywracać (V3 SSOT)
- **Command Center** — usunięty v2.51.0; docs → [`docs/archive/command-center/`](docs/archive/command-center/)

---

## Wznowienie pracy (agent)

1. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
3. `curl -s https://www.wgdom.fun/version.json`
4. Workflow A/B/C — [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)
