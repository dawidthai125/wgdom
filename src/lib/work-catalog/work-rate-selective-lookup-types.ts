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
  /** Hard bound — zawsze 1 URL. */
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
}
