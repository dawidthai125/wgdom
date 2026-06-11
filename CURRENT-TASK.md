# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11  
**Current Version:** **2.50.68**  
**Current Baseline:** **Housekeeping workflow docs + hotfix payroll import**  
**Prod `origin/main` (app):** **`add9338`** · v2.50.68 · https://www.wgdom.fun  
**Poprzedni release:** **`65f3a8d`** — 20.7E Dashboard IA Cleanup (2.50.68)

**★ Workflow release/deploy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)  
**★ Release 20.7E:** [`docs/RELEASE-REPORT-20.7E.md`](docs/RELEASE-REPORT-20.7E.md)

---

## Werdykt sesji

```text
WORKFLOW DOCS UNIFIED (A/B/C + VERIFY)
PAYROLL HOTFIX add9338 RELEASED (2.50.68)
20.7E RELEASED (65f3a8d)
```

---

## Ostatnia praca — housekeeping workflow

Ujednolicono oficjalny workflow WGDOM w [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md):

| Wariant | Kroki |
|---------|--------|
| **A — minor** | build → commit → push → verify version.json → report |
| **B — functional UI** | build → relevant smoke → commit → push → verify version.json → report |
| **C — major** | build → smoke → E2E → commit → push → verify version.json → report |

**Deploy frontend:** `git push origin main` → Vercel Git Integration. **Bez** `vercel deploy`. **VERIFY:** push + version.json + app — **bez** pollingu deployment API.

---

## Poprzedni hotfix — payroll extraCostStatus (**RELEASED**)

| Commit | **`add9338`** · fix importów `extraCostStatus` w `WeekEmployeeDetail.tsx` |

---

## Poprzedni release — 20.7E (**RELEASED**)

| Commit | **`65f3a8d`** · v2.50.68 · Dashboard IA Cleanup |

**Raport:** [`docs/RELEASE-REPORT-20.7E.md`](docs/RELEASE-REPORT-20.7E.md)

---

## Następny krok

- Manual UX Pulpit post-20.7E (desktop + mobile 390px)
- Aktualizacja [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md) § layout post-20.7E
