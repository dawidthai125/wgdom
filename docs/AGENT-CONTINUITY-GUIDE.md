# W&G DOM — przewodnik ciągłości sesji deweloperskiej

> **Cel:** jeden dokument odpowiadający na pytania: *co zrobiliśmy, co robimy teraz, jak wygląda struktura aplikacji i gdzie szukać SSOT.*  
> **Prod:** UI **2.63.41** · runtime **`642a01d`** · https://www.wgdom.fun · **PRODUCTION VERIFIED**  
> **Ostatnia aktualizacja:** 2026-07-05 · **Bundle #6D P2.10 CLOSED FINAL** · **Protected Core ACTIVE** (#CORE-013)

> **★ Closeout sesji (2026-07-04, docs-only):** `e4daaf4` — sync `PROJECT-STATUS.md` (HEAD → `609ae53`, S7-5 ETAP 1 = DEPLOYED) + raport interim `docs/stabilization-weekly/STABILIZATION-WEEKLY-W01-2026-07-04.md` (pola telemetryczne PENDING). Evidence Gate **OPEN** — bez zmian (zero telemetrii/AC8–AC11/reportów). Wykonany **lokalny backup Supabase klasy B** (Application Backup) w `backup/` (gitignored — hasła adminów): KV 31 kluczy + Storage 166/237 (71 osieroconych `job-photo` 404) + schema/Edge/config. **Do klasy A (Disaster Recovery)** brak `pg_dump` serwera Postgres → backlog **INFRA-DB-BACKUP-01** (ON HOLD, gate: `supabase login`+link+hasło DB+owner GO).

