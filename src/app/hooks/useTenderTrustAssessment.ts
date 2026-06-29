import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import {
  buildTenderTrustAssessment,
  type TenderTrustAssessment,
} from "@/lib/tender-trust-layer";

export function useTenderTrustAssessment(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  kosztorysSession?: KosztorysProcessSession;
  loadingDocs?: boolean;
}): TenderTrustAssessment {
  const { item, swz, kosztorysSession, loadingDocs } = opts;
  return useMemo(
    () => buildTenderTrustAssessment({
      item,
      swz,
      kosztorysSession,
      loadingDocs,
    }),
    [item, swz, kosztorysSession, loadingDocs],
  );
}
