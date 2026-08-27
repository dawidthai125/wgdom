/**
 * OWNER_EXTERNAL_SOURCE_EVIDENCE — Energospin electrical measurement rows.
 *
 * NOT a live HTTP capture. Owner-provided external read-only research (2026-08-27).
 * No invented KNR/tableCode · no 1205-05/06 first-next · no 1305-02.
 */

import {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  type ApfMarketEvidenceProvenance,
} from "./apf-pricing-basis";
import type { ApfAuthorizedSourceId } from "./apf-source-authorization";

export type ApfOwnerExternalSourceEvidenceRow = {
  evidenceId: string;
  provenance: ApfMarketEvidenceProvenance;
  sourceId: ApfAuthorizedSourceId;
  sourceUrl: "https://www.energospin.pl/cennik/";
  categoryKey: "electrical_measurement";
  descriptionPl: string;
  pricingBasis: typeof APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT;
  unitRatePln: number;
  currency: "PLN";
  netGross: "netto";
  laborOnly: true;
  observedAt: "2026-08-27";
  /** Explicit — source column label "Cena za pomiar". */
  sourcePriceLabelPl: "Cena za pomiar";
  tableCode: null;
  knrHint: null;
};

export const APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN: readonly ApfOwnerExternalSourceEvidenceRow[] =
  Object.freeze([
    Object.freeze({
      evidenceId: "owner-ext-energospin-impedancja-petli-zwarcia",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "energospin_pl",
      sourceUrl: "https://www.energospin.pl/cennik/",
      categoryKey: "electrical_measurement",
      descriptionPl: "Pomiar impedancji pętli zwarcia",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 5.0,
      currency: "PLN",
      netGross: "netto",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-energospin-rezystancja-izolacji-1f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "energospin_pl",
      sourceUrl: "https://www.energospin.pl/cennik/",
      categoryKey: "electrical_measurement",
      descriptionPl: "Pomiar rezystancji izolacji obwodów 1 fazowych",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10.0,
      currency: "PLN",
      netGross: "netto",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-energospin-rezystancja-izolacji-3f",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "energospin_pl",
      sourceUrl: "https://www.energospin.pl/cennik/",
      categoryKey: "electrical_measurement",
      descriptionPl: "Pomiar rezystancji izolacji obwodów 3 fazowych",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10.0,
      currency: "PLN",
      netGross: "netto",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-energospin-badanie-rcd",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "energospin_pl",
      sourceUrl: "https://www.energospin.pl/cennik/",
      categoryKey: "electrical_measurement",
      descriptionPl: "Badanie wyłączników różnicowoprądowych (RCD)",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 10.0,
      currency: "PLN",
      netGross: "netto",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
    Object.freeze({
      evidenceId: "owner-ext-energospin-rezystancja-uziemien",
      provenance: "OWNER_EXTERNAL_SOURCE_EVIDENCE",
      sourceId: "energospin_pl",
      sourceUrl: "https://www.energospin.pl/cennik/",
      categoryKey: "electrical_measurement",
      descriptionPl:
        "Pomiar rezystancji uziemień (ze schematem) (1 uziom)",
      pricingBasis: APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
      unitRatePln: 20.0,
      currency: "PLN",
      netGross: "netto",
      laborOnly: true,
      observedAt: "2026-08-27",
      sourcePriceLabelPl: "Cena za pomiar",
      tableCode: null,
      knrHint: null,
    }),
  ]);

/** Rows explicitly absent from Owner evidence — no fabrication. */
export const APF_ENERGOSPIN_EXPLICITLY_ABSENT_KNR_TABLES = Object.freeze([
  "1205-05",
  "1205-06",
  "1305-02",
] as const);
