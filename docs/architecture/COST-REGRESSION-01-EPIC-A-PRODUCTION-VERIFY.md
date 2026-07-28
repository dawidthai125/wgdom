# COST-REGRESSION-01 EPIC A — PRODUCTION VERIFY

> **UI target:** 2.65.71  
> **Data:** 2026-07-28

## VERIFY DEPLOY FAST

Jedno odczytanie `https://www.wgdom.fun/version.json` po push.

| Pole | Oczekiwane |
|------|------------|
| version | `2.65.71` |
| commit | tip feature EPIC A |

## Smoke Owner (manual)

1. WM bez kosztorysu (F2 TRACE) → Outcome: **Brak przedmiaru…** + CTA Dokumenty — nie „Brak rekomendowanej ceny”.
2. F2 + ATH w załącznikach → CTA **Ponów analizę** startuje heavy (reuse).
3. Podczas parse → **Trwa analiza kosztorysu…**, CTA disabled.
4. Tender z PLN>0 → bez auto re-parse, cena bez zmian.
5. F1 (ok + 0 rows) → **nie** copy „Brak przedmiaru w dokumentach”.

## Status

Uzupełnij po curl:

- PRODUCTION VERIFIED | DEPLOY PROPAGATING
