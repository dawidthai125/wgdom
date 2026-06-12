/**
 * P2-G.1C + P2-G.1E — jakość wyceny, etykiety źródła, podstawa kalkulacji.
 */

import type { TenderBidPricingMode, TenderBidProposal, TenderBidCostLine } from "@/lib/tenders-bid-calculator";

export type TenderBidQualityLevel = "high" | "good" | "medium" | "limited";

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
  good: "Dobra",
  medium: "Średnia",
  limited: "Ograniczona",
};

export const TENDER_UNKNOWN_REVIEW_ADVICE =
  "Warto przejrzeć pozycje niesklasyfikowane przed złożeniem oferty.";

export function getBidSourceLabel(pricingMode: TenderBidPricingMode | null | undefined): string | null {
  if (pricingMode === "catalog") return "Katalog WGDOM";
  if (pricingMode === "ath_priced") return "Kosztorys ATH";
  return null;
}

/** Pokrycie klasyfikacji (0–100) z ułamka UNKNOWN (0–1). */
export function coveragePercentFromUnknownFraction(catalogUnknownPct: number): number {
  return Math.max(0, Math.min(100, (1 - catalogUnknownPct) * 100));
}

export function shouldShowUnknownReviewAdvice(catalogUnknownFraction: number): boolean {
  return catalogUnknownFraction > 0.15;
}

function qualityLevelFromCoverage(coveragePct: number): TenderBidQualityLevel {
  if (coveragePct >= 95) return "high";
  if (coveragePct >= 85) return "good";
  if (coveragePct >= 70) return "medium";
  return "limited";
}

export function assessBidQuality(
  pricingMode: TenderBidPricingMode | null | undefined,
  catalogUnknownPct: number | null | undefined,
): TenderBidQualityInfo {
  if (pricingMode === "ath_priced") {
    return { level: "high", labelPl: QUALITY_LABELS.high };
  }
  if (pricingMode === "catalog") {
    const unknownFrac = catalogUnknownPct ?? 0;
    const coveragePct = coveragePercentFromUnknownFraction(unknownFrac);
    const level = qualityLevelFromCoverage(coveragePct);

    const detailParts: string[] = [];
    if (unknownFrac > 0) {
      detailParts.push(
        `${Math.round(unknownFrac * 100)}% pozycji niesklasyfikowanych · pokrycie ${coveragePct.toFixed(1)}%`,
      );
    } else {
      detailParts.push(`Pokrycie klasyfikacji ${coveragePct.toFixed(1)}%`);
    }
    if (shouldShowUnknownReviewAdvice(unknownFrac)) {
      detailParts.push(TENDER_UNKNOWN_REVIEW_ADVICE);
    }

    return {
      level,
      labelPl: QUALITY_LABELS[level],
      detailPl: detailParts.join(" · "),
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
