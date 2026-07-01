# W&G DOM — przewodnik ciągłości sesji deweloperskiej

> **Cel:** jeden dokument odpowiadający na pytania: *co zrobiliśmy, co robimy teraz, jak wygląda struktura aplikacji i gdzie szukać SSOT.*  
> **Prod:** **2.63.25** · commit **`d9ba13f`** · https://www.wgdom.fun  
> **Data:** 2026-07-01 · **STABILIZATION WINDOW ACTIVE** · **PAYROLL Etap 2 B4–B6 CLOSED** · **AH-REG-1 CLOSED**

**Nie zastępuje** `ARCHITECTURE.md` ani handoffów tematycznych — **linkuje** do nich.

---

## 1. Kolejność czytania (nowa sesja)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← TEN PLIK (kontekst + mapa)
1m. docs/AGENT-APP-MAP.md            ← ★★★ mapa widoków, modułów, KV, sync (START dla AI)
2. CURRENT-TASK.md                   ← status · STABILIZATION WINDOW · backlog
3. docs/STABILIZATION-WINDOW-PLAN.md ← ★★ okres po NG-04 — zasady, maintenance, Z-01–Z-07
4. docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md  ← raport tygodniowy (SSOT metryk)
5. docs/AGENT-ONBOARDING.md          ← widoki, sync, smoke, workflow deweloperski
6. docs/PROJECT-HANDOFF-CURRENT.md   ← baseline prod, epici, commity
7. docs/TEST-INFRA-001-DESIGN-FREEZE.md  ← ★ Harness Playwright Lista Płac (APPROVED · READY · kod NOT STARTED)
8. docs/NG-04-EPIC-CLOSE-REPORT.md   ← BOQ PRO · Principles #001–#010 frozen
9. docs/ARCHITECTURE-REVIEW-2026-TENDERS.md  ← review Przetargi NG-01–04
10. docs/WORKFLOW-ARCHITECTURE-v2.63.md  ← OBOWIĄZKOWE przy zmianie Przetargu
11. docs/WORKFLOW-RELEASE-DEPLOY.md  ← release + VERIFY (nie zmieniaj bez polecenia)
12. docs/ARCHITECTURE.md             ← pełna architektura techniczna
13. AGENTS.md                        ← zasady pracy, zakazy
```

Hasło użytkownika **„kontynuuj WGDOM”** → dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 2. Co zrobiliśmy (stan na 2026-07-01)

### STABILIZATION WINDOW — **ACTIVE** (po NG-04)

| Pole | Wartość |
|------|---------|
| **Start** | 2026-07-01 · prod **2.63.12** |
| **Zasada** | **Brak nowych epiców** — maintenance + drobne wydania docs/test |
| **Plan** | [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) |
| **Raport tygodniowy** | [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md) |

**Dla agentów AI:** przed kodem sprawdź `CURRENT-TASK.md` § STABILIZATION WINDOW. Zmiany Przetargów wymagają respektu NG-04 Principles #001–#010 i zamrożonego NG-02 runtime. Incydent P0 → `INCIDENTS-2026-06.md` + wpis w raporcie tygodniowym.

### Epici zamknięte (nie rozpoczynaj bez nowego AUDIT + polecenia)

| Epic | Wersja / commit | Status |
|------|-----------------|--------|
| **NG-04 Kosztorys Workspace PRO** | 2.63.9–12 · **`ab6637f`** | **EPIC CLOSED** · BOQ Explorer · Principles #001–#010 |
| **NG-03 Tender Workspace UX** | 2.63.0–7 | **EPIC CLOSED** · Command/Content · 5 tabów |
| **NG-01 Trust Layer** | w serii 2.63.x | **SHIPPED** · `tender-trust-layer.ts` |
| **NG-02 Tender Automation Pipeline** | 2.62.95–98 · **`aeecdc0`** | **CLOSED** · auto discovery → heavy → pricing · 177 test PASS |
| **Mobile Recovery** | 2.62.78–79 · `78582db`→`4397eac` | **CLOSED** · smoke 7 PASS / 1 BLOCKED · bugs **NONE** |
| **P1 Audit Hub WM** | 2.62.74–77 · `b4fde0c`→`21d4a1b` | **CLOSED** — 7 źródeł Hub · `wm_druk` · 10 akcji WM |
| **Recovery Pack off-site** | 2.62.72 · `6cd8ebe` | **CLOSED** · OFFSITE READY · `WGDOM-RP-2.62.72-20260626` |
| **Workflow Architecture V4** | 2.62.64–72 | **CLOSED** — Hub, Process Strip, Sticky CTA |
| **Workflow Cleanup P0** | 2.62.72 | **CLOSED** |
| **Kosztorys Process UX P0** | 2.62.64 | **CLOSED** |
| **Audit Hub MVP-0→1B** | 2.62.36–41 | **CLOSED** — security log, recovery events |
| **WM Schematy + ZI 2026 + EM-P1R** | 2.59–2.62 | **CLOSED / STABLE** |
| **Audit Hub freshness AH-REG-1** | 2.63.25 · `d9ba13f` | **CLOSED** · notify + AUX pull on sync |
| **Payroll Restore Banner RB** | 2.63.24 · `727e6c4` | **CLOSED** · `payrollMetrics` zamiast richness |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B6** | 2.63.23 · `d670892` | **CLOSED** · Edge parity `mergeWeekEmployees` |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B5** | 2.63.22 · `187afb8` | **CLOSED** · closed week UI read-only |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B4** | 2.63.21 · `b3d5664` | **CLOSED** · `finalizePayrollBundleMerge` SSOT |
| **PAYROLL Guard Phase B3–B3.2** | 2.63.18–20 · `45eddaa`→`6afd9fd` | **SERIES CLOSED** · `CloudSyncMutationGuard` roster |
| **PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0** | 2.63.16 · `31a687a` | **CLOSED** · `CloudSyncMutationGuard` · unit T11–T13 |
| **PAYROLL-CLOUD-RECOVERY hotfix P0** | 2.63.15 | **CLOSED** · `mergeWeekEmployees` UNION |

**Epic closeout NG-02 Pipeline:** [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md)  
**Epic closeout Mobile Recovery:** [`SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md`](SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md)  
**Epic closeout P1 Audit Hub WM:** [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](../audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md)  
**SSOT techniczny wm_druk:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.6**

### P1 Audit Hub WM — skrót (4 etapy)

| Etap | Wersja | Commit | Zakres |
|------|--------|--------|--------|
| 1 infra | 2.62.74 | `b4fde0c` | `kw-wm-druk-audit-log` · adapter `adaptWmDrukAudit` |
| 2 Pomiary | 2.62.75 | `c31e1bd` | `rap_*` · `docx_exported` · `zip_exported` |
| 3 Schematy | 2.62.76 | `36718cc` | `schematic_*` · `measurement_imported` · `pdf_exported` |
| 4 UX Hub | 2.62.77 | `21d4a1b` | filtr `wm_druk` · chip · deep link labels · Help |

**Rozdzielenie źródeł:** `wm_print` = Odbiory/historia generacji · `wm_druk` = Pomiary/Schematy/Katalog.  
**Wykluczone świadomie:** `schematic_edited` (anti-flood) — backlog P1.1.

Szczegóły commitów → `docs/PROJECT-HANDOFF-CURRENT.md` § 1a, § 2.

### TEST-INFRA-001 — Payroll Test Harness (design freeze · **nie implementować bez polecenia**)

| Pole | Wartość |
|------|---------|
| **Status** | **DESIGN FREEZE FINAL — APPROVED** · **READY FOR IMPLEMENTATION** |
| **Kod** | **NOT STARTED** (okno stabilizacji · M-08) |
| **SSOT** | [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md) · Principles **#014–#026** |
| **Cel** | L0–L5 seed danych Playwright (Lista Płac → Przydziały) — **nie** zastępuje testów unit guarda |

**Dla agentów AI — zasady:**

1. **Nie** implementuj harnessu automatycznie — tylko na wyraźne polecenie (STABILIZATION WINDOW).
2. **Nie** duplikuj logiki domenowej — wyłącznie importy SSOT z listy §8 design freeze (#015).
3. **Prod:** Principle **#018** — tylko sandbox joby (`HARNESS_SANDBOX_JOB_IDS` lub marker); **zakaz** losowych kontraktów użytkownika.
4. **Prod smoke:** wymaga **TI-B2** (whitelist sandbox) + cleanup manifest (#016, #019).
5. **Backlog techniczny:** TI-B1 `removeWeekEmployee()` → lib · TI-B2 `HARNESS_SANDBOX_JOB_IDS`.

**Powiązane (prod CLOSED):** [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md)

### Recovery Pack (dla programistów — tylko odczyt)

| Pole | Wartość |
|------|---------|
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` (poza repo) |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` |
| **Baseline** | `RECOVERY_PACK_COMMIT = 6cd8ebe` |
| **Tag Git** | `wgdom-recovery-pack-2.62.72` |

**Nie modyfikuj** packa ani orchestratora bez wyraźnego polecenia użytkownika.

---

## 3. Co robimy teraz / następne

**Zasada:** **STABILIZATION WINDOW ACTIVE** — nie rozpoczynaj epiców ani dużych feature. Kolejny duży EPIC dopiero po **Z-01–Z-07** ([`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) §5) + **AUDIT** + wyraźnym poleceniu.

