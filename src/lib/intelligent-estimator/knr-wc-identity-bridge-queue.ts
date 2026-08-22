/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2 UI — queue helpers (thin seam).
 *
 * extractKnrWcBridgeKeysFromKnrExpert — CANDIDATE lines only · dedup P1-style.
 * runKnrWcIdentityProposalQueueBatch — delegates to buildKnrWcIdentityProposalsWithCache.
 * ZERO WC/A1/mapping/pricing write · ZERO HTTP.
 */

import type { IkKnrExpertReport } from "./ik-knr-expert";
import {
  buildKnrWcIdentityProposalsWithCache,
  type BuildKnrWcIdentityProposalsWithCacheInput,
} from "./knr-wc-identity-bridge-cache";
import { isKnrWcIdentityBridgeP2UiRuntimeEnabled } from "./knr-wc-identity-bridge-feature";
import type {
  KnrWcBridgeKeyInput,
  KnrWcIdentityProposalBatchMetrics,
  KnrWcIdentityProposalCachedBatch,
  KnrWcIdentityProposalCacheMetrics,
  KnrWcLineRef,
} from "./knr-wc-identity-bridge-types";
import { buildKnrWcIdentityProposals } from "./knr-wc-identity-bridge";

export type ExtractKnrWcBridgeKeysFromKnrExpertOptions = {
  /** Optional lineId → unit from Master BOQ (document expert). */
  unitByLineId?: Readonly<Record<string, string>>;
  /** Optional lineId → description from Master BOQ (document expert). */
  descriptionByLineId?: Readonly<Record<string, string>>;
};

function pickDescriptionFromLineRefs(
  lineRefs: readonly KnrWcLineRef[] | undefined,
  descriptionByLineId: Readonly<Record<string, string>>,
): string | null {
  for (const ref of lineRefs ?? []) {
    const desc = String(descriptionByLineId[ref.lineId] ?? "").trim();
    if (desc) return desc;
  }
  return null;
}

/** P3.1 — tender BOQ description only; does not touch identity fields. */
function applyTenderBoqDescriptionsToKey(
  key: KnrWcBridgeKeyInput,
  descriptionByLineId: Readonly<Record<string, string>>,
): void {
  if (key.officialNamePl?.trim() && key.descriptionPl?.trim()) return;
  const desc = pickDescriptionFromLineRefs(key.lineRefs, descriptionByLineId);
  if (!desc) return;
  if (!key.descriptionPl?.trim()) key.descriptionPl = desc;
  if (!key.officialNamePl?.trim()) key.officialNamePl = desc.slice(0, 200);
}

function emptyCachedBatch(
  tenderId: string,
  inputKeys: number,
): KnrWcIdentityProposalCachedBatch {
  const empty = buildKnrWcIdentityProposals({
    tenderId,
    keys: [],
    featureEnabled: false,
  });
  const cacheMetrics: KnrWcIdentityProposalCacheMetrics = {
    inputKeys,
    uniqueKeys: 0,
    cacheHits: 0,
    cacheMisses: 0,
    proposalsBuilt: 0,
    proposalsReused: 0,
    discoveryCalls: 0,
    catalogLookups: 0,
    remoteStoreLoads: 0,
    supabaseQueries: 0,
    httpCalls: 0,
    catalogWorkWritten: 0,
    a1Written: 0,
    mappingWritten: 0,
    pricingWritten: 0,
    scraping: 0,
  };
  return { ...empty, cacheMetrics };
}

/**
 * Extract deduped bridge keys from KNR Expert CANDIDATE lines.
 * Reuses catalogBasis.normalizedKey — no second KNR parser.
 */
