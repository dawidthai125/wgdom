# NG-08-02 — Tender Workspace Progress · Bundle Closeout

> **Status:** **NG-08-02 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.74** · commit **`09259ad`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-08  
> **Owner GO:** #WORKFLOW-OWNER-GO-001 · IMPLEMENT REVIEW PASS  
> **Parent:** NG-08 TEUX slice 2/5 · **WF-02**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Persistent workflow context — Process Strip na wszystkich tabach V4, highlight „Tu jesteś”, postęp V2 poza accordionem, chip blockerów, most Kosztorys ↔ strip |
| **Deliverable** | P-01…P-06 (presentation only) |
| **Complexity** | **M** — 15 plików, 1 commit |
| **Rollback** | `git revert 09259ad` |

---

## 2. Zakres zamknięty (P-01…P-06)

| ID | Opis | Status |
|----|------|--------|
| **P-01** | Process Strip w `workspaceCommandSlot` na wszystkich tabach; `TenderStatusRibbon` = trust only | **CLOSED** |
| **P-02** | `resolveActiveProcessStripStageId` + highlight „Tu jesteś” (`aria-current`, ring, tooltip) | **CLOSED** |
| **P-03** | `TenderWorkspaceV2ProgressCompact` poza accordionem na Przetargu | **CLOSED** |
| **P-04** | Chip „Blokery (N)” w chrome → scroll `#tender-progress-accordion` | **CLOSED** |
| **P-05** | Hierarchia: strip chrome / analysis accordion / trust tylko `przetarg` | **CLOSED** |
| **P-06** | Most Kosztorys — hint pod `KosztorysProcessStatusBar` → strip | **CLOSED** |

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | WF-02 — strip globalny, ribbon trust-only | **PASS** |
| D2 | `resolveActiveProcessStripStageId` inbound map | **PASS** |
| D3 | V2 compact + blockers chip + Kosztorys bridge | **PASS** |
| D4 | Zero diff Protected Core | **PASS** |
| D5 | `test-tender-workflow-process-strip.mjs` | **PASS** 42/42 |
| D6 | `test-tender-command-teux7b.mjs` | **PASS** 32/32 |
| D7 | `test-p0-command-layer-height.mjs` | **PASS** 26/26 |
| D8 | `test-ng-03-2-command-layer.mjs` | **PASS** 17/17 |
| D9 | Gate B `scope:tenders` | **PASS** 15/15 |
| D10 | Gate B `scope:payroll` | **PASS** 16/16 |
| D11 | `npm run build` | **PASS** |
| D12 | CHANGELOG **2.63.74** · release B · verify FAST | **PASS** |
| D13 | Jeden commit · #CORE-013 | **PASS** `09259ad` |

---

## 4. Production verification

```text
curl https://www.wgdom.fun/version.json
→ version: 2.63.74
→ commit:  09259ad
→ HEAD:    09259ad (origin/main)
```

| Check | Werdykt |
|-------|---------|
| UI version | **2.63.74** |
| Runtime commit | **`09259ad`** = HEAD |
| PRODUCTION VERIFIED | **TAK** |

---

## 5. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / Cloud Sync / Pipeline runtime / Parser / Edge / `App.tsx` CORE | **NO DIFF** |

---

## 6. Pliki release (commit `09259ad`)

| Warstwa | Pliki |
|---------|--------|
| UI | `TenderDetailPage.tsx`, `TenderStatusRibbon.tsx`, `TenderWorkflowProcessStrip.tsx`, `TenderWorkflowHubPanel.tsx`, `TenderWorkspaceV2Panel.tsx`, `TenderKosztorysWorkspace.tsx` |
| Lib | `tender-workflow-process-strip.ts`, `tender-command-layer-ux.ts` |
| Docs UX | `changelog-data.ts`, `GuideView.tsx`, `CHANGELOG.md` |
| Testy | `test-tender-workflow-process-strip.mjs`, `test-tender-command-teux7b.mjs`, `test-p0-command-layer-height.mjs`, `test-ng-03-2-command-layer.mjs` |

---

## 7. Owner smoke (opcjonalny)

| ID | Scenariusz | Status |
|----|------------|--------|
| SS-P2-01 | Strip + CTA — Przetarg 390/1280 | ☐ owner |
| SS-P2-02 | Dokumenty — strip visible | ☐ owner |
| SS-P2-03 | Kosztorys — bridge hint | ☐ owner |
| SS-P2-04 | Decyzja › Kwalifikacja — highlight Oferta | ☐ owner |
| SS-P2-05 | Blockers > 0 — chip + accordion | ☐ owner |
| SS-P2-06 | Round-trip tabs — strip continuity | ☐ owner |

---

## 8. Artefakty SSOT

| Artefakt | Ścieżka |
|----------|---------|
| UX AUDIT | [`NG-08-02-TEUX-UX-AUDIT.md`](./NG-08-02-TEUX-UX-AUDIT.md) |
| PLAN | [`NG-08-02-TEUX-PLAN.md`](./NG-08-02-TEUX-PLAN.md) |
| DESIGN FREEZE | [`NG-08-02-TEUX-DESIGN-FREEZE.md`](./NG-08-02-TEUX-DESIGN-FREEZE.md) |
| ARCH REVIEW | [`NG-08-02-TEUX-ARCHITECTURE-REVIEW.md`](./NG-08-02-TEUX-ARCHITECTURE-REVIEW.md) |
| Closeout | ten plik |

---

## 9. Roadmapa NG-08 (po NG-08-02)

```text
NG-08-01 Workspace Frame     — CLOSED (2.63.73 · 84b1491)
NG-08-02 Workspace Progress  — ★ CLOSED (2.63.74 · 09259ad)
NG-08-03 … NG-08-05          — BLOCKED (osobny AUDIT + Owner GO)
```

**Zakaz:** nie rozpoczynać NG-08-03 bez osobnego workflow Ownera.

---

**NG-08-02 Workspace Progress — BUNDLE CLOSED · PRODUCTION VERIFIED**
