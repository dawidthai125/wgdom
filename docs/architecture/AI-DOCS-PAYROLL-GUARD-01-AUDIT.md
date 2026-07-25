# AI-DOCS-PAYROLL-GUARD-01 — AUDIT (AI Documentation · Payroll Guard)

> **ID:** AI-DOCS-PAYROLL-GUARD-01  
> **ETAP:** **AUDIT + DOCUMENTATION PLAN ONLY**  
> **STATUS:** **AUDIT COMPLETE** · **IMPLEMENT DOCS:** **DONE** w **AI-DOCS-PAYROLL-GUARD-02** (2026-07-26)  
> **Data audytu:** 2026-07-26  
> **Zakaz tej fazy (GUARD-01):** zero `src/**` · zero commit · zero push · zero `CURRENT-TASK` · zero manuals — **wykonane**  
> **Następnik:** [`AI-DOCS-PAYROLL-GUARD-02-RELEASE-REPORT.md`](AI-DOCS-PAYROLL-GUARD-02-RELEASE-REPORT.md) · Entry [`../AI/AI_ENTRY.md`](../AI/AI_ENTRY.md)

```text
════════════════════════════════════════════════════════
CEL: nowe sesje AI/Cursor krótkie, oparte WYŁĄCZNIE na docs
     — nie na historii czatu — ze świadomością krytyczności Payroll
NIE: poprawa kodu Payroll
════════════════════════════════════════════════════════
```

---

## 0. Executive Summary

