/**
 * W4-4 — F5 package materialization (W3 pattern reuse).
 * Side-effect layer only — LS upsert via caller or materialize helper.
 */

import { evaluateAllDwellingsInPackage } from "@/lib/multi-dwelling/orchestration";
import { getTenderPackage, upsertTenderPackage } from "@/lib/multi-dwelling/store";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { listOwnerInputsForTender } from "@/lib/owner-rate-input";

export type IkF5PackageRefreshResult = {
  pkg: TenderPackage | null;
  refreshKey: string;
  wrote: boolean;
};

/**
 * Deterministic key from current Owner Input answers (idempotent guard input).
 */
export function buildOwnerInputRefreshKey(tenderId: string): string {
  const items = listOwnerInputsForTender({ tenderId });
  const parts = items
    .map((item) => {
      const q = item.question;
      const a = item.currentAnswer;
      const status = q.status;
      const amount = a?.amountPlnNet ?? "none";
      const unit = a?.unit ?? "none";
      return `${q.domain}|${q.dwellingId ?? ""}|${q.lineRef ?? ""}|${status}|${amount}|${unit}`;
    })
    .sort();
  return `${tenderId}|oi|${parts.join(";")}`;
}

/**
 * Evaluate F5 on all dwellings with offerBoq and persist to LS.
 * REUSE evaluateAllDwellingsInPackage — same contract as W3 identity persist effect.
 */
export function materializeIkF5OnPackage(
  tenderId: string,
  opts?: {
    store?: WorkCatalogStore;
    nowMs?: number;
    ensureOwnerQuestions?: boolean;
    refreshKey?: string;
  },
): IkF5PackageRefreshResult {
  const key = opts?.refreshKey ?? buildOwnerInputRefreshKey(tenderId);
  const pkg = getTenderPackage(tenderId);
  if (!pkg) {
    return { pkg: null, refreshKey: key, wrote: false };
  }
  const store = opts?.store ?? loadWorkCatalogStoreLocal();
  const evaluated = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: opts?.nowMs ?? Date.now(),
    ensureOwnerQuestions: opts?.ensureOwnerQuestions ?? false,
  });
  upsertTenderPackage(evaluated);
  return { pkg: getTenderPackage(tenderId), refreshKey: key, wrote: true };
}
