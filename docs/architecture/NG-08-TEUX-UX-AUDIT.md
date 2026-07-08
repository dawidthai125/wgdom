# NG-08 — Tender Workspace (`/przetargi/:id`) · UX/UI AUDIT

> **Status:** **AUDIT COMPLETE** · **UX LOCK APPROVED** · **PLAN APPROVED** · **DESIGN FREEZE v1.0** · **IMPLEMENT BLOCKED**  
> **Data audytu:** 2026-07-08  
> **Bundle ID:** **NG-08**  
> **Class:** **FEATURE UI**  
> **Baseline prod:** UI **2.63.72** · commit **`08a6649`** · **PRODUCTION VERIFIED**  
> **Scope route:** `/przetargi/:tenderId/*` — **Tender Workspace** (V4 detal)  
> **Cel:** Transform Tender Details → **complete Tender Workspace** (prezentacja + nawigacja + spójność TEUX)  
> **Out of scope:** Payroll · Cloud Sync · Pipeline · Edge · Parser · **AI algorithms** · **business logic**  
> **Powiązane:** [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) · [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md) · [`WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md) · [`NG-07-TEUX-01-CLOSEOUT.md`](./NG-07-TEUX-01-CLOSEOUT.md) · [`NG-06-TEUX-EPIC-CLOSE-REPORT.md`](./NG-06-TEUX-EPIC-CLOSE-REPORT.md) · [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](../ARCHITECTURE-REVIEW-2026-TENDERS.md) · **TOKEN FREEZE** `tender-ux-tokens.ts`

```text
NORTH STAR (P0):
Workspace musi odczuwać się jak JEDEN ciągły Tender Workspace,
nie pięć niezależnych modułów.

KEY UX GOALS:
  · Continuous workspace identity
  · Persistent workflow context
  · Strong next-action guidance
  · Unified intelligence surface

WORKFLOW: AUDIT (CODE) ✅ ACCEPTED
         → AUDIT (VISUAL) ✅ COMPLETE
         → UX LOCK ✅ APPROVED
         → PLAN ✅ APPROVED
         → DESIGN FREEZE ✅ v1.0
         → ARCH REVIEW ⏸ PENDING
         → OWNER GO ⛔ BLOCKED
         → IMPLEMENT ⛔ BLOCKED
```

---

## 0. Werdykt audytu

| Pole | Wartość |
|------|---------|
| **AUDIT (CODE)** | **ACCEPTED** |
| **AUDIT (VISUAL)** | **COMPLETE** — SS-01…10 **PASS** (owner 2026-07-08) |
| **UX LOCK** | **APPROVED** |
| **UX KPI** | **KPI-UX-01** · **KPI-UX-02** — AC w [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md) §2 |
| **PLAN** | **APPROVED** — 5 slice’ów [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) |
| **DESIGN FREEZE** | **v1.0** — PENDING ARCH REVIEW |
| **IMPLEMENT** | **BLOCKED** |

### 0.1 Priorytety (kolejność rekomendowana)

| P | # | Finding | Obszar |
|---|-----|---------|--------|
| **P0** | 1 | **IA:** Kwalifikacja + Oferta ukryte pod Decyzja (`?ws=`) — użytkownik nie widzi pełnego workspace | IA |
| **P0** | 2 | **CTA:** Primary action tylko na tab Przetarg; brak kontekstowego action bar na Dokumenty/Ceny/Kosztorys | Action Bar |
| **P0** | 3 | **Workspace Intelligence:** brak spójnego intelligence surface w detalu — V2 insights tylko na Przetargu, Executive na Decyzji, pełny CC tylko w module Strategia | V-4 |
| **P0** | 4 | **Docs:** `WORKFLOW-ARCHITECTURE-v2.63.md` superseded przez NG-03 Command Layer — ryzyko regresji przy implementacji | IA / SSOT |
| **P1** | 5 | Podwójna nawigacja na Decyzji (V4 tab + sub-tab bar) bez breadcrumb | Navigation |
| **P1** | 6 | Kosztorys osobny mount — Process Strip linkuje do dwóch tabów bez mostu wizualnego | Cost UX |
| **P1** | 7 | Tab Ceny (`TenderBidProposalPanel`) — ekstremalna gęstość, `text-[9px]`/`text-[10px]` masowo | Visual / Cost |
| **P1** | 8 | Przetarg Hub — kluczowe sekcje w accordionach (postęp, operator, KPI pełne) | IA |
| **P1** | 9 | Operator Action Bar poza scroll vs CTA w Command Layer — dwa poziomy akcji | Action Bar |
| **P1** | 10 | Dokumenty — długi scroll: summary → 7 accordion → dossier → formal → HTML | Document UX |
| **P1** | 11 | Trust / Process / Analysis — trzy narracje statusu (trust layer + strip + analysis rows) | Visual |
| **P1** | 12 | Bridge Strategia moduł ↔ detal — `onOpenStrategy` opuszcza workspace | AI Workspace |
| **P1** | 13 | Mobile: Command Layer chrome zajmuje dużo first-screen na Przetargu (ribbon + CTA + KPI) | Responsive |
| **P1** | 14 | `TenderQualificationWorkspace` / `TenderOfferSection` — legacy typography poza TEUX | Visual |
| **P1** | 15 | Backlog sloty P2-G.3C/D/E (benchmark, AI validation, RMS) — placeholder bez UI na Ceny | Cost UX |
| **P1** | 16 | **Context switching:** Intelligence nie jest tabem — min. 2 interakcje z Dokumentów (tab + accordion) | V-10 |
| **P2** | 17 | KPI pełny (`TenderDetailKpiBar`) schowany w accordion — duplikat KPI Compact | IA |
| **P2** | 18 | `TenderAnalysisStatusStrip` — `text-[9px]` niezmigrowane | Visual |
| **P2** | 19 | `TenderDocumentsSummaryHeader` — częściowo `text-[10px]` | Visual |
| **P2** | 20 | Kosztorys PRO — wiele sekcji bez unified section chrome (`TenderUxSectionTitle`) | Visual |
| **P2** | 21 | Decyzja Executive Summary vs V2 insights — podobna rola, różne komponenty | V-4 |
| **P2** | 22 | Hosted `TenderDetailPanelHosted` deprecated — martwy kod w bundle boundary | IA |
| **P2** | 23 | Module nav sheet — przejście do Strategia bez kontekstu tenderId | Navigation |
| **P2** | 24 | Empty states per-tab niespójne (TEUX-6 tylko lista modułu) | Document UX |
| **P2** | 25 | `max-w` / content width — lista ma `max-w-7xl` (NG-07), detal full-bleed bez cap | Responsive |
| **P1** | 26 | **Workspace memory:** brak scroll restoration między tabami — użytkownik traci pozycję w długich listach | V-9 |
| **P1** | 27 | **Workspace memory:** expanded document groups tylko w `useState` — reset po zmianie tabu | V-9 |

---

## 1. Zakres audytu

### 1.1 Visual validation scope (V-1…V-11)

**Gate:** wszystkie obszary zweryfikowane w ramach **SS-01…10** — **COMPLETE**.

| ID | Obszar | Code findings (§3) | Screenshot refs |
|----|--------|----------------------|-----------------|
| **V-1** | **Information Architecture** | IA-01…06, NAV-01…06 | SS-01, SS-02, SS-06, SS-08 |
| **V-2** | **Workspace Progress** | PRG-01…05, NAV-06, COST-03…05 | SS-01, SS-02, SS-04 |
| **V-3** | **Action Bar** | ACT-01…05 | SS-01, SS-07 |
| **V-4** | **Workspace Intelligence** | AI-01…05 (surfacing only) | SS-01, SS-02, SS-06 |
| **V-5** | **Documents UX** | DOC-01…06 | SS-03, SS-09 |
| **V-6** | **Cost Estimation UX** | COST-01…06, IA-03 | SS-04, SS-05 |
| **V-7** | **Responsive** | RSP-01…07 | SS-01, SS-03, SS-06, SS-07, SS-08 |
| **V-8** | **Visual hierarchy** | VIS-01…07 | SS-10 + wszystkie |
| **V-9** | **Workspace Memory** | MEM-01…08 (§3.10) | SS-03, SS-01/04 (tab round-trip) |
| **V-10** | **Context Switching Cost** | CTX-01…06 (§3.11) | SS-01…06 (navigation trace) |
| **V-11** | **Workspace Continuity** | CON-01…07 (§3.12) | SS-08, SS-10, lista↔detal round-trip |

### 1.2 UX KPI (owner — AC w DESIGN FREEZE)

| ID | KPI | Target | Baseline as-is (code) | Status |
|----|-----|--------|------------------------|--------|
| **KPI-UX-01** | **Documents → Workspace Intelligence** | **≤1** interakcja | **2** (tab Przetarg + accordion postępu gdy `blockersCount === 0`) | **FAIL** |
| **KPI-UX-02** | **Workspace Intelligence → Cost Estimation** | **≤1** interakcja | **1** do jednego tabu kosztowego; **2** dla pełnego obrazu (Kosztorys **+** Ceny) | **FAIL** (pełna wycena) |

**Definicje (audyt):**

- **Workspace Intelligence (INT):** kanoniczny surface insights w detalu — docelowo slice **NG-08-05**; as-is = V2 panel w accordion „Szczegóły postępu” na tab `przetarg`.
- **Cost Estimation (COST):** kanoniczny surface wyceny — as-is = tab `kosztorys` **lub** `ceny`; KPI-UX-02 mierzy przejście INT → **pierwszy** tab kosztowy w **1** klik (Process Strip / tab bar).
- **Interakcja:** klik tab · sub-tab · accordion summary · primary strip stage — **nie** scroll.

**Walidacja wizualna:** owner potwierdza KPI na SS-03 → SS-01/02 (KPI-UX-01) i SS-01/02 → SS-04/05 (KPI-UX-02).

### 1.3 In scope (mapowanie code audit)

| # | Obszar | SSOT w kodzie | Visual focus |
|---|--------|----------------|--------------|
| 1 | **Information Architecture** | `tender-detail-routes-v4.ts`, `tender-workspace-ux.ts`, `TenderDetailPage.tsx` | V-1 |
| 2 | **Workspace progress** | `TenderWorkflowProcessStrip`, `TenderWorkspaceV2Panel`, `KosztorysProcessStatusBar` | V-2 |
| 3 | **Action Bar** | `TenderWorkflowPrimaryAction`, `TenderWorkflowOperatorActionBar` | V-3 |
| 4 | **Workspace Intelligence** | `tender-intelligence-context.ts`, `TenderWorkspaceV2Panel`, `TenderDecisionView` | V-4 |
| 5 | **Document UX** | `TenderDocumentsWorkspace`, `TenderDocumentsSummaryHeader` | V-5 |
| 6 | **Cost estimation UX** | `TenderKosztorysWorkspace`, `TenderBidProposalPanel` | V-6 |
| 7 | **Responsive UX** | Command Layer density, `tender-mobile-row-cards.tsx` | V-7 |
| 8 | **Visual hierarchy** | `tender-ux-tokens.ts`, TEUX design-system vs legacy typography | V-8 |
| 9 | **Workspace memory** | URL tab SSOT, scroll root, accordion/details, `loadWorkspaceV2ChecklistPersist` | V-9 |
| 10 | **Context switching cost** | Tab bar depth, Decyzja `?ws=`, Intelligence accordion, dual cost tabs | V-10 |
| 11 | **Workspace continuity** | Lista↔detal, module nav, strategy bridge, `tenderId` URL, native back | V-11 |

### 1.4 Out of scope (frozen)

| Obszar | Powód |
|--------|--------|
| Payroll / PWRB / `cloud-sync.ts` | #CORE-013 |
| Pipeline runtime / bootstrap / parser | NG-02 EPIC CLOSED |
| Edge / KV / scoring engines | business + backend |
| Algorytmy AI / COMMAND CENTER scoring | business logic |
| Zmiana `buildTenderIntelligenceContext()` semantyki | intelligence SSOT |
| TOKEN thaw (`tender-ux-tokens.ts` nowe exporty) | TOKEN FREEZE — import-only |

---

## 2. Mapa workspace (as-is)

```text
/przetargi/:id/:tab
└── TendersModule (activeTab=list wymuszone)
      └── TenderDetailPage
            ├── TenderDetailCommandLayer (sticky)
            │     ├── back + module nav (lg:hidden)
            │     ├── h1 + breadcrumb tab label
            │     ├── TenderDetailTabBar (5 tabów)
            │     ├── TenderDecyzjaSubTabBar (tylko decyzja)
            │     ├── TenderDetailKpiCompact (tab ≠ przetarg compact)
            │     └── przetargCommandSlot: Ribbon + Primary CTA
            │
            ├── tab=kosztorys → TenderKosztorysWorkspace (osobny mount)
            │
            └── tab ∈ {przetarg,dokumenty,ceny,decyzja}
                  └── TenderDetailPanel (embedV4ChromeHidden)
                        ├── intelligenceCtx = buildTenderIntelligenceContext()  ← JEDEN RAZ
                        ├── przetarg → TenderPrzetargWorkspace → Hub + accordions
                        ├── dokumenty → TenderDocumentsWorkspace
                        ├── ceny → TenderBidProposalPanel
                        └── decyzja → TenderDecisionView | Qualification | Offer (?ws=)
            
            └── TenderWorkflowOperatorActionBar (slot z Hub, sticky mobile bottom)
```

**Aktywne taby V4:** `przetarg` · `dokumenty` · `kosztorys` · `ceny` · `decyzja`  
**Wycofane:** `strategia`, `materialy` → redirect `przetarg`  
**Decyzja sub-workspace:** `?ws=qualification|offer` (domyślnie overview)

---

## 3. Findings per obszar

### 3.1 Information Architecture

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| IA-01 | UX.1 miało 5 równorzędnych workspace (Przegląd, Dokumenty, Kwalifikacja, Wycena, Oferta). V4 ma 5 tabów, ale **Kwalifikacja** i **Oferta** są pod-tabami Decyzji — nie w głównym pasku. | **P0** | `TenderDecyzjaSubTabBar`, `parseDecyzjaWorkspaceQuery` |
| IA-02 | **Strategia** i **Materiały** usunięte z URL detalu; insights strategiczne tylko przez module tab lub bridge link. | P1 | `resolveRetiredV4TabRedirect`, `TenderPortfolioPositionPanel` |
| IA-03 | Kosztorys = osobny mount poza `TenderDetailPanel` — poprawne technicznie (lazy), ale użytkownik widzi **dwa** taby kosztowe (Kosztorys + Ceny). | P1 | `TenderDetailPage` L156–164, Process Strip |
| IA-04 | Przetarg Hub — KPI pełne, postęp V2, operator, analysis strip w **accordionach** — first-screen nie pokazuje pełnego obrazu workspace. | P1 | `TenderPrzetargWorkspace.tsx` |
| IA-05 | `WORKFLOW-ARCHITECTURE-v2.63.md` §3 diagram: `KpiBar + TabBar` — **superseded** przez Command Layer (NG-03). | **P0** | docs vs `TenderDetailCommandLayer.tsx` |
| IA-06 | `TenderDetailPanelHosted` deprecated (TEUX-7f) — nadal w repo, nie na prod path. | P2 | `TENDERS_V4_ROUTING=true` |

**Zgodne z SSOT (zachować):**
- `parseTenderDetailPath` + `pendingTab` (P0 tab SSOT v2.63.8)
- Jedno `buildTenderIntelligenceContext()` w panelu
- Rozdział Przetarg (workflow) vs Decyzja (werdykt)
- Lazy mount kosztorysu

---

### 3.2 Workspace progress

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| PRG-01 | Process Strip + Trust Ribbon + Analysis Status Strip — **trzy** powierzchnie postępu/statusu bez jednej hierarchii. | P1 | `TenderStatusRibbon`, `TenderAnalysisStatusStrip` |
| PRG-02 | Postęp V2 (`TenderWorkspaceV2Panel`) w accordion Hub — niewidoczny na first-screen. | P1 | `TenderPrzetargWorkspace.tsx` |
| PRG-03 | Fazy kosztorysu E0–E12 (`KosztorysProcessStatusBar`) vs trust dimension — dwie narracje. | P1 | `ARCHITECTURE-REVIEW-2026-TENDERS.md` §3.2 |
| PRG-04 | Process Strip nawiguje między tabami; brak „you are here” poza ribbon. | P1 | `TenderWorkflowProcessStrip` |
| PRG-05 | KPI Compact w Command Layer vs pełny KPI w accordion — postęp metryk rozproszony. | P2 | `TenderDetailKpiCompact`, `TenderDetailKpiBar` |

---

### 3.3 Workspace navigation

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| NAV-01 | Dwa poziomy tabów na Decyzji bez breadcrumb (`Decyzja › Kwalifikacja`). | P1 | `TenderDecyzjaSubTabBar` |
| NAV-02 | `pendingTab` optimistic UI — **nie regresować** przy zmianach chrome. | — | `TenderDetailPage` L69–76 |
| NAV-03 | Module nav sheet (`lg:hidden`) — wyjście z detalu do Strategia/Mapa bez tender context. | P2 | `TenderModuleNavSheet` |
| NAV-04 | Native back → lista; Safari `history.back` ≠ drill-in (udokumentowane Mobile Recovery). | — | `registerNativeBackHandler` |
| NAV-05 | Tab bar horizontal scroll + shadow (TEUX-4) — **PASS** na detalu. | — | `TenderDetailTabBar` |
| NAV-06 | Process Strip klika → nawigacja tab; brak wizualnej wskazówki „jesteś tutaj” poza ribbon. | P1 | `TenderWorkflowProcessStrip` |

---

### 3.4 Document UX

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| DOC-01 | **Summary Header** + **7 grup accordion** — SHIPPED, zgodne z WORKFLOW §4.5. | — | `TenderDocumentsSummaryHeader`, `tender-grouped-documents.ts` |
| DOC-02 | Długi vertical stack: platform → summary → attachments → formal → dossier → HTML collapsible. | P1 | `TenderDocumentsWorkspace.tsx` |
| DOC-03 | Skeletony TEUX-5 na summary/attachments — **PASS**. | — | `TenderDocumentsSummarySkeleton` |
| DOC-04 | Trust badge na Dokumentach (`pickDocumentsTrustBadge`) — spójne z NG-01. | — | `tender-trust-ui.ts` |
| DOC-05 | Empty per dokumenty — brak dedykowanego `TenderUxEmptyState` jak na liście (TEUX-6). | P2 | porównanie z `TendersView` |
| DOC-06 | Akcje operatora (refresh, analyze, external) rozproszone między workspace a action bar. | P1 | props `onRefresh`, `onAnalyze` |

---

### 3.5 Workspace Intelligence (surfacing only — bez algorytmów)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| AI-01 | Brak jednego **Workspace Intelligence** surface w detalu — V2 insights tylko na Przetargu (accordion), Executive na Decyzji, pełny CC tylko w module Strategia. | **P0** | `TenderWorkspaceV2Panel`, `TendersStrategyContent` |
| AI-02 | `TenderPortfolioPositionPanel` — bridge do Strategii; **opuszcza** tender workspace. | P1 | `onOpenStrategy` |
| AI-03 | Copy integrity TEUX-7d na liście; moduł Strategia nadal używa legacy „AI” copy. | P2 | `StrategyMonitoringFeedPanel` |
| AI-04 | Werdykt GO/HOLD/ODPUŚĆ — poprawnie tylko Decyzja (`TenderDecisionView`). | — | WORKFLOW §2 |
| AI-05 | Backlog P2-G.3D „AI Validation” na Ceny — komentarz placeholder, brak UI. | P1 | `TenderDetailPanel` backlog comment |

**Zasada NG-08:** można **reorganizować surfacing** istniejących insights (`ctx.narrative`, `buildWorkspaceV2Insights`, executive card) — **nie** zmieniać scoringu ani algorytmów. Slice **NG-08-05** = **Workspace Intelligence** (nie nowe modele AI).

---

### 3.6 Cost estimation UX

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| COST-01 | **Kosztorys PRO** — dashboard + BOQ explorer + TOP 20 + fazy E0–E12; wysoka złożoność cognitive. | P1 | `TenderKosztorysWorkspace.tsx` |
| COST-02 | Tab **Ceny** — sticky KPI row + wiele `<details>` + tabele UNKNOWN; mobile `TenderMobileRowCard`. | P1 | `TenderBidProposalPanel.tsx` |
| COST-03 | `KosztorysProcessStatusBar` + trust `kosztorys` dimension — **dwie narracje** (ARCHITECTURE REVIEW §3.2). | P1 | `ARCHITECTURE-REVIEW-2026-TENDERS.md` |
| COST-04 | Process Strip: etapy „Kosztorys” i „Wycena” → dwa taby; brak inline „skocz do ceny oferty”. | P1 | `tender-workflow-process-strip.ts` |
| COST-05 | Health timeout/stale (`useKosztorysProcessHealth`) — dobre, ale wizualnie słabo powiązane z Ceny. | P2 | hook w kosztorys workspace |
| COST-06 | Kalibracja / override per pozycja — funkcjonalne; UI gęste, trudne na mobile. | P1 | `TenderBidProposalPanel` UNKNOWN table |

---

### 3.7 Action Bar

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| ACT-01 | **Primary CTA** (`TenderWorkflowPrimaryAction`) — tylko tab **Przetarg**, w Command Layer (`commandLayerChrome`), **nie sticky**. | P1 | `TenderDetailPage` przetargCommandSlot |
| ACT-02 | WORKFLOW §4.2 mówi „sticky CTA” — **rozjazd** z NG-03 (CTA w chrome, nie sticky). | P1 | docs vs kod |
| ACT-03 | **Operator Action Bar** — upload/analyze/export; sticky bottom mobile; desktop border-top slot. | — | `TenderWorkflowOperatorActionBar` |
| ACT-04 | Brak kontekstowego primary action na **Dokumenty** (np. „Analizuj SWZ”) / **Ceny** (np. „Przejdź do oferty”) w chrome — akcje w content lub operator bar. | **P0** | brak CTA poza Przetarg |
| ACT-05 | Operator sekcja w Hub accordion + action bar — **duplikacja** ścieżek do tych samych akcji. | P1 | `TenderWorkflowOperatorSection` |

---

### 3.8 Responsive UX

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| RSP-01 | Command Layer density `max-[390px]` — TEUX-4 **PASS**. | — | `TenderDetailCommandLayer` |
| RSP-02 | Przetarg first-screen: ribbon + CTA + KPI compact + tab bar ≈ **wysoki** chrome mobile. | P1 | visual estimate / V09 |
| RSP-03 | Kosztorys `compactKosztorysChrome` — redukuje padding Command Layer. | — | `compactKosztorysChrome` flag |
| RSP-04 | BOQ / Ceny — `TenderMobileRowCard` + desktop table; touch 44px na akcjach operatora. | — | `tender-mobile-row-cards.tsx` |
| RSP-05 | Module header + tab bar modułu ukryte `max-lg` na detalu — **PASS**. | — | `TendersModule` |
| RSP-06 | Lista NG-07 `max-w-7xl`; detal full width — brak wspólnego content cap. | P2 | `TendersView` vs `TenderDetailPage` |
| RSP-07 | Trust ribbon collapsible desktop; uproszczony na ≤390px. | — | `TenderStatusRibbon` |

---

### 3.9 Visual hierarchy

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| VIS-01 | Command Layer + Tab bar — **TEUX tokens PASS** (`TEUX_FONT_*`, `TEUX_KPI_COMPACT_*`). | — | `TenderDetailKpiCompact.tsx` |
| VIS-02 | `TenderBidProposalPanel` — **>40×** `text-[9px]`/`text-[10px]` (najgorszy obszar detalu). | P1 | grep |
| VIS-03 | `TenderQualificationWorkspace`, `TenderOfferSection`, `TenderPrzetargWorkspace` — legacy 10px section titles. | P1 | grep |
| VIS-04 | `TenderAnalysisStatusStrip` — `text-[9px]` labels. | P2 | plik |
| VIS-05 | `TenderDocumentsSummaryHeader` — częściowo zmigrowane. | P2 | plik |
| VIS-06 | Design system (`TenderUxSectionTitle`, `TenderUxBadge`) — **niesystematyczne** w workspace panels. | P2 | porównanie z listą NG-07 |
| VIS-07 | Lista Przetargów po NG-07 TEUX; detal **wizualnie starszy** (gęstość, typografia). | P1 | parity NG-07 vs detal |

---

### 3.10 Workspace Memory (V-9)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| MEM-01 | **Scroll restoration:** jeden scroll root (`TenderDetailPage` `overflow-y-auto`); **brak** zapisu `scrollTop` per tab — zmiana tabu resetuje pozycję przewijania. | P1 | `TenderDetailPage.tsx` L261–270 |
| MEM-02 | **Active tab persistence (URL):** tab V4 w pathname — **PASS** bookmark/refresh; `pendingTab` tylko optimistic UI. | — | `parseTenderDetailPath`, `pendingTab` |
| MEM-03 | **Decyzja sub-tab:** `?ws=qualification\|offer` w URL — **PASS** persistence przy share/refresh. | — | `TENDER_DETAIL_DECYZJA_WS_QUERY` |
| MEM-04 | **Re-entry tender:** powrót z listy → ostatni tab **nie** zapamiętywany w LS (tylko URL jeśli user wraca przez historię). | P2 | brak `tender-detail-last-tab` key |
| MEM-05 | **Document groups expanded:** `groupExpandedOverrides` w `useState` — **utrata** po opuszczeniu tabu Dokumenty. | P1 | `TenderAttachmentsPanel.tsx` |
| MEM-06 | **Hub accordions:** `<details>` (info, postęp, operator) — brak LS; postęp `open` tylko gdy `blockersCount > 0`. | P1 | `TenderWorkflowHubPanel` `progressDefaultOpen` |
| MEM-07 | **V2 checklist:** jedyny trwały stan UI per `tenderId` — `loadWorkspaceV2ChecklistPersist` (`signature` checkbox). | — | `tender-workspace-v2-ux.ts` |
| MEM-08 | **Module tab** (`list`/`strategy`/…) persisted w LS — **poza** detalem workspace; wymuszenie `list` na V4 detalu. | — | `saveTendersActiveTab`, `TendersModule` |

**Visual gate (owner przy SS-03 + round-trip):** rozwiń grupę dokumentów → tab Ceny → powrót Dokumenty — czy grupa zwinięta? Przewiń BOQ → tab Dokumenty → Kosztorys — czy scroll na górze?

---

### 3.11 Context Switching Cost (V-10)

**Metoda audytu:** liczba **interakcji użytkownika** (klik tab / sub-tab / accordion / CTA strip) między kanonicznymi destynacjami. **Bez** implementacji — baseline code + potwierdzenie wizualne SS-01…06.

**Destynacje kanoniczne:**

| Skrót | Gdzie w UI |
|-------|------------|
| **DOC** | Tab `dokumenty` |
| **INT** | Workspace Intelligence — V2 insights w accordion „Szczegóły postępu” (tab `przetarg`) |
| **COST-K** | Tab `kosztorys` |
| **COST-C** | Tab `ceny` |
| **DEC** | Tab `decyzja` overview |
| **DEC-Q** | Tab `decyzja` + sub-tab Kwalifikacja (`?ws=qualification`) |

#### Macierz kroków (as-is code, min. interakcje)

| Z → Do | DOC | INT | COST-K | COST-C | DEC | DEC-Q |
|--------|-----|-----|--------|--------|-----|-------|
| **DOC** | 0 | **1–2** (tab Przetarg + accordion jeśli zamknięty) | 1 | 1 | 1 | **2** |
| **INT** (Przetarg+accordion) | 1 | 0 | 1 | 1 | 1 | **2** |
| **COST-K** | 1 | **1–2** | 0 | 1 | 1 | **2** |
| **COST-C** | 1 | **1–2** | 1 | 0 | 1 | **2** |
| **DEC** | 1 | **1–2** | 1 | 1 | 0 | **1** |
| **DEC-Q** | 1 | **1–2** | 1 | 1 | 1 | 0 |

**Pełny obraz wyceny (Kosztorys + Ceny):** min. **2 taby** (COST-K → COST-C) — brak single-surface cost estimation.

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| CTX-01 | Intelligence **nie jest tabem** — z DOC min. **2** kroki gdy accordion postępu zamknięty (`blockersCount === 0`). | **P1** | `TenderWorkflowHubPanel`, IA-01/AI-01 |
| CTX-02 | **Dual cost tabs** — pełna wycena wymaga przełączenia Kosztorys ↔ Ceny; Process Strip rozdziela etapy. | P1 | `tender-workflow-process-strip.ts` |
| CTX-03 | Kwalifikacja/Oferta — **+1** sub-tab pod Decyzją (nie top-level). | P1 | `TenderDecyzjaSubTabBar` |
| CTX-04 | Process Strip skraca nawigację do **1** kliknięcia na etap — **PASS** gdy cel = strip stage. | — | `TenderWorkflowProcessStrip` |
| CTX-05 | Portfolio bridge → module Strategia — **opuszcza** workspace (context break). | P1 | `TenderPortfolioPositionPanel` |
| CTX-06 | **KPI-UX-01** baseline **FAIL** (DOC→INT = 2); target **≤1** — slice **NG-08-05** + IA. | **P0** | §1.2 KPI |
| CTX-07 | **KPI-UX-02** — INT→pierwszy tab kosztowy **1** klik OK; pełna wycena Kosztorys+Ceny = **FAIL** bez cohesion slice. | **P1** | §1.2 KPI, NG-08-06 |

**Visual gate (owner):** na SS-01…06 zaznacz rzeczywiste ścieżki użytkownika i zweryfikuj **KPI-UX-01** / **KPI-UX-02**.

---

### 3.12 Workspace Continuity (V-11)

| ID | Finding | P | Evidence |
|----|---------|---|----------|
| CON-01 | **Lista ↔ detal:** URL `/przetargi/:id/:tab` — **PASS** deep link; powrót „do listy” traci tab context (expected). | — | `TENDERS_LIST_PATH`, `parseTenderDetailPath` |
| CON-02 | **Re-enter tender:** ponowne wejście z listy — domyślny tab z nawigacji (zwykle `przetarg`), brak „resume last tab” w LS. | P2 | brak detail-tab LS |
| CON-03 | **Module nav sheet:** wyjście do Strategia/Mapa **bez** `tenderId` w module tab — continuity break (P1 bridge). | P1 | `TenderModuleNavSheet`, `navigateToTendersModuleTab` |
| CON-04 | **Strategy bridge:** `onOpenStrategy(tenderId)` — kontekst w Strategii, ale **opuszcza** V4 workspace shell. | P1 | `TenderPortfolioPositionPanel` |
| CON-05 | **V4 + module tab:** `TendersModule` wymusza `activeTab=list` na detalu — **PASS** (nie gubi detalu przy sync module state). | — | `saveTendersActiveTab("list")` |
| CON-06 | **Native back:** handler → lista przetargów — **PASS** spójny exit; nie przywraca poprzedniego tabu w historii. | — | `registerNativeBackHandler` |
| CON-07 | **Cross-session:** tylko URL bookmark + V2 checklist signature — brak pełnej continuity stanu workspace. | P2 | MEM-07, MEM-04 |

**Visual gate (owner):** SS-08 (module nav) + round-trip lista→detal→lista→ten sam tender (SS-10 kontekst).

---

## 4. Screenshot audit (gate wizualny)

**SSOT inventory:** [`NG-06-TEUX-VISUAL-INVENTORY.md`](./NG-06-TEUX-VISUAL-INVENTORY.md) V09–V13 (zaktualizować po NG-07).

| ID | Scenariusz | Viewport | Stan danych | Status |
|----|------------|----------|-------------|--------|
| SS-01 | V09 Przetarg — Hub + Command Layer + CTA | 390px | filled tender | ✅ owner |
| SS-02 | V09 Przetarg — accordion postęp rozwinięty | 1280px | filled | ✅ owner |
| SS-03 | V10 Dokumenty — summary + 7 groups | 390px / 1280px | docs complete | ✅ owner |
| SS-04 | V11 Kosztorys — BOQ TOP 20 | 390px | ATH parsed | ✅ owner |
| SS-05 | V12 Ceny — KPI row + UNKNOWN table | 1280px | pricing auto | ✅ owner |
| SS-06 | V13 Decyzja — overview vs `?ws=qualification` | 390px | both | ✅ owner |
| SS-07 | Operator Action Bar — mobile sticky bottom | 390px | Przetarg tab | ✅ owner |
| SS-08 | Module nav sheet open | 390px | detal | ✅ owner |
| SS-09 | Empty / loading — dokumenty bez SWZ | 1280px | minimal item | ✅ owner |
| SS-10 | Parity — lista NG-07 vs detal header | 1280px | same session | ✅ owner |

**Obserwacje V-9…V-11 + UX KPI (w ramach SS-01…10):**

| SS | Obserwacja |
|----|------------|
| SS-03 → SS-01/02 | **KPI-UX-01:** policz interakcje DOC → INT |
| SS-01/02 → SS-04/05 | **KPI-UX-02:** policz interakcje INT → COST |
| SS-03 | V-9: expand grupy dokumentów → zmień tab → wróć — stan grupy |
| SS-01/04 | V-9: scroll w BOQ/kosztorys → zmień tab → wróć — pozycja scroll |
| SS-01…06 | V-10: navigation trace DOC → INT → COST → DEC |
| SS-08, SS-10 | V-11: lista↔detal, module nav continuity |

**Gate:** AUDIT VISUAL **COMPLETE** · UX LOCK **APPROVED** · SS-01…10 **PASS**.

**Bez implementacji** do OWNER GO.

---

## 5. Risk assessment

| Ryzyko | Klasa | Mitigacja |
|--------|-------|-----------|
| Regresja `pendingTab` / URL SSOT | **P0** | Nie dotykać `parseTenderDetailPath` semantyki; test `test-tender-detail-nav-teux1.mjs` gate B |
| Mixed commit z pipeline/sync | **P0** | Allowlist per slice; #CORE-013 / #CORE-014 |
| TOKEN FREEZE violation | **P1** | Import-only z `tender-ux-tokens.ts`; zero nowych exportów |
| `intelligenceCtx` recompute / drift | **P1** | Jeden build w `TenderDetailPanel`; UI tylko layout props |
| CTA duplication (WORKFLOW P0 cleanup) | **P1** | Jedno `TenderWorkflowPrimaryAction`; nie przywracać „Następny krok” |
| Kosztorys lazy mount break | **P1** | Nie scalać mountów bez DESIGN FREEZE |
| Mobile chrome budget overflow | **P2** | SS-01/02 przed implementacją compaction |
| Workspace memory / scroll restore | **P1** | V-9 — UI-only session keys; nie sync KV; scope w UX LOCK |
| Context switching regression | **P1** | V-10 — metryki kroków w DESIGN FREEZE AC; Process Strip reuse |
| STABILIZATION WINDOW | **process** | Owner GO per bundle; FEATURE only |
| Dokumentacja WORKFLOW outdated | **P1** | Aktualizacja WORKFLOW lub NG-08 addendum przed IMPLEMENT |

---

## 6. PLAN slice’y (APPROVED — SSOT: [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md))

| # | Slice | Cel | Visual / KPI |
|---|-------|-----|--------------|
| **1** | **NG-08-01 Workspace Frame** | Ciągła tożsamość · CTA per tab · breadcrumb Decyzja | V-1, V-3, V-11 |
| **2** | **NG-08-02 Workspace Progress** | Persistent workflow context · unified strip | V-2 |
| **3** | **NG-08-03 Workspace Intelligence** | Unified intelligence · **KPI-UX-01** | V-4, KPI-UX-01 |
| **4** | **NG-08-04 Documents Workspace** | Scanability · empty · memory groups | V-5, V-9 |
| **5** | **NG-08-05 Cost Workspace** | Cohesion Kosztorys↔Ceny · **KPI-UX-02** | V-6, KPI-UX-02 |

**Kolejność obowiązkowa.** Dawny draft 7-slice → mapowanie w PLAN §3.

---

## 7. Test gate (propozycja — po DESIGN FREEZE)

| Tier | Komenda |
|------|---------|
| Build | `npm run build` |
| Gate B tenders | `npm run test:infra -- --gate B --scope tenders` |
| Workflow regression | `test-tender-workflow-hub.mjs`, `test-tender-workflow-primary-action.mjs`, `test-tender-workflow-process-strip.mjs` |
| Tab SSOT | `test-tender-detail-nav-teux1.mjs` |
| Docs / grouped | `test-tender-documents-summary-header.mjs`, `test-tender-grouped-documents.mjs` |
| Kosztorys phase | `test-tender-kosztorys-process-phase.mjs` |
| Payroll guard | `npm run test:infra -- --gate B --scope payroll` (16/16 — bez regresji) |

**Nowy manifest entry (opcjonalny):** `NG-08-WORKSPACE-SMOKE` — thin assert Command Layer + tab SSOT; tylko po Owner GO na test scope.

---

## 8. Mapowanie findings → slice (frozen — PLAN §2)

| Finding IDs | Slice |
|-------------|-------|
| IA-01, IA-05, ACT-01…05, NAV-01, NAV-06, CON-03/04, VIS-07, RSP-06 | **NG-08-01** |
| PRG-01…05, NAV-06, COST-03, IA-04, MEM-06 | **NG-08-02** |
| AI-01…05, CTX-01, CTX-06, KPI-UX-01, IA-02, CTX-05 | **NG-08-03** |
| DOC-02, DOC-05, DOC-06, MEM-05, VIS-05 | **NG-08-04** |
| COST-01…06, IA-03, CTX-02, CTX-07, KPI-UX-02, VIS-02, MEM-01 | **NG-08-05** |
| VIS-03/04/06, RSP-02, MEM-02/03/04/07/08, CON-01/02/05…07 | spill w slice 01/04/05 |

**Zasada:** One Slice = One Commit · zero mixed CORE · bez scoringu/pipeline/sync.

---

## 9. Workflow status

```text
AUDIT (CODE)     ✅ ACCEPTED
AUDIT (VISUAL)   ✅ COMPLETE
UX LOCK          ✅ APPROVED
PLAN             ✅ APPROVED
DESIGN FREEZE    ✅ v1.0 — PENDING ARCH REVIEW
ARCH REVIEW      ⏸ PENDING ← CURRENT
OWNER GO         ⛔ BLOCKED
IMPLEMENT        ⛔ BLOCKED
```

---

## 10. Następny krok

1. **ARCH REVIEW** — boundary + KPI AC ([`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md))  
2. **OWNER GO** — jawne polecenie IMPLEMENT **NG-08-01 Workspace Frame**  
3. **IMPLEMENT** — jeden commit per slice · zero kodu bez GO  

**Zero implementacji** bez OWNER GO.

---

*SSOT audytu — ten plik · implementacja — DESIGN FREEZE (po approval). Baseline: **2.63.72** @ **08a6649**.*
