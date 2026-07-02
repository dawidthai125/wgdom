# CURRENT-TASK — W&G DOM

**Ostatnia aktualizacja:** 2026-07-02 · **prod 2.63.27** (TI-B4 release) · **TEST-INFRA-001 CLOSED** · **TI-B4 CLOSED** · **NG-04 EPIC CLOSED** · **STABILIZATION WINDOW ACTIVE**

---

## TI-B4 — Smoke agregat Przetargi · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Prod** | **2.63.27** (`6c94223`) |
| **Skrót** | Thin wrapper 12 child · manifest 1.1.0 · `scope:tenders` · Gate B |
| **SSOT** | [`docs/TI-B4-CLOSEOUT.md`](docs/TI-B4-CLOSEOUT.md) · [`docs/TEST-INFRA-LIFECYCLE.md`](docs/TEST-INFRA-LIFECYCLE.md) |

**Z-04:** **PASS** (smoke agregat Przetargi)

---

## TEST-INFRA-001 — Infrastruktura testowa · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Prod** | **2.63.26** (`3d6dd90`) |
| **Skrót** | Manifest SSOT + orchestrator `npm run test:infra` + Payroll Harness PAYROLL-GUARD-S1 |
| **SSOT** | [`docs/TEST-INFRA-001-CLOSEOUT.md`](docs/TEST-INFRA-001-CLOSEOUT.md) · [`docs/TEST-INFRA-LIFECYCLE.md`](docs/TEST-INFRA-LIFECYCLE.md) · [`docs/TEST-INFRA-001-DESIGN-FREEZE.md`](docs/TEST-INFRA-001-DESIGN-FREEZE.md) |

### Backlog post-MVP (OPEN · na polecenie)

| ID | Element | Status |
|----|---------|--------|
| **TI-B1** | Ekstrakcja `removeWeekEmployee()` do warstwy lib | OPEN |
| **TI-B2** | Konfiguracja `HARNESS_SANDBOX_JOB_IDS` przed pierwszym prod run | OPEN · **P0 gate** |
| **TI-B3** | CI GitHub Actions — gate B/C z orchestratora | OPEN |
| **TI-B4** | Smoke agregat NG-01–04 | **CLOSED** · prod **2.63.27** |

---

## NG-05 — Market Pricing Intelligence (MPI) · **PROJECT DESIGN COMPLETE**

| Pole | Wartość |
|------|---------|
| **Status** | **PROJECT DESIGN COMPLETE** · **IMPLEMENT BLOCKED** |
| **Closeout** | [`docs/NG-05-PROJECT-CLOSEOUT.md`](docs/NG-05-PROJECT-CLOSEOUT.md) · **2026-07-01** |
| **SSOT produktu** | DESIGN FREEZE v2 (FROZEN) |
| **Product Readiness** | **READY** |
| **Implementation Readiness** | **NOT READY** |
| **Następna faza** | **MPI-0** Data Foundation — na polecenie |

**Dokumenty (sesja 2026-07-01):** BUSINESS REQUIREMENTS · DESIGN FREEZE v2 · ARCHITECTURE SPEC · DECISION MODEL · AD-01 · AD-02 · AD-03 · IMPLEMENTATION ROADMAP · MPI-0 IMPLEMENTATION PREPARATION · FINAL READINESS REPORT · **PROJECT CLOSEOUT**

**Waiting (przed IMPLEMENT MPI-0 / pierwszym commitem):**

- **AD-01** — decyzje prawne (R1 KB.pl · R2 redistribution SaaS · R3 Plan B · R4 format Sekocenbud Q2 2026)
- **STABILIZATION** — decyzja AD-10 (Z-01–Z-07 CLOSED **lub** explicit override właściciela)
- **Owner IMPLEMENT command** — jawne polecenie startu MPI-0
- **PRE-COMMIT GO** — GC/GP z MPI-0 IMPLEMENTATION PREPARATION §1

