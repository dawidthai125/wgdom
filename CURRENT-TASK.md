# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11  
**Current Version:** **2.50.68**  
**Current Baseline:** **IMPLEMENT DONE · 20.7E Dashboard IA Cleanup (await deploy)**  
**Prod `origin/main` (app):** **`f94b530`** · v2.50.67 · https://www.wgdom.fun  
**Lokalnie (20.7E):** v2.50.68 — Dashboard IA Cleanup  
**Poprzedni release:** **`f94b530`** — Hero Compression (2.50.67)

**★★ Dashboard V2 handoff:** [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md)  
**★ Release 20.7E:** [`docs/RELEASE-REPORT-20.7E.md`](docs/RELEASE-REPORT-20.7E.md)  
**★ Release 20.7D.1:** [`docs/RELEASE-REPORT-20.7D.1.md`](docs/RELEASE-REPORT-20.7D.1.md)

---

## Werdykt sesji

```text
20.7E IMPLEMENTED (local)
DASHBOARD IA CLEANUP COMPLETE
AWAIT DEPLOY / COMMIT
```

---

## Ostatni sprint — 20.7E Dashboard IA Cleanup (**IMPLEMENTED local**)

| Sprint | Wersja | Zakres |
|--------|--------|--------|
| **20.7E** | **2.50.68** | IA: KPI → Najważniejsze dziś → Uwaga accordion → Do odzyskania → Przetargi skrót |

**Kluczowe pliki:** `DashboardView.tsx`, `HeroDzisPanel.tsx`, `CommandCenterExecutivePanel.tsx`, `e2e/dashboard-hero.spec.ts`

**Smoke (PASS lokalnie):**

```bash
npm run build
npx vite-node scripts/test-dashboard-hero-today.mjs
npx vite-node scripts/test-dashboard-hero-consolidation.mjs
npx vite-node scripts/test-hero-dzis-panel.mjs
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
```

**Raport:** [`docs/RELEASE-REPORT-20.7E.md`](docs/RELEASE-REPORT-20.7E.md)

---

## Poprzedni release prod — 20.7D.1 (**RELEASED**)

| Commit | **`f94b530`** · v2.50.67 |

**Raport:** [`docs/RELEASE-REPORT-20.7D.1.md`](docs/RELEASE-REPORT-20.7D.1.md)

---

## Następny krok

- Commit + push `main` → Vercel deploy 2.50.68
- Aktualizacja handoff 20.7 § layout (post-deploy)
- Manual UX desktop + mobile 390px
