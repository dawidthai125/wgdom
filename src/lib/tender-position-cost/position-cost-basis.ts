/**
 * IK Autonomous Pricing Fallback — Slice 1
 *
 * PositionCostBasis = CatalogBound | EphemeralResearch.
 * Ephemeral basis is NOT a CatalogWork, MUST NOT invent catalogWorkId,
 * and KNR knowledge evidence alone MUST NOT become labor PLN.
 *
 * ZERO HTTP · ZERO KV · ZERO CatalogWork CREATE · ZERO Accept.
 */

import type {
  PositionCostInput,
  PositionLaborInput,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";

export type PricingConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Evidence kinds — knowledge ≠ price. */
export type ResearchEvidenceKind =
  | "KNR_DOC_FACT"
  | "MARKET_LABOR_OBS"
  | "MARKET_MATERIAL_OBS"
  | "MARKET_EQUIPMENT_OBS";

/**
 * Auditable research evidence.
 * Intentionally has NO unitRatePln — evidence is not a price.
 */
export type ResearchEvidence = {
  evidenceId: string;
  kind: ResearchEvidenceKind;
  summaryPl: string;
  sourceId?: string;
  retrievedAt?: string;
};

export type EphemeralLaborComponent = {
  /** zł / unit pozycji — explicit pricing observation, not KNR fact. */
  unitRatePln: number;
  unit: string;
  method: string;
  evidenceIds: readonly string[];
  confidence: PricingConfidence;
};

export type EphemeralMaterialComponent = {
  materialKey: string;
  quantity: number;
  quantityUnit: string;
  sellPricePln: number;
  evidenceIds: readonly string[];
  confidence: PricingConfidence;
};

export type EphemeralEquipmentComponent = {
  unitRatePln: number;
  unit: string;
  evidenceIds: readonly string[];
  confidence: PricingConfidence;
};

export type EphemeralResearchBasis = {
  type: "EPHEMERAL_RESEARCH";
  candidateId: string;
  unit: string;
  components: {
    labor?: EphemeralLaborComponent;
    material?: EphemeralMaterialComponent;
    equipment?: EphemeralEquipmentComponent;
  };
  provenance: {
    evidenceIds: readonly string[];
    builtAt: string;
    builderVersion: string;
  };
  limitations: readonly string[];
};

export type CatalogBoundBasis = {
  type: "CATALOG_BOUND";
  catalogWorkId: string;
  unit: string;
};

export type PositionCostBasis = CatalogBoundBasis | EphemeralResearchBasis;

export type EphemeralBasisValidation =
  | { ok: true; basis: EphemeralResearchBasis }
  | { ok: false; reason: string };

function isFiniteNonNeg(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/** True when object claims EPHEMERAL_RESEARCH (structural, not catalog). */
export function isEphemeralResearchBasis(
  value: unknown,
): value is EphemeralResearchBasis {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === "EPHEMERAL_RESEARCH";
}

/**
 * Reject any attempt to smuggle a catalogWorkId / workId into ephemeral basis.
 * Slice 1: ephemeral MUST NOT masquerade as CatalogWork.
 */
export function ephemeralBasisHasFakeCatalogId(basis: unknown): boolean {
  if (!basis || typeof basis !== "object") return false;
  const v = basis as Record<string, unknown>;
  for (const k of ["catalogWorkId", "workId"] as const) {
    if (k in v && v[k] != null && String(v[k]).trim() !== "") return true;
  }
  return false;
}

/**
 * Returns true when labor evidenceIds resolve only to KNR_DOC_FACT
 * (knowledge ≠ price).
 */
export function knrKnowledgeAloneYieldsLaborPln(
  evidence: readonly ResearchEvidence[],
  laborEvidenceIds: readonly string[],
): boolean {
  const byId = new Map(evidence.map((e) => [e.evidenceId, e]));
  const kinds = laborEvidenceIds
    .map((id) => byId.get(id)?.kind)
    .filter(Boolean) as ResearchEvidenceKind[];
  if (kinds.length === 0) return false;
  return kinds.every((k) => k === "KNR_DOC_FACT");
}

/**
 * Validate ephemeral basis for adapter consumption.
 * Requires candidateId, unit, provenance, and at least one numeric cost component.
 * Rejects fake catalog ids and labor built only from KNR_DOC_FACT when evidence catalog given.
 */
export function validateEphemeralResearchBasis(
  basis: unknown,
  evidenceCatalog?: readonly ResearchEvidence[] | null,
): EphemeralBasisValidation {
  if (!isEphemeralResearchBasis(basis)) {
    return { ok: false, reason: "NOT_EPHEMERAL_RESEARCH" };
  }
  if (ephemeralBasisHasFakeCatalogId(basis)) {
    return { ok: false, reason: "FAKE_CATALOG_ID" };
  }
  const candidateId = String(basis.candidateId ?? "").trim();
  if (!candidateId) return { ok: false, reason: "MISSING_CANDIDATE_ID" };
  const unit = String(basis.unit ?? "").trim();
  if (!unit) return { ok: false, reason: "MISSING_UNIT" };
  if (!basis.provenance || typeof basis.provenance !== "object") {
    return { ok: false, reason: "MISSING_PROVENANCE" };
  }
  const evidenceIds = basis.provenance.evidenceIds;
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    return { ok: false, reason: "MISSING_PROVENANCE_EVIDENCE" };
  }
  if (!String(basis.provenance.builtAt ?? "").trim()) {
    return { ok: false, reason: "MISSING_PROVENANCE_BUILT_AT" };
  }
  if (!String(basis.provenance.builderVersion ?? "").trim()) {
    return { ok: false, reason: "MISSING_PROVENANCE_BUILDER" };
  }

  const labor = basis.components?.labor;
  const material = basis.components?.material;
  const hasLabor = labor != null;
  const hasMaterial = material != null;
  if (!hasLabor && !hasMaterial) {
    return { ok: false, reason: "NO_COST_COMPONENT" };
  }

  if (hasLabor) {
    if (!isFiniteNonNeg(labor.unitRatePln)) {
      return { ok: false, reason: "INVALID_LABOR_RATE" };
    }
    if (!String(labor.unit ?? "").trim()) {
      return { ok: false, reason: "MISSING_LABOR_UNIT" };
    }
    if (!String(labor.method ?? "").trim()) {
      return { ok: false, reason: "MISSING_LABOR_METHOD" };
    }
    if (!Array.isArray(labor.evidenceIds) || labor.evidenceIds.length === 0) {
      return { ok: false, reason: "MISSING_LABOR_EVIDENCE" };
    }
    if (
      labor.confidence !== "HIGH" &&
      labor.confidence !== "MEDIUM" &&
      labor.confidence !== "LOW"
    ) {
      return { ok: false, reason: "MISSING_LABOR_CONFIDENCE" };
    }
    if (
      evidenceCatalog &&
      knrKnowledgeAloneYieldsLaborPln(evidenceCatalog, labor.evidenceIds)
    ) {
      return { ok: false, reason: "KNR_KNOWLEDGE_IS_NOT_PRICE" };
    }
  }

  if (hasMaterial) {
    if (!String(material.materialKey ?? "").trim()) {
      return { ok: false, reason: "MISSING_MATERIAL_KEY" };
    }
    if (
      !isFiniteNonNeg(material.quantity) ||
      !isFiniteNonNeg(material.sellPricePln)
    ) {
      return { ok: false, reason: "INVALID_MATERIAL_COMPONENT" };
    }
  }

  return { ok: true, basis };
}

/**
 * Map a validated ephemeral basis → PositionCostInput for the existing engine.
 * Does not invent catalogWorkId. Equipment stays out of engine input in Slice 1
 * (engine contract = labor + materials only).
 */
export function buildPositionCostInputFromEphemeralBasis(args: {
  basis: EphemeralResearchBasis;
  quantity: number;
  /** Prefer BOQ/identity unit when present; else basis.unit. */
  unit?: string | null;
}): PositionCostInput | null {
  const validation = validateEphemeralResearchBasis(args.basis);
  if (!validation.ok) return null;
  const basis = validation.basis;
  if (!Number.isFinite(args.quantity) || args.quantity < 0) return null;

  const unit = String(args.unit ?? basis.unit).trim() || basis.unit;

  let labor: PositionLaborInput | null = null;
  if (basis.components.labor) {
    labor = {
      status: "CURRENT",
      ourRatePln: basis.components.labor.unitRatePln,
    };
  }

  const materials: PositionMaterialInput[] = [];
  if (basis.components.material) {
    const m = basis.components.material;
    materials.push({
      materialKey: m.materialKey,
      status: "CURRENT",
      quantity: m.quantity,
      quantityUnit: m.quantityUnit,
      sellPricePln: m.sellPricePln,
    });
  }

  return {
    quantity: args.quantity,
    unit,
    labor,
    materials,
  };
}

/**
 * Slice 1 / T2: KNR knowledge evidence alone never yields a pricing candidate.
 * Always null (knowledge ≠ price). Market obs → candidate is Slice 2.
 */
export function pricingCandidateFromKnowledgeEvidenceOnly(
  evidence: readonly ResearchEvidence[],
): null {
  void evidence;
  return null;
}
