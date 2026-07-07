# NG-06-TEUX — TEUX-5 Loading · AUDIT REPORT

> **Status:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (wymaga Owner GO)  
> **Tryb:** AUDIT ONLY · zero diff `src/` · zero BUILD/TEST/COMMIT/PUSH  
> **Data audytu:** 2026-07-07  
> **Baseline prod:** UI **2.63.57** · commit **`d965311`** · **TEUX-1…4 CLOSED** · **TOKEN FREEZE ACTIVE**  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) §2.8 · §4 TEUX-5 · §4a DoD  
> **Poprzedni bundle:** [`NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md`](./NG-06-TEUX-TEUX4-RELEASE-VERIFICATION.md) · [`NG-06-TEUX-MID-EPIC-REVIEW.md`](./NG-06-TEUX-MID-EPIC-REVIEW.md)

```text
WERDYKT AUDYTU:  READY FOR OWNER GO (IMPLEMENT)
RYZYKO:          NISKIE–ŚREDNIE — skeleton layout vs TEUX-3 karty · BOQ blank flash
SCOPE CREEP:     ŚREDNIE — jeśli mapa/AI/Command Layer skeleton poza DF §2.8
TOKEN FREEZE:    ACTIVE — reuse Skeleton + className · edycja tender-ux-tokens.ts ZAKAZANA
GAP G-07:        OPEN — tekst-only loading → zamyka TEUX-5
```

---

## 0. Cel audytu

Przeprowadzić pełny **AUDIT warstwy Loading** w module Przetargi: stany ładowania (lista · detal · dokumenty · mapa · parser · BOQ · AI · operator), użycie skeleton/spinner, empty/transition/progressive loading, możliwość **REUSE** `components/ui/skeleton.tsx`, granice **#CORE-013 / #CORE-014** i Protected Core.

**Poza audytem:** implementacja, BUILD, TEST, commit, push, TEUX-6+, edycja `tender-ux-tokens.ts`.

---

## 1. Stan wyjściowy (as-is @ 2.63.57)

| Artefakt docelowy (DF §2.8 / §4 TEUX-5) | Stan w repo | Werdykt |
|----------------------------------------|-------------|---------|
| `TenderListCardSkeleton` (`tenders/list/*`) | **BRAK** | Do utworzenia |
| `TenderDocumentsSummarySkeleton` | **BRAK** | Do utworzenia |
| BOQ 8-row table skeleton | **BRAK** | Do utworzenia |
| Moduł init skeleton (header + 3 karty) | **BRAK** — sam tekst | **GAP T1** |
| Detal stepped label (`autoRunning`) | **BRAK** — jedna linia + `Loader2` | GAP vs DF §2.8 |
| Detal Command Layer skeleton | **BRAK** | Opcjonalny w DF · poza AC minimalnym |
| `src/app/components/ui/skeleton.tsx` | **ISTNIEJE** | REUSE z override className |
| Użycie `Skeleton` w Przetargach | **0 importów** | Tylko `sidebar.tsx` |
| `LIB-TENDER-LOADING-TEUX5` | **BRAK** w manifeście | Do dodania w IMPLEMENT |
| Gap **G-07** (loading = tekst) | **OPEN** | Zamyka TEUX-5 |

### 1.1 Baseline zależności (TEUX-1…4)

| Zależność | Status | Wpływ na TEUX-5 |
|-----------|--------|-----------------|
| TEUX-3 list cards | **CLOSED** (`7a0ae83`) | Skeleton musi matchować wymiary `TenderListMobileCard` / `TenderListDesktopCard` |
| TEUX-4 Command Layer / tab bar | **CLOSED** (`d965311`) | Wysokość skeleton detalu ≤ budżet mobile ≤50vh |
| `pipeline.loading` SSOT | `useTendersPipeline.ts` | **Nie zmieniać** — tylko warstwa prezentacji |
| CTA `busy` / `disabled` | `tender-workflow-primary-action.ts` | **AC T4** — zero diff logiki |
| TOKEN FREEZE | `tender-ux-tokens.ts` | Tokeny skeleton: inline `bg-secondary/60` per DF §2.8 |

---

## 2. Macierz loading — 8 warstw (as-is)

Legenda: ✅ zgodne z DF · ⚠️ częściowe · ❌ GAP · ➖ poza scope TEUX-5 (DF)

