/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — typy selective lookup (ONE WORK).
 * FULL CATALOGUE FORBIDDEN · brak arbitralnego URL od klienta.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export type WorkRateSourceId = WorkRateAuthorizedSourceId;

export interface WorkRateSelectiveLookupRequest {
  sourceId: WorkRateSourceId;
  /** Nazwa roboty PL — nie ścieżka kategorii. */
  query: string;
  workId: string;
  unit: WgdomCostUnit;
  regionScope?: WorkRateRegionScope;
  /**
   * PASS2: Owner category key. Edge resolves URL from allowlist.
   * Absent / "default" ⇒ PASS1 canonical.
   * Client MUST NOT send `url`.
   */
  categoryKey?: string | null;
  /** Hard bound — zawsze 1 URL per lookup call. */
  maxUrls?: 1;
}

export interface WorkRateSelectiveRawPage {
  sourceId: WorkRateSourceId;
  requestUrl: string;
  finalUrl?: string | null;
  status: number;
  bodyText: string;
  fetchedAtIso: string;
}

export type WorkRateSelectiveLookupResult =
  | { ok: true; page: WorkRateSelectiveRawPage; httpFetchCount: number }
  | {
      ok: false;
      error: string;
      httpFetchCount: number;
      rateGap?: boolean;
    };

export interface WorkRateSelectiveLookupPort {
  lookup(req: WorkRateSelectiveLookupRequest): Promise<WorkRateSelectiveLookupResult>;
}

/** Surowa obserwacja po parse HTML — przed qualification. */
export interface WorkRateParsedOffer {
  sourceId: WorkRateSourceId;
  workNamePl: string;
  /**
   * Market-base rate for qualify/median (point or range midpoint).
   * NEVER conflate with OUR RATE / proposed.
   */
  ratePln: number;
  currency: "PLN";
  unit: string;
  regionScope: WorkRateRegionScope;
  laborOnly: boolean;
  includesMaterial: boolean;
  vatIncluded: boolean | null;
  netGross: "netto" | "brutto" | "unknown";
  priceKind: "regular" | "promo" | "package" | "minimum" | "unknown";
  sourceUrl: string;
  identityMatched: boolean;
  observedAt: string;
  /** SOURCE-DERIVED range bounds when host published od–do / a–b. */
  sourceMinPln?: number | null;
  sourceMaxPln?: number | null;
  /** How ratePln was obtained from source. */
  marketBaseKind?: "point" | "range_midpoint";
}