**Zakaz:** implementacja · kod · rozszerzenie DESIGN FREEZE — do odblokowania bramek powyżej.

---

## PAYROLL-CLOUD-RECOVERY — Guard Phase (B3–B3.2) · **SERIES CLOSED**

| Bundle | Temat | Status | Prod |
|--------|-------|--------|------|
| **B3** | Guard Phase 2 — R1/R2 `kw-week-employees` | **CLOSED** | **2.63.18** (`45eddaa`) |
| **B3.1** | `pushPayrollWeekAfterRollover` → guard roster (R3) | **CLOSED** | **2.63.19** (`91d02de`) |
| **B3.2** | Usunięcie `payrollRosterPushRef` (cleanup) | **CLOSED** | **2.63.20** (`6afd9fd`) |

**Closeout serii:** [`docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md`](docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md)  
**SSOT B3:** [`docs/PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md`](docs/PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md)  
**SSOT B3.1:** AUDIT + DESIGN FREEZE B3.1 (2026-07-01) · prod **2.63.19** (`91d02de`)

**Łańcuch Guard Phase:** **2.63.18** R1/R2 · **2.63.19** R3 rollover · **2.63.20** ref cleanup · **PRODUCTION VERIFIED**

---

## PAYROLL-CLOUD-RECOVERY — Etap 2 · **CLOSED**

| Bundle | Temat | Status | Prod |
|--------|-------|--------|------|
| **B1** | Fail-loud `persistPayrollRoster` (P0.1d) | **CLOSED** | **2.63.17** (`734cbfe`) |
| **B2** | JobsView `CloudSyncMutationGuard` (J1–J5) | **CLOSED** | **2.63.17** (`734cbfe`) |
| **B3** | Guard Phase 2 — R1/R2 `kw-week-employees` | **CLOSED** | **2.63.18** (`45eddaa`) |
| **B3.1** | `pushPayrollWeekAfterRollover` → guard roster | **CLOSED** | **2.63.19** (`91d02de`) |
| **B3.2** | Usunięcie `payrollRosterPushRef` po pełnej migracji | **CLOSED** | **2.63.20** (`6afd9fd`) |
| **B4** | RCA-3: `finalizePayrollBundleMerge` SSOT bootstrap/runtime | **CLOSED** | **2.63.21** (`b3d5664`) |
| **B5** | RCA-2: closed week + archiwum UI | **CLOSED** | **2.63.22** (`187afb8`) |
| **B6** | Edge Parity — merge `directoryId` vs UUID | **CLOSED** | **2.63.23** (`d670892`) |
| **RB** | Restore Banner false positive (`payrollMetrics`) | **CLOSED** | **2.63.24** (`727e6c4`) |

**SSOT Etap 2 (B1+B2):** [`docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md)  
**SSOT Guard Phase closeout:** [`docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md`](docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md)  
**SSOT B4 closeout:** [`docs/PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](docs/PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md)

**Łańcuch prod (skład):** **2.63.15** roster UNION · **2.63.16** guard LP Przydziały · **2.63.17** B1+B2 · **2.63.18–20** Guard Phase B3/B3.1/B3.2 · **2.63.21** B4 · **2.63.22** B5 · **2.63.23** B6 · **2.63.24** RB — **PRODUCTION VERIFIED**

---

## Audit Hub — AH-REG-1 · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Prod** | **2.63.25** (`d9ba13f`) |
| **Skrót** | `notifySecurityAuditLogChanged` + `refreshAuditHubAuxFromCloud` |
| **SSOT** | [`docs/AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md`](docs/AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md) · [`docs/AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md`](docs/AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md) |

---

## PAYROLL-CLOUD-RECOVERY — hotfixy P0 (wcześniejsze) · **CLOSED**

| Release | Commit | Skrót |
|---------|--------|-------|
| **2.62.73** | — | Etap 1 — mutex sync · merge workEntries · guard fail-loud |
| **2.63.15** | `1a65341` | P0 roster — UNION `directoryId` · dedup Kadr |
| **2.63.16** | `31a687a` | P0 guard przydziałów — `CloudSyncMutationGuard` |

