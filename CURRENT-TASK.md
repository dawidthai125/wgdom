# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-12 · **P2-F CLOSED — Documentation closeout**  
**★ Główny handoff (SSOT):** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)  
**★ P2-F handoff:** [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

---

## STATUS

```text
Production: 2.51.24 (RELEASE GO — verify version.json)

Dashboard V3 COMPLETE

Przetargi 3.0 COMPLETE

P2-F Tender Qualification COMPLETE (F.0 → F.5)

Command Center REMOVED (v2.51.0)

P1 CLOSED
```

**Baseline P2-F (prod):** v2.51.24 · commit `e015453`  
**Poprzedni P2-F:** v2.51.23 · `77b352a` (P2-F.4)  
**Prod:** https://www.wgdom.fun

---

## OPEN BACKLOG

```text
P2
Audit Center / Security Log

P2-F.6+ (opcjonalnie)
investorName w profilu · auto-pakiet referencji do oferty

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
Przetargi (+ Karta ofertowa P2-F, Profil wykonawcy)
```

Strategia przetargowa wyłącznie: **Przetargi → Strategia** (`TendersModule`).

---

## Decyzje wiążące

- **2.1.2 CANCELLED** — pełna lista odbiorców inspektora z Kontaktów
- **Dashboard V2 Hero** — nie przywracać (V3 SSOT)
- **Command Center** — usunięty v2.51.0; docs → [`docs/archive/command-center/`](docs/archive/command-center/)
- **P2-F referenceStatus** — domyślnie `unknown`; generacja wykazu **nie blokuje** przy braku referencji

---

## Wznowienie pracy (agent)

1. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
2. [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) — przy Przetargi / Karta ofertowa
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.5
4. `curl -s https://www.wgdom.fun/version.json`
5. `npx vite-node scripts/test-tender-dossier-pipeline.mjs` — przed release P2-F
6. Workflow A/B/C — [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)
