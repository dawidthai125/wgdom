# SESSION HANDOFF — UX.1 Tender Workspace (UX.1A + UX.1B + ARCH-001)

> **⚠️ SUPERSEDED:** Obecna architektura Workflow (V4: Hub, Process Strip, Sticky CTA, zakładki Przetarg/Decyzja) — **SSOT:** [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md). Poniższa treść zachowana jako dokumentacja historyczna UX.1 (2.53.x).

> **Status:** **COMPLETE (historyczne)** · prod **v2.53.4** · commit **`3b5da74`**  
> **Hasło agenta:** „kontynuuj WGDOM”  
> **Data closeout:** 2026-06-13  
> **Architektura techniczna (aktualna):** [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md) · skrót w [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.9a

---

## 1. Executive summary

Seria **UX.1** rozwiązuje problem **informacyjnego przeciążenia** ekranu pojedynczego przetargu po sprintach P2-E / P2-F / P2-G. Moduł miał ~30 funkcji na jednej długiej stronie (~8–20 viewportów scrollu) — użytkownik tracił orientację.

| Etap | Wersja | Commit | Skrót |
|------|--------|--------|-------|
| **AUDIT UX.1** | — | — | READ ONLY · werdykt GO → Wariant C (5 workspace) |
| **UX.1A** | 2.53.1 | `8615d0b` | Reorganizacja sekcji bez tabs · sticky summary · dedup |
| **P0 HOTFIX** | 2.53.2 | `7392c82` | Biały ekran — cykl ESM cloud-sync ↔ calibration |
| **ARCH-001** | 2.53.3 | `53451ed` | Dokumentacja cykli · `audit-import-cycles` |
| **AUDIT UX.1B FINAL** | — | — | READ ONLY · architektura 5 workspace · Anti-CC |
| **UX.1B** | **2.53.4** | **`3b5da74`** | **5 zakładek workspace · lazy render** |

**Werdykt:** UX.1 **CLOSED** dla warstwy architektury UI przetargu. Kolejne feature’y (P2-G.3C/D/E, P2-F.6) wchodzą **do istniejących workspace**, nie jako nowe taby.

---

## 2. Problem biznesowy (dlaczego UX.1)

- Jeden rozwinięty przetarg = przewijanie wielu ekranów zanim użytkownik dotrze do wyceny / oferty.
- Brak modelu mentalnego „w której fazie procesu jestem?”.
- Ryzyko powrotu do wzorca **Command Center** (SUPERSEDED v2.51.0) — doklejanie kolejnych paneli na jednej osi scrollu.

**Nie był to brak funkcji** — była **zła hierarchia prezentacji**.

---

## 3. Docelowa architektura (UX.1B — obowiązująca)

### 3.1 Warstwy modułu Przetargi

```text
TendersModule (5 zakładek modułu)
  Lista | Strategia | Mapa | Profil | Ustawienia
    └── TendersView → TenderDetailPanel
          ├── Shell (zawsze widoczny)
          │     TenderSummaryBar (sticky)
          │     TenderWorkspaceTabBar (5 tabs)
          └── Jeden aktywny workspace (lazy mount)
```

### 3.2 Pięć workspace (+ shell)

| ID | Etykieta PL | Pytanie użytkownika | Komponenty |
|----|-------------|---------------------|------------|
| `overview` | Przegląd | Czy warto startować i co pilne? | Monitoring, akcje, BidPrep (overview), skróty, notatki |
| `documents` | Dokumenty | Jakie dokumenty / co mówi SWZ? | Attachments, dossier, HTML BZP, SWZ meta, keywords |
| `qualification` | Kwalifikacja | Czy spełniamy warunki? | Participation, Works, Fit, pełne wadium, referencje |
| `valuation` | Wycena | Za ile startować? | BidProposalPanel, historia szacunku |
| `offer` | Oferta | Co z ofertą po złożeniu? | OfferSection, wynik BZP, kalibracja |

**Twardy limit: max 5 workspace. Nigdy 6.** (Anti Command Center)

### 3.3 Shell

- **`TenderSummaryBar`** — status pipeline, termin, wartość SSOT, X/6 gotowych, pilne (monitoring count).
- **`TenderWorkspaceTabBar`** — segmented control (wzorzec jak `TendersModule` tab bar).
- Badge na tabach (np. monitoring na Przeglądzie, `!` na Dokumentach gdy brak kosztorysu).

### 3.4 Lazy render

Renderowany jest **tylko** aktywny workspace:

```tsx
{activeWorkspace === "valuation" && <TenderBidProposalPanel … />}
```

Szczególnie **nie mountować** poza aktywnym tabem: `TenderBidProposalPanel`, ATH preview, iframe HTML BZP.

### 3.5 Domyślny landing

| Status przetargu | Workspace |
|------------------|-----------|
| `preparing`, `interested`, … | **Przegląd** |
| `submitted`, `won`, `lost` | **Oferta** |

Helper: `resolveDefaultTenderWorkspace(item)` w `tender-workspace-ux.ts`.

### 3.6 Nawigacja z kafelków gotowości (6 tiles)

**Zakaz `scrollIntoView`** w `TenderDetailPanel` — kafelki przełączają workspace:

| Kafelek (`check.id`) | Workspace |
|----------------------|-----------|
| `kosztorys` | Dokumenty |
| `wadium`, `criteria` | Kwalifikacja |
| `our-bid` | Wycena |
| `deadline`, `value` | (zostają w Przeglądzie) |

Helper: `bidPrepTileToWorkspace(checkId)`.

---

## 4. Mapa plików (SSOT kodu)

### 4.1 Nowe / kluczowe (UX.1B)

| Plik | Rola |
|------|------|
| `src/lib/tender-workspace-ux.ts` | **SSOT** tab IDs, labels, mapowanie sekcji→tab, summary helpers, tile→workspace |
| `src/app/TenderDetailPanel.tsx` | Orchestrator: stan `activeWorkspace`, shell, lazy panels |
| `src/app/TenderWorkspaceTabBar.tsx` | UI 5 zakładek (czysty UI, bez cloud-sync) |
| `src/app/TenderOverviewShortcuts.tsx` | Skróty fit/wadium/ref → Kwalifikacja |
| `src/app/TenderDocumentsWorkspace.tsx` | Workspace Dokumenty |
| `src/app/TenderQualificationWorkspace.tsx` | Workspace Kwalifikacja |
| `src/app/TenderSummaryBar.tsx` | Sticky summary (UX.1A) |
| `src/app/TenderMonitoringBanner.tsx` | Q&A/zmiany → Strategia (UX.1A) |
| `src/app/TenderOfferSection.tsx` | Oferta + kalibracja (UX.1A dedup) |
| `src/app/TenderBidPrepPanel.tsx` | Karta ofertowa + 6 kafelków; `overviewMode`, `onNavigateWorkspace` |
| `src/app/TenderBidProposalPanel.tsx` | Wycena (bez zmian logiki; tylko mount w tab Wycena) |

### 4.2 Legacy / nadal istniejące

| Plik | Uwagi |
|------|-------|
| `TenderQualificationSection.tsx` | Accordion z UX.1A — **nie używany** w UX.1B (zastąpiony przez `TenderQualificationWorkspace`). Można usunąć w przyszłym cleanup — **nie robić bez polecenia**. |

### 4.3 Stałe w `tender-workspace-ux.ts`

```text
TENDER_WORKSPACE_TAB_ORDER     — ["overview","documents","qualification","valuation","offer"]
TENDER_WORKSPACE_TAB_LABELS    — etykiety PL
TENDER_WORKSPACE_SECTION_ORDER — legacy UX.1A (8 sekcji logicznych → mapowanie TENDER_SECTION_TO_TAB)
TENDER_*_SECTION_ID              — anchor IDs dla testów / deep linków
bidPrepTileToWorkspace()        — nawigacja kafelków
resolveDefaultTenderWorkspace() — landing tab
buildTenderSummarySnapshot()    — dane do SummaryBar
getTenderMonitoringCounts()     — badge monitoring
```

---

## 5. Reguły produktowe (P0 UX RULE)

### 5.1 Przegląd ≤ 1 ekran desktop

Workspace **Przegląd** nie może rosnąć w nieskończoność:

- **TAK:** monitoring banner, akcje (e-Zamówienia, Wgraj SWZ, Roboty), skróty, karta + 6 kafelków, kompaktowe notatki.
- **NIE:** pełna kwalifikacja, pełna wycena, ATH, dossier, HTML BZP, kryteria SWZ (chips), fragmenty tabel PDF.

Implementacja: `overviewMode` w `TenderBidPrepPanel` + `max-h-[calc(100vh-12rem)]` na kontenerze Przeglądu.

**Nowa funkcja wymagająca dużej powierzchni → Dokumenty / Kwalifikacja / Wycena / Oferta — nie Przegląd.**

### 5.2 Anti Command Center (wiążące)

| Zasada | Opis |
|--------|------|
| Max 5 workspace | Nowy tab tylko po AUDIT + merge innego (1:1 swap) |
| Feature → sub-sekcja | Benchmark, AI Validation, checklisty = sekcja w istniejącym tabie |
| Brak executive KPI w detail | Monitoring cross-tender → **Strategia** modułu |
| Badge zamiast banner-stack | Sygnały na tabie, nie kolejne panele na scrollu |
| Lazy mount | Ciężkie panele tylko gdy tab aktywny |

**ZAKAZ w `TenderDetailPanel`:** KPI dashboard, AI insights center, centrum ryzyk, 6. workspace „Analityka”.

---

## 6. Sloty na przyszłe feature’y (backlog — NIE implementować bez polecenia)

| Backlog | Docelowy workspace | Uwagi |
|---------|-------------------|-------|
| **P2-G.3C** Benchmark rynku | Wycena | Sub-sekcja pod `TenderBidProposalPanel` |
| **P2-G.3D** AI Validation | Wycena | Max 1 viewport; nie osobny tab |
| **P2-G.3E** Benchmark RMS | Wycena | Rozszerzenie cost intelligence |
| **P2-F.6** Kompletność oferty | Oferta | Checklist pakietu ofertowego |
| Pełnomocnictwa | Kwalifikacja / Oferta | Formalia vs składanie |
| Auto formularze JEDZ | Oferta | Output fazy składania |
| Analiza ryzyk SWZ | Przegląd (3 bullet) + Dokumenty (pełna) | Nie nowy tab |

Komentarze placeholder w kodzie: `TenderDetailPanel` (valuation, offer sections).

---

## 7. UX.1A — co zrobiono (v2.53.1, prereq UX.1B)

Bez zakładek — przygotowanie struktury:

1. Sticky `TenderSummaryBar`
2. Kolejność sekcji: summary → karta → dokumenty → kwalifikacja → wycena → oferta → formalia → HTML
3. Accordion kwalifikacji
4. Deduplikacja: jedna edycja „Nasza wycena” (kafelek); kalibracja tylko w Oferta; ATH primary w Dokumentach

`TENDER_WORKSPACE_SECTION_ORDER` — mapa pod UX.1B.

---

## 8. Incydent P0 + ARCH-001 (v2.53.2–2.53.3)

### 8.1 Objaw po UX.1A

Biały ekran prod: `ReferenceError: Cannot access 'Pa' before initialization` w chunk `app-core`.

### 8.2 Root cause

Cykl ESM przy starcie:

```text
cloud-sync → tenders-sync → tender-cost-calibration → cloud-sync
tenders-bzp → tenders-pipeline-session-cache → cloud-sync
```

### 8.3 Fix (2.53.2)

- `tender-cost-calibration.ts` — **dynamic** `import()` cloud-sync
- `tenders-pipeline-session-cache.ts` — lokalna stała `"wgdom-deferred-bootstrap"` zamiast importu z cloud-sync

### 8.4 ARCH-001 (2.53.3)

- `docs/ARCHITECTURE.md` § **11.6** — P0 ARCH RULE, wzorce, Lessons Learned
- `scripts/audit-import-cycles.mjs` + `npm run audit:import-cycles`

### 8.5 Zasady dla agentów (P0 ARCH RULE)

| Dozwolone | Zakazane |
|-----------|----------|
| UI → cloud-sync | cloud-sync → lib consumer → cloud-sync (static) |
| Dynamic `import()` cloud-sync w async fn | Nowy static import cloud-sync w `src/lib/**` w drzewie merge |
| Workspace shell = czysty UI | Top-level side effects w lib współdzielonym z app-core |

**Przed release dotykającym sync/lib:** `npm run audit:import-cycles` + `npm run build` + smoke ładowania login screen.

---

## 9. Testy regresji

```bash
npx vite-node scripts/test-tender-workspace-ux.mjs      # 48 PASS (UX.1A/1B)
npx vite-node scripts/test-tender-dossier-pipeline.mjs  # P2-F + dossier
npx vite-node scripts/test-tender-cost-intelligence.mjs # P2-G cost stack
npm run audit:import-cycles
npm run build
```

**Release workflow:** wariant **B** (functional UI) — [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md).

---

## 10. CO ROBIĆ / CZEGO NIE ROBIĆ

### Warto robić

- Dodawać nowe UI **wewnątrz** istniejącego workspace (accordion, sub-sekcja).
- Używać `bidPrepTileToWorkspace` / `onNavigateWorkspace` dla skrótów nawigacji.
- Rozszerzać `tender-workspace-ux.ts` o nowe helpery **UI-only**.
- Badge na `TenderWorkspaceTabBar` dla sygnałów uwagi.
- Zachować lazy mount dla ciężkich paneli.
- Czytać ten handoff przed kolejnymi feature’ami Przetargów.

### Nie warto / zakazane

- **6. workspace** lub „Centrum analityki przetargu” w detail — to CC 2.0.
- **`scrollIntoView`** przez całą stronę przetargu — używaj zmiany taba.
- Duże sekcje w **Przeglądzie** (P0 UX RULE).
- Duplikacja kalibracji / naszej wyceny / ATH (regresja UX.1A dedup).
- Zmiana algorytmów SWZ, ATH, Cost Intelligence, Qualification, Offer logic „przy okazji” UX.
- Static import `cloud-sync` w nowych plikach lib (ARCH-001).
- Przywracanie Command Center w runtime.
- Usuwanie `TenderQualificationSection` bez audytu — może być referencja w testach/starych docs.

---

## 11. NIE ZMIENIAJ bez polecenia

- Struktura 5 workspace i lazy render model
- `TENDER_WORKSPACE_TAB_ORDER` (max 5)
- Merge/sync, parsery SWZ, ATH, cost intelligence algorytmy
- Semantyka P2-F (`referenceStatus`, filtry PDF)
- Monitoring Q&A per przetarg — zostaje w **Strategia**, nie w workspace

---

## 12. Wznowienie pracy (agent)

```text
1. docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md  ← TEN PLIK
2. docs/PROJECT-HANDOFF-CURRENT.md
3. CURRENT-TASK.md
4. docs/ARCHITECTURE.md § UX.1B · § 11.6 ARCH-001
5. curl -s https://www.wgdom.fun/version.json   → 2.53.4
6. npx vite-node scripts/test-tender-workspace-ux.mjs
```

**Następne streamy (otwarte, bez polecenia nie startować):**

- P2-G.3C/D/E (Benchmark, AI Validation, RMS) → workspace **Wycena**
- P2-F.6 Kompletność oferty → workspace **Oferta**
- P2 Audit Center
- Cleanup: usunięcie martwego `TenderQualificationSection` (opcjonalnie)

---

## 13. Chronologia commitów (sesja 2026-06-13)

| Commit | Wersja | Opis |
|--------|--------|------|
| `8615d0b` | 2.53.1 | UX.1A MIN cleanup |
| `7392c82` | 2.53.2 | P0 hotfix cykl ESM |
| `53451ed` | 2.53.3 | ARCH-001 docs + audit script |
| `3b5da74` | **2.53.4** | **UX.1B workspace tabs** |

---

**Werdykt:**

```text
UX.1 CLOSED — architektura workspace obowiązuje
Prod: v2.53.4 · 3b5da74 · RELEASE GO
Gotowe pod P2-G.3C/D/E i P2-F.6 w istniejących tabach
```
