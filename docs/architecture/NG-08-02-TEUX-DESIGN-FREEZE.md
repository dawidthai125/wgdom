# NG-08-02 — Tender Workspace Progress · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.0 — PENDING ARCH REVIEW + OWNER GO**  
> **Data freeze:** 2026-07-08  
> **Bundle ID:** **NG-08-02** (slice 2/5 parent **NG-08**)  
> **Class:** **FEATURE UI** · **WF-02** · #CORE-013 · #CORE-014  
> **Baseline prod:** UI **2.63.73** · commit **`84b1491`** · **PRODUCTION VERIFIED**  
> **Poprzedni slice:** **NG-08-01 CLOSED** (`84b1491`)  
> **Audyt:** [`NG-08-02-TEUX-UX-AUDIT.md`](./NG-08-02-TEUX-UX-AUDIT.md) — **AUDIT (CODE) ACCEPTED**  
> **PLAN:** [`NG-08-02-TEUX-PLAN.md`](./NG-08-02-TEUX-PLAN.md) — **APPROVED**  
> **Parent freeze:** [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md) § NG-08-02  
> **IMPLEMENT:** **BLOCKED** do jawnego **FEATURE Owner GO**

```text
CEL FREEZE:
Process Strip jako stały element workspace chrome (WF-02),
„you are here” zsynchronizowane z tabem, hierarchia postępu bez nowego SSOT.

WORKFLOW: AUDIT ✅ → PLAN ✅ → DESIGN FREEZE ✅ (ten plik)
          → ARCH REVIEW ⏸ → OWNER GO ⛔ → IMPLEMENT ⛔
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | UX postępu workflow w detalu `/przetargi/:tenderId/*` — slice **Workspace Progress** |
| **Reguła #1** | **WF-02** — Process Strip = komponent **workspace**, nie tabu |
| **Nowe pole KV** | **Brak** |
| **Nowe tokeny** | **Brak** (import-only `tender-ux-tokens.ts`) |
| **Nowa logika biznesowa** | **Brak** — wyłącznie `resolveActiveProcessStripStageId` (mapa UI) |
| **Wersja release** | **2.63.74** (propozycja) |
| **Principles** | **#NG08-002-02** · **WF-02** · parent **#NG08-001–012** |

### Final Decision

**PENDING ARCH REVIEW + OWNER GO** — specyfikacja slice 02 kompletna. **IMPLEMENT pozostaje BLOCKED**.

---

## 1. Principles (slice 02)

| ID | Zasada |
|----|--------|
| **WF-02** | **Process Strip jest komponentem workspace** — montowany w Command Layer / `workspaceCommandSlot` na **wszystkich** tabach V4; **zakaz** warunku `activeTab === "przetarg"` dla strip. |
| **WF-02a** | **Jeden mount** — przy `commandLayerActive=true` strip **nie** renderuje się ponownie w `TenderWorkflowHubPanel`. |
| **WF-02b** | **Trust ribbon** = warstwa **secondary**; collapsible trust chips **tylko** na tab `przetarg` (desktop). Strip = **primary** na każdym tabie. |
| **WF-02c** | **Outbound nawigacja** — wyłącznie `workflowProcessStripStageToV4Navigate`; **bez zmian** semantyki. |
| **#NG08-002-02** | **Persistent workflow context** — użytkownik na dowolnym tabie widzi tę samą mapę 5 etapów + status done/partial/missing. |
| **#NG08-002-02a** | **Reuse SSOT** — `buildWorkflowProcessStripStages`, `computeWorkspaceV2AutoProgress`, `intelligenceCtx`, trust overlay — **read-only**. |
| **#NG08-002-02b** | **Zero nowego SSOT** — brak KV, brak zmian pipeline, scoringu, phase engine. |
| **#NG08-002-02c** | **TOKEN FREEZE** — highlight „Tu jesteś” przez istniejące klasy TEUX (`ring-primary`, `aria-current="step"`). |

---

## 2. Architektura montażu (frozen)

```text
TenderDetailPage
└── TenderDetailCommandLayer
      ├── Tab bar + breadcrumb (NG-08-01)
      ├── KPI compact (tab ≠ przetarg)
      └── workspaceCommandSlot
            ├── [przetarg only] Trust collapsible (TenderStatusRibbon trust slice)
            ├── TenderWorkflowProcessStrip  ← WF-02 · WSZYSTKIE TABY
            │     props: variant=ribbon
            │             activeTab, decyzjaWorkspace → activeStageId
            │             stages ← buildWorkflowProcessStripStages(...)
            │             trust ← trustStageOverlayLevel (existing)
            ├── [blockersCount > 0] BlockersChip → #tender-progress-accordion
            └── TenderWorkflowPrimaryAction (NG-08-01 · bez zmian semantyki)

tab=przetarg → TenderWorkflowHubPanel
      ├── commandLayerActive → BEZ strip / BEZ CTA duplicate
      ├── V2 compact row (always-visible above accordion) ← AC-02-03
      └── <details id="tender-progress-accordion"> secondary:
            Analysis strip · V2 full · Blockers · Checklist

tab=kosztorys → KosztorysProcessStatusBar + bridge hint (AC-02-05)
tab ∈ {dokumenty, ceny, decyzja} → strip w chrome only (WF-02)
```

---

## 3. `resolveActiveProcessStripStageId` (frozen spec)

**Lokalizacja:** `src/lib/tender-workflow-process-strip.ts`  
**Typ:** pure function · **prezentacja only** · **nie** wpływa na `buildWorkflowProcessStripStages`

```typescript
export function resolveActiveProcessStripStageId(
  activeTab: TenderDetailV4TabId,
  decyzjaWorkspace?: DecyzjaV4EmbedWorkspace | null,
): WorkflowProcessStripStageId | null
```

### 3.1 Mapa (frozen)

| `activeTab` | `decyzjaWorkspace` | `activeStageId` | Uwagi UI |
|-------------|-------------------|-----------------|----------|
| `przetarg` | — | `null` | Hub — brak ring; breadcrumb „Przetarg” wystarczy |
| `dokumenty` | — | `"documents"` | Stage „Analiza” na tym samym tabie — **bez** drugiego highlight (P1 backlog) |
| `kosztorys` | — | `"kosztorys"` | Most do `KosztorysProcessStatusBar` (AC-02-05) |
| `ceny` | — | `"wycena"` | — |
| `decyzja` | `overview` | `"offer"` | Sub-tab overview = ścieżka Oferta |
| `decyzja` | `qualification` | `"offer"` | Breadcrumb „Kwalifikacja” (NG-08-01) + stage Oferta |
| `decyzja` | `offer` | `"offer"` | — |

**Inverse of outbound:** nie wymaga pełnej bijekcji — `analysis` → `dokumenty` outbound; inbound `dokumenty` → `documents` (P0).

### 3.2 Prezentacja highlight (frozen)

| Element | Wymaganie |
|---------|-----------|
| Aktywny stage button | `aria-current="step"` |
| Wizual | `ring-2 ring-primary/50` lub istniejący TEUX active pattern |
| Copy (opcjonalnie) | `title` / `sr-only`: „Tu jesteś — {label}” |
| Nieaktywne stage | bez ring; zachować done/partial/missing + trust overlay |

---

## 4. Acceptance Criteria (frozen)

### AC-02-01 — Strip na każdym tabie

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | Na tabach `przetarg`, `dokumenty`, `kosztorys`, `ceny`, `decyzja` strip widoczny w Command Layer **bez** zmiany tabu | Owner smoke + `data-workflow-process-stage` w DOM |
| 2 | Strip używa `variant=ribbon` (compact, horizontal scroll) | Visual SS-P2-01, SS-P2-02 |
| 3 | Klik stage → nawigacja 1 klik (`workflowProcessStripStageToV4Navigate`) | `test-tender-workflow-process-strip.mjs` |

### AC-02-02 — „You are here”

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | `resolveActiveProcessStripStageId` zgodny z §3.1 | unit test w strip smoke |
| 2 | Aktywny stage ma `aria-current="step"` | a11y inspect |
| 3 | Round-trip tab → stage → tab zachowuje highlight | SS-P2-04, SS-P2-06 |

### AC-02-03 — V2 / blockers visibility

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | Gdy `intelligenceCtx.overlay.allBlocks.length > 0` — accordion **domyślnie open** (bez regresji) | istniejące zachowanie |
| 2 | Gdy blockers > 0 — **BlockersChip** widoczny w chrome (P-04) | SS-P2-05 |
| 3 | Na `przetarg` — V2 compact row **poza** accordion (pillars lub % z `computeWorkspaceV2AutoProgress`) | owner smoke |

### AC-02-04 — Hierarchia primary / secondary

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | **Primary:** Process Strip w chrome | WF-02 |
| 2 | **Secondary:** Trust collapsible (przetarg), Analysis strip (accordion only), Kosztorys phase bar (content) | brak analysis w chrome |
| 3 | Nie więcej niż **jeden** pełny strip w viewport | brak duplikatu hub |

### AC-02-05 — Kosztorys bridge (minimal)

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | Pod `KosztorysProcessStatusBar` — tekst/link „Proces oferty” wskazujący stage Kosztorys w chrome strip | SS-P2-03 |
| 2 | **Bez** zmiany `deriveKosztorysProcessPhase` / merge z strip stages | code review |

### AC-02-06 — Chrome budget (mobile)

| # | Kryterium | Weryfikacja |
|---|-----------|-------------|
| 1 | Command Layer + strip + CTA ≤ **50vh** na 390px (lub udokumentowany waiver) | `test-p0-command-layer-height.mjs` |
| 2 | Strip: horizontal scroll, nie wrap do >2 linii na mobile | SS-P2-01 |

---

## 5. Reuse matrix (frozen — read-only)

| SSOT | Użycie w slice 02 | Zmiana dozwolona |
|------|-------------------|------------------|
| `buildWorkflowProcessStripStages` | stage list + status | **Nie** |
| `computeWorkspaceV2AutoProgress` | V2 compact % / pillars | **Nie** (tylko read) |
| `intelligenceCtx` | blockers count, prepStatus w strip | **Nie** (shape) |
| `workflowProcessStripStageToV4Navigate` | klik stage | **Nie** |
| `trustStageOverlayLevel` / `buildProcessStripStagePresentation` | overlay na stage | **Nie** |
| `resolveActiveProcessStripStageId` | **nowy** — UI map inbound | **Tak** (jedyny nowy export w slice) |

---

## 6. Protected boundaries (frozen)

| Obszar | Zakaz |
|--------|-------|
| `buildWorkflowProcessStripStages` reguły statusów | diff logiki |
| `deriveKosztorysProcessPhase` | diff |
| `buildTenderIntelligenceContext` | diff shape / algorytmy |
| `useTenderPipelineRuntime` | behavior change |
| `cloud-sync.ts` / Edge / Payroll | any diff |
| `tender-ux-tokens.ts` | nowe exporty |
| Pipeline bootstrap / parser | any diff |
| NG-08-03 Intelligence hub | **nie** w tym commicie |

---

## 7. Visual validation gate

| ID | Scenariusz | Status |
|----|------------|--------|
| SS-P2-01 | Strip + CTA — Przetarg 390/1280 | ☐ owner (opcjonalny przed GO) |
| SS-P2-02 | Dokumenty — strip visible (post-IMPLEMENT) | ☐ |
| SS-P2-03 | Kosztorys — bridge hint | ☐ |
| SS-P2-04 | Decyzja › Kwalifikacja — highlight Oferta | ☐ |
| SS-P2-05 | Blockers > 0 — chip + accordion | ☐ |
| SS-P2-06 | Round-trip tabs — strip continuity | ☐ |

**Gate:** IMPLEMENT dozwolony po **OWNER GO**; screenshots **post-IMPLEMENT** obowiązkowe do closeout.

---

## 8. Release model

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.63.74** |
| **Klasa** | B functional UI |
| **Commit** | jeden · NG-08-02 only |
| **Changelog** | Workspace Progress — strip na wszystkich tabach, „Tu jesteś” |
| **HelpView** | sekcja Przetargi — Process Strip ciągły na tabach |

### Test gate (frozen)

`npm run build` · Gate B tenders 15/15 · Gate B payroll 16/16 · `test-tender-workflow-process-strip.mjs` · `test-tender-command-teux7b.mjs` · `test-p0-command-layer-height.mjs`

---

## 9. Dokumentacja post-IMPLEMENT

| Plik | Kiedy |
|------|-------|
| `CHANGELOG` + `CHANGELOG.md` | release 2.63.74 |
| `HelpView` | jeśli zmieniona widoczność strip |
| `docs/architecture/NG-08-02-TEUX-CLOSEOUT.md` | PRODUCTION VERIFIED |
| `CURRENT-TASK.md` | po deploy |

---

## 10. Workflow status

```text
NG-08-01           ✅ CLOSED · 2.63.73 @ 84b1491
NG-08-02 AUDIT     ✅ CODE ACCEPTED
NG-08-02 PLAN      ✅ APPROVED
NG-08-02 FREEZE    ✅ v1.0 (ten plik) — PENDING ARCH REVIEW ← CURRENT
ARCH REVIEW        ⏸ PENDING
OWNER GO           ⛔ BLOCKED
IMPLEMENT          ⛔ BLOCKED
```

---

## 11. Następny krok

1. **ARCH REVIEW** — WF-02 + `resolveActiveProcessStripStageId` + allowlist  
2. **OWNER GO** — jawne „IMPLEMENT NG-08-02”  
3. **IMPLEMENT** — jeden commit · **2.63.74**

**Zero implementacji** bez OWNER GO.

---

*SSOT freeze slice 02 · PLAN: [`NG-08-02-TEUX-PLAN.md`](./NG-08-02-TEUX-PLAN.md) · Baseline: **2.63.73** @ **84b1491**.*
