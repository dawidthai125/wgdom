/**
 * Auto-bootstrap notice HTML + bzpDocuments + light SWZ + dossier shell.
 * SSOT for TenderDetailPanel mount i bezpośredniego wejścia V4 /kosztorys.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type TenderPipelineItem,
  fetchTenderDocuments,
  fetchTenderNoticeDetails,
} from "@/lib/tenders-bzp";
import { parseNoticeHtmlBrief, mergeBriefWithItemTitle } from "@/lib/tenders-bzp-brief";
import { analyzeSwzFromNoticeHtmlOnly } from "@/lib/tender-dossier-pipeline";
import { discoverExternalTenderDocs } from "@/lib/tender-external-docs";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";

/** Ukończony bootstrap — nie powtarzaj (sukces). */
const bootstrapCompletedIds = new Set<string>();
/** Trwająca próba — blokuj równoległe duplikaty. */
const bootstrapInflightIds = new Set<string>();

export function isTenderDocumentsBootstrapCompleted(itemId: string): boolean {
  return bootstrapCompletedIds.has(itemId);
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

/**
 * Jedna próba bootstrap dokumentów.
 * Guard completed ustawiany dopiero po sukcesie; przy błędzie sieci — retry możliwy (remount / tab).
 */
export async function attemptTenderDocumentsBootstrap(opts: {
  item: TenderPipelineItem;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  isCancelled?: () => boolean;
  deps?: Partial<TenderDocumentsBootstrapDeps>;
}): Promise<{ ok: boolean }> {
  const { item, onUpdate, isCancelled = () => false, deps: depsOverride } = opts;
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
    if (item.tenderId && !docs.length) {
      docs = await deps.fetchTenderDocuments(item.tenderId, item.noticeNumber || undefined);
      if (!isCancelled()) {
        patch.bzpDocuments = docs;
        patch.documentsFetchedAt = new Date().toISOString();
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
        const discovery = await deps.discoverExternalTenderDocs({
          tenderId: item.tenderId,
          noticeHtml: html ?? item.noticeHtml,
          organizationName: item.organizationName,
          priorityBuyerId: item.priorityBuyerId,
          title: item.title,
          bzpNumber: item.bzpNumber,
        });
        if (!isCancelled()) {
          patch.externalDocDiscovery = discovery;
        }
      } catch { /* auto external discover best-effort */ }
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
      bootstrapCompletedIds.add(item.id);
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
  /** false = nie uruchamiaj (np. V4 tab bez potrzeby docs). Domyślnie true. */
  enabled?: boolean;
}): { autoRunning: boolean } {
  const { item, onUpdate, enabled = true } = opts;
  const [autoRunning, setAutoRunning] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;
    if (bootstrapCompletedIds.has(item.id)) return;

    let cancelled = false;
    setAutoRunning(true);
    void attemptTenderDocumentsBootstrap({
      item,
      onUpdate: (patch) => onUpdateRef.current(patch),
      isCancelled: () => cancelled,
    }).finally(() => {
      if (!cancelled) setAutoRunning(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per item id when enabled
  }, [enabled, item.id]);

  return { autoRunning };
}

/** Test-only reset — nie używać w prod UI. */
export function resetTenderDocumentsBootstrapForTests(): void {
  bootstrapCompletedIds.clear();
  bootstrapInflightIds.clear();
}
