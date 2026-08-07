/**
 * Aggregate RO — assembleChiefWireRuntimeRo.
 * Nie woła Chief · ekspertów · UI.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { buildChiefPricingOptionsRo } from "./catalog";
import { buildChiefCompanyCostRo } from "./company-cost";
import { buildChiefOfferBoqRo } from "./offer-boq";
import { buildChiefOfferStrategyParamsRo } from "./offer-strategy";
import type { ChiefWireAdapterGap, ChiefWireAdapterMeta, ChiefWireRuntimeRo } from "./types";

function freezeRuntime(ro: ChiefWireRuntimeRo): ChiefWireRuntimeRo {
  Object.freeze(ro.meta.sources);
  Object.freeze(ro.meta.gaps);
  Object.freeze(ro.meta);
  if (ro.pricing) {
    Object.freeze(ro.pricing.catalog);
    Object.freeze(ro.pricing);
  }
  Object.freeze(ro.offerStrategy.agresywny);
  Object.freeze(ro.offerStrategy.rekomendowany);
  Object.freeze(ro.offerStrategy.bezpieczny);
  Object.freeze(ro.offerStrategy);
  return Object.freeze(ro);
}

export function assembleChiefWireRuntimeRo(opts: {
  item: TenderPipelineItem | null;
  builtAtIso?: string;
}): ChiefWireRuntimeRo {
  const builtAtIso = opts.builtAtIso ?? new Date().toISOString();
  const gaps: ChiefWireAdapterGap[] = [];

  let offerBoq = null as ChiefWireRuntimeRo["offerBoq"];
  let offerBoqSource: ChiefWireAdapterMeta["sources"]["offerBoq"] = "unavailable";

  if (opts.item != null) {
    const boqPart = buildChiefOfferBoqRo({
      item: opts.item,
      builtAt: builtAtIso,
    });
    offerBoq = boqPart.offerBoq;
    offerBoqSource =
      boqPart.offerBoq != null
        ? "buildOfferBoqDocumentForPipelineItem"
        : "unavailable";
    gaps.push(...boqPart.gaps);
  } else {
    gaps.push({
      code: "OFFER_BOQ_UNAVAILABLE",
      field: "offerBoq",
      messagePl: "Brak pozycji przetargu (item == null) — OfferBoq niedostępny.",
      severity: "warn",
    });
  }

  const catalogPart = buildChiefPricingOptionsRo();
  gaps.push(...catalogPart.gaps);

  const companyPart = buildChiefCompanyCostRo();
  gaps.push(...companyPart.gaps);

  const strategyPart = buildChiefOfferStrategyParamsRo();
  gaps.push(...strategyPart.gaps);

  const meta: ChiefWireAdapterMeta = {
    builtAtIso,
    tenderPipelineItemId: opts.item?.id ?? null,
    sources: {
      offerBoq: offerBoqSource,
      catalog: catalogPart.source,
      companyProfile: "kw-tenders-company-profile",
      companyKnowledge: companyPart.companyKnowledge,
      offerStrategy: "offer-expert.defaultOfferStrategyParams",
    },
    gaps,
  };

  const readyForChiefInput =
    offerBoq != null &&
    offerBoq.lines.length > 0 &&
    catalogPart.pricing != null &&
    companyPart.company != null;

  return freezeRuntime({
    offerBoq,
    pricing: catalogPart.pricing,
    company: companyPart.company,
    offerStrategy: strategyPart.offerStrategy,
    meta,
    readyForChiefInput,
  });
}
