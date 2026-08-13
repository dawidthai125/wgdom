/**
 * MULTI-BOQ-01 — compose DwellingCostSnapshot → OfferBoqDocument (schema v5).
 */

import {
  computeOfferBoqRecomputeToken,
  emptyOfferBoqTotals,
  OFFER_BOQ_SCHEMA_VERSION,
  parseOfferBoqQuantity,
  type OfferBoqConfidence,
  type OfferBoqDocument,
  type OfferBoqLine,
} from "@/lib/tender-offer-boq";
import { extractKatalogHintFromDescription } from "@/lib/tender-detail-v4-display";
import { buildOfferBoqLineIdWithSource } from "@/lib/multi-boq/line-id";
import type {
  ComposeDwellingOfferBoqResult,
  DwellingCostSnapshot,
  DwellingLineProvenance,
} from "@/lib/multi-boq/types";

const UNKNOWN_PRICE_SOURCE = {
  kind: "unknown" as const,
  labelPl: "Brak źródła",
};

function knrHintFromDescription(description: string): string | null {
  const hint = extractKatalogHintFromDescription(description);
  if (!hint || hint === "—") return null;
  return hint;
}

function structuralFromSnapshotLine(
  snap: DwellingCostSnapshot,
  line: DwellingCostSnapshot["lines"][number],
): { offerLine: OfferBoqLine; provenance: DwellingLineProvenance } {
  const lineId = buildOfferBoqLineIdWithSource({
    tenderId: snap.tenderId,
    dwellingId: snap.dwellingId,
    sourceDocumentId: line.sourceDocumentId,
    sourceLineKey: line.sourceLineKey,
    lp: line.lp,
    description: line.description,
    indexInSourceDoc: line.indexInSourceDoc,
  });

  const quantity = line.quantity > 0
    ? line.quantity
    : parseOfferBoqQuantity(line.quantityRaw);
  const knrHint = knrHintFromDescription(line.description);
  const warnings: string[] = [];
  if (quantity <= 0) warnings.push("Brak poprawnej ilości — uzupełnij przed wyceną.");
  if (!line.description.trim()) warnings.push("Pusty opis pozycji.");

  let aiConfidence: OfferBoqConfidence = "low";
  if (quantity > 0 && line.description.trim()) aiConfidence = "medium";
  if (quantity > 0 && knrHint) aiConfidence = "high";

  const offerLine: OfferBoqLine = {
    lineId,
    lp: line.lp || String(line.indexInSourceDoc + 1),
    description: line.description.trim() || "(bez opisu)",
    quantity,
    quantityRaw: line.quantityRaw || "",
    unit: line.unit?.trim() || "",

    catalogWorkId: null,
    workCategory: line.branchHint !== "unknown" ? line.branchHint : null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint,
    matchMethod: "snapshot",
    matchedBy: "snapshot",
    matchConfidence: knrHint ? "medium" : "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,

    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { ...UNKNOWN_PRICE_SOURCE },

    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { ...UNKNOWN_PRICE_SOURCE },

    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { ...UNKNOWN_PRICE_SOURCE },

    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,

    athUnitPricePln: line.athUnitPricePln,
    athTotalPln: line.athTotalPln,

    pricingSourceLabelPl: "MULTI-BOQ dwelling compose — wycena AI w kolejnych Slice",
    aiConfidence,
    aiRationale: null,

    userEdited: false,
    editedFields: [],
    warnings,
  };

  const provenance: DwellingLineProvenance = {
    lineId,
    sourceDocumentId: line.sourceDocumentId,
    sourceDocumentIds: line.sourceDocumentIds,
    sourceArtifactId: line.sourceArtifactId,
    sourceArtifactIds: line.sourceArtifactIds,
    branchHint: line.branchHint,
    sourceLineKey: line.sourceLineKey,
    contentHash: line.contentHash,
  };

  return { offerLine, provenance };
}

/**
 * Pure compose: ready snapshot → OfferBoq v5 + provenance side-map.
 * HOLD/conflict/empty → ok:false (never invent 0 PLN complete BOQ).
 */
export function composeDwellingOfferBoq(opts: {
  snapshot: DwellingCostSnapshot;
  builtAt?: string;
  version?: number;
}): ComposeDwellingOfferBoqResult {
  const snap = opts.snapshot;
  if (snap.completeness !== "ready" || snap.lines.length === 0) {
    return {
      ok: false,
      reason:
        snap.completeness === "conflict"
          ? "CONFLICT_HOLD"
          : snap.completeness === "empty"
            ? "EMPTY_SNAPSHOT"
            : "SNAPSHOT_NOT_READY",
      snapshot: snap,
    };
  }

  const builtAt = opts.builtAt ?? new Date().toISOString();
  const lines: OfferBoqLine[] = [];
  const lineProvenance: Record<string, DwellingLineProvenance> = {};

  for (const sl of snap.lines) {
    const { offerLine, provenance } = structuralFromSnapshotLine(snap, sl);
    lines.push(offerLine);
    lineProvenance[offerLine.lineId] = provenance;
  }

  const doc: OfferBoqDocument = {
    schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
    tenderId: snap.tenderId,
    version: opts.version ?? 1,
    builtAt,
    parserSnapshotRef: {
      kosztorysParsedAt: builtAt,
      sourceFilename: `multi_boq:${snap.dwellingId}:${snap.sourceDocumentIds.length}`,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: emptyOfferBoqTotals(lines.length),
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    buildStatus: lines.length === 0 ? "empty" : "structural_only",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [
      ...snap.warnings.slice(0, 8),
      `MULTI_BOQ_COMPOSE sources=${snap.sourceDocumentIds.join(",")}`,
    ],
  };

  return { ok: true, document: doc, lineProvenance, snapshot: snap };
}
