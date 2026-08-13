/**
 * MULTI-BOQ-01 — attach composed OfferBoq + provenance side-map to dwelling.
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import {
  attachOfferBoqToDwelling,
  getTenderPackage,
  upsertTenderPackage,
} from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { composeDwellingOfferBoq } from "@/lib/multi-boq/compose";
import { resolveDwellingCostSnapshotForPricing } from "@/lib/multi-boq/resolve";
import type {
  DwellingCostArtifactRef,
  DwellingCostSnapshot,
  DwellingLineProvenance,
} from "@/lib/multi-boq/types";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";

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
 * Multi attach path: resolve dwelling snapshot → compose → attach.
 * Does NOT use resolveKosztorysSnapshotForPricing.
 */
export function attachComposedBoqToDwelling(opts: {
  tenderId: string;
  dwellingId: string;
  item?: TenderPipelineItem | null;
  artifacts?: DwellingCostArtifactRef[];
  package?: TenderPackage | null;
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

  const attached = attachOfferBoqToDwelling({
    tenderId: tid,
    dwellingId,
    offerBoq: composed.document,
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
