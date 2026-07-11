# NG11-P0 — Discovery Unification · CLOSEOUT

> **Program:** NG11-TENDER-PIPELINE-PERFORMANCE (slice P0)  
> **Prod:** UI **2.65.1** · https://www.wgdom.fun · **PRODUCTION VERIFIED**  
> **SSOT audit:** audyt sesji NG11-P0 (Discovery Unification AUDIT)  
> **Release verify:** [`NG11-P0-RELEASE-VERIFICATION.md`](./NG11-P0-RELEASE-VERIFICATION.md)

---

## Werdykt

| Pole | Wartość |
|------|---------|
| **Status** | **SLICE CLOSED** · **PRODUCTION VERIFIED** |
| **OWNER QA** | **PASS** |
| **RCA harness** | **12/12 PASS** |
| **Rollback** | Revert feature commit (brak migracji KV) |

---

## Problem (RCA)

Manual „Odśwież BZP” znajdował dokumenty natychmiast; Autonomous/bootstrap używał innej ścieżki (force policy, session guards, stale `item` w intelligence) → fałszywy „brak dokumentów”.

---

## Rozwiązanie

| Element | Status |
|---------|--------|
| `discoverTenderDocumentsSSOT()` | **DONE** |
| `runManualBzpDocumentDiscovery()` (force=true) | **DONE** |
| Orchestrator → SSOT core | **DONE** |
| `discoveryMergedItem` (P0-C2) | **DONE** |
| Persist discovery przed shell (P0-C3) | **DONE** |
| Guards retry przy 0 załącznikach | **DONE** |
| `test-ng11-p0-discovery-unification.mjs` | **DONE** |

---

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `tender-document-discovery-ssot.ts` | SSOT BZP fetch + monitory |
| `tender-full-document-discovery.ts` | Wrapper external + prefetch + fork |
| `useTenderDocumentsBootstrap.ts` | Auto bootstrap + persist order |
| `useTenderPipelineRuntime.ts` | `discoveryMergedItem` |
| `TenderDetailPage.tsx` / `TenderDetailPanel.tsx` | Intelligence wire |

---

## Następny krok

**STABILIZATION WINDOW** — brak nowego programu bez Owner GO · opcjonalnie **NG11-Q4** (Edge).
