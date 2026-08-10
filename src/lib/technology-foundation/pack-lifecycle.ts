/**
 * Pack lifecycle transitions — TF-7 + TECHNOLOGY-RECIPE-CONSUMPTION-01A.
 * Trusted path: DRAFT → REVIEW → APPROVED → ACTIVE.
 * Legacy: DRAFT → ACTIVE only when all factors are fixture_legacy (enforced in transition).
 */

import {
  canPromoteToActive,
  canPromoteToApproved,
  validateRecipeProvenance,
} from "./recipe-provenance";
import type { TechnologyPack, TechnologyPackLifecycle } from "./types";

const ALLOWED: Record<TechnologyPackLifecycle, readonly TechnologyPackLifecycle[]> = {
  DRAFT: ["REVIEW", "ACTIVE", "ARCHIVED"],
  REVIEW: ["APPROVED", "DRAFT", "ARCHIVED"],
  APPROVED: ["ACTIVE", "REVIEW", "ARCHIVED"],
  ACTIVE: ["DEPRECATED", "ARCHIVED"],
  DEPRECATED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionLifecycle(
  from: TechnologyPackLifecycle,
  to: TechnologyPackLifecycle,
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function transitionPackLifecycle(
  pack: TechnologyPack,
  to: TechnologyPackLifecycle,
): TechnologyPack {
  if (!canTransitionLifecycle(pack.lifecycle, to)) {
    throw new Error(`illegal lifecycle transition ${pack.lifecycle} → ${to}`);
  }

  if (to === "APPROVED") {
    if (!canPromoteToApproved(pack)) {
      const v = validateRecipeProvenance({ ...pack, lifecycle: "APPROVED" });
      const detail = v.blockingIssues.map((i) => i.code).join(",") || "missing provenance";
      throw new Error(`RECIPE-01A: cannot promote to APPROVED (${detail})`);
    }
  }

  if (to === "ACTIVE") {
    if (!canPromoteToActive(pack, pack.lifecycle)) {
      throw new Error(
        `RECIPE-01A: cannot promote to ACTIVE from ${pack.lifecycle} without approved SOURCE (or fixture_legacy-only grandfather)`,
      );
    }
  }

  return { ...pack, lifecycle: to };
}
