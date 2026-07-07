# NG-06-TEUX — TEUX-6 Empty States · AUDIT REPORT

> **Status:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (wymaga Owner GO)  
> **Tryb:** AUDIT ONLY · zero diff `src/` · zero BUILD/TEST/COMMIT/PUSH  
> **Data audytu:** 2026-07-07  
> **Baseline prod:** UI **2.63.58** · commit **`061fc9a`** · **TEUX-1…5 CLOSED** · **TOKEN FREEZE ACTIVE**  
> **SSOT epic:** [`NG-06-TEUX-DESIGN-FREEZE.md`](./NG-06-TEUX-DESIGN-FREEZE.md) §2.9 · §4 TEUX-6 · §4a DoD  
> **Poprzedni bundle:** [`NG-06-TEUX-TEUX5-CLOSEOUT.md`](./NG-06-TEUX-TEUX5-CLOSEOUT.md) · [`NG-06-TEUX-TEUX5-RELEASE-VERIFICATION.md`](./NG-06-TEUX-TEUX5-RELEASE-VERIFICATION.md)

```text
WERDYKT AUDYTU:  READY FOR OWNER GO (IMPLEMENT)
RYZYKO:          NISKIE–ŚREDNIE — PlatformDocumentEmptyState refactor · lista 2-copy detection
SCOPE CREEP:     WYSOKIE — jeśli Strategia/AI/Profil/BOQ filtry w tym samym bundlu
TOKEN FREEZE:    ACTIVE — import tokenów OK · edycja tender-ux-tokens.ts ZAKAZANA
GAP G-08:        OPEN — empty states niespójne → zamyka TEUX-6
```

---

## 0. Cel audytu

Przeprowadzić pełny **AUDIT warstwy Empty States** w module Przetargi: widoki bez danych (lista · dokumenty · BOQ · mapa · AI · Strategia · Profil · załączniki), aktualne komunikaty (copy · CTA · ikony · hierarchia), możliwość **REUSE** `TenderUxEmptyState` i istniejących komponentów UI, granice **#CORE-013 / #CORE-014** i Protected Core.

**Poza audytem:** implementacja, BUILD, TEST, commit, push, TEUX-7+, edycja `tender-ux-tokens.ts`.

---

## 1. Stan wyjściowy (as-is @ 2.63.58)

| Artefakt docelowy (DF §2.9 / §4 TEUX-6) | Stan w repo | Werdykt |
|----------------------------------------|-------------|---------|
| `TenderUxEmptyState` | **BRAK** | Do utworzenia |
| Migracja lista | Tekst + `Filter` 32px — **brak CTA** | **GAP** |
| Migracja mapa | Tekst `text-xs` w `TendersMapPanel` | **GAP** |
| Migracja dokumenty platforma | `PlatformDocumentEmptyState` (lokalny) | **Częściowy** — refactor do SSOT |
| Migracja kosztorys | `KosztorysEmptyMessage` — sam `<p>` | **GAP** — brak CTA Dokumenty |
| Deep link CTA | `openTenderDetailV4` / `buildTenderDetailPath` istnieją (TEUX-1) | **REUSE GO** |
| `LIB-TENDER-EMPTY-STATES-TEUX6` | **BRAK** w manifeście | Do dodania w IMPLEMENT |
| Gap **G-08** (niespójne empty) | **OPEN** | Zamyka TEUX-6 |

### 1.1 Baseline zależności (TEUX-1…5)

| Zależność | Status | Wpływ na TEUX-6 |
|-----------|--------|-----------------|
| TEUX-2 tokeny / `TenderUxBadge` | **CLOSED** | Empty state: import `TEUX_FONT_*` read-only |
| TEUX-3 list cards | **CLOSED** | Empty nie zastępuje kart — tylko blok zero wyników |
| TEUX-5 loading skeletons | **CLOSED** | **Nie mieszać** empty z `inProgress` / `loadingDocs` |
| `openTenderDetailV4` | **CLOSED** | Kosztorys / mapa CTA nawigacja |
| `buildTenderDocumentsTabSummary` | bez zmian | Summary **filled** gdy nie loading — empty osobno |

---

## 2. Macierz empty states — 8 warstw (as-is)

