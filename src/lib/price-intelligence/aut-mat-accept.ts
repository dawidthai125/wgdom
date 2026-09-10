/**
 * AUT-MAT — apply Autonomous Material Accept via existing acceptMaterialResearchCandidate.
 * ZERO second Price Memory writer · ZERO companyPrice · fail-closed on contract EXCEPTION.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { CommitMarketQuotesDeps } from "@/lib/work-catalog/commit-market-quotes";
import type { PriceDemandStore } from "./demand-types";
import { normalizePriceDemandStore } from "./demand-queue";
import type { PriceCandidate } from "./price-candidate-types";
import { acceptMaterialResearchCandidate } from "./market-material-research-orchestrate";
import type { AcceptResearchCandidateResult } from "./market-material-research-types";
import {
  evaluateAutMatMaterialAcceptContract,
  type AutMatContractResult,
  AUT_MAT_RULE_ID,
} from "./aut-mat-accept-contract";

export type TryAutMatAcceptInput = {
  worksById: ReadonlyMap<string, CatalogWork>;
  /** Optional — refreshed after Accept when commitDeps mutates store. */
  store?: WorkCatalogStore;
  candidate: PriceCandidate;
  expectedUnit: string;
  identityTrusted: boolean;
  demandStore?: PriceDemandStore;
  commitDeps?: Partial<CommitMarketQuotesDeps>;
  nowMs?: number;
  region?: string | null;
  companyPriceOnly?: boolean;
};

export type TryAutMatAcceptResult =
  | {
      ok: true;
      accepted: true;
      idempotentNoop: false;
      persisted: boolean;
      contract: AutMatContractResult;
      accept: AcceptResearchCandidateResult;
      companyPriceUsedAsMaterialPrice: false;
      autMatAutonomousAccept: true;
      aiAutoAccept: false;
    }
  | {
      ok: true;
      accepted: false;
      idempotentNoop: true;
      persisted: false;
      contract: AutMatContractResult;
      companyPriceUsedAsMaterialPrice: false;
      autMatAutonomousAccept: false;
      aiAutoAccept: false;
    }
  | {
      ok: false;
      accepted: false;
      idempotentNoop: false;
      persisted: false;
      contract: AutMatContractResult;
      reason: string;
      companyPriceUsedAsMaterialPrice: false;
      autMatAutonomousAccept: false;
      aiAutoAccept: false;
    };

/**
 * Evaluate AUT-MAT contract → on PASS call existing Accept writer with decisionKind=AUT_MAT.
 */
export async function tryAutMatAcceptMaterialCandidate(
  input: TryAutMatAcceptInput,
): Promise<TryAutMatAcceptResult> {
  const anti = {
    companyPriceUsedAsMaterialPrice: false as const,
    aiAutoAccept: false as const,
  };
  const nowMs = input.nowMs ?? Date.now();
  const contract = evaluateAutMatMaterialAcceptContract({
    worksById: input.worksById,
    candidate: input.candidate,
    expectedUnit: input.expectedUnit,
    identityTrusted: input.identityTrusted,
    nowMs,
    region: input.region ?? input.candidate.region,
    companyPriceOnly: input.companyPriceOnly,
  });

  if (contract.decision !== "AUT_MAT_ACCEPT") {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      persisted: false,
      contract,
      reason: contract.reasons[0] ?? "AUT_MAT_EXCEPTION",
      autMatAutonomousAccept: false,
      ...anti,
    };
  }

  if (contract.idempotentNoop) {
    return {
      ok: true,
      accepted: false,
      idempotentNoop: true,
      persisted: false,
      contract,
      autMatAutonomousAccept: false,
      ...anti,
    };
  }

  if (!contract.mayPersistPriceMemory) {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      persisted: false,
      contract,
      reason: "MAY_PERSIST_FALSE",
      autMatAutonomousAccept: false,
      ...anti,
    };
  }

  const updatedAtIso = contract.evaluatedAtIso;
  const demandStore =
    input.demandStore
    ?? normalizePriceDemandStore({
      schemaVersion: 1,
      updatedAt: updatedAtIso,
      demands: [],
    });

  const accept = await acceptMaterialResearchCandidate({
    candidate: input.candidate,
    demandStore,
    expectedUnit: input.expectedUnit,
    commitDeps: input.commitDeps,
    updatedAtIso,
    decision: {
      kind: "AUT_MAT",
      ruleId: AUT_MAT_RULE_ID,
      evaluatedAtIso: updatedAtIso,
    },
  });

  if (!accept.ok || !accept.accepted) {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      persisted: false,
      contract,
      reason: accept.error ?? "ACCEPT_FAILED",
      autMatAutonomousAccept: false,
      ...anti,
    };
  }

  return {
    ok: true,
    accepted: true,
    idempotentNoop: false,
    persisted: accept.persisted === true,
    contract,
    accept,
    autMatAutonomousAccept: true,
    ...anti,
  };
}
