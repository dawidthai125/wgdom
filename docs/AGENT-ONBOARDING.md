# W&G DOM — onboarding agenta AI / programisty

> **Cel:** jeden dokument startowy — jak działa aplikacja, gdzie szukać prawdy, czego nie ruszać.  
> **Prod:** **2.62.10** · https://www.wgdom.fun · **PDF WM Recovery CLOSED** · **TP200 PLANNED** · P1 Document Insights · POST ZI-2026 · WM Druk **COMPLETE** · EM-P1R **COMPLETE**

---

## 1. Kolejność czytania (obowiązkowa)

```text
1. docs/AGENT-ONBOARDING.md           ← TEN PLIK (mapa systemu)
2. docs/PROJECT-HANDOFF-CURRENT.md    ← baseline prod, commity, releasy
2a. docs/SESSION-HANDOFF-PDF-WM-RECOVERY.md  ← ★★ PDF WM Recovery CLOSED (2.62.10)
2b. docs/SESSION-HANDOFF-TP200-PLANNED.md    ← ★★ Następny epic (parserVersion + fidelity)
2c. docs/SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md  ← ★★ merge jakościowy kosztorysu
2d. docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md  ← ★★ P1 Owner View · modal · Executive Summary
3. docs/MASTER-HANDOFF-POST-ZI-2026.md ← skrót POST ZI · WM Druk COMPLETE
4. docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md ← ★★ Pomiary Elektryczne EM-P1R
5. docs/ZI-2026-HANDOFF.md            ← SSOT generatora ZI Tauron 2026
6. CURRENT-TASK.md                    ← status sesji / backlog
7. docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md  ← ★ Przydziały robót z Listy Płac (P1)
8. docs/ARCHITECTURE.md               ← pełna architektura (living document)
8. AGENTS.md                          ← workflow, zakazy, lista handoffów
9. docs/WORKFLOW-RELEASE-DEPLOY.md    ← release A/B/C + VERIFY FAST
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
| `tenders` | Przetargi | `TendersModule.tsx` (5 zakładek) |
| `wmprint` | Odbiory WM Druk + **Pomiary** | `WmPrintView.tsx` |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` |
| `media` | Zdjęcia i pliki | `MediaView.tsx` |
| `inspector` | Inspektor (admin feed) | `InspectorAdminView.tsx` |
| `guide` | Zmiany / Instrukcja | `GuideView.tsx` |

Router: `AdminViewRouter.tsx` · mobile: `mobile.css`, bottom nav 4 pozycje.

---

## 5. Sync i chmura (KRYTYCZNE)

**SSOT:** `src/lib/cloud-sync.ts` · **ARCHITECTURE § 11**

| Zasada | Szczegół |
|--------|----------|
| Trwałe dane | Zawsze LS + push do KV przez `DATA_KEYS` |
| Partial push | `prepareKeysForCloudPush` — nie omijać |
| Merge | Per-klucz w `mergeDataKey` — **nie zgaduj** semantyki |
| Payroll Guard | Blokuje push gdy lista płac „kurczy się” >50% |
| Admin hasła | Osobny merge `mergeAdminPasswordOverrides` |
| Bootstrap | `CloudLoader.tsx` — P11 payroll, P15 admin passwords |

**Incydenty:** `docs/INCIDENTS-2026-06.md`

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

## 6f. Przetargi — PDF WM Recovery — **2.62.10 CLOSED**

**Status:** **TP196–TP198C CLOSED** · commit **`1992340`** · TP182 **86→123 pozycji**

| Dokument | Rola |
|----------|------|
| [`SESSION-HANDOFF-PDF-WM-RECOVERY.md`](SESSION-HANDOFF-PDF-WM-RECOVERY.md) | **★★ SSOT** — milestone’y, testy, pułapki |
| [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md) | Następny epic |

**Kluczowy plik:** `src/lib/pdf-przedmiar-heuristic.ts`

**Smoke:**

```bash
npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
npx vite-node scripts/test-tp182-pdf-wm-recovery.mjs
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
                 → generatePdfZiTauron2026 (§4: 99/111/112)
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
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
npx vite-node scripts/test-wm-print-p0-1a-docx-fix.mjs
```

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
AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → CHANGELOG → HelpView (jeśli UI)
→ ARCHITECTURE.md (jeśli architektura) → CURRENT-TASK + PROJECT-HANDOFF-CURRENT
→ COMMIT → PUSH → VERIFY DEPLOY FAST (curl version.json) → RAPORT
```

**Release frontend:** tylko `git push origin main` — **nie** `vercel deploy`.

**Commit docs-only:** bez bumpu wersji UI, chyba że user prosi o release.

Szczegóły: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) · [`.cursor/rules/wgdom-development.mdc`](../.cursor/rules/wgdom-development.mdc)

---

## 9. Backlog otwarty (na polecenie użytkownika)

- **TP200A** — `parserVersion` + rescan legacy dossier
- **TP200B** — kosztorys fidelity (`rows` cap, `pickBetterKosztorys` w parse loop)
- **smartpzp.pl** adapter (discover stub)
- P3-FIX-C-UX-001 — komunikat lazy dossier na Owner View
- P2-H.7 Edge magic bytes 7z
- Notatki operacyjne P3 Export
- **Command Center — porzucony, nie wraca**

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

*Ostatnia aktualizacja: 2026-06-19 · PDF WM Recovery v2.62.10 · TP200 PLANNED · PAYROLL-ASSIGNMENTS-P1 · EM-P1R · POST ZI-2026*
