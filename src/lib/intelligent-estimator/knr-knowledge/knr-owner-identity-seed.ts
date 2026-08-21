/**
 * IK-KNR Owner Identity Seed v1 — static tables status (ZERO invent · ZERO pricing · ZERO BOQ).
 *
 * Production position table: labor-only WYKWITY pilot (1 Owner-approved row).
 * Material table remains empty until Owner supplies:
 *   M-line.code → materialKey (+ EXACT_FOLD units + provenance)
 *
 * REUSE: OwnerKnrMappingRow / OWNER_KNR_MAPPINGS · OwnerKnrMaterialMappingRow /
 * OWNER_KNR_MATERIAL_MAPPINGS · resolveKnrPricingIdentity (APP-2-ID).
 *
 * FORBIDDEN: invent keys · R→workId · hourly · PLN · matcher · Host · Research authority.
 */

import {
  OWNER_KNR_MAPPINGS,
  type OwnerKnrMappingRow,
} from "../ik-knr-owner-mapping";
import {
  OWNER_KNR_MATERIAL_MAPPINGS,
  type OwnerKnrMaterialMappingRow,
  type KnrPricingIdentityWorkRef,
} from "./knr-pricing-identity";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import { foldKnrNormAppUnit } from "./knr-norm-application";

export const KNR_OWNER_IDENTITY_SEED_V1_IMPLEMENTED = true as const;

/** v1: labor-only WYKWITY pilot seeded; material table still empty (legal). */
export const KNR_OWNER_IDENTITY_SEED_V1_STATUS = "PILOT_WYKWITY" as const;

/**
 * Remaining Owner data before broader seed. Do not treat harness inject fixtures as production rows.
 */
export const KNR_OWNER_IDENTITY_SEED_V1_MISSING: readonly string[] = [
  "Owner-approved material rows: knrNormCode + materialKey + resourceUnit/pricingUnit + provenance",
  "Confirmation that candidate keys from tests/docs are NOT production authority (beyond WYKWITY pilot)",
] as const;

export {
  OWNER_KNR_MAPPINGS,
  OWNER_KNR_MATERIAL_MAPPINGS,
  type OwnerKnrMappingRow,
  type OwnerKnrMaterialMappingRow,
};

export type OwnerKnrPositionSeedIssue = {
  kind: "DUPLICATE_LEGAL" | "INVALID_ROW" | "UNIT_MISMATCH" | "UNKNOWN_WORK";
  normalizedKey?: string;
  mappingId?: string;
  messagePl: string;
};

export type OwnerKnrMaterialSeedIssue = {
  kind: "DUPLICATE_LEGAL" | "INVALID_ROW" | "UNIT_MISMATCH";
  knrNormCode?: string;
  mappingId?: string;
  messagePl: string;
};

/**
 * Pure seed integrity check (authoring / harness). Does not invent rows.
 * Empty tables → ok: true.
 */
