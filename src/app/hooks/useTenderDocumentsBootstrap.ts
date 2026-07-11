/**
 * Auto-bootstrap notice HTML + discovery (SSOT orchestrator) + light SWZ + dossier shell.
 * SSOT mount: TenderDetailPage (NG-02 useTenderPipelineRuntime).
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  fetchTenderDocuments,
  fetchTenderNoticeDetails,
} from "@/lib/tenders-bzp";
import { parseNoticeHtmlBrief, mergeBriefWithItemTitle } from "@/lib/tenders-bzp-brief";
import { analyzeSwzFromNoticeHtmlOnly, tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { discoverExternalTenderDocs } from "@/lib/tender-external-docs";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import {
  canRunDocumentDiscovery,
  documentDiscoveryBootstrapKey,
  isDocumentDiscoverySettled,
} from "@/lib/tender-document-discovery";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";
import {
  runTenderFullDocumentDiscovery,
  isExternalDiscoverySettled,
  type TenderFullDiscoveryResult,
} from "@/lib/tender-pipeline/tender-full-document-discovery";
import { markPipelineTimingStage } from "@/lib/tender-pipeline/tender-pipeline-timing";

/** Discovery phase ukończona — nie powtarzaj orchestratora. */
const discoveryCompletedIds = new Set<string>();
/** Pełny bootstrap (heavy lub brak załączników) — nie powtarzaj hook effect. */
const pipelineBootstrapCompletedIds = new Set<string>();
/** Trwająca próba — blokuj równoległe duplikaty. */
const bootstrapInflightIds = new Set<string>();

export function isTenderDiscoveryCompleted(itemId: string): boolean {
  return discoveryCompletedIds.has(itemId);
}

export function isTenderDocumentsBootstrapCompleted(itemId: string): boolean {
  return pipelineBootstrapCompletedIds.has(itemId);
}

export function resetDiscoveryPhaseForItem(itemId: string): void {
  discoveryCompletedIds.delete(itemId);
}

export function resetPipelineBootstrapForItem(itemId: string): void {
  pipelineBootstrapCompletedIds.delete(itemId);
}

export function resetTenderDocumentsBootstrapForItem(itemId: string): void {
  discoveryCompletedIds.delete(itemId);
  pipelineBootstrapCompletedIds.delete(itemId);
  bootstrapInflightIds.delete(itemId);
}

export type TenderDocumentsBootstrapDeps = {
  fetchTenderNoticeDetails: typeof fetchTenderNoticeDetails;
  fetchTenderDocuments: typeof fetchTenderDocuments;
  discoverExternalTenderDocs: typeof discoverExternalTenderDocs;
};

const defaultDeps: TenderDocumentsBootstrapDeps = {
  fetchTenderNoticeDetails,
  fetchTenderDocuments,
  discoverExternalTenderDocs,
};

/** NG-02.1C — KV settled + 0 załączników: nie trzymaj sticky session guards. */
function isSettledEmptyAttachments(item: TenderPipelineItem): boolean {
  return isDocumentDiscoverySettled(item) && countTenderAttachments(item) === 0;
}

function clearStickyBootstrapStateForSettledEmpty(item: TenderPipelineItem): void {
  if (!isSettledEmptyAttachments(item)) return;
  discoveryCompletedIds.delete(item.id);
  pipelineBootstrapCompletedIds.delete(item.id);
}

function hasAuthoritativeDiscoveryPatch(discovery: TenderFullDiscoveryResult): boolean {
  return discovery.meta.bzpRan && discovery.meta.bzpDocCount > 0;
}

function shouldMarkDiscoveryCompleted(item: TenderPipelineItem): boolean {
  if (!item.tenderId?.trim()) return true;
  if (!isDocumentDiscoverySettled(item)) return false;
  const gate = deriveUnifiedAttachmentGate(item);
  if (gate.totalAttachmentCount > 0) return true;
  if (!canRunDocumentDiscovery(item)) return true;
  return isExternalDiscoverySettled(item);
}

function shouldMarkPipelineBootstrapCompleted(item: TenderPipelineItem): boolean {
  if (!item.tenderId?.trim()) return true;
  if (!shouldMarkDiscoveryCompleted(item)) return false;
  const gate = deriveUnifiedAttachmentGate(item);
  if (gate.totalAttachmentCount === 0) return false;
  return tenderDossierHeavyParseDone(item.tenderDossier);
}

/**
 * Jedna próba bootstrap dokumentów.
 * Discovery przez runTenderFullDocumentDiscovery (SSOT).
 */
export function tryMarkPipelineBootstrapCompleted(item: TenderPipelineItem): void {
  if (shouldMarkPipelineBootstrapCompleted(item)) {
    pipelineBootstrapCompletedIds.add(item.id);
  }
}

