/**
 * MARKET-SYNC-01 P1 — jedyny tor Publish → commitMarketQuotesImport.
 * Kill Switch w lib tuż przed commit (AR binding) · atomowość capture wewnątrz commit.
 */

import { markQuotesPublished } from "@/lib/market-sync/accept";
import {
  buildMarketSyncDeltaPreview,
  filterDryRunToPublishScope,
  type DeltaPreviewReport,
} from "@/lib/market-sync/delta";
import { buildMarketSyncDryRunPreview } from "@/lib/market-sync/dry-run";
import { guardQuotesForPublish, type GuardBatchResult } from "@/lib/market-sync/guard";
import { isMarketSyncPublishEnabled } from "@/lib/market-sync/kill-switch";
import { buildMarketSyncPublishSummary, type MarketSyncPublishSummary } from "@/lib/market-sync/publish-summary";
import type { MarketSyncStagingStore } from "@/lib/market-sync/types";
import {
  commitMarketQuotesImport,
  type CommitMarketQuotesDeps,
  type CommitMarketQuotesOptions,
  type CommitMarketQuotesReport,
} from "@/lib/work-catalog/commit-market-quotes";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import {
  captureMarketQuotesSnapshot,
  type MarketQuotesRollbackSnapshot,
} from "@/lib/work-catalog/rollback-market-quotes";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";

export type MarketSyncPublishStatus =
  | "committed"
  | "noop"
  | "blocked"
  | "rolled-back"
  | "kill_switch_off"
  | "guard_failed"
  | "dry_run_failed"
  | "summary_blocked"
  | "empty_scope";

export interface PrepareMarketSyncPublishResult {
  status: "ready" | "blocked";
  reason?: string;
  staging: MarketSyncStagingStore;
  guard: GuardBatchResult;
  dryRun: MarketCsvPreviewReport;
  delta: DeltaPreviewReport;
  scopedPreview: MarketCsvPreviewReport;
  summary: MarketSyncPublishSummary;
  quoteIds: string[];
}

export interface RunMarketSyncPublishResult {
  status: MarketSyncPublishStatus;
  reason?: string;
  staging: MarketSyncStagingStore;
  commit: CommitMarketQuotesReport | null;
  summary: MarketSyncPublishSummary | null;
  /** Token Undo (R2) — capture PRZED commit; null gdy brak zapisu. */
  undoSnapshot: MarketQuotesRollbackSnapshot | null;
  publishedQuoteIds: string[];
  /** Preview użyty w commit (do testu idempotencji). */
  commitPreview: MarketCsvPreviewReport | null;
}

export interface PrepareMarketSyncPublishOptions {
  quoteIds: readonly string[];
  catalog: WorkCatalogStore;
  region?: WgdomCostRegion;
  publishedAtIso?: string;
}

export interface RunMarketSyncPublishOptions extends PrepareMarketSyncPublishOptions {
  /** Wymaga Confirm — caller musi mieć Summary.canConfirmPublish. */
  confirmed: boolean;
  commitOptions?: CommitMarketQuotesOptions;
  /** Opcjonalny load dla capture Undo (domyślnie catalog z options). */
  catalogForCapture?: WorkCatalogStore;
}

/**
 * Kroki: Guard → Dry Run → Delta → Scope → Summary (bez commit).
 */
