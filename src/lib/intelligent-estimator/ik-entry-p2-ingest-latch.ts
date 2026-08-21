/**
 * IK-REAL-TENDER-BOQ-INGEST-BLOCKER — pure P2 Host latch predicates.
 * REUSE semantics: useTenderDossierHeavyLazy generation + owner-safe busy release.
 * ZERO bridge / readyForExperts / KNR changes.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { needsIkNg02Ingest } from "@/lib/intelligent-estimator/ik-ng02-ingest-bridge";

/** Eligibility fingerprint — not full item identity · not tenderFit. */
export function buildP2IngestFingerprint(item: TenderPipelineItem): string {
  const id = String(item.id || item.tenderId || "");
  const docs = item.bzpDocuments?.length ?? 0;
  const fetched = item.documentsFetchedAt ?? "";
  const needs = needsIkNg02Ingest(item) ? 1 : 0;
  return `${id}|docs:${docs}|fetched:${fetched}|needs:${needs}`;
}

export function isP2AttemptStale(opts: {
  cancelled: boolean;
  generation: number;
  runGenerationCurrent: number;
}): boolean {
  return opts.cancelled || opts.generation !== opts.runGenerationCurrent;
}

/** Live finally / explicit release — only the busy owner of the current generation. */
export function shouldReleaseBridgeBusy(opts: {
  generation: number;
  runGenerationCurrent: number;
  busyOwnerGen: number | null;
}): boolean {
  return (
    opts.generation === opts.runGenerationCurrent
    && opts.busyOwnerGen === opts.generation
  );
}

/**
 * Effect cleanup invalidate (heavy-lazy style).
 * Bump run generation when this attempt is still current; release busy only if this gen owns it.
 */
export function p2CleanupInvalidate(opts: {
  generation: number;
  runGenerationCurrent: number;
  busyOwnerGen: number | null;
}): {
  nextRunGeneration: number;
  releaseBusy: boolean;
  nextBusyOwner: number | null;
} {
  let nextRunGeneration = opts.runGenerationCurrent;
  if (opts.runGenerationCurrent === opts.generation) {
    nextRunGeneration = opts.generation + 1;
  }
  const releaseBusy = opts.busyOwnerGen === opts.generation;
  return {
    nextRunGeneration,
    releaseBusy,
    nextBusyOwner: releaseBusy ? null : opts.busyOwnerGen,
  };
}

/** Suppress parallel BEGIN while same fingerprint still owns busy. */
export function shouldSuppressP2DoubleStart(opts: {
  fingerprint: string;
  inFlightFingerprint: string | null;
  busyOwnerGen: number | null;
}): boolean {
  return (
    opts.busyOwnerGen != null
    && opts.inFlightFingerprint != null
    && opts.inFlightFingerprint === opts.fingerprint
  );
}
