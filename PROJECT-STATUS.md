# PROJECT-STATUS — W&G DOM

> Aktualny stan produkcji, wersji, EPIC‑ów i backlogu. Migawka projektu.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `d2a3d90` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** · Payroll P0 Incident **CLOSED** · PR-PAY-S6 **CLOSED** |

---

## 1. Stan produkcji

| Pole | Wartość |
|------|---------|
| **URL** | https://www.wgdom.fun |
| **Repo / branch** | github.com/dawidthai125/wgdom · `main` |
| **Wersja UI (prod)** | **v2.63.27** (`CHANGELOG[0].version` w `src/app/changelog-data.ts`) — GREEN, PRODUCTION VERIFIED |
| **HEAD `main`** | `d2a3d90` |
| **Deploy** | Vercel Git Integration (`git push origin main`) · Edge → GitHub Actions (`supabase/functions/**`) |
| **Identyfikacja buildu** | `version.json` (deploy verify) · Version Banner (commit‑based identity) · PWA SW cache `wgdom-shell-{version}` |

### Wersja UI vs HEAD — ważne

Wersja UI **v2.63.27** to ostatni wpis w `changelog-data.ts`. Po niej na `main` trafiły zmiany **bez bumpu numeru UI** (biblioteka / test‑infra / hotfixy P0), zawarte w HEAD `d2a3d90`:

- **Version Banner Refresh** — Build Identity (commit) — `e255aef`
- **Work Catalog P3.1** (Market Average Engine) + **P3.2** (Import Persistence) — `c8e1b9e`…`f37b619`
- **PAYROLL P0 Incident S1–S3 + S5** (cross‑week guard, tombstones, zero‑hours, settled persistence) — `1d5b0b7`…`fd56cf7`
- **Work Catalog P3.3 S1–S3** (Public API Engine · status z engine · confidence + sources) — `0b3ec5a`…`fe1d4f5`
- **PR‑PAY‑S6** Archive Restore Eligibility Guard — `d2a3d90`

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
| **STABILIZATION WINDOW** (AD‑10, Z‑01–Z‑07) | **ACTIVE** · W01 Health GREEN | [`docs/STABILIZATION-WINDOW-PLAN.md`](docs/STABILIZATION-WINDOW-PLAN.md) |
| **PR‑PAY‑S6** — Archive Restore Eligibility Guard | **CLOSED** · IMPLEMENT COMPLETE · BUILD PASS · TEST PASS · HEAD `d2a3d90` | [`docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md`](docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md) |
| **Z‑05 Field Validation** (mobile, iPhone Safari) | **PENDING (Device Required)** | j.w. |
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
| **Work Catalog P3.3** — implementacja UI po decyzjach design freeze | OPEN |
| **G‑08** — persist `code` w snapshot BOQ | OPEN |
| **G‑02** — R/M/S inline w BOQ | OPEN |
| **TP200B** — kosztorys fidelity (`rows` cap) | PLANNED |

---

## 6. Ostatnie releasy / commity (HEAD ↓)

| Commit | Opis |
|--------|------|
| `fd56cf7` | fix(payroll): **PR‑PAY‑S5** — Settled Status Persistence (P0) |
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
