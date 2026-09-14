# PAYROLL RCA INDEX

> **Rola:** mapa RCA → closeout. Czytaj **jeden** RCA pasujący do objawu — nie wszystkie 100 plików PAYROLL*.

| Temat RC | RCA / forensics | Closeout / PV |
|----------|-----------------|---------------|
| Hours-wipe root + design | [`../architecture/PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md`](../architecture/PAYROLL-RCA-01-ROOT-CAUSE-AND-DESIGN-PLAN.md) · Forensics [`../architecture/PAYROLL-FORENSICS-01-DOMAIN-WRITE-PATH-AUDIT.md`](../architecture/PAYROLL-FORENSICS-01-DOMAIN-WRITE-PATH-AUDIT.md) | [`../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md) |
| Resurrection bootstrap | [`../architecture/PAYROLL-CLOUD-RESURRECTION-01-RCA.md`](../architecture/PAYROLL-CLOUD-RESURRECTION-01-RCA.md) | [`../architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md`](../architecture/PAYROLL-CLOUD-RESURRECTION-01-PRODUCTION-VERIFICATION.md) |
| Week rollover | [`../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md`](../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-RCA.md) | [`../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md`](../architecture/PAYROLL-P0-WEEK-ROLLOVER-01-PRODUCTION-VERIFICATION.md) |
| RC-B timeline / snapshot / first batch-set | [`../recovery/PAYROLL-RC-B-TIMELINE-RCA.md`](../recovery/PAYROLL-RC-B-TIMELINE-RCA.md) · [`../recovery/PAYROLL-RC-B-CLOUD-SNAPSHOT-RCA.md`](../recovery/PAYROLL-RC-B-CLOUD-SNAPSHOT-RCA.md) · [`../recovery/PAYROLL-RC-B-FIRST-BATCHSET-RCA.md`](../recovery/PAYROLL-RC-B-FIRST-BATCHSET-RCA.md) | [`../recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md`](../recovery/SYNC-ARCH-01-RC-B-1-CLOSEOUT.md) |
| RCA split / elimination matrix | [`../recovery/PAYROLL-RCA-SPLIT.md`](../recovery/PAYROLL-RCA-SPLIT.md) · [`../recovery/PAYROLL-RCA-ELIMINATION-MATRIX.md`](../recovery/PAYROLL-RCA-ELIMINATION-MATRIX.md) | — |
| Runtime trace (prod / CORS / first) | [`../recovery/PAYROLL-RUNTIME-TRACE-PRODUCTION-RCA.md`](../recovery/PAYROLL-RUNTIME-TRACE-PRODUCTION-RCA.md) · [`../recovery/PAYROLL-RUNTIME-TRACE-CORS-RCA.md`](../recovery/PAYROLL-RUNTIME-TRACE-CORS-RCA.md) · [`../recovery/PAYROLL-RUNTIME-TRACE-FIRST-RCA.md`](../recovery/PAYROLL-RUNTIME-TRACE-FIRST-RCA.md) | [`../recovery/PAYROLL-RUNTIME-TRACE-DOCUMENTATION-CLOSEOUT.md`](../recovery/PAYROLL-RUNTIME-TRACE-DOCUMENTATION-CLOSEOUT.md) |
| Replace architecture | [`../recovery/PAYROLL-REPLACE-ARCHITECTURE-AUDIT.md`](../recovery/PAYROLL-REPLACE-ARCHITECTURE-AUDIT.md) | — |
| Root cause validation | [`../recovery/PAYROLL-ROOT-CAUSE-VALIDATION.md`](../recovery/PAYROLL-ROOT-CAUSE-VALIDATION.md) | — |
| Edge performance | [`../recovery/PAYROLL-EDGE-PERFORMANCE-ROOTCAUSE-AUDIT.md`](../recovery/PAYROLL-EDGE-PERFORMANCE-ROOTCAUSE-AUDIT.md) | — |
| Anti-rollback | [`../recovery/PAYROLL-ANTI-ROLLBACK-AUDIT.md`](../recovery/PAYROLL-ANTI-ROLLBACK-AUDIT.md) | Study: `PAYROLL-ANTI-ROLLBACK-DESIGN-STUDY` |
| Bootstrap race | [`../architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md`](../architecture/PAYROLL-BOOTSTRAP-RACE-FIX-01-DESIGN-FREEZE.md) | — |
| Data recovery forensics | [`../architecture/PAYROLL-DATA-RECOVERY-01-ARCHIVE-FORENSICS.md`](../architecture/PAYROLL-DATA-RECOVERY-01-ARCHIVE-FORENSICS.md) | [`../architecture/PAYROLL-DATA-RECOVERY-01-FINAL-VERIFICATION.md`](../architecture/PAYROLL-DATA-RECOVERY-01-FINAL-VERIFICATION.md) |
| Sync window 16–21 Jul | [`../architecture/SYNC-RCA-16-21-JULY.md`](../architecture/SYNC-RCA-16-21-JULY.md) · [`../architecture/SYNC-REGRESSION-WINDOW-2026-07-16-TO-2026-07-21.md`](../architecture/SYNC-REGRESSION-WINDOW-2026-07-16-TO-2026-07-21.md) | — |
| **Freshness + canonical payload** | [`../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md`](../architecture/PAYROLL-FRESHNESS-PAYLOAD-2.66.126-INCIDENT-CLOSEOUT.md) | ten sam closeout (PV + maintenance) |
| **AKORD remaining ≠ weekly payable** | Commits `028c3925` · code `payroll-piecework-payable.ts` / `applyAkordPayableToCalc` | SSOT [`../PAYROLL-AKORD-PAYABLE-SSOT-4B.md`](../PAYROLL-AKORD-PAYABLE-SSOT-4B.md) · tests week-advance **39 PASS** |
| **AKORD biweekly cash / pieceworkState** | Commit `892e04c4` · `computePayrollCashSplit` + `PayrollView` | SSOT j.w. · tests biweekly-cash **27 PASS** · tip **2.66.226** |
| **AKORD V1 domain (P1–4C.1)** | Phased commits `192b2a93`…`5fe46912` | SSOT j.w. §10 · CAS [`../PAYROLL-PIECEWORK-CLOUD-CAS-4A.md`](../PAYROLL-PIECEWORK-CLOUD-CAS-4A.md) |

**Skrót AI:** [`PAYROLL_REGRESSION_HISTORY.md`](PAYROLL_REGRESSION_HISTORY.md) §9–§13.
