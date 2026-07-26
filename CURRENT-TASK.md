# CURRENT-TASK — W&G DOM

**Ostatnia aktualizacja:** 2026-07-26 (**COST-S2** · AI-COST-01) · tip SSOT → [`docs/AI/09_PRODUCTION_BASELINE.md`](docs/AI/09_PRODUCTION_BASELINE.md) · **STABILIZATION WINDOW ACTIVE**

> **Nowa sesja AI:** [`docs/AI/MASTER_HANDOFF.md`](docs/AI/MASTER_HANDOFF.md) → [`docs/AI/AI_ENTRY.md`](docs/AI/AI_ENTRY.md) — **nie** czytaj historii czatu.

## ★ AI-COST-01 / COST-S2 — Mapping Engine — **IMPLEMENT COMPLETE**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.53** / **`17a7a83`** |
| **Feature commit** | **`17a7a83`** |
| **DF** | [`docs/architecture/WGDOM-AI-COST-01-COST-S2-DESIGN-FREEZE.md`](docs/architecture/WGDOM-AI-COST-01-COST-S2-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-AI-COST-01-COST-S2-RELEASE-REPORT.md`](docs/architecture/WGDOM-AI-COST-01-COST-S2-RELEASE-REPORT.md) |
| **IN** | Mapping Engine · catalogWorkId · workCategory · confidence · matchedBy · aiRationale · candidateMatches |
| **OUT** | wycena M/R/S · UI BOQ (deferred) · Bid Proposal · Pricing/Autonomous · parsery |
| **Next** | Owner GO → **COST-S3** (materiały) lub **S2.1** (RO UI preview) |

---

## ★ AI-COST-01 / COST-S1 — OfferBoq model — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.52** / **`fd4b112`** |
| **Feature commit** | **`fd4b112`** · tip docs **`47303cb`** |
| **DF** | [`docs/architecture/WGDOM-AI-COST-01-COST-S1-DESIGN-FREEZE.md`](docs/architecture/WGDOM-AI-COST-01-COST-S1-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-AI-COST-01-COST-S1-RELEASE-REPORT.md`](docs/architecture/WGDOM-AI-COST-01-COST-S1-RELEASE-REPORT.md) |
| **AUDIT / ARCH** | [`WGDOM-AI-COST-01-AUDIT.md`](docs/architecture/WGDOM-AI-COST-01-AUDIT.md) · [`WGDOM-AI-COST-01-ARCHITECTURE.md`](docs/architecture/WGDOM-AI-COST-01-ARCHITECTURE.md) |
| **IN** | `tender-offer-boq.ts` · adapter ze snapshotu · pola M/R/S/Kp/marża (null) · prep edycji |
| **OUT** | parsery · wycena · UI tabeli · Bid Proposal · Pricing/Autonomous · AP2 |
| **Next** | superseded by COST-S2 |

---

## ★ AP2-S4 — Business Risk Engine — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.51** / **`5355c19`** |
| **UI** | **2.65.51** |
| **Feature commit** | **`5355c19`** |
| **DF** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-DESIGN-FREEZE.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S4-RELEASE-REPORT.md) |
| **IN** | Risk Engine · 5 kategorii · uzasadnienie · mocne strony · Business Fit (docs-only) |
| **OUT** | profil firmy · Autonomous/Pricing · BundleV2 full · S7 |
| **Next** | kolejny slice tylko po Owner GO |

---

## ★ AP2-S3 — Deep Tender Intelligence — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.50** / **`3e23631`** |
| **UI** | **2.65.50** |
| **Feature commit** | **`3e23631`** |
| **DF** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-DESIGN-FREEZE.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S3-RELEASE-REPORT.md) |
| **IN** | Fakty SWZ/przedmiar/umowa · panel Najważniejsze informacje · source+confidence |
| **OUT** | Pricing/Autonomous · risk scoring · S7 panel · nowe parsery |
| **Next** | superseded by AP2-S4 |

---

## ★ AP2-S2 — Auto Analysis & UX Flow — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.49** / **`7c04203`** |
| **UI** | **2.65.49** |
| **Feature commit** | **`7c04203`** |
| **DF** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-DESIGN-FREEZE.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-RELEASE-REPORT.md) |
| **IN** | Re-run CTA · historia · journey stages · live summary · hint cleanup · REUSE auto pipeline |
| **OUT** | fingerprint redesign · Pricing/Autonomous Gate · S3+ · duży panel |
| **Next** | superseded by AP2-S3 |

---

## ★ AP2-S1 — Kompletność dokumentacji + gotowość wyceny — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION VERIFIED** · `version.json` **2.65.48** / **`01d8981`** |
| **UI** | **2.65.48** |
| **Feature commit** | **`01d8981`** |
| **DF** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-DESIGN-FREEZE.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-DESIGN-FREEZE.md) |
| **RELEASE** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S1-RELEASE-REPORT.md) |
| **IN** | DocumentRole+ · Completeness 14 slots · valuation readiness · Documents summary UX |
| **OUT** | Pricing Gate · Autonomous · S2+ · duży panel |
| **Next** | superseded by AP2-S2 |

---

## ★ AP2-S0 — Semantyka przedmiaru / brak kosztorysu ≠ błąd — **PRODUCTION**

| Element | Wartość |
|---------|---------|
| **Status** | **PRODUCTION** · UI **2.65.47** @ **`2c1ef53`** |
| **RELEASE** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S0-RELEASE-REPORT.md) |

---

## ★ WGDOM-ANALIZA-PRZETARGOW-2.0 — **ACTIVE** (S0–S4)

| Element | Wartość |
|---------|---------|
| **AUDIT** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-AUDIT.md) |
| **PLAN** | [`docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-PLAN.md`](docs/architecture/WGDOM-ANALIZA-PRZETARGOW-2.0-PLAN.md) |

---

## ★ WGDOM-AI-DOCS-CONSOLIDATION-03 — **DOCS COMPLETE** (lokalnie; commit tylko na Owner GO)




| Element | Wartość |
|---------|---------|
| **Status** | **DOCS COMPLETE** · AUDIT → DOCUMENTATION → HANDOFF · **bez** kodu / commit / push w tickecie |
| **MASTER** | [`docs/AI/MASTER_HANDOFF.md`](docs/AI/MASTER_HANDOFF.md) |
| **AUDIT** | [`docs/architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md`](docs/architecture/WGDOM-AI-DOCS-CONSOLIDATION-03-AUDIT.md) |
| **OUT** | Zero `src/**` · zero UI · zero migracji |

---

## ★ WGDOM DASHBOARD BODY (S1–S4) — **COMPLETE**

| Element | Wartość |
|---------|---------|
| **Status** | **COMPLETE** |
| **Slices** | S1 Braki `1cf8af2` · S2 Pilne `e2e1c58` · S3 Notatki `ca08c75` · S4 Przetargi skrót `bd0f239` |
| **Thin** | Każdy = 3 pliki (1 src + DF + IMPLEMENT) · PV GREEN · ui-guard 9/9 |
| **Closeout** | [`docs/architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md`](docs/architecture/WGDOM-DASHBOARD-BODY-02-CLOSEOUT.md) |
| **Backlog** | S5 rows W08/W09 · S6 ui-guard body — **opcjonalne** · nie blokują COMPLETE |
| **OUT** | Liczniki V3 · Payroll · pełny TEUX Strategia |

---

## ★ WGDOM UI FOUNDATION v1.0 — **COMPLETE**

| Element | Wartość |
|---------|---------|
| **Status** | **COMPLETE** |
| **Deploy tip Foundation** | **`2a99e54`** (A11Y + e2e-ui-guard) · UI **2.65.46** |
| **Zamknięte** | GDS · Dashboard shell · Sidebar · Topbar · Roboty chrome · A11Y · UI Regression Guard |
| **PV** | `test:e2e:ui-guard` **9/9** @ prod |
| **SSOT** | [`docs/architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md`](docs/architecture/WGDOM-UI-FOUNDATION-01-FOUNDATION-REPORT.md) |

---

## ★ GLOBAL-DESIGN-SYSTEM-MAINT-01 — **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Parent** | GLOBAL-DESIGN-SYSTEM-01 = **CLOSED** (bez re-open) |
| **MAINT-01A** | Owner **ACCEPTED** |
| **SOAK-01** | **WDROŻONY** (WgField id/htmlFor) |
| **SOAK-03** | **WDROŻONY** (WgModalFrame close 44×44) |
| **SOAK-02** | **DEFER** |
| **SOAK-06** | **DEFER** |
| **Tip UI** | nadal **2.65.46** — patrz `09` (nie kopiuj SHA tutaj) |
| **SSOT CLOSE** | [`docs/architecture/GLOBAL-DESIGN-SYSTEM-MAINT-01-CLOSE-REPORT.md`](docs/architecture/GLOBAL-DESIGN-SYSTEM-MAINT-01-CLOSE-REPORT.md) |

> **STABILIZATION WINDOW ACTIVE**. Nie startuj SOAK-02/06 ani GDS-02 bez Owner GO.

---

## ★ GLOBAL-DESIGN-SYSTEM-01 — **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Owner** | Production UI Review **ACCEPTED** · EPIC CLOSE GO |
| **Slices** | S0 Foundation · S1 Focus+Overlay · S2 Shell Topbar · S3 CTA+Search · S4 Modal Rollout |
| **DS-13** | **No Parallel Design Systems** — nowe UI wyłącznie `Wg*`; bez lokalnych Button/Input/Modal; bez reaktywacji shadcn bez decyzji architektonicznej |
| **Tip UI** | nadal **2.65.46** (LOGIN-UI-01) — GDS release commit = osobny Owner step |
| **OUT** | TEUX · Payroll CORE · Dashboard/Sidebar full · Cloud Sync · Edge · auth/routing/API |
| **SSOT CLOSE** | [`docs/architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md`](docs/architecture/GLOBAL-DESIGN-SYSTEM-01-EPIC-CLOSE-REPORT.md) |
| **Decision** | D-21 [`docs/AI/12_DECISION_LOG.md`](docs/AI/12_DECISION_LOG.md) · tip [`docs/AI/09_PRODUCTION_BASELINE.md`](docs/AI/09_PRODUCTION_BASELINE.md) |
| **Next GDS** | **GDS-02** tylko po Owner GO (wąski high-traffic) · SOAK-02/06 = DEFER (patrz MAINT-01) |

> **STABILIZATION WINDOW ACTIVE** · Protected Core **GREEN**. Nie startuj pełnego GDS-02 ani Payroll bez Owner GO.

---

## ★ DOCUMENTATION FINALIZATION & AI HANDOFF — **COMPLETE** (superseded path → CONSOLIDATION-03)

| Element | Wartość |
|---------|---------|
| **Status** | **COMPLETE** · docs-only · **aktualny MASTER:** [`docs/AI/MASTER_HANDOFF.md`](docs/AI/MASTER_HANDOFF.md) |
| **CI Remediation** | **EPIC CLOSED** · [`docs/architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md`](docs/architecture/CI-REMEDIATION-EPIC-CLOSEOUT.md) |
| **Payroll AI Safety docs** | Quick Start · Guard Rails · Dependency · Playbook · Regression · SSOT |
| **AI Memory / Decision Tree** | [`docs/AI/AI_MEMORY.md`](docs/AI/AI_MEMORY.md) · [`docs/AI/AI_DECISION_TREE.md`](docs/AI/AI_DECISION_TREE.md) |
| **Handoff nowych sesji** | [`docs/AI/MASTER_HANDOFF.md`](docs/AI/MASTER_HANDOFF.md) · [`docs/AI/PROJECT_HANDOFF.md`](docs/AI/PROJECT_HANDOFF.md) |
| **Start path** | `MASTER_HANDOFF` → `AI_ENTRY` → Gate → … |
| **Residual** | CI-C-2 (P3, legacy e2e) · HARDENING B1/C/E / 02F / H0.x — tylko Owner GO |
| **OUT** | Zero zmian `src/**` w tym etapie |

