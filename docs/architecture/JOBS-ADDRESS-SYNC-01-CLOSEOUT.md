# JOBS-ADDRESS-SYNC-01 — Adres roboty nie znika po sync · CLOSEOUT

> **Program:** JOBS-ADDRESS-SYNC-01  
> **Design Freeze:** [`JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md`](JOBS-ADDRESS-SYNC-01-DESIGN-FREEZE.md) v1.0  
> **Release verification:** [`JOBS-ADDRESS-SYNC-01-RELEASE-VERIFICATION.md`](JOBS-ADDRESS-SYNC-01-RELEASE-VERIFICATION.md)  
> **Class:** **CORE** (merge `kw-jobs` — minimal diff)

---

## Werdykt Owner CLOSEOUT

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** |
| **Production** | **2.65.6** |
| **Protected Core** | **GREEN** |
| **Regression** | **NONE** (RI 7/7 · PAYROLL-RACE 12/12 · PAYROLL-ARCHIVE 10/10 · JA 18/18) |

---

## Problem

**Flow:** Roboty → Nowa robota → wpisanie adresu i nr mieszkania → po ~1–3 s auto-sync pola się czyszczą.

**Root cause (PRIMARY):** `mergeJobsById` → `mergePair` — LWW po `updatedAt`; skalary `address`/`flatNumber` z wygrywającego rekordu. Chmura z pustym adresem i wyższym `updatedAt` nadpisywała lokalną edycję.

**Root cause (SECONDARY):** stale closure w `JobsView` (`{...selectedJob}`) — wzmacniał objaw przy szybkiej edycji.

---

## Fix

| Element | Dostarczone |
|---------|-------------|
| **Field merge** | `src/lib/job-address-fields.ts` — non-empty wins; obie niepuste → LWW |
| **mergePair** | `address` + `flatNumber` przez `mergeJobAddressField` |
| **UI (opcjonalne DF)** | `JobsView` — onChange czyta `jobs.find(id)` zamiast stale `selectedJob` |

**Test:** `scripts/test-jobs-address-sync-race.mjs` (JA-T01–T06) · manifest `LIB-JOBS-ADDRESS-SYNC-01`

---

## Boundary (PASS)

**Nie dotknięto:** Edge · PWRB · Payroll runtime · `reconcileJobsWithFreshLocal` API · `finalReconciledBundle` architektura · inne pola Job.

---

## Rollback

```bash
git revert <commit-jobs-address-sync-01>
git push origin main
```

---

*Nie rozszerzaj field merge na inne skalary Job bez nowego AUDIT + Owner GO.*
