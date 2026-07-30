/**
 * MARKET-SYNC-01 P1 — Publish Summary (obowiązkowy przed Confirm).
 */

import type { DeltaPreviewReport } from "@/lib/market-sync/delta";
import type { GuardBatchResult } from "@/lib/market-sync/guard";
import { isMarketSyncPublishEnabled } from "@/lib/market-sync/kill-switch";
import type { MarketSyncStagingStore } from "@/lib/market-sync/types";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";

export interface MarketSyncPublishSummary {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  rejectedCount: number;
  conflictCount: number;
  providers: { leroy: number; castorama: number };
  killSwitchEnabled: boolean;
  eligibleCount: number;
  canConfirmPublish: boolean;
}

export function buildMarketSyncPublishSummary(input: {
  store: MarketSyncStagingStore;
  guard: GuardBatchResult;
  dryRun: MarketCsvPreviewReport;
  delta: DeltaPreviewReport;
  scopedPreview: MarketCsvPreviewReport;
}): MarketSyncPublishSummary {
  const providers = { leroy: 0, castorama: 0 };
  for (const row of input.scopedPreview.matched) {
    if (row.origin === "leroy") providers.leroy += 1;
    if (row.origin === "castorama") providers.castorama += 1;
  }

  const conflictCount = input.store.providerQuotes.filter((q) => q.status === "conflict").length
    + input.guard.blocked.filter((b) => b.reasons.includes("conflict_or_unmatched")).length;

  const killSwitchEnabled = isMarketSyncPublishEnabled();
  const eligibleCount = input.scopedPreview.matched.length;
  const rejectedCount =
    input.dryRun.summary.rejected
    + input.guard.blocked.length
    + input.delta.counts.skip;

  const canConfirmPublish =
    killSwitchEnabled
    && input.guard.killSwitchOn
    && eligibleCount >= 1
    && input.delta.counts.new + input.delta.counts.changed >= 1
    && input.scopedPreview.matched.every((r) => r.status === "matched" && r.snapshot);

  return {
    newCount: input.delta.counts.new,
    updatedCount: input.delta.counts.changed,
    unchangedCount: input.delta.counts.unchanged,
    rejectedCount,
    conflictCount,
    providers,
    killSwitchEnabled,
    eligibleCount,
    canConfirmPublish,
  };
}
