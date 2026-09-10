/**
 * AUT-R1 — apply Autonomous Labor Accept via existing acceptWorkRateResearchCandidate.
 * ZERO second Catalog writer · ZERO companyPrice · fail-closed on contract EXCEPTION.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import type { LaborSourceEvidenceObservation } from "@/lib/labor-source-evidence";
import type { OfferBoqMatchMethod } from "@/lib/tender-offer-boq";
import {
  acceptWorkRateResearchCandidate,
  type AcceptWorkRateResearchResult,
} from "@/lib/work-catalog/work-rate-accept";
import {
  evaluateAutR1LaborAcceptContract,
  type AutR1ContractResult,
  AUT_R1_RULE_ID,
} from "@/lib/work-catalog/aut-r1-accept-contract";
import { isLaborAcceptIdempotentNoop } from "@/lib/intelligent-estimator/orchestra/ik-owner-gate-labor-idem";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";

export type TryAutR1AcceptInput = {
  store: WorkCatalogStore;
  candidate: WorkRateResearchCandidate;
  identityTrusted: boolean;
  matchMethod?: OfferBoqMatchMethod | string | null;
  evidenceObservations?: readonly LaborSourceEvidenceObservation[] | null;
  nowMs?: number;
  companyPriceOnly?: boolean;
  /**
   * When true (default), persist via saveWorkCatalogRouted after Accept.
   * Tests may set false and inspect store only.
   */
  persist?: boolean;
  save?: (
    store: WorkCatalogStore,
    options: { updatedAtIso: string; previousStore: WorkCatalogStore },
  ) => Promise<{ ok: boolean; saved?: boolean }>;
};

export type TryAutR1AcceptResult =
  | {
      ok: true;
      accepted: true;
      idempotentNoop: false;
      store: WorkCatalogStore;
      persisted: boolean;
      contract: AutR1ContractResult;
      companyPriceUsedAsOurRate: false;
      /** Explicit AUT-R1 path — ≠ Owner aiAutoAccept flag. */
      autR1AutonomousAccept: true;
      aiAutoAccept: false;
    }
  | {
      ok: true;
      accepted: false;
      idempotentNoop: true;
      store: WorkCatalogStore;
      persisted: false;
      contract: AutR1ContractResult;
      companyPriceUsedAsOurRate: false;
      autR1AutonomousAccept: false;
      aiAutoAccept: false;
    }
  | {
      ok: false;
      accepted: false;
      idempotentNoop: false;
      store: WorkCatalogStore;
      persisted: false;
      contract: AutR1ContractResult;
      reason: string;
      companyPriceUsedAsOurRate: false;
      autR1AutonomousAccept: false;
      aiAutoAccept: false;
    };

/**
 * Evaluate AUT-R1 contract → on PASS call existing Accept writer with decisionKind=AUT_R1.
 */
export async function tryAutR1AcceptLaborCandidate(
  input: TryAutR1AcceptInput,
): Promise<TryAutR1AcceptResult> {
  const anti = {
    companyPriceUsedAsOurRate: false as const,
    aiAutoAccept: false as const,
  };
  const nowMs = input.nowMs ?? Date.now();
  const contract = evaluateAutR1LaborAcceptContract({
    store: input.store,
    candidate: input.candidate,
    identityTrusted: input.identityTrusted,
    matchMethod: input.matchMethod,
    evidenceObservations: input.evidenceObservations,
    nowMs,
    companyPriceOnly: input.companyPriceOnly,
  });

  if (contract.decision !== "AUT_R1_ACCEPT") {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      store: input.store,
      persisted: false,
      contract,
      reason: contract.reasons[0] ?? "AUT_R1_EXCEPTION",
      autR1AutonomousAccept: false,
      ...anti,
    };
  }

  if (contract.idempotentNoop) {
    return {
      ok: true,
      accepted: false,
      idempotentNoop: true,
      store: input.store,
      persisted: false,
      contract,
      autR1AutonomousAccept: false,
      ...anti,
    };
  }

  // Secondary idempotency (Owner Accept fingerprint) — avoid duplicate history
  if (isLaborAcceptIdempotentNoop(input.store, input.candidate)) {
    return {
      ok: true,
      accepted: false,
      idempotentNoop: true,
      store: input.store,
      persisted: false,
      contract: { ...contract, idempotentNoop: true, mayPersistOurRate: false },
      autR1AutonomousAccept: false,
      ...anti,
    };
  }

  if (!contract.mayPersistOurRate) {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      store: input.store,
      persisted: false,
      contract,
      reason: "MAY_PERSIST_FALSE",
      autR1AutonomousAccept: false,
      ...anti,
    };
  }

  const updatedAtIso = contract.evaluatedAtIso;
  const accepted: AcceptWorkRateResearchResult = acceptWorkRateResearchCandidate({
    store: input.store,
    candidate: input.candidate,
    observedAt: updatedAtIso,
    updatedAt: updatedAtIso,
    decision: {
      kind: "AUT_R1",
      ruleId: AUT_R1_RULE_ID,
      evaluatedAtIso: updatedAtIso,
    },
  });

  if (!accepted.ok) {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      store: input.store,
      persisted: false,
      contract,
      reason: accepted.reason,
      autR1AutonomousAccept: false,
      ...anti,
    };
  }

  const shouldPersist = input.persist !== false;
  if (!shouldPersist) {
    return {
      ok: true,
      accepted: true,
      idempotentNoop: false,
      store: accepted.store,
      persisted: false,
      contract,
      autR1AutonomousAccept: true,
      ...anti,
    };
  }

  try {
    const saveFn = input.save ?? saveWorkCatalogRouted;
    const save = await saveFn(accepted.store, {
      updatedAtIso,
      previousStore: input.store,
    });
    if (!save.ok || save.saved === false) {
      return {
        ok: false,
        accepted: false,
        idempotentNoop: false,
        store: input.store,
        persisted: false,
        contract,
        reason: "PERSIST_FAILED",
        autR1AutonomousAccept: false,
        ...anti,
      };
    }
    return {
      ok: true,
      accepted: true,
      idempotentNoop: false,
      store: accepted.store,
      persisted: true,
      contract,
      autR1AutonomousAccept: true,
      ...anti,
    };
  } catch {
    return {
      ok: false,
      accepted: false,
      idempotentNoop: false,
      store: input.store,
      persisted: false,
      contract,
      reason: "PERSIST_FAILED",
      autR1AutonomousAccept: false,
      ...anti,
    };
  }
}
