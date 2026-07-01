# NG-04 — EPIC CLOSE PLAN

> **Status:** **PLAN ONLY**  
> **Data:** 2026-07-01  
> **Epic:** NG-04 — Kosztorys Workspace PRO  
> **Ostatnia faza:** **NG-04.4** Polish & EPIC Close → **2.63.12**  
> **Baseline:** prod **2.63.11** · commit `adccb4e`

**NG-04.4 nie dodaje funkcji** — zamyka epic porządkiem UX, a11y i dokumentacją.

---

## 1. Podsumowanie epic (stan po 04.3)

| Faza | Wersja | Deliverable | Status |
|------|--------|-------------|--------|
| **04.0** | — | DESIGN FREEZE, Principles #001–#003 | CLOSED |
| **04.1** | 2.63.9 | BOQ Explorer ViewModel, search, filtry | **RELEASED** |
| **04.2** | 2.63.10 | Benchmark rbh per linia, cache #004–#007 | **RELEASED** |
| **04.3** | 2.63.11 | ATH fidelity, tooltipy, source strip #008–#009 | **RELEASED** |
| **04.4** | 2.63.12 | Polish, a11y, HelpView, EPIC CLOSE | **PLANNED** |

### Principles shipped (docelowe zamknięcie)

| # | Nazwa | Faza |
|---|-------|------|
| #001 | One BOQ Row · One ViewModel · Many Views | 04.1 |
| #002 | Lazy Rendering First | 04.1 |
| #003 | Search ≠ Merge | 04.1 |
| #004 | Benchmark is Presentation | 04.2 |
| #005 | Derived UI Cache | 04.2 |
| #006 | UI Consumes Cache Only | 04.2 |
| #007 | Presentation Metadata Only | 04.2/04.3 |
| #008 | ATH Fidelity is Explain, Not Re-parse | 04.3 |
| #009 | Explain Before Expand | 04.3 |
| #010 | Polish Only (faza 04.4) | 04.4 |

---

## 2. NG-04.4 — kolejność implementacji

| Krok | Zadanie | DoD | Audyt ID |
|------|---------|-----|----------|
| **1** | `BoqExplorerSectionHeader` — UX-01 hierarchy | tytuł nad strip/search | UX-01 |
| **2** | `BoqAthTooltip` — ATH-01/02, M-01 | static test suppress priced | ATH-01–02, M-01 |
| **3** | Benchmark label + empty B-01 | desktop+mobile parity | UX-03, B-01–02 |
| **4** | a11y: filtry, tabela, strip | aria-pressed, caption, scope | M-02–03, ATH-04 |
| **5** | Empty UX-07 + rows_fallback UX-04 | edge states | UX-04, UX-07 |
| **6** | `TooltipProvider` sekcji ATH-03 | opcjonalny refactor | ATH-03 |
| **7** | `GuideView` DOC-01 | FAQ BOQ Explorer | DOC-01 |
| **8** | `test-ng04-4` + v41 T21–T22 + regresja | all PASS | — |
| **9** | Changelog **2.63.12** + EPIC CLOSE docs | na COMMIT | — |

**Szacunek diff:** ~8–12 plików, **< 400 LOC** (bez R-01–R05 jeśli P3 pominięte).

---

## 3. Plan testów NG-04.4

### 3.1 Nowy: `scripts/test-ng04-4-polish-epic-close.mjs`

| ID | Assert |
|----|--------|
| T01 | `h3` / header BOQ przed `data-kosztorys-boq-search` |
| T02 | Desktop header zawiera „Benchmark rbh” |
| T03 | Mobile field label „Benchmark rbh” |
| T04 | `BoqAthTooltip` — suppress priced icon (static) |
| T05 | `aria-pressed` na filtrach |
| T06 | `rows_fallback` tylko w DEV lub usunięty z prod bundle |
| T07 | Explorer bez zmian merge (`buildKosztorysBoqExplorerView` frozen) |
| T08 | HelpView zawiera „BOQ Explorer” |

### 3.2 Regresja epic (pełna)

```bash
npx vite-node scripts/test-ng04-4-polish-epic-close.mjs
npx vite-node scripts/test-ng04-3-ath-fidelity.mjs
npx vite-node scripts/test-ng04-2-benchmark-per-line.mjs
npx vite-node scripts/test-ng04-kosztorys-boq-explorer.mjs
npx vite-node scripts/test-ng04-m8-large-boq-performance.mjs
npx vite-node scripts/test-v41-kosztorys-workspace.mjs
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
npx vite-node scripts/test-tp200b-snapshot-fidelity.mjs
npm run build
```