| Warstwa | Trigger / SSOT | UI as-is | Wzorzec DF | Werdykt |
|---------|----------------|----------|------------|---------|
| **Lista** | `pipeline.loading` → early return | Tekst: `Ładowanie pipeline przetargów…` (`TendersView.tsx` L422–427) | 3× `TenderListCardSkeleton` | ❌ **GAP** |
| **Detal** | `item` z pipeline (sync); `bootstrapItem` gdy brak | Command Layer renderuje od razu (pusty tytuł możliwy); brak content skeleton | Command Layer skeleton + pulse | ⚠️ **GAP** (poza minimalnym AC) |
| **Dokumenty** | `loadingDocs \|\| autoRunning \|\| dossierBuilding` | `TenderAttachmentsPanel`: `Loader2` + „Skanowanie załączników BZP…” gdy `docs.length===0`; summary header zawsze z danych | `TenderDocumentsSummarySkeleton` (5 slotów) | ❌ **GAP T2** |
| **Mapa** | Brak osobnego stanu — `pipeline.items` po `loading=false` | `TendersMapPanel`: OSM tiles `loading="lazy"`; brak modułowego spinnera | ➖ nie w §2.8 TEUX-5 | ➖ **OUT OF SCOPE** (defer TEUX-7 / TEUX-6 empty) |
| **Parser / pipeline** | `autoRunning`, `dossierBuilding`, `analyzing` | `TenderDetailPanel` L611–614: `Loader2` + jedna linia; `TenderAnalysisStatusStrip`: wiersze pending; `KosztorysProcessStatusBar`: faza + hint | Stepped label: „Pobieranie → Załączniki → Analiza” | ⚠️ **GAP** (stepped label) |
| **BOQ** | `inProgress \|\| phase.id===waiting_data` && `!pro.hasCatalog` | **Pusty fragment** (`null`) — L335–342 `TenderKosztorysWorkspace.tsx` | 8-row table skeleton | ❌ **GAP T3** |
| **AI / Intelligence** | `scoringContext` z `TendersContext` | Tekst: „Ładowanie kontekstu workflow/decyzji…” gdy `!intelligenceCtx` (`TenderDetailPanel` L697–711) | ➖ nie w AC TEUX-5 | ➖ **defer** (rzadki edge; po `pipeline.loading` zwykle OK) |
| **Operator** | `busy` w `buildWorkflowPrimaryActionView` | `Loader2` w CTA (`TenderWorkflowPrimaryAction` L173); `TenderWorkflowOperatorActionBar` spinners na akcjach | Inline `Loader2` w przycisku — **zachować** | ✅ **PASS** |

### 2.1 Moduł init (brama globalna)

| Lokalizacja | As-is | Target |
|-------------|-------|--------|
| `TendersModule.tsx` L193–198 | Centrowany tekst `TENDERS_MODULE_LABELS.loading` | Skeleton: `TendersModuleHeader` placeholder + 3 karty |
| `TendersView.tsx` L422–427 | Identyczny pattern tekstowy | Ten sam shell co moduł **lub** wspólny `TenderModuleLoadingShell` |
| `TendersShortcutPanel.tsx` L47–51 | Tekst w kafelku Pulpitu | **Poza DF TEUX-5** — opcjonalny follow-up (TEUX-7 polish) |

**Uwaga architektoniczna:** dziś `pipeline.loading` blokuje **cały** moduł — lista i mapa nie renderują się równolegle. Skeleton modułu **=** skeleton listy przy pierwszym wejściu. Po IMPLEMENT uniknąć **podwójnego** skeleton (moduł + lista) przy refetch — `pipeline.loading` jest tylko na cold mount / pełny reload (`useTendersPipeline` L199–225).

### 2.2 Detal V4 (`TenderDetailPage`)

| Aspekt | As-is | Uwagi |
|--------|-------|-------|
| **Transition loading** | `pendingTab` optimistic switch (L69–76) — natychmiastowa zmiana tab bez skeleton | OK UX transition; **nie** mieszać z data-loading |
| **Command Layer** | Zawsze widoczny z `bootstrapItem` | Brak skeleton chrome — DF wspomina, AC TEUX-5 nie wymaga |
| **`autoRunning`** | Przekazywane do `TenderWorkflowPrimaryAction` → `busy` + disabled CTA | **AC T4** — tylko UI label, nie logika |
| **Stepped label** | Brak — banner w `TenderDetailPanel` to jedna linia | IMPLEMENT: helper kroków bez zmiany bootstrap hook |

### 2.3 Dokumenty

