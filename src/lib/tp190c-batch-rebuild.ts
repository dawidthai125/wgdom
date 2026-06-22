/**
 * TP190C-3B — batch rebuild stale tenderDossier → parserVersion=CURRENT.
 * Ścieżka zgodna z TenderDetailPanel.runAnalysis (analyze + dossierFromAnalysisResult).
 */

import { mergeBriefWithItemTitle, parseNoticeHtmlBrief } from "@/lib/tenders-bzp-brief";
import {
  analyzeTenderWithDossier,
  dossierFromAnalysisResult,
  type TenderDossierAnalysisResult,
} from "@/lib/tender-dossier-pipeline";
import { CURRENT_PARSER_VERSION } from "@/lib/tender-dossier-parser-version";
import { kosztorysEffectiveRowCount } from "@/lib/tender-dossier-merge";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

export type RebuildOutcome = "skipped" | "upgraded" | "unchanged" | "failed";

export interface RebuildSnapshot {
  parserVersion: number | null | undefined;
  rowCount: number;
  sourceFilename: string | null;
}

export function isStaleDossierCandidate(
  item: Pick<TenderPipelineItem, "tenderDossier">,
): boolean {
  const k = item.tenderDossier?.kosztorys;
  if (!k?.ok) return false;
  return item.tenderDossier?.parserVersion !== CURRENT_PARSER_VERSION;
}

export function snapshotRebuildState(
  item: Pick<TenderPipelineItem, "tenderDossier">,
): RebuildSnapshot | null {
  const k = item.tenderDossier?.kosztorys;
  if (!k?.ok) return null;
  return {
    parserVersion: item.tenderDossier?.parserVersion ?? null,
    rowCount: kosztorysEffectiveRowCount(k),
    sourceFilename: k.sourceFilename ?? null,
  };
}

/** upgraded = więcej rows lub inny (bogatszy) plik; unchanged = tylko stamp v3. */
export function classifyRebuildOutcome(
  before: RebuildSnapshot | null,
  after: RebuildSnapshot | null,
): Exclude<RebuildOutcome, "skipped" | "failed"> {
  if (!before || !after) return "unchanged";
  if (after.parserVersion !== CURRENT_PARSER_VERSION) return "unchanged";
  if (after.rowCount > before.rowCount) return "upgraded";
  if (after.sourceFilename !== before.sourceFilename) return "upgraded";
  return "unchanged";
}

export type RebuildTenderDeps = {
  analyze?: (opts: Parameters<typeof analyzeTenderWithDossier>[0]) => Promise<TenderDossierAnalysisResult>;
};

/** Pojedynczy rebuild — ten sam kontrakt co UI „Przeanalizuj dokumenty”. */
export async function rebuildTenderPipelineItem(
  item: TenderPipelineItem,
  deps?: RebuildTenderDeps,
): Promise<{
  item: TenderPipelineItem;
  before: RebuildSnapshot;
  after: RebuildSnapshot;
  outcome: Exclude<RebuildOutcome, "skipped">;
}> {
  const before = snapshotRebuildState(item);
  if (!before) {
    throw new Error("rebuildTenderPipelineItem: kosztorys.ok required");
  }

  const analyze = deps?.analyze ?? analyzeTenderWithDossier;
  const brief = item.tenderDossier?.brief
    ?? mergeBriefWithItemTitle(
      item.noticeHtml ? parseNoticeHtmlBrief(item.noticeHtml) : parseNoticeHtmlBrief(""),
      item.title,
    );

  const result = await analyze({
    noticeNumber: item.noticeNumber || undefined,
    tenderId: item.tenderId,
    bzpDocuments: item.bzpDocuments ?? [],
    noticeHtml: item.noticeHtml,
    ourEstimatePln: item.ourEstimatePln ?? null,
    existing: item.swzAnalysis ?? null,
    existingKosztorys: item.tenderDossier?.kosztorys ?? null,
    existingDossier: item.tenderDossier ?? null,
    tenderTitle: item.title,
  });

  const tenderDossier = dossierFromAnalysisResult(brief, result);
  const patch: Partial<TenderPipelineItem> = {
    swzAnalysis: result.analysis,
    tenderDossier,
    updatedAt: new Date().toISOString(),
  };
  if (result.estimatePln != null && item.ourEstimatePln == null) {
    patch.ourEstimatePln = result.estimatePln;
  }

  const updatedItem: TenderPipelineItem = { ...item, ...patch };
  const after = snapshotRebuildState(updatedItem);
  if (!after) {
    throw new Error("rebuildTenderPipelineItem: kosztorys lost after rebuild");
  }

  return {
    item: updatedItem,
    before,
    after,
    outcome: classifyRebuildOutcome(before, after),
  };
}

export interface BatchRebuildStats {
  processed: number;
  skipped: number;
  upgraded: number;
  unchanged: number;
  failed: number;
}

export interface BatchRebuildRow {
  id: string;
  bzpNumber: string;
  tenderId: string;
  outcome: RebuildOutcome;
  before: RebuildSnapshot;
  after: RebuildSnapshot;
  error?: string;
}

export interface BatchRebuildResult {
  stats: BatchRebuildStats;
  rows: BatchRebuildRow[];
  nextPipeline: TenderPipelineItem[];
  dryRun: boolean;
  wrote: boolean;
}

export async function runTp190cBatchRebuild(opts: {
  pipeline: TenderPipelineItem[];
  /** Domyślnie true — bez zapisu KV. */
  dryRun?: boolean;
  savePipeline?: (items: TenderPipelineItem[]) => Promise<void>;
  rebuildOne?: (item: TenderPipelineItem) => Promise<TenderPipelineItem>;
}): Promise<BatchRebuildResult> {
  const dryRun = opts.dryRun !== false;
  const stats: BatchRebuildStats = {
    processed: 0,
    skipped: 0,
    upgraded: 0,
    unchanged: 0,
    failed: 0,
  };
  const rows: BatchRebuildRow[] = [];
  const map = new Map(opts.pipeline.map((i) => [i.id, i]));

  for (const item of opts.pipeline) {
    if (!isStaleDossierCandidate(item)) {
      stats.skipped += 1;
      continue;
    }

    stats.processed += 1;
    const before = snapshotRebuildState(item)!;

    try {
      const rebuildFn = opts.rebuildOne
        ?? (async (it: TenderPipelineItem) => (await rebuildTenderPipelineItem(it)).item);
      const updated = await rebuildFn(item);
      const after = snapshotRebuildState(updated) ?? before;
      const qualityOutcome = classifyRebuildOutcome(before, after);
      stats[qualityOutcome] += 1;
      map.set(item.id, updated);
      rows.push({
        id: item.id,
        bzpNumber: item.bzpNumber,
        tenderId: item.tenderId,
        outcome: qualityOutcome,
        before,
        after,
      });
    } catch (e) {
      stats.failed += 1;
      const message = e instanceof Error ? e.message : String(e);
      rows.push({
        id: item.id,
        bzpNumber: item.bzpNumber,
        tenderId: item.tenderId,
        outcome: "failed",
        before,
        after: before,
        error: message,
      });
    }
  }

  const nextPipeline = opts.pipeline.map((i) => map.get(i.id) ?? i);
  let wrote = false;
  const successCount = stats.upgraded + stats.unchanged;
  if (!dryRun && successCount > 0 && opts.savePipeline) {
    await opts.savePipeline(nextPipeline);
    wrote = true;
  }

  return { stats, rows, nextPipeline, dryRun, wrote };
}
