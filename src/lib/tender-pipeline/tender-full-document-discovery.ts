/**
 * NG-02.1B — SSOT orchestrator discovery (BZP + external + monitory).
 * Pure: zwraca patch + metadata; bez toastów / UI / zapisów komponentów.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { fetchTenderDocuments, fetchTenderNoticeDetails } from "@/lib/tenders-bzp";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { discoverExternalTenderDocs } from "@/lib/tender-external-docs";
import { buildExternalDiscoveryResult } from "@/lib/tender-external-discovery-apply";
import {
  canRunDocumentDiscovery,
  isDocumentDiscoverySettled,
} from "@/lib/tender-document-discovery";
import {
  applyDiscoveryMonitors,
  discoverTenderDocumentsSSOT,
  type DiscoverTenderDocumentsSsotResult,
} from "@/lib/tender-document-discovery-ssot";
import { recordDiscoverySnapshot } from "@/lib/tender-pipeline/tender-pipeline-discovery-snapshot";
import {
  runDiscoveryForkJoin,
  shouldStartDiscoveryFork,
} from "@/lib/tender-pipeline/tender-discovery-fork";
import { withPipelineTimingStage } from "@/lib/tender-pipeline/tender-pipeline-timing";

export type TenderDiscoveryMode = "auto" | "manual" | "rescan";

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
  forkStarted: boolean;
  forkCancelled: boolean;
  forkWon: boolean;
  forkTimedOut: boolean;
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

export { applyDiscoveryMonitors } from "@/lib/tender-document-discovery-ssot";

function mergePatch(
  target: Partial<TenderPipelineItem>,
  source: Partial<TenderPipelineItem>,
): void {
  Object.assign(target, source);
}

function applyBzpSsotToRun(
  item: TenderPipelineItem,
  patch: Partial<TenderPipelineItem>,
  meta: TenderFullDiscoveryMeta,
  ssot: DiscoverTenderDocumentsSsotResult,
): { merged: TenderPipelineItem; docs: NonNullable<TenderPipelineItem["bzpDocuments"]> } {
  if (!ssot.meta.fetchExecuted) {
    const merged = { ...item, ...patch };
    return { merged, docs: merged.bzpDocuments ?? [] };
  }
  meta.bzpRan = true;
  meta.bzpForce = ssot.meta.force;
  mergePatch(patch, ssot.patch);
  meta.changeEventCount = ssot.changeEventCount;
  meta.qaEventCount = ssot.qaEventCount;
  return {
    merged: ssot.mergedItem,
    docs: ssot.mergedItem.bzpDocuments ?? [],
  };
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
    forkStarted: false,
    forkCancelled: false,
    forkWon: false,
    forkTimedOut: false,
  };

  let html: string | null | undefined = item.noticeHtml ?? null;

  if (prefetchNotice && item.noticeNumber && !html && !isCancelled()) {
    await withPipelineTimingStage(item.id, "discovery.notice", async () => {
      const det = await deps.fetchTenderNoticeDetails(item.noticeNumber!);
      if (!isCancelled()) {
        patch.tenderState = det.tenderState;
        patch.noticeHtml = det.htmlBody;
        patch.noticeHtmlFetchedAt = new Date().toISOString();
        html = det.htmlBody;
        meta.noticePrefetched = true;
      }
    });
  }

  let merged: TenderPipelineItem = { ...item, ...patch };
  let docs = merged.bzpDocuments ?? [];
  let forkHandledExternal = false;

  const applyExternalDiscovery = async (
    discovery: Awaited<ReturnType<TenderFullDiscoveryDeps["discoverExternalTenderDocs"]>>,
  ): Promise<void> => {
    if (isCancelled()) return;
    meta.externalRan = true;
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
  };

  if (!skipBzp && merged.tenderId && !isCancelled()) {
    const force = resolveDiscoveryForcePolicy(merged, mode);
    meta.bzpForce = force;
    const useFork = shouldStartDiscoveryFork(merged, {
      mode,
      includeExternal,
      skipBzp,
      noticeHtml: html,
    });

    if (useFork) {
      const join = await runDiscoveryForkJoin({
        isCancelled,
        runBzp: async () => withPipelineTimingStage(item.id, "discovery.bzp", async () => {
          return discoverTenderDocumentsSSOT(merged, {
            force,
            fetchDocuments: (input) => deps.fetchTenderDocuments(input),
            noticeFetched: meta.noticePrefetched,
          });
        }),
        runExternal: async () => withPipelineTimingStage(item.id, "discovery.external", async () => {
          return deps.discoverExternalTenderDocs({
            tenderId: merged.tenderId!,
            noticeHtml: html ?? merged.noticeHtml,
            organizationName: merged.organizationName,
            priorityBuyerId: merged.priorityBuyerId,
            title: merged.title,
            bzpNumber: merged.bzpNumber,
          });
        }),
        getBzpDocCount: (ssot) => (ssot.meta.fetchExecuted ? ssot.meta.documentsFound : docs.length),
      });

      meta.forkStarted = join.meta.forkStarted;
      meta.forkCancelled = join.meta.forkCancelled;
      meta.forkWon = join.meta.forkWon;
      meta.forkTimedOut = join.meta.forkTimedOut;
      if (join.meta.forkCancelled) {
        meta.externalCancelled = true;
      }

      const ssot = join.bzp;
      if (!isCancelled() && ssot.meta.fetchExecuted) {
        const applied = applyBzpSsotToRun(item, patch, meta, ssot);
        docs = applied.docs;
        merged = applied.merged;
      }

      meta.bzpDocCount = docs.length;

      if (
        !isCancelled()
        && join.external != null
        && !join.meta.forkCancelled
        && shouldRunExternalDiscovery(merged, mode, {
          includeExternal,
          bzpDocCount: docs.length,
          noticeHtml: html,
        })
      ) {
        forkHandledExternal = true;
        meta.externalExecuted = true;
        try {
          await applyExternalDiscovery(join.external);
        } catch (e) {
          if (mode === "manual") throw e;
        }
      }
    } else {
      const ssot = await withPipelineTimingStage(item.id, "discovery.bzp", async () => {
        return discoverTenderDocumentsSSOT(merged, {
          force,
          fetchDocuments: (input) => deps.fetchTenderDocuments(input),
          noticeFetched: meta.noticePrefetched,
        });
      });
      if (!isCancelled() && ssot.meta.fetchExecuted) {
        const applied = applyBzpSsotToRun(item, patch, meta, ssot);
        docs = applied.docs;
        merged = applied.merged;
      }
    }
  }

  meta.bzpDocCount = docs.length;

  if (
    !forkHandledExternal
    && !isCancelled()
    && shouldRunExternalDiscovery(merged, mode, {
      includeExternal,
      bzpDocCount: docs.length,
      noticeHtml: html,
    })
  ) {
    try {
      await withPipelineTimingStage(item.id, "discovery.external", async () => {
        const discovery = await deps.discoverExternalTenderDocs({
          tenderId: merged.tenderId!,
          noticeHtml: html ?? merged.noticeHtml,
          organizationName: merged.organizationName,
          priorityBuyerId: merged.priorityBuyerId,
          title: merged.title,
          bzpNumber: merged.bzpNumber,
        });
        meta.externalExecuted = true;
        await applyExternalDiscovery(discovery);
      });
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