| Priorytet | Temat | Status | SSOT |
|-----------|-------|--------|------|
| **Bieżące** | Stabilizacja po NG-04 | **ACTIVE** | `STABILIZATION-WINDOW-PLAN.md` |
| **Rytuał** | Raport tygodniowy metryk | co tydzień | `STABILIZATION-WEEKLY-METRICS-TEMPLATE.md` |
| **CLOSED** | **PAYROLL Etap 2** B5/B6 · RB restore banner · AH-REG-1 | **2.63.22–25** | [`AGENT-APP-MAP.md`](AGENT-APP-MAP.md) § 8–9 |
| Na polecenie | **TEST-INFRA-001** implementacja harnessu | READY · NOT STARTED | `TEST-INFRA-001-DESIGN-FREEZE.md` · TI-B1/TI-B2 |
| Na polecenie | G-08 · G-02 (Przetargi backlog) | OPEN | `NG-04-EPIC-CLOSE-REPORT.md` |
| Maintenance P1 | Docs hygiene · smoke agregat · mobile re-cert | plan M-01–M-05 | `STABILIZATION-WINDOW-PLAN.md` §3 |
| Maintenance P2 | TEST-INFRA harness (M-08) | na polecenie | `TEST-INFRA-001-DESIGN-FREEZE.md` |
| Backlog | P3 Export notatki · P2-H.7 · Work Catalog P2.7+ | OPEN | `PROJECT-HANDOFF-CURRENT.md` |

