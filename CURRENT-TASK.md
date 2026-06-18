# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-17 · **P1 Document Insights Release (2.59.52)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod (`main`)** | **2.59.52** · **P1 Document Insights** |
| **Release commit** | **`ff20fec`** — `feat(tenders): executive document insights and work scope inference` |
| **Poprzedni prod** | **2.59.51** (`fb9b8bd` + FIX-A/B/C) |
| **P1A–P1D** | PDF UX · Summary Header · Executive Summary · Work Scope Inference |
| **Stream WM Druk** | **COMPLETE** — ZI Tauron 2026 STABLE |
| **Pomiary Elektryczne** | **COMPLETE** EM-P0→P1R |
| **Lista Płac · Przydziały** | **P1 CLOSED** (2.59.49) |
| **Przetargi · P3-AUDIT-001** | **CLOSED** (2.59.51 — FIX-A + FIX-B + FIX-C) |

## ★★ START HERE (nowy agent)

| Temat | Dokument |
|-------|----------|
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **★ P1 Document Insights (Owner View)** | [`docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md`](docs/SESSION-HANDOFF-P1-DOCUMENT-INSIGHTS.md) |
| **Onboarding agenta** | [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) |
| **Architektura** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.12 P1 · § 12.1.7 P2-H |
| **Przydziały robót (P1)** | [`docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md) |
| **Pomiary Elektryczne (EM)** | [`docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md`](docs/SESSION-HANDOFF-ELECTRICAL-MEASUREMENTS.md) |
| **WM Druk / POST ZI** | [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md) |

## Ukończone w sesji 2026-06-17 (P1)

| Faza | Wersja | Commit | Zakres |
|------|--------|--------|--------|
| **P1 Document Insights Release** | **2.59.52** | **`ff20fec`** | P1A PDF UX + P1B Summary + P1C Executive + P1D Inference |
| **P0 ATH preview hotfix** | 2.59.51 | `fb9b8bd` | PDF w 7Z, outer archive (osobny commit) |
| **Tender Stabilization** | 2.59.51 | `ed2eed5`+`cca4f92`+`3466ad7` | FIX-A/B/C |

## Smoke — P1 Document Insights

```bash
npm run build
npx vite-node scripts/test-p1-pdf-preview-ux.mjs
npx vite-node scripts/test-p1b-document-summary-header.mjs
npx vite-node scripts/test-p1c-executive-summary.mjs
npx vite-node scripts/test-p1d-work-scope-inference.mjs
npx vite-node scripts/test-p0-ath-preview-hotfix.mjs
npx vite-node scripts/test-p5-owner-view.mjs
```

## Smoke regresji (Przetargi P3)

```bash
npx vite-node scripts/test-tender-pipeline-update-item-fix-a.mjs
npx vite-node scripts/test-p3-fix-b-classification.mjs
npx vite-node scripts/test-p3-fix-c-performance.mjs
npx vite-node scripts/test-tender-dossier-pipeline.mjs
npx vite-node scripts/test-tender-cost-intelligence.mjs
```

## Następny krok (produkt)

**P1 Document Insights CLOSED (2.59.52).** Przed kolejną funkcją: **AUDIT → PLAN → IMPLEMENT → BUILD → SMOKE → COMMIT → PUSH → VERIFY → RAPORT**

**Backlog OPEN (ustalić z użytkownikiem):**

- **P3-FIX-C-UX-001** — komunikat „Kosztorys oczekuje na przetworzenie” (lazy dossier)
- **PAYROLL-ASSIGNMENTS-P2** — patrz §11 w [`SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md`](docs/SESSION-HANDOFF-PAYROLL-ASSIGNMENTS-P1.md)
- Notatki operacyjne **P3 Export** (PDF/DOCX/Email)
- **P2-H.7** Edge magic bytes 7z
- Audit Center / Security Log

## Szybka mapa — P1 Document Insights

| Co | Plik |
|----|------|
| Modal podglądu | `JobFilePreviewModal.tsx` |
| Summary Header P1B | `DocumentSummaryHeader.tsx` + `tender-document-summary-header.ts` |
| Executive Summary P1C/D | `ExecutiveSummaryCard.tsx` + `tender-executive-summary.ts` |
| Work Scope Inference P1D | `tender-work-scope-inference.ts` |
| PDF UX P1A | `tender-pdf-preview-ux.ts` |
| Owner → preview item | `tender-ath-quick-access.ts` → `resolveAthPreviewItem` |
| Owner View UI | `TenderOwnerView.tsx` |
