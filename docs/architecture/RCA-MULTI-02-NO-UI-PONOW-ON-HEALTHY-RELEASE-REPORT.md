# RCA-MULTI-02 Force Heavy Rescan — RELEASE REPORT

> **UI:** **2.65.76**  
> **Data:** 2026-07-29  
> **MODE:** FAST RELEASE (jeden bundle F0–F3, &lt;15 plików impl, build+test PASS)

## Zakres release

Force Heavy Rescan CTA + soft invalidate — zgodnie z DF. Bez Discovery / parsers / Bid rewrite / Sync / Payroll.

## Werdykt (pre-push)

| Gate | Status |
|------|--------|
| BUILD | PASS |
| TEST force-rescan | 36 PASS |
| TEST multi-02 regresja | PASS |
| GIT (bundle) | staged only force-rescan files |
| RELEASE | GO (po push) |

## HOTFIX CLASSIFICATION

```text
UX
BUGFIX
```

(CTA na healthy + naprawa no-op retry przez soft invalidate)

## Production

Po push `1e18374f`: VERIFY FAST — jedno `curl version.json` → live jeszcze **2.65.75** → **DEPLOY PROPAGATING**.  
Live fixture `08dee335` — PV UI po tipie 2.65.76.
