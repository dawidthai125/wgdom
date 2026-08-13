/**
 * MULTI-BOQ-01 — build DwellingDocumentSet from Owner mapping.
 */

import { getTenderPackage } from "@/lib/multi-dwelling/store";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { DwellingDocumentSet } from "@/lib/multi-boq/types";

export function buildDwellingDocumentSet(opts: {
  tenderId: string;
  dwellingId: string;
  package?: TenderPackage | null;
}): DwellingDocumentSet | null {
  const tid = String(opts.tenderId ?? "").trim();
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  if (!tid || !String(opts.dwellingId ?? "").trim()) return null;

  const pkg = opts.package ?? getTenderPackage(tid);
  if (!pkg || pkg.mode !== "multi") return null;
  if (!pkg.dwellings.some((d) => normalizeDwellingId(d.dwellingId) === dwellingId)) {
    return null;
  }

  const map = pkg.documentToDwelling ?? {};
  const documentIds = Object.entries(map)
    .filter(([, did]) => normalizeDwellingId(did) === dwellingId)
    .map(([docId]) => String(docId).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    tenderId: tid,
    dwellingId,
    documentIds,
    costArtifactIds: [],
    branchHints: [],
    provenance: {
      documentToArtifact: {},
    },
  };
}
