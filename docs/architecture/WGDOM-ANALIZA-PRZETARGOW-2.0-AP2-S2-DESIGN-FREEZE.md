# WGDOM — AP2-S2 DESIGN FREEZE (Auto Analysis & UX Flow)

> **ID:** AP2-S2  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** AP2-S1 **LIVE** `2.65.48` @ `01d8981`

```text
One Bundle = One Goal: auto-analiza jako default UX + „Uruchom ponownie” + historia/etapy
```

---

## PAYROLL SAFETY GATE

```text
G1 Payroll:      NIE
G2 LocalStorage: NIE
G3 Cloud Sync:   NIE
G4 Bootstrap:    NIE  (nie zmieniamy useTenderDocumentsBootstrap guards)
G5 Week:         NIE
G6 Shared hooks: NIE
G7 Providers:    NIE
G8 Shell:        NIE
G9 Routing:      NIE
Wynik: ALL-NIE
Owner GO: YES (prompt AP2-S2)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-owner-language-pl.ts` | CTA → „Uruchom ponownie analizę” + hinty |
| `src/lib/tender-analysis-status-ux.ts` | Usuń legacy „Otwórz Dokumenty…”; etykiety etapów |
| `src/lib/tender-analysis-auto-ux.ts` | **NOWY** — historia analizy + mapowanie etapów (pure) |
| `src/lib/tender-documents-tab-summary.ts` | `analysisHistory` + `journeyStages` + inProgress |
| `src/app/TenderDocumentsSummaryHeader.tsx` | Historia · pasek etapów · rekomendacja/ryzyko (REUSE fit+S1) |
| `src/app/TenderDocumentsWorkspace.tsx` | Nie chowaj wyników za skeleton gdy jest prior data / busy z progressem |
| `src/lib/tender-owner-view-ux.ts` | CTA awaiting ≠ „Otwórz Dokumenty” |
| `src/lib/tender-detail-v4-display.ts` | Copy bez „Otwórz Dokumenty i uruchom…” |
| `src/app/GuideView.tsx` | FAQ align (copy) |
| `src/app/changelog-data.ts` | **2.65.49** |
| `scripts/test-ap2-s2-auto-analysis-ux.mjs` | **NOWY** |
| `scripts/test-p5-owner-language.mjs` | asercja nowej etykiety |
| docs DF/RELEASE · `09` · `CURRENT-TASK` | tip + status |

**Auto-run (REUSE — bez nowego triggera):**

- `useTenderDocumentsBootstrap` + `useTenderDossierHeavyLazy` + Autonomous fingerprint  
- Idempotent guards (inflight · completed Sets · docs fingerprint · circuit breaker) **NIE RUSZAĆ**  
- Manual = `runAnalysis` / Operator Bar — wyłącznie force re-run  

---

## 2. OUT

- Redesign fingerprint / Autonomous Gate behavior  
- Pricing Gate  
- Parsery / Edge / nowi agenci  
- Duży panel wyników (S7) / fullscreen (S8)  
- Nowy `useEffect` auto-fire analizy (zakaz multi-run na render)  
- Payroll / cloud-sync  

---

## 3. Kontrakt UX

### Historia analizy

| Pole | Źródło |
|------|--------|
| `atIso` / absolute + relative | max(`swz.parsedAt`, dossier kosztorys `parsedAt`) |
| `documentCount` | `countTenderAttachments` |
| `status` | `success` \| `partial` \| `failed` \| `running` \| `none` |
| duration | brak SSOT czasu trwania → UI pokazuje relative („X temu”), nie fake duration |

### Etapy (mapowanie — bez zmiany pipeline)

| UI stage | Sygnał istniejący |
|----------|-------------------|
| Wykrywanie dokumentów | `autoRunning` / `downloading_docs` |
| Klasyfikacja | `preparing_docs` |
| Analiza formalna | SWZ / notice progress przed heavy parse |
| Analiza techniczna | `parsing_kosztorys` / `dossierBuilding` |
| Analiza ryzyk | trust/fit available lub late parse |
| Przygotowanie podsumowania | `dossierSaving` / near-ready |

### Przycisk

`analyzeDocuments` = **„Uruchom ponownie analizę”** (nie primary path).

---

## 4. AC

1. Auto-analiza przy pierwszym wejściu / zmianie docs / błędzie — **REUSE pipeline** (bez regresji guards).  
2. Fresh analysis → brak zbędnego re-run (istniejące guards).  
3. Przycisk „Uruchom ponownie analizę”.  
4. Widoczny status/postęp etapów podczas busy.  
5. Po zakończeniu wyniki (kompletność S1 + gotowość + rekomendacja/fit + ryzyko) bez extra klików.  
6. Blok „Ostatnia analiza”.  
7. typecheck/build/test PASS · RR · commit · push · PV.  
8. Brak wielokrotnego startu na render (zero nowych auto-triggers).

---

**FROZEN** · IMPLEMENT dozwolony
