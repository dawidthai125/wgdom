# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-16 · **MASTER HANDOFF POST ZI-2026 (2.59.25)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.25** · **PRODUCTION VERIFIED** |
| **Stream WM Druk** | **COMPLETE** — ZIP · DOCX · preservation · sync · P0.5 |
| **ZI Tauron 2026** | **PRODUCTION STABLE** — mapping 99/111/112 + preservation gate |
| **ZI LiveCycle 2021** | **CLOSED** — tombstone `26f02c78-…` |
| **P0.5A Docs cleanup** | **DONE** |
| **P0.5B Housekeeping** | **DONE** (`2b03c9d`) |

## ★★ START HERE

**Master handoff:** [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md)

**Baseline prod:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)

**ZI SSOT:** [`docs/ZI-2026-HANDOFF.md`](docs/ZI-2026-HANDOFF.md)

**Canonical template UUID:** `2b22da48-46dc-42a0-8236-d42b5b5562dc`

**Mapping §4:** 99 → JOB_STREET · 111 → JOB_BUILDING · 112 → JOB_APARTMENT

**Preservation:** aktywny `ZI.pdf` użytkownika → pdf.js graft + patch §4.

**Nie ruszać bez audytu:** `generatePdfZiTauron2026` · preservation gate · `detectLegacyLiveCycleZiForm` · tombstone sync · dedupe ZIP · pdf.js worker

**Nie wracać do:** XFA · LiveCycle · overlay · flatten · ciphertext · AP RE · TextField2[*] · widgety 429/428/427

## Raporty P0.5

- [`audit/POST-ZI-DOCS-CLEANUP-REPORT.md`](audit/POST-ZI-DOCS-CLEANUP-REPORT.md) — P0.5A
- [`audit/P0.5B-HOUSEKEEPING-REPORT.md`](audit/P0.5B-HOUSEKEEPING-REPORT.md) — P0.5B
- [`audit/POST-ZI-CLEANUP-AUDIT.md`](audit/POST-ZI-CLEANUP-AUDIT.md) — backlog Medium/High (legacy split)

## Smoke regresji WM Druk

```bash
npm run build
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
npx vite-node scripts/test-wm-print-zi-2026-preservation-smoke.mjs
npx vite-node scripts/test-wm-print-zi-zip-post-cleanup.mjs
npx vite-node scripts/test-wm-print-p0-1a-docx-fix.mjs
```

## Następny krok (produkt)

**ZI zamknięte · WM Druk stabilne.**

Przed nową funkcją WM Druk: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog otwarty (ustalić z użytkownikiem):**

- Nowe funkcje Odbiory WM Druk
- Audit Center / Security Log
- Hero Tone Variant B
- Command Center — odłożony
