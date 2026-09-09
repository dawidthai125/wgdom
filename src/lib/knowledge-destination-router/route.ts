/**
 * GO48 — route / persist / reuse over existing stores (thin adapters).
 */

import {
  lookupReusableLaborResearchEvidence,
  persistMeaningfulLaborResearchEvidence,
} from "@/lib/work-catalog/work-rate-research-evidence-persist";
import type { WorkRateQualifiedObservation } from "@/lib/work-catalog/work-rate-qualify";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { classifyKnowledge, DESTINATION_BY_TYPE } from "./classify";
import {
  KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
  type KnowledgeClassifyInput,
  type KnowledgePersistInput,
  type KnowledgePersistResult,
  type KnowledgeReuseQuery,
  type KnowledgeReuseResult,
  type KnowledgeRoutePlan,
} from "./types";

export function routeKnowledge(input: KnowledgeClassifyInput): KnowledgeRoutePlan {
  return classifyKnowledge(input);
}

function emptyPersist(
  plan: KnowledgeRoutePlan,
  wrote = false,
): KnowledgePersistResult {
  return {
    ...plan,
    wrote,
    ourRateWritten: false,
    workCatalogMutated: false,
    identityCandidateMutated: false,
    priceMemoryWritten: false,
    technologyPackMutated: false,
  };
}

/**
 * Persist only when autoPersistAllowed and payload valid.
 * Never writes OUR RATE / WC / PM / IC Accept / Pack.
 */
export function persistKnowledge(input: KnowledgePersistInput): KnowledgePersistResult {
  const plan = classifyKnowledge(input);
  const type = plan.knowledgeType;

  if (!type) {
    return emptyPersist({ ...plan, status: "INVALID_KNOWLEDGE" });
  }

  if (
    plan.status === "FORBIDDEN_CANONICAL_WRITE" ||
    plan.status === "AMBIGUOUS_TYPE" ||
    plan.status === "AMBIGUOUS_DESTINATION" ||
    plan.status === "UNSUPPORTED_DESTINATION"
  ) {
    return emptyPersist(plan);
  }

  const spec = DESTINATION_BY_TYPE[type];

  // Owner-gated destinations: never write through this facade
  if (spec.ownerRequired || plan.status === "OWNER_REQUIRED") {
    return emptyPersist({
      ...plan,
      status: "OWNER_REQUIRED",
      messagePl: plan.messagePl || "Owner authorization required — router did not write.",
    });
  }

  if (!spec.autoPersistAllowed) {
    return emptyPersist({
      ...plan,
      status: plan.status === "ROUTE_OK" ? "OWNER_REQUIRED" : plan.status,
      messagePl: "Destination does not allow router auto-persist.",
    });
  }

  // Only LABOR Evidence / LABOR_RATE observation persist is auto-allowed
  if (
    (type === "EVIDENCE" || type === "LABOR_RATE") &&
    plan.destination === "LABOR_SOURCE_EVIDENCE"
  ) {
    const payload = input.laborEvidence;
    if (!payload || !Array.isArray(payload.observations)) {
      return emptyPersist({
        ...plan,
        status: "INVALID_KNOWLEDGE",
        messagePl: "Missing laborEvidence.observations for Evidence persist.",
      });
    }
    if (!payload.workId?.trim() || !payload.unit?.trim()) {
      return emptyPersist({
        ...plan,
        status: "INVALID_KNOWLEDGE",
        messagePl: "Missing workId/unit for Evidence persist.",
      });
    }

    const observations = payload.observations as WorkRateQualifiedObservation[];
    const result = persistMeaningfulLaborResearchEvidence({
      workId: payload.workId,
      workNamePl: payload.workNamePl || payload.workId,
      unit: payload.unit as WgdomCostUnit,
      observations,
      synonymUsed: payload.synonymUsed ?? null,
      identityMethod: payload.identityMethod,
      persist: payload.persist !== false,
    });

    if (!result.meaningful) {
      return emptyPersist({
        ...plan,
        status: "INVALID_KNOWLEDGE",
        messagePl: "No meaningful observations — Evidence not written.",
      });
    }

    const status =
      result.persisted > 0
        ? plan.orphanReuse
          ? "ORPHAN_REUSE_OPEN"
          : "ROUTE_OK"
        : result.cas && result.cas.ok === false
          ? "INVALID_KNOWLEDGE"
          : "DUPLICATE";

    return {
      ...plan,
      status: result.persisted > 0 ? (plan.orphanReuse ? "ORPHAN_REUSE_OPEN" : "ROUTE_OK") : status,
      wrote: result.persisted > 0,
      ourRateWritten: false,
      workCatalogMutated: false,
      identityCandidateMutated: false,
      priceMemoryWritten: false,
      technologyPackMutated: false,
      detail: {
        attempted: result.attempted,
        persisted: result.persisted,
        casOk: result.cas?.ok === true,
        cas: result.cas,
        observations: result.observations,
        seamId: result.seamId,
        laborEvidenceResult: result,
      },
      messagePl:
        result.persisted > 0
          ? `Evidence persisted=${result.persisted} (≠ OUR RATE). Reuse suppress still OPEN.`
          : "Evidence upsert completed without new rows (idempotent/dedupe).",
    };
  }

  return emptyPersist({
    ...plan,
    status: "UNSUPPORTED_DESTINATION",
    messagePl: "No persist adapter for this knowledge type.",
  });
}

