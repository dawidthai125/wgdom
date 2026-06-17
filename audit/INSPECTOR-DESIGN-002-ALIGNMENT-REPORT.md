# INSPECTOR-DESIGN-002 — Design System Alignment Report

**Data:** 2026-06-16  
**Wersja:** **2.59.48**  
**Baseline:** v2.59.47 · INSPECTOR-UX-002  
**Audyt źródłowy:** [`INSPECTOR-DESIGN-001-VISUAL-CONSISTENCY.md`](INSPECTOR-DESIGN-001-VISUAL-CONSISTENCY.md) · werdykt MINOR DESIGN DRIFT  
**Zakres:** design alignment only — bez zmian UX workflow, routingu, uprawnień, logiki biznesowej

---

## 1. Executive Summary

Wdrożono **6 zmian design alignment** w module Inspektor, wzorując się na Panelu Admina (Dashboard V3 + Roboty + WM Druk). Kluczowe efekty:

- Pills sekcji roboty = **ten sam język** co `JobDetailSectionNav` (`rounded-lg`, emerald na Plikach, primary active).
- Status pakietu = **badge CSS z borderem** (PAKIET GOTOWY / BRAK PAKIETU) — **bez emoji** 🟢🔴.
- Sticky header roboty = typografia admin (`text-base`, `JobListPrimaryBadge`, `DeliveryPackageStatusBadge`).
- Karty i spacing = `rounded-xl`, `space-y-4`, `max-w-3xl md:max-w-none` jak JobsView.

**Nie ruszono:** mobile shell, bottom nav, quick actions, sticky workflow, touch 44px.

| Metryka | Wynik |
|---------|-------|
| Build | **PASS** |
| Smoke DESIGN-002 | **38/38 PASS** |
| Smoke UX-002 (regresja) | **16/16 PASS** |
| Werdykt po zmianie | **MINOR DRIFT → CLOSER TO ADMIN** (pełny CONSISTENT w DESIGN-P2 — shared components) |

---

## 2. Design Changes

| # | Zmiana | Status |
|---|--------|--------|
| 1 | Section pills → `JobDetailSectionNav` parity | ✅ |
| 2 | Package chip bez emoji → `DeliveryPackageStatusBadge` | ✅ |
| 3 | Sticky header typography → JobsView pattern | ✅ |
| 4 | Status badges → `JobListPrimaryBadge` + `JobWmStageBadge` + SSOT pakietu | ✅ |
| 5 | Card consistency → `rounded-xl`, admin padding | ✅ |
| 6 | Spacing → `space-y-4`, `max-w-3xl` | ✅ |

---

## 3. Component Alignment

| Komponent | Przed | Po |
|-----------|-------|-----|
| `InspectorJobSectionNav` | `rounded-full`, violet badges, uppercase label | `rounded-lg`, admin badge logic, brak label uppercase |
| `DeliveryPackageStatusBadge` | — (nowy) | SSOT badge pakietu admin+inspektor |
| Sticky job header | `text-sm` + emoji priorytetu + emoji pakietu | `h2 text-base` + `JobListPrimaryBadge` + `DeliveryPackageStatusBadge` |
| `InspectorJobCard` | custom status span + emoji priorytetu | `JobListPrimaryBadge` + `JobWmStageBadge` |
| App header subtitle | `text-emerald-600` | `text-muted-foreground` |
| Pomoc button | emerald accent | neutral muted |

---

## 4. Badge System

| Status | SSOT | Inspektor po D-002 |
|--------|------|---------------------|
| Faza roboty (lista) | `JobListPrimaryBadge` / `JOB_LIST_STATUS_CONFIG` | ✅ używany |
| Etap WM | `JobWmStageBadge` / `stageBadgeClass` | ✅ bez zmian (już współdzielony) |
| Pakiet odbiorowy | `DELIVERY_PACKAGE_STATUS_BADGE_CLASS` | ✅ nowy wspólny helper + komponent React |
| Priorytet terenowy (emoji) | Guide/help only | ❌ usunięty z sticky header i kart listy |

Klasy pakietu:

