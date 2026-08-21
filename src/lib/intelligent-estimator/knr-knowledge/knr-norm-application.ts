/**
 * IK-KNR KL-APP-1 — apply VERIFIED norms × BOQ quantity (PURE · ZERO PLN).
 *
 * requiredQuantity = Number((boqQuantity * normQuantity).toFixed(6))
 * Unit policy: EXACT_FOLD only · no conversion · no Host · no BOQ write · no pricing.
 */

import type { KnrCatalogEntry, KnrNormLine } from "./knr-catalog-entry-types";
import type {
  KnrNormApplicationInput,
  KnrNormAppHoldReason,
  KnrNormAppProvenance,
  KnrResourceRequirementLine,
  KnrResourceRequirements,
} from "./knr-norm-application-types";
import { KNR_APP1_VERIFICATION_FROM_NORM_APP } from "./knr-norm-application-types";

export {
  KNR_APP1_VERIFICATION_FROM_NORM_APP,
  type KnrNormApplicationInput,
  type KnrNormAppDiagnostics,
  type KnrNormAppHoldReason,
  type KnrNormAppProvenance,
  type KnrNormAppStatus,
  type KnrResourceRequirementLine,
  type KnrResourceRequirements,
} from "./knr-norm-application-types";

export const KNR_KNOWLEDGE_KL_APP1_IMPLEMENTED = true as const;

/** Exact-fold unit token — NO conversion aliases (mb↔m, szt↔msc, …). */
export function foldKnrNormAppUnit(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/m\^?2\b/g, "m2")
    .replace(/\s+/g, "");
}

export function knrNormAppUnitsCompatible(boqUnit: string, knrPositionUnit: string): boolean {
  const a = foldKnrNormAppUnit(boqUnit);
  const b = foldKnrNormAppUnit(knrPositionUnit);
  if (!a || !b) return false;
  return a === b;
}

function baseProvenance(entry: KnrCatalogEntry, nowIso: string): KnrNormAppProvenance {
  return {
    source: "KL_APP_1",
    identityKeyV2: entry.identityKeyV2,
    contentHash: entry.contentHash,
    verifiedAt: entry.verifiedAt ?? null,
    verifiedBy: entry.verifiedBy ?? null,
    appliedAt: nowIso,
    unitCompat: "EXACT_FOLD",
    formula: "required = boqQuantity * normQuantity",
    rounding: "toFixed(6)",
  };
}

function emptyReqs(
  input: KnrNormApplicationInput,
  status: "HOLD" | "REJECT",
  holdReason: KnrNormAppHoldReason,
  extras?: Partial<KnrNormAppProvenance>,
): KnrResourceRequirements {
  const entry = input.entry;
  const provenance: KnrNormAppProvenance = {
    ...baseProvenance(entry, input.nowIso),
    ...extras,
  };
  return {
    lineId: input.lineId,
    identityKeyV2: entry.identityKeyV2,
    displayCode: entry.displayCode,
    knrPositionUnit: entry.unit,
    boqQuantity: input.boqQuantity,
    boqUnit: input.boqUnit,
    status,
    holdReason,
    labor: [],
    materials: [],
    equipment: [],
    provenance,
  };
}

function mapNormLine(
  line: KnrNormLine,
  kind: "R" | "M" | "S",
  boqQuantity: number,
): KnrResourceRequirementLine {
  const requiredQuantity = Number((boqQuantity * line.quantity).toFixed(6));
  return {
    kind,
    code: line.code,
    description: line.description,
    resourceUnit: line.unit,
    normQuantity: line.quantity,
    requiredQuantity,
    sourceNormRef: line.sourceRef ?? null,
  };
}

function hasInvalidNormQuantity(entry: KnrCatalogEntry): boolean {
  for (const line of [
    ...entry.norms.laborNorms,
    ...entry.norms.materialNorms,
    ...entry.norms.equipmentNorms,
  ]) {
    if (!Number.isFinite(line.quantity) || line.quantity < 0) return true;
  }
  return false;
}

/**
 * Pure Norm Application. Deterministic · side-effect free · never VERIFIED · never PLN.
 *
 * Gate order (O.2 STALE before NOT_VERIFIED):
 * identity → STALE → NOT_VERIFIED → lifecycle → contentHash → boq qty →
 * norm qty → unit → norms incomplete → APPLIED
 */
