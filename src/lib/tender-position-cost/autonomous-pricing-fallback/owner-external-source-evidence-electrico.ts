/**
 * OWNER_EXTERNAL_SOURCE_EVIDENCE — Electrico secondary measurement rows.
 * Owner-provided external read-only research (2026-08-27).
 */

import {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  type ApfMarketEvidenceProvenance,
} from "./apf-pricing-basis";
import type { ApfAuthorizedSourceId } from "./apf-source-authorization";

export type ApfOwnerExternalSourceEvidenceRowElectrico = {
  evidenceId: string;
  provenance: ApfMarketEvidenceProvenance;
  sourceId: ApfAuthorizedSourceId;
  sourceUrl: "https://electrico-pomiary.pl/cennik/";
  categoryKey: "electrical_measurement_secondary";
  descriptionPl: string;
  pricingBasis: typeof APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT;
  unitRatePln: number;
  currency: "PLN";
  netGross: "unknown";
  laborOnly: true;
  observedAt: "2026-08-27";
  sourcePriceLabelPl: "Cena za pomiar";
  tableCode: null;
  knrHint: null;
};

export const APF_OWNER_EXTERNAL_EVIDENCE_ELECTRICO: readonly ApfOwnerExternalSourceEvidenceRowElectrico[] =
  Object.freeze([
    Object.freeze({
      evidenceId: "owner-ext-electrico-petla-zwarcia-1f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar pętli zwarcia obwodu 1-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 5,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-izolacja-1f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar rezystancji izolacji obwodu 1-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 5,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-petla-zwarcia-3f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar pętli zwarcia obwodu 3-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-izolacja-3f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar rezystancji izolacji obwodu 3-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-rcd-1f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar wyłącznika RCD obwodu 1-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-rcd-3f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl: "Pomiar wyłącznika RCD obwodu 3-fazowego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-uziemienie",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl:
        "Pomiar rezystancji uziemienia odgromowego lub ochronnego",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 30,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-electrico-ciaglosc",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "electrico_pomiary_pl",
      sourceUrl: "https://electrico-pomiary.pl/cennik/",
      categoryKey: "electrical_measurement_secondary",
      descriptionPl:
        "Pomiar ciągłości przewodów ochronnych i połączeń wyrównawczych",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 5,
      currency: "PLN",
      netGross: "unknown",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
  ]);

export const APF_ELECTRICO_EXPLICITLY_ABSENT_KNR_TABLES = Object.freeze([
  "1305-01",
  "1305-02",
] as const);
