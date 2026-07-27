# WGDOM — MASTER HANDOFF (ChatGPT · Cursor)

> **ID:** WGDOM-AI-COST-01-FREEZE-01 (handoff) · CONSOLIDATION-03 (baza)  
> **STATUS:** **ACTIVE** · **MASTER HANDOFF nowych sesji**  
> **Data:** 2026-07-27  
> **Zakaz:** implementacja / commit / push bez ścieżki Entry + Gate + Owner GO  
> **Tip SSOT (numery wersji):** wyłącznie [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `https://www.wgdom.fun/version.json`

```text
════════════════════════════════════════════════════════
NOWA SESJA: przeczytaj TEN plik (≤10 min) → AI_ENTRY → Gate
Nie przeszukuj historii czatu. Nie zgaduj tipu z pamięci.
AI-COST-01 = EPIC COMPLETE · FROZEN · FIELD READY
AI-COST-02 = BACKLOG — Starting Point (bez DF / bez kodu)
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

Gdy temat = AI Cost / oferta / kosztorys AI:
  → docs/architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md
  → docs/architecture/WGDOM-AI-COST-01-SSOT.md
  → docs/architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md
  → (BACKLOG) docs/architecture/WGDOM-AI-COST-02-STARTING-POINT.md
```

**Root README / AGENTS.md** — po Entry, nie zamiast Entry.  
**DEPRECATED start:** `AI-START-HERE.md` · `AI-HANDOFF.md` · `CURSOR-HANDOFF.md`.

---

## 1. Aktualny stan projektu (snapshot)

> Numery poniżej = skrót na dzień closeout. **Przed kodem** zawsze zweryfikuj [`09`](09_PRODUCTION_BASELINE.md) / `version.json`.

| Pole | Wartość |
|------|---------|
| **Production URL** | https://www.wgdom.fun · https://www.wgdom.online |
| **Production Version (UI)** | **2.65.61** (AI-COST-01 STAB-01) |
| **Live deploy** | tip w [`09`](09_PRODUCTION_BASELINE.md) · `version.json` |
| **Ostatni feature (AI Cost)** | STAB-01 **`87610b5`** · UI **2.65.61** |
| **Payroll Hours-wipe baseline** | **2.65.43** @ **`ea1b0a6`** (semantyka D1–D5 ACTIVE) |
| **Status projektu** | **PRODUCTION VERIFIED · GREEN** · **STABILIZATION WINDOW ACTIVE** |
| **Protected Core** | **GREEN** |
| **Ostatni EPIC (AI Cost)** | **AI-COST-01** — **EPIC COMPLETE** · **FIELD READY** · **ARCHITECTURE FROZEN** |
| **Freeze / SSOT** | [`ARCHITECTURE-FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) · Cold Start [`PASS`](../architecture/WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md) |
| **AI-COST-02** | **BACKLOG** · [`STARTING-POINT`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) — **bez** DF / implementacji |
| **Ostatni EPIC (UI shell)** | **WGDOM UI FOUNDATION v1.0** — **COMPLETE** |
| **Dashboard Body** | **BODY S1–S4** — **COMPLETE** |
| **GDS** | **GDS-01 CLOSED** · **MAINT-01 CLOSED** · DS-13 |
| **CI** | Gate B/C **GREEN** · residual **CI-C-2** (P3) |
| **Deploy FE** | `git push origin main` → Vercel (**zakaz** `vercel deploy`) |

---

## 2. Co zostało zrobione (historia — zwięźle)

Nie kopiuj pełnych raportów. Linki = SSOT szczegółów.

| EPIC / seria | Rezultat |
|--------------|----------|
| **AI-COST-01** (S1–S7 + STAB-01 + FREEZE-01) | **EPIC COMPLETE** · **FIELD READY** · **FROZEN** · Bid Proposal = jedyny generator oferty · [`FREEZE`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) · [`LESSONS`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AP2 Analiza Przetargów 2.0** (S0–S4) | **CLOSED** (docs/jakość) — wejście do wyceny, nie zastępuje AI-COST |
| **PAYROLL Hours-wipe D1–D5** | **CLOSED** · tip `ea1b0a6` · [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **HARDENING 01A / 01D / 01B0** | **CLOSED** |
| **TENDERS-SYNC-STORM-P0** | **CLOSED** |
| **CI Remediation (Gate B+C)** | **CLOSED** |
| **AI-DOCS Payroll Guard 01→02** | **ACTIVE** · Entry + Safety Gate + tip w `09` |
| **GLOBAL-DESIGN-SYSTEM-01 + MAINT-01** | **CLOSED** |
| **UI FOUNDATION v1.0** | **COMPLETE** · [`FOUNDATION-REPORT`](../architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |
| **DASHBOARD BODY S1–S4** | **COMPLETE** · [`BODY-02-CLOSEOUT`](../architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |

Starsze CLOSED (NG-04/06/09/11, WM/ZI, Mobile Recovery, Test Harness H0–H5, …) — indeks w [`PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) §1a.

---

## 3. Architektura — zasady (jednoznacznie)

| Zasada | Znaczenie |
|--------|-----------|
| **SSOT** | Jedna prawda na domenę; tip **tylko** w `09`; Payroll = `PAYROLL-ARCHITECTURE-SSOT`; AI Cost = [`WGDOM-AI-COST-01-SSOT`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **REUSE FIRST** | Istniejąca facade (`PWRB`, Domain Push, `Wg*`, `computeTenderBidProposal`) > nowy kod |
| **ZERO DUPLICATE LOGIC** | Zakaz drugiej ścieżki merge / persist / roster / **kalkulatora oferty** |
| **Thin Slice Workflow** | Jeden concern · cienki allowlist · DF · commit · PV · next |
| **Release Workflow** | AUDIT → RCA → PLAN → DF → Arch Review → Owner GO → IMPLEMENT → TEST → COMMIT → PUSH → PV → CLOSE · FE = push `main` |
| **Guardy** | Payroll Safety Gate G1–G9 · Domain Gate · fence · e2e-ui-guard · Gate B payroll przy CORE |
| **AI-COST-01** | Pipeline S1–S7 **FROZEN** · Bid Proposal = jedyny generator oferty · preservacja edycji użytkownika |
| **UI Foundation / Body / GDS** | **COMPLETE** (S1–S4) — nie regresuj T05 · DS-13 · TEUX ≠ global GDS |

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
- Nie przebudowuj AI-COST-01 (S1–S7 / Bid / preservacja user) bez nowego DF + GO.  
- Nie startuj **AI-COST-02** bez Owner GO (Starting Point ≠ Design Freeze).

---

## 5. NEXT RECOMMENDED EPICS (priorytet)

Wszystkie: **status = BACKLOG / opcjonalny** dopóki Owner nie wyda GO. Stabilization Window **ACTIVE**.

| # | EPIC | Status | Opis | Zależności | Dlaczego następny |
|---|------|--------|------|------------|-------------------|
| **0** | **AI-COST-02** | BACKLOG · Owner GO | Modele cen / konkurencyjność / predykcja / UX kolejki — **tylko Starting Point** | AI-COST-01 **FROZEN** · [`STARTING-POINT`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) | Naturalna kontynuacja Przetargi × wycena; **nie** auto-start |
| **1** | **DASHBOARD-BODY-S5** — soft rows W08/W09 | BACKLOG · P2 | Polish wierszy Pracuje dziś / Roboty w trakcie | BODY S1–S4 **COMPLETE** | Thin UI |
| **2** | **DASHBOARD-BODY-S6** — ui-guard body asserts | BACKLOG · P2 | Asercje body GDS | Foundation · S1–S4 | Hardening regresji |
| **3** | **GDS-02** — wąski high-traffic | BACKLOG · Owner GO | Kolejny allowlist Wg* | GDS-01/MAINT **CLOSED** | Spójność chrome |
| **4** | **CI-C-2** — legacy e2e-happy-path | BACKLOG · P3 | Residual Gate C | CI Remediation **CLOSED** | Higiena CI |
| **5** | **HARDENING-01B1 / C / E** | BACKLOG · Owner GO | Hardening sync | 01A/01D/01B0 **CLOSED** | Sygnały prod |
| **6** | **LOCALSTORAGE-ARCH-02F** (dalsze) | BACKLOG · Owner GO | Storage budget | 02 A–E | Blast radius |
| **7** | **TEUX / Strategia** | BACKLOG | Pełny tor TEUX | BODY-S4 | Nie mieszać z Wg* |
| **8** | **Payroll nowe prace** | **NONE** | — | Hours-wipe **CLOSED** | Tylko nowy GO + Gate |

**Rekomendowany pierwszy krok (Przetargi / wycena):** przeczytaj Freeze + SSOT; **AI-COST-02** tylko po Owner GO.  
**Rekomendowany pierwszy krok (UI):** S5/S6 *albo* maintenance.  
**Zawsze:** Entry + Gate.

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
| **AI-COST-01 Freeze** | [`WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md`](../architecture/WGDOM-AI-COST-01-ARCHITECTURE-FREEZE.md) |
| **AI-COST-01 SSOT** | [`WGDOM-AI-COST-01-SSOT.md`](../architecture/WGDOM-AI-COST-01-SSOT.md) |
| **AI-COST-01 Lessons** | [`WGDOM-AI-COST-01-LESSONS-LEARNED.md`](../architecture/WGDOM-AI-COST-01-LESSONS-LEARNED.md) |
| **AI-COST-02 start** | [`WGDOM-AI-COST-02-STARTING-POINT.md`](../architecture/WGDOM-AI-COST-02-STARTING-POINT.md) |
| Cold Start Audit | [`WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md`](../architecture/WGDOM-AI-COST-01-FREEZE-01-COLD-START-AUDIT.md) |
| CI | [`CI-REMEDIATION-EPIC-CLOSEOUT.md`](../architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md) |
| Payroll AI | [`../PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| Living baseline | [`../PROJECT-HANDOFF-CURRENT.md`](../PROJECT-HANDOFF-CURRENT.md) |
| Sesja Ownera | [`../../CURRENT-TASK.md`](../../CURRENT-TASK.md) |

---

**MASTER HANDOFF ACTIVE** · AI-COST-01 **FROZEN** · FREEZE-01 handover · tip w `09`
