/**
 * KNR 4-01 1204-02 — two-coat latex interior wall paint TechnologyPack V1.
 * Owner GO AUT-BOM 2026-09-14 · exact leaf bind · PUBLIC cost-estimate observation.
 *
 * qtyFactor 0.286 L/m² (= 0.286 dm³/m²) from BIP public nakłady for exact 1204-02.
 * Do NOT use economy Policy-B 0.166667.
 *
 * Auxiliares 2%: no % engine in TF schema — omitted (same as gypsum/painting economy).
 * labour[] = technology r-g/m² ≠ OUR RATE PLN (Finance uses CatalogWork AUTO_R1).
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID =
  "pack.painting.knr_4_01_1204_02_v1" as const;

export const PAINTING_KNR_4_01_1204_02_WORK_ID =
  "cw.knr.knr-4-01.1204-02.m2" as const;

export const PAINTING_KNR_4_01_1204_02_MATERIAL_KEY =
  "mat.farba_lateksowa_wewnetrzna" as const;

/** BIP / public cost estimate — Farba lateksowa wewnętrzna 0.286 dm³/m² (= L/m²). */
export const PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2 = 0.286;

/** BIP technology labour hours — NOT OUR RATE. */
export const PAINTING_KNR_4_01_1204_02_LABOUR_HOURS_PER_M2 = 0.119;

export const PAINTING_KNR_4_01_1204_02_V1_APPROVED_AT =
  "2026-09-14T00:00:00.000Z";

export const PAINTING_KNR_4_01_1204_02_V1_SOURCE_REF =
  "OWNER://KNR_4-01_1204-02_PAINTING_V1@2026-09-14" +
  "|PUBLIC_COST_ESTIMATE_OBSERVED" +
  "|BIP_CKZiU_KNR_4-01_1204-02" +
  "|BIP_PRZEMYSL_KNR_4-01_1204/02" +
  "|material=farba_lateksowa_wewnetrzna" +
  "|qtyFactor=0.286_dm3_m2_EQ_L_m2" +
  "|labour=0.119_r-g_m2_TECH_NORM_NOT_OUR_RATE" +
  "|aux=2pct_OMITTED_NO_PCT_ENGINE" +
  "|NOT_LICENSED_KNR_BOOK" +
  "|NOT_ECONOMY_0.166667" +
  "|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-KNR-4-01-1204-02-PAINTING-V1.md";

export function paintingKnr401120402PackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.painting.knr_4_01_1204_02_v1",
    packCapabilities: ["cap.interior_painting"],
    lifecycle: "ACTIVE",
    namePl:
      "Malowanie ścian emulsją lateksową dwukrotnie — KNR 4-01 1204-02 V1 (0.286 L/m² · BIP/public)",
    stages: [{ stageId: "stage.paint", order: 1, namePl: "Malowanie" }],
    steps: [
      {
        stepId: "step.paint_walls_1204_02",
        stageId: "stage.paint",
        order: 1,
        namePl:
          "Dwukrotne malowanie farbami lateksowymi starych tynków wewnętrznych ścian",
        catalogWorkId: PAINTING_KNR_4_01_1204_02_WORK_ID,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
        namePl: "Farba lateksowa wewnętrzna (KNR 4-01 1204-02 · BIP/public 0.286 L/m²)",
        unit: "l",
        // Two coats already baked into KNR factor — no coats selector (deterministic leaf recipe).
        qtyFactor: PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PAINTING_KNR_4_01_1204_02_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_KNR_4_01_1204_02_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [
      {
        labourKey: PAINTING_KNR_4_01_1204_02_WORK_ID,
        namePl: "Malowanie ścian 1204-02 — BIP tech 0.119 r-g/m² (≠ OUR RATE)",
        hoursPerUnit: PAINTING_KNR_4_01_1204_02_LABOUR_HOURS_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PAINTING_KNR_4_01_1204_02_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_KNR_4_01_1204_02_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    regulatory: [],
  };
}

export function seedPaintingKnr401120402V1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_painting",
    namePl: "Malowanie wnętrz (emulsja/lateks)",
  });
  registerDefinition({
    definitionId: "def.painting.knr_4_01_1204_02_v1",
    capabilityId: "cap.interior_painting",
    namePl: "Definicja malowanie KNR 4-01 1204-02 V1",
  });
  const raw = paintingKnr401120402PackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
