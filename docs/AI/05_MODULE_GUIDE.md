# 05 — Module Guide (WGDOM)

> Mapa operacyjna. Pełna tabela widoków: [`docs/AGENT-APP-MAP.md`](../AGENT-APP-MAP.md).

---

## 1. Shell / Bootstrap / Auth

| | |
|--|--|
| **Cel** | Start aplikacji, hydracja, routing ról |
| **Pliki** | `main.tsx`, `App.tsx`, `CloudLoader.tsx`, `AdminViewRouter.tsx`, `admin-auth.ts` |
| **Na co uważać** | Nie montuj App przed CORE payroll persist; resurrection fence; nie czytaj całego `App.tsx` |

---

## 2. Cloud Sync

| | |
|--|--|
| **Cel** | LS ↔ KV merge/push |
| **Pliki** | `src/lib/cloud-sync.ts`, `cloud-batch-set-retry.ts`, `cloud-sync-mutation-guard.ts` |
| **Hooki** | wywołania z App / CloudLoader / domain persist |
| **Na co uważać** | #CORE-013; Payroll Guard; Domain Push; prepareKeysForCloudPush; nie mieszać z FEATURE UI |

---

## 3. Payroll (Lista Płac)

| | |
|--|--|
| **Cel** | Tygodnie, godziny, archiwum, przydziały |
| **UI** | `PayrollView.tsx` |
| **Lib** | `payroll-*.ts` · PWRB · `payroll-bootstrap-resurrection-fence.ts` · `payroll-hours-collapse-gate.ts` · `payroll-write-path-telemetry.ts` · `payroll-prev-recovery.ts` · `payroll-soft-restore.ts` · `payroll-domain-sync.ts` |
| **KV** | `kw-week-employees` · deleted-ids · `-prev` · archive · directory |
| **Na co uważać** | Tylko PWRB (W1) · Domain Push sole write (D6) · Domain Gate + intentionalHoursClear · factory PURE · fence · rollover · #CORE-013 |
| **SSOT AI** | [`PAYROLL-ARCHITECTURE-SSOT.md`](../PAYROLL-ARCHITECTURE-SSOT.md) |
| **Sync guide** | [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |
| **Closeout** | [`PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |

---

## 4. Jobs (Roboty)

| | |
|--|--|
| **Cel** | Joby admin/worker/inspector |
| **UI** | `JobsView.tsx`, `InspectorPanel.tsx`, … |
| **Lib** | jobs helpers w `src/lib/`, merge photos |
| **KV** | `kw-jobs` |
| **Na co uważać** | union photos + tombstones; delete job IDs; write-first admin bundle (JOBS-SYNC-FIX) |

---

## 5. Tenders / Pipeline / Heavy

| | |
|--|--|
| **Cel** | BZP pipeline → dokumenty → dossier → wycena → Autonomous |
| **UI** | `TendersModule`, `TenderDetailPage`, `TenderPrzetargWorkspace`, TEUX panels |
| **Hooks** | `useTendersPipeline`, `useTenderPipelineRuntime`, `useTenderDocumentsBootstrap`, `useTenderDossierHeavyLazy`, `useTenderPricingAuto` |
| **Lib** | `tenders-bzp.ts`, `tender-dossier-pipeline.ts`, `tender-pipeline/*`, `unified-attachment-gate.ts`, coalesce |
| **KV** | `kw-tenders-pipeline`, keywords, settings |
| **Na co uważać** | Sync Storm P0 kontrakt; fat key; bootstrap bez local mode = cloud load; TOKEN FREEZE TEUX |
| **Workflow SSOT** | `WORKFLOW-ARCHITECTURE-v2.63.md` |

---

## 6. Work Catalog (Biblioteka Robót)

| | |
|--|--|
| **Cel** | Katalog pozycji / pakiety do wyceny |
| **Lib** | `src/lib/work-catalog/` |
| **KV** | `kw-wgdom-work-catalog`, `kw-wgdom-work-bundles` |
| **Na co uważać** | FREEZE docs; legacy cost-catalog w starych ścieżkach |

---

## 7. WM Print / Pomiary / Schematy

| | |
|--|--|
| **Cel** | Odbiory ZI, DOCX pomiary, schematy |
| **UI** | `WmPrintView.tsx` |
| **Lib** | `src/lib/wm-print/`, `electrical-measurements/`, `electrical-schematics/` |
| **Na co uważać** | ZI 2026 STABLE — nowe tylko po AUDIT; Audit Hub źródło `wm_print` |

---

## 8. Dashboard / Schedule / Notes / Audit

| Moduł | UI | Uwagi |
|-------|-----|-------|
| Pulpit | `DashboardView.tsx` | V3 SSOT |
| Grafik | w `App.tsx` | |
| Notatki | `OperationalNotesView.tsx` | |
| Audit Hub | `AuditHubView.tsx` | Super Admin; read-only agregacja |

---

## 9. Media / Files / Delivery

| | |
|--|--|
| **UI** | `MediaView.tsx`, Files Hub panele |
| **Na co uważać** | Storage URLs; martwe URL historyczne |

---

## 10. Theme

| | |
|--|--|
| **Pliki** | `WgdomThemeProvider`, CSS variables, `#THEME-020` |
| **Status** | THEME-01C COMPLETE |
| **Na co uważać** | Nie łamać Light/Dark SSOT |

---

## 11. Storage / IDB (ARCH-02)

| | |
|--|--|
| **Cel** | Budżet LS, cold IDB, telemetria `__WG_STORAGE__` |
| **Status A–E** | CLOSED 2.65.28 |
| **02F facade** | GO / NOT STARTED — nie implementuj bez GO |
| **Na co uważać** | Nie mylić z Sync Storm; lokalne WT 02F nie mieszać w CORE commit |

---

## 12. Test harness / infra

| | |
|--|--|
| **Cel** | Prod sandbox tooling H0–H5 |
| **Docs** | `TEST-HARNESS-01-H5-CLOSEOUT.md`, `TEST-INFRA-LIFECYCLE.md` |
| **Na co uważać** | H0.x / H3-B/C tylko po Owner GO |

---

## Punkty wejścia (szybkie)

| Chcę… | Otwórz |
|-------|--------|
| Zmienić sync | Payroll Guide + ARCHITECTURE §11 + Owner GO CORE |
| Zmienić heavy dossier | Sync Storm DF/release + `useTenderDossierHeavyLazy` |
| Zmienić UX przetargu | WORKFLOW-ARCHITECTURE + TEUX freeze |
| Dodać widok admina | AdminViewRouter + AGENT-APP-MAP |
| Edge | `make-server-0afb8820/index.tsx` + SUPABASE-DEPLOY |
