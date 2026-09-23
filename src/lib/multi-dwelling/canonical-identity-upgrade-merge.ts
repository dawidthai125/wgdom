/**
 * Canonical identity upgrade merge — score-tie seam for multi-dwelling packages.
 *
 * Pure · no storage · no network · no mutation of inputs.
 * Recognizes IdentityPhase persistence deltas (auto_contract + cw.knr.*) —
 * does NOT re-run CLLR / canonical rebind evaluation.
 *
 * OWNER_RC1_VERIFY_CONNECT_LEAF_UPGRADE_v1 — additive fail-closed class for
 * exactly two Owner-approved RC1 VERIFY_CONNECT leaves (≠ generic p2b).
 *
 * OWNER_RC1_CREATE_CANDIDATE_LEAF_UPGRADE_v1 — additive fail-closed class for
 * exactly one Owner-approved RC1 CREATE_CANDIDATE leaf (≠ generic knr-wc / ≠ CONNECT).
 *
 * OWNER_RC1_CREATE_CANDIDATE_KPL_LEAF_UPGRADE_v1 — additive fail-closed class for
 * exactly one Owner-approved RC1 CREATE_CANDIDATE_KPL leaf (unit kpl HARD · ≠ szt CREATE).
 */

import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { DwellingCostUnit, TenderPackage } from "@/lib/multi-dwelling/types";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import {
  hasOwnerRc1VerifyConnectAttestation,
  isOwnerRc1VerifyConnectLeafWorkId,
} from "@/lib/work-catalog/owner-rc1-verify-connect-contract";
import {
  hasOwnerRc1CreateCandidateAttestation,
  isOwnerRc1CreateCandidateLeafWorkId,
} from "@/lib/work-catalog/owner-rc1-create-candidate-contract";
import {
  hasOwnerRc1CreateCandidateKplAttestation,
  isOwnerRc1CreateCandidateKplLeafWorkId,
} from "@/lib/work-catalog/owner-rc1-create-candidate-kpl-contract";

export type CanonicalIdentityUpgradeDecision =
  | "ACCEPT_CANONICAL_IDENTITY_UPGRADE"
  | "KEEP_CLOUD"
  | "REJECT_UNSAFE_IDENTITY_UPGRADE";

export type CanonicalIdentityUpgradeMergeResult = {
  decision: CanonicalIdentityUpgradeDecision;
  reasons: string[];
  /** Identity fields taken from local when ACCEPT. */
  appliedIdentityFields?: readonly string[];
};

/** Structural package richness (existing merge score). */
export function scoreTenderPackageRichness(pkg: TenderPackage): number {
  return (
    pkg.dwellings.length
    + pkg.dwellings.filter((d) => d.offerBoq != null).length * 10
  );
}

const AUTO_CONTRACT = "auto_contract";
const LEAF_0815_05 = "cw.knr.knr-2-02.0815-05.m2";

const IDENTITY_FIELD_KEYS = [
  "catalogWorkId",
  "matchMethod",
  "matchedBy",
  "matchConfidence",
  "aiConfidence",
  "aiRationale",
  "candidateMatches",
  "warnings",
] as const;

const NON_IDENTITY_COMPARE_KEYS = [
  "lineId",
  "lp",
  "description",
  "quantity",
  "quantityRaw",
  "unit",
  "workCategory",
  "categoryId",
  "isNoise",
  "noiseKind",
  "normalizedDescription",
  "aliasRuleId",
  "knrHint",
  "catalogBasis",
  "costIntelligence",
  "linePricing",
  "materialUnitPln",
  "materialCostPln",
  "materialSource",
  "laborRbh",
  "laborRatePlnPerH",
  "laborCostPln",
  "laborSource",
  "equipmentUnitPln",
  "equipmentCostPln",
  "equipmentSource",
  "directCostPln",
  "kpPln",
  "overheadSharePln",
  "marginPln",
  "lineTotalPln",
  "athUnitPricePln",
  "athTotalPln",
  "pricingSourceLabelPl",
  "userEdited",
  "editedFields",
  "autoG2Rate",
  "autoG2Bom",
  "quantityExpressionRaw",
  "quantityIntelligence",
  "boqSemanticRelations",
] as const;

