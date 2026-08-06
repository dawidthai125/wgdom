/**
 * End-to-end B0 pipeline: Pack + Boq → Plan → Bundle → BOM → validate → decide.
 */

import { decideTechnologyPack } from "./decision-hooks";
import { deriveExecutionPlan } from "./execution-plan";
import { projectBom } from "./project-bom";
import { projectWorkBundle } from "./project-work-bundle";
import type {
  BoqContext,
  BusinessProfileFixture,
  ExecutionPlan,
  GeneratedBom,
  GeneratedWorkBundle,
  TechnologyDecisionResult,
  TechnologyPack,
  ValidationResult,
} from "./types";
import { validateBusiness } from "./validate-business";
import { validateStructural } from "./validate-structural";

export interface TechnologyFoundationPipelineResult {
  plan: ExecutionPlan;
  bundle: GeneratedWorkBundle;
  bom: GeneratedBom;
  structural: ValidationResult;
  business: ValidationResult;
  decision: TechnologyDecisionResult;
}

export function runTechnologyFoundationPipeline(
  pack: TechnologyPack,
  ctx: BoqContext,
  profile: BusinessProfileFixture,
): TechnologyFoundationPipelineResult {
  const plan = deriveExecutionPlan(pack, ctx);
  const bundle = projectWorkBundle(pack, plan);
  const bom = projectBom(pack, plan, ctx);
  const structural = validateStructural(pack);
  const business = validateBusiness(pack, profile);
  const decision = decideTechnologyPack(pack, profile);
  return { plan, bundle, bom, structural, business, decision };
}
