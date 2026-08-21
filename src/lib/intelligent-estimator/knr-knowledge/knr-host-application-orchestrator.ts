/**
 * IK-KNR ETAP 10A — Host application orchestrator (PURE · library-only).
 *
 * LOCAL_HIT → re-lookup KnrCatalogEntry → VERIFIED → APP-1 → APP-2 bridge.
 *
 * REUSE: lookupKnrCatalog · applyVerifiedKnrNorms · bridgeKnrRequirementsToPositionCost
 * FORBIDDEN: invent PLN · R→workId/hourly · BOQ write · Research · VERIFY · P7 · seed maps
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrCatalogStore } from "./knr-catalog-store";
import { lookupKnrCatalog } from "./knr-catalog-lookup";
import { applyVerifiedKnrNorms } from "./knr-norm-application";
import type {
  KnrNormAppHoldReason,
  KnrResourceRequirements,
} from "./knr-norm-application-types";
import { bridgeKnrRequirementsToPositionCost } from "./knr-pricing-bridge";
import type {
  KnrPricingBridgeHoldReason,
  KnrPricingBridgeResult,
} from "./knr-pricing-bridge-types";
import type { KnrPricingIdentityInput } from "./knr-pricing-identity-types";
import type { KnrKnowledgeLineResult } from "./knr-knowledge-envelope";
import type { KnrLookupStatus, KnrVerificationStatus } from "./types";

export const KNR_KNOWLEDGE_KL_HOST_APP_IMPLEMENTED = true as const;

export type KnrHostApplicationFinalStatus =
  | "PRICED"
  | "PARTIAL"
  | "HOLD"
  | "REJECT"
  | "SKIPPED";

export type KnrHostApplicationSkipReason =
  | "NO_LOCAL_HIT"
  | "NO_IDENTITY_KEY"
  | "STALE_HIT"
  | "LOOKUP_MISS"
  | "LOOKUP_INVALID"
  | "AUTHORITY_NOT_VERIFIED"
  /** Host diag pre-gate: Master BOQ qty/unit missing (READ-ONLY · no orchestrator APP path). */
  | "NO_BOQ_QUANTITY"
  | "NO_BOQ_UNIT"
  | "NOT_READY_FOR_EXPERTS";

export type KnrHostApplicationHoldReason =
  | KnrHostApplicationSkipReason
  | KnrNormAppHoldReason
  | KnrPricingBridgeHoldReason;

export type KnrHostApplicationResult = {
  lineId: string;
  envelopeLookupStatus: KnrLookupStatus | null;
  identityKeyV2: string | null;
  catalogLookupStatus: "LOCAL_HIT" | "LOCAL_MISS" | "INVALID_LOOKUP" | null;
  verificationStatus: KnrVerificationStatus | null;
  app1: KnrResourceRequirements | null;
  bridge: KnrPricingBridgeResult | null;
  finalStatus: KnrHostApplicationFinalStatus;
  holdReason?: KnrHostApplicationHoldReason;
  /** Explicit: orchestrator never creates VERIFIED. */
  verificationFromOrchestrator: false;
};

export type KnrHostApplicationInput = {
  lineId: string;
  /** KL-3 Host envelope line (side-channel). */
  knowledgeLine: KnrKnowledgeLineResult | null | undefined;
  boqQuantity: number;
  boqUnit: string;
  catalogStore: KnrCatalogStore;
  workCatalogStore: WorkCatalogStore;
  nowMs: number;
  nowIso: string;
  /**
   * Passed through to bridge identityInput (tables injectable for tests).
   * Defaults: empty production OWNER_* tables inside APP-2-ID.
   */
  identityInput?: Omit<
    KnrPricingIdentityInput,
    "lineId" | "knrIdentityKeyV2" | "boqUnit" | "labor" | "materials" | "equipment" | "nowIso"
  > & {
    nowIso?: string;
    catalogBasisNormalizedKey?: string | null;
  };
};

function pack(
  partial: Omit<KnrHostApplicationResult, "verificationFromOrchestrator">,
): KnrHostApplicationResult {
  return { ...partial, verificationFromOrchestrator: false };
}

function skipped(
  lineId: string,
  envelopeLookupStatus: KnrLookupStatus | null,
  identityKeyV2: string | null,
  holdReason: KnrHostApplicationSkipReason,
): KnrHostApplicationResult {
  return pack({
    lineId,
    envelopeLookupStatus,
    identityKeyV2,
    catalogLookupStatus: null,
    verificationStatus: null,
    app1: null,
    bridge: null,
    finalStatus: "SKIPPED",
    holdReason,
  });
}

/**
 * Pure Host application orchestration.
 * Does not mutate Master BOQ · does not call Research/VERIFY · does not invent PLN.
 */