Legenda: ✅ częściowo OK · ❌ GAP vs DF · ➖ poza scope DF TEUX-6 (audit only)

| Warstwa | Trigger | UI as-is | Ikona | CTA | Werdykt |
|---------|---------|----------|-------|-----|---------|
| **Lista przetargów** | `displayList.length===0 && todayItems.length===0` | `Filter` 32px + 1 linia tekstu (`TendersView` L842–849) | `Filter` muted/50 | **Brak** | ❌ **GAP T2** |
| **Dokumenty (platforma)** | `showEmptyPlatformState` | `PlatformDocumentEmptyState` — karta `rounded-lg border` + copy platformy + linki | brak centralnej ikony | External link / Szukaj u zamawiającego | ⚠️ **refactor** do `TenderUxEmptyState` |
| **Załączniki (grupy)** | `group.items.length===0` | `Brak dokumentów` `text-[10px]` w accordion | brak | brak | ❌ **GAP** (inline) |
| **BOQ (kosztorys workspace)** | `!pro.hasCatalog` + empty branch | `KosztorysEmptyMessage` — `text-sm` multiline | brak | tekst „Otwórz Dokumenty” **bez przycisku** | ❌ **GAP T3** |
| **BOQ (explorer filtry)** | search/filter/catalog empty | `text-sm text-muted-foreground` per case (`KosztorysBoqExplorerSection`) | brak | brak | ➖ polish opcjonalny (poza AC) |
| **Mapa** | `points.length===0` | 1 linia `text-xs` (`TendersMapPanel` L172–175) | brak | brak „Przejdź do listy” | ❌ **GAP** |
| **AI / Intelligence** | brak `intelligenceCtx` | „Ładowanie kontekstu workflow/decyzji…” (`TenderDetailPanel`) | brak | — | ➖ **loading/edge**, nie empty SSOT |
| **AI / Przetarg hub** | brak brief | „Brak skróconych informacji z dokumentów.” (`TenderPrzetargWorkspace`) | brak | brak | ➖ defer TEUX-7d / polish |
| **Strategia** | per-panel zero | Rozproszone `Brak…` w panelach (BestOpportunity, ActionCenter, Monitoring…) | brak spójnej ikony | częściowo „Odśwież BZP” w copy | ➖ DF: „Brak pozycji” minimal — **OUT** core TEUX-6 |
| **Profil firmy** | puste sekcje formularza | Inline `Brak wpisów — kliknij Dodaj` (`TenderCompanyProfilePanel`) | brak | Dodaj w formularzu | ➖ **OUT** — formularz, nie empty module |

### 2.1 Lista przetargów — copy i detekcja

**Obecna logika** (`TendersView.tsx` L846–848):

| Warunek | Copy as-is |
|---------|------------|
| `localFilter==="actionable" && !mineOnly` | „Brak aktywnych przetargów do rozważenia — kliknij „Odśwież z BZP”” |
| inaczej | „Brak przetargów dla wybranych filtrów” |

**GAP vs DF §2.9:**

| Scenariusz DF | Copy docelowe | Primary CTA | Secondary |
|---------------|---------------|-------------|-----------|
| **Filtry → 0** | Brak przetargów dla filtrów | Wyczyść filtry | Odśwież z BZP |
| **Pusta baza** | Brak aktywnych przetargów | Odśwież z BZP | Zmień zakres listy |

**Problemy as-is:**

1. **Brak przycisków CTA** — tylko tekst sugeruje akcję.
2. **Detekcja niepełna** — nie rozróżnia `pipeline.items.length===0` (cold baza) od „filtry wycięły wszystko” poza `actionable`.
3. **Ikona** `Filter` — OK dla filtrów; dla pustej bazy DF sugeruje neutralny empty (np. `Inbox` / `Scale`).
4. **Hierarchia** — `text-sm text-muted-foreground` zamiast `teux-font-title` + `teux-font-body`.

**Propozycja detekcji (UI-only, bez zmiany pipeline):**

```text
isEmptyBase     = pipeline.items.length === 0
isFilteredEmpty = !isEmptyBase && displayList.length === 0 && todayItems.length === 0
```

### 2.2 Dokumenty i załączniki

