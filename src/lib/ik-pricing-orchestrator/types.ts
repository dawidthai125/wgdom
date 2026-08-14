/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 — gap job DTOs (orchestration only).
 * Identity fields come from F5 shadow — ZERO re-resolve.
 */

import type { ShadowGapCode } from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export type IkGapDomain = "labor" | "material";

export type IkLaborGapJob = {
  domain: "labor";
  gapCode: "BRAK_STAWKI_ROBOT";
  tenderId: string;
  dwellingId: string | null;
  lineId: string;
  lp: string;
  workId: string;
  unit: WgdomCostUnit;
  namePl: string;
  /** Dedup / session key fragment helpers use this. */
  dedupeKey: string;
};

export type IkMaterialGapJob = {
  domain: "material";
  gapCode: "BRAK_CENY_MATERIALU";
  tenderId: string;
  dwellingId: string | null;
  lineId: string;
  lp: string;
  materialKey: string;
  catalogWorkId: string;
  /** Optional display / research hint. */
  namePl: string | null;
  quantityUnit: string | null;
  /** Parent work when identity OK — may be null if only material gap recorded. */
  workId: string | null;
  unit: WgdomCostUnit | string | null;
  dedupeKey: string;
};

export type IkGapJob = IkLaborGapJob | IkMaterialGapJob;

export type IkGapInventory = {
  tenderId: string;
  dwellingId: string | null;
  laborJobs: IkLaborGapJob[];
  /** W1 inventory only — W3 executes research. */
  materialJobs: IkMaterialGapJob[];
  skippedGapCodes: ShadowGapCode[];
};

export function buildIkLaborDedupeKey(opts: {
  tenderId: string;
  lineId: string;
  workId: string;
  unit: string;
}): string {
  return `${opts.tenderId}|${opts.lineId}|labor|${opts.workId}|${opts.unit}`;
}

export function buildIkMaterialDedupeKey(opts: {
  tenderId: string;
  lineId: string;
  materialKey: string;
  catalogWorkId: string;
}): string {
  return `${opts.tenderId}|${opts.lineId}|material|${opts.materialKey}|${opts.catalogWorkId}`;
}
