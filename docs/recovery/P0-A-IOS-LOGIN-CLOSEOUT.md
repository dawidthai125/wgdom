# P0-A-IOS-LOGIN — CLOSEOUT

> **Status:** **CLOSED** · **BUNDLE CLOSED** · **PRODUCTION VERIFIED**  
> **Data closeout:** 2026-07-10  
> **Prod:** **v2.63.87** @ **`6f85d4c`**  
> **Klasa:** FEATURE / SHELL (#CORE-013 PASS — brak CORE w diff)

| Gate | Wynik |
|------|-------|
| AUDIT | PASS |
| PLAN | PASS · [`P0-A-IOS-LOGIN-PLAN.md`](P0-A-IOS-LOGIN-PLAN.md) |
| DESIGN FREEZE | PASS · [`P0-A-IOS-LOGIN-DESIGN-FREEZE.md`](P0-A-IOS-LOGIN-DESIGN-FREEZE.md) |
| ARCH REVIEW | PASS |
| IMPLEMENT | PASS |
| BUILD / AUTO TEST | PASS · `test-admin-login-shell-p0a.mjs` 11/11 |
| COMMIT / PUSH | **`6f85d4c`** |
| Owner Manual QA (AC-A6) | PASS · Safari iPhone · `www.wgdom.fun` |

## Zakres (6 plików)

- `src/app/LoginScreen.tsx` — `try/finally` `passLoading` (admin + inspektor)
- `src/lib/admin-auth.ts` — `mapAdminLoginError`, `AdminRememberError`, remember fail-safe
- `src/app/GuideView.tsx` — FAQ iPhone/Safari
- `src/app/changelog-data.ts` + `CHANGELOG.md` — **2.63.87**
- `scripts/test-admin-login-shell-p0a.mjs`

## Root cause (Incident A)

`handleAdminLogin` bez `try/finally` — throw w `verifyAdminLogin` / `saveRememberedAdminPassword` → `passLoading` stuck → brak `onAdmin()`.

## Fix summary

- `#P0A-005` — błąd remember nie blokuje wejścia po poprawnym haśle
- Komunikaty PL: QuotaExceeded, Web Crypto, remember, default
- **OFF LIMITS respektowane:** App.tsx CORE, cloud-sync, CloudLoader, Payroll, Pipeline, Edge

## Incident register

**Incident A** → **CLOSED** (ten program). **Nie** mieszać z Incident B (`batch-set` 500) — osobny program P0-B.