| Warstwa | Plik | Zachowanie |
|---------|------|------------|
| **Platform empty** | `TenderAttachmentsPanel` → `PlatformDocumentEmptyState` | Rich copy z `resolveTenderPlatformDocumentStatus` — platformy Logintrade, e-Zamówienia, SmartPZP itd. |
| **Grupa accordion pusta** | ten sam plik L380 | Minimalny tekst „Brak dokumentów” |
| **Loading** | TEUX-5 skeleton | Gdy `loadingDocs && docs.length===0` — **nie** empty |

`PlatformDocumentEmptyState` **nie jest** generycznym empty — to **domenowy** renderer statusu platformy. **REUSE:** opakować body w `TenderUxEmptyState` lub slot `children` + zachować CTA platformowe.

### 2.3 BOQ / Kosztorys

| Stan | UI | Copy SSOT |
|------|-----|-----------|
| Formal document | `KOSZTORYS_V4_EMPTY_FORMAL` | „Przejdź do zakładki Dokumenty” (tekst) |
| No positions | `KOSZTORYS_V4_EMPTY_NO_POSITIONS` | „Otwórz Dokumenty i uruchom analizę…” |
| Waiting / in progress | TEUX-5 `TenderBoqTableSkeleton` | **nie empty** |
| Default CTA path | `TenderKosztorysWorkspace` L343 | „Otwórz zakładkę Dokumenty…” — tekst only |

**AC T3:** primary CTA → `openTenderDetailV4(navigate, item.id, "dokumenty")` (lub tab slug SSOT) — **tylko UI**, bez zmiany parsera.

**BOQ Explorer** (filtr/szukaj): komunikaty w `kosztorysFilterEmptyMessage` — **localized empty**, nie module empty; migracja opcjonalna w TEUX-6 lub defer TEUX-7 polish.

### 2.4 Mapa

| Kontekst | Empty as-is | DF target |
|----------|-------------|-----------|
| `TendersMapTab` | `TendersMapPanel` accordion, `points.length===0` | Tytuł + CTA „Przejdź do listy” |
| `TendersView` embedded map | ten sam komponent | ten sam SSOT |

Copy as-is: „Brak aktywnych przetargów we Wrocławiu do pokazania na mapie.” — **bez** CTA, **bez** ikony 32px.

### 2.5 AI · Strategia · Profil (audit inventory)

| Obszar | Przykład copy | Rekomendacja bundle |
|--------|---------------|---------------------|
| **AI workflow** | „Ładowanie kontekstu workflow…” | **OUT** — to loading/edge (TEUX-5 defer) |
| **Przetarg hub** | „Brak skróconych informacji z dokumentów.” | **OUT** — TEUX-7d (G-03 AI copy) |
| **Strategia BestOpportunity** | „Brak aktywnych przetargów — odśwież pipeline z BZP.” | **OUT** — panel KPI, nie macierz DF |
| **Strategia ActionCenter** | „Brak zadań na dziś — sytuacja stabilna.” | **OUT** |
| **Profil** | „Brak wpisów — kliknij Dodaj.” | **OUT** — inline form empty |

**Werdykt:** User audit obejmuje inwentaryzację; **IMPLEMENT TEUX-6** wg DF = lista · mapa · dokumenty platforma · kosztorys **tylko**.

---

## 3. Hierarchia wizualna — porównanie as-is vs DF §2.9

| Element | DF `TenderUxEmptyState` | As-is (typowy) | Gap |
|---------|-------------------------|----------------|-----|
| **Ikona** | Lucide 32px `text-muted-foreground/50` | `Filter` 32 / brak / `MapPin` 48 (Roboty) | Niespójne |
| **Tytuł** | `teux-font-title` | `text-sm` lub `text-xs` | Brak tytułu osobno |
| **Opis** | `teux-font-body text-muted-foreground` | jedna linia mieszana | Brak hierarchii |
| **Primary CTA** | przycisk `min-h-[44px]` | brak lub link inline | **Brak na liście/mapa/BOQ** |
| **Secondary CTA** | link style | brak | **Brak** |
| **Kontener** | wyśrodkowany blok `py-8` | `text-center py-8` (lista) / `px-3 py-2.5` (platform) | Różne tła |

