/**
 * NG11-P0 — SSOT BZP document discovery (fetch + monitors).
 * Manual · Bootstrap · Autonomous · Rescan share this core.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { fetchTenderDocuments } from "@/lib/tenders-bzp";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";
import {
  buildDocumentDiscoveryFetchInput,
  isDocumentDiscoverySettled,
  runTenderDocumentDiscovery,
  type DocumentDiscoveryFetchInput,
} from "@/lib/tender-document-discovery";

export function applyDiscoveryMonitors(
  item: TenderPipelineItem,
  documents: TenderPipelineItem["bzpDocuments"],
): {
  patch: Partial<TenderPipelineItem>;
  changeEventCount: number;
  qaEventCount: number;
} {
  const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(
    item,
    { documents: documents ?? [] },
  );
  const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(
    item,
    { documents: documents ?? [] },
  );
  return {
    patch: { changeMonitor, qaMonitor },
    changeEventCount: newEvents.length,
    qaEventCount: newQaEvents.length,
  };
}

export type DiscoverTenderDocumentsSkipReason =
  | "settled"
  | "no_anchor"
  | null;

export interface DiscoverTenderDocumentsSsotMeta {
  fetchExecuted: boolean;
  fetchSkipped: boolean;
  skipReason: DiscoverTenderDocumentsSkipReason;
  force: boolean;
  settled: boolean;
  noticeFetched: boolean;
  documentsFound: number;
  externalExecuted: boolean;
  externalCancelled: boolean;
  persistExecuted: boolean;
}

export interface DiscoverTenderDocumentsSsotResult {
  ok: boolean;
  patch: Partial<TenderPipelineItem>;
  mergedItem: TenderPipelineItem;
  meta: DiscoverTenderDocumentsSsotMeta;
  changeEventCount: number;
  qaEventCount: number;
}

type FetchDocumentsFn = (input: DocumentDiscoveryFetchInput) => Promise<TenderPipelineItem["bzpDocuments"]>;

function emptyMeta(force: boolean, settled: boolean): DiscoverTenderDocumentsSsotMeta {
  return {
    fetchExecuted: false,
    fetchSkipped: true,
    skipReason: null,
    force,
    settled,
    noticeFetched: false,
    documentsFound: 0,
    externalExecuted: false,
    externalCancelled: false,
    persistExecuted: false,
  };
}

/**
 * Jedyny core fetch BZP + monitory — bez prefetch, external, fork, persist.
 */
export async function discoverTenderDocumentsSSOT(
  item: TenderPipelineItem,
  opts: {
    force: boolean;
    fetchDocuments?: FetchDocumentsFn;
    noticeFetched?: boolean;
  },
): Promise<DiscoverTenderDocumentsSsotResult> {
  const force = opts.force;
  const settled = isDocumentDiscoverySettled(item);
  const fetchDocuments = opts.fetchDocuments ?? fetchTenderDocuments;

  if (!item.tenderId?.trim()) {
    return {
      ok: false,
      patch: {},
      mergedItem: item,
      meta: { ...emptyMeta(force, settled), skipReason: "no_anchor" },
      changeEventCount: 0,
      qaEventCount: 0,
    };
  }

  if (!force && settled) {
    return {
      ok: true,
      patch: {},
      mergedItem: item,
      meta: {
        ...emptyMeta(force, settled),
        skipReason: "settled",
        documentsFound: item.bzpDocuments?.length ?? 0,
        noticeFetched: opts.noticeFetched ?? false,
      },
      changeEventCount: 0,
      qaEventCount: 0,
    };
  }

  const input = buildDocumentDiscoveryFetchInput(item);
  if (!input) {
    return {
      ok: false,
      patch: {},
      mergedItem: item,
      meta: { ...emptyMeta(force, settled), skipReason: "no_anchor" },
      changeEventCount: 0,
      qaEventCount: 0,
    };
  }

  const discovery = await runTenderDocumentDiscovery(item, {
    force,
    fetchDocuments,
  });

  if (!discovery.ran) {
    const skipReason: DiscoverTenderDocumentsSkipReason =
      !force && settled ? "settled" : !input ? "no_anchor" : "settled";
    return {
      ok: true,
      patch: {},
      mergedItem: item,
      meta: {
        fetchExecuted: false,
        fetchSkipped: true,
        skipReason,
        force,
        settled,
        noticeFetched: opts.noticeFetched ?? false,
        documentsFound: item.bzpDocuments?.length ?? 0,
        externalExecuted: false,
        externalCancelled: false,
        persistExecuted: false,
      },
      changeEventCount: 0,
      qaEventCount: 0,
    };
  }

  const patch: Partial<TenderPipelineItem> = { ...discovery.patch };
  let merged: TenderPipelineItem = { ...item, ...patch };
  const monitors = applyDiscoveryMonitors(merged, discovery.docs);
  Object.assign(patch, monitors.patch);
  merged = { ...item, ...patch };

  const documentsFound = discovery.docs.length;

  return {
    ok: true,
    patch,
    mergedItem: merged,
    meta: {
      fetchExecuted: true,
      fetchSkipped: false,
      skipReason: null,
      force,
      settled,
      noticeFetched: opts.noticeFetched ?? false,
      documentsFound,
      externalExecuted: false,
      externalCancelled: false,
      persistExecuted: false,
    },
    changeEventCount: monitors.changeEventCount,
    qaEventCount: monitors.qaEventCount,
  };
}

/** Manual „Odśwież BZP” — force=true, identyczny core SSOT. */
export async function runManualBzpDocumentDiscovery(
  item: TenderPipelineItem,
  opts?: {
    fetchDocuments?: FetchDocumentsFn;
    onPersist?: (patch: Partial<TenderPipelineItem>) => void | Promise<void>;
  },
): Promise<DiscoverTenderDocumentsSsotResult> {
  const result = await discoverTenderDocumentsSSOT(item, {
    force: true,
    fetchDocuments: opts?.fetchDocuments,
  });
  if (opts?.onPersist && Object.keys(result.patch).length > 0) {
    await opts.onPersist(result.patch);
    result.meta.persistExecuted = true;
  }
  return result;
}

/** Porównanie kompletu dokumentów BZP (test / QA). */
export function bzpDocumentSetFingerprint(
  docs: TenderPipelineItem["bzpDocuments"] | undefined,
): string {
  const list = docs ?? [];
  return list
    .map((d) => `${d.index}:${d.documentId ?? ""}:${d.filename}:${d.downloadUrl ?? ""}`)
    .sort()
    .join("|");
}
