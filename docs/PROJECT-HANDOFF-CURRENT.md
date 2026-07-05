# PROJECT HANDOFF CURRENT — W&G DOM

> **★ Główny handoff projektu (SSOT)** · **Data closeout:** 2026-07-05 (**prod 2.63.33** · **runtime `a4cd5c2`** · **docs `b7b4deb`** · **FEATURE DEVELOPMENT RESTART** · **RC-B + CORE-01A + PLATFORM-SYNC-01A CLOSED** · **Protected Core ACTIVE** · **TI-B4 / TEST-INFRA-001 CLOSED** · **STABILIZATION WINDOW ACTIVE**)
> **★ RC-B + Lista Płac:** [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · [`PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md`](PAYROLL-CLOUD-SYNC-ARCHITECTURE-AGENT-GUIDE.md) · [`AGENT-CONTINUITY-GUIDE.md`](AGENT-CONTINUITY-GUIDE.md) § 2b — **nie psuj LP przy FEATURE**  
> **★ Stabilizacja:** [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) · [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md)
> **★ SSOT Workflow:** [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md) — Hub, Process Strip, Sticky CTA, zakładki V4 (finalized przy 2.62.72)  
> **Skrót post-ZI:** [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md)  
> **Hasło sesji:** „kontynuuj WGDOM”  
> **Poprzedni handoff końcowy serii:** [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) — nadal ważny dla architektury platformy 20.5Z; **ten dokument** aktualizuje baseline prod i releasy **po** 20.5Z.

**Wejście dla nowej sesji:**

```text
0. docs/AGENT-APP-MAP.md                  ← ★★★ mapa widoków, modułów, KV, sync (START dla AI)
1. docs/PROJECT-HANDOFF-CURRENT.md        ← TEN PLIK (baseline prod)
0. docs/AGENT-CONTINUITY-GUIDE.md         ← ★★ kontekst sesji + mapa struktury dla programistów
1w. docs/WORKFLOW-ARCHITECTURE-v2.63.md   ← ★★ SSOT Workflow (finalized 2.62.72)
1y. docs/SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md  ← ★★ Kosztorys V4 fazy procesu P0 (CLOSED · 2.62.64)
1z. docs/SESSION-HANDOFF-DISCOVERY-DOCUMENTS-VARIANT-B.md  ← ★ Discovery dokumentów variant B (CLOSED · 2.62.63)
1s. docs/SESSION-HANDOFF-2026-06-24.md    ← sesja Audit Hub · TP200C · P0 cloud-sync
1t. docs/SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md  ← ★★ WM Druk ZI §4/§5 · TP203 · P4 toast (2.62.46–48)
1w. docs/SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md      ← ★★ WM Schematy jednokreskowe MVP (CLOSED · 2.62.49)
1x. docs/SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md ← ★★ WM Schematy visual fidelity V2 (CLOSED · 2.62.51)
1v. docs/SESSION-HANDOFF-AUDIT-HUB.md     ← ★★ Audit Hub MVP-0→1B (CLOSED)
1w. docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md  ← audyt historyczny SUPERSEDED · P1 **CLOSED** · SSOT: ARCHITECTURE § 15.6
1u. docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md  ← ★★ P0 Vercel deploy unblock (CLOSED)
1u2. docs/SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md  ← ★★ P0 sync egress · exceed_egress_quota (**INCIDENT CLOSED** 2026-06-29)
1u3. docs/SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md  ← ★★ ACL Instrukcja + Zmiany (CLOSED · 2.62.92)
1u5. docs/SESSION-HANDOFF-NG-02-EPIC-CLOSE.md  ← ★★ NG-02 Pipeline auto przetarg (CLOSED · 2.62.95–98)
1u7. docs/SESSION-HANDOFF-P0-TENDER-DETAIL-SSOT-TAB.md  ← ★★ P0 tab SSOT URL (CLOSED · 2.63.8)
1u6. audit/NG-02-EPIC-CLOSE-REPORT.md  ← ★★ NG-02 epic closeout report
1a. docs/SESSION-HANDOFF-TP190-PARSER-V3.md  ← ★★ TP190 parser v3 + batch rebuild (2.62.27)
1b. docs/SESSION-HANDOFF-PDF-WM-RECOVERY.md  ← ★★ PDF WM Recovery TP196–TP201C (CLOSED)
1c. docs/SESSION-HANDOFF-TP200-PLANNED.md    ← ★★ TP200B fidelity (PLANNED)
1d. docs/SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md  ← ★★ P0 ZIP ATH Recovery (2.61.4 CLOSED)
1c. docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md  ← ★★ P1A–P1D Owner View · modal
2. docs/MASTER-HANDOFF-POST-ZI-2026.md    ← ★★ skrót POST ZI-2026 (WM Druk COMPLETE)
3. docs/ZI-2026-HANDOFF.md              ← ★★★ ZI Tauron 2026 prod SSOT
4. docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md  ← ★★ Pomiary Elektryczne EM-P1R (2.59.44)
4b. docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md  ← ★★ Lista Płac · Przydziały robót P1 (2.59.49)
5. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md  ← ★★ Odbiory WM Druk (COMPLETE)
6. docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md  ← ★★ Notatki operacyjne P0→HF (COMPLETE)
7. docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md  ← ★★ P3 wycena · BZP pipeline · P3.6 · P1 WM
8. docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md  ← ★★ P2-H dokumenty · ZIP · 7Z · Marketplanet
9. docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md  ← ★★ UX.1A/1B workspace + ARCH-001
10. docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md  ← P2-F kwalifikacja ofertowa (COMPLETE)
11. docs/SESSION-HANDOFF-DASHBOARD-V3.md   ← Pulpit V3 (COMPLETE — referencja)
12. CURRENT-TASK.md                         ← status sesji · STABILIZATION WINDOW
12s. docs/STABILIZATION-WINDOW-PLAN.md      ← plan okresu stabilizacji
12w. docs/STABILIZATION-WEEKLY-METRICS-TEMPLATE.md  ← raport tygodniowy
12n. docs/NG-04-EPIC-CLOSE-REPORT.md         ← NG-04 epic close
12t. docs/TEST-INFRA-001-CLOSEOUT.md           ← ★★ TEST-INFRA-001 Harness MVP (CLOSED · 2.63.26)
12t4. docs/TI-B4-CLOSEOUT.md                   ← ★★ TI-B4 Smoke agregat NG-01–04 (CLOSED · 2.63.27)
12t2. docs/TEST-INFRA-001-DESIGN-FREEZE.md     ← DESIGN FREEZE v2.0 (historyczny SSOT)
12t3. docs/TEST-INFRA-LIFECYCLE.md              ← lifecycle orchestratora
12p. docs/PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md  ← ★ PAYROLL Etap 2 B1+B2 (CLOSED · 2.63.17)
12p2. docs/PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md  ← ★ PAYROLL Etap 2 B3 Guard Phase 2 (CLOSED · 2.63.18)
12p3. AUDIT + DESIGN FREEZE B3.1 (2026-07-01)  ← ★ PAYROLL Etap 2 B3.1 Guard Rollover (CLOSED · 2.63.19)
12p4. docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md  ← ★★ PAYROLL Guard Phase B3/B3.1/B3.2 SERIES CLOSED (2.63.18–20)
12p5. docs/PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md  ← ★★ PAYROLL Etap 2 B4 Bootstrap Merge SSOT (CLOSED · 2.63.21)
12q. docs/PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md  ← ★ PAYROLL P0 roster UNION (CLOSED · 2.63.15)
12r. docs/PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md  ← ★ PAYROLL guard LP Przydziały (CLOSED · 2.63.16)
12u. docs/ARCHITECTURE-REVIEW-2026-TENDERS.md  ← review Przetargi
13. docs/WORKFLOW-RELEASE-DEPLOY.md         ← workflow A/B/C
14. AGENTS.md → docs/ARCHITECTURE.md § 12.1.8 WM Druk · § 12.1.10 EM · § 12.1.21 Schematy · § Notatki
```

---

## 1a. Completed Epics (P0 ZIP ATH + P1 + P2-F + P3 CLOSED)

| Epic | Wersja | Status | SSOT |
|------|--------|--------|------|
| **PLATFORM-SYNC-01A** — reconcile notatek operacyjnych (archive race) | **2.63.33** (`a4cd5c2`) | **CLOSED** · ETAP B ON HOLD | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) § 3.5 · `CURRENT-TASK.md` |
| **FEATURE Bundle B** — Owner View P2A pdf_text | **2.63.32** (`119576c`) | **CLOSED** | [`SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md`](SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md) |
| **SYNC-ARCH-01 RC-B** — pełny program (PWRB + verify) | **2.63.30–31** (`35f37b1`→`31a7d5e`) | **CLOSED** · prod LP verified | [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) |
| **SYNC-ARCH-01 RC-B-1** — Tombstone Revocation (PWRB) | **2.63.30** (`35f37b1`) | **CLOSED** · I-1…I-4 · overlay cleanup `24bde6e` | [`recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) · [`recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md`](recovery/SYNC-ARCH-01-RC-B-1-DESIGN-FREEZE-v2.md) |
| **TI-B4** — Smoke agregat Przetargi NG-01–04 | **2.63.27** (`6c94223`) | **CLOSED** · thin wrapper · manifest 1.1.0 · Gate B `scope:tenders` · **Z-04 PASS** | [`TI-B4-CLOSEOUT.md`](TI-B4-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) |
| **TEST-INFRA-001** — Payroll Test Harness MVP | **2.63.26** (`3d6dd90`) | **CLOSED** · manifest + orchestrator + PAYROLL-GUARD-S1 | [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md) · [`TEST-INFRA-LIFECYCLE.md`](TEST-INFRA-LIFECYCLE.md) |
| **Audit Hub freshness AH-REG-1** | **2.63.25** (`d9ba13f`) | **CLOSED** · notify + `refreshAuditHubAuxFromCloud` | [`AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md`](AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md) · [`AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md`](AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md) |
| **Payroll Restore Banner RB** | **2.63.24** (`727e6c4`) | **CLOSED** · `shouldShowPayrollRestoreBanner` / `payrollMetrics` | [`PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md`](PAYROLL-RESTORE-BANNER-DESIGN-FREEZE.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B6** | **2.63.23** (`d670892`) | **CLOSED** · Edge parity `payroll-week-employee-merge.ts` | [`PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B5** | **2.63.22** (`187afb8`) | **CLOSED** · closed week UI read-only | j.w. |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B4** | **2.63.21** (`b3d5664`) | **CLOSED** · `finalizePayrollBundleMerge` SSOT bootstrap/runtime | [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) |
| **PAYROLL Guard Phase (B3–B3.2)** | **2.63.18–20** (`45eddaa`→`6afd9fd`) | **SERIES CLOSED** · R1/R2/R3 guard · ref cleanup B3.2 | [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B3.2** | **2.63.20** (`6afd9fd`) | **CLOSED** · usunięcie `payrollRosterPushRef` | j.w. § B3.2 |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B3.1** | **2.63.19** (`91d02de`) | **CLOSED** · Guard Rollover R3 · `autoArchiveAndAdvance` | AUDIT + DESIGN FREEZE B3.1 (2026-07-01) |
| **PAYROLL-CLOUD-RECOVERY Etap 2 B3** | **2.63.18** (`45eddaa`) | **CLOSED** · Guard Phase 2 R1/R2 · `withKwWeekEmployeesAsyncMutation` | [`PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md) |
| **PAYROLL-CLOUD-RECOVERY Etap 2 (MIN)** | **2.63.17** (`734cbfe`) | **CLOSED** · **B1–B6 CLOSED** | [`PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md) · [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) |
| **PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD P0** | **2.63.16** (`31a687a`) | **CLOSED** · `CloudSyncMutationGuard` Lista Płac Przydziały | [`PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md`](PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md) |
| **PAYROLL-CLOUD-RECOVERY P0 roster** | **2.63.15** (`1a65341`) | **CLOSED** · UNION `directoryId` · dedup Kadr | [`PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md`](PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md) |
| **TEST-INFRA-001** — Payroll Test Harness | **2.63.26** (`3d6dd90`) | **CLOSED** · manifest + orchestrator + PAYROLL-GUARD-S1 preview | [`TEST-INFRA-001-CLOSEOUT.md`](TEST-INFRA-001-CLOSEOUT.md) · TI-B1/TI-B3 backlog OPEN · **TI-B2 CLOSED** (`803c0bc`) · **TI-B2.1 CLOSED** (`2efe8b5`, [`TI-B2-CLOSEOUT.md`](TI-B2-CLOSEOUT.md) §6) · **TI-B4 CLOSED** |
| **Test-Gate Integrity + Docs Sync** (MB-1 · MB-1.1 · MB-2 · TI-B2.1) | runtime **2.63.27** (bez bumpu) · main `2efe8b5` | **CLOSED** · test-infra/docs only · MB-1 `isBlockingFailure` · MB-1.1 DESIGN FREEZE v2.0/#009 · TI-B2.1 harness Preview First + merge-not-replace · MB-2 docs SSOT sync · **TEST-FIX-001 DONE (SUPERSEDED BY MB-1)** | [`TEST-INFRA-001-DESIGN-FREEZE.md`](TEST-INFRA-001-DESIGN-FREEZE.md) (v2.2) · [`TI-B2-CLOSEOUT.md`](TI-B2-CLOSEOUT.md) §6 |
| **STABILIZATION WINDOW** | od 2026-07-01 | **ACTIVE** · brak nowych epiców | [`STABILIZATION-WINDOW-PLAN.md`](STABILIZATION-WINDOW-PLAN.md) · [`STABILIZATION-WEEKLY-METRICS-TEMPLATE.md`](STABILIZATION-WEEKLY-METRICS-TEMPLATE.md) |
| **NG-04 Kosztorys Workspace PRO** | **2.63.9–12** (`ab6637f`) | **EPIC CLOSED** · BOQ Explorer · Principles #001–#010 | [`NG-04-EPIC-CLOSE-REPORT.md`](NG-04-EPIC-CLOSE-REPORT.md) · [`NG-04-DESIGN-FREEZE.md`](NG-04-DESIGN-FREEZE.md) |
| **P0 Tender Detail Tab SSOT** | **2.63.8** (`f482016`) | **CLOSED** · URL SSOT + `pendingTab` · sync modułu `list` przy detalu | [`SESSION-HANDOFF-P0-TENDER-DETAIL-SSOT-TAB.md`](SESSION-HANDOFF-P0-TENDER-DETAIL-SSOT-TAB.md) · ARCHITECTURE § 12.1.27 · WORKFLOW § 3.2 |
| **NG-03 Tender Workspace UX** | **2.63.0–2.63.7** | **Seria CLOSED** · polish 2.63.7 · tab bug → hotfix 2.63.8 | [`NG-03-DESIGN-FREEZE.md`](NG-03-DESIGN-FREEZE.md) |
| **NG-02 Tender Automation Pipeline** | **2.62.95–98** (`aeecdc0`) | **CLOSED** · auto discovery → heavy → pricing · prod bootstrap fix 02.1C | [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md) · ARCHITECTURE § 12.1.23–26 |
| **SUPER ADMIN ACL (Instrukcja + Zmiany)** | **2.62.92** (`5f212b4`) | **CLOSED** · osobne menu · AppSettings ACL | [`SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md`](SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md) · ARCHITECTURE § 5.1 |
| **P0 Cloud Sync Incident** | **2.62.81** (prod) | **CLOSED** · Supabase Pro · prod smoke PASS 2026-06-29 | [`SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) · [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) §0 |
| **Biblioteka Robót v3.0 — P1 Foundation** | **2.62.80** | **CLOSED** · lib + KV + golden · **bez UI** · P2 OPEN | [`docs/work-catalog/FOUNDATION-FREEZE-v1.0.md`](work-catalog/FOUNDATION-FREEZE-v1.0.md) · [`audit/P1-WORK-CATALOG-COMPLETION-REPORT.md`](../audit/P1-WORK-CATALOG-COMPLETION-REPORT.md) · ARCHITECTURE § 12.1.22 |
| **Mobile Recovery** | **2.62.78–2.62.79** (`78582db`→`4397eac`) | **CLOSED** · prod smoke 7 PASS / 1 BLOCKED · outstanding bugs **NONE** | § 2b poniżej · `CURRENT-TASK.md` |
| **Recovery Pack off-site** | **2.62.72** (`6cd8ebe`) | **COMPLETED** · PRODUCTION READY · OFFSITE READY · G7 PASS | § 2a poniżej · pack `WGDOM-RP-2.62.72-20260626` |
| **Workflow Architecture (V4 Hub)** | **2.62.64–2.62.72** (`6cd8ebe`) | **FINALIZED** · Hub · Process Strip · Sticky CTA · Summary Header · Cleanup P0 · grouped docs G7 | [`WORKFLOW-ARCHITECTURE-v2.63.md`](WORKFLOW-ARCHITECTURE-v2.63.md) |
| **Kosztorys Process UX P0** | **2.62.64** (`4056223`) | **CLOSED** · `deriveKosztorysProcessPhase` · 8 faz biznesowych · retry parse | [`SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md`](SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md) · ARCHITECTURE § 12.1.15a |
| **Discovery dokumentów variant B** | **2.62.63** (`e2d899a`) | **CLOSED** · bramka anchor · retry bootstrap | [`SESSION-HANDOFF-DISCOVERY-DOCUMENTS-VARIANT-B.md`](SESSION-HANDOFF-DISCOVERY-DOCUMENTS-VARIANT-B.md) · `tender-document-discovery.ts` |
| **AUDIT-HUB-WM-001** | **2.62.74–77** (`b4fde0c`→`21d4a1b`) | **CLOSED** · 4 etapy · 7 źródeł Hub · 10 akcji WM Druk | [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](../audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md) · ARCHITECTURE § 15.6 |
| **WM Schematy jednokreskowe MVP + V2 fidelity** | **2.62.51** (`78f11cd`) | **CLOSED** · tab Schematy · KV sync · PDF · renderer **v5** · audyt V2C B+ | [`SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md`](SESSION-HANDOFF-ELECTRICAL-SCHEMATICS.md) · [`SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md`](SESSION-HANDOFF-WM-SCHEMATY-V2-2026-06-24.md) · ARCHITECTURE § 12.1.21 |
| **P4 WM upload toast** | **2.62.48** (`5cef155`) | **CLOSED** · brak „Dodano 0 plików” | [`SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md`](SESSION-HANDOFF-WM-ZI-TP203-P4-2026-06-24.md) §4 |
| **TP203 Address Parser M1** | **2.62.47** (`08178cc`) | **CLOSED** · `parseJobAddressParts` | j.w. §3 · `test-wm-print-address-parser-tp203.mjs` |
| **ZI §5 owner preservation** | **2.62.46** (`a40381c`) | **CLOSED** · §4 tylko 95–97 | j.w. §2 · `ZI-2026-HANDOFF.md` |
| **P0 cloud-sync delivery package import** | **2.62.42** (`d799033`) | **CLOSED** · regresja 2.62.39 | [`SESSION-HANDOFF-2026-06-24.md`](SESSION-HANDOFF-2026-06-24.md) §4 |
| **Audit Hub MVP-1B Recovery Events** | **2.62.41** (`656a00c`) | **CLOSED** · security_log RECOVERY/DATA | [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) |
| **Przetargi · TP200C sync merge fidelity** | **2.62.40** (`0d5b916`) | **CLOSED** · `pickBetterKosztorys` SSOT | `tender-dossier-merge.ts` · `test-tp200c-sync-merge-fidelity.mjs` |
| **Audit Hub MVP-1 Security Log** | **2.62.39** (`2b8980c`) | **CLOSED** · 6. źródło Hub | [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) |
| **Audit Hub MVP-0** | **2.62.36–2.62.37** (`b2eed93`+`a0d7093`) | **CLOSED** · agregacja 5 źródeł · P0 localeCompare hotfix | [`SESSION-HANDOFF-AUDIT-HUB.md`](SESSION-HANDOFF-AUDIT-HUB.md) |
| **Production deploy unblock** | **2.62.31** (`d79f7c1`) | **CLOSED** · Vercel BUILD PASS | [`SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md) |
| **Lista Płac · Work Entry Delete Persistence** | **2.62.34** | **CLOSED** · `deletedWorkEntryTombstones` · merge + JobsView + Pulpit | `payroll-job-assignments.ts` |
| **Przetargi · Formal XLSX UI Guard** | **2.62.33** (`59307da`) | **CLOSED** | `tender-detail-v4-display.ts` |
| **Przetargi · R1-FIX ATH vs Strong PDF** | **2.62.32** (`40eb274`) | **CLOSED** · `pdfRows > athRows × 1.05` | `tender-dossier-merge.ts` |
| **Przetargi · TP190C-3C Batch Write prod** | **2026-06-22** | **CLOSED** · 9/9 migrated · stale=0 · failed=0 | [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) |
| **Przetargi · TP202A Analyze/Dossier** | **2.62.31** (`94d2e72`) | **CLOSED** · `existingDossier` merge | `tender-dossier-pipeline.ts` |
| **Przetargi · TP201E-B PDF layout** | **2.62.30** (`cba8f6f`) | **CLOSED** | `pdf-przedmiar-heuristic.ts` |
| **Przetargi · TP190C-3B Batch Rebuild** | **2.62.27** (`df2524f`) | **CLOSED** · tooling dry-run/`--write` | [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md) |
| **Przetargi · P1 Cost Content Detection** | **2.62.26** (`c869be7`+`d79f7c1`) | **CLOSED** · `tender-cost-content-detection.ts` | unblock handoff §3 |
| **Przetargi · TP190C-2E Extract parity** | **2.62.26** (`c869be7`) | **CLOSED** | `tenders-bzp-doc-parse.ts` |
| **Przetargi · TP190C-1 Stale rebuild** | **2.62.25** (`43ebc3f`) | **CLOSED** | `existingKosztorysForRebuildPick` |
| **Przetargi · TP190B Parser v3** | **2.62.23** (`dd82593`) | **CLOSED** · `CURRENT_PARSER_VERSION=3` | `test-tp190b-dossier-stability.mjs` |
| **Lista Płac · Payroll sync fidelity** | **2.62.20–2.62.22** | **CLOSED** | merge days/roster/workEntries |
| **Przetargi · PDF WM Recovery** | **2.62.10–2.62.24** | **CLOSED** · TP182 **~142 poz.** | [`SESSION-HANDOFF-PDF-WM-RECOVERY.md`](SESSION-HANDOFF-PDF-WM-RECOVERY.md) |
| **Przetargi · TP200A parserVersion** | **2.62.11** (`6b3ca8a`) | **CLOSED** | `tender-dossier-parser-version.ts` |
| **Przetargi · TP190A re-analyze guard** | **2.62.9** (`73093e4`) | **CLOSED** | `tender-dossier-pipeline.ts` · `test-tender-dossier-merge-quality.mjs` |
| **Przetargi · TP192A/B/C perf** | **2.62.6–2.62.8** | **CLOSED** | host skip · parallel probe · parallel bytes |
| **Przetargi · TP191 PZ / Open Nexus** | **2.62.2** | **CLOSED** | `test-platformazakupowa-public-documents.mjs` |
| **Przetargi · TP193A/B stabilization** | **2.62.3–2.62.4** | **CLOSED** | lazy dossier · loading guard |
| **Przetargi · TP194A encoding PZ** | **2.62.5** | **CLOSED** | `tender-filename-encoding.ts` |
| **Przetargi · P0/P1 Kosztorys Merge Quality** | **2.62.1** (`50d7501`+`4574182`) | **CLOSED** · ATH/PDF chronione przy sync + BZP | [`SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md`](SESSION-HANDOFF-P0-P1-KOSZTORYS-MERGE-QUALITY.md) |
| **Przetargi · V4.2 Kosztorys PRO** | **2.62.0** | **COMPLETE** · KPI · TOP 20 · filtry · ocena · Pobierz ATH | ARCHITECTURE § 12.1.15 · `tender-kosztorys-pro-dashboard.ts` |
| **Przetargi · ATH visibility hotfix** | **2.61.5** (`c41d79b`) | **PROD** · cap 500 · filter→slice · 302/302 TP113 | CHANGELOG 2.61.5 |
| **Przetargi · P0 ZIP ATH Recovery** | **2.61.4** (`653abe0`) | **CLOSED** · duże ZIP 128 MB · zip-catalog · ATH z dokumentacji WM | [`SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md`](SESSION-HANDOFF-P0-ZIP-ATH-RECOVERY.md) |
| **Przetargi · V4 Kosztorys** | **2.61.2–2.61.3** | **CLOSED** · filtr formalnych · `catalogQuantities` SSOT | CHANGELOG 2.61.2–2.61.3 |
| **Przetargi · P1 Document Insights** | **2.59.52** (`ff20fec`) | **CLOSED** · P1A PDF UX + P1B Summary + P1C Executive + P1D Inference | [`SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md`](SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md) |
| **Przetargi · Tender Stabilization (P3-AUDIT-001)** | **2.59.51** (`ed2eed5`+`cca4f92`+`3466ad7`) | **CLOSED** · FIX-A dokumenty + FIX-B UNKNOWN 0% + FIX-C wydajność | smoke FIX-A/B/C + `test-tender-cost-intelligence.mjs` |
| **Odbiory WM Druk P0 infra** | 2.59.15–**2.59.19** | **CLOSED** (pollution/KV/runtime) | [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) |
| **ZI Tauron 2026** | **2.59.22–2.59.25** | **PRODUCTION STABLE** · preservation + §4 + P0.5B housekeeping | [`docs/ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) |
| **Pomiary Elektryczne EM-P1R** | **2.59.30–2.59.44** | **COMPLETE** · DOCX SSOT Word · rejestr RAP · katalog · ZIP odbiorowy | [`SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) |
| **Lista Płac · Przydziały robót P1** | **2.59.49** (`94ad114`) | **CLOSED** · edycja `workEntries[]` z LP · bez nowego KV | [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |
| **ZI LiveCycle 2021** | — | **CLOSED** · tombstone `26f02c78…` | [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md) |
| **P3 Wycena · Baza cen · filtry** | 2.56.0–**2.56.10** (`7acbecf`) | **P3.0–P3.6 CLOSED** | [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) |
| **Notatki operacyjne** | **2.57.0–2.58.1** (`1f8e2bd`) | **COMPLETE** (P0→P2C+HF) · P3 Export OPEN | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) |
| **P2-H Tender Documents** | 2.55.0–**2.55.10** | **CLOSED** (H.7 OPEN) | [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| **UX.1 Tender Workspace** | 2.53.1–**2.53.4** (`3b5da74`) | **COMPLETE** | [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) |
| **P2-F Tender Qualification** | 2.51.19–**2.51.24** (`e015453`) | **COMPLETE** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Dashboard V3** | 2.50.74 (`5a54399`) | **COMPLETE** | [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md) |
| **Command Center Removal** | 2.51.0 (`39b1892`) | **COMPLETE** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 |
| **Przetargi 3.0** | 2.51.0–2.51.1 | **COMPLETE** | `TendersModule` · `TendersProvider` |

**Command Center removed in v2.51.0** — archiwum docs: [`archive/command-center/`](archive/command-center/).

### Architektura produktu (główne domeny)

```text
Dashboard
Roboty
Notatki operacyjne          ← COMPLETE v2.58.1 (admin · ACK · widget · audit · inspektor · backup)
Audit Hub                   ← MVP-1B CLOSED v2.62.41 · **WM Druk audit P1 Etap 1–4 RELEASED** (2.62.74–77) · **EPIC CLOSED**
Do Rozliczenia
Przetargi (+ Karta ofertowa P2-F, Wycena P3, Baza cen, Profil wykonawcy)
WM Druk (+ Pomiary Elektryczne, **Schematy**, Katalog RAP, ZIP odbiorowy)   ← EM-P1R v2.59.44 · Schematy v2.62.49
```

**Przetargi 3.0** — zakładki: Lista · Strategia · Mapa · Profil firmy · **Baza cen** · Ustawienia.  
Strategia (GO/HOLD/NO-GO, prognoza, health) wyłącznie w **Przetargi → Strategia**.  
Pulpit: operacje + `TendersShortcutPanel` (CTA → Strategia).

---

## 1. PROJECT

**W&G DOM** — React/Vite, monolit UI + panele w `src/app/`, sync LocalStorage ↔ Supabase KV.

| Element | Wartość |
|---------|---------|
| **Repo** | https://github.com/dawidthai125/wgdom · branch `main` |
| **Prod** | https://www.wgdom.fun · https://www.wgdom.online |
| **Backend** | Supabase Edge `make-server-0afb8820` |
| **Sync** | `src/lib/cloud-sync.ts` |
| **Wersja UI (SSOT)** | `CHANGELOG[0].version` w `src/app/changelog-data.ts` |

---

## 2. PRODUCTION BASELINE

### 2a. P0 CLOSED — Cloud Sync Incident / Supabase egress (2026-06-29)

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **RESOLVED** |
| **Objaw (historyczny)** | `Failed to fetch` przy `runCloudSync` / „Zapisz tydzień” |
| **RCA** | `exceed_egress_quota` — HTTP 402 na bramce Supabase (`bdpygdvfgbggermvqtys`) |
| **Rozwiązanie ops** | **Supabase Pro** włączony (billing upgrade) — bez zmian kodu aplikacji |
| **Weryfikacja prod** | **PASS** 2026-06-29 — `health` 200 · `batch-get`/`batch-set` 200 · brak 402 · „Zapisz tydzień” sync OK |
| **SSOT audytu** | [`SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md`](SESSION-HANDOFF-P0-CLOUD-SYNC-EGRESS-AUDIT-2026-06-29.md) |
| **Backlog architektury** | Delta-sync / focus throttle — **OPEN** · tylko na polecenie (P1 refactor, nie blokada prod) |

```text
Version (prod):             2.63.33       ← PLATFORM-SYNC-01A reconcile op notes · commit a4cd5c2 · PRODUCTION VERIFIED
Version (prod):             2.63.32       ← FEATURE Bundle B Owner View P2A · commit 119576c
Version (prod):             2.63.31       ← RC-B debug cleanup · commit 31a7d5e · RC-B program CLOSED
Version (prod):             2.63.30       ← RC-B-1 PWRB facade · commit 35f37b1
Version (prod):             2.63.27       ← TI-B4 smoke agregat · commit 6c94223 · PRODUCTION VERIFIED
Version (prod):             2.63.26       ← TEST-INFRA-001 MVP · commit 3d6dd90 · PRODUCTION VERIFIED
Version (prod):             2.63.25       ← Audit Hub freshness AH-REG-1 · commit d9ba13f
Version (prod):             2.63.24       ← Payroll Restore Banner RB · commit 727e6c4
Version (prod):             2.63.23       ← PAYROLL Etap 2 B6 Edge parity · commit d670892
Version (prod):             2.63.22       ← PAYROLL Etap 2 B5 closed week UI · commit 187afb8
Version (prod):             2.63.21       ← PAYROLL-CLOUD-RECOVERY Etap 2 B4 Bootstrap Merge SSOT · commit b3d5664
Version (prod):             2.63.20       ← PAYROLL Guard Phase B3.2 cleanup · commit 6afd9fd
Version (prod):             2.63.19       ← PAYROLL-CLOUD-RECOVERY Etap 2 B3.1 Guard Rollover · commit 91d02de
Version (prod):             2.63.18       ← PAYROLL-CLOUD-RECOVERY Etap 2 B3 Guard Phase 2 · commit 45eddaa
Payroll guard LP 2.63.16:   31a687a       CloudSyncMutationGuard Przydziały robót
Payroll roster P0 2.63.15:  1a65341       UNION directoryId · dedup Kadr
Version (prod):             2.63.12       ← NG-04 EPIC CLOSED · commit ab6637f
Version (prod):             2.63.8        ← P0 Tender Detail Tab SSOT · commit f482016
NG-03 UX seria:             2.63.7        ← NG-03.7 polish · commit 00d14d8
Version (prod):             2.62.98       ← NG-02.1C Production Bootstrap Fix · commit aeecdc0 · EPIC CLOSED
NG-02 Pipeline 2.62.97:     301de0e       lifecycle orchestrator SSOT · 02.1B
NG-02.1A Gate 2.62.96:      7536aa1       unified-attachment-gate · external-only heavy
NG-02 P0 2.62.95:           (seria)       useTenderPipelineRuntime · PipelineState
Version (prod):             2.62.92       ← SUPER ADMIN ACL · commit 5f212b4
Version (prod):             2.62.81       ← Lista Płac P0 refresh-team race fix · commit 6364937
Mobile Recovery 2.62.79:    4397eac       Jobs full-screen drill-in (MV-2) · EPIC CLOSED
Work Catalog P1:            2.62.80       src/lib/work-catalog P1.1–P1.12 · FREEZE v1.0
P1 Audit Hub WM Etap 1:     b4fde0c       v2.62.74 — kw-wm-druk-audit-log · adapter wm_druk
P1 Audit Hub WM Etap 2:     c31e1bd       v2.62.75 — hooki Pomiary/Katalog (rap_* · DOCX · ZIP)
P1 Audit Hub WM Etap 3:     36718cc       v2.62.76 — hooki Schematy (schematic_* · import · PDF)
P1 Audit Hub WM Etap 4:     21d4a1b       v2.62.77 — filtr wm_druk · chip · deep link labels · Help
Recovery Pack off-site:     WGDOM-RP-2.62.72-20260626 · G7 PASS · OFFSITE READY (2026-06-26)
Workflow Architecture SSOT: WORKFLOW-ARCHITECTURE-v2.63.md (finalized 2.62.72)
Kosztorys UX P0:            4056223       deriveKosztorysProcessPhase · KosztorysProcessStatusBar
Discovery variant B:        e2d899a       v2.62.63 — canRunDocumentDiscovery SSOT
WM Schematy hotfixy:        2.62.53–55    detached RAP crash · header spaces · columnRightInset
WM Pomiary UX Upgrade:      2.62.52       detached RAP · katalog edit/delete · Registry Guard
WM Schematy visual V2:      78f11cd       v2.62.51 — bus-layout-v2 · renderer v5
AUDIT-HUB-WM-001:           21d4a1b       v2.62.77 EPIC CLOSED — 7 źródeł · wm_druk UI visibility
Mobile Recovery EPIC:       4397eac       v2.62.79 CLOSED — prod smoke PASS (7/1 BLOCKED)
WM Schematy visual V1A/B:   c149116       v2.62.50 — backbone · RCD tee · renderer v4
WM Schematy MVP UI:         (2.62.49)     tab Schematy · kw-electrical-schematics
P4 WM upload toast:         5cef155       v2.62.48 — resolveWmPrintTemplateUploadToast
TP203 Address Parser M1:    08178cc       v2.62.47 — parseJobAddressParts m.3/lok./slash
P0 cloud-sync hotfix:       d799033       v2.62.42 — mergeDeliveryPackagePublications import
Audit Hub MVP-1B:           656a00c       v2.62.41 — RECOVERY + DATA events w security_log
TP200C sync merge:          0d5b916       v2.62.40 — pickBetterKosztorys SSOT
Audit Hub MVP-1:            2b8980c       v2.62.39 — kw-security-audit-log · 6. źródło
Audit Hub MVP-0B:           b2eed93       v2.62.36 — panel Super Admin · 5 źródeł
Audit Hub P0 hotfix:        a0d7093       feedAt/feedActor · JobsView photo_upload actor
Operational Notes unread:   00ccfa1       v2.62.35 — mergeOperationalNotePair fingerprint ACK
Work Entry Delete:          (2.62.34)     deletedWorkEntryTombstones
Deploy unblock (missing file): d79f7c1        tender-cost-content-detection.ts + test
Deploy unblock (mkdir dist): 8a2f6d8        vite.config.ts + generate-service-worker.mjs
TP202A analyze/dossier:     94d2e72        existingDossier merge · ourEstimatePln guard
TP201E-B PDF layout:        cba8f6f        skip WM footer rows · corruption aliases
TP190C-3B batch rebuild:    df2524f        feat(tenders): parser v3 batch rebuild
TP190C-2E extract parity:   c869be7        Browser↔Node pdf.js + extractError
TP190C-1 stale rebuild:     43ebc3f        existingKosztorysForRebuildPick
TP201C-B PDF M4 fidelity:   b0792c4        TP182 ~142 poz.
TP190B parser v3:           dd82593        CURRENT_PARSER_VERSION=3 anti-downgrade
Payroll sync fidelity:      66d9863        merge days/roster/workEntries (2.62.20–22)
PDF WM Recovery baseline:   1992340        v2.62.10 TP196–198C
TP190A re-analyze guard:    73093e4        pickBetterKosztorys w analyze/lazy dossier
TP200A parserVersion:       6b3ca8a        isDossierParserStale + lazy rescan
TP192C parallel bytes:      2.62.8         tender-document-bytes-prefetch
TP192B parallel PZ probe:   2.62.7         mapWithConcurrency probe meta
TP192A host skip:           2.62.6         shouldSkipReadmodelsProbe
TP194A PZ encoding:         2.62.5         repairUtf8Mojibake
TP193B stabilization:     2.62.4         loading guard + metadata safety
TP193A lazy dossier:        2.62.3         scanSummary.parsedAt fix
TP191 Open Nexus/PZ:        2.62.2         public guest session documents
P0/P1 Merge Quality P1:     50d7501        BZP refresh — mergeTenderPipeline quality merge
P0/P1 Merge Quality P0:     4574182        Cloud sync — mergePipelineItem quality merge
Git tag backup pre-TP200:   wgdom-backup-2026-06-19-v2.62.10
V4.2 Kosztorys PRO:         2.62.0         KPI · TOP 20 · filtry · ocena
P0 ZIP ATH Recovery:        653abe0        v2.61.4 large ZIP 128MB · ezamawiajacy · ATH recovery
V4 Kosztorys Source:        8b05afb        v2.61.3 catalogQuantities SSOT w zakładce Kosztorys
V4 Kosztorys formal filter: f95451f        v2.61.2 buildKosztorysV4Display — bez KRS/CEIDG
V4.1 tender workspace:      386b9ce        v2.61.1 Przetarg + Kosztorys + KPI Pro
P1 Document Insights:       ff20fec        P1A PDF UX + P1B Summary + P1C Executive + P1D Inference
P0 ATH preview hotfix:      fb9b8bd        PDF w 7Z · outer archive (osobny commit)
Release commits (P3):       ed2eed5        FIX-A functional updateItem + auto-pipeline patch
                            cca4f92        FIX-B UNKNOWN 10,9% → 0%, phrase rules 3.3
                            3466ad7        FIX-C cache + lazy dossier + lazy wycena
PAYROLL-ASSIGNMENTS-P1:    94ad114        v2.59.49 Lista Płac → Przydziały robót P1
EM-P1R-HF001 (prev):        26251ff        v2.59.44 EM templates {{ADDRESS}} fix
EM-P1R templates:           d6268b1        v2.59.43 SSOT Word rebuild
EM-P1.6C registry:         b79c949        v2.59.42 registry repair V2
POST ZI / WM Druk baseline:  2b03c9d        v2.59.25 wm-print housekeeping
WM Druk P0.5B:              2b03c9d        v2.59.25 housekeeping (zero behavior change)
WM Druk tombstone:          65051a3        v2.59.24 tombstone sync + legacy ZI KV cleanup
DOCX title layout:          26a553b        v2.59.24 szablony Oświadczenia (KV only)
ZI pdf.js worker:           5302498        v2.59.23 preservation graft worker fix
ZI Tauron 2026:             9434787        v2.59.22 generator + preservation gate
WM Druk P0.2A (prev):       1a8c892        v2.59.19 strip demo (superseded by ZI 2026)
WM Druk hotfix:             01211d6        v2.59.18 normalizeWmPrintTemplates runtime
WM Druk cleanup:            16ee8f8        v2.59.17 KV 99→15 templates
WM Druk seed guard:         0c6b804        v2.59.15 template pollution fix
Notatki HF:                 1f8e2bd        v2.58.1 backup completeness
Notatki P2A:                7c291d9        v2.58.0 Inspektor UI
Notatki P2C:                b56e628        v2.57.5 Audit UI
Notatki P2B:                60876a8        v2.57.4 Widget Pulpit
Notatki P0:                 2.57.0         CRUD · sync · job link
Poprzedni prod (P3):        7acbecf        v2.56.10 WM false exclude + P3.6
P3.6:                       2.56.9         Filtry klientów strategicznych (d3ecbe4)
P2-G.3C:              2.56.8         Benchmark klasyfikacji prod (66a619e)
P3 UX Stabilization:  2.56.7         Wycena cleanup + słowniki 3.1 (9759ef9)
P3.4A:                2.56.6         Historia materiałów
P3.3D:                2.56.5         Benchmark Impact
P3.3B:                2.56.4         Benchmark robocizny PRO
P3.3A:                2.56.3         Benchmark robocizny MVP
P3.5B / P3.5 / P3.2:  2.56.0–2.56.2  Override · pozycje · Baza cen
Feature commit (P2-H.5C/5D): 0683e05  PDF no-text CASE 3 + multi-ATH ranking
P2-H.5B:              2.55.9         Heurystyki KNR PDF
P2-H.6:               2.55.7         filtr folderów ZIP/7Z
P2-H.4:               2.55.6         UX copy archiwów 7Z
Feature commit (P2-H.3): d725c24      P2-H.3: obsługa archiwów 7Z w dossier
P2-G.2D:              329d883         v2.55.4 klasyfikacja C.O.
P2-G.2C:              5b257ce         v2.55.3 WM/ZZK wod-kan + gaz
UX.1B:                3b5da74         v2.53.4 workspace tabs
P2-F baseline:        e015453         v2.51.24 P2-F.5 Works Register
Feature commit (P1):  39b1892         CC removal + TendersProvider
Dashboard V3:         5a54399         v2.50.74
Git tag backup:       pre-next-feature-2.50.64 → c7bc58f
E2E (origin/main):    8906485         20.5Z.2B
```

| Status | Wartość |
|--------|---------|
| **RELEASE GO (2.59.52)** | **TAK** — P1 Document Insights Release |
| **RELEASED (prod)** | **2.59.52** — verify `version.json` |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R · **PRODUCTION STABLE** (DOCX SSOT Word) |
| **STABLE** | TAK (moduł wmprint · ZI 2026 · P0.5B) |
| **PRODUCTION VERIFIED** | TAK — [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) |
| **WM Druk P0 infra** | **CLOSED** (2.59.15–2.59.19) |
| **WM Druk P0.5 cleanup** | **CLOSED** (P0.5A docs · P0.5B housekeeping **2.59.25**) |
| **ZI Tauron 2026** | **PRODUCTION STABLE** (2.59.22–2.59.25) |
| **ZI LiveCycle 2021** | **CLOSED** — legacy slot `26f02c78…` **TOMBSTONE** |
| **Canonical ZI template (prod KV)** | **`2b22da48-46dc-42a0-8236-d42b5b5562dc`** · plik `ZI.pdf` |
| **WM Druk P0 pollution** | **CLOSED** |
| **WM Druk KV cleanup** | **CLOSED** (99→15→8 po legacy slot cleanup) |
| **WM Druk runtime hotfix** | **CLOSED** (2.59.18) |
| **ZI Investigation RCA** | **CLOSED** (P0.1F→P0.4B) — [`audit/ZI-FINAL-HANDOFF.md`](../audit/ZI-FINAL-HANDOFF.md) |
| **Notatki operacyjne** | **COMPLETE** (P0→P2C+HF) · **P3 Export OPEN** |
| **P3 (Wycena / Baza cen / filtry)** | **P3.0–P3.6 CLOSED** · benchmark materiałów rynku **HOLD** |
| **P1 WM pipeline** | **CLOSED** (v2.56.10 false exclude przebudowa) |
| **P2-H (Dokumenty / ZIP / 7Z / PDF)** | **H.1–H.6 + H.5A–H.5D CLOSED** · **H.7 OPEN** (magic bytes) |
| **UX.1 (Tender Workspace)** | **CLOSED** (UX.1A → UX.1B + ARCH-001) |
| **P2-F (Kwalifikacja ofertowa)** | **CLOSED** (F.0 → F.5) |
| **P2-G.2C/2D (Klasyfikacja WM/ZZK)** | **CLOSED** (v2.55.3–2.55.4) |
| **P1 (Dashboard V3 + CC removal + Przetargi 3.0)** | **CLOSED** |
| **Inspector 2.1** | **2.1.0 + 2.1.1 COMPLETE** · **2.1.2 CANCELLED** |

**Verify prod (bez pollingu API):**

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: { "version": "2.63.27", "commit": "6c94223" }
```

---

## 2c. NG-02 Tender Automation Pipeline EPIC — **CLOSED** (v2.62.95–2.62.98)

| Pole | Wartość |
|------|---------|
| **Version** | **2.62.98** |
| **Commit** | **`aeecdc0`** |
| **Status** | **Production** · **EPIC CLOSED** |
| **Zakres** | Auto pipeline po otwarciu przetargu V4: discovery → external → heavy → pricing → trust |
| **Verify deploy** | **PASS** |
| **Automated smoke** | **177 PASS / 0 FAIL** |
| **Outstanding production bugs** | **NONE** |

**SSOT:** [`SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](SESSION-HANDOFF-NG-02-EPIC-CLOSE.md) · [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md) · ARCHITECTURE § 12.1.23–26

**Releases:** 2.62.95 P0 runtime · 2.62.96 unified gate · 2.62.97 orchestrator lifecycle · 2.62.98 bootstrap prod fix

**Nie rozpoczynaj** refaktoru pipeline bez nowego epic + AUDIT.

---

## 2b. Mobile Recovery EPIC — **CLOSED** (v2.62.78–2.62.79)

| Pole | Wartość |
|------|---------|
| **Version** | **2.62.79** |
| **Commit** | **`4397eac`** |
| **Status** | **Production** · **EPIC CLOSED** |
| **Mobile Recovery** | **Completed** (2.62.78 UX pack + 2.62.79 Jobs drill-in MV-2) |
| **Verify deploy** | **PASS** |
| **Production smoke** | **PASS** (7 PASS / 1 BLOCKED) |
| **Outstanding production bugs** | **NONE** |

**Known blocked test:**

| Test | Status | Reason |
|------|--------|--------|
| **SMOKE-03** Tender Details | **BLOCKED** | No production tender available during automated validation |

**Follow-up:** Manual verification when next production tender is available.

**Releases w epic:**

| Wersja | Commit | Zakres |
|--------|--------|--------|
| **2.62.78** | `78582db` | Mobile UX pack — scroll · drill-in (Notatki/Schematy/Przetarg) · touch 44px · keyboard/modals |
| **2.62.79** | `4397eac` | Roboty — pełnoekranowy drill-in · ukrycie KPI/listy · przycisk **Lista** |

**Future backlog (enhancements — nie production defects):**

- Inspector mobile improvements
- WM Measurements UX improvements
- WM Catalog drill-in improvements
- Browser history integration for Jobs drill-in (optional — obecnie **Lista** + Capacitor Android back)

---

## 2a. Recovery Pack v2.62.72 — **COMPLETED** · OFFSITE READY

| Pole | Wartość |
|------|---------|
| **Status** | **COMPLETED** · **PRODUCTION READY** · **OFFSITE READY** |
| **recoveryPackId** | `WGDOM-RP-2.62.72-20260626` |
| **packId** | `WGDOM-RECOVERY-PACK-2.62.72` |
| **Wersja** | **2.62.72** |
| **Baseline commit** | **`6cd8ebe`** (`fix(workflow): complete grouped docs migration in AttachmentsPanel`) |
| **Utworzono** | **2026-06-26** |
| **G7 Validation** | **PASS** — `git_archive_restore` · `npm install` · `npm run build` · workflow smoke ×2 |
| **CHECKSUMS** | 6 hashy (`archives/*.zip`) — zsynchronizowane |
| **Pack root (poza repo)** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` |
| **Git tag** | `wgdom-recovery-pack-2.62.72` @ `6cd8ebe` |
| **Orchestrator** | `scripts/run-recovery-pack-2.62.72.mjs` (bez zmian architektury) |

**Off-site minimum:** `archives/manifest-only.zip` + `archives/docs.zip` · pełny pack — szyfrowany B2/Drive.

**Raport walidacji:** `validation/recovery-validation-report.json` w pack root · `verdict: PASS` · `expectedCommit: 6cd8ebe`.

**Ostrzeżenia nieblokujące (informacyjne):** kv-keys-diff (1 klucz SSOT poza dump) · storage parity gaps (historyczne progress photos).

**Nie zmieniaj bez polecenia:** struktura faz orchestratora · `backup-lib.mjs` recovery API · nazewnictwo archiwów pack.

---

## 2b. Następny epic — TP200B

| ID | Cel | Status |
|----|-----|--------|
| **TP200B** | Kosztorys fidelity — `pickBetterKosztorys` w parse loop; rozszerzenie `rows` | **PLANNED** |

**SSOT TP190:** [`SESSION-HANDOFF-TP190-PARSER-V3.md`](SESSION-HANDOFF-TP190-PARSER-V3.md)  
**SSOT TP200:** [`SESSION-HANDOFF-TP200-PLANNED.md`](SESSION-HANDOFF-TP200-PLANNED.md)

**Command Center:** **nie wraca** — usunięty v2.51.0.

---

## 2a. P1-B — Przetargi 3.0 / Command Center removal (**CLOSED**)

**Command Center removed in v2.51.0** — brak runtime `CommandCenterProvider`, `TenderCenterProView`, `OwnerDashboard`.

| ETAP | Wersja | Skrót |
|------|--------|-------|
| 1 | 2.50.75 | Usunięcie legacy UI CC (Morning Briefing, AI Insights, …) |
| 2 | 2.50.76 | `TendersModule` — 5 zakładek |
| 3 | 2.51.0 | `TendersProvider` + `TendersShortcutPanel`; hard delete CC shell |
| 4 | 2.51.1 | Rename: `src/app/tenders/strategy/`, lib `tenders-strategy-*` |

**Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 · **Archiwum CC (SUPERSEDED):** [`archive/command-center/`](archive/command-center/)

---

## 3. KEY RELEASES (po [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md))

Chronologia releasów aplikacyjnych na `main` po baseline **2.50.65** (20.5Z.5C):

| Wersja | Sprint | Commit | Skrót |
|--------|--------|--------|-------|
| **2.50.66** | 20.7C.2 Dashboard V2 Complete | `3e46ae8` | Hero DZIŚ SSOT, dedupe Uwaga dziś, E2E hero |
| **2.50.67** | 20.7D.1 Hero Compression | `f94b530` | KPI first, Hero accordion compact |
| **2.50.68** | 20.7E Dashboard IA Cleanup | `65f3a8d` | Najważniejsze dziś, Uwaga accordion, Hero standalone, Przetargi — skrót |
| *(hotfix)* | Payroll extraCostStatus | `add9338` | `extraCostStatus is not defined` w WeekEmployeeDetail |
| *(docs)* | Workflow Release/Deploy | `79174b3` | SSOT: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) |
| **2.50.69** | 2.1.0 Inspector Communication Templates | `5391d03` | Szablony A–D, modal, `isInspector`, Edge `inspector_template` |
| **2.50.70** | 2.1.1 Default Inspector Recipient | `ee2cd72` | `isDefaultInspector`, domyślny odbiorca, modal UX |
| *(housekeeping)* | `.gitignore` P0+P1 | `77e1052` | untracked 49 → 19 (diag/smoke artifacts) |
| **2.50.72–73** | Hero filtry operacyjne | `4426c72` / `ad859e6` | Prognoza tylko w CC; Hero bez CC |
| **2.50.74** | **Dashboard V3 (P1-A)** | `5a54399` | Usunięto Hero; Braki + Pilne uwagi; liczniki policzalne |
| **2.50.75–76** | P1-B ETAP 1–2 | `098f651` / `58b4cd7` | CC legacy UI out; TendersModule 5 zakładek |
| **2.51.0** | P1-B ETAP 3 | `39b1892` | CC runtime removal; TendersProvider; TendersShortcutPanel |
| **2.51.1** | P1-B ETAP 4 | `45ad21e` | Rename `tenders/strategy/`, `tenders-strategy-*` lib |
| **2.51.19** | P2-F.0 | `a2d0f8a` | Formal Requirements Extraction |
| **2.51.20** | P2-F.1 | `28c5602` | Warunki udziału vs `kw-company-profile` |
| **2.51.21** | P2-F.2 | `73683f8` | Experience & References Qualification |
| **2.51.22** | P2-F.3 | `7dd7563` | Company Experience Auto-Build |
| **2.51.23** | P2-F.4 | `77b352a` | Referencje upload + ATH Quick Access |
| **2.51.24** | **P2-F.5** | **`e015453`** | Works Register Generator PDF/DOCX |
| **2.53.1** | UX.1A | `8615d0b` | Tender Workspace Cleanup MIN |
| **2.53.2** | P0 hotfix | `7392c82` | Cykl ESM app-core (biały ekran) |
| **2.53.3** | ARCH-001 | `53451ed` | Circular dependency prevention |
| **2.53.4** | **UX.1B** | **`3b5da74`** | **5 workspace tabs · lazy render** |
| **2.55.0** | P2-H.1 | — | Marketplanet ezamawiajacy.pl |
| **2.55.1** | P2-H.1 hotfix | — | sourcePageUrl document-bytes |
| **2.55.2** | P2-H.2 | — | Double ZIP unpack fix |
| **2.55.3** | P2-G.2C | `5b257ce` | Klasyfikacja WM/ZZK wod-kan + gaz |
| **2.55.4** | P2-G.2D | `329d883` | Klasyfikacja C.O. |
| **2.55.5** | **P2-H.3** | **`d725c24`** | **7Z archive support (7z-wasm)** |
| **2.55.6** | P2-H.4 | — | UX copy archiwów 7Z |
| **2.55.7** | P2-H.6 | — | Filtr folderów ZIP/7Z inner |
| **2.55.8** | P2-H.5A | — | PDF przedmiar MVP discovery |
| **2.56.3** | **P3.3A** | **(release)** | **Benchmark robocizny MVP (read-only)** |
| **2.56.8** | **P2-G.3C** | **`66a619e`** | **Klasyfikacja prod UNKNOWN 16→0** |
| **2.56.9** | **P3.6** | **`d3ecbe4`** | **Filtry klientów strategicznych** |
| **2.56.10** | **P1 WM** | **`7acbecf`** | **Fix false exclude przebudowa budynku** |
| **2.57.0** | **Notatki operacyjne P0** | **(pre-commit)** | **Moduł · CRUD · komentarze · archiwum · audit · sync · job link** |
| **2.59.15** | WM Druk seed guard | `0c6b804` | Anti-pollution — seed tylko local+cloud puste |
| **2.59.17** | WM Druk KV cleanup | `16ee8f8` | Templates 99→15, tombstone |
| **2.59.18** | WM Druk runtime hotfix | `01211d6` | `normalizeWmPrintTemplates` w cloud-sync |
| **2.59.19** | **WM Druk P0.2A ZI-PDF-001** | **`1a8c892`** | **Strip demo ULICA/BUD/LOK + clean template storage/KV** |
| **2.59.22** | ZI Tauron 2026 | `9434787` | Generator + preservation gate · mapping §4 |
| **2.59.23** | ZI pdf.js worker hotfix | `5302498` | Preservation graft worker |
| **2.59.24** | WM Druk tombstone + DOCX layout | `65051a3` / `26a553b` | Legacy ZI slot cleanup · Oświadczenia title fix (KV) |
| **2.59.25** | **P0.5B housekeeping** | **`2b03c9d`** | `wm-print-pdf-fonts` · `wm-print-pdf-static` — zero behavior change |
| **2.56.2** | **P3.5B** | **f74fe1b** | **Override cen per przetarg** |
| **2.56.1** | **P3.5** | **16b792e** | **Ceny per pozycja kosztorysu (read-only)** |
| **2.55.10** | **P2-H.5C/5D** | **0683e05** | **PDF noTextLayer CASE 3 + multi-ATH ranking + discovery sync** |
| **2.55.9** | P2-H.5B | — | Heurystyki KNR — pozycje z PDF bez OCR |

**Handoff WM Druk:** [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md)  
**Handoff P3+BZP:** [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md)  
**Handoff P2-H:** [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md)  
**Handoff UX.1:** [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md)  
**Handoff P2-F:** [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**Handoff Pulpit (SSOT):** [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md)  
**Historyczny Dashboard V2:** [`SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](SESSION-HANDOFF-20.7-DASHBOARD-V2.md) — **nie przywracać** rankera Hero  
**Architektura inspektor email:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 9.2

---

## 3a. P2-F — Tender Qualification Pipeline (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Zakres** | P2-F.0–F.5 · SWZ → profil wykonawcy → dopasowanie → wykaz/referencje/ATH |
| **Wersja końcowa** | **2.51.24** · commit **`e015453`** |
| **Klucz chmury** | `kw-company-profile` — `CompanyQualificationProfile` schema **v4** |
| **Handoff** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.5 |
| **Test regresji** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (161 PASS) |

**Kluczowe moduły:** `tender-formal-requirements.ts`, `tender-participation-check.ts`, `tender-experience-check.ts`, `company-experience-discovery.ts`, `tender-works-register.ts`, `tender-ath-quick-access.ts`.

**UI:** `TenderBidPrepPanel.tsx`, `TenderParticipationPanel.tsx`, `TenderWorksRegisterPanel.tsx`, `CompanyQualificationProfilePanel.tsx`.

**Nie zmieniaj bez polecenia:** merge `kw-company-profile`, semantyka `referenceStatus`, parsery SWZ, reuse ATH viewer.

---

## 3b. UX.1 — Tender Workspace (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Zakres** | UX.1A reorganizacja sekcji → UX.1B 5 workspace tabs · ARCH-001 · P0 hotfix cykli ESM |
| **Wersja końcowa** | **2.53.4** · commit **`3b5da74`** |
| **Handoff** | [`SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md`](SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § UX.1A/1B · § 11.6 ARCH-001 |
| **Test regresji** | `npx vite-node scripts/test-tender-workspace-ux.mjs` (48 PASS) |

**Kluczowe pliki:** `tender-workspace-ux.ts`, `TenderDetailPanel.tsx`, `TenderWorkspaceTabBar.tsx`, `TenderDocumentsWorkspace.tsx`, `TenderQualificationWorkspace.tsx`, `TenderOverviewShortcuts.tsx`.

**5 workspace:** Przegląd · Dokumenty · Kwalifikacja · Wycena · Oferta — **max 5, lazy render, Anti-CC**.

**Nie zmieniaj bez polecenia:** struktura 5 tabs, P0 UX RULE (Przegląd ≤ 1 ekran), dedup UX.1A (wycena/kalibracja/ATH), lazy mount ciężkich paneli.

---

## 3c. P2-H — Tender Documents & Archives (**H.1–H.5B CLOSED**, H.7 OPEN)

| Pole | Wartość |
|------|---------|
| **Wersja końcowa** | **2.55.9** |
| **Handoff** | [`SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md`](SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md) |
| **Kluczowe pliki** | `pdf-przedmiar-heuristic.ts`, `tender-cost-discovery.ts`, `wgdom-7z-archive.ts`, `tenders-bzp-doc-parse.ts` |

**Stream funkcjonalnie zamknięty.** Pozostały backlog techniczny: **P2-H.7** (Edge magic bytes 7z).

**Audyt referencyjny:** Kąty Wrocławskie — 7Z OK, `*_PR.pdf` wykrywany; P2-H.5B ekstrahuje pozycje KNR z natywnego tekstu PDF.

| Pole | Wartość |
|------|---------|
| **Zakres** | Marketplanet · ZIP · 7Z · PDF przedmiar (discovery + heurystyki KNR) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.7 |
| **Test 7Z** | `npx vite-node scripts/test-tender-7z-archive.mjs` (34 PASS) |
| **Test dossier** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (195 PASS) |
| **Test PDF heuristic** | `npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs` (26 PASS) |

**Kluczowe moduły:** `pdf-przedmiar-heuristic.ts`, `wgdom-7z-archive.ts`, `tender-document-resolver.ts`, `tender-cost-discovery.ts`, `tenders-bzp-doc-parse.ts`.

**Następny krok (techniczny):** **P2-H.7** — Edge magic bytes dla `.7z`.

---

## 3d. P3 — Wycena · Baza cen · Filtry (**P3.0–P3.6 CLOSED**)

| Pole | Wartość |
|------|---------|
| **Wersja końcowa** | **2.56.10** (P1 WM) · P3.6 **2.56.9** |
| **Handoff** | [`SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md`](SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.1 · § 12.1.3 · sekcja P3 w § 12.1.5+ |

**Zamknięte sprinty:** P3.1 Hero KPI Wycena · P3.2.0 Baza cen · P3.5 pozycje · P3.5B override · P3.3A–3.3D benchmark rbh · P3.4A historia materiałów · P2-G.3C klasyfikacja prod · **P3.6 filtry strategiczne**.

**Kluczowe moduły:** `wgdom-cost-catalog.ts`, `tender-bid-proposal.ts`, `tender-catalog-line-pricing.ts`, `tender-price-overrides.ts`, `labor-benchmark*.ts`, `material-history.ts`, `tenders-strategic-client-filters.ts`.

**Klucze chmury:** `kw-wgdom-cost-catalog`, `kw-wgdom-cost-catalog-history`, `kw-tender-price-overrides`, `kw-tenders-pipeline`.

**Testy:** `test-tenders-strategic-client-filters.mjs` (52) · `audit-p2g3c-classification-prod.mjs`.

**HOLD:** benchmark materiałów rynku (KB.pl / Leroy Merlin — audyt NO GO live).

**Nie zmieniaj bez polecenia:** benchmarki read-only nie wpływają na kalkulator; P3.6 filtry = UX-only.

---

## 3e. P1 — BZP Pipeline WM false exclude (**CLOSED** v2.56.10)

| Pole | Wartość |
|------|---------|
| **Commit** | **`7acbecf`** |
| **Problem** | `"przebudowa budynku"` mylone z exclude `"budowa budynku"` → score=0 |
| **Fix** | `matchesTenderExcludeKeyword()` w `tenders-bzp-keywords.ts` + `matchesBzpExcludeKeyword()` w Edge |
| **Deploy** | **Vercel + Supabase** — oba wymagane przy zmianie exclude |
| **Test** | `test-tender-exclude-renovation-budowa.mjs` (18 PASS) |
| **Audyt** | `audit-wm-exclude-120d.mjs` — 1 odzyskany aktywny WM (Sępa Szarzyńskiego) |

**Nie zmieniaj bez polecenia:** granica słowa `prze`/`roz`/`nad` + `budowa`; mirror klient↔Edge.

---

## 3f. Notatki operacyjne — P0→P2C+HF (**COMPLETE** v2.58.1)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.58.1** · commit **`1f8e2bd`** |
| **Status streamu** | **COMPLETE** — P0 · P1 · P2A · P2B · P2C · HF |
| **Handoff dedykowany** | [`SESSION-HANDOFF-OPERATIONAL-NOTES.md`](SESSION-HANDOFF-OPERATIONAL-NOTES.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) — sekcja Notatki operacyjne · § 15.1 (`operationalnotes`) |

### Timeline faz

| Faza | Wersja | Zakres |
|------|--------|--------|
| **P0** | 2.57.0 | Moduł admin, CRUD, komentarze, archiwum, audit log, sync 4× KV, panel Roboty |
| **P1** | 2.57.2 | ACK, badge menu, banner, read status, `contentRev` |
| **P2B** | 2.57.4 | Widget KPI na Pulpicie |
| **P2C** | 2.57.5 | Audit UI (Sheet, Super Admin) |
| **P2A** | 2.58.0 | Inspektor UI — overlay, header badge, sync w `InspectorPanel` |
| **HF** | 2.58.1 | Backup completeness — export/import/email/snapshot 4 kluczy |

### Klucze chmury (4) — SSOT backup `OPERATIONAL_NOTES_BACKUP_KEYS`

| Klucz | Zawartość |
|-------|-----------|
| `kw-operational-notes` | Tablica `OperationalNote[]` |
| `kw-operational-notes-audit-log` | Audit entries (cap 3000) |
| `kw-operational-notes-read-state` | Read receipts / ACK |
| `kw-operational-notes-deleted-ids` | Tombstone logical delete |

**Osobna domena:** ≠ `job.notes` (uwagi wewnętrzne roboty) ≠ `job.jobNotes[]` (WM / billing).

### Kluczowe pliki

`operational-notes.ts` · `operational-notes-read-state.ts` · `operational-notes-audit.ts` · `operational-notes-audit-filters.ts` · `operational-notes-dashboard.ts` · `OperationalNotesView.tsx` · `OperationalNotesAuditPanel.tsx` · `DashboardOperationalNotesWidget.tsx` · `JobOperationalNotesPanel.tsx` · `InspectorPanel.tsx` · `cloud-sync.ts` · `admin-nav.ts`

### Testy regresji

```bash
npx vite-node scripts/test-operational-notes-p0.mjs
npx vite-node scripts/test-operational-notes-p1.mjs
npx vite-node scripts/test-operational-notes-p2b.mjs
npx vite-node scripts/test-operational-notes-p2c.mjs
npx vite-node scripts/test-operational-notes-p2a.mjs
npx vite-node scripts/test-operational-notes-hotfix-2.58.1.mjs
```

### Następne etapy (OPEN — tylko na polecenie)

| Etap | Zakres |
|------|--------|
| **P3 Export** | PDF + DOCX + Email Export (ręczny; **bez** auto-notify) |
| **P2A.1** | Panel notatek w detalu roboty inspektora (opcjonalny) |

**Nie zmieniaj bez polecenia:** model KV, merge sync, granica od `job.notes` / `jobNotes`, ACL inspektora (create/comment/ACK only), brak zapisu do `kw-jobs`.

---

## 3g. Odbiory WM Druk — P0 + ZI Tauron 2026 + P0.5 (**COMPLETE** v2.59.25)

| Pole | Wartość |
|------|---------|
| **Zakres P0** | pollution · KV cleanup · runtime hotfix · ZI-PDF-001 (P0.2A demo strip) |
| **Zakres ZI 2026** | Tauron FormMaker · mapping §4 · preservation gate · prod validation |
| **Zakres P0.5** | docs cleanup (P0.5A) · kod housekeeping (P0.5B) · DOCX title layout (szablony KV) |
| **Wersja końcowa** | **2.59.25** · commit **`2b03c9d`** |
| **Handoff** | [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md) · [`SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md`](SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md) · [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.8 |
| **Prod validation** | [`audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](../audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md) |

**Stan końcowy:**

```text
Template Pollution      CLOSED
KV Cleanup              CLOSED (8 templates · 1× ZI aktywny)
Runtime Hotfix          CLOSED
ZI LiveCycle 2021       CLOSED (tombstone 26f02c78…)
ZI Tauron 2026          PRODUCTION STABLE
P0.5 cleanup            CLOSED (docs + housekeeping)
Stream WM DRUK          COMPLETE
```

**Moduły prod (po P0.5B):** `wm-print-pdf-fonts.ts` · `wm-print-pdf-static.ts` · `generate-pdf-zi-tauron2026.ts` · `generate-pdf.ts` (legacy — nie ruszać)

**Canonical ZI (prod KV):** `2b22da48-46dc-42a0-8236-d42b5b5562dc` · `ZI.pdf`  
**Mapping §4:** 99→JOB_STREET · 111→JOB_BUILDING · 112→JOB_APARTMENT

**Test regresji:**

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
npx vite-node scripts/test-wm-print-p0-seed-guard.mjs
npx vite-node scripts/test-wm-print-template-cleanup.mjs
```

**Nie zmieniaj bez polecenia:** seed guard, merge po UUID, tombstone sync, dedupe ZIP, canonical ZI **`2b22da48…`**, guard `detectLegacyLiveCycleZiForm`.

---

## 4. DASHBOARD V3 — Pulpit operacyjny (**COMPLETE**, P1-A)

| Element | Wartość |
|---------|---------|
| **Wersja** | 2.50.74 · commit `5a54399` |
| **Cel** | „Co muszę dzisiaj zrobić?” — bez strategii CC na Pulpicie |
| **KPI** | Wypłata · Ekipa dziś · Aktywne WM · **Braki dokumentów** · **Pilne uwagi** |
| **Sekcje** | Roboty → Braki dokumentów · Pilne uwagi na dziś (7 kategorii) · Przetargi — skrót |
| **Liczniki SSOT** | `src/lib/dashboard-urgent-today.ts` · `buildUrgentTodayCategories()` |
| **Usunięte** | Hero stack, `attentionCount`, KPI „Do ogarnięcia”, `RecoverableChargesDashboardCard` |

**Kolejność Pulpicu (V3):** KPI → Braki dokumentów → Pilne uwagi → Przetargi — skrót → dolna siatka.

**Nie zmieniaj bez polecenia:** model liczników V3 (suma kategorii = badge), pełne listy bez `slice`, model scrollu 2.50.20.

**Seria 20.7 (V2) — historyczna:** Hero DZIŚ, dedupe Uwaga — **zamknięta** przez V3.

---

## 5. INSPECTOR COMMUNICATION TEMPLATES — seria 2.1 (**CLOSED**)

### 2.1.0 — MVP (v2.50.69 · `5391d03`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **UI** | `JobsView` → „Kontakt z inspektorem” → `JobInspectorContactModal.tsx` |
| **Szablony** | A–D w `inspector-message-templates.ts` (auto-sugestia, ready/missing) |
| **Odbiorca** | `EmailContact.isInspector` w `kw-contacts` |
| **Wysyłka** | `POST /send-job-email` · `mode: inspector_template` (Edge) |
| **Historia** | `activityLog` · `email_sent` + nazwa szablonu |
| **Smoke** | `scripts/smoke-test-inspector-templates-2.1.mjs` |

### 2.1.1 — Default Inspector Recipient (v2.50.70 · `ee2cd72`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **Model** | `EmailContact.isDefaultInspector` (max jeden, wymaga `isInspector`) |
| **Helpery** | `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact` |
| **Kontakty UI** | Checkbox „Domyślny odbiorca inspektora”, badge Inspektor + Domyślny |
| **Modal UX** | Auto-odbiorca (Szymon lub oznaczony), „Zmień odbiorcę”, hint wysyłki testowej |
| **Edge / Job / sync** | **Bez zmian** |

**Operacyjnie na prod:** oznacz Szymona jako „Domyślny odbiorca inspektora”; usuń duplikaty testowe „Walidacja 2.1” z Kontaktów (dane testowe z walidacji 2.1.0 — nie bug kodu).

### 2.1.2 — Job Correspondence Recipients · **CANCELLED**

| | |
|---|---|
| **Status** | **ANULOWANY — nie implementować** |
| **Powód** | Problem wynikał z danych testowych („Walidacja 2.1”), konfiguracji Kontaktów i chwilowego braku wpisu — **nie z architektury 2.1.0/2.1.1** |
| **Decyzja** | Zostaje: „Kontakt z inspektorem”, filtr `isInspector`, „Domyślny odbiorca inspektora” |

**Brak dalszych prac w obszarze Inspector Communication Templates do czasu nowego AUDIT.**

**Backlog zamknięty (bez polecenia):** szablon E (podziękowanie), CRM/historia konwersacji, 2.1.2 pełna lista kontaktów.

---

## 6. WORKFLOW WGDOM

### Proces pracy

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

**Brak implementacji bez audytu.** Plan odrzucony (np. 2.1.2) = **zero kodu**.

### Release / deploy — SSOT

**[`docs/WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)**

| Wariant | Kroki |
|---------|-------|
| **A** Minor | build → commit → push → verify FAST |
| **B** Standard | build → smoke → commit → push → verify FAST |
| **C** Major | build → smoke → E2E → commit → push → verify FAST |

**Frontend:** tylko `git push origin main` → Vercel Git Integration.

**VERIFY DEPLOY FAST:** po push **jedno** `curl version.json` → PASS lub **DEPLOY PROPAGATING** → koniec raportu.

**Zakazane:** `vercel deploy`, `vercel --prod`, retry/sleep/polling `version.json`, polling GitHub/Vercel Deployments API.

**Werdykty:** **RELEASE GO** (build+smoke+push) ≠ **PRODUCTION VERIFIED** (`version.json` = oczekiwana wersja w jednym curl).

**Backend Edge:** tylko gdy zmiana `supabase/functions/**` → GitHub Action `deploy-supabase.yml`.  
2.1.0 wymagał deploy Edge dla `inspector_template`; **2.1.1 nie wymagał** deploy Supabase.

---

## 7. ARCHITEKTURA (skrót — bez zmian od 20.5Z)

Pełny opis: [`ARCHITECTURE.md`](ARCHITECTURE.md) · fundament platformy: [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) § 5–9.

| Temat | SSOT / pliki |
|-------|----------------|
| Pliki roboty (3 warstwy) | `jobFiles[]` · `workerReports[]` · `jobAttachments[]` · [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |
| Files Hub | `files-hub-index.ts` · [`SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](SESSION-HANDOFF-20.5A.12-FILES-HUB.md) |
| Sync / merge | `cloud-sync.ts` § 11 · **nie zmieniaj merge bez audytu** |
| Version Awareness | `app-version-check.ts` · E2E `version-awareness.spec.ts` |
| PWA | `sw.template.js` · `generate-service-worker.mjs` |
| Kontakt inspektora § 9.2 | `inspector-message-templates.ts`, `email-contacts.ts`, `JobInspectorContactModal.tsx` |
| **Pulpit V3** | `DashboardView.tsx`, `DashboardPilneUwagiSection.tsx`, `dashboard-urgent-today.ts` |
| Przetargi (strategia + lista + wycena) | `TendersModule` · `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| **P2-F Kwalifikacja ofertowa** | `kw-company-profile` · § 12.1.5 · [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Notatki operacyjne P0** | `kw-operational-notes` (+ audit, read-state, tombstone) · § 10.1 · `OperationalNotesView.tsx` |

---

## 8. REPO HOUSEKEEPING (2026-06-11)

**Commit:** `77e1052` — `chore(git): ignore local audit and smoke artifacts`

| Przed | Po |
|-------|-----|
| 49 untracked (diag, smoke-output, UX audit PNG) | 19 untracked (gł. `smoke-prod-bundle-*` historyczne — celowo poza `.gitignore`) |

**Nie commitować:** backupy z hashami adminów, `restore-lista-plac-*.json`, artefakty lokalne (patrz `.gitignore`, ARCHITECTURE § 19).

---

## 9. E2E I TESTY

| Gate | Komenda |
|------|---------|
| Happy path | `npm run build` → preview `:4173` → `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy` |
| Version | `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version` |
| Inspector 2.1 | `npx vite-node scripts/smoke-test-inspector-templates-2.1.mjs` |
| **P2-H regresja 7Z** | `npx vite-node scripts/test-tender-7z-archive.mjs` |
| **P3.6 filtry** | `npx vite-node scripts/test-tenders-strategic-client-filters.mjs` (52) |
| **P1 WM exclude** | `npx vite-node scripts/test-tender-exclude-renovation-budowa.mjs` (18) |
| **Notatki operacyjne P0** | `npx vite-node scripts/test-operational-notes-p0.mjs` (24) |
| **P2-G.3C klasyfikacja** | `npx vite-node scripts/audit-p2g3c-classification-prod.mjs` |
| **P2-F regresja** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` |
| **Dashboard V3** | `npx vite-node scripts/test-dashboard-v3-counts.mjs` |
| Mobile | `npm run test:mobile` |

**Ostatni znany CI E2E:** `#27260457990` (20.5Z.2B) — regresja po 20.7/2.1 lokalnie: build + smoke 2.1 PASS.

---

## 10. KNOWN ISSUES / RYZYKA (aktualne)

| Ryzyko | Uwagi |
|--------|-------|
| Stale LS nadpisuje KV | [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) · Payroll Guard, admin passwords merge |
| Duplikaty „Walidacja 2.1” na prod | Dane testowe z walidacji biznesowej 2.1.0 — cleanup w Kontaktach |
| Brak domyślnego inspektora przy wielu `isInspector` | Oznacz Szymona „Domyślny odbiorca” w Kontaktach |
| 19 untracked `smoke-prod-bundle-*` | Lokalne historyczne smokes — opcjonalnie commit per release lub delete |

---

## 11. BACKLOG PRODUKTOWY

| Priorytet | Temat | Status |
|-----------|-------|--------|
| **Mobile Recovery** | Mobile UX pack + Jobs drill-in (2.62.78–79) | **CLOSED** (2026-06-27) · smoke 7 PASS / 1 BLOCKED |
| **Recovery Pack** | Off-site backup v2.62.72 (KV + storage + repo + docs) | **COMPLETED** (2026-06-26) · OFFSITE READY |
| **P1 Audit Hub WM** | WM Pomiary/Schematy → Audit Hub (`AUDIT-HUB-WM-001`) | **CLOSED** (v2.62.74–77) · epic report: `audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md` |
| **P1** | Dashboard V3 + CC removal + Przetargi 3.0 | **CLOSED** (v2.51.x) |
| **P2-F** | Kwalifikacja ofertowa (F.0–F.5) | **CLOSED** (v2.51.19–2.51.24) |
| **UX.1** | Tender Workspace (UX.1A/1B) | **CLOSED** (v2.53.1–2.53.4) |
| **P2-H** | Dokumenty / ZIP / 7Z / PDF przedmiar | **STREAM CLOSED** (v2.55.0–2.55.10) · H.7 OPEN |
| **P3** | Wycena · Baza cen · benchmarki · filtry | **P3.0–P3.6 CLOSED** · materiały rynkowe **HOLD** |
| **Notatki operacyjne** | P0→P2C+HF admin/inspektor/backup | **COMPLETE** (v2.58.1) · **P3 Export OPEN** |
| **WM Druk** | Odbiory WM Druk — pollution + ZI 2026 + P0.5 | **COMPLETE** (v2.59.25) |
| **P2** | Audit Center / Security Log (Super Admin) | **OTWARTY** |
| P2-G.3D/E | Benchmark jakości · RMS · AI validation | **OTWARTY** → slot **Wycena** |
| P2-F.6 | Kompletność oferty (checklist) | **OTWARTY** → slot **Oferta** |
| P2-F.6+ | investorName w profilu · auto-pakiet referencji | opcjonalnie, na polecenie |
| P3.7+ | Dalsze usprawnienia listy Przetargów | **OTWARTY** (bez polecenia) |
| **Mobile (future)** | Inspector mobile UX · WM Pomiary UX · WM Katalog drill-in · Jobs browser history (optional) | **BACKLOG** — enhancements, nie production bugs |
| **Mobile Certification** | Field validation Pass 1–4 (ios-safari → android-pwa) | **OTWARTY** — osobny program od Mobile Recovery |

---

## 12. CO NIE ZMIENIAĆ BEZ POLECENIA

- Sync/merge `kw-contacts`, `kw-jobs`, payroll guard
- Model scrollu desktop 2.50.20, mobile shell
- **Przywracanie Hero / `attentionCount` / KPI „Do ogarnięcia”** — zamknięte przez V3
- Podłączanie CC (forecast, health) do `DashboardView`
- `inspector_template` Edge semantics (2.1.0)
- Seria 20.5Z zamknięta — patrz FINAL handoff
- **2.1.2** — plan odrzucony, nie wracać do pełnej listy kontaktów w modalu
- **P2-F merge/parsery** — `kw-company-profile`, filtry śmieci PDF SWZ, ATH viewer reuse
- **UX.1 workspace model** — max 5 tabs, lazy render, Anti-CC; nie doklejać paneli na scroll
- **ARCH-001** — brak static import cloud-sync w nowych lib w drzewie merge
- **Notatki operacyjne** — nie mieszać z `job.notes` / `job.jobNotes[]`; nie zapisywać do `kw-jobs`; ACL inspektora bez edit/delete

---

## 13. NASTĘPNY KROK (dla programisty)

**Ostatni release (repo):** **v2.59.25 POST ZI-2026** — commit **`2b03c9d`** (P0.5B housekeeping).

**Priorytet produktu (WM Druk):** stream **COMPLETE** — nowe funkcje **tylko po AUDIT + PLAN** z użytkownikiem. ZI LiveCycle **CLOSED** · ZI Tauron 2026 **STABLE**.

**Notatki operacyjne — roadmap:**

```text
P0→P2C+HF COMPLETE (v2.58.1) — admin · ACK · widget · audit · inspektor · backup 4× KV
P3 OPEN — PDF + DOCX + Email Export (ręczny, bez auto-notify)
P2A.1 OPEN (opcjonalny) — panel w detalu roboty inspektora
```

```text
WM DRUK COMPLETE (2.59.25) — ZI 2026 STABLE · P0.5 CLOSED · legacy tombstone
P2-H stream CLOSED (v2.55.10) · P2-H.7 OPEN (Edge magic bytes 7z).
P3.0–P3.6 CLOSED · P1 WM false exclude CLOSED (v2.56.10).
Notatki operacyjne COMPLETE (v2.58.1).
UX.1 CLOSED · P2-F CLOSED · P1 CLOSED.
Backlog techniczny (na polecenie): P2-G.3D/E · P2-F.6 · P2 Audit Center · Notatki P3 Export · WM Druk P1 regresja.
Benchmark materiałów rynku HOLD · Leroy/Castorama/OBI/KB scraping — NO GO.
Inspector 2.1 — CLOSED (2.1.2 CANCELLED).
```

Przy wznowieniu:

1. Przeczytaj **ten plik** + [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md) + `CURRENT-TASK.md`
2. `curl -s https://www.wgdom.fun/version.json` — prod **2.59.25**
3. Przed zmianami Notatki: testy z handoffu operacyjnego (P0–HF)
4. Przed zmianami Przetargów: `test-tenders-strategic-client-filters.mjs` + `test-tender-exclude-renovation-budowa.mjs`
5. Przed zmianami ZIP/7Z: `test-tender-7z-archive.mjs`
6. Przed release dossier: `test-tender-dossier-pipeline.mjs`
7. Stosuj workflow **B** (functional UI) — [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)
8. Hasło **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 14. MAPA HANDOFFÓW (referencje)

| Temat | Dokument |
|-------|----------|
| **★★ PAYROLL Guard Phase B3–B3.2 (SERIES CLOSED)** | [`PAYROLL-GUARD-PHASE-CLOSEOUT.md`](PAYROLL-GUARD-PHASE-CLOSEOUT.md) · prod **2.63.18–20** |
| **★ PAYROLL Etap 2 B4 Bootstrap SSOT (CLOSED)** | [`PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md`](PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md) · prod **2.63.21** (`b3d5664`) |
| **★ PAYROLL Etap 2 B3.2 cleanup (CLOSED)** | prod **2.63.20** (`6afd9fd`) |
| **★ PAYROLL Etap 2 B3.1 Rollover (CLOSED)** | AUDIT + DESIGN FREEZE B3.1 (2026-07-01) · prod **2.63.19** |
| **★ PAYROLL Etap 2 B3 Guard Phase 2 (CLOSED)** | `PAYROLL-CLOUD-RECOVERY-ETAP2-B3-GUARD-PHASE2-DESIGN-FREEZE.md` |
| **★ PAYROLL Etap 2 B1+B2 (CLOSED)** | `PAYROLL-CLOUD-RECOVERY-ETAP2-DESIGN-FREEZE.md` |
| **★ PAYROLL P0 roster / guard** | `PAYROLL-CLOUD-RECOVERY-P0-DESIGN-FREEZE.md` · `PAYROLL-JOBS-ASSIGNMENT-SYNC-GUARD-P0-DESIGN-FREEZE.md` |
| **★★ Onboarding deweloperski** | [`AGENT-ONBOARDING.md`](AGENT-ONBOARDING.md) |
| **★★ POST ZI-2026 (skrót)** | [`MASTER-HANDOFF-POST-ZI-2026.md`](MASTER-HANDOFF-POST-ZI-2026.md) |
| **★★ ZI Tauron 2026 prod** | [`ZI-2026-HANDOFF.md`](ZI-2026-HANDOFF.md) |
| **★ WM Druk (COMPLETE)** | `SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` |
| **★ Notatki operacyjne (COMPLETE)** | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| **★ P3 Wycena · BZP · filtry** | `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| **★ P2-H Dokumenty / 7Z / Marketplanet** | `SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md` |
| **★ UX.1 Tender Workspace** | `SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md` |
| **★ P2-F Kwalifikacja ofertowa** | `SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md` |
| **★ Baseline prod (TEN)** | `PROJECT-HANDOFF-CURRENT.md` |
| **★ Pulpit V3 (SSOT)** | `SESSION-HANDOFF-DASHBOARD-V3.md` |
| Platform 20.5Z (architektura) | `PROJECT-HANDOFF-FINAL-20.5Z.md` |
| Dashboard V2 (historyczny) | `SESSION-HANDOFF-20.7-DASHBOARD-V2.md` |
| Inspector 2.1 § 9.2 | `ARCHITECTURE.md` |
| Workflow release | `WORKFLOW-RELEASE-DEPLOY.md` |
| Backup pre-feature | `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md` |
| Billing / Roboty 20.5A | `SESSION-HANDOFF-20.5A-BILLING-JOBS.md` |
| Files Hub | `SESSION-HANDOFF-20.5A.12-FILES-HUB.md` |
| CC historyczny | `docs/archive/command-center/` (**SUPERSEDED**) |

| Legacy PROJECT-HANDOFF | `PROJECT-HANDOFF.md` (częściowo nieaktualny baseline — używaj CURRENT) |

---

**Werdykt closeout (2026-07-02 — MB-2 Docs SSOT Sync · runtime 2.63.27):**

```text
RUNTIME v2.63.27 (bez zmian) · MAIN HEAD 2efe8b5 · test-infra/docs only
MB-1 CLOSED (460031f) — isBlockingFailure: wybrany conditional blokuje release
MB-1.1 CLOSED (8b5c63c) — DESIGN FREEZE v2.0 + #009 gate semantics
TI-B2.1 CLOSED (2efe8b5) — harness Synthetic + Merge, Preview First (sandbox odrzucona)
MB-2 CLOSED — docs SSOT sync (DESIGN-FREEZE v2.2 #017/#018/L5 SUPERSEDED · TI-B2-CLOSEOUT §6 · CURRENT-TASK · handoff)
TEST-FIX-001 DONE — SUPERSEDED BY MB-1
STABILIZATION WINDOW ACTIVE — zero wpływu na runtime/CI
```

**Werdykt closeout (2026-07-02 — TI-B4 · v2.63.27):**

```text
BASELINE v2.63.27 · COMMIT 6c94223 · PRODUCTION VERIFIED
TI-B4 CLOSED — smoke agregat NG-01–04 · manifest 1.1.0 · Z-04 PASS
Closeout: docs/TI-B4-CLOSEOUT.md · docs/TEST-INFRA-LIFECYCLE.md
STABILIZATION WINDOW ACTIVE — M-02 CLOSED
```

**Werdykt closeout (2026-07-02 — TEST-INFRA-001 · v2.63.26):**

```text
BASELINE v2.63.26 · COMMIT 3d6dd90 · PRODUCTION VERIFIED
TEST-INFRA-001 CLOSED — manifest SSOT + orchestrator + Payroll Harness PAYROLL-GUARD-S1
Closeout: docs/TEST-INFRA-001-CLOSEOUT.md · docs/TEST-INFRA-LIFECYCLE.md
Backlog post-MVP: TI-B1 removeWeekEmployee lib · TI-B3 CI lib suite (TI-B2 CLOSED 803c0bc · TI-B2.1 CLOSED 2efe8b5)
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — Audit Hub freshness AH-REG-1 · v2.63.25):**

```text
BASELINE v2.63.25 · COMMIT d9ba13f · PRODUCTION VERIFIED
AH-REG-1 CLOSED — notifySecurityAuditLogChanged + refreshAuditHubAuxFromCloud (security + wm-druk AUX)
Closeout: docs/AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md · docs/AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md
Łańcuch payroll: 2.63.15–21 B4 · 2.63.22 B5 · 2.63.23 B6 · 2.63.24 RB · 2.63.25 AH-REG-1
PAYROLL Etap 2: B1–B6 + RB CLOSED
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — PAYROLL-CLOUD-RECOVERY Etap 2 B4 · v2.63.21):**

```text
BASELINE v2.63.21 · COMMIT b3d5664 · PRODUCTION VERIFIED
PAYROLL-CLOUD-RECOVERY Etap 2 — B4 CLOSED (finalizePayrollBundleMerge SSOT bootstrap/runtime)
Closeout: docs/PAYROLL-CLOUD-RECOVERY-B4-CLOSEOUT.md
Łańcuch: 2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2 · 2.63.18–20 Guard Phase · 2.63.21 B4 · 2.63.22 B5 · 2.63.23 B6 · 2.63.24 RB · 2.63.25 AH-REG-1
Backlog Etap 2: **CLOSED** · TEST-INFRA-001 OPEN
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — PAYROLL Guard Phase B3/B3.1/B3.2 · v2.63.20):**

```text
BASELINE v2.63.20 · COMMIT 6afd9fd · PRODUCTION VERIFIED
PAYROLL Guard Phase — SERIES CLOSED (B3 R1/R2 · B3.1 R3 rollover · B3.2 payrollRosterPushRef cleanup)
Closeout: docs/PAYROLL-GUARD-PHASE-CLOSEOUT.md
Łańcuch: 2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2 · 2.63.18 B3 · 2.63.19 B3.1 · 2.63.20 B3.2
Backlog Etap 2 OPEN: B4 · B5 · B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — PAYROLL-CLOUD-RECOVERY Etap 2 B3.1 · v2.63.19):**

```text
BASELINE v2.63.19 · COMMIT 91d02de · PRODUCTION VERIFIED
PAYROLL-CLOUD-RECOVERY Etap 2 — B3.1 CLOSED (Guard Rollover · R3 autoArchiveAndAdvance)
Łańcuch: 2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2 · 2.63.18 B3 · 2.63.19 B3.1
Backlog OPEN: B3.2 · B4 · B5 · B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — PAYROLL-CLOUD-RECOVERY Etap 2 B3 · v2.63.18):**

```text
BASELINE v2.63.18 · COMMIT 45eddaa · PRODUCTION VERIFIED
PAYROLL-CLOUD-RECOVERY Etap 2 — B3 CLOSED (Guard Phase 2 · R1 persistPayrollRoster · R2 syncWeekRatesFromDirectory)
Łańcuch: 2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 B1+B2 · 2.63.18 B3
Backlog OPEN: B3.1 · B3.2 · B4 · B5 · B6 · TEST-INFRA-001
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-07-01 — PAYROLL-CLOUD-RECOVERY Etap 2 MIN · v2.63.17):**

```text
BASELINE v2.63.17 · COMMIT 734cbfe · PRODUCTION VERIFIED
PAYROLL-CLOUD-RECOVERY Etap 2 — B1+B2 CLOSED (fail-loud roster · JobsView guard J1–J5)
Łańcuch: 2.63.15 roster UNION · 2.63.16 guard LP · 2.63.17 Etap 2 MIN
Backlog OPEN: P0.1b (RCA-2 closed week UI) · P0.1c (RCA-3 bootstrap merge) · Guard Phase 2 · Edge Parity
STABILIZATION WINDOW ACTIVE — brak nowych epiców bez polecenia
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-06-16 — ZI Tauron 2026 STABLE):**

```text
BASELINE v2.59.25 · WM DRUK COMPLETE · ZI TAURON 2026 PRODUCTION STABLE · POST ZI-2026
COMMIT 65051a3 · RELEASE GO · PRODUCTION VERIFIED (FINAL-ZI-2026-PROD-VALIDATION)
ZI LiveCycle 2021 CLOSED (tombstone 26f02c78…) · canonical ZI 2b22da48… / ZI.pdf
Open backlog (na polecenie): P0.5 code cleanup · P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-06-14 — Notatki):**

```text
BASELINE v2.58.1 · Notatki operacyjne COMPLETE (P0→P2C+HF)
COMMIT 1f8e2bd · RELEASE GO
P3 Export OPEN (tylko na polecenie)
Moduł Przetargi: PRODUCTION READY
P3.0–P3.6 CLOSED · P1 WM CLOSED · P2-H stream CLOSED (H.7 OPEN)
UX.1 CLOSED · P2-F CLOSED · P1 CLOSED · Inspector 2.1 CLOSED
Open backlog (na polecenie): P3 Export notatki · P2-H.7 · P2-G.3D/E · P2-F.6 · P2 Audit Center
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-06-27 — Mobile Recovery EPIC · v2.62.79):**

```text
BASELINE v2.62.79 · COMMIT 4397eac · PRODUCTION VERIFIED
Mobile Recovery EPIC — CLOSED (2.62.78 UX pack + 2.62.79 Jobs MV-2)
Production smoke: PASS (7 PASS / 1 BLOCKED — SMOKE-03 tender data)
Outstanding production bugs: NONE
Next active epic: PAYROLL-CLOUD-RECOVERY backlog (B5 · B6 OPEN) · TEST-INFRA-001 READY
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-06-26 — P1 Audit Hub WM EPIC · v2.62.77):**

```text
BASELINE v2.62.77 · COMMIT 21d4a1b · PRODUCTION VERIFIED
P1 Audit Hub WM — EPIC CLOSED (Etap 1–4 RELEASED)
Etap 4 (21d4a1b · 2.62.77) — wm_druk UI visibility · 7 źródeł Audit Hub
Epic report: audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md
Backlog P1.1: schematic_edited (na polecenie)
Gotowe do wznowienia pracy
```

**Werdykt closeout (2026-06-26 — P1 Audit Hub WM Etap 3 · v2.62.76):**

```text
BASELINE v2.62.76 · COMMIT 36718cc · PRODUCTION VERIFIED
P1 Audit Hub WM — Etap 1 RELEASED (b4fde0c · 2.62.74) · Etap 2 RELEASED (c31e1bd · 2.62.75) · Etap 3 RELEASED (36718cc · 2.62.76)
Release 2.62.76 = COMPLETE
```

**Werdykt closeout (2026-06-26 — P1 Audit Hub WM Etap 2 · v2.62.75):**

```text
BASELINE v2.62.75 · COMMIT c31e1bd · PRODUCTION VERIFIED
P1 Audit Hub WM — Etap 1 RELEASED (b4fde0c · 2.62.74) · Etap 2 RELEASED (c31e1bd · 2.62.75)
Etap 3 (Schematy) NOT STARTED · Etap 4 (UX) NOT STARTED
Release 2.62.75 = COMPLETE
```

**Werdykt closeout (2026-06-26 — Recovery Pack v2.62.72):**

```text
BASELINE v2.62.72 · COMMIT 6cd8ebe · Workflow Cleanup P0 + grouped docs G7 fix
Recovery Pack WGDOM-RP-2.62.72-20260626 · COMPLETED · PRODUCTION READY · OFFSITE READY
G7 Validation PASS · CHECKSUMS zsynchronizowane · tag wgdom-recovery-pack-2.62.72
Workflow EPIC A/B/C CLOSED · Workflow Architecture FINALIZED (WORKFLOW-ARCHITECTURE-v2.63.md)
P1 Audit Hub WM: EPIC CLOSED (2.62.77)
Open backlog (na polecenie): P1.1 schematic_edited · Workflow Cleanup P1 · P3 Export · P2-H.7 · P2-G.3D/E · P2-F.6
Gotowe do wznowienia pracy
```
