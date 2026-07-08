# CORE-01A — Protected Core (SAFE MODE) · DESIGN FREEZE

> **Status:** **DESIGN FREEZE v1.2 — APPROVED (docs-only)**  
> **Tryb:** AUDIT → DESIGN FREEZE · **IMPLEMENT = NIE** (do owner GO po RC-B-POST-RELEASE-01)  
> **Data freeze:** 2026-07-04  
> **Epic ID:** CORE-01A  
> **Baseline prod:** UI **2.63.30** · RC-B-1 **CLOSED** (`35f37b1` · `24bde6e`)  
> **STABILIZATION WINDOW:** ACTIVE · **P0 FREEZE:** ACTIVE  
> **Powiązane:** [CORE-PROTECTED-ARCHITECTURE.md](./CORE-PROTECTED-ARCHITECTURE.md) · [CORE-01-BYPASS-REGISTRY.md](./CORE-01-BYPASS-REGISTRY.md) · [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md)  
> **Audyt źródłowy:** sesja CORE-01 (2026-07-04, AUDIT ONLY)

```text
CEL:           Ochrona krytycznych modułów przed przypadkowymi zmianami — BEZ dotykania logiki runtime.
ZASADA:        CRITICAL CORE STABILITY FIRST — zero refaktoryzacji Protected Core w 01A.
DOZWOLONE:     docs · ADR · guard statyczny · Gate CORE · audit-pwrb rozszerzenie · CI · checklisty · Bypass Registry.
ZAKAZ:         zmiana Payroll · PWRB · cloud-sync merge · CloudLoader · Edge batch-get/set.
BACKLOG:       wszelkie fixy logiki → CORE-01B (po RC-B-POST-RELEASE-01).
GATE:          RC-B-POST-RELEASE-01 musi być CLOSED przed IMPLEMENT CORE-01A.
```

---

## 0. Werdykt freeze

| Pole | Wartość |
|------|---------|
| **Przedmiot** | Protected Core — granice architektury, guard statyczny, Gate CORE, Bypass Registry |
| **Poza zakresem 01A** | Runtime wrapper LS · fix bypass HIGH · Edge authZ · ESLint · refaktor `cloud-sync.ts` |
| **Poza zakresem 01A** | Wszystko w [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md) |
| **Nowe pole KV** | **Brak** |
| **Zmiana modelu danych** | **Brak** |
| **Zmiana merge / PWRB / Edge** | **Brak** (twardy zakaz) |
| **Principles CORE-01A** | **#CORE-001–#CORE-014** (§4) |
| **Module Classification** | CORE · PLATFORM · FEATURE · UI (§4B) |
| **FEATURE Boundary Check** | Obowiązkowa przed każdym FEATURE bundle (§4C) |

**DESIGN FREEZE v1.2 — APPROVED (docs-only)**

---

## 1. Cel i kontekst

### 1.1 Problem

RC-B-1 wprowadził **PWRB facade** i inwarianty I-1…I-4, ale ochrona jest **rozproszona**:

- `audit:pwrb` istnieje, lecz **nie jest w CI** ani `test-manifest.json`
- ~100 eksportów `cloud-sync.ts` — szeroka powierzchnia dla agentów AI
- **8 znanych luk bypass** (audyt CORE-01) — wymagają fixów **runtime** (→ CORE-01B)
- brak jednego dokumentu **granicy Protected Core**

### 1.2 Cel CORE-01A (SAFE MODE)

Ustanowić **architektoniczną tarczę bez zmiany zachowania prod**:

1. SSOT granicy Protected Core ([CORE-PROTECTED-ARCHITECTURE.md](./CORE-PROTECTED-ARCHITECTURE.md))
2. Rejestr luk ([CORE-01-BYPASS-REGISTRY.md](./CORE-01-BYPASS-REGISTRY.md)) — dokumentacja, nie fix
3. Rozszerzenie guardów **statycznych** (spec w §6 — implementacja w Fazie IMPLEMENT)
4. **Gate CORE** w TEST-INFRA (spec w §7 — manifest v1.2)
5. Checklisty i procedura zmiany (§8)
6. Backlog fixów runtime → **CORE-01B** (osobny epic, po RC-B observation)

### 1.3 Zasada nadrzędna

> **CRITICAL CORE STABILITY FIRST**  
> Żadna zmiana w logice modułów §1.4 w ramach CORE-01A. Wykrycie naruszenia = FAIL gate / dokumentacja — nie „szybki fix” w tym samym bundle.

### 1.4 Moduły chronione (immutable w 01A)

| # | Moduł | Plik SSOT | Zakaz w 01A |
|---|-------|-----------|-------------|
| 1 | Payroll orchestration | `src/app/App.tsx` (handlery LP) | zmiana logiki mutacji |
| 2 | PWRB facade | `src/lib/payroll-week-roster-bundle.ts` | jakakolwiek zmiana |
| 3 | Cloud Sync kernel | `src/lib/cloud-sync.ts` | merge, push, tombstone, guard |
| 4 | Merge Engine | `src/lib/payroll-week-employee-merge.ts` | jakakolwiek zmiana |
| 5 | CloudLoader bootstrap | `src/app/CloudLoader.tsx` | ścieżki payroll merge/push |
| 6 | Edge batch-get | `supabase/functions/.../index.tsx` | handler + kv.mget |
| 7 | Edge batch-set | `supabase/functions/.../index.tsx` | payroll merge + G-0 |

**Dozwolone w 01A przy tych plikach:** wyłącznie komentarze `// CORE-01A: see CORE-PROTECTED-ARCHITECTURE` — **bez zmiany wykonywalnego kodu**.

---

## 2. Zakres MVP (CORE-01A)