| Komponent | Loading behavior |
|-----------|------------------|
| `TenderDocumentsSummaryHeader` | Renderuje `summary` z props — **brak** branch loading |
| `TenderAttachmentsPanel` | `loadingDocs` → spinner w przycisku Odśwież + tekst gdy zero docs |
| `TenderDocumentsWorkspace` | Deleguje do paneli — brak skeleton warstwy |

**Target T2:** owijka lub sibling `TenderDocumentsSummarySkeleton` gdy `loadingDocs && !summaryReady` (warunek do ustalenia w IMPLEMENT bez zmiany resolverów trust).

### 2.4 BOQ / Kosztorys

| Stan | UI |
|------|-----|
| `pro.hasCatalog` | Pełny explorer + KPI — bez skeleton |
| `!pro.hasCatalog && inProgress` | **Nic** (null) — użytkownik widzi pustkę pod `KosztorysProcessStatusBar` |
| `KosztorysProcessStatusBar` | Progressive phase label (`displayPhase.label`) — **PASS** jako długa operacja |

**Target T3:** `TenderBoqTableSkeleton` (8 wierszy) pod status barem gdy `inProgress && !pro.hasCatalog`.

### 2.5 Mapa · Strategia · Pulpit

| Widok | Loading |
|-------|---------|
| `TendersMapTab` | Czeka na `pipeline.loading` w `TendersModule` — brak własnego UI |
| `TendersStrategyTab` | Brak — dane z już załadowanego pipeline |
| `TendersShortcutPanel` | Tekst — jak moduł |

**Werdykt:** mapa/strategia **nie** są w AC TEUX-5; zmiana mapy = scope creep.

---

## 3. Skeleton usage — inwentaryzacja

### 3.1 Komponent bazowy

```1:13:src/app/components/ui/skeleton.tsx
import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
```

| Aspekt | `ui/skeleton.tsx` | DF §2.8 token |
|--------|-------------------|---------------|
| Tło | `bg-accent` | `bg-secondary/60` |
| Animacja | `animate-pulse` | `animate-pulse` |
| Radius | `rounded-md` | `rounded-md` |

**Rekomendacja REUSE:** cienki wrapper `TenderUxSkeleton` (nowy plik) = `Skeleton` + `className="bg-secondary/60"` — **bez** edycji `skeleton.tsx` (globalny sidebar).

### 3.2 Użycie w repo

| Plik | Import `Skeleton` |
|------|-------------------|
| `src/app/components/ui/sidebar.tsx` | **TAK** |
| Moduł Przetargi (`src/app/**`, `src/app/tenders/**`) | **NIE** |

### 3.3 Planowane komponenty (DF — nie istnieją)

| Komponent | Lokalizacja proponowana | Elementy |
|-----------|-------------------------|----------|
| `TenderListCardSkeleton` | `src/app/tenders/list/` | Stripe + 2 linie tytułu + meta pills (match TEUX-3) |
| `TenderModuleLoadingShell` | `src/app/tenders/loading/` | Header pulse + 3× card skeleton |
| `TenderDocumentsSummarySkeleton` | `src/app/tenders/loading/` | 5 slotów grid 2-col + readiness chips pulse |
| `TenderBoqTableSkeleton` | `src/app/tenders/loading/` | 8 wierszy + search bar pulse |

---

## 4. Spinner usage — inwentaryzacja (zachować)

| Plik | Pattern | Zgodność DF |
|------|---------|-------------|
| `TenderWorkflowPrimaryAction.tsx` | `Loader2` w CTA gdy `view.busy` | ✅ inline action |
| `TenderWorkflowOperatorActionBar.tsx` | `Loader2` upload/analyze/export | ✅ inline action |
| `TenderAttachmentsPanel.tsx` | `Loader2` refresh + skanowanie | ⚠️ zastąpić **header** skeletoniem; przycisk zostaje |
| `TenderDetailPanel.tsx` | `Loader2` banner `autoRunning` | ⚠️ rozszerzyć stepped label |
| `TenderAnalysisStatusStrip.tsx` | Ikony pending (nie zawsze spin) | ✅ progressive |
| `KosztorysProcessStatusBar.tsx` | `RefreshCw` spin na retry | ✅ inline action |
| `TenderKosztorysWorkspace.tsx` | `Loader2` download ATH | ✅ inline action |
| `TendersModule.tsx` / `TendersStrategyContent.tsx` | `RefreshCw` spin na sync BZP | ✅ sync indicator — nie loading gate |

