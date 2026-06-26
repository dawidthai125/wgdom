# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-25 · **prod 2.62.72** · Workflow Cleanup P0

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.72** — Workflow Cleanup P0 |
| **Poprzedni release** | 2.62.71 — Document Summary Header |
| **Workflow EPIC A/B/C** | **CLOSED** |
| **Workflow Cleanup P0** | **RELEASED** (2.62.72) |

---

## Zamknięte w tej sesji (2026-06-25)

### Workflow Cleanup P0 (2.62.72)

| Pole | Wartość |
|------|---------|
| **Zakres** | Usunięto duplikat „Następny krok” z V2 · sticky CTA = jedyne CTA · `intelligenceCtx` z Huba · usunięto `prioritizeTenderDocuments` |
| **Klasyfikacja** | STANDARD REFACTOR RELEASE — prezentacja only |

---

## Następne (tylko na polecenie)

- **Workflow Cleanup P1** — V2 key docs vs positions file, Analysis Status Strip na Przetargu
- **Grouped Documents** — lokalnie (poza 2.62.72 jeśli nie w release)
- **GuideView FAQ** — TOP 5 → grouped docs + Document Summary Header (po release Grouped Documents)

---

## Dokumentacja agentów (zsynchronizowano)

- **SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md` (nowy)
- **Linki:** `AGENTS.md`, `ARCHITECTURE.md` § 12.1.9a, `PROJECT-HANDOFF-CURRENT.md`, `AGENT-ONBOARDING.md` § 6h, `PROJECT-GUIDE.md`, `wgdom-stan-projektu.mdc`
- **UX.1 handoff:** banner superseded (bez usuwania treści historycznej)

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.72**
2. Testy: `test-tender-workflow-hub.mjs` · `test-tender-workflow-primary-action.mjs` · `test-tender-workspace-ux.mjs`
3. `npm run build`
4. Verify: `curl https://www.wgdom.fun/version.json`
