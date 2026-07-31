/**
 * AI-DOC-DETECTION — prezentacja dossier.kosztorys → Doc.D1/D2 (bez rename KV).
 */

import {
  DOC_D2_INVESTOR_COST_LABEL_PL,
  DOC_LAYER_LABEL_PL,
  type DocDetectionLayer,
} from "./types";

export type CostStatusForDocPresentation =
  | "FOUND_WITH_VALUE"
  | "FOUND_NO_VALUE"
  | "NOT_FOUND";

export interface DossierDocPresentation {
  /** Warstwa bazowa snapshotu. */
  primaryLayer: DocDetectionLayer;
  /** Etykieta UI (nie nazwa pola KV). */
  primaryLabelPl: string;
  /** Chip Doc.D2 gdy FOUND_WITH_VALUE. */
  supportingLabelPl: string | null;
}

/**
 * Mapuje ResolvedCostStatus → etykiety Doc.* (pole techniczne `kosztorys` bez zmian).
 */
export function mapDossierKosztorysPresentation(
  status: CostStatusForDocPresentation,
): DossierDocPresentation {
  if (status === "FOUND_WITH_VALUE") {
    return {
      primaryLayer: "D1",
      primaryLabelPl: DOC_LAYER_LABEL_PL.D1,
      supportingLabelPl: DOC_D2_INVESTOR_COST_LABEL_PL,
    };
  }
  if (status === "FOUND_NO_VALUE") {
    return {
      primaryLayer: "D1",
      primaryLabelPl: DOC_LAYER_LABEL_PL.D1,
      supportingLabelPl: null,
    };
  }
  return {
    primaryLayer: "D1",
    primaryLabelPl: DOC_LAYER_LABEL_PL.D1,
    supportingLabelPl: null,
  };
}
