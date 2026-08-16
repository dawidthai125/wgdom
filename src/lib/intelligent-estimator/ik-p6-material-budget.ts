/**
 * IK-MIGRATION-01 P6 — Material research budget wrap (MMR-02 SSOT).
 * AD-IK-P6-22: max 8 claims/pass · derived ≤24 shop HTTP/run · 0 blind retry.
 * Does NOT copy Labor 24/4 as Material SSOT.
 */

export const IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS = 8;
/** Derived: 8 claims × 3 DIY shops — session ceiling; does not raise MMR rate/circuit. */
export const IK_P6_MAX_SHOP_HTTP_PER_RUN = 24;
/** Conservative estimate when Phase2 does not report httpFetchCount. */
export const IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE = 3;

export type IkP6BudgetDenyReason =
  | "CLAIM_CEILING"
  | "SHOP_HTTP_CEILING"
  | "ZERO_REQUEST";

export class IkP6MaterialBudget {
  private claims = 0;
  private shopHttp = 0;

  get claimCount(): number {
    return this.claims;
  }

  get shopHttpCount(): number {
    return this.shopHttp;
  }

  canClaim(estimatedShopHttp: number = IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE): boolean {
    if (!(estimatedShopHttp > 0)) return false;
    if (this.claims + 1 > IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS) return false;
    if (this.shopHttp + estimatedShopHttp > IK_P6_MAX_SHOP_HTTP_PER_RUN) return false;
    return true;
  }

  denyReason(
    estimatedShopHttp: number = IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE,
  ): IkP6BudgetDenyReason | null {
    if (!(estimatedShopHttp > 0)) return "ZERO_REQUEST";
    if (this.claims + 1 > IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS) return "CLAIM_CEILING";
    if (this.shopHttp + estimatedShopHttp > IK_P6_MAX_SHOP_HTTP_PER_RUN) {
      return "SHOP_HTTP_CEILING";
    }
    return null;
  }

  recordClaim(shopHttp: number = IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE): void {
    this.claims += 1;
    if (shopHttp > 0) this.shopHttp += shopHttp;
  }
}
