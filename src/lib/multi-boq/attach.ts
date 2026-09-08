/**
 * MULTI-BOQ-01 — attach composed OfferBoq + provenance side-map to dwelling.
 * MULTI-BOQ-WORK-IDENTITY-01 — after compose, REUSE Product Mapper before attach.
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import {
  attachOfferBoqToDwelling,
  getTenderPackage,
  upsertTenderPackage,
} from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { composeDwellingOfferBoq } from "@/lib/multi-boq/compose";
import { mapComposedDwellingOfferBoq } from "@/lib/multi-boq/map-composed-offer-boq";
import { evaluateOfferBoqDocumentsLineIdContinuity } from "@/lib/multi-boq/offer-boq-line-id-continuity";
import { resolveDwellingCostSnapshotForPricing } from "@/lib/multi-boq/resolve";
import type {
  DwellingCostArtifactRef,
  DwellingCostSnapshot,
  DwellingLineProvenance,
} from "@/lib/multi-boq/types";
import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { CatalogWork } from "@/lib/work-catalog/types";

export function invalidateDwellingCosting(opts: {
  tenderId: string;
  dwellingId: string;
}): { ok: true; package: TenderPackage } | { ok: false; reason: string } {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid) return { ok: false, reason: "MISSING_TENDER_ID" };
  const pkg = getTenderPackage(tid);
  if (!pkg) return { ok: false, reason: "PACKAGE_NOT_FOUND" };
  const idx = pkg.dwellings.findIndex(
    (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
  );
  if (idx < 0) return { ok: false, reason: "DWELLING_NOT_FOUND" };
  const next = [...pkg.dwellings];
  next[idx] = {
    ...next[idx]!,
    offerBoq: null,
    f5Gate: null,
    subtotals: null,
    costSnapshot: null,
    lineProvenance: null,
  };
  pkg.dwellings = next;
  const saved = upsertTenderPackage(pkg);
  if (!saved) return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  return { ok: true, package: saved };
}

/**
 * Multi attach path: resolve → compose → Product Mapper → attach.
 * CONFLICT / empty snapshot fails at compose — Mapper is NOT invoked (D02 HOLD).
 * Does NOT use resolveKosztorysSnapshotForPricing.
 */
export function attachComposedBoqToDwelling(opts: {
  tenderId: string;
  dwellingId: string;
  item?: TenderPipelineItem | null;
  artifacts?: DwellingCostArtifactRef[];
  package?: TenderPackage | null;
  /** Optional Work Catalog inject (tests) — default: local store active works. */
  works?: CatalogWork[];
  mappedAt?: string;
  /**
   * OPTION B — when provided, composed OfferBoq must match Bid lineIds (exact continuity).
   * Fail-closed: no attach on mismatch. Omitted = no Bid gate (legacy callers).
   */
  bidOfferBoqForContinuity?: OfferBoqDocument | null;
}): {
  ok: true;
  package: TenderPackage;
  snapshot: DwellingCostSnapshot;
  lineProvenance: Record<string, DwellingLineProvenance>;
} | {
  ok: false;
  reason: string;
  snapshot?: DwellingCostSnapshot;
} {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  const snapshot = resolveDwellingCostSnapshotForPricing({
    tenderId: tid,
    dwellingId,
    item: opts.item,
    artifacts: opts.artifacts,
    package: opts.package,
  });

  const composed = composeDwellingOfferBoq({ snapshot });
  if (!composed.ok) {
    return { ok: false, reason: composed.reason, snapshot };
  }

  if (opts.bidOfferBoqForContinuity) {
    const continuity = evaluateOfferBoqDocumentsLineIdContinuity(
      opts.bidOfferBoqForContinuity,
      composed.document,
    );
    if (!continuity.ok) {
      return {
        ok: false,
        reason: `OFFERBOQ_LINE_ID_CONTINUITY_FAIL:${continuity.reasonCodes.join("+")}`,
        snapshot,
      };
    }
  }

  // MULTI-BOQ-WORK-IDENTITY-01 — structural → mapOfferBoqDocument (REUSE)
  const mappedDoc = mapComposedDwellingOfferBoq({
    document: composed.document,
    works: opts.works,
    mappedAt: opts.mappedAt,
    documentContext: `multi_boq:${dwellingId}`,
  });

  const attached = attachOfferBoqToDwelling({
    tenderId: tid,
    dwellingId,
    offerBoq: mappedDoc,
  });
  if (!attached.ok) {
    return { ok: false, reason: attached.reason, snapshot };
  }

  const pkg = attached.package;
  const idx = pkg.dwellings.findIndex(
    (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
  );
  if (idx < 0) return { ok: false, reason: "DWELLING_NOT_FOUND", snapshot };

  const next = [...pkg.dwellings];
  next[idx] = {
    ...next[idx]!,
    costSnapshot: snapshot,
    lineProvenance: composed.lineProvenance,
  };
  pkg.dwellings = next;
  const saved = upsertTenderPackage(pkg);
  if (!saved) return { ok: false, reason: "STORAGE_UNAVAILABLE", snapshot };
  return {
    ok: true,
    package: saved,
    snapshot,
    lineProvenance: composed.lineProvenance,
  };
}
