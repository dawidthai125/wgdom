# AUDIT HUB — Freshness Regression (AH-REG-1) · RELEASE REPORT

> **Version:** **v2.63.25** · **Commit:** *(pending — local IMPLEMENT complete)*  
> **Baseline:** v2.63.24 (`727e6c4`)  
> **Date:** 2026-07-01 · **Status:** **IMPLEMENT COMPLETE — pre-deploy**

---

## Summary

AH-REG-1 fixes Audit Hub feed staleness without expanding capabilities: `notifySecurityAuditLogChanged` after every `recordSecurityAudit` write, `App.tsx` listener refreshes React state, and `refreshAuditHubAuxFromCloud` pulls `kw-security-audit-log` + `kw-wm-druk-audit-log` in both `runCloudSync` and `pullFromCloudAndMerge`. Seven Hub sources, taxonomy, and read-only architecture unchanged.

---

## Release artifacts

| Item | Value |
|------|-------|
| **Bundle** | AH-REG-1 — Audit Hub Freshness |
| **Files (scope)** | 7 |
| **Deploy** | **Vercel only** |
| **Edge** | Not required |

### Files changed

| File | Change |
|------|--------|
| `src/lib/security-audit-log.ts` | `SECURITY_AUDIT_LOG_CHANGED_EVENT`, `notifySecurityAuditLogChanged`, call from `recordSecurityAudit` |
| `src/app/App.tsx` | listener, `refreshAuditHubAuxFromCloud`, DRY pull paths |
| `scripts/test-audit-hub-freshness-ah-reg-1.mjs` | **NEW** — T1–T5 |
| `CHANGELOG.md` | 2.63.25 entry |
| `src/app/changelog-data.ts` | 2.63.25 entry |
| `docs/ARCHITECTURE.md` | §15.3 AH-REG-1 line |
| `docs/AUDIT-HUB-AH-REG-1-RELEASE-REPORT.md` | **NEW** |

---

## Implementation

### AH-R1 — Security state refresh

```text
recordSecurityAudit → localStorage → notifySecurityAuditLogChanged()
App useEffect → read LS → setSecurityAuditLog
```

### AH-R2 — AUX pull on sync

```text
refreshAuditHubAuxFromCloud():
  pullSecurityAuditLogFromCloud → setSecurityAuditLog
  pullWmDrukAuditLogFromCloud → setWmDrukAuditLog

Used by: pullFromCloudAndMerge, runCloudSync (before setSyncStatus saved)
```

---

## Test gate (local)

| Suite | Result |
|-------|--------|
| `test-audit-hub-freshness-ah-reg-1.mjs` | **10 PASS** |
| `test-security-audit-log.mjs` | **20 PASS** |
| `test-audit-hub-adapters.mjs` | **77 PASS** |
| `test-audit-hub-view-model.mjs` | **49 PASS** |
| `npm run build` | **PASS** |

---

## Preserved

7 Audit Hub sources · `SecurityAuditAction` taxonomy · read-only Hub · AUX KV (not in `DATA_KEYS`) · no payroll/sync/edge audit logging.

---

## Werdykt

| Gate | Status |
|------|--------|
| DESIGN FREEZE | **APPROVED** |
| IMPLEMENT | **COMPLETE** (local) |
| Test gate | **PASS** |
| PRODUCTION | **PENDING** |

---

*SSOT: [`AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md`](AUDIT-HUB-AH-REG-1-DESIGN-FREEZE.md)*
