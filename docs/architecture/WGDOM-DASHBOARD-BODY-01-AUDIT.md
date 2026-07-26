# WGDOM-DASHBOARD-BODY-01 — AUDIT + RCA

> **Status:** AUDIT COMPLETE · **IMPLEMENT / COMMIT / PUSH:** ZAKAZ  
> **Date:** 2026-07-26  
> **Parent:** WGDOM UI FOUNDATION v1.0 **COMPLETE** (`2a99e54`)  
> **Scope:** zawartość **Dashboard Body** (poniżej chrome / wewnątrz `data-mobile-scroll-root="dashboard"`)  
> **OUT:** Sidebar · Topbar · MobileNav · Payroll CORE · Cloud/Edge · pełny TEUX module · implementacja

---

## 0. Kontekst

Po Foundation v1.0:

| Warstwa | Stan |
|---------|------|
| Shell (Sidebar / Topbar) | **GDS** · PRODUCTION STABLE |
| Dashboard hero + KPI strip | **GDS** · Guard T05 (≤1 Primary) |
| Roboty chrome + A11Y focus | **GDS** · Guard T06/T07 |
| **Dashboard body** (braki / pilne / notatki / przetargi skrót) | **Częściowo legacy** — jawnie **OUT** Guard / A11Y |

Produktowy SSOT układu: [`SESSION-HANDOFF-DASHBOARD-V3.md`](../SESSION-HANDOFF-DASHBOARD-V3.md) — Pulpit = **„Co muszę dzisiaj zrobić?”**.

---

## 1. Inwentaryzacja widgetów (top → bottom)

Źródło: `src/app/DashboardView.tsx` (+ dzieci). Scroll root: L411–414.

| ID | Widget / sekcja | Plik · linie (ok.) | Rola biznesowa | Powierzchnia UI |
|----|-----------------|--------------------|----------------|-----------------|
| **W01** | Header / Hero CTA | `DashboardView` ~417–487 | Tytuł Pulpit · data · tydzień LP · skróty SMS/Grafik/LP · **≤1 Primary** | **GDS** `WgButton` + `WG_TYPE_*` |
| **W02** | Banner sobota | ~489–515 | Zamknięcie tygodnia / blokady kasy | **GDS** `WgCard` + `WgButton primary` |
| **W03** | KPI strip ×5 | ~517–579 | Wypłata · Ekipa · WM · Braki · Pilne (nawigacja / scroll) | **GDS** `WgKpi` |
| **W04** | Notatki operacyjne | `DashboardOperationalNotesWidget` 11–74 | Summary total/unread/inspector → moduł | **Legacy** raw `<button>` + `rounded-xl border` · `uppercase tracking-wider` |
| **W05** | Braki dokumentów | `DashboardView` ~588–745 | Expand lista robót bez kompletu docs · toggle docs · deep-link | **Legacy** `bg-card border rounded-xl shadow-sm` · chips `rounded-full` · raw buttons |
| **W06** | Pilne uwagi | `DashboardPilneUwagiSection` ~467–522+ | Accordion kategorii operacyjnych „dziś” | **Legacy** ta sama ramka · title `uppercase tracking-wider` · raw links |
| **W07** | Przetargi — skrót | `TendersShortcutPanel` 48–156 | ≤3 sygnały TEUX + CTA → Strategia | **Parallel TEUX** (`DashboardKpiTile` · `TEUX_KPI_*`) · CTA = raw primary button |
| **W08** | Pracuje dziś | `DashboardView` ~781–856 | Kto dziś w pracy · empty → LP | **GDS shell** `WgCard`/`WgEmptyState`/`WgButton` · **hybrid** rows |
| **W09** | Roboty w trakcie | ~858–934 | Aktywne roboty + progress docs | Jak W08 |
| **W10** | Podsumowanie finansowe | ~937–978 | Miesiąc / rok / ostatnie tygodnie → Archiwum | **GDS** `WgKpi` ×2 + `WgCard` |

**Liczniki (bez zmian semantyki w tym EPIC):** SSOT Pilne = `src/lib/dashboard-urgent-today.ts`. KPI Braki ≠ `urgentTodayTotal` (V3 rule).

**Hero Primary (kontrakt Foundation / Guard):**

| Warunek | Primary | Lokalizacja |
|---------|---------|-------------|
| Brak soboty | `Przejdź do Robot` | Header |
| Banner sobota | `Zapisz tydzień →` / `Lista płac →` | Banner; Roboty → secondary |

Empty-state Primary w W08/W09 są poniżej foldu — poza T05.

---

## 2. Elementy zgodne z nowym językiem UI

| Element | Dlaczego OK |
|---------|-------------|
| **W01 Hero** | `WgButton` hierarchy · ≤1 Primary · DF-03/04 UI-01B |
| **W02 Sobota** | `WgCard` soft + jeden Primary |
| **W03 KPI** | Jednolity `WgKpi` (UI-01A AC-1) |
| **W08 / W09 empty** | `WgEmptyState` bez dashed legacy |
| **W08 / W09 shell** | Zewnętrzna powierzchnia = `WgCard` |
| **W10 Finance** | `WgKpi` + clickable `WgCard` |
| **Rytm strony** | `max-w-6xl` · `space-y-8 sm:space-y-10` · padding UI-01B |