export async function attemptTenderDocumentsBootstrap(opts: {
  item: TenderPipelineItem;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  isCancelled?: () => boolean;
  deps?: Partial<TenderDocumentsBootstrapDeps>;
  onExternalRunning?: (running: boolean) => void;
}): Promise<{ ok: boolean }> {
  const {
    item,
    onUpdate,
    isCancelled = () => false,
    deps: depsOverride,
    onExternalRunning,
  } = opts;
  const deps = { ...defaultDeps, ...depsOverride };

  clearStickyBootstrapStateForSettledEmpty(item);

  if (pipelineBootstrapCompletedIds.has(item.id)) {
    return { ok: true };
  }
  if (bootstrapInflightIds.has(item.id)) {
    return { ok: false };
  }

  bootstrapInflightIds.add(item.id);
  try {
    const patch: Partial<TenderPipelineItem> = {};
    let html = item.noticeHtml ?? null;
    let discoveryResult: TenderFullDiscoveryResult | null = null;

    if (!discoveryCompletedIds.has(item.id)) {
      onExternalRunning?.(true);
      try {
        const discovery = await runTenderFullDocumentDiscovery(item, {
          mode: "auto",
          prefetchNotice: true,
          includeExternal: true,
          // NG-02.1C: orchestrator kończy fetch; persist gate'ujemy w bootstrap (nie w SSOT).
          isCancelled: () => false,
          deps,
        });
        discoveryResult = discovery;
        const applyDiscovery = !isCancelled() || hasAuthoritativeDiscoveryPatch(discovery);
        if (applyDiscovery) {
          Object.assign(patch, discovery.patch);
          html = patch.noticeHtml ?? item.noticeHtml ?? null;
          if (!isCancelled()) {
            const totalNew = discovery.meta.changeEventCount + discovery.meta.qaEventCount
              + discovery.meta.externalNewEventCount;
            if (totalNew > 0) {
              toast.warning(`Wykryto ${totalNew} zmian${totalNew === 1 ? "ę" : "y"} w dokumentacji`);
            }
          }
        }
      } finally {
        onExternalRunning?.(false);
      }
    }

    let swz = item.swzAnalysis ?? null;
    if (!swz && !isCancelled() && html) {
      markPipelineTimingStage(item.id, "discovery.light_swz", "start");
      const lightSwz = analyzeSwzFromNoticeHtmlOnly(html, item.ourEstimatePln ?? null);
      markPipelineTimingStage(item.id, "discovery.light_swz", "end");
      if (lightSwz) {
        swz = lightSwz;
        patch.swzAnalysis = lightSwz;
      }
    }

    if (!item.tenderDossier && !isCancelled()) {
      const brief = mergeBriefWithItemTitle(
        html ? parseNoticeHtmlBrief(html) : parseNoticeHtmlBrief(""),
        item.title,
      );
      patch.tenderDossier = {
        brief,
        kosztorys: null,
        builtAt: new Date().toISOString(),
      };
    }

    const mergedForCount = { ...item, ...patch };
    const shouldPersist =
      !isCancelled()
      || (discoveryResult != null && hasAuthoritativeDiscoveryPatch(discoveryResult))
      || countTenderAttachments(mergedForCount) > 0;

    if (Object.keys(patch).length > 0 && shouldPersist) {
      markPipelineTimingStage(item.id, "discovery.persist_shell", "start");
      onUpdate(patch);
      markPipelineTimingStage(item.id, "discovery.persist_shell", "end");
    }

    const canMarkComplete =
      !isCancelled()
      || (discoveryResult != null && hasAuthoritativeDiscoveryPatch(discoveryResult));

    if (canMarkComplete) {
      const merged = mergedForCount;
      if (countTenderAttachments(merged) > 0 && shouldMarkDiscoveryCompleted(merged)) {
        discoveryCompletedIds.add(item.id);
      }
      if (shouldMarkPipelineBootstrapCompleted(merged)) {
        pipelineBootstrapCompletedIds.add(item.id);
      }
    }
    return { ok: true };
  } catch {
    discoveryCompletedIds.delete(item.id);
    pipelineBootstrapCompletedIds.delete(item.id);
    return { ok: false };
  } finally {
    bootstrapInflightIds.delete(item.id);
  }
}

export function useTenderDocumentsBootstrap(opts: {
  item: TenderPipelineItem;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  enabled?: boolean;
  retryNonce?: number;
  onExternalRunning?: (running: boolean) => void;
}): { autoRunning: boolean } {
  const {
    item,
    onUpdate,
    enabled = true,
    retryNonce = 0,
    onExternalRunning,
  } = opts;
  const [autoRunning, setAutoRunning] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const bootstrapKey = documentDiscoveryBootstrapKey(item);

  useEffect(() => {
    if (!enabled) return;
    clearStickyBootstrapStateForSettledEmpty(item);
    if (pipelineBootstrapCompletedIds.has(item.id)) return;

    let cancelled = false;
    setAutoRunning(true);
    void attemptTenderDocumentsBootstrap({
      item,
      onUpdate: (patch) => onUpdateRef.current(patch),
      isCancelled: () => cancelled,
      onExternalRunning,
    }).finally(() => {
      if (!cancelled) setAutoRunning(false);
    });

    return () => { cancelled = true; };
  }, [
    enabled,
    item.id,
    bootstrapKey,
    retryNonce,
  ]);

  return { autoRunning };
}

export function resetTenderDocumentsBootstrapForTests(): void {
  discoveryCompletedIds.clear();
  pipelineBootstrapCompletedIds.clear();
  bootstrapInflightIds.clear();
}

export { canRunDocumentDiscovery, isDocumentDiscoverySettled };
