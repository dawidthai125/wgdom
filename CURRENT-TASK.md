# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-17 · **P3-AUDIT-001-FIX-A (2.59.50)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.50** · **PRODUCTION VERIFIED** |
| **Commit prod (FIX-A)** | **`ed2eed5`** — stabilizacja stanu dokumentów przetargów |
| **Poprzedni prod (PAYROLL-P1)** | **`94ad114`** — v2.59.49 PAYROLL-ASSIGNMENTS-P1 |
| **Stream WM Druk** | **COMPLETE** — ZI Tauron 2026 STABLE |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R |
| **Lista Płac · Przydziały** | **P1 CLOSED** (2.59.49) |
| **Przetargi · dokumenty** | **FIX-A CLOSED** (2.59.50) |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **★ Przydziały robót (P1)** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |
| **Pomiary Elektryczne (EM)** | [`docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) |
| **WM Druk / POST ZI** | [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md) |
| **Onboarding agenta** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 10.2 · § 12.1.8 WM · § 12.1.10 EM |

## Ukończone w sesji 2026-06-17

| Faza | Wersja | Commit | Handoff / raport |
|------|--------|--------|------------------|
| **P3-AUDIT-001-FIX-A** | **2.59.50** | **`ed2eed5`** | functional updateItem + zbiorczy auto-pipeline patch |

## Ukończone w sesji 2026-06-16

| Faza | Wersja | Commit | Handoff / raport |
|------|--------|--------|------------------|
| INSPECTOR-P1B Pakiet odbiorowy | 2.59.46 | `e6d7e8e` | `audit/INSPECTOR-P1B-*` |
| INSPECTOR-UX-002 Quick wins | 2.59.47 | `27a2ab5` | — |
| INSPECTOR-DESIGN-002 Alignment | 2.59.48 | `2081dc8` | `audit/INSPECTOR-DESIGN-002-*` |
| **PAYROLL-ASSIGNMENTS-P1** | **2.59.49** | **`94ad114`** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |

## Smoke — Przydziały robót (P1)

```bash
npm run build
npx vite-node scripts/test-payroll-assignments-p1.mjs
npx vite-node scripts/test-dashboard-v3-counts.mjs
```

## Smoke — Przetargi FIX-A

```bash
npm run build
npx vite-node scripts/test-tender-pipeline-update-item-fix-a.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-change-monitor.mjs
npx vite-node scripts/test-tender-workspace-ux.mjs
```

## Smoke regresji EM (bez zmian)

```bash
npx vite-node scripts/test-electrical-measurements-p1.mjs
npx vite-node scripts/test-em-p1r-hotfix-001-address-parity.mjs
```

## Smoke regresji WM Druk (ZI)

```bash
npx vite-node scripts/test-wm-print-zi-2026-smoke.mjs
```

## Następny krok (produkt)

**P3-AUDIT-001-FIX-A CLOSED.** Przed kolejną funkcją: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog OPEN (ustalić z użytkownikiem):**

- **P3-AUDIT-001-FIX-B/C** — perf dokumentów, bootstrap user dict, semantyka UNKNOWN (audyt P3-AUDIT-001)
- **PAYROLL-ASSIGNMENTS-P2** — patrz §11 w [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md)
- Notatki operacyjne **P3 Export** (PDF/DOCX/Email)
- **P2-H.7** Edge magic bytes 7z
- Audit Center / Security Log

## Szybka mapa — FIX-A (Przetargi · dokumenty)

| Co | Plik |
|----|------|
| Functional update pipeline | `useTendersPipeline.ts` → `updateItem` |
| Zbiorczy auto-pipeline patch | `TenderDetailPanel.tsx` |
| Smoke T1–T6 | `scripts/test-tender-pipeline-update-item-fix-a.mjs` |
