# W&G DOM — mapa aplikacji dla agentów AI

> **Cel:** jeden dokument SSOT o **strukturze UI**, **routingu**, **funkcjach domenowych** i **przepływie danych** — bez czytania `App.tsx` od zera.  
> **Prod:** UI **2.65.35** · runtime **`fce7b78`** · https://www.wgdom.fun · **GREEN**  
> **Data:** 2026-07-20 · **PAYROLL-CLOUD-RESURRECTION-01 CLOSED** · **PAYROLL-P0-WEEK-ROLLOVER-01 CLOSED** · STABILIZATION WINDOW ACTIVE

> **★ LISTA PŁAC:** moduł **krytyczny produkcyjnie**. Przed zmianą sync/merge/Edge/payroll → [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · **nie omijaj** `payroll-bootstrap-resurrection-fence.ts` · [`architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md). FEATURE ≠ CORE (#CORE-013). Owner GO: [`WORKFLOW-OWNER-GO.md`](WORKFLOW-OWNER-GO.md).

**Powiązane (głębiej):** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 11 (sync) · § 15 (widoki) · [`AGENT-ONBOARDING.md`](AGENT-ONBOARDING.md) · [`AGENT-CONTINUITY-GUIDE.md`](AGENT-CONTINUITY-GUIDE.md)

---

## 1. Kiedy czytać ten plik

| Pytanie agenta | Gdzie szukać |
|----------------|--------------|
| Jakie są widoki / zakładki admina? | **§ 2** |
| Gdzie jest routing i menu? | **§ 3** |
| Jakie pliki lib obsługują moduł X? | **§ 4** |
| Jakie klucze KV / LocalStorage? | **§ 5** |
| Jak działa sync i Audit Hub? | **§ 6–7** |
| Co jest zamknięte / nie ruszać? | **§ 8** |
| Ostatnie releasy payroll / audit | **§ 9** |

**Nie duplikuj** pełnej architektury syncu — szczegóły w `ARCHITECTURE.md` § 11.

---

## 2. Mapa widoków admina (`View`)

**Router:** `src/app/admin/AdminViewRouter.tsx`  
**Menu + ACL widoczności:** `src/app/admin/admin-nav.ts` (`buildAdminNavItems`)  
**Stan `view`:** `src/app/App.tsx` (`setView`, `handleAuditHubDeepLink`)

| `View` | Etykieta | Komponent | Funkcja (skrót) |
|--------|----------|-----------|------------------|
| `dashboard` | Pulpit | `DashboardView.tsx` | Alerty, skróty, CC przetargów |
| `payroll` | Lista Płac | `PayrollView.tsx` | Godziny, wypłaty, archiwum tygodnia, przydziały robót, baner restore (RB) |
| `schedule` | Grafik | `App.tsx` | Widok Pn–So z listy płac |
| `directory` | Kadry | `TeamDirectoryContactsView.tsx` | Kartoteka + zakładka kontakty |
| `contacts` | *(w Kadry)* | `ContactsView.tsx` | Routing wewnętrzny kadry |
| `archive` | Archiwum | `ArchiveView.tsx` | Zapisane tygodnie LP |
| `jobs` | Roboty | `JobsView.tsx` | CRUD robot, dokumenty, zdjęcia, workEntries, billing |
| `wmprint` | Odbiory WM Druk | `WmPrintView.tsx` | Odbiory · Pomiary · Schematy · Katalog · Historia |
| `tenders` | Przetargi | `TendersModule.tsx` | Pipeline BZP, workspace V4 (ACL) |
| `operationalnotes` | Notatki operacyjne | `OperationalNotesView.tsx` | Baza wiedzy + audit trail notatek |
| `audit` | Audit Hub | `AuditHubView.tsx` | **Super Admin** — agregacja 7 źródeł logów (read-only) |
| `inspector` | Inspektor | `InspectorAdminView.tsx` | Feed zmian terenowych |
| `recoverablecharges` | Do rozliczenia | `RecoverableChargesView.tsx` | Pozycje do odzyskania |
| `media` | Zdjęcia i pliki | `MediaView.tsx` | Galeria + Files Hub |
| `guide` | Instrukcja | `GuideView.tsx` | `mode="instructions"` (ACL) |
| `changelog` | Zmiany | `GuideView.tsx` | `mode="changes"` · `changelog-data.ts` |
| `workcatalog` | *(legacy)* | redirect → Przetargi / Biblioteka | WC-P2.1 |

**Mobile bottom nav (4):** `dashboard` · `payroll` · `schedule` · `jobs` — reszta w „Więcej” (`MOBILE_NAV_PRIMARY` w `admin-nav.ts`).

**Tryby poza adminem:** `AppInnerWithAuth.tsx` — **admin** | **inspector** (`InspectorPanel.tsx`) | **worker** (telefon + PIN).

**Inspektor — stan osobny:** `InspectorPanel` trzyma `jobsAll` w `useState` (nie `App.tsx`). Widoczność: `filterJobsForInspector(jobsAll, session.id)`. **NG-09 EPIC COMPLETE (2.63.84):** workspace 5 seams — `InspectorShell` · `InspectorViewRouter` · `InspectorJobWorkspace` · `useInspectorDataSync` · `InspectorOverlays`. SSOT: [`architecture/NG-09-EPIC-CLOSE-REPORT.md`](architecture/NG-09-EPIC-CLOSE-REPORT.md).

---

## 3. Przepływ shell aplikacji

```text
main.tsx
  └── AppInnerWithAuth.tsx          ← login, sesja admin/inspector/worker
        ├── App.tsx                 ← ★ shell admin: state LS, sync, setView
        │     ├── AdminSidebar / AdminTopbar / AdminMobileNav
        │     ├── AdminViewRouter   ← lazy *View.tsx per view
        │     └── modale globalne (ustawienia, SMS, search, …)
        ├── InspectorPanel          ← izolowany sync + jobsAll (kw-jobs)
        └── WorkerPhotoView
```

### 3.1 `App.tsx` — odpowiedzialności (nie czytaj całości)

| Obszar | Funkcje / stan | Pliki lib |
|--------|----------------|-----------|
| **Routing** | `view`, `setView`, deep linki Audit Hub | `audit-hub/deeplink.ts` |
| **Sync** | `runCloudSync`, `pullFromCloudAndMerge`, status chmury | `cloud-sync.ts` |
| **Payroll** | `saveWeek`, `restoreWeekFromArchive`, rollover | `payroll-week-roster-bundle.ts` (PWRB), `payroll-rollover.ts`, `payroll-cycle.ts` |
| **Jobs** | `deleteJobsByIds`, merge jobs | `cloud-sync.ts`, `job-activity.ts` |
| **Audit props** | `securityAuditLog`, `wmDrukAuditLog`, `operationalNotesAuditLog` | `security-audit-log.ts`, `wm-druk-audit.ts` |
| **AUX refresh** | `refreshAuditHubAuxFromCloud` (AH-REG-1) | `pullSecurityAuditLogFromCloud`, `pullWmDrukAuditLogFromCloud` |

**Bootstrap:** `CloudLoader.tsx` — fazy `BOOTSTRAP_CORE_KEYS` / `BOOTSTRAP_DEFERRED_KEYS` (`cloud-sync.ts`).

### 3.2 Lazy chunks

Duże widoki ładowane dynamicznie w `AdminViewRouter.tsx` (m.in. `JobsView`, `PayrollView`, `TendersModule`, `AuditHubView`, `WmPrintView`).

---

## 4. Moduły domenowe — gdzie jest logika

### 4.1 Lista Płac (PAYROLL)

| Warstwa | SSOT | Uwagi |
|---------|------|-------|
| UI tygodnia | `PayrollView.tsx`, `WeekEmployeeDetail.tsx` | Baner restore: `shouldShowPayrollRestoreBanner` (`cloud-sync.ts`) |
| Przydziały | `PayrollJobAssignmentsPanel.tsx` | `job.workEntries[]` w `kw-jobs` |
| Merge / guard | `cloud-sync.ts` | `finalizePayrollBundleMerge`, `mergeWeekEmployees`, `CloudSyncMutationGuard` |
| Rollover | `payroll-rollover.ts` | `autoArchiveAndAdvance`, `pushPayrollWeekAfterRollover` |
| Edge parity | `payroll-week-employee-merge.ts` | B6 — wspólny kernel z Edge |

**KV:** `kw-week-employees`, `kw-weekFrom`, `kw-weekTo`, `kw-archive`, `kw-directory`, `kw-employee-leaves`. **Tombstony** `kw-week-employees-deleted-ids` = **TYLKO LOKALNE** (nie synchronizowane → root cause resurrection; naprawa w S7-5).

**Closeout:** B3 Guard · B4 merge SSOT · B5 closed week UI · B6 Edge parity · RB restore banner (2.63.24).

> **🔴 P0 ACTIVE:** merge Payroll = **UNION** + tombstony lokalne + `batch-set` `kv.mset` all-or-nothing → resurrection pracowników i ryzyko 500. Zanim zmienisz `mergeWeekEmployees*` / Edge / tombstony → **[`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)**.

### 4.2 Roboty (JOBS)

| Warstwa | SSOT |
|---------|------|
| UI lista + detal | `JobsView.tsx`, `JobDetailSectionNav` |
| Aktywność / feed | `job-activity.ts` → `job.activityLog[]` |
| Pliki / zdjęcia | `job-file-upload.ts`, `job-photo-upload.ts`, `JobFilesHub` |
| Inspektor | `InspectorPanel.tsx` (osobna aplikacja w trybie inspector) |

**KV:** `kw-jobs` (+ tombstones `kw-jobs-deleted-ids`).

### 4.3 WM Druk

| Zakładka | UI | Log / Audit Hub |
|----------|-----|-----------------|
| Odbiory | `WmPrintView` (szablony, ZIP) | `kw-wm-print-history` → `wm_print` |
| Pomiary | `JobElectricalMeasurementsPanel`, `MeasurementCatalogPanel` | `recordWmDrukAudit` → `wm_druk` |
| Schematy | `WmPrintSchematicsPanel` | `recordWmDrukAudit` → `wm_druk` |
| Pakiety odbiorowe | publikacje | `kw-delivery-package-publications` → `delivery_package` |

**KV:** `kw-wm-print-*`, `kw-electrical-measurements`, `kw-electrical-schematics`, `kw-wm-druk-audit-log` (AUX).

### 4.4 Przetargi

| Element | Plik |
|---------|------|
| Moduł 5 zakładek | `TendersModule.tsx` |
| Provider / pipeline | `tenders/context/TendersProvider.tsx` |
| Detal V4 | `TenderDetailPanel.tsx` + workflow hub/strip/CTA |
| SSOT Workflow | **`docs/WORKFLOW-ARCHITECTURE-v2.63.md`** (obowiązkowe przed zmianą) |

**KV:** `kw-tenders-pipeline`, `kw-tenders-company-profile`, kosztorys / katalog / bundles.

### 4.5 Notatki operacyjne

| Element | Plik / KV |
|---------|-----------|
| UI | `OperationalNotesView.tsx` |
| Audit trail | `operational-notes-audit.ts` → `kw-operational-notes-audit-log` |
| Odczyt / ACK | `operational-notes-read-state.ts` |

### 4.6 Audit Hub (read-only)

| Element | Plik |
|---------|------|
| UI | `AuditHubView.tsx` |
| Agregacja | `src/lib/audit-hub/adapters.ts` → `buildAuditFeed()` |
| 7 źródeł | `types.ts` — `AUDIT_FEED_SOURCES` |
| ACL | `audit-hub/acl.ts` — Super Admin only |
| Freshness (2.63.25) | `notifySecurityAuditLogChanged` + `refreshAuditHubAuxFromCloud` |

**Nie loguje:** payroll save/restore tygodnia, auto-sync (MVP-1C backlog).

### 4.7 Kadry / auth

| Element | Plik |
|---------|------|
| Logowanie admin | `LoginScreen.tsx`, `AppInnerWithAuth.tsx` |
| Konta / role | `admin-auth.ts` |
| Security audit | `security-audit-log.ts` |
| Kartoteka | `DirectoryView.tsx` (w `TeamDirectoryContactsView`) |

---

## 5. Magazyn danych

### 5.1 `DATA_KEYS` (sync główny)

Zdefiniowane w `src/lib/cloud-sync.ts` — **każdy nowy typ trwały MUSI trafić do tej tablicy** (lub świadomie AUX jak audit).

Rdzeń operacyjny: `kw-directory`, `kw-week-employees`, `kw-archive`, `kw-weekFrom`, `kw-weekTo`, `kw-jobs`, `kw-contacts`, `kw-employee-leaves`, `kw-recoverable-charges`, `kw-operational-notes`, WM Druk, EM, tenders, work-catalog, …

### 5.2 Klucze AUX (poza `DATA_KEYS`)

| Klucz | Rola | Pull helper |
|-------|------|-------------|
| `kw-security-audit-log` | Security / recovery events | `pullSecurityAuditLogFromCloud` |
| `kw-wm-druk-audit-log` | Pomiary/Schematy audit | `pullWmDrukAuditLogFromCloud` |
| `kw-operational-notes-audit-log` | Audit notatek | `pullOperationalNotesAuxFromCloud` |
| `kw-inspector-stats` | Logowania inspektora | `syncInspectorStatsFromCloud` |
| `kw-app-settings` | Flagi ACL (instrukcja, zmiany) | `app-settings.ts` |

**AH-REG-1:** `refreshAuditHubAuxFromCloud()` w `App.tsx` — pull security + wm-druk po `runCloudSync` i w `pullFromCloudAndMerge`.

### 5.3 Edge

`supabase/functions/make-server-0afb8820/index.tsx` — `batch-get` / `batch-set`, merge payroll (B6), backup jobs/payroll. **Brak** logiki Audit Hub po stronie Edge.

---

## 6. Sync — skrót dla agentów

```text
Zapis lokalny (useLocalStorage / setItem)
  → runCloudSync / pushKeysToCloud / pushMergedDataBundleToCloud
  → Edge batch-set → Supabase KV

Odczyt / merge
  → pullFromCloudAndMerge (focus tab) lub CloudLoader (boot)
  → pullAndMergeDataBundle + finalizePayrollBundleMerge (B4)
  → refreshAuditHubAuxFromCloud (AUX, AH-REG-1)
```

| Guard | Plik | Kiedy |
|-------|------|-------|
| Roster LP | `cloud-sync-mutation-guard.ts` | push `kw-week-employees`, rollover |
| Payroll shrink | `wouldBlockPayrollShrink` | batch-set blokada utraty godzin |
| Jobs delete in flight | `App.tsx` refs | blokuje pull podczas usuwania |

**Szczegóły:** `ARCHITECTURE.md` § 11 · `PAYROLL-GUARD-PHASE-CLOSEOUT.md` · **`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`** (🔴 P0: pełny przepływ + Edge merge + oba problemy).

---

## 7. Testy — mapa per moduł

| Moduł | Skrypt(y) |
|-------|-----------|
| Audit Hub | `test-audit-hub-adapters.mjs`, `test-audit-hub-view-model.mjs`, `test-audit-hub-freshness-ah-reg-1.mjs` |
| Security log | `test-security-audit-log.mjs` |
| Payroll B3–B6, RB | `test-payroll-roster-guard-phase2.mjs`, `test-payroll-edge-parity-b6.mjs`, `test-payroll-closed-week-ui-rca2.mjs`, `test-payroll-restore-banner-false-positive.mjs` |
| Przetargi smoke TI-B4 | `scripts/test-tenders-stabilization-smoke.mjs` · `npm run test:infra -- --gate B --scope tenders` |
| TEST-INFRA orchestrator | `npm run test:infra:validate` · `--suite lib-payroll-core` · `--suite smoke-stabilization-ng01-04` · `npm run test:e2e:payroll-guard` |
| WM druk audit | `test-wm-druk-audit.mjs` |
| Przetargi workflow | `test-tender-workflow-hub.mjs`, … |

Przed release: `npm run build` + testy modułu + **jedno** `GET /version.json`.

---

## 8. Zamknięte epici — nie rozszerzać bez AUDIT

| Epic | Wersja | SSOT |
|------|--------|------|
| **PAYROLL-CLOUD-RESURRECTION-01** | **2.65.35** (`fce7b78`) | `architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md` |
| **PAYROLL-P0-WEEK-ROLLOVER-01** | **2.65.34** (`e38610a`) | `architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md` |
| **INSPECTOR-RUNTIME-STATE-01** | **2.63.73** (`e9720de`) | `recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md` |
| **NG-08-01** Workspace Frame | **2.63.73** (`84b1491`) | `architecture/NG-08-TEUX-PLAN.md` |
| NG-07-TEUX-01 Lista | 2.63.69–72 | `architecture/NG-07-TEUX-01-CLOSEOUT.md` |
| NG-04 BOQ PRO | 2.63.12 | `NG-04-EPIC-CLOSE-REPORT.md` |
| PAYROLL B3–B6 | 2.63.18–23 | `PAYROLL-GUARD-PHASE-CLOSEOUT.md`, B5/B6 closeout |
| Restore banner RB | 2.63.24 | `PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md` |
| Audit Hub freshness AH-REG-1 | 2.63.25 | `AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md` |
| **TI-B4** smoke agregat NG-01–04 | **2.63.27** | `TI-B4-CLOSEOUT.md` · Z-04 PASS |
| **TEST-INFRA-001** harness MVP | **2.63.26** | `TEST-INFRA-001-CLOSEOUT.md` · TI-B1–B3 backlog |
| **NG-06-TEUX** Tender Design System | **2.63.54–66** | `NG-06-TEUX-EPIC-CLOSE-REPORT.md` · smoke `SMOKE-TEUX-NG06` |
| Audit Hub MVP + WM P1 | 2.62.36–77 | `SESSION-HANDOFF-AUDIT-HUB.md` |
| Mobile Recovery | 2.62.78–79 | `SESSION-HANDOFF-MOBILE-RECOVERY-EPIC-CLOSE.md` |

**STABILIZATION WINDOW:** brak nowych epiców — `STABILIZATION-WINDOW-PLAN.md`.

**Nie ruszać bez AUDIT + Owner GO:** `payroll-bootstrap-resurrection-fence.ts` · `classifyPayrollWeekTransition` · `finalizePayrollBundleMerge` · PWRB · Edge payroll merge.

---

## 9. Ostatnie releasy (skrót — pełna lista w PROJECT-HANDOFF-CURRENT)

| Wersja | Commit | Bundle | Zakres |
|--------|--------|--------|--------|
| **2.65.35** | `fce7b78` | PAYROLL-CLOUD-RESURRECTION-01 | bootstrap freshness fence |
| **2.65.34** | `e38610a` | PAYROLL-P0-WEEK-ROLLOVER-01 | ALIGN vs ROLLOVER |
| **2.63.73** | `e9720de` | INSPECTOR-RUNTIME-STATE-01 | `setJobsAll` hydratacja · smoke 15/2 |
| **2.63.73** | `84b1491` | NG-08-01 | Workspace Frame CTA + breadcrumb |
| **2.63.72** | `08a6649` | NG-07-04 | Desktop list density |
| **2.63.66** | `80cf911` | NG-06 TEUX-7z | Epic closeout · smoke `SMOKE-TEUX-NG06` 12/12 |
| **2.63.65** | `a6da2c9` | TEUX-7f | Hosted deprecation guard |
| **2.63.64** | `f0a49cf` | TEUX-7e | Strategia + Pulpit KPI |
| **2.63.60–63** | `bc4b232`→`129f22d` | TEUX-7a…7d | Phase 2 polish |
| **2.63.54–59** | `5a8b820`→`ead4de7` | TEUX-1…6 | Phase 1 core UX Przetargi |
| **2.63.30** | `35f37b1` | RC-B-1 | PWRB facade + tombstone revocation I-1…I-4 |
| *(cleanup)* | `24bde6e` | RC-B overlay | Usunięcie debug overlay (wersja UI bez zmian) |
| **2.63.27** | `6c94223` | TI-B4 | Smoke agregat NG-01–04 · manifest 1.1.0 · Gate B `scope:tenders` |
| **2.63.26** | `3d6dd90` | TEST-INFRA-001 | Manifest SSOT + orchestrator + PAYROLL-GUARD-S1 E2E |
| **2.63.25** | `d9ba13f` | AH-REG-1 | Audit Hub freshness — notify + AUX pull on sync |
| **2.63.24** | `727e6c4` | RB | Restore banner → `payrollMetrics` |
| **2.63.23** | `d670892` | B6 | Edge parity `mergeWeekEmployees` |
| **2.63.22** | `187afb8` | B5 | Closed week UI read-only |
| **2.63.21** | `b3d5664` | B4 | `finalizePayrollBundleMerge` SSOT |

**Verify prod:** `curl https://www.wgdom.fun/version.json`

---

## 10. Szybkie grep dla agentów

```bash
# Widok po nazwie
rg "case \"payroll\"" src/app/admin/AdminViewRouter.tsx
rg "setView\\(\"jobs\"\\)" src/app

# Klucz KV
rg "kw-week-employees" src/lib/cloud-sync.ts

# Hook audit
rg "recordSecurityAudit|recordWmDrukAudit" src/

# Test modułu
npx vite-node scripts/test-audit-hub-freshness-ah-reg-1.mjs
```

---

*Utrzymuj ten plik przy nowych widokach, kluczach KV lub zmianie routing — równolegle z `ARCHITECTURE.md` § 15.*
