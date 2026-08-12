/**
 * EQUIPMENT-01 — Bid/PCE Equipment contract (CONTRACT-ONLY).
 *
 * D-EQ-01…12: domain separation · UNRESOLVED ≠ 0 PLN · ZERO real pricing source.
 * Labor/Materials PCE UNCHANGED · C-AUX-1 / cutover gate KEEP · C-MODE LOCKED.
 */

export type EquipmentRateStatus = "RESOLVED" | "UNRESOLVED" | "INVALID";

export type EquipmentPriceConfidence = "high" | "medium" | "low";

export type EquipmentPriceProvenance = {
  kind: string;
  labelPl: string;
  ref?: string;
};

/**
 * Minimal Equipment component result (D-EQ-03).
 * RESOLVED rates are out of scope until REAL SOURCE epic — this module never invents PLN.
 */
export type EquipmentComponentResult = {
  lineId: string;
  identityKind: "equipment_line";
  /** Compatibility with OfferBoq classification — not equipmentKey. */
  offerBoqLineKind: "Equipment" | null;
  /** Optional Technology BOM key — null is valid (D-EQ-02). */
  equipmentKey: string | null;
  namePl: string;
  quantity: number | null;
  unit: string | null;
  rateStatus: EquipmentRateStatus;
  unitRatePln: number | null;
  totalPln: number | null;
  provenance: EquipmentPriceProvenance | null;
  confidence: EquipmentPriceConfidence | null;
  reasonPl?: string;
};

export type EquipmentPriceProviderRequest = {
  lineId: string;
  namePl: string;
  quantity: number;
  unit: string;
  equipmentKey?: string | null;
};

export type EquipmentPriceProviderResult = {
  rateStatus: EquipmentRateStatus;
  unitRatePln: number | null;
  provenance: EquipmentPriceProvenance | null;
  confidence: EquipmentPriceConfidence | null;
  reasonPl?: string;
};

export type EquipmentPriceProvider = {
  id: string;
  labelPl: string;
  lookup: (req: EquipmentPriceProviderRequest) => EquipmentPriceProviderResult;
};

/**
 * Default Bid boundary until REAL SOURCE (D-EQ-05 / D-EQ-12).
 * Always UNRESOLVED — never returns 0 PLN as a price.
 */
export function createUnresolvedEquipmentPriceProvider(): EquipmentPriceProvider {
  return {
    id: "equipment_unresolved",
    labelPl: "Equipment — brak źródła ceny Bid (UNRESOLVED)",
    lookup(req) {
      void req;
      return {
        rateStatus: "UNRESOLVED",
        unitRatePln: null,
        provenance: null,
        confidence: null,
        reasonPl: "EQUIPMENT — brak REAL SOURCE dla Bid · UNRESOLVED ≠ 0 PLN",
      };
    },
  };
}

function isValidQuantity(q: number | null | undefined): q is number {
  return typeof q === "number" && Number.isFinite(q) && q > 0;
}

function isValidUnit(u: string | null | undefined): u is string {
  return typeof u === "string" && u.trim().length > 0;
}

/**
 * Build Equipment component for a line — CONTRACT-ONLY (no catalog / Expert / ATH pricing).
 */
export function buildEquipmentComponentResult(opts: {
  lineId: string;
  namePl: string;
  quantity: number | null;
  unit: string | null;
  offerBoqLineKind?: "Equipment" | null;
  equipmentKey?: string | null;
  provider?: EquipmentPriceProvider;
}): EquipmentComponentResult {
  const lineId = String(opts.lineId || "").trim() || "unknown";
  const namePl = String(opts.namePl || "").trim() || "Equipment";
  const equipmentKey =
    opts.equipmentKey == null || String(opts.equipmentKey).trim() === ""
      ? null
      : String(opts.equipmentKey).trim();
  const offerBoqLineKind = opts.offerBoqLineKind === "Equipment" ? "Equipment" : null;

  if (!isValidQuantity(opts.quantity) || !isValidUnit(opts.unit)) {
    return {
      lineId,
      identityKind: "equipment_line",
      offerBoqLineKind,
      equipmentKey,
      namePl,
      quantity: opts.quantity,
      unit: opts.unit,
      rateStatus: "INVALID",
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl: "EQUIPMENT — nieprawidłowa ilość lub jednostka",
    };
  }

  const provider = opts.provider ?? createUnresolvedEquipmentPriceProvider();
  const looked = provider.lookup({
    lineId,
    namePl,
    quantity: opts.quantity,
    unit: opts.unit.trim(),
    equipmentKey,
  });

  // Hard guard: UNRESOLVED/INVALID must never surface 0 as a successful rate/total.
  if (looked.rateStatus !== "RESOLVED") {
    return {
      lineId,
      identityKind: "equipment_line",
      offerBoqLineKind,
      equipmentKey,
      namePl,
      quantity: opts.quantity,
      unit: opts.unit.trim(),
      rateStatus: looked.rateStatus,
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl: looked.reasonPl,
    };
  }

  // RESOLVED path reserved for future REAL SOURCE — still null-safe if misconfigured.
  const unitRatePln =
    typeof looked.unitRatePln === "number" && Number.isFinite(looked.unitRatePln)
      ? looked.unitRatePln
      : null;
  if (unitRatePln == null) {
    return {
      lineId,
      identityKind: "equipment_line",
      offerBoqLineKind,
      equipmentKey,
      namePl,
      quantity: opts.quantity,
      unit: opts.unit.trim(),
      rateStatus: "UNRESOLVED",
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl: "EQUIPMENT — RESOLVED bez unitRatePln → traktuj jako UNRESOLVED",
    };
  }

  return {
    lineId,
    identityKind: "equipment_line",
    offerBoqLineKind,
    equipmentKey,
    namePl,
    quantity: opts.quantity,
    unit: opts.unit.trim(),
    rateStatus: "RESOLVED",
    unitRatePln,
    totalPln: Math.round(opts.quantity * unitRatePln * 100) / 100,
    provenance: looked.provenance,
    confidence: looked.confidence,
    reasonPl: looked.reasonPl,
  };
}
