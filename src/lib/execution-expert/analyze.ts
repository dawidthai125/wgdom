/**
 * Ekspert Wykonania — punkt wejścia kompetencji (P0).
 *
 * Architektura:
 *   Ekspert Wykonania
 *    ├─ analizuje przedmiar (OfferBoq)
 *    ├─ dobiera technologię (Pack)
 *    ├─ wykorzystuje Technology Foundation (narzędzie)
 *    ├─ interpretuje wyniki
 *    └─ zwraca pełny kontrakt eksperta
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import {
  getPack,
  runTechnologyFoundationPipeline,
  seedB0Fixtures,
  type BusinessProfileFixture,
} from "@/lib/technology-foundation";
import { detectExecutionGapsAndRisks } from "./gaps-and-risks";
import { buildExecutionExpertContract } from "./interpret";
import { offerBoqToBoqContextForPack } from "./offer-boq-adapter";
import { selectTechnologyPackForOfferBoq } from "./pack-selection";
import type {
  ExecutionExpertAnalysisResult,
  ExecutionExpertBusinessProfile,
} from "./types";

/** Profil domyślny pokrywający fixtures B0 (ETICS + kostka) — do testów / P0. */
export function defaultExecutionExpertBusinessProfile(): ExecutionExpertBusinessProfile {
  return {
    companyCapabilityIds: [
      "cap.external_thermal_insulation",
      "cap.substrate_prep",
      "cap.finishing_coat",
      "cap.paving_cubes",
    ],
    availableEquipmentKeys: ["eq.scaffold", "eq.mixer", "eq.compactor"],
  };
}

function ensureFixturesSeeded(): void {
  seedB0Fixtures();
}

/**
 * Główna czynność domenowa Eksperta Wykonania.
 * Zwraca kontrakt dopiero po analizie (Behavior: brak teatru).
 */
export function analyzeExecutionFromOfferBoq(
  doc: OfferBoqDocument | Pick<OfferBoqDocument, "lines" | "tenderId">,
  profile?: ExecutionExpertBusinessProfile | BusinessProfileFixture,
): ExecutionExpertAnalysisResult {
  ensureFixturesSeeded();

  const biz = profile ?? defaultExecutionExpertBusinessProfile();
  const selection = selectTechnologyPackForOfferBoq(doc);

  if (!selection) {
    const gapsAndRisks = detectExecutionGapsAndRisks({
      doc,
      pack: null,
      selection: null,
      decision: null,
    });
    const contract = buildExecutionExpertContract({
      selection: null,
      pack: null,
      decision: null,
      gapsAndRisks,
      tenderId: "tenderId" in doc ? doc.tenderId : undefined,
    });
    return {
      contract,
      selection: null,
      technologyDecision: null,
      plan: null,
      bundle: null,
      bom: null,
      gapsAndRisks,
      pack: null,
    };
  }

  const pack = getPack(selection.packId, selection.packVersion) ?? null;
  if (!pack) {
    const gapsAndRisks = detectExecutionGapsAndRisks({
      doc,
      pack: null,
      selection,
      decision: null,
    });
    const contract = buildExecutionExpertContract({
      selection,
      pack: null,
      decision: null,
      gapsAndRisks,
      tenderId: "tenderId" in doc ? doc.tenderId : undefined,
    });
    return {
      contract,
      selection,
      technologyDecision: null,
      plan: null,
      bundle: null,
      bom: null,
      gapsAndRisks,
      pack: null,
    };
  }

  const boqContext = offerBoqToBoqContextForPack(doc, selection.matchedLineIds);
  const pipeline = runTechnologyFoundationPipeline(pack, boqContext, biz);
  const gapsAndRisks = detectExecutionGapsAndRisks({
    doc,
    pack,
    selection,
    decision: pipeline.decision,
  });
  const contract = buildExecutionExpertContract({
    selection,
    pack,
    decision: pipeline.decision,
    gapsAndRisks,
    tenderId: "tenderId" in doc ? doc.tenderId : undefined,
  });

  return {
    contract,
    selection,
    technologyDecision: pipeline.decision.decision,
    plan: pipeline.plan,
    bundle: pipeline.bundle,
    bom: pipeline.bom,
    gapsAndRisks,
    pack,
  };
}
