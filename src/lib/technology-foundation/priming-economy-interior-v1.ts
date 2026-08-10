/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-PRIMING-01 — Economy Interior Primer V1 pack.
 * Owner APPROVE: ECONOMY_INTERIOR_PRIMER_V1 · 0.10 L/m² · coats=1.
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PRIMING_ECONOMY_PACK_ID = "pack.priming.economy_interior_v1";

/** Owner-approved ISO for ECONOMY_INTERIOR_PRIMER_V1. */
export const PRIMING_ECONOMY_V1_APPROVED_AT = "2026-08-10T00:00:00.000Z";

export const PRIMING_ECONOMY_V1_SOURCE_REF =
  "OWNER://ECONOMY_INTERIOR_PRIMER_V1@2026-08-10|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-RESEARCH-PRIMING-01.md";

/** Conservative set factor (L/m²) — 10 m²/L. */
export const PRIMING_ECONOMY_FACTOR_1_COAT = 0.1;

export function primingEconomyInteriorPackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PRIMING_ECONOMY_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.priming.economy_interior_v1",
    packCapabilities: ["cap.interior_priming"],
    lifecycle: "ACTIVE",
    namePl: "Gruntowanie wnętrz — economy primer V1 (0.10 L/m²)",
    stages: [{ stageId: "stage.prime", order: 1, namePl: "Gruntowanie" }],
    steps: [
      {
        stepId: "step.prime_substrate",
        stageId: "stage.prime",
        order: 1,
        namePl: "Gruntowanie podłoży (lateks podkładowy)",
        catalogWorkId: "legacy-gruntowanie-m2",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: "mat.grunt",
        namePl: "Grunt podłoża (economy interior primer V1)",
        unit: "l",
        qtyFactor: PRIMING_ECONOMY_FACTOR_1_COAT,
        coats: 1,
        factorSourceKind: "owner_approved",
        factorSourceRef: PRIMING_ECONOMY_V1_SOURCE_REF,
        factorApprovedAt: PRIMING_ECONOMY_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

export function seedPrimingEconomyInteriorV1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_priming",
    namePl: "Gruntowanie wnętrz (lateksowa farba podkładowa)",
  });
  registerDefinition({
    definitionId: "def.priming.economy_interior_v1",
    capabilityId: "cap.interior_priming",
    namePl: "Definicja gruntowanie economy interior V1",
  });
  const raw = primingEconomyInteriorPackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