function stableJson(v: unknown): string {
  if (v == null) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`).join(",")}}`;
}

export function isCanonicalLaborLeafWorkId(workId: string | null | undefined): boolean {
  const id = String(workId ?? "").trim();
  return /^cw\.knr\./i.test(id);
}

/**
 * Leaves eligible for score-tie identity upgrade ACCEPT:
 * existing cw.knr.*
 * OR Owner RC1 VERIFY_CONNECT allowlist (exactly 2 workIds)
 * OR Owner RC1 CREATE_CANDIDATE allowlist (exactly 1 workId — 0504-07 szt)
 * OR Owner RC1 CREATE_CANDIDATE_KPL allowlist (exactly 1 workId — 0501-03 kpl).
 * Does NOT widen /^knr-wc-/ · does NOT invent global CREATE / KPL class.
 */
export function isIdentityUpgradeEligibleLeafWorkId(
  workId: string | null | undefined,
): boolean {
  return (
    isCanonicalLaborLeafWorkId(workId)
    || isOwnerRc1VerifyConnectLeafWorkId(workId)
    || isOwnerRc1CreateCandidateLeafWorkId(workId)
    || isOwnerRc1CreateCandidateKplLeafWorkId(workId)
  );
}

export function isLegacyOrNonCanonicalWorkId(workId: string | null | undefined): boolean {
  const id = String(workId ?? "").trim();
  if (!id) return true;
  if (/^legacy-/i.test(id)) return true;
  return !isIdentityUpgradeEligibleLeafWorkId(id);
}

function hasCanonicalRebindAttestation(line: OfferBoqLine): boolean {
  if (String(line.matchMethod || "") !== AUTO_CONTRACT) return false;
  if (String(line.matchedBy || "") !== AUTO_CONTRACT) return false;
  const r = String(line.aiRationale || "");
  return (
    r.includes("COMPOUND_LEAF_REBIND")
    || r.includes("CANONICAL_LEAF_REBIND")
    || r.includes("EXACT_IDENTITY_ATTESTED")
    || r.includes("SOURCE_MODE=LABOR_TO_CANONICAL")
    || r.includes("SOURCE_MODE=COMPOUND")
  );
}

function fieldValue(line: OfferBoqLine, key: string): unknown {
  return (line as unknown as Record<string, unknown>)[key];
}

function nonIdentityEqual(cloud: OfferBoqLine, local: OfferBoqLine): string | null {
  for (const key of NON_IDENTITY_COMPARE_KEYS) {
    if (stableJson(fieldValue(cloud, key)) !== stableJson(fieldValue(local, key))) {
      return key;
    }
  }
  return null;
}

function touches081505(cloud: OfferBoqLine, local: OfferBoqLine): boolean {
  const c = String(cloud.catalogWorkId || "").trim();
  const l = String(local.catalogWorkId || "").trim();
  return c === LEAF_0815_05 || l === LEAF_0815_05;
}

/**
 * Pure line-level decision: may local identity delta upgrade cloud on a score tie?
 */
