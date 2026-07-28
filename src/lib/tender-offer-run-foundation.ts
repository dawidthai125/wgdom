/**
 * TRE-01 Slice A — Foundation spine (FND-01…05).
 * Wyłącznie warstwa infrastrukturalna: id, digest, error, audit, event.
 * Bez FND-06 Persistence Adapter. Bez UI Foundation.
 */

import { createId, isValidId } from "@/lib/wgdom-foundation/id";
import { createDigest } from "@/lib/wgdom-foundation/digest";
import { createError } from "@/lib/wgdom-foundation/errors";
import { createAuditRecord } from "@/lib/wgdom-foundation/audit";
import { createEvent } from "@/lib/wgdom-foundation/events";
import type { OfferRunSnapshot } from "@/lib/tender-offer-run";
import {
  readStoredOfferRunId,
  writeStoredOfferRunId,
} from "@/lib/tender-offer-run";

/** FND-04 actions (UPPER_SNAKE). */
export const TRE_01_AUDIT_RUN_CREATED = "TRE_OFFER_RUN_CREATED";
export const TRE_01_AUDIT_RECOMMENDATION_ISSUED = "TRE_OFFER_RECOMMENDATION_ISSUED";
export const TRE_01_AUDIT_RUN_DEGRADED = "TRE_OFFER_RUN_DEGRADED";

/** FND-05 event types (UPPER_SNAKE). */
export const TRE_01_EVENT_RUN_STARTED = "TRE_OFFER_RUN_STARTED";
export const TRE_01_EVENT_OFFER_RECOMMENDED = "TRE_OFFER_RECOMMENDED";
export const TRE_01_EVENT_RUN_DEGRADED = "TRE_OFFER_RUN_DEGRADED";
export const TRE_01_EVENT_RUN_FAILED = "TRE_OFFER_RUN_FAILED";

const FND_OFFER_INSUFFICIENT = "FND_OFFER_INSUFFICIENT_DATA";
const FND_OFFER_PIPELINE = "FND_OFFER_PIPELINE_FAILED";

const ACTOR_SYSTEM = { type: "system" as const, id: "tre-01-slice-a", label: "TRE-01 Offer Run" };
const SOURCE_DOMAIN = { type: "domain" as const, id: "tre-01-slice-a", label: "TRE-01 Offer Run" };

export interface OfferRunFoundationHandles {
  runId: string;
  lastDigestHex: string | null;
}

/**
 * Zapewnia stabilny runId per tender (session LS + validate FND-01).
 */
export function ensureOfferRunId(tenderPipelineItemId: string): string {
  const existing = readStoredOfferRunId(tenderPipelineItemId);
  if (existing && isValidId(existing, "start")) {
    return existing;
  }
  const runId = createId("start");
  writeStoredOfferRunId(tenderPipelineItemId, runId);
  return runId;
}

export async function digestOfferRunSnapshot(snapshot: OfferRunSnapshot): Promise<string> {
  return createDigest({
    tenderPipelineItemId: snapshot.tenderPipelineItemId,
    phase: snapshot.phase,
    lifecycleStatus: snapshot.lifecycleStatus,
    recommendedBidPln: snapshot.recommendedBidPln,
    hasBidRecommendation: snapshot.hasBidRecommendation,
  });
}

export async function digestRecommendationPayload(input: {
  runId: string;
  recommendedOfferPln: number;
  tenderPipelineItemId: string;
}): Promise<string> {
  return createDigest({
    runId: input.runId,
    recommendedOfferPln: input.recommendedOfferPln,
    tenderPipelineItemId: input.tenderPipelineItemId,
  });
}

export function createOfferRunInsufficientError(message: string) {
  return createError({
    code: FND_OFFER_INSUFFICIENT,
    message,
    category: "validation",
    userMessage: "Brak wystarczających danych do rekomendowanej ceny oferty.",
  });
}

