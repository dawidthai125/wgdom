# SESSION HANDOFF — Discovery dokumentów (Variant B)

> **Status:** **CLOSED** · **prod `e2d899a`** · **v2.62.63** · **2026-06-25**

---

## Problem

Bootstrap wołał `fetchTenderDocuments` bez `noticeNumber` / `noticeHtml` → Edge zwracał 0 docs → ustawiał `documentsFetchedAt` → fałszywy komunikat SmartPZP i brak retry po pojawieniu się anchor.

## Rozwiązanie

**SSOT:** `src/lib/tender-document-discovery.ts`

- `canRunDocumentDiscovery(item)` — bramka przed fetch
- `runTenderDocumentDiscovery()` — jedna ścieżka discovery
- `isDocumentDiscoverySettled(item)` — kiedy bootstrap uznany za zakończony
- `documentDiscoveryBootstrapKey(item)` — deps hooka bootstrap

**Zmienione:** `useTenderDocumentsBootstrap.ts`, `TenderDetailPanel.tsx`, `tender-change-monitor.ts`, `tenders-bzp.ts` (`noticeHtml` do Edge).

## Test

```bash
npx vite-node scripts/test-tender-documents-bootstrap-retry.mjs
```

## Powiązane

- **2.62.64** — Kosztorys UX fazy procesu (`SESSION-HANDOFF-KOSZTORYS-PROCESS-UX-P0.md`) — używa `autoRunning` z tego samego bootstrapu.
