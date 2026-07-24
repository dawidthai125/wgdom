# PAYROLL Hours-Wipe Protection — Release History

> **EPIC:** Hours-wipe protection (INCIDENT-01 → DF-01 D1–D5)  
> **STATUS:** **CLOSED** · **PRODUCTION VERIFIED**  
> **Closeout:** [`../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md`](../architecture/PAYROLL-EPIC-CLOSE-01-CLOSEOUT.md)  
> **Data:** 2026-07-24

---

## Release History

| Date | Version | Commit | Stage | Notes |
|------|---------|--------|-------|-------|
| 2026-07-24 | **2.65.41** | `ace2855` | **D1** | Passive write-path telemetry (`payroll.write_path`) |
| 2026-07-24 | **2.65.42** | `f3b8c03` | **D2+D3** | Domain Gate + confirm; `intentionalHoursClear` ⇔ `skipPayrollGuard` |
| 2026-07-24 | **2.65.42** | `8fa0851` | docs | RELEASE-02 production verify |
| 2026-07-24 | **2.65.43** | `ea1b0a6` | **D4+D5** | `-prev` Recovery Banner + Soft Restore overlay |
| 2026-07-24 | **2.65.43** | `2d61a7b` | docs | RELEASE-03 production verify · epic complete |

**Feature tip (semantics):** **2.65.43 / `ea1b0a6`**

---

## Verify docs

| Release | Doc |
|---------|-----|
| D1 | [`../architecture/PAYROLL-RELEASE-01-D1-PRODUCTION-VERIFY.md`](../architecture/PAYROLL-RELEASE-01-D1-PRODUCTION-VERIFY.md) |
| D2+D3 | [`../architecture/PAYROLL-RELEASE-02-D2-D3-PRODUCTION-VERIFY.md`](../architecture/PAYROLL-RELEASE-02-D2-D3-PRODUCTION-VERIFY.md) |
| D4+D5 | [`../architecture/PAYROLL-RELEASE-03-D4-D5-PRODUCTION-VERIFY.md`](../architecture/PAYROLL-RELEASE-03-D4-D5-PRODUCTION-VERIFY.md) |

---

## Out of scope (not this epic)

- CI Gate B pre-existing failures → **osobny EPIC**
- DF D10 / D11 DEFER items
- Earlier payroll programs (S6/S7, resurrection fence, rollover) — already CLOSED separately
