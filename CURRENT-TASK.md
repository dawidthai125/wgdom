# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-17 · **Tender Stabilization Release (2.59.51)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.51** · **Tender Stabilization Release** |
| **Release commit** | **`chore(release): 2.59.51`** (po push — verify `version.json`) |
| **FIX-A** | **`ed2eed5`** — stabilizacja stanu dokumentów przetargów |
| **FIX-B** | **`cca4f92`** — UNKNOWN 10,9% → 0% |
| **FIX-C** | **`3466ad7`** — lazy dossier + cache + wydajność expand |
| **Poprzedni prod (FIX-A only)** | **`b324807`** — v2.59.50 |
| **Stream WM Druk** | **COMPLETE** — ZI Tauron 2026 STABLE |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R |
| **Lista Płac · Przydziały** | **P1 CLOSED** (2.59.49) |
| **Przetargi · P3-AUDIT-001** | **CLOSED** (2.59.51 — FIX-A + FIX-B + FIX-C) |

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
| **Tender Stabilization Release** | **2.59.51** | release commit | FIX-A `ed2eed5` + FIX-B `cca4f92` + FIX-C `3466ad7` |
| **P3-AUDIT-001-FIX-C** | — | **`3466ad7`** | lazy dossier, cache bytes/PDF/ZIP, lazy wycena |
| **P3-AUDIT-001-FIX-B** | — | **`cca4f92`** | UNKNOWN 0%, phrase rules 3.3, catalog filter |
| **P3-AUDIT-001-FIX-A** | **2.59.50** | **`ed2eed5`** | functional updateItem + zbiorczy auto-pipeline patch |

## Ukończone w sesji 2026-06-16

| Faza | Wersja | Commit | Handoff / raport |
|------|--------|--------|------------------|
| INSPECTOR-P1B Pakiet odbiorowy | 2.59.46 | `e6d7e8e` | `audit/INSPECTOR-P1B-*` |
| INSPECTOR-UX-002 Quick wins | 2.59.47 | `27a2ab5` | — |
| INSPECTOR-DESIGN-002 Alignment | 2.59.48 | `2081dc8` | `audit/INSPECTOR-DESIGN-002-*` |
| **PAYROLL-ASSIGNMENTS-P1** | **2.59.49** | **`94ad114`** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |

## Smoke — Przetargi P3-AUDIT-001 (stabilizacja)

```bash
npm run build
npx vite-node scripts/test-tender-pipeline-update-item-fix-a.mjs
npx vite-node scripts/test-p3-fix-b-classification.mjs
npx vite-node scripts/test-p3-fix-c-performance.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-cost-intelligence.mjs
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

**P3-AUDIT-001 CLOSED (2.59.51).** Przed kolejną funkcją: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog OPEN (ustalić z użytkownikiem):**

- **P3-FIX-C-UX-001** — komunikat „Kosztorys oczekuje na przetworzenie” na Przeglądzie (lazy dossier)
- **PAYROLL-ASSIGNMENTS-P2** — patrz §11 w [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md)
- Notatki operacyjne **P3 Export** (PDF/DOCX/Email)
- **P2-H.7** Edge magic bytes 7z
- Audit Center / Security Log

## Szybka mapa — P3-AUDIT-001 (Przetargi)

| Co | Plik |
|----|------|
| Functional update pipeline | `useTendersPipeline.ts` → `updateItem` |
| Zbiorczy auto-pipeline patch | `TenderDetailPanel.tsx` |
| Catalog quantity filter | `tender-catalog-quantity-filter.ts` |
| Phrase rules v3.3 | `wgdom-phrase-rules.ts` |
| Bytes/PDF/ZIP cache | `tender-document-bytes-cache.ts`, `tenders-bzp-doc-parse.ts` |
| Lazy dossier + wycena | `TenderDetailPanel.tsx`, `tender-dossier-pipeline.ts` |
| Smoke FIX-A/B/C | `scripts/test-tender-pipeline-update-item-fix-a.mjs`, `test-p3-fix-b-classification.mjs`, `test-p3-fix-c-performance.mjs` |