| Element | Typ | Gate |
|---------|-----|------|
| `CORE-PROTECTED-ARCHITECTURE.md` | Dokument SSOT granicy | Obowiązkowy |
| `CORE-01-BYPASS-REGISTRY.md` | Rejestr luk (read-only) | Obowiązkowy |
| `CORE-01B-BACKLOG.md` | Backlog fixów runtime | Obowiązkowy |
| Rozszerzenie `audit-pwrb-boundary.mjs` | Guard statyczny (spec §6) | Obowiązkowy przy IMPLEMENT |
| `audit-core-ls-writes.mjs` (nowy) | Guard statyczny LS payroll keys | Obowiązkowy przy IMPLEMENT |
| `test-manifest.json` v1.2 — Gate CORE | TEST-INFRA rozszerzenie | Obowiązkowy przy IMPLEMENT |
| CI `test-infra-gates.yml` — job Gate CORE | Matrix `scope:core` | Obowiązkowy przy IMPLEMENT |
| `CORE-01A-CHANGE-CHECKLIST.md` | Procedura pre-merge + FEATURE Boundary Check | Obowiązkowy |
| Aktualizacja `PAYROLL-QUALITY-GATE.md` | Link do Gate CORE | Obowiązkowy |
| Aktualizacja `ARCHITECTURE.md` §11 | Referencja Protected Core | Obowiązkowy przy CLOSEOUT |

### 2.1 Poza zakresem MVP (01A)

| Element | Przeniesione do |
|---------|-----------------|
| Fix WorkerPhotoView bypass | CORE-01B |
| Fix clearAll / production filter | CORE-01B |
| Fix rollover coupled tombstones | CORE-01B |
| Migracja `addFromDirectory` → `pwrAdd` | CORE-01B |
| Fix `restoreAllDataFromCloud` | CORE-01B |
| Runtime `__wgdomCoreGuard` LS wrapper | CORE-01B (opcjonalny) |
| Edge authZ na KV | ADR-CLOUD-SYNC (strategiczny) |
| ESLint / `@internal` enforcement | CORE-01B lub osobny epic |

---

## 3. Architektura Protected Core (skrót — pełny SSOT w osobnym pliku)

```text
┌─────────────────────────────────────────────────────────────┐
│              PROTECTED CORE (immutable logic 01A)            │
├─────────────────────────────────────────────────────────────┤
│ L1 PWRB      payroll-week-roster-bundle.ts                  │
│ L2 Merge     payroll-week-employee-merge.ts                  │
│ L3 Sync      cloud-sync.ts (payroll + tombstone sections)    │
│ L4 Guard     cloud-sync-mutation-guard.ts (runtime, frozen)  │
│ L5 Bootstrap CloudLoader.tsx (payroll paths)                 │
│ L6 Edge      index.tsx batch-get / batch-set (payroll)       │
└─────────────────────────────────────────────────────────────┘
          ▲                                    │
          │ CORE-01A: tylko statyczne guardy   │
          │ (audit scripts + CI)               ▼
   App.tsx / PayrollView / WorkerPhotoView   Supabase KV
```

**Jedyna dozwolona mutacja składu LP (dokumentowana, bez zmiany w 01A):** PWRB API (`pwrAdd`, `pwrRemove`, `pwrPush`, …).

Szczegóły: [CORE-PROTECTED-ARCHITECTURE.md](./CORE-PROTECTED-ARCHITECTURE.md).

---

## 4. Principles CORE-01A (#CORE-001–#CORE-014)

| ID | Zasada |
|----|--------|
| **#CORE-001** | **SSOT FIRST** — granica Protected Core = `CORE-PROTECTED-ARCHITECTURE.md`; zmiany merge = `PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md` |
| **#CORE-002** | **REUSE FIRST** — rozszerz `audit-pwrb-boundary.mjs` i TEST-INFRA; nie duplikuj orchestratora |
| **#CORE-003** | **ZERO DUPLICATE LOGIC** — guard statyczny = regex/skan AST-light; nie kopiuj reguł PWRB w runtime |
| **#CORE-004** | **CRITICAL CORE STABILITY FIRST** — 01A nie zmienia logiki §1.4 |
| **#CORE-005** | **PRODUCTION FIRST VALIDATION** — Gate CORE PASS na preview/CI; prod observation przez RC-B-POST-RELEASE-01 przed 01B |
| **#CORE-006** | Bypass Registry = dokumentacja; fix = tylko CORE-01B po owner GO |
| **#CORE-007** | Nowy wpis manifestu = stabilny `id`; lista testów w `test-manifest.json`, nie w orchestratorze (#006 TEST-INFRA) |
| **#CORE-008** | Gate CORE **nie zastępuje** Gate B/C — **rozszerza** (CORE ⊂ wymagania przy diff Protected Core files) |
| **#CORE-009** | Diff Protected Core file → obowiązkowy Gate CORE + owner review; bez auto-merge |
| **#CORE-010** | `supabase/functions/**` zmiana payroll section → Gate CORE + `LIB-PAYROLL-B6-EDGE` (istniejący) |
| **#CORE-011** | Skrypty `scripts/audit-*` forensic = `class: audit`, `mandatory: conditional`, `condition: scope:core` |
| **#CORE-012** | Zamknięcie 01A = docs + CI green; **nie** wymaga zamknięcia Bypass Registry (otwarte do 01B) |
| **#CORE-013** | **Runtime Freeze** — jeden commit/bundle **nie może** łączyć diff Protected Core (klasa CORE) z diff Feature (klasa FEATURE); CORE zawsze osobny bundle (§4A) |
| **#CORE-014** | **FEATURE Boundary Check** — przed **każdym** FEATURE bundle: klasyfikacja §4B + boundary check §4C; bez PASS → **STOP** commit |

---

## 4A. #CORE-013 — Runtime Freeze (bundle separation)

### 4A.1 Zasada

> **Żaden commit ani release bundle nie może jednocześnie zawierać zmian klasy CORE oraz zmian klasy FEATURE.**

Protected Core (i szersza klasa **CORE** — §4B) rozwijany jest **wyłącznie w osobnym bundle** z własnym cyklem AUDIT → Gate CORE → COMMIT → PUSH → VERIFY.

### 4A.2 Definicje bundle

| Pojęcie | Znaczenie |
|---------|-----------|
| **Commit** | Pojedynczy `git commit` na `main` (lub PR squash = jeden commit) |
| **Bundle** | Zestaw plików staged do jednego commita / jednego release GO |
| **Mixed bundle** | Commit zawierający ≥1 plik klasy **CORE** **oraz** ≥1 plik klasy **FEATURE** |