**Zakaz DF:** pełnoekranowy spinner na całą zakładkę BOQ/Dokumenty zamiast skeleton.

---

## 5. Empty · transition · progressive loading

### 5.1 Empty loading (loading → empty)

| Przejście | As-is | Owner |
|-----------|-------|-------|
| `pipeline.loading` → `items.length===0` | Po tekście → lista pusta / filtry | **TEUX-6** (empty copy) |
| `loadingDocs` → brak załączników | Tekst skanowania → empty platform state | TEUX-5 skeleton **przed** empty; copy = TEUX-6 |
| BOQ `inProgress` → brak katalogu | Pustka → empty message lub CTA Dokumenty | T3 skeleton; empty = TEUX-6 |

**Reguła:** TEUX-5 nie implementuje `TenderUxEmptyState` — tylko shells podczas oczekiwania na dane.

### 5.2 Transition loading

| Mechanizm | Plik | Opis |
|-----------|------|------|
| `pendingTab` | `TenderDetailPage.tsx` | Optimistic tab — **nie** dodawać skeleton na zmianę tab |
| V4 navigate | `openTenderDetailV4` | Lista → detal: moduł już załadowany — brak module skeleton |
| Workspace lazy | `TenderDetailPanel` | Zakładki workspace mount on demand — bez skeleton między tabami (OK) |

### 5.3 Progressive loading

| Warstwa | Mechanizm | Ocena |
|---------|-----------|-------|
| Pipeline mount | `loadTendersPipeline` → `setLoading(false)` | Jednofazowy — skeleton do końca |
| Dokumenty bootstrap | `useTenderDocumentsBootstrap` → `autoRunning` | Wielofazowy — **stepped label** brakuje |
| Dossier / kosztorys | `KosztorysProcessStatusBar` + `TenderAnalysisStatusStrip` | ✅ progressive labels |
| BOQ dane | KPI → explorer gdy `hasCatalog` | ✅ progressive content; **brak** skeleton fazy pośredniej |
| Map tiles | OSM lazy | Niski priorytet |

---

## 6. REUSE — werdykt

| Opcja | Werdykt | Uzasadnienie |
|-------|---------|--------------|
| Import `Skeleton` z `components/ui/skeleton.tsx` | **GO** | Jedyny SSOT pulse w app |
| Wrapper `TenderUxSkeleton` | **GO** | Mapuje DF token bez TOKEN FREEZE thaw |
| Duplikat `<div className="animate-pulse…">` inline | **NO** | Łamie #TEUX-012 spójność |
| Edycja `skeleton.tsx` globalnego | **NO** | Wpływ sidebar · poza bundle |
| Nowe tokeny w `tender-ux-tokens.ts` | **NO** (freeze) | className override wystarczy |

---

## 7. Boundary — #CORE-013 / #CORE-014 / Protected Core

### 7.1 #CORE-013 — jeden bundle, jeden commit

| Kryterium | Projekcja TEUX-5 |
|-----------|------------------|
| Jeden cel (Loading shells) | **PASS** |
| Szacunek plików | **8–10** (6 nowych + 4–5 edycji prezentacji + test + manifest) |
| Mixed CORE+FEATURE | **PASS** — brak plików klasy CORE w allowliście |
| Osobny commit od TEUX-6 | **PASS** — empty states następny bundle |

### 7.2 #CORE-014 — FEATURE boundary

| Klasa | Pliki TEUX-5 | Dozwolone |
|-------|--------------|-----------|
| FEATURE UI | `tenders/loading/*`, `tenders/list/TenderListCardSkeleton.tsx` | ✅ |
| FEATURE UI | `TendersModule.tsx`, `TendersView.tsx` — tylko branch `pipeline.loading` | ✅ |
| FEATURE UI | `TenderDocumentsSummaryHeader.tsx` lub workspace parent — skeleton slot | ✅ |
| FEATURE UI | `TenderKosztorysWorkspace.tsx` / `KosztorysBoqExplorerSection.tsx` — shell | ✅ |
| FEATURE UI | `TenderDetailPanel.tsx` — **tylko** banner stepped label (copy) | ✅ |
| CORE / Protected | `cloud-sync.ts`, `CloudLoader.tsx`, Edge | ❌ |
| CORE / Protected | `useTendersPipeline.ts` — logika `loading` | ❌ |
| CORE / Protected | `useTenderPipelineRuntime.ts`, `useTenderDocumentsBootstrap.ts` | ❌ |
| CORE / Protected | `tender-workflow-primary-action.ts` — `busy`/`disabled` | ❌ **AC T4** |
| CORE / Protected | Parsery, dossier merge, trust scoring libs | ❌ |
| TOKEN FREEZE | `tender-ux-tokens.ts` | ❌ |