export function createOfferRunPipelineError(message: string) {
  return createError({
    code: FND_OFFER_PIPELINE,
    message,
    category: "internal",
    userMessage: "Nie udało się domknąć wyliczenia oferty.",
  });
}

export async function emitOfferRunCreatedAudit(input: {
  runId: string;
  tenderPipelineItemId: string;
}) {
  return createAuditRecord({
    actor: ACTOR_SYSTEM,
    action: TRE_01_AUDIT_RUN_CREATED,
    target: { type: "offer_run", id: input.runId },
    meta: {
      tenderPipelineItemId: input.tenderPipelineItemId,
      source: "tre-01-slice-a",
    },
  });
}

export async function emitRecommendationIssuedAudit(input: {
  runId: string;
  tenderPipelineItemId: string;
  recommendedOfferPln: number;
}) {
  return createAuditRecord({
    actor: ACTOR_SYSTEM,
    action: TRE_01_AUDIT_RECOMMENDATION_ISSUED,
    target: { type: "offer_run", id: input.runId },
    payload: { recommendedOfferPln: input.recommendedOfferPln },
    withPayloadDigest: true,
    meta: {
      tenderPipelineItemId: input.tenderPipelineItemId,
      source: "tre-01-slice-a",
    },
  });
}

export async function emitOfferRunDegradedAudit(input: {
  runId: string;
  tenderPipelineItemId: string;
  reason: string;
}) {
  return createAuditRecord({
    actor: ACTOR_SYSTEM,
    action: TRE_01_AUDIT_RUN_DEGRADED,
    target: { type: "offer_run", id: input.runId },
    meta: {
      tenderPipelineItemId: input.tenderPipelineItemId,
      reason: input.reason.slice(0, 200),
      source: "tre-01-slice-a",
    },
  });
}

export async function emitOfferRunStartedEvent(input: {
  runId: string;
  tenderPipelineItemId: string;
}) {
  return createEvent({
    type: TRE_01_EVENT_RUN_STARTED,
    source: SOURCE_DOMAIN,
    subject: { type: "offer_run", id: input.runId },
    payload: { tenderPipelineItemId: input.tenderPipelineItemId },
  });
}

export async function emitOfferRecommendedEvent(input: {
  runId: string;
  recommendedOfferPln: number;
}) {
  return createEvent({
    type: TRE_01_EVENT_OFFER_RECOMMENDED,
    source: SOURCE_DOMAIN,
    subject: { type: "offer_run", id: input.runId },
    payload: { recommendedOfferPln: input.recommendedOfferPln },
    withPayloadDigest: true,
  });
}

export async function emitOfferRunDegradedEvent(input: {
  runId: string;
  reason: string;
}) {
  return createEvent({
    type: TRE_01_EVENT_RUN_DEGRADED,
    source: SOURCE_DOMAIN,
    subject: { type: "offer_run", id: input.runId },
    payload: { reason: input.reason.slice(0, 200) },
  });
}

export async function emitOfferRunFailedEvent(input: {
  runId: string;
  reason: string;
}) {
  return createEvent({
    type: TRE_01_EVENT_RUN_FAILED,
    source: SOURCE_DOMAIN,
    subject: { type: "offer_run", id: input.runId },
    payload: { reason: input.reason.slice(0, 200) },
  });
}

/**
 * Bootstrap spine przy starcie Offer Run (FND-01 + audit created + event started).
 */
export async function bootstrapOfferRunFoundation(input: {
  tenderPipelineItemId: string;
}): Promise<OfferRunFoundationHandles> {
  const runId = ensureOfferRunId(input.tenderPipelineItemId);
  await emitOfferRunCreatedAudit({
    runId,
    tenderPipelineItemId: input.tenderPipelineItemId,
  });
  await emitOfferRunStartedEvent({
    runId,
    tenderPipelineItemId: input.tenderPipelineItemId,
  });
  return { runId, lastDigestHex: null };
}
