# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** → [`.cursor/rules/wgdom-stan-projektu.mdc`](.cursor/rules/wgdom-stan-projektu.mdc)

**Ostatnia aktualizacja:** 2026-06-11  
**Current Version:** **2.50.67**  
**Current Baseline:** **RELEASED · STABLE · DASHBOARD V2 COMPLETE · HERO COMPRESSION**  
**Prod `origin/main` (app):** **`f94b530`** · https://www.wgdom.fun · v2.50.67  
**Poprzedni release:** **`3e46ae8`** — Dashboard V2 Complete (2.50.66)  
**CI E2E:** **`#27322541521`** SUCCESS (happy) · **`#27322541526`** SUCCESS (mobile)

**★★ Dashboard V2 handoff:** [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md)  
**★ Release 20.7D.1:** [`docs/RELEASE-REPORT-20.7D.1.md`](docs/RELEASE-REPORT-20.7D.1.md)  
**★ Release 20.7C.2:** [`docs/RELEASE-REPORT-20.7C.2.md`](docs/RELEASE-REPORT-20.7C.2.md)  
**★ Handoff pre-next-feature:** [`docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md`](docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md)  
**★ Handoff końcowy 20.5Z:** [`docs/PROJECT-HANDOFF-FINAL-20.5Z.md`](docs/PROJECT-HANDOFF-FINAL-20.5Z.md)

---

## Werdykt sesji

```text
RELEASED
STABLE
DASHBOARD V2 COMPLETE
HERO COMPRESSION DEPLOYED
READY FOR NEXT FEATURE STREAM
```

---

## Ostatni release — 20.7D.1 Hero Compression (**RELEASED**)

| Sprint | Wersja | Commit | Zakres |
|--------|--------|--------|--------|
| **20.7D.1** Hero Compression | **2.50.67** | **`f94b530`** | KPI first · Hero compact accordion · merge Przetargi — skrót · fallback bez Przetargów |

**Kluczowe pliki:** `HeroDzisPanel.tsx`, `DashboardView.tsx`, `CommandCenterExecutivePanel.tsx`, `e2e/dashboard-hero.spec.ts`

**Smoke:**

```bash
npm run build
npx vite-node scripts/test-dashboard-hero-today.mjs
PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy
```

**Raport:** [`docs/RELEASE-REPORT-20.7D.1.md`](docs/RELEASE-REPORT-20.7D.1.md)

---

## Poprzedni release — 20.7C.2 Dashboard V2 Complete (**RELEASED**)

| Sprint | Wersja | Commit | Zakres |
|--------|--------|--------|--------|
| **20.7C.2** Dashboard V2 | **2.50.66** | **`3e46ae8`** | Hero DZIŚ SSOT · dedupe Uwaga · Action Center sloty · E2E hero |

**Lib SSOT:** `dashboard-hero-today.ts`, `dashboard-hero-consolidation.ts` — **nie zmieniać rankera bez nowego sprintu**

**Raport:** [`docs/RELEASE-REPORT-20.7C.2.md`](docs/RELEASE-REPORT-20.7C.2.md)

---

## Seria 20.7 — podsumowanie

| Etap | Status |
|------|--------|
| 20.7C.1 Command Center skrót cleanup | **RELEASED** (`070e52f`) |
| 20.7C.2A lib Hero ranker | **RELEASED** (`3e46ae8`) |
| 20.7C.2B HeroDzisPanel UI | **RELEASED** (`3e46ae8`) |
| 20.7C.2C konsolidacja + E2E | **RELEASED** (`3e46ae8`) |
| 20.7D audit Hero Compression | **DONE** (READ ONLY) |
| 20.7D.1 implementacja accordion | **RELEASED** (`f94b530`) |

**Pełna dokumentacja:** [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md)

---

## Następny krok (propozycje — bez otwartego sprintu)

- Aktualizacja `GuideView` / hintów Pulpitu (Hero compact, KPI first)
- Nowy strumień funkcji po Dashboard V2 (decyzja właściciela)
- Opcjonalny release tag `v2.50.67` po deploy Vercel

---

## Pre-feature backup v2.50.64 (**COMPLETE**)

Tag **`pre-next-feature-2.50.64`** · raport: [`docs/BACKUP-REPORT-2.50.64.md`](docs/BACKUP-REPORT-2.50.64.md)
