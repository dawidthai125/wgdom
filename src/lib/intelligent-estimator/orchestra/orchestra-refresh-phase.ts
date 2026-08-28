/**
 * W5 HUB CONNECT — refreshPhase TARGET → existing Orchestra refresh seam.
 *
 * CONNECT-only alias. Does NOT create a second refresh bus / Accept engine.
 *
 * SSOT (§2A.6):
 *   Orchestra.refreshPhase(...)  ≡  bumpOrchestraAfterPricingAccept()
 *     + laborRecalcEpoch / materialRecalcEpoch / identityResearchEpoch
 *     + catalog/pkg reload epochs
 *
 * `notifyIkPricingAccepted` alone ≠ full Orchestra refresh.
 * Hub Accept must converge here (or via ownerGate G2 which REUSE this seam).
 */

export type IkOrchestraRefreshPhaseKind =
  | "pricing_accept"
  | "labor_accept"
  | "material_accept"
  | "catalog_accept";

/** Optional meta for Hub `onPriceResearchAccepted` CONNECT. */
export type HubPricingAcceptedMeta = {
  phase?: IkOrchestraRefreshPhaseKind;
};

/**
 * Resolve Hub Accept meta → refreshPhase kind.
 * Default pricing_accept (catalog/pkg + onPricingAccepted notify chain).
 */
export function resolveHubAcceptRefreshPhaseKind(
  meta?: HubPricingAcceptedMeta | null,
): IkOrchestraRefreshPhaseKind {
  const phase = meta?.phase;
  if (
    phase === "labor_accept"
    || phase === "material_accept"
    || phase === "catalog_accept"
    || phase === "pricing_accept"
  ) {
    return phase;
  }
  return "pricing_accept";
}

/**
 * True when Hub should prefer Orchestra.refreshPhase over standalone
 * notifyIkPricingAccepted (Orchestra Bridge live).
 */
export function shouldPreferOrchestraRefreshPhase(
  refreshPhase: ((kind: IkOrchestraRefreshPhaseKind) => void) | null | undefined,
): boolean {
  return typeof refreshPhase === "function";
}
