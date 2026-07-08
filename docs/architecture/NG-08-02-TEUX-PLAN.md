# NG-08-02 — Tender Workspace Progress · PLAN

> **Status:** **PLAN APPROVED** (post AUDIT ACCEPTED)  
> **Data:** 2026-07-08  
> **Bundle ID:** **NG-08-02** (slice 2/5 parent **NG-08**)  
> **Class:** **FEATURE UI** · **WF-02** · #CORE-013 · #CORE-014  
> **Baseline prod:** UI **2.63.73** · commit **`84b1491`** · **PRODUCTION VERIFIED**  
> **Poprzedni slice:** **NG-08-01 CLOSED** (`84b1491`)  
> **Audyt:** [`NG-08-02-TEUX-UX-AUDIT.md`](./NG-08-02-TEUX-UX-AUDIT.md) — **AUDIT (CODE) ACCEPTED**  
> **Freeze:** [`NG-08-02-TEUX-DESIGN-FREEZE.md`](./NG-08-02-TEUX-DESIGN-FREEZE.md)  
> **Parent:** [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) · [`NG-08-TEUX-DESIGN-FREEZE.md`](./NG-08-TEUX-DESIGN-FREEZE.md)  
> **IMPLEMENT:** **BLOCKED** do **ARCH REVIEW** + **OWNER GO**

```text
CEL (jeden bundle):
Persistent workflow context — Process Strip jako komponent WORKSPACE (WF-02),
widoczny na każdym tabie V4, z „you are here”, bez nowego SSOT.

WORKFLOW: AUDIT ✅ → PLAN ✅ (ten plik) → DESIGN FREEZE ✅
         → ARCH REVIEW ⏸ → OWNER GO ⛔ → IMPLEMENT ⛔
```

---

## 0. Werdykt PLAN

| Pole | Wartość |
|------|---------|
| **Reguła architektoniczna** | **WF-02** — Process Strip = komponent workspace, **nie** komponent tabu |
| **P0 gap (audyt)** | Strip tylko na `przetarg` · brak `activeStageId` · V2/blockers w zamkniętym accordionie |
| **Reuse SSOT (read-only)** | `buildWorkflowProcessStripStages` · `computeWorkspaceV2AutoProgress` · `intelligenceCtx` · `workflowProcessStripStageToV4Navigate` · trust overlay |
| **Nowy SSOT** | **Brak** — wyłącznie helper prezentacji `resolveActiveProcessStripStageId` (UI-only map) |
| **One slice = one commit** | Tak · zero mixed CORE |
| **Wersja docelowa** | **2.63.74** (propozycja) |
| **IMPLEMENT** | **BLOCKED** |

---

## 1. WF-02 — zasada montażu (frozen)

| ID | Zasada |
|----|--------|
| **WF-02** | **Process Strip jest komponentem workspace** — montowany w `TenderDetailPage` / Command Layer slot, **nie** warunkowany `activeTab === "przetarg"`. |
| **WF-02a** | Strip **jeden mount** w chrome — gdy `commandLayerActive`, **zero** duplikatu w `TenderWorkflowHubPanel`. |
| **WF-02b** | Trust ribbon (collapsible) pozostaje **opcjonalnie tylko na tab `przetarg`** — strip i trust to **osobne** warstwy hierarchii (AC-02-04). |
| **WF-02c** | Nawigacja strip → tab reuse `workflowProcessStripStageToV4Navigate` — **bez zmian** outbound map. |

### 1.1 As-is → To-be (mount)

```text
AS-IS (2.63.73):
  workspaceCommandSlot
    ├── activeTab === przetarg → TenderStatusRibbon (trust + strip)
    └── TenderWorkflowPrimaryAction (wszystkie taby)

TO-BE (NG-08-02):
  workspaceCommandSlot
    ├── activeTab === przetarg → Trust collapsible only (TenderStatusRibbon trust slice)
    ├── TenderWorkflowProcessStrip variant=ribbon (WSZYSTKIE taby) ← WF-02
    ├── BlockersChip (gdy blockersCount > 0) — opcjonalnie w chrome
    └── TenderWorkflowPrimaryAction (wszystkie taby — NG-08-01, bez zmian semantyki)
```

---

## 2. Zakres implementacji (6 pakietów)

### P-01 — Strip globalny w Command Layer (**P0**)

