/**
 * NG-02.1B — SSOT orchestrator discovery (BZP + external + monitory).
 * Pure: zwraca patch + metadata; bez toastów / UI / zapisów komponentów.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { fetchTenderDocuments, fetchTenderNoticeDetails } from "@/lib/tenders-bzp";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { processTenderChangeMonitorUpdate } from "@/lib/tender-change-monitor";
import { processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";
import { discoverExternalTenderDocs } from "@/lib/tender-external-docs";
import { buildExternalDiscoveryResult } from "@/lib/tender-external-discovery-apply";
import {
  canRunDocumentDiscovery,
  type DocumentDiscoveryFetchInput,
  type DocumentDiscoveryResult,
  isDocumentDiscoverySettled,
  runTenderDocumentDiscovery,
} from "@/lib/tender-document-discovery";
import { recordDiscoverySnapshot } from "@/lib/tender-pipeline/tender-pipeline-discovery-snapshot";

export type TenderDiscoveryMode = "auto" | "manual" | "rescan";

type FetchDocumentsFn = (input: DocumentDiscoveryFetchInput) => Promise<DocumentDiscoveryResult["docs"]>;

export type TenderFullDiscoveryDeps = {
  fetchTenderNoticeDetails: typeof fetchTenderNoticeDetails;
  fetchTenderDocuments: typeof fetchTenderDocuments;
  discoverExternalTenderDocs: typeof discoverExternalTenderDocs;
};

export type TenderFullDiscoveryOpts = {
  mode: TenderDiscoveryMode;
  /** auto: pobierz notice HTML gdy brak */
  prefetchNotice?: boolean;
  /** auto/manual: external gdy BZP puste */
  includeExternal?: boolean;
  /** manual external-only: pomiń krok BZP */
  skipBzp?: boolean;
  isCancelled?: () => boolean;
  deps?: Partial<TenderFullDiscoveryDeps>;
};

export type TenderFullDiscoveryMeta = {
  mode: TenderDiscoveryMode;
  bzpRan: boolean;
  bzpForce: boolean;
  bzpSkipped: boolean;
  externalRan: boolean;
  noticePrefetched: boolean;
  bzpDocCount: number;
  externalFileCount: number;
  changeEventCount: number;
  qaEventCount: number;
  externalNewEventCount: number;
};

export type TenderFullDiscoveryResult = {
  patch: Partial<TenderPipelineItem>;
  mergedItem: TenderPipelineItem;
  meta: TenderFullDiscoveryMeta;
  ok: boolean;
};

const defaultDeps: TenderFullDiscoveryDeps = {
  fetchTenderNoticeDetails,
  fetchTenderDocuments,
  discoverExternalTenderDocs,
};

/** Settled empty + 0 załączników łącznie → auto ponawia BZP fetch. */
export function shouldRetryEmptyDiscovery(item: TenderPipelineItem): boolean {
  if (countTenderAttachments(item) > 0) return false;
  if (!item.documentsFetchedAt) return false;
  if (!isDocumentDiscoverySettled(item)) return false;
  return canRunDocumentDiscovery(item);
}

export function isExternalDiscoverySettled(
  item: Pick<TenderPipelineItem, "externalDocDiscovery">,
): boolean {
  return Boolean(item.externalDocDiscovery?.builtAt);
}

/** Jedna tabela decyzji force dla BZP discovery. */
export function resolveDiscoveryForcePolicy(
  item: TenderPipelineItem,
  mode: TenderDiscoveryMode,
): boolean {
  if (mode === "manual" || mode === "rescan") return true;
  if (!isDocumentDiscoverySettled(item)) return true;
  if (shouldRetryEmptyDiscovery(item)) return true;
  const noticeAt = item.noticeHtmlFetchedAt ? Date.parse(item.noticeHtmlFetchedAt) : NaN;
  const fetchedAt = item.documentsFetchedAt ? Date.parse(item.documentsFetchedAt) : NaN;
  if (Number.isFinite(noticeAt) && Number.isFinite(fetchedAt) && noticeAt > fetchedAt) {
    return true;
  }
  return false;
}

