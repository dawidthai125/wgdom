/**
 * Confidence MVP — pure builder (RO). formulaVersion = confidence-mvp-1.
 * DF: CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.
 */

import {
  CONFIDENCE_MVP_DISCLAIMER_PL,
  CONFIDENCE_MVP_FORMULA_VERSION,
  type ConfidenceBadgeModel,
  type ConfidenceBand,
  type ConfidenceDriver,
  type ConfidenceMvpInput,
  type ConfidenceReport,
} from "./types";

type FactorId =
  | "quote_coverage"
  | "mapping_coverage"
  | "s7_quality"
  | "pricing_confidence"
  | "smart_coverage"
  | "docs"
  | "bid_health";

type PresentFactor = {
  id: FactorId;
  weight: number;
  labelPl: string;
  factorScore: number;
  evidencePl: string;
};

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function bandFromScore(score: number): ConfidenceBand {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function bandLabelPl(band: ConfidenceBand): string {
  if (band === "high") return "Wysoka";
  if (band === "medium") return "Średnia";
  return "Niska";
}

function emptyReport(
  reason: string,
  computedAt: string,
  factorsUsed: string[] = [],
): ConfidenceReport {
  return {
    available: false,
    emptyReasonPl: reason,
    score0to100: 0,
    band: "low",
    drivers: [],
    disclaimerPl: CONFIDENCE_MVP_DISCLAIMER_PL,
    formulaVersion: CONFIDENCE_MVP_FORMULA_VERSION,
    computedAt,
    factorsUsed,
  };
}

function pricingScore(c: "high" | "medium" | "low"): number {
  if (c === "high") return 100;
  if (c === "medium") return 60;
  return 25;
}

function collectFactors(input: ConfidenceMvpInput): PresentFactor[] {
  const lineCount = input.lineCount;
  const factors: PresentFactor[] = [];

  const quotesPct = clamp01to100((input.quotesPricedCount / lineCount) * 100);
  factors.push({
    id: "quote_coverage",
    weight: 28,
    labelPl: "Pokrycie Quotes",
    factorScore: quotesPct,
    evidencePl: `Quotes: ${Math.round(quotesPct)}% linii (${input.quotesPricedCount}/${lineCount})`,
  });

  const mapPct = clamp01to100((input.mappedCount / lineCount) * 100);
  factors.push({
    id: "mapping_coverage",
    weight: 22,
    labelPl: "Mapowanie",
    factorScore: mapPct,
    evidencePl: `Mapowanie: ${Math.round(mapPct)}% linii (${input.mappedCount}/${lineCount})`,
  });

  if (input.s7QualityScore != null && Number.isFinite(input.s7QualityScore)) {
    const s7 = clamp01to100(input.s7QualityScore);
    factors.push({
      id: "s7_quality",
      weight: 18,
      labelPl: "S7 Quality",
      factorScore: s7,
      evidencePl: `AI Quality Score (S7): ${Math.round(s7)}/100`,
    });
  }

  if (input.averagePricingConfidence != null) {
    const pc = pricingScore(input.averagePricingConfidence);
    factors.push({
      id: "pricing_confidence",
      weight: 12,
      labelPl: "Pewność wyceny",
      factorScore: pc,
      evidencePl: `Średnia pewność AI Cost: ${input.averagePricingConfidence} → ${pc}`,
    });
  }

  if (input.smartMissingCount != null && Number.isFinite(input.smartMissingCount)) {
    const missing = Math.max(0, input.smartMissingCount);
    const smartPct = clamp01to100(100 - (missing / lineCount) * 100);
    const unmapped =
      input.smartMissingUnmappedCount != null && Number.isFinite(input.smartMissingUnmappedCount)
        ? Math.max(0, Math.round(input.smartMissingUnmappedCount))
        : null;
    factors.push({
      id: "smart_coverage",
      weight: 12,
      labelPl: "SMART Quotes",
      factorScore: smartPct,
      evidencePl:
        unmapped != null
          ? `SMART: brak useful Quotes ${missing}/${lineCount} (w tym unmapped ${unmapped})`
          : `SMART: brak useful Quotes ${missing}/${lineCount}`,
    });
  }

  const docsScore = clamp01to100(60 + (input.hasSwzSignal ? 40 : 0));
  factors.push({
    id: "docs",
    weight: 5,
    labelPl: "Dokumenty",
    factorScore: docsScore,
    evidencePl: input.hasSwzSignal
      ? "Kosztorys OK + sygnał SWZ"
      : "Kosztorys OK (brak sygnału SWZ)",
  });

  if (input.bidOk != null) {
    let bidScore: number;
    if (input.bidOk === false) {
      bidScore = 0;
    } else {
      const warnings = input.bidWarningCount ?? 0;
      bidScore = warnings >= 2 ? 50 : 100;
    }
    factors.push({
      id: "bid_health",
      weight: 3,
      labelPl: "Zdrowie Bid",
      factorScore: bidScore,
      evidencePl:
        input.bidOk === false
          ? "Bid Proposal: ok=false"
          : `Bid Proposal: ok · ostrzeżenia ${input.bidWarningCount ?? 0}`,
    });
  }

  return factors;
}

function buildDrivers(factors: PresentFactor[], weightSum: number): ConfidenceDriver[] {
  const drivers: ConfidenceDriver[] = factors.map((f) => {
    const impact = Math.round(((f.weight * (f.factorScore - 50)) / weightSum) * 10) / 10;
    const sign = impact >= 0 ? "(+)" : "(−)";
    return {
      id: f.id,
      labelPl: `${f.labelPl} ${sign}`,
      impact,
      evidencePl: f.evidencePl,
    };
  });
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return drivers.slice(0, 5);
}

/**
 * Pure — buduje ConfidenceReport. Nigdy nie mutuje inputu / Bid / OfferBoq.
 * Fail-soft: wyjątek → available=false.
 */
export function buildConfidenceReport(input: ConfidenceMvpInput): ConfidenceReport {
  const computedAt = input.computedAtIso || "1970-01-01T00:00:00.000Z";
  try {
    if (!input.hasKosztorysSnapshot) {
      return emptyReport("Brak poprawnego snapshotu kosztorysu.", computedAt);
    }
    if (!Number.isFinite(input.lineCount) || input.lineCount < 1) {
      return emptyReport("Brak pozycji kosztorysu.", computedAt);
    }

    const factors = collectFactors(input);
    const weightSum = factors.reduce((s, f) => s + f.weight, 0);
    if (weightSum <= 0) {
      return emptyReport("Brak czynników do oceny pewności.", computedAt);
    }

    const raw =
      factors.reduce((s, f) => s + f.weight * f.factorScore, 0) / weightSum;
    const score0to100 = Math.round(clamp01to100(raw));
    const band = bandFromScore(score0to100);
    const drivers = buildDrivers(factors, weightSum);

    return {
      available: true,
      emptyReasonPl: null,
      score0to100,
      band,
      drivers,
      disclaimerPl: CONFIDENCE_MVP_DISCLAIMER_PL,
      formulaVersion: CONFIDENCE_MVP_FORMULA_VERSION,
      computedAt,
      factorsUsed: factors.map((f) => f.id),
    };
  } catch {
    return emptyReport("Nie udało się wyliczyć pewności analizy.", computedAt);
  }
}

export function presentConfidenceBadgeModel(report: ConfidenceReport): ConfidenceBadgeModel {
  return {
    labelPl: "Pewność analizy",
    scoreDisplay: report.available ? `${report.score0to100}/100` : "—",
    band: report.band,
    bandLabelPl: report.available ? bandLabelPl(report.band) : "Niedostępna",
    titleAttr: report.disclaimerPl,
    formulaVersion: CONFIDENCE_MVP_FORMULA_VERSION,
  };
}