| Pole | Wartość |
|------|---------|
| **Cel** | AC-02-01 — strip widoczny na **każdym** tabie bez zmiany tabu |
| **Zmiana** | Usunąć gate `activeTab === "przetarg"` dla strip; montować `TenderWorkflowProcessStrip` w `workspaceCommandSlot` zawsze gdy `intelligenceCtx` |
| **Pliki** | `TenderDetailPage.tsx`, `TenderStatusRibbon.tsx` (split trust / strip) |
| **Findings** | PRG2-01, PRG2-04, PRG2-16 |

### P-02 — „You are here” (`activeStageId`) (**P0**)

| Pole | Wartość |
|------|---------|
| **Cel** | AC-02-02 — aktywny stage = aktywny tab / sub-tab Decyzja |
| **Zmiana** | Nowy helper `resolveActiveProcessStripStageId(activeTab, decyzjaWorkspace)` — **prezentacja only**; props `activeStageId` na strip → ring / `aria-current="step"` / label „Tu jesteś” |
| **Pliki** | `tender-workflow-process-strip.ts` (helper), `TenderWorkflowProcessStrip.tsx`, `tender-command-layer-ux.ts` (opcjonalnie label copy) |
| **Findings** | PRG2-05, PRG2-06, PRG2-07 |

### P-03 — V2 progress always-visible na Przetargu (**P1**)

| Pole | Wartość |
|------|---------|
| **Cel** | AC-02-03 — postęp V2 nie ukryty gdy są blockery; lepsza widoczność gdy brak blockerów |
| **Zmiana** | `TenderWorkspaceV2Panel` compact row **poza** accordion na tab `przetarg` (hub content); accordion = szczegóły secondary |
| **Pliki** | `TenderWorkflowHubPanel.tsx`, `TenderWorkspaceV2Panel.tsx` |
| **Findings** | PRG2-10, PRG2-13 |

### P-04 — Blockers chip w chrome (**P1**)

| Pole | Wartość |
|------|---------|
| **Cel** | AC-02-03 — `intelligenceCtx.overlay.allBlocks` widoczne bez expand accordion |
| **Zmiana** | Chip/badge w `workspaceCommandSlot` gdy `blockersCount > 0`; klik → scroll/expand `#tender-progress-accordion` |
| **Pliki** | `TenderDetailPage.tsx`, `TenderWorkflowHubPanel.tsx` (anchor id) |
| **Findings** | PRG2-12, PRG2-13, PRG2-14 |

### P-05 — Hierarchia primary / secondary (**P1**)

| Pole | Wartość |
|------|---------|
| **Cel** | AC-02-04 — jedna dominująca narracja: **strip primary**, trust + analysis **secondary** |
| **Zmiana** | `TenderAnalysisStatusStrip` **tylko** w accordion „Szczegóły postępu”; nie duplikować w chrome; trust poza strip na Przetargu |
| **Pliki** | `TenderWorkflowHubPanel.tsx` (weryfikacja — bez nowego mount analysis w chrome) |
| **Findings** | PRG2-19, PRG2-20 |

### P-06 — Kosztorys bridge (minimal) (**P1**)

| Pole | Wartość |
|------|---------|
| **Cel** | Wizualny most E0–E12 ↔ strip stage „Kosztorys” — **copy/link only** |
| **Zmiana** | Inline hint pod `KosztorysProcessStatusBar`: „Etap oferty: Kosztorys” + link scroll do chrome strip (lub tab Przetarg) — **bez** merge `deriveKosztorysProcessPhase` |
| **Pliki** | `TenderKosztorysWorkspace.tsx` |
| **Findings** | PRG2-03, PRG2-22 |

**Poza zakresem P-06:** scalanie phase engine · zmiana reguł `buildWorkflowProcessStripStages`.

---

## 3. Allowlist (ścisła)

| Plik | Dozwolone | Zakazane |
|------|-----------|----------|
| `TenderDetailPage.tsx` | mount strip all tabs, blockers chip | pipeline / sync |
| `TenderDetailCommandLayer.tsx` | `data-*` attrs, opcjonalny slot label | logika postępu |
| `TenderStatusRibbon.tsx` | split trust-only; strip usunięty stąd | nowe trust rules |
| `TenderWorkflowProcessStrip.tsx` | `activeStageId`, highlight UI | zmiana stage build rules |
| `tender-workflow-process-strip.ts` | `resolveActiveProcessStripStageId` only | zmiana `buildWorkflowProcessStripStages` |
| `tender-command-layer-ux.ts` | copy „Tu jesteś” / stage label | — |
| `TenderWorkflowHubPanel.tsx` | V2 compact, accordion anchor, dedup strip | nowe intelligence algorytmy |
| `TenderWorkspaceV2Panel.tsx` | compact variant props | zmiana `computeWorkspaceV2AutoProgress` |
| `TenderKosztorysWorkspace.tsx` | minimal bridge copy/link | phase engine |
| `TenderAnalysisStatusStrip.tsx` | — | **diff zakazany** (secondary only — bez zmian) |
| `changelog-data.ts` + `CHANGELOG.md` + `GuideView` | release 2.63.74 | — |
| `scripts/test-tender-workflow-process-strip.mjs` | test `resolveActiveProcessStripStageId` | — |