export function evaluateCanonicalIdentityUpgradeMerge(input: {
  cloudLine: OfferBoqLine | null | undefined;
  localLine: OfferBoqLine | null | undefined;
}): CanonicalIdentityUpgradeMergeResult {
  const cloud = input.cloudLine;
  const local = input.localLine;
  const reasons: string[] = [];

  if (!cloud || !local) {
    return {
      decision: "KEEP_CLOUD",
      reasons: ["MISSING_LINE"],
    };
  }

  const cloudId = String(cloud.lineId || "").trim();
  const localId = String(local.lineId || "").trim();
  if (!cloudId || cloudId !== localId) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["DIFFERENT_LOGICAL_LINE"],
    };
  }

  if (
    String(cloud.catalogWorkId || "") === String(local.catalogWorkId || "")
    && String(cloud.matchMethod || "") === String(local.matchMethod || "")
  ) {
    return {
      decision: "KEEP_CLOUD",
      reasons: ["IDENTICAL_IDENTITY"],
    };
  }

  const drift = nonIdentityEqual(cloud, local);
  if (drift) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: [`NON_IDENTITY_FIELD_DRIFT=${drift}`],
    };
  }

  if (touches081505(cloud, local) && String(cloud.catalogWorkId) !== String(local.catalogWorkId)) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["0815_05_MUST_REMAIN_UNTOUCHED"],
    };
  }

  const localWid = String(local.catalogWorkId || "").trim();
  const cloudWid = String(cloud.catalogWorkId || "").trim();

  const localIsCwKnr = isCanonicalLaborLeafWorkId(localWid);
  const localIsRc1Connect = isOwnerRc1VerifyConnectLeafWorkId(localWid);
  const localIsRc1Create = isOwnerRc1CreateCandidateLeafWorkId(localWid);
  const localIsRc1CreateKpl = isOwnerRc1CreateCandidateKplLeafWorkId(localWid);

  if (!localIsCwKnr && !localIsRc1Connect && !localIsRc1Create && !localIsRc1CreateKpl) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["LOCAL_NOT_CANONICAL_LEAF"],
    };
  }

  if (String(local.matchMethod || "") !== AUTO_CONTRACT) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["LOCAL_MATCH_METHOD_NOT_AUTO_CONTRACT"],
    };
  }

  // Fuzzy / weak methods never upgrade
  const weakMethods = new Set([
    "fuzzy",
    "semantic",
    "normalized_description",
    "description_only",
  ]);
  if (weakMethods.has(String(local.matchMethod || "").toLowerCase())) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["FUZZY_OR_WEAK_MATCH"],
    };
  }

  if (localIsRc1CreateKpl) {
    if (
      !hasOwnerRc1CreateCandidateKplAttestation({
        leafWorkId: localWid,
        matchMethod: local.matchMethod,
        matchedBy: local.matchedBy,
        aiRationale: local.aiRationale,
      })
    ) {
      return {
        decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
        reasons: ["MISSING_OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION"],
      };
    }
  } else if (localIsRc1Create) {
    if (
      !hasOwnerRc1CreateCandidateAttestation({
        leafWorkId: localWid,
        matchMethod: local.matchMethod,
        matchedBy: local.matchedBy,
        aiRationale: local.aiRationale,
      })
    ) {
      return {
        decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
        reasons: ["MISSING_OWNER_RC1_CREATE_CANDIDATE_ATTESTATION"],
      };
    }
  } else if (localIsRc1Connect) {
    if (
      !hasOwnerRc1VerifyConnectAttestation({
        leafWorkId: localWid,
        matchMethod: local.matchMethod,
        matchedBy: local.matchedBy,
        aiRationale: local.aiRationale,
      })
    ) {
      return {
        decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
        reasons: ["MISSING_OWNER_RC1_VERIFY_CONNECT_ATTESTATION"],
      };
    }
  } else if (!hasCanonicalRebindAttestation(local)) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["MISSING_CANONICAL_REBIND_ATTESTATION"],
    };
  }

  // Never downgrade / overwrite an already-eligible cloud leaf to a different leaf
  if (isIdentityUpgradeEligibleLeafWorkId(cloudWid) && cloudWid !== localWid) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["NO_DOWNGRADE_OR_OVERWRITE_CANONICAL_CLOUD"],
    };
  }

  // Monotonic: cloud must be legacy/non-canonical (or empty) before upgrade
  if (!isLegacyOrNonCanonicalWorkId(cloudWid) && cloudWid !== localWid) {
    return {
      decision: "REJECT_UNSAFE_IDENTITY_UPGRADE",
      reasons: ["CLOUD_NOT_LEGACY_PARENT"],
    };
  }

  // Already eligible identical — KEEP
  if (cloudWid === localWid && String(cloud.matchMethod) === AUTO_CONTRACT) {
    return {
      decision: "KEEP_CLOUD",
      reasons: ["CLOUD_ALREADY_CANONICAL"],
    };
  }

  reasons.push("SAME_LOGICAL_LINE");
  reasons.push("NON_IDENTITY_FIELDS_IDENTICAL");
  if (localIsRc1CreateKpl) {
    reasons.push("LOCAL_OWNER_RC1_CREATE_CANDIDATE_KPL_LEAF");
    reasons.push("OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION");
  } else if (localIsRc1Create) {
    reasons.push("LOCAL_OWNER_RC1_CREATE_CANDIDATE_LEAF");
    reasons.push("OWNER_RC1_CREATE_CANDIDATE_ATTESTATION");
  } else if (localIsRc1Connect) {
    reasons.push("LOCAL_OWNER_RC1_VERIFY_CONNECT_LEAF");
    reasons.push("OWNER_RC1_VERIFY_CONNECT_ATTESTATION");
  } else {
    reasons.push("LOCAL_CANONICAL_LEAF");
    reasons.push("CANONICAL_REBIND_ATTESTATION");
  }
  reasons.push("LOCAL_AUTO_CONTRACT");
  reasons.push("MONOTONIC_LEGACY_TO_CANONICAL");
  reasons.push("0815_05_SAFE");
  reasons.push("NO_RATE_OR_BOM_MUTATION");

  return {
    decision: "ACCEPT_CANONICAL_IDENTITY_UPGRADE",
    reasons,
    appliedIdentityFields: IDENTITY_FIELD_KEYS,
  };
}

