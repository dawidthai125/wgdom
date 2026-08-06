/**
 * Decision hooks (RO) — allow / degrade / deny from structural + business (TF-9).
 * No pricing. No CI wire in B0.
 */

import type {
  BusinessProfileFixture,
  ExplainIssue,
  TechnologyDecisionResult,
  TechnologyPack,
} from "./types";
import { validateBusiness } from "./validate-business";
import { validateStructural } from "./validate-structural";

export function decideTechnologyPack(
  pack: TechnologyPack,
  profile: BusinessProfileFixture,
): TechnologyDecisionResult {
  const structural = validateStructural(pack);
  const business = validateBusiness(pack, profile);

  const reasons: ExplainIssue[] = [
    ...structural.blockingIssues,
    ...business.blockingIssues,
    ...structural.warnings,
    ...business.warnings,
  ];

  if (structural.blockingIssues.length > 0 || business.blockingIssues.length > 0) {
    return { decision: "deny", reasons, structural, business };
  }

  if (structural.warnings.length > 0 || business.warnings.length > 0) {
    return { decision: "degrade", reasons, structural, business };
  }

  return {
    decision: "allow",
    reasons: [{ code: "OK", message: "Pack structurally and business-valid", layer: "decision" }],
    structural,
    business,
  };
}