Te bloki są **PRODUCTION STABLE** względem Foundation i **nie** wymagają redesignu w pierwszym rzucie — tylko ewentualny polish wierszy (niższy priorytet).

---

## 3. Elementy wymagające modernizacji

### 3.1 Gap wizualny (język UI)

| Element | Objaw vs GDS / UI-01A–01B | Ryzyko |
|---------|---------------------------|--------|
| **W05 Braki** | Pre-GDS card shell (`bg-card border rounded-xl shadow-sm`); nested `rounded-xl border` per job (= card-farm); amber `rounded-full` badge; raw expand / doc chips | Największy kontrast vs hero/KPI; POST-RELEASE **PR-P1-3** |
| **W06 Pilne** | Identyczny legacy shell; section title **uppercase tracking-wider** (konflikt z spokojniejszą typografią UI-01B); raw `<button>` CTA w kategoriach | Drugi „obcy” blok pod KPI; Guard **OUT** body polish |
| **W04 Notatki** | Legacy panel; uppercase labels; nie `WgCard`/`WgKpi` | Mały widget, ale łamie spójność tuż pod KPI |
| **W07 Przetargi** | Trzeci język (TEUX tiles + full-width primary-looking CTA) | Konkurencja wizualna z hero Primary; parallel KPI ≠ `WgKpi` |
| **W08/W09 rows** | Hybrid: GDS card, ad-hoc `divide-y` / `rounded-full` avatar / badge chips | Kosmetyka; niższy priorytet niż W04–W07 |

### 3.2 Gap a11y / focus (backlog)

| Element | Notatka |
|---------|---------|
| Braki doc chips / expand | A11Y DF: Dashboard body focus **OUT**; backlog **PR-P1-3** |
| Pilne raw links | Brak ujednoliconego `WG_FOCUS_RING` / `WgButton` |
| W07 CTA | Raw primary button — brak tokenów focus GDS |

### 3.3 Co NIE jest problemem tego EPIC-u

- Semantyka liczników V3 / `buildUrgentTodayCategories`
- Logika toggle dokumentów / acknowledge report / payroll blockers
- Payroll CORE · Domain Push · Cloud
- Pełny redesign Strategii TEUX (osobny tor)

---

## 4. RCA — dlaczego body wygląda „stare”

| # | Przyczyna | Evidence |
|---|-----------|----------|
| **R1** | **Celowy scope freeze UI-01A/01B** | UI-01A: sekcje w `WgCard`, ale allowlist skupiony na KPI/empty/CTA. UI-01B: expand chrome tylko `transition-colors` — **bez** full body reskin. |
| **R2** | **Foundation świadomie OUT body** | Guard DF: IN hero Primary; **OUT** „Dashboard body (braki/pilne) polish”. A11Y DF defer → **PR-P1-3**. |
| **R3** | **Historyczny stacking Dashboard V3** | Braki + Pilne powstały jako operacyjne accordion cards przed GDS; po UI-01A zostały „pod” nowym KPI, nie przepisane. |
| **R4** | **Parallel design systems** | Pulpit GDS (`Wg*`) vs skrót Przetargi TEUX (`TEUX_KPI_*`) — dwa języki na jednym scrollu. |
| **R5** | **Nie regresja Foundation** | Tip `2a99e54` nie pogorszył body; odsłonił kontrast: chrome/KPI nowoczesne, body mid-stack legacy. |

**Werdykt RCA:** to **release / scope gap**, nie bug funkcjonalny. Body spełnia V3 („co dziś?”), ale **nie** spełnia wizualnego kontraktu GDS poniżej foldu KPI.

---

## 5. Priorytety biznesowe

Ranking wg wpływu na codzienną pracę Ownera + spójność marki (Pulpit = pierwszy ekran po logowaniu):

| Prio | Widget | Biznes | Uzasadnienie |
|------|--------|--------|--------------|
| **P0** | **W05 Braki dokumentów** | Komplet docs = cashflow / odbiór | Najczęściej otwierany mid-body; największy legacy footprint; nazwany PR-P1-3 |
| **P0** | **W06 Pilne uwagi** | Inbox operacyjny dnia | Drugi filar V3; wiele kategorii / deep-linków; ten sam shell co Braki |
| **P1** | **W04 Notatki operacyjne** | Szybki skok do notatek | Mały koszt · duży zysk spójności tuż pod KPI |
| **P1** | **W07 Przetargi skrót** | Strategia / decyzje | ACL-gated; wizualnie „trzeci system”; CTA wygląda jak Primary |
| **P2** | **W08 / W09 rows** | Przegląd ekipy / robót | Już w `WgCard`; polish wierszy opcjonalny |
| **P3** | **W01–W03, W10** | — | **Freeze** — Foundation / Guard; nie ruszać bez osobnego GO |

**Twarde reguły dla przyszłych slice’ów:**

