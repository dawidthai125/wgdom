/**
 * AI-DOC-DETECTION — model Doc.D1/D2/D3 (Thin DF).
 * DF: AI-DOC-DETECTION-THIN-DESIGN-FREEZE-01
 */

export type DocDetectionLayer = "D1" | "D2" | "D3";

export const DOC_DETECTION_ALIAS_VERSION = "doc-detection-alias-1" as const;
export const DOC_DETECTION_COPY_VERSION = "doc-detection-ux-1" as const;

export const DOC_LAYER_LABEL_PL: Record<DocDetectionLayer, string> = {
  D1: "Przedmiar",
  D2: "Dokumenty wspierające",
  D3: "Kosztorys ofertowy",
};

/** Doc.D2 podtyp — kosztorys inwestorski (ceny zamawiającego). */
export const DOC_D2_INVESTOR_COST_LABEL_PL = "Kosztorys inwestorski";
