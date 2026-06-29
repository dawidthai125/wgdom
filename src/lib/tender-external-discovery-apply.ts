/**
 * NG-02 — SSOT merge external discovery + parse (wspólne: bootstrap auto + manual UI).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { mergeBriefWithItemTitle, parseNoticeHtmlBrief } from "@/lib/tenders-bzp-brief";
import { mergeSwzAnalysis, parseExternalTenderDocuments } from "@/lib/tender-document-resolver";
import { mergeExternalDiscoveryDossierPatch } from "@/lib/tender-dossier-external-discovery";
import { pickBetterKosztorys } from "@/lib/tender-dossier-merge";
import { existingKosztorysForRebuildPick } from "@/lib/tender-dossier-parser-version";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";

/**
 * Buduje patch po external discovery (z opcjonalnym parse plików).
 * Ta sama heurystyka co TenderDetailPanel.applyExternalDiscovery.
 */
export async function buildExternalDiscoveryResult(
  item: TenderPipelineItem,
  discovery: TenderExternalDocDiscovery,
): Promise<{ patch: Partial<TenderPipelineItem>; newEventCount: number }> {
  let swzMerged = item.swzAnalysis ?? null;
  let kosztorysSnap = item.tenderDossier?.kosztorys ?? null;
  let estimatePln = item.ourEstimatePln ?? null;
  const brief = item.tenderDossier?.brief
    ?? mergeBriefWithItemTitle(
      item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
      item.title,
    );

  const patch: Partial<TenderPipelineItem> = { externalDocDiscovery: discovery };

  if (discovery.files.length > 0) {
    const relevantFiles = discovery.files.filter(
      (f) => f.isSwzHint || f.fromNotice || (f.matchedTender !== false && f.score >= 20),
    );
    const toParse = relevantFiles.length > 0 ? relevantFiles : discovery.files.slice(0, 2);
    const extParsed = await parseExternalTenderDocuments(
      toParse.map((f) => ({
        filename: f.filename,
        score: f.score,
        publicUrl: f.publicUrl,
      })),
      { ourEstimatePln: estimatePln, existingSwz: swzMerged ?? undefined },
    );
    const existingK = existingKosztorysForRebuildPick(item.tenderDossier, item.tenderDossier?.kosztorys);
    const freshK = extParsed.kosztorys?.ok ? extParsed.kosztorys : null;
    if (existingK || freshK) {
      kosztorysSnap = pickBetterKosztorys(existingK, freshK)
        ?? freshK
        ?? existingK
        ?? kosztorysSnap;
    }
    if (extParsed.swzFromDoc) {
      const missingValue = swzMerged?.estimatedValuePln == null;
      const missingWadium = swzMerged?.wadiumPln == null;
      if (missingValue || missingWadium || !swzMerged) {
        swzMerged = mergeSwzAnalysis(swzMerged, extParsed.swzFromDoc);
      }
    }
    if (extParsed.estimatePln != null && estimatePln == null) {
      estimatePln = extParsed.estimatePln;
    }
  }

  patch.tenderDossier = mergeExternalDiscoveryDossierPatch(item.tenderDossier, {
    brief,
    kosztorys: kosztorysSnap,
    builtAt: new Date().toISOString(),
  });
  if (swzMerged) patch.swzAnalysis = swzMerged;
  if (estimatePln != null && item.ourEstimatePln == null) patch.ourEstimatePln = estimatePln;

  const merged = { ...item, ...patch };
  const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(
    merged,
    { externalDocDiscovery: discovery },
  );
  const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(
    merged,
    { externalDocDiscovery: discovery },
  );
  patch.changeMonitor = changeMonitor;
  patch.qaMonitor = qaMonitor;

  return { patch, newEventCount: newEvents.length + newQaEvents.length };
}

/** Zwraca sam patch (bootstrap). */
export async function applyExternalDiscoveryPatch(
  item: TenderPipelineItem,
  discovery: TenderExternalDocDiscovery,
): Promise<Partial<TenderPipelineItem>> {
  const { patch } = await buildExternalDiscoveryResult(item, discovery);
  return patch;
}
