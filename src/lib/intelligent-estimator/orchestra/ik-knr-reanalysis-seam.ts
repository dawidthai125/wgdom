/**
 * IK Global KNR Discovery — Orchestra reanalysis seam (KL-3 → downstream).
 *
 * Single explicit contract: discovery staging → REANALYSIS_REQUIRED → invalidate
 * Identity / Labor / Composite / F5 downstream. Not a second sequencer.
 */

import type { AdminRole } from "@/lib/admin-auth";
import { loadAdminSessionFromStorage } from "@/lib/admin-auth";
import type {
  KnrHostKnowledgeResolveResult,
  KnrHostKnowledgeLineInput,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter";
import type { KnrKnowledgeEnvelope } from "@/lib/intelligent-estimator/knr-knowledge/knr-knowledge-envelope";
import type { KnrVerifyActor } from "@/lib/intelligent-estimator/knr-knowledge/knr-verify-orchestrator";
import type { IkIdentityContext } from "./ik-identity-phase";

export type IkKnrReanalysisTarget = {
  tenderId: string;
  dwellingId: string;
  lineId: string;
  evidenceKeyV1: string;
  identityKeyV2: string;
  knrCode: string;
  previousLookupStatus: string | null;
  newLookupStatus: string | null;
};

export type IkKnrReanalysisSignal = {
  reanalysisRequired: boolean;
  reanalysisExecuted: boolean;
  targets: readonly IkKnrReanalysisTarget[];
  httpRequestCount: number;
  stagedPendingCount: number;
};

export type IkKnrReanalysisDiag = {
  status: "idle" | "pending" | "executed";
  reanalysisRequired: boolean;
  targetCount: number;
  targets: readonly IkKnrReanalysisTarget[];
};

export type IkKnrReanalysisOrchestraPlan = {
  bumpIdentityResearchEpoch: boolean;
  bumpLaborRecalcEpoch: boolean;
  bumpMaterialRecalcEpoch: boolean;
  clearKnowledgeAttemptLatch: boolean;
};

/** Resolve Super Admin actor from browser session — no ACL bypass when absent. */
export function resolveKnrVerifyActorFromAdminSession(): KnrVerifyActor | undefined {
  const session = loadAdminSessionFromStorage();
  if (!session?.id || !session.role) return undefined;
  return {
    actorId: session.id,
    role: session.role as AdminRole,
    displayName: session.displayName ?? session.login ?? session.id,
  };
}

/** Gate Document→Identity until KL-3 envelope is ready (PHASE A/B). */
export function shouldDeferIkDownstreamUntilKnrKnowledge(input: {
  readyForExperts: boolean;
  knrLineCount: number;
  knowledgeBusy: boolean;
  knrKnowledge: KnrKnowledgeEnvelope | null;
}): boolean {
  if (!input.readyForExperts || input.knrLineCount <= 0) return false;
  return input.knowledgeBusy || input.knrKnowledge === null;
}

export function buildDeferredIdentityBlockedContext(lineCount: number): IkIdentityContext {
  return {
    status: "blocked",
    lineCount,
    trustedOkCount: 0,
    provisionalBindingCount: 0,
    ambiguousCount: 0,
    noIdentityCount: 0,
    persistPlans: [],
    reasons: ["KNR_KNOWLEDGE_PENDING"],
  };
}

export function buildKnrReanalysisSignalFromHostResult(
  host: KnrHostKnowledgeResolveResult,
  lines: readonly Pick<KnrHostKnowledgeLineInput, "lineId" | "dwellingId">[],
): IkKnrReanalysisSignal {
  const stagedPendingCount =
    host.onDemandDiscovery?.perKey.filter(
      (k) => k.stagedPending || k.lookupAfter === "PENDING_IN_CATALOG",
    ).length ?? 0;

  const dwellingByLineId = new Map(
    lines.map((l) => [l.lineId, String(l.dwellingId ?? "").trim()]),
  );

  const targets: IkKnrReanalysisTarget[] =
    host.reanalysisTargets.length > 0
      ? host.reanalysisTargets.map((t) => ({ ...t }))
      : [];

  if (targets.length === 0) {
    for (const lineId of host.reanalysisLineIds) {
      const row = host.envelope.lineResults.find((r) => r.lineId === lineId);
      targets.push({
        tenderId: host.envelope.tenderId,
        dwellingId: dwellingByLineId.get(lineId) ?? "",
        lineId,
        evidenceKeyV1: String(row?.evidenceKeyV1 ?? ""),
        identityKeyV2: String(row?.identityKeyV2 ?? ""),
        knrCode: String(row?.displayCode ?? row?.evidenceKeyV1 ?? ""),
        previousLookupStatus: null,
        newLookupStatus: row?.lookupStatus ?? null,
      });
    }
  }

  const reanalysisRequired =
    host.reanalysisRequired === true
    || host.reanalysisExecuted
    || stagedPendingCount > 0;

  return {
    reanalysisRequired,
    reanalysisExecuted: host.reanalysisExecuted,
    targets,
    httpRequestCount: host.httpRequestCount,
    stagedPendingCount,
  };
}

export function buildKnrReanalysisDiag(
  signal: IkKnrReanalysisSignal | null | undefined,
): IkKnrReanalysisDiag {
  if (!signal || (!signal.reanalysisRequired && signal.targets.length === 0)) {
    return {
      status: "idle",
      reanalysisRequired: false,
      targetCount: 0,
      targets: [],
    };
  }
  return {
    status: signal.reanalysisExecuted ? "executed" : "pending",
    reanalysisRequired: signal.reanalysisRequired,
    targetCount: signal.targets.length,
    targets: signal.targets,
  };
}

/**
 * Orchestra invalidation plan after KL-3 discovery staging.
 * Extends existing identityResearchEpoch / laborRecalcEpoch — no second epoch system.
 */
export function planKnrReanalysisOrchestraInvalidation(
  signal: IkKnrReanalysisSignal,
  opts?: { downstreamAlreadyDeferred?: boolean },
): IkKnrReanalysisOrchestraPlan {
  if (!signal.reanalysisRequired) {
    return {
      bumpIdentityResearchEpoch: false,
      bumpLaborRecalcEpoch: false,
      bumpMaterialRecalcEpoch: false,
      clearKnowledgeAttemptLatch: false,
    };
  }
  const deferred = opts?.downstreamAlreadyDeferred === true;
  return {
    // When downstream was deferred until KL-3 envelope, Identity runs fresh — no epoch bump.
    bumpIdentityResearchEpoch: !deferred && signal.reanalysisExecuted,
    bumpLaborRecalcEpoch: true,
    bumpMaterialRecalcEpoch: true,
    clearKnowledgeAttemptLatch: signal.reanalysisExecuted,
  };
}