> **STABILIZATION WINDOW ACTIVE** · CI tip **GREEN** · nowe sesje startują od `docs/AI/MASTER_HANDOFF.md`.

---

## ★ PAYROLL Hours-wipe protection EPIC — **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Prod** | UI **2.65.43** · feature **`ea1b0a6`** · **PRODUCTION VERIFIED** |
| **Stages** | D1 `ace2855` · D2+D3 `f3b8c03` · D4+D5 `ea1b0a6` |
| **OUT** | Nowe prace Payroll · CI Gate B (zamknięty osobno — CI Remediation CLOSED) |
| **SSOT CLOSE** | [`docs/architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](docs/architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| **AI SSOT** | [`docs/PAYROLL-ARCHITECTURE-SSOT.md`](docs/PAYROLL-ARCHITECTURE-SSOT.md) — invariants · safety · AI guardrails |
| **Release History** | [`docs/releases/PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md`](docs/releases/PAYROLL-HOURS-WIPE-PROTECTION-EPIC-RELEASE-HISTORY.md) |
| **Next Payroll** | **NONE** bez nowego Owner GO |

> **STABILIZATION WINDOW ACTIVE** · Protected Core **GREEN** · **Nie** startuj nowych prac Payroll z tego EPIC.

---

## ★ WGDOM-HARDENING-01B0 — Circuit Breaker Telemetry · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Prod** | UI **2.65.40** · feature **`23d7723`** · docs tip **`fcf66b0`** · **PRODUCTION VERIFIED · GREEN** |
| **Zakres** | B0-V1 smoke+progi · B0-V2 ledger · B0-V3 runbook · M1–M5 · tooling/docs only |
| **OUT** | Runtime · breaker semantics · limits · deps · `builtAt` · B1 · CORE · M6 (DEFER) |
| **Residual** | **H-FP-CHURN = MITIGATED / MONITOR** · M6 **DEFER** · B1 OUT |
| **SSOT CLOSE** | [`docs/architecture/WGDOM-HARDENING-01B0-CLOSEOUT.md`](docs/architecture/WGDOM-HARDENING-01B0-CLOSEOUT.md) |
| **SSOT PV** | [`docs/architecture/WGDOM-HARDENING-01B0-PRODUCTION-VERIFICATION.md`](docs/architecture/WGDOM-HARDENING-01B0-PRODUCTION-VERIFICATION.md) |
| **Runbook** | [`docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md`](docs/architecture/WGDOM-HARDENING-01B0-RUNBOOK.md) |
| **Next HARDENING** | EPIC **B1 / E / C** — tylko po Owner GO |

> **STABILIZATION WINDOW ACTIVE** · Protected Core **GREEN** · Sync Storm P0 **INTACT**.  
> **Nie** startuj EPIC B1/C/E / ARCH-02F / N2 bez jawnego Owner GO.

---

## ★ WGDOM-HARDENING-01D — Edge 546 Monitoring · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Prod** | UI **2.65.40** · feature **`23d7723`** · docs tip (historyczny) **`96d44d0`** · aktualny tip **`fcf66b0`** |
| **Zakres** | D-V1 smoke+progi · D-V2 ledger+runbook · tooling/docs only |
| **OUT** | Runtime · Cloud Sync · retry 546 · Edge chunk · D-V3 (DEFER) |
| **Residual** | **M-EDGE-546 = MONITOR** · D-V3 **DEFER** · H-FAT MONITOR |
| **SSOT CLOSE** | [`docs/architecture/WGDOM-HARDENING-01D-CLOSEOUT.md`](docs/architecture/WGDOM-HARDENING-01D-CLOSEOUT.md) |
| **SSOT PV** | [`docs/architecture/WGDOM-HARDENING-01D-PRODUCTION-VERIFICATION.md`](docs/architecture/WGDOM-HARDENING-01D-PRODUCTION-VERIFICATION.md) |
| **Runbook** | [`docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md`](docs/architecture/WGDOM-HARDENING-01D-RUNBOOK.md) |
| **Next HARDENING** | EPIC **B1 / E / C** — tylko po Owner GO |

> **STABILIZATION WINDOW ACTIVE** · Protected Core **GREEN** · Sync Storm P0 **INTACT**.

---

## ★ WGDOM-HARDENING-01A — Persist SSOT · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** |
| **Prod** | **2.65.40** @ **`23d7723`** · **PRODUCTION VERIFIED · GREEN** |
| **Zakres** | H1 bootstrap local + ≤1 terminal cloud · H2 `bindTenderPipelineOnUpdate` · kill-switch `pipelineBootstrapPersistLocal` |
| **OUT** | Heavy E-RUN · breaker · cloud-sync · Payroll · Autonomous FP |
| **SSOT CLOSE** | [`docs/architecture/WGDOM-HARDENING-01A-CLOSEOUT.md`](docs/architecture/WGDOM-HARDENING-01A-CLOSEOUT.md) |
| **SSOT PV** | [`docs/architecture/WGDOM-HARDENING-01A-PRODUCTION-VERIFICATION.md`](docs/architecture/WGDOM-HARDENING-01A-PRODUCTION-VERIFICATION.md) |
| **CI caveat** | TEST-INFRA Gate B **TEUX-7d** GuideView `\bAI\b` — **pre-existing follow-up** · **nie** regresja 01A |
| **Next HARDENING** | EPIC **B1 / C / E** — PLAN: [`WGDOM-HARDENING-01-PLAN.md`](docs/architecture/WGDOM-HARDENING-01-PLAN.md) · **D + B0 CLOSED** |

> **STABILIZATION WINDOW ACTIVE** · Protected Core **GREEN** · Sync Storm P0 **INTACT**.

---

## ★ TENDERS-SYNC-STORM-P0 — **CLOSED** (superseded tip)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · tip feature **2.65.38** · cleanup **2.65.39** · Final Audit **PRODUCTION READY** |
| **Aktualny tip** | UI **2.65.40** / feature **`23d7723`** · docs tip **`fcf66b0`** |

> Historyczny RELEASE HOLD / platform 522 — **zamknięty** przed 01A. Nie wznawiaj HOLD.

---

## Dla przyszłych agentów — start tutaj

| Pytanie | Odpowiedź / plik |
|---------|------------------|
| **Baseline prod (UI)** | **2.65.40** · feature **`23d7723`** · docs tip **`fcf66b0`** · [`docs/AI/09_PRODUCTION_BASELINE.md`](docs/AI/09_PRODUCTION_BASELINE.md) |
| **AI Knowledge Base** | [`docs/AI/README.md`](docs/AI/README.md) → Guardrails → Baseline |
| **Ostatnio zamknięte** | **HARDENING-01B0** · **HARDENING-01D** · **HARDENING-01A** · Sync Storm P0 · Incident 23.07 cleanup · Resurrection · Rollover · H5 |
| **OPEN (Owner GO)** | HARDENING **B1 / C / E** · ARCH-02F · H0.x · DEADLOCK-N2 · CI TEUX-7d |
| **Co dalej?** | Owner GO na kolejny EPIC (prefer **E** / **B1** — nie C bez CORE GO) |

> **PAYROLL-CLOUD-RESURRECTION-01 CLOSED:** UI **2.65.35** @ **`fce7b78`** · dual-session smoke **PASS** · SSOT [`docs/architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](docs/architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md) · fence `src/lib/payroll-bootstrap-resurrection-fence.ts`


> **PAYROLL-P0-WEEK-ROLLOVER-01 CLOSED:** UI **2.65.34** @ **`e38610a`** · `classifyPayrollWeekTransition` · SSOT [`docs/architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md`](docs/architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md)

> **TEST-HARNESS-01 H5 CLOSED:** tip **`3356349`** · H0–H5 tooling **RELEASED** · otwarte działania H5 **BRAK** · **STABILIZATION WINDOW ACTIVE** · SSOT [`docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md`](docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md)

> **TEST-HARNESS-01 H0–H5:** tooling **RELEASED** · tip **`3356349`** · UI **2.65.35** bez bumpu · H0.x / H3-B/C **nie startuj** bez GO · SSOT [`docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md`](docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md)

> **TEST-HARNESS-01 H4 CLOSED:** tip **`1addd97`** · H0–H4 tooling **RELEASED** · SSOT [`docs/architecture/TEST-HARNESS-01-H4-CLOSEOUT.md`](docs/architecture/TEST-HARNESS-01-H4-CLOSEOUT.md)

> **LOCALSTORAGE-ARCH-02 A–E CLOSED:** UI **2.65.28** @ **`d896852`** · F **GO** / not started · SSOT [`docs/architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md`](docs/architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md)

**Zasada:** każda nowa funkcjonalność musi przejść **#CORE-013** (brak mixed bundle z LP/sync) i **#CORE-014** (boundary check przed commitem).

> **POST INCIDENT STANDBY:** prod **GREEN** · Resurrection + Rollover **CLOSED** · Protected Core / Payroll / Cloud Sync / Pipeline **GREEN**. **Nie implementuj** bez Owner GO.

---

## TEST-HARNESS-01 H5 — Biblioteka / Work Catalog prod sandbox · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · tooling **RELEASED** · otwarte działania H5 **BRAK** |
| **Prod tip** | **`3356349`** · UI **2.65.35** (bez bumpu) · **PRODUCTION VERIFIED · GREEN** |
| **Zakres** | `h5-biblioteka` KV-only · `kw-wgdom-work-catalog` · RMW · FORBIDDEN payroll+cost-catalog · PSB-001 |
| **OUT** | Playwright hard · Core/Payroll/Theme/Edge · cost-catalog write · H3-B/C · H0.x |
| **Test** | `npm run test:prod-sandbox -- --scenario h5-biblioteka --allow-prod` |
| **SSOT** | [`docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md`](docs/architecture/TEST-HARNESS-01-H5-CLOSEOUT.md) |
| **H0–H5** | **RELEASED** · next: **H0.x** (READY) lub H3-B/C — tylko po GO |
| **Projekt** | **STABILIZATION WINDOW ACTIVE** |

---

## TEST-HARNESS-01 H4 — Cloud KV-only prod sandbox · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · tooling **RELEASED** · otwarte działania H4 **BRAK** |
| **Prod tip** | **`1addd97`** · UI **2.65.35** (bez bumpu) · **PRODUCTION VERIFIED · GREEN** |
| **Zakres** | `h4-cloud` KV-only · nested `psb-*` · FORBIDDEN keys · PSB-001 · soft metrics WARNING |
| **OUT** | Playwright · Core/Payroll/Theme/Edge · H3-B/C · dual-writer |
| **Test** | `npm run test:prod-sandbox -- --scenario h4-cloud --allow-prod` |
| **SSOT** | [`docs/architecture/TEST-HARNESS-01-H4-CLOSEOUT.md`](docs/architecture/TEST-HARNESS-01-H4-CLOSEOUT.md) |
| **H0–H4** | **RELEASED** (superseded tip by H5 **`3356349`**) |
| **Projekt** | **STABILIZATION WINDOW ACTIVE** |

