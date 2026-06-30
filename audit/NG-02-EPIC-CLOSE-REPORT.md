# NG-02 — Tender Automation Pipeline EPIC CLOSE REPORT

> **Status dokumentu:** **FINAL** · **Epic NG-02 (seria 02 → 02.1C) = CLOSED**  
> **Data closeout:** 2026-06-30  
> **Production:** **2.62.98** · commit **`aeecdc0`** · **PRODUCTION VERIFIED**  
> **SSOT techniczny:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) § 12.1.23–12.1.26  
> **Handoff sesji:** [`docs/SESSION-HANDOFF-NG-02-EPIC-CLOSE.md`](../docs/SESSION-HANDOFF-NG-02-EPIC-CLOSE.md)

---

## 1. Executive summary

Epic **NG-02** dostarcza automatyczny pipeline przetargu po otwarciu `TenderDetailPage` (V4): discovery dokumentów → external → heavy parse → kosztorys → pricing → trust → `PipelineState.Ready`. Seria pod-epiców **02.1A–1C** stabilizuje bramkę załączników, lifecycle orchestratora i prod bootstrap.

| Pole | Wartość |
|------|---------|
| **Epic** | NG-02 Tender Automation Pipeline |
| **Status epic** | **CLOSED** |
| **Wersje prod** | **2.62.95** → **2.62.98** |
| **Mount SSOT** | `TenderDetailPage` → `useTenderPipelineRuntime` |
| **Outstanding prod bugs** | **NONE** (po 02.1C) |

---

## 2. Timeline releasów

| Etap | Wersja | Commit | Zakres | Status |
|------|--------|--------|--------|--------|
| **NG-02 P0** | 2.62.95 | (seria) | `useTenderPipelineRuntime` · bootstrap · heavy lazy · pricing auto · `PipelineState` | **RELEASED** |
| **NG-02.1A** | 2.62.96 | `7536aa1` | `deriveUnifiedAttachmentGate` · external-only heavy | **RELEASED** |
| **NG-02.1B** | 2.62.97 | `301de0e` | `runTenderFullDocumentDiscovery` SSOT · heavy inflight fix · retry scopes | **RELEASED** |
| **NG-02.1C** | 2.62.98 | `aeecdc0` | prod bootstrap fix — sticky guards · settled-empty reset · apply-on-success | **RELEASED** |

---

## 3. Pipeline flow (prod)

```text
mount TenderDetailPage (enabled: Boolean(item))
  → useTenderDocumentsBootstrap
      → runTenderFullDocumentDiscovery(mode: auto)   [BZP + external]
  → deriveUnifiedAttachmentGate
  → useTenderDossierHeavyLazy (buildTenderDossierHeavy)
  → useTenderPricingAuto (computeTenderBidProposal)
  → useTenderTrustAssessment
  → derivePipelineState → Ready
```

**PipelineState:** `Idle` → `Notice` → `Discovery` → `External` → `Heavy` → `Pricing` → `Ready` | `Failed`

---

## 4. Incydent prod (02.1C) — zamknięty

| | |
|---|---|
| **Objaw** | Auto discovery nie pobierało dokumentów; manual „Odśwież BZP” działał natychmiast |
| **RCA** | Sticky session Sets (`discoveryCompletedIds`, `pipelineBootstrapCompletedIds`) + apply-on-success przy effect cleanup |
| **Fix** | 02.1C — `useTenderDocumentsBootstrap.ts` only |
| **Regresja** | T9–T12 w `test-tender-documents-bootstrap-retry.mjs` |

---

## 5. Metryki closeout

| Metryka | Wartość |
|---------|---------|
| **Releasy serii** | **4** (02 · 02.1A · 02.1B · 02.1C) |
| **Pliki SSOT runtime** | `useTenderPipelineRuntime.ts` · `useTenderDocumentsBootstrap.ts` · `useTenderDossierHeavyLazy.ts` · `tender-full-document-discovery.ts` · `unified-attachment-gate.ts` |
| **Testy regresji (epic close audit)** | **177 PASS / 0 FAIL** |
| **Prod verify** | `version.json` → **2.62.98** / **aeecdc0** |

### Komendy testów (copy-paste)

```bash
npx vite-node scripts/test-tender-pipeline-automation-p0.mjs
npx vite-node scripts/test-tender-documents-bootstrap-retry.mjs
npx vite-node scripts/test-tender-full-document-discovery.mjs
npx vite-node scripts/test-tender-dossier-heavy-lifecycle.mjs
npx vite-node scripts/test-unified-attachment-gate.mjs
npx vite-node scripts/test-tender-kosztorys-process-health.mjs
npx vite-node scripts/test-smartpzp-mvp.mjs
npx vite-node scripts/test-tender-trust-ui-surface.mjs
```

---

## 6. Świadome wykluczenia / backlog P3 (nie blokuje epic)

| ID | Temat | Uwagi |
|----|-------|-------|
| P3-1 | `retryNonce` niepodłączony do bootstrap | `retryTenderPipelinePhase("discovery")` bez re-trigger effect |
| P3-2 | `bootstrapInflightIds` → `{ok:false}` przy równoległym attempt | rzadki race; częściowo mitigowany 02.1C |
| P3-3 | Orchestrator bez abort po unmount | fetch może dokończyć po wyjściu z przetargu |
| P3-4 | Session Sets bez TTL | rośnie per odwiedzony przetarg w sesji SPA |
| P3-5 | `tender-pipeline-runner.ts` / unified orchestrator | planowane P1 — **nie** w scope NG-02 |

**Retry kosztorysu** (Failed / stale / timeout) — **by design**, nie bug epic.

---

## 7. Nie zmieniać bez briefu

- `runTenderFullDocumentDiscovery` policy (force / external) — zmiany tylko z audytem
- `deriveUnifiedAttachmentGate` / `buildHeavyParseDocumentSet`
- `buildTenderTrustAssessment` reguły
- Parsery · merge dossier · `cloud-sync.ts` · Edge

---

## 8. Werdykt

**EPIC NG-02: CLOSED · PRODUCTION STABLE · GO**

Następna praca nad przetargiem — **nowy epic** z osobnym AUDIT (np. PRICE-BRIDGE, SmartPZP deep, P3 payroll).
