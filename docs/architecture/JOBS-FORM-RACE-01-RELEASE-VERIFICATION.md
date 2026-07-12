# JOBS-FORM-RACE-01 — Production Verification Report

> **Program:** JOBS-FORM-RACE-01  
> **Design Freeze:** [`JOBS-FORM-RACE-01-DESIGN-FREEZE.md`](JOBS-FORM-RACE-01-DESIGN-FREEZE.md) v1.0 · **Wariant A**  
> **Prod:** UI **2.65.7** · https://www.wgdom.fun · **PRODUCTION VERIFIED** (2026-07-12)  
> **Commit:** **`ce2b73b`**

---

## RELEASE MODE: FAST RELEASE

Jeden spójny bundle (9 plików), build PASS, testy PASS, bez zmian Protected Core.

---

## BUILD STATUS

`npm run build` — **PASS**

---

## TEST STATUS (pre-release)

| Suite | Command | Result |
|-------|---------|--------|
| JF-T01…T08 | `npx vite-node scripts/test-jobs-form-race-01.mjs` | **16/16 PASS** |
| JA-T01…T06 regresja | `npx vite-node scripts/test-jobs-address-sync-race.mjs` | **18/18 PASS** |
| RI-T01…T05 regresja | `npx vite-node scripts/test-robots-inspector-01-sync-race.mjs` | **7/7 PASS** |
| PAYROLL-RACE regresja | `npx vite-node scripts/test-payroll-race-apply-reconcile.mjs` | **12/12 PASS** |
| PAYROLL-ARCHIVE regresja | `npx vite-node scripts/test-payroll-archive-sync-race-p0.mjs` | **10/10 PASS** |

---

## PRODUCTION VERIFY (post-deploy)

### 1. `version.json` (jednorazowo)

```json
{
  "version": "2.65.7",
  "commit": "ce2b73b",
  "timestamp": "2026-07-12T18:35:44.183Z"
}
```

**PASS** — `version` = **2.65.7**, `commit` = **ce2b73b**

### 2. Manual smoke prod (Playwright headless)

Scenariusz: Roboty → Nowa robota → inspektor WM (`szymon`) → szybkie wpisanie `Obornicka` (35 ms/char) + `flatNumber` **5A** → odczekanie **4,5 s** auto-sync.

| Krok | Wynik |
|------|-------|
| prod-version | **PASS** 2.65.7@ce2b73b |
| login admin | **PASS** |
| nav-roboty / new-job | **PASS** |
| select-inspector | **PASS** value=szymon |
| fast-type-address-full | **PASS** `"Obornicka"` |
| fast-type-not-truncated | **PASS** ≠ `Obornic` |
| fast-type-flat | **PASS** `5A` |
| ui-address-after-sync (4,5 s) | **PASS** `Obornicka` |
| ui-flat-after-sync | **PASS** `5A` |
| no-reset-after-sync | **PASS** pełna długość |
| localStorage `kw-jobs` address | **PASS** `Obornicka` |
| localStorage `kw-jobs` flatNumber | **PASS** `5A` |

**Prod smoke: 13/13 PASS**

Artefakt (lokalny, niecommitowany): `.tmp/jobs-form-race-01-prod-smoke.mjs`

---

## VERSION

| Pole | Wartość |
|------|---------|
| Changelog | **2.65.7** |
| Production commit | **`ce2b73b`** |
| Baseline poprzedni | **2.65.6** (`aa91640`) |

---

## PRODUCTION STATUS

**PRODUCTION VERIFIED**

---

## WERDYKT

**RELEASE GO** · **PRODUCTION VERIFIED** · **JOBS-FORM-RACE-01 CLOSED**

---

## HOTFIX CLASSIFICATION

BUGFIX  
UX

---

## Protected Core

| Obszar | Status |
|--------|--------|
| `cloud-sync.ts` | **GREEN** — brak zmian |
| PWRB / reconcile | **GREEN** |
| Edge | **GREEN** |
| `App.tsx` CORE | **GREEN** |
| Payroll | **GREEN** |
