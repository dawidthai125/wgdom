/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W0 — dual invalidation after successful Accept.
 * W5-2 — optional package F5 materialize (REUSE materializeIkF5OnPackage · no second evaluator).
 *
 * Call ONLY after persist SUCCESS.
 * ZERO cache layer · ZERO F5 HTTP · bumps existing React tokens only.
 */

import { materializeIkF5OnPackage } from "@/lib/intelligent-estimator/orchestra/ik-f5-package-refresh";

export type NotifyIkPricingAcceptedInput = {
  /** TendersProvider.bumpPricingCatalogRevision — invalidates useTenderPricingAuto / F5. */
  bumpPricingCatalogRevision: () => void;
  /** TenderDetailPage chiefRefreshNonce++ — Chief / Expert surfaces. */
  bumpChiefRefresh: () => void;
  /** W5-2 — when set, persist F5 f5Gate/subtotals on multi-dwelling package LS. */
  tenderId?: string;
};

export type NotifyIkPricingAcceptedResult = {
  ok: true;
  pricingCatalogRevisionBumped: true;
  chiefRefreshBumped: true;
  f5PackageMaterialized: boolean;
};

/**
 * After Owner Accept persist succeeded: bump BOTH revision tokens so Bid/F5
 * and Chief surfaces recompute without page reload.
 */
export function notifyIkPricingAccepted(
  input: NotifyIkPricingAcceptedInput,
): NotifyIkPricingAcceptedResult {
  input.bumpPricingCatalogRevision();
  input.bumpChiefRefresh();
  const tenderId = String(input.tenderId ?? "").trim();
  let f5PackageMaterialized = false;
  if (tenderId) {
    const result = materializeIkF5OnPackage(tenderId, {
      ensureOwnerQuestions: false,
    });
    f5PackageMaterialized = result.wrote;
  }
  return {
    ok: true,
    pricingCatalogRevisionBumped: true,
    chiefRefreshBumped: true,
    f5PackageMaterialized,
  };
}

/**
 * Workflow guard: bump only when persistSucceeded === true.
 * Persist FAIL → ZERO bumps.
 */
export function notifyIkPricingAcceptedIfPersistOk(
  persistSucceeded: boolean,
  input: NotifyIkPricingAcceptedInput,
): NotifyIkPricingAcceptedResult | { ok: false; reason: "PERSIST_FAILED" } {
  if (!persistSucceeded) {
    return { ok: false, reason: "PERSIST_FAILED" };
  }
  return notifyIkPricingAccepted(input);
}