- **Gotowy:** `bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25`
- **Brak:** `bg-red-500/12 text-red-700 dark:text-red-400 border-red-500/25`

---

## 5. Typography

| Element | Admin (JobsView) | Inspektor po D-002 |
|---------|------------------|---------------------|
| Tytuł roboty | `text-base font-semibold` | ✅ |
| Klient | `text-xs text-muted-foreground` | ✅ |
| Pulpit greeting | `text-xl font-bold` | ✅ |
| KPI label | `text-[10px]` | ✅ (bez uppercase 9px) |
| Sekcje WM | sentence case | ✅ (bez uppercase emerald) |
| Rola w headerze | neutral | ✅ muted |

---

## 6. Cards

- Wszystkie karty w `InspectorPanel` detalu: **`rounded-2xl` → `rounded-xl`**
- Karta podsumowania: **`p-5 space-y-4 md:p-4 md:space-y-3`** (jak JobsView summary)
- `InspectorDeliveryPackagePanel`: `rounded-xl` + shared badge
- `InspectorJobCard`: `rounded-xl`, hover `border-primary/30` (dashboard pattern)

---

## 7. Build

```text
npm run build → PASS (vite 6.3.5, ~40s)
```

---

## 8. Smoke

```bash
npx vite-node scripts/test-inspector-design-002.mjs  # 38 PASS
npx vite-node scripts/test-inspector-ux-002.mjs       # 16 PASS (regresja)
```

---

## 9. Before / After

### Section pills

| | Przed | Po |
|-|-------|-----|
| Shape | `rounded-full` | `rounded-lg` |
| Active files | primary | `bg-emerald-600 text-white` |
| Liczniki | violet pill | amber warn / primary-foreground (admin) |

### Package status (sticky)

| | Przed | Po |
|-|-------|-----|
| Prezentacja | 🟢 PAKIET GOTOWY / 🔴 BRAK PAKIETU | Badge border success/danger |
| A11y | emoji aria-hidden | tekst + title |

### Job title (sticky)

| | Przed | Po |
|-|-------|-----|
| Font | `text-sm font-semibold` | `text-base font-semibold` (h2) |
| Status | inline yellow/green span | `JobListPrimaryBadge` |

---

## 10. Remaining Drift

Elementy **świadomie** pozostawione (mobile field role / poza zakresem D-002):

| Element | Uwaga | Backlog |
|---------|-------|---------|
| Bottom nav 5 tabów | inny shell niż admin sidebar | OK — rola terenowa |
| Sticky stack gęstość | quick bar + nav + hint nad treścią | DESIGN-P1 hint collapse |
| Checklist docs `rounded-full` toggles | inny shape niż admin form | DESIGN-P2 |
| `max-w-2xl` na dashboard/list | węższa kolumna niż admin pulpit | DESIGN-P3 tablet |
| Brak wspólnego `JobSectionNav` component | duplikacja markup admin/inspector | DESIGN-P2 extract |
| Uppercase w treści raportów (reports section) | micro-labels w dokumentacji ekipy | niski priorytet |

---

## Pliki zmienione

| Plik | Rola |
|------|------|
| `src/app/DeliveryPackageStatusBadge.tsx` | **NOWY** — SSOT badge pakietu |
| `src/lib/inspector-handover-ux.ts` | badgeClass, labels, bez emoji |
| `src/app/InspectorNavigation.tsx` | pills admin parity |
| `src/app/InspectorPanel.tsx` | sticky header, karty, spacing, header neutral |
| `src/app/InspectorJobCard.tsx` | JobListPrimaryBadge |
| `src/app/InspectorDeliveryPackagePanel.tsx` | shared badge, rounded-xl |
| `src/app/InspectorDashboard.tsx` | typography KPI + title |
| `src/app/InspectorHandoverQuickBar.tsx` | rounded-lg buttons |
| `src/app/changelog-data.ts` | v2.59.48 |
| `CHANGELOG.md` | skrót |
| `scripts/test-inspector-design-002.mjs` | **NOWY** smoke |
| `scripts/test-inspector-ux-002.mjs` | regresja badgeClass |

---

**Koniec raportu INSPECTOR-DESIGN-002**
