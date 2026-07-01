# ARCHITECTURE REVIEW 2026 — Moduł Przetargi

> **Status:** **REVIEW ONLY** — bez implementacji  
> **Data:** 2026-07-01  
> **Zakres:** NG-01 · NG-02 · NG-03 · NG-04 (seria **2.62.92** → **2.63.12**)  
> **Baseline prod:** **v2.63.12** (po release NG-04.4)  
> **Cel:** Ocena dojrzałości architektury, duplikacji, niespójności dokumentacji i kandydatów na uproszczenie — **bez nowego epicu**.

---

## 1. Executive summary

Moduł Przetargi przeszedł cztery epiki komplementarne:

| Epic | Rola | Status |
|------|------|--------|
| **NG-01** | Trust Layer — jeden agregat wiarygodności | SHIPPED (`tender-trust-layer.ts`) |
| **NG-02** | Automation Pipeline — discovery → heavy → pricing | **EPIC CLOSED** (2.62.98) |
| **NG-03** | Workspace UX — Command/Content, 5 tabów | **EPIC CLOSED** (2.63.7) |
| **NG-04** | Kosztorys PRO — BOQ ViewModel + derived UI | **EPIC CLOSED** (2.63.12) |

**Werdykt:** Architektura jest **spójna strategicznie** (SSOT lib + cienkie UI, NG-02 frozen od NG-03/04). Pozostają **lokalne duplikacje prezentacji**, **dwa mounty runtime** (V4 vs legacy accordion) oraz **dokumentacja epic freeze** częściowo niezsynchronizowana z prod.

**Rekomendacja:** Nie startować nowego epicu „refactor Przetargi”. Kolejne prace jako **małe audytowane paczki** (G-08, G-02) lub **maintenance** według [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) §6.

---

## 2. Mapa warstw (stan po NG-04)

```text
TendersProvider (strategia, lista)
  └── TenderDetailPage (V4 SSOT shell)
        ├── useTenderPipelineRuntime  ← NG-02 frozen facade
        │     ├── useTenderDocumentsBootstrap
        │     ├── useTenderDossierHeavyLazy
        │     ├── useTenderPricingAuto
        │     └── useTenderTrustAssessment  ← NG-01
        ├── TenderDetailCommandLayer      ← NG-03
        └── workspace per tab:
              ├── TenderPrzetargWorkspace
              ├── TenderDokumentyWorkspace
              ├── TenderKosztorysWorkspace  ← NG-04 BOQ
              ├── TenderCenyWorkspace
              └── TenderDecyzjaWorkspace

Legacy (równoległy):
  TenderDetailPanelHosted → useTenderPipelineRuntime (drugi mount)
```

---

## 3. NG-01 — Tender Trust Layer

### 3.1 Co działa

- `buildTenderTrustAssessment()` jako agregat wymiarów: documents · parse · kosztorys · pricing.
- UI: `TrustInlineHint`, `TrustReasonList`, ribbon w Command Layer.
- NG-04 reuse: cap reasons (`kosztorys_ath_cap_ui`) w BOQ Explorer.

### 3.2 Duplikacje / overlap

| Obszar | NG-01 SSOT | Nadal równolegle |
|--------|------------|------------------|
| Status kosztorysu | `trust.kosztorys` | `KosztorysProcessStatusBar` + `deriveKosztorysProcessPhase` |
| Cost discovery | trust dimensions | `resolvedCostStatus` + `classifyCostDocument` (BOQ ATH strip) |
| Postęp dokumentów | trust documents | `tender-analysis-status-ux` rows (Hub legacy) |

**Uproszczenie (propozycja):** Mapować `KosztorysProcessStatusBar` label z trust dimension kosztorys (read-only), zamiast utrzymywać dwie narracje. **Ryzyko:** średnie — wymaga audytu copy UX.

### 3.3 Dokumentacja

- `audit/NG-01-TENDER-TRUST-LAYER-AUDIT.md` opisuje „TO-BE” — **zrealizowane**; brak osobnego **EPIC CLOSE REPORT** (w przeciwieństwie do NG-02/03/04).
- `ARCHITECTURE.md` §12.1.x — sprawdzić aktualizację po NG-04 (BOQ nie wpływa na trust engine).

---

## 4. NG-02 — Tender Automation Pipeline

### 4.1 Co działa

- Jeden facade: `useTenderPipelineRuntime` na `TenderDetailPage`.
- Heavy lazy parse, unified attachment gate, full document discovery SSOT.
- **Frozen** przez NG-03 i NG-04 — respektowane w implementacji.

### 4.2 Ryzyko architektoniczne

