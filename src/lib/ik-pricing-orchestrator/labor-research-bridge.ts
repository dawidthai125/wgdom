/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W2 — labor research bridge (REUSE selective research).
 *
 * ZERO invent · ZERO companyPrice · ZERO Accept without Owner · F5 untouched.
 */

import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  runSelectiveWorkRateResearch,
  type RunSelectiveWorkRateResearchResult,
  type WorkRateResearchCandidate,
} from "@/lib/work-catalog/work-rate-research";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import { acceptWorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-accept";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import {
  notifyIkPricingAcceptedIfPersistOk,
  type NotifyIkPricingAcceptedInput,
} from "./notify-accepted";
import { isLaborAcceptIdempotentNoop } from "@/lib/intelligent-estimator/orchestra/ik-owner-gate-labor-idem";
import type { IkLaborGapJob } from "./types";

/** Session-level in-flight / done keys — ephemeral (not KV). */
const sessionLaborResearchKeys = new Set<string>();

export function clearIkLaborResearchSessionDedupeForTests(): void {
  sessionLaborResearchKeys.clear();
}

export function isIkLaborResearchSessionBusy(dedupeKey: string): boolean {
  return sessionLaborResearchKeys.has(`busy:${dedupeKey}`);
}

export function markIkLaborResearchSessionBusy(dedupeKey: string): void {
  sessionLaborResearchKeys.add(`busy:${dedupeKey}`);
}

export function clearIkLaborResearchSessionBusy(dedupeKey: string): void {
  sessionLaborResearchKeys.delete(`busy:${dedupeKey}`);
}

export type RunIkLaborGapResearchInput = {
  job: IkLaborGapJob;
  store: WorkCatalogStore;
  nowMs?: number;
  lookupPort?: WorkRateSelectiveLookupPort;
  /** Owner force — even CURRENT (not default W2 path). */
  forceRefresh?: boolean;
  bypassCooldown?: boolean;
};

export type RunIkLaborGapResearchResult =
  | {
      status: "SKIPPED_SESSION_BUSY";
      messagePl: string;
      httpFetchCount: 0;
    }
  | RunSelectiveWorkRateResearchResult;

/**
 * Serial, cache-first labor research for one IkGapJob.
 * CURRENT → REUSE (no invent). Does not Accept / does not bump.
 */
export async function runIkLaborGapResearch(
  input: RunIkLaborGapResearchInput,
): Promise<RunIkLaborGapResearchResult> {
  const key = input.job.dedupeKey;
  if (isIkLaborResearchSessionBusy(key)) {
    return {
      status: "SKIPPED_SESSION_BUSY",
      messagePl: "Research tej pozycji już trwa — poczekaj (P0 serial).",
      httpFetchCount: 0,
    };
  }
  markIkLaborResearchSessionBusy(key);
  try {
    return await runSelectiveWorkRateResearch({
      store: input.store,
      workId: input.job.workId,
      unit: input.job.unit,
      namePl: input.job.namePl,
      forceRefresh: input.forceRefresh,
      bypassCooldown: input.bypassCooldown,
      nowMs: input.nowMs,
      lookupPort: input.lookupPort,
    });
  } finally {
    clearIkLaborResearchSessionBusy(key);
  }
}

import { buildLaborRateEvidencePack } from "./labor-rate-evidence";
import {
  analyzeLaborRateCandidate,
  type LaborRateExpertRecommendation,
} from "./labor-rate-expert-rec";

/**
 * IK-LABOR-EXPERT-REC-01 — full RO recommendation (never Accept / never write).
 */
export function buildIkLaborExpertRecommendation(
  candidate: WorkRateResearchCandidate,
  rejects?: import("@/lib/work-catalog/work-rate-research").WorkRateResearchRejectRow[] | null,
): LaborRateExpertRecommendation {
  const pack = buildLaborRateEvidencePack(candidate, rejects ?? null);
  return analyzeLaborRateCandidate({ pack, sourceCandidate: candidate });
}

