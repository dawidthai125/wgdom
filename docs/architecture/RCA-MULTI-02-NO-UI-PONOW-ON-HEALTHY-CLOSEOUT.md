# RCA-MULTI-02 Force Heavy Rescan — CLOSEOUT

> **STATUS:** **CLOSED (code)** · PV live fixture po deploy  
> **UI:** **2.65.76**  
> **Data:** 2026-07-29

## Co zamknięto

- CTA „Uzupełnij odczyty branż” + confirm
- `forceHeavyRescanAt` soft invalidate
- REUSE Heavy E-RUN (`forceHeavyRescan`)
- Feature flag `COST_MULTI_02_FORCE_RESCAN_CTA`
- Testy T1–T6 / I1–I3

## Dokumenty

| Doc | |
|-----|--|
| RCA | [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY.md) |
| DF | [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-DESIGN-FREEZE.md) |
| IMPL | [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-IMPLEMENTATION-REPORT.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-IMPLEMENTATION-REPORT.md) |
| RELEASE | [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-RELEASE-REPORT.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-RELEASE-REPORT.md) |
| PV | [`RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-PRODUCTION-VERIFY.md`](RCA-MULTI-02-NO-UI-PONOW-ON-HEALTHY-PRODUCTION-VERIFY.md) |

## Rollback

`COST_MULTI_02_FORCE_RESCAN_CTA = false` → brak CTA / brak wyjątku heavyDone.

## Następne

Owner: ręczny PV na `08dee335` po propagacji tipu 2.65.76 (CTA → confirm → Heavy → AGGREGATE).
