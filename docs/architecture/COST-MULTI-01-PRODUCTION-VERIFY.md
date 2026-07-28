# COST-MULTI-01 — PRODUCTION VERIFY

> **Data:** 2026-07-28 · UI **2.65.74**

## VERIFY DEPLOY FAST

Jedno sprawdzenie `https://www.wgdom.fun/version.json` po push (bez retry).

| Oczekiwane | Wynik |
|------------|-------|
| `version` | **2.65.74** |
| PASS | PRODUCTION VERIFIED |
| poprzednia wersja | DEPLOY PROPAGATING |

## Testy lokalne (przed push)

| Test | Wynik |
|------|-------|
| `npx vite-node scripts/test-cost-multi-01.mjs` | **PASS** |
| `npm run build` | **PASS** |
| Fixture `08dee335` (pure filenames) | `multi_ready` · 4 branże · incomplete ONE |

## Owner smoke (po deploy)

1. Otwarty przetarg `08dee335…` → **Ponów analizę** (jeśli brak `costCandidateSources`).
2. Zakładka Kosztorysy → banner `data-cost-multi-01="1"` · status `multi_ready` lub `multi_hold`.
3. Bid / sticky PLN **bez zmian** vs przed (OOS).
