# NG11 Wave 1 — Progressive Heavy (A1) + Cost-first Pricing (Q5) · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE  
> **Prod:** UI **2.63.95** @ **`4710d11`** · **PRODUCTION VERIFIED** (2026-07-11)  
> **SSOT programu:** [`NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md`](./NG11-PIPELINE-PERFORMANCE-DESIGN-FREEZE.md) · [`NG11-PIPELINE-PERFORMANCE-ARCHITECTURE-REVIEW.md`](./NG11-PIPELINE-PERFORMANCE-ARCHITECTURE-REVIEW.md)

---

## Zakres Wave 1

| Slice | Skrót | Status |
|-------|-------|--------|
| **NG11-A1** | Progressive heavy — cost/metadata split · partial persist | **RELEASED** |
| **NG11-Q5** | Cost-first pricing — early compute on `partialDossierReady` | **RELEASED** |
| **NG11-F0** | Pipeline timing telemetry (dev) | **RELEASED** (infra) |

**Nie w Wave 1:** NG11-Q3 debounced persist — AUDIT+PLAN gotowy · **Owner GO IMPLEMENT NOT READY**.

---

## Kluczowe pliki

| Warstwa | Plik |
|---------|------|
| Readiness SSOT | `src/lib/tender-pipeline/derive-pipeline-readiness.ts` |
| Pipeline state | `src/lib/tender-pipeline/derive-pipeline-state.ts` |
| Timing (dev) | `src/lib/tender-pipeline/tender-pipeline-timing.ts` |
| Heavy lazy | `src/app/hooks/useTenderDossierHeavyLazy.ts` |
| Runtime mount | `src/app/hooks/useTenderPipelineRuntime.ts` |
| Pricing auto | `src/app/hooks/useTenderPricingAuto.ts` |
| Dossier pipeline | `src/lib/tender-dossier-pipeline.ts` |

---

## Sygnały readiness (nowe)

- `partialDossierReady` — kosztorys OK + partial persist flushed
- `dossierEnriching` — metadata phase w toku
- `pricingReadyPartial` — wycena po partial dossier
- `pricingReadyFinal` — wycena po pełnym heavy (OD-3: Ready dopiero na final)

---

## Testy release (81/81 PASS)

| Skrypt | Testy |
|--------|-------|
| `test-ng11-a1-progressive-heavy.mjs` | 12 |
| `test-ng11-cost-first-pricing.mjs` | 14 |
| `test-ng11-pipeline-timing.mjs` | 11 |
| `test-tender-pricing-catalog-revision-5c0a.mjs` | 11 |
| `test-tender-dossier-heavy-lifecycle.mjs` | 5 |
| `test-tender-autonomous-run-gate-exit.mjs` | 28 |

---

## Boundary (PASS)

**Nie zmieniono:** NG10 autonomous UX/gate-exit · Payroll · `cloud-sync.ts` · Edge · `App.tsx` CORE.

---

## Następny krok

1. **NG11-Q3** — Owner GO IMPLEMENT (po F0 baseline prod observation opcjonalnie)  
2. **TWSL** **2.63.91** — osobny bundle (lokalny WIP · nie na prod)

---

*NG11 Wave 1 closeout · 2026-07-11*