**Protected (zero diff):** `cloud-sync.ts` · `supabase/functions/**` · `useTenderPipelineRuntime` behavior · `buildTenderIntelligenceContext` shape · `deriveKosztorysProcessPhase` · parser · Edge · Payroll.

---

## 4. Mapowanie AC → pakiety

| AC | Pakiety | Priorytet |
|----|---------|-----------|
| **AC-02-01** Strip na każdym tabie | P-01 | P0 |
| **AC-02-02** Active stage = active tab | P-02 | P0 |
| **AC-02-03** V2/blockers widoczne przy blockerach | P-03, P-04 | P1 |
| **AC-02-04** Hierarchia primary/secondary | P-01, P-05 | P1 |
| **AC-02-05** Kosztorys bridge (freeze) | P-06 | P1 |
| **AC-02-06** Chrome budget mobile (freeze) | P-01, P-02 | P0 gate |

---

## 5. Test gate

| Komenda | Cel | Gate |
|---------|-----|------|
| `npm run build` | compile | **PASS wymagany** |
| `npm run test:infra -- --gate B --scope tenders` | regresja przetargi | **15/15** |
| `npm run test:infra -- --gate B --scope payroll` | #CORE-013 boundary | **16/16** |
| `npx vite-node scripts/test-tender-workflow-process-strip.mjs` | strip SSOT + `resolveActiveProcessStripStageId` | PASS |
| `npx vite-node scripts/test-tender-command-teux7b.mjs` | command layer trust | PASS |
| `npx vite-node scripts/test-p0-command-layer-height.mjs` | chrome ≤50vh mobile | PASS / documented waiver |

**Owner smoke (post-deploy):** round-trip Dokumenty → Kosztorys → Ceny — strip widoczny, highlight zmienia się (SS-P2-06).

---

## 6. Risk assessment

| Ryzyko | Klasa | Mitigacja |
|--------|-------|-----------|
| Mobile chrome overflow (strip + CTA + tab bar) | **P0** | `variant=ribbon` + horizontal scroll; `test-p0-command-layer-height` |
| Duplikat strip hub vs chrome | P1 | `commandLayerActive` — jeden mount WF-02a |
| False „you are here” na `dokumenty` (documents vs analysis) | P2 | freeze map: tab `dokumenty` → stage `documents` (P0); opcjonalny P1 refinement w backlog |
| `przetarg` bez stage highlight | P2 | `activeStageId=null` — hub; breadcrumb NG-08-01 wystarczy |
| #CORE-013 mixed commit | **P0** | allowlist §3 · jeden commit |
| Kosztorys dual narrative confusion | P1 | P-06 link only |

---

## 7. Zależności

| Zależność | Status |
|-----------|--------|
| **NG-08-01** Workspace Frame | **CLOSED** — CTA per tab, breadcrumb Decyzja |
| **NG-08-03** Intelligence | **BLOCKED** — po 02; nie mieszać w tym commicie |
| **Tab SSOT** (`pendingTab`, `?ws=`) | **frozen** — zero regresji |

---

## 8. Workflow status

```text
NG-08-01           ✅ CLOSED · 2.63.73 @ 84b1491
NG-08-02 AUDIT     ✅ CODE ACCEPTED
NG-08-02 PLAN      ✅ APPROVED (ten plik) ← CURRENT
NG-08-02 FREEZE    ✅ (NG-08-02-TEUX-DESIGN-FREEZE.md)
ARCH REVIEW        ⏸ PENDING
OWNER GO           ⛔ BLOCKED
IMPLEMENT            ⛔ BLOCKED
```

---

## 9. Następny krok

1. **ARCH REVIEW** — WF-02 mount + allowlist + chrome budget  
2. **OWNER GO** — jawne „IMPLEMENT NG-08-02”  
3. **IMPLEMENT** — jeden commit · FAST RELEASE B · **2.63.74**

**Zero implementacji** bez OWNER GO.

---

*SSOT PLAN slice 02 · Parent: [`NG-08-TEUX-PLAN.md`](./NG-08-TEUX-PLAN.md) · Baseline: **2.63.73** @ **84b1491**.*