**Deploy:** push `main` → Vercel. Verify: jedno `curl https://www.wgdom.fun/version.json` → `version` + `commit` (patrz `WORKFLOW-RELEASE-DEPLOY.md`).

---

## 4. Architektura aplikacji (skrót)

### 4.1 Warstwy

```text
┌──────────────────────────────────────────────────────────────┐
│  PWA (React + Vite + TypeScript)                             │
│  src/app/          — UI, routing, widoki                     │
│  src/lib/          — logika domenowa (SSOT biznesu)            │
├──────────────────────────────────────────────────────────────┤
│  LocalStorage  ←── merge/push ──→  Supabase KV (DATA_KEYS)   │
│  Pliki         ←── upload ──────→  Storage + Edge Function    │
└──────────────────────────────────────────────────────────────┘
```

| Warstwa | SSOT | Uwaga |
|---------|------|-------|
| Sync / merge | `src/lib/cloud-sync.ts` | **KRYTYCZNE** — ARCHITECTURE § 11 |
| Wersja UI | `src/app/changelog-data.ts` | `CHANGELOG[0].version` |
| Wersja deploy | `dist/version.json` | generowane w `vite.config.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/` | KV, storage, email, BZP proxy |

### 4.2 Role użytkowników

| Rola | Dostęp |
|------|--------|
| **Admin** | Pełny panel — Pulpit, Roboty, Przetargi, WM Druk, Lista Płac, … |
| **Inspektor terenowy** | Osobny login — roboty, zdjęcia, checklista |
| **Pracownik** | Telefon + PIN — grafik, wypłata, zdjęcia |

### 4.3 Mapa widoków admina

**Pełna tabela:** [`AGENT-APP-MAP.md`](AGENT-APP-MAP.md) § 2 · ARCHITECTURE § 15.1 · **Router:** `AdminViewRouter.tsx` · **Menu:** `admin-nav.ts`

