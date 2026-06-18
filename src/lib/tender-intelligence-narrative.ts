/**
 * V3.1 Sprint 1 — jedno zdanie „O czym jest ten przetarg”.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { daysUntilTenderDeadline, isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { ExecutiveSummary } from "@/lib/tender-executive-summary";
import { resolvedTenderValuePln } from "@/lib/tender-data-ssot";

function narrativeFromExecutive(executive: ExecutiveSummary): string | null {
  if (executive.mainWorks.length > 0) {
    const works = executive.mainWorks.slice(0, 3).join(", ");
    return `Przetarg obejmuje m.in.: ${works}.`;
  }
  if (executive.headline?.trim()) return executive.headline.trim();
  return null;
}

function narrativeFromValue(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): string | null {
  const valuePln = resolvedTenderValuePln(item, swz);
  if (valuePln == null) return null;
  return `Szacowana wartość zamówienia: ${fmtPln(valuePln)}.`;
}

function narrativeFromDeadline(item: TenderPipelineItem): string | null {
  if (!item.submittingOffersDate) return null;
  const open = isTenderOpenForOffers(item.submittingOffersDate);
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const dateStr = new Date(item.submittingOffersDate).toLocaleDateString("pl-PL");
  if (!open) return `Termin składania ofert minął (${dateStr}).`;
  if (days != null && days >= 0) {
    return `Termin składania ofert: ${dateStr} (za ${days} dni).`;
  }
  return `Termin składania ofert: ${dateStr}.`;
}

/** SSOT fallback: scopeDescription → Executive Summary → title → value → deadline. */
export function buildTenderIntelligenceNarrative(
  item: TenderPipelineItem,
  executive?: ExecutiveSummary | null,
  swz?: TenderSwzAnalysis | null | undefined,
): string {
  const scope = item.tenderDossier?.brief?.scopeDescription?.trim();
  if (scope) return scope.endsWith(".") ? scope : `${scope}.`;

  if (executive) {
    const fromExec = narrativeFromExecutive(executive);
    if (fromExec) return fromExec;
  }

  const title = item.title?.trim();
  if (title) return title.endsWith(".") ? title : `${title}.`;

  const fromValue = narrativeFromValue(item, swz ?? item.swzAnalysis);
  if (fromValue) return fromValue;

  const fromDeadline = narrativeFromDeadline(item);
  if (fromDeadline) return fromDeadline;

  return "Brak opisu przedmiotu zamówienia.";
}
