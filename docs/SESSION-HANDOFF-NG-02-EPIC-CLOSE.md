# SESSION HANDOFF — NG-02 Tender Automation Pipeline EPIC CLOSE

> **Status:** **EPIC CLOSED** · **prod 2.62.98** · commit **`aeecdc0`** · 2026-06-30  
> **SSOT baseline:** [`PROJECT-HANDOFF-CURRENT.md`](PROJECT-HANDOFF-CURRENT.md) · [`CURRENT-TASK.md`](../CURRENT-TASK.md)  
> **Closeout report:** [`audit/NG-02-EPIC-CLOSE-REPORT.md`](../audit/NG-02-EPIC-CLOSE-REPORT.md)

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Epic** | NG-02 Tender Automation Pipeline (+ 02.1A · 02.1B · 02.1C) |
| **Status** | **COMPLETED · CLOSED** |
| **Prod version** | **2.62.98** |
| **Prod commit** | **`aeecdc0`** |
| **Verify deploy** | **PASS** (`version.json`) |
| **Automated smoke** | **177 PASS / 0 FAIL** |
| **Outstanding production bugs** | **NONE** |

---

## 2. Co robi pipeline (dla agenta)

Po wejściu w przetarg V4 (`TenderDetailPage`) użytkownik **nie powinien** musieć klikać „Odśwież BZP” ani „Szukaj u zamawiającego” w happy path.

| Faza | Hook / lib | SSOT |
|------|------------|------|
| Bootstrap | `useTenderDocumentsBootstrap` | notice → discovery → external |
| Orchestrator | `runTenderFullDocumentDiscovery` | auto · manual · rescan |
| Gate | `deriveUnifiedAttachmentGate` | BZP + external + upload |
| Heavy | `useTenderDossierHeavyLazy` | `buildTenderDossierHeavy` |
| Kosztorys UX | `buildKosztorysProcessSession` | fazy e1–e6 |
| Pricing | `useTenderPricingAuto` | po `tenderDossierHeavyParseDone` |
| Trust | `useTenderTrustAssessment` | read-only overlay |
| Stan UI | `derivePipelineState` | `PipelineState` enum |

**Mount:** wyłącznie `TenderDetailPage` (V4). `TenderDetailPanel` = render-only (`pipelineRuntime` props). Legacy: `TenderDetailPanelHosted` — **DEPRECATED not REMOVED** · SSOT: [`docs/NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md`](NG-03-TENDER-DETAIL-PANEL-DEPRECATION.md) · Removal Checklist przed usunięciem kodu.

---

## 3. Releasy w epic

| Wersja | Label | Kluczowe pliki |
|--------|-------|----------------|
| **2.62.95** | NG-02 P0 | `useTenderPipelineRuntime.ts` · ARCHITECTURE § 12.1.23 |
| **2.62.96** | NG-02.1A Unified Attachment Gate | `unified-attachment-gate.ts` · § 12.1.24 |
| **2.62.97** | NG-02.1B Lifecycle | `tender-full-document-discovery.ts` · § 12.1.25 |
| **2.62.98** | NG-02.1C Bootstrap Fix | `useTenderDocumentsBootstrap.ts` · § 12.1.26 |

---

## 4. NG-02.1C — reguły bootstrap (★ ważne dla agentów)

Plik: `src/app/hooks/useTenderDocumentsBootstrap.ts`

1. **`discoveryCompletedIds`** — tylko gdy `countTenderAttachments > 0` po auto run.
2. **`clearStickyBootstrapStateForSettledEmpty`** — przy wejściu w przetarg (KV settled + 0 docs) kasuj session Sets.
3. **Apply-on-success** — orchestrator dostaje `isCancelled: () => false`; persist gate w bootstrap (authoritative BZP patch mimo cleanup effect).
4. **`pipelineBootstrapCompletedIds`** — tylko gdy heavy done **i** są załączniki (nie przy 0 docs).

**Nie naprawiaj** prod przez zmiany w `runTenderFullDocumentDiscovery` bez audytu — SSOT orchestratora jest wspólny z manual refresh.

---

## 5. Testy (obowiązkowe przy zmianach w pipeline)

```bash
npx vite-node scripts/test-tender-documents-bootstrap-retry.mjs    # T0–T12
npx vite-node scripts/test-tender-full-document-discovery.mjs
npx vite-node scripts/test-tender-dossier-heavy-lifecycle.mjs
npx vite-node scripts/test-tender-pipeline-automation-p0.mjs
npx vite-node scripts/test-unified-attachment-gate.mjs
```

Regresja szeroka (epic close): + `test-tender-kosztorys-process-health.mjs` · `test-smartpzp-mvp.mjs` · `test-tender-trust-ui-surface.mjs`

---

## 6. Znane ograniczenia (nie production bugs)

| Temat | Opis |
|-------|------|
| Retry kosztorysu | UI retry przy `Failed` / health stale≥90s — zamierzone |
| Prawdziwie pusty przetarg | Auto ponawia BZP przy każdym wejściu (settled-empty) — więcej Edge calls |
| Manual fallback | „Odśwież BZP” nadal dostępny — omija session guards |
| `retryNonce` discovery | Niepodłączony do bootstrap effect — backlog P3 |

---

## 7. Następny aktywny work (poza NG-02)

- **P0 Payroll Cloud Recovery** — OPEN (osobny epic)
- **Work Catalog P2** — na polecenie
- **PRICE-BRIDGE / SmartPZP deep** — osobny brief

**Nie rozpoczynaj** refaktoru `tender-pipeline-runner.ts` bez nowego epic + AUDIT.

---

## 8. Mapa ARCHITECTURE

| Sekcja | Temat |
|--------|-------|
| § 12.1.23 | NG-02 P0 runtime |
| § 12.1.24 | Unified Attachment Gate |
| § 12.1.25 | Discovery orchestrator + lifecycle |
| § 12.1.26 | Production bootstrap fix |
