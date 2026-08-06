/**
 * Business validation — TF-9 (capability / equipment / org constraints).
 * Pure fixtures only — no Cloud / Payroll.
 */

import type {
  BusinessProfileFixture,
  ExplainIssue,
  TechnologyPack,
  ValidationResult,
} from "./types";

function issue(code: string, message: string): ExplainIssue {
  return { code, message, layer: "business" };
}

export function validateBusiness(
  pack: TechnologyPack,
  profile: BusinessProfileFixture,
): ValidationResult {
  const warnings: ExplainIssue[] = [];
  const blockingIssues: ExplainIssue[] = [];

  const company = new Set(profile.companyCapabilityIds ?? []);
  for (const cap of pack.packCapabilities) {
    if (!company.has(cap)) {
      blockingIssues.push(
        issue("BIZ_CAP_MISSING", `Company missing capability ${cap} required by pack`),
      );
    }
  }

  const available = new Set(profile.availableEquipmentKeys ?? []);
  for (const eq of pack.equipment) {
    if (!available.has(eq.equipmentKey)) {
      warnings.push(
        issue(
          "BIZ_EQ_MISSING",
          `Equipment ${eq.equipmentKey} not listed in company profile (degrade)`,
        ),
      );
    }
  }

  for (const code of profile.orgConstraintCodes ?? []) {
    if (code === "FORBID_EXTERNAL_INSULATION" && pack.packId.includes("etics")) {
      blockingIssues.push(
        issue("BIZ_ORG_FORBID", "Org constraint FORBID_EXTERNAL_INSULATION blocks ETICS pack"),
      );
    }
  }

  for (const reg of pack.regulatory) {
    if (reg.required) {
      warnings.push(
        issue("BIZ_REG_REQUIRED", `Regulatory check required: ${reg.regulatoryId} (${reg.namePl})`),
      );
    }
  }

  return { warnings, blockingIssues };
}