**Wzorzec referencyjny (poza Przetargi):** `JobsDetailEmptyState` — ikona 48px + tytuł + opis + **dual CTA grid**. **Nie importować** bezpośrednio — inny layout (desktop drill-in), ale **wzorzec hierarchii** do skopiowania w `TenderUxEmptyState`.

---

## 4. REUSE — werdykt

| Opcja | Werdykt | Uzasadnienie |
|-------|---------|--------------|
| **Nowy `TenderUxEmptyState`** w `tenders/design-system/` | **GO** | SSOT DF §2.9 · obok `TenderUxBadge` |
| Import `TEUX_FONT_TITLE` / `TEUX_FONT_BODY` | **GO** | TOKEN FREEZE — read-only |
| `JobsDetailEmptyState` | **NO** (bezpośrednio) | Roboty domain · inne props |
| `PlatformDocumentEmptyState` | **REFACTOR** | Zachować logikę statusu · UI przez wrapper |
| `KosztorysEmptyMessage` | **REPLACE** | Cienki wrapper → `TenderUxEmptyState` |
| `components/ui/command.tsx` `CommandEmpty` | **NO** | Command palette — inny kontekst |
| `tender-detail-v4-display.ts` empty copy | **KEEP** | SSOT tekstów — **nie przenosić** do UI bez potrzeby |
| `openTenderDetailV4` / `buildTenderDetailPath` | **GO** | CTA nawigacja kosztorys → dokumenty |

### 4.1 Proponowany API `TenderUxEmptyState`

```tsx
// Propozycja IMPLEMENT (nie istnieje)
TenderUxEmptyState({
  icon: LucideIcon,
  title: string,
  description?: string,
  primaryAction?: { label, onClick },
  secondaryAction?: { label, onClick },
  className?,
  "data-teux6-empty"?: string, // kontekst: list-filters | list-base | map | docs-platform | kosztorys
})
```

**Spójność z TEUX-5:** ten sam vertical rhythm `gap-3`, `rounded-xl` gdy karta (opcjonalny variant `variant: "plain" | "card"`).

---

## 5. Mapa copy → target (SSOT DF)

| Kontekst | Tytuł (DF) | Primary | Secondary |
|----------|------------|---------|-----------|
| Lista filtry | Brak przetargów dla filtrów | Wyczyść filtry | Odśwież z BZP |
| Lista pusta baza | Brak aktywnych przetargów | Odśwież z BZP | Zmień zakres listy |
| Mapa | Brak markerów we Wrocławiu | Przejdź do listy | — |
| Dokumenty platforma | Brak dokumentów | Wyszukaj zewnętrzne | (zachować link platformy gdy jest) |
| Kosztorys | Brak kosztorysu | Przejdź do Dokumentów | — |

**Uwaga:** copy platformowe (`emptyMessage` z `tender-platform-awareness`) **zostają** jako `description` — nie nadpisywać logiką platformy.

---

## 6. Boundary — #CORE-013 / #CORE-014 / Protected Core

### 6.1 #CORE-013 — jeden bundle, jeden commit

| Kryterium | Projekcja TEUX-6 |
|-----------|------------------|
| Jeden cel (Empty UI) | **PASS** |
| Szacunek plików | **5–8** (komponent + 4 migracje + copy helper + test) |
| Klasa | **S** per DF |
| Mixed CORE+FEATURE | **PASS** — brak plików CORE |

### 6.2 #CORE-014 — FEATURE boundary

| Klasa | Pliki TEUX-6 | Dozwolone |
|-------|--------------|-----------|
| FEATURE UI | `tenders/design-system/TenderUxEmptyState.tsx` | ✅ |
| FEATURE UI | `TendersView.tsx` — blok empty listy | ✅ |
| FEATURE UI | `TendersMapPanel.tsx` — empty mapy | ✅ |
| FEATURE UI | `TenderAttachmentsPanel.tsx` — platform empty | ✅ |
| FEATURE UI | `TenderKosztorysWorkspace.tsx` — kosztorys empty + CTA | ✅ |
| FEATURE UI | `tender-empty-copy.ts` (opcjonalny) | ✅ |
| CORE | `tender-platform-awareness.ts` | ❌ — tylko odczyt statusu |
| CORE | `tender-detail-v4-display.ts` | ❌ — nie zmieniać stałych bez briefu |
| CORE | `useTendersPipeline.ts` / filtry logika | ❌ |
| CORE | `tender-workflow-primary-action.ts` | ❌ |
| TOKEN FREEZE | `tender-ux-tokens.ts` | ❌ |