---

## PAYROLL-CLOUD-RESURRECTION-01 — bootstrap freshness fence · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · dual-session smoke **PASS** · **PRODUCTION VERIFIED** |
| **Prod** | **2.65.35** @ **`fce7b78`** |
| **RCA** | Stary LS innej sesji → CloudLoader merge → push → re-seed empty Cloud |
| **Fix** | `payroll-bootstrap-resurrection-fence.ts` · gated `bootstrapMergedShouldPush` · merge prefer empty Cloud |
| **Test** | `scripts/test-payroll-cloud-resurrection-01.mjs` (T1–T6) |
| **SSOT** | [`docs/architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](docs/architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md) |
| **Nie** | Usuwać fence · preferować bogatszego LS nad intentional empty Cloud |

---

## PAYROLL-P0-WEEK-ROLLOVER-01 — ALIGN vs ROLLOVER · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Prod** | **2.65.34** @ **`e38610a`** |
| **Fix** | `classifyPayrollWeekTransition` w `payroll-cycle.ts` — realny rollover vs align etykiet |
| **Test** | `scripts/test-payroll-p0-week-rollover-01.mjs` |
| **Nie** | Traktować align jak wipe rosteru · cofać classifier bez AUDIT |

---

## LOCALSTORAGE-ARCH-02 A–E — IDB cold + telemetry · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · observation **PASS** · **PRODUCTION VERIFIED** |
| **Prod** | **2.65.28** @ **`d896852`** |
| **Zakres** | A0 `__WG_STORAGE__` · A/B snaps IDB · C pipeline lean+cold · D WM writer+cold · E audit rings IDB |
| **Poza zakresem** | F facade · CloudLoader · cloud merge · Payroll logic |
| **DF** | [`docs/architecture/LOCALSTORAGE-ARCH-02-DESIGN-FREEZE.md`](docs/architecture/LOCALSTORAGE-ARCH-02-DESIGN-FREEZE.md) |
| **Post-release** | [`docs/architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md`](docs/architecture/LOCALSTORAGE-ARCH-02-POST-RELEASE-REPORT.md) |
| **Test** | `npx vite-node scripts/test-localstorage-arch-02-ae.mjs` |
| **Etap F** | **GO YES** · **NOT STARTED** · tylko jawne IMPLEMENT |

---

## PAYROLL-P0-FIX-01 — QuotaExceeded ≠ bootstrap FAILED · **CLOSED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Prod** | **2.65.27** @ **`1c41b61`** |
| **Fix** | safe LS writes · SUCCESS = fetch+merge · payroll-first persist · in-memory handoff |
| **Test** | `scripts/test-payroll-p0-fix-01-storage.mjs` |

---

## PAYROLL-DISPLAY-UNLOCK — hist. delay tabeli LP · **CLOSED jako quota incident** (Owner FIX VERIFIED 2026-07-14)

| Element | Wartość |
|---------|---------|
| **Status** | **Owner: Payroll FIX VERIFIED** przy ARCH-02 · root = LS quota / bootstrap FAILED (nie display gate) |
| **Hist. prod** | TRACE-02 **2.65.19** @ `c1e76ca` |
| **Trace** | `__WG_PAYROLL_DISPLAY_TRACE__` — opcjonalny dig, nie priorytet |

**Nie** otwieraj nowego fixa display bez świeżego Owner repro.

---

## PAYROLL-BOOTSTRAP-RACE-FIX-01 — CloudLoader bootstrap gate · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Commit** | **`47de89b`** · **2.65.18** |
| **Fix** | `bootstrapPhase` SUCCESS przed mount App — koniec race LS vs bootstrap persist |
| **DF** | [`docs/architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md`](docs/architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md) |

---

## PAYROLL-ANTI-LEAK-FIX-01 — same-week Cloud SSOT guard (Wariant B) · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md`](docs/releases/PAYROLL-ANTI-LEAK-FIX-01-RELEASE-VERIFICATION.md) · DF [`docs/architecture/PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md`](docs/architecture/PAYROLL-ANTI-LEAK-DESIGN-FREEZE-01.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · **SMOKE PASS** |
| **Commit** | **`26f3eb5`** · **2.65.14** |
| **Root cause** | `applyRuntimePayrollAntiLeak` — błędny predykat kasował poprawny roster same-week z Cloud |
| **Fix** | Wariant B — anti-leak tylko cross-week leak / stale archive republish |
| **Test** | T-AL **7/7** · B4 **13/13** · refresh-race **4/4** · 20.1C.1 **5/5** |
| **Prod smoke** | **12/12 PASS** — focus pull · refresh · second context · roster **14** |

**Nie zmieniaj** `mergeAllDataKeys` / `finalizePayrollBundleMerge` / reconcile bez AUDIT + Owner GO (#CORE-013).

---

## JOBS-SYNC-FIX-01 — admin bundle write-first + reconcile fresh · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md`](docs/releases/JOBS-SYNC-FIX-01-RELEASE-VERIFICATION.md) · DF [`docs/architecture/JOBS-SYNC-DESIGN-FREEZE-01.md`](docs/architecture/JOBS-SYNC-DESIGN-FREEZE-01.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** · **SMOKE PASS** |
| **Commit** | **`309609e`** · **2.65.13** |
| **MF-1** | `resolveReconcileFreshForKey` — React nowszy od LS |
| **MF-2** | Auto-sync `writeOnly` — skip apply w cyklu lokalnej mutacji |
| **MF-3** | `admin-bundle-sync-guard` — generation guard |
| **Test** | lifecycle **37/37** · PAYROLL-RACE **12/12** · JA-PHOTO-DEL **21/21** |
| **Prod smoke** | photos **19/19** · payroll roster stable |

**Nie zmieniaj** MF-1/2/3 bez AUDIT + Owner GO (#CORE-013).

---

## JOBS-PHOTOS-P0 — photos upload/delete regression · **RESOLVED** (via JOBS-SYNC-FIX-01)

> **SSOT audytu:** [`docs/architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md`](docs/architecture/JOBS-PHOTOS-P0-AUDIT-CLOSEOUT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **RESOLVED** — fix w **2.65.13** |
| **Root cause** | Admin bundle apply-before-push + stale LS reconcile (nie merge/tombstones) |
| **Trace** | `jobs-photos-live-trace.ts` (2.65.11–12) — opcjonalny cleanup na polecenie |
| **Następny krok** | Usunięcie instrumentacji trace — osobny program, Owner GO |

---

## JOBS-PHOTOS-DELETE-SYNC-01 — photos delete tombstones · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md`](docs/architecture/JOBS-PHOTOS-DELETE-SYNC-01-OWNER-CLOSEOUT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Commit** | **`d8f2d99`** · **2.65.10** |
| **Zakres** | `deletedPhotoTombstones` + `mergePhotos(..., tombstones)` |
| **Test** | JA-PHOTO-DEL **21/21** · prod smoke **19/19** |

---

## JOBS-ASSETS-SYNC-01 — photos[] union merge · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md`](docs/architecture/JOBS-ASSETS-SYNC-01-OWNER-CLOSEOUT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Commit** | **`f8a64d7`** · **2.65.9** |
| **Zakres** | `mergePhotos` + `mergeJobsById.mergePair` |
| **Test** | JA-ASSETS **16/16** · prod smoke **14/14** |

---

## NG11-FF-01 — Super Admin Developer section · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-FF-01-CLOSEOUT.md`](docs/architecture/NG11-FF-01-CLOSEOUT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Commit** | **`8b3c991`** · **2.65.8** |
| **Zakres** | `AdminSettingsModal` — zwijana sekcja Developer + NG11-Q1/Q2/Q3/A2/A3 |
| **Test** | `test-ng11-ff-01-admin-settings-ui.mjs` **22/22** · ACL regresja **35/35** |

**Nie zmieniaj AppSettings/runtime bez Owner GO.**

---

## ROBOTS-INSPECTOR-01 — Inspektor WM stale sync · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md`](docs/architecture/ROBOTS-INSPECTOR-01-CLOSEOUT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Commit** | **`9307386`** · **2.65.5** |
| **Zakres** | `reconcileJobsWithFreshLocal` · `reconcileAdminBundleWithFreshLocal` · `App.tsx` finalBundle parity |
| **Test** | `test-robots-inspector-01-sync-race.mjs` **7/7** · regresja PAYROLL-RACE + PAYROLL-ARCHIVE **PASS** |
| **Prod smoke** | Inspector select + LS + zapis po 12 s auto-sync **PASS** |

**Nie rozszerzaj bez nowego AUDIT + Owner GO.** Variant **1B** (suppress guard) — tylko na polecenie przy regresji.

---

## P0-A — iOS Login Shell (Incident A) · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/recovery/P0-A-IOS-LOGIN-CLOSEOUT.md`](docs/recovery/P0-A-IOS-LOGIN-CLOSEOUT.md) · PLAN/DF w `docs/recovery/P0-A-IOS-LOGIN-*`

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **BUNDLE CLOSED** |
| **Commit** | **`6f85d4c`** · **2.63.87** |
| **Zakres** | `LoginScreen.tsx` · `admin-auth.ts` (remember UX) · `GuideView` FAQ · test `test-admin-login-shell-p0a.mjs` |
| **Klasa** | FEATURE / SHELL — **#CORE-013 PASS** |
| **Owner QA** | Safari iPhone · `www.wgdom.fun` · **PASS** (AC-A6) |
| **Test auto** | `test-admin-login-shell-p0a.mjs` **11/11** |

**Nie rozszerzaj bez nowego AUDIT + Owner GO.**

---

## NG-10 — Autonomous Tender Workspace · **EPIC COMPLETE**

> **SSOT:** [`docs/architecture/NG-10-CLOSEOUT.md`](docs/architecture/NG-10-CLOSEOUT.md) · [`docs/architecture/NG-10-DESIGN-FREEZE.md`](docs/architecture/NG-10-DESIGN-FREEZE.md)

| Slice | Commit | Status |
|-------|--------|--------|
| **NG-10-03** Autonomous Run lib | `d850534` | **CLOSED** · LIB-NG10-01 **41/41** |
| **NG-10-04** Agent Screen (S1) | `2ece2c7` | **CLOSED** |
| **NG-10-05** Outcome + Reveal (S2→S3) | `5863acb` | **CLOSED** |
| **NG-10-06** Closeout & Polish | `02e0d0a` | **CLOSED** · **2.63.86** · **PRODUCTION VERIFIED** |

**Nie rozszerzaj NG-10 bez nowego AUDIT + Owner GO.**

---

## NG11-Q3 — Debounced Persist · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-Q3-CLOSEOUT.md`](docs/architecture/NG11-Q3-CLOSEOUT.md) · [`docs/architecture/NG11-Q3-RELEASE-VERIFICATION.md`](docs/architecture/NG11-Q3-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Feature commit** | **`f6f7265`** · **2.63.96** |
| **Prod HEAD** | **`4b35228`** |
| **Flaga** | `pipelinePerfDebouncePersist` default **OFF** |
| **Test release** | **91/91 PASS** |

---

## NG11-Q1 — Parse Concurrency · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-Q1-CLOSEOUT.md`](docs/architecture/NG11-Q1-CLOSEOUT.md) · [`docs/architecture/NG11-Q1-RELEASE-VERIFICATION.md`](docs/architecture/NG11-Q1-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **Wersja** | **2.63.97** |
| **Commit** | **`e003591`** |
| **Verify** | `version.json` **2.63.97** ✅ |
| **Test** | **80/80 PASS** · PG-1 harness **PASS** |
| **Flaga** | `pipelinePerfParseConcurrency` **OFF** (default) |

---

## NG11-Q2 — Parallel Archive Unpack · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-Q2-CLOSEOUT.md`](docs/architecture/NG11-Q2-CLOSEOUT.md) · [`docs/architecture/NG11-Q2-RELEASE-VERIFICATION.md`](docs/architecture/NG11-Q2-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **Wersja** | **2.63.98** |
| **Commit** | **`608c9ec`** |
| **Verify** | `version.json` **2.63.98** ✅ |
| **Test** | **76/76 PASS** · PG-Q2 harness **PASS** (−49.8% P50) |
| **Flaga** | `pipelinePerfUnpackParallel` **OFF** (default) |
| **Pre-existing** | 3 FAIL dossier/7Z — **out of scope** (nie regresja Q2) |

**Następny slice NG11:** **Q4** (optional Edge) lub **epic E2 closeout** — **Owner GO only** (A5 **CLOSED**).

---

## NG11-A5 — Strategic vs Economic · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-A5-CLOSEOUT.md`](docs/architecture/NG11-A5-CLOSEOUT.md) · [`docs/architecture/NG11-A5-RELEASE-VERIFICATION.md`](docs/architecture/NG11-A5-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **Wersja** | **2.65.0** |
| **Commit** | **`2606bfd`** |
| **`version.json`** | **VERIFIED** → **2.65.0** @ **`2606bfd`** |
| **Test smoke** | **99/99** · gate-exit **28/28** |
| **OWNER QA** | **PASS** |
| **Następny program** | **NG11-Q4** (optional) lub epic E2 — **Owner GO only** |

---

## NG11-A3 — Discovery Fork · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-A3-CLOSEOUT.md`](docs/architecture/NG11-A3-CLOSEOUT.md) · [`NG11-A3-RELEASE-VERIFICATION.md`](docs/architecture/NG11-A3-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **Wersja** | **2.64.0** |
| **Commit** | **`78c0a40`** |
| **`version.json`** | **VERIFIED** → **2.64.0** @ **`78c0a40`** |
| **OWNER QA** | **PASS** |
| **Test smoke** | **95/95 PASS** |
| **PG-A3** | **PASS** (−35% P50 mock) |
| **Flaga** | `pipelinePerfDiscoveryFork` default **OFF** |
| **Następny program** | **NG11-Q4** (optional) lub epic E2 — **Owner GO** |

---

## NG11-A2 — Dossier Artifact Cache · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/NG11-A2-CLOSEOUT.md`](docs/architecture/NG11-A2-CLOSEOUT.md) · [`docs/architecture/NG11-A2-RELEASE-VERIFICATION.md`](docs/architecture/NG11-A2-RELEASE-VERIFICATION.md)

| Element | Wartość |
|---------|---------|
| **Status** | **EPIC SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **Wersja** | **2.63.99** |
| **Commit** | **`447a58b`** |
| **Verify** | `version.json` **2.63.99** ✅ |
| **Test** | **92/92 PASS** (release smoke) · PG-A2 harness **PASS** |
| **Flaga** | `pipelinePerfArtifactCache` **OFF** (default) |

**Nie rozszerzaj A2 bez nowego AUDIT + Owner GO.**

---

## NG11-Q2 — Parallel Archive Unpack · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **Wave 1 CLOSED** (A1+Q5+F0 timing) |
| **Commit** | **`4710d11`** · **2.63.95** |
| **Zakres** | Progressive heavy (cost/metadata split) · cost-first pricing · readiness signals · dev timing |
| **Klasa** | FEATURE pipeline — **#CORE-013 PASS** (zero Payroll/sync/Edge) |
| **Test release** | **81/81 PASS** (A1 12 · Q5 14 · timing 11 · catalog 11 · heavy 5 · gate 28) |
| **Backlog** | **NG11-Q1** parse concurrency — AUDIT **COMPLETE** · Owner GO PENDING |

**Nie rozszerzaj NG11 bez DESIGN FREEZE + ARCH REVIEW + Owner GO.**

---

## TENDER-WORKSPACE-LAYOUT (TWSL) · **IMPLEMENT lokalny** · **RELEASE NOT READY**

> **SSOT:** [`docs/architecture/TENDER-WORKSPACE-LAYOUT-DESIGN-FREEZE.md`](docs/architecture/TENDER-WORKSPACE-LAYOUT-DESIGN-FREEZE.md)

| Element | Wartość |
|---------|---------|
| **Status** | **IMPLEMENT COMPLETE** lokalnie · **nie na prod** |
| **Wersja changelog** | **2.63.91** (lokalny `changelog-data.ts`) |
| **Zakres** | `TenderScrollableAccordion` · tokeny TWSL · migracja 3 accordionów Tier A (Hub + Przetarg) |
| **Klasa** | FEATURE UI — **#CORE-013 PASS** (zero sync/pipeline) |
| **Test** | `test-tender-workspace-scrollable-accordion.mjs` **20/20** · NG-03 regresja **PASS** · `npm run build` **PASS** |
| **Następny krok** | `git add` allowlist TWSL → commit → push → verify `version.json` **2.63.91** |

**Nie mieszać** z innymi bundle w jednym commicie.

---

## NG10-HOTFIX-02 · **CLOSED** (prod **2.63.90**)

| Element | Wartość |
|---------|---------|
| **Status** | **ON PROD** · commit `a5c75e2` |
| **Zakres** | Autonomous gate timeout partial bez `discoverySettled` · AC-11 session unlock |

---

## P0 — Payroll Cross-Device Sync · **FULLY CLOSED** · **OBSERVATION COMPLETE**

> **SSOT:** [`docs/INCIDENTS.md`](docs/INCIDENTS.md) · [`docs/architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md`](docs/architecture/SYNC-ARCH-01-DOMAIN-SYNC-DESIGN-FREEZE.md)

| Element | Wartość |
|---------|---------|
| **Status** | **FULLY CLOSED** · **Observation Complete** 2026-07-11 |
| **Fix commit** | **`e819124`** (SYNC-ARCH-01 S2) |
| **Observation** | 24h PASS — brak rollbacków · brak nowych incydentów |
| **Regression** | S2 **18/18** · S1 **22/22** · Guard **4/4** |
| **Cloud T+24h** | roster **15** · tombstones **6** · duplicates **0** |

---

## NG-09 — Inspector Workspace Modernization · **COMPLETE (5/5 CLOSED)**

> **SSOT epic:** [`docs/architecture/NG-09-EPIC-CLOSE-REPORT.md`](docs/architecture/NG-09-EPIC-CLOSE-REPORT.md)  
> **SSOT closeout:** [`docs/architecture/NG-09-01-CLOSEOUT.md`](docs/architecture/NG-09-01-CLOSEOUT.md) · [`docs/architecture/NG-09-02-CLOSEOUT.md`](docs/architecture/NG-09-02-CLOSEOUT.md) · [`docs/architecture/NG-09-03-CLOSEOUT.md`](docs/architecture/NG-09-03-CLOSEOUT.md) · [`docs/architecture/NG-09-04-CLOSEOUT.md`](docs/architecture/NG-09-04-CLOSEOUT.md) · [`docs/architecture/NG-09-05-CLOSEOUT.md`](docs/architecture/NG-09-05-CLOSEOUT.md)

| Slice | Wersja | Status |
|-------|--------|--------|
| **NG-09-01** Workspace Frame | **2.63.80** · `566fa0d` | **CLOSED** |
| **NG-09-02** View Router L1 | **2.63.81** · `472304d` | **CLOSED** |
| **NG-09-03** Job Workspace L2 | **2.63.82** · `66859e9` / `8b7124b` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-09-04** Sync / Data Layer | **2.63.83** · `143f6d0` / `c1d1caf` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-09-05** Closeout & Polish | **2.63.84** · `c5aa953` / `29f7842` | **CLOSED** · **PRODUCTION VERIFIED** |

**NG-09-05 zakres:** `InspectorOverlays` — overlay layer (lightbox, preview, FAB, Toaster, op-notes); `buildRecoverableStatsByJobId` dedup; panel orchestrator (~777 LOC, LOC waiver).

**Maintenance debt:** `smoke-test-inspector-scroll-20.1d1.mjs` · billing a3a T6 · billing a6 T14 (pre-existing).

**Nie rozpoczynaj nowego programu ani bundle bez Owner GO.**

---

## M-03 — Mobile Re-certification · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/architecture/M-03-MOBILE-RECERT-DESIGN-FREEZE.md`](docs/architecture/M-03-MOBILE-RECERT-DESIGN-FREEZE.md) · **STABILIZATION WINDOW** maintenance · parent: [`docs/STABILIZATION-WINDOW-PLAN.md`](docs/STABILIZATION-WINDOW-PLAN.md) § M-03

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · **BUNDLE CLOSED** · workflow **COMPLETE** |
| **Commits** | **`0f8a165`** (IMPLEMENT · allowlist 6 plików) · **`f7878fe`** (RELEASE changelog **2.63.79**) |
| **Prod** | **2.63.79** @ `f7878fe` |
| **Zakres** | breakpoint cliff 392px → `max-[430px]` · KPI `hidden 2xl:block` · shortcuts `min-h-11 lg:min-h-8` · unified Command Layer shell · **AC-M03-08** tab delta ≤32px |
| **Test** | `test-m03-mobile-recert.mjs` 13/13 · `test-p0-command-layer-height.mjs` 36/36 · `test-ng08-hf01-boundary.mjs` 7/7 · E2E `audit-p0-tender-freeze` 14/14 |
| **Protected Core** | **GREEN** — Payroll · Cloud Sync · Pipeline · Parser · Bootstrap · App.tsx CORE · Edge · Calculator · Phase Engine · `tender-ux-tokens.ts` nietknięte |

**Nie zmieniaj bez polecenia:** TOKEN FREEZE · pipeline · sync · payroll · Command Layer poza hotfix track.

---

## INSPECTOR-RUNTIME-STATE-01 · **CLOSED** · **PRODUCTION VERIFIED**

> **SSOT:** [`docs/recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md`](docs/recovery/INSPECTOR-RUNTIME-STATE-01-AUDIT.md) · pokrewne: [`docs/recovery/INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md`](docs/recovery/INSPECTOR-VISIBILITY-01-AUDIT-REPORT.md)

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · owner smoke **PASS** |
| **Commit** | **`e9720de`** — `fix(inspector): restore jobs runtime state hydration` |
| **Prod** | **2.63.73** @ `e9720de` · `version.json` timestamp `2026-07-08T12:02:08Z` |
| **RC** | typo `setJobsAllAll` → `setJobsAll` w `InspectorPanel.tsx` (regresja `f85b42c` / INSPECTOR-JOB-ASSIGN-001) |
| **Smoke** | Szymon **15** · Zofia **2** · Dashboard PASS · Roboty PASS · Assignment PASS |

**Nie zmieniaj bez polecenia:** filtr `filterJobsForInspector` · KV assignment · sync/payroll.

---

## NG-08 — Tender Workspace UX (parent) · **CLOSED / FROZEN**

> **PLAN:** [`docs/architecture/NG-08-TEUX-PLAN.md`](docs/architecture/NG-08-TEUX-PLAN.md) · **Freeze:** [`docs/architecture/NG-08-TEUX-DESIGN-FREEZE.md`](docs/architecture/NG-08-TEUX-DESIGN-FREEZE.md)

| Slice | Wersja | Commit | Status |
|-------|--------|--------|--------|
| **NG-08-HF-01** Visual Smoke remediation | **2.63.78** | `4855a2d` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-08-05** Cost Workspace (WF-05) | **2.63.77** | `97ea90c` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-08-04** Documents Workspace (WF-04) | **2.63.76** | `6f6bb66` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-08-03** Workspace Intelligence (WF-03) | **2.63.75** | `caa46b1` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-08-02** Workspace Progress (WF-02) | **2.63.74** | `09259ad` | **CLOSED** · **PRODUCTION VERIFIED** |
| **NG-08-01** Workspace Frame | **2.63.73** | `84b1491` | **CLOSED** · **PRODUCTION VERIFIED** |

**Nie rozszerzaj NG-08 bez nowego AUDIT + Owner GO.**

---

## NG-08-HF-01 — Visual Smoke remediation · **CLOSED** · **PRODUCTION VERIFIED**

| Element | Wartość |
|---------|---------|
| **Status** | **CLOSED** · Owner GO REC-1 only |
| **Commits** | **`4f8f256`** (bundle 8 plików) · **`4855a2d`** (breadcrumb `max-[391px]:hidden` — Gate B teux7b) |
| **Prod** | **2.63.78** @ `4855a2d` |
| **Zakres** | HF-P01 hub scroll w scroll root · HF-P02 KPI compact mobile · HF-P03 shortcut row · HF-P04 touch 44px · HF-P05 density |
| **Test** | `test-ng08-hf01-boundary.mjs` 30/30 · `test-p0-command-layer-height.mjs` 32/32 · E2E `audit-p0-tender-freeze` 5/5 · Gate B tenders+payroll PASS |

**Uwaga:** Design Freeze wymagał jednego commita — follow-up `4855a2d` poza allowlistą (breadcrumb marker). ARCH HF01-007 (Δ wysokości między tabami) = FAIL z waiver przy Owner GO — poza REC-1.

**Nie zmieniaj bez polecenia:** TOKEN FREEZE · pipeline · sync · payroll · Command Layer poza hotfix track.

---

## NG-08-02…05 — historyczny closeout (CLOSED)

Szczegóły slice'ów: commity w tabeli parent powyżej · docs `docs/architecture/NG-08-02-TEUX-*` … `NG-08-05-*`.

---

## NG-07-TEUX-01 — Lista Przetargów UX · **CLOSED FINAL**

> **SSOT:** [`docs/architecture/NG-07-TEUX-01-CLOSEOUT.md`](docs/architecture/NG-07-TEUX-01-CLOSEOUT.md) · **Audyt:** [`docs/architecture/NG-07-TEUX-01-UX-AUDIT.md`](docs/architecture/NG-07-TEUX-01-UX-AUDIT.md) · **Freeze:** [`docs/architecture/NG-07-TEUX-01-DESIGN-FREEZE.md`](docs/architecture/NG-07-TEUX-01-DESIGN-FREEZE.md)

| Slice | Wersja | Commit | Status |
|-------|--------|--------|--------|
| NG-07-01 KPI + CTA | 2.63.69 | `f70c829` | **CLOSED** |
| NG-07-02 Compaction | 2.63.70 | `6262e3e` | **CLOSED** |
| NG-07-03 Karty + empty | 2.63.71 | `b231f43` | **CLOSED** |
| NG-07-04 Desktop density | 2.63.72 | `08a6649` | **CLOSED** · **PRODUCTION VERIFIED** |

**Nie zmieniaj bez polecenia:** TOKEN FREEZE · pipeline · sync · payroll.

---

## NG-06-TEUX — Phase 1 (TEUX-1…6) · **COMPLETE**

> **SSOT:** [`docs/architecture/NG-06-TEUX-PHASE1-CLOSEOUT.md`](docs/architecture/NG-06-TEUX-PHASE1-CLOSEOUT.md) · [`docs/architecture/NG-06-TEUX-DESIGN-FREEZE.md`](docs/architecture/NG-06-TEUX-DESIGN-FREEZE.md)

| Bundle | Wersja | Commit | Status |
|--------|--------|--------|--------|
| TEUX-1 Navigation | 2.63.54 | `5a8b820` | **CLOSED** |
| TEUX-2 Design Tokens | 2.63.55 | `3eb70a0` | **CLOSED** · **TOKEN FREEZE** |
| TEUX-3 List Cards | 2.63.56 | `7a0ae83` | **CLOSED** |
| TEUX-4 Mobile | 2.63.57 | `d965311` | **CLOSED** |
| TEUX-5 Loading | 2.63.58 | `061fc9a` | **CLOSED** |
| TEUX-6 Empty States | 2.63.59 | `ead4de7` | **CLOSED** · **PRODUCTION VERIFIED** |
| Docs closeout | — | `5c65bae` | **CLOSED** |

### Phase 2 (TEUX-7+) · **COMPLETE**

| Bundle | Wersja | Commit | Status |
|--------|--------|--------|--------|
| TEUX-7a Lista filtry | 2.63.60 | `bc4b232` | **CLOSED** · **PRODUCTION VERIFIED** |
| TEUX-7b Command Layer | 2.63.61 | `d1e782b` | **CLOSED** · **PRODUCTION VERIFIED** |
| TEUX-7c Accessibility | 2.63.62 | `75f82f2` | **CLOSED** · **PRODUCTION VERIFIED** |
| TEUX-7d Copy integrity | 2.63.63 | `129f22d` | **CLOSED** · **PRODUCTION VERIFIED** |
| TEUX-7e Strategia+Pulpit | 2.63.64 | `f0a49cf` | **CLOSED FINAL** · **PRODUCTION VERIFIED** |
| TEUX-7f Hosted deprecation | 2.63.65 | `e0d4e47` | **CLOSED** · **PRODUCTION VERIFIED** |
| TEUX-7z Epic closeout | 2.63.66 | `2d94b0d` / `80cf911` | **CLOSED FINAL** · **PRODUCTION VERIFIED** |

**NG-06-TEUX EPIC:** **COMPLETE** · **PRODUCTION VERIFIED** — [`docs/architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md`](docs/architecture/NG-06-TEUX-EPIC-CLOSE-REPORT.md)

**Poza roadmapą epic (defer):** hosted removal · TOKEN thaw · Cloud Sync S7. **Z-05 mobile re-cert** — **CLOSED na main** jako **M-03** (`f7878fe`).

**Nie zmieniaj bez polecenia:** `tender-ux-tokens.ts` (TOKEN FREEZE) · pipeline · sync · payroll.

---

> **SSOT:** [`docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md)

| Element | Commit | Status |
|---------|--------|--------|
| RC-B-1 PWRB facade + I-1…I-4 | `35f37b1` | **CLOSED** · prod **2.63.30** |
| RC-B debug overlay cleanup | `24bde6e` | **CLOSED** |
| RC-B debug runtime cleanup | `31a7d5e` | **CLOSED** · prod **2.63.31** |
| RC-B prod verification | 2026-07-04 | **CLOSED** — Lista Płac add/remove/sync/Archiwum PASS |
| RC-B docs closeout | (ten commit) | **CLOSED** |

**Incydent:** delete → re-add → F5 → pracownik znika (11→10). **Fix:** PWRB + G-0 (I-1…I-4). **Prod verified:** `2.63.31` @ `31a7d5e`.

**Testy PASS:** `npm run audit:pwrb` · `test-pwrb-boundary-rcb` · `test-payroll-tombstone-revocation-rcb`

**OPEN (poza RC-B):** manual multi-device AC8–AC11 · batch-set 500 (H1) · Evidence Gate SYNC-ARCH-01

**Dla agentów:** mutacje składu LP → **tylko** `payroll-week-roster-bundle.ts`. Przed sync: [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md).

**Następny kierunek:** **FEATURE DEVELOPMENT** — #CORE-013 (osobny bundle CORE vs FEATURE) · #CORE-014 (FEATURE Boundary Check przed commitem). CORE-01B IMPLEMENT — tylko on-demand + Owner GO.

---

## PLATFORM-SYNC-01A — Notatki operacyjne archive race · **CLOSED**

> **Bundle:** PLATFORM · **Wersja:** **2.63.33** · **Commit:** **`a4cd5c2`** · **Verify:** 2026-07-05 · **prod `version.json` PASS**

| Element | Status |
|---------|--------|
| **ETAP A** — `reconcileOperationalNotesInMergedBundle()` po `await pullAndMergeDataBundle` | **CLOSED** |
| **ETAP B** — generation counter · telemetry · stale detection | **ON HOLD** (plan awaryjny — tylko przy regresji po smoke właściciela) |
| Prod verify | **CLOSED** — `2.63.33` @ `a4cd5c2` |
| Regresja lib | **PASS** — `test-operational-notes-sync-race-p0.mjs` 38/38 · `test-operational-notes-p0.mjs` 24/24 |

**Incydent:** archiwizacja notatki → po auto-sync / przełączeniu zakładek / reload notatka wracała na listę **Aktywne** (race: `runCloudSync` ze stale `adminDataBundle()` nadpisywał React stanem `active`).

**Fix (ETAP A):** po `await pullAndMergeDataBundle` — odczyt świeżego `kw-operational-notes` z LocalStorage + `mergeOperationalNotes(fresh, merged, deletedIds)` w `runCloudSync` i `pullFromCloudAndMerge` przed `applyAdminDataBundle` / push.

**Testy:** P0R-T05–T09 w `scripts/test-operational-notes-sync-race-p0.mjs`.

**Dokumentacja:** [`docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md`](docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md) § 3.5 · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Notatki operacyjne · Sync.

**Nie zmieniać bez polecenia:** `mergeOperationalNotePair` · LWW · dual-push architecture · Payroll/PWRB.

---

## PAYROLL-RACE-01 — Stale apply reconcile + guard edycji LP · **CLOSED**

> **Class:** **CORE** · **Wersja:** **2.63.68** · **SSOT:** [`docs/PAYROLL-RACE-01-DESIGN-FREEZE.md`](docs/PAYROLL-RACE-01-DESIGN-FREEZE.md)

| Element | Status |
|---------|--------|
| **1A** | `reconcilePayrollKeysWithFreshLocal()` przed `applyAdminDataBundle` | **CLOSED** |
| **1B** | `runPayrollWeekEmployeeFieldEdit` + `extendScopeSuppress` | **CLOSED** |
| **Test** | `LIB-PAYROLL-RACE-01` T-RACE-01…09 · gate payroll **16/16** | **PASS** |

---

## ★ Lista Płac — ochrona synchronizacji (MUST dla każdego agenta)

> Po serii napraw **2.63.15–2.63.31** (Guard, B4, PWRB, RC-B) Lista Płac jest **zweryfikowana na prod**. Nowe FEATURE **nie** uzasadniają zmian w sync/merge LP.

**SSOT:** [`docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](docs/PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](docs/recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · [`docs/AGENT-CONTINUITY-GUIDE.md`](docs/AGENT-CONTINUITY-GUIDE.md) § 2b

| Reguła | Opis |
|--------|------|
| **PWRB only** | Add/remove składu → `payroll-week-roster-bundle.ts` |
| **Coupled push** | `kw-week-employees` + `kw-week-employees-deleted-ids` razem |
| **#CORE-013** | Mixed CORE+FEATURE bundle = **BLOCKED** |
| **Test przed commit sync** | `audit:pwrb` · `test-pwrb-boundary-rcb` · `test-payroll-tombstone-revocation-rcb` · `test:infra --scope payroll` |
| **FEATURE bundle** | **Zero** zmian w `finalizePayrollBundleMerge`, `mergeWeekEmployees`, `CloudLoader` bootstrap payroll, Edge batch-set UNION |

**PLATFORM-SYNC-01A** (`a4cd5c2`) — reconcile **tylko** `kw-operational-notes`; nie rozszerzać na payroll bez AUDIT.

---

## FEATURE DEVELOPMENT RESTART · **ACTIVE** (AUDIT 2026-07-05)

> **SSOT audytu:** sesja FEATURE backlog restart · werdykt **GO WITH CONDITIONS**

| # | Następny bundle | Klasa | Status |
|---|-----------------|-------|--------|
| **1** | **Bundle C — Mobile** (MOBILE-P0-S1 / M-03) | UI + PLATFORM | **CLOSED** · prod **2.63.34** · `eb0d51b` · Z-05 PASS |
| **2** | **NG-03 Maintenance** (R-03 · M-06 · A-03-1) | docs | **CLOSED** (docs commit) · R-03+M-06+A-03-1 |
| **3** | **Bundle #3 — Grouped documents test sync** | FEATURE test + docs | **CLOSED** · prod **2.63.35** · `eebe389` · `LIB-TENDERS-GROUPED-DOCS` |
| **4** | **Bundle #4A — Roboty 2.0 MIN doc/help sync** | docs + test manifest | **CLOSED** · prod **2.63.36** · `5d2b207` · `LIB-JOBS-LIST-OPS-20-MIN` |
| **5** | **Bundle #5A — Work Catalog P2 test manifest sync** | docs + test manifest | **CLOSED** · prod **2.63.37** · `7e4eb57` |
| **5B** | **Bundle #5B — Work Catalog P2.7 Pakiety robót MIN** | FEATURE UI | **CLOSED** · prod **2.63.38** · `9aad48c` · suite 12 testIds |
| **6A** | **Bundle #6A — Work Catalog stabilization** | docs + test manifest | **CLOSED** · prod **2.63.38** · `6af0427` · suite **13** testIds |
| **6B** | **Bundle #6B — Work Catalog P2.8 MIN UX** | FEATURE UI | **CLOSED** · prod **2.63.39** · `1fd3627` · suite **15** testIds |
| **6C-A** | **Bundle #6C-A — Work Catalog P2.9 MIN UX** | FEATURE UI | **CLOSED** · prod **2.63.40** · `898682a` · **PRODUCTION VERIFIED** · suite **16** testIds |
| **6D-docs** | **Bundle #6D-docs — SSOT continuity** | docs | **CLOSED** · prod **2.63.40** · `a487680` |
| **6D** | **Bundle #6D — Work Catalog P2.10 Roboty ulubione** | FEATURE UI | **CLOSED FINAL** · prod **2.63.41** · `642a01d` · **PRODUCTION VERIFIED** · suite **17** testIds |
| **6E** | **Bundle #6E — Deferred bootstrap reliability** | FEATURE UI | **CLOSED FINAL** · prod **2.63.42** · `7138957` · **PRODUCTION VERIFIED** · `LIB-DEFERRED-BOOTSTRAP-6E` · suite **18** testIds |
| **5C-0A** | **Bundle #5C-0A — Pricing refresh after Work Catalog save** | FEATURE UI | **CLOSED FINAL** · prod **2.63.43** · `c151b40` · **PRODUCTION VERIFIED** · `LIB-PRICING-CATALOG-REVISION-5C0A` · suite **19** testIds |
| **5C-1** | **Bundle #5C-1 — Read SSOT Work Catalog only** | FEATURE lib | **CLOSED FINAL** · prod **2.63.44** · `aecf851` · **PRODUCTION VERIFIED** · `LIB-READ-SSOT-PREFLIGHT-5C1` + `LIB-READ-SSOT-WORK-ONLY-5C1` · suite **21** testIds |
| **5C-2** | **Bundle #5C-2 — Write SSOT work_only default** | FEATURE lib | **CLOSED FINAL** · prod **2.63.45** · `a7bc713` · **PRODUCTION VERIFIED** · `LIB-WRITE-SSOT-APP-NO-LEGACY-5C2` + `LIB-PB-WRITE-ROUTER` · suite **23** testIds |
| **5C-3A** | **Bundle #5C-3A — UX copy & navigation cutover** | FEATURE UI | **CLOSED FINAL** · prod **2.63.46** · `d95b30b` · **PRODUCTION VERIFIED** · `LIB-UX-COPY-CUTOVER-5C3A` · suite **24** testIds |
| **5C-3B** | **Bundle #5C-3B — Preview data SSOT cutover** | FEATURE UI | **CLOSED FINAL** · prod **2.63.47** · `fcf3c6f` · **PRODUCTION VERIFIED** · `LIB-PREVIEW-SSOT-5C3B` · suite **25** testIds |
| **5C-3C** | **Bundle #5C-3C — Dead UX cleanup** | FEATURE UI | **CLOSED FINAL** · prod **2.63.48** · `e89051b` · **PRODUCTION VERIFIED** · `LIB-DEAD-UX-CLEANUP-5C3C` · suite **26** testIds |
| **5C-3D** | **Bundle #5C-3D — History SSOT from Work Catalog** | FEATURE lib | **CLOSED FINAL** · prod **2.63.49** · `03823ad` · **PRODUCTION VERIFIED** · `LIB-HISTORY-SSOT-5C3D` · suite **27** testIds |
| **5C-5A** | **Bundle #5C-5A — Legacy KV sync quiesce** | CORE lib | **CLOSED FINAL** · prod **2.63.50** · `36b3ddd` · **PRODUCTION VERIFIED** · `LIB-LEGACY-KV-SYNC-QUIESCE-5C5A` · suite **28** testIds |
| **5C-5B** | **Bundle #5C-5B — Bootstrap / Reconcile Decouple** | CORE CATALOG | **CLOSED FINAL** · prod **2.63.51** · `50dae97` · **PRODUCTION VERIFIED** · `LIB-5C-5B-BOOTSTRAP-DECOUPLE` · suite **29** testIds · Payroll Bootstrap Integrity **PASS** |
| **5C-5C F1** | **Bundle #5C-5C F1 — Orphan reconcile cleanup** | CORE CATALOG | **CLOSED FINAL** · prod **2.63.52** · `efc45d9` · **PRODUCTION VERIFIED** · `LIB-5C-5C-LEGACY-CLEANUP-F1` · suite **30** testIds |
| **5C-5C F2** | **Bundle #5C-5C F2 — Legacy compat cleanup** | CORE CATALOG | **CLOSED FINAL** · prod **2.63.53** · `e3daa6d` · **PRODUCTION VERIFIED** · `LIB-5C-5C-LEGACY-CLEANUP-F2` · suite **31** testIds |
| **POST F2** | Observation · telemetria F3 T1–T7 | OBSERVATION | **ACTIVE** · [`CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md`](docs/architecture/CORE-5C-5C-F3-TELEMETRY-OBSERVATION.md) |
| **5C-5C F3** | ONE-SHOT sunset · store removal | CORE CATALOG | **BLOCKED** · telemetria T1–T7 + runbook + Owner GO |

**WIP poza commitem:** mobile ≠ backup scripts ≠ `docs/recovery/*`. **Z-05** iPhone field cert — gate właściciela dla mobile release.

---

> **Status programu:** ACTIVE. **Nie implementujemy równolegle kilku bundli** — każdy przechodzi pełny cykl AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → QUALITY GATE → COMMIT → PUSH → VERIFY → CLOSE. **Faza bieżąca: PRODUCTION OBSERVATION** dwóch wdrożonych bundli.

| Bundle | Zakres | Status | HEAD | Functional Obs | Performance Obs |
|--------|--------|:------:|------|:--------------:|:---------------:|
| **PR-PAY-S7-5 ETAP 1** | S7-5-1 (sync `kw-week-employees-deleted-ids`) + S7-5-2 (Edge tombstone-aware przed UNION + restore-aware) | **DEPLOYED** | `ae132bc` | **PASS** | **OPEN** |
| **PR-PERF-EDGE-OPT-A** | `batch-get` → order-preserving `mget` (N `SELECT` → 1 `SELECT ... IN`) | **DEPLOYED** | `609ae53` | **PASS** | **OPEN** |

**Functional Observation — PASS (potwierdzone):**
- ✅ Deploy success (Vercel) dla `ae132bc` i `609ae53` · build success (lokalny + Vercel)
- ✅ Automated regression PASS — S7-5 24/24 · Edge-Opt-A 12/12 · B4 13/13 · B6 10 · S2 15/15 · S6 22 · Frequency ALL
- ✅ Brak wykrytych regresji funkcjonalnych (kontrakt HTTP i klient niezmienione; batch-set/restore/merge/LWW/tombstones/backup nietknięte)

**Performance Observation — OPEN (wymaga telemetrii właściciela):**
- • Supabase CPU (before `ae132bc` vs after `609ae53`)
- • Postgres/API logs (`batch-get` = 1× `SELECT ... IN`; liczba `SELECT` before/after; `pg_stat_statements`)
- • Edge duration / `batch-get` latency · brak HTTP 500/timeout
- • `__wgdomSyncMetrics()` (`batchGet`/`batchSet`/`pushSkipped`)
- • (S7-5) Multi-device AC8–AC11 · UI validation (Payroll · WM · Tender · Inspector · Roster · Archive)

**Najwyższy pozostały hotspot CPU: Edge `batch-set`.** Główni kontrybutorzy (do przyszłego audytu, NIE implementować):
- powtarzane `kv.get(prev)` (guardy shrink + poprzednie stany Payroll/Jobs/Archive/Directory)
- `saveDailyFullBackup` (pełny bundle + scoring richness) na każdym `batch-set`
- rotacja backupów (`rotateKvBackups` / `rotateJobsBackups`)
- merge z poprzednią wartością (union/LWW po stronie Edge)
- serializacja/deserializacja pełnego bundla (~391KB JSONB)

**Edge-Opt-B** (redukcja kosztu Edge `batch-set`) — **MASTER AUDIT COMPLETE** · **Design Freeze: NOT STARTED** · **Implementation: BLOCKED**.
- **SSOT audytu:** [`docs/EDGE-OPT-B-MASTER-AUDIT.md`](docs/EDGE-OPT-B-MASTER-AUDIT.md) (call graph · execution order · data/restore dependencies · rollback · hotspots · risk matrix · split B1–B5 · DF prerequisites).
- **Blocking condition:** Performance Observation dla **PR-PAY-S7-5 ETAP 1** i **PR-PERF-EDGE-OPT-A** musi zostać **zamknięta** przed jakimkolwiek Design Freeze Edge-Opt-B.
- **Next planned work:** **Edge-Opt-B Bundle B1** (bramkowanie `saveDailyFullBackup`) — po odblokowaniu + owner GO.

---

## Cloud Sync ADR

**SSOT:** [`docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md`](docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md)

| Pole | Wartość |
|------|---------|
| **Status** | **PROPOSED** |
| **Evidence Gate** | **OPEN** |
| **Design Freeze** | **BLOCKED** |
| **Implementation** | **BLOCKED** |

> ACCEPTED i SYNC-ARCH-01 Design Freeze wyłącznie po **pełnym** zamknięciu Evidence Gate (EG-1…EG-5). Audyty Recovery: [`docs/recovery/`](docs/recovery/).

---

## Payroll Certification 2026

**Status: IN PROGRESS** · SSOT: [`docs/PAYROLL-CERTIFICATION-2026-AUDIT.md`](docs/PAYROLL-CERTIFICATION-2026-AUDIT.md) · REPRO F1: [`docs/PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md`](docs/PAYROLL-F1-EXTRACOSTS-REPRO-EVIDENCE.md)

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

---

## Payroll Process Design — 🔒 PROCESS COMPLETE (LOCK)

**Status (2026-07-03): PROJECT PROCESS COMPLETE** — faza projektowania procesu Payroll zamknięta. Dokumenty procesu 🔒 **LOCK**; brak otwartych dokumentów projektowania procesu. Aktywne pozostają wyłącznie **techniczne P0** (S7-5, F1, S7-4A observation) — osobny strumień, nie proces.

| Dokument | Rola | Status |
|----------|------|:------:|
| [`docs/PAYROLL-CERTIFICATION-SUITE.md`](docs/PAYROLL-CERTIFICATION-SUITE.md) | 27 funkcji · SETUP/TEST/VERIFY/ROLLBACK/VERIFY CLEAN · 10 multi-device · Smoke · Regression · BUG register | 🔒 LOCK |
| [`docs/PAYROLL-QUALITY-GATE.md`](docs/PAYROLL-QUALITY-GATE.md) | bramka pre-merge · poziomy L1–L4 · macierz typ→poziom · BLOCKED/ALLOWED | 🔒 LOCK |
| [`docs/QUALITY-GATE-INTEGRATION-PLAN.md`](docs/QUALITY-GATE-INTEGRATION-PLAN.md) | integracja z workflow (TEST → QUALITY GATE → COMMIT) · rekomendacje odwołań | 🔒 LOCK |
| [`docs/PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md`](docs/PR-PERF-S1-CLOUD-SYNC-BUNDLE-OPTIMIZATION-DESIGN-FREEZE.md) | wariant B · 5 bundli (Shared/Payroll/Tender/WM/Catalog) · INV-1…INV-9 · KPI · migration | 🔒 LOCK |
| [`docs/PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md`](docs/PAYROLL-CLOUD-SYNC-PERFORMANCE-AUDIT.md) | audyt requestów/egress · 3 warianty (LOW/MEDIUM/LONG TERM) → zasila PR-PERF-S1 | 🔒 LOCK (audyt) |

**BACKLOG (gated, NOT STARTED):** `PAYROLL-ARCHITECTURE-v3.md` (nieutworzony) · reorg `docs/payroll/` — patrz sekcje poniżej.

**Następny etap:** Production Observation S7-4A → (owner GO) IMPLEMENT S7-5 ETAP 1 → REPRO F1 → AUDIT CLOSE → odblokowanie BACKLOG. Integracja Quality Gate w workflow: pilotaż na S7-5 ETAP 1.

---

## Payroll Documentation Backlog — ❄️ FROZEN

> **FROZEN do zakończenia Payroll Certification 2026.** Oba zadania poniżej pozostają **BACKLOG · NOT STARTED**; nie startować przed spełnieniem gate. Nie dodawać nowych pozycji do tego backlogu bez polecenia. Powrót: po przejściu wszystkich pozycji OPEN → CLOSED (Certyfikacja).
>
> - **[1] `docs/PAYROLL-ARCHITECTURE-v3.md`** — gate: S7-5 CLOSED + F1 CLOSED (jeśli potwierdzony) + Certyfikacja CLOSED.
> - **[2] Reorg `docs/payroll/`** — gate: Certyfikacja CLOSED + `PAYROLL-ARCHITECTURE-v3.md` utworzony (zależny od [1]).

---

## PLANNED (BACKLOG) — `docs/PAYROLL-ARCHITECTURE-v3.md` (SSOT architektury Payroll)

**Status: BACKLOG · NOT STARTED · PLAN ONLY** (nie wykonywać teraz).

**Gate uruchomienia (wszystkie warunki):**
1. Zamknięcie **PR-PAY-S7-5** (Resurrection).
2. Zamknięcie **F1** (Lost Update extraCosts) — jeżeli zostanie potwierdzony w REPRO.
3. Zakończenie **Payroll Certification 2026** (wszystkie OPEN → CLOSED).

**Deliverable:** `docs/PAYROLL-ARCHITECTURE-v3.md` — jeden dokument SSOT zastępujący konieczność analizy wielu historycznych handoffów.

**Zakres (spis treści docelowy):**
- przepływ danych (data flow end-to-end)
- LocalStorage
- Cloud (KV)
- Edge (`make-server-0afb8820`)
- merge klienta (`cloud-sync.ts`)
- merge Edge (`index.tsx` parity)
- LWW (`dataUpdatedAt` / `rateUpdatedAt` / `settledUpdatedAt`)
- tombstones (`*-deleted-ids`)
- force-replace (`replaceWeekEmployeesKeys`)
- CloudSyncMutationGuard
- bootstrap/runtime parity (`finalizePayrollBundleMerge`, `applyRuntimePayrollAntiLeak`)
- rollover
- archive
- restore
- settled
- extraCosts
- sequence diagrams (pull → merge → push; rollover; restore)
- invariants (niezmienniki systemu)
- anti-patterns
- lessons learned

**Cel:** onboarding nowego agenta bez czytania rozproszonych handoffów (PAYROLL-CLOUD-RECOVERY B4/B6, Guard Phase, S6, S7, S7-5, Certyfikacja, F1).

**Workflow:** PLAN → BACKLOG → STOP. Do wykonania jako osobne zadanie po spełnieniu gate.

---

## PLANNED (BACKLOG) — Reorganizacja dokumentacji Payroll → `docs/payroll/`

**Status: BACKLOG · NOT STARTED · PLAN ONLY** · **Plan gotowy:** [`docs/PAYROLL-DOCS-REORG-PLAN.md`](docs/PAYROLL-DOCS-REORG-PLAN.md)

**Gate uruchomienia:** (1) zamknięcie Payroll Certification 2026 · (2) utworzenie `docs/PAYROLL-ARCHITECTURE-v3.md`.

**Zakres:** 33 dokumenty Payroll (26 `PAYROLL-*` + 4 handoffy + 3 styczne settlement) → podział **ACTIVE SSOT / HISTORY (Audit) / HISTORY (Design Freeze) / Archive** → docelowa struktura `docs/payroll/{active,history/audit,history/design-freeze,archive}` + `README.md` indeks.

**Twarde zasady:** ❌ nie usuwać · ❌ nie przenosić teraz · `git mv` przy wykonaniu (historia) · aktualizacja wszystkich linków (`.cursor/rules`, `AGENTS.md`, `PROJECT-STATUS.md`, `CURRENT-TASK.md`, `ARCHITECTURE.md`).

**Workflow:** PLAN → BACKLOG → STOP.

---

## PR-PAY-S6 — Archive Restore Eligibility Guard · **CLOSED**

| Pole | Wartość |
|------|---------|
| **AUDIT** | **COMPLETE** |
| **DESIGN FREEZE** | **APPROVED** |
| **IMPLEMENT** | **COMPLETE** · HEAD `d2a3d90` |
| **BUILD** | **PASS** |
| **TEST** | **PASS** — S6 22 PASS · gate regresji (S2/RB/closed/B4/B6) PASS |
| **SSOT** | [`docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md`](docs/PAYROLL-PR-PAY-S6-ARCHIVE-RESTORE-ELIGIBILITY-AUDIT.md) |
| **RCA** | Baner (`shouldShowPayrollRestoreBanner`) i `restoreWeekFromArchive` nie stosowały tombstonów PR-PAY-S2 do strony archiwum → false positive + wskrzeszanie starych/smoke pracowników |
| **Fix** | S6-1 pure helper `eligibleArchiveWeekEmployees` (reuse S2) · S6-2 baner z eligible (G1) · S6-3 restore z eligible (G2) · S6-4 test `test-payroll-archive-restore-eligibility-s6.mjs` · AC1–AC7 spełnione |
| **Zakres** | `cloud-sync.ts` · `PayrollView.tsx` · `App.tsx` · nowy test — bez zmian merge/Edge/metrics/KV |

---

## PR-PAY-S7 — Cloud Batch 500 Investigation · **AUDIT COMPLETE · S7-1 CLOSED · OBSERVATION**

| Pole | Wartość |
|------|---------|
| **AUDIT** | **COMPLETE** |
| **SSOT** | [`docs/PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md`](docs/PAYROLL-PR-PAY-S7-CLOUD-BATCH-500-AUDIT.md) |
| **RCA** | `batch-set` bez `try/catch`/`app.onError`; cały bundle w jednym `kv.mset` → *statement timeout* → opaque HTTP 500 podczas sync Payroll |
| **S7-1 Diagnostics** | **DONE · CLOSED** · `4c38f4f` (Edge deployed CI run `28655226870`) — `app.onError` + `try/catch` + `{ok,error,requestId}` + log realnego `error.message`; flow bez zmian |
| **OBSERVATION** | **WAITING FOR PRODUCTION EVIDENCE** — zebrać 1 incydent (requestId/error/stack/payload + Edge/Postgres logs) przed decyzją S7-5 |
| **S7A** frequency (batch-get/set) | **AUDIT COMPLETE** — **CONFIRMED CONTRIBUTING CAUSE** (nie Root Cause; brak infinite loop) · [`docs/PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md`](docs/PAYROLL-PR-PAY-S7A-CLOUD-SYNC-FREQUENCY-AUDIT.md) |
| **H1** batch-set timeout = RC | **UNCONFIRMED** — do requestId · error.message · Edge stack · Postgres log |
| **S7-2** hardening (chunk/izolacja `mset`) | **DRAFT** — NO GO bez Root Cause Confirmation |
| **S7-3** singleton Supabase client | **DRAFT** |
| **S7-4A** Cloud Sync Optimization (G1 debounce · G2 min-interval · G3/G4 focus/visibility throttle · AC4 no-change=no-push · AC5 metrics) | ✅ **IMPLEMENT COMPLETE · BUILD PASS · TEST PASS (17/17 + regresja)** → **PRODUCTION OBSERVATION 24–48h** · [`DF`](docs/PAYROLL-PR-PAY-S7-4-CLOUD-SYNC-OPTIMIZATION-DESIGN-FREEZE.md) |
| **G5 Delta Push / G6 ETag** | **OUT OF SCOPE** — decyzja po obserwacji |
| **S7-5** Resurrection Guard | **ETAP 1 DEPLOYED** (`ae132bc`) — S7-5-1 (sync `kw-week-employees-deleted-ids`) + S7-5-2 (Edge tombstone-aware przed UNION + restore-aware) · BUILD/TEST PASS (24/24 + regresje) · **Production Observation OPEN** (AC8–AC11 na urządzeniach) → **ETAP 2 warunkowy** (S7-5-3 `replaceWeekEmployeesKeys` · S7-5-4 stabilizacja merge-key) tylko jeśli obserwacja wykaże resurrection · AC1–AC11 + backlog AC12/AC13 · [`DF`](docs/PAYROLL-PR-PAY-S7-5-RESURRECTION-GUARD-DESIGN-FREEZE.md) |
| **PR-PERF-EDGE-OPT-A** (program Recovery) | **DEPLOYED** (`609ae53`) — `batch-get` → order-preserving `mget` (N `SELECT` → 1 `SELECT ... IN`) · BUILD/TEST PASS (12/12 + regresje) · kontrakt `{values}`/klient niezmienione · **Production Observation OPEN** (CPU/SELECT/500 do potwierdzenia) · [`DF`](docs/EDGE-OPT-A-BATCH-GET-ORDER-PRESERVING-DESIGN-FREEZE.md) |
| **Rewizja planu** | **S7-4A wdrożone → Observation 24–48h → warunkowo S7-2 (jeśli batch-set 500 nadal)**. Nowe dane: Supabase Resource Exhaustion + wysoka liczba batch-get |
| **Zakaz** | S7-2/S7-5/G5/G6 bez owner GO; S7-5 IMPLEMENT dopiero po zamknięciu obserwacji S7-4A; S7-4A nie ruszał merge/LWW/Payroll/tombstones/Edge/kv.mset |

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
| **TI-B2** | Konfiguracja `HARNESS_SANDBOX_JOB_IDS` (SSOT env, config-only) | **CLOSED** · prod **2.63.27** (`803c0bc`) |
| **TI-B2.1** | Payroll Harness Production Safety — Synthetic + Merge, Preview First (sandbox strategy **odrzucona**) | **CLOSED** · `2efe8b5` · test-harness only ([`TI-B2-CLOSEOUT.md`](docs/TI-B2-CLOSEOUT.md) §6) |
| **TI-B3** | CI GitHub Actions — gate B/C z orchestratora | OPEN |
| **TI-B4** | Smoke agregat NG-01–04 | **CLOSED** · prod **2.63.27** |
| **MB-1** | Test-Gate Integrity — `isBlockingFailure()` (wybrany conditional blokuje) | **CLOSED** · `460031f` |
| **MB-1.1** | Docs SSOT Sync — DESIGN FREEZE v2.0 + #009 | **CLOSED** · `8b5c63c` |
| **MB-2** | Docs SSOT Sync — synchronizacja docs po MB-1/MB-1.1/TI-B2.1 | **CLOSED** (ten bundle) |
| **TEST-FIX-001** | Naprawa bramki testów (release gate) | **DONE — SUPERSEDED BY MB-1** (`460031f`) |

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

## NG-03 Maintenance — R-03 · M-06 · A-03-1 · **CLOSED** (docs · 2026-07-05)

| Element | SSOT |
|---------|------|
| **R-03** freeze banner | [`docs/NG-03-DESIGN-FREEZE.md`](docs/NG-03-DESIGN-FREEZE.md) · [`audit/NG-03-EPIC-CLOSE-REPORT.md`](audit/NG-03-EPIC-CLOSE-REPORT.md) |
| **M-06** deprecation map | [`docs/NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md`](docs/NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md) · Removal Checklist |
| **A-03-1** overlap audit | [`docs/A-03-1-STATUS-OVERLAP-AUDIT.md`](docs/A-03-1-STATUS-OVERLAP-AUDIT.md) |

**Zero** zmian `src/` · Protected Core GREEN.

---

## NG-02 — Tender Automation Pipeline · **EPIC CLOSED** (2.62.98)

---

## NG-01 — Tender Trust Layer · **SHIPPED** (w ramach serii 2.63.x)

---

## NG11-P0 — Tender Pipeline Discovery · **EPIC COMPLETE**

> **SSOT:** [`docs/architecture/NG11-P0-EPIC-CLOSE-REPORT.md`](docs/architecture/NG11-P0-EPIC-CLOSE-REPORT.md) · [`docs/architecture/NG11-P0-CLOSEOUT.md`](docs/architecture/NG11-P0-CLOSEOUT.md)

| Pole | Wartość |
|------|---------|
| **Status** | **EPIC COMPLETE** · **PRODUCTION VERIFIED** |
| **Prod** | **2.65.3** @ **`281ede1`** |
| **Slice'y** | P0 `f4697f9` · P0.1-A `db927ea` · P0.2 `281ede1` |
| **Protected Core** | **GREEN** |
| **POST RELEASE obs.** | **CLOSED** (superseded) |

**Nie rozszerzaj bez nowego AUDIT + Owner GO.** Backlog: P0.2.1 · POST transport — OPEN.

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

### AD-10 — postęp (2026-07-02) · **W01 Health GREEN**

| Zadanie | Status |
|---------|--------|
| MOBILE-P0-S1 · M-03 · M-03.1 (mobile trilogy) | **CLOSED** na feature branchach (`stabilization/mobile-p0-s1/s2/field-cert-m03-1`) — **nie** zmergowane do `main` |
| **Z-05 FIELD VALIDATION** | **PENDING (Device Required)** — trylogia kod/docs CLOSED; wykonanie terenowe iPhone Safari |
| **M-05 Payroll Etap 1 regresja** | **CLOSED (AUDIT PASS)** — B1–B6+RB CLOSED · 0 regresji · jedyny FAIL = P3 test hygiene |
| **W01 Weekly Metrics** | **CLOSED — GREEN** — Z-02/Z-03/Z-04/Z-06 PASS · Z-01 ACCRUAL · Z-05 Device · Z-07 Owner |

**Tracker + artefakty AD-10 poza repo:** `../WGDOM1-branch-audit/AD-10-LOCAL-STATUS.md` (zasada: audyty nie w repo).

**Domknięcie sesji (słowo-klucz):** „**domknij WGDOM**” → aktualizacja docs ciągłości + commit docs — patrz [`.cursor/rules/wgdom-domkniecie-sesji.mdc`](.cursor/rules/wgdom-domkniecie-sesji.mdc).

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.63.85** @ **`88650be`** · fix S2 **`e819124`** · **BASELINE LOCKED** |
| **P0 Payroll Cross-Device Sync** | **FULLY CLOSED** · observation **2026-07-11** · [`docs/INCIDENTS.md`](docs/INCIDENTS.md) |
| **NG-09-05** | **CLOSED** · Closeout & Polish · **2.63.84** · `29f7842` |
| **NG-09-03** | **CLOSED** · Job Workspace L2 · **2.63.82** |
| **NG-09-02** | **CLOSED** · View Router L1 · **2.63.81** |
| **NG-09-01** | **CLOSED** · Workspace Frame · **2.63.80** |
| **M-03** | **CLOSED** · Mobile Re-certification · **2.63.79** @ `f7878fe` |
| **TI-B4** | **CLOSED** · **Z-04 PASS** · **2.63.27** |
| **NG-04** | **EPIC CLOSED** |
| **PAYROLL Guard Phase** | **B3+B3.1+B3.2 CLOSED** · [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2** | **B1–B6 + RB CLOSED** |
| **PR-PAY-S6** | **CLOSED** · Archive Restore Eligibility Guard · HEAD `d2a3d90` |
| **PR-PAY-S7** | **S7-1 CLOSED** (`4c38f4f`) · **S7A** contributing cause · **S7-4A OBSERVATION** · S7-2 warunkowo (jeśli 500 nadal) · G5/G6 out of scope · S7-3 DRAFT · **S7-5 ETAP 1 DEPLOYED (`ae132bc`) — Production Observation OPEN · ETAP 2 warunkowy** · H1 UNCONFIRMED |
| **PR-PERF-EDGE-OPT-A** | **DEPLOYED** (`609ae53`) · `batch-get` → order-preserving `mget` (N→1 `SELECT`) · **Production Observation OPEN** |
| **Recovery Program** | **ACTIVE** · faza **PRODUCTION OBSERVATION** · **Edge-Opt-B MASTER AUDIT COMPLETE** ([`EDGE-OPT-B-MASTER-AUDIT.md`](docs/EDGE-OPT-B-MASTER-AUDIT.md)) · DF NOT STARTED · IMPL BLOCKED (gate: Performance Observation S7-5+Edge-Opt-A) · next **B1 `saveDailyFullBackup` gating** |
| **Audit Hub AH-REG-1** | **CLOSED** · **2.63.25** |
| **TEST-INFRA-001** | **CLOSED** · **2.63.26** |
| **Test-infra post-close** | **MB-1 `460031f` · MB-1.1 `8b5c63c` · MB-2 (docs) · TI-B2.1 `2efe8b5` CLOSED** · TEST-FIX-001 DONE (SUPERSEDED BY MB-1) · runtime bez zmian |
| **Stabilization Window** | **ACTIVE** |
| **NG-05 MPI** | **DESIGN COMPLETE** · **IMPLEMENT BLOCKED** |
| **Aktywny epic Przetargi** | **brak** — na polecenie |

---

## Backlog (na polecenie)

| Temat | Status |
|-------|--------|
| **TEST-INFRA post-MVP** (TI-B1 · TI-B3) | OPEN · na polecenie · (TI-B2 `803c0bc` · **TI-B2.1 `2efe8b5`** CLOSED) |
| **Work Catalog P2** — UI Biblioteka Robót (P2.1–P2.10) | **CLOSED** · prod **2.63.41** |
| **Bundle #5C-0A** — Pricing refresh after Work Catalog save | **CLOSED FINAL** · prod **2.63.43** · `c151b40` |
| **Bundle #5C-1** — Read SSOT Work Catalog only | **CLOSED FINAL** · prod **2.63.44** · `aecf851` |
| **Bundle #5C-2** — Write SSOT work_only default | **CLOSED FINAL** · prod **2.63.45** · `a7bc713` |
| **Bundle #5C-3A** — UX copy & navigation cutover | **CLOSED FINAL** · prod **2.63.46** · `d95b30b` |
| **Bundle #5C-3B** — Preview data SSOT cutover | **CLOSED FINAL** · prod **2.63.47** · `fcf3c6f` |
| **Bundle #5C-3C** — Dead UX cleanup | **CLOSED FINAL** · prod **2.63.48** · `e89051b` |
| **Bundle #5C-3D** — History SSOT from Work Catalog | **CLOSED FINAL** · prod **2.63.49** · `03823ad` |
| **Bundle #5C-5A** — Legacy KV sync quiesce | **CLOSED FINAL** · prod **2.63.50** · `36b3ddd` |
| **Bundle #5C-5B** — Bootstrap / Reconcile Decouple | **CLOSED FINAL** · prod **2.63.51** · `50dae97` · verify 2026-07-06 |
| **Bundle #5C-5C F1** — Orphan reconcile cleanup | **CLOSED FINAL** · prod **2.63.52** · `efc45d9` · verify 2026-07-06 |
| **Bundle #5C-5C F2** — Legacy compat cleanup | **CLOSED FINAL** · prod **2.63.53** · `e3daa6d` · verify 2026-07-06 |
| **POST F2 observation** — telemetria F3 | **ACTIVE** · T1–T7 NOT COLLECTED |
| **#5C-5C F3** — ONE-SHOT sunset · store removal | **BLOCKED** · telemetria + runbook + Owner GO |
| **EPIC #5C** — Cutover Przetargi → Work Catalog | **OPEN** · pozostało **#5C-5C F3** |
| **Bundle #6E** — Deferred bootstrap reliability | **CLOSED** · prod **2.63.42** · `7138957` |
| **G-08** persist `code` in snapshot | OPEN |
| **G-02** R/M/S inline BOQ | OPEN |
| **INFRA-DB-BACKUP-01** — podniesienie backupu z klasy B (Application) do A (Disaster Recovery): `supabase login` + link + pełny `supabase db dump` + certyfikacja | **ON HOLD** · priorytet średni · gate: poświadczenia DB + owner GO (backup lokalny klasy B wykonany 2026-07-04 w `backup/`, gitignored) |
