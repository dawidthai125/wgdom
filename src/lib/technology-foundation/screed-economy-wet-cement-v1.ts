/**
 * ECONOMY_WET_CEMENT_SCREED_V1 — TechnologyPack (qtyFactor=2.0 kg/m²/mm · POSTAR 10).
 * Bind-time: effectiveQtyFactor = 2.0 × thicknessMm → projectBom (boqQty × factor).
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID = "pack.screed.economy_wet_cement_v1";

export const SCREED_ECONOMY_WET_CEMENT_V1_APPROVED_AT = "2026-08-10T00:00:00.000Z";

export const SCREED_ECONOMY_WET_CEMENT_V1_SOURCE_REF =
  "OWNER://ECONOMY_WET_CEMENT_SCREED_V1@2026-08-10|docs/architecture/ECONOMY-WET-CEMENT-SCREED-V1-DESIGN-FREEZE.md|Atlas POSTAR 10|2.0 kg/m2/mm";

/** Canonical kg per m² per mm — Atlas POSTAR 10 (20 kg / m² / 10 mm). */
export const SCREED_ECONOMY_WET_CEMENT_QTY_FACTOR = 2;

export const SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY = "mat.jastrych_cementowy";

export const SCREED_ECONOMY_WET_CEMENT_THICKNESS_MIN_MM = 10;
export const SCREED_ECONOMY_WET_CEMENT_THICKNESS_MAX_MM = 100;

export function screedEconomyWetCementPackV1(): TechnologyPack {
  return {
    packId: FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.screed.economy_wet_cement_v1",
    packCapabilities: ["cap.wet_cement_screed"],
    lifecycle: "ACTIVE",
    namePl: "Jastrych cementowy mokry — economy V1 (Atlas POSTAR 10 · 2.0 kg/m²/mm)",
    stages: [{ stageId: "stage.screed", order: 1, namePl: "Warstwa wyrównawcza" }],
    steps: [
      {
        stepId: "step.wet_cement_screed",
        stageId: "stage.screed",
        order: 1,
        namePl: "Warstwa wyrównawcza / jastrych cementowy (mokry)",
        catalogWorkId: "cw.product.jastrych_cementowy",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY,
        namePl: "Jastrych / posadzka cementowa (economy wet V1 · POSTAR 10)",
        unit: "kg",
        qtyFactor: SCREED_ECONOMY_WET_CEMENT_QTY_FACTOR,
        factorSourceKind: "owner_approved",
        factorSourceRef: SCREED_ECONOMY_WET_CEMENT_V1_SOURCE_REF,
        factorApprovedAt: SCREED_ECONOMY_WET_CEMENT_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

export function seedScreedEconomyWetCementV1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.wet_cement_screed",
    namePl: "Mokry jastrych / cementowa warstwa wyrównawcza (economy V1)",
  });
  registerDefinition({
    definitionId: "def.screed.economy_wet_cement_v1",
    capabilityId: "cap.wet_cement_screed",
    namePl: "Definicja economy wet cement screed V1",
  });
  const raw = screedEconomyWetCementPackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