### 7.3 Protected Core ([`CORE-PROTECTED-ARCHITECTURE.md`](./CORE-PROTECTED-ARCHITECTURE.md))

| Strefa | Dotyk TEUX-5 |
|--------|--------------|
| Payroll / PWRB / KV merge | **ZERO** |
| `tender-detail-nav.ts` / routing V4 | **ZERO** |
| NG-02 bootstrap orchestrator | **ZERO** |
| Trust / scoring computation | **ZERO** — tylko warstwa gdy dane już są |

**Boundary verdict (projekcja):** **PASS** — przy trzymaniu allowlisty §8.

---

## 8. Allowlista IMPLEMENT (propozycja)

### 8.1 Nowe pliki (CREATE)

| Plik | Rola |
|------|------|
| `src/app/tenders/loading/TenderUxSkeleton.tsx` | Wrapper `Skeleton` + DF token |
| `src/app/tenders/loading/TenderModuleLoadingShell.tsx` | Init modułu: header + 3 karty |
| `src/app/tenders/list/TenderListCardSkeleton.tsx` | Pojedyncza karta listy |
| `src/app/tenders/loading/TenderDocumentsSummarySkeleton.tsx` | 5 slotów summary |
| `src/app/tenders/loading/TenderBoqTableSkeleton.tsx` | 8 rows + search pulse |
| `src/app/tenders/loading/tender-loading-step-label.ts` | Copy stepped label (pure UI) |
| `scripts/test-tender-loading-teux5.mjs` | Gate `LIB-TENDER-LOADING-TEUX5` |

### 8.2 Edycje dozwolone (MODIFY)

| Plik | Dozwolony diff |
|------|----------------|
| `src/app/tenders/TendersModule.tsx` | Zamiana tekstu L193–198 → `TenderModuleLoadingShell` |
| `src/app/TendersView.tsx` | Zamiana tekstu L422–427 → shell / 3 skeleton |
| `src/app/TenderDocumentsSummaryHeader.tsx` **lub** `TenderDocumentsWorkspace.tsx` | Warunkowy skeleton (T2) |
| `src/app/TenderKosztorysWorkspace.tsx` | Wstaw `TenderBoqTableSkeleton` w branch `inProgress` (T3) |
| `src/app/TenderDetailPanel.tsx` | Stepped label zamiast jednej linii L611–614 |
| `src/app/TenderAttachmentsPanel.tsx` | Usunąć pełnoekranowy tekst skanowania gdy skeleton header (opcjonalnie) |
| `test-infra/test-manifest.json` | Wpis suite TEUX-5 |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | Wersja **2.63.58** (patch) |

### 8.3 Zakazane pliki (NIE DOTYKAĆ)

```text
src/lib/cloud-sync.ts
src/app/CloudLoader.tsx
supabase/functions/**
src/app/tenders/strategy/hooks/useTendersPipeline.ts
src/app/hooks/useTenderPipelineRuntime.ts
src/app/hooks/useTenderDocumentsBootstrap.ts
src/lib/tender-workflow-primary-action.ts
src/lib/tender-detail-nav.ts
src/lib/tenders-bzp*.ts (parser/scoring)
src/lib/tender-ux-tokens.ts          ← TOKEN FREEZE
src/app/tenders/list/TenderListMobileCard.tsx   ← TEUX-3 CLOSED
src/app/tenders/list/TenderListDesktopCard.tsx
src/app/TenderDetailCommandLayer.tsx            ← TEUX-4 CLOSED (bez skeleton chrome w v1)
src/app/tenders/mobile/TenderModuleNavSheet.tsx
```

### 8.4 Scope — IN / OUT

| IN (TEUX-5) | OUT (defer) |
|-------------|-------------|
| Moduł init skeleton (T1) | Mapa loading overlay |
| Lista 3× card skeleton | `TendersShortcutPanel` skeleton (Pulpit) |
| Docs summary skeleton (T2) | `TenderUxEmptyState` (TEUX-6) |
| BOQ 8-row skeleton (T3) | AI/intelligence text → skeleton |
| Stepped label `autoRunning` | Command Layer full skeleton |
| Test `LIB-TENDER-LOADING-TEUX5` | Zmiana logiki CTA disabled (T4) |
| Inline `Loader2` w CTA/akcjach — **zachować** | Refetch skeleton (sync BZP) — opcjonalny backlog |

