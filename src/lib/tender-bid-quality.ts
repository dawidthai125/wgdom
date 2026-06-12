/**
 * P2-G.1C — jakość wyceny, etykiety źródła, podstawa kalkulacji.
 */

import type { TenderBidPricingMode, TenderBidProposal, TenderBidCostLine } from "@/lib/tenders-bid-calculator";

export type TenderBidQualityLevel = "high" | "medium" | "limited";

export interface TenderBidCalculationBasis {
  laborPln: number;
  materialPln: number;
  indirectPln: number;
  riskPln: number;
  executionCostPln: number;
}

export interface TenderBidQualityInfo {
  level: TenderBidQualityLevel;
  labelPl: string;
  detailPl?: string;
}

const QUALITY_LABELS: Record<TenderBidQualityLevel, string> = {
  high: "Wysoka",
  medium: "Średnia",
  limited: "Ograniczona",
};

export function getBidSourceLabel(pricingMode: TenderBidPricingMode | null | undefined): string | null {
  if (pricingMode === "catalog") return "Katalog WGDOM";
  if (pricingMode === "ath_priced") return "Kosztorys ATH";
  return null;
}

export function assessBidQuality(
  pricingMode: TenderBidPricingMode | null | undefined,
  catalogUnknownPct: number | null | undefined,
): TenderBidQualityInfo {
  if (pricingMode === "ath_priced") {
    return { level: "high", labelPl: QUALITY_LABELS.high };
  }
  if (pricingMode === "catalog") {
    const pct = catalogUnknownPct ?? 0;
    if (pct > 0.15) {
      return {
        level: "limited",
        labelPl: QUALITY_LABELS.limited,
        detailPl: `${Math.round(pct * 100)}% pozycji niesklasyfikowanych`,
      };
    }
    return {
      level: "medium",
      labelPl: QUALITY_LABELS.medium,
      detailPl: "Przedmiar ATH bez cen — katalog WGDOM",
    };
  }
  return { level: "limited", labelPl: QUALITY_LABELS.limited };
}

function linePln(lines: TenderBidCostLine[], match: RegExp): number {
  const hit = lines.find((l) => match.test(l.label));
  return hit?.pln ?? 0;
}

export function extractCalculationBasis(proposal: TenderBidProposal): TenderBidCalculationBasis | null {
  if (!proposal.ok || proposal.costPricePln == null) return null;
  const lines = proposal.costStack;
  const laborPln = linePln(lines, /robocizn/i);
  const materialPln = linePln(lines, /materia/i);
  const kp = linePln(lines, /\bkp\b|pośredn/i);
  const ancillary = linePln(lines, /poboczne/i);
  const overhead = linePln(lines, /stałe firmy|kzP/i);
  const profit = linePln(lines, /zysk/i);
  const riskPln = linePln(lines, /ryzyka/i);
  const indirectPln = kp + ancillary + overhead + profit;
  return {
    laborPln,
    materialPln,
    indirectPln,
    riskPln,
    executionCostPln: proposal.costPricePln,
  };
}

export function enrichBidProposalMeta(
  proposal: TenderBidProposal,
  catalogUnknownPct?: number | null,
): TenderBidProposal {
  if (!proposal.ok) return proposal;
  const quality = assessBidQuality(proposal.pricingMode, catalogUnknownPct ?? proposal.catalogUnknownPct);
  return {
    ...proposal,
    sourceLabelPl: getBidSourceLabel(proposal.pricingMode),
    qualityLevel: quality.level,
    qualityLabelPl: quality.labelPl,
    qualityDetailPl: quality.detailPl,
    catalogUnknownPct: catalogUnknownPct ?? proposal.catalogUnknownPct ?? null,
    calculationBasis: extractCalculationBasis(proposal),
  };
}

export const TENDER_BID_DISCLAIMER =
  "Autorska wycena WGDOM. Nie zastępuje profesjonalnego kosztorysu ofertowego.";
