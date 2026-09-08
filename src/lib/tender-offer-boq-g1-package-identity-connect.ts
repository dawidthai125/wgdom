/**
 * CONNECT — G1 durable package.offerBoq identity → Bid OfferBoq runtime.
 *
 * REUSE: resolveWorkIdentityFromOfferBoqLine (F5 TRUSTED contract unchanged).
 * Overlay ONLY identity fields by lineId. Fail-closed on missing/untrusted/conflict.
 * Does NOT mutate quantity/unit/description/pricing/BOM.
 */

import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type {
  OfferBoqConfidence,
  OfferBoqDocument,
  OfferBoqLine,
  OfferBoqMatchCandidate,
  OfferBoqMatchMethod,
} from "@/lib/tender-offer-boq";
import { resolveWorkIdentityFromOfferBoqLine } from "@/lib/tender-position-cost/boq-shadow-adapter";

export type TrustedPackageIdentityFields = {
  catalogWorkId: string;
  matchMethod: OfferBoqMatchMethod;
  matchConfidence: OfferBoqConfidence;
  matchedBy: OfferBoqLine["matchedBy"];
  candidateMatches: OfferBoqMatchCandidate[];
};

export type G1PackageIdentityConnectStats = {
  packageFound: boolean;
  dwellingsScanned: number;
  trustedIndexSize: number;
  overlayApplied: number;
  skippedUntrusted: number;
  skippedConflict: number;
  skippedNoLineMatch: number;
  reasonCodes: string[];
};

function identityFingerprint(fields: TrustedPackageIdentityFields): string {
  const candidates = [...(fields.candidateMatches ?? [])]
    .map((c) => `${c.catalogWorkId}|${c.matchedBy}|${c.matchConfidence}`)
    .sort()
    .join(";");
  return [
    fields.catalogWorkId,
    fields.matchMethod,
    fields.matchConfidence,
    fields.matchedBy ?? "",
    candidates,
  ].join("::");
}

function toTrustedFields(line: OfferBoqLine): TrustedPackageIdentityFields | null {
  const resolved = resolveWorkIdentityFromOfferBoqLine(line);
  if (resolved.status !== "OK" || !resolved.workId) return null;
  const catalogWorkId = String(line.catalogWorkId ?? resolved.workId).trim();
  if (!catalogWorkId) return null;
  const matchMethod = (line.matchMethod ?? resolved.matchMethod) as OfferBoqMatchMethod;
  if (!matchMethod) return null;
  return {
    catalogWorkId,
    matchMethod,
    matchConfidence: (line.matchConfidence ??
      resolved.matchConfidence ??
      "high") as OfferBoqConfidence,
    matchedBy: line.matchedBy ?? matchMethod,
    candidateMatches: [...(line.candidateMatches ?? [])],
  };
}

/**
 * Build lineId → trusted identity index from package dwellings.
 * Same lineId with differing trusted identity → conflict (excluded).
 */
export function collectTrustedPackageIdentityByLineId(
  pkg: TenderPackage | null | undefined,
): {
  byLineId: Map<string, TrustedPackageIdentityFields>;
  stats: Pick<
    G1PackageIdentityConnectStats,
    | "packageFound"
    | "dwellingsScanned"
    | "trustedIndexSize"
    | "skippedUntrusted"
    | "skippedConflict"
    | "reasonCodes"
  >;
} {
  const byLineId = new Map<string, TrustedPackageIdentityFields>();
  const conflicted = new Set<string>();
  const reasonCodes: string[] = [];
  let skippedUntrusted = 0;
  let skippedConflict = 0;
  let dwellingsScanned = 0;

  if (!pkg) {
    return {
      byLineId,
      stats: {
        packageFound: false,
        dwellingsScanned: 0,
        trustedIndexSize: 0,
        skippedUntrusted: 0,
        skippedConflict: 0,
        reasonCodes: ["PACKAGE_MISSING"],
      },
    };
  }

  for (const dwelling of pkg.dwellings ?? []) {
    const lines = dwelling.offerBoq?.lines;
    if (!lines?.length) continue;
    dwellingsScanned += 1;
    for (const line of lines) {
      const lineId = String(line.lineId ?? "").trim();
      if (!lineId) {
        skippedUntrusted += 1;
        continue;
      }
      if (conflicted.has(lineId)) continue;

      const trusted = toTrustedFields(line);
      if (!trusted) {
        skippedUntrusted += 1;
        continue;
      }

      const existing = byLineId.get(lineId);
      if (!existing) {
        byLineId.set(lineId, trusted);
        continue;
      }
      if (identityFingerprint(existing) !== identityFingerprint(trusted)) {
        byLineId.delete(lineId);
        conflicted.add(lineId);
        skippedConflict += 1;
      }
    }
  }

  if (dwellingsScanned === 0) {
    reasonCodes.push("NO_DWELLING_OFFER_BOQ");
  }
  if (conflicted.size > 0) {
    reasonCodes.push("LINE_IDENTITY_CONFLICT");
  }

  return {
    byLineId,
    stats: {
      packageFound: true,
      dwellingsScanned,
      trustedIndexSize: byLineId.size,
      skippedUntrusted,
      skippedConflict,
      reasonCodes,
    },
  };
}

/**
 * Overlay trusted package identity onto Bid OfferBoq lines (by lineId only).
 * Unmatched lineIds keep mapper identity. Untrusted package lines never promote.
 */
export function overlayTrustedPackageIdentityOntoOfferBoq(
  doc: OfferBoqDocument,
  pkg: TenderPackage | null | undefined,
): { document: OfferBoqDocument; stats: G1PackageIdentityConnectStats } {
  const collected = collectTrustedPackageIdentityByLineId(pkg);
  const reasonCodes = [...collected.stats.reasonCodes];

  if (!collected.stats.packageFound || collected.byLineId.size === 0) {
    return {
      document: doc,
      stats: {
        ...collected.stats,
        overlayApplied: 0,
        skippedNoLineMatch: doc.lines?.length ?? 0,
        reasonCodes:
          reasonCodes.length > 0 ? reasonCodes : ["NO_TRUSTED_PACKAGE_IDENTITY"],
      },
    };
  }

  let overlayApplied = 0;
  let skippedNoLineMatch = 0;
  const nextLines = (doc.lines ?? []).map((line) => {
    const lineId = String(line.lineId ?? "").trim();
    if (!lineId) {
      skippedNoLineMatch += 1;
      return line;
    }
    const trusted = collected.byLineId.get(lineId);
    if (!trusted) {
      skippedNoLineMatch += 1;
      return line;
    }
    overlayApplied += 1;
    return {
      ...line,
      catalogWorkId: trusted.catalogWorkId,
      matchMethod: trusted.matchMethod,
      matchConfidence: trusted.matchConfidence,
      matchedBy: trusted.matchedBy,
      candidateMatches: trusted.candidateMatches,
    };
  });

  if (overlayApplied === 0) {
    reasonCodes.push("NO_LINE_ID_OVERLAP");
  }

  return {
    document: {
      ...doc,
      lines: nextLines,
    },
    stats: {
      ...collected.stats,
      overlayApplied,
      skippedNoLineMatch,
      reasonCodes,
    },
  };
}
