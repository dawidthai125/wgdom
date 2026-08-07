/**
 * Chief Orchestrator — gaty (tylko odczyt sygnałów ekspertów).
 */

import type { CostExpertAnalysisResult } from "@/lib/cost-expert";
import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type { OfferExpertAnalysisResult } from "@/lib/offer-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";

export type ChiefGateId = "G-EE" | "G-ME" | "G-PE-LOOP" | "G-COST" | "G-OFFER";

export interface ChiefGateVerdict {
  gate: ChiefGateId;
  pass: boolean;
  reasonPl: string;
}

function alignmentOk(z: string): boolean {
  return z === "aligned" || z === "partial";
}

export function gateExecution(ee: ExecutionExpertAnalysisResult): ChiefGateVerdict {
  const z = ee.contract.zgodnoscZRozumieniemWykonania;
  if (!alignmentOk(z)) {
    return {
      gate: "G-EE",
      pass: false,
      reasonPl: `G-EE FAIL: zgodność wykonania = ${z}`,
    };
  }
  return { gate: "G-EE", pass: true, reasonPl: "G-EE PASS" };
}

export function gateMaterials(me: MaterialExpertAnalysisResult): ChiefGateVerdict {
  const z = me.contract.zgodnoscZRozumieniemWykonania;
  if (!alignmentOk(z)) {
    return {
      gate: "G-ME",
      pass: false,
      reasonPl: `G-ME FAIL: zgodność materiałów = ${z}`,
    };
  }
  return { gate: "G-ME", pass: true, reasonPl: "G-ME PASS" };
}

/** Czy wejść w LOOP PE→ME (nie jest to FAIL — to sygnał pętli). */
export function gatePricingNeedsReturn(pe: PricingExpertAnalysisResult): boolean {
  return pe.returnToMaterialExpert === true;
}

export function gateCost(cost: CostExpertAnalysisResult): ChiefGateVerdict {
  if (cost.handoffToOfferExpert !== true || cost.offerHandoffPayload == null) {
    return {
      gate: "G-COST",
      pass: false,
      reasonPl:
        cost.handoffBlockersPl?.[0] ??
        "G-COST FAIL: brak handoffToOfferExpert / offerHandoffPayload",
    };
  }
  return { gate: "G-COST", pass: true, reasonPl: "G-COST PASS" };
}

export function gateOffer(offer: OfferExpertAnalysisResult): ChiefGateVerdict {
  if (offer.signalToDecisionMaker !== true || offer.decisionMakerPayload == null) {
    return {
      gate: "G-OFFER",
      pass: false,
      reasonPl: "G-OFFER FAIL: brak sygnału do Decydenta",
    };
  }
  return { gate: "G-OFFER", pass: true, reasonPl: "G-OFFER PASS" };
}
