/**
 * IK-KNR-EXPERT Slice D — Owner-confirmed KNR → CatalogWork overlay.
 *
 * Authority: exact normalizedKey + one active row + ownerApproval + CatalogWork + unit.
 * WRITE: catalogWorkId only, on LINE COPIES (never shared ref.line).
 * ZERO knrHint / mapper / A1 / P3 / Research / KV / settings / flags.
 *
 * Production table: labor-only WYKWITY pilot (1 Owner-approved row).
 * Do not invent additional KNR table codes / workIds here.
 *
 * P3 SEAM (host, not this module): IkEntryHost runs applyOwnerKnrMapping, then
 * existing P3 classification on the overlay expert and passes opts.classification
 * into the conversation VM. Chosen over opts.ingest.expert so D does not fabricate
 * ingest when ingest is null, does not add false ingest steps, does not change
 * C3 copy / Surface.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import type { IkDocumentExpertReport, IkMasterBoqLineRef } from "./ik-document-expert";
import type { IkKnrExpertReport } from "./ik-knr-expert";

export type OwnerKnrMappingRow = {
  mappingId: string;
  normalizedKey: string;
  workId: string;
  catalogUnit: string;
  ownerApproval: boolean;
  active: boolean;
};

export type OwnerKnrWorkRef = Pick<CatalogWork, "id" | "unit" | "active">;

export type OwnerKnrMappingApplyInput = {
  documentExpert: IkDocumentExpertReport;
  knr: IkKnrExpertReport | null;
  works?: readonly OwnerKnrWorkRef[];
  table?: readonly OwnerKnrMappingRow[];
};

export type OwnerKnrMappingApplyResult = {
  expert: IkDocumentExpertReport;
  appliedLineIds: string[];
  catalogWorkIdWritten: number;
};

/**
 * Production Owner authority — WYKWITY pilot + C2 KNNR 1305-01/02 prob (OD-01 Variant A).
 * Exact normalizedKey + one active row + ownerApproval + CatalogWork + unit.
 */
export const OWNER_KNR_MAPPINGS: readonly OwnerKnrMappingRow[] = [
  {
    mappingId: "owner-knr-wykwity-1202-07",
    normalizedKey: "KNR-W|4-01|1202-07",
    workId: "cc-w2-wykwity-zacieki",
    catalogUnit: "m2",
    ownerApproval: true,
    active: true,
  },
  {
    mappingId: "owner-knr-knnr-5-1305-01",
    normalizedKey: "KNNR|5|1305-01",
    workId: "knnr-wc-knnr-5-1305-01-prob",
    catalogUnit: "prob",
    ownerApproval: true,
    active: true,
  },
  {
    mappingId: "owner-knr-knnr-5-1305-02",
    normalizedKey: "KNNR|5|1305-02",
    workId: "knnr-wc-knnr-5-1305-02-prob",
    catalogUnit: "prob",
    ownerApproval: true,
    active: true,
  },
];

function cloneMasterRefs(refs: readonly IkMasterBoqLineRef[]): IkMasterBoqLineRef[] {
  return refs.map((ref) => ({
    ...ref,
    line: { ...ref.line },
  }));
}

function unitsCompatible(lineUnit: string, mappingUnit: string, workUnit: string): boolean {
  const line = normalizeWorkRateUnitToken(lineUnit);
  const mapped = normalizeWorkRateUnitToken(mappingUnit);
  const work = normalizeWorkRateUnitToken(workUnit);
  if (!line || !mapped || !work) return false;
  return line === mapped && line === work;
}

function resolveWorks(explicit?: readonly OwnerKnrWorkRef[]): readonly OwnerKnrWorkRef[] {
  if (explicit) return explicit;
  const store = loadWorkCatalogStoreLocal();
  return listActiveWorksForRegion(store, store.activeRegion);
}

function lineKey(dwellingId: string, lineId: string): string {
  return `${dwellingId}|${lineId}`;
}

/**
 * Pure overlay. Never mutates documentExpert / knr / shared Master BOQ lines.
 * Does not call A1 gate or P3 classification.
 */
export function applyOwnerKnrMapping(
  input: OwnerKnrMappingApplyInput,
): OwnerKnrMappingApplyResult {
  const expert = input.documentExpert;
  const overlayRefs = cloneMasterRefs(expert.masterBoqLines ?? []);
  const overlayExpert: IkDocumentExpertReport = {
    ...expert,
    masterBoqLines: overlayRefs,
  };

  const empty: OwnerKnrMappingApplyResult = {
    expert: overlayExpert,
    appliedLineIds: [],
    catalogWorkIdWritten: 0,
  };

  const knr = input.knr;
  if (!knr || knr.status !== "COMPLETED") return empty;

  const table = input.table ?? OWNER_KNR_MAPPINGS;
  const works = resolveWorks(input.works);
  const workById = new Map(works.map((w) => [w.id, w]));

  const legalByKey = new Map<string, OwnerKnrMappingRow[]>();
  for (const row of table) {
    const key = String(row.normalizedKey ?? "");
    if (!key) continue;
    const list = legalByKey.get(key) ?? [];
    list.push(row);
    legalByKey.set(key, list);
  }

  const knrByLine = new Map<string, (typeof knr.lines)[number]>();
  for (const row of knr.lines ?? []) {
    knrByLine.set(lineKey(row.dwellingId, row.lineId), row);
  }

  const appliedLineIds: string[] = [];

  for (const ref of overlayRefs) {
    const knrLine = knrByLine.get(lineKey(ref.dwellingId, ref.line.lineId));
    if (!knrLine || knrLine.lineStatus !== "CANDIDATE") continue;
    const key = knrLine.catalogBasis?.normalizedKey;
    if (!key) continue;

    const allForKey = legalByKey.get(key) ?? [];
    const legal = allForKey.filter((r) => r.active === true && r.ownerApproval === true);
    if (legal.length !== 1) continue;

    const row = legal[0];
    const work = workById.get(row.workId);
    if (!work || work.active !== true) continue;
    if (!unitsCompatible(ref.line.unit, row.catalogUnit, work.unit)) continue;

    ref.line.catalogWorkId = work.id;
    appliedLineIds.push(ref.line.lineId);
  }

  return {
    expert: overlayExpert,
    appliedLineIds,
    catalogWorkIdWritten: appliedLineIds.length,
  };
}
