# MOBILE-FIRST-SCREEN-01 — RELEASE REPORT

> **STATUS:** **CLOSED · RELEASE COMPLETE**  
> **Data:** 2026-07-25  
> **Owner GO RELEASE:** **TAK**  
> **DF:** [`MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md`](MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md)  
> **OV:** [`MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md`](MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md)

---

## 1. Commits (main → origin)

| # | Hash | Message |
|---|------|---------|
| 1 | **`eccbf9f`** | fix(mobile): reclaim tender first-screen chrome budget (MOBILE-FIRST-SCREEN-01) |
| 2 | **`10df32b`** | fix(mobile): single ProcessStrip mount for MFS-01 Gate B |
| 3 | **`bf8d3d5`** | test(tenders): align TEUX-7d CTA asserts with MFS-01 compact mobile |

**Tip prod / HEAD:** **`bf8d3d5`** (`bf8d3d5…`)

**Push:** **SUCCESS** → `origin/main`

---

## 2. CI / Deploy

| | Result |
|--|--------|
| **TEST-INFRA Gates (TI-B3)** @ `bf8d3d5` | **success** ([run](https://github.com/dawidthai125/wgdom/actions/runs/30176852378)) |
| Gate B tenders / Gate C E2E | **PASS** |
| Legacy E2E / Mobile smoke | failure (poza gate; jak wcześniej) |

```json
https://www.wgdom.fun/version.json
→ { "version": "2.65.44", "commit": "bf8d3d5", "timestamp": "2026-07-25T22:05:06.762Z" }
```

**Deploy LIVE** — tip = `bf8d3d5`.

---

## 3. Pliki (produkt + docs + gate)

**Produkt:**
- `src/app/TenderDetailPage.tsx`
- `src/app/TenderWorkflowOperatorActionBar.tsx`
- `src/app/TenderWorkflowPrimaryAction.tsx`

**Gate (align DF):**
- `scripts/test-tender-copy-teux7d.mjs`

**Docs:**
- `docs/architecture/MOBILE-UX-SAFARI-02-AUDIT-RCA.md`
- `docs/architecture/MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md`
- `docs/architecture/MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md`
- `docs/architecture/MOBILE-FIRST-SCREEN-01-FINAL-OWNER-VERIFICATION.md`
- `docs/architecture/MOBILE-FIRST-SCREEN-01-RELEASE-REPORT.md`

---

## 4. Podsumowanie zmian

First-screen chrome budget na **Wybrany przetarg** (mobile):

1. **Operator Bar A** — jeden rząd, horizontal scroll; spacer `3.25rem` + safe-area.  
2. **Process Strip** — collapsed na `max-lg`, expand inline; **jeden** mount JSX.  
3. **Primary CTA** — compact, bez description na mobile, busy „Przetwarzam…”.  
4. **Shortcuts** — ukryte na mobile.  
5. Scroll root + `.mobile-view-scroll`.

Emulacja @390: content **~53%** (target ≥38%). Brak zmian Payroll / Cloud Sync / scoring / upload handlers.

---

## 5. Ticket

| | |
|--|--|
| MOBILE-FIRST-SCREEN-01 | **CLOSED · RELEASE COMPLETE** |

---

**Koniec RELEASE MOBILE-FIRST-SCREEN-01.**
