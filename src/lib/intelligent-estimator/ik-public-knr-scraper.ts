/**
 * IK Public KNR Scraper — adapter abstraction over legal public documents.
 *
 * Production HTTP stays allowlist-bound (reuse knr-discovery-*).
 * NEVER paywall bypass · NEVER license scrape · NEVER invent BOM rows.
 */

import type {
  PublicKnrRecord,
  PublicKnrRejectReason,
  PublicKnrSourceKind,
  PublicKnrSourceTier,
} from "./ik-public-knr-types";
import {
  extractKnrDiscoveryFactFromDocumentText,
  parseKnrDiscoveryExpectedTarget,
} from "./knr-knowledge/knr-discovery-fact-extract";

export type PublicKnrFetchResult =
  | {
      ok: true;
      url: string;
      bodyText: string;
      contentHash: string;
      retrievedAt: string;
      httpStatus: number;
    }
  | {
      ok: false;
      url: string;
      reason: PublicKnrRejectReason;
      messagePl: string;
    };

export type PublicKnrSourceAdapter = {
  readonly sourceId: string;
  readonly sourceKind: PublicKnrSourceKind;
  readonly sourceTier: PublicKnrSourceTier;
  canHandle(url: string): boolean;
  fetchDocument(url: string): Promise<PublicKnrFetchResult> | PublicKnrFetchResult;
  extractKnrRecords(
    document: Extract<PublicKnrFetchResult, { ok: true }>,
    expectedCode: string,
  ): Promise<PublicKnrRecord[]> | PublicKnrRecord[];
};

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(16)}`;
}

/**
 * Generic public PDF/HTML text adapter — extract via existing fact extractor.
 * BOM materials always empty (public BOQ rarely has qty factors) unless caller injects.
 */
export function createPublicDocumentTextAdapter(opts: {
  sourceId: string;
  sourceKind: PublicKnrSourceKind;
  sourceTier: PublicKnrSourceTier;
  /** Sync/async fetch. Default denies (must inject). */
  fetchImpl?: (url: string) => PublicKnrFetchResult | Promise<PublicKnrFetchResult>;
}): PublicKnrSourceAdapter {
  return {
    sourceId: opts.sourceId,
    sourceKind: opts.sourceKind,
    sourceTier: opts.sourceTier,
    canHandle: () => true,
    fetchDocument(url) {
      if (opts.fetchImpl) return opts.fetchImpl(url);
      return {
        ok: false,
        url,
        reason: "NOT_ALLOWLISTED",
        messagePl: "Brak fetchImpl — użyj discovery HTTP allowlist / fakeExec.",
      };
    },
    extractKnrRecords(document, expectedCode) {
      const target = parseKnrDiscoveryExpectedTarget(expectedCode);
      const fact = extractKnrDiscoveryFactFromDocumentText(document.bodyText, {
        expectedCode,
        evidenceKeyV1: expectedCode,
        sourceId: opts.sourceId,
        sourceUrlHash: document.contentHash,
      });
      if (!fact || fact.extractionStatus === "EMPTY" || fact.extractionStatus === "PARTIAL_DISCOVERY") {
        // PARTIAL without unit/desc → no catalog stage candidate
        if (!fact?.description || !fact?.unit) return [];
      }
      const bomComplete = false;
      return [
        {
          family: (target?.family ?? "KNR") as PublicKnrRecord["family"],
          chapter: null,
          catalogId: target?.catalog ?? null,
          positionCode: target ? `${target.table}-${target.item}` : expectedCode,
          description: fact.description,
          unit: fact.unit,
          materials: null,
          sourceUrl: document.url,
          sourceHash: document.contentHash || simpleHash(document.bodyText),
          sourceKind: opts.sourceKind,
          sourceTier: opts.sourceTier,
          sourceId: opts.sourceId,
          retrievedAt: document.retrievedAt,
          bomComplete,
        },
      ];
    },
  };
}

/** Fixture adapter: returns canned record; optional PAYWALL on specific URLs. */
export function createFixturePublicKnrAdapter(opts: {
  sourceId: string;
  recordsByCode: Record<string, PublicKnrRecord>;
  paywallUrls?: readonly string[];
  sourceKind?: PublicKnrSourceKind;
  sourceTier?: PublicKnrSourceTier;
}): PublicKnrSourceAdapter {
  const paywall = new Set(opts.paywallUrls ?? []);
  return {
    sourceId: opts.sourceId,
    sourceKind: opts.sourceKind ?? "PUBLIC_TENDER",
    sourceTier: opts.sourceTier ?? "PUBLIC_TENDER_OFFICIAL",
    canHandle: () => true,
    fetchDocument(url) {
      if (paywall.has(url)) {
        return {
          ok: false,
          url,
          reason: "PAYWALL",
          messagePl: "Źródło za paywallem — skip (bez bypass).",
        };
      }
      return {
        ok: true,
        url,
        bodyText: "fixture",
        contentHash: simpleHash(url),
        retrievedAt: new Date().toISOString(),
        httpStatus: 200,
      };
    },
    extractKnrRecords(_document, expectedCode) {
      const key = String(expectedCode ?? "").trim().toUpperCase();
      const rec =
        opts.recordsByCode[key]
        ?? opts.recordsByCode[expectedCode]
        ?? null;
      return rec ? [{ ...rec, bomComplete: Boolean(rec.bomComplete) }] : [];
    },
  };
}

/**
 * Sync helper: try adapters in order; skip paywall/license; collect records.
 */
export function runPublicKnrScraperChainSync(opts: {
  adapters: readonly PublicKnrSourceAdapter[];
  urls: readonly string[];
  expectedCode: string;
  maxSources?: number;
}): {
  records: PublicKnrRecord[];
  sourcesTried: number;
  sourcesAccepted: number;
  sourcesRejected: number;
  rejectReasons: PublicKnrRejectReason[];
} {
  const max = opts.maxSources ?? 8;
  const records: PublicKnrRecord[] = [];
  const rejectReasons: PublicKnrRejectReason[] = [];
  let sourcesTried = 0;
  let sourcesAccepted = 0;
  let sourcesRejected = 0;

  for (const url of opts.urls) {
    if (sourcesTried >= max) {
      rejectReasons.push("BUDGET");
      break;
    }
    const adapter = opts.adapters.find((a) => a.canHandle(url)) ?? opts.adapters[0];
    if (!adapter) break;
    sourcesTried += 1;
    const fetched = adapter.fetchDocument(url) as PublicKnrFetchResult;
    if (!fetched.ok) {
      sourcesRejected += 1;
      rejectReasons.push(fetched.reason);
      continue;
    }
    const extracted = adapter.extractKnrRecords(fetched, opts.expectedCode) as PublicKnrRecord[];
    if (!extracted.length) {
      sourcesRejected += 1;
      rejectReasons.push("NO_KNR_MATCH");
      continue;
    }
    sourcesAccepted += 1;
    for (const r of extracted) {
      if (!r.description || !r.unit) {
        sourcesRejected += 1;
        rejectReasons.push("EXTRACT_PARTIAL");
        continue;
      }
      // Never invent materials
      if (r.materials?.length) {
        const hard = r.materials.every(
          (m) =>
            String(m.materialKey).trim()
            && String(m.unit).trim()
            && Number.isFinite(m.qtyFactor)
            && String(m.provenanceRef).trim(),
        );
        if (!hard) {
          r.materials = null;
          r.bomComplete = false;
        }
      } else {
        r.bomComplete = false;
      }
      records.push(r);
    }
  }

  return {
    records,
    sourcesTried,
    sourcesAccepted,
    sourcesRejected,
    rejectReasons: [...new Set(rejectReasons)],
  };
}