| ID | Problem | Severity |
|----|---------|----------|
| **A-02-1** | `TenderDetailPanelHosted` nadal mountuje **drugi** `useTenderPipelineRuntime` (legacy accordion) | **MEDIUM** |
| **A-02-2** | Session sticky Sets (`discoveryCompletedIds`) — historyczny incydent 02.1C; wrażliwe na regress | **LOW** (testowany) |
| **A-02-3** | `tenders-pipeline-session-cache.ts` — globalny cache między Pulpit ↔ Przetargi | **LOW** (świadomy design) |

**Uproszczenie:** Deprecate `TenderDetailPanelHosted` po pełnym wycofaniu accordion legacy z AdminViewRouter. **Bez usuwania** dopóki ścieżka legacy jest aktywna.

### 4.3 Dokumentacja

- `audit/NG-02-EPIC-CLOSE-REPORT.md` — **kompletny**.
- `SESSION-HANDOFF-NG-02-EPIC-CLOSE.md` — aktualny.
- Spójne z NG-03/04 freeze („pipeline niezmienny”).

---

## 5. NG-03 — Tender Workspace UX

### 5.1 Co działa

- Command Layer + Content Layer, 5 tabów, mobile cards `<1024px`.
- Height budget Command Layer (P0 2.63.6).
- `TenderMobileRowCard` / `TenderDesktopTable` — reuse w NG-04 BOQ.

### 5.2 Duplikacje / overlap

| ID | Obszar | Opis |
|----|--------|------|
| **A-03-1** | Status postępu | Ribbon (NG-03) vs Process Strip vs trust vs `tender-workspace-v2-ux` filary — częściowo zredukowane, V2 UX nadal w lib |
| **A-03-2** | `TenderDetailPanel` vs `TenderDetailPage` | Dwa shell'e; Panel ma setki LOC legacy + opcjonalny runtime |
| **A-03-3** | Tab routing | `tender-detail-routes-v4.ts` + redirecti w Page — OK, ale HelpView odwołuje się do „V4.2” zamiast NG-04 |

### 5.3 Dokumentacja

- `NG-03-DESIGN-FREEZE.md` — status nadal „NG-03.1 Navigation next” w §0 ( **stale** ).
- `audit/NG-03-EPIC-CLOSE-REPORT.md` — kompletny.

**Uproszczenie docs:** Jednorazowy pass: banner **EPIC CLOSED** na `NG-03-DESIGN-FREEZE.md` (jak NG-04 po 04.4).

---

## 6. NG-04 — Kosztorys Workspace PRO

### 6.1 Co działa (Principles #001–#010)

```text
buildKosztorysBoqExplorerView()           #001 merge once
  → filterKosztorysBoqRows()              #003
  → buildBoqLaborBenchmarkCache()         #004–#006
  → buildBoqAthPresentationCache()        #007–#008
  → adapters: BoqAthTooltip, BoqLaborBenchmarkBadge, BoqAthSourceStrip
```

