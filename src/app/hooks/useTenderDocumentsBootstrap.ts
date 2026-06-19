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

const bootstrapRanIds = new Set<string>();

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
    if (bootstrapRanIds.has(item.id)) return;
    bootstrapRanIds.add(item.id);

    let cancelled = false;
    (async () => {
      setAutoRunning(true);
      const patch: Partial<TenderPipelineItem> = {};
      let html = item.noticeHtml ?? null;
      let docs = item.bzpDocuments ?? [];
      try {
        if (item.noticeNumber && !html) {
          const det = await fetchTenderNoticeDetails(item.noticeNumber);
          if (!cancelled) {
            patch.tenderState = det.tenderState;
            patch.noticeHtml = det.htmlBody;
            patch.noticeHtmlFetchedAt = new Date().toISOString();
            html = det.htmlBody;
          }
        }
        if (item.tenderId && !docs.length) {
          docs = await fetchTenderDocuments(item.tenderId, item.noticeNumber || undefined);
          if (!cancelled) {
            patch.bzpDocuments = docs;
            patch.documentsFetchedAt = new Date().toISOString();
          }
        }
        if (!cancelled && patch.bzpDocuments) {
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
          !cancelled
          && item.tenderId
          && docs.length === 0
          && !item.externalDocDiscovery?.builtAt
          && (html ?? item.noticeHtml)
        ) {
          try {
            const discovery = await discoverExternalTenderDocs({
              tenderId: item.tenderId,
              noticeHtml: html ?? item.noticeHtml,
              organizationName: item.organizationName,
              priorityBuyerId: item.priorityBuyerId,
              title: item.title,
              bzpNumber: item.bzpNumber,
            });
            if (!cancelled) {
              patch.externalDocDiscovery = discovery;
            }
          } catch { /* auto external discover best-effort */ }
        }
        let swz = item.swzAnalysis ?? null;
        if (!swz && !cancelled && html) {
          const lightSwz = analyzeSwzFromNoticeHtmlOnly(html, item.ourEstimatePln ?? null);
          if (lightSwz) {
            swz = lightSwz;
            patch.swzAnalysis = lightSwz;
          }
        }

        if (!item.tenderDossier && !cancelled) {
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

        if (Object.keys(patch).length > 0 && !cancelled) {
          onUpdateRef.current(patch);
        }
      } catch {
        /* auto-analiza best-effort */
      } finally {
        if (!cancelled) setAutoRunning(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per item id when enabled
  }, [enabled, item.id]);

  return { autoRunning };
}

/** Test-only reset — nie używać w prod UI. */
export function resetTenderDocumentsBootstrapForTests(): void {
  bootstrapRanIds.clear();
}