| `view` | Etykieta | Komponent główny |
|--------|----------|------------------|
| `dashboard` | Pulpit | `DashboardView.tsx` |
| `payroll` | Lista Płac | `PayrollView.tsx` |
| `schedule` | Grafik | `App.tsx` |
| `jobs` | Roboty | `JobsView.tsx` |
| `operationalnotes` | Notatki operacyjne | `OperationalNotesView.tsx` |
| `audit` | Audit Hub | `AuditHubView.tsx` (Super Admin) |
| `tenders` | Przetargi | `TendersModule.tsx` |
| `wmprint` | Odbiory WM Druk | `WmPrintView.tsx` (+ Pomiary, Schematy) |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` |
| `media` | Zdjęcia i pliki | `MediaView.tsx` |
| `inspector` | Inspektor (admin feed) | `InspectorAdminView.tsx` |
| `guide` | Zmiany / Instrukcja | `GuideView.tsx` |

**Mobile:** bottom nav — Pulpit · Lista Płac · Grafik · Roboty; reszta w „Więcej”.

**Nie czytaj** `App.tsx` od zera (~15k linii) — grep po nazwie widoku lub ARCHITECTURE § 15.

### 4.4 Lista Płac — sync i merge (SSOT po B4)

**Closeout:** [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · Guard Phase: [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md)

```text
PayrollView.tsx / App.tsx
  persistPayrollRoster ──► withKwWeekEmployeesAsyncMutation (B3 guard)
  syncWeekRatesFromDirectory ──► guard roster (R2)
  autoArchiveAndAdvance ──► pushPayrollWeekAfterRollover + guard (R3)

CloudLoader (F5 / pierwszy mount)
  mergeAllDataKeys → applyBootstrapPayrollMerge → finalizePayrollBundleMerge

pullFromCloudAndMerge / focus sync
  computeMergedDataBundle → finalizePayrollBundleMerge → applyRuntimePayrollAntiLeak
```

| Warstwa | Plik | Klucz KV |
|---------|------|----------|
| UI Lista Płac | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` | `kw-week-employees`, `kw-weekFrom`, `kw-weekTo` |
| Merge SSOT | `cloud-sync.ts` — `finalizePayrollBundleMerge` | po `mergeAllDataKeys` |
| Guard mutacji | `cloud-sync-mutation-guard.ts` | `kw-week-employees`, `kw-jobs` |
| Przydziały robót | `PayrollJobAssignmentsPanel.tsx` | `job.workEntries[]` w `kw-jobs` |

**Test parity B4:** `npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs`

---

## 5. Moduł Przetargi — struktura funkcji

**SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md` (obowiązkowe przed zmianą UI Przetargu).

### 5.1 Nawigacja modułu (`TendersModule.tsx`)

| Zakładka | Plik | Rola |
|----------|------|------|
| Lista | `tenders/tabs/TendersListTab.tsx` | Pipeline BZP, filtry, Client Bar |
| Strategia | `tenders/tabs/TendersStrategyTab.tsx` | GO/HOLD, prognoza, health — **jedyny** slot strategii |
| Mapa | `tenders/tabs/TendersMapTab.tsx` | Geolokalizacja przetargów |
| Profil firmy | `tenders/tabs/TendersProfileTab.tsx` | Profil wykonawcy |
| Baza cen | `tenders/tabs/TendersPriceBaseTab.tsx` | P3 pricing |
| Ustawienia | `tenders/tabs/TendersSettingsTab.tsx` | Konfiguracja modułu |

**Provider:** `TendersProvider.tsx` — wspólny pipeline dla Pulpitu (`TendersShortcutPanel`) i modułu Przetargi.

### 5.2 Detal przetargu (V4 Workspace)

```text
TenderDetailPanel.tsx          ← shell zakładek V4
├── TenderWorkflowHub          ← EPIC A: postęp, blokery, prep (Hub)
├── TenderWorkflowProcessStrip ← EPIC B: pasek Dokumenty→Oferta
├── TenderWorkflowPrimaryAction← EPIC C: jedno sticky CTA
├── TenderAttachmentsPanel     ← Dokumenty: grouped list (tender-grouped-documents.ts)
├── DocumentSummaryHeader      ← nagłówek podsumowania dokumentów
├── Kosztorys / Wycena / Oferta / Decyzja … (sloty V4)
└── buildTenderIntelligenceContext()  ← jedno źródło kontekstu (anti-duplikacja)
```

### 5.3 Kluczowe lib (Przetargi) — mapa tematyczna

| Temat | Pliki SSOT |
|-------|------------|
| Pipeline BZP / sync | `tenders-bzp.ts`, `tenders-sync.ts` |
| Dossier / parse / merge | `tender-dossier-pipeline.ts`, `tender-dossier-merge.ts`, `tenders-bzp-doc-parse.ts` |
| Workflow UI | `tender-workflow-hub.ts`, `tender-workflow-process-strip.ts`, `tender-workflow-primary-action.ts` |
| Intelligence / CTA | `tender-intelligence-context.ts`, `tender-intelligence-next-action.ts` |
| Dokumenty UI | `tender-grouped-documents.ts`, `tender-workspace-ux.ts`, `tender-document-summary-header.ts` |
| Kosztorys UX | `tender-kosztorys-process-phase.ts`, `tender-kosztorys-process-health.ts` |
| Strategia | `tenders-strategy-*.ts` (wiele modułów — grep przed nowym plikiem) |
| Owner View / P1 | `tender-executive-summary.ts`, `tender-work-scope-inference.ts` |

**Zasada:** rozszerzaj istniejące lib; nie duplikuj klasyfikatorów dokumentów.

### 5.4 Smoke regresji Przetargów

```bash
npx vite-node scripts/test-tender-workflow-hub.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npx vite-node scripts/test-tender-workspace-ux.mjs
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
npm run build
```

---

## 6. Inne domeny (skrót)

| Domena | Widok | Lib / handoff |
|--------|-------|---------------|
| **WM Druk + ZI 2026** | `WmPrintView.tsx` | `ZI-2026-HANDOFF.md`, ARCHITECTURE § 12.1.8 |
| **Pomiary Elektryczne** | tab w WM Druk | `SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md` |
| **Schematy** | tab w WM Druk | `SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md` |
| **Notatki operacyjne** | `OperationalNotesView.tsx` | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **Audit Hub** | `AuditHubView.tsx` | **7 źródeł** — MVP-1B + **P1 wm_druk** · § 15.2, § 15.6 |
| **WM Druk audit** | `WmPrintView.tsx` + lib | `wm-druk-audit.ts` · `kw-wm-druk-audit-log` · `recordWmDrukAudit` |
| **Lista Płac** | `PayrollView.tsx` | `SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md` |
| **Roboty** | `JobsView.tsx` | `job-*.ts`, inspektor w `InspectorPanel.tsx` |

---

## 7. Struktura repozytorium

```text
WGDOM1/
├── src/
│   ├── app/                 UI — widoki, TendersModule, App.tsx (monolit shell)
│   │   ├── admin/           AdminViewRouter, admin-nav
│   │   └── tenders/         Przetargi 3.0 (tabs, strategy, provider)
│   ├── lib/                 ★ logika domenowa (~100+ plików tender-*)
│   └── config/supabase.ts
├── supabase/functions/make-server-0afb8820/   Edge API
├── scripts/                 testy vite-node, backup, recovery (nie commitować _tmp*)
├── docs/                    SSOT, handoffy, ARCHITECTURE
├── audit/                   raporty śledcze (wiele plików lokalnych)
├── public/                  PWA, szablony PDF/DOCX
└── e2e/                     Playwright
```

**Poza repo:** `../WGDOM-RECOVERY-PACK/` — Recovery Pack (off-site backup).

**Nie commitować:** `scripts/_tmp*`, większość `audit/*.pdf`, `.env`, artefakty packa.

---

## 8. Workflow deweloperski (obowiązujący)

```text
AUDIT → PLAN → IMPLEMENT → TESTY → BUILD → COMMIT → PUSH
→ VERIFY DEPLOY → HOUSEKEEPING → EPIC CLOSE
```

| Etap | Co robić |
|------|----------|
| **AUDIT** | Świeży przegląd SSOT + `git status` przed każdym nowym EPIC-em |
| **PLAN** | Zakres IN/OUT — nie rozszerzać bez polecenia |
| **IMPLEMENT** | Minimalny diff · chmura dla trwałych danych |
| **TESTY / BUILD** | Smoke relevant + `npm run build` |
| **VERIFY** | Jedno `version.json` — bez pollingu |
| **HOUSEKEEPING** | `CURRENT-TASK.md` + `PROJECT-HANDOFF-CURRENT.md` |
| **EPIC CLOSE** | Raport w `audit/` + Lessons Learned |

| Typ zmiany | Bump wersji? |
|------------|--------------|
| Feature / fix UI | Tak — `changelog-data.ts` + `CHANGELOG.md` |
| Docs only | Nie (chyba że user prosi o release) |

Szczegóły: `docs/WORKFLOW-RELEASE-DEPLOY.md` · `AGENTS.md`

---

## 9. Czego nie ruszać bez polecenia

- `cloud-sync.ts` — merge, DATA_KEYS, Payroll Guard
- Parsery dossier / ATH / PDF — bez testów TP113/TP182
- Edge Function semantics (email, storage paths)
- Canonical ZI template KV (`2b22da48…`)
- Recovery Pack orchestrator / pack root
- Command Center — **usunięty**, nie przywracać

---

*Ostatnia aktualizacja: 2026-07-01 · prod 2.63.12 · NG-04 EPIC CLOSED · STABILIZATION WINDOW ACTIVE*