> **⚠ PIERWSZE, co musisz wiedzieć (2026-07-05):**
>
> 1. **Lista Płac i sync są chronione** — seria napraw RC-B + PAYROLL Etap 2 (B1–B6) + PWRB jest **CLOSED**. Przed **jakąkolwiek** zmianą w `cloud-sync.ts`, `CloudLoader.tsx`, Edge, `App.tsx` (payroll handlers) → **§ 2b poniżej** + [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md).
> 2. **FEATURE DEVELOPMENT RESTART** — Work Catalog P2.1–**P2.10 CLOSED** (prod **2.63.41** · `642a01d`). Następny FEATURE tylko na polecenie (#5C cutover · P3 market UI · P2.11+). **Nie** mieszaj FEATURE z CORE w jednym commicie (#CORE-013).
> 3. **PLATFORM-SYNC-01A CLOSED** (`a4cd5c2`, 2.63.33) — reconcile notatek operacyjnych; **nie** cofaj wzorca reconcile przy innych domenach bez AUDIT.
> 4. **RC-B CLOSED** — mutacje składu LP **tylko** przez PWRB (`payroll-week-roster-bundle.ts`).
>
> Recovery Program (S7-5, Edge-Opt-A) = **OBSERVATION** — nie blokuje FEATURE UI, ale **zakaz** dotykania payroll/sync w bundle FEATURE.

**Nie zastępuje** `ARCHITECTURE.md` ani handoffów tematycznych — **linkuje** do nich.

---

## 1. Kolejność czytania (nowa sesja)

```text
1. docs/AGENT-CONTINUITY-GUIDE.md     ← TEN PLIK (kontekst + mapa)
1m. docs/AGENT-APP-MAP.md            ← ★★★ mapa widoków, modułów, KV, sync (START dla AI)
1p. docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md ← ★★ architektura sync/merge Payroll (OBOWIĄZKOWE przed cloud-sync.ts / Edge)
1p2. docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md ← ★★ RC-B-1 CLOSED: PWRB · I-1…I-4 · jak nie zepsuć LP
1r. docs/EDGE-OPT-B-MASTER-AUDIT.md  ← ★ RECOVERY PROGRAM: call graph batch-set, hotspoty CPU, split B1–B5, DF prerequisites
2. CURRENT-TASK.md                   ← status · P0 FREEZE · RECOVERY PROGRAM (PRODUCTION OBSERVATION) · backlog
3. docs/STABILIZATION-WINDOW-PLAN.md ← ★★ okres po NG-04 — zasady, maintenance, Z-01–Z-07
4. docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md  ← raport tygodniowy (SSOT metryk)
5. docs/AGENT-ONBOARDING.md          ← widoki, sync, smoke, workflow deweloperski
6. docs/PROJECT-HANDOFF-CURRENT.md   ← baseline prod, epici, commity
7. docs/TEST-INFRA-001-CLOSEOUT.md  ← ★★ TEST-INFRA Harness MVP (CLOSED · 2.63.26 · TI-B1–B3 backlog)
7b. docs/TI-B4-CLOSEOUT.md          ← ★★ TI-B4 smoke agregat (CLOSED · 2.63.27 · Z-04 PASS)
8. docs/NG-04-EPIC-CLOSE-REPORT.md   ← BOQ PRO · Principles #001–#010 frozen
9. docs/ARCHITECTURE-REVIEW-2026-TENDERS.md  ← review Przetargi NG-01–04
10. docs/WORKFLOW-ARCHITECTURE-v2.63.md  ← OBOWIĄZKOWE przy zmianie Przetargu
11. docs/WORKFLOW-RELEASE-DEPLOY.md  ← release + VERIFY (nie zmieniaj bez polecenia)
12. docs/ARCHITECTURE.md             ← pełna architektura techniczna
13. AGENTS.md                        ← zasady pracy, zakazy
```

Hasło użytkownika **„kontynuuj WGDOM”** → dodatkowo `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 2. Co zrobiliśmy (stan na 2026-07-05)

### ★ Sesja 2026-07-05 — Bundle #6D P2.10 Roboty ulubione (**CLOSED FINAL**)

| Element | Wartość |
|---------|---------|
| **Commit** | `642a01d` · prod **2.63.41** · **PRODUCTION VERIFIED** |
| **Zakres** | gwiazdka ulubione · filtr chip Ulubione · sort favorite-first · licznik · `work-catalog-favorite.ts` · app layer only |
| **Test** | `SMOKE-WORK-CATALOG-FAVORITE-P210` · suite **17** testIds |
| **Boundary** | #CORE-013/#CORE-014 **PASS** — zero CORE/lib diff |

**Następny FEATURE:** tylko na polecenie (#5C cutover · P3 market UI · #6E deferred bootstrap).

### ★ Seria napraw 2026-07 — skrót dla agentów (nie psuj LP)

| Program / bundle | Wersja | Commit | Status | Czego **nie** cofać |
|------------------|--------|--------|--------|---------------------|
| **PAYROLL Etap 2 B1–B6 + RB** | 2.63.15–24 | `1a65341`→`727e6c4` | **CLOSED** | `finalizePayrollBundleMerge`, `CloudSyncMutationGuard`, UNION roster, closed week UI |
| **SYNC-ARCH-01 RC-B** (PWRB + I-1…I-4) | 2.63.30–31 | `35f37b1`→`31a7d5e` | **CLOSED** | `payroll-week-roster-bundle.ts` — jedyna ścieżka add/remove składu |
| **CORE-01A** | docs | — | **CLOSED** | #CORE-013 mixed bundle BLOCKED |
| **PLATFORM-SYNC-01A** | 2.63.33 | `a4cd5c2` | **CLOSED** | `reconcileOperationalNotesInMergedBundle` po await — **tylko** notatki operacyjne |
| **FEATURE Bundle B** (Owner View P2A) | 2.63.32 | `119576c` | **CLOSED** | `tender-work-scope-inference.ts` pdf_text — bez sync |

**Prod verified (RC-B):** Lista Płac add/remove/sync/Archiwum PASS (2026-07-04).

### ★ § 2b — Lista Płac: jak NIE zepsuć synchronizacji (OBOWIĄZKOWE)

> Po miesiącach napraw (Guard Phase, B4 merge, PWRB, tombstone revocation) **Lista Płac jest stabilna na prod**. Każdy agent pracujący nad **dowolnym** modułem musi respektować poniższe — nawet jeśli task dotyczy Przetargów, Mobile lub Notatek.

#### Zanim dotkniesz kodu sync / LP

1. Przeczytaj **[`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)** (całość lub § skrót).
2. Przeczytaj **[`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md)** — inwarianty I-1…I-4.
3. Sprawdź **`docs/architecture/CORE-01A-DESIGN-FREEZE.md`** §4A–4B — klasyfikacja pliku.

#### Pliki CORE — nie zmieniaj w bundle FEATURE (#CORE-013)

| Plik / obszar | Rola | Dozwolone tylko w |
|---------------|------|-------------------|
| `src/lib/cloud-sync.ts` — `finalizePayrollBundleMerge`, `mergeWeekEmployees`, payroll guards | SSOT merge LP | **Osobny CORE bundle** + AUDIT |
| `src/lib/payroll-week-roster-bundle.ts` | **PWRB** — add/remove/push/reconcile składu | CORE bundle lub hotfix LP |
| `src/lib/cloud-sync-mutation-guard.ts` | Guard mutacji roster + przydziały | CORE |
| `src/lib/payroll-week-employee-merge.ts` | Merge parity klient/Edge | CORE |
| `src/app/CloudLoader.tsx` — bootstrap payroll | P11 merge | CORE |
| `supabase/functions/.../index.tsx` — batch-set payroll UNION | Edge merge | CORE + deploy Edge |
| `src/app/App.tsx` — **intencja payroll** (`removeWeekEmployee`, rollover, week save) | Orkiestracja LP | CORE bundle |

**PLATFORM-SYNC-01A** zmienił `cloud-sync.ts` + `App.tsx` **wyłącznie** dla `reconcileOperationalNotesInMergedBundle` — **nie** dotykał ścieżek payroll. Nowe reconcile dla innych domen = osobny AUDIT, **nie** kopiuj ślepo.

#### Inwarianty PWRB (RC-B) — MUST

| # | Reguła |
|---|--------|
| I-1 | Mutacja składu tygodnia → **tylko** `pwrAdd` / `pwrRemove` / `pwrPush` / `pwrReconcile` |
| I-2 | Push `kw-week-employees` **zawsze** z `kw-week-employees-deleted-ids` (coupled domain) |
| I-3 | Po pull — reconcile tombstonów przed apply do React |
| I-4 | Re-add po delete → tombstone **revoked** (G-0) — pracownik nie znika po F5 |

#### Testy obowiązkowe przed commitem dotykającym LP/sync

```bash
npm run audit:pwrb
npx vite-node scripts/test-pwrb-boundary-rcb.mjs
npx vite-node scripts/test-payroll-tombstone-revocation-rcb.mjs
npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs
npm run test:infra -- --gate B --scope payroll
```

#### Typowe błędy agentów (powodują regresję LP)

| Błąd | Skutek |
|------|--------|
| Mixed bundle: `cloud-sync.ts` + `TendersView.tsx` w jednym commicie | **BLOCKED** — rozdziel |
| Bezpośredni push `kw-week-employees` z `App.tsx` zamiast PWRB | resurrection / utrata składu |
| Zmiana `mergeWeekEmployees` / `finalizePayrollBundleMerge` „dla wygody” | bootstrap/runtime drift |
| Stale closure w `runCloudSync` nadpisuje świeżą mutację UI | race (naprawione dla notatek w 01A; **nie** dotykaj payroll bez AUDIT) |
| Refactor `App.tsx` łączący payroll + inne moduły | mixed intent → split commit |

#### Gdy task **nie** dotyczy LP

- **Nie** importuj nowych ścieżek zapisu do `cloud-sync.ts` bez polecenia.
- **Nie** zmieniaj `runCloudSync` / `pullFromCloudAndMerge` poza domeną zatwierdzoną w AUDIT (01A = tylko operational notes).
- Boundary check przed commit: `git diff --cached --name-only` vs §4B CORE-01A.

---

## 2c. Co zrobiliśmy — szczegóły historyczne (2026-07-04)

### ★ SYNC-ARCH-01 RC-B-1 — Tombstone Revocation · **CLOSED**

> **Incydent:** delete → re-add pracownika → F5 → znika (11→10). **Root cause:** append-only tombstony bez revocation + brak spójności pary `(roster, tombstones)`.

| Element | Status | Commit | Skrót |
|---------|--------|--------|-------|
| **PWRB facade** | **CLOSED** | `35f37b1` | `payroll-week-roster-bundle.ts` — `pwrAdd`/`pwrRemove`/`pwrPush`/… |
| **I-1…I-4** | **CLOSED** | `35f37b1` | pull revoke · Edge normalize · reconcile · coupled push |
| **RC-B debug overlay** | **REMOVED** | `24bde6e` | cleanup diagnostyki — bez bumpu wersji |
| **Testy** | PASS | — | `audit:pwrb` · `test-pwrb-boundary-rcb` · `test-payroll-tombstone-revocation-rcb` |

**SSOT closeout:** [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · Design Freeze: [`recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md)

