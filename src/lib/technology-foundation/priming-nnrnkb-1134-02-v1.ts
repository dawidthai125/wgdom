/**
 * NNRNKB 202 1134-02 — ATLAS UNI-GRUNT priming (vertical) TechnologyPack V1.
 * Owner GO AUT-BOM 2026-09-14 · exact leaf bind · PUBLIC cost-estimate observation.
 *
 * qtyFactor 0.22 L/m² (= 0.22 dm³/m²). Do NOT use economy mat.grunt / 0.10 L/m².
 * Do NOT convert manufacturer kg/m². Do NOT collapse with 1134-01.
 *
 * Material identity: mat.atlas_uni_grunt (exact ATLAS UNI-GRUNT ≠ mat.grunt).
 * labour[] = technology r-g/m² ≠ OUR RATE PLN (Finance = CatalogWork 1.39).
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID =
  "pack.priming.nnrnkb_1134_02_v1" as const;

export const PRIMING_NNRNKB_1134_02_WORK_ID =
  "cw.knr.nnrnkb.1134-02.m2" as const;

export const PRIMING_NNRNKB_1134_02_MATERIAL_KEY = "mat.atlas_uni_grunt" as const;

/** ZUT / public cost estimate — ATLAS UNI GRUNT 0.22 dm³/m² (= L/m²). */
export const PRIMING_NNRNKB_1134_02_QTY_FACTOR_L_PER_M2 = 0.22;

/** Technology labour hours — NOT OUR RATE. */
export const PRIMING_NNRNKB_1134_02_LABOUR_HOURS_PER_M2 = 0.08;

export const PRIMING_NNRNKB_1134_02_V1_APPROVED_AT =
  "2026-09-14T00:00:00.000Z";

export const PRIMING_NNRNKB_1134_02_V1_SOURCE_REF =
  "OWNER://NNRNKB_202_1134-02_PRIMING_ATLAS_UNI_GRUNT_V1@2026-09-14" +
  "|PUBLIC_COST_ESTIMATE_OBSERVED" +
  "|ZUT_NNRNKB_202_1134-02" +
  "|material=ATLAS_UNI_GRUNT" +
  "|materialKey=mat.atlas_uni_grunt" +
  "|NOT_mat.grunt" +
  "|NOT_CT17_ALIAS" +
  "|qtyFactor=0.22_dm3_m2_EQ_L_m2" +
  "|NOT_KG_M2_DENSITY_CONVERT" +
  "|labour=0.08_r-g_m2_TECH_NORM_NOT_OUR_RATE" +
  "|orientation=vertical" +
  "|NOT_LICENSED_NNRNKB_BOOK" +
  "|NOT_ECONOMY_0.10" +
  "|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-NNRNKB-1134-02-ATLAS-UNI-GRUNT-V1.md";

export function primingNnrnkb113402PackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.priming.nnrnkb_1134_02_v1",
    packCapabilities: ["cap.interior_priming"],
    lifecycle: "ACTIVE",
    namePl:
      "Gruntowanie pionowe ATLAS UNI-GRUNT — NNRNKB 202 1134-02 V1 (0.22 L/m² · public)",
    stages: [{ stageId: "stage.prime", order: 1, namePl: "Gruntowanie" }],
    steps: [
      {
        stepId: "step.prime_vertical_1134_02",
        stageId: "stage.prime",
        order: 1,
        namePl:
          "Gruntowanie podłoży preparatem ATLAS UNI-GRUNT — powierzchnie pionowe",
        catalogWorkId: PRIMING_NNRNKB_1134_02_WORK_ID,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: PRIMING_NNRNKB_1134_02_MATERIAL_KEY,
        namePl: "ATLAS UNI-GRUNT (NNRNKB 202 1134-02 · public 0.22 L/m²)",
        unit: "l",
        qtyFactor: PRIMING_NNRNKB_1134_02_QTY_FACTOR_L_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PRIMING_NNRNKB_1134_02_V1_SOURCE_REF,
        factorApprovedAt: PRIMING_NNRNKB_1134_02_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [
      {
        labourKey: PRIMING_NNRNKB_1134_02_WORK_ID,
        namePl: "Gruntowanie pionowe 1134-02 — tech 0.08 r-g/m² (≠ OUR RATE)",
        hoursPerUnit: PRIMING_NNRNKB_1134_02_LABOUR_HOURS_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PRIMING_NNRNKB_1134_02_V1_SOURCE_REF,
        factorApprovedAt: PRIMING_NNRNKB_1134_02_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    regulatory: [],
  };
}

export function seedPrimingNnrnkb113402V1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_priming",
    namePl: "Gruntowanie wnętrz (lateksowa farba podkładowa)",
  });
  registerDefinition({
    definitionId: "def.priming.nnrnkb_1134_02_v1",
    capabilityId: "cap.interior_priming",
    namePl: "Definicja gruntowanie NNRNKB 1134-02 ATLAS UNI-GRUNT V1",
  });
  const raw = primingNnrnkb113402PackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