---

## 9. Acceptance Criteria — mapa audytu → IMPLEMENT

| AC | Stan as-is | Dowód IMPLEMENT |
|----|------------|-----------------|
| **T1** Moduł loading ≠ sam tekst | ❌ tekst w `TendersModule` + `TendersView` | `data-teux5-module-loading` + skeleton DOM |
| **T2** Docs summary skeleton | ❌ brak | `TenderDocumentsSummarySkeleton` visible when loading |
| **T3** Kosztorys skeleton | ❌ null branch | 8 rows `data-teux5-boq-skeleton` |
| **T4** CTA disabled logic bez zmian | ✅ | Test: `buildWorkflowPrimaryActionView` unchanged · zero diff `tender-workflow-primary-action.ts` |

---

## 10. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| R1 | Skeleton karty ≠ wymiary TEUX-3 → layout shift | Średni | Kopiuj classNames z `TenderListMobileCard` / desktop card |
| R2 | BOQ blank flash przed skeleton | Średni | Mount skeleton w tym samym branch co `inProgress` |
| R3 | Podwójny loading UI (tekst + skeleton) | Niski | Usunąć tekstowe early return w tym samym PR |
| R4 | Command Layer wysokość mobile | Niski | Nie dodawać pełnego CL skeleton w v1 |
| R5 | Regresja `busy`/disabled CTA | Średni | Test T4 + smoke istniejący workflow |
| R6 | `TenderAttachmentsPanel` — usunięcie tekstu bez skeleton | Niski | T2 najpierw summary; potem cleanup spinnera w headerze |
| R7 | TOKEN FREEZE — pokusa nowych tokenów | Niski | `TenderUxSkeleton` wrapper only |

---

## 11. Test gate (planowany — nie uruchamiany w AUDIT)

| Element | Wartość |
|---------|---------|
| Skrypt | `scripts/test-tender-loading-teux5.mjs` |
| Manifest ID | `LIB-TENDER-LOADING-TEUX5` |
| Gate | `npm run test:infra -- --suite tender-loading-teux5` lub gate B `scope:tenders` |
| Min. asercje | T1–T4 · import graph (brak zakazanych plików) · brak diff `tender-workflow-primary-action.ts` |

---

## 12. Current → Target (skrót)

| Obszar | Current | Target TEUX-5 |
|--------|---------|---------------|
| Moduł init | Tekst wyśrodkowany | `TenderModuleLoadingShell` |
| Lista cold | Tekst | 3× `TenderListCardSkeleton` |
| Docs summary | Live data / spinner | `TenderDocumentsSummarySkeleton` |
| BOQ wait | `null` | `TenderBoqTableSkeleton` ×8 |
| Parser banner | 1 linia + spin | Stepped label §2.8 |
| Operator CTA | `Loader2` + disabled | **Bez zmian** |
| Skeleton SSOT | `ui/skeleton.tsx` unused | `TenderUxSkeleton` wrapper |

---

## 13. Werdykt końcowy

```text
╔══════════════════════════════════════════════════════════╗
║  TEUX-5 LOADING — AUDIT COMPLETE                         ║
╠══════════════════════════════════════════════════════════╣
║  GAP G-07 (tekst-only loading)     OPEN → zamyka TEUX-5  ║
║  Skeleton w Przetargach            BRAK                    ║
║  REUSE ui/skeleton.tsx             GO (wrapper)            ║
║  #CORE-013 / #CORE-014 (plan)    PASS (projekcja)        ║
║  Protected Core                    ZERO dotyku (plan)      ║
║  TOKEN FREEZE                      ACTIVE — bez thaw       ║
╠══════════════════════════════════════════════════════════╣
║  REKOMENDACJA:  READY FOR OWNER GO → IMPLEMENT TEUX-5    ║
║  BLOKUJĄCE:     Owner GO · STABILIZATION WINDOW policy     ║
║  NASTĘPNY:      TEUX-6 Empty (po CLOSEOUT TEUX-5)        ║
╚══════════════════════════════════════════════════════════╝
```

**Owner action:** `GO IMPLEMENT TEUX-5` · po IMPLEMENT: release **2.63.58** · test gate · verify FAST · closeout doc.

---

*AUDIT ONLY · NG-06-TEUX · TEUX-5 Loading · 2026-07-07 · baseline prod 2.63.57 (`d965311`)*
