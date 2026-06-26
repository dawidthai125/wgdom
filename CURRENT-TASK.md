# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-25 · **prod 2.62.70** · Client Bar P0 hotfix

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.70** — Client Bar list filter hotfix |
| **Poprzedni release** | 2.62.69 — Process Strip + Sticky Primary CTA |
| **Workflow EPIC B/C** | **CLOSED** (2.62.69) |
| **Lista UX V4** | **HOTFIX** — filtrowanie Client Bar spójne w „Dzisiaj” + „Lista” |

---

## Zamknięte w tej sesji (2026-06-25)

### Client Bar list filter hotfix (2.62.70) — P0

| Pole | Wartość |
|------|---------|
| **Problem** | Chip Client Bar aktywny, ale lista pokazywała przetargi innych klientów (sekcja „Dzisiaj” z `pipeline.items`) |
| **Naprawa** | SSOT `filterTendersListPipelineItems()` + `buildTendersListVisibleSections()` |
| **Zakres** | tylko logika filtrowania — bez zmian UI |

---

## Następne (tylko na polecenie)

- **UX cleanup** — usunięcie duplikatu „Następny krok” z `TenderWorkspaceV2Panel`
- **Regression Alignment** — testy owner/workspace (lokalnie, poza hotfixem)

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.70**
2. Testy listy: `npx vite-node scripts/test-tenders-list-ux.mjs`
3. `npm run build`
4. Verify: `curl https://www.wgdom.fun/version.json`
