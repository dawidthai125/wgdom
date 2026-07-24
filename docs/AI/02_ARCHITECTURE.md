# 02 — Architecture (WGDOM)

> **SSOT techniczny living:** [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (~pełny przewodnik).  
> Ten plik = skondensowana mapa dla AI.

---

## 1. Frontend (nie Next.js)

| Fakt | Wartość |
|------|---------|
| Framework | **React 18** + **Vite** |
| Routing | `react-router` (BrowserRouter) — nie App Router Next |
| Entry | `src/main.tsx` → `App.tsx` / `CloudLoader` |
| Code split | lazy chunks per widok (`TendersModule`, `PayrollView`, …) |
| Theme | `WgdomThemeProvider` · next-themes pattern · `#THEME-020` |

**Nie ma Next.js** w stacku produkcyjnym. Nie zakładaj SSR / RSC.

---

## 2. Warstwy

```text
UI (Views / Panels)
  → Hooks (useTendersPipeline, useTenderPipelineRuntime, useLocalStorage, …)
  → Domain libs (tenders-*, payroll-*, jobs-*, work-catalog, wm-print)
  → Persistence adapters (LS + cloud-sync persistKey)
  → Edge HTTP (batch-get / batch-set / upload / BZP proxies)
  → Supabase KV store + Storage buckets
```

---

## 3. Supabase / Cloud / Storage

| Element | Rola |
|---------|------|
| Project ID | `bdpygdvfgbggermvqtys` |
| Edge | `supabase/functions/make-server-0afb8820/` — jedyny backend app |
| KV | tabela/store przez Edge `kv_store` — klucze `kw-*` |
| Storage | zdjęcia jobów, dokumenty, backupy |
| Auth | Admin passwords (hash) + worker PIN; Supabase Auth używane wąsko |

**Deploy Edge:** push zmian w `supabase/functions/**` → GitHub Action `deploy-supabase.yml` (nie Vercel).

---

## 4. Local Storage + KV + Sync

**Working copy:** `localStorage` (oraz cold paths IDB po LOCALSTORAGE-ARCH-02 A–E).  
**Cloud copy:** KV keys w `DATA_KEYS` / domain lists.

| Mechanizm | Plik / idea |
|-----------|-------------|
| Bootstrap | `CloudLoader.tsx` — fetch → merge → gate → App |
| Runtime sync | `cloud-sync.ts` — `runCloudSync`, `persistKey`, merge |
| Payroll Domain Push | #CORE-015 — LP poza pełnym RS subset |
| Resurrection fence | `payroll-bootstrap-resurrection-fence.ts` — empty Cloud ≫ stale LS |
| Jobs photos | `mergePhotos` + `deletedPhotoTombstones` |
| Tenders pipeline | `kw-tenders-pipeline` — fat key; coalesce + persist modes |

**SSOT zasady:**

1. Trwałe dane = LS **i** Cloud (nie tylko React state).  
2. Merge po timestamp / dedykowanych merge’ach (payroll, admin passwords, photos).  
3. Tombstones przy delete (jobs, photos, passwords).  
4. Partial push przez `prepareKeysForCloudPush`.

---

## 5. Pipeline / Tender Engine

```text
Lista BZP (TendersProvider / useTendersPipeline)
  → TenderDetail / Autonomous Gate
  → useTenderPipelineRuntime
       ├─ useTenderDocumentsBootstrap   (discovery / shell)
       ├─ useTenderDossierHeavyLazy     (cost → enrich; Sync Storm P0)
       ├─ useTenderPricingAuto
       └─ useTenderTrustAssessment
  → Persist: local | cloud (coalesce force)
  → Edge batch-* ↔ KV kw-tenders-pipeline
```

**Krytyczne kontrakty Sync Storm P0:**

- E-RUN deps **bez** `builtAt` (`HEAVY_E_RUN_DEP_KEYS`).  
- Partial `{ persist: "local" }`; final `{ persist: "cloud" }`.  
- Circuit breaker max **2** per `(itemId, gateFingerprint, retryNonce)`.  
- Generation guard — cancel tylko przy zmianie prawdziwych deps.

SSOT Workflow UI: [`docs/WORKFLOW-ARCHITECTURE-v2.63.md`](../WORKFLOW-ARCHITECTURE-v2.63.md).

---

## 6. Payroll

| Element | SSOT |
|---------|------|
| UI | `PayrollView.tsx` |
| Week roster mutations | **tylko** PWRB (`payroll-week-roster-bundle.ts`) |
| Guard shrink | `wouldBlockPayrollShrink` |
| Bootstrap | fence + `applyBootstrapPayrollMerge` + phase gate |
| Rollover | `classifyPayrollWeekTransition` ALIGN ≠ wipe |
| Agent guide | [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](../PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) |

**Reguła #1:** nowe FEATURE nie mogą regresować Listy Płac.

---

## 7. Jobs

| Temat | Mechanizm |
|-------|-----------|
| Model | `Job` w `kw-jobs` |
| Photos | union merge + tombstones |
| Delete job | `addDeletedJobId` + push |
| Inspector | osobny feed; `reconcileJobsWithFreshLocal` (ROBOTS-INSPECTOR-01) |

---

## 8. Work Catalog

| Element | Wartość |
|---------|---------|
| Moduł | `src/lib/work-catalog/` |
| KV | `kw-wgdom-work-catalog`, `kw-wgdom-work-bundles` |
| FREEZE | `docs/work-catalog/FOUNDATION-FREEZE-v1.0.md` |
| Cutover Przetargi #5C | CLOSED (2.63.44–53) |

---

## 9. Authentication

| Rola | Mechanizm |
|------|-----------|
| Admin | `admin-auth.ts` · overrides `kw-admin-passwords` (merge cloud-wins) |
| Inspector | osobny login |
| Worker | telefon + PIN |

ACL Guide/Changes: flagi w `kw-app-settings`.

---

## 10. Edge Functions (kontrakt)

Typowe endpointy (prefiks `/functions/v1/make-server-0afb8820`):

- `/health`
- `/batch-get` · `/batch-set` (KV)
- upload / signed URLs Storage
- proxy BZP / dokumenty (wg implementacji)

**Retry N1:** transient tylko `deadlock` / `40P01` ×4 — nie HTML CF 522.

---

## 11. Co jest SSOT (warstwy prawdy)

| Domeny | SSOT |
|--------|------|
| Wersja UI | `changelog-data.ts` `CHANGELOG[0]` |
| Baseline sesji | `PROJECT-HANDOFF-CURRENT.md` + `CURRENT-TASK.md` (+ ten KB dla AI) |
| Workflow Przetargi | `WORKFLOW-ARCHITECTURE-v2.63.md` |
| Cloud Sync architektura | `ARCHITECTURE.md` §11 · ADR (PROPOSED) |
| Payroll sync | Payroll Agent Guide + fence DF |
| Release | `WORKFLOW-RELEASE-DEPLOY.md` |
| Owner GO | `WORKFLOW-OWNER-GO.md` |

---

## 12. Przepływ danych (przykłady)

### 12.1 Zapis godziny LP

UI → PWRB / weekEmployees → LS → Domain Push / guard → Edge batch-set → KV.

### 12.2 Otwarcie dużego przetargu (po Sync Storm P0)

Detail mount → bootstrap discovery (może cloud) → heavy E-RUN → partial **local** → enrich → final **cloud coalesce** → brak restartu od `builtAt`.

### 12.3 Zdjęcie roboty

Upload Storage → URL w `Job.photos[]` → merge union + tombstones przy delete → sync jobs key.

---

## 13. Moduły krytyczne (Protected Core)

| Klasa | Pliki (skrót) |
|-------|----------------|
| CORE Sync | `cloud-sync.ts`, `CloudLoader.tsx` |
| CORE Payroll | `payroll-*`, PWRB, fence, rollover, mutation guard |
| CORE Edge | `supabase/functions/**` |
| CORE App LP | handlery sync/payroll w `App.tsx` |
| HIGH Tenders persist | `useTenderDossierHeavyLazy`, coalesce, pipeline persist |

**#CORE-013:** zero mixed FEATURE+CORE w jednym commicie.

---

## 14. Powiązane

- [`03_ENGINEERING_RULES.md`](03_ENGINEERING_RULES.md)  
- [`08_AI_GUARDRAILS.md`](08_AI_GUARDRAILS.md)  
- [`docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md`](../architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md)
