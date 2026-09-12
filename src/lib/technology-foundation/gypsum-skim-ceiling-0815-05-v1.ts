/**
 * KNR 2-02 0815-05 — single-layer ceiling gypsum skim TechnologyPack V1.
 * Owner GO TPI/729 · BIP Kraków zid=134490 · NORMAL_TECHNOLOGY_PACK (≠ LABOR_ONLY).
 *
 * qtyFactor 2.5 kg/m² = Owner-GO-approved for ACTIVE production BOM from BIP nakłady;
 * marked PROVISIONAL in source ref pending licensed KNR book confirmation (not silent freeze).
 *
 * Water (0.00175 m³/m²) and 1.5% auxiliares: no mat.woda / no % engine in TF schema —
 * omitted (same pattern as painting/priming omitting water/aux %).
 */

import { registerCapability, seedBaselineCapabilities } from "./definition-registry";
import { getPack, registerPack } from "./pack-registry";
import { registerDefinition } from "./technology-definition";
import type { TechnologyPack } from "./types";

export const FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID =
  "pack.gypsum_skim.ceiling_0815_05_v1" as const;

/** Canonical CatalogWork leaf — exact steps[].catalogWorkId bind (no fuzzy). */
export const GYPSUM_SKIM_CEILING_0815_05_WORK_ID =
  "cw.knr.knr-2-02.0815-05.m2" as const;

export const GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY = "mat.gladz_gipsowa" as const;

/**
 * BIP Kraków kosztorys nakładowy KNR 2-02 0815/05 — Gips budowlany szpachlowy kg 2.5.
 * Owner GO 2026-09-13 activates pack; qty remains PROVISIONAL pending licensed KNR confirm.
 */
export const GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2 = 2.5;

export const GYPSUM_SKIM_CEILING_0815_05_V1_APPROVED_AT =
  "2026-09-13T00:00:00.000Z";

export const GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF =
  "OWNER://KNR_2-02_0815-05_GYPSUM_SKIM_CEILING_V1@2026-09-13" +
  "|BIP_KRAKOW_zid=134490" +
  "|https://www.bip.krakow.pl/plik.php?mode=shw&new=t&wer=0&zid=134490" +
  "|KNR_2-02_0815-05" +
  "|qtyFactor=2.5_kg_m2_PROVISIONAL_PENDING_LICENSED_KNR_CONFIRM" +
  "|.tmp/go-tpi729-0815-05-bom-authority-research.json" +
  "|docs/architecture/TECHNOLOGY-RECIPE-SOURCE-KNR-2-02-0815-05-GYPSUM-SKIM-V1.md";

export function gypsumSkimCeiling081505PackV1(): TechnologyPack {
  return {
    packId: FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
    packVersion: "1.0",
    definitionId: "def.gypsum_skim.ceiling_0815_05_v1",
    packCapabilities: ["cap.interior_gypsum_skim"],
    lifecycle: "ACTIVE",
    namePl:
      "Gładź gipsowa jednowarstwowa na sufitach — KNR 2-02 0815-05 V1 (2.5 kg/m² · BIP/Owner GO)",
    stages: [{ stageId: "stage.skim", order: 1, namePl: "Gładź gipsowa" }],
    steps: [
      {
        stepId: "step.ceiling_single_layer_gypsum_skim",
        stageId: "stage.skim",
        order: 1,
        namePl:
          "Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach (prefabrykat / beton wylewany)",
        catalogWorkId: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY,
        namePl: "Gładź gipsowa (KNR 2-02 0815-05 · BIP zid=134490)",
        unit: "kg",
        qtyFactor: GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2,
        factorSourceKind: "owner_approved",
        factorSourceRef: GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF,
        factorApprovedAt: GYPSUM_SKIM_CEILING_0815_05_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    equipment: [],
    /**
     * BIP labour norms (r-g/m² sum) — technology hours ≠ OUR RATE PLN.
     * Leaf-only steps bind Finance BOM; do NOT add parent compound to steps
     * (would mis-BOM non-ceiling lines still on legacy-gladzie_tynki-m2).
     */
    labour: [
      {
        labourKey: GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
        namePl: "Gładź gipsowa sufit jednowarstwowa — BIP 0815/05 (0.4375 r-g/m²)",
        hoursPerUnit: 0.4375,
        factorSourceKind: "owner_approved",
        factorSourceRef: GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF,
        factorApprovedAt: GYPSUM_SKIM_CEILING_0815_05_V1_APPROVED_AT,
        wastePolicy: "included_in_factor",
      },
    ],
    regulatory: [],
  };
}

export function seedGypsumSkimCeiling081505V1(): TechnologyPack {
  seedBaselineCapabilities();
  registerCapability({
    capabilityId: "cap.interior_gypsum_skim",
    namePl: "Wewnętrzne gładzie gipsowe (szpachlowanie)",
  });
  registerDefinition({
    definitionId: "def.gypsum_skim.ceiling_0815_05_v1",
    capabilityId: "cap.interior_gypsum_skim",
    namePl: "Definicja gładź gipsowa sufit jednowarstwowa KNR 2-02 0815-05 V1",
  });
  const raw = gypsumSkimCeiling081505PackV1();
  const existing = getPack(raw.packId, raw.packVersion);
  if (existing) return existing;
  return registerPack(raw);
}