| Werdykt | Ocena |
|---------|-------|
| Świadomy pack **docs/AI/** + Payroll AI Safety (Quick Start → SSOT) | **SILNY** |
| Sygnał „Lista Płac = #1” na oficjalnej ścieżce | **SILNY** |
| Spójność tipów / entry points (stale `AI-START-HERE`, Continuity, cursor rules) | **SŁABA** |
| Odkrywalność w szumie **~118** plików `PAYROLL*` | **ŚREDNIA** (Quick Start ostrzega; brak twardego archive) |
| Pokrycie 1:1 nazw Ownera (SAFETY MANUAL, DO NOT TOUCH, …) | **PARTIAL** — treść często jest, **nazwy/fragmentacja** nie |

**Główna przyczyna regresji „po każdej większej implementacji” (hipoteza docs):** nie brak treści o Payroll, lecz:

1. **Wiele entry points** — część **nieaktualnych** (`AI-START-HERE.md` @ **2.63.85**).  
2. **Długi AGENTS.md** (setki linków closeout) → AI „zgubia” P0 Payroll.  
3. **~118 historycznych PAYROLL-*** bez folderu archive → AI czyta losowe DF/RCA zamiast SSOT.  
4. **Cursor rules** ze starymi tipami 2.63.x — słabo eksponują pack `docs/AI/PAYROLL_*`.  
5. Brak jednego **twardego „STOP — Payroll?”** gate na początku każdego tasku FEATURE.

---

## 1. Jak wygląda obecny onboarding nowego AI?

### 1.1 Ścieżka zamierzona (oficjalna)

```text
Root README.md  „Dla nowych sesji AI”
  → docs/AI/README.md          (INDEX)
  → AI_MEMORY.md               ★★★ ≤5 min
  → AI_DECISION_TREE.md        ★★★
  → 08_AI_GUARDRAILS.md
  → 01_AI_ONBOARDING.md …
  → [Payroll path] PAYROLL_QUICK_START → GUARD_RAILS → DEPENDENCY → REGRESSION → PLAYBOOK
  → docs/PAYROLL-ARCHITECTURE-SSOT.md
  → (głęboko) PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md
  → AGENTS.md / CURRENT-TASK / AGENT-CONTINUITY / PROJECT-HANDOFF-CURRENT
```

**Źródła:** `docs/AI/README.md`, `AGENTS.md` punkty `2ai*` / `2p0*`, `docs/AI/PROJECT_HANDOFF.md`, `CURRENT-TASK.md` (DOCS FINALIZED @ tip **2.65.43** w treści — **uwaga:** tip prod mógł się przesunąć; docs tipy bywają stale).

### 1.2 Ścieżki konkurencyjne (ryzyko)

| Entry | Problem |
|-------|---------|
| `AI-START-HERE.md` (root) | **STALE** — tip **2.63.85** / 2026-07-10; nie wymusza packu `PAYROLL_QUICK_START` jak `docs/AI` |
| `docs/AGENT-CONTINUITY-GUIDE.md` | Living, ale banner tip często **opóźniony**; ogrom closeoutów |
| `.cursor/rules/*.mdc` | Always-on; tipy **2.63.x**; Payroll AI pack **słabo** |
| Losowy `docs/architecture/PAYROLL-*` | 49+ plików — bez Quick Start = chaos |

### 1.3 Istniejący pack Payroll AI Safety (`docs/AI/`)

| Plik | Rola |
|------|------|
| `PAYROLL_QUICK_START.md` | Minimalny onboarding LP |
| `PAYROLL_GUARD_RAILS.md` | Zakazy + checklisty |
| `PAYROLL_DEPENDENCY_MAP.md` | Blast radius |
| `PAYROLL_REGRESSION_HISTORY.md` | RC → fix |
| `PAYROLL_AI_PLAYBOOK.md` | AUDIT → DF → GO |
| + `AI_MEMORY` / `AI_DECISION_TREE` / `08_AI_GUARDRAILS` | Global |

Meta-audyt wcześniejszy: `docs/architecture/PAYROLL-DOCS-HARDENING-AI-SAFETY-01-AUDIT.md` (SUPERSEDES `PAYROLL-AI-GUARD-DOCS-01-AUDIT.md`).

---

## 2. Odpowiedzi na pytania Ownera

| # | Pytanie | Werdykt | Evidence / komentarz |
|---|---------|---------|----------------------|
| **1** | Jak wygląda onboarding? | **Zdefiniowany, ale rozgałęziony** | §1 powyżej |
| **2** | Czy AI od razu wie, że Payroll jest krytyczny? | **YES** *jeśli* idzie `docs/AI` / README; **PARTIAL** przy `AI-START-HERE` / Continuity / rules | Quick Start: „LISTA PŁAC = PRIORYTET #1”; Memory to samo |
| **3** | Czy zna pliki NIE WOLNO ruszać? | **YES** (treść) | `08_AI_GUARDRAILS.md` · `PAYROLL_GUARD_RAILS.md` P1–P15 · Playbook §7 — **brak** pliku „DO NOT TOUCH” |
| **4** | Czy zna wszystkie incydenty Payroll? | **PARTIAL** | `04_INCIDENTS_HISTORY.md` + `PAYROLL_REGRESSION_HISTORY.md` — **nie** komplet 118 closeoutów w jednym indeksie |
| **5** | Czy zna wszystkie RCA? | **PARTIAL** | Regression §10 mapa; RCA rozproszone w `architecture/` + `recovery/` — **brak** `PAYROLL_RCA_INDEX` |
| **6** | Czy zna wszystkie stabilizacje? | **YES / PARTIAL** | `STABILIZATION-WINDOW-PLAN.md` + weekly; pełna historia okien **rozproszona** |
| **7** | Cloud Sync · Bootstrap · Quota · Write/Read · Op Week · Week Resolver · SSOT · Merge · LS · Worker · Loader | **PARTIAL** | **Findable:** Sync, Merge, SSOT, Bootstrap, CloudLoader, LS, write_path, Quota (SSOT / Agent Guide / Memory / LOCALSTORAGE-ARCH). **Worker:** Dependency Map. **Operational Week / Week Resolver:** **brak** docs o tych tytułach — semantyka w kodzie/`payroll-cycle` / rollover DF |
| **8** | Czy zna architekturę Payroll? | **YES** | `PAYROLL-ARCHITECTURE-SSOT.md` + Flow Map + Agent Guide |
| **9** | Najczęstsze błędy AI? | **YES** | Guard Rails §7 · SSOT anty-wzorce · Playbook |
| **10** | Czego NIE wykonywać? | **YES** | Guardrails + Guard Rails + DF „nie zmieniaj” + Quality Gate |

---

## 3. Inwentarz (skrót)

| Obszar | Liczba / stan |
|--------|----------------|
| `docs/AI/` | **21** plików — Knowledge Base + 5× Payroll pack |
| `docs/**` z PAYROLL w nazwie | **~118** |
| Root entry | `README` · `AGENTS.md` · `CURRENT-TASK.md` · `AI-START-HERE.md` (**stale**) · `AI-HANDOFF.md` |
| Cursor rules | 4 always-apply — tipy często **stale** |
| Cloud/Sync + Payroll | Agent Guide · Flow Map · recovery RC-B / RUNTIME-TRACE · ADR Cloud Sync (+ **kopia** pliku) |

---

## 4. Braki dokumentacji (nie tylko jeden plik)

### 4.1 Braki strukturalne (P0 dla celu „krótkie nowe czaty”)

| Brak | Skutek |
|------|--------|
| Jeden **kanoniczny START** (bez stale konkurentów) | AI startuje od `AI-START-HERE` @ 2.63.85 |
| **Hard gate** „czy task dotyka Payroll/Shared/sync?” na 1 stronie | FEATURE (MUX, tender UI) bez checklisty blast radius |
| **RCA / Incident INDEX** (link-only) | AI nie „zna wszystkich” — zna 5–10 |
| **Archive policy** dla 100+ PAYROLL-* | Szum > sygnał |
| Spójność tipów (AI/09 vs Continuity vs rules vs CURRENT-TASK vs prod) | Fałszywy baseline |
| Doc **Operational Week / Week Resolver** | Regresje rollover / ALIGN bez wspólnego słownika |

### 4.2 Braki 1:1 względem listy Ownera (treść vs nazwa)

| Nazwa pożądana | EXISTS? | Najbliższy odpowiednik |
|----------------|---------|-------------------------|
| AI PAYROLL SAFETY MANUAL | **NO** (tytuł) | Quick Start + Guard Rails + Playbook + SSOT |
| PAYROLL DO NOT TOUCH | **NO** | `PAYROLL_GUARD_RAILS` + `08_AI_GUARDRAILS` |
| PAYROLL ARCHITECTURE MAP | **PARTIAL** | SSOT §1 + Flow Map |
| PAYROLL INCIDENT HISTORY | **YES** (treść) | `04_INCIDENTS` + Regression |
| PAYROLL RCA INDEX | **NO** | Regression §10 |
| PAYROLL CHANGE CHECKLIST | **PARTIAL** | CORE-01A + Guard Rails |
| PAYROLL SAFE IMPLEMENTATION RULES | **PARTIAL** | Playbook |
| PAYROLL REGRESSION CHECKLIST | **PARTIAL** | Regression §9 |
| PAYROLL PRE-COMMIT CHECKLIST | **PARTIAL** | Guard Rails §4–5 |
| PAYROLL POST-IMPLEMENT VERIFICATION | **PARTIAL** | Playbook §6 · WORKFLOW VERIFY |
| PAYROLL BOUNDARY MAP | **PARTIAL** | CORE-01A + Dependency |
| PAYROLL WRITE / READ SURFACES | **PARTIAL** | SSOT W1/W2 · Forensics write-path |
| PAYROLL DATA / CLOUD / LOCAL / BOOTSTRAP FLOW | **YES** (treść) | SSOT · Agent Guide · Memory |
| PAYROLL DEPENDENCY MAP | **YES** | `PAYROLL_DEPENDENCY_MAP.md` |
| PAYROLL INVARIANTS | **YES** | SSOT §2 |
| PAYROLL NEVER BREAK RULES | **YES** (treść) | SSOT §3 · Guardrails |

### 4.3 Outdated / duplikaty / do usunięcia (kandydaci — **bez kasowania w GUARD-01**)

| Pozycja | Akcja rekomendowana (GUARD-02+) |
|---------|----------------------------------|
| `AI-START-HERE.md` tip 2.63.85 | **Redirect** → `docs/AI/README` albo rewrite 1 ekran |
| `ADR-CLOUD-SYNC-ARCHITECTURE — kopia.md` | **Usunąć** po Owner GO |
| Continuity / cursor rules tipy | **Odświeżyć** do tipu z `docs/AI/09` |
| `PAYROLL-AI-GUARD-DOCS-01-AUDIT` | Oznaczyć SUPERSEDED (już częściowo) |
| `PAYROLL-DOCS-REORG-PLAN` (2026-07-03) | Odświeżyć lub zamknąć względem SSOT pack |
| 100+ historycznych DF/RCA | **Archive** `docs/archive/payroll/` + indeks |

---

## 5. Plan dokumentacji — co powstać / rozszerzyć / scalić

### 5.1 Zasada projektowa (zamrożona w planie)

```text
1 kanoniczny START (1 ekran)
→ 1 SAFETY MANUAL (Payroll) linkujący istniejący pack
→ 1 DO NOT TOUCH + 1 NEVER BREAK (krótkie)
→ INDEXY (RCA / Incidents) = linki, nie kopiuj 118 plików
→ Archive historycznych PAYROLL-* (nie kasuj bez GO)
→ Odśwież tipy we wszystkich entry
```

**Nie** tworzyć 20 nowych esejów — **tak** tworzyć **krótkie** pliki-nazwy Ownera, które **agregują** istniejące SSOT.

### 5.2 Rekomendowane nowe dokumenty (GUARD-02) — struktura

| ID | Dokument | Struktura (szkielet) | Źródła (merge z) |
|----|----------|----------------------|------------------|
| **D01** | `docs/AI/AI_PAYROLL_SAFETY_MANUAL.md` | 1. Priorytet #1 · 2. Read order 10 min · 3. Linki do pack · 4. Hard STOP rules · 5. Kiedy Owner GO | Quick Start + Playbook + Memory |
| **D02** | `docs/AI/PAYROLL_DO_NOT_TOUCH.md` | Tabela plików/ścieżek · zakaz · wyjątek tylko DF+GO | Guard Rails P1–P15 + 08 |
| **D03** | `docs/AI/PAYROLL_NEVER_BREAK_RULES.md` | 10–15 niezmienników (NIGDY) | SSOT §2–3 |
| **D04** | `docs/AI/PAYROLL_RCA_INDEX.md` | Tabela: RC · data · tip · link RCA · closeout · status | Regression §10 + architecture/recovery |
| **D05** | `docs/AI/PAYROLL_INCIDENT_INDEX.md` | Incydent · objaw · link · CLOSED? | 04_INCIDENTS + Regression |
| **D06** | `docs/AI/PAYROLL_CHANGE_CHECKLIST.md` | Przed AUDIT · przed IMPLEMENT · przed commit · przed push | Guard Rails + CORE-01A |
| **D07** | `docs/AI/PAYROLL_REGRESSION_CHECKLIST.md` | Scenariusze smoke LP (cross-device, rollover, hours, restore banner) | Regression §9 + Certification |
| **D08** | `docs/AI/PAYROLL_PRE_COMMIT_CHECKLIST.md` | Diff surfaces · #CORE-013 · Gate B payroll | Guard Rails §4–5 |
| **D09** | `docs/AI/PAYROLL_POST_IMPLEMENT_VERIFY.md` | OV vs PV · version.json · hours intact · sync | Playbook §6 + WORKFLOW |
| **D10** | `docs/AI/PAYROLL_BOUNDARY_MAP.md` | FEATURE vs CORE · Shared blast · co wolno w tym samym PR | Dependency + CORE-01A |
| **D11** | `docs/AI/PAYROLL_WRITE_SURFACES.md` | W1 PWRB · W2 Domain Push · zakazane write | SSOT · Forensics |
| **D12** | `docs/AI/PAYROLL_READ_SURFACES.md` | Bootstrap · hydrate · CloudLoader · LS keys | SSOT · Memory |
| **D13** | `docs/AI/PAYROLL_DATA_FLOW.md` | Diagram UI→Domain→Cloud (1 strona) | SSOT §1 |
| **D14** | `docs/AI/PAYROLL_CLOUD_FLOW.md` | Merge · coalesce · fence · RS vs Domain Push | Agent Guide · Flow Map |
| **D15** | `docs/AI/PAYROLL_LOCAL_STORAGE_FLOW.md` | Keys · quota · fat key · 02F relation | LOCALSTORAGE + SSOT |
| **D16** | `docs/AI/PAYROLL_BOOTSTRAP_FLOW.md` | Cold start · CloudLoader · race | Memory · Bootstrap DF |
| **D17** | `docs/AI/PAYROLL_WEEK_MODEL.md` | Operational week · closed week · ALIGN/ROLLOVER · resolver | **NOWE** (wypełnić z kodu + rollover DF) — dziś największa dziura słownikowa |
| **D18** | `docs/AI/PAYROLL_ARCHITECTURE_MAP.md` | 1-page map + linki | SSOT + Flow Map (alias „map”) |

**Rozszerzyć (nie dublować treści):**

| Plik | Zmiana |
|------|--------|
| `docs/AI/README.md` | Sekcja „Payroll Safety Manual pack” + D01–D18 |
| `AGENTS.md` | Skrócić START HERE do **≤15 linii** + link do Manual; reszta → appendix |
| `README.md` (root) | Jedyny START + warn przed `AI-START-HERE` stale |
| `AI-START-HERE.md` | Rewrite lub stub redirect |
| `.cursor/rules` | 5–10 linii: Payroll #1 · czytaj D01 · tip z AI/09 |
| `PAYROLL_REGRESSION_HISTORY.md` | Link do D04 INDEX |
| `09_PRODUCTION_BASELINE.md` | Procedura odświeżania tipu (po każdym release) |

**Usunąć / zarchiwizować (tylko po Owner GO w GUARD-02+):**

| | |
|--|--|
| `ADR-CLOUD-SYNC-ARCHITECTURE — kopia.md` | delete |
| Historyczne PAYROLL-* (lista z REORG) | `docs/archive/payroll/…` |
| Duplikaty audytów docs (oznaczyć SUPERSEDED) | keep 1 index |

---

## 6. AI Documentation Improvement Plan (P0 / P1 / P2)

### P0 — blokuje „krótkie nowe czaty” + redukuje regresje FEATURE→Payroll

| # | Działanie | Uzasadnienie | Wpływ na sesje AI | Wpływ na regresje LP |
|---|-----------|--------------|-------------------|----------------------|
| **P0-1** | **D01 Safety Manual** + wpis jako **jedyny** Payroll start w README/AGENTS | Jedna brama | Sesja ≤10 min do świadomości | Wysoki |
| **P0-2** | **D02 Do Not Touch** + **D03 Never Break** (1–2 strony) | AI widzi zakazy bez czytania 08+Guard | Natychmiastowy STOP | Wysoki |
| **P0-3** | Naprawa / redirect **`AI-START-HERE.md`** + tip sync **AI/09 ↔ Continuity ↔ rules** | Usuwa fałszywy baseline 2.63.85 | Zero mylenia wersji | Średni–wysoki |
| **P0-4** | **D10 Boundary Map** + obowiązek w Decision Tree (link) | FEATURE (mobile/tenders) sprawdza blast | Mniej „przypadkowego” Shared | **Krytyczny** dla problemu Ownera |
| **P0-5** | **D06 + D08** Change / Pre-commit checklist | Checklista przed każdym commit z Payroll surfaces | Powtarzalność | Wysoki |

### P1 — indeksy i przepływy (kompletność bez esejów)

| # | Działanie | Uzasadnienie | Wpływ AI | Wpływ regresje |
|---|-----------|--------------|----------|----------------|
| **P1-1** | **D04 RCA Index** + **D05 Incident Index** | „Zna wszystkie” = indeks, nie 118 plików | Szybkie RCA lookup | Średni–wysoki |
| **P1-2** | **D11–D16** Write/Read/Data/Cloud/LS/Bootstrap flow (1 strona każdy) | Nazwy Ownera 1:1 · link do SSOT | Mniej błędów ścieżki | Wysoki |
| **P1-3** | **D17 Week Model** (Operational Week / Resolver) | Dziura słownikowa | Mniej regresji rollover | Wysoki |
| **P1-4** | **D07 + D09** Regression + Post-implement verify | Domknięcie po IMPLEMENT | Lepsze OV | Wysoki |
| **P1-5** | Skrócenie **AGENTS.md START** + appendix closeoutów | Mniej overload | Krótszy start | Średni |
| **P1-6** | Odświeżenie **cursor rules** (Payroll pack + tip) | Always-on signal | Każda sesja Cursor | Wysoki |

### P2 — higiena repo docs

| # | Działanie | Uzasadnienie | Wpływ AI | Wpływ regresje |
|---|-----------|--------------|----------|----------------|
| **P2-1** | Archive `docs/archive/payroll/` + update REORG plan | Szum ↓ | Mniej false SSOT | Średni |
| **P2-2** | Usunięcie kopii ADR | Cleanup | — | Niski |
| **P2-3** | `D18 Architecture Map` jako 1-pager alias | Naming Owner | Szybka mapa | Niski–średni |
| **P2-4** | Procedura tip-bump w AI/09 po każdym release | Tip drift | Mniej stale | Średni |
| **P2-5** | Oznaczenie SUPERSEDED starych audytów docs | Jedna prawda | — | Niski |

---

## 7. Zakres AI-DOCS-PAYROLL-GUARD-02 (IMPLEMENT DOCUMENTATION) — preview

**IN (po Owner GO):**

1. P0-1…P0-5 (Manual, Do Not Touch, Never Break, Boundary, checklists + entry fix).  
2. Aktualizacja `docs/AI/README`, `AGENTS.md` START, `AI-START-HERE`, tipy.  
3. **Bez** `src/**` · **bez** zmian Payroll runtime.

**OUT GUARD-02 (osobne GO):**

- Fizyczne przenoszenie 100+ plików do archive (może być GUARD-02b / P2).  
- Zmiany `.cursor/rules` jeśli Owner woli osobny ticket.  
- Kod / Gate B / CI.

---

## 8. Boundary Check (ten ticket)

| | |
|--|--|
| `src/**` | **NIE ruszane** |
| Commit / push | **NIE** |
| CURRENT-TASK | **NIE** |
| Tworzenie D01–D18 | **NIE** (GUARD-02) |
| Ten audyt | **docs-only deliverable** |

---

## 9. Podpis

| | |
|--|--|
| Ticket | **AI-DOCS-PAYROLL-GUARD-01** |
| Faza | **AUDIT COMPLETE** |
| Następny | **AI-DOCS-PAYROLL-GUARD-02** — IMPLEMENT DOCUMENTATION · **tylko po Owner GO** |

**Koniec audytu. Czekam na Owner GO do GUARD-02.**