1. **≤1 hero Primary** (Guard T05) — nie dodawać drugiego Primary w W07; CTA skrótu = `secondary` / `outline` / ghost.
2. **Bez zmiany semantyki liczników** V3.
3. **Thin files** — preferuj shell/`Wg*` wrap; unikaj refactoru logiki kategorii Pilne w tym samym commicie co paint.
4. **PAYROLL SAFETY GATE** — UI-only; zero CORE payroll.

---

## 6. Propozycja cienkich slice’ów

| Slice | Nazwa robocza | IN (pliki) | OUT | Cel | Est. ryzyko |
|-------|---------------|------------|-----|-----|-------------|
| **S1** | `DASHBOARD-BODY-01A` Braki shell | `DashboardView.tsx` (sekcja W05) | logika toggle docs · liczniki | `WgCard` section shell · title jak W08 · bez card-farm zewnętrznej · badge bez `rounded-full` farm · expand → `WgButton` ghost | Niski (UI) |
| **S2** | `DASHBOARD-BODY-01B` Pilne shell | `DashboardPilneUwagiSection.tsx` (chrome + header) | treść kategorii / SSOT counts | Ten sam język sekcji co S1 · drop uppercase title · expand `WgButton` | Niski–średni (duży plik, cienki diff chrome) |
| **S3** | `DASHBOARD-BODY-01C` Notatki | `DashboardOperationalNotesWidget.tsx` | moduł Notatki | `WgCard as=button` lub `WgKpi`-like summary · title bez uppercase shout | Niski |
| **S4** | `DASHBOARD-BODY-01D` Przetargi skrót | `TendersShortcutPanel.tsx` | TEUX Strategia module · scoring | Map KPI → `WgKpi` **lub** thin wrapper wyglądający jak GDS; CTA → `WgButton secondary` (nie primary) | Średni (TEUX tokens / ACL) |
| **S5** | `DASHBOARD-BODY-01E` List rows | W08/W09 body rows w `DashboardView` | empty states (już OK) | Soft rows · mniej chip noise · opcjonalnie focus-visible | Niski |
| **S6** | `DASHBOARD-BODY-01F` Guard extend | `e2e/ui-regression-guard*` | nowe flaky tests | Aserty: Braki/Pilne = `WgCard` / brak `uppercase tracking-wider` na title; W07 CTA ≠ `bg-primary` full | Niski |

**Zalecana kolejność prac:**

```text
S1 Braki shell
  → S2 Pilne shell
    → S3 Notatki
      → S4 Przetargi skrót (CTA demote + KPI language)
        → S5 rows polish (opcjonalnie)
          → S6 Guard extend (po S1–S2 minimum)
```

**Po S1+S2:** największy wizualny „dziób” mid-body znika; Foundation hero pozostaje nienaruszony.

**DF gate przed każdym slice:** osobny DESIGN FREEZE (IN/OUT plików, zakaz second Primary, zakaz zmiany `dashboard-urgent-today`).

---

## 7. Macierz „jeden język” (docelowy stan po S1–S4)

| Warstwa | Dziś | Po BODY-01 |
|---------|------|------------|
| Hero + KPI | GDS | GDS (bez zmian) |
| Notatki | Legacy | GDS surface |
| Braki / Pilne | Legacy card | `WgCard` section + soft rows |
| Przetargi skrót | TEUX parallel | GDS-aligned shortcut (TEUX data OK) |
| Listy dolne | Hybrid | Hybrid → soft GDS rows |
| Guard | Hero only | + body shell smoke (S6) |

---

## 8. Rekomendacja Ownera (AUDIT → następny etap)

| Pytanie | Rekomendacja |
|---------|--------------|
| Czy body wymaga EPIC-u? | **TAK** — cienki **UI body modernization**, nie nowy produkt |
| Start implementacji od razu? | **NIE** — najpierw **DESIGN FREEZE S1** (Braki) |
| Czy ruszać liczniki / kategorie? | **NIE** w BODY-01 |
| Czy łączyć S1+S2 w jeden commit? | Preferuj **osobno** (łatwiejszy PV / revert) |
| Czy W07 w tym samym EPIC? | Tak jako **S4**, po shell Braki/Pilne |

---

## 9. Related

- Foundation: [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](./WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md)
- UI-01A / 01B DF: [`WGDOM-UI-01A-DESIGN-FREEZE.md`](./WGDOM-UI-01A-DESIGN-FREEZE.md) · [`WGDOM-UI-01B-DASHBOARD-DESIGN-FREEZE.md`](./WGDOM-UI-01B-DASHBOARD-DESIGN-FREEZE.md)
- Guard OUT body: [`WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md`](./WGDOM-UI-REGRESSION-GUARD-01-DESIGN-FREEZE.md)
- A11Y defer PR-P1-3: [`WGDOM-A11Y-01-DESIGN-FREEZE.md`](./WGDOM-A11Y-01-DESIGN-FREEZE.md)
- Product layout: [`SESSION-HANDOFF-DASHBOARD-V3.md`](../SESSION-HANDOFF-DASHBOARD-V3.md)

---

**WGDOM-DASHBOARD-BODY-01**  
**Etap: AUDIT**  
**Status: COMPLETE** · implementacja / commit / push — **nie wykonane** (zakaz)
