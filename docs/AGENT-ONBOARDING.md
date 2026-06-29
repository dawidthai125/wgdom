# W&G DOM — onboarding programisty

> **Cel:** jeden dokument startowy — jak działa aplikacja, gdzie szukać prawdy, czego nie ruszać.  
> **Prod:** **2.62.79** · commit **`4397eac`** · https://www.wgdom.fun · **Mobile Recovery CLOSED** · P1 Audit Hub WM CLOSED

---

## 1. Kolejność czytania (obowiązkowa)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← ★★ kontekst sesji + mapa struktury
2. docs/AGENT-ONBOARDING.md           ← TEN PLIK (mapa systemu)
3. CURRENT-TASK.md                    ← status sesji / backlog bieżący
4. docs/PROJECT-HANDOFF-CURRENT.md    ← ★★ baseline prod, epici, commity
5. docs/WORKFLOW-ARCHITECTURE-v2.63.md ← ★★ SSOT Workflow (OBOWIĄZKOWE przy Przetargu)
6. docs/ARCHITECTURE.md               ← pełna architektura (§ 15.2 Audit Hub · § 15.6 wm_druk)
7. AGENTS.md                          ← workflow, zakazy, lista handoffów
8. docs/WORKFLOW-RELEASE-DEPLOY.md    ← release A/B/C + VERIFY FAST
9. audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md ← P1 Audit Hub WM CLOSED (jeśli dotyczy WM audit)
… handoffy tematyczne — patrz AGENTS.md § 1 oraz AGENT-CONTINUITY-GUIDE § 6
```

**Hasło użytkownika „kontynuuj WGDOM”:** dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.

**Nie czytaj od zera:** `src/app/App.tsx` (~15k linii) — użyj ARCHITECTURE § 15.1 (mapa widoków) i grep po nazwie widoku.

---

## 2. Czym jest W&G DOM

Monolit **React + Vite + TypeScript** dla firmy remontowej W&G DOM (Wrocław):

| Rola | Dostęp |
|------|--------|
| **Admin** (Dawid, Stanisław, Pawel) | Pulpit, Lista płac, Roboty, Przetargi, WM Druk, Inspektor admin, … |
| **Inspektor terenowy** (Szymon) | Osobny login — roboty WM, dokumenty, zdjęcia, checklista |
| **Pracownik** | Telefon + PIN — roboty, grafik, wypłata, zdjęcia |

**Dane trwałe:** LocalStorage + synchronizacja **Supabase KV** (`src/lib/cloud-sync.ts`).  
**Pliki:** Supabase Storage przez Edge Function `make-server-0afb8820`.  
**Frontend deploy:** push `main` → Vercel. **Backend:** push `supabase/functions/**` → GitHub Action.

---

## 3. Architektura wysokiego poziomu

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (PWA) · Vite build · lazy chunks per widok         │
├─────────────────────────────────────────────────────────────┤
│  src/app/App.tsx          — shell, routing admin/worker     │
│  src/app/*View.tsx        — duże panele (Jobs, Payroll, …)  │
│  src/app/tenders/         — Przetargi 3.0 module            │
│  src/lib/*                — logika domenowa (sync, jobs, …) │
├─────────────────────────────────────────────────────────────┤
│  LocalStorage  ←merge/push→  Supabase KV (DATA_KEYS)        │
│  Storage upload  ←→  Edge make-server-0afb8820              │
└─────────────────────────────────────────────────────────────┘
```

**Wersja UI:** `src/app/changelog-data.ts` → `CHANGELOG[0].version` (zakładka „Zmiany”).

**Provider przetargów:** `TendersProvider` — jeden pipeline BZP dla Pulpitu i modułu Przetargi.

**Command Center:** **usunięty** (v2.51.0) — archiwum: `docs/archive/command-center/`.

---

## 4. Mapa widoków admina (skrót)

Pełna tabela: **ARCHITECTURE.md § 15.1**.

| `view` (router) | Etykieta | Plik główny |
|-----------------|----------|-------------|
| `dashboard` | Pulpit | `DashboardView.tsx` |
| `payroll` | Lista Płac | `PayrollView.tsx` | Sumy · Szczegóły dni · **Przydziały robót** (2.59.49) |
| `schedule` | Grafik | `App.tsx` |
| `jobs` | Roboty | `JobsView.tsx` |
| `operationalnotes` | Notatki operacyjne | `OperationalNotesView.tsx` |
| `audit` | Audit Hub | `AuditHubView.tsx` | **Super Admin only** · **7 źródeł** (w tym `wm_druk`) · § 15.2, § 15.6 |
| `tenders` | Przetargi | `TendersModule.tsx` (5 zakładek) |
| `wmprint` | Odbiory WM Druk + **Pomiary** + **Schematy** | `WmPrintView.tsx` |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` |
| `media` | Zdjęcia i pliki | `MediaView.tsx` |
| `inspector` | Inspektor (admin feed) | `InspectorAdminView.tsx` |
| `guide` | Instrukcja | `GuideView.tsx` | ACL § ARCHITECTURE 5.1 · Super Admin; admin gdy flaga |
| `changelog` | Zmiany | `GuideView.tsx` | ACL § ARCHITECTURE 5.1 · osobne menu od 2.62.92 |

Router: `AdminViewRouter.tsx` · mobile: `mobile.css`, bottom nav 4 pozycje.

### AppSettings ACL (Instrukcja · Zmiany · 2.62.92)

**Handoff:** [`SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md`](SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md)

| Flaga `kw-app-settings` | Helper | Menu |
|-------------------------|--------|------|
| `instructionsForAdminEnabled` | `adminCanViewInstructions` | `guide` |
| `changesForAdminEnabled` | `adminCanViewChanges` | `changelog` |

Bez uprawnień: brak pozycji menu + redirect `guide`/`changelog` → Pulpit. Test: `scripts/test-admin-guide-acl.mjs`.

### Mobile drill-in (<640px · breakpoint `sm`)

**Epic closeout:** [`SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md`](SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md) · **prod 2.62.79** · **CLOSED**

| Widok | Plik | Wzorzec |
|-------|------|---------|
| **Roboty detal (MV-2)** | `JobsView.tsx` | STREFA A `hidden sm:block` · detal `absolute inset-0 z-40` · **Lista** |
| Notatki | `OperationalNotesView.tsx` | `mobileDetailOpen` · `hidden md:flex` |
| Lista płac | `PayrollView.tsx` | `absolute inset-0 z-50 sm:relative` |
| Schematy WM | `WmPrintSchematicsPanel.tsx` | drill-in overlay |

**Native back:** `registerNativeBackHandler` w `native-app-bridge.ts` — **Capacitor Android**; Safari browser back **nie** zamyka drill-in Roboty (enhancement backlog).

**Nie zmieniaj** wzorca MV-2 bez briefu · smoke SMOKE-03 tender **BLOCKED** ≠ bug prod.

---

## 5. Sync i chmura (KRYTYCZNE)

**SSOT:** `src/lib/cloud-sync.ts` · **ARCHITECTURE § 11**

| Zasada | Szczegół |
|--------|----------|
| Trwałe dane | Zawsze LS + push do KV przez `DATA_KEYS` |
| Partial push | `prepareKeysForCloudPush` — nie omijać |
| Merge | Per-klucz w `mergeDataKey` — **nie zgaduj** semantyki |
| **Import merge helperów** | Każda funkcja w `mergeDataKey` **musi** mieć `import` w nagłówku `cloud-sync.ts` — regresja **2.62.39→2.62.42** |
| Payroll Guard | Blokuje push gdy lista płac „kurczy się” >50% |
| Admin hasła | Osobny merge `mergeAdminPasswordOverrides` |
| Bootstrap | `CloudLoader.tsx` — P11 payroll, P15 admin passwords |
| **P0 egress (2026-06-29)** | `exceed_egress_quota` → sync pada (`Failed to fetch`); pełny `batch-get` w `runCloudSync` + focus — patrz [`SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) |

**Incydenty:** `docs/INCIDENTS-2026-06.md`

---

## 5a. Deploy i build (KRYTYCZNE)

**Handoff incydentu:** [`SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md)

| Element | Wartość |
|---------|---------|
| **Trigger prod** | `git push origin main` → Vercel Git Integration |
| **Zakaz** | `vercel deploy` / `vercel --prod` |
| **Build** | `npm run build` → `dist/` + `dist/version.json` + `dist/sw.js` |
| **Wersja SSOT** | `src/app/changelog-data.ts` → `CHANGELOG[0].version` |
| **Verify prod** | `curl -s https://www.wgdom.fun/version.json` |

**Pułapka #1:** nowy plik `src/lib/*.ts` z importem w tracked kodzie — **musi być w `git ls-files`**, inaczej Vercel ENOENT mimo lokalnego PASS.

**Pułapka #2:** pluginy Vite zapisują do `dist/` — wymagają `mkdirSync(..., { recursive: true })` przed zapisem (`vite.config.ts` § 13.1).

**Pełny workflow:** [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)

---

## 6b. Moduł Pomiary Elektryczne (EM) — EM-P1R COMPLETE

**Status:** **PRODUCTION STABLE** · v2.59.30–**2.59.44** · generator 5× DOCX Word SSOT

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) | **★★ SSOT modułu EM** |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.10 | Architektura techniczna |
| [`audit/EM-P1R-TEMPLATE-REBUILD-REPORT.md`](../audit/EM-P1R-TEMPLATE-REBUILD-REPORT.md) | Raport P1R |
| [`audit/EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md`](../audit/EM-P1R-HOTFIX-001-ADDRESS-PARITY-REPORT.md) | Fix adresu |

### Kluczowe pliki

```text
src/lib/electrical-measurements/     domena (preview, payload, DOCX, registry)
public/em-measurements/*.template.docx   szablony Word (Desktop SSOT)
scripts/templatize-em-p1r-from-ssot.mjs  regeneracja szablonów
```

### Smoke EM

```bash
npx vite-node scripts/test-electrical-measurements-p1.mjs
npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs
```

**Nie ruszać:** `build-em-docx-templates.mjs` (retired) · layout szablonów 1:1 · `preview.ts` / value engine SSOT

---

## 6d. Przetargi — P1 Document Insights (Owner View) — **2.59.52 CLOSED**

**Status:** **P1A–P1D CLOSED** · v**2.59.52** · prod **`ff20fec`**

Warstwa UX nad podglądem dokumentów kosztorysowych — **bez zmian parserów/pipeline**.

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md`](SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md) | **★★ SSOT P1** — architektura, pliki, smoke, backlog |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.12 | Architektura techniczna |

### Kluczowe pliki

```text
src/app/TenderOwnerView.tsx              Owner View (biznesowy widok przetargu)
src/app/JobFilePreviewModal.tsx          Modal podglądu — integracja P1A–P1D
src/app/DocumentSummaryHeader.tsx      P1B — karta podsumowania
src/app/ExecutiveSummaryCard.tsx       P1C/P1D — główne roboty + pewność
src/lib/tender-pdf-preview-ux.ts         P1A — etykiety PDF, previewContext
src/lib/tender-document-summary-header.ts   P1B — logika summary
src/lib/tender-executive-summary.ts      P1C — executive summary
src/lib/tender-work-scope-inference.ts   P1D — inferencja branż z opisów
src/lib/tender-ath-quick-access.ts       resolveAthPreviewItem() + context
```

### Smoke P1

```bash
npx vite-node scripts/test-p1-pdf-preview-ux.mjs
npx vite-node scripts/test-p1b-document-summary-header.mjs
npx vite-node scripts/test-p1c-executive-summary.mjs
npx vite-node scripts/test-p1d-work-scope-inference.mjs
npx vite-node scripts/test-p0-ath-preview-hotfix.mjs
npx vite-node scripts/test-p5-owner-view.mjs
```

**Nie ruszać bez briefu:** `tender-dossier-pipeline.ts`, `ath-parser.ts`, FIX-A/B/C — patrz handoff P1 §10.

---

## 6g. Przetargi — Kosztorys Process UX P0 — **2.62.64 CLOSED**

**Status:** **P0 CLOSED** · prod **`4056223`** · **prezentacja only**

Zakładka **Przetargi → Kosztorys V4** — jeden pasek statusu z 8 fazami biznesowymi zamiast stałego „Analiza kosztorysu…”.

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md`](SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md) | **★★ SSOT P0** |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.15a | Architektura techniczna |

### Kluczowe pliki

```text
src/lib/tender-kosztorys-process-phase.ts   deriveKosztorysProcessPhase() SSOT
src/app/KosztorysProcessStatusBar.tsx       jeden komponent UI
src/app/TenderKosztorysWorkspace.tsx        konsument fazy
src/app/TenderDetailPage.tsx                processSession z hooków
src/app/hooks/useTenderDossierHeavyLazy.ts  retry + parseErrorMessage
```

### Smoke

```bash
npx vite-node scripts/test-tender-kosztorys-process-phase.mjs
```

**Nie ruszać bez briefu:** parsery · `buildTenderDossierHeavy` · Edge · `isKosztorysAwaitingHeavyParse` w innych widokach (backlog P1).

---

## 6h. Przetargi — Workflow Architecture V4 — **2.62.72 FINALIZED**

**Status:** **FINALIZED** · prod **`6cd8ebe`** · Hub · Process Strip · Sticky CTA · Summary Header · grouped docs

| Dokument | Rola |
|----------|------|
| [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md) | **★★ GŁÓWNY SSOT Workflow** — zakładki V4, filary UI, rejestr lib, anti-duplikacja |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.9a | Skrót + link do SSOT |
| [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) | Historyczne UX.1 (2.53.x) — **superseded** |

### Zasady (twardy)

- Jedno `buildTenderIntelligenceContext()` w `TenderDetailPanel`
- Jedno CTA — `TenderWorkflowPrimaryAction` (bez „Następny krok” w V2)
- Przetarg = workflow · Decyzja = werdykt GO/HOLD/ODPUŚĆ

### Smoke

```bash
npx vite-node scripts/test-tender-workflow-hub.mjs
npx vite-node scripts/test-tender-workflow-primary-action.mjs
npx vite-node scripts/test-tender-workspace-v2-ux.mjs
```

---

## 6f. Przetargi — TP190 Parser v3 + Batch Rebuild — **CLOSED**

**Status:** **TP190 stream CLOSED** (TP190A→TP190C-3C) · `CURRENT_PARSER_VERSION = 3` · prod stale **0**

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) | **★★ SSOT** — łańcuch TP190, architektura, testy, operacje |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.18–19 | Parser version + batch rebuild |

### Pipeline dossier (skrót)

```text
analyzeTenderWithDossier → pickBetterKosztorys → dossierFromAnalysisResult
parserVersion=3 stamp · isDossierParserStale → lazy rescan
Batch: tp190c-batch-rebuild.mjs (dry-run / --write)
```

### Kluczowe pliki

```text
src/lib/tender-dossier-parser-version.ts   CURRENT_PARSER_VERSION, stale detection
src/lib/tender-dossier-merge.ts            pickBetterKosztorys, TP190B anti-downgrade
src/lib/tender-dossier-pipeline.ts         analyze + dossier build
src/lib/tp190c-batch-rebuild.ts            batch rebuild SSOT
scripts/tp190c-batch-rebuild.mjs           CLI prod KV
```

### Smoke

```bash
npx vite-node scripts/test-tp190c-batch-rebuild.mjs
npx vite-node scripts/test-tp190c-stale-rebuild-protection.mjs
npx vite-node scripts/test-tp190b-dossier-stability.mjs
npx vite-node scripts/test-tender-dossier-parser-version.mjs
```

---

## 6g. Przetargi — PDF WM Recovery — **2.62.24 CLOSED**

**Status:** **TP196–TP201C CLOSED** · TP182 **~142 pozycji** (TP201C-B)

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-PDF-WM-RECOVERY.md`](SESSION-HANDOFF-PDF-WM-RECOVERY.md) | **★★ SSOT** — milestone'y, testy, pułapki |
| [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md) | TP200B fidelity |

**Kluczowy plik:** `src/lib/pdf-przedmiar-heuristic.ts`

**Smoke:**

```bash
npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs
```

---

## 6h. Przetargi — P1 Cost Content Detection — **2.62.26+ CLOSED**

**Status:** moduł **`tender-cost-content-detection.ts`** — scoring kosztorysu po treści XLSX (P1, obok ATH i nazwy pliku).

| Importujący | Rola |
|-------------|------|
| `tender-cost-discovery.ts` | ranking dokumentów kosztowych |
| `tenders-bzp-doc-parse.ts` | `isOfferFormXlsxBytes`, scoring bytes |

**Incydent 2026-06-22:** plik był untracked przy commicie `c869be7` → Vercel BUILD FAILED do `d79f7c1`.

**Smoke:**

```bash
npx vite-node scripts/test-tender-cost-content-detection.mjs
```

---

## 6e. Przetargi — P0/P1 Kosztorys Merge Quality — **2.62.1 CLOSED**

**Status:** **P0+P1 CLOSED** · commity **`4574182`** + **`50d7501`** · incydenty **TP113** / **TP182**

Ochrona snapshotu `tenderDossier.kosztorys` (ATH / PDF) przy sync LS↔cloud i przy „Odśwież BZP”.

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md`](SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md) | **★★ SSOT** — dwa merge path, ranking, testy, pułapki |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.16 | Architektura techniczna |

### Dwa merge path (skrót)

```text
P0  loadTendersPipeline → mergePipelineItem → mergeTenderDossierByQuality   [tenders-sync.ts]
P1  runBzpMerge → mergeTenderPipeline → mergeTenderDossierByQuality           [tenders-bzp.ts]
SSOT rankingu: tender-dossier-merge.ts
```

### Smoke

```bash
npx vite-node scripts/test-tender-dossier-merge-quality.mjs   # P0
npx vite-node scripts/test-tender-bzp-merge-quality.mjs       # P1
```

**Nie ruszać bez briefu:** parsery ATH/PDF · discovery · ranking tierów bez testów TP113/TP182.

---

## 6c. Lista Płac — Przydziały robót (PAYROLL-ASSIGNMENTS-P1)

**Status:** **P1 CLOSED** · v**2.59.49** · prod **`94ad114`**

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) | **★★ SSOT feature** — architektura, pliki, backlog P2 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 10.1 | Blok techniczny w sekcji payroll |
| [`audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md`](../audit/PAYROLL-ASSIGNMENTS-P1-REPORT.md) | Raport release |

### Kluczowe pliki

```text
src/app/PayrollView.tsx              payrollListMode: summary | detailed | assignments
src/app/PayrollJobAssignmentsPanel.tsx   panel boczny edycji workEntries
src/lib/payroll-job-assignments.ts   mutacje jobs, badge, footer spójności
src/app/app-domain.ts                payrollJobConsistencyAlerts (SSOT — nie duplikować)
src/app/JobsView.tsx                 wzorcowa edycja Roboty → Pracownicy
```

### Smoke

```bash
npx vite-node scripts/test-payroll-assignments-p1.mjs
```

**Nie ruszać bez briefu:** model godzin `emp.days` · wypłaty · grafik · nowy KV · duplikat algorytmu spójności

---

## 6d. Audit Hub (MVP-0→1B + P1 WM **CLOSED**)

**Status:** **7 źródeł** · MVP-1B **CLOSED** (2.62.41) · **P1 Audit Hub WM CLOSED** (2.62.74–77)

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) | SSOT modułu Hub — security log, recovery events, backlog MVP-1C export |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § **15.2** · § **15.5** · § **15.6** | Adaptery, feed, **wm_druk** P1 |
| [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](../audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md) | **★ EPIC CLOSE** — metryki, lessons learned |
| [`SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](SESSION-HANDOFF-AUDIT-HUB-WM-001.md) | Audyt historyczny (**SUPERSEDED**) |

### 7 źródeł feedu (`AUDIT_FEED_SOURCES`)

| `source` | Etykieta UI | SSOT danych |
|----------|-------------|-------------|
| `operational_notes` | Notatki operacyjne | `kw-operational-notes-audit-log` |
| `inspector_login` | Inspektor — logowania | `kw-inspector-login-events` |
| `job_activity` | Aktywność na robotach | `job.activityLog[]` |
| `wm_print` | WM Druk — Odbiory | `kw-wm-print-history` |
| **`wm_druk`** | **WM Druk — Pomiary i Schematy** | **`kw-wm-druk-audit-log`** |
| `delivery_package` | Pakiety odbiorowe | publikacje odbiorów |
| `security_log` | Security log | `kw-security-audit-log` |

### Kluczowe pliki

```text
src/lib/audit-hub/types.ts       AUDIT_FEED_SOURCES (7) · AuditHubInput
src/lib/audit-hub/adapters.ts    adaptWmDrukAudit + 6 innych · buildAuditFeed
src/lib/wm-druk-audit.ts         recordWmDrukAudit · normalize · merge · cap 3000
src/lib/audit-hub/deeplink.ts    auditHubDeepLinkLabel · WM_PRINT_TABS labels
src/lib/audit-hub/filters.ts     filtry, paginacja 50
src/lib/audit-hub/view-model.ts  buildAuditHubViewModel
src/lib/audit-hub/acl.ts         canAccessAuditHub — Super Admin
src/app/AuditHubView.tsx         UI — chip wm_druk (teal) · filtr 7 źródeł
src/app/WmPrintView.tsx          hooki recordWmDrukAudit (Pomiary/Katalog/Schematy)
```

### Smoke

```bash
npx vite-node scripts/test-wm-druk-audit.mjs
npx vite-node scripts/test-audit-hub-adapters.mjs
npx vite-node scripts/test-audit-hub-view-model.mjs
npx vite-node scripts/smoke-wm-druk-audit-etap2-d1.mjs
npx vite-node scripts/smoke-wm-druk-audit-etap3-s1.mjs
npx vite-node scripts/test-security-audit-log.mjs
```

**Nie ruszać bez briefu:** nowe źródła bez AUDIT · zmiana merge `cloud-sync` domen EM/schematów · `schematic_edited` bez anti-flood design

**Backlog P1.1:** `schematic_edited` przy zamknięciu sesji edycji schematu — tylko na polecenie.

---

## 6. Moduł Odbiory WM Druk (`wmprint`) — POST ZI-2026

**Status:** **COMPLETE** · ZI Tauron 2026 **PRODUCTION STABLE** · LiveCycle **CLOSED**

| Dokument | Rola |
|----------|------|
| [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md) | Skrót stanu |
| [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) | Generator, mapping, preservation |
| [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) | Moduł end-to-end |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.8 | Architektura techniczna |

### Pliki `src/lib/wm-print/`

| Plik | Prod | Opis |
|------|------|------|
| `generate-zip.ts` | **TAK** | ZIP per robota · dedupe nazw · routing typów |
| `generate-pdf-zi-tauron2026.ts` | **TAK** | Generator ZI 2026 |
| `zi-tauron2026-form-extract.ts` | **TAK** | Preservation gate (pdf.js graft) |
| `wm-print-pdf-fonts.ts` | **TAK** | Noto Sans loader |
| `wm-print-pdf-static.ts` | **TAK** | Statyczne skany PDF (copy bytes) |
| `generate-docx.ts` | **TAK** | Oświadczenia DOCX (`{{VAR}}`) |
| `wm-print-sync.ts` | **TAK** | Tombstone merge · seed guard |
| `templates.ts` · `types.ts` · `variables.ts` | **TAK** | Model szablonów i zmiennych |
| `address-vars.ts` | **TAK** | **TP203** — `parseJobAddressParts` → JOB_STREET/BUILDING/APARTMENT |
| `template-upload-toast.ts` | **TAK** | **P4** — komunikat po uploadzie szablonu |
| `WmPrintView.tsx` | **TAK** | UI admina |
| `generate-pdf.ts` | legacy | LiveCycle P0 audyty — **nie ruszać** bez audytu |
| `template-cleanup.ts` | testy | Tylko skrypty — nie UI |

### Pipeline generacji

```text
WmPrintView → downloadWmPrintZip()
  → buildWmPrintFilesForJob()
    → dedupeWmPrintTemplatesByName()
    → per szablon:
        DOCX     → generate-docx.ts
        ZI       → detectLegacyLiveCycleZiForm (guard)
                 → generatePdfZiTauron2026 (§4: **95/96/97** górny wiersz)
                 → parseJobAddressParts (TP203) → JOB_*
        pdf      → copyStaticPdfTemplate
        pdf_form → legacy gałąź (martwa w KV poza ZI)
```

### KV prod ZI

| UUID | Status |
|------|--------|
| `2b22da48-46dc-42a0-8236-d42b5b5562dc` | **Canonical** `ZI.pdf` |
| `26f02c78-871c-4d65-aeac-d0ca06bf060c` | **TOMBSTONE** LiveCycle 2021 |

### PRODUCTION CRITICAL — nie ruszać

- `generatePdfZiTauron2026` · preservation gate · `detectLegacyLiveCycleZiForm`
- tombstone sync · dedupe ZIP · pdf.js `GlobalWorkerOptions.workerSrc`
- **Nie wracać do:** XFA · LiveCycle · overlay · flatten · ciphertext · AP RE · TextField2 · widgety 429–427

### Smoke regresji

```bash
npm run build
npx vite-node scripts/test-wm-print-address-parser-tp203.mjs
npx vite-node scripts/test-wm-print-upload-toast-p4.mjs
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
npx vite-node scripts/test-wm-print-p0-1a-docx-fix.mjs
```

---

## 6i. WM Schematy jednokreskowe — **CLOSED** (2.62.49–51)

**Status:** **MVP + Visual Fidelity V2 CLOSED** · renderer **`SCHEMATIC_RENDER_VERSION = 5`**

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) | Epic SSOT — model, scope, DoD |
| [`SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md) | Release V2 — bus layout · symbole · audyt |
| [`WM-SCHEMATY-V1-DESIGN-FREEZE.md`](WM-SCHEMATY-V1-DESIGN-FREEZE.md) | Spec zamrożona |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.21 | Architektura techniczna |

### Pliki `src/lib/electrical-schematics/`

| Plik | Opis |
|------|------|
| `types.ts` · `normalize.ts` · `merge.ts` · `sync.ts` · `report.ts` | Domena + KV |
| `circuit-presets.ts` · `start-templates.ts` | Presety i szablony startowe |
| `import-from-measurement.ts` | Import jednorazowy z RAP (bez `valueSet`) |
| `layout/bus-layout-v2.ts` | **V2** — span kolumn · szyna do ostatniego obwodu |
| `layout/apartment-3f-v1.ts` · `layout/apartment-1f-v1.ts` | Layout render SVG |
| `symbols/iec-simplified.ts` | Symbole IEC |
| `render-svg.ts` | Dispatcher · `SCHEMATIC_RENDER_VERSION` |
| `export-pdf.ts` | Raster PNG @2× → pdf-lib A4 landscape |

### UI

`WmPrintSchematicsPanel.tsx` · `WmPrintSchematicEditor.tsx` · zakładka `schematy` w `wm-print-tabs.ts`

### Smoke regresji

```bash
npx vite-node scripts/test-schematic-v1b-visual-smoke.mjs
npx vite-node scripts/test-schematic-render-apartment-3f.mjs
npx vite-node scripts/test-schematic-pdf-smoke.mjs
npx vite-node scripts/test-wm-schematics-ui-3b.mjs
```

**Nie ruszać bez briefu:** `cloud-sync.ts` · model danych · `export-pdf.ts` · import EM · UI paneli.

---

## 7. Inne ukończone epiki (skrót)

| Epic | Wersja | Handoff |
|------|--------|---------|
| **P1 Document Insights** | **2.59.52** | `SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md` |
| Notatki operacyjne | 2.57–2.58 | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| P3 Wycena · BZP | 2.56 | `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| P2-H Dokumenty ZIP/7Z | 2.55 | `SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md` |
| UX.1 Workspace 5 tabs | 2.53 | `SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md` |
| P2-F Kwalifikacja | 2.51 | `SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md` |
| Dashboard V3 | 2.50.74 | `SESSION-HANDOFF-DASHBOARD-V3.md` |

---

## 8. Workflow zmiany (agent)

```text
AUDIT → PLAN → IMPLEMENT → TESTY → BUILD → COMMIT → PUSH
→ VERIFY DEPLOY → HOUSEKEEPING → EPIC CLOSE
```

**Release frontend:** tylko `git push origin main` — **nie** `vercel deploy`.

**Commit docs-only:** bez bumpu wersji UI, chyba że user prosi o release.

Szczegóły: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) · [`.cursor/rules/wgdom-development.mdc`](../.cursor/rules/wgdom-development.mdc)

---

## 9. Backlog otwarty (na polecenie użytkownika)

**Nie rozpoczynaj automatycznie** — każdy nowy EPIC wymaga świeżego AUDIT.

| Temat | Status | SSOT |
|-------|--------|------|
| **P0 Payroll Cloud Recovery** (P0.1–P0.4) | **EPIC OPEN** | `CURRENT-TASK.md` |
| P1.1 `schematic_edited` (anti-flood) | backlog | epic close report § 9 |
| Workflow Cleanup P1 | backlog | `WORKFLOW-ARCHITECTURE-v2.63.md` |
| TP200B kosztorys fidelity | PLANNED | `SESSION-HANDOFF-TP200-PLANNED.md` |
| P2-H.7 · P3 Export notatki · P2-G.3D/E · P2-F.6 | backlog | `PROJECT-HANDOFF-CURRENT.md` § 11 |

---

## 10. Struktura repo (skrót)

```text
src/app/              UI — widoki, router, App.tsx
src/lib/              Logika domenowa (preferuj rozszerzanie lib, nie App.tsx)
src/config/           Supabase config
supabase/functions/   Edge API (KV, storage, email, BZP proxy)
docs/                 Handoffy, ARCHITECTURE, workflow
scripts/              Smoke / testy vite-node (nie commitować _tmp*)
audit/                Raporty śledztw (ZI, WM Druk) — wiele plików nie w git
public/               Statyczne assety (fonts, zi-tauron-2026-template.pdf)
e2e/                  Playwright
```

**Nie commitować:** `music/`, `restore-lista-plac-*.json`, artefakty `scripts/_tmp*`, większość `audit/*.pdf` (lokalne dowody).

---

## 11. Szybkie komendy

```bash
npm run dev              # localhost:5173
npm run build            # dist/ + sw.js
npm run test:mobile      # Playwright prod
curl -s https://www.wgdom.fun/version.json   # VERIFY FAST
```

---

*Ostatnia aktualizacja: 2026-06-26 · prod **2.62.77** · runtime **21d4a1b** · P1 Audit Hub WM EPIC CLOSED*
