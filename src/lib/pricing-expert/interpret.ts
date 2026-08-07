/**
 * P0.2 — kontrakt Eksperta Cen (Transparent Reasoning).
 */

import type {
  PricingExpertBlocker,
  PricingExpertConfidence,
  PricingExpertContract,
  PricingLineMarketAnalysis,
  PricingPcrAlignment,
} from "./types";

export function buildPricingExpertContract(opts: {
  lines: PricingLineMarketAnalysis[];
  materialCompleteness: string;
  materialAligned: boolean;
}): PricingExpertContract {
  const { lines, materialCompleteness, materialAligned } = opts;

  const blockers: PricingExpertBlocker[] = [];
  const priced = lines.filter((l) => l.marketPricePln != null);
  const highRisk = lines.filter((l) => l.priceRisk === "high");
  const unmapped = lines.filter((l) => !l.mappedWorkId);

  for (const l of unmapped) {
    blockers.push({
      code: "PRICE_NO_MAP",
      messagePl: `Brak mapowania Market Quote dla „${l.namePl}” (${l.materialKey}).`,
      materialKey: l.materialKey,
    });
  }
  for (const l of lines) {
    if (l.mappedWorkId && l.marketPricePln == null) {
      blockers.push({
        code: "PRICE_NO_QUOTE",
        messagePl: `Brak ceny rynkowej dla zmapowanego „${l.namePl}”.`,
        materialKey: l.materialKey,
      });
    }
  }
  if (materialCompleteness === "niekompletny") {
    blockers.push({
      code: "PRICE_ME_INCOMPLETE",
      messagePl: "Ekspert Materiałów zgłosił system niekompletny — ocena rynku ograniczona.",
    });
  }

  let pewnosc: PricingExpertConfidence = "low";
  if (priced.length === lines.length && lines.length > 0 && highRisk.length === 0) {
    pewnosc = "high";
  } else if (priced.length > 0) {
    pewnosc = "medium";
  }

  let zgodnosc: PricingPcrAlignment = "not_aligned";
  let zgodnoscOpisPl =
    "Ceny rynkowe nie są spięte ze spójnym zestawem materiałów / rozumieniem wykonania.";
  if (!materialAligned || materialCompleteness === "niekompletny") {
    zgodnosc = "not_aligned";
    zgodnoscOpisPl =
      "Materiał / wykonanie nie są wystarczająco zgodne — Market Price nie powinien domykać wyceny.";
  } else if (blockers.length > 0 || highRisk.length > 0) {
    zgodnosc = "partial";
    zgodnoscOpisPl =
      "Częściowa ocena rynku: część pozycji bez Quote / z wysokim ryzykiem cenowym.";
  } else {
    zgodnosc = "aligned";
    zgodnoscOpisPl =
      "Ceny rynkowe dotyczą materiałów zgodnych z rozumieniem wykonania (wejście z ME).";
  }

  const co =
    lines.length === 0
      ? "Brak pozycji materiałowych do wyceny rynkowej."
      : `Ocena Market Price dla ${priced.length}/${lines.length} pozycji` +
        (highRisk.length ? `; wysokie ryzyko cenowe: ${highRisk.length}` : "") +
        ".";

  const dlaczego =
    "Analiza wyłącznie warstwy rynkowej (marketQuotes / resolve / freshness / coverage / PriceHistory). " +
    "Bez companyPrice jako Market, bez Real Cost i bez oferty.";

  const basis = [
    "MaterialExpertAnalysisResult",
    `pozycje: ${lines.length}`,
    `z ceną rynkową: ${priced.length}`,
    "REUSE computeMarketAverage / resolveOriginMarketQuote",
    "REUSE MarketCoverage + freshness (okno)",
    "REUSE PriceHistory (trend RO)",
  ].join(" · ");

  return {
    co,
    dlaczego,
    naPodstawieCzego: basis,
    pewnosc,
    blokery: blockers,
    zgodnoscZRozumieniemWykonania: zgodnosc,
    zgodnoscOpisPl,
  };
}
