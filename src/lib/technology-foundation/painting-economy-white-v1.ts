/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-01B — Economy Interior White Paint V1 pack.
 * Owner APPROVE Policy B: conservative 12 m²/L.
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PAINTING_ECONOMY_PACK_ID = "pack.painting.economy_interior_white_v1";

/** Owner-approved ISO for ECONOMY_INTERIOR_WHITE_PAINT_V1. */
export const PAINTING_ECONOMY_V1_APPROVED_AT = "2026-08-10T00:00:00.000Z";

export const PAINTING_ECONOMY_V1_SOURCE_REF =
  "OWNER://ECONOMY_INTERIOR_WHITE_PAINT_V1@2026-08-10|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-ECONOMY-INTERIOR-WHITE-PAINT-V1.md";

/** Policy B conservative factors (L/m²). */
export const PAINTING_ECONOMY_FACTOR_1_COAT = 0.083333;
export const PAINTING_ECONOMY_FACTOR_2_COATS = 0.166667;

export function paintingEconomyWhitePackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PAINTING_ECONOMY_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.painting.economy_interior_white",
    packCapabilities: ["cap.interior_painting"],
    lifecycle: "ACTIVE",
    namePl: "Malowanie wnętrz — economy white V1 (12 m²/L)",
    stages: [{ stageId: "stage.paint", order: 1, namePl: "Malowanie" }],
    steps: [
      {
        stepId: "step.paint_walls",
        stageId: "stage.paint",
        order: 1,
        namePl: "Malowanie ścian/sufitów",
        catalogWorkId: "legacy-malowanie-m2",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: "mat.farba_lateksowa_wewnetrzna",
        namePl: "Farba lateksowa wewnętrzna (economy white V1)",
        unit: "l",
        qtyFactor: PAINTING_ECONOMY_FACTOR_1_COAT,
        coats: 1,
        factorSourceKind: "owner_approved",
        factorSourceRef: PAINTING_ECONOMY_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_ECONOMY_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
      {
        materialKey: "mat.farba_lateksowa_wewnetrzna",
        namePl: "Farba lateksowa wewnętrzna (economy white V1)",
        unit: "l",
        qtyFactor: PAINTING_ECONOMY_FACTOR_2_COATS,
        coats: 2,
        factorSourceKind: "owner_approved",
        factorSourceRef: PAINTING_ECONOMY_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_ECONOMY_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

export function seedPaintingEconomyWhiteV1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_painting",
    namePl: "Malowanie wnętrz (emulsja/lateks)",
  });
  registerDefinition({
    definitionId: "def.painting.economy_interior_white",
    capabilityId: "cap.interior_painting",
    namePl: "Definicja malowanie economy white V1",
  });
  const raw = paintingEconomyWhitePackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
