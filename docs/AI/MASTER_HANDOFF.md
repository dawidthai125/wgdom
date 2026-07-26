# WGDOM — MASTER HANDOFF (ChatGPT · Cursor)

> **ID:** WGDOM-AI-DOCS-CONSOLIDATION-03  
> **STATUS:** **ACTIVE** · **MASTER HANDOFF nowych sesji**  
> **Data:** 2026-07-26  
> **Zakaz:** implementacja / commit / push bez ścieżki Entry + Gate + Owner GO  
> **Tip SSOT (numery wersji):** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
NOWA SESJA: przeczytaj TEN plik (≤10 min) → AI_ENTRY → Gate
Nie przeszukuj historii czatu. Nie zgaduj tipu z pamięci.
════════════════════════════════════════════════════════
```

---

## 0. Gdzie zaczynać

```text
1. docs/AI/MASTER_HANDOFF.md     ← JESTEŚ TUTAJ (stan + NEXT)
2. docs/AI/AI_ENTRY.md           ← oficjalny START procesu
3. docs/AI/PROJECT_HANDOFF.md
4. docs/AI/AI_MEMORY.md
5. docs/AI/AI_DECISION_TREE.md
6. docs/AI/PAYROLL_SAFETY_GATE.md   ← G1–G9 przed IMPLEMENT
7. docs/AI/09_PRODUCTION_BASELINE.md  ← tip (lub version.json)
8. CURRENT-TASK.md
9. FEATURE_IMPLEMENTATION_CHECKLIST.md
10. IMPLEMENT tylko po Gate PASS + Owner GO gdy wymagane
```

**Root README / AGENTS.md** — po Entry, nie zamiast Entry.  
**DEPRECATED start:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

---

## 1. Aktualny stan projektu (snapshot)

> Numery poniżej = skrót na dzień closeout. **Przed kodem** zawsze zweryfikuj [`09`](09_PRODUCTION_BASELINE.md) / `version.json`.

| Pole | Wartość |
|------|---------|
| **Production URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Production Version (UI)** | **2.65.46** |
| **Live deploy (`version.json.commit`)** | **`1e07574`** (docs tip BODY-S4 RR) |
| **Ostatni feature commit (BODY-S4)** | **`bd0f239`** |
| **Payroll Hours-wipe baseline** | **2.65.43** @ **`ea1b0a6`** (semantyka D1–D5 ACTIVE) |
| **Status projektu** | **PRODUCTION VERIFIED · GREEN** · **STABILIZATION WINDOW ACTIVE** |
| **Protected Core** | **GREEN** |
| **Ostatni zakończony EPIC (UI)** | **WGDOM UI FOUNDATION v1.0** — **COMPLETE** (`2a99e54`) |
| **Ostatni zamknięty Dashboard Body** | **BODY S1–S4** — **COMPLETE** · closeout [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **Ostatni release (feature chain)** | BODY-S4 Przetargi skrót → GDS |
| **GDS** | **GDS-01 CLOSED** · **MAINT-01 CLOSED** · DS-13 No Parallel DS |
| **UI Foundation** | **COMPLETE** — shell · sidebar · topbar · Roboty chrome · A11Y · e2e-ui-guard **9/9** @ prod |
| **Testy UI guard** | `npm run test:e2e:ui-guard` → **9/9 PASS** @ prod (Foundation) |
| **CI** | **CI Remediation EPIC CLOSED** · Gate B/C **GREEN** · residual **CI-C-2** (P3, nie tip-blocker) |
| **Deploy FE** | `git push origin main` → Vercel Git Integration (**zakaz** `vercel deploy`) |

---

## 2. Co zostało zrobione (historia — zwięźle)

Nie kopiuj pełnych raportów. Linki = SSOT szczegółów.

| EPIC / seria | Rezultat |
|--------------|----------|
| **PAYROLL Hours-wipe D1–D5** | **CLOSED** · Domain Gate + recovery · tip `ea1b0a6` · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **HARDENING 01A / 01D / 01B0** | **CLOSED** · Persist SSOT · Edge 546 monitor · CB telemetry |
| **TENDERS-SYNC-STORM-P0** | **CLOSED** · heavy persist contract |
| **CI Remediation (Gate B+C)** | **CLOSED** · tip-blockery CI = 0 |
| **AI-DOCS Payroll Guard 01→02** | **ACTIVE** · Entry + Safety Gate + tip SSOT w `09` |
| **LOGIN-UI-01** | **CLOSED** · quality bar GDS · UI 2.65.45–46 |
| **GLOBAL-DESIGN-SYSTEM-01 + MAINT-01** | **CLOSED** · Wg* SSOT · SOAK-01/03 in · SOAK-02/06 DEFER |
| **SHELL-RELEASE-01 · SIDEBAR-REGRESSION-02 · Roboty UI-01D** | **CLOSED** · chrome GDS |
| **UI FOUNDATION v1.0** | **COMPLETE** · A11Y-01 + e2e-ui-guard · [`FOUNDATION-REPORT`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **DASHBOARD BODY S1–S4** | **COMPLETE** · Braki · Pilne · Notatki · Przetargi skrót → GDS · thin releases · [`BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |

