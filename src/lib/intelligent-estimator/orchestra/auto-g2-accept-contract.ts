/**
 * GO24 — AUTO_RATE_ACCEPT + AUTO_BOM_ACCEPT contract evaluation
 * (pure · no research · no invent · no Owner click simulation).
 *
 * Policy: docs/architecture/AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md
 * Owner CLOSED: R1=NO · R2=STALE no · R3=no tender plane · B1=provisional no ·
 * B2=no allowlist expand · P1=provenance required · O1=no overwrite stronger/fresher
 *
 * Modes authorized now:
 *  - AUTO_RATE: REUSE catalog CURRENT only (no catalog write)
 *  - AUTO_BOM: TechnologyPack singleton OR LABOR_ONLY
 *    (Owner allowlist OR LABOR_ONLY_AUTO_BOM_V1 HARD evidence)
 */

import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  lookupWorkRate,
  type LookupWorkRateResult,
} from "@/lib/work-catalog/work-rate-lookup";
import type { WorkRateSourceType } from "@/lib/work-catalog/work-rate-types";
import {
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
  resolveLaborOnlyBomForWork,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { isExplicitLaborOnlyWork } from "@/lib/tender-position-cost/labor-only-classification";
import { isProvisionalLaborOnlyPath } from "@/lib/intelligent-estimator/ik-provisional-estimation";
import type { TechnologyPack } from "@/lib/technology-foundation";
import type { KnrDiscoveryEvidenceStore } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import {
  AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1,
  evaluateLaborOnlyAutoBomV1Contract,
} from "@/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract";
import { loadKnrDiscoveryEvidenceStoreLocal } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store";

export const AUTO_RATE_DECISION_ID = "AUTO_RATE_ACCEPT" as const;
export const AUTO_BOM_DECISION_ID = "AUTO_BOM_ACCEPT" as const;
export const AUTO_G2_UMBRELLA_ID = "AUTO_G2_ACCEPT" as const;

export const AUTO_RATE_RULE_REUSE_CURRENT = "auto_rate.reuse_catalog_current_v1";
export const AUTO_BOM_RULE_TECHNOLOGY_PACK = "auto_bom.technology_pack_singleton_v1";
export const AUTO_BOM_RULE_LABOR_ONLY = "auto_bom.owner_labor_only_allowlist_v1";
export { AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1 };

export type AutoRateDecision = "AUTO_RATE_ACCEPT" | "RATE_EXCEPTION";
export type AutoBomDecision = "AUTO_BOM_ACCEPT" | "BOM_EXCEPTION";

/** Canonical G2 provenance — NOT OfferBoq matchMethod (never "manual"). */
export type AutoRateAcceptProvenance = {
  decisionId: typeof AUTO_RATE_DECISION_ID;
  mode: "REUSE";
  ruleId: typeof AUTO_RATE_RULE_REUSE_CURRENT;
  workId: string;
  unit: string;
  identityKey: string;
  sourceType: WorkRateSourceType;
  ourRatePln: number;
  observedAt: string | null;
  updatedAt: string | null;
  evaluatedAtIso: string;
};

export type AutoBomAcceptProvenance = {
  decisionId: typeof AUTO_BOM_DECISION_ID;
  mode: "TECHNOLOGY_PACK" | "LABOR_ONLY";
  ruleId:
    | typeof AUTO_BOM_RULE_TECHNOLOGY_PACK
    | typeof AUTO_BOM_RULE_LABOR_ONLY
    | typeof AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1;
  workId: string;
  unit: string;
  packId: string | null;
  packVersion: string | null;
  packNamePl: string | null;
  evaluatedAtIso: string;
};

export type AutoG2ExceptionProvenance = {
  decisionId: "RATE_EXCEPTION" | "BOM_EXCEPTION";
  mode: "EXCEPTION";
  ruleId: null;
  reasons: string[];
  evaluatedAtIso: string;
};

export type AutoRateContractResult = {
  decision: AutoRateDecision;
  reasons: string[];
  provenance: AutoRateAcceptProvenance | AutoG2ExceptionProvenance;
  lookupStatus: LookupWorkRateResult["status"] | "NO_IDENTITY" | "NO_UNIT";
  /** True when PASS is identical to existing line attestation (idempotent). */
  idempotentNoop: boolean;
  overwriteBlocked: boolean;
};

export type AutoBomContractResult = {
  decision: AutoBomDecision;
  reasons: string[];
  provenance: AutoBomAcceptProvenance | AutoG2ExceptionProvenance;
  bomStatus:
    | "OK"
    | "LABOR_ONLY"
    | "MISSING_BOM"
    | "AMBIGUOUS_BOM"
    | "PROVISIONAL_BLOCKED"
    | "NO_IDENTITY"
    | "OTHER";
  idempotentNoop: boolean;
  overwriteBlocked: boolean;
};

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function exceptionRate(
  reasons: string[],
  nowMs: number,
  extra?: Partial<AutoRateContractResult>,
): AutoRateContractResult {
  return {
    decision: "RATE_EXCEPTION",
    reasons,
    provenance: {
      decisionId: "RATE_EXCEPTION",
      mode: "EXCEPTION",
      ruleId: null,
      reasons,
      evaluatedAtIso: isoNow(nowMs),
    },
    lookupStatus: "MISSING",
    idempotentNoop: false,
    overwriteBlocked: false,
    ...extra,
  };
}

function exceptionBom(
  reasons: string[],
  nowMs: number,
  bomStatus: AutoBomContractResult["bomStatus"],
  extra?: Partial<AutoBomContractResult>,
): AutoBomContractResult {
  return {
    decision: "BOM_EXCEPTION",
    reasons,
    provenance: {
      decisionId: "BOM_EXCEPTION",
      mode: "EXCEPTION",
      ruleId: null,
      reasons,
      evaluatedAtIso: isoNow(nowMs),
    },
    bomStatus,
    idempotentNoop: false,
    overwriteBlocked: false,
    ...extra,
  };
}

function sameRateProvenance(
  a: AutoRateAcceptProvenance | null | undefined,
  b: AutoRateAcceptProvenance,
): boolean {
  if (!a) return false;
  return (
    a.decisionId === b.decisionId
    && a.mode === b.mode
    && a.ruleId === b.ruleId
    && a.workId === b.workId
    && a.unit === b.unit
    && a.identityKey === b.identityKey
    && a.sourceType === b.sourceType
    && a.ourRatePln === b.ourRatePln
  );
}

function sameBomProvenance(
  a: AutoBomAcceptProvenance | null | undefined,
  b: AutoBomAcceptProvenance,
): boolean {
  if (!a) return false;
  return (
    a.decisionId === b.decisionId
    && a.mode === b.mode
    && a.ruleId === b.ruleId
    && a.workId === b.workId
    && a.unit === b.unit
    && a.packId === b.packId
    && a.packVersion === b.packVersion
  );
}

/**
 * O1 — refuse AUTO when existing stronger attestation would be downgraded.
 * REUSE does not write catalog; guard protects prior AUTO/Owner line attestations.
 */
export function wouldOverwriteStrongerRateAttestation(
  existing: OfferBoqLine["autoG2Rate"],
  incoming: AutoRateAcceptProvenance,
): boolean {
  if (!existing || existing.mode === "EXCEPTION") return false;
  if (existing.mode !== "REUSE") return true;
  // Same fingerprint → idempotent, not overwrite
  if (sameRateProvenance(existing, incoming)) return false;
  // Different CURRENT attestation on line — do not silently replace
  if (
    existing.workId === incoming.workId
    && existing.unit === incoming.unit
    && existing.ourRatePln !== incoming.ourRatePln
  ) {
    return true;
  }
  if (existing.sourceType === "OWNER" && incoming.sourceType !== "OWNER") {
    return true;
  }
  return false;
}

export function wouldOverwriteStrongerBomAttestation(
  existing: OfferBoqLine["autoG2Bom"],
  incoming: AutoBomAcceptProvenance,
): boolean {
  if (!existing || existing.mode === "EXCEPTION") return false;
  if (sameBomProvenance(existing, incoming)) return false;
  // TECHNOLOGY_PACK is stronger than LABOR_ONLY — do not downgrade
  if (existing.mode === "TECHNOLOGY_PACK" && incoming.mode === "LABOR_ONLY") {
    return true;
  }
  if (
    existing.mode === "TECHNOLOGY_PACK"
    && incoming.mode === "TECHNOLOGY_PACK"
    && existing.packId
    && incoming.packId
    && existing.packId !== incoming.packId
  ) {
    return true;
  }
  return false;
}

export type EvaluateAutoRateInput = {
  line: OfferBoqLine;
  store: WorkCatalogStore;
  nowMs: number;
  /** When false, skip trusted-tuple check (tests only). Default true. */
  requireTrustedIdentity?: boolean;
};

/**
 * AUTO_RATE_ACCEPT — REUSE catalog CURRENT only.
 * NEVER research · NEVER companyPrice · NEVER invent · NEVER STALE persist.
 */
export function evaluateAutoRateContract(
  input: EvaluateAutoRateInput,
): AutoRateContractResult {
  const { line, store, nowMs } = input;
  const requireTrusted = input.requireTrustedIdentity !== false;

  if (requireTrusted && !hasCompleteTrustedIdentityTuple(line)) {
    return exceptionRate(["NOT_TRUSTED_IDENTITY"], nowMs, {
      lookupStatus: "NO_IDENTITY",
    });
  }

  const workId = String(line.catalogWorkId ?? "").trim();
  const unit = String(line.unit ?? "").trim();
  if (!workId) {
    return exceptionRate(["NO_CATALOG_WORK_ID"], nowMs, {
      lookupStatus: "NO_IDENTITY",
    });
  }
  if (!unit) {
    return exceptionRate(["NO_UNIT"], nowMs, { lookupStatus: "NO_UNIT" });
  }

  const lookup = lookupWorkRate(store, workId, unit as WgdomCostUnit, nowMs);

  if (lookup.status === "MISSING") {
    return exceptionRate(["LOOKUP_MISSING_OUR_RATE"], nowMs, {
      lookupStatus: "MISSING",
    });
  }
  if (lookup.status === "STALE") {
    // R2 CLOSED — STALE not authorized for AUTO
    return exceptionRate(["LOOKUP_STALE_NOT_AUTHORIZED"], nowMs, {
      lookupStatus: "STALE",
    });
  }
  if (lookup.status !== "CURRENT") {
    return exceptionRate([`LOOKUP_STATUS_${lookup.status}`], nowMs, {
      lookupStatus: lookup.status,
    });
  }

  if (!lookup.sourceType) {
    return exceptionRate(["MISSING_RATE_PROVENANCE_SOURCE_TYPE"], nowMs, {
      lookupStatus: "CURRENT",
    });
  }

  const provenance: AutoRateAcceptProvenance = {
    decisionId: AUTO_RATE_DECISION_ID,
    mode: "REUSE",
    ruleId: AUTO_RATE_RULE_REUSE_CURRENT,
    workId: lookup.workId,
    unit: String(lookup.unit),
    identityKey: lookup.identityKey,
    sourceType: lookup.sourceType,
    ourRatePln: lookup.ourRatePln,
    observedAt: lookup.observedAt ?? null,
    updatedAt: lookup.updatedAt ?? null,
    evaluatedAtIso: isoNow(nowMs),
  };

  if (wouldOverwriteStrongerRateAttestation(line.autoG2Rate, provenance)) {
    return exceptionRate(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, {
      lookupStatus: "CURRENT",
      overwriteBlocked: true,
    });
  }

  const idempotentNoop = sameRateProvenance(
    line.autoG2Rate?.mode === "REUSE" ? line.autoG2Rate : null,
    provenance,
  );

  return {
    decision: "AUTO_RATE_ACCEPT",
    reasons: idempotentNoop ? ["IDEMPOTENT_NOOP"] : ["REUSE_CURRENT"],
    provenance,
    lookupStatus: "CURRENT",
    idempotentNoop,
    overwriteBlocked: false,
  };
}

export type EvaluateAutoBomInput = {
  line: OfferBoqLine;
  nowMs: number;
  positionQuantity?: number;
  requireTrustedIdentity?: boolean;
  /** Optional pack registry override (tests / inject) · default listAllPacks via adapter. */
  packs?: readonly TechnologyPack[];
  /**
   * LABOR_ONLY_AUTO_BOM_V1 — discovery evidence store (kw-knr-discovery-evidence).
   * Default: local store. Pass null to disable V1 path (tests).
   */
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
};

/**
 * AUTO_BOM_ACCEPT — TechnologyPack singleton OR LABOR_ONLY
 * (Owner allowlist OR LABOR_ONLY_AUTO_BOM_V1 HARD evidence).
 * Provisional cc-w2-* alone = EXCEPTION (B1 CLOSED).
 * MISSING_BOM = EXCEPTION/HOLD.
 */
export function evaluateAutoBomContract(
  input: EvaluateAutoBomInput,
): AutoBomContractResult {
  const { line, nowMs } = input;
  const requireTrusted = input.requireTrustedIdentity !== false;

  if (requireTrusted && !hasCompleteTrustedIdentityTuple(line)) {
    return exceptionBom(["NOT_TRUSTED_IDENTITY"], nowMs, "NO_IDENTITY");
  }

  const workId = String(line.catalogWorkId ?? "").trim();
  const unit = String(line.unit ?? "").trim();
  if (!workId) {
    return exceptionBom(["NO_CATALOG_WORK_ID"], nowMs, "NO_IDENTITY");
  }
  if (!unit) {
    return exceptionBom(["NO_UNIT"], nowMs, "OTHER");
  }

  const qty = Number(input.positionQuantity ?? line.quantity ?? 0);
  const positionQuantity = Number.isFinite(qty) && qty >= 0 ? qty : 0;

  // B — explicit Owner LABOR_ONLY allowlist (canonical legacy)
  if (isExplicitLaborOnlyWork(workId)) {
    const bom = resolveLaborOnlyBomForWork({
      workId,
      unit,
      positionQuantity,
    });
    const provenance: AutoBomAcceptProvenance = {
      decisionId: AUTO_BOM_DECISION_ID,
      mode: "LABOR_ONLY",
      ruleId: AUTO_BOM_RULE_LABOR_ONLY,
      workId,
      unit,
      packId: null,
      packVersion: null,
      packNamePl: null,
      evaluatedAtIso: isoNow(nowMs),
    };
    if (wouldOverwriteStrongerBomAttestation(line.autoG2Bom, provenance)) {
      return exceptionBom(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, "LABOR_ONLY", {
        overwriteBlocked: true,
      });
    }
    const idempotentNoop = sameBomProvenance(
      line.autoG2Bom?.mode === "LABOR_ONLY" || line.autoG2Bom?.mode === "TECHNOLOGY_PACK"
        ? (line.autoG2Bom as AutoBomAcceptProvenance)
        : null,
      provenance,
    );
    return {
      decision: "AUTO_BOM_ACCEPT",
      reasons: idempotentNoop
        ? ["IDEMPOTENT_NOOP"]
        : ["OWNER_LABOR_ONLY_ALLOWLIST", bom.status],
      provenance,
      bomStatus: "LABOR_ONLY",
      idempotentNoop,
      overwriteBlocked: false,
    };
  }

  // B-V1 — LABOR_ONLY_AUTO_BOM_V1 (HARD labor + explicit NO_MATERIAL_NORM · no invent)
  const discoveryStore =
    input.discoveryStore === undefined
      ? loadKnrDiscoveryEvidenceStoreLocal()
      : input.discoveryStore;
  if (discoveryStore) {
    const v1 = evaluateLaborOnlyAutoBomV1Contract({
      workId,
      unit,
      discoveryStore,
      nowMs,
    });
    if (v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT") {
      const bom = resolveLaborOnlyBomForWork({
        workId,
        unit,
        positionQuantity,
      });
      const provenance: AutoBomAcceptProvenance = {
        decisionId: AUTO_BOM_DECISION_ID,
        mode: "LABOR_ONLY",
        ruleId: AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1,
        workId,
        unit,
        packId: null,
        packVersion: null,
        packNamePl: null,
        evaluatedAtIso: isoNow(nowMs),
      };
      if (wouldOverwriteStrongerBomAttestation(line.autoG2Bom, provenance)) {
        return exceptionBom(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, "LABOR_ONLY", {
          overwriteBlocked: true,
        });
      }
      const idempotentNoop = sameBomProvenance(
        line.autoG2Bom?.mode === "LABOR_ONLY" || line.autoG2Bom?.mode === "TECHNOLOGY_PACK"
          ? (line.autoG2Bom as AutoBomAcceptProvenance)
          : null,
        provenance,
      );
      return {
        decision: "AUTO_BOM_ACCEPT",
        reasons: idempotentNoop
          ? ["IDEMPOTENT_NOOP"]
          : ["LABOR_ONLY_AUTO_BOM_V1", bom.status, v1.evidenceKeyV1 || ""].filter(Boolean),
        provenance,
        bomStatus: "LABOR_ONLY",
        idempotentNoop,
        overwriteBlocked: false,
      };
    }
  }

  // B1 CLOSED — provisional cc-w2-* alone is NOT AUTO_BOM authority
  if (isProvisionalLaborOnlyPath(workId)) {
    return exceptionBom(
      ["PROVISIONAL_CC_W2_NOT_AUTHORIZED_FOR_AUTO_BOM"],
      nowMs,
      "PROVISIONAL_BLOCKED",
    );
  }

  const packs = findActiveTechnologyPacksForWorkId(workId, input.packs);
  if (packs.length === 0) {
    return exceptionBom(["MISSING_BOM_NO_TECHNOLOGY_PACK"], nowMs, "MISSING_BOM");
  }
  if (packs.length > 1) {
    return exceptionBom(["AMBIGUOUS_BOM_MULTIPLE_PACKS"], nowMs, "AMBIGUOUS_BOM");
  }

  const resolved = resolveTechnologyBomForWork({
    workId,
    unit,
    positionQuantity,
    packs: input.packs,
  });
  if (resolved.status !== "OK" && resolved.status !== "EMPTY_RECIPE") {
    // EMPTY_RECIPE still has pack authority but no materials — treat as pack-bound;
    // Position Cost may still gap on materials. AUTO_BOM accepts pack authority only when OK.
    if (resolved.status === "MISSING_BOM") {
      return exceptionBom(["MISSING_BOM"], nowMs, "MISSING_BOM");
    }
    if (resolved.status === "AMBIGUOUS_BOM") {
      return exceptionBom(["AMBIGUOUS_BOM"], nowMs, "AMBIGUOUS_BOM");
    }
    return exceptionBom([`BOM_RESOLVE_${resolved.status}`], nowMs, "OTHER");
  }

  // Require OK with validated recipe — EMPTY_RECIPE is not a full material BOM accept
  if (resolved.status === "EMPTY_RECIPE") {
    return exceptionBom(["EMPTY_RECIPE_NOT_AUTO_BOM"], nowMs, "OTHER");
  }

  const pack = packs[0]!;
  const provenance: AutoBomAcceptProvenance = {
    decisionId: AUTO_BOM_DECISION_ID,
    mode: "TECHNOLOGY_PACK",
    ruleId: AUTO_BOM_RULE_TECHNOLOGY_PACK,
    workId,
    unit,
    packId: pack.packId,
    packVersion: pack.packVersion,
    packNamePl: pack.namePl ?? null,
    evaluatedAtIso: isoNow(nowMs),
  };

  if (wouldOverwriteStrongerBomAttestation(line.autoG2Bom, provenance)) {
    return exceptionBom(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, "OK", {
      overwriteBlocked: true,
    });
  }

  const idempotentNoop = sameBomProvenance(
    line.autoG2Bom?.mode === "TECHNOLOGY_PACK" || line.autoG2Bom?.mode === "LABOR_ONLY"
      ? (line.autoG2Bom as AutoBomAcceptProvenance)
      : null,
    provenance,
  );

  return {
    decision: "AUTO_BOM_ACCEPT",
    reasons: idempotentNoop
      ? ["IDEMPOTENT_NOOP"]
      : ["TECHNOLOGY_PACK_SINGLETON", resolved.status],
    provenance,
    bomStatus: "OK",
    idempotentNoop,
    overwriteBlocked: false,
  };
}

export function applyAutoRateAcceptToLine(
  line: OfferBoqLine,
  result: AutoRateContractResult,
): OfferBoqLine {
  if (result.decision !== "AUTO_RATE_ACCEPT") {
    return {
      ...line,
      autoG2Rate: result.provenance,
    };
  }
  if (result.idempotentNoop && line.autoG2Rate?.mode === "REUSE") {
    return line;
  }
  return {
    ...line,
    autoG2Rate: result.provenance as AutoRateAcceptProvenance,
  };
}

export function applyAutoBomAcceptToLine(
  line: OfferBoqLine,
  result: AutoBomContractResult,
): OfferBoqLine {
  if (result.decision !== "AUTO_BOM_ACCEPT") {
    return {
      ...line,
      autoG2Bom: result.provenance,
    };
  }
  if (
    result.idempotentNoop
    && (line.autoG2Bom?.mode === "TECHNOLOGY_PACK" || line.autoG2Bom?.mode === "LABOR_ONLY")
  ) {
    return line;
  }
  return {
    ...line,
    autoG2Bom: result.provenance as AutoBomAcceptProvenance,
  };
}

/** Hard bans — used by tests / callers. */
export const AUTO_G2_FORBIDDEN = Object.freeze({
  researchAutoPersist: false,
  companyPriceAsOurRate: false,
  evidenceAsOurRate: false,
  historicalWithoutAuthority: false,
  staleAutoPersist: false,
  provisionalCcW2AutoBom: false,
  inventRate: false,
  inventBom: false,
  expandLaborOnlyAllowlist: false,
  matchMethodManualForAutoG2: false,
});
