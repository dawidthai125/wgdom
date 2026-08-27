/**
 * Qualify OWNER_EXTERNAL_SOURCE_EVIDENCE rows against APF BOQ lines.
 * Design gate only — not wired to live labor port.
 */

import {
  isApfBoqUnitQualifiedByPricingBasis,
  isApfForbiddenUnitProxyForMeasurement,
} from "./apf-pricing-basis";
import type { ApfOwnerExternalSourceEvidenceRow } from "./owner-external-source-evidence-energospin";
import type { ApfResearchQuery } from "./types";

export type ApfExternalEvidenceQualifyResult =
  | { ok: true; evidenceId: string; pricingBasis: "PER_MEASUREMENT" }
  | {
      ok: false;
      reason:
        | "FORBIDDEN_UNIT_PROXY"
        | "PRICING_BASIS_MISMATCH"
        | "BOQ_UNIT_NOT_QUALIFIED"
        | "NOT_OWNER_EXTERNAL_EVIDENCE";
      messagePl: string;
    };

export function qualifyApfOwnerExternalEvidenceRow(input: {
  row: ApfOwnerExternalSourceEvidenceRow;
  query: Pick<ApfResearchQuery, "unit" | "description">;
}): ApfExternalEvidenceQualifyResult {
  const { row, query } = input;

  if (row.provenance !== "OWNER_EXTERNAL_SOURCE_EVIDENCE") {
    return {
      ok: false,
      reason: "NOT_OWNER_EXTERNAL_EVIDENCE",
      messagePl: "Dowód musi mieć provenance OWNER_EXTERNAL_SOURCE_EVIDENCE.",
    };
  }

  if (isApfForbiddenUnitProxyForMeasurement(query.unit)) {
    return {
      ok: false,
      reason: "FORBIDDEN_UNIT_PROXY",
      messagePl: `Unit proxy zabroniony dla APF measurement (unit=${query.unit}).`,
    };
  }

  if (row.pricingBasis !== "PER_MEASUREMENT") {
    return {
      ok: false,
      reason: "PRICING_BASIS_MISMATCH",
      messagePl: "Wymagana pricingBasis PER_MEASUREMENT.",
    };
  }

  if (
    !isApfBoqUnitQualifiedByPricingBasis({
      boqUnit: query.unit,
      pricingBasis: row.pricingBasis,
      sourceDescriptionPl: row.descriptionPl,
    })
  ) {
    return {
      ok: false,
      reason: "BOQ_UNIT_NOT_QUALIFIED",
      messagePl:
        `BOQ unit=${query.unit} nie kwalifikuje się do wiersza źródła bez jawnego mapowania.`,
    };
  }

  return {
    ok: true,
    evidenceId: row.evidenceId,
    pricingBasis: "PER_MEASUREMENT",
  };
}
