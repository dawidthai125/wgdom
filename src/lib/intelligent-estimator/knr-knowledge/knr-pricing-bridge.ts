/**
 * IK-KNR KL-APP-2 — thin bridge: RR + APP-2-ID → existing F1/F2/F5.
 *
 * Labor: Slice D workId → resolveLaborInputFromOurWorkRate → BOQ qty × OUR RATE SELL.
 * Material: Owner M map → resolveMaterialInputFromPriceMemory(requiredQuantity).
 * Equipment: HOLD v1.
 *
 * FORBIDDEN: invent PLN from R-line norms · Research · BOQ write · auto-VERIFIED.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { resolveLaborInputFromOurWorkRate } from "@/lib/tender-position-cost/our-rate-labor-adapter";
import { resolveMaterialInputFromPriceMemory } from "@/lib/tender-position-cost/material-sell-adapter";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import type { PositionCostInput, PositionMaterialInput } from "@/lib/tender-position-cost/types";
import { resolveKnrPricingIdentity } from "./knr-pricing-identity";
import type {
  KnrPricingBridgeHoldReason,
  KnrPricingBridgeInput,
  KnrPricingBridgeProvenance,
  KnrPricingBridgeResult,
  KnrPricingBridgeStatus,
} from "./knr-pricing-bridge-types";

export {
  type KnrPricingBridgeHoldReason,
  type KnrPricingBridgeInput,
  type KnrPricingBridgeProvenance,
  type KnrPricingBridgeResult,
  type KnrPricingBridgeStatus,
} from "./knr-pricing-bridge-types";

export const KNR_KNOWLEDGE_KL_APP2_IMPLEMENTED = true as const;

function emptyProvenance(
  knrIdentityKeyV2: string,
  nowIso: string,
  extras?: Partial<KnrPricingBridgeProvenance>,
): KnrPricingBridgeProvenance {
  return {
    source: "KL_APP_2",
    knrIdentityKeyV2,
    appliedAt: nowIso,
    mapsUsed: { materialMappingIds: [] },
    pricingPath: {
      labor: "NONE",
      materials: "NONE",
      equipment: "HOLD_V1",
      engine: "NONE",
    },
    laborNormsEvidenceOnly: true,
    ...extras,
  };
}

function pack(
  partial: Omit<KnrPricingBridgeResult, "verificationFromBridge">,
): KnrPricingBridgeResult {
  return { ...partial, verificationFromBridge: false };
}

/**
 * Pure orchestration over existing pricing adapters.
 * Does not mutate BOQ · does not seed maps · does not run Research.
 */
