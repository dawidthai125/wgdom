# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-12 · **P1-B ETAP 4 COMPLETE**  
**Current Version:** **2.51.1**  
**Current Baseline:** **Przetargi 3.0 — Command Center removed (v2.51.0) + rename ETAP 4**  
**Prod `origin/main`:** v**2.51.1** · https://www.wgdom.fun

**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ Pulpit V3:** [`docs/SESSION-HANDOFF-DASHBOARD-V3.md`](docs/SESSION-HANDOFF-DASHBOARD-V3.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## Werdykt sesji

```text
P1-B ETAP 1–4 COMPLETE ✅
Command Center removed in v2.51.0
Rename cleanup v2.51.1
Przetargi 3.0 — jedyna ścieżka strategii
Backlog: P2 Audit Center (bez polecenia)
```

---

## P1-B — Command Center → Przetargi 3.0 (CLOSED)

| ETAP | Wersja | Status |
|------|--------|--------|
| 1 — CC legacy UI removal | 2.50.75 | COMPLETE |
| 2 — TendersModule 5 tabs | 2.50.76 | COMPLETE |
| 3 — Runtime CC removal | 2.51.0 | COMPLETE |
| 4 — Rename cleanup | 2.51.1 | COMPLETE |

**Command Center removed in v2.51.0** — brak runtime CC. ETAP 4: rename `tenders/strategy/`, `tenders-strategy-*` lib.

---

## Commity baseline (P1-B)

| SHA | Opis |
|-----|------|
| *(ETAP 4)* | `refactor: finalize command center removal cleanup` |
| **`39b1892`** | refactor: remove command center runtime architecture (2.51.0) |
| **`58b4cd7`** | feat: introduce tenders 3.0 module architecture (2.50.76) |
| **`098f651`** | refactor: remove command center phase 1 legacy modules (2.50.75) |

---

## Decyzje wiążące

- **2.1.2 CANCELLED** — pełna lista odbiorców inspektora z Kontaktów
- **Dashboard V2 Hero** — nie przywracać (V3 SSOT)
- **Command Center** — usunięty v2.51.0; archiwalne docs → SUPERSEDED

---

## Następne (bez polecenia)

- P2 Audit Center / Security Log
- Ewentualne rename skryptów test `test-tender-center-*` → `test-tenders-strategy-*` (kosmetyka)
