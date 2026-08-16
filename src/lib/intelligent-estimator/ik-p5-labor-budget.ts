/**
 * IK-MIGRATION-01 P5 — hard research budget (enforced, not log-only).
 * AD-IK-P5-22: max 24 HTTP/run · max 4 HTTP/work · 0 blind retry.
 */

import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";

export const IK_P5_MAX_HTTP_PER_RUN = 24;
export const IK_P5_MAX_HTTP_PER_WORK = 4;

export type IkP5BudgetDenyReason =
  | "RUN_CEILING"
  | "WORK_CEILING"
  | "ZERO_REQUEST";

export class IkP5ResearchBudget {
  private runHttp = 0;
  private readonly perWork = new Map<string, number>();

  get runHttpCount(): number {
    return this.runHttp;
  }

  workHttpCount(workKey: string): number {
    return this.perWork.get(workKey) ?? 0;
  }

  /** Whether `n` additional fetches are allowed for this work. */
  canFetch(workKey: string, n: number): boolean {
    if (!(n > 0)) return false;
    if (this.runHttp + n > IK_P5_MAX_HTTP_PER_RUN) return false;
    const used = this.perWork.get(workKey) ?? 0;
    if (used + n > IK_P5_MAX_HTTP_PER_WORK) return false;
    return true;
  }

  denyReason(workKey: string, n: number): IkP5BudgetDenyReason | null {
    if (!(n > 0)) return "ZERO_REQUEST";
    if (this.runHttp + n > IK_P5_MAX_HTTP_PER_RUN) return "RUN_CEILING";
    const used = this.perWork.get(workKey) ?? 0;
    if (used + n > IK_P5_MAX_HTTP_PER_WORK) return "WORK_CEILING";
    return null;
  }

  record(workKey: string, n: number): void {
    if (!(n > 0)) return;
    this.runHttp += n;
    this.perWork.set(workKey, (this.perWork.get(workKey) ?? 0) + n);
  }
}

/**
 * Wrap a lookup port so each HTTP counts against the budget.
 * When budget exhausted before call → ok:false with BUDGET_EXCEEDED (0 invent).
 */
export function wrapLookupPortWithIkP5Budget(
  port: WorkRateSelectiveLookupPort,
  budget: IkP5ResearchBudget,
): WorkRateSelectiveLookupPort {
  return {
    async lookup(req) {
      const workKey = `${req.workId}|${req.unit}`;
      if (!budget.canFetch(workKey, 1)) {
        const reason = budget.denyReason(workKey, 1) ?? "RUN_CEILING";
        return {
          ok: false,
          error: `BUDGET_EXCEEDED:${reason}`,
          httpFetchCount: 0,
          rateGap: true,
        };
      }
      const res = await port.lookup(req);
      const n = Number(res.httpFetchCount) || 0;
      if (n > 0) budget.record(workKey, n);
      return res;
    },
  };
}