export function orchestrateKnrHostApplication(
  input: KnrHostApplicationInput,
): KnrHostApplicationResult {
  const lineId = String(input.lineId ?? "").trim() || "unknown";
  const knowledge = input.knowledgeLine ?? null;
  const envelopeStatus = knowledge?.lookupStatus ?? null;
  const identityKeyV2 = knowledge?.identityKeyV2
    ? String(knowledge.identityKeyV2).trim()
    : "";

  if (!knowledge || envelopeStatus !== "LOCAL_HIT") {
    if (envelopeStatus === "STALE_HIT") {
      return skipped(lineId, envelopeStatus, identityKeyV2 || null, "STALE_HIT");
    }
    return skipped(
      lineId,
      envelopeStatus,
      identityKeyV2 || null,
      "NO_LOCAL_HIT",
    );
  }

  if (!identityKeyV2) {
    return skipped(lineId, envelopeStatus, null, "NO_IDENTITY_KEY");
  }

  // Authority: re-lookup full entry — envelope/normBundle is NOT APP-1 authority.
  const catalogLookup = lookupKnrCatalog(
    { identityKeyV2 },
    input.catalogStore,
  );

  if (catalogLookup.status === "LOCAL_MISS") {
    return pack({
      lineId,
      envelopeLookupStatus: envelopeStatus,
      identityKeyV2,
      catalogLookupStatus: "LOCAL_MISS",
      verificationStatus: null,
      app1: null,
      bridge: null,
      finalStatus: "SKIPPED",
      holdReason: "LOOKUP_MISS",
    });
  }

  if (catalogLookup.status === "INVALID_LOOKUP") {
    return pack({
      lineId,
      envelopeLookupStatus: envelopeStatus,
      identityKeyV2,
      catalogLookupStatus: "INVALID_LOOKUP",
      verificationStatus: null,
      app1: null,
      bridge: null,
      finalStatus: "SKIPPED",
      holdReason: "LOOKUP_INVALID",
    });
  }

  const entry: KnrCatalogEntry = catalogLookup.entry;
  const verificationStatus = entry.verificationStatus;

  if (verificationStatus === "STALE") {
    return pack({
      lineId,
      envelopeLookupStatus: envelopeStatus,
      identityKeyV2,
      catalogLookupStatus: "LOCAL_HIT",
      verificationStatus,
      app1: null,
      bridge: null,
      finalStatus: "HOLD",
      holdReason: "STALE_NORMS",
    });
  }

  if (verificationStatus !== "VERIFIED") {
    return pack({
      lineId,
      envelopeLookupStatus: envelopeStatus,
      identityKeyV2,
      catalogLookupStatus: "LOCAL_HIT",
      verificationStatus,
      app1: null,
      bridge: null,
      finalStatus: "HOLD",
      holdReason: "AUTHORITY_NOT_VERIFIED",
    });
  }

  const app1 = applyVerifiedKnrNorms({
    lineId,
    boqQuantity: input.boqQuantity,
    boqUnit: input.boqUnit,
    entry,
    identityKeyV2,
    contentHashExpected: entry.contentHash,
    nowIso: input.nowIso,
  });

  if (app1.status !== "APPLIED") {
    return pack({
      lineId,
      envelopeLookupStatus: envelopeStatus,
      identityKeyV2,
      catalogLookupStatus: "LOCAL_HIT",
      verificationStatus,
      app1,
      bridge: null,
      finalStatus: app1.status === "REJECT" ? "REJECT" : "HOLD",
      holdReason: app1.holdReason,
    });
  }

  const catalogBasisNormalizedKey =
    input.identityInput?.catalogBasisNormalizedKey ??
    knowledge.catalogBasis?.normalizedKey ??
    null;

  const bridge = bridgeKnrRequirementsToPositionCost({
    resourceRequirements: app1,
    boqQuantity: input.boqQuantity,
    boqUnit: input.boqUnit,
    workCatalogStore: input.workCatalogStore,
    nowMs: input.nowMs,
    nowIso: input.nowIso,
    expectedIdentityKeyV2: identityKeyV2,
    identityInput: {
      lineId,
      knrIdentityKeyV2: identityKeyV2,
      boqUnit: input.boqUnit,
      catalogBasisNormalizedKey,
      ...(input.identityInput ?? {}),
      nowIso: input.identityInput?.nowIso ?? input.nowIso,
    },
  });

  return pack({
    lineId,
    envelopeLookupStatus: envelopeStatus,
    identityKeyV2,
    catalogLookupStatus: "LOCAL_HIT",
    verificationStatus,
    app1,
    bridge,
    finalStatus:
      bridge.status === "PRICED"
        ? "PRICED"
        : bridge.status === "PARTIAL"
          ? "PARTIAL"
          : bridge.status === "REJECT"
            ? "REJECT"
            : "HOLD",
    holdReason: bridge.holdReason,
  });
}
