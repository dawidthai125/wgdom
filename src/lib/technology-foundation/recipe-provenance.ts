/**
 * TECHNOLOGY-RECIPE-CONSUMPTION-01A — recipe factor provenance + production BOM gate.
 * NO invented norms · NO second recipe SSOT.
 */

import type {
  ExplainIssue,
  FactorSourceKind,
  PackEquipmentRecipeLine,
  PackLabourRecipeLine,
  PackMaterialRecipeLine,
  RecipeFactorProvenance,
  TechnologyPack,
  TechnologyPackLifecycle,
  ValidationResult,
  WastePolicy,
} from "./types";

const TRUSTED_KINDS: readonly FactorSourceKind[] = ["owner_approved", "norm_ref"];

function issue(code: string, message: string): ExplainIssue {
  return { code, message, layer: "structural" };
}

function hasText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** Normalize optional provenance on a recipe line (no fabricated defaults for trusted kinds). */
export function normalizeRecipeProvenance(
  line: RecipeFactorProvenance,
): RecipeFactorProvenance {
  const kind = line.factorSourceKind;
  const out: RecipeFactorProvenance = {};
  if (kind === "fixture_legacy" || kind === "owner_approved" || kind === "norm_ref") {
    out.factorSourceKind = kind;
  }
  if (hasText(line.factorSourceRef)) out.factorSourceRef = String(line.factorSourceRef).trim();
  if (hasText(line.factorApprovedAt)) out.factorApprovedAt = String(line.factorApprovedAt).trim();
  if (line.wastePolicy === "included_in_factor" || line.wastePolicy === "none") {
    out.wastePolicy = line.wastePolicy;
  }
  return out;
}

export function isTrustedFactorSourceKind(kind: FactorSourceKind | undefined): boolean {
  return kind != null && TRUSTED_KINDS.includes(kind);
}

/**
 * Line may participate in APPROVED/ACTIVE production when:
 * - fixture_legacy (grandfathered), or
 * - owner_approved|norm_ref with factorSourceRef + factorApprovedAt
 */
export function isRecipeLineProductionReady(line: RecipeFactorProvenance): boolean {
  const kind = line.factorSourceKind;
  if (kind === "fixture_legacy") return true;
  if (kind === "owner_approved" || kind === "norm_ref") {
    return hasText(line.factorSourceRef) && hasText(line.factorApprovedAt);
  }
  return false;
}

export function isRecipeLineApprovedProvenance(line: RecipeFactorProvenance): boolean {
  return isRecipeLineProductionReady(line);
}

function allRecipeLines(pack: TechnologyPack): RecipeFactorProvenance[] {
  return [...pack.materials, ...pack.equipment, ...pack.labour];
}

/** True when every recipe line is fixture_legacy (or pack has no recipe lines). */
export function packHasOnlyFixtureLegacyFactors(pack: TechnologyPack): boolean {
  const lines = allRecipeLines(pack);
  if (lines.length === 0) return true;
  return lines.every((l) => l.factorSourceKind === "fixture_legacy");
}