export function applyVerifiedKnrNorms(input: KnrNormApplicationInput): KnrResourceRequirements {
  const entry = input.entry;

  // 1. identityKeyV2 mismatch
  if (
    input.identityKeyV2 != null &&
    String(input.identityKeyV2).trim() !== String(entry.identityKeyV2).trim()
  ) {
    return emptyReqs(input, "REJECT", "IDENTITY_MISMATCH");
  }

  // 2. STALE → HOLD (Owner O.2 — before generic NOT_VERIFIED)
  if (entry.verificationStatus === "STALE") {
    return emptyReqs(input, "HOLD", "STALE_NORMS");
  }

  // 3. verificationStatus !== VERIFIED
  if (entry.verificationStatus !== "VERIFIED") {
    return emptyReqs(input, "REJECT", "NOT_VERIFIED");
  }

  // 4. lifecycleState !== ACTIVE
  if (entry.lifecycleState !== "ACTIVE") {
    return emptyReqs(input, "HOLD", "LIFECYCLE_INACTIVE");
  }

  // 5. contentHashExpected mismatch
  if (
    input.contentHashExpected != null &&
    String(input.contentHashExpected).trim() !== String(entry.contentHash).trim()
  ) {
    return emptyReqs(input, "REJECT", "CONTENT_HASH_MISMATCH");
  }

  // 6. invalid boqQuantity
  if (!Number.isFinite(input.boqQuantity) || input.boqQuantity < 0) {
    return emptyReqs(input, "REJECT", "QUANTITY_INVALID");
  }

  // 7. invalid norm quantity
  if (hasInvalidNormQuantity(entry)) {
    return emptyReqs(input, "REJECT", "QUANTITY_INVALID");
  }

  // 8. unit mismatch (EXACT_FOLD)
  if (!knrNormAppUnitsCompatible(input.boqUnit, entry.unit)) {
    return emptyReqs(input, "HOLD", "UNIT_MISMATCH");
  }

  const laborCount = entry.norms.laborNorms.length;
  const materialCount = entry.norms.materialNorms.length;
  const equipmentCount = entry.norms.equipmentNorms.length;
  const totalNorms = laborCount + materialCount + equipmentCount;
  const emptyWithEvidence = entry.emptyNormsWithEvidence === true;

  // 9. incomplete norms policy
  if (totalNorms === 0 && !emptyWithEvidence) {
    return emptyReqs(input, "HOLD", "NORMS_INCOMPLETE");
  }

  // 10. APPLIED
  const labor = entry.norms.laborNorms.map((n) => mapNormLine(n, "R", input.boqQuantity));
  const materials = entry.norms.materialNorms.map((n) => mapNormLine(n, "M", input.boqQuantity));
  const equipment = entry.norms.equipmentNorms.map((n) => mapNormLine(n, "S", input.boqQuantity));

  const laborNormsEmpty = laborCount === 0 && (materialCount > 0 || equipmentCount > 0);
  const provenance: KnrNormAppProvenance = {
    ...baseProvenance(entry, input.nowIso),
    ...(laborNormsEmpty ? { laborNormsEmpty: true } : {}),
    ...(totalNorms === 0 && emptyWithEvidence ? { emptyNormsWithEvidence: true } : {}),
  };

  const diagnostics =
    laborNormsEmpty || (totalNorms === 0 && emptyWithEvidence)
      ? {
          ...(laborNormsEmpty ? { laborNormsEmpty: true } : {}),
          ...(totalNorms === 0 && emptyWithEvidence ? { emptyNormsWithEvidence: true } : {}),
        }
      : undefined;

  return {
    lineId: input.lineId,
    identityKeyV2: entry.identityKeyV2,
    displayCode: entry.displayCode,
    knrPositionUnit: entry.unit,
    boqQuantity: input.boqQuantity,
    boqUnit: input.boqUnit,
    status: "APPLIED",
    labor,
    materials,
    equipment,
    provenance,
    ...(diagnostics ? { diagnostics } : {}),
  };
}

/** Compile-time / harness marker — Norm App never promotes VERIFIED. */
export function knrNormAppVerificationFromNormApp(): false {
  return KNR_APP1_VERIFICATION_FROM_NORM_APP;
}
