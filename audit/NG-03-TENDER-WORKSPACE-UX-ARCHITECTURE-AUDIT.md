# NG-03 — Tender Workspace UX · Architecture Audit

> **Status:** **AUDIT COMPLETE** · GO na EPIC NG-03 (UX-only)  
> **Data audytu:** 2026-06-30  
> **Baseline prod:** **v2.62.99** · commit `1a7673e`  
> **Design freeze SSOT:** [`docs/NG-03-DESIGN-FREEZE.md`](../docs/NG-03-DESIGN-FREEZE.md)

---

## 1. Executive summary

Moduł Przetargów po serii NG-02 (pipeline automation) ma **stabilną warstwę runtime**, ale **przeciążoną warstwę prezentacji** w detalu przetargu V4. Główne problemy to duplikacja sygnałów postępu, placeholdery w Tab Bar, ukryta kwalifikacja P2-F oraz nadmierny chrome przed Primary CTA.

**Werdykt:** **GO** na EPIC **NG-03** — wyłącznie UX/nawigacja/layout. **Bez** zmian parserów, sync KV, NG-02 runtime, Trust Layer logiki.

---

## 2. Zakres audytu

| Obszar | Pliki kluczowe |
|--------|----------------|
| V4 shell | `TenderDetailPage.tsx`, `TenderDetailTabBar.tsx` |
| Routing | `tender-detail-routes-v4.ts` |
| Hub Przetarg | `TenderWorkflowHubPanel.tsx`, `TenderPrzetargWorkspace.tsx` |
| Decyzja | `TenderDecisionView.tsx`, `TenderDetailPanel.tsx` |
| Runtime | `useTenderPipelineRuntime.ts` (read-only w audycie) |
| Workflow SSOT | `WORKFLOW-ARCHITECTURE-v2.63.md` |

---

## 3. Stan as-is (2.62.99)

### 3.1 Chrome detalu

```text
Powrót → Breadcrumb → Tytuł → KPI Bar (8 komórek) → Tab Bar (7 tabów) → Content
```

### 3.2 Tab Bar V4

| Slug | Status as-is |
|------|----------------|
| przetarg | Aktywny — Workflow Hub |
| dokumenty | Aktywny |
| kosztorys | Aktywny |
| ceny | Aktywny |
| decyzja | Aktywny — `?ws=qualification\|offer` |
| strategia | Placeholder „Wkrótce” |
| materialy | Placeholder „Wkrótce” |

### 3.3 Hub Przetarg — kolejność sekcji

1. Trust Banner → Trust Chips → Process Strip  
2. Primary CTA  
3. Workspace V2 (postęp rozwinięty)  
4. Blockers · Positions · Operator  
5. Executive blocks (podstawowe dane, warunki, zakres)

### 3.4 Decyzja

- Werdykt GO/HOLD/ODPUŚĆ w `TenderDecisionView` ✓  
- Kwalifikacja P2-F: tylko przez `?ws=qualification` — **brak widocznych sub-tabów**  
- Oferta: `?ws=offer` — **brak widocznych sub-tabów**

---

## 4. Findings (rejestr)

| ID | Priorytet | Finding | Rekomendacja |
|----|-----------|---------|--------------|
| NG03-F01 | P0 | 7 tabów; 2 placeholdery mylą operatora | 5 aktywnych tabów (NG-03.1) |
| NG03-F02 | P0 | Kwalifikacja ukryta pod query string | Sub-taby Decyzja (NG-03.1) |
| NG03-F03 | P1 | Duplikacja postępu: Strip ≈ V2 ≈ KPI | Status Ribbon + accordion (NG-03.2) |
| NG03-F04 | P1 | CTA poza pierwszym ekranem (scroll) | Command Layer (NG-03.2) |
| NG03-F05 | P1 | Strategia ×2: moduł vs placeholder detalu | Bridge do modułu (NG-03.6) |
| NG03-F06 | P2 | Tabele Kosztorys/Ceny `min-w` na mobile | Mobile cards (NG-03.5) |
| NG03-F07 | P0 | `tenderPriceOverrides` crash na Ceny | **CLOSED** 2.62.99 hotfix |

---

## 5. Architektura docelowa (TO-BE)

### 5.1 Warstwy

```text
Command Layer (sticky): Tytuł · 5 tabów · Ribbon · CTA
Content Layer (scroll):   Workspace per tab · Accordions · Action Bar
```

### 5.2 Nawigacja docelowa

**5 tabów:** Przetarg · Dokumenty · Kosztorys · Ceny · Decyzja  

**Decyzja sub-taby:** Przegląd · Kwalifikacja · Oferta  

**Usunięte z Tab Bar:** strategia · materialy (URL legacy → redirect)

### 5.3 Progressive disclosure

- V2 postęp → accordion domyślnie zamknięty  
- Executive blocks → accordion domyślnie zamknięty  
- Wyjątek: blockers → auto-expand

---

## 6. Roadmap NG-03

| Faza | Wersja | Zakres |
|------|--------|--------|
| NG-03.0 | — | Design Freeze (docs) |
| **NG-03.1** | **2.63.0** | **Navigation: 5 tabów + sub-taby Decyzja** |
| NG-03.2 | 2.63.1 | Command Layer + Status Ribbon |
| NG-03.3 | 2.63.2 | Operator Action Bar |
| NG-03.4 | 2.63.3 | Lista density |
| NG-03.5 | 2.63.4 | Mobile cards Kosztorys/Ceny |
| NG-03.6 | 2.63.5 | Strategia bridge |
| NG-03.7 | 2.63.6 | Polish + HelpView + E2E |

---

## 7. Ograniczenia (niezmienne w NG-03)

- NG-02 `useTenderPipelineRuntime` — bez zmian logiki  
- `tender-workflow-primary-action.ts` — bez zmian logiki CTA  
- `tender-trust-layer.ts` — bez zmian polityki trust  
- Parsery ATH/PDF · dossier pipeline · sync KV  
- WORKFLOW §4.3 — jedno CTA

---

## 8. Werdykt audytu

| Kryterium | Status |
|-----------|--------|
| Root cause UX zidentyfikowany | PASS |
| Zakres UX-only potwierdzony | PASS |
| Roadmap fazowy | PASS |
| Zgodność z WORKFLOW-ARCHITECTURE v2.63 | PASS |
| **GO na NG-03 EPIC** | **TAK** |

---

## 9. Następny krok

1. **NG-03.0** Design Freeze → [`docs/NG-03-DESIGN-FREEZE.md`](../docs/NG-03-DESIGN-FREEZE.md)  
2. **NG-03.1** Navigation — implementacja §6 Design Freeze