export function bridgeKnrRequirementsToPositionCost(
  input: KnrPricingBridgeInput,
): KnrPricingBridgeResult {
  const rr = input.resourceRequirements;
  const lineId = rr.lineId;
  const knrKey = rr.identityKeyV2;

  if (rr.status !== "APPLIED") {
    return pack({
      status: "REJECT",
      holdReason: "UPSTREAM_NOT_APPLIED",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity: null,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }

  if (
    input.expectedIdentityKeyV2 != null &&
    String(input.expectedIdentityKeyV2).trim() !== String(knrKey).trim()
  ) {
    return pack({
      status: "REJECT",
      holdReason: "IDENTITY_MISMATCH",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity: null,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }

  const identity = resolveKnrPricingIdentity({
    ...input.identityInput,
    lineId: input.identityInput.lineId || lineId,
    knrIdentityKeyV2: input.identityInput.knrIdentityKeyV2 || knrKey,
    boqUnit: input.identityInput.boqUnit || input.boqUnit,
    labor: rr.labor,
    materials: rr.materials,
    equipment: rr.equipment,
    nowIso: input.identityInput.nowIso ?? input.nowIso,
  });

  const posStatus = identity.positionLabor.status;
  if (posStatus === "AMBIGUOUS") {
    return pack({
      status: "HOLD",
      holdReason: "HOLD_IDENTITY_AMBIGUOUS",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }
  if (posStatus === "INVALID") {
    return pack({
      status: "HOLD",
      holdReason: "HOLD_IDENTITY_INVALID",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }
  if (posStatus === "STALE") {
    return pack({
      status: "HOLD",
      holdReason: "HOLD_IDENTITY_STALE",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }
  if (posStatus !== "MAPPED" || !identity.positionLabor.catalogWorkId) {
    return pack({
      status: "HOLD",
      holdReason: "HOLD_NO_WORK_ID",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso),
    });
  }

  // Material identity gates before pricing calls
  for (const m of identity.materials) {
    if (m.status === "UNMAPPED") {
      return pack({
        status: "HOLD",
        holdReason: "HOLD_NO_MATERIAL_MAP",
        lineId,
        knrIdentityKeyV2: knrKey,
        identity,
        laborResolve: null,
        materialResolves: [],
        engineInput: null,
        positionCost: null,
        provenance: emptyProvenance(knrKey, input.nowIso, {
          mapsUsed: {
            positionMappingId: identity.positionLabor.mappingId ?? null,
            materialMappingIds: [],
          },
        }),
      });
    }
    if (m.status === "INVALID" || m.status === "AMBIGUOUS" || m.status === "STALE") {
      const holdReason: KnrPricingBridgeHoldReason =
        m.status === "INVALID"
          ? "HOLD_UNIT_MISMATCH"
          : m.status === "AMBIGUOUS"
            ? "HOLD_IDENTITY_AMBIGUOUS"
            : "HOLD_IDENTITY_STALE";
      return pack({
        status: "HOLD",
        holdReason,
        lineId,
        knrIdentityKeyV2: knrKey,
        identity,
        laborResolve: null,
        materialResolves: [],
        engineInput: null,
        positionCost: null,
        provenance: emptyProvenance(knrKey, input.nowIso, {
          mapsUsed: {
            positionMappingId: identity.positionLabor.mappingId ?? null,
            materialMappingIds: [],
          },
        }),
      });
    }
  }

  if (identity.equipment.length > 0) {
    // Equipment present → cannot fully price v1 (HOLD), after identity OK.
    // Still allow reporting HOLD_EQUIPMENT before labor/material pricing? Spec: equipment HOLD.
    // Fail-closed: do not call F5 when equipment lines exist.
    return pack({
      status: "HOLD",
      holdReason: "HOLD_EQUIPMENT_UNPRICED",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve: null,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso, {
        mapsUsed: {
          positionMappingId: identity.positionLabor.mappingId ?? null,
          materialMappingIds: identity.materials
            .map((m) => m.mappingId)
            .filter((id): id is string => Boolean(id)),
        },
      }),
    });
  }

  const workId = identity.positionLabor.catalogWorkId;
  const laborResolve = resolveLaborInputFromOurWorkRate(
    input.workCatalogStore,
    workId,
    input.boqUnit as WgdomCostUnit,
    input.nowMs,
  );

  if (laborResolve.status !== "CURRENT" || laborResolve.labor.ourRatePln == null) {
    return pack({
      status: "HOLD",
      holdReason: "HOLD_OUR_RATE",
      lineId,
      knrIdentityKeyV2: knrKey,
      identity,
      laborResolve,
      materialResolves: [],
      engineInput: null,
      positionCost: null,
      provenance: emptyProvenance(knrKey, input.nowIso, {
        mapsUsed: {
          positionMappingId: identity.positionLabor.mappingId ?? null,
          materialMappingIds: [],
        },
        pricingPath: {
          labor: "F1_OUR_RATE",
          materials: "NONE",
          equipment: "HOLD_V1",
          engine: "NONE",
        },
      }),
    });
  }

  const materialResolves = identity.materials.map((m) =>
    resolveMaterialInputFromPriceMemory(
      input.workCatalogStore,
      {
        materialKey: m.materialKey,
        quantity: m.requiredQuantity,
        quantityUnit: m.pricingUnit ?? m.resourceUnit,
      },
      input.nowMs,
    ),
  );

  for (const mr of materialResolves) {
    if (mr.status !== "CURRENT" || mr.material.sellPricePln == null) {
      return pack({
        status: "HOLD",
        holdReason: "HOLD_MATERIAL_PRICE",
        lineId,
        knrIdentityKeyV2: knrKey,
        identity,
        laborResolve,
        materialResolves,
        engineInput: null,
        positionCost: null,
        provenance: emptyProvenance(knrKey, input.nowIso, {
          mapsUsed: {
            positionMappingId: identity.positionLabor.mappingId ?? null,
            materialMappingIds: identity.materials
              .map((x) => x.mappingId)
              .filter((id): id is string => Boolean(id)),
          },
          pricingPath: {
            labor: "F1_OUR_RATE",
            materials: "F2_PRICE_MEMORY",
            equipment: "HOLD_V1",
            engine: "NONE",
          },
        }),
      });
    }
  }

  const materials: PositionMaterialInput[] = materialResolves.map((m) => m.material);
  const engineInput: PositionCostInput = {
    quantity: input.boqQuantity,
    unit: input.boqUnit,
    labor: laborResolve.labor,
    materials,
  };
  const positionCost = computePositionCost(engineInput);

  const status: KnrPricingBridgeStatus = positionCost.positionComplete ? "PRICED" : "PARTIAL";

  return pack({
    status,
    lineId,
    knrIdentityKeyV2: knrKey,
    identity,
    laborResolve,
    materialResolves,
    engineInput,
    positionCost,
    provenance: emptyProvenance(knrKey, input.nowIso, {
      mapsUsed: {
        positionMappingId: identity.positionLabor.mappingId ?? null,
        materialMappingIds: identity.materials
          .map((x) => x.mappingId)
          .filter((id): id is string => Boolean(id)),
      },
      pricingPath: {
        labor: "F1_OUR_RATE",
        materials: materials.length > 0 ? "F2_PRICE_MEMORY" : "NONE",
        equipment: "HOLD_V1",
        engine: "F5_COMPUTE_POSITION_COST",
      },
    }),
  });
}