### 6.3 Protected Core

| Strefa | Dotyk TEUX-6 |
|--------|--------------|
| Payroll / sync / CloudLoader / Edge | **ZERO** |
| Parser / dossier / bootstrap | **ZERO** |
| Scoring / trust computation | **ZERO** — tylko prezentacja istniejącego statusu |
| NG-02 orchestrator | **ZERO** |

**Boundary verdict (projekcja):** **PASS** przy trzymaniu allowlisty §8.

---

## 7. Allowlista IMPLEMENT (propozycja)

### 7.1 Nowe pliki (CREATE)

| Plik | Rola |
|------|------|
| `src/app/tenders/design-system/TenderUxEmptyState.tsx` | SSOT komponent §2.9 |
| `src/app/tenders/empty/tender-empty-copy.ts` | Opcjonalny: tytuły/CTA listy/mapy (PL) |
| `scripts/test-tender-empty-states-teux6.mjs` | Gate `LIB-TENDER-EMPTY-STATES-TEUX6` |

### 7.2 Edycje dozwolone (MODIFY)

| Plik | Dozwolony diff |
|------|----------------|
| `src/app/TendersView.tsx` | Zamiana bloku L842–849 → `TenderUxEmptyState` + 2-copy + CTA |
| `src/app/TendersMapPanel.tsx` | Empty `points.length===0` → SSOT + CTA lista |
| `src/app/TenderAttachmentsPanel.tsx` | `PlatformDocumentEmptyState` → wrapper / compose |
| `src/app/TenderKosztorysWorkspace.tsx` | `KosztorysEmptyMessage` → `TenderUxEmptyState` + navigate Dokumenty |
| `test-infra/test-manifest.json` | Wpis TEUX-6 |
| `src/app/changelog-data.ts` + `CHANGELOG.md` | **2.63.59** (patch) |

### 7.3 Zakazane pliki (NIE DOTYKAĆ)

```text
src/lib/tender-ux-tokens.ts
src/lib/cloud-sync.ts
src/app/CloudLoader.tsx
supabase/functions/**
src/app/tenders/strategy/hooks/useTendersPipeline.ts
src/lib/tender-platform-awareness.ts          ← logika statusu; copy read-only w UI
src/lib/tender-workflow-primary-action.ts
src/lib/tender-detail-v4-display.ts           ← opcjonalnie: tylko jeśli przenoszenie copy (ZAKAZ bez briefu)
src/app/hooks/useTenderPipelineRuntime.ts
src/app/hooks/useTenderDocumentsBootstrap.ts
src/app/tenders/loading/*                     ← TEUX-5 CLOSED
src/app/tenders/list/TenderList*Card.tsx      ← TEUX-3 CLOSED
src/app/tenders/components/TendersStrategyContent.tsx   ← OUT OF SCOPE
src/app/TenderCompanyProfilePanel.tsx                 ← OUT OF SCOPE
src/app/TenderPrzetargWorkspace.tsx                   ← OUT OF SCOPE (AI)
src/app/kosztorys/KosztorysBoqExplorerSection.tsx       ← opcjonalny defer
```

### 7.4 Scope — IN / OUT

| IN (TEUX-6 DF) | OUT (defer) |
|----------------|-------------|
| `TenderUxEmptyState` reusable | Strategia — wszystkie panele |
| Lista — 2 copy + CTA | Profil firmy — inline form |
| Mapa — empty + CTA lista | AI / intelligence loading copy |
| Dokumenty — platform empty refactor | BOQ explorer filter/search empty |
| Kosztorys — empty + CTA Dokumenty | Załączniki per-group „Brak dokumentów” (opcjonalny follow-up) |
| Test `LIB-TENDER-EMPTY-STATES-TEUX6` | Zmiana treści platform w `tender-platform-awareness` |
| Deep link via `openTenderDetailV4` | TEUX-7a filtry collapsible |

---

## 8. Acceptance Criteria — mapa audytu → IMPLEMENT

