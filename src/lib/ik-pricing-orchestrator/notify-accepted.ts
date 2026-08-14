/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 W0 — dual invalidation after successful Accept.
 *
 * Call ONLY after persist SUCCESS.
 * ZERO cache layer · ZERO F5 HTTP · bumps existing React tokens only.
 */

export type NotifyIkPricingAcceptedInput = {
  /** TendersProvider.bumpPricingCatalogRevision — invalidates useTenderPricingAuto / F5. */
  bumpPricingCatalogRevision: () => void;
  /** TenderDetailPage chiefRefreshNonce++ — Chief / Expert surfaces. */
  bumpChiefRefresh: () => void;
};

export type NotifyIkPricingAcceptedResult = {
  ok: true;
  pricingCatalogRevisionBumped: true;
  chiefRefreshBumped: true;
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
  return {
    ok: true,
    pricingCatalogRevisionBumped: true,
    chiefRefreshBumped: true,
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
