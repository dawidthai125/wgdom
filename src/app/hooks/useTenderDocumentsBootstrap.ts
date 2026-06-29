/**
 * Auto-bootstrap notice HTML + bzpDocuments + light SWZ + dossier shell.
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
import { buildExternalDiscoveryResult } from "@/lib/tender-external-discovery-apply";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";
import {
  canRunDocumentDiscovery,
  documentDiscoveryBootstrapKey,
  isDocumentDiscoverySettled,
  runTenderDocumentDiscovery,
} from "@/lib/tender-document-discovery";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";

/** Ukończony bootstrap — nie powtarzaj (sukces). */
const bootstrapCompletedIds = new Set<string>();
/** Trwająca próba — blokuj równoległe duplikaty. */
const bootstrapInflightIds = new Set<string>();

export function isTenderDocumentsBootstrapCompleted(itemId: string): boolean {
  return bootstrapCompletedIds.has(itemId);
}

export function resetTenderDocumentsBootstrapForItem(itemId: string): void {
  bootstrapCompletedIds.delete(itemId);
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

function shouldMarkBootstrapCompleted(item: TenderPipelineItem): boolean {
  if (!item.tenderId?.trim()) return true;
  if (!isDocumentDiscoverySettled(item)) return false;
  const gate = deriveUnifiedAttachmentGate(item);
  if (!gate.canStartHeavyParse && gate.totalAttachmentCount === 0) return true;
  return tenderDossierHeavyParseDone(item.tenderDossier);
}

/**
 * Jedna próba bootstrap dokumentów.
 * Guard completed ustawiany dopiero po sukcesie; przy błędzie sieci — retry możliwy (remount / tab).
 */
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

  if (bootstrapCompletedIds.has(item.id)) {
    return { ok: true };
  }
  if (bootstrapInflightIds.has(item.id)) {
    return { ok: false };
  }

  bootstrapInflightIds.add(item.id);
  try {
    const patch: Partial<TenderPipelineItem> = {};
    let html = item.noticeHtml ?? null;
    let docs = item.bzpDocuments ?? [];

    if (item.noticeNumber && !html) {
      const det = await deps.fetchTenderNoticeDetails(item.noticeNumber);
      if (!isCancelled()) {
        patch.tenderState = det.tenderState;
        patch.noticeHtml = det.htmlBody;
        patch.noticeHtmlFetchedAt = new Date().toISOString();
        html = det.htmlBody;
      }
    }

    const mergedForDiscovery: TenderPipelineItem = { ...item, ...patch };
    if (mergedForDiscovery.tenderId && !(mergedForDiscovery.bzpDocuments?.length)) {
      const discovery = await runTenderDocumentDiscovery(mergedForDiscovery, {
        fetchDocuments: (input) => deps.fetchTenderDocuments(input),
      });
      if (!isCancelled() && discovery.ran) {
        Object.assign(patch, discovery.patch);
        docs = discovery.docs;
      }
    }

    if (!isCancelled() && patch.bzpDocuments) {
      const merged = { ...item, ...patch };
      const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(
        merged,
        { documents: patch.bzpDocuments as typeof docs },
      );
      const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(
        merged,
        { documents: patch.bzpDocuments as typeof docs },
      );
      patch.changeMonitor = changeMonitor;
      patch.qaMonitor = qaMonitor;
      const totalNew = newEvents.length + newQaEvents.length;
      if (totalNew > 0) {
        toast.warning(`Wykryto ${totalNew} zmian${totalNew === 1 ? "ę" : "y"} w dokumentacji`);
      }
    }
    if (
      !isCancelled()
      && item.tenderId
      && docs.length === 0
      && !item.externalDocDiscovery?.builtAt
      && (html ?? item.noticeHtml)
    ) {
      try {
        onExternalRunning?.(true);
        const discovery = await deps.discoverExternalTenderDocs({
          tenderId: item.tenderId,
          noticeHtml: html ?? item.noticeHtml,
          organizationName: item.organizationName,
          priorityBuyerId: item.priorityBuyerId,
          title: item.title,
          bzpNumber: item.bzpNumber,
        });
        if (!isCancelled()) {
          if (discovery.files.length > 0) {
            const mergedBase = { ...item, ...patch };
            const { patch: extPatch, newEventCount } = await buildExternalDiscoveryResult(
              mergedBase,
              discovery,
            );
            Object.assign(patch, extPatch);
            if (newEventCount > 0) {
              toast.warning(`Wykryto ${newEventCount} zmian${newEventCount === 1 ? "ę" : "y"} w dokumentacji`);
            }
          } else {
            patch.externalDocDiscovery = discovery;
          }
        }
      } catch { /* auto external discover best-effort */ }
      finally {
        if (!isCancelled()) onExternalRunning?.(false);
      }
    }
    let swz = item.swzAnalysis ?? null;
    if (!swz && !isCancelled() && html) {
      const lightSwz = analyzeSwzFromNoticeHtmlOnly(html, item.ourEstimatePln ?? null);
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

    if (Object.keys(patch).length > 0 && !isCancelled()) {
      onUpdate(patch);
    }

    if (!isCancelled()) {
      const merged = { ...item, ...patch };
      if (shouldMarkBootstrapCompleted(merged)) {
        bootstrapCompletedIds.add(item.id);
      }
    }
    return { ok: true };
  } catch {
    bootstrapCompletedIds.delete(item.id);
    return { ok: false };
  } finally {
    bootstrapInflightIds.delete(item.id);
  }
}

export function useTenderDocumentsBootstrap(opts: {
  item: TenderPipelineItem;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  /** false = nie uruchamiaj. Domyślnie true (NG-02). */
  enabled?: boolean;
  /** Inkrementuj aby wymusić retry (NG-02-F). */
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
    if (bootstrapCompletedIds.has(item.id)) return;

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
    bootstrapKey,
    item.documentsFetchedAt,
    item.bzpDocuments?.length,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.scanSummary?.parsedAt,
    retryNonce,
  ]);

  return { autoRunning };
}

/** Test-only reset — nie używać w prod UI. */
export function resetTenderDocumentsBootstrapForTests(): void {
  bootstrapCompletedIds.clear();
  bootstrapInflightIds.clear();
}

/** Test-only — eksport SSOT gate. */
export { canRunDocumentDiscovery, isDocumentDiscoverySettled };