Starsze CLOSED (NG-04/06/09/11, WM/ZI, Mobile Recovery, Test Harness H0–H5, …) — indeks w [`PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) §1a (living, historyczny).

---

## 3. Architektura — zasady (jednoznacznie)

| Zasada | Znaczenie |
|--------|-----------|
| **SSOT** | Jedna prawda na domenę; tip wersji **tylko** w `09`; Payroll AI = `PAYROLL-ARCHITECTURE-SSOT.md` |
| **REUSE FIRST** | Istniejąca facade (`PWRB`, Domain Push, `Wg*`) > nowy kod |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej ścieżki merge / persist / roster dla tej samej domeny |
| **Thin Slice Workflow** | Jeden widget / jeden concern / cienki allowlist plików · osobny DF · osobny commit · PV · dopiero next slice |
| **Release Workflow** | AUDIT → RCA → PLAN → DF → Arch Review → Owner GO → IMPLEMENT → TEST → COMMIT → PUSH → PV → CLOSE · FE = push `main` |
| **Guardy** | Payroll Safety Gate G1–G9 · Domain Gate hours · resurrection fence · e2e-ui-guard (shell/hero) · Gate B payroll przy CORE |
| **UI Foundation** | Shell + Sidebar + Topbar + Roboty chrome + A11Y + ui-guard = **COMPLETE** — nie regresuj T05 (≤1 hero Primary) |
| **Dashboard Body** | Mid-body W04–W07 = **GDS COMPLETE** (S1–S4); semantyka V3 / liczniki **OUT** z paint |
| **GDS** | `wg-ui-tokens` + `WgButton`/`WgField`/`WgCard`/`WgModalFrame` · **DS-13** · TEUX = osobny DS (nie mieszać) |

Szczegóły: [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md) · [`06_RELEASE_PROCESS.md`](06_RELEASE_PROCESS.md) · [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md).

---

## 4. Czego NIE robić

- Nie startuj od historii czatu / Continuity / losowego `docs/architecture/PAYROLL-*`.  
- Nie kopiuj numeru tipu do wielu plików — bump tylko w `09`.  
- Nie mieszaj **FEATURE + CORE** (#CORE-013).  
- Nie ruszaj Payroll write-path / cloud-sync / Edge / fence bez **Owner GO** + DF.  
- Nie dodawaj drugiego **Primary** w Dashboard body (Guard T05).  
- Nie re-open GDS-01 / Foundation / BODY S1–S4 bez nowego briefu.  
- Nie `vercel deploy` / force push `main` / commit bez prośby Ownera.  
- Nie startuj nowego EPIC w **STABILIZATION WINDOW** bez Owner GO.

---

## 5. NEXT RECOMMENDED EPICS (priorytet)

Wszystkie: **status = BACKLOG / opcjonalny** dopóki Owner nie wyda GO. Stabilization Window **ACTIVE**.

| # | EPIC | Status | Opis | Zależności | Dlaczego następny |
|---|------|--------|------|------------|-------------------|
| **1** | **DASHBOARD-BODY-S5** — soft rows W08/W09 | BACKLOG · P2 | Polish wierszy Pracuje dziś / Roboty w trakcie (shell już GDS) | BODY S1–S4 **COMPLETE** | Domknięcie wizualne list dolnych; niski risk, thin UI |
| **2** | **DASHBOARD-BODY-S6** — ui-guard body asserts | BACKLOG · P2 | Asercje Braki/Pilne=`WgCard`, CTA skrótu ≠ Primary | Foundation Guard **COMPLETE** · S1–S4 | Hardening regresji body; nie flaky |
| **3** | **GDS-02** — wąski high-traffic | BACKLOG · Owner GO | Kolejny allowlist ekranów Wg* (nie full rewrite) | GDS-01/MAINT **CLOSED** · soak DEFER OK | Spójność chrome poza już zamkniętym shell/body |
| **4** | **CI-C-2** — legacy e2e-happy-path | BACKLOG · P3 | Residual Gate C · nie tip-blocker | CI Remediation **CLOSED** | Higiena CI; niski priorytet |
| **5** | **HARDENING-01B1 / C / E** | BACKLOG · Owner GO | Kolejna warstwa hardening sync | 01A/01D/01B0 **CLOSED** | Tylko przy sygnałach prod / GO |
| **6** | **LOCALSTORAGE-ARCH-02F** (dalsze) | BACKLOG · Owner GO | Storage budget / LS hygiene | 02 A–E CLOSED · F częściowo | Tylko GO — blast radius storage |
| **7** | **TEUX / Strategia** (poza skrótem Pulpitu) | BACKLOG | Pełny moduł Przetargi — osobny tor TEUX | BODY-S4 skrót **GDS** | Nie mieszać z globalnym Wg* bez DF |
| **8** | **Payroll nowe prace** | **NONE** | — | Hours-wipe **CLOSED** | Tylko nowy Owner GO + Gate |

**Rekomendowany pierwszy krok nowej sesji (docs/UI):** Owner wybiera **S5** lub **S6** *albo* freeze UI i maintenance/stabilization.  
**Rekomendowany pierwszy krok (bezpieczeństwo):** zawsze **Entry + Gate**; przy FEATURE UI — Boundary Check + thin DF.

---

## 6. Handoff skrót (ChatGPT vs Cursor)

| | ChatGPT | Cursor |
|--|---------|--------|
| Start | Ten plik + `AI_ENTRY` | Ten plik + `AI_ENTRY` + `AGENTS.md` (workflow) |
| Tip | `09` / `version.json` | to samo + `git log -1` lokalnie ≠ tip |
| WT lokalne | — | Dużo untracked/modified może istnieć — **nie** commituj drive-by; thin allowlist |
| Implement | Tylko po GO | Tylko po GO · edycje w scope DF |

---

## 7. Linki SSOT (mapa)

| Temat | Dokument |
|-------|----------|
| Entry | [`AI_ENTRY.md`](AI_ENTRY.md) |
| Tip | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) |
| Memory / Tree | [`AI_MEMORY.md`](AI_MEMORY.md) · [`AI_DECISION_TREE.md`](AI_DECISION_TREE.md) |
| Gate | [`PAYROLL_SAFETY_GATE.md`](PAYROLL_SAFETY_GATE.md) |
| Foundation | [`WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| Dashboard Body | [`WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| GDS | [`GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md`](../architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md) |
| CI | [`CI-REMEDIATION-EPIC-CLOSEOUT.md`](../architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md) |
| Payroll AI | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Living baseline | [`../PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) |
| Sesja Ownera | [`../../CURRENT-TASK.md`](../../CURRENT-TASK.md) |
| Audit tej konsolidacji | [`WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md`](../architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md) |

---

**MASTER HANDOFF ACTIVE** · CONSOLIDATION-03 · bez implementacji kodu w tym tickecie
