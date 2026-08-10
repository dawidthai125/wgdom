/**
 * Ekspert Wykonania — punkt wejścia kompetencji (P0).
 *
 * TECHNOLOGY-LINE-BINDING-01:
 *   BOQ line → CostItemFamily → TechnologyPack (bound|unbound)
 *   → line-scoped projectBom → merge BOM
 * Unbound ≠ fallback to whole-tender ETICS.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import {
  deriveExecutionPlan,
  getPack,
  projectWorkBundle,
  runTechnologyFoundationPipeline,
  seedB0Fixtures,
  type BusinessProfileFixture,
} from "@/lib/technology-foundation";
import { decideTechnologyPack } from "@/lib/technology-foundation/decision-hooks";
import { detectExecutionGapsAndRisks } from "./gaps-and-risks";
import { buildExecutionExpertContract } from "./interpret";
import { offerBoqToBoqContextForPack } from "./offer-boq-adapter";
import { selectTechnologyPackForOfferBoq } from "./pack-selection";
import { analyzeTechnologyLineBindings } from "./technology-line-binding";
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
  const bindingResult = analyzeTechnologyLineBindings(doc);
  const { bindings, mergedBom, primaryPack, selection: bindingSelection } = bindingResult;

  // LINE-BINDING-01 path when at least one line is BOUND to an ACTIVE pack.
  if (bindingSelection && primaryPack && mergedBom) {
    const boqContext = offerBoqToBoqContextForPack(doc, bindingSelection.matchedLineIds);
    const plan = deriveExecutionPlan(primaryPack, boqContext);
    const bundle = projectWorkBundle(primaryPack, plan);
    const decision = decideTechnologyPack(primaryPack, biz);

    // Multi-pack: worst decision across distinct bound packs.
    let technologyDecision = decision.decision;
    const packKeys = new Set(
      bindings
        .filter((b) => b.bindStatus === "bound" && b.packId && b.packVersion)
        .map((b) => `${b.packId}@@${b.packVersion}`),
    );
    if (packKeys.size > 1) {
      for (const key of packKeys) {
        const [pid, pver] = key.split("@@");
        const p = getPack(pid!, pver!);
        if (!p) continue;
        const d = decideTechnologyPack(p, biz).decision;
        if (d === "deny") technologyDecision = "deny";
        else if (d === "degrade" && technologyDecision === "allow") technologyDecision = "degrade";
      }
    }

    const gapsAndRisks = detectExecutionGapsAndRisks({
      doc,
      pack: primaryPack,
      selection: bindingSelection,
      decision: { ...decision, decision: technologyDecision },
    });
    const contract = buildExecutionExpertContract({
      selection: bindingSelection,
      pack: primaryPack,
      decision: { ...decision, decision: technologyDecision },
      gapsAndRisks,
      tenderId: "tenderId" in doc ? doc.tenderId : undefined,
    });

    return {
      contract,
      selection: bindingSelection,
      technologyDecision,
      plan,
      bundle,
      bom: mergedBom,
      gapsAndRisks,
      pack: primaryPack,
      lineBindings: bindings,
    };
  }

  // No BOUND lines — do NOT fall back to whole-tender keyword pack (avoids painting→ETICS).
  // Still surface lineBindings for explainability; legacy selection only if zero bindings built.
  if (bindings.length > 0) {
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
      lineBindings: bindings,
    };
  }

  // Empty eligible lines — legacy single-pack path (pre-binding edge case).
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
      lineBindings: bindings,
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
      lineBindings: bindings,
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
    lineBindings: bindings,
  };
}