/** Apply only validated identity fields from local onto cloud line (pure). */
export function applyCanonicalIdentityFieldsFromLocal(
  cloudLine: OfferBoqLine,
  localLine: OfferBoqLine,
): OfferBoqLine {
  return {
    ...cloudLine,
    catalogWorkId: localLine.catalogWorkId,
    matchMethod: localLine.matchMethod,
    matchedBy: localLine.matchedBy,
    matchConfidence: localLine.matchConfidence,
    aiConfidence: localLine.aiConfidence,
    aiRationale: localLine.aiRationale,
    candidateMatches: structuredClone(localLine.candidateMatches ?? []),
    warnings: Array.isArray(localLine.warnings)
      ? [...localLine.warnings]
      : cloudLine.warnings,
  };
}

function offerBoqLines(doc: OfferBoqDocument | null | undefined): OfferBoqLine[] {
  if (!doc) return [];
  const lines = doc.lines;
  return Array.isArray(lines) ? lines : [];
}

/**
 * Field-level OfferBoq merge on score tie: cloud shell + accepted identity deltas.
 */
export function mergeOfferBoqPreferringCanonicalIdentityUpgrades(
  localDoc: OfferBoqDocument | null | undefined,
  cloudDoc: OfferBoqDocument | null | undefined,
): {
  document: OfferBoqDocument | null;
  accepted: number;
  rejected: number;
  kept: number;
  lineResults: Array<{
    lineId: string;
    decision: CanonicalIdentityUpgradeDecision;
    reasons: string[];
  }>;
} {
  if (!cloudDoc) {
    return {
      document: null,
      accepted: 0,
      rejected: 0,
      kept: 0,
      lineResults: [],
    };
  }
  const cloudLines = offerBoqLines(cloudDoc);
  const localById = new Map(
    offerBoqLines(localDoc).map((l) => [String(l.lineId || "").trim(), l]),
  );
  const lineResults: Array<{
    lineId: string;
    decision: CanonicalIdentityUpgradeDecision;
    reasons: string[];
  }> = [];
  let accepted = 0;
  let rejected = 0;
  let kept = 0;
  const nextLines = cloudLines.map((cloudLine) => {
    const id = String(cloudLine.lineId || "").trim();
    const localLine = localById.get(id);
    const evalR = evaluateCanonicalIdentityUpgradeMerge({
      cloudLine,
      localLine,
    });
    lineResults.push({
      lineId: id,
      decision: evalR.decision,
      reasons: evalR.reasons,
    });
    if (evalR.decision === "ACCEPT_CANONICAL_IDENTITY_UPGRADE" && localLine) {
      accepted += 1;
      return applyCanonicalIdentityFieldsFromLocal(cloudLine, localLine);
    }
    if (evalR.decision === "REJECT_UNSAFE_IDENTITY_UPGRADE") {
      rejected += 1;
      return cloudLine;
    }
    kept += 1;
    return cloudLine;
  });

  return {
    document: {
      ...cloudDoc,
      lines: nextLines,
    },
    accepted,
    rejected,
    kept,
    lineResults,
  };
}

