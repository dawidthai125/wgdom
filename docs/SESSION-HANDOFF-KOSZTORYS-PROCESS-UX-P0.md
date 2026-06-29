# SESSION HANDOFF — Kosztorys Process UX (P0 State Machine)

> **Status:** **CLOSED** · **prod `4056223`** · **v2.62.64** · **2026-06-25**  
> **Hasło sesji:** „kontynuuj WGDOM”

---

## 1. Problem (RCA skrót)

Na zakładce **Przetargi → Kosztorys V4** użytkownik przez długi czas widział stały komunikat **„Analiza kosztorysu…”** (`isKosztorysAwaitingHeavyParse`), nawet gdy:

- trwało tylko pobieranie dokumentów (bootstrap),
- parse jeszcze nie wystartował (deadlock: załącznik w app bez `bzpDocuments`),
- parse zakończył się błędem (`dossierParseFailed` — hook nie był podłączony do UI).

**Przyczyna UX:** rozproszone heurystyki w komponentach zamiast jednego modelu fazy procesu.

**Poza zakresem P0 (backlog):** timeout `tenderApiGet`, pełne 13 faz technicznych pipeline, migracja innych widoków z `isKosztorysAwaitingHeavyParse`.

---

## 2. Rozwiązanie (P0)

Jeden SSOT prezentacji — **bez zmian parserów, discovery, bootstrap, Edge, pipeline analizy**.

```text
deriveKosztorysProcessPhase(item, session)
  → KosztorysProcessPhaseView { id, label, hint, tone, showRetry? }
  → KosztorysProcessStatusBar (jeden komponent UI)
```

**Sygnały sesji** (`KosztorysProcessSession`):

| Sygnał | Źródło |
|--------|--------|
| `autoRunning` | `useTenderDocumentsBootstrap` |
| `dossierBuilding` | `useTenderDossierHeavyLazy` |
| `dossierParseFailed` | `useTenderDossierHeavyLazy` |
| `parseErrorMessage` | `useTenderDossierHeavyLazy` (telemetria błędu) |
| `lazyEnabled` | `TenderDetailPage` (tab kosztorys) |

**8 faz biznesowych P0:**

| `id` | Etykieta PL |
|------|-------------|
| `waiting_data` | Oczekiwanie na dane |
| `downloading_docs` | Pobieranie dokumentów |
| `preparing_docs` | Przygotowanie dokumentów |
| `parsing_kosztorys` | Analiza kosztorysu |
| `saving` | Zapisywanie wyników *(zarezerwowane — P1)* |
| `ready` | Kosztorys gotowy |
| `not_found` | Nie znaleziono kosztorysu |
| `failed` | Analiza została przerwana |

**Priorytet:** `failed` > terminalne (`ready` / `not_found`) > w toku > `waiting_data`.

**Retry:** `retryDossierParse()` w hooku lazy — czyści inflight + `retryNonce` (tylko UX plumbing, bez zmiany `buildTenderDossierHeavy`).

---

## 3. Pliki (SSOT)

| Plik | Rola |
|------|------|
| `src/lib/tender-kosztorys-process-phase.ts` | **SSOT** `deriveKosztorysProcessPhase()` |
| `src/app/KosztorysProcessStatusBar.tsx` | Jeden komponent statusu |
| `src/app/TenderKosztorysWorkspace.tsx` | Konsument fazy + ATH CTA |
| `src/app/TenderDetailPage.tsx` | Podłączenie hooków → `processSession` |
| `src/app/hooks/useTenderDossierHeavyLazy.ts` | `parseErrorMessage`, `retryDossierParse` |

**Legacy (nadal używane poza Kosztorys V4):** `isKosztorysAwaitingHeavyParse` w `tender-analysis-status-ux.ts` — Owner View, Wycena, bid prep itd. **Nie usuwać w P0.**

---

## 4. Powiązany release (kontekst)

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.62.63** | `e2d899a` | Discovery dokumentów variant B — bramka bez anchor |
| **2.62.64** | `4056223` | **Ten handoff** — fazy procesu kosztorysu UX |

Handoff discovery: [`SESSION-HANDOFF-DISCOVERY-DOCUMENTS-VARIANT-B.md`](SESSION-HANDOFF-DISCOVERY-DOCUMENTS-VARIANT-B.md) *(jeśli brak — patrz CHANGELOG 2.62.63 + `tender-document-discovery.ts`)*.

---

## 5. Testy

```bash
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
```

11 asercji mapowania faz (waiting, download, preparing, parsing, ready, not_found, failed, priorytety).

**Release:** `npm run build` → commit → push `main` → jedno `curl version.json`.

---

## 6. Scenariusze manualne (prod)

| Scenariusz | Oczekiwany status |
|------------|-------------------|
| Brak dokumentów | Oczekiwanie na dane |
| Bootstrap w toku | Pobieranie dokumentów |
| Parse ATH/PDF | Analiza kosztorysu |
| Sukces | Kosztorys gotowy |
| Scan bez kosztorysu | Nie znaleziono kosztorysu |
| Błąd parse | Analiza została przerwana + Spróbuj ponownie |

---

## 7. Backlog (tylko na polecenie)

| Etap | Skrót |
|------|-------|
| **P1** | Pełny model 13 faz technicznych → mapowanie biznesowe |
| **P1** | Faza `saving` przy zapisie KV |
| **P2** | Ujednolicenie `isKosztorysAwaitingHeavyParse` w Owner View / Wycena |
| **P2** | Timeout / progress dla długiego parse |

---

## 8. Zakazy dla programistów

- **Nie** zmieniać `tender-dossier-pipeline.ts`, `tender-document-resolver.ts`, parserów ATH/PDF, Edge.
- **Nie** dodawać ifów fazy w komponentach — tylko `deriveKosztorysProcessPhase`.
- **Nie** wracać do stałego badge „Analiza kosztorysu…” na Kosztorys V4.

---

## 9. Szybkie linki

```text
docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md   ← TEN PLIK
docs/ARCHITECTURE.md § 12.1.15a
docs/PROJECT-HANDOFF-CURRENT.md
CURRENT-TASK.md
```