### 3.3 Manual smoke

| # | Scenariusz |
|---|------------|
| M1 | Mobile 390px — ATH tooltip tap na ⓘ, nie na całą wartość |
| M2 | Desktop — nagłówek BOQ czytelny nad search |
| M3 | Filtr elektryczne 0 wyników — komunikat |
| M4 | Keyboard — Tab przez filtry + search |

---

## 4. Rollout NG-04.4

```text
AUDIT (ten dokument) ✅
  → DESIGN FREEZE NG-04.4
  → IMPLEMENT (kroki §2)
  → TEST (§3)
  → BUILD
  → [na polecenie] COMMIT
  → PUSH
  → VERIFY version.json → 2.63.12
  → RELEASE-REPORT-NG-04.4.md
  → NG-04-EPIC-CLOSE-REPORT.md
  → CURRENT-TASK: NG-04 EPIC CLOSED
```

---

## 5. EPIC CLOSE — artefakty końcowe

| Artefakt | Akcja |
|----------|-------|
| `docs/NG-04-DESIGN-FREEZE.md` | Banner **EPIC CLOSED** + tabela faz RELEASED |
| `docs/NG-04-EPIC-CLOSE-REPORT.md` | **NEW** — podsumowanie 04.0–04.4, principles, test matrix |
| `docs/RELEASE-REPORT-NG-04.4.md` | Release 2.63.12 |
| `CURRENT-TASK.md` | NG-04 → **EPIC CLOSED**; następny epic na polecenie |
| `CHANGELOG.md` / `changelog-data.ts` | 2.63.12 NG-04.4 + linia EPIC CLOSE |
| `GuideView.tsx` | BOQ Explorer FAQ |

### Treść EPIC CLOSE REPORT (szkielet)

1. **Mission** — unified BOQ decision screen na tab Kosztorys  
2. **Timeline** — 2.63.9 → 2.63.12  
3. **Architecture** — diagram ViewModel + derived caches  
4. **Principles #001–#010** — tabela SHIPPED  
5. **Test coverage** — ng04-1/2/3, M8, v41  
6. **Known limitations** — brak `code` w snapshot, R/M/S tylko w modal  
7. **Backlog post-epic** — G-02, G-08, virtualizacja  

---

## 6. Analiza regresji (epic-wide)

| Warstwa | NG-04.4 ryzyko | Uwagi |
|---------|----------------|-------|
| Parser / snapshot | **NONE** | frozen cały epic |
| NG-02 runtime | **NONE** | frozen |
| Tab Ceny | **LOW** | benchmark reuse — nie duplikować edit UI |
| KV / sync | **NONE** | prezentacja only |
| Trust layer | **LOW** | read-only w BOQ |
| Performance M8 | **LOW** | brak nowych O(n) poza opcjonalnym provider |

**Rollback 04.4:** revert pojedynczego commita → 2.63.11 (ATH fidelity zostaje).

---

## 7. Po zamknięciu epic

| Temat | Priorytet | Typ |
|-------|-----------|-----|
| Persist `code` in snapshot | backlog | G-08 · wymaga audytu parser |
| R/M/S inline BOQ | backlog | G-02 |
| Virtualizacja BOQ 500+ | backlog | performance |
| Work Catalog P2 | osobny epic | P3 |
| P0 Payroll Etap 2 | osobny epic | P0 |

**NG-05** (propozycja nazwy) — nie definiować w 04.4; na polecenie właściciela repo.

---

## 8. Definition of Done — EPIC NG-04

- [ ] NG-04.4 released **2.63.12** VERIFY PASS
- [ ] Wszystkie P1 z audytu NG-04.4 zaimplementowane
- [ ] `test-ng04-4` + regresja epic PASS
- [ ] HelpView zaktualizowany
- [ ] `NG-04-EPIC-CLOSE-REPORT.md` opublikowany
- [ ] `CURRENT-TASK.md` — **NG-04 EPIC CLOSED**
- [ ] Brak otwartych P0 w audycie NG-04.4

**Następny krok:** Akceptacja audytu + freeze → **IMPLEMENT NG-04.4** na polecenie.
