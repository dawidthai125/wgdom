# PROJECT-STATUS — W&G DOM

> Aktualny stan produkcji, wersji, EPIC‑ów i backlogu. Migawka projektu.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-09 |
| **Commit (HEAD `main`)** | **`566fa0d`** (NG-09-01 release) |
| **Production version (UI)** | **v2.63.80** (expected) · curl prod: **2.63.79** DEPLOY PROPAGATING |
| **Status** | **STABILIZATION WINDOW ACTIVE** · **NG-09-01 CLOSED** · **M-03 CLOSED** · **NG-08 parent FROZEN** · **Protected Core GREEN** (#CORE-013) · **NG-09-02 BLOCKED** · szczegóły: [`AGENT-CONTINUITY-GUIDE.md`](docs/AGENT-CONTINUITY-GUIDE.md) § 0–3 |

### PAYROLL & SUPABASE RECOVERY PROGRAM — ACTIVE (faza: PRODUCTION OBSERVATION)

| Bundle | Zakres | Status | HEAD | Functional Obs | Performance Obs |
|--------|--------|:------:|------|:--------------:|:---------------:|
| **PR-PAY-S7-5 ETAP 1** | S7-5-1 sync tombstonów week-employees + S7-5-2 Edge tombstone-aware (przed UNION + restore) | **DEPLOYED** | `ae132bc` | **PASS** | **OPEN** |
| **PR-PERF-EDGE-OPT-A** | `batch-get` → order-preserving `mget` (N `SELECT` → 1 `SELECT ... IN`) | **DEPLOYED** | `609ae53` | **PASS** | **OPEN** |

**Functional Obs PASS:** deploy success · build success · automated regression PASS (S7-5 24/24 · Edge-Opt-A 12/12 · B4/B6/S2/S6/Frequency) · brak wykrytych regresji funkcjonalnych.
**Performance Obs OPEN (PENDING telemetria):** Supabase CPU · Postgres/API logs (1× `SELECT ... IN`, `pg_stat_statements`, brak 500/timeout) · Edge duration/latency · `__wgdomSyncMetrics()` · multi-device (AC8–AC11) · UI (Payroll/WM/Tender/Inspector).
**Najwyższy pozostały hotspot CPU:** Edge `batch-set` — kontrybutorzy: powtarzane `kv.get(prev)` · `saveDailyFullBackup` · rotacja backupów · merge z poprzednią wartością · serializacja pełnego bundla (~391KB).
**Edge-Opt-B:** **MASTER AUDIT COMPLETE** ([`docs/EDGE-OPT-B-MASTER-AUDIT.md`](docs/EDGE-OPT-B-MASTER-AUDIT.md)) · **Design Freeze: NOT STARTED** · **Implementation: BLOCKED**.
**Blocking condition:** Performance Observation dla PR-PAY-S7-5 ETAP 1 i PR-PERF-EDGE-OPT-A musi być **zamknięta** przed jakimkolwiek Design Freeze.
**Next planned work:** Edge-Opt-B Bundle **B1** (bramkowanie `saveDailyFullBackup`).

---

## Cloud Sync ADR

**SSOT:** [`docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md`](docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md)

| Pole | Wartość |
|------|---------|
| **Status** | **PROPOSED** |
| **Evidence Gate** | **OPEN** |
| **Design Freeze** | **BLOCKED** |
| **Implementation** | **BLOCKED** |

> ACCEPTED i SYNC-ARCH-01 Design Freeze wyłącznie po **pełnym** zamknięciu Evidence Gate (EG-1…EG-5).

---

## Payroll Certification 2026

**Status: IN PROGRESS** · SSOT: [`docs/PAYROLL-CERTIFICATION-2026-AUDIT.md`](docs/PAYROLL-CERTIFICATION-2026-AUDIT.md)

**PASS (zamknięte):**
- React state
- stale snapshot
- selectedEmpId
- re-derived record
- functional updates
- per-day patch
- ETAP 1 regression guard
- Scenario H (PASS / CLOSED)

**OPEN P0:**
- PR-PAY-S7-5 Resurrection — **ETAP 1 DEPLOYED (`ae132bc`) · Production Observation OPEN** (nie CLOSED do potwierdzenia AC8–AC11)
- batch-set 500 (H1 UNCONFIRMED)

**OPEN HIGH:**
- F1 Lost Update extraCosts — REPRO REQUIRED · DESIGN FREEZE NOT STARTED

**Kolejność prac:**
1. Finish S7-5
2. Verify Production
3. REPRO F1
4. AUDIT CLOSE
5. DESIGN FREEZE F1
6. IMPLEMENT F1

> Certyfikacja pozostaje otwarta do czasu zamknięcia aktywnych pozycji OPEN.

**PLANNED (BACKLOG · NOT STARTED):** `docs/PAYROLL-ARCHITECTURE-v3.md` — SSOT kompletnej architektury Payroll (data flow · LocalStorage · Cloud · Edge · merge klient/Edge · LWW · tombstones · force-replace · CloudSyncMutationGuard · bootstrap/runtime parity · rollover · archive · restore · settled · extraCosts · sequence diagrams · invariants · anti-patterns · lessons learned). **Gate:** po zamknięciu S7-5 + F1 (jeśli potwierdzony) + Payroll Certification 2026. Szczegóły: [`CURRENT-TASK.md`](CURRENT-TASK.md). PLAN ONLY.

---

## 1. Stan produkcji

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **Repo / branch** | github.com/dawidthai125/wgdom · `main` |
| **Wersja UI (prod)** | **v2.63.80** (`CHANGELOG[0].version` w `src/app/changelog-data.ts`) — GREEN, PRODUCTION VERIFIED |
| **HEAD `main`** | **`566fa0d`** |
| **Deploy** | Vercel Git Integration (`git push origin main`) · Edge → GitHub Actions (`supabase/functions/**`) |
| **Identyfikacja buildu** | `version.json` (deploy verify) · Version Banner (commit‑based identity) · PWA SW cache `wgdom-shell-{version}` |

### Wersja UI vs HEAD — ważne

Wersja UI **v2.63.80** to ostatni wpis w `changelog-data.ts` (**NG-09-01 Inspector Workspace Frame**). Poprzedni baseline: **2.63.79** @ `f7878fe` (M-03). Baseline prod: `version.json` → `{ "version": "2.63.80", "commit": "<release>" }`.

---

## 2. Roadmapa (skrót)

Pełna: [`ROADMAP.md`](ROADMAP.md).

| Faza | Status |
|------|--------|
| Platforma (Roboty, Payroll, WM Druk, Przetargi) | **PRODUCTION STABLE** |
| Przetargi NG‑01 … NG‑04 | **EPIC CLOSED** |
| PAYROLL‑CLOUD‑RECOVERY (Etap 1/2, Guard Phase, P0 Incident) | **CLOSED** |
| TEST‑INFRA (001 + TI‑B2/B4 + MB‑1/1.1/2) | **CLOSED** (TI‑B1, TI‑B3 backlog) |
| Work Catalog (Foundation, P2 MVP, P3.1, P3.2) | **CLOSED** (P3.3 UX w toku) |
| STABILIZATION WINDOW | **ACTIVE** |
| NG‑05 Market Pricing Intelligence (MPI) | **DESIGN COMPLETE · IMPLEMENT BLOCKED** |

---

## 3. Zamknięte EPIC‑i (wybór najważniejszych)

| EPIC / Bundle | Wersja / commit | Status |
|---------------|-----------------|--------|
| **NG‑09‑01** — Inspector Workspace Frame | **2.63.80** · `566fa0d` | **CLOSED** · DEPLOY PROPAGATING |
| **M‑03** — Mobile Re-certification (breakpoint cliff 392px) | **2.63.79** · `f7878fe` | **CLOSED** · PRODUCTION VERIFIED |
| **NG‑08‑HF‑01** — Visual Smoke remediation | **2.63.78** · `4855a2d` | **CLOSED** |
| **NG‑08‑05…01** — Tender Workspace UX slices | **2.63.73–77** | **CLOSED** · parent **FROZEN** |
| **PLATFORM-SYNC-01A** — reconcile notatek operacyjnych po await (archive race) | **2.63.33** · `a4cd5c2` | **CLOSED** · ETAP B ON HOLD |
| **PAYROLL P0 Incident** (S1 cross‑week · S2 tombstones · S3 zero‑hours · S5 settled) | `1d5b0b7`→`fd56cf7` | **CLOSED** |
| **Work Catalog P3.2** — Import Persistence (apply/rollback/commit market quotes) | `ba2699d`→`f37b619` | **CLOSED** |
| **Work Catalog P3.1** — Market Average Engine + adapters + CSV preview | `c8e1b9e`→`04cb034` | **CLOSED** |
| **TI‑B4** — Smoke agregat Przetargi NG‑01–04 | v2.63.27 (`6c94223`) | **CLOSED** · Z‑04 PASS |
| **TEST‑INFRA‑001** — manifest + orchestrator + Payroll Harness | v2.63.26 (`3d6dd90`) | **CLOSED** |
| **MB‑1 / MB‑1.1 / MB‑2 / TI‑B2 / TI‑B2.1** — gate integrity + docs SSOT | `460031f`…`2efe8b5` | **CLOSED** |
| **Audit Hub** MVP‑0→1B + P1 WM + AH‑REG‑1 | v2.62.37→2.63.25 | **CLOSED** |
| **PAYROLL‑CLOUD‑RECOVERY Etap 2** B1–B6 + RB | v2.63.17→2.63.24 | **CLOSED** |
| **PAYROLL Guard Phase** B3 / B3.1 / B3.2 | v2.63.18→2.63.20 | **CLOSED** |
| **NG‑04** Kosztorys Workspace PRO (BOQ Explorer) | v2.63.9→2.63.12 | **EPIC CLOSED** |
| **NG‑03** Tender Workspace UX | v2.63.7 | **EPIC CLOSED** |
| **NG‑02** Tender Automation Pipeline | v2.62.98 | **EPIC CLOSED** |
| **NG‑01** Tender Trust Layer | seria 2.63.x | **SHIPPED** |
| **WM Schematy** jednokreskowe MVP + V2 | v2.62.51 | **COMPLETE** |
| **Mobile Recovery** UX + Jobs drill‑in | v2.62.79 | **EPIC CLOSED** |
| **Operational Notes** P0→HF | v2.58.1 | **COMPLETE** |
| **ZI Tauron 2026** (WM Druk) | POST‑ZI | **PRODUCTION STABLE** |

Pełny rejestr: [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md).

---

## 4. Aktywne EPIC‑i / w toku

| Temat | Status | SSOT |
|-------|--------|------|
| **STABILIZATION WINDOW** (AD‑10, Z‑01–Z‑07) | **ACTIVE** · W01 Health GREEN · **M‑03 CLOSED** | [`docs/STABILIZATION-WINDOW-PLAN.md`](docs/STABILIZATION-WINDOW-PLAN.md) |
| **PR‑PAY‑S6** — Archive Restore Eligibility Guard | **CLOSED** · IMPLEMENT COMPLETE · BUILD PASS · TEST PASS · HEAD `d2a3d90` | [`docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md`](docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md) |
| **PR‑PAY‑S7** — Cloud Batch 500 Investigation | **S7‑1 CLOSED** (`4c38f4f`) · **S7A = CONFIRMED CONTRIBUTING CAUSE** · **S7‑4A Cloud Sync Optimization = IMPLEMENT COMPLETE (BUILD/TEST PASS) → PRODUCTION OBSERVATION 24–48h** · S7‑2 warunkowo (jeśli batch-set 500 nadal) · G5/G6 out of scope · S7‑3 DRAFT · **S7‑5 Resurrection Guard = ETAP 1 DEPLOYED (`ae132bc`) · Production Observation OPEN · ETAP 1 = S7‑5‑1+S7‑5‑2 · ETAP 2 warunkowy** · H1 UNCONFIRMED | [`S7`](docs/PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) · [`S7A`](docs/PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md) · [`S7-4 DF`](docs/PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md) · [`S7-5 DF`](docs/PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md) |
| **Z‑05 Field Validation** (mobile, iPhone Safari) | **PARTIAL** — **M‑03 main CLOSED** (`f7878fe`); terenowe iPhone Safari nadal PENDING | j.w. |
| **Work Catalog P3.3** — Market Pricing UX | **AUDIT DONE · DESIGN FREEZE (decyzje D‑A…D‑D pending)** | [`docs/work-catalog/`](docs/work-catalog/) |

> Poza tym: **brak aktywnego epicu Przetargi** — nowy tylko na polecenie właściciela.

---

## 5. Otwarte backlogi (na polecenie)

| Temat | Status |
|-------|--------|
| **NG‑05 MPI** — Data Foundation (MPI‑0) | **IMPLEMENT BLOCKED** (AD‑01 legal · STABILIZATION · owner command) |
| **TI‑B1** — ekstrakcja `removeWeekEmployee()` do lib | OPEN |
| **TI‑B3** — CI GitHub Actions gate B/C z orchestratora | OPEN |
| **Work Catalog P2** — UI Biblioteka Robót | OPEN |
| **Work Catalog P3.3 S4** — Preview Mount | **ON HOLD** — zablokowane przez 🔴 P0 Payroll Cloud Sync Incident (do zamknięcia P0) |
| **Work Catalog P3.3** — implementacja UI po decyzjach design freeze | OPEN (po P0) |
| **G‑08** — persist `code` w snapshot BOQ | OPEN |
| **G‑02** — R/M/S inline w BOQ | OPEN |
| **TP200B** — kosztorys fidelity (`rows` cap) | PLANNED |

---

## 6. Ostatnie releasy / commity (HEAD ↓)

| Commit | Opis |
|--------|------|
| `566fa0d` | feat(inspector): **NG‑09‑01** Workspace Frame **v2.63.80** |
| `f7878fe` | release: **M‑03** mobile re-cert **v2.63.79** (changelog) |
| `0f8a165` | fix(tenders): **M‑03** mobile re-cert breakpoint cliff 392px (IMPLEMENT) |
| `4855a2d` | fix(tenders): NG‑08‑HF‑01 breadcrumb mobile hidden |
| `d496b88` | fix(payroll): **PR‑PAY‑S3** — Zero Hours Persistence (P0) |
| `d6c6117` | fix(payroll): **PR‑PAY‑S2** — Deletion Tombstones (P0) |
| `1d5b0b7` | fix(payroll): **PR‑PAY‑S1** — Week Scope Hard Guard (P0) |
| `f37b619` | feat(work-catalog): **WC‑P3.2‑S3** — Commit Orchestration |
| `92b9741` | feat(work-catalog): WC‑P3.2‑S2 — Rollback (Single Undo) |
| `ba2699d` | feat(work-catalog): WC‑P3.2‑S1 — Apply Market Quotes (merge‑not‑replace) |
| `04cb034` | feat(work-catalog): WC‑P3.1‑S4 — Market CSV Import (preview) + seed |
| `e255aef` | feat(version): Version Banner Refresh — Build Identity (commit) |
| `6c94223` | feat(test-infra): TI‑B4 smoke aggregator (release **v2.63.27**) |

Pełna historia UI: [`CHANGELOG.md`](CHANGELOG.md) · źródło prawdy: `src/app/changelog-data.ts`.

---

## 7. Zdrowie / weryfikacja

| Sygnał | Stan |
|--------|------|
| **Build** | GREEN (`npm run build`) |
| **Gate B — Payroll** | GREEN (15/15, w tym B6 Edge parity) |
| **Payroll P0 Incident** | **CLOSED** — S1–S3/S5 pokryte guardami + Golden Regression |
| **Stabilization W01** | GREEN (Z‑02/03/04/06 PASS · Z‑05 device · Z‑07 owner) |
| **Dług techniczny** | patrz [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md) |
