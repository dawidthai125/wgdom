/**
 * TRANSPORT-01 MODEL-1A — Bid Transport contract (CONTRACT-ONLY).
 *
 * D-TR-01…16: taxonomy · UNRESOLVED ≠ 0 · ZERO real pricing · ZERO identity binder.
 * No shadow/F5/OfferBoq schema · noise-filter UNCHANGED · C-MODE / F0–F6 / Payroll LOCKED.
 *
 * Structural REUSE: equipment-contract.ts pattern only — NOT Equipment semantics.
 */

export type TransportRateStatus = "RESOLVED" | "UNRESOLVED" | "INVALID";

export type TransportPriceConfidence = "high" | "medium" | "low";

export type TransportPriceProvenance = {
  kind: string;
  labelPl: string;
  ref?: string;
};

/**
 * Caller-declared class for a future Bid Transport candidate.
 * MODEL-1A never infers this from description text, catalog-noise flags,
 * disposal/utylizacja catalog category, or Cost Intelligence component labels.
 */
export type TransportSourceClass = "noise" | "bid_candidate" | "utylizacja" | "unknown";

/**
 * Minimal Transport component result (PLAN §3).
 * RESOLVED rates are out of scope until REAL SOURCE — this module never invents PLN.
 * identityKind is transport-specific and independent of OfferBoqLineKind (D-TR-16: no Transport kind).
 */
export type TransportComponentResult = {
  lineId: string;
  identityKind: "transport_line";
  namePl: string;
  quantity: number | null;
  unit: string | null;
  /**
   * PROVISIONAL open string — NOT a closed enum (PLAN: do not freeze without evidence).
   */
  transportKind: string | null;
  /**
   * Optional OfferBoq signal (e.g. CI component label) — signal only, never Bid identity / price.
   */
  offerBoqSignal: string | null;
  sourceClass: TransportSourceClass;
  rateStatus: TransportRateStatus;
  unitRatePln: number | null;
  totalPln: number | null;
  provenance: TransportPriceProvenance | null;
  confidence: TransportPriceConfidence | null;
  reasonPl?: string;
};

export type TransportPriceProviderRequest = {
  lineId: string;
  namePl: string;
  quantity: number;
  unit: string;
  transportKind?: string | null;
};

export type TransportPriceProviderResult = {
  rateStatus: TransportRateStatus;
  unitRatePln: number | null;
  provenance: TransportPriceProvenance | null;
  confidence: TransportPriceConfidence | null;
  reasonPl?: string;
};

export type TransportPriceProvider = {
  id: string;
  labelPl: string;
  lookup: (req: TransportPriceProviderRequest) => TransportPriceProviderResult;
};

/**
 * Default Bid boundary until REAL SOURCE (D-TR-05 / D-TR-06 / D-TR-12).
 * Always UNRESOLVED — never returns a numeric price (incl. zero).
 */
export function createUnresolvedTransportPriceProvider(): TransportPriceProvider {
  return {
    id: "transport_unresolved",
    labelPl: "Transport — brak źródła ceny Bid (UNRESOLVED)",
    lookup(req) {
      void req;
      return {
        rateStatus: "UNRESOLVED",
        unitRatePln: null,
        provenance: null,
        confidence: null,
        reasonPl: "TRANSPORT — brak REAL SOURCE dla Bid · UNRESOLVED ≠ 0 PLN",
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

function normalizeTransportKind(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  return t.length > 0 ? t : null;
}

function normalizeOfferBoqSignal(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  return t.length > 0 ? t : null;
}

function normalizeSourceClass(raw: TransportSourceClass | null | undefined): TransportSourceClass {
  if (raw === "noise" || raw === "utylizacja" || raw === "unknown" || raw === "bid_candidate") {
    return raw;
  }
  // Explicit builder call without class = future Bid candidate (no auto-binder).
  return "bid_candidate";
}

/**
 * Build Transport component for an explicitly supplied Bid candidate — CONTRACT-ONLY.
 *
 * NO identity binder: does not read line description, catalog-noise flags,
 * catalog category ids, or Cost Intelligence labels.
 * noise / disposal-utylizacja sourceClass → INVALID (not logistics Bid).
 */
export function buildTransportComponentResult(opts: {
  lineId: string;
  namePl: string;
  quantity: number | null;
  unit: string | null;
  transportKind?: string | null;
  offerBoqSignal?: string | null;
  sourceClass?: TransportSourceClass | null;
  provider?: TransportPriceProvider;
}): TransportComponentResult {
  const lineId = String(opts.lineId || "").trim() || "unknown";
  const namePl = String(opts.namePl || "").trim() || "Transport";
  const transportKind = normalizeTransportKind(opts.transportKind);
  const offerBoqSignal = normalizeOfferBoqSignal(opts.offerBoqSignal);
  const sourceClass = normalizeSourceClass(opts.sourceClass);

  // D-TR-01 / D-TR-04 — catalog noise and TRANSPORT_UTYLIZACJA are not logistics Bid Transport.
  if (sourceClass === "noise" || sourceClass === "utylizacja") {
    return {
      lineId,
      identityKind: "transport_line",
      namePl,
      quantity: opts.quantity,
      unit: opts.unit,
      transportKind,
      offerBoqSignal,
      sourceClass,
      rateStatus: "INVALID",
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl:
        sourceClass === "noise"
          ? "TRANSPORT — catalog noise ≠ Bid Transport (D-TR-01)"
          : "TRANSPORT — TRANSPORT_UTYLIZACJA ≠ logistics Bid Transport (D-TR-04)",
    };
  }

  if (!isValidQuantity(opts.quantity) || !isValidUnit(opts.unit)) {
    return {
      lineId,
      identityKind: "transport_line",
      namePl,
      quantity: opts.quantity,
      unit: opts.unit,
      transportKind,
      offerBoqSignal,
      sourceClass,
      rateStatus: "INVALID",
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl: "TRANSPORT — nieprawidłowa ilość lub jednostka",
    };
  }

  const provider = opts.provider ?? createUnresolvedTransportPriceProvider();
  const looked = provider.lookup({
    lineId,
    namePl,
    quantity: opts.quantity,
    unit: opts.unit.trim(),
    transportKind,
  });

  // Hard guard: UNRESOLVED/INVALID must never surface 0 as a successful rate/total.
  if (looked.rateStatus !== "RESOLVED") {
    return {
      lineId,
      identityKind: "transport_line",
      namePl,
      quantity: opts.quantity,
      unit: opts.unit.trim(),
      transportKind,
      offerBoqSignal,
      sourceClass,
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
      identityKind: "transport_line",
      namePl,
      quantity: opts.quantity,
      unit: opts.unit.trim(),
      transportKind,
      offerBoqSignal,
      sourceClass,
      rateStatus: "UNRESOLVED",
      unitRatePln: null,
      totalPln: null,
      provenance: null,
      confidence: null,
      reasonPl: "TRANSPORT — RESOLVED bez unitRatePln → traktuj jako UNRESOLVED",
    };
  }

  return {
    lineId,
    identityKind: "transport_line",
    namePl,
    quantity: opts.quantity,
    unit: opts.unit.trim(),
    transportKind,
    offerBoqSignal,
    sourceClass,
    rateStatus: "RESOLVED",
    unitRatePln,
    totalPln: Math.round(opts.quantity * unitRatePln * 100) / 100,
    provenance: looked.provenance,
    confidence: looked.confidence,
    reasonPl: looked.reasonPl,
  };
}