export function extractKnrWcBridgeKeysFromKnrExpert(
  report: IkKnrExpertReport,
  options: ExtractKnrWcBridgeKeysFromKnrExpertOptions = {},
): KnrWcBridgeKeyInput[] {
  const unitByLineId = options.unitByLineId ?? {};
  const descriptionByLineId = options.descriptionByLineId ?? {};
  const seen = new Set<string>();
  const byKey = new Map<string, KnrWcBridgeKeyInput>();

  for (const line of report.lines ?? []) {
    if (line.lineStatus !== "CANDIDATE") continue;
    const basis = line.catalogBasis;
    const nk = String(basis?.normalizedKey ?? "").trim();
    if (!nk) continue;

    const lineRef: KnrWcLineRef = {
      dwellingId: line.dwellingId,
      lineId: line.lineId,
      lp: line.lp ?? null,
    };
    const unitRaw = String(unitByLineId[line.lineId] ?? "").trim();

    if (seen.has(nk)) {
      const existing = byKey.get(nk);
      if (existing) {
        const refs = [...(existing.lineRefs ?? []), lineRef];
        existing.lineRefs = refs;
        if (!existing.unitRaw && unitRaw) existing.unitRaw = unitRaw;
        applyTenderBoqDescriptionsToKey(existing, descriptionByLineId);
      }
      continue;
    }
    seen.add(nk);

    const key: KnrWcBridgeKeyInput = {
      normalizedKey: nk,
      family: basis?.family ?? null,
      catalogId: basis?.catalogId ?? null,
      tableCode: basis?.tableCode ?? null,
      displayCode: basis?.display ?? basis?.rawCode ?? null,
      rawCode: basis?.rawCode ?? null,
      unitRaw: unitRaw || null,
      officialNamePl: null,
      descriptionPl: null,
      lineRefs: [lineRef],
    };
    applyTenderBoqDescriptionsToKey(key, descriptionByLineId);
    byKey.set(nk, key);
  }

  return [...byKey.values()].sort((a, b) =>
    a.normalizedKey < b.normalizedKey ? -1 : a.normalizedKey > b.normalizedKey ? 1 : 0,
  );
}

export type RunKnrWcIdentityProposalQueueBatchInput =
  BuildKnrWcIdentityProposalsWithCacheInput & {
    ikEntryEnabled?: boolean;
    p2UiEnabled?: boolean | null;
  };

/**
 * Thin wrapper — single batch call to proposal cache orchestrator.
 * Returns empty batch when P2 UI runtime gate is OFF.
 */
export function runKnrWcIdentityProposalQueueBatch(
  input: RunKnrWcIdentityProposalQueueBatchInput,
): KnrWcIdentityProposalCachedBatch {
  const tenderId = String(input.tenderId || "").trim() || "unknown-tender";
  const inputKeys = input.keys?.length ?? 0;

  const runtimeOk = isKnrWcIdentityBridgeP2UiRuntimeEnabled({
    ikEntryEnabled: input.ikEntryEnabled,
    p1Enabled: input.featureEnabled,
    p21Enabled: input.persistEnabled,
    p22Enabled: input.p22HardeningEnabled,
    p2UiEnabled: input.p2UiEnabled,
  });

  if (!runtimeOk) {
    return emptyCachedBatch(tenderId, inputKeys);
  }

  return buildKnrWcIdentityProposalsWithCache({
    ...input,
    featureEnabled: true,
    persistEnabled: true,
    p22HardeningEnabled: true,
  });
}

export function buildUnitByLineIdFromDocumentExpertLines(
  lines: ReadonlyArray<{ lineId: string; unit?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines) {
    const unit = String(line.unit ?? "").trim();
    if (unit) out[line.lineId] = unit;
  }
  return out;
}

/** Master BOQ line.description (OfferBoqLine) → lineId lookup for P3.1 name enrichment. */
export function buildDescriptionByLineIdFromDocumentExpertLines(
  lines: ReadonlyArray<{ lineId: string; description?: string | null }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines) {
    const description = String(line.description ?? "").trim();
    if (description) out[line.lineId] = description;
  }
  return out;
}

export type { KnrWcIdentityProposalBatchMetrics };
