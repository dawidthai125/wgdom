# SESSION HANDOFF — Kosztorys Process UX (P1 Technical Phases + Saving)

> **Status:** **CLOSED** · **v2.62.65** · **2026-06-25**  
> **Poprzedni:** P0 · [`SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md`](SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md)  
> **Hasło sesji:** „kontynuuj WGDOM”

---

## 1. Zakres P1

**Prezentacja only** — bez zmian parserów, pipeline, Edge, discovery.

| Etap | Zrealizowane |
|------|----------------|
| 13 faz technicznych E0–E12 | `deriveKosztorysTechnicalPhase()` + `mapKosztorysTechnicalToBusiness()` |
| Faza `saving` | `dossierSaving` w `useTenderDossierHeavyLazy` (E7/E8) |
| Migracja etykiet | `resolveKosztorysAwaitingParseDisplay()` w Owner View / Wycena / SSOT kosztorysu |

**Backlog OPEN (P2):** E12 timeout/stale · pełny progress z trace w UI · Audit Hub WM-001

---

## 2. Fazy techniczne E0–E12

| `technicalId` | Etykieta UI | Biznes (`id`) |
|---------------|-------------|---------------|
| `e0` | Oczekiwanie na dane | `waiting_data` |
| `e1` | Oczekiwanie na dane ogłoszenia | `waiting_data` |
| `e2` | Pobieranie treści ogłoszenia | `downloading_docs` |
| `e3` | Wyszukiwanie załączników | `downloading_docs` |
| `e4` | Oczekiwanie na listę z platformy | `waiting_data` |
| `e5` | Gotowe do analizy | `preparing_docs` |
| `e6` + `e6Sub` | Analiza / przygotowanie / pobieranie plików | `preparing_docs` / `parsing_kosztorys` |
| `e7` | Zapisywanie wyników (finalizacja) | `saving` |
| `e8` | Zapisywanie wyników (persist) | `saving` |
| `e9` | Kosztorys gotowy | `ready` |
| `e10` | Nie znaleziono kosztorysu | `not_found` |
| `e11` | Analiza została przerwana | `failed` |
| `e12` | Analiza kosztorysu (stale — P2) | `parsing_kosztorys` |

**E6 podfazy:** `e6a` prefetch/archiwa · `e6b` download · `e6c` parser — z `getDossierTraceLog()` (read-only).

---

## 3. Pliki

| Plik | Rola |
|------|------|
| `src/lib/tender-kosztorys-process-phase.ts` | SSOT P0+P1 — technical + business + `resolveKosztorysAwaitingParseDisplay` |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | `dossierSaving` |
| `src/lib/tender-data-ssot.ts` | `resolvedCostStatusDisplay(..., session?)` |
| `src/lib/tenders-bid-prep.ts` | checklista Wycena — fazy z sesji |
| `src/lib/tender-analysis-status-ux.ts` | pasek postępu — etykieta kosztorysu z fazy |
| `src/app/TenderDetailPanel.tsx` | `buildKosztorysProcessSession` → Intelligence / strip |

---

## 4. Testy

```bash
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs   # 18 asercji
npx vite-node scripts/test-p3-ux-analysis-status.mjs
npm run build
```

---

## 5. Zakazy (jak P0)

- **Nie** zmieniać `tender-dossier-pipeline.ts`, parserów, Edge.
- **Nie** dodawać ifów fazy w komponentach — tylko `deriveKosztorysProcessPhase` / `resolveKosztorysAwaitingParseDisplay`.

---

## 6. Szybkie linki

```text
docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P1.md   ← TEN PLIK
docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md
docs/ARCHITECTURE.md § 12.1.15a
CURRENT-TASK.md
```
