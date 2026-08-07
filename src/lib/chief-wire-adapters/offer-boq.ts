/**
 * OfferBoq RO — wrap REUSE buildOfferBoqDocumentForPipelineItem.
 * READ ONLY · zero write · zero domeny.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { buildOfferBoqDocumentForPipelineItem } from "@/lib/tender-offer-boq-explainability";
import type { BuildChiefOfferBoqRoResult, ChiefWireAdapterGap } from "./types";

export function buildChiefOfferBoqRo(opts: {
  item: TenderPipelineItem;
  builtAt?: string;
}): BuildChiefOfferBoqRoResult {
  const offerBoq = buildOfferBoqDocumentForPipelineItem({
    item: opts.item,
    builtAt: opts.builtAt,
  });
  const gaps: ChiefWireAdapterGap[] = [];
  if (offerBoq == null) {
    gaps.push({
      code: "OFFER_BOQ_UNAVAILABLE",
      field: "offerBoq",
      messagePl: "Brak OfferBoq RO (brak snapshotu kosztorysu lub linii przedmiaru).",
      severity: "warn",
    });
  }
  return { offerBoq, gaps };
}