**SSOT P0 roster:** [`docs/PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](docs/PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md) · **SSOT guard:** [`docs/PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](docs/PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md)

---

## NG-04 — Kosztorys Workspace PRO · **EPIC CLOSED**

| Faza | Status |
|------|--------|
| **NG-04.0** DESIGN FREEZE | CLOSED |
| **NG-04.1** BOQ Explorer | **CLOSED** · prod **2.63.9** |
| **NG-04.2** Benchmark per Line | **CLOSED** · prod **2.63.10** |
| **NG-04.3** ATH Fidelity | **CLOSED** · prod **2.63.11** |
| **NG-04.4** Polish & EPIC CLOSE | **CLOSED** · prod **2.63.12** |

**SSOT:** [`docs/NG-04-DESIGN-FREEZE.md`](docs/NG-04-DESIGN-FREEZE.md) · [`docs/NG-04-EPIC-CLOSE-REPORT.md`](docs/NG-04-EPIC-CLOSE-REPORT.md) · Principles **#001–#010**

**Review:** [`docs/ARCHITECTURE-REVIEW-2026-TENDERS.md`](docs/ARCHITECTURE-REVIEW-2026-TENDERS.md)

---

## P0 — Tender Detail Tab SSOT · **CLOSED**

| Pole | Wartość |
|------|---------|
| **Prod** | **2.63.8** · commit **`f482016`** |

---

## NG-03 — Tender Workspace UX · **EPIC CLOSED** (2.63.7)

---

## NG-02 — Tender Automation Pipeline · **EPIC CLOSED** (2.62.98)

---

## NG-01 — Tender Trust Layer · **SHIPPED** (w ramach serii 2.63.x)

---

## STABILIZATION WINDOW · **ACTIVE**

| Pole | Wartość |
|------|---------|
| **Start** | 2026-07-01 (po NG-04.4 · prod **2.63.12**) |
| **Status** | **ACTIVE** — brak nowych epiców |
| **Plan** | [`docs/STABILIZATION-WINDOW-PLAN.md`](docs/STABILIZATION-WINDOW-PLAN.md) |
| **Raport tygodniowy (SSOT)** | [`docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md) |

**Rytuał:** raz w tygodniu uzupełnij szablon metryk · werdykt `STABLE` / `WATCH` / `ACTION` · przy P0 → `INCIDENTS-2026-06.md` · zapis opcjonalnie w [`docs/stabilization-weekly/`](docs/stabilization-weekly/).

**SSOT sync (AD-10):** [`docs/AD-10-SSOT-SYNCHRONIZATION-REPORT.md`](docs/AD-10-SSOT-SYNCHRONIZATION-REPORT.md) · 2026-07-01

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.63.27** (`6c94223`) · **PRODUCTION VERIFIED** |
| **TI-B4** | **CLOSED** · **Z-04 PASS** · **2.63.27** |
| **NG-04** | **EPIC CLOSED** |
| **PAYROLL Guard Phase** | **B3+B3.1+B3.2 CLOSED** · [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2** | **B1–B6 + RB CLOSED** |
| **Audit Hub AH-REG-1** | **CLOSED** · **2.63.25** |
| **TEST-INFRA-001** | **CLOSED** · **2.63.26** |
| **Stabilization Window** | **ACTIVE** |
| **NG-05 MPI** | **DESIGN COMPLETE** · **IMPLEMENT BLOCKED** |
| **Aktywny epic Przetargi** | **brak** — na polecenie |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **TEST-INFRA post-MVP** (TI-B1–B3) | OPEN · na polecenie |
| **Work Catalog P2** — UI Biblioteka Robót | OPEN |
| **G-08** persist `code` in snapshot | OPEN |
| **G-02** R/M/S inline BOQ | OPEN |
