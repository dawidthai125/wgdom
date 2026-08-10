/**
 * ECONOMY-ELECTRICAL-CABLE-V1 — TechnologyPack (qtyFactor=1.0 · W1).
 * Owner GO: MUST 4 keys · YDY ≠ YDYżo · materialQty = BOQ qty.
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID = "pack.electrical.cable_economy_v1";

export const ELECTRICAL_CABLE_ECONOMY_V1_APPROVED_AT = "2026-08-10T00:00:00.000Z";

export const ELECTRICAL_CABLE_ECONOMY_V1_SOURCE_REF =
  "OWNER://ECONOMY_ELECTRICAL_CABLE_V1@2026-08-10|docs/architecture/ECONOMY-ELECTRICAL-CABLE-V1-DESIGN-FREEZE.md";

/** W1 — materialQty = BOQ qty. */
export const ELECTRICAL_CABLE_ECONOMY_QTY_FACTOR = 1;

function cableMaterial(
  materialKey: string,
  namePl: string,
): TechnologyPack["materials"][number] {
  return {
    materialKey,
    namePl,
    unit: "m",
    qtyFactor: ELECTRICAL_CABLE_ECONOMY_QTY_FACTOR,
    factorSourceKind: "owner_approved",
    factorSourceRef: ELECTRICAL_CABLE_ECONOMY_V1_SOURCE_REF,
    factorApprovedAt: ELECTRICAL_CABLE_ECONOMY_V1_APPROVED_AT,
    wastePolicy: "none",
  };
}

export function electricalCableEconomyPackV1(): TechnologyPack {
  return {
    packId: FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.electrical.cable_economy_v1",
    packCapabilities: ["cap.electrical_cable_lay"],
    lifecycle: "ACTIVE",
    namePl: "Przewody instalacyjne — economy cable V1 (qty=BOQ)",
    stages: [{ stageId: "stage.cable", order: 1, namePl: "Przewód" }],
    steps: [
      {
        stepId: "step.lay_cable",
        stageId: "stage.cable",
        order: 1,
        namePl: "Ułożenie / wciąganie przewodu",
        catalogWorkId: "legacy-ukladanie-kabla-ydy-mb",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      cableMaterial("mat.przewod_ydy_3x1_5", "Przewód YDY 3×1,5 mm² (economy V1)"),
      cableMaterial("mat.przewod_ydyzo_3x1_5", "Przewód YDYżo 3×1,5 mm² (economy V1)"),
      cableMaterial("mat.przewod_ydyzo_3x2_5", "Przewód YDYżo 3×2,5 mm² (economy V1)"),
      cableMaterial("mat.przewod_ydyzo_5x6", "Przewód YDYżo 5×6 mm² (economy V1)"),
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
}

export function seedElectricalCableEconomyV1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.electrical_cable_lay",
    namePl: "Ułożenie przewodu instalacyjnego (economy V1)",
  });
  registerDefinition({
    definitionId: "def.electrical.cable_economy_v1",
    capabilityId: "cap.electrical_cable_lay",
    namePl: "Definicja economy electrical cable V1",
  });
  const raw = electricalCableEconomyPackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
