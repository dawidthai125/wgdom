/**
 * B0 fixtures — ETICS + kostka brukowa (PLAN-R5).
 */

import { seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { seedPaintingEconomyWhiteV1 } from "./painting-economy-white-v1";
import { withLegacyFixtureProvenance } from "./recipe-provenance";
import { registerDefinition } from "./technology-definition";
import type { BoqContext, TechnologyPack } from "./types";

export const FIXTURE_ETICS_PACK_ID = "pack.etics.external_wall";
export const FIXTURE_KOSTKA_PACK_ID = "pack.paving.concrete_cubes";
export {
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  PAINTING_ECONOMY_FACTOR_1_COAT,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  paintingEconomyWhitePackV1,
  seedPaintingEconomyWhiteV1,
} from "./painting-economy-white-v1";

export function eticsPackV1(): TechnologyPack {
  return {
    packId: FIXTURE_ETICS_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.etics.standard",
    packCapabilities: [
      "cap.external_thermal_insulation",
      "cap.substrate_prep",
      "cap.finishing_coat",
    ],
    lifecycle: "ACTIVE",
    namePl: "ETICS — ocieplenie ścian zewnętrznych",
    stages: [
      { stageId: "stage.prep", order: 1, namePl: "Przygotowanie" },
      { stageId: "stage.insulate", order: 2, namePl: "Ocieplenie" },
      { stageId: "stage.finish", order: 3, namePl: "Wykończenie" },
    ],
    steps: [
      {
        stepId: "step.substrate",
        stageId: "stage.prep",
        order: 1,
        namePl: "Przygotowanie podłoża",
        catalogWorkId: "cw.etics.substrate",
        quantityFromBoq: true,
      },
      {
        stepId: "step.glue_board",
        stageId: "stage.insulate",
        order: 2,
        namePl: "Klejenie płyt EPS/XPS",
        catalogWorkId: "cw.etics.boards",
        quantityFromBoq: true,
      },
      {
        stepId: "step.mesh",
        stageId: "stage.insulate",
        order: 3,
        namePl: "Siatka + klej zbrojący",
        catalogWorkId: "cw.etics.mesh",
        quantityFromBoq: true,
      },
      {
        stepId: "step.render",
        stageId: "stage.finish",
        order: 4,
        namePl: "Tynk elewacyjny",
        catalogWorkId: "cw.etics.render",
        quantityFromBoq: true,
      },
    ],
    dependencies: [
      { predecessorStepId: "step.substrate", successorStepId: "step.glue_board" },
      { predecessorStepId: "step.glue_board", successorStepId: "step.mesh" },
      { predecessorStepId: "step.mesh", successorStepId: "step.render" },
    ],
    materials: [
      withLegacyFixtureProvenance({
        materialKey: "mat.eps_graph",
        namePl: "Płyta EPS grafit",
        unit: "m2",
        qtyFactor: 1.05,
      }),
      withLegacyFixtureProvenance({
        materialKey: "mat.glue_etics",
        namePl: "Klej do ETICS",
        unit: "kg",
        qtyFactor: 4.5,
      }),
      withLegacyFixtureProvenance({
        materialKey: "mat.mesh",
        namePl: "Siatka zbrojąca",
        unit: "m2",
        qtyFactor: 1.1,
      }),
      withLegacyFixtureProvenance({
        materialKey: "mat.render",
        namePl: "Tynk mineralny",
        unit: "kg",
        qtyFactor: 2.5,
      }),
    ],
    equipment: [
      withLegacyFixtureProvenance({
        equipmentKey: "eq.scaffold",
        namePl: "Rusztowanie elewacyjne",
        unit: "m2",
        qtyFactor: 1,
      }),
      withLegacyFixtureProvenance({
        equipmentKey: "eq.mixer",
        namePl: "Mieszarka",
        unit: "szt",
        qtyFactor: 0.01,
      }),
    ],
    labour: [
      withLegacyFixtureProvenance({
        labourKey: "lab.etics.crew",
        namePl: "Brygada ETICS",
        hoursPerUnit: 1.2,
      }),
    ],
    regulatory: [
      {
        regulatoryId: "reg.wt2021.thermal",
        namePl: "Wymagania WT izolacyjność cieplna",
        required: true,
      },
    ],
  };
}

export function kostkaPackV1(): TechnologyPack {
  return {
    packId: FIXTURE_KOSTKA_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.paving.cubes",
    packCapabilities: ["cap.paving_cubes", "cap.substrate_prep"],
    lifecycle: "ACTIVE",
    namePl: "Kostka brukowa — nawierzchnia",
    stages: [
      { stageId: "stage.subbase", order: 1, namePl: "Podbudowa" },
      { stageId: "stage.lay", order: 2, namePl: "Układanie" },
    ],
    steps: [
      {
        stepId: "step.excavate",
        stageId: "stage.subbase",
        order: 1,
        namePl: "Korytowanie",
        catalogWorkId: "cw.paving.excavate",
        quantityFromBoq: true,
      },
      {
        stepId: "step.base",
        stageId: "stage.subbase",
        order: 2,
        namePl: "Podsypka/podbudowa",
        catalogWorkId: "cw.paving.base",
        quantityFromBoq: true,
      },
      {
        stepId: "step.lay_cubes",
        stageId: "stage.lay",
        order: 3,
        namePl: "Układanie kostki",
        catalogWorkId: "cw.paving.cubes",
        quantityFromBoq: true,
      },
    ],
    dependencies: [
      { predecessorStepId: "step.excavate", successorStepId: "step.base" },
      { predecessorStepId: "step.base", successorStepId: "step.lay_cubes" },
    ],
    materials: [
      withLegacyFixtureProvenance({
        materialKey: "mat.cubes_beton",
        namePl: "Kostka betonowa",
        unit: "m2",
        qtyFactor: 1.03,
      }),
      withLegacyFixtureProvenance({
        materialKey: "mat.sand",
        namePl: "Piasek podsypkowy",
        unit: "m3",
        qtyFactor: 0.05,
      }),
    ],
    equipment: [
      withLegacyFixtureProvenance({
        equipmentKey: "eq.compactor",
        namePl: "Zagęszczarka",
        unit: "szt",
        qtyFactor: 0.02,
      }),
    ],
    labour: [
      withLegacyFixtureProvenance({
        labourKey: "lab.paving.crew",
        namePl: "Brygada brukarska",
        hoursPerUnit: 0.8,
      }),
    ],
    regulatory: [],
  };
}

export function eticsBoqContext(qtyM2 = 100): BoqContext {
  return {
    lines: [
      {
        lineKey: "boq.etics.wall",
        catalogWorkIdHint: "cw.etics.boards",
        quantity: qtyM2,
        unit: "m2",
      },
    ],
  };
}

export function kostkaBoqContext(qtyM2 = 50): BoqContext {
  return {
    lines: [
      {
        lineKey: "boq.paving.area",
        catalogWorkIdHint: "cw.paving.cubes",
        quantity: qtyM2,
        unit: "m2",
      },
    ],
  };
}

/** Seed capabilities, definitions, and fixture packs (register once). */
export function seedB0Fixtures(): {
  etics: TechnologyPack;
  kostka: TechnologyPack;
  painting: TechnologyPack;
} {
  seedBaselineCapabilities();
  registerDefinition({
    definitionId: "def.etics.standard",
    capabilityId: "cap.external_thermal_insulation",
    namePl: "Definicja ETICS standard",
  });
  registerDefinition({
    definitionId: "def.paving.cubes",
    capabilityId: "cap.paving_cubes",
    namePl: "Definicja kostka brukowa",
  });

  const eticsRaw = eticsPackV1();
  const kostkaRaw = kostkaPackV1();
  const etics = getOrRegisterPack(eticsRaw);
  const kostka = getOrRegisterPack(kostkaRaw);
  const painting = seedPaintingEconomyWhiteV1();
  return { etics, kostka, painting };
}

function getOrRegisterPack(raw: TechnologyPack): TechnologyPack {
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
