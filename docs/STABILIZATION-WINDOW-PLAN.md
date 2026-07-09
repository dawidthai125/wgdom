# STABILIZATION WINDOW — plan po zamknięciu NG-04

> **Status:** **SSOT** · plan operacyjny (bez nowych epiców)  
> **Data rozpoczęcia:** 2026-07-01 (prod **2.63.12** · NG-04 EPIC CLOSED)  
> **Aktualny prod (monitoring):** **2.63.79** (`f7878fe`) · **M-03 CLOSED** · 2026-07-09  
> **Raport tygodniowy:** [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md)  
> **Bez zmian:** workflow release ([`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)) · kod aplikacji — tylko na polecenie

---

## 0. Dla agentów AI (Cursor / asystenci)

1. **Zawsze** zacznij od `CURRENT-TASK.md` — sekcja **STABILIZATION WINDOW**.
2. **Nie** startuj epicu, parsera, ViewModel BOQ ani zmian NG-02 bez AUDIT + polecenia użytkownika.
3. **Dozwolone** w oknie: docs, testy regresji, hotfix po P0, raport tygodniowy metryk.
4. **Przetargi:** NG-04 Principles #001–#010 — [`NG-04-DESIGN-FREEZE.md`](NG-04-DESIGN-FREEZE.md).
5. **Release:** nie zmieniaj workflow — [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md).
6. **P0 incydent:** wpisz w raporcie tygodniowym + rozważ aktualizację [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md).
7. **Owner GO:** [`WORKFLOW-OWNER-GO.md`](WORKFLOW-OWNER-GO.md) — FEATURE-only epic może startować w oknie po AUDIT+DF+review+boundary; CORE — BLOCKED.

---

## 1. Definicja okna stabilizacji

Okres po **NG-04.4** (prod **2.63.12**), w którym:

- architektura Przetargów pozostaje **zamrożona** (NG-02 pipeline, NG-04 Principles #001–#010),
- dopuszczalne: **monitoring**, **maintenance**, **drobne wydania docs/test** (bez nowego epicu),
- **zakazane** bez AUDIT + polecenia: nowy epic, zmiana kontraktu snapshot/parser, duże refaktory.

**Cel:** absorpcja serii 2.63.9→2.63.12 w prod, regresja, docs hygiene — bez rozszerzania scope produktu.

---

## 2. Moduły — wyłącznie monitorowanie

| Moduł | Baseline | Monitoring |
|-------|----------|------------|
| Przetargi pipeline (NG-02) | 2.62.98 | discovery, bootstrap, `PipelineState` |
| Przetargi workspace (NG-03) | 2.63.7 | Command Layer, mobile cards |
| BOQ Explorer (NG-04) | 2.63.12 | ATH, benchmark, 500 wierszy |
| Trust layer (NG-01) | shipped | ribbon, cap ATH |
| WM Druk + ZI Tauron 2026 | STABLE | preservation, ZIP |
| Pomiary Elektryczne · Schematy | CLOSED | reaktywnie |
| Dashboard · Roboty · Inspektor | COMPLETE | reaktywnie |

Szczegóły Przetargi: [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md).

---

## 3. Maintenance (planowany, bez epicu)

| ID | Obszar | Priorytet |
|----|--------|-----------|
| M-01 | Docs SSOT (`ARCHITECTURE.md`, `PROJECT-HANDOFF-CURRENT.md`, `AGENTS.md`, `AGENT-ONBOARDING.md`) | P1 · **częściowo CLOSED** 2026-07-02 (4 pliki → 2.63.26) |
| M-02 | Smoke agregat Przetargi NG-01–04 | P1 · **CLOSED** · TI-B4 · `test-tenders-stabilization-smoke.mjs` |
| M-03 | Mobile re-certification post-NG-03/04 | P1 · **CLOSED** · prod **2.63.79** (`f7878fe`) · [`M-03-MOBILE-RECERT-DESIGN-FREEZE.md`](architecture/M-03-MOBILE-RECERT-DESIGN-FREEZE.md) |
| M-04 | Monitoring egress Supabase | P1 |
| M-05 | Payroll Etap 1 — regresja (Etap 2 **CLOSED** 2.63.15–24 w oknie) | P1 |
| M-08 | TEST-INFRA-001 harness MVP | **CLOSED** · prod **2.63.26** (`3d6dd90`) · TI-B1–B3 backlog · **TI-B4 CLOSED** (manifest 1.1.0) |
| M-06 | Deprecation map `TenderDetailPanelHosted` | P2 |
| M-07 | WM POST-ZI housekeeping (docs/code archive) | P2 |

---

## 4. Drobne wydania dozwolone (bez epicu)

| ID | Wydanie | Typ |
|----|---------|-----|
| R-01 | Docs hygiene pass | docs |
| R-02 | `test-tenders-stabilization-smoke.mjs` (orchestrator) | test · **DONE** TI-B4 |
| R-03 | NG-03 freeze banner | docs |
| R-04 | Ten szablon + plan stabilizacji | docs ✅ |
| R-05 | Hotfix copy / mobile touch | kod — tylko po incydencie |

**Zakaz w oknie:** zmiana `useTenderPipelineRuntime`, ViewModel BOQ (#001), `athPreviewToSnapshot`, nowe kolumny BOQ.

---

## 5. Zamknięcie okna stabilizacji

### 5.1 Harmonogram sugerowany

| Faza | Okres | Cel |
|------|-------|-----|
| A — absorpcja | tygodnie 1–2 | monitoring BOQ + pipeline |
| B — maintenance | tygodnie 3–6 | M-01–M-03, raporty tygodniowe |
| C — decyzja | tydzień 6–8 | ocena kryteriów Z-* |

**Sugerowane zamknięcie:** koniec **sierpnia 2026** (~8 tygodni po 2.63.12), jeśli spełnione Z-01–Z-07.

### 5.2 Kryteria zamknięcia (wszystkie wymagane)

| # | Kryterium |
|---|-----------|
| **Z-01** | Brak P0 w Przetargach przez ≥4 tygodnie |
| **Z-02** | ≥2 deploye bez regresji `version.json` |
| **Z-03** | Docs zsynchronizowane z 2.63.12+ |
| **Z-04** | Smoke agregat Przetargi — **PASS** (TI-B4 · 2.63.27) |
| **Z-05** | Mobile re-cert — 0 blockerów P0 |
| **Z-06** | Monitoring BOQ — brak zgłoszeń P1 |
| **Z-07** | Świadoma decyzja właściciela repo w `CURRENT-TASK.md` |

### 5.3 Co kończy okno przedwcześnie

- Start dużego epicu (Payroll Etap 2+, G-08, G-02, cutover Work Catalog),
- P0 wymagający zmiany kontraktu danych,
- Nowy scope freeze bez zamknięcia stabilizacji.

### 5.4 Artefakt zamknięcia

Krótki **STABILIZATION CLOSE REPORT** + aktualizacja [`CURRENT-TASK.md`](../CURRENT-TASK.md): **STABILIZATION CLOSED** + data.  
**Bez** automatycznego startu kolejnego epicu.

---

## 6. Bramka wejścia w kolejny duży epic (po zamknięciu okna)

| Warunek | Wymagane |
|---------|----------|
| Stabilization CLOSED | Z-01–Z-07 |
| AUDIT zatwierdzony | `audit/` + GO |
| Polecenie właściciela | explicit scope |
| Baseline w freeze | wersja + commit |
| Regresja zdefiniowana | lista skryptów PASS |

Szczegóły: [`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) §8.

### 6.1 Wyjątek — epic FEATURE-only w trakcie okna

Gdy epic **nie dotyka Protected Core** i spełnia [`WORKFLOW-OWNER-GO.md`](WORKFLOW-OWNER-GO.md) (#WORKFLOW-OWNER-GO-001):

- **Nie wymaga** zamknięcia Z-01–Z-07
- Wymaga: AUDIT · DESIGN FREEZE · ARCHITECTURE REVIEW · Boundary Check PASS
- **Owner GO** (asystent może odblokować IMPLEMENT) zastępuje ręczny override STABILIZATION dla tego epicu

Epic dotykający Payroll · PWRB · Sync · CloudLoader · Edge · Bootstrap · App.tsx CORE — **bez wyjątku**; Z-01–Z-07 lub osobna analiza CORE.

---

## Powiązane dokumenty (SSOT)

| Dokument | Rola |
|----------|------|
| [`CURRENT-TASK.md`](../CURRENT-TASK.md) | Status bieżący |
| [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md) | Raport tygodniowy |
| [`NG-04-EPIC-CLOSE-REPORT.md`](NG-04-EPIC-CLOSE-REPORT.md) | Baseline epicu |
| [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) | Release / verify |
| [`WORKFLOW-OWNER-GO.md`](WORKFLOW-OWNER-GO.md) | Owner GO Policy · #WORKFLOW-OWNER-GO-001 |
| [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) | P0 |