function mergeDwellingUnitOnScoreTie(
  localUnit: DwellingCostUnit | undefined,
  cloudUnit: DwellingCostUnit,
): DwellingCostUnit {
  if (!localUnit?.offerBoq || !cloudUnit.offerBoq) {
    return cloudUnit;
  }
  const mergedBoq = mergeOfferBoqPreferringCanonicalIdentityUpgrades(
    localUnit.offerBoq,
    cloudUnit.offerBoq,
  );
  return {
    ...cloudUnit,
    // Preserve cloud mapping / sources / snapshots — only OfferBoq identity delta
    offerBoq: mergedBoq.document,
  };
}

/**
 * Score-tie package merge: cloud structural shell + per-line canonical identity upgrades.
 * Never replaces the whole package with local merely because scores are equal.
 */
export function mergeTenderPackageOnScoreTie(
  localPkg: TenderPackage,
  cloudPkg: TenderPackage,
): TenderPackage {
  const localByDwelling = new Map(
    localPkg.dwellings.map((d) => [normalizeDwellingId(d.dwellingId), d]),
  );
  const dwellings = cloudPkg.dwellings.map((cloudUnit) => {
    const id = normalizeDwellingId(cloudUnit.dwellingId);
    const localUnit = localByDwelling.get(id);
    return mergeDwellingUnitOnScoreTie(localUnit, cloudUnit);
  });

  // Prefer non-empty continuation; merge records when both present (union by key).
  let ikContinuation = cloudPkg.ikContinuation ?? localPkg.ikContinuation ?? null;
  if (localPkg.ikContinuation && cloudPkg.ikContinuation) {
    const map = new Map<string, (typeof localPkg.ikContinuation.records)[number]>();
    for (const r of [
      ...cloudPkg.ikContinuation.records,
      ...localPkg.ikContinuation.records,
    ]) {
      const prev = map.get(r.key);
      if (
        !prev
        || r.attempts > prev.attempts
        || (r.attempts === prev.attempts && r.updatedAt > prev.updatedAt)
      ) {
        map.set(r.key, r);
      }
    }
    const updatedAt =
      localPkg.ikContinuation.updatedAt > cloudPkg.ikContinuation.updatedAt
        ? localPkg.ikContinuation.updatedAt
        : cloudPkg.ikContinuation.updatedAt;
    ikContinuation = {
      schemaVersion: 1,
      records: [...map.values()],
      updatedAt,
    };
  }

  return {
    ...cloudPkg,
    dwellings,
    // documentToDwelling / mode / expected count stay cloud (structural ownership)
    documentToDwelling: { ...(cloudPkg.documentToDwelling ?? {}) },
    ...(ikContinuation ? { ikContinuation } : {}),
  };
}
