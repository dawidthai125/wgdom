# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-25 · **prod 2.62.71** · Document Summary Header (Dokumenty)

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.71** — Document Summary Header (zakładka Dokumenty) |
| **Poprzedni release** | 2.62.70 — Client Bar list filter hotfix |
| **Workflow EPIC B/C** | **CLOSED** (2.62.69) |
| **Document Summary Header** | **RELEASED** (2.62.71) |

---

## Zamknięte w tej sesji (2026-06-25)

### Document Summary Header (2.62.71)

| Pole | Wartość |
|------|---------|
| **Zakres** | `TenderDocumentsSummaryHeader` nad `TenderAttachmentsPanel` — bez zmian listy plików |
| **SSOT** | `tenderDossier`, `swzAnalysis`, `resolvedCostStatus`, `classifyTenderDocumentDisplayTier`, `classifyDocumentRole`, `buildTenderAnalysisStatusRows` |
| **Klasyfikacja** | STANDARD FEATURE RELEASE — prezentacja UX, brak zmian parserów/pipeline/discovery/backendu |

---

## Następne (tylko na polecenie)

- **Grouped Documents** — audyt wykonany; implementacja grupowania poza scope 2.62.71
- **UX cleanup** — usunięcie duplikatu „Następny krok” z `TenderWorkspaceV2Panel`

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.71**
2. Testy: `npx vite-node scripts/test-tender-documents-summary-header.mjs`
3. `npm run build`
4. Verify: `curl https://www.wgdom.fun/version.json`
