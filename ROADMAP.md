# ROADMAP — W&G DOM

> Aktualna roadmapa: Completed · In Progress · Planned · Backlog.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `4c38f4f` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **🔴 P0 PAYROLL CLOUD SYNC INCIDENT ACTIVE (prod DEGRADED)** · STABILIZATION WINDOW ACTIVE · PR-PAY-S6 **CLOSED** · PR-PAY-S7 **S7-1 CLOSED · OBSERVATION** |

> **🔴 P0 FREEZE:** nowe EPIC-i wstrzymane do zamknięcia P0 — **WC-P3.3 S4 Preview Mount = ON HOLD**. Dozwolone tylko OBSERVATION PR-PAY-S7 + docs.

---

## ✅ Completed

| Pozycja | Wersja / commit |
|---------|-----------------|
| **PR‑PAY‑S7‑1** — Cloud Batch Diagnostics (Edge `batch-set`: `app.onError` + try/catch + requestId) | `4c38f4f` |
| **PR‑PAY‑S6** — Archive Restore Eligibility Guard (eligible archive roster: baner G1 + restore G2) | `d2a3d90` |
| **PAYROLL P0 Incident** — S1 week guard · S2 tombstones · S3 zero‑hours · S5 settled persistence | `1d5b0b7`→`fd56cf7` |
| **Work Catalog P3.2** — Import Persistence (apply / rollback / commit market quotes) | `ba2699d`→`f37b619` |
| **Work Catalog P3.1** — Market Average Engine + adapters + CSV preview + seed | `c8e1b9e`→`04cb034` |
| **Version Banner Refresh** — Build Identity (commit‑based) | `e255aef` |
| **TI‑B4** — Smoke agregat Przetargi NG‑01–04 (Z‑04 PASS) | v2.63.27 |
| **TEST‑INFRA‑001** — manifest + orchestrator + Payroll Harness | v2.63.26 |
| **MB‑1 / MB‑1.1 / MB‑2 / TI‑B2 / TI‑B2.1** — gate integrity + docs SSOT + harness safety | `460031f`→`2efe8b5` |
| **Audit Hub** — MVP‑0→1B + P1 WM + AH‑REG‑1 | v2.62.37→2.63.25 |
| **PAYROLL‑CLOUD‑RECOVERY Etap 2** — B1–B6 + Restore Banner | v2.63.17→2.63.24 |
| **PAYROLL Guard Phase** — B3 / B3.1 / B3.2 | v2.63.18→2.63.20 |
| **NG‑04** — Kosztorys Workspace PRO (BOQ Explorer, benchmark, ATH fidelity) | v2.63.9→2.63.12 |
| **NG‑03** — Tender Workspace UX | v2.63.7 |
| **NG‑02** — Tender Automation Pipeline | v2.62.98 |
| **NG‑01** — Tender Trust Layer | seria 2.63.x |
| **WM Schematy** jednokreskowe — MVP + V2 fidelity | v2.62.51 |
| **Mobile Recovery** — UX pack + Jobs drill‑in | v2.62.79 |
| **SUPER ADMIN ACL** — instrukcja + zmiany | v2.62.92 |
| **Operational Notes** — P0→HF | v2.58.1 |
| **P2‑F** — Tender Qualification Pipeline | v2.51.24 |
| **ZI Tauron 2026** — WM Druk | POST‑ZI (STABLE) |
| **Platforma 20.5Z** — stabilizacja, E2E, PWA | 20.5Z (COMPLETE) |

Pełny rejestr historyczny: [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md).

---

## 🔄 In Progress

| Pozycja | Stan | SSOT |
|---------|------|------|
| **STABILIZATION WINDOW** (AD‑10 · Z‑01–Z‑07) | **ACTIVE** · W01 Health GREEN | [`docs/STABILIZATION-WINDOW-PLAN.md`](docs/STABILIZATION-WINDOW-PLAN.md) |
| **PR‑PAY‑S6** — Archive Restore Eligibility Guard | **CLOSED** · IMPLEMENT COMPLETE · BUILD PASS · TEST PASS · HEAD `d2a3d90` | [`docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md`](docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md) |
| **PR‑PAY‑S7** — Cloud Batch 500 Investigation | **S7‑1 CLOSED** (`4c38f4f`) · **OBSERVATION — waiting for production evidence** · S7‑2…S7‑5 DRAFT | [`docs/PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](docs/PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) |
| **Z‑05 Field Validation** (mobile iPhone Safari) | **PENDING (Device Required)** | j.w. |
| **Work Catalog P3.3** — Market Pricing UX | **AUDIT DONE · design freeze pending (D‑A…D‑D)** | [`docs/work-catalog/`](docs/work-catalog/) |

---

## 📋 Planned (po odblokowaniu / na polecenie)

| Pozycja | Warunek startu |
|---------|----------------|
| **NG‑05 MPI‑0** — Market Pricing Intelligence, Data Foundation | AD‑01 (legal) + koniec STABILIZATION + **owner IMPLEMENT command** — obecnie **BLOCKED** ([`docs/NG-05-PROJECT-CLOSEOUT.md`](docs/NG-05-PROJECT-CLOSEOUT.md)) |
| **Work Catalog P3.3** — implementacja UI (integracja market pricing) | decyzje design freeze D‑A…D‑D |
| **TP200B** — kosztorys fidelity (`rows` cap) | na polecenie |
| **TI‑B3** — CI GitHub Actions gate B/C z orchestratora | na polecenie |
| **TI‑B1** — ekstrakcja `removeWeekEmployee()` do warstwy lib | na polecenie |

---

## 🗃️ Backlog (OPEN, na polecenie)

| Pozycja | Obszar |
|---------|--------|
| **Work Catalog P2** — UI Biblioteka Robót | Work Catalog |
| **G‑08** — persist `code` w snapshot BOQ | Kosztorys |
| **G‑02** — R/M/S inline w BOQ | Kosztorys |
| **P1.1** — `schematic_edited` audit przy zamknięciu sesji edycji | WM Schematy |
| **MVP‑1C** — Audit Hub export | Audit Hub |
| **P3** — Operational Notes export (PDF/DOCX/Email) | Operational Notes |
| **Inspector mobile / WM Pomiary UX / Jobs history.pushState** | Mobile (enhancements) |
| **Biweekly carry forward** (V2) | Payroll (V1 = tylko tygodniówka) |

---

## Zasady roadmapy

- **STABILIZATION WINDOW ACTIVE** → domyślnie **brak nowych epiców**; priorytet: utrzymanie, regresje, field validation.
- Każdy nowy epic wymaga jawnego polecenia właściciela + AUDIT + (dla dużych) DESIGN FREEZE.
- Statusy pochodzą z [`CURRENT-TASK.md`](CURRENT-TASK.md) i [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) — one są rozstrzygające przy rozbieżności.
