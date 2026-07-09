# NG-08-04 — Tender Documents Workspace · Bundle Closeout

> **Status:** **NG-08-04 CLOSED** · **PRODUCTION VERIFIED**  
> **Prod:** UI **2.63.76** · commit **`6f6bb66`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-08  
> **Owner GO:** #WORKFLOW-OWNER-GO-001 · IMPLEMENT REVIEW PASS  
> **Parent:** NG-08 TEUX slice 4/5 · **WF-04** · **REC-1**

---

## 1. Podsumowanie bundla

| Pole | Wartość |
|------|---------|
| **Cel** | Documents workspace cohesion — TEUX section chrome, LS persist expanded groups, secondary collapse metadanych SWZ, touch-safe headers |
| **Deliverable** | REC-1 = OPT-A + OPT-B + OPT-C + OPT-E (+ P-06 OPT-D-min) · P-01…P-06 |
| **Complexity** | **M** — 8 plików, 1 commit release |
| **Rollback** | `git revert 6f6bb66` → baseline **2.63.75** @ `caa46b1` |

---

## 2. Zakres zamknięty (P-01…P-06)

| ID | Opis | Status |
|----|------|--------|
| **P-01** | LS persist `wg-tender-doc-groups-{tenderId}` — round-trip między zakładkami (OPT-A) | **CLOSED** |
| **P-02** | `TenderUxSectionTitle` + `TEUX_FONT_META` na summary, attachments, formal, SWZ meta (OPT-B) | **CLOSED** |
| **P-03** | Usunięty wiersz „Źródło dokumentów”; SWZ meta w `<details data-tender-documents-swz-meta>` domyślnie zamknięte (OPT-C) | **CLOSED** |
| **P-04** | `TEUX_TOUCH_TARGET` + `touch-manipulation` na group toggle; `min-h-[32px]` na inline actions (OPT-E) | **CLOSED** |
| **P-05** | Per-group empty — muted row + `data-tender-doc-group-empty={groupId}` | **CLOSED** |
| **P-06** | Secondary hierarchy akcji (`TEUX_FONT_CAPTION`); FAQ w `GuideView.tsx` (OPT-D-min) | **CLOSED** |

---

## 3. Definition of Done

| # | Kryterium | Status |
|---|-----------|--------|
| D1 | WF-04 — primary (summary + attachments) + secondary collapsed (SWZ meta) | **PASS** |
| D2 | AC-04-02 — główne sekcje używają `TenderUxSectionTitle` | **PASS** |
| D3 | AC-04-03 — LS persist expanded groups per tenderId | **PASS** |
| D4 | AC-04-06 — SWZ meta domyślnie zwinięte | **PASS** |
| D5 | AC-04-07 — touch-safe group toggles mobile | **PASS** |
| D6 | Reuse `groupTenderAttachmentRows` / `buildTenderDocumentsTabSummary` — zero nowej logiki biznesowej | **PASS** |
| D7 | Zero diff Protected Core | **PASS** |
| D8 | `test-tender-workspace-documents-ng08-04.mjs` | **PASS** 20/20 |
| D9 | Gate B `scope:tenders` | **PASS** 15/15 |
| D10 | Gate B `scope:payroll` | **PASS** 16/16 |
| D11 | `npm run build` | **PASS** |
| D12 | CHANGELOG **2.63.76** · release B · verify | **PASS** |
| D13 | Jeden commit release · #CORE-013 | **PASS** `6f6bb66` |

---

## 4. Production verification

```text
curl https://www.wgdom.fun/version.json
→ version: 2.63.76
→ commit:  6f6bb66
→ HEAD:    6f6bb66 (origin/main)
```

| Check | Werdykt |
|-------|---------|
| UI version | **2.63.76** |
| Runtime commit | **`6f6bb66`** = HEAD release |
| PRODUCTION VERIFIED | **TAK** |

---

## 5. Boundary (#CORE-013 / #CORE-014)

| Check | Werdykt |
|-------|---------|
| #CORE-013 — jeden cel, jeden commit release | **PASS** |
| #CORE-014 — FEATURE allowlista | **PASS** |
| Payroll / Cloud Sync / Pipeline / Parser / Edge / `App.tsx` CORE | **NO DIFF** |
| `classifyTenderDocumentBusinessGroup` / `tender-workflow-process-strip.ts` / intelligence context | **NO DIFF** |
| NG-08-05 | **NOT STARTED** |

---

## 6. Pliki release (commit `6f6bb66`)

| Warstwa | Pliki |
|---------|--------|
| Lib | `tender-documents-ui-persist.ts` |
| UI | `TenderAttachmentsPanel.tsx`, `TenderDocumentsWorkspace.tsx`, `TenderDocumentsSummaryHeader.tsx` |
| Docs UX | `changelog-data.ts`, `GuideView.tsx`, `CHANGELOG.md` |
| Testy | `test-tender-workspace-documents-ng08-04.mjs` |

---

## 7. Owner smoke (opcjonalny)

| ID | Scenariusz | Status |
|----|------------|--------|
| SS-P4-01 | Przetarg → Dokumenty — summary + grupy widoczne | ☐ owner |
| SS-P4-02 | Rozwiń grupę → zmień zakładkę → wróć — stan zachowany | ☐ owner |
| SS-P4-03 | Metadane analizy SWZ domyślnie zwinięte | ☐ owner |
| SS-P4-04 | Mobile — group toggle ≥44px effective | ☐ owner |
| SS-P4-05 | Pusta grupa — muted empty row | ☐ owner |
| SS-P4-06 | Strip / Intelligence — brak regresji (NG-08-03) | ☐ owner |

---

## 8. Artefakty SSOT

| Artefakt | Ścieżka |
|----------|---------|
| UX AUDIT | [`NG-08-04-TEUX-UX-AUDIT.md`](./NG-08-04-TEUX-UX-AUDIT.md) |
| PLAN | [`NG-08-04-TEUX-PLAN.md`](./NG-08-04-TEUX-PLAN.md) |
| DESIGN FREEZE | [`NG-08-04-TEUX-DESIGN-FREEZE.md`](./NG-08-04-TEUX-DESIGN-FREEZE.md) |
| ARCH REVIEW | [`NG-08-04-TEUX-ARCHITECTURE-REVIEW.md`](./NG-08-04-TEUX-ARCHITECTURE-REVIEW.md) |
| Closeout | ten plik |

---

## 9. Roadmapa NG-08 (po NG-08-04)

```text
NG-08-01  ✅ CLOSED · 2.63.73 @ 84b1491
NG-08-02  ✅ CLOSED · 2.63.74 @ 09259ad
NG-08-03  ✅ CLOSED · 2.63.75 @ caa46b1
NG-08-04  ✅ CLOSED · 2.63.76 @ 6f6bb66  ← CURRENT
NG-08-05  ⛔ BLOCKED — Cost cohesion (po owner GO)
```

**Następny slice:** NG-08-05 — tylko na jawne OWNER GO + AUDIT/PLAN.

---

*SSOT closeout slice 04 · Baseline prod: **2.63.76** @ **6f6bb66**.*
