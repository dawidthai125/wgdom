/**
 * Kontrakt Eksperta Oferty (Transparent Reasoning).
 */

import type {
  OfferExpertBlocker,
  OfferExpertConfidence,
  OfferExpertContract,
  OfferPcrAlignment,
  OfferPrimaryRecommendation,
} from "./types";

export function buildOfferExpertContract(opts: {
  handoffOk: boolean;
  handoffBlockersPl: string[];
  primary: OfferPrimaryRecommendation | null;
  costPewnosc: OfferExpertConfidence | null;
  costAligned: boolean;
}): OfferExpertContract {
  const { handoffOk, handoffBlockersPl, primary, costPewnosc, costAligned } = opts;

  const blockers: OfferExpertBlocker[] = [];
  if (!handoffOk) {
    blockers.push({
      code: "OFFER_NO_HANDOFF",
      messagePl: "Brak zielonego handoffu z Eksperta Kosztu — oferta nie startuje.",
    });
    for (const msg of handoffBlockersPl) {
      blockers.push({ code: "OFFER_COST_BLOCKER", messagePl: msg });
    }
  }
  if (handoffOk && !primary) {
    blockers.push({
      code: "OFFER_NO_PRIMARY",
      messagePl: "Handoff OK, lecz nie zbudowano rekomendacji głównej.",
    });
  }

  let pewnosc: OfferExpertConfidence = "low";
  if (handoffOk && primary) {
    if (costPewnosc === "high") pewnosc = "high";
    else if (costPewnosc === "medium") pewnosc = "medium";
    else pewnosc = "low";
  }

  let zgodnosc: OfferPcrAlignment = "not_aligned";
  let zgodnoscOpisPl = "Oferta nie stoi na domkniętym Real Cost / rozumieniu wykonania.";
  if (!handoffOk || !costAligned) {
    zgodnosc = "not_aligned";
    zgodnoscOpisPl =
      "Koszt/wykonanie nie są gotowe — nie wolno domykać oferty przetargowej.";
  } else if (pewnosc !== "high" || blockers.length > 0) {
    zgodnosc = "partial";
    zgodnoscOpisPl =
      "Oferta oparta o Real Cost z zastrzeżeniami pewności — Decydent powinien zweryfikować.";
  } else {
    zgodnosc = "aligned";
    zgodnoscOpisPl =
      "Rekomendowana oferta wynika z Real Cost zgodnego z łańcuchem wykonania/materiałów/kosztu.";
  }

  const co = primary
    ? `Rekomendowana cena ofertowa: ${primary.offerPricePln} PLN (strategia rekomendowana).`
    : "Brak rekomendacji ofertowej — handoff z Kosztu zablokowany lub niekompletny.";

  const dlaczego = primary
    ? `Offer Price = Real Cost (${primary.breakdown.realCostPln} PLN) + marża ${primary.breakdown.marginPct * 100}% (${primary.breakdown.marginPln} PLN) + rezerwa ryzyka ${primary.breakdown.riskPct * 100}% (${primary.breakdown.riskPln} PLN). Real Cost nie był przeliczany.`
    : "Bez domkniętego Real Cost Ekspert Oferty nie składa ceny dla inwestora.";

  const basis = [
    "CostExpertAnalysisResult (handoff)",
    primary ? `realCostPln=${primary.breakdown.realCostPln}` : "realCost=—",
    "strategia rekomendowana (RO)",
    "bez EE/ME/PE jako źródeł obliczeń",
    "bez tożsamości kalkulatora oferty · bez zapisu OfferBoq",
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