export function shouldRunExternalDiscovery(
  item: TenderPipelineItem,
  mode: TenderDiscoveryMode,
  opts: { includeExternal?: boolean; bzpDocCount: number; noticeHtml?: string | null },
): boolean {
  if (!opts.includeExternal) return false;
  if (!item.tenderId?.trim()) return false;
  const html = (opts.noticeHtml ?? item.noticeHtml ?? "").trim();
  if (!html) return false;
  if (mode === "manual") return true;
  if (opts.bzpDocCount > 0) return false;
  if (isExternalDiscoverySettled(item)) return false;
  return true;
}

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

function mergePatch(
  target: Partial<TenderPipelineItem>,
  source: Partial<TenderPipelineItem>,
): void {
  Object.assign(target, source);
}

/**
 * Jedyny SSOT entry point discovery — bootstrap · manual · rescan.
 */
export async function runTenderFullDocumentDiscovery(
  item: TenderPipelineItem,
  opts: TenderFullDiscoveryOpts,
): Promise<TenderFullDiscoveryResult> {
  const {
    mode,
    prefetchNotice = mode === "auto",
    includeExternal = mode === "auto",
    skipBzp = false,
    isCancelled = () => false,
    deps: depsOverride,
  } = opts;
  const deps = { ...defaultDeps, ...depsOverride };

  const patch: Partial<TenderPipelineItem> = {};
  const meta: TenderFullDiscoveryMeta = {
    mode,
    bzpRan: false,
    bzpForce: false,
    bzpSkipped: skipBzp,
    externalRan: false,
    noticePrefetched: false,
    bzpDocCount: item.bzpDocuments?.length ?? 0,
    externalFileCount: 0,
    changeEventCount: 0,
    qaEventCount: 0,
    externalNewEventCount: 0,
  };

  let html: string | null | undefined = item.noticeHtml ?? null;

  if (prefetchNotice && item.noticeNumber && !html && !isCancelled()) {
    const det = await deps.fetchTenderNoticeDetails(item.noticeNumber);
    if (!isCancelled()) {
      patch.tenderState = det.tenderState;
      patch.noticeHtml = det.htmlBody;
      patch.noticeHtmlFetchedAt = new Date().toISOString();
      html = det.htmlBody;
      meta.noticePrefetched = true;
    }
  }

  let merged: TenderPipelineItem = { ...item, ...patch };
  let docs = merged.bzpDocuments ?? [];

  if (!skipBzp && merged.tenderId && !isCancelled()) {
    const force = resolveDiscoveryForcePolicy(merged, mode);
    meta.bzpForce = force;
    const discovery = await runTenderDocumentDiscovery(merged, {
      force,
      fetchDocuments: (input) => deps.fetchTenderDocuments(input),
    });
    if (!isCancelled() && discovery.ran) {
      meta.bzpRan = true;
      mergePatch(patch, discovery.patch);
      docs = discovery.docs;
      merged = { ...item, ...patch };
      const monitors = applyDiscoveryMonitors(merged, docs);
      mergePatch(patch, monitors.patch);
      meta.changeEventCount = monitors.changeEventCount;
      meta.qaEventCount = monitors.qaEventCount;
      merged = { ...item, ...patch };
    }
  }

  meta.bzpDocCount = docs.length;

  if (
    !isCancelled()
    && shouldRunExternalDiscovery(merged, mode, {
      includeExternal,
      bzpDocCount: docs.length,
      noticeHtml: html,
    })
  ) {
    meta.externalRan = true;
    try {
      const discovery = await deps.discoverExternalTenderDocs({
        tenderId: merged.tenderId!,
        noticeHtml: html ?? merged.noticeHtml,
        organizationName: merged.organizationName,
        priorityBuyerId: merged.priorityBuyerId,
        title: merged.title,
        bzpNumber: merged.bzpNumber,
      });
      if (!isCancelled()) {
        meta.externalFileCount = discovery.files.length;
        if (discovery.files.length > 0) {
          const mergedBase = { ...item, ...patch };
          const { patch: extPatch, newEventCount } = await buildExternalDiscoveryResult(
            mergedBase,
            discovery,
          );
          mergePatch(patch, extPatch);
          meta.externalNewEventCount = newEventCount;
          merged = { ...item, ...patch };
        } else {
          patch.externalDocDiscovery = discovery;
          merged = { ...item, ...patch };
        }
      }
    } catch (e) {
      if (mode === "manual") throw e;
      /* auto/rescan external best-effort */
    }
  }

  recordDiscoverySnapshot(item.id, meta);

  return {
    patch,
    mergedItem: merged,
    meta,
    ok: !isCancelled(),
  };
}