export function prepareMarketSyncPublish(
  staging: MarketSyncStagingStore,
  options: PrepareMarketSyncPublishOptions,
): PrepareMarketSyncPublishResult {
  const region = (options.region ?? options.catalog.activeRegion) as WgdomCostRegion & MarketRegionCode;
  const guard = guardQuotesForPublish(staging, options.quoteIds, { requireKillSwitch: true });
  const dry = buildMarketSyncDryRunPreview(staging, {
    region,
    quoteIds: guard.eligibleQuoteIds.length > 0 ? guard.eligibleQuoteIds : options.quoteIds,
    publishedAtIso: options.publishedAtIso,
  });
  const delta = buildMarketSyncDeltaPreview(options.catalog, dry.preview, region);
  const scopedPreview = filterDryRunToPublishScope(dry.preview, delta);
  const summary = buildMarketSyncPublishSummary({
    store: staging,
    guard,
    dryRun: dry.preview,
    delta,
    scopedPreview,
  });

  if (!isMarketSyncPublishEnabled()) {
    return {
      status: "blocked",
      reason: "kill_switch_off",
      staging,
      guard,
      dryRun: dry.preview,
      delta,
      scopedPreview,
      summary: { ...summary, canConfirmPublish: false, killSwitchEnabled: false },
      quoteIds: [...options.quoteIds],
    };
  }

  if (guard.eligibleQuoteIds.length === 0) {
    return {
      status: "blocked",
      reason: "guard_failed",
      staging,
      guard,
      dryRun: dry.preview,
      delta,
      scopedPreview,
      summary: { ...summary, canConfirmPublish: false },
      quoteIds: [...options.quoteIds],
    };
  }

  if (!dry.ok) {
    return {
      status: "blocked",
      reason: "dry_run_failed",
      staging,
      guard,
      dryRun: dry.preview,
      delta,
      scopedPreview,
      summary: { ...summary, canConfirmPublish: false },
      quoteIds: [...options.quoteIds],
    };
  }

  if (scopedPreview.matched.length === 0) {
    return {
      status: "blocked",
      reason: "empty_scope",
      staging,
      guard,
      dryRun: dry.preview,
      delta,
      scopedPreview,
      summary: { ...summary, canConfirmPublish: false },
      quoteIds: [...options.quoteIds],
    };
  }

  return {
    status: summary.canConfirmPublish ? "ready" : "blocked",
    reason: summary.canConfirmPublish ? undefined : "summary_blocked",
    staging,
    guard,
    dryRun: dry.preview,
    delta,
    scopedPreview,
    summary,
    quoteIds: guard.eligibleQuoteIds,
  };
}

/**
 * Jedyny punkt wejścia Market Sync → Product Quotes.
 * Fail-closed Kill Switch w lib natychmiast przed commitMarketQuotesImport.
 */
export async function runMarketSyncPublish(
  staging: MarketSyncStagingStore,
  options: RunMarketSyncPublishOptions,
): Promise<RunMarketSyncPublishResult> {
  const prepared = prepareMarketSyncPublish(staging, options);

  if (!options.confirmed) {
    return {
      status: "summary_blocked",
      reason: "not-confirmed",
      staging,
      commit: null,
      summary: prepared.summary,
      undoSnapshot: null,
      publishedQuoteIds: [],
      commitPreview: null,
    };
  }

  // AR: Kill Switch w lib tuż przed commit — nie tylko UI.
  if (!isMarketSyncPublishEnabled()) {
    return {
      status: "kill_switch_off",
      reason: "MARKET_SYNC_PUBLISH_ENABLED=false",
      staging,
      commit: null,
      summary: prepared.summary,
      undoSnapshot: null,
      publishedQuoteIds: [],
      commitPreview: null,
    };
  }

  if (prepared.status !== "ready") {
    return {
      status: (prepared.reason as MarketSyncPublishStatus) ?? "blocked",
      reason: prepared.reason,
      staging,
      commit: null,
      summary: prepared.summary,
      undoSnapshot: null,
      publishedQuoteIds: [],
      commitPreview: null,
    };
  }

  const catalogForCapture = options.catalogForCapture ?? options.catalog;
  const undoSnapshot = captureMarketQuotesSnapshot(catalogForCapture);
  const region = (options.region ?? options.catalog.activeRegion) as WgdomCostRegion;

  const commit = await commitMarketQuotesImport(prepared.scopedPreview, {
    ...options.commitOptions,
    region,
  });

  if (commit.status === "committed") {
    const nextStaging = markQuotesPublished(staging, prepared.quoteIds);
    return {
      status: "committed",
      staging: nextStaging,
      commit,
      summary: prepared.summary,
      undoSnapshot,
      publishedQuoteIds: prepared.quoteIds,
      commitPreview: prepared.scopedPreview,
    };
  }

  if (commit.status === "noop") {
    // Idempotencja: Quotes bez zmian — staging może już być published.
    return {
      status: "noop",
      reason: commit.reason,
      staging,
      commit,
      summary: prepared.summary,
      undoSnapshot: null,
      publishedQuoteIds: [],
      commitPreview: prepared.scopedPreview,
    };
  }

  return {
    status: commit.status === "rolled-back" ? "rolled-back" : "blocked",
    reason: commit.reason,
    staging,
    commit,
    summary: prepared.summary,
    undoSnapshot: null,
    publishedQuoteIds: [],
    commitPreview: prepared.scopedPreview,
  };
}

/** Test / OV helper — czy Market Sync nie woła apply bezpośrednio. */
export function marketSyncPublishUsesCommitOnly(): true {
  return true;
}

export type { CommitMarketQuotesDeps };
