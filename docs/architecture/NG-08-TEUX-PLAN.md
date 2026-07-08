# NG-08 — Tender Workspace · PLAN

> **Status:** **PLAN APPROVED** (post UX LOCK)  
> **Data:** 2026-07-08  
> **Bundle ID:** **NG-08**  
> **Class:** **FEATURE UI** (#CORE-013 · #CORE-014)  
> **Baseline prod:** UI **2.63.72** · commit **`08a6649`**  
> **Audyt:** [`NG-08-TEUX-UX-AUDIT.md`](./NG-08-TEUX-UX-AUDIT.md) — **AUDIT COMPLETE**  
> **UX LOCK:** **APPROVED**  
> **Freeze:** [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md)  
> **IMPLEMENT:** **BLOCKED** do **ARCH REVIEW** + **OWNER GO**

```text
NORTH STAR (P0):
Workspace musi odczuwać się jak JEDEN ciągły Tender Workspace,
nie pięć niezależnych modułów.

KEY UX GOALS:
  · Continuous workspace identity
  · Persistent workflow context
  · Strong next-action guidance
  · Unified intelligence surface

WORKFLOW: AUDIT ✅ → UX LOCK ✅ → PLAN ✅ (ten plik)
         → DESIGN FREEZE ✅ → ARCH REVIEW ⏸ → OWNER GO ⛔ → IMPLEMENT ⛔
```

---

## 0. Werdykt PLAN

| Pole | Wartość |
|------|---------|
| **Priorytet implementacji** | **5 slice’ów** (NG-08-01…05) — kolejność **obowiązkowa** |
| **P0 bundle** | Ciągłość workspace — wspólna tożsamość, kontekst, CTA, intelligence |
| **Slice’y poza PLAN** | Dawny draft NG-08-06/07 **wchłonięte** do pięciu filarów (§2) |
| **One slice = one commit** | Tak · zero mixed CORE |
| **IMPLEMENT** | **BLOCKED** |

---

## 1. UX LOCK — zamrożone decyzje

| ID | Decyzja |
|----|---------|
| **UXL-01** | **Pięć tabów V4 zostaje** (`przetarg`, `dokumenty`, `kosztorys`, `ceny`, `decyzja`) — bez nowego tabu URL; ciągłość przez **wspólny frame**, nie przez scalanie mountów. |
| **UXL-02** | **Kosztorys lazy mount** — techniczny podział `TenderKosztorysWorkspace` **zachowany**; UX musi **maskować** „dwa moduły” mostem wizualnym + Process Strip. |
| **UXL-03** | **Intelligence surfacing only** — reuse `buildTenderIntelligenceContext()` + `TenderWorkspaceV2Panel` / executive card; **zero** zmian algorytmów scoringu. |
| **UXL-04** | **Tab SSOT** — `parseTenderDetailPath` + `pendingTab` **nie regresować** (P0 tab SSOT v2.63.8). |
| **UXL-05** | **TOKEN FREEZE** — import-only z `tender-ux-tokens.ts`; zero nowych exportów. |
| **UXL-06** | **KPI-UX-01** — Documents → Workspace Intelligence **≤1** interakcja (AC w DESIGN FREEZE). |
| **UXL-07** | **KPI-UX-02** — Workspace Intelligence → pierwszy tab kosztowy **≤1** interakcja. |
| **UXL-08** | **Decyzja sub-workspace** — Kwalifikacja/Oferta pozostają `?ws=`; frame musi je **widocznie** osadzić w ciągłości (breadcrumb / strip stage). |
| **UXL-09** | **WORKFLOW addendum** — NG-08 supersede rozdziałów WORKFLOW dot. sticky CTA / 5 workspace UX.1; Command Layer = SSOT chrome. |

---

## 2. Slice’y implementacji (kolejność obowiązkowa)

### NG-08-01 — Workspace Frame

**Cel:** Jedna **tożsamość** workspace na wszystkich tabach — użytkownik zawsze wie, że jest w **tym samym** tenderze, w **tym samym** workflow.

| Element | Zakres |
|---------|--------|
| **Continuous identity** | Wspólny Command Layer: tytuł, breadcrumb tab, KPI compact, trust ribbon spójny między tabami |
| **Navigation clarity** | Decyzja: breadcrumb `Decyzja › Kwalifikacja|Oferta`; Process Strip „you are here” |
| **Next-action guidance** | Kontekstowy primary CTA **per tab** (nie tylko Przetarg) — slot w Command Layer |
| **Continuity** | Module nav / strategy bridge bez „context break” feeling (inline hint lub return path) |
| **Memory (frame-level)** | UI-only: opcjonalny `max-w-7xl` align z listą NG-07; **nie** sync KV |

**Findings:** IA-01, IA-05, ACT-01…05, NAV-01, NAV-06, CON-03, CON-04, VIS-07, RSP-06  
**Visual:** V-1, V-3, V-7 (chrome), V-8, V-11  
**Allowlist (szkic):** `TenderDetailPage.tsx`, `TenderDetailCommandLayer.tsx`, `TenderDetailTabBar.tsx`, `TenderDecyzjaSubTabBar.tsx`, `TenderWorkflowPrimaryAction.tsx`, `TenderWorkflowOperatorActionBar.tsx`

**AC (skrót):**
- Każdy tab ma **widoczny** primary next-action w chrome (lub jawny „brak akcji” empty state).
- Decyzja sub-tab ma breadcrumb.
- Zero regresji `pendingTab` / URL.

---

### NG-08-02 — Workspace Progress

**Cel:** **Persistent workflow context** — jedna hierarchia postępu, widoczna na każdym etapie.

**SSOT slice:** [`NG-08-02-TEUX-PLAN.md`](./NG-08-02-TEUX-PLAN.md) · [`NG-08-02-TEUX-DESIGN-FREEZE.md`](./NG-08-02-TEUX-DESIGN-FREEZE.md) · **WF-02**

| Element | Zakres |
|---------|--------|
| **WF-02** | Process Strip = komponent **workspace** (Command Layer), nie tabu `przetarg` |
| **Unified progress** | Process Strip + status jako **jedna narracja** (nie trzy konkurencyjne paski) |
| **Visibility** | Postęp V2 / blockers **poza** domkniętym accordionem (gdy są blockers) |
| **You are here** | `resolveActiveProcessStripStageId` — strip ↔ tab / `?ws=` |
| **Cost narrative bridge** | Kosztorys E0–E12 — copy/link only (bez merge phase engine) |

**Status:** **PLAN APPROVED** · **DESIGN FREEZE v1.0** · **IMPLEMENT BLOCKED** (po NG-08-01 CLOSED)

**Findings:** PRG2-01…22 (audyt slice) · PRG-01…05 (parent)  
**Allowlist:** patrz slice PLAN §3

---

### NG-08-03 — Workspace Intelligence

**Cel:** **Unified intelligence surface** — jeden kanoniczny punkt insights w detalu; **KPI-UX-01 PASS**.

| Element | Zakres |
|---------|--------|
| **Intelligence hub** | Dedykowany surface (panel / sekcja always-visible na Przetargu **lub** strip shortcut) — nie chowany w domkniętym accordionie |
| **DOC → INT ≤1** | Z tab Dokumenty: **1 klik** do intelligence (strip stage / pinned panel / cross-tab anchor — UI-only) |
| **Reuse SSOT** | `intelligenceCtx`, `buildWorkspaceV2Insights`, executive summary na Decyzji — **layout only** |
| **Strategy bridge** | Portfolio panel: return path do workspace; nie wymuszać opuszczenia bez kontekstu |

**Findings:** AI-01…05, CTX-01, CTX-06, KPI-UX-01, IA-02, CTX-05  
**Visual:** V-4, V-10  
**Allowlist:** `TenderPrzetargWorkspace.tsx`, `TenderWorkflowHubPanel.tsx`, `TenderWorkspaceV2Panel.tsx`, `TenderPortfolioPositionPanel.tsx`, `TenderDecisionView.tsx` (executive layout only)

**AC (skrót):**
- **KPI-UX-01 PASS** — owner smoke: Dokumenty → Intelligence ≤1 interakcja.
- Brak nowych pól KV / zmian `buildTenderIntelligenceContext()` semantyki.

---

### NG-08-04 — Documents Workspace

**Cel:** Dokumenty jako **część** workspace — ta sama typografia, sekcje, empty states co reszta.

| Element | Zakres |
|---------|--------|
| **Scanability** | Skrócenie vertical stack; section chrome `TenderUxSectionTitle` |
| **Empty states** | TEUX-6 pattern jak lista (NG-07) |
| **Operator cohesion** | Akcje dokumentów spójne z frame CTA (bez duplikacji ścieżek) |
| **Memory** | Expanded document groups — UI-only persist per `tenderId` (session LS) |

**Findings:** DOC-02, DOC-05, DOC-06, MEM-05, VIS-05  
**Visual:** V-5, V-9  
**Allowlist:** `TenderDocumentsWorkspace.tsx`, `TenderDocumentsSummaryHeader.tsx`, `TenderAttachmentsPanel.tsx`, `tender-grouped-documents.ts` (UI props only)

**AC (skrót):**
- Round-trip tab: expanded groups **zachowane** (V-9 owner check).
- Empty state dedykowany dla dokumentów bez SWZ.

---

### NG-08-05 — Cost Workspace

**Cel:** Kosztorys + Ceny jako **jeden cost workspace** w odczuciu użytkownika; **KPI-UX-02 PASS** (pierwszy tab kosztowy).

| Element | Zakres |
|---------|--------|
| **Cohesion** | Most Kosztorys ↔ Ceny (inline link / strip / shared KPI row) |
| **INT → COST ≤1** | Intelligence → pierwszy tab kosztowy w 1 klik (Process Strip / tab bar) |
| **Typography** | Migracja `text-[9px]`/`text-[10px]` w `TenderBidProposalPanel` → TEUX |
| **Mobile** | `TenderMobileRowCard` + density pass na Ceny |
| **Memory** | Scroll restoration per tab — UI-only session (opcjonalnie w tym slice lub spill) |

**Findings:** COST-01…06, IA-03, CTX-02, CTX-07, KPI-UX-02, VIS-02, MEM-01  
**Visual:** V-6, V-7, V-8, V-9, V-10  
**Allowlist:** `TenderKosztorysWorkspace.tsx`, `TenderBidProposalPanel.tsx`, `TenderQualificationWorkspace.tsx`, `TenderOfferSection.tsx` (typography only if touched)

**AC (skrót):**
- **KPI-UX-02 PASS** — Intelligence → Kosztorys **lub** Ceny ≤1 interakcja.
- Pełna wycena (oba taby): **2 kliki max** z jawnym mostem (nie więcej niż as-is).
- Kosztorys lazy mount **bez zmiany** technicznej struktury.

---

## 3. Mapowanie draft 7-slice → PLAN 5-slice

| Dawny draft | Nowy slice |
|-------------|------------|
| NG-08-01 IA + NG-08-03 Action Bar | **NG-08-01 Workspace Frame** |
| NG-08-02 Progress | **NG-08-02 Workspace Progress** |
| NG-08-05 Intelligence | **NG-08-03 Workspace Intelligence** |
| NG-08-04 Documents | **NG-08-04 Documents Workspace** |
| NG-08-06 Cost + NG-08-07 memory/visual spill | **NG-08-05 Cost Workspace** |

---

## 4. Cross-cutting (wszystkie slice’y)

| Temat | Zasada |
|-------|--------|
| **P0 continuity** | Każdy slice musi wzmacniać „jeden workspace” — review per commit |
| **Protected Core** | Zero `cloud-sync.ts`, Edge, pipeline, payroll |
| **Changelog** | Jeden wpis per slice release |
| **HelpView** | Aktualizacja po slice zmieniającym widoczne CTA/nawigację |
| **Test gate** | `npm run build` + Gate B tenders + workflow smokes (§5) |

---

## 5. Test gate (per slice)

| Komenda | Kiedy |
|---------|-------|
| `npm run build` | Każdy slice |
| `npm run test:infra -- --gate B --scope tenders` | Każdy slice |
| `npx vite-node scripts/test-tender-detail-nav-teux1.mjs` | NG-08-01 (frame / tab SSOT) |
| `npx vite-node scripts/test-tender-workflow-process-strip.mjs` | NG-08-02, NG-08-03 |
| `npx vite-node scripts/test-tender-workflow-primary-action.mjs` | NG-08-01 |
| `npx vite-node scripts/test-tender-documents-summary-header.mjs` | NG-08-04 |
| `npx vite-node scripts/test-tender-kosztorys-process-phase.mjs` | NG-08-05 |
| `npm run test:infra -- --gate B --scope payroll` | Każdy slice (16/16) |

---

## 6. Workflow status

```text
AUDIT (CODE)     ✅ ACCEPTED
AUDIT (VISUAL)   ✅ COMPLETE
UX LOCK          ✅ APPROVED
PLAN             ✅ APPROVED (ten plik)
DESIGN FREEZE    ✅ (NG-08-TEUX-DESIGN-FREEZE.md)
ARCH REVIEW      ⏸ PENDING
OWNER GO         ⛔ BLOCKED
IMPLEMENT        ⛔ BLOCKED
```

---

## 7. Następny krok

1. **ARCH REVIEW** — boundary + allowlist + KPI AC  
2. **OWNER GO** — jawne polecenie IMPLEMENT slice **NG-08-01**  
3. **IMPLEMENT** — jeden commit per slice · FAST RELEASE B  

**Zero implementacji** bez OWNER GO.

---

*SSOT PLAN — [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md) · Baseline: **2.63.72** @ **08a6649**.*