export function validateRecipeProvenance(pack: TechnologyPack): ValidationResult {
  const warnings: ExplainIssue[] = [];
  const blockingIssues: ExplainIssue[] = [];

  const checkLine = (label: string, line: RecipeFactorProvenance) => {
    const kind = line.factorSourceKind;
    if (!kind) {
      blockingIssues.push(
        issue("RECIPE_FACTOR_NO_SOURCE_KIND", `${label}: missing factorSourceKind`),
      );
      return;
    }
    if (kind === "fixture_legacy") {
      if (line.wastePolicy && line.wastePolicy !== "included_in_factor" && line.wastePolicy !== "none") {
        blockingIssues.push(
          issue("RECIPE_FACTOR_BAD_WASTE", `${label}: invalid wastePolicy`),
        );
      }
      return;
    }
    if (kind === "owner_approved" || kind === "norm_ref") {
      if (!hasText(line.factorSourceRef)) {
        blockingIssues.push(
          issue("RECIPE_FACTOR_NO_SOURCE_REF", `${label}: trusted factor missing factorSourceRef`),
        );
      }
      if (!hasText(line.factorApprovedAt)) {
        blockingIssues.push(
          issue(
            "RECIPE_FACTOR_NO_APPROVED_AT",
            `${label}: trusted factor missing factorApprovedAt`,
          ),
        );
      }
      return;
    }
    blockingIssues.push(
      issue("RECIPE_FACTOR_BAD_SOURCE_KIND", `${label}: unknown factorSourceKind`),
    );
  };

  for (const m of pack.materials) {
    checkLine(`material:${m.materialKey}`, m);
  }
  for (const e of pack.equipment) {
    checkLine(`equipment:${e.equipmentKey}`, e);
  }
  for (const l of pack.labour) {
    checkLine(`labour:${l.labourKey}`, l);
  }

  if (pack.lifecycle === "APPROVED" || pack.lifecycle === "ACTIVE") {
    for (const line of allRecipeLines(pack)) {
      if (!isRecipeLineProductionReady(line)) {
        blockingIssues.push(
          issue(
            "RECIPE_FACTOR_NOT_PRODUCTION_READY",
            `lifecycle=${pack.lifecycle} requires production-ready provenance on all recipe lines`,
          ),
        );
        break;
      }
    }
  }

  if (pack.lifecycle === "REVIEW" || pack.lifecycle === "DRAFT") {
    warnings.push(
      issue(
        "RECIPE_NOT_PRODUCTION",
        `lifecycle=${pack.lifecycle} cannot feed production BOM`,
      ),
    );
  }

  return { warnings, blockingIssues };
}

/** APPROVED requires every line production-ready (trusted SOURCE or fixture_legacy). */
export function canPromoteToApproved(pack: TechnologyPack): boolean {
  const lines = allRecipeLines(pack);
  if (lines.length === 0) return false;
  return (
    lines.every(isRecipeLineProductionReady) &&
    validateRecipeProvenance({ ...pack, lifecycle: "APPROVED" }).blockingIssues.length === 0
  );
}

/**
 * ACTIVE production promotion:
 * - from APPROVED with valid provenance, or
 * - from DRAFT/REVIEW only when all factors are fixture_legacy (grandfather path)
 */
export function canPromoteToActive(
  pack: TechnologyPack,
  from: TechnologyPackLifecycle,
): boolean {
  const lines = allRecipeLines(pack);
  if (lines.length === 0) return false;
  if (from === "APPROVED") {
    return lines.every(isRecipeLineProductionReady);
  }
  if (from === "DRAFT" || from === "REVIEW") {
    return packHasOnlyFixtureLegacyFactors(pack);
  }
  return false;
}

/**
 * Production BOM gate: ACTIVE + every recipe line production-ready.
 * DRAFT / REVIEW / APPROVED → false.
 */
export function canPackFeedProductionBom(pack: TechnologyPack): boolean {
  if (pack.lifecycle !== "ACTIVE") return false;
  const lines = allRecipeLines(pack);
  if (lines.length === 0) return false;
  return lines.every(isRecipeLineProductionReady);
}

export function assertPackMayFeedProductionBom(pack: TechnologyPack): void {
  if (!canPackFeedProductionBom(pack)) {
    throw new Error(
      `RECIPE-01A: pack ${pack.packId}@${pack.packVersion} lifecycle=${pack.lifecycle} cannot feed production BOM`,
    );
  }
}

export function withLegacyFixtureProvenance<
  T extends PackMaterialRecipeLine | PackEquipmentRecipeLine | PackLabourRecipeLine,
>(line: T): T {
  return {
    ...line,
    factorSourceKind: "fixture_legacy",
    wastePolicy: (line.wastePolicy ?? "included_in_factor") as WastePolicy,
  };
}