/**
 * Thin PL wrapper — REUSE analyzeLaborRateCandidate (compat for existing consumers).
 * Analyse only · NEVER Accept.
 */
export function buildIkLaborExpertRecommendationPl(
  candidate: WorkRateResearchCandidate,
): string {
  return buildIkLaborExpertRecommendation(candidate).summaryPl;
}

export type AcceptIkLaborResearchAndNotifyInput = {
  store: WorkCatalogStore;
  candidate: WorkRateResearchCandidate;
  notify: NotifyIkPricingAcceptedInput;
  observedAt?: string;
  updatedAt?: string;
  /**
   * Test harness — inject local save (ZERO cloud). Production omits → saveWorkCatalogRouted.
   */
  save?: (
    store: WorkCatalogStore,
    options: { updatedAtIso: string; previousStore: WorkCatalogStore },
  ) => Promise<{ ok: boolean; saved?: boolean }>;
};

export type AcceptIkLaborResearchAndNotifyResult =
  | {
      ok: true;
      store: WorkCatalogStore;
      notified: true;
      companyPriceUsedAsOurRate: false;
      aiAutoAccept: false;
      skippedDuplicate?: false;
    }
  | {
      ok: true;
      store: WorkCatalogStore;
      notified: false;
      companyPriceUsedAsOurRate: false;
      aiAutoAccept: false;
      skippedDuplicate: true;
    }
  | {
      ok: false;
      reason: string;
      notified: false;
      companyPriceUsedAsOurRate: false;
      aiAutoAccept: false;
    };

/**
 * Owner Accept → acceptWorkRateResearchCandidate → saveWorkCatalogRouted → notify (only if persist ok).
 */
/**
 * A08-P3 IC-P3-LABOR-IDEM-1 — identical candidate Accept → successful noop, no duplicate history.
 */
export async function acceptIkLaborResearchAndNotifyIdempotent(
  input: AcceptIkLaborResearchAndNotifyInput,
): Promise<AcceptIkLaborResearchAndNotifyResult> {
  const anti = {
    companyPriceUsedAsOurRate: false as const,
    aiAutoAccept: false as const,
  };
  if (isLaborAcceptIdempotentNoop(input.store, input.candidate)) {
    return {
      ok: true,
      store: input.store,
      notified: false,
      skippedDuplicate: true,
      ...anti,
    };
  }
  return acceptIkLaborResearchAndNotify(input);
}

export async function acceptIkLaborResearchAndNotify(
  input: AcceptIkLaborResearchAndNotifyInput,
): Promise<AcceptIkLaborResearchAndNotifyResult> {
  const anti = {
    companyPriceUsedAsOurRate: false as const,
    aiAutoAccept: false as const,
  };
  const updatedAtIso = input.updatedAt?.trim() || new Date().toISOString();
  const observedAt = input.observedAt?.trim() || updatedAtIso;

  const accepted = acceptWorkRateResearchCandidate({
    store: input.store,
    candidate: input.candidate,
    observedAt,
    updatedAt: updatedAtIso,
  });
  if (!accepted.ok) {
    return { ok: false, reason: accepted.reason, notified: false, ...anti };
  }

  try {
    const saveFn = input.save ?? saveWorkCatalogRouted;
    const save = await saveFn(accepted.store, {
      updatedAtIso,
      previousStore: input.store,
    });
    if (!save.ok || save.saved === false) {
      notifyIkPricingAcceptedIfPersistOk(false, input.notify);
      return {
        ok: false,
        reason: "PERSIST_FAILED",
        notified: false,
        ...anti,
      };
    }
    const n = notifyIkPricingAcceptedIfPersistOk(true, input.notify);
    if (!n.ok) {
      return { ok: false, reason: "NOTIFY_SKIPPED", notified: false, ...anti };
    }
    return {
      ok: true,
      store: accepted.store,
      notified: true,
      ...anti,
    };
  } catch {
    notifyIkPricingAcceptedIfPersistOk(false, input.notify);
    return { ok: false, reason: "PERSIST_FAILED", notified: false, ...anti };
  }
}
