/**
 * KNR 2-02 1505-01 — two-coat emulsion interior ceiling paint TechnologyPack V1.
 * Owner GO AUT-BOM 2026-09-14 · exact leaf bind · PUBLIC cost-estimate observation.
 *
 * qtyFactor 0.2891 L/m² (= 0.2891 dm³/m²) from public nakłady for exact 1505-01.
 * Do NOT use economy Policy-B 0.166667 · Do NOT substitute 1505-03/05/07.
 *
 * Material identity: source wording "farba emulsyjna" → sole repo paint product
 * mat.farba_lateksowa_wewnetrzna (ECONOMY_INTERIOR_WHITE_PAINT_V1 taxonomy:
 * "interior white emulsion / acrylic" · S4 sole paint product).
 *
 * Auxiliares 1.5%: omitted (no % engine). labour[] tech r-g ≠ OUR RATE.
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID =
  "pack.painting.knr_2_02_1505_01_v1" as const;

export const PAINTING_KNR_2_02_1505_01_WORK_ID =
  "cw.knr.knr-2-02.1505-01.m2" as const;

export const PAINTING_KNR_2_02_1505_01_MATERIAL_KEY =
  "mat.farba_lateksowa_wewnetrzna" as const;

/** Public cost estimate — farba emulsyjna 0.2891 dm³/m² (= L/m²). */
export const PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2 = 0.2891;

/** Technology labour hours — NOT OUR RATE. */
export const PAINTING_KNR_2_02_1505_01_LABOUR_HOURS_PER_M2 = 0.1391;

export const PAINTING_KNR_2_02_1505_01_V1_APPROVED_AT =
  "2026-09-14T00:00:00.000Z";

export const PAINTING_KNR_2_02_1505_01_V1_SOURCE_REF =
  "OWNER://KNR_2-02_1505-01_PAINTING_V1@2026-09-14" +
  "|PUBLIC_COST_ESTIMATE_OBSERVED" +
  "|KNR_2-02_1505-01_EXACT" +
  "|material=farba_emulsyjna" +
  "|materialKey=mat.farba_lateksowa_wewnetrzna" +
  "|TAXONOMY=ECONOMY_INTERIOR_WHITE_PAINT_V1_emulsion_acrylic_sole_paint_product" +
  "|qtyFactor=0.2891_dm3_m2_EQ_L_m2" +
  "|labour=0.1391_r-g_m2_TECH_NORM_NOT_OUR_RATE" +
  "|aux=1.5pct_OMITTED_NO_PCT_ENGINE" +
  "|NOT_LICENSED_KNR_BOOK" +
  "|NOT_ECONOMY_0.166667" +
  "|NOT_1505-03_05_07" +
  "|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-KNR-2-02-1505-01-PAINTING-V1.md";

export function paintingKnr202150501PackV1(): TechnologyPack {
  return {
    packId: FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.painting.knr_2_02_1505_01_v1",
    packCapabilities: ["cap.interior_painting"],
    lifecycle: "ACTIVE",
    namePl:
      "Malowanie sufitów emulsją dwukrotnie — KNR 2-02 1505-01 V1 (0.2891 L/m² · public)",
    stages: [{ stageId: "stage.paint", order: 1, namePl: "Malowanie" }],
    steps: [
      {
        stepId: "step.paint_ceilings_1505_01",
        stageId: "stage.paint",
        order: 1,
        namePl:
          "Dwukrotne malowanie farbami emulsyjnymi powierzchni wewnętrznych — tynków gładkich bez gruntowania (sufity)",
        catalogWorkId: PAINTING_KNR_2_02_1505_01_WORK_ID,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
        namePl:
          "Farba emulsyjna / lateksowa wewnętrzna (KNR 2-02 1505-01 · public 0.2891 L/m²)",
        unit: "l",
        // Two coats baked into KNR factor — no coats selector.
        qtyFactor: PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PAINTING_KNR_2_02_1505_01_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_KNR_2_02_1505_01_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    labour: [
      {
        labourKey: PAINTING_KNR_2_02_1505_01_WORK_ID,
        namePl: "Malowanie sufitów 1505-01 — tech 0.1391 r-g/m² (≠ OUR RATE)",
        hoursPerUnit: PAINTING_KNR_2_02_1505_01_LABOUR_HOURS_PER_M2,
        factorSourceKind: "norm_ref",
        factorSourceRef: PAINTING_KNR_2_02_1505_01_V1_SOURCE_REF,
        factorApprovedAt: PAINTING_KNR_2_02_1505_01_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    regulatory: [],
  };
}

export function seedPaintingKnr202150501V1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_painting",
    namePl: "Malowanie wnętrz (emulsja/lateks)",
  });
  registerDefinition({
    definitionId: "def.painting.knr_2_02_1505_01_v1",
    capabilityId: "cap.interior_painting",
    namePl: "Definicja malowanie KNR 2-02 1505-01 V1",
  });
  const raw = paintingKnr202150501PackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