### 4A.3 Reguły

| # | Reguła |
|---|--------|
| R1 | Mixed bundle = **BLOCKED** — rozdziel na dwa commity / dwa release |
| R2 | CORE bundle może zawierać pliki **CORE** + **PLATFORM** (infra guard/CI/docs) + **UI** (tylko jeśli zero logiki FEATURE) |
| R3 | FEATURE bundle może zawierać **FEATURE** + **UI** + **PLATFORM** (nie CORE) |
| R4 | Zmiana pliku granicznego (np. `App.tsx`) — klasyfikuj po **intencji diffu** (payroll handler = CORE; routing NG-03 = FEATURE); przy mixed intent → **split commit** |
| R5 | CORE-01A guard statyczny / manifest / CI = PLATFORM — **dozwolone** w tym samym bundle co docs CORE, **niedozwolone** z NG-03 UI w jednym commicie |
| R6 | Werdykt release: `RELEASE GO` dla FEATURE **wymaga** braku staged plików CORE w tym samym push |

### 4A.4 Przykłady

| Scenariusz | Werdykt |
|------------|---------|
| `cloud-sync.ts` + `TendersView.tsx` (NG-03 cards) w jednym commicie | **BLOCKED** (#CORE-013) |
| `audit-pwrb-boundary.mjs` + `CORE-01A-DESIGN-FREEZE.md` | **ALLOWED** (PLATFORM + docs) |
| `payroll-week-roster-bundle.ts` (CORE-01B fix) osobno, potem `TenderDetailPanel.tsx` | **ALLOWED** (dwa bundle) |
| `App.tsx` — tylko `removeWeekEmployee` → PWRB | **CORE bundle** |
| `App.tsx` — tylko deep link Przetargi | **FEATURE bundle** |
| `App.tsx` — payroll + tenders w jednym diff | **BLOCKED** — split |

### 4A.5 Egzekucja (docs-only w 01A — bez CI)

| Warstwa | Mechanizm | Status 01A |
|---------|-----------|------------|
| Proceduralna | `CORE-01A-CHANGE-CHECKLIST.md` — pole „Mixed bundle?” | **ACTIVE** |
| Review | Owner / agent — `git diff --name-only` vs §4B | **ACTIVE** |
| Automatyczna | `audit-core-bundle-mix.mjs` (mapa plik→klasa) | **BACKLOG** (opcjonalny, PLATFORM) |

**Uwaga:** #CORE-013 nie wymaga nowego gate CI w 01A — wystarczy checklista i klasyfikacja §4B. Automatyzacja = osobny item PLATFORM po IMPLEMENT 01A.

### 4A.6 Powiązanie z epikami

```text
RC-B / CORE-01B (gdy uruchomiony)  → wyłącznie CORE bundle
CORE-01A                           → PLATFORM + docs (bez FEATURE)
NG-03 / NG-04 / Roboty / WM        → wyłącznie FEATURE (+ UI) bundle — domyślna ścieżka po 01A
STABILIZATION                      → nie łączyć maintenance CORE z nowym FEATURE w jednym push
```

Po **CORE-01A CLOSED** → **FEATURE DEVELOPMENT** (nie auto-start CORE-01B).  
CORE-01B: **OPEN · READY · Owner GO Required** — tylko AUDYT → DF → IMPLEMENT przy rzeczywistej potrzebie.  
Roadmapa closeout: [CORE-01A-CLOSEOUT-PLAN.md](./CORE-01A-CLOSEOUT-PLAN.md) §1.

---

## 4B. Module Classification (CORE · PLATFORM · FEATURE · UI)

### 4B.1 Definicje klas

| Klasa | Definicja | Zmiana wymaga | Bundle |
|-------|-----------|---------------|--------|
| **CORE** | Protected Core + sync/merge/payroll KV — błąd = utrata danych LP lub corruption sync | Gate CORE + QG L3+ + owner review | **Osobny** (#CORE-013) |
| **PLATFORM** | Infrastruktura współdzielona: shell, auth, throttle, test-infra, layout shell, backup — bez logiki domenowej FEATURE | Gate B/C wg scope; nie Gate CORE | Może iść z CORE (infra) lub FEATURE (narzędzia) |
| **FEATURE** | Moduł domenowy z logiką biznesową i własnym modelem/KV — Przetargi, Roboty, WM Druk, … | Gate B scope modułu + smoke | **Nie mieszać z CORE** |
| **UI** | Prezentacja: props, style, copy, układ — **bez** nowej logiki sync/KV/merge | Gate A lub smoke UI; L1 | Zwykle z FEATURE |

**Hierarchia ryzyka:** CORE > PLATFORM > FEATURE > UI.

**Zasada klasyfikacji pliku wielowarstwowego** (np. `App.tsx`): przypisz klasę według **dominującej intencji zmiany** w danym bundle; przy wątpliwości — wyższa klasa wygrywa (CORE > FEATURE).

### 4B.2 Mapa modułów WGDOM

#### CORE (Protected Core + payroll/sync SSOT)

| Moduł | Pliki / komponenty SSOT | Uwagi |
|-------|-------------------------|-------|
| PWRB facade | `payroll-week-roster-bundle.ts` | L1 — jedyny entry mutacji pary roster+tombstones |
| Merge Engine | `payroll-week-employee-merge.ts` | L2 — parity B6 z Edge |
| Cloud Sync kernel | `cloud-sync.ts` | L3 — merge, push, tombstones, Payroll Guard, `DATA_KEYS` |
| Mutation Guard | `cloud-sync-mutation-guard.ts` | L4 — suppress auto-sync przy mutacji |
| CloudLoader (payroll/bootstrap) | `CloudLoader.tsx` | L5 — `applyBootstrapPayrollMerge`, `pwrReconcile`, bootstrap push |
| Edge KV transport | `supabase/.../index.tsx` (batch-get, batch-set, payroll restore) | L6 |
| Edge KV store | `kv_store.tsx`, `kv-batch-order.ts` | L7 |
| Payroll orchestration | `App.tsx` — handlery LP: `removeWeekEmployee`, `persistPayrollRoster`, `runCloudSync`, `pullFromCloudAndMerge`, rollover, import/restore payroll | Część `App.tsx` — klasyfikuj per diff |
| Payroll lib (kalkulacja + cycle) | `payroll-cycle.ts`, `payroll-rollover.ts`, `payroll-carry-forward.ts`, `payroll-leave-overlay.ts`, `payroll-export.ts` | Logika LP powiązana z archiwum/carry — CORE gdy dotyka snapshot/sync |
| Payroll trace (diag) | `payroll-runtime-trace.ts` | CORE — strumień diagnostyczny sync |

#### PLATFORM (infrastruktura współdzielona)

| Moduł | Pliki / komponenty SSOT | Uwagi |
|-------|-------------------------|-------|
| App shell / routing | `App.tsx` — `view`, `setView`, layout stanu globalnego | PLATFORM gdy diff bez payroll/sync |
| Auth wrapper | `AppInnerWithAuth.tsx`, `LoginScreen.tsx` | Sesje admin/inspector/worker |
| Admin chrome | `AdminViewRouter.tsx`, `admin-nav.ts`, `AdminSidebar`, `AdminTopbar`, `AdminMobileNav` | Routing widoków |
| LocalStorage hook | `hooks/useLocalStorage.ts` | Persist `DATA_KEYS` — infrastruktura zapisu |
| Sync throttle / metrics | `cloud-sync-throttle.ts` | S7-4A debounce, fingerprint |
| Version Awareness | `app-version-check.ts`, `AppUpdateBanner.tsx` | PWA refresh |
| Layout / mobile shell | `index.html`, `mobile.css`, `app-viewport.ts`, `modal-scroll-lock.ts` | Scroll, touch, viewport |
| Auth / ACL | `admin-auth.ts`, `app-settings.ts` | Role, Super Admin ACL |
| Backup / restore infra | `local-data-backup.ts`, `backup-lib.mjs` | Import/export JSON |
| Security audit (infra) | `security-audit-log.ts` | Append log — nie domena FEATURE |
| Config | `src/config/supabase.ts` | API base |
| TEST-INFRA | `test-infra/*`, `test-infra-orchestrator.mjs`, `test-infra-gates.yml` | Gate A/B/C/CORE |
| Architecture Guard (static) | `audit-pwrb-boundary.mjs`, `audit-core-ls-writes.mjs` (spec) | CORE-01A — PLATFORM tooling |
| Domain helpers (shared) | `app-domain.ts` | Typy współdzielone — PLATFORM |

#### FEATURE (moduły domenowe)

| Moduł | Pliki / komponenty SSOT | Epic / baseline |
|-------|-------------------------|-----------------|
| **Przetargi — pipeline** | `tenders-bzp.ts`, `useTenderPipelineRuntime.ts`, `TendersProvider.tsx`, NG-02 bootstrap | NG-02 CLOSED |
| **Przetargi — workspace UX** | `TenderDetailPanel.tsx`, `TenderWorkspaceTabBar.tsx`, `TendersModule.tsx`, `TendersView.tsx`, `WORKFLOW-ARCHITECTURE-v2.63.md` | **NG-03** |
| **Przetargi — BOQ / wycena** | `wgdom-cost-catalog.ts`, BOQ explorer, P3 pipeline, `tender-cost-calibration.ts` | NG-04 CLOSED |
| **Przetargi — kwalifikacja** | `tender-participation-check.ts`, `TenderQualificationWorkspace.tsx`, P2-F | CLOSED |
| **Przetargi — dokumenty** | `wgdom-7z-archive.ts`, `tender-document-resolver.ts`, P2-H | CLOSED |
| **Roboty** | `JobsView.tsx`, `job-wm.ts`, `job-activity.ts`, `job-attachments.ts`, billing panels | 20.5A CLOSED |
| **WM Druk — Odbiory/ZI** | `WmPrintView.tsx`, `wm-print/*`, `generate-pdf-zi-tauron2026.ts` | ZI 2026 STABLE |
| **WM Druk — Pomiary EM** | `electrical-measurements/*`, `JobElectricalMeasurementsPanel.tsx` | EM-P1R CLOSED |
| **WM Druk — Schematy** | `electrical-schematics/*`, `WmPrintSchematicsPanel.tsx` | CLOSED |
| **Lista Płac — UI logika paneli** | `PayrollJobAssignmentsPanel.tsx`, `payroll-job-assignments.ts` | P1 Przydziały — FEATURE (edycja `workEntries`, nie PWRB roster) |
| **Kadry / Kontakty** | `DirectoryView.tsx`, `ContactsView.tsx`, `TeamDirectoryContactsView.tsx` | Kartoteka |
| **Notatki operacyjne** | `operational-notes.ts`, `OperationalNotesView.tsx` | CLOSED |
| **Audit Hub** | `audit-hub/*`, `AuditHubView.tsx` | MVP-1B CLOSED |
| **Do rozliczenia** | `recoverable-charges.ts`, `RecoverableChargesView.tsx` | 20.5A |
| **Inspektor** | `InspectorPanel.tsx`, `InspectorAdminView.tsx`, `job-documents.ts` | v2.10 |
| **Worker** | `WorkerPhotoView.tsx` | Panel pracownika — **znany bypass CORE** (BYP-H1) |
| **Pulpit** | `DashboardView.tsx`, `dashboard-urgent-today.ts` | V3 CLOSED |
| **Media / Files Hub** | `MediaView.tsx`, `files-hub-index.ts`, `JobFilesHub.tsx` | 20.5A.12 |
| **Work Catalog** | `work-catalog-sync.ts`, P3.0/P3.2 | FEATURE |

#### UI (prezentacja — thin layer)

| Moduł | Pliki / komponenty SSOT | Uwagi |
|-------|-------------------------|-------|
| Lista Płac — widok | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` | Props → `App.tsx`; brak direct KV |
| Przetargi — chrome | `TenderDetailCommandLayer.tsx`, `DocumentSummaryHeader.tsx`, chipy, mobile cards | NG-03 — **UI** gdy tylko layout/copy |
| Roboty — chrome | `JobListPanelHeader.tsx`, `JobQueueSections.tsx` | Filtry, kolejki — UI gdy bez sync |
| Help / Changelog | `GuideView.tsx`, `changelog-data.ts` | Copy |
| Pulpit — karty | `TendersShortcutPanel.tsx` (prezentacja skrótu) | UI jeśli bez nowej logiki pipeline |
| Wspólne komponenty | `src/app/components/*` (bez logiki domenowej) | Shared UI |

### 4B.3 Macierz: klasa → gate → bundle (#CORE-013)

| Klasa diff | Gate minimalny | Dozwolony współ-bundle |
|------------|----------------|------------------------|
| **CORE** | Gate CORE + QG L3 | PLATFORM (infra), docs, **nie FEATURE** |
| **PLATFORM** | Gate A lub validate manifest | CORE **lub** FEATURE (zależnie od kontekstu) — **nie łączyć CORE+FEATURE przez PLATFORM** |
| **FEATURE** | Gate B scope modułu | UI, PLATFORM (nie CORE) |
| **UI** | Gate A / smoke UI | FEATURE |

### 4B.4 Widoki admina (`View`) — klasyfikacja skrótowa

| `View` | Klasa dominująca | Uwagi |
|--------|------------------|-------|
| `payroll` | FEATURE (UI) + CORE (handlery w App) | Split per diff |
| `jobs` | FEATURE | |
| `tenders` | FEATURE (NG-03 workspace = FEATURE/UI) | |
| `wmprint` | FEATURE | |
| `dashboard` | FEATURE + UI | |
| `operationalnotes` | FEATURE | |
| `audit` | FEATURE (read-only aggregator) | |
| `inspector` | FEATURE | |
| `recoverablecharges` | FEATURE | |
| `media` | FEATURE + UI | |
| `directory` / `contacts` | FEATURE | |
| `schedule` / `archive` | FEATURE (UI) + CORE gdy rollover/sync | |
| `guide` / `changelog` | UI | |

Szczegółowa mapa widoków: [`AGENT-APP-MAP.md`](../AGENT-APP-MAP.md) §2.

---

## 4C. FEATURE Boundary Check (#CORE-014)

> **Obowiązkowa procedura** przed rozpoczęciem i przed **COMMIT** każdego bundle, którego **klasa dominująca = FEATURE** (lub UI/PLATFORM w ramach release FEATURE — np. NG-03, Roboty, WM Druk UX).  
> **SSOT checklisty:** [CORE-01A-CHANGE-CHECKLIST.md](./CORE-01A-CHANGE-CHECKLIST.md) § **FEATURE Boundary Check**  
> **Powiązane:** #CORE-013 Runtime Freeze (§4A) · Module Classification (§4B)

### 4C.1 Kiedy obowiązuje

| Sytuacja | Boundary Check |
|----------|----------------|
| Nowy epic / maintenance FEATURE (NG-03, NG-04 UI, Roboty UX, …) | **OBOWIĄZKOWY** |
| Bundle dominujący FEATURE + UI + PLATFORM | **OBOWIĄZKOWY** |
| Bundle wyłącznie CORE | **NIE** — użyj Gate CORE + §A checklisty |
| Bundle wyłącznie docs (bez `src/`) | **NIE** — chyba że docs opisują zmianę CORE w tym samym push (wtedy split) |

### 4C.2 Krok 1 — Klasyfikacja (każdy plik w bundle)

Przypisz **jedną** klasę dominującą per plik wg §4B:

| Klasa | Skrót |
|-------|-------|
| **CORE** | Protected Core L1–L7 + handlery payroll/sync w `App.tsx` |
| **PLATFORM** | Shell, auth, layout, TEST-INFRA, `mobile.css`, event constants z `cloud-sync` |
| **FEATURE** | Moduł domenowy (Przetargi, Roboty, WM, Notatki, …) |
| **UI** | Prezentacja bez nowej logiki KV/sync |

**Pliki graniczne** (`App.tsx`, `CloudLoader.tsx`): klasa = **intencja diffu** w tym bundle (patrz §4A.4).

Zapisz w checklistie:

```text
BUNDLE: <np. NG-03 M-03 mobile>
DOMINANT CLASS: FEATURE
FILES:
  - <path> → FEATURE | UI | PLATFORM | CORE
```

### 4C.3 Krok 2 — Boundary Check (Protected Core)

**Pytanie:** Czy którykolwiek plik w **staged diff** dotyka **Protected Core**?

#### Lista kontrolna Protected Core (dotknięty = TAK)

| # | Plik / obszar | Dotknięty gdy |
|---|---------------|---------------|
| P1 | `src/lib/payroll-week-roster-bundle.ts` | jakakolwiek zmiana |
| P2 | `src/lib/payroll-week-employee-merge.ts` | jakakolwiek zmiana |
| P3 | `src/lib/cloud-sync.ts` | jakakolwiek zmiana (w tym payroll merge, tombstones, push, guard) |
| P4 | `src/lib/cloud-sync-mutation-guard.ts` | zmiana logiki guard (read-only import w FEATURE = NIE, jeśli bez edycji pliku) |
| P5 | `src/app/CloudLoader.tsx` | zmiana ścieżek payroll bootstrap / `applyBootstrapPayrollMerge` / `pwrReconcile` |
| P6 | `supabase/functions/make-server-0afb8820/index.tsx` | zmiana batch-get/set **payroll** (merge, G-0, tombstones week-employees) |
| P7 | `src/app/App.tsx` | zmiana handlery LP, `runCloudSync`, PWRB, rollover payroll, import/restore payroll |
| P8 | Tombstones / roster LP | `setItem(kw-week-employees*)`, `pwr*`, `pushWeekEmployeesToCloud`, `addDeletedWeekEmployeeKey` |

**NIE uznaje się za dotknięcie CORE** (przy braku edycji plików P1–P7):

- import **tylko** `API_BASE`, `API_HEADERS`, `WGDOM_DEFERRED_BOOTSTRAP_EVENT`, `persistKey` / `fetchKeysFromCloud` dla **kluczy domenowych FEATURE** (tenders, jobs, …) — bez edycji `cloud-sync.ts`
- **read-only** props payroll w `TendersProvider` (`productionWeekEmployees`) — bez mutacji
- zmiany wyłącznie w plikach FEATURE/UI/PLATFORM z §4B.2–4B.3

**Weryfikacja przed COMMIT:**

```bash
git diff --name-only
# lub: git diff --cached --name-only
```

Porównaj listę ze ścieżkami P1–P7 i intencją `App.tsx` diff.

### 4C.4 Werdykt Boundary Check

```text
┌─────────────────────────────────────────────────────────────┐
│  Czy dotykany jest Protected Core?                           │
├─────────────────────────────────────────────────────────────┤
│  NIE  →  FEATURE PASS  →  kontynuuj workflow FEATURE bundle  │
│  TAK  →  STOP  →  CORE REVIEW REQUIRED  →  osobny CORE     │
│          bundle (#CORE-013 · Gate CORE · QG L3+)             │
└─────────────────────────────────────────────────────────────┘
```

| Werdykt | Znaczenie | Następny krok |
|---------|-----------|---------------|
| **FEATURE PASS** | Zero diff Protected Core w tym bundle | IMPLEMENT → TEST → BUILD → COMMIT (po checklistie §4C.5) |
| **STOP** | Wykryto CORE w FEATURE bundle | **Nie commituj.** Rozdziel diff. Osobny CORE bundle + [CORE-01A-CHANGE-CHECKLIST.md](./CORE-01A-CHANGE-CHECKLIST.md) §A–F |
| **MIXED BUNDLE** | CORE + FEATURE w jednym commicie | **BLOCKED** (#CORE-013) — zawsze STOP |

### 4C.5 Kolejność w workflow (FEATURE bundle)

```text
AUDIT / PLAN
  → Krok 1: Klasyfikacja (§4C.2)
  → Krok 2: Boundary Check (§4C.3)
  → Werdykt: FEATURE PASS | STOP
  → IMPLEMENT (tylko po FEATURE PASS)
  → TEST (Gate B scope modułu)
  → BUILD
  → COMMIT ← ponownie Boundary Check na staged files (§4C.3)
  → PUSH
  → VERIFY
```

**Reguła:** Boundary Check wykonuje się **dwa razy** — przed startem implementacji (plan) i **bezpośrednio przed COMMIT** (staged files).

### 4C.6 Przykłady (NG-03)

| Bundle | Klasyfikacja | Protected Core? | Werdykt |
|--------|--------------|-----------------|---------|
| `TenderDetailPage.tsx` + `mobile.css` | FEATURE + PLATFORM | NIE | **FEATURE PASS** |
| `NG-03-DESIGN-FREEZE.md` banner | docs | NIE | PASS (poza Boundary — brak `src/`) |
| `TenderDetailPage.tsx` + `cloud-sync.ts` payroll | FEATURE + CORE | TAK | **STOP** · mixed bundle |
| `App.tsx` tylko HelpView Przetargi | UI/FEATURE | NIE (jeśli zero payroll handlers) | **FEATURE PASS** |
| `App.tsx` HelpView + `pwrPush` fix | FEATURE + CORE | TAK | **STOP** |

Szczegółowy audyt wzorcowy: sesja NG-03 CORE-013 (2026-07-04) — FEATURE PASS bez osobnego AUDYT CORE.

---

## 5. Bypass Registry (tylko dokumentacja w 01A)

Pełna tabela: [CORE-01-BYPASS-REGISTRY.md](./CORE-01-BYPASS-REGISTRY.md).

**Podsumowanie severity (bez fix w 01A):**

| ID | Severity | Status 01A | Status docelowy |
|----|----------|------------|-----------------|
| BYP-H1 | HIGH | DOCUMENTED | CORE-01B |
| BYP-H2 | HIGH | DOCUMENTED | CORE-01B |
| BYP-H3 | HIGH | DOCUMENTED | CORE-01B |
| BYP-M1…M8 | MED/LOW | DOCUMENTED | CORE-01B |

---

## 6. Architecture Guard — statyczny (spec implementacji)

### 6.1 `audit-pwrb-boundary.mjs` — rozszerzenie (CI-PWRB-7…10)

**Plik:** `scripts/audit-pwrb-boundary.mjs` (istniejący — **rozszerzyć**, nie fork)

| Reguła | Detekcja | Scope |
|--------|----------|-------|
| **CI-PWRB-7** | `pushKeysToCloudSafe\s*\([^)]*kw-week-employees` w `src/app/` | `app/**` |
| **CI-PWRB-8** | `pushKeysToCloud\s*\([^)]*kw-week-employees` w `src/app/` (bez PWRB) | `app/**` |
| **CI-PWRB-9** | `setItem\s*\(\s*['"]kw-week-employees['"]` w `src/app/` poza allowlist | `app/**` |
| **CI-PWRB-10** | `fetchKeysFromCloud` + push payroll w `src/app/` bez `pwr*` w tym samym pliku | heurystyka Worker |

**Allowlist CI-PWRB-9 (pliki z prawem direct LS roster — frozen, nie rozszerzać w 01A):**

- `src/app/hooks/useLocalStorage.ts` (UI state hook — dokumentowany wyjątek)
- `src/app/App.tsx` — tylko gdy w tym samym pliku występuje `pwrPush` / `pwrRestorePayrollMerge` w ciągu 30 linii (heurystyka restore path)

**Exclude (bez zmian):** `lib/cloud-sync.ts`, `lib/payroll-week-roster-bundle.ts`

### 6.2 `audit-core-ls-writes.mjs` (nowy skrypt)

**Plik:** `scripts/audit-core-ls-writes.mjs`  
**Komenda:** `npm run audit:core-ls` (dodać w `package.json` przy IMPLEMENT)

| Reguła | Detekcja |
|--------|----------|
| **CI-CORE-LS-1** | `setItem\s*\(\s*['"]kw-week-employees-deleted-ids` poza kernel |
| **CI-CORE-LS-2** | `localStorage.setItem` na payroll DATA_KEYS w `src/app/` poza allowlist |
| **CI-CORE-LS-3** | Import `pushWeekEmployeesToCloud` poza PWRB + cloud-sync |

**Allowlist globalna (frozen):**

```text
src/lib/cloud-sync.ts
src/lib/payroll-week-roster-bundle.ts
src/app/hooks/useLocalStorage.ts
src/app/CloudLoader.tsx
src/lib/local-data-backup.ts
```

**Uwaga:** CI-CORE-LS-2 **może FAIL** na znanych bypass (WorkerPhotoView) — to **oczekiwane** do zamknięcia CORE-01B. W 01A: `knownFailures` w manifeście z `waivedUntil: CORE-01B` (§7.3).

### 6.3 `audit-core-diff-gate.mjs` (opcjonalny, Faza IMPLEMENT+)

**Cel:** Przy PR touching Protected Core files → wymuś Gate CORE.

**Protected paths (glob):**

```text
src/lib/payroll-week-roster-bundle.ts
src/lib/payroll-week-employee-merge.ts
src/lib/cloud-sync.ts
src/app/CloudLoader.tsx
supabase/functions/make-server-0afb8820/index.tsx
```

**Zachowanie:** jeśli `git diff` dotyka któregokolwiek → exit 1 bez `--gate CORE PASS` w CI (lub osobny job required check).

---

## 7. Gate CORE — TEST-INFRA rozszerzenie

### 7.1 Manifest v1.2 (spec — nie edytować przed IMPLEMENT)

**Plik:** `test-infra/test-manifest.json`  
**manifestVersion:** `1.2.0`  
**epicId:** dodatkowy tag `CORE-01A` w polu `extensions` (nowe pole opcjonalne)

### 7.2 Nowe wpisy testów

| id | class | path | runner | condition | mandatory |
|----|-------|------|--------|-----------|-----------|
| `AUDIT-PWRB-BOUNDARY` | audit | `scripts/audit-pwrb-boundary.mjs` | node | `scope:core` | conditional |
| `AUDIT-CORE-LS-WRITES` | audit | `scripts/audit-core-ls-writes.mjs` | node | `scope:core` | conditional |
| `LIB-PWRB-BOUNDARY-RCB` | lib | `scripts/test-pwrb-boundary-rcb.mjs` | vite-node | `scope:core` | conditional |
| `LIB-PAYROLL-TOMBSTONE-REVOCATION-RCB` | lib | `scripts/test-payroll-tombstone-revocation-rcb.mjs` | vite-node | `scope:core` | conditional |

### 7.3 Nowa suite i gate

```json
"gate-core-protected": {
  "description": "CORE-01A — Protected Core static guards + PWRB regression",
  "testIds": [
    "AUDIT-PWRB-BOUNDARY",
    "AUDIT-CORE-LS-WRITES",
    "LIB-PWRB-BOUNDARY-RCB",
    "LIB-PAYROLL-TOMBSTONE-REVOCATION-RCB"
  ]
},
"releaseGates": {
  "CORE": {
    "suites": ["gate-core-protected", "gate-b-relevant"],
    "implicitBuild": true,
    "scopeRequired": true,
    "scopeDefault": "core"
  }
}
```

**Komenda docelowa:**

```bash
npm run test:infra -- --gate CORE --scope core
```

**Semantyka scope `core`:** uruchamia `gate-core-protected` + filtrowane testy payroll z Gate B (`scope:payroll` intersection) — orchestrator rozszerzyć o `scope:core` (spec, nie implementacja teraz).

### 7.4 Znane waivers (do CORE-01B)

| testId | knownFailure | waivedUntil |
|--------|--------------|-------------|
| `AUDIT-CORE-LS-WRITES` | `WorkerPhotoView.tsx` CI-CORE-LS-2 | CORE-01B |
| `AUDIT-PWRB-BOUNDARY` | opcjonalnie CI-PWRB-7 po rozszerzeniu | CORE-01B |

Waiver = pole `waivers[]` w manifeście (v1.2) — FAIL nie blokuje Gate CORE do czasu 01B; **musi** być widoczny w raporcie orchestratora.

### 7.5 CI workflow (spec)

**Plik:** `.github/workflows/test-infra-gates.yml`

Dodać job `gate-core` po `manifest-validate`:

```yaml
gate-core:
  name: Gate CORE (Protected Core)
  needs: manifest-validate
  runs-on: ubuntu-latest
  steps:
    - run: npm run test:infra -- --gate CORE --scope core
```

**Trigger paths** — dodać:

```text
supabase/functions/**
docs/architecture/CORE-*.md
```

---

## 8. Checklisty i procedura zmiany

### 8.1 Dokument: `CORE-01A-CHANGE-CHECKLIST.md`

Utworzyć przy IMPLEMENT (szablon poniżej — część freeze):

```text
CHANGE: <opis>
TOUCHES PROTECTED CORE: TAK / NIE
Protected files: <lista>

□ #CORE-013 Runtime Freeze: brak mixed bundle (CORE + FEATURE w jednym commicie) — §4A
□ #CORE-014 FEATURE Boundary Check: FEATURE PASS przed COMMIT — §4C
□ Klasyfikacja diff wg §4B (CORE / PLATFORM / FEATURE / UI)
□ Przeczytano CORE-PROTECTED-ARCHITECTURE.md
□ Przeczytano PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md (jeśli payroll)
□ CORE-01A: brak zmiany logiki §1.4 (jeśli TAK na Protected → STOP, przejdź do 01B DF)
□ npm run audit:pwrb PASS
□ npm run audit:core-ls PASS (lub documented waiver)
□ npm run test:infra -- --gate CORE --scope core PASS
□ npm run test:infra -- --gate B --scope payroll PASS (jeśli dotyczy sync)
□ Bypass Registry zaktualizowany (jeśli nowa luka)
□ PAYROLL-QUALITY-GATE poziom wg macierzy (jeśli dotyczy)
□ Owner review (jeśli diff Protected Core paths)

WERDYKT: ALLOWED / BLOCKED
```

### 8.2 Integracja z PAYROLL-QUALITY-GATE

| Typ zmiany | Poziom QG | + Gate CORE |
|------------|-----------|-------------|
| Docs only | — | NIE |
| `scripts/audit-*` | L1 | TAK |
| `test-manifest.json` | L1 | TAK (validate) |
| Protected Core file diff | L3+ | **OBOWIĄZKOWY** |
| Mixed bundle CORE+FEATURE | — | **BLOCKED** (#CORE-013) |
| CORE-01B runtime fix | L3+ | TAK + 01B DF |

---

## 9. Plan wdrożenia CORE-01A (fazy)

### Faza 0 — Preconditions (BLOCKING)

| # | Warunek | Owner |
|---|---------|-------|
| 0.1 | RC-B-POST-RELEASE-01 prod observation PASS | Owner |
| 0.2 | RC-B debug cleanup (`__wgdomPayrollPipelineDebug`) CLOSED | Agent po GO |
| 0.3 | STABILIZATION WINDOW — brak równoległego epicu sync | — |

**IMPLEMENT CORE-01A = BLOCKED** do spełnienia 0.1–0.3.

### Faza 1 — Docs bundle (pierwszy commit IMPLEMENT)

| Deliverable | Plik | Runtime |
|-------------|------|---------|
| Design Freeze | `CORE-01A-DESIGN-FREEZE.md` | ✅ ten plik |
| Protected Architecture | `CORE-PROTECTED-ARCHITECTURE.md` | docs |
| Bypass Registry | `CORE-01-BYPASS-REGISTRY.md` | docs |
| 01B Backlog | `CORE-01B-BACKLOG.md` | docs |
| Change Checklist | `CORE-01A-CHANGE-CHECKLIST.md` | docs |
| ARCHITECTURE §11 stub | `docs/ARCHITECTURE.md` | docs only |

**Werdykt Fazy 1:** docs commit · **zero** zmian `src/` / `supabase/`

### Faza 2 — Guard static + manifest (drugi commit)

| # | Zmiana | Pliki |
|---|--------|-------|
| 2.1 | Rozszerzenie CI-PWRB-7…10 | `scripts/audit-pwrb-boundary.mjs` |
| 2.2 | Nowy audit LS | `scripts/audit-core-ls-writes.mjs` |
| 2.3 | `npm run audit:core-ls` | `package.json` |
| 2.4 | Manifest v1.2 + waivers | `test-infra/test-manifest.json` |
| 2.5 | Orchestrator `scope:core` | `scripts/test-infra-orchestrator.mjs` |
| 2.6 | CI job gate-core | `.github/workflows/test-infra-gates.yml` |

**Test przed commit:**

```bash
npm run test:infra:validate
npm run audit:pwrb
npm run audit:core-ls          # oczekiwany FAIL z waiver do 01B
npm run test:infra -- --gate CORE --scope core
```

### Faza 3 — CLOSEOUT

| # | Akcja |
|---|-------|
| 3.1 | `docs/CORE-01A-EPIC-CLOSE-REPORT.md` |
| 3.2 | `ARCHITECTURE.md` §11.3a Protected Core |
| 3.3 | `CURRENT-TASK.md` — CORE-01A CLOSED · roadmap FEATURE DEVELOPMENT (§10) |
| 3.4 | `AGENTS.md` link do CORE-PROTECTED |
| 3.5 | CHANGELOG docs-only wpis (jeśli widoczne dla adminów — opcjonalnie pomijamy) |

**Nie wymaga:** deploy prod (brak runtime) · **nie wymaga** bump UI version.

---

## 10. Werdykt i kolejność epików

```text
RC-B-POST-RELEASE-01
        ↓
CORE-01A (docs + guard static + Gate CORE)  ← TEN FREEZE
        ↓
CORE-01A CLOSED
        ↓
FEATURE DEVELOPMENT                         ← domyślna ścieżka
  (NG-03 · NG-04 · Roboty · WM · STABILIZATION)
        ↓
[opcjonalnie — rzeczywista potrzeba zmian Protected Core]
        ↓
AUDYT CORE-01B → DESIGN FREEZE CORE-01B → IMPLEMENT CORE-01B
```

| Epic | Tryb | Następny obowiązkowy? | Dotyka runtime Protected Core? |
|------|------|------------------------|--------------------------------|
| CORE-01A | SAFE MODE | **TAK** (do closeout) | **NIE** |
| FEATURE (NG-03, Roboty, WM, …) | IMPLEMENT po DF/checklist | **TAK** (po 01A CLOSED) | **NIE** (przy FEATURE PASS) |
| CORE-01B | AUDYT → DF → IMPLEMENT | **NIE** — OPEN · READY · **Owner GO Required** | **TAK** (tylko backlogowane fixy) |

**SSOT roadmapy closeout:** [CORE-01A-CLOSEOUT-PLAN.md](./CORE-01A-CLOSEOUT-PLAN.md).

---

## 11. Referencje SSOT

| Dokument | Rola |
|----------|------|
| [CORE-PROTECTED-ARCHITECTURE.md](./CORE-PROTECTED-ARCHITECTURE.md) | Granica modułów + dozwolone API |
| [CORE-01-BYPASS-REGISTRY.md](./CORE-01-BYPASS-REGISTRY.md) | Rejestr luk |
| [CORE-01B-BACKLOG.md](./CORE-01B-BACKLOG.md) | Fixy runtime (on-demand — nie następny obowiązkowy epic) |
| [CORE-01A-CLOSEOUT-PLAN.md](./CORE-01A-CLOSEOUT-PLAN.md) | Roadmapa zamknięcia 01A + FEATURE first |
| [PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) | Operacyjny przewodnik sync |
| [SYNC-ARCH-01-RC-B-1-CLOSEOUT.md](../recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) | PWRB + I-1…I-4 |
| [TEST-INFRA-001-DESIGN-FREEZE.md](../TEST-INFRA-001-DESIGN-FREEZE.md) | Orchestrator principles |
| [PAYROLL-QUALITY-GATE.md](../PAYROLL-QUALITY-GATE.md) | Proceduralny gate |
| [ADR-CLOUD-SYNC-ARCHITECTURE.md](./ADR-CLOUD-SYNC-ARCHITECTURE.md) | Strategiczny ADR (osobny track) |

---

*Ostatnia aktualizacja: 2026-07-04 · CORE-01A DESIGN FREEZE v1.2 · roadmap: FEATURE first po closeout · CORE-01B on-demand · IMPLEMENT BLOCKED do RC-B-POST-RELEASE-01*
