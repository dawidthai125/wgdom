# EXPERT-AI-PRODUCTION-ENABLEMENT-01 — Q12 FIX IMPLEMENT (thin)

> **STATUS:** IMPLEMENT complete · waiting **OWNER VERIFY** (browser Q12) → **OWNER GO → COMMIT**  
> **Date:** 2026-08-09  
> **Baseline tip:** `29a48fb3` · UI **2.66.22**  
> **SSOT DF:** [`EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md`](EXPERT-AI-PRODUCTION-ENABLEMENT-01-Q12-FIX-DESIGN-FREEZE.md)

## One-liner

Case identity is **content-stable across reloads**; wall-clock assembly time is **not** an identity source.

## Locked formula (shipped)

```text
stableCaseStamp =
  kosztorys.parsedAt
  ?? tenderDossier.builtAt
  ?? content:${recomputeToken}|pv:${parserVersionNum}

fingerprint = recomputeToken|parserVersionNum|stableCaseStamp
caseId      = chief:${item.id}:${fingerprint}

builtAtIso = stableCaseStamp  → assembleChiefWireRuntimeRo
nowIso     = stableCaseStamp  → engine.start → dossier.finishedAt
```

## Files (allowlist)

| Path | Change |
|------|--------|
| `src/app/hooks/useChiefOrchestratorSession.ts` | stamp · fingerprint · `builtAtIso` · `nowIso` |
| `src/lib/chief-session/case-id.ts` | `resolveStableCaseStamp` + fingerprint composition |
| `src/lib/chief-session/index.ts` | export `resolveStableCaseStamp` |
| `scripts/test-wire-chief-session-01.mjs` | AC-F1…F5 reload + invalidate |

## OUT (unchanged)

Persist API · DecisionWorkspaceHost · Chief BC · adapters · Experts · `useTenderOfferRun.ts` (LOCAL M protected).

## NEXT

OWNER browser Q12 re-test → OWNER GO → COMMIT · **no** push/deploy/CLOSEOUT until Owner says so.
