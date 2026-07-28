# COST-REGRESSION-01 EPIC A — PRODUCTION VERIFY

> **UI target:** 2.65.71 · feature **`0a96744`**  
> **Data:** 2026-07-28

## VERIFY DEPLOY FAST (jedno odczytanie)

```json
{
  "version": "2.65.70",
  "commit": "9c28488",
  "timestamp": "2026-07-28T18:02:48.607Z"
}
```

| Pole | Oczekiwane | Live |
|------|------------|------|
| version | `2.65.71` | **2.65.70** |
| commit | `0a96744` | **9c28488** |

**PRODUCTION STATUS:** **DEPLOY PROPAGATING** (RELEASE GO nadal OK — bez retry/poll).

## Smoke Owner (manual — po propagacji)

1. WM bez kosztorysu (F2) → Outcome: **Brak przedmiaru…** + CTA Dokumenty.
2. F2 + ATH → CTA **Ponów analizę**.
3. Podczas parse → **Trwa analiza…**, CTA disabled.
4. Tender z PLN>0 → bez auto re-parse.
5. F1 → nie „Brak przedmiaru w dokumentach”.
