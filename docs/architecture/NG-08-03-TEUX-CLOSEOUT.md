# NG-08-03 — Tender Workspace Intelligence · Bundle Closeout

> **Status:** **NG-08-03 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.75** · commit **`caa46b1`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-08  
> **Owner GO:** #WORKFLOW-OWNER-GO-001 · IMPLEMENT REVIEW PASS  
> **Parent:** NG-08 TEUX slice 3/5 · **WF-03** · **REC-1**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Unified intelligence surface — kanoniczny hub insights na Przetargu, KPI-UX-01 PASS (Dokumenty → Intelligence ≤1 interakcja) |
| **Deliverable** | REC-1 = OPT-A + OPT-B + OPT-E · P-01…P-06 (presentation only) |
| **Complexity** | **M** — 10 plików, 1 commit release |
| **Rollback** | `git revert caa46b1` → baseline **2.63.74** @ `09259ad` |

---

## 2. Zakres zamknięty (P-01…P-06)

| ID | Opis | Status |
|----|------|--------|
| **P-01** | Split progress/insights — `skipInsightsSection` (OPT-E); naprawa INT3-15 | **CLOSED** |
| **P-02** | `TenderWorkspaceV2InsightsCompact` pinned nad accordionem; `#tender-intelligence-hub` (OPT-A) | **CLOSED** |
| **P-03** | `IntelligenceShortcutChip` w Command Layer — navigate + scroll (OPT-B) | **CLOSED** |
| **P-04** | Narrative excerpt w hubie (max 2 linie, bez werdyktu) | **CLOSED** |
| **P-05** | TEUX typography na `TenderDecisionView` | **CLOSED** |
| **P-06** | Copy return path Strategia (`aria-label` portfolio) | **CLOSED** |

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | WF-03 — hub pinned, shortcut globalny, werdykt tylko Decyzja | **PASS** |
| D2 | KPI-UX-01 wiring — chip → `#tender-intelligence-hub` | **PASS** |
| D3 | Reuse `buildWorkspaceV2Insights` — zero nowego scoringu | **PASS** |
| D4 | Strip outbound map bez zmian (AC-03-05) | **PASS** |
| D5 | Zero diff Protected Core | **PASS** |
| D6 | `test-tender-workspace-intelligence-ng08-03.mjs` | **PASS** 17/17 |
| D7 | `test-tender-workflow-process-strip.mjs` | **PASS** 42/42 |
| D8 | `test-p0-command-layer-height.mjs` | **PASS** 26/26 |
| D9 | Gate B `scope:tenders` | **PASS** 15/15 |
| D10 | Gate B `scope:payroll` | **PASS** 16/16 |
| D11 | `npm run build` | **PASS** |
| D12 | CHANGELOG **2.63.75** · release B · verify | **PASS** |
| D13 | Jeden commit release · #CORE-013 | **PASS** `caa46b1` |

---

## 4. Production verification

```text
curl https://www.wgdom.fun/version.json
→ version: 2.63.75
→ commit:  caa46b1
→ HEAD:    caa46b1 (origin/main)
```

| Check | Werdykt |
|-------|---------|
| UI version | **2.63.75** |
| Runtime commit | **`caa46b1`** = HEAD release |
| PRODUCTION VERIFIED | **TAK** |

---

## 5. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit release | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / Cloud Sync / Pipeline / Parser / Edge / `App.tsx` CORE | **NO DIFF** |
| `tender-intelligence-context.ts` / `tender-workflow-process-strip.ts` | **NO DIFF** |

---

## 6. Pliki release (commit `caa46b1`)

| Warstwa | Pliki |
|---------|--------|
| UI | `TenderWorkspaceV2Panel.tsx`, `TenderWorkflowHubPanel.tsx`, `TenderDetailPage.tsx`, `TenderDecisionView.tsx`, `TenderPortfolioPositionPanel.tsx` |
| Lib | `tender-command-layer-ux.ts` |
| Docs UX | `changelog-data.ts`, `GuideView.tsx`, `CHANGELOG.md` |
| Testy | `test-tender-workspace-intelligence-ng08-03.mjs` |

---

## 7. Owner smoke (opcjonalny)

| ID | Scenariusz | Status |
|----|------------|--------|
| SS-P3-01 | Przetarg — insights bez accordionu | ☐ owner |
| SS-P3-02 | Dokumenty → Intelligence ≤1 klik | ☐ owner |
| SS-P3-03 | blockers=0 — hub visible | ☐ owner |
| SS-P3-04 | Decyzja executive vs hub typography | ☐ owner |
| SS-P3-05 | Strategia → powrót (manual) | ☐ owner |
| SS-P3-06 | Strip „Analiza” → Dokumenty (no regresja) | ☐ owner |

---

## 8. Artefakty SSOT

| Artefakt | Ścieżka |
|----------|---------|
| UX AUDIT | [`NG-08-03-TEUX-UX-AUDIT.md`](./NG-08-03-TEUX-UX-AUDIT.md) |
| PLAN | [`NG-08-03-TEUX-PLAN.md`](./NG-08-03-TEUX-PLAN.md) |
| DESIGN FREEZE | [`NG-08-03-TEUX-DESIGN-FREEZE.md`](./NG-08-03-TEUX-DESIGN-FREEZE.md) |
| Closeout | ten plik |

---

## 9. Roadmapa NG-08 (po NG-08-03)

```text
NG-08-01  ✅ CLOSED · 2.63.73 @ 84b1491
NG-08-02  ✅ CLOSED · 2.63.74 @ 09259ad
NG-08-03  ✅ CLOSED · 2.63.75 @ caa46b1  ← CURRENT
NG-08-04  ⛔ BLOCKED — Documents workspace (po owner GO)
NG-08-05  ⛔ BLOCKED — Cost cohesion (po 04)
```

**Następny slice:** NG-08-04 — tylko na jawne OWNER GO + AUDIT/PLAN.

---

*SSOT closeout slice 03 · Baseline prod: **2.63.75** @ **caa46b1**.*
