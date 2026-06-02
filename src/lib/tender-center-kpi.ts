/**
 * Tender Center PRO — agregaty KPI rynku i pipeline (ETAP 2A).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  computePipelineFunnel,
  computeTendersDashboardStats,
  daysUntilTenderDeadline,
  isTenderOpenForOffers,
} from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";
import { computeWadiumInfo } from "@/lib/tenders-wadium";

const PREP_STATUSES = new Set(["interested", "preparing", "submitted"]);

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function bidValuePln(item: TenderPipelineItem): number | null {
  if (item.ourEstimatePln != null && item.ourEstimatePln > 0) return item.ourEstimatePln;
  const rec = item.tenderDossier?.bidProposal?.recommendedBidPln;
  if (rec != null && rec > 0) return rec;
  return null;
}

export interface TenderCenterMarketKpi {
  openTendersCount: number;
  actionableCount: number;
  urgentCount: number;
  preparingCount: number;
  interestedCount: number;
  submittedCount: number;
  marketValuePln: number;
  pipelineBidValuePln: number;
  wadiumRequiredPln: number;
  wadiumBlockedCount: number;
  wadiumHeadroomPln: number;
  maxWadiumPln: number;
  overloadIndex: number;
  winRate: number | null;
}

export function countPreparingOffers(items: TenderPipelineItem[]): number {
  return items.filter((i) => i.status === "preparing" || i.status === "interested").length;
}

export function aggregateMarketKpi(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
): TenderCenterMarketKpi {
  const dash = computeTendersDashboardStats(items);
  const funnel = computePipelineFunnel(items);
  const open = items.filter((i) => isTenderOpenForOffers(i.submittingOffersDate));
  const maxConcurrent = Math.max(profile.maxConcurrentProjects, 1);
  const preparingCount = countPreparingOffers(items);

  let marketValuePln = 0;
  let pipelineBidValuePln = 0;
  let wadiumRequiredPln = 0;
  let wadiumBlockedCount = 0;
  let maxWadiumInPrep = 0;

  for (const item of open) {
    const est = estimatedValuePlnFromItem(item, item.swzAnalysis ?? null);
    if (est != null) marketValuePln += est;

    if (PREP_STATUSES.has(item.status)) {
      const bid = bidValuePln(item);
      if (bid != null) pipelineBidValuePln += bid;
      const w = computeWadiumInfo(item, item.swzAnalysis ?? null, profile.maxWadiumPln);
      if (w.amountPln != null) {
        wadiumRequiredPln += w.amountPln;
        maxWadiumInPrep = Math.max(maxWadiumInPrep, w.amountPln);
        if (w.blocked) wadiumBlockedCount += 1;
      }
    }
  }

  const wadiumHeadroomPln = Math.max(0, profile.maxWadiumPln - maxWadiumInPrep);

  return {
    openTendersCount: open.length,
    actionableCount: dash.actionable,
    urgentCount: dash.urgent,
    preparingCount: items.filter((i) => i.status === "preparing").length,
    interestedCount: items.filter((i) => i.status === "interested").length,
    submittedCount: items.filter((i) => i.status === "submitted").length,
    marketValuePln: Math.round(marketValuePln),
    pipelineBidValuePln: Math.round(pipelineBidValuePln),
    wadiumRequiredPln: Math.round(wadiumRequiredPln),
    wadiumBlockedCount,
    wadiumHeadroomPln: Math.round(wadiumHeadroomPln),
    maxWadiumPln: profile.maxWadiumPln,
    overloadIndex: clamp(preparingCount / maxConcurrent, 0, 2),
    winRate: funnel.winRate,
  };
}

/** Wartość rynku otwartych przetargów z analizą SWZ/kosztorysu. */
export function sumOpenMarketValuePln(items: TenderPipelineItem[]): number {
  return Math.round(
    items
      .filter((i) => isTenderOpenForOffers(i.submittingOffersDate))
      .reduce((s, i) => s + (estimatedValuePlnFromItem(i, i.swzAnalysis ?? null) ?? 0), 0),
  );
}

/** Przetargi z terminem ≤7 dni (otwarte). */
export function countUrgentOpenTenders(items: TenderPipelineItem[], now = new Date()): number {
  return items.filter((i) => {
    const d = daysUntilTenderDeadline(i.submittingOffersDate, now);
    return isTenderOpenForOffers(i.submittingOffersDate, now) && d !== null && d >= 0 && d <= 7;
  }).length;
}