export function validateOwnerKnrPositionSeedTable(
  table: readonly OwnerKnrMappingRow[],
  works: readonly KnrPricingIdentityWorkRef[] = [],
): { ok: boolean; issues: OwnerKnrPositionSeedIssue[] } {
  const issues: OwnerKnrPositionSeedIssue[] = [];
  const workById = new Map(works.map((w) => [w.id, w]));
  const legalByKey = new Map<string, OwnerKnrMappingRow[]>();

  for (const row of table) {
    const mappingId = String(row.mappingId ?? "").trim();
    const normalizedKey = String(row.normalizedKey ?? "").trim();
    const workId = String(row.workId ?? "").trim();
    const catalogUnit = String(row.catalogUnit ?? "").trim();
    if (!mappingId || !normalizedKey || !workId || !catalogUnit) {
      issues.push({
        kind: "INVALID_ROW",
        mappingId: mappingId || undefined,
        normalizedKey: normalizedKey || undefined,
        messagePl: "Wiersz position seed wymaga mappingId, normalizedKey, workId, catalogUnit.",
      });
      continue;
    }
    if (row.active === true && row.ownerApproval === true) {
      const list = legalByKey.get(normalizedKey) ?? [];
      list.push(row);
      legalByKey.set(normalizedKey, list);
    }
    if (works.length > 0) {
      const work = workById.get(workId);
      if (!work || work.active !== true) {
        issues.push({
          kind: "UNKNOWN_WORK",
          mappingId,
          normalizedKey,
          messagePl: `workId „${workId}” nie istnieje lub jest nieaktywny w podanym katalogu.`,
        });
      } else {
        const uLine = normalizeWorkRateUnitToken(catalogUnit);
        const uWork = normalizeWorkRateUnitToken(work.unit);
        if (!uLine || !uWork || uLine !== uWork) {
          issues.push({
            kind: "UNIT_MISMATCH",
            mappingId,
            normalizedKey,
            messagePl: `Jednostka mappingu „${catalogUnit}” ≠ work.unit „${work.unit}”.`,
          });
        }
      }
    }
  }

  for (const [key, legal] of legalByKey) {
    if (legal.length > 1) {
      issues.push({
        kind: "DUPLICATE_LEGAL",
        normalizedKey: key,
        messagePl: `Więcej niż jeden legalny wiersz dla normalizedKey „${key}” (AMBIGUOUS).`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Pure material seed integrity (authoring / harness). Empty → ok.
 * Does not call Price Memory — invalid live keys surface later in F2 HOLD.
 */
export function validateOwnerKnrMaterialSeedTable(
  table: readonly OwnerKnrMaterialMappingRow[],
): { ok: boolean; issues: OwnerKnrMaterialSeedIssue[] } {
  const issues: OwnerKnrMaterialSeedIssue[] = [];
  const legalByCode = new Map<string, OwnerKnrMaterialMappingRow[]>();

  for (const row of table) {
    const mappingId = String(row.mappingId ?? "").trim();
    const knrNormCode = String(row.knrNormCode ?? "").trim();
    const materialKey = String(row.materialKey ?? "").trim();
    const resourceUnit = String(row.resourceUnit ?? "").trim();
    const pricingUnit = String(row.pricingUnit ?? "").trim();
    const approvedBy = String(row.provenance?.approvedBy ?? "").trim();
    const approvedAt = String(row.provenance?.approvedAt ?? "").trim();
    if (
      !mappingId ||
      !knrNormCode ||
      !materialKey ||
      !resourceUnit ||
      !pricingUnit ||
      !approvedBy ||
      !approvedAt ||
      !Number.isFinite(row.mappingVersion)
    ) {
      issues.push({
        kind: "INVALID_ROW",
        mappingId: mappingId || undefined,
        knrNormCode: knrNormCode || undefined,
        messagePl:
          "Wiersz material seed wymaga mappingId, mappingVersion, knrNormCode, materialKey, units, provenance.",
      });
      continue;
    }
    const ru = foldKnrNormAppUnit(resourceUnit);
    const pu = foldKnrNormAppUnit(pricingUnit);
    if (!ru || !pu || ru !== pu) {
      issues.push({
        kind: "UNIT_MISMATCH",
        mappingId,
        knrNormCode,
        messagePl: `resourceUnit „${resourceUnit}” ≠ pricingUnit „${pricingUnit}” (EXACT_FOLD).`,
      });
    }
    if (row.active === true && row.ownerApproval === true) {
      const list = legalByCode.get(knrNormCode) ?? [];
      list.push(row);
      legalByCode.set(knrNormCode, list);
    }
  }

  for (const [code, legal] of legalByCode) {
    const unitGroups = new Map<string, OwnerKnrMaterialMappingRow[]>();
    for (const row of legal) {
      const fold = foldKnrNormAppUnit(row.resourceUnit) ?? "";
      const g = unitGroups.get(fold) ?? [];
      g.push(row);
      unitGroups.set(fold, g);
    }
    for (const [, g] of unitGroups) {
      if (g.length > 1) {
        issues.push({
          kind: "DUPLICATE_LEGAL",
          knrNormCode: code,
          messagePl: `Więcej niż jeden legalny wiersz dla knrNormCode „${code}” + unit (AMBIGUOUS).`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Production seed snapshot — position pilot WYKWITY · material empty. */
export function getOwnerKnrIdentitySeedV1Snapshot(): {
  status: typeof KNR_OWNER_IDENTITY_SEED_V1_STATUS;
  positionCount: number;
  materialCount: number;
  missing: readonly string[];
} {
  return {
    status: KNR_OWNER_IDENTITY_SEED_V1_STATUS,
    positionCount: OWNER_KNR_MAPPINGS.length,
    materialCount: OWNER_KNR_MATERIAL_MAPPINGS.length,
    missing: KNR_OWNER_IDENTITY_SEED_V1_MISSING,
  };
}
