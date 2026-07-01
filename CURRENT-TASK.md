# CURRENT-TASK — W&G DOM

**Ostatnia aktualizacja:** 2026-07-01 · **prod 2.63.17** (`734cbfe`) · **NG-04 EPIC CLOSED** · **STABILIZATION WINDOW ACTIVE**

---

## PAYROLL-CLOUD-RECOVERY — Etap 2 (MIN) · **PARTIAL CLOSED**

| Bundle | Temat | Status | Prod |
|--------|-------|--------|------|
| **B1** | Fail-loud `persistPayrollRoster` (P0.1d) | **CLOSED** | **2.63.17** (`734cbfe`) |
| **B2** | JobsView `CloudSyncMutationGuard` (J1–J5) | **CLOSED** | **2.63.17** (`734cbfe`) |
| **P0.1b** | RCA-2: closed week + archiwum UI | **OPEN** | — |
| **P0.1c** | RCA-3: `applyBootstrapPayrollMerge` | **OPEN** | — |
| **Guard Phase 2** | `payrollRosterPushRef` → guard `kw-week-employees` | **OPEN** | — |
| **Edge Parity** | Edge merge `directoryId` vs UUID | **OPEN** | — |

**SSOT Etap 2 (B1+B2):** [`docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md)

**Łańcuch prod (skład):** **2.63.15** roster UNION · **2.63.16** guard LP Przydziały · **2.63.17** fail-loud roster + JobsView guard

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

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.63.17** (`734cbfe`) · **PRODUCTION VERIFIED** |
| **NG-04** | **EPIC CLOSED** |
| **PAYROLL-CLOUD-RECOVERY Etap 2** | **B1+B2 CLOSED** · backlog P0.1b/c · Guard Phase 2 · Edge Parity **OPEN** |
| **Stabilization Window** | **ACTIVE** |
| **Aktywny epic Przetargi** | **brak** — na polecenie |

---

## TEST-INFRA-001 — Universal Payroll Test Harness

| Pole | Wartość |
|------|---------|
| **Design freeze** | **FINAL — APPROVED** (2026-07-01) |
| **Status** | **READY FOR IMPLEMENTATION** |
| **Implementacja** | **NOT STARTED** — okno stabilizacji; tylko na polecenie |
| **SSOT** | [`docs/TEST-INFRA-001-DESIGN-FREEZE.md`](docs/TEST-INFRA-001-DESIGN-FREEZE.md) · Principles **#014–#026** |

### Backlog techniczny TEST-INFRA (przed prod smoke)

| ID | Element | Status |
|----|---------|--------|
| **TI-B1** | Ekstrakcja `removeWeekEmployee()` do warstwy lib | OPEN |
| **TI-B2** | Konfiguracja `HARNESS_SANDBOX_JOB_IDS` przed pierwszym prod run | OPEN · **P0 gate** |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **P0.1b** — closed week UI (RCA-2) | **OPEN** |
| **P0.1c** — bootstrap payroll merge (RCA-3) | **OPEN** |
| **Guard Phase 2** — `payrollRosterPushRef` → guard | **OPEN** |
| **Edge Parity** — Edge `kw-week-employees` merge | **OPEN** |
| **TEST-INFRA-001** implementacja harnessu | READY FOR IMPLEMENTATION · NOT STARTED |
| **Work Catalog P2** — UI Biblioteka Robót | OPEN |
| **G-08** persist `code` in snapshot | OPEN |
| **G-02** R/M/S inline BOQ | OPEN |