| AC | Stan as-is | Dowód IMPLEMENT |
|----|------------|-----------------|
| **T1** Reusable component primary+secondary | ❌ brak komponentu | `TenderUxEmptyState` + props |
| **T2** Lista: filtry vs pusta baza — 2 copy | ⚠️ częściowy copy, brak CTA | `data-teux6-empty="list-filters"` / `list-base` |
| **T3** Kosztorys → CTA Dokumenty | ❌ tekst only | `openTenderDetailV4(..., "dokumenty")` w primary |

---

## 9. Ryzyka

| ID | Ryzyko | Poziom | Mitigacja |
|----|--------|--------|-----------|
| R1 | Pomyłka empty vs TEUX-5 skeleton (`loadingDocs`, `inProgress`) | Średni | Warunki mutual exclusive w workspace |
| R2 | `PlatformDocumentEmptyState` regresja platform (Logintrade, e-Zamówienia…) | Średni | Zachować wszystkie gałęzie statusu · test read-only lib |
| R3 | Lista — błędna detekcja filtry vs baza | Średni | `pipeline.items.length` + explicit filter reset handler |
| R4 | Mapa w dwóch kontekstach (tab vs lista) | Niski | Jeden komponent `TendersMapPanel` |
| R5 | CTA „Zmień zakres listy” — niejasna akcja | Niski | Mapować na reset `localFilter` / scroll do quick bar |
| R6 | Scope creep Strategia/Profil/AI | Wysoki | **STOP** na allowliście · osobne bundle TEUX-7 |
| R7 | TOKEN FREEZE — nowe tokeny empty | Niski | Import `TEUX_FONT_*` only |

---

## 10. Test gate (planowany — nie uruchamiany w AUDIT)

| Element | Wartość |
|---------|---------|
| Skrypt | `scripts/test-tender-empty-states-teux6.mjs` |
| Manifest ID | `LIB-TENDER-EMPTY-STATES-TEUX6` |
| Gate | `npm run test:infra -- --suite tender-empty-states-teux6` lub gate B `scope:tenders` |
| Min. asercje | T1–T3 · import `TenderUxEmptyState` w 4 miejscach · brak diff forbidden libs · `data-teux6-*` |

---

## 11. Current → Target (skrót)

| Obszar | Current | Target TEUX-6 |
|--------|---------|---------------|
| Lista | Filter icon + 1 linia | `TenderUxEmptyState` + dual CTA |
| Mapa | `text-xs` paragraph | SSOT empty + „Przejdź do listy” |
| Dokumenty | `PlatformDocumentEmptyState` custom card | Compose z `TenderUxEmptyState` |
| Kosztorys | `<p>` multiline | SSOT + primary → Dokumenty |
| Załączniki grupy | `text-[10px]` | defer lub micro-migracja |
| Strategia/AI/Profil | rozproszone inline | **bez zmian** w TEUX-6 |

---

## 12. Werdykt końcowy

```text
╔══════════════════════════════════════════════════════════╗
║  TEUX-6 EMPTY STATES — AUDIT COMPLETE                    ║
╠══════════════════════════════════════════════════════════╣
║  GAP G-08 (niespójne empty)        OPEN → zamyka TEUX-6  ║
║  TenderUxEmptyState                BRAK                  ║
║  REUSE JobsDetailEmptyState        wzorzec only          ║
║  #CORE-013 / #CORE-014 (plan)      PASS (projekcja)      ║
║  Protected Core                    ZERO dotyku (plan)      ║
║  TOKEN FREEZE                      ACTIVE                ║
╠══════════════════════════════════════════════════════════╣
║  REKOMENDACJA:  READY FOR OWNER GO → IMPLEMENT TEUX-6    ║
║  BLOKUJĄCE:     Owner GO · nie mieszać z TEUX-7          ║
║  NASTĘPNY:      TEUX-7+ polish — po TEUX-6 CLOSEOUT      ║
╚══════════════════════════════════════════════════════════╝
```

**Owner action:** `GO IMPLEMENT TEUX-6` · po IMPLEMENT: release **2.63.59** · test gate · verify FAST.

---

*AUDIT ONLY · NG-06-TEUX · TEUX-6 Empty States · 2026-07-07 · baseline prod 2.63.58 (`061fc9a`)*