**Dla agentów — MUST przed nową funkcją Payroll:**
1. Mutacje składu → **tylko PWRB** (`payroll-week-roster-bundle.ts`), nie bezpośrednio `App.tsx` + tombstony osobno.
2. Nie rozdzielaj push `kw-week-employees` od `kw-week-employees-deleted-ids`.
3. `npm run audit:pwrb` + payroll smoke przed commitem sync.

**OPEN:** batch-set 500 (H1) · manual multi-device AC8–AC11 · Evidence Gate SYNC-ARCH-01.

### 🔴 P0 PAYROLL CLOUD SYNC INCIDENT — **PARTIAL** (batch-set 500 OPEN)

> Pełna architektura + hipotezy + plan: **[`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md)**. Audyty: [`S7`](PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) · [`S7A`](PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md).

| Bundle | Status | Commit | Skrót |
|--------|--------|--------|-------|
| **PR-PAY-S6** Archive Restore Eligibility Guard | **CLOSED** | `d2a3d90` | baner/restore respektuje tombstony S2 (`eligibleArchiveWeekEmployees`) |
| **PR-PAY-S7-1** Cloud Batch Diagnostics | **CLOSED** | `4c38f4f` | `app.onError` + try/catch + `{ok,error,requestId}` w Edge `batch-set` |
| **PR-PAY-S7A** Frequency Audit | **AUDIT COMPLETE** | — | CONFIRMED CONTRIBUTING CAUSE (nadmiarowe batch-get/set; brak infinite loop) |
| **PR-PAY-S7-4A** Cloud Sync Optimization | **IMPLEMENT COMPLETE → OBSERVATION** | `12b09d8` | debounce 2s + min-interval 15s + focus/visibility throttle + AC4 (no-change=no-push) + AC5 metryki |
| **PR-PAY-S7-5 ETAP 1** Resurrection Guard | **DEPLOYED → OBSERVATION** | `ae132bc` | **S7-5-1** sync `kw-week-employees-deleted-ids` (push+pull+merge+save PRZED finalize) + **S7-5-2** Edge tombstone-aware (filtr prev/next PRZED UNION + restore-aware). Test 24/24. Functional PASS · AC8–AC11 multi-device OPEN. ETAP 2 (S7-5-3/S7-5-4) **warunkowy** |
| **PR-PERF-EDGE-OPT-A** batch-get order-preserving | **DEPLOYED → OBSERVATION** | `609ae53` | `batch-get` → `kv.mget` (order-preserving + null-fill, `SELECT key,value ... IN`); N `SELECT` → 1. Kontrakt `{values}`/klient bez zmian. Test 12/12. Functional PASS · CPU/SELECT OPEN. Rdzeń: `kv-batch-order.ts` |
| **Edge-Opt-B** batch-set CPU redukcja | **MASTER AUDIT COMPLETE · DF NOT STARTED · IMPL BLOCKED** | — | SSOT: [`EDGE-OPT-B-MASTER-AUDIT.md`](EDGE-OPT-B-MASTER-AUDIT.md). Hotspot `batch-set` (saveDailyFullBackup + rotacje + fan-out get). Next: **B1** gate `saveDailyFullBackup`. Gate: Performance Observation zamknięta |

**Dwa problemy (z czym mamy problem):**
- **(A) batch-set HTTP 500** — najpr. *statement timeout* na `kv.mset` całego bundla (**H1 UNCONFIRMED** — brak dowodu prod: requestId/error/stack/Postgres log). Wciąż otwarte.
- **(B) Resurrection** — usunięty pracownik wracał na innym urządzeniu. **Root cause:** `kw-week-employees-deleted-ids` był **wyłącznie lokalny** + merge UNION. **ZAADRESOWANE** przez **PR-PAY-S7-5 ETAP 1** (`ae132bc`, DEPLOYED): tombstony współdzielone cross-device + Edge filtruje przed UNION. **Czeka na potwierdzenie multi-device (AC8–AC11)** w Performance Observation — do tego czasu OPEN, nie CLOSED.

**Program naprawy (SSOT roadmapy):** [`EDGE-OPT-B-MASTER-AUDIT.md`](EDGE-OPT-B-MASTER-AUDIT.md) (Edge-Opt-B split B1–B5) · [`EDGE-OPT-A-BATCH-GET-ORDER-PRESERVING-DESIGN-FREEZE.md`](EDGE-OPT-A-BATCH-GET-ORDER-PRESERVING-DESIGN-FREEZE.md) · [`PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md`](PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md).

### Payroll Process Design — 🔒 PROCESS COMPLETE (LOCK) · 2026-07-03

Faza projektowania procesu Payroll **zamknięta** (PROJECT PROCESS COMPLETE). Dokumenty procesu = LOCK; aktywne pozostają tylko techniczne P0 (S7-5, F1, S7-4A observation).

| Dokument | Rola |
|----------|------|
| [`PAYROLL-CERTIFICATION-SUITE.md`](PAYROLL-CERTIFICATION-SUITE.md) | zestaw regresyjny — 27 funkcji, 10 multi-device, Smoke/Regression, BUG register |
| [`PAYROLL-QUALITY-GATE.md`](PAYROLL-QUALITY-GATE.md) | bramka pre-merge L1–L4, macierz typ→poziom, BLOCKED/ALLOWED |
| [`QUALITY-GATE-INTEGRATION-PLAN.md`](QUALITY-GATE-INTEGRATION-PLAN.md) | integracja z workflow (`TEST → QUALITY GATE → COMMIT`) |
| [`PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md`](PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md) | wariant B — 5 bundli, INV-1…INV-9, KPI, migration |
| [`PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) | audyt requestów/egress → zasila PR-PERF-S1 |