/**
 * Resolve reuse via existing lookup adapters only.
 * Never returns OUR RATE.
 */
export function resolveKnowledgeReuse(input: KnowledgeReuseQuery): KnowledgeReuseResult {
  const plan = classifyKnowledge({ knowledgeType: input.knowledgeType });
  if (!plan.knowledgeType) {
    return {
      routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
      status: "AMBIGUOUS_TYPE",
      hit: false,
      count: 0,
      isOurRate: false,
      reusable: false,
      orphanReuse: false,
      messagePl: "Unknown knowledge type.",
    };
  }

  if (
    (input.knowledgeType === "EVIDENCE" || input.knowledgeType === "LABOR_RATE") &&
    input.workId &&
    input.unit
  ) {
    const hit = lookupReusableLaborResearchEvidence({
      workId: input.workId,
      workNamePl: input.workNamePl || input.workId,
      unit: input.unit as WgdomCostUnit,
    });
    return {
      routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
      status: hit.hit ? "ORPHAN_REUSE_OPEN" : "ROUTE_OK",
      hit: hit.hit,
      count: hit.count,
      isOurRate: false,
      reusable: hit.hit,
      orphanReuse: true,
      messagePl: hit.hit
        ? `Evidence hit count=${hit.count}; suppress policy STATE_ONLY (evaluator; not OUR RATE).`
        : "No reusable labor Evidence for workId|unit.",
    };
  }

  if (plan.ownerRequired) {
    return {
      routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
      status: "OWNER_REQUIRED",
      hit: false,
      count: 0,
      isOurRate: false,
      reusable: plan.reusable,
      orphanReuse: false,
      messagePl: "Reuse of canonical plane requires existing Catalog First / Accept consumers — not escalated here.",
    };
  }

  if (plan.destination === "UNSUPPORTED" || plan.destination === "DERIVED_NO_STORE") {
    return {
      routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
      status:
        plan.destination === "DERIVED_NO_STORE" ? "ROUTE_OK" : "UNSUPPORTED_DESTINATION",
      hit: false,
      count: 0,
      isOurRate: false,
      reusable: false,
      orphanReuse: false,
      messagePl: plan.messagePl,
    };
  }

  return {
    routerId: KB03_KNOWLEDGE_DESTINATION_ROUTER_ID,
    status: "UNSUPPORTED_DESTINATION",
    hit: false,
    count: 0,
    isOurRate: false,
    reusable: false,
    orphanReuse: false,
    messagePl: "No reuse adapter wired for this knowledge type in GO48.",
  };
}
