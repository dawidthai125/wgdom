# RELEASE REPORT — NG-04.3 ATH Fidelity

> **Version:** **2.63.11**  
> **Date:** 2026-07-01  
> **Epic:** NG-04 — Kosztorys Workspace PRO · **Faza 04.3**  
> **Status:** **RELEASED** · prod **2.63.11**  
> **Commit:** (see release report)

---

## Summary

NG-04.3 dodaje **wyjaśnialność ATH** w BOQ Explorer — deterministyczne tooltipy per komórka, source strip (typ/confidence/plik) i CTA do istniejącego `JobFilePreviewModal`. Bez parsera z BOQ, bez rozszerzenia `KosztorysBoqRowViewModel`, bez duplikacji tabeli ATH.

---

## Principles shipped (#001–#009)

| # | Nazwa | Status |
|---|-------|--------|
| #001–#007 | (NG-04.1/04.2) | ✅ bez regresji |
| #008 | ATH Fidelity is Explain, Not Re-parse | ✅ |
| #009 | Explain Before Expand | ✅ tooltip → chip → CTA → modal |

### Deterministic tooltips

| Stan | Komunikat |
|------|-----------|
| `no_value_doc` (FOUND_NO_VALUE) | W dokumencie znaleziono pozycję, ale nie zawiera ceny. |
| `no_match` | Nie znaleziono odpowiadającej pozycji w danych ATH. |
| `priced` | Cena została odczytana z dokumentu ATH. |
| `empty_priced_row` | brak tooltipu |

---

## Test matrix

| Skrypt | Wynik |
|--------|-------|
| `test-ng04-3-ath-fidelity.mjs` | **34/34** |
| `test-ng04-2-benchmark-per-line.mjs` | **27/27** |
| `test-ng04-kosztorys-boq-explorer.mjs` | **19/19** |
| `test-ng04-m8-large-boq-performance.mjs` | **108/108** (M8.11) |
| `test-v41-kosztorys-workspace.mjs` | **82/82** (T18–T20) |
| `test-tender-kosztorys-process-phase.mjs` | **18/18** |
| `test-tp200b-snapshot-fidelity.mjs` | **22/22** |
| `test-tender-price-bridge.mjs` | **17/17** |
| `npm run build` | **PASS** |

---

## Architecture

```text
item + view.rows
  → useMemo → buildBoqAthPresentationCache(costStatus)   [#005 · #008]
  → useMemo → buildBoqAthDocumentMeta(item)
  → BoqAthTooltip(cache.get)                               [#009 krok 1]
  → BoqAthSourceStrip + BoqAthExplainLink                  [#009 krok 2–3]
  → JobFilePreviewModal (workspace handler)                [#009 krok 4]
```

---

## Production impact

| Warstwa | Impact |
|---------|--------|
| KV / sync | **NONE** |
| Parsery ATH/PDF | **NONE** |
| NG-02 runtime | **NONE** |
| Tab Kosztorys | **LOW** — tooltips + source strip |

---

## Files (release bundle)

- `src/lib/tender-kosztorys-boq-ath-presentation.ts`
- `src/app/kosztorys/BoqAthTooltip.tsx`
- `src/app/kosztorys/BoqAthSourceStrip.tsx`
- `src/app/kosztorys/BoqAthExplainLink.tsx`
- `src/app/kosztorys/KosztorysBoqRowFields.tsx`
- `src/app/kosztorys/KosztorysBoqExplorerSection.tsx`
- `src/app/TenderKosztorysWorkspace.tsx`
- `scripts/test-ng04-3-ath-fidelity.mjs`
- `scripts/test-ng04-m8-large-boq-performance.mjs` (M8.11)
- `scripts/test-v41-kosztorys-workspace.mjs` (T18–T20)
- `src/app/changelog-data.ts`
- `CHANGELOG.md`

### Frozen (untouched)

- `tender-kosztorys-boq-explorer.ts`
- `ath-parser.ts` / `tenders-bzp-brief.ts`
- `useTenderPipelineRuntime.ts`
- `JobFilePreviewModal.tsx`

---

## Next

| Faza | Status |
|------|--------|
| **NG-04.3** | **CLOSED** |
| **NG-04.4** | **ACTIVE** — polish + EPIC close |
