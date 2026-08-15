/**
 * IK-MIGRATION-01 P5.7 — Owner-approved Work × unit compatibility (local allowlist).
 *
 * NOT a global unit normalization.
 * Does NOT mutate normalizeWgdomCostUnit.
 * Does NOT use WM_UNIT_ALIAS_TO_SZT (PDF extract only).
 * Does NOT change quantity.
 * Does NOT accept price / OUR RATE.
 *
 * Owner GO 2026-08-15:
 *   G1 otw. ↔ szt  for cc-w2-przebijanie-otworow
 *   G2 aparat ↔ szt for cc-w2-przygotowanie-osprzet
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { CATALOG_WAVE2_PRODUCT_IDS } from "@/lib/catalog-coverage/alias-pack-wave2";

export type OwnerUnitCompatibilityGroupId = "G1_otw_szt" | "G2_aparat_szt";

export type OwnerUnitCompatibilityDecision =
  "ACCEPT_EXISTING_WORK_AND_UNIT_COMPATIBILITY";

export type OwnerUnitCompatibilityHit = {
  ok: true;
  workId: string;
  sourceUnitRaw: string;
  catalogUnit: WgdomCostUnit;
  groupId: OwnerUnitCompatibilityGroupId;
  decision: OwnerUnitCompatibilityDecision;
  /** Quantity must stay 1:1 — no conversion factor. */
  quantityConversion: "none";
};

export type OwnerUnitCompatibilityMiss = { ok: false };

type OwnerUnitCompatibilityRule = {
  groupId: OwnerUnitCompatibilityGroupId;
  workId: string;
  /** Folded source unit tokens (no trailing dots). */
  sourceUnitTokens: readonly string[];
  catalogUnit: WgdomCostUnit;
};

/** Owner Decision allowlist — ONLY these Work IDs. */
export const OWNER_UNIT_COMPATIBILITY_RULES: readonly OwnerUnitCompatibilityRule[] = [
  {
    groupId: "G1_otw_szt",
    workId: CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow,
    sourceUnitTokens: ["otw"],
    catalogUnit: "szt",
  },
  {
    groupId: "G2_aparat_szt",
    workId: CATALOG_WAVE2_PRODUCT_IDS.przygotowanie_pod_osprzet,
    sourceUnitTokens: ["aparat"],
    catalogUnit: "szt",
  },
] as const;

/** Fold source unit for allowlist match — does not invent WgdomCostUnit. */
export function foldOwnerUnitToken(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\.+$/g, "");
}

/**
 * Resolve Owner-approved unit compatibility for a bound Work Identity.
 * Requires explicit workId — never applies by unit token alone.
 */
export function resolveOwnerWorkUnitCompatibility(opts: {
  workId: string | null | undefined;
  sourceUnitRaw: string | null | undefined;
}): OwnerUnitCompatibilityHit | OwnerUnitCompatibilityMiss {
  const workId = String(opts.workId ?? "").trim();
  const sourceUnitRaw = String(opts.sourceUnitRaw ?? "").trim();
  if (!workId || !sourceUnitRaw) return { ok: false };

  const folded = foldOwnerUnitToken(sourceUnitRaw);
  if (!folded) return { ok: false };

  for (const rule of OWNER_UNIT_COMPATIBILITY_RULES) {
    if (rule.workId !== workId) continue;
    if (!rule.sourceUnitTokens.includes(folded)) continue;
    return {
      ok: true,
      workId,
      sourceUnitRaw,
      catalogUnit: rule.catalogUnit,
      groupId: rule.groupId,
      decision: "ACCEPT_EXISTING_WORK_AND_UNIT_COMPATIBILITY",
      quantityConversion: "none",
    };
  }
  return { ok: false };
}