**BACKLOG (gated):** `PAYROLL-ARCHITECTURE-v3.md` (nieutworzony) · reorg `docs/payroll/`. **Następny krok:** Production Observation S7-4A → S7-5 ETAP 1 (owner GO) → REPRO F1.

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
| **PLATFORM-SYNC-01A** reconcile notatek | **2.63.33** · `a4cd5c2` | **CLOSED** · archive race · ETAP B ON HOLD |
| **FEATURE Bundle B** Owner View P2A | **2.63.32** · `119576c` | **CLOSED** · pdf_text work scope |
| **SYNC-ARCH-01 RC-B** (pełny program) | **2.63.30–31** | **CLOSED** · PWRB · prod verified |
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
| **TEST-INFRA-001** harness MVP | **2.63.26** · `3d6dd90` | **CLOSED** · manifest + orchestrator + PAYROLL-GUARD-S1 |
| **TI-B4** smoke agregat Przetargi | **2.63.27** · `6c94223` | **CLOSED** · manifest 1.1.0 · Gate B `scope:tenders` · **Z-04 PASS** |
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

### TEST-INFRA-001 — Infrastruktura testowa · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** (prod **2.63.26** · `3d6dd90`) |
| **SSOT** | [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) |
| **Zakres MVP** | Manifest SSOT · orchestrator `npm run test:infra` · Payroll Harness PAYROLL-GUARD-S1 |
| **Post-MVP backlog** | **TI-B1** `removeWeekEmployee()` lib · **TI-B2** `HARNESS_SANDBOX_JOB_IDS` (P0 gate) · **TI-B3** CI gate · **TI-B4** — **CLOSED** |