- M8 gate: 500 rows, cache stable, build <50ms.
- ATH explain bez re-parse (#008); hierarchy tooltip → chip → CTA → modal (#009).

### 6.2 Duplikacje / overlap

| ID | Obszar | Opis | Uproszczenie |
|----|--------|------|--------------|
| **A-04-1** | TOP 20 vs BOQ | `selectTopCostRows` + osobna tabela TOP vs BOQ Explorer | Akceptowalne (decision screen); ewentualnie link „pokaż w BOQ” z filtrem |
| **A-04-2** | Benchmark | `BoqLaborBenchmarkBadge` vs `LaborBenchmarkCell` (tab Ceny) | **Poprawne** — read vs edit context; wspólny `labor-benchmark.ts` |
| **A-04-3** | ATH CTA | Workspace button + `BoqAthExplainLink` | Zamierzone (#009); copy w HelpView zsynchronizowane w 04.4 |
| **A-04-4** | `buildKosztorysProDashboard` + `buildKosztorysV4Display` | Oba w `TenderKosztorysWorkspace` useMemo | Różne agregaty; **nie merge** bez audytu |
| **A-04-5** | `resolvedCostStatus` | Wołane w explorer merge, ATH cache, trust | SSOT w `tender-data-ssot` — OK |
| **A-04-6** | Brak `code`/R/M/S w BOQ | Świadome ograniczenie snapshot | Backlog G-08 / G-02 — **nie** NG-04 |

### 6.3 Luki znane (nie bugi)

- Brak virtualizacji 500 wierszy (M8 OK na filter; render 500 DOM przy „Pokaż wszystkie”).
- Brak skeleton BOQ (P3 odłożony w 04.4).
- `athPreviewToSnapshot` nie persistuje `code` — pełna fidelity tylko w modal.

### 6.4 Dokumentacja

- `NG-04-DESIGN-FREEZE.md` — zaktualizowany do **EPIC CLOSED** (2.63.12).
- Sub-freeze 04.1–04.3 — kompletne; 04.4 audit + freeze — kompletne.
- `NG-04-DESIGN-FREEZE.md` §6 nadal wspomina `test-ng04-kosztorys-pro-unified-row.mjs` — plik może nie istnieć (nazwa vs `test-ng04-kosztorys-boq-explorer.mjs`) — **niespójność nazewnictwa testów**.

---

## 7. Przekrojowe niespójności dokumentacji

| Dokument | Problem | Priorytet |
|----------|---------|-----------|
| `NG-03-DESIGN-FREEZE.md` §0 | „Next: NG-03.1” mimo EPIC CLOSED | P2 docs |
| `NG-04-DESIGN-FREEZE.md` §6 | Nazwa testu unified-row vs boq-explorer | P3 docs |
| `ARCHITECTURE.md` | Czy zawiera BOQ ViewModel + NG-04 principles | P2 docs |
| `WORKFLOW-ARCHITECTURE-v2.63.md` | Tab Kosztorys — opis BOQ post-NG-04 | P2 docs |
| NG-01 | Brak `NG-01-EPIC-CLOSE-REPORT.md` | P3 docs |
| `CURRENT-TASK.md` | Zaktualizowany po NG-04.4 | ✅ |

---

## 8. Kandydaci na uproszczenie (bez nowych funkcji)

| Priorytet | Akcja | Epic źródłowy | Effort |
|-----------|-------|---------------|--------|
| **P1** | Deprecation plan `TenderDetailPanelHosted` / legacy accordion | NG-02/03 | M |
| **P2** | Docs pass: NG-03 freeze banner, ARCHITECTURE §Kosztorys BOQ | NG-03/04 | S |
| **P2** | `useBoqDerivedCaches` hook (benchmark + ATH) — kosmetyka DRY | NG-04 | S |
| **P3** | Trust vs ProcessPhase — jeden copy SSOT dla kosztorysu | NG-01/04 | M |
| **P3** | Virtualizacja BOQ przy „Pokaż wszystkie” (500 rows) | NG-04 | M |
| **—** | Persist `code` in snapshot | G-08 | **osobny audyt** |
| **—** | R/M/S inline BOQ | G-02 | **osobny audyt** |

**Nie rekomendowane:** scalanie `TenderCenyWorkspace` z BOQ; scalanie trust z pipeline runtime; przenoszenie parse do BOQ.

---

## 9. Macierz regresji (stan po NG-04)

| Pakiet | Rola |
|--------|------|
| `test-tender-pipeline-automation-p0.mjs` | NG-02 |
| `test-tender-documents-bootstrap-retry.mjs` | NG-02 |
| `test-v41-kosztorys-workspace.mjs` | NG-04 + Kosztorys V4 |
| `test-ng04-*` (1/2/3/4) | NG-04 |
| `test-ng04-m8-large-boq-performance.mjs` | NG-04 perf |
| `test-tp200b-snapshot-fidelity.mjs` | snapshot contract |

**Luka:** brak jednego skryptu „epic tenders smoke” agregującego NG-01–04 — obecnie copy-paste list w raportach closeout.

---

## 10. Werdykt końcowy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy NG-01–04 są spójne architektonicznie? | **TAK** — warstwy komponują się poprawnie |
| Czy są krytyczne duplikacje logiki biznesowej? | **NIE** — głównie prezentacja i legacy shell |
| Czy dokumentacja wymaga przeglądu? | **TAK** — drobny pass (§7) |
| Czy potrzebny nowy epic „refactor Przetargi”? | **NIE** — maintenance + backlog G-* |
| Czy NG-04 EPIC CLOSE jest uzasadniony? | **TAK** — BOQ PRO kompletny w scope freeze |

---

## 11. Powiązane SSOT

| Dokument | Rola |
|----------|------|
| [`audit/NG-01-TENDER-TRUST-LAYER-AUDIT.md`](../audit/NG-01-TENDER-TRUST-LAYER-AUDIT.md) | NG-01 |
| [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md) | NG-02 |
| [`audit/NG-03-EPIC-CLOSE-REPORT.md`](../audit/NG-03-EPIC-CLOSE-REPORT.md) | NG-03 |
| [`docs/NG-04-EPIC-CLOSE-REPORT.md`](NG-04-EPIC-CLOSE-REPORT.md) | NG-04 |
| [`docs/NG-04-DESIGN-FREEZE.md`](NG-04-DESIGN-FREEZE.md) | Principles #001–#010 |

**Brak aktywnego epicu Przetargi** — kolejne zadania wyłącznie na polecenie.
