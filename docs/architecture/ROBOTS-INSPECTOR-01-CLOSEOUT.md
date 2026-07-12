# ROBOTS-INSPECTOR-01 — Inspektor WM stale sync reconcile · CLOSEOUT

> **Program:** ROBOTS-INSPECTOR-01  
> **Prod:** UI **2.65.5** · https://www.wgdom.fun · **PRODUCTION VERIFIED** (2026-07-12)  
> **Commit:** **`9307386`**  
> **Class:** **CORE** (sync reconcile — minimal diff, Protected Core)  
> **Powiązane:** [`PAYROLL-RACE-01-DESIGN-FREEZE.md`](../PAYROLL-RACE-01-DESIGN-FREEZE.md) · [`PAYROLL-ARCHIVE-01-DESIGN-FREEZE.md`](../PAYROLL-ARCHIVE-01-DESIGN-FREEZE.md) · **ARCHITECTURE.md** § sync reconcile ROBOTS-INSPECTOR-01

---

## Werdykt Owner CLOSEOUT

| Pole | Wartość |
|------|---------|
| **Status** | **CLOSED** · **PRODUCTION VERIFIED** |
| **Production** | **2.65.5** @ **`9307386`** |
| **Production Verify** | **PASS** (prod smoke 15/15 po deploy) |
| **Protected Core** | **GREEN** |
| **Architecture** | **APPROVED** |
| **Regression** | **NONE** (PAYROLL-RACE-01 12/12 · PAYROLL-ARCHIVE-01 10/10 · RI-T01–T05 7/7) |
| **Rollback** | **READY** — `git revert 9307386` |

---

## Problem (incydent prod)

**Flow:** Roboty → Nowa robota → wybór inspektora (np. Szymon Szóstak) → po ~2 s auto-sync select wraca do „— wybierz inspektora —” → zapis roboty zablokowany (`validateJobAssignedInspectorForSave`).

**Root cause:** asymetria bundle w `runCloudSync` — `applyAdminDataBundle` używał reconcile z `kw-jobs`, ale **push** i **fingerprint** używały `reconciled` bez jobs reconcile → cloud poison → kolejny sync tracił `assignedInspectorId`.

---

## Fix (Variant D + A)

| Wariant | Dostarczone |
|---------|-------------|
| **D (PRIMARY)** | SSOT `reconcileAdminBundleWithFreshLocal()` → `finalBundle` dla **apply + push + fingerprint** |
| **A** | `reconcileJobsWithFreshLocal()` — świeży `kw-jobs` z LS przed apply/push |
| **1B** | **NIE** (poza scope — tylko gdy A+D nie wystarczy) |

**Kluczowe pliki:** `src/lib/cloud-sync.ts` · `src/app/App.tsx` (`runCloudSync`, `pullFromCloudAndMerge`)

**Test:** `scripts/test-robots-inspector-01-sync-race.mjs` (RI-T01–T05) · manifest `LIB-ROBOTS-INSPECTOR-01`

---

## Boundary (PASS)

**Nie dotknięto:** Edge · `mergeJobsById` · payroll runtime · roster · PWRB · `finalizePayrollBundleMerge`.

---

## Production Smoke (PASS)

Scenariusz: Roboty → Nowa robota → Szymon Szóstak → 12,5 s auto-sync

- Select nadal pokazuje Szymona  
- `assignedInspectorId` w stanie i `localStorage`  
- Adres nie wyczyszczony  
- Formularz zapisywalny (edycja bez błędu inspektora)

---

## Rollback

```bash
git revert 9307386
git push origin main
```

---

*Nie rozszerzaj bez nowego AUDIT + Owner GO.*