**Release Przetargów (Gate B):** `npm run test:infra -- --gate B --scope tenders` · suite `smoke-stabilization-ng01-04`

**Dla agentów AI — zasady:**

1. **Nie** rozszerzaj TEST-INFRA bez polecenia (STABILIZATION WINDOW).
2. **Nie** duplikuj logiki domenowej — SSOT import only (#015).
3. **Prod harness L5:** Principle **#018** — tylko sandbox joby; **TI-B2** przed pierwszym prod run.
4. **Komendy:** `npm run test:infra:validate` · `npm run test:infra -- --gate B --scope payroll` · `npm run test:infra -- --gate B --scope tenders` · `npm run test:e2e:payroll-guard`

**Powiązane (prod CLOSED):** [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md)

### TI-B4 — Smoke agregat Przetargi · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** (prod **2.63.27** · `6c94223`) |
| **SSOT** | [`TI-B4-CLOSEOUT.md`](TI-B4-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) § scope tenders |
| **Artefakt** | `scripts/test-tenders-stabilization-smoke.mjs` — 12 child lib NG-01–04 |
| **Manifest** | `test-infra/test-manifest.json` v**1.1.0** · `SMOKE-TENDERS-NG01-04` |
| **Z-04** | **PASS** (STABILIZATION · M-02 CLOSED) |

**Dla agentów AI:** release dotykający Przetargów → Gate B `--scope tenders`. **Nie** duplikuj child scripts w orchestratorze — lista tylko w agregatorze (#028).

### Recovery Pack (dla programistów — tylko odczyt)

| Pole | Wartość |
|------|---------|
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` (poza repo) |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` |
| **Baseline** | `RECOVERY_PACK_COMMIT = 6cd8ebe` |
| **Tag Git** | `wgdom-recovery-pack-2.62.72` |

**Nie modyfikuj** packa ani orchestratora bez wyraźnego polecenia użytkownika.

---

## 3. Co robimy teraz / następne (2026-07-05)

**Zasada:** **FEATURE DEVELOPMENT RESTART** po zamknięciu RC-B + CORE-01A + PLATFORM-SYNC-01A. **Jeden bundle na raz** · #CORE-013 + #CORE-014 obowiązkowe. **Lista Płac — § 2b MUST** przy każdej sesji.

| Priorytet | Temat | Klasa | Status | SSOT / testy |
|-----------|-------|-------|--------|--------------|
| **#1** | **Bundle C — Mobile** (MOBILE-P0-S1 / M-03) | UI + PLATFORM layout | **CLOSED** · prod **2.63.34** · `eb0d51b` | `smoke-test-mobile-scroll-p0-s1.mjs` · Z-05 iPhone |
| **#2** | NG-03 maintenance (R-03 docs banner) | docs | **CLOSED** · `f495a78` | `NG-03-DESIGN-FREEZE.md` |
| **#3** | **Bundle #3 — Grouped documents test sync** | FEATURE test + docs | **CLOSED** · prod **2.63.35** · `eebe389` | `test-tender-grouped-documents.mjs` · `LIB-TENDERS-GROUPED-DOCS` |
| **#4** | **Bundle #4A — Roboty 2.0 MIN doc/help sync** | docs + test manifest | **CLOSED** · prod **2.63.36** · `5d2b207` | `test-job-list-ops-2.0-min.mjs` · `LIB-JOBS-LIST-OPS-20-MIN` |
| **#5** | **Bundle #5A — Work Catalog P2 test manifest sync** | docs + test manifest | **CLOSED** · prod **2.63.37** · `7e4eb57` | `smoke-work-catalog-p2-mvp` (10 testIds) |
| **#5B** | **Bundle #5B — Work Catalog P2.7 Pakiety robót MIN** | FEATURE UI | **CLOSED** · prod **2.63.38** · `9aad48c` | `SMOKE-WORK-CATALOG-BUNDLES-P27` · suite 12 testIds |
| **#6A** | **Bundle #6A — Work Catalog stabilization** | docs + test manifest | **CLOSED** · prod **2.63.38** · `6af0427` | `LIB-WORK-CATALOG-BOOTSTRAP-PB3` · suite **13** testIds |
| **#6B** | **Bundle #6B — Work Catalog P2.8 MIN UX** | FEATURE UI | **CLOSED** · prod **2.63.39** · `1fd3627` | `SMOKE-WORK-CATALOG-BUNDLES-P28` · suite **15** testIds |
| **#6C-A** | **Bundle #6C-A — Work Catalog P2.9 MIN UX** | FEATURE UI | **CLOSED** · prod **2.63.40** · `898682a` · **PRODUCTION VERIFIED** | `SMOKE-WORK-CATALOG-BUNDLES-P29` · suite **16** testIds |
| **#6D-docs** | **Bundle #6D-docs — SSOT continuity** | docs | **CLOSED** · prod **2.63.40** · `a487680` |
| **#6D** | **Bundle #6D — Work Catalog P2.10 Roboty ulubione** | FEATURE UI | **CLOSED FINAL** · prod **2.63.41** · `642a01d` · **PRODUCTION VERIFIED** | `SMOKE-WORK-CATALOG-FAVORITE-P210` · suite **17** testIds |
| **—** | Następny FEATURE (na polecenie) | — | **OPEN** | **#5C** cutover Przetargi/PB-WRITE · **P3** market UI · deferred bootstrap on mount (#6E) |
| **—** | Payroll Performance Observation | CORE obs | OPEN · nie blokuje #1–#4 UI | S7-5 · Edge-Opt-A |
| **—** | Edge-Opt-B | PLATFORM | BLOCKED | `EDGE-OPT-B-MASTER-AUDIT.md` |
| **—** | G-08 / G-02 / TP200B | FEATURE | OPEN · wysokie ryzyko | osobny AUDIT |

**WIP w tree (nie commitować razem):** mobile cluster ≠ `backup-lib.mjs` ≠ `docs/recovery/*`.

**Deploy:** push `main` → Vercel · verify jedno `curl https://www.wgdom.fun/version.json`.

### AD-10 Stabilization — postęp sesji (2026-07-02)

> **Tracker + artefakty audytu poza repo:** `../WGDOM1-branch-audit/` (zasada AD-10 — **nie** twórz artefaktów audytu w repo). Plik statusu: `AD-10-LOCAL-STATUS.md`. Nowy agent: **najpierw przeczytaj ten katalog**, nie odtwarzaj audytów od zera.

| Zadanie | Status | Dowód / lokalizacja |
|---------|--------|---------------------|
| **MOBILE-P0-S1** | **CLOSED** (feature branch) | `stabilization/mobile-p0-s1` · `2350e86` · goToView `reconcileModalScrollLock` · smoke 14/14 |
| **M-03 Mobile Re-Certification** | **CLOSED** (feature branch) | `stabilization/mobile-p0-s2` · `e4eb733` · NG-03 C1–C7 SSOT scroll (`mobile-view-scroll` + `data-mobile-scroll-root` + `touch-action:pan-y`) · smoke 20/20 |
| **M-03.1 Certification Coverage** | **CLOSED** (feature branch) | `stabilization/mobile-field-cert-m03-1` · `0988eb2` · `docs/testing/MOBILE-FIELD-CERTIFICATION.md` §4.7 (NG-03) + §4.8 (BOQ) |
| **Z-05 FIELD VALIDATION** | **PENDING (Device Required)** | trylogia kod/docs CLOSED; wykonanie terenowe iPhone Safari — plan `FIELD-VALIDATION-EXECUTION-PLAN.md` (poza repo) |
| **M-05 Payroll Etap 1 regresja** | **CLOSED (AUDIT PASS)** | suite `lib-payroll-core` 10/10 + Etap 1/race/carry PASS · B1–B6+RB CLOSED · 0 regresji · jedyny FAIL = P3 test hygiene (time-dependent) |
| **W01 Weekly Metrics** | **CLOSED — Health GREEN** | Z-02/Z-03/Z-04/Z-06 PASS · Z-01 ACCRUAL · Z-05 Device · Z-07 Owner |

**Feature branche mobilne NIE są zmergowane do `main`** — czekają na FIELD VALIDATION (Z-05) → decyzja właściciela. Drzewo robocze `main` może zawierać niezcommitowany WIP mobile/tenders z pierwotnego splitu (kod payroll pozostaje = stan prod).

**Następne (na polecenie):** wykonanie FIELD VALIDATION na urządzeniu → raport PASS/FAIL → Z-05 · M-04 egress monitoring · E2E-PAYROLL-GUARD-S1 (gate C) · de-flake `test-payroll-extra-cost-etap1`.

### Domknięcie sesji — rytuał (słowo-klucz)

Na koniec sesji **zaktualizuj dokumentację ciągłości i zrób commit docs**. Wyzwalacz: użytkownik pisze **„domknij WGDOM”** (alias: „zamknij sesję WGDOM”, „aktualizuj docs WGDOM”). Procedura — patrz `.cursor/rules/wgdom-domkniecie-sesji.mdc`.

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

**Poza repo:**
- `../WGDOM-RECOVERY-PACK/` — Recovery Pack (off-site backup).
- `../WGDOM1-branch-audit/` — **tracker AD-10 + artefakty audytu/CLOSEOUT/DESIGN-FREEZE** (zasada AD-10: audyty **poza** repo). Zawiera `AD-10-LOCAL-STATUS.md`, raporty M-05/W01, plany FIELD VALIDATION.

**Nie commitować:** `scripts/_tmp*`, większość `audit/*.pdf`, `.env`, artefakty packa, artefakty z `../WGDOM1-branch-audit/`.

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

- `cloud-sync.ts` — merge, DATA_KEYS, Payroll Guard, **S7-5-1 sync tombstonów** (`kw-week-employees-deleted-ids` w push/pull/merge PRZED finalize)
- **Edge `batch-set` tombstone-aware (S7-5-2)** — filtr `weekEmployeeTombstoneKeySetForWeek`/`filterWeekEmployeesByTombstones` PRZED `mergeWeekEmployeesUnion` (także restore); nie usuwać — to guard resurrection
- **Edge `batch-get` / `kv.mget` (Edge-Opt-A)** — kontrakt order-preserving + null-fill (`kv-batch-order.ts`); NIE używać wadliwego wzorca `Promise.all(keys.map(get))` ani nie-uporządkowanego `mget`
- **Kontrakt kluczy backupu** (`-prev`/`-prev2`/`-day`/`kw-full-day-*`) + reguła „richness-max" — twarda granica dla restore (patrz Edge-Opt-B audit)
- Parsery dossier / ATH / PDF — bez testów TP113/TP182
- Edge Function semantics (email, storage paths)
- Canonical ZI template KV (`2b22da48…`)
- Recovery Pack orchestrator / pack root
- Command Center — **usunięty**, nie przywracać

---

*Ostatnia aktualizacja: 2026-07-04 (closeout `e4daaf4`) · prod UI 2.63.27 · HEAD `e4daaf4` (docs-only) · deploy SSOT `609ae53` · 🔴 P0 PAYROLL CLOUD SYNC INCIDENT ACTIVE (P0 FREEZE) · PAYROLL & SUPABASE RECOVERY PROGRAM ACTIVE — faza PRODUCTION OBSERVATION · PR-PAY-S7-5 ETAP 1 DEPLOYED (`ae132bc`, Obs OPEN) · PR-PERF-EDGE-OPT-A DEPLOYED (`609ae53`, Obs OPEN) · Evidence Gate OPEN · Edge-Opt-B MASTER AUDIT COMPLETE (DF NOT STARTED, IMPL BLOCKED) · S7-4A OBSERVATION · STABILIZATION WINDOW ACTIVE · Z-05 Device Required · backup lokalny klasy B (INFRA-DB-BACKUP-01 ON HOLD)*
