/**
 * Scope Gap MVP — zbieranie wejścia RO z OfferBoq / item (call-only).
 * Zero mutacji dokumentu / Bid / Quotes / History.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { SmartPricingDetectSummary } from "@/lib/smart-pricing/types";
import { resolveInvestmentTemplate } from "./rules-mvp-1";
import type { ScopeGapMvpInput } from "./types";

/** Join opisów linii (+ tytuł) — blob obecności. */
export function buildPresentTextBlob(
  doc: OfferBoqDocument | null | undefined,
  title?: string | null,
): string {
  const parts: string[] = [];
  if (title?.trim()) parts.push(title.trim());
  if (doc?.lines?.length) {
    for (const line of doc.lines) {
      if (line.description?.trim()) parts.push(line.description.trim());
      if (line.workCategory?.trim()) parts.push(line.workCategory.trim());
    }
  }
  return parts.join("\n");
}

/** SWZ → znormalizowany tekst (reuse pól analizy; bez nowego parsera). */
export function buildSwzTextBlob(swz: TenderSwzAnalysis | null | undefined): string | null {
  if (!swz) return null;
  const parts: string[] = [];
  if (swz.referenceRequirement) parts.push(swz.referenceRequirement);
  if (swz.implementationDeadlineRaw) parts.push(swz.implementationDeadlineRaw);
  if (swz.qualificationHints?.length) parts.push(...swz.qualificationHints);
  if (swz.technicalRequirements?.length) parts.push(...swz.technicalRequirements);
  if (swz.tableExtracts?.length) parts.push(...swz.tableExtracts);
  if (swz.costLines?.length) {
    for (const c of swz.costLines) {
      if (c.description) parts.push(c.description);
    }
  }
  if (swz.profitabilityNote) parts.push(swz.profitabilityNote);
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : null;
}

export function smartMissingLineIdsFromDetect(
  smart: SmartPricingDetectSummary | null | undefined,
): string[] | null {
  if (!smart?.missingLines?.length) return null;
  return smart.missingLines.map((m) => m.lineId);
}

export function buildScopeGapMvpInput(opts: {
  doc: OfferBoqDocument | null | undefined;
  item: Pick<TenderPipelineItem, "title" | "priorityBuyerLabel" | "swzAnalysis">;
  smart: SmartPricingDetectSummary | null;
  computedAtIso: string;
}): ScopeGapMvpInput {
  const doc = opts.doc;
  const lineCount = doc?.lines?.length ?? 0;
  const categoryHints =
    doc?.lines
      ?.map((l) => l.workCategory)
      .filter(Boolean)
      .join(" ") ?? "";

  const template = resolveInvestmentTemplate({
    title: opts.item.title ?? "",
    priorityBuyerLabel: opts.item.priorityBuyerLabel,
    extraHints: categoryHints,
  });

  return {
    presentTextBlob: buildPresentTextBlob(doc, opts.item.title),
    investmentTemplate: template,
    hasOfferBoqLines: lineCount > 0,
    lineCount,
    swzTextBlob: buildSwzTextBlob(opts.item.swzAnalysis ?? null),
    smartMissingLineIds: smartMissingLineIdsFromDetect(opts.smart),
    computedAtIso: opts.computedAtIso,
  };
}
