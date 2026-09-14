/**
 * NNRNKB 202 1134-01 — ATLAS UNI-GRUNT priming (horizontal) TechnologyPack V1.
 * Owner GO AUT-BOM 2026-09-14 · exact leaf bind · PUBLIC cost-estimate observation.
 *
 * qtyFactor 0.21 L/m² (= 0.21 dm³/m²). Do NOT use economy mat.grunt / 0.10 L/m².
 * Do NOT convert manufacturer kg/m². Do NOT collapse with 1134-02.
 *
 * Material identity: mat.atlas_uni_grunt (exact ATLAS UNI-GRUNT ≠ mat.grunt).
 * labour[] = technology r-g/m² ≠ OUR RATE PLN (Finance = CatalogWork 1.04).
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID =
  "pack.priming.nnrnkb_1134_01_v1" as const;

export const PRIMING_NNRNKB_1134_01_WORK_ID =
  "cw.knr.nnrnkb.1134-01.m2" as const;

export const PRIMING_NNRNKB_1134_01_MATERIAL_KEY = "mat.atlas_uni_grunt" as const;

/** ZUT / public cost estimate — ATLAS UNI GRUNT 0.21 dm³/m² (= L/m²). */
export const PRIMING_NNRNKB_1134_01_QTY_FACTOR_L_PER_M2 = 0.21;

/** Technology labour hours — NOT OUR RATE. */
export const PRIMING_NNRNKB_1134_01_LABOUR_HOURS_PER_M2 = 0.06;

export const PRIMING_NNRNKB_1134_01_V1_APPROVED_AT =
  "2026-09-14T00:00:00.000Z";

export const PRIMING_NNRNKB_1134_01_V1_SOURCE_REF =
  "OWNER://NNRNKB_202_1134-01_PRIMING_ATLAS_UNI_GRUNT_V1@2026-09-14" +
  "|PUBLIC_COST_ESTIMATE_OBSERVED" +
  "|ZUT_NNRNKB_202_1134-01" +
  "|material=ATLAS_UNI_GRUNT" +
  "|materialKey=mat.atlas_uni_grunt" +
  "|NOT_mat.grunt" +
  "|NOT_CT17_ALIAS" +
  "|qtyFactor=0.21_dm3_m2_EQ_L_m2" +
  "|NOT_KG_M2_DENSITY_CONVERT" +
  "|labour=0.06_r-g_m2_TECH_NORM_NOT_OUR_RATE" +
  "|orientation=horizontal_ceilings" +
  "|NOT_LICENSED_NNRNKB_BOOK" +
  "|NOT_ECONOMY_0.10" +
  "|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-NNRNKB-1134-01-ATLAS-UNI-GRUNT-V1.md";

export function primingNnrnkb113401PackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.priming.nnrnkb_1134_01_v1",
    packCapabilities: ["cap.interior_priming"],
    lifecycle: "ACTIVE",
    namePl:
      "Gruntowanie poziome ATLAS UNI-GRUNT — NNRNKB 202 1134-01 V1 (0.21 L/m² · public)",
    stages: [{ stageId: "stage.prime", order: 1, namePl: "Gruntowanie" }],
    steps: [
      {
        stepId: "step.prime_horizontal_1134_01",
        stageId: "stage.prime",
        order: 1,
        namePl:
          "Gruntowanie podłoży preparatem ATLAS UNI-GRUNT — powierzchnie poziome (sufity)",
        catalogWorkId: PRIMING_NNRNKB_1134_01_WORK_ID,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: PRIMING_NNRNKB_1134_01_MATERIAL_KEY,
        namePl: "ATLAS UNI-GRUNT (NNRNKB 202 1134-01 · public 0.21 L/m²)",
        unit: "l",
        qtyFactor: PRIMING_NNRNKB_1134_01_QTY_FACTOR_L_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PRIMING_NNRNKB_1134_01_V1_SOURCE_REF,
        factorApprovedAt: PRIMING_NNRNKB_1134_01_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [
      {
        labourKey: PRIMING_NNRNKB_1134_01_WORK_ID,
        namePl: "Gruntowanie poziome 1134-01 — tech 0.06 r-g/m² (≠ OUR RATE)",
        hoursPerUnit: PRIMING_NNRNKB_1134_01_LABOUR_HOURS_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PRIMING_NNRNKB_1134_01_V1_SOURCE_REF,
        factorApprovedAt: PRIMING_NNRNKB_1134_01_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    regulatory: [],
  };
}

export function seedPrimingNnrnkb113401V1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_priming",
    namePl: "Gruntowanie wnętrz (lateksowa farba podkładowa)",
  });
  registerDefinition({
    definitionId: "def.priming.nnrnkb_1134_01_v1",
    capabilityId: "cap.interior_priming",
    namePl: "Definicja gruntowanie NNRNKB 1134-01 ATLAS UNI-GRUNT V1",
  });
  const raw = primingNnrnkb113401PackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
