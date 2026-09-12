/**
 * W2 — gated identity persistence (REUSE attachOfferBoqToDwelling · no new KV).
 */

import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { dwellingHasValidDocumentMapping } from "@/lib/multi-dwelling/package-gate";
import {
  attachOfferBoqToDwelling,
  getTenderPackage,
} from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { IkIdentityPersistPlan } from "./ik-identity-phase";

export type IkIdentityPersistSkip = {
  dwellingId: string;
  reason: string;
};

export type IkIdentityPersistWrite = {
  dwellingId: string;
  identityHash: string;
};

export type IkIdentityPersistOutcome = {
  writes: IkIdentityPersistWrite[];
  skips: IkIdentityPersistSkip[];
};

export type IkIdentityPersistSessionGate = Map<string, string>;

/** Soft failures — allow useEffect to retry when package/mapping appears later. */
export const IDENTITY_PERSIST_RETRYABLE_SKIP_REASONS = new Set<string>([
  "PACKAGE_NOT_FOUND",
  "DOCUMENT_MAPPING_REQUIRED",
  "STORAGE_UNAVAILABLE",
  "DWELLING_NOT_FOUND",
  "MISSING_TENDER_ID",
]);

/**
 * Latch persistAttemptKeyRef only after a terminal outcome.
 * Retryable skips must NOT latch — otherwise IdentityPhase plans never re-attach
 * when the package/mapping arrives on a later render (same identityPersistPlanKey).
 */
export function shouldLatchIdentityPersistAttempt(
  outcome: IkIdentityPersistOutcome,
): boolean {
  if (outcome.writes.length > 0) return true;
  if (outcome.skips.length === 0) return false;
  return !outcome.skips.some((s) =>
    IDENTITY_PERSIST_RETRYABLE_SKIP_REASONS.has(s.reason),
  );
}

function foldHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableCandidateKey(
  c: OfferBoqLine["candidateMatches"][number],
): string {
  return [
    c.catalogWorkId,
    c.matchedBy,
    c.matchConfidence,
    c.role,
  ].join("|");
}

/**
 * Stable hash of identity-relevant OfferBoq line fields (per dwelling payload).
 * Includes Admission noise tags — `isNoise` / `noiseKind` must trigger persist
 * when organizational headers flip to NOISE_SKIP without catalogWorkId change.
 */
export function computeOfferBoqIdentityPayloadHash(
  lines: readonly OfferBoqLine[],
): string {
  const payload = [...lines]
    .map((line) => ({
      lineId: line.lineId,
      catalogWorkId: line.catalogWorkId ?? null,
      matchMethod: line.matchMethod,
      matchConfidence: line.matchConfidence,
      isNoise: line.isNoise === true,
      noiseKind: line.noiseKind ?? null,
      candidates: [...(line.candidateMatches ?? [])]
        .map(stableCandidateKey)
        .sort(),
    }))
    .sort((a, b) => a.lineId.localeCompare(b.lineId));
  return `ik-id-${foldHash(JSON.stringify(payload)).toString(16)}`;
}

function hashExistingOfferBoq(doc: OfferBoqDocument | null | undefined): string | null {
  if (!doc?.lines?.length) return null;
  return computeOfferBoqIdentityPayloadHash(doc.lines);
}

function sessionKey(tenderId: string, dwellingId: string): string {
  return `${tenderId}|${normalizeDwellingId(dwellingId)}`;
}

/**
 * Gated persist — idempotent · hash-diff · no blind sync writes.
 * A5: skip dwelling when DOCUMENT_MAPPING_REQUIRED (multi) — does not block other dwellings.
 */
export function runGatedIdentityPersist(opts: {
  tenderId: string;
  package?: TenderPackage | null;
  plans: readonly IkIdentityPersistPlan[];
  sessionGate?: IkIdentityPersistSessionGate;
}): IkIdentityPersistOutcome {
  const tid = String(opts.tenderId ?? "").trim();
  const pkg = opts.package ?? (tid ? getTenderPackage(tid) : null);
  const writes: IkIdentityPersistWrite[] = [];
  const skips: IkIdentityPersistSkip[] = [];
  const gate = opts.sessionGate ?? new Map<string, string>();

  if (!tid) {
    return {
      writes,
      skips: opts.plans.map((p) => ({
        dwellingId: p.dwellingId,
        reason: "MISSING_TENDER_ID",
      })),
    };
  }

  if (!pkg) {
    return {
      writes,
      skips: opts.plans.map((p) => ({
        dwellingId: p.dwellingId,
        reason: "PACKAGE_NOT_FOUND",
      })),
    };
  }

  for (const plan of opts.plans) {
    const dwellingId = normalizeDwellingId(plan.dwellingId);
    const sk = sessionKey(tid, dwellingId);

    if (pkg.mode === "multi") {
      const unit = pkg.dwellings.find(
        (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
      );
      if (!unit || !dwellingHasValidDocumentMapping(pkg, unit)) {
        skips.push({
          dwellingId,
          reason: "DOCUMENT_MAPPING_REQUIRED",
        });
        continue;
      }
    }

    const existingUnit = pkg.dwellings.find(
      (d) => normalizeDwellingId(d.dwellingId) === dwellingId,
    );
    const existingHash = hashExistingOfferBoq(existingUnit?.offerBoq ?? null);
    if (existingHash != null && existingHash === plan.identityHash) {
      skips.push({ dwellingId, reason: "IDENTICAL_PAYLOAD" });
      gate.set(sk, plan.identityHash);
      continue;
    }

    if (gate.get(sk) === plan.identityHash) {
      skips.push({ dwellingId, reason: "ALREADY_WRITTEN_SESSION" });
      continue;
    }

    const attached = attachOfferBoqToDwelling({
      tenderId: tid,
      dwellingId,
      offerBoq: plan.offerBoq,
    });

    if (!attached.ok) {
      skips.push({ dwellingId, reason: attached.reason });
      continue;
    }

    gate.set(sk, plan.identityHash);
    writes.push({ dwellingId, identityHash: plan.identityHash });
  }

  return { writes, skips };
}
