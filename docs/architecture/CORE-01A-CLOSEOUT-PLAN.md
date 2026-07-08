# CORE-01A — Plan zamknięcia epicu (CLOSEOUT PLAN)

> **Status:** **ACTIVE** (plan rozwoju) · **DF:** v1.2 **CERTIFIED**  
> **Tryb:** PLAN ONLY do momentu OWNER GO na IMPLEMENT  
> **Data:** 2026-07-04 (roadmap update)  
> **SSOT freeze:** [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md)  
> **Powiązane:** [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md) · [CORE-01A-CHANGE-CHECKLIST.md](./CORE-01A-CHANGE-CHECKLIST.md)

```text
CEL:     Zamknięcie CORE-01A (docs + Gate CORE) bez zmiany runtime Protected Core.
GATE:    RC-B-POST-RELEASE-01 PASS + Debug cleanup COMPLETE → OWNER GO.
PO 01A:  FEATURE DEVELOPMENT (domyślna ścieżka) — nie CORE-01B jako następny epic.
01B:     OPEN · READY · Owner GO Required — tylko przy rzeczywistej potrzebie zmian Protected Core.
```

---

## 1. Roadmapa po zamknięciu CORE-01A (SSOT)

```text
RC-B-POST-RELEASE-01 PASS
        ↓
Debug cleanup COMPLETE
        ↓
CORE-01A IMPLEMENT (Faza 1 → F2 → F3)
        ↓
CORE-01A CLOSED
        ↓
FEATURE DEVELOPMENT                    ← domyślna ścieżka rozwoju
  (NG-03 · NG-04 · Roboty · WM Druk · Pulpit · STABILIZATION maintenance)
        ↓
[opcjonalnie — tylko gdy rzeczywista potrzeba zmian Protected Core]
        ↓
AUDYT CORE-01B
        ↓
DESIGN FREEZE CORE-01B
        ↓
IMPLEMENT CORE-01B (per item · osobny CORE bundle)
```

### 1.1 Co NIE jest następnym obowiązkowym epicem

| Epic | Status po CORE-01A | Uwagi |
|------|-------------------|-------|
| **CORE-01B** | **OPEN · READY · Owner GO Required** | Backlog znanych bypass — **nie** auto-start. Uruchamia się wyłącznie po AUDYT + uzasadnionej potrzebie (incydent, regresja, wymóg biznesowy). |
| Bypass Registry (12 OPEN) | Dokumentowane | Waivers Gate CORE akceptowalne do czasu ewentualnego 01B. |

### 1.2 Domyślna ścieżka: FEATURE DEVELOPMENT

| Obszar | Klasa | Procedura |
|--------|-------|-----------|
| NG-03 Przetargi workspace | FEATURE + UI | FEATURE Boundary Check (#CORE-014) |
| NG-04 / BOQ maintenance | FEATURE | Gate B `scope:tenders` |
| Roboty UX | FEATURE | #CORE-013 — bez diff Protected Core |
| WM Druk / EM / Schematy | FEATURE | osobne bundle FEATURE |
| STABILIZATION (R-03, M-03, M-06) | FEATURE / PLATFORM | wg STABILIZATION-WINDOW-PLAN |

**Reguła BINDING (bez zmiany):** mutacja runtime Payroll / Cloud Sync / PWRB / Edge payroll → **wyłącznie** przez ścieżkę CORE-01B (gdy uruchomiona). FEATURE bundle **nie** dotyka Protected Core.

---

## 2. Preconditions IMPLEMENT CORE-01A

| # | Warunek | Owner |
|---|---------|-------|
| 0.1 | RC-B-POST-RELEASE-01 prod observation **PASS** | Owner |
| 0.2 | Debug cleanup (`__wgdomPayrollPipelineDebug`) **COMPLETE** | Agent po GO |
| 0.3 | STABILIZATION WINDOW — brak równoległego epicu sync | — |

---

## 3. Fazy IMPLEMENT (przed closeout)

### Faza 1 — Docs bundle

Deliverables: pakiet `docs/architecture/CORE-*.md` · stub ARCHITECTURE §11.3a · **zero** `src/` / `supabase/`.

### Faza 2 — Guard static + Gate CORE

`audit-pwrb-boundary` · `audit-core-ls-writes` · manifest v1.2 · CI job `gate-core` · PAYROLL-QUALITY-GATE link.

### Faza 3 — CLOSEOUT

| # | Deliverable |
|---|-------------|
| 3.1 | `docs/CORE-01A-EPIC-CLOSE-REPORT.md` |
| 3.2 | `docs/ARCHITECTURE.md` §11.3a Protected Core |
| 3.3 | `CURRENT-TASK.md` — CORE-01A CLOSED · roadmap §1 |
| 3.4 | `AGENTS.md` — linki Protected Core |
| 3.5 | `CHANGELOG.md` (dev) — bez bumpu UI (opcjonalnie) |

**Nie wymaga:** deploy prod runtime · bump `changelog-data.ts`.

---

## 4. Kryteria zamknięcia epicu CORE-01A

| # | Kryterium |
|---|-----------|
| C1 | Preconditions 0.1–0.2 PASS |
| C2 | F1 + F2 na `main` · Gate CORE CI green (waiver documented) |
| C3 | F3 deliverables opublikowane |
| C4 | Logika Protected Core §1.4 DF **niezmieniona** |

**Werdykt:** `EPIC CORE-01A CLOSED` → przejście do **FEATURE DEVELOPMENT** (§1).

---

## 5. Kiedy uruchomić CORE-01B (on-demand)

| Trigger | Przykład | Pierwszy krok |
|---------|----------|---------------|
| Incydent prod G-0 / I-4 | resurrection po re-add | AUDYT → wybór itemu z backlogu |
| Regresja Gate CORE | nowy bypass w FEATURE PR | AUDYT → CORE-01B item |
| Wymóg biznesowy | zmiana polityki rollover push | Owner GO → DESIGN FREEZE |
| Proaktywny cleanup | zamknięcie waiver WorkerPhotoView | Owner GO → CORE-01B-1 DF |

**Bez triggera:** backlog pozostaje OPEN; FEATURE development kontynuuje bez 01B.

---

## 6. Referencje

| Dokument | Rola |
|----------|------|
| [CORE-01A-DESIGN-FREEZE.md](./CORE-01A-DESIGN-FREEZE.md) | Principles #CORE-001…#CORE-014 |
| [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md) | Itemy 01B (gdy epic uruchomiony) |
| [STABILIZATION-WINDOW-PLAN.md](../STABILIZATION-WINDOW-PLAN.md) | Maintenance FEATURE |

---

*Ostatnia aktualizacja: 2026-07-04 · roadmap: FEATURE first · CORE-01B on-demand*
