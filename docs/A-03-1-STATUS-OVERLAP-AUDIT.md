# A-03-1 — Status postępu: overlap audit (NG-03 Maintenance)

> **Status:** **AUDIT COMPLETE** · **IMPLEMENT BLOCKED** (brak rekomendacji zmian runtime)  
> **Data:** 2026-07-05 · Bundle #2 NG-03 Maintenance  
> **Źródło:** [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) §5.2 · [`NG-03-DESIGN-FREEZE.md`](NG-03-DESIGN-FREEZE.md) §9

---

## 1. Pytanie audytu

Czy **Ribbon · Process Strip · Trust · Workspace V2** to duplikacja logiki wymagająca refactoru, czy zamierzony **Progressive Disclosure**?

**Werdykt:** **Progressive Disclosure** na prod V4 — **brak P0/P1 do naprawy w kodzie** w STABILIZATION WINDOW.

---

## 2. Mapa warstw (prod V4)

```text
COMMAND LAYER (L0 — sticky, tab Przetarg)
  TenderStatusRibbon
    ├─ TrustChipRow (hub surface)
    └─ TenderWorkflowProcessStrip (variant="ribbon")
  TenderWorkflowPrimaryAction (jedno CTA)

CONTENT LAYER (L3 — scroll, accordion)
  TenderWorkspaceV2Panel
    ├─ Progress bar % + filary (computeWorkspaceV2AutoProgress)
    ├─ Checklist · timeline · insights
    └─ TenderAnalysisStatusStrip (w accordion — NG-03.2)
```

---

## 3. Klasyfikacja overlap

| Overlap | Typ | Werdykt |
|---------|-----|---------|
| Ribbon Strip ↔ V2 progress bar | **Progressive disclosure** L0 vs L3 | ✅ Zamierzone (NG-03 §9) |
| Process Strip ↔ filary V2 | **Reuse danych** | ✅ SSOT: `computeWorkspaceV2AutoProgress` → `buildWorkflowProcessStripStages` |
| Trust Banner + TrustChipRow | **Policy HF-001** | ✅ Banner tylko `blocked`; chips w Ribbon |
| Analysis strip w accordion | **Redukcja NG-03.2** | ✅ Przeniesione z Ribbon — poprawne |
| HubPanel Trust+Strip gdy `!commandLayerActive` | **Legacy compatibility path** | 🟡 Nie bug — patrz §4 |

---

## 4. Legacy compatibility path (HubPanel)

`TenderWorkflowHubPanel` renderuje pełny Trust + Process Strip + CTA gdy `commandLayerActive=false`.

| Kontekst | Aktywny? |
|----------|----------|
| `TenderDetailPage` tab Przetarg (prod) | **NIE** — Command Layer używa `TenderStatusRibbon` + CTA osobno |
| Legacy / test / przyszły reuse | Teoretycznie TAK |

**Klasyfikacja:** **legacy compatibility path** — nie usuwać w bundle maintenance bez AUDIT + mapy M-06.

---

## 5. SSOT danych (brak duplicate logic)

| Sygnał | SSOT lib | Konsumenci UI |
|--------|----------|---------------|
| Filary postępu | `tender-workspace-v2-ux.ts` → `computeWorkspaceV2AutoProgress` | V2 Panel · Process Strip |
| Kroki analizy | `tender-analysis-status-ux.ts` → `buildTenderAnalysisStatusRows` | Analysis accordion · Strip stages |
| Trust | `tender-trust-layer.ts` | TrustBanner · TrustChipRow |
| CTA | `tender-workflow-primary-action.ts` | Command Layer only |

**Zero Duplicate Logic** na warstwie danych — ✅ zgodne z NG-03 Principles.

---

## 6. Rekomendacje

| Priorytet | Akcja | Kiedy |
|-----------|-------|-------|
| — | **Brak implementacji** w Bundle #2 | Teraz |
| P3 docs | Wzmianka w HelpView „V4.2” → NG-04 (A-03-3) | Osobny docs micro-pass |
| P2 | Konsolidacja HubPanel po usunięciu Hosted | Po §5 Removal Checklist M-06 |
| — | Merge Ribbon+V2 w jeden komponent | **NIE rekomendowane** — łamie progressive disclosure |

---

## 7. Werdykt Architekta (AUDIT)

| Element | Status |
|---------|--------|
| Duplikacja bug | **NIE** |
| Progressive Disclosure | **TAK** |
| Legacy HubPanel | **Udokumentowany** · nie bug |
| IMPLEMENT runtime | **BLOCKED** |

**A-03-1 CLOSED (audit-only).**
